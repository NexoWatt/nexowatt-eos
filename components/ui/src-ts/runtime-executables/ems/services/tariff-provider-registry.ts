// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Registriert unterstützte Tarifquellen und deren Aufruf-/Normalisierungsschnittstellen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/tariff-provider-registry.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/services/tariff-provider-registry.js
 *
 * Central provider registry + normalizers for direct dynamic-tariff integrations.
 * All providers are normalized to EUR/kWh intervals before tariff-vis consumes them.
 */
'use strict';

const DEFAULT_USER_AGENT = 'NexoWatt-EOS/0.8.201 (+https://www.nexowatt.com)';

const BIDDING_ZONES = Object.freeze({
    DE: '10Y1001A1001A82H', // DE-LU
    NL: '10YNL----------L',
});

const PROVIDERS = Object.freeze([
    {
        id: 'manual-dp',
        name: 'Bestehende Datenpunkte / manuell',
        countries: ['DE', 'NL'],
        sourceType: 'datapoints',
        directApi: false,
        requires: [],
        description: 'Verwendet die vier frei zugeordneten Preis-Datenpunkte.',
    },
    {
        id: 'tibber',
        name: 'Tibber API',
        countries: ['DE', 'NL'],
        sourceType: 'graphql',
        directApi: true,
        requires: ['accessToken'],
        supportsResolution: [15, 60],
        description: 'Direkte GraphQL-Integration; persönlicher Token oder registrierter OAuth-Client.',
    },
    {
        id: 'energyzero',
        name: 'EnergyZero Marktpreise',
        countries: ['NL'],
        sourceType: 'rest-public',
        directApi: true,
        requires: [],
        supportsResolution: [15, 60],
        description: 'Öffentliche Preiszeitreihe mit wählbarer Preis-Komponente.',
    },
    {
        id: 'entsoe',
        name: 'ENTSO-E Day-Ahead',
        countries: ['DE', 'NL'],
        sourceType: 'xml',
        directApi: true,
        requires: ['securityToken'],
        supportsResolution: [15, 30, 60],
        description: 'Börsenpreisquelle; Endkunden-Aufschläge werden im Tarifprofil ergänzt.',
    },
    {
        id: 'ostrom',
        name: 'Ostrom API / Partnerzugang',
        countries: ['DE'],
        sourceType: 'oauth-json',
        directApi: true,
        requires: ['clientId', 'clientSecret', 'tokenUrl', 'pricesUrl'],
        supportsResolution: [60],
        configurationRequired: true,
        description: 'OAuth2-/JSON-Profil für Kunden- oder Partnerzugang; Endpunkte werden nach Vertrag konfiguriert.',
    },
    {
        id: 'custom-rest',
        name: 'Allgemeine REST/JSON-API',
        countries: ['DE', 'NL'],
        sourceType: 'rest-custom',
        directApi: true,
        requires: ['url'],
        supportsResolution: [15, 30, 60],
        description: 'Universelle API für Stadtwerke und örtliche Energieversorger.',
    },
    {
        id: 'market-profile',
        name: 'Anbieterprofil über ENTSO-E/Custom REST',
        countries: ['DE', 'NL'],
        sourceType: 'profile',
        directApi: true,
        requires: [],
        supportsResolution: [15, 30, 60],
        description: 'Anbieterprofil mit allgemeiner Marktpreisquelle und vertraglichen Preisbestandteilen.',
    },
]);

const PROVIDER_PROFILES = Object.freeze([
    { id: 'local-provider', name: 'Lokaler Energieversorger / Stadtwerk', country: 'DE/NL', preferredSource: 'entsoe' },
    { id: 'rabot', name: 'Rabot Energy', country: 'DE', preferredSource: 'entsoe' },
    { id: 'enbw-dynamic', name: 'EnBW Strom dynamisch', country: 'DE', preferredSource: 'entsoe' },
    { id: 'lichtblick-dynamic', name: 'LichtBlick ÖkoStrom Dynamic', country: 'DE', preferredSource: 'entsoe' },
    { id: 'elli-flex', name: 'Elli / Volkswagen Naturstrom Flex', country: 'DE', preferredSource: 'entsoe' },
    { id: 'zonneplan', name: 'Zonneplan', country: 'NL', preferredSource: 'energyzero' },
    { id: 'nextenergy', name: 'NextEnergy', country: 'NL', preferredSource: 'energyzero' },
    { id: 'frankenergie', name: 'Frank Energie', country: 'NL', preferredSource: 'energyzero' },
    { id: 'anwb', name: 'ANWB Energie', country: 'NL', preferredSource: 'energyzero' },
]);

function clampNumber(value, fallback, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
}

function parseJsonMaybe(raw) {
    if (raw === null || raw === undefined) return raw;
    if (typeof raw !== 'string') return raw;
    const text = raw.trim();
    if (!text) return null;
    try { return JSON.parse(text); } catch (_e) { return raw; }
}

function getByPath(root, pathSpec) {
    if (!pathSpec) return root;
    const normalized = String(pathSpec)
        .trim()
        .replace(/^\$\.?/, '')
        .replace(/\[(\d+)\]/g, '.$1');
    if (!normalized) return root;
    return normalized.split('.').filter(Boolean).reduce((cur, key) => {
        if (cur === null || cur === undefined) return undefined;
        return cur[key];
    }, root);
}

function num(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    let text = String(value).trim().replace(/\s+/g, '');
    if (!text) return fallback;
    if (text.includes(',') && text.includes('.')) {
        const lc = text.lastIndexOf(',');
        const ld = text.lastIndexOf('.');
        if (lc > ld) text = text.replace(/\./g, '').replace(',', '.');
        else text = text.replace(/,/g, '');
    } else if (text.includes(',')) {
        text = text.replace(',', '.');
    }
    const n = Number(text);
    return Number.isFinite(n) ? n : fallback;
}

function toIso(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
        const ms = Math.abs(value) < 1e12 ? value * 1000 : value;
        const d = new Date(ms);
        return Number.isFinite(d.getTime()) ? d.toISOString() : '';
    }
    const parsed = Date.parse(String(value));
    if (!Number.isFinite(parsed)) return '';
    return new Date(parsed).toISOString();
}

function priceToEurKwh(value, unit = 'EUR/kWh') {
    const n = num(value, null);
    if (!Number.isFinite(n)) return null;
    const u = String(unit || 'EUR/kWh').trim().toLowerCase().replace(/\s+/g, '');
    if (u === 'eur/mwh' || u === '€/mwh') return n / 1000;
    if (u === 'ct/kwh' || u === 'cent/kwh' || u === 'cents/kwh') return n / 100;
    if (u === 'eur/wh' || u === '€/wh') return n * 1000;
    return n;
}

function applyFormula(marketEurKwh, formula = {}) {
    const market = Number.isFinite(Number(marketEurKwh)) ? Number(marketEurKwh) : 0;
    const multiplier = clampNumber(formula.marketMultiplier, 1, -100, 100);
    const supplier = num(formula.supplierMarkupEurPerKwh, 0) || 0;
    const grid = num(formula.gridVariableEurPerKwh, 0) || 0;
    const taxes = num(formula.taxEurPerKwh, 0) || 0;
    const other = num(formula.otherVariableEurPerKwh, 0) || 0;
    const vatPct = clampNumber(formula.vatPct, 0, 0, 100);
    const beforeVat = market * multiplier + supplier + grid + taxes + other;
    const total = formula.priceIncludesVat === true ? beforeVat : beforeVat * (1 + vatPct / 100);
    return {
        total,
        market,
        supplierMarkup: supplier,
        gridVariable: grid,
        tax: taxes + other,
        vatPct,
    };
}

function normalizeInterval(row, options = {}) {
    if (!row || typeof row !== 'object') return null;
    const startsAt = toIso(
        row.startsAt ?? row.start ?? row.startTime ?? row.from ?? row.begin ?? row.timestamp ?? row.time
    );
    if (!startsAt) return null;
    const resolutionMinutes = clampNumber(options.resolutionMinutes, 60, 1, 1440);
    let endsAt = toIso(row.endsAt ?? row.end ?? row.endTime ?? row.to ?? row.until);
    if (!endsAt) endsAt = new Date(Date.parse(startsAt) + resolutionMinutes * 60 * 1000).toISOString();

    const component = String(options.priceComponent || 'total').trim();
    const candidates = [
        row[component],
        row.total,
        row.price,
        row.value,
        row.marketprice,
        row.marketPrice,
        row.energyPrice,
        row.priceWithTax,
        row.allInPrice,
        row.allInPriceIncludingVat,
        row.basePriceIncludingVat,
    ];
    let raw = candidates.find((v) => v !== undefined && v !== null && v !== '');
    if (raw && typeof raw === 'object') raw = raw.total ?? raw.value ?? raw.price;
    const basePrice = priceToEurKwh(raw, options.unit || 'EUR/kWh');
    if (!Number.isFinite(basePrice)) return null;
    const calc = applyFormula(basePrice, options.formula || {});
    return {
        startsAt,
        endsAt,
        total: Math.round(calc.total * 1e8) / 1e8,
        market: Math.round(calc.market * 1e8) / 1e8,
        tax: Math.round(calc.tax * 1e8) / 1e8,
        supplierMarkup: Math.round(calc.supplierMarkup * 1e8) / 1e8,
        gridVariable: Math.round(calc.gridVariable * 1e8) / 1e8,
        feedIn: Number.isFinite(num(options.feedInEurPerKwh, null)) ? num(options.feedInEurPerKwh, null) : null,
        currency: String(row.currency || options.currency || 'EUR').toUpperCase(),
        source: String(options.source || row.source || 'unknown'),
        quality: String(options.quality || row.quality || 'calculated-all-in'),
    };
}

function normalizeRows(rows, options = {}) {
    const array = Array.isArray(rows) ? rows : [];
    return array
        .map((row) => normalizeInterval(row, options))
        .filter(Boolean)
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

function splitTodayTomorrow(intervals, nowMs = Date.now(), timeZone = 'Europe/Berlin') {
    const dateKey = (ms) => {
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
        } catch (_e) {
            return new Date(ms).toISOString().slice(0, 10);
        }
    };
    const todayKey = dateKey(nowMs);
    const tomorrowKey = dateKey(nowMs + 24 * 60 * 60 * 1000);
    const today = [];
    const tomorrow = [];
    for (const row of intervals || []) {
        const key = dateKey(Date.parse(row.startsAt));
        if (key === todayKey) today.push(row);
        else if (key === tomorrowKey) tomorrow.push(row);
    }
    return { today, tomorrow };
}

function currentAndAverage(intervals, nowMs = Date.now()) {
    const rows = Array.isArray(intervals) ? intervals : [];
    const active = rows.find((row) => Date.parse(row.startsAt) <= nowMs && Date.parse(row.endsAt) > nowMs) || null;
    const future = rows.filter((row) => Date.parse(row.endsAt) > nowMs && Date.parse(row.startsAt) < nowMs + 36 * 60 * 60 * 1000);
    const average = future.length ? future.reduce((sum, row) => sum + Number(row.total || 0), 0) / future.length : null;
    return { current: active ? Number(active.total) : null, average };
}

function buildTibberQuery(resolutionMinutes = 15) {
    const resolution = Number(resolutionMinutes) <= 15 ? 'QUARTER_HOURLY' : 'HOURLY';
    return `query NexoWattPriceInfo { viewer { homes { id appNickname address { address1 postalCode city country } currentSubscription { priceInfo(resolution: ${resolution}) { current { total energy tax startsAt level currency } today { total energy tax startsAt level currency } tomorrow { total energy tax startsAt level currency } } } } } }`;
}

function normalizeTibber(payload, config = {}) {
    const homes = getByPath(payload, 'data.viewer.homes');
    if (!Array.isArray(homes) || !homes.length) throw new Error('tibber_no_homes');
    const homeId = String(config.homeId || '').trim();
    const home = (homeId ? homes.find((h) => String(h && h.id) === homeId) : null) || homes[0];
    const priceInfo = getByPath(home, 'currentSubscription.priceInfo');
    if (!priceInfo) throw new Error('tibber_no_price_info');
    const rows = [...(Array.isArray(priceInfo.today) ? priceInfo.today : []), ...(Array.isArray(priceInfo.tomorrow) ? priceInfo.tomorrow : [])];
    const resolutionMinutes = Number(config.resolutionMinutes) <= 15 ? 15 : 60;
    const intervals = normalizeRows(rows, {
        resolutionMinutes,
        priceComponent: 'total',
        unit: 'EUR/kWh',
        formula: { priceIncludesVat: true },
        source: 'tibber',
        quality: 'provider-all-in',
    });
    return { intervals, homeId: String(home.id || ''), homeName: String(home.appNickname || getByPath(home, 'address.address1') || '') };
}

function collectLikelyPriceRows(value, depth = 0) {
    if (depth > 7 || value === null || value === undefined) return [];
    if (Array.isArray(value)) {
        if (value.some((row) => row && typeof row === 'object' && (
            row.startsAt !== undefined || row.start !== undefined || row.timestamp !== undefined || row.readingDate !== undefined || row.date !== undefined
        ))) return value;
        for (const child of value) {
            const found = collectLikelyPriceRows(child, depth + 1);
            if (found.length) return found;
        }
        return [];
    }
    if (typeof value === 'object') {
        const preferred = ['Prices', 'prices', 'PriceItems', 'priceItems', 'data', 'items', 'values', 'result'];
        for (const key of preferred) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                const found = collectLikelyPriceRows(value[key], depth + 1);
                if (found.length) return found;
            }
        }
        for (const child of Object.values(value)) {
            const found = collectLikelyPriceRows(child, depth + 1);
            if (found.length) return found;
        }
    }
    return [];
}

function normalizeEnergyZero(payload, config = {}) {
    const rawRows = collectLikelyPriceRows(payload);
    const component = String(config.priceComponent || 'allInPriceIncludingVat');
    const mapped = rawRows.map((row) => ({
        startsAt: row.startsAt ?? row.start ?? row.timestamp ?? row.readingDate ?? row.date,
        endsAt: row.endsAt ?? row.end ?? row.endDate,
        total: row[component] ?? row.price ?? row.value ?? row.total,
        currency: row.currency || 'EUR',
    }));
    const intervals = normalizeRows(mapped, {
        resolutionMinutes: Number(config.resolutionMinutes) <= 15 ? 15 : 60,
        unit: config.unit || 'EUR/kWh',
        formula: { priceIncludesVat: true },
        source: 'energyzero',
        quality: component.toLowerCase().includes('allin') ? 'provider-all-in' : 'provider-variable',
    });
    if (!intervals.length) throw new Error('energyzero_no_prices');
    return { intervals };
}

function parseIsoDurationMinutes(value, fallback = 60) {
    const m = String(value || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
    if (!m) return fallback;
    return (Number(m[1] || 0) * 60) + Number(m[2] || 0) || fallback;
}

function xmlText(block, tag) {
    const re = new RegExp(`<(?:[A-Za-z0-9_]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?${tag}>`, 'i');
    const m = String(block || '').match(re);
    return m ? String(m[1]).trim() : '';
}

function normalizeEntsoe(xml, config = {}) {
    const text = String(xml || '');
    if (!text.includes('Publication_MarketDocument') && !text.includes('TimeSeries')) {
        const reason = xmlText(text, 'text') || xmlText(text, 'Reason');
        throw new Error(reason || 'entsoe_invalid_response');
    }
    const periods = text.match(/<(?:[A-Za-z0-9_]+:)?Period\b[^>]*>[\s\S]*?<\/(?:[A-Za-z0-9_]+:)?Period>/gi) || [];
    const rows = [];
    for (const period of periods) {
        const start = xmlText(period, 'start');
        const resolutionMinutes = parseIsoDurationMinutes(xmlText(period, 'resolution'), Number(config.resolutionMinutes) || 60);
        const baseMs = Date.parse(start);
        if (!Number.isFinite(baseMs)) continue;
        const points = period.match(/<(?:[A-Za-z0-9_]+:)?Point\b[^>]*>[\s\S]*?<\/(?:[A-Za-z0-9_]+:)?Point>/gi) || [];
        for (const point of points) {
            const position = Math.max(1, Math.round(num(xmlText(point, 'position'), 1)));
            const price = num(xmlText(point, 'price.amount'), null);
            if (!Number.isFinite(price)) continue;
            const startMs = baseMs + (position - 1) * resolutionMinutes * 60 * 1000;
            rows.push({
                startsAt: new Date(startMs).toISOString(),
                endsAt: new Date(startMs + resolutionMinutes * 60 * 1000).toISOString(),
                total: price,
            });
        }
    }
    const intervals = normalizeRows(rows, {
        resolutionMinutes: Number(config.resolutionMinutes) || 60,
        unit: 'EUR/MWh',
        formula: config.formula || {},
        source: 'entsoe',
        quality: Object.keys(config.formula || {}).length ? 'calculated-all-in' : 'market-only',
        feedInEurPerKwh: config.feedInEurPerKwh,
    });
    if (!intervals.length) throw new Error('entsoe_no_prices');
    return { intervals };
}

function normalizeCustomRest(payload, config = {}) {
    const root = getByPath(payload, config.arrayPath || '');
    const rows = Array.isArray(root) ? root : collectLikelyPriceRows(root);
    const mapped = rows.map((row) => ({
        startsAt: getByPath(row, config.startPath || 'startsAt'),
        endsAt: getByPath(row, config.endPath || 'endsAt'),
        total: getByPath(row, config.pricePath || 'total'),
        currency: getByPath(row, config.currencyPath || 'currency') || config.currency || 'EUR',
    }));
    const intervals = normalizeRows(mapped, {
        resolutionMinutes: Number(config.resolutionMinutes) || 60,
        unit: config.unit || 'EUR/kWh',
        formula: config.formula || {},
        source: config.source || 'custom-rest',
        quality: config.quality || 'calculated-all-in',
        feedInEurPerKwh: config.feedInEurPerKwh,
    });
    if (!intervals.length) throw new Error('custom_rest_no_prices');
    return { intervals };
}

function withTimeout(timeoutMs, fn) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.max(1000, Number(timeoutMs) || 15000));
    return Promise.resolve()
        .then(() => fn(ctrl.signal))
        .finally(() => clearTimeout(timer));
}

async function fetchJson(url, options = {}) {
    return withTimeout(options.timeoutMs, async (signal) => {
        const response = await fetch(url, { ...options, signal });
        const text = await response.text();
        if (!response.ok) throw new Error(`http_${response.status}:${text.slice(0, 240)}`);
        try { return JSON.parse(text); } catch (_e) { throw new Error('invalid_json_response'); }
    });
}

async function fetchText(url, options = {}) {
    return withTimeout(options.timeoutMs, async (signal) => {
        const response = await fetch(url, { ...options, signal });
        const text = await response.text();
        if (!response.ok) throw new Error(`http_${response.status}:${text.slice(0, 240)}`);
        return text;
    });
}

function headersFromConfig(raw) {
    const value = parseJsonMaybe(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out = {};
    for (const [key, val] of Object.entries(value)) {
        if (!key || val === null || val === undefined) continue;
        out[String(key)] = String(val);
    }
    return out;
}

async function fetchTibber(config = {}) {
    const token = String(config.credentials && config.credentials.accessToken || '').trim();
    if (!token || token === '__KEEP__') throw new Error('tibber_token_missing');
    const endpoint = String(config.endpoint || 'https://api.tibber.com/v1-beta/gql');
    const payload = await fetchJson(endpoint, {
        method: 'POST',
        timeoutMs: config.timeoutMs,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': String(config.userAgent || DEFAULT_USER_AGENT),
        },
        body: JSON.stringify({ query: buildTibberQuery(config.resolutionMinutes) }),
    });
    if (Array.isArray(payload.errors) && payload.errors.length) throw new Error(`tibber_graphql:${String(payload.errors[0] && payload.errors[0].message || 'error')}`);
    return normalizeTibber(payload, config);
}

async function fetchEnergyZero(config = {}) {
    // Official public EnergyZero endpoint. It returns the day before, selected
    // day and the following day (if available). The date format is dd-mm-yyyy
    // and the interval is an enum, not the legacy numeric API parameters.
    const endpoint = String(config.endpoint || 'https://public.api.energyzero.nl/public/v1/prices');
    const url = new URL(endpoint);
    if (!url.searchParams.has('date')) {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        url.searchParams.set('date', `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`);
    }
    if (!url.searchParams.has('interval')) {
        url.searchParams.set('interval', Number(config.resolutionMinutes) <= 15 ? 'INTERVAL_QUARTER' : 'INTERVAL_HOUR');
    }
    const payload = await fetchJson(url.toString(), {
        method: 'GET',
        timeoutMs: config.timeoutMs,
        headers: { 'Accept': 'application/json', 'User-Agent': String(config.userAgent || DEFAULT_USER_AGENT) },
    });
    return normalizeEnergyZero(payload, config);
}

function entsoeWindow(nowMs = Date.now()) {
    // ENTSO-E expects UTC timestamps in YYYYMMDDHHmm. Request a complete
    // today/tomorrow window so tariff-vis can publish both JSON curves without
    // an external adapter.
    const dayStart = new Date(nowMs);
    dayStart.setUTCHours(0, 0, 0, 0);
    const start = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
    const end = new Date(dayStart.getTime() + 72 * 60 * 60 * 1000);
    const fmt = (d) => [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, '0'),
        String(d.getUTCDate()).padStart(2, '0'),
        String(d.getUTCHours()).padStart(2, '0'),
        String(d.getUTCMinutes()).padStart(2, '0'),
    ].join('');
    return { start: fmt(start), end: fmt(end) };
}

async function fetchEntsoe(config = {}) {
    const token = String(config.credentials && config.credentials.securityToken || '').trim();
    if (!token || token === '__KEEP__') throw new Error('entsoe_token_missing');
    const country = String(config.country || 'DE').toUpperCase() === 'NL' ? 'NL' : 'DE';
    const domain = String(config.biddingZone || BIDDING_ZONES[country]);
    const window = entsoeWindow();
    const url = new URL(String(config.endpoint || 'https://web-api.tp.entsoe.eu/api'));
    url.searchParams.set('securityToken', token);
    url.searchParams.set('documentType', 'A44');
    url.searchParams.set('in_Domain', domain);
    url.searchParams.set('out_Domain', domain);
    url.searchParams.set('periodStart', window.start);
    url.searchParams.set('periodEnd', window.end);
    const xml = await fetchText(url.toString(), {
        method: 'GET',
        timeoutMs: config.timeoutMs,
        headers: { 'Accept': 'application/xml,text/xml', 'User-Agent': String(config.userAgent || DEFAULT_USER_AGENT) },
    });
    return normalizeEntsoe(xml, config);
}

async function fetchOAuthToken(config = {}) {
    const credentials = config.credentials || {};
    const clientId = String(credentials.clientId || '').trim();
    const clientSecret = String(credentials.clientSecret || '').trim();
    const tokenUrl = String(credentials.tokenUrl || config.tokenUrl || '').trim();
    if (!clientId || !clientSecret || clientSecret === '__KEEP__' || !tokenUrl) throw new Error('oauth_credentials_missing');
    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    if (credentials.scope) body.set('scope', String(credentials.scope));
    return withTimeout(config.timeoutMs, async (signal) => {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'User-Agent': String(config.userAgent || DEFAULT_USER_AGENT),
            },
            body: body.toString(),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || !payload.access_token) throw new Error(`oauth_token_failed:${response.status}`);
        return String(payload.access_token);
    });
}

async function fetchCustomRest(config = {}, overrideToken = '') {
    const custom = config.customRest || config;
    const url = String(custom.url || config.pricesUrl || '').trim();
    if (!url) throw new Error('custom_rest_url_missing');
    const headers = { 'Accept': 'application/json', 'User-Agent': String(config.userAgent || DEFAULT_USER_AGENT), ...headersFromConfig(custom.headersJson) };
    const credentials = config.credentials || {};
    const authMode = String(custom.authMode || (overrideToken ? 'bearer' : 'none'));
    if (overrideToken) headers.Authorization = `Bearer ${overrideToken}`;
    else if (authMode === 'bearer' && credentials.bearerToken && credentials.bearerToken !== '__KEEP__') headers.Authorization = `Bearer ${credentials.bearerToken}`;
    else if (authMode === 'api-key' && credentials.apiKey && credentials.apiKey !== '__KEEP__') headers[String(custom.apiKeyHeader || 'x-api-key')] = String(credentials.apiKey);
    else if (authMode === 'basic' && credentials.username && credentials.password && credentials.password !== '__KEEP__') headers.Authorization = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;
    const method = String(custom.method || 'GET').toUpperCase();
    const payload = await fetchJson(url, {
        method,
        timeoutMs: config.timeoutMs,
        headers: method === 'GET' ? headers : { 'Content-Type': 'application/json', ...headers },
        body: method === 'GET' ? undefined : String(custom.body || ''),
    });
    return normalizeCustomRest(payload, {
        ...custom,
        resolutionMinutes: config.resolutionMinutes,
        formula: config.formula,
        feedInEurPerKwh: config.feedInEurPerKwh,
        source: config.providerId || 'custom-rest',
    });
}

async function fetchOstrom(config = {}) {
    const token = await fetchOAuthToken(config);
    return fetchCustomRest({ ...config, customRest: { ...(config.customRest || {}), url: String(config.pricesUrl || config.customRest && config.customRest.url || '') } }, token);
}

async function fetchProvider(config = {}) {
    const providerId = String(config.providerId || 'manual-dp');
    if (providerId === 'tibber') return fetchTibber(config);
    if (providerId === 'energyzero') return fetchEnergyZero(config);
    if (providerId === 'entsoe') return fetchEntsoe(config);
    if (providerId === 'ostrom') return fetchOstrom(config);
    if (providerId === 'custom-rest') return fetchCustomRest(config);
    if (providerId === 'market-profile') {
        const sourceId = String(config.sourceId || (config.country === 'NL' ? 'energyzero' : 'entsoe'));
        return fetchProvider({ ...config, providerId: sourceId });
    }
    throw new Error(providerId === 'manual-dp' ? 'manual_dp_has_no_fetch' : `unknown_provider:${providerId}`);
}

function publicRegistry() {
    return {
        providers: PROVIDERS.map((row) => ({ ...row })),
        profiles: PROVIDER_PROFILES.map((row) => ({ ...row })),
        biddingZones: { ...BIDDING_ZONES },
        internalDatapoints: {
            priceCurrent: 'tariffProvider.currentPriceEurPerKwh',
            priceAverage: 'tariffProvider.averagePriceEurPerKwh',
            priceTodayJson: 'tariffProvider.pricesTodayJson',
            priceTomorrowJson: 'tariffProvider.pricesTomorrowJson',
        },
    };
}

module.exports = {
    DEFAULT_USER_AGENT,
    BIDDING_ZONES,
    PROVIDERS,
    PROVIDER_PROFILES,
    parseJsonMaybe,
    getByPath,
    priceToEurKwh,
    applyFormula,
    normalizeInterval,
    normalizeRows,
    splitTodayTomorrow,
    currentAndAverage,
    buildTibberQuery,
    normalizeTibber,
    normalizeEnergyZero,
    normalizeEntsoe,
    normalizeCustomRest,
    fetchProvider,
    publicRegistry,
};
