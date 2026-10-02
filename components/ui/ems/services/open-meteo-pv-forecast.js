/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.ts
 * Quell-Hash: sha256:00df79157acf843abc9003ba42e5e82edfca5a57af1955c2779ab0011adb3865
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/open-meteo-pv-forecast.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Ruft Wetter-/Strahlungsdaten ab und berechnet daraus PV-Prognosewerte für die konfigurierte Anlage.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/open-meteo-pv-forecast.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.PV_FORECAST_DIAGNOSTIC_STATES = void 0;
exports.buildPvForecastDiagnostics = buildPvForecastDiagnostics;
exports.publishPvForecastDiagnostics = publishPvForecastDiagnostics;
exports.normalizeOpenMeteoPvArrays = normalizeOpenMeteoPvArrays;
exports.openMeteoSolarPosition = openMeteoSolarPosition;
exports.openMeteoPlaneOfArrayIrradiance = openMeteoPlaneOfArrayIrradiance;
exports.buildOpenMeteoPvCurve = buildOpenMeteoPvCurve;
exports.buildOpenMeteoTiltedPvCurve = buildOpenMeteoTiltedPvCurve;
exports.startOpenMeteoPvForecastRuntime = startOpenMeteoPvForecastRuntime;
const https = require('node:https');
exports.PV_FORECAST_DIAGNOSTIC_STATES = [
    ['updatedAt', 'PV Forecast letzte erfolgreiche Aktualisierung', 'number', 'value.time'],
    ['lastAttemptAt', 'PV Forecast letzter Abrufversuch', 'number', 'value.time'],
    ['lastSuccessAt', 'PV Forecast letzter erfolgreicher Abruf', 'number', 'value.time'],
    ['positivePoints', 'PV Forecast Punkte mit Ertrag', 'number', 'value'],
    ['requestMode', 'PV Forecast Abrufmodus', 'string', 'text'],
    ['requestStatus', 'PV Forecast Abrufstatus', 'string', 'text'],
    ['powerNowW', 'PV Forecast Leistung jetzt (W)', 'number', 'value.power'],
    ['locationText', 'PV Forecast Standort', 'string', 'text'],
    ['locationSource', 'PV Forecast Standortquelle', 'string', 'text'],
    ['latitude', 'PV Forecast Breitengrad', 'number', 'value.gps.latitude'],
    ['longitude', 'PV Forecast Längengrad', 'number', 'value.gps.longitude'],
    ['error', 'PV Forecast Fehler', 'string', 'text'],
];
function buildPvForecastDiagnostics(input = {}) {
    const provider = input.integrated && typeof input.integrated === 'object' ? input.integrated : null;
    const useProvider = input.useIntegrated === true;
    const now = finite(input.now, Date.now());
    const mappedAgeMs = input.mappedAgeMs;
    const mappedUpdatedAt = mappedAgeMs === null || mappedAgeMs === undefined
        ? now : Math.max(0, now - Math.max(0, finite(mappedAgeMs, 0)));
    const providerUpdatedAt = provider ? finite(provider.lastSuccessAt ?? provider.ts, 0) : 0;
    const updatedAt = useProvider ? (providerUpdatedAt || now) : mappedUpdatedAt;
    return {
        updatedAt,
        lastAttemptAt: useProvider && provider ? finite(provider.lastAttemptAt ?? provider.ts, updatedAt) : updatedAt,
        lastSuccessAt: useProvider && provider ? finite(provider.lastSuccessAt ?? provider.ts, updatedAt) : updatedAt,
        positivePoints: Math.max(0, Math.round(finite(input.positivePoints, 0))),
        requestMode: useProvider && provider ? text(provider.requestMode, '') : '',
        requestStatus: useProvider && provider ? text(provider.requestStatus, '') : '',
        powerNowW: Math.max(0, finite(input.powerNowW, 0)),
        locationText: useProvider && provider ? text(provider.locationText, '') : '',
        locationSource: useProvider && provider ? text(provider.locationSource, '') : '',
        latitude: useProvider && provider ? finite(provider.latitude, 0) : 0,
        longitude: useProvider && provider ? finite(provider.longitude, 0) : 0,
        error: text(input.error ?? (useProvider && provider ? provider.error : ''), ''),
    };
}
async function publishPvForecastDiagnostics(setter, diagnostics) {
    for (const [key] of exports.PV_FORECAST_DIAGNOSTIC_STATES) {
        const value = key === 'powerNowW' ? Math.round(diagnostics[key]) : diagnostics[key];
        await setter(`forecast.pv.${key}`, value);
    }
}
const SLOT_MS = 15 * 60 * 1000;
const MAX_LAST_GOOD_AGE_MS = 2 * 3600000;
const DEFAULT_ERROR = 'open-meteo-pv-not-started';
function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}
function clamp(value, min, max, fallback = min) {
    return Math.min(max, Math.max(min, finite(value, fallback)));
}
function asBoolean(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number')
        return value !== 0;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled'].includes(normalized))
        return true;
    if (['false', '0', 'off', 'no', 'nein', 'aus', 'inactive', 'disabled'].includes(normalized))
        return false;
    return fallback;
}
function text(value, fallback = '') {
    return value === null || value === undefined ? fallback : String(value);
}
function parseJson(value, fallback) {
    if (value && typeof value === 'object')
        return value;
    try {
        return JSON.parse(String(value ?? ''));
    }
    catch {
        return fallback;
    }
}
function normalizeForecastSourceMode(value) {
    const normalized = text(value, 'auto').trim().toLowerCase();
    if (['open-meteo', 'openmeteo', 'weather'].includes(normalized))
        return 'open-meteo';
    if (['datapoint', 'mapping', 'appcenter', 'app-center'].includes(normalized))
        return 'datapoint';
    if (['disabled', 'off', 'aus'].includes(normalized))
        return 'disabled';
    return 'auto';
}
async function readSetting(adapter, key, fallback) {
    const cached = adapter.stateCache?.[`settings.${key}`];
    if (cached && cached.value !== undefined && cached.value !== null)
        return cached.value;
    try {
        const state = await adapter.getStateAsync?.(`settings.${key}`);
        if (state && state.val !== undefined && state.val !== null)
            return state.val;
    }
    catch { /* optional */ }
    const configured = adapter.config?.[key];
    return configured === undefined || configured === null ? fallback : configured;
}
function normalizeOpenMeteoPvArrays(values) {
    const advanced = parseJson(values.pvForecastArrays, []);
    if (Array.isArray(advanced) && advanced.length > 0) {
        const rows = advanced
            .filter((item) => !!item && typeof item === 'object')
            .map((item, index) => ({
            name: text(item.name, `PV-Fläche ${index + 1}`),
            kwp: clamp(item.kwp, 0, 100000, 0),
            tiltDeg: clamp(item.tiltDeg ?? item.tilt, 0, 90, 30),
            azimuthDeg: clamp(item.azimuthDeg ?? item.azimuth, -180, 180, 0),
            lossPercent: clamp(item.lossPercent ?? item.lossesPercent, 0, 60, 14),
            inverterLimitW: clamp(item.inverterLimitW, 0, 100000000, 0),
        }))
            .filter((item) => item.kwp > 0);
        if (rows.length > 0)
            return rows;
    }
    const kwp = clamp(values.pvForecastInstalledKwp, 0, 100000, 0);
    return kwp > 0 ? [{
            name: 'PV-Anlage',
            kwp,
            tiltDeg: clamp(values.pvForecastTiltDeg, 0, 90, 30),
            azimuthDeg: clamp(values.pvForecastAzimuthDeg, -180, 180, 0),
            lossPercent: clamp(values.pvForecastLossPercent, 0, 60, 14),
            inverterLimitW: clamp(values.pvForecastInverterLimitW, 0, 100000000, 0),
        }] : [];
}
async function loadSettings(adapter) {
    const keys = [
        ['weatherEnabled', false], ['forecastSourceMode', 'auto'], ['openMeteoPvEnabled', false],
        ['openMeteoLatitude', 0], ['openMeteoLongitude', 0], ['openMeteoTimezone', 'auto'],
        ['forecastUpdateIntervalMin', 30], ['forecastHorizonHours', 48], ['pvForecastPlanningSafetyPct', 85],
        ['pvForecastInstalledKwp', 0], ['pvForecastTiltDeg', 30], ['pvForecastAzimuthDeg', 0],
        ['pvForecastLossPercent', 14], ['pvForecastInverterLimitW', 0], ['pvForecastArrays', '[]'],
        ['weatherUsageMode', 'private'], ['weatherApiKey', ''],
    ];
    const values = {};
    for (const [key, fallback] of keys)
        values[key] = await readSetting(adapter, key, fallback);
    return {
        enabled: asBoolean(values.weatherEnabled, false) && asBoolean(values.openMeteoPvEnabled, false),
        sourceMode: normalizeForecastSourceMode(values.forecastSourceMode),
        latitude: clamp(values.openMeteoLatitude, -90, 90, 0),
        longitude: clamp(values.openMeteoLongitude, -180, 180, 0),
        timezone: text(values.openMeteoTimezone, 'auto').trim() || 'auto',
        updateMinutes: clamp(values.forecastUpdateIntervalMin, 5, 180, 30),
        horizonHours: clamp(values.forecastHorizonHours, 6, 72, 48),
        planningSafetyPct: clamp(values.pvForecastPlanningSafetyPct, 30, 100, 85),
        weatherUsageMode: text(values.weatherUsageMode, 'private').trim().toLowerCase(),
        weatherApiKey: text(values.weatherApiKey, '').trim(),
        arrays: normalizeOpenMeteoPvArrays(values),
    };
}
function coordinate(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string' && value.trim() === '')
        return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
function validCoordinatePair(latitude, longitude) {
    return latitude !== null && longitude !== null
        && latitude >= -90 && latitude <= 90
        && longitude >= -180 && longitude <= 180
        && !(Math.abs(latitude) < 1e-9 && Math.abs(longitude) < 1e-9);
}
function normalizeCountryCode(value) {
    const raw = text(value, '').trim();
    if (/^[a-z]{2}$/i.test(raw))
        return raw.toUpperCase();
    const normalized = raw.toLowerCase();
    const map = {
        deutschland: 'DE', germany: 'DE', de: 'DE',
        niederlande: 'NL', netherlands: 'NL', holland: 'NL', nl: 'NL',
        österreich: 'AT', oesterreich: 'AT', austria: 'AT', at: 'AT',
        schweiz: 'CH', switzerland: 'CH', suisse: 'CH', ch: 'CH',
        belgien: 'BE', belgium: 'BE', be: 'BE',
        luxemburg: 'LU', luxembourg: 'LU', lu: 'LU',
    };
    return map[normalized] || '';
}
function meaningfulLocationLabel(value) {
    const raw = text(value, '').trim();
    if (!raw)
        return '';
    const normalized = raw.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
    const generic = [
        'standort', 'systemstandort', 'eos admin systemstandort', 'eos admin',
        'nexowatt eos', 'nexowatt', 'system config', 'systemconfig',
    ];
    if (generic.includes(normalized))
        return '';
    // Pure coordinate labels are useful only as a final technical fallback.
    if (/^-?\d{1,3}(?:[.,]\d+)?\s*[,;/]\s*-?\d{1,3}(?:[.,]\d+)?$/.test(raw))
        return '';
    return raw;
}
function systemLocationHints(common) {
    const address = common.address && typeof common.address === 'object' ? common.address : {};
    const city = meaningfulLocationLabel(common.city ?? common.town ?? common.location ?? common.place ?? address.city ?? address.town ?? address.place);
    const postalCode = text(common.postalCode ?? common.postcode ?? common.zip ?? common.zipCode ?? address.postalCode ?? address.postcode ?? address.zip, '').trim();
    const country = meaningfulLocationLabel(common.country ?? address.country);
    const region = meaningfulLocationLabel(common.region ?? common.state ?? common.admin1 ?? address.region ?? address.state);
    const countryCode = normalizeCountryCode(common.countryCode ?? address.countryCode ?? country);
    const cityLine = [postalCode, city].filter(Boolean).join(' ').trim();
    const label = [cityLine, region, country].filter(Boolean).filter((item, index, all) => all.indexOf(item) === index).join(', ');
    return { city, postalCode, country, countryCode, region, label };
}
async function geocodeSystemLocation(adapter, settings, common) {
    const hints = systemLocationHints(common);
    const candidates = Array.from(new Set([hints.postalCode, hints.city].filter((value) => value.length >= 2)));
    if (!candidates.length)
        return null;
    if (settings.weatherUsageMode === 'commercial' && !settings.weatherApiKey)
        return null;
    const cacheKey = JSON.stringify({ candidates, countryCode: hints.countryCode, commercial: settings.weatherUsageMode === 'commercial' });
    const cached = adapter._nwOpenMeteoGeocodeCache;
    if (cached && cached.key === cacheKey && Date.now() - cached.ts < 24 * 3600000)
        return cached.value;
    const baseUrl = settings.weatherUsageMode === 'commercial'
        ? 'https://customer-geocoding-api.open-meteo.com/v1/search'
        : 'https://geocoding-api.open-meteo.com/v1/search';
    const apiKey = settings.weatherUsageMode === 'commercial' ? `&apikey=${encodeURIComponent(settings.weatherApiKey)}` : '';
    const countryFilter = hints.countryCode ? `&countryCode=${encodeURIComponent(hints.countryCode)}` : '';
    for (const candidate of candidates) {
        const url = `${baseUrl}?name=${encodeURIComponent(candidate)}&count=10&language=de&format=json${countryFilter}${apiKey}`;
        try {
            const data = await requestJson(adapter, url);
            const results = Array.isArray(data?.results) ? data.results : [];
            if (!results.length)
                continue;
            const preferred = hints.postalCode
                ? results.find((item) => Array.isArray(item?.postcodes) && item.postcodes.map(String).includes(hints.postalCode)) || results[0]
                : results[0];
            const latitude = coordinate(preferred?.latitude);
            const longitude = coordinate(preferred?.longitude);
            if (!validCoordinatePair(latitude, longitude))
                continue;
            const name = [preferred?.name, preferred?.admin1, preferred?.country].map((item) => text(item, '').trim()).filter(Boolean).filter((item, index, all) => all.indexOf(item) === index).join(', ')
                || [hints.postalCode, hints.city, hints.country].filter(Boolean).join(' ');
            const value = { latitude, longitude: longitude, name, source: 'system-geocoding' };
            adapter._nwOpenMeteoGeocodeCache = { key: cacheKey, ts: Date.now(), value };
            return value;
        }
        catch { /* try the next location hint */ }
    }
    return null;
}
async function resolveLocation(adapter, settings) {
    // Zentrale Standortquelle ist immer der EOS Admin / system.config. Manuell
    // gespeicherte Altkoordinaten bleiben nur als rückwärtskompatibler Fallback.
    let common = {};
    try {
        const system = await adapter.getForeignObjectAsync?.('system.config');
        common = system?.common && typeof system.common === 'object' ? system.common : {};
    }
    catch { /* optional */ }
    const hints = systemLocationHints(common);
    let weatherLocation = '';
    try {
        const state = await adapter.getStateAsync?.('weatherLocation');
        weatherLocation = meaningfulLocationLabel(state?.val);
    }
    catch { /* optional */ }
    const hintedName = hints.label;
    try {
        const geo = await adapter._nwGetSystemGeo?.();
        const latitude = coordinate(geo?.lat);
        const longitude = coordinate(geo?.lon);
        if (validCoordinatePair(latitude, longitude)) {
            return {
                latitude,
                longitude: longitude,
                // The customer should see the same location label as in the weather
                // tile. Prefer that resolved label, then central EOS location hints.
                name: weatherLocation
                    || meaningfulLocationLabel(geo?.locName)
                    || hintedName
                    || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
                source: 'system-coordinates',
            };
        }
    }
    catch { /* optional */ }
    const latitude = coordinate(common.latitude);
    const longitude = coordinate(common.longitude);
    if (validCoordinatePair(latitude, longitude)) {
        return {
            latitude,
            longitude: longitude,
            name: weatherLocation || hintedName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            source: 'system-coordinates',
        };
    }
    const geocoded = await geocodeSystemLocation(adapter, settings, common);
    if (geocoded)
        return geocoded;
    if (validCoordinatePair(settings.latitude, settings.longitude)) {
        return {
            latitude: settings.latitude,
            longitude: settings.longitude,
            name: weatherLocation || `${settings.latitude.toFixed(5)}, ${settings.longitude.toFixed(5)}`,
            source: 'legacy-manual-fallback',
        };
    }
    return null;
}
async function requestJson(adapter, url) {
    if (adapter._nwHttpsGetJson)
        return adapter._nwHttpsGetJson(url, 12000);
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers: { 'user-agent': 'NexoWatt-EOS-PV-Forecast/1.0' } }, (response) => {
            let body = '';
            response.on('data', (chunk) => { body += String(chunk); });
            response.on('end', () => {
                if (response.statusCode < 200 || response.statusCode >= 300)
                    return reject(new Error(`HTTP ${response.statusCode}`));
                try {
                    resolve(JSON.parse(body));
                }
                catch (error) {
                    reject(error);
                }
            });
        });
        request.setTimeout(12000, () => request.destroy(new Error('Open-Meteo timeout')));
        request.on('error', reject);
    });
}
async function requestJsonWithRetry(adapter, url, attempts = 2) {
    let lastError = null;
    const retries = Math.max(1, Math.min(3, Math.round(attempts)));
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            return await requestJson(adapter, url);
        }
        catch (error) {
            lastError = error;
            if (attempt >= retries)
                break;
            await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        }
    }
    throw lastError instanceof Error ? lastError : new Error(text(lastError, 'Open-Meteo request failed'));
}
function openMeteoSolarPosition(timestampMs, latitude, longitude) {
    const rad = Math.PI / 180;
    const julianDay = timestampMs / 86400000 + 2440587.5;
    const days = julianDay - 2451545;
    const meanLongitude = (280.46 + 0.9856474 * days) % 360;
    const anomaly = (357.528 + 0.9856003 * days) % 360;
    const ecliptic = (meanLongitude + 1.915 * Math.sin(anomaly * rad) + 0.020 * Math.sin(2 * anomaly * rad)) * rad;
    const obliquity = (23.439 - 0.0000004 * days) * rad;
    const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(ecliptic), Math.cos(ecliptic));
    const declination = Math.asin(Math.sin(obliquity) * Math.sin(ecliptic));
    const sidereal = (280.46061837 + 360.98564736629 * (julianDay - 2451545)) * rad;
    let hourAngle = sidereal + longitude * rad - rightAscension;
    while (hourAngle > Math.PI)
        hourAngle -= 2 * Math.PI;
    while (hourAngle < -Math.PI)
        hourAngle += 2 * Math.PI;
    const latitudeRad = latitude * rad;
    const sinAltitude = Math.sin(latitudeRad) * Math.sin(declination)
        + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle);
    const altitude = Math.asin(clamp(sinAltitude, -1, 1, 0));
    const azimuth = Math.atan2(-Math.sin(hourAngle), Math.tan(declination) * Math.cos(latitudeRad) - Math.sin(latitudeRad) * Math.cos(hourAngle));
    return { altitude, zenith: Math.PI / 2 - altitude, azimuth: (azimuth + 2 * Math.PI) % (2 * Math.PI) };
}
function openMeteoPlaneOfArrayIrradiance(timestampMs, latitude, longitude, array, ghi, dni, dhi) {
    const rad = Math.PI / 180;
    const sun = openMeteoSolarPosition(timestampMs, latitude, longitude);
    if (sun.altitude <= 0)
        return 0;
    const tilt = array.tiltDeg * rad;
    const panelAzimuth = ((array.azimuthDeg + 180) % 360) * rad; // 0° UI = south
    const cosIncidence = Math.cos(sun.zenith) * Math.cos(tilt)
        + Math.sin(sun.zenith) * Math.sin(tilt) * Math.cos(sun.azimuth - panelAzimuth);
    return Math.max(0, dni) * Math.max(0, cosIncidence)
        + Math.max(0, dhi) * (1 + Math.cos(tilt)) / 2
        + Math.max(0, ghi) * 0.2 * (1 - Math.cos(tilt)) / 2;
}
function seriesValue(data, key, index) {
    return Array.isArray(data?.hourly?.[key]) ? finite(data.hourly[key][index], 0) : 0;
}
function forecastTimestamp(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value < 1e12 ? value * 1000 : value;
    const raw = text(value, '').trim();
    if (/^\d{10,13}$/.test(raw)) {
        const numeric = Number(raw);
        return raw.length <= 10 ? numeric * 1000 : numeric;
    }
    return Date.parse(raw);
}
function buildOpenMeteoPvCurve(data, settings, location, nowMs) {
    const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
    const horizonEnd = nowMs + settings.horizonHours * 3600000;
    const curve = [];
    for (let index = 0; index < times.length - 1; index += 1) {
        const startHour = forecastTimestamp(times[index]);
        const endHour = forecastTimestamp(times[index + 1]);
        if (!Number.isFinite(startHour) || !Number.isFinite(endHour) || endHour <= startHour || startHour > horizonEnd)
            continue;
        for (let quarter = 0; quarter < 4; quarter += 1) {
            const timestamp = startHour + quarter * SLOT_MS;
            if (timestamp + SLOT_MS <= nowMs - SLOT_MS || timestamp > horizonEnd)
                continue;
            const fraction = quarter / 4;
            const interpolate = (key) => seriesValue(data, key, index)
                + (seriesValue(data, key, index + 1) - seriesValue(data, key, index)) * fraction;
            const ghi = interpolate('shortwave_radiation');
            const dni = interpolate('direct_normal_irradiance');
            const dhi = interpolate('diffuse_radiation');
            const ambient = interpolate('temperature_2m');
            let totalPowerW = 0;
            for (const array of settings.arrays) {
                const poa = openMeteoPlaneOfArrayIrradiance(timestamp, location.latitude, location.longitude, array, ghi, dni, dhi);
                const cellTemperature = ambient + 0.03 * poa;
                const temperatureFactor = clamp(1 - 0.004 * (cellTemperature - 25), 0.7, 1.1, 1);
                let powerW = array.kwp * 1000 * (poa / 1000) * (1 - array.lossPercent / 100) * temperatureFactor;
                if (array.inverterLimitW > 0)
                    powerW = Math.min(powerW, array.inverterLimitW);
                totalPowerW += Math.max(0, powerW);
            }
            curve.push({ t: timestamp, dtMs: SLOT_MS, w: Math.round(totalPowerW) });
        }
    }
    return curve.sort((a, b) => a.t - b.t).slice(0, 384);
}
function tiltedForecastBlock(data) {
    const block = data?.minutely_15 && typeof data.minutely_15 === 'object'
        ? data.minutely_15
        : (data?.hourly && typeof data.hourly === 'object' ? data.hourly : null);
    if (!block)
        return null;
    const time = Array.isArray(block.time) ? block.time : [];
    const irradiance = Array.isArray(block.global_tilted_irradiance) ? block.global_tilted_irradiance : [];
    const temperature = Array.isArray(block.temperature_2m) ? block.temperature_2m : [];
    return time.length && irradiance.length ? { time, irradiance, temperature } : null;
}
/**
 * Builds the plant curve directly from Open-Meteo Global Tilted Irradiance.
 * Each PV surface is requested with its own tilt/azimuth and then summed. This
 * avoids local solar-position conversion errors and follows Open-Meteo's
 * documented 0° south / -90° east / +90° west convention exactly.
 */
function buildOpenMeteoTiltedPvCurve(responses, settings, nowMs) {
    const horizonEnd = nowMs + settings.horizonHours * 3600000;
    const powerByTimestamp = new Map();
    const durationByTimestamp = new Map();
    for (const response of responses) {
        const block = tiltedForecastBlock(response.data);
        if (!block)
            continue;
        const count = Math.min(block.time.length, block.irradiance.length);
        for (let index = 0; index < count; index += 1) {
            const timestamp = forecastTimestamp(block.time[index]);
            const nextTimestamp = index + 1 < count ? forecastTimestamp(block.time[index + 1]) : timestamp + SLOT_MS;
            if (!Number.isFinite(timestamp) || !Number.isFinite(nextTimestamp) || nextTimestamp <= timestamp)
                continue;
            if (nextTimestamp <= nowMs - SLOT_MS || timestamp > horizonEnd)
                continue;
            // Open-Meteo may return native 15-minute GTI or an hourly/interpolated
            // series, depending on the selected weather model. Always normalize both
            // variants to the same 15-minute curve used by the EMS planner.
            const intervalMs = nextTimestamp - timestamp;
            const steps = Math.max(1, Math.min(4, Math.ceil(intervalMs / SLOT_MS)));
            const currentGti = Math.max(0, finite(block.irradiance[index], 0));
            const nextGti = index + 1 < count ? Math.max(0, finite(block.irradiance[index + 1], currentGti)) : currentGti;
            const currentAmbient = finite(block.temperature[index], 20);
            const nextAmbient = index + 1 < block.temperature.length ? finite(block.temperature[index + 1], currentAmbient) : currentAmbient;
            for (let step = 0; step < steps; step += 1) {
                const subTimestamp = timestamp + step * Math.min(SLOT_MS, intervalMs);
                const subEnd = Math.min(nextTimestamp, subTimestamp + SLOT_MS);
                if (subEnd <= nowMs - SLOT_MS || subTimestamp > horizonEnd || subEnd <= subTimestamp)
                    continue;
                const fraction = steps <= 1 ? 0 : step / steps;
                const gti = currentGti + (nextGti - currentGti) * fraction;
                const ambient = currentAmbient + (nextAmbient - currentAmbient) * fraction;
                const cellTemperature = ambient + 0.03 * gti;
                const temperatureFactor = clamp(1 - 0.004 * (cellTemperature - 25), 0.7, 1.1, 1);
                let powerW = response.array.kwp * 1000 * (gti / 1000)
                    * (1 - response.array.lossPercent / 100) * temperatureFactor;
                if (response.array.inverterLimitW > 0)
                    powerW = Math.min(powerW, response.array.inverterLimitW);
                powerByTimestamp.set(subTimestamp, (powerByTimestamp.get(subTimestamp) || 0) + Math.max(0, powerW));
                durationByTimestamp.set(subTimestamp, subEnd - subTimestamp);
            }
        }
    }
    return [...powerByTimestamp.entries()]
        .map(([t, w]) => ({ t, dtMs: durationByTimestamp.get(t) || SLOT_MS, w: Math.round(w) }))
        .sort((a, b) => a.t - b.t)
        .slice(0, 384);
}
function mergePvCurves(curves) {
    const powerByTimestamp = new Map();
    const durationByTimestamp = new Map();
    for (const curve of curves) {
        for (const segment of Array.isArray(curve) ? curve : []) {
            const t = finite(segment?.t, Number.NaN);
            const dtMs = Math.max(0, finite(segment?.dtMs, 0));
            const w = Math.max(0, finite(segment?.w, 0));
            if (!Number.isFinite(t) || dtMs <= 0)
                continue;
            powerByTimestamp.set(t, (powerByTimestamp.get(t) || 0) + w);
            durationByTimestamp.set(t, Math.max(durationByTimestamp.get(t) || 0, dtMs));
        }
    }
    return [...powerByTimestamp.entries()]
        .map(([t, w]) => ({ t, dtMs: durationByTimestamp.get(t) || SLOT_MS, w: Math.round(w) }))
        .sort((a, b) => a.t - b.t)
        .slice(0, 384);
}
function integrateKwh(curve, nowMs, hours) {
    const endMs = nowMs + hours * 3600000;
    return curve.reduce((sum, segment) => {
        const overlap = Math.max(0, Math.min(segment.t + segment.dtMs, endMs) - Math.max(segment.t, nowMs));
        return sum + segment.w * overlap / 3600000000;
    }, 0);
}
function normalizeFutureCurve(value, nowMs) {
    const raw = Array.isArray(value) ? value : [];
    return raw
        .filter((segment) => !!segment && typeof segment === 'object')
        .map((segment) => ({
        t: finite(segment.t, Number.NaN),
        dtMs: Math.max(0, finite(segment.dtMs, 0)),
        w: Math.max(0, finite(segment.w, 0)),
    }))
        .filter((segment) => Number.isFinite(segment.t) && segment.dtMs > 0 && segment.t + segment.dtMs > nowMs)
        .sort((a, b) => a.t - b.t)
        .slice(0, 384);
}
function buildLastGoodSnapshot(previous, nowMs, details) {
    if (!previous?.valid)
        return null;
    const lastSuccessAt = finite(previous.lastSuccessAt || previous.ts, 0);
    if (!(lastSuccessAt > 0) || nowMs - lastSuccessAt > MAX_LAST_GOOD_AGE_MS)
        return null;
    const curve = normalizeFutureCurve(previous.curve, nowMs);
    if (!curve.length)
        return null;
    const peakEnd = nowMs + 24 * 3600000;
    const location = details.location;
    return {
        ...previous,
        ts: lastSuccessAt,
        valid: true,
        ageMs: Math.max(0, nowMs - lastSuccessAt),
        points: curve.length,
        positivePoints: curve.filter((segment) => segment.w > 0).length,
        requestCount: Math.max(0, Math.round(finite(details.requestCount, previous.requestCount))),
        requestMode: text(details.requestMode, previous.requestMode),
        requestStatus: text(details.requestStatus, 'stale-error'),
        lastAttemptAt: finite(details.lastAttemptAt, nowMs),
        lastSuccessAt,
        kwhNext6h: integrateKwh(curve, nowMs, 6),
        kwhNext12h: integrateKwh(curve, nowMs, 12),
        kwhNext24h: integrateKwh(curve, nowMs, 24),
        peakWNext24h: curve
            .filter((segment) => segment.t < peakEnd)
            .reduce((max, segment) => Math.max(max, segment.w), 0),
        statusText: details.statusText,
        error: details.error,
        latitude: location?.latitude ?? previous.latitude,
        longitude: location?.longitude ?? previous.longitude,
        locationText: location?.name ?? previous.locationText,
        locationSource: location?.source ?? previous.locationSource,
        curve,
    };
}
function invalidSnapshot(nowMs, error, settings, location, requestStatus = 'error', requestMode = 'none', lastAttemptAt = nowMs) {
    return {
        ts: nowMs, valid: false, source: 'open-meteo-gti', ageMs: 0, points: 0, positivePoints: 0, requestCount: 0, requestMode, requestStatus, lastAttemptAt, lastSuccessAt: 0,
        configuredKwp: settings?.arrays.reduce((sum, item) => sum + item.kwp, 0) ?? 0,
        planningSafetyPct: settings?.planningSafetyPct ?? 85,
        kwhNext6h: 0, kwhNext12h: 0, kwhNext24h: 0, peakWNext24h: 0,
        statusText: error, error,
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        locationText: location?.name ?? '',
        locationSource: location?.source ?? 'none',
        curve: [],
    };
}
async function ensureState(adapter, id, type, role, unit) {
    try {
        await adapter.setObjectNotExistsAsync?.(id, { type: 'state', common: { name: id, type, role, read: true, write: false, unit }, native: {} });
    }
    catch { /* optional */ }
}
/**
 * Mirrors a written forecast state into the adapter's UI cache immediately.
 * The customer frontend reads `/api/state` from `stateCache`; an ioBroker
 * `setStateAsync()` call alone is not sufficient when the state was not yet
 * subscribed or when the persisted value did not change after a restart.
 */
function mirrorForecastUiState(adapter, id, value, timestamp = Date.now()) {
    try {
        const cached = adapter.stateCache?.[id];
        if (cached && Object.is(cached.value, value))
            return;
        adapter.updateValue?.(id, value, timestamp, { raw: false });
    }
    catch { /* UI cache is best-effort; ioBroker state remains authoritative */ }
}
async function writeForecastState(adapter, id, value, timestamp = Date.now()) {
    try {
        if (adapter.setStateAsync)
            await adapter.setStateAsync(id, { val: value, ack: true });
        mirrorForecastUiState(adapter, id, value, timestamp);
        return null;
    }
    catch (error) {
        return `${id}: ${text(error?.message, String(error))}`;
    }
}
function warnForecastStateWriteFailures(adapter, scope, failures) {
    if (!failures.length)
        return;
    const now = Date.now();
    const last = finite(adapter._nwOpenMeteoPvStateWarningAt, 0);
    if (now - last < 60000)
        return;
    adapter._nwOpenMeteoPvStateWarningAt = now;
    adapter.log?.warn?.(`[forecast] ${scope}: ${failures.length} Forecast-State(s) konnten nicht geschrieben werden (${failures.slice(0, 3).join(' | ')})`);
}
async function readPersistedForecastState(adapter, key) {
    try {
        return (await adapter.getStateAsync?.(`forecast.openMeteoPv.${key}`))?.val;
    }
    catch {
        return undefined;
    }
}
/**
 * Restores a recent successful provider curve before the first network request.
 * This makes a short API/DNS outage survivable across an adapter restart. Old or
 * exhausted curves are deliberately rejected so the EMS never plans on stale data.
 */
async function restoreRecentPersistedSnapshot(adapter) {
    if (adapter._openMeteoPvForecast)
        return adapter._openMeteoPvForecast;
    const keys = [
        'valid', 'source', 'updatedAt', 'ageMs', 'points', 'positivePoints', 'requestCount',
        'requestMode', 'requestStatus', 'lastAttemptAt', 'lastSuccessAt', 'configuredKwp',
        'planningSafetyPct', 'kwhNext6h', 'kwhNext12h', 'kwhNext24h', 'peakWNext24h',
        'statusText', 'error', 'latitude', 'longitude', 'locationText', 'locationSource', 'curveJson',
    ];
    const values = Object.fromEntries(await Promise.all(keys.map(async (key) => [key, await readPersistedForecastState(adapter, key)])));
    if (!asBoolean(values.valid, false))
        return null;
    const now = Date.now();
    const lastSuccessAt = finite(values.lastSuccessAt ?? values.updatedAt, 0);
    const persisted = {
        ts: lastSuccessAt,
        valid: asBoolean(values.valid, false),
        source: 'open-meteo-gti',
        ageMs: Math.max(0, now - lastSuccessAt),
        points: Math.max(0, Math.round(finite(values.points, 0))),
        positivePoints: Math.max(0, Math.round(finite(values.positivePoints, 0))),
        requestCount: Math.max(0, Math.round(finite(values.requestCount, 0))),
        requestMode: text(values.requestMode, 'persisted-cache'),
        requestStatus: text(values.requestStatus, 'restored-cache'),
        lastAttemptAt: finite(values.lastAttemptAt, lastSuccessAt),
        lastSuccessAt,
        configuredKwp: Math.max(0, finite(values.configuredKwp, 0)),
        planningSafetyPct: clamp(values.planningSafetyPct, 30, 100, 85),
        kwhNext6h: Math.max(0, finite(values.kwhNext6h, 0)),
        kwhNext12h: Math.max(0, finite(values.kwhNext12h, 0)),
        kwhNext24h: Math.max(0, finite(values.kwhNext24h, 0)),
        peakWNext24h: Math.max(0, finite(values.peakWNext24h, 0)),
        statusText: text(values.statusText, 'Letzte erfolgreiche PV-Prognose aus persistentem Cache geladen'),
        error: text(values.error, ''),
        latitude: finite(values.latitude, 0),
        longitude: finite(values.longitude, 0),
        locationText: text(values.locationText, ''),
        locationSource: text(values.locationSource, 'persisted-cache'),
        curve: parseJson(values.curveJson, []),
    };
    const value = buildLastGoodSnapshot(persisted, now, {
        requestCount: persisted.requestCount,
        requestMode: 'persisted-cache',
        requestStatus: 'restored-cache',
        lastAttemptAt: persisted.lastAttemptAt,
        statusText: 'Letzte erfolgreiche PV-Prognose aus persistentem Cache geladen',
        error: '',
    });
    if (!value)
        return null;
    adapter._openMeteoPvForecast = value;
    adapter.log?.debug?.(`[forecast] Persistierte Open-Meteo-Prognose wiederhergestellt (${value.curve.length} Punkte, ${Math.round(value.ageMs / 60000)} min alt).`);
    return value;
}
async function publish(adapter, value) {
    const definitions = [
        ['valid', 'boolean', 'indicator'], ['source', 'string', 'text'], ['updatedAt', 'number', 'value.time'], ['ageMs', 'number', 'value.interval', 'ms'],
        ['points', 'number', 'value'], ['positivePoints', 'number', 'value'], ['requestCount', 'number', 'value'],
        ['requestMode', 'string', 'text'], ['requestStatus', 'string', 'text'],
        ['lastAttemptAt', 'number', 'value.time'], ['lastSuccessAt', 'number', 'value.time'],
        ['kwhNext6h', 'number', 'value.energy', 'kWh'], ['kwhNext12h', 'number', 'value.energy', 'kWh'],
        ['kwhNext24h', 'number', 'value.energy', 'kWh'], ['peakWNext24h', 'number', 'value.power', 'W'],
        ['configuredKwp', 'number', 'value.power', 'kWp'], ['planningSafetyPct', 'number', 'value.percent', '%'],
        ['latitude', 'number', 'value.gps.latitude', '°'], ['longitude', 'number', 'value.gps.longitude', '°'],
        ['locationText', 'string', 'text'], ['locationSource', 'string', 'text'],
        ['statusText', 'string', 'text'], ['error', 'string', 'text'], ['curveJson', 'string', 'json'],
    ];
    for (const [key, type, role, unit] of definitions)
        await ensureState(adapter, `forecast.openMeteoPv.${key}`, type, role, unit);
    const states = {
        valid: value.valid, source: value.source, updatedAt: value.ts, ageMs: value.ageMs, points: value.points,
        positivePoints: value.positivePoints, requestCount: value.requestCount, requestMode: value.requestMode, requestStatus: value.requestStatus, lastAttemptAt: value.lastAttemptAt, lastSuccessAt: value.lastSuccessAt,
        kwhNext6h: Number(value.kwhNext6h.toFixed(3)), kwhNext12h: Number(value.kwhNext12h.toFixed(3)),
        kwhNext24h: Number(value.kwhNext24h.toFixed(3)), peakWNext24h: value.peakWNext24h,
        configuredKwp: value.configuredKwp, planningSafetyPct: value.planningSafetyPct,
        latitude: value.latitude, longitude: value.longitude, locationText: value.locationText, locationSource: value.locationSource,
        statusText: value.statusText, error: value.error, curveJson: JSON.stringify(value.curve.slice(0, 384)),
    };
    const failures = [];
    const writeTimestamp = Date.now();
    for (const [key, state] of Object.entries(states)) {
        // stateCache timestamps describe when the browser received the state. The
        // forecast data timestamp itself remains explicitly available in updatedAt,
        // lastAttemptAt and lastSuccessAt.
        const failure = await writeForecastState(adapter, `forecast.openMeteoPv.${key}`, state, writeTimestamp);
        if (failure)
            failures.push(failure);
    }
    warnForecastStateWriteFailures(adapter, 'Open-Meteo Publish', failures);
}
async function publishAttempt(adapter, nowMs, settings, location) {
    const definitions = [
        ['lastAttemptAt', 'number', 'value.time'], ['requestMode', 'string', 'text'], ['requestStatus', 'string', 'text'],
        ['configuredKwp', 'number', 'value.power', 'kWp'], ['latitude', 'number', 'value.gps.latitude', '°'],
        ['longitude', 'number', 'value.gps.longitude', '°'], ['locationText', 'string', 'text'],
        ['locationSource', 'string', 'text'], ['statusText', 'string', 'text'], ['error', 'string', 'text'],
    ];
    for (const [key, type, role, unit] of definitions)
        await ensureState(adapter, `forecast.openMeteoPv.${key}`, type, role, unit);
    const values = {
        lastAttemptAt: nowMs,
        requestMode: 'starting',
        requestStatus: 'loading',
        configuredKwp: settings.arrays.reduce((sum, item) => sum + item.kwp, 0),
        latitude: location.latitude,
        longitude: location.longitude,
        locationText: location.name,
        locationSource: location.source,
        statusText: 'Open-Meteo PV-Prognose wird aktualisiert …',
        error: '',
    };
    const failures = [];
    for (const [key, value] of Object.entries(values)) {
        const failure = await writeForecastState(adapter, `forecast.openMeteoPv.${key}`, value, nowMs);
        if (failure)
            failures.push(failure);
    }
    warnForecastStateWriteFailures(adapter, 'Open-Meteo Abrufstart', failures);
}
async function refresh(adapter) {
    const nowMs = Date.now();
    const settings = await loadSettings(adapter);
    if (!settings.enabled || !['auto', 'open-meteo'].includes(settings.sourceMode)) {
        const value = invalidSnapshot(nowMs, 'Open-Meteo PV-Prognose deaktiviert', settings, null, 'disabled', 'none', 0);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    if (settings.arrays.length === 0) {
        const value = invalidSnapshot(nowMs, 'Keine PV-Fläche mit installierter Leistung konfiguriert', settings, null, 'configuration-error', 'none', 0);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    if (settings.weatherUsageMode === 'commercial' && !settings.weatherApiKey) {
        const value = invalidSnapshot(nowMs, 'Gewerbliche Open-Meteo-Nutzung benötigt einen API-Key', settings, null, 'configuration-error', 'none', 0);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    const location = await resolveLocation(adapter, settings);
    if (!location) {
        const value = invalidSnapshot(nowMs, 'Anlagenstandort im EOS Admin / in system.config nicht konfiguriert', settings, null, 'configuration-error', 'none', 0);
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    await publishAttempt(adapter, nowMs, settings, location);
    const baseUrl = settings.weatherUsageMode === 'commercial'
        ? 'https://customer-api.open-meteo.com/v1/forecast'
        : 'https://api.open-meteo.com/v1/forecast';
    const apiKey = settings.weatherUsageMode === 'commercial'
        ? `&apikey=${encodeURIComponent(settings.weatherApiKey)}`
        : '';
    // Open-Meteo exposes 15-minute radiation variables, but native coverage
    // depends on the weather model selected for the location. Keep the direct
    // request within 48 hours and use hourly GTI/components as explicit fallbacks.
    const forecastSlots = Math.min(192, Math.max(24, Math.ceil(Math.min(settings.horizonHours, 48) * 4)));
    const requestErrors = [];
    let requestCount = 0;
    let requestMode = 'minutely-gti';
    let requestStatus = 'loading';
    const requestTiltedArrays = async (arrays, mode) => {
        const settled = await Promise.allSettled(arrays.map(async (array) => {
            const timeQuery = mode === 'minutely-gti'
                ? `&minutely_15=global_tilted_irradiance,temperature_2m&forecast_minutely_15=${forecastSlots}`
                : `&hourly=global_tilted_irradiance,temperature_2m&forecast_hours=${Math.min(74, Math.ceil(settings.horizonHours) + 2)}`;
            const url = `${baseUrl}?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`
                + timeQuery
                + `&tilt=${encodeURIComponent(array.tiltDeg)}&azimuth=${encodeURIComponent(array.azimuthDeg)}`
                + `&timezone=GMT&timeformat=unixtime${apiKey}`;
            requestCount += 1;
            const data = await requestJsonWithRetry(adapter, url, 2);
            if (!data || data.error)
                throw new Error(text(data?.reason, 'Open-Meteo API error'));
            if (!tiltedForecastBlock(data))
                throw new Error(`Keine Global-Tilted-Irradiance für ${array.name}`);
            return { array, data };
        }));
        const responses = [];
        const missing = [];
        const errors = [];
        for (let index = 0; index < settled.length; index += 1) {
            const entry = settled[index];
            const array = arrays[index];
            if (!array)
                continue;
            if (entry?.status === 'fulfilled')
                responses.push(entry.value);
            else {
                missing.push(array);
                errors.push(`${mode}/${array.name}: ${text(entry?.reason?.message, entry?.reason)}`);
            }
        }
        return { responses, missing, errors };
    };
    try {
        // 1) Prefer native/interpolated 15-minute GTI for every configured plane.
        const minutely = await requestTiltedArrays(settings.arrays, 'minutely-gti');
        requestErrors.push(...minutely.errors);
        const tiltedResponses = [...minutely.responses];
        let missingArrays = [...minutely.missing];
        let usedMinutely = minutely.responses.length > 0;
        let usedHourly = false;
        let usedComponents = false;
        // 2) Re-request only missing planes with hourly GTI. This avoids losing the
        //    already successful surfaces and prevents double counting.
        if (missingArrays.length > 0) {
            const hourly = await requestTiltedArrays(missingArrays, 'hourly-gti');
            requestErrors.push(...hourly.errors);
            tiltedResponses.push(...hourly.responses);
            missingArrays = [...hourly.missing];
            usedHourly = hourly.responses.length > 0;
        }
        const curveParts = [];
        if (tiltedResponses.length > 0) {
            curveParts.push(buildOpenMeteoTiltedPvCurve(tiltedResponses, settings, nowMs));
        }
        // 3) Final deterministic fallback for still missing planes: fetch GHI/DNI/
        //    DHI once and calculate only those planes locally.
        if (missingArrays.length > 0 || curveParts.every((curve) => curve.length === 0)) {
            usedComponents = true;
            const componentArrays = missingArrays.length > 0 ? missingArrays : settings.arrays;
            const forecastDays = Math.min(5, Math.max(2, Math.ceil(settings.horizonHours / 24) + 1));
            const hourly = 'temperature_2m,shortwave_radiation,direct_normal_irradiance,diffuse_radiation,cloud_cover';
            const fallbackUrl = `${baseUrl}?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`
                + `&hourly=${hourly}&forecast_days=${forecastDays}&timezone=GMT&timeformat=unixtime${apiKey}`;
            requestCount += 1;
            const fallbackData = await requestJsonWithRetry(adapter, fallbackUrl, 2);
            if (!fallbackData || fallbackData.error)
                throw new Error(text(fallbackData?.reason, 'Open-Meteo fallback API error'));
            curveParts.push(buildOpenMeteoPvCurve(fallbackData, { ...settings, arrays: componentArrays }, location, nowMs));
        }
        const curve = mergePvCurves(curveParts);
        if (curve.length === 0)
            throw new Error('Keine zukünftigen Einstrahlungswerte verfügbar');
        if (usedMinutely && !usedHourly && !usedComponents)
            requestMode = 'minutely-gti';
        else if (!usedMinutely && usedHourly && !usedComponents)
            requestMode = 'hourly-gti';
        else if (!usedMinutely && !usedHourly && usedComponents)
            requestMode = 'hourly-components';
        else
            requestMode = 'mixed-fallback';
        const positivePoints = curve.filter((segment) => segment.w > 0).length;
        requestStatus = positivePoints === 0
            ? 'ok-zero-production'
            : (requestMode === 'minutely-gti' ? 'ok' : 'fallback');
        const zeroHint = positivePoints > 0
            ? `${positivePoints} mit Ertrag`
            : 'aktuell 0 W im Planungshorizont';
        const fallbackHint = requestMode === 'minutely-gti' ? '' : `; Abrufmodus ${requestMode}`;
        const value = {
            ts: nowMs,
            valid: true,
            source: 'open-meteo-gti',
            ageMs: 0,
            points: curve.length,
            positivePoints,
            requestCount,
            requestMode,
            requestStatus,
            lastAttemptAt: nowMs,
            lastSuccessAt: nowMs,
            configuredKwp: settings.arrays.reduce((sum, item) => sum + item.kwp, 0),
            planningSafetyPct: settings.planningSafetyPct,
            kwhNext6h: integrateKwh(curve, nowMs, 6),
            kwhNext12h: integrateKwh(curve, nowMs, 12),
            kwhNext24h: integrateKwh(curve, nowMs, 24),
            peakWNext24h: curve
                .filter((segment) => segment.t < nowMs + 24 * 3600000)
                .reduce((max, segment) => Math.max(max, segment.w), 0),
            statusText: `Open-Meteo PV-Prognose aktiv (${curve.length} Punkte, ${zeroHint}${fallbackHint})`,
            // Successful provider fallback is a normal operating state. Technical
            // errors are retained only in debug logs, not presented as a failed
            // forecast to the customer.
            error: '',
            latitude: location.latitude,
            longitude: location.longitude,
            locationText: location.name,
            locationSource: location.source,
            curve,
        };
        if (requestErrors.length > 0) {
            adapter.log?.debug?.(`[forecast] Open-Meteo fallback chain: ${requestErrors.join(' | ')}`);
        }
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
    catch (error) {
        const previous = adapter._openMeteoPvForecast;
        const message = text(error?.message, String(error));
        const stale = buildLastGoodSnapshot(previous, nowMs, {
            requestCount,
            requestMode,
            requestStatus: 'stale-error',
            lastAttemptAt: nowMs,
            statusText: `Letzte Prognose wird weiterverwendet: ${message}`,
            error: message,
            location,
        });
        if (stale) {
            adapter._openMeteoPvForecast = stale;
            await publish(adapter, stale);
            return stale;
        }
        const value = {
            ...invalidSnapshot(nowMs, message, settings, location),
            requestCount,
            requestMode,
            requestStatus: 'error',
            lastAttemptAt: nowMs,
        };
        adapter._openMeteoPvForecast = value;
        await publish(adapter, value);
        return value;
    }
}
function startOpenMeteoPvForecastRuntime(adapter) {
    let stopped = false;
    let timer = null;
    let running = null;
    const clear = () => {
        if (!timer)
            return;
        try {
            adapter.clearTimeout ? adapter.clearTimeout(timer) : clearTimeout(timer);
        }
        catch { /* optional */ }
        timer = null;
    };
    let restoreChecked = false;
    const cycle = async () => {
        if (stopped || adapter._nwShuttingDown)
            return adapter._openMeteoPvForecast ?? invalidSnapshot(Date.now(), DEFAULT_ERROR);
        if (running)
            return running;
        clear();
        running = (async () => {
            if (!restoreChecked) {
                restoreChecked = true;
                await restoreRecentPersistedSnapshot(adapter).catch((error) => {
                    adapter.log?.debug?.(`[forecast] Persistierter Forecast-Cache nicht lesbar: ${text(error?.message, String(error))}`);
                });
            }
            return refresh(adapter);
        })().finally(async () => {
            running = null;
            if (!stopped && !adapter._nwShuttingDown) {
                const settings = await loadSettings(adapter).catch(() => ({ updateMinutes: 30 }));
                const delay = clamp(settings.updateMinutes, 5, 180, 30) * 60000;
                const callback = () => { cycle().catch(() => { }); };
                timer = adapter.setTimeout ? adapter.setTimeout(callback, delay) : setTimeout(callback, delay);
            }
        });
        return running;
    };
    cycle().catch((error) => adapter.log?.debug?.(`[forecast] ${text(error?.message, String(error))}`));
    return { refresh: cycle, stop: () => { stopped = true; clear(); } };
}
