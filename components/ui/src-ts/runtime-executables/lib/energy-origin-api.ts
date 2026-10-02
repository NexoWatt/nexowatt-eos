// @runtime-transpile
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

function registerEnergyOriginApi(options: any) {
  const {
    app,
    rootDir,
    sendNoStore,
    isLicensed,
    isEnabled,
    readJson,
    readState,
    csvEscape,
  } = options || {};
  if (!app || typeof app.get !== 'function') throw new Error('energy-origin-api: Express-App fehlt');
  const appIsEnabled = () => {
    try { return typeof isEnabled === 'function' ? isEnabled() === true : true; } catch (_e) { return false; }
  };

  const period = (input: any) => {
    const p = String(input || 'recent').trim().toLowerCase();
    return ['today', 'month', 'year', 'recent', 'all'].includes(p) ? p : 'recent';
  };
  const localKey = (ts: any, kind: any) => {
    const d = new Date(Number(ts) || Date.now());
    if (kind === 'year') return String(d.getFullYear());
    if (kind === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const filterIntervals = (rows: any, requestedPeriod: any) => {
    const list = Array.isArray(rows) ? rows : [];
    const p = period(requestedPeriod);
    const now = Date.now();
    if (p === 'today') {
      const key = localKey(now, 'day');
      return list.filter((row: any) => localKey(row && row.startTs, 'day') === key);
    }
    if (p === 'month') {
      const key = localKey(now, 'month');
      return list.filter((row: any) => localKey(row && row.startTs, 'month') === key);
    }
    if (p === 'year') {
      const key = localKey(now, 'year');
      return list.filter((row: any) => localKey(row && row.startTs, 'year') === key);
    }
    if (p === 'all') return list.slice();
    return list.slice(0, 672);
  };
  const aggregate = (rows: any) => {
    const list = Array.isArray(rows) ? rows : [];
    const get = (row: any, keys: any, fallback: any = 0) => {
      let cur = row;
      for (const key of keys) cur = cur && typeof cur === 'object' ? cur[key] : undefined;
      const n = Number(cur);
      return Number.isFinite(n) ? n : fallback;
    };
    const sum = (keys: any) => Math.round(list.reduce((acc: any, row: any) => acc + get(row, keys, 0), 0) * 1e6) / 1e6;
    const total = sum(['evcs', 'totalKwh']);
    const pvDirect = sum(['evcs', 'sourceBreakdown', 'pvDirectKwh']);
    const otherDirect = sum(['evcs', 'sourceBreakdown', 'otherRenewableDirectKwh']);
    const storedPv = sum(['evcs', 'sourceBreakdown', 'storedPvKwh']);
    const storedOther = sum(['evcs', 'sourceBreakdown', 'storedOtherRenewableKwh']);
    const gridDirect = sum(['evcs', 'sourceBreakdown', 'gridDirectKwh']);
    const storedGrid = sum(['evcs', 'sourceBreakdown', 'storedGridKwh']);
    const known = pvDirect + otherDirect + storedPv + storedOther + gridDirect + storedGrid;
    const unknown = Math.max(0, Math.round((total - known) * 1e6) / 1e6);
    const de = Math.round(list.reduce((a: any, row: any) => a + get(row, ['evidence', 'de', 'eligibleRenewableKwh']), 0) * 1e6) / 1e6;
    const nl = Math.round(list.reduce((a: any, row: any) => a + get(row, ['evidence', 'nl', 'eligibleRenewableKwh']), 0) * 1e6) / 1e6;
    return {
      schema: 'nexowatt.energy-origin-api-summary.v1',
      intervalCount: list.length,
      completeIntervalCount: list.filter((row: any) => row && row.quality && row.quality.status === 'complete').length,
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
  const buildPayload = (requestedPeriod: any) => {
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
  const toCsv = (payload: any) => {
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

  app.get(['/ledger/energy-origin', '/ledger/energy-origin/'], (_req: any, res: any) => {
    sendNoStore(res);
    // Die Betreiberseite ist selbst ein optionales AppCenter-Feature. Ohne
    // gültige Home-/Pro-Lizenz sowie installed+enabled darf weder Navigation
    // noch Direkt-URL die Seite öffnen; stattdessen zurück zum LIVE-Cockpit.
    if (!isLicensed() || !appIsEnabled()) return res.redirect(302, '/');
    return res.sendFile(path.join(rootDir, 'www', 'energy-ledger.html'));
  });
  app.get(['/api/ledger/energy-origin', '/api/ledger/energy-origin.json'], (req: any, res: any) => {
    try {
      sendNoStore(res);
      if (!isLicensed()) return res.status(403).json({ ok: false, error: 'license_required', message: 'Gültige NexoWatt Home- oder Pro-Lizenz erforderlich.' });
      if (!appIsEnabled()) return res.status(409).json({ ok: false, error: 'app_not_active', message: 'Die App „Energieherkunft & Ladebilanz“ ist im AppCenter nicht installiert oder nicht aktiviert.' });
      return res.json(buildPayload(req.query && req.query.period));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ ok: false, error: 'internal_error', message });
    }
  });
  app.get('/api/ledger/energy-origin.csv', (req: any, res: any) => {
    try {
      sendNoStore(res);
      if (!isLicensed()) return res.status(403).type('text/plain').send('Gültige NexoWatt Home- oder Pro-Lizenz erforderlich.');
      if (!appIsEnabled()) return res.status(409).type('text/plain').send('Die App „Energieherkunft & Ladebilanz“ ist im AppCenter nicht aktiviert.');
      const payload = buildPayload(req.query && req.query.period);
      const key = localKey(Date.now(), payload.period === 'year' ? 'year' : (payload.period === 'month' ? 'month' : 'day'));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="NexoWatt_Energieherkunft_${payload.period}_${key}.csv"`);
      return res.status(200).send(toCsv(payload));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).type('text/plain').send('Energieherkunft CSV Export Fehler: ' + message);
    }
  });

  return { period, localKey, filterIntervals, aggregate, buildPayload, toCsv };
}

module.exports = { defaultEnergyOriginConfig, registerEnergyOriginApi };
