// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/energy-origin-api.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * lib/energy-origin-api.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 33dbb3a9a2033ba51505b0369dbff5a28459762e8c1f44a0ee1a8a1246a7f874
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/energy-origin-api.ts
 * Quell-Hash: sha256:389e15fba1aa65d4e2ea28fc493682a15366012838a5d77faed2c294240ba739
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/energy-origin-api.js.
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
 * Aufgabe: Verbindet Herkunftsbilanz und Ledger-Daten mit den zugehörigen HTTP-Endpunkten.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/energy-origin-api.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: lib/energy-origin-api.js
 *
 * API-/Export-Brücke der read-only App „Energieherkunft & Ladebilanz“.
 * Die Datei liest ausschließlich die vom Ledger-Runtime-Modul publizierten
 * States. Sie rechnet keine zweite Bilanz und enthält keine Hardwarewrites.
 */
'use strict';
const path = require('node:path');
/**
 * Code-Teil: defaultEnergyOriginConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function defaultEnergyOriginConfig() {
    return {
        enabled: false,
        siteId: 'site_1',
        siteName: 'Standort 1',
        country: 'AUTO',
        intervalMinutes: 15,
        staleSeconds: 300,
        recentIntervalLimit: 672,
        allocationMethod: 'proportional',
        evidenceMode: 'operational',
        dataPoints: {
            gridImportEnergyKwh: '',
            gridExportEnergyKwh: '',
            pvGenerationEnergyKwh: '',
            otherRenewableEnergyKwh: '',
            buildingEnergyKwh: '',
            storageChargeEnergyKwh: '',
            storageDischargeEnergyKwh: '',
        },
        units: {
            gridImportEnergyKwh: 'kWh',
            gridExportEnergyKwh: 'kWh',
            pvGenerationEnergyKwh: 'kWh',
            otherRenewableEnergyKwh: 'kWh',
            buildingEnergyKwh: 'kWh',
            storageChargeEnergyKwh: 'kWh',
            storageDischargeEnergyKwh: 'kWh',
        },
        storage: {
            enabled: true,
            chargeEfficiencyPct: 95,
            dischargeEfficiencyPct: 95,
            exclusiveRenewableChargingDeclared: false,
            initialInventoryKwh: 0,
            initialPvSharePct: 0,
            inventoryMethod: 'pro-rata',
        },
        evidence: {
            sameGridConnectionDeclared: false,
            meteringComplianceDeclared: false,
            publicChargingDeclared: false,
            sameWozObjectDeclared: false,
            directLineDeclared: false,
            noOperatingSubsidyDeclared: false,
            integratedMidMeterDeclared: false,
            operatorType: 'business',
            nlGridRenewableSharePct: 50.5,
        },
        chargePoints: [],
        meters: [],
    };
}
/**
 * Code-Teil: registerEnergyOriginApi
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function registerEnergyOriginApi(options) {
    const { app, rootDir, sendNoStore, isLicensed, isEnabled, readJson, readState, csvEscape, } = options || {};
    if (!app || typeof app.get !== 'function')
        throw new Error('energy-origin-api: Express-App fehlt');
/**
 * Code-Teil: appIsEnabled
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const appIsEnabled = () => {
        try {
            return typeof isEnabled === 'function' ? isEnabled() === true : true;
        }
        catch (_e) {
            return false;
        }
    };
/**
 * Code-Teil: period
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const period = (input) => {
        const p = String(input || 'recent').trim().toLowerCase();
        return ['today', 'month', 'year', 'recent', 'all'].includes(p) ? p : 'recent';
    };
/**
 * Code-Teil: localKey
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const localKey = (ts, kind) => {
        const d = new Date(Number(ts) || Date.now());
        if (kind === 'year')
            return String(d.getFullYear());
        if (kind === 'month')
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
/**
 * Code-Teil: filterIntervals
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const filterIntervals = (rows, requestedPeriod) => {
        const list = Array.isArray(rows) ? rows : [];
        const p = period(requestedPeriod);
        const now = Date.now();
        if (p === 'today') {
            const key = localKey(now, 'day');
            return list.filter((row) => localKey(row && row.startTs, 'day') === key);
        }
        if (p === 'month') {
            const key = localKey(now, 'month');
            return list.filter((row) => localKey(row && row.startTs, 'month') === key);
        }
        if (p === 'year') {
            const key = localKey(now, 'year');
            return list.filter((row) => localKey(row && row.startTs, 'year') === key);
        }
        if (p === 'all')
            return list.slice();
        return list.slice(0, 672);
    };
/**
 * Code-Teil: aggregate
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const aggregate = (rows) => {
        const list = Array.isArray(rows) ? rows : [];
/**
 * Code-Teil: get
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const get = (row, keys, fallback = 0) => {
            let cur = row;
            for (const key of keys)
                cur = cur && typeof cur === 'object' ? cur[key] : undefined;
            const n = Number(cur);
            return Number.isFinite(n) ? n : fallback;
        };
/**
 * Code-Teil: sum
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const sum = (keys) => Math.round(list.reduce((acc, row) => acc + get(row, keys, 0), 0) * 1e6) / 1e6;
        const total = sum(['evcs', 'totalKwh']);
        const pvDirect = sum(['evcs', 'sourceBreakdown', 'pvDirectKwh']);
        const otherDirect = sum(['evcs', 'sourceBreakdown', 'otherRenewableDirectKwh']);
        const storedPv = sum(['evcs', 'sourceBreakdown', 'storedPvKwh']);
        const storedOther = sum(['evcs', 'sourceBreakdown', 'storedOtherRenewableKwh']);
        const gridDirect = sum(['evcs', 'sourceBreakdown', 'gridDirectKwh']);
        const storedGrid = sum(['evcs', 'sourceBreakdown', 'storedGridKwh']);
        const known = pvDirect + otherDirect + storedPv + storedOther + gridDirect + storedGrid;
        const unknown = Math.max(0, Math.round((total - known) * 1e6) / 1e6);
        const de = Math.round(list.reduce((a, row) => a + get(row, ['evidence', 'de', 'eligibleRenewableKwh']), 0) * 1e6) / 1e6;
        const nl = Math.round(list.reduce((a, row) => a + get(row, ['evidence', 'nl', 'eligibleRenewableKwh']), 0) * 1e6) / 1e6;
        return {
            schema: 'nexowatt.energy-origin-api-summary.v1',
            intervalCount: list.length,
            completeIntervalCount: list.filter((row) => row && row.quality && row.quality.status === 'complete').length,
            evcsTotalKwh: total,
            pvDirectKwh: pvDirect,
            otherRenewableDirectKwh: otherDirect,
            storedPvKwh: storedPv,
            storedOtherRenewableKwh: storedOther,
            gridDirectKwh: gridDirect,
            storedGridKwh: storedGrid,
            unknownKwh: unknown,
            operationalRenewableKwh: Math.round((pvDirect + otherDirect + storedPv + storedOther) * 1e6) / 1e6,
            deCandidateRenewableKwh: de,
            nlCandidateRenewableKwh: nl,
        };
    };
/**
 * Code-Teil: buildPayload
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const buildPayload = (requestedPeriod) => {
        const intervalsAll = readJson('energyLedger.origin.intervalsRecentJson', []);
        const p = period(requestedPeriod);
        const intervals = filterIntervals(intervalsAll, p);
        return {
            ok: true,
            schema: 'nexowatt.energy-origin-ledger-api.v1',
            generatedAt: Date.now(),
            period: p,
            enabled: !!readState('energyLedger.origin.enabled', false),
            status: String(readState('energyLedger.origin.status', 'init') || 'init'),
            edition: String(readState('energyLedger.origin.edition', 'none') || 'none'),
            config: readJson('energyLedger.origin.configJson', {}),
            currentInterval: readJson('energyLedger.origin.currentIntervalJson', {}),
            lastInterval: readJson('energyLedger.origin.lastIntervalJson', {}),
            storageInventory: readJson('energyLedger.origin.storageInventoryJson', {}),
            meterStatus: readJson('energyLedger.origin.meterStatusJson', {}),
            configHistory: readJson('energyLedger.origin.configHistoryJson', []),
            summary: aggregate(intervals),
            intervals,
            allIntervalCount: Array.isArray(intervalsAll) ? intervalsAll.length : 0,
            hashHead: String(readState('energyLedger.origin.hashHead', '') || ''),
            legalNote: 'Nachweiskandidat; keine automatische behördliche Anerkennung oder Vergütungszusage.',
            exportUrls: {
                json: `/api/ledger/energy-origin.json?period=${encodeURIComponent(p)}`,
                csv: `/api/ledger/energy-origin.csv?period=${encodeURIComponent(p)}`,
            },
        };
    };
/**
 * Code-Teil: toCsv
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const toCsv = (payload) => {
        const rows = [];
        rows.push(['schema', 'nexowatt.energy-origin-ledger-export.v1'].map(csvEscape).join(';'));
        rows.push(['generatedAt', String(payload && payload.generatedAt || Date.now()), 'period', payload && payload.period || 'recent'].map(csvEscape).join(';'));
        rows.push(['legalNote', payload && payload.legalNote || ''].map(csvEscape).join(';'));
        rows.push('');
        rows.push(['Intervall_Start', 'Intervall_Ende', 'Standort', 'Qualitaet', 'Hash', 'Vorheriger_Hash', 'Konfig_Hash', 'Ladepunkt', 'Bezeichnung', 'Station', 'Connector', 'Zaehler_Seriennummer', 'Zaehlerklasse', 'EVCS_kWh', 'PV_direkt_kWh', 'EE_sonstig_direkt_kWh', 'PV_aus_Speicher_kWh', 'EE_aus_Speicher_kWh', 'Netz_direkt_kWh', 'Netz_aus_Speicher_kWh', 'Unbekannt_kWh', 'DE_Nachweiskandidat', 'NL_Nachweiskandidat'].map(csvEscape).join(';'));
        const intervals = payload && Array.isArray(payload.intervals) ? payload.intervals : [];
        for (const interval of intervals) {
            const cps = interval && interval.evcs && Array.isArray(interval.evcs.chargePoints) ? interval.evcs.chargePoints : [];
            const list = cps.length ? cps : [{ chargePointId: '', label: '', stationId: '', connectorNo: '', meterSerial: '', meterClass: '', energyKwh: interval && interval.evcs && interval.evcs.totalKwh || 0, sources: interval && interval.evcs && interval.evcs.sourceBreakdown || {} }];
            for (const cp of list) {
                const src = cp.sources || cp.sourceBreakdown || {};
                const cpEnergyKwh = Number(cp.energyKwh !== undefined ? cp.energyKwh : cp.totalKwh) || 0;
                const known = Number(src.pvDirectKwh || 0) + Number(src.otherRenewableDirectKwh || 0) + Number(src.storedPvKwh || 0) + Number(src.storedOtherRenewableKwh || 0) + Number(src.gridDirectKwh || 0) + Number(src.storedGridKwh || 0);
                const unknown = Number(src.unknownDirectKwh || 0) + Number(src.storedUnknownKwh || 0) + Math.max(0, cpEnergyKwh - known - Number(src.unknownDirectKwh || 0) - Number(src.storedUnknownKwh || 0));
                rows.push([
                    interval.startTs || '', interval.endTs || '', interval.siteId || '', interval.quality && interval.quality.status || '', interval.hash || '', interval.previousHash || '', interval.configHash || '',
                    cp.id || cp.chargePointId || '', cp.label || '', cp.stationId || '', cp.connectorNo || '', cp.meterSerial || '', cp.meterClass || '', cpEnergyKwh.toFixed(6),
                    Number(src.pvDirectKwh || 0).toFixed(6), Number(src.otherRenewableDirectKwh || 0).toFixed(6), Number(src.storedPvKwh || 0).toFixed(6), Number(src.storedOtherRenewableKwh || 0).toFixed(6),
                    Number(src.gridDirectKwh || 0).toFixed(6), Number(src.storedGridKwh || 0).toFixed(6), Number(unknown || 0).toFixed(6),
                    interval.evidence && interval.evidence.de && interval.evidence.de.ready ? 'ja' : 'nein', interval.evidence && interval.evidence.nl && interval.evidence.nl.ready ? 'ja' : 'nein',
                ].map(csvEscape).join(';'));
            }
        }
        return '\ufeff' + rows.join('\r\n');
    };
    app.get(['/ledger/energy-origin', '/ledger/energy-origin/'], (_req, res) => {
        sendNoStore(res);
        // Die Betreiberseite ist selbst ein optionales AppCenter-Feature. Ohne
        // gültige Home-/Pro-Lizenz sowie installed+enabled darf weder Navigation
        // noch Direkt-URL die Seite öffnen; stattdessen zurück zum LIVE-Cockpit.
        if (!isLicensed() || !appIsEnabled())
            return res.redirect(302, '/');
        return res.sendFile(path.join(rootDir, 'www', 'energy-ledger.html'));
    });
    app.get(['/api/ledger/energy-origin', '/api/ledger/energy-origin.json'], (req, res) => {
        try {
            sendNoStore(res);
            if (!isLicensed())
                return res.status(403).json({ ok: false, error: 'license_required', message: 'Gültige NexoWatt Home- oder Pro-Lizenz erforderlich.' });
            if (!appIsEnabled())
                return res.status(409).json({ ok: false, error: 'app_not_active', message: 'Die App „Energieherkunft & Ladebilanz“ ist im AppCenter nicht installiert oder nicht aktiviert.' });
            return res.json(buildPayload(req.query && req.query.period));
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return res.status(500).json({ ok: false, error: 'internal_error', message });
        }
    });
    app.get('/api/ledger/energy-origin.csv', (req, res) => {
        try {
            sendNoStore(res);
            if (!isLicensed())
                return res.status(403).type('text/plain').send('Gültige NexoWatt Home- oder Pro-Lizenz erforderlich.');
            if (!appIsEnabled())
                return res.status(409).type('text/plain').send('Die App „Energieherkunft & Ladebilanz“ ist im AppCenter nicht aktiviert.');
            const payload = buildPayload(req.query && req.query.period);
            const key = localKey(Date.now(), payload.period === 'year' ? 'year' : (payload.period === 'month' ? 'month' : 'day'));
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="NexoWatt_Energieherkunft_${payload.period}_${key}.csv"`);
            return res.status(200).send(toCsv(payload));
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return res.status(500).type('text/plain').send('Energieherkunft CSV Export Fehler: ' + message);
        }
    });
    return { period, localKey, filterIntervals, aggregate, buildPayload, toCsv };
}
module.exports = { defaultEnergyOriginConfig, registerEnergyOriginApi };
