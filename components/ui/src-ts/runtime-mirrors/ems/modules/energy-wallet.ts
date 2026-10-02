// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/energy-wallet.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/energy-wallet.js
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
 * Original-Hash: 8c133ad0d0daee5384074e671793c8956a2b92f96b6bc9b7c79e1e80ee942e10
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
 * Quelle: src-ts/runtime-executables/ems/modules/energy-wallet.ts
 * Quell-Hash: sha256:f6ea800c08e539cf0078c8da90ded6f16082910322374e3021c7cff9f555caf8
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/energy-wallet.js.
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
 * Aufgabe: Bereitet Energiekonto-/Wallet-Werte und deren Zuordnung innerhalb des EMS auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/energy-wallet.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/energy-wallet.js
 *
 * Zweck:
 * Berechnet das NexoWatt Energie-Wertkonto für Home und EOS. Das Modul ist bewusst
 * anzeigend/auswertend und schreibt keine Gerätesollwerte. Einstellungen bleiben im
 * Installer-/App-Center, das Kundenfrontend zeigt nur Wert, Nutzen und einfache Hinweise.
 *
 * 0.8.16:
 * - Tages-, Monats- und Jahreswerte werden getrennt persistiert.
 * - Neustarts übernehmen vorhandene ioBroker-State-Werte, wenn die Periodenschlüssel passen.
 * - Plausibilitätsdiagnosen verhindern blindes Integrieren bei fehlenden/stalen Quellen.
 *
 * 0.8.20:
 * - Das Wertkonto nutzt bei aktivem dynamischem Zeittarif den aktuellen Tarifpreis.
 * - Feste Preisannahmen sind Kunden-/Betreibereinstellungen aus dem Frontend
 *   (`settings.energyWallet*`) und keine Installer-/Admin-Konfiguration mehr.
 * - Installer-Config bleibt nur als Legacy-Fallback erhalten, damit Bestandsanlagen
 *   nach Updates keinen Wertverlust in der Berechnung bekommen.
 *
 * 0.8.23:
 * - `settings.energyWalletEnabled` ist der kundenseitige An/Aus-Schalter.
 * - Optionale veraltete Zusatzquellen wie EVCS/Speicher bleiben in der Diagnose,
 *   erzeugen aber keine gelbe Kundenwarnung mehr, solange PV und Netz frisch sind.
 *
 * 0.8.24:
 * - Kundenhinweise und Installateurdiagnosen werden getrennt veröffentlicht.
 * - Die Preisquelle des Wertkontos wird nachvollziehbar gemacht: fester Preis,
 *   dynamischer Tarif, Legacy-Config oder Fallback.
 * - Dynamische Tarifpreise bekommen Quelle, Alter und Stale-Prüfung, damit ein
 *   veralteter Zeittarif nicht unbemerkt als aktueller Arbeitspreis verwendet wird.
 *
 * 0.8.27:
 * - Vorbereitende Verbindung zum Local kWh Ledger. Die Wallet liest nur den
 *   Bridge-Payload `energyLedger.walletBridge.summaryJson` und zählt ihn bewusst nicht
 *   noch einmal in die Wallet-Werte hinein. So entstehen keine doppelten kWh.
 *
 * 0.8.31:
 * - NL/P1-Brücke ergänzt. Das Wertkonto übernimmt Saldering-/Teruglevering-Infos
 *   nur als Referenzanzeige aus `nl.saldering.summaryJson`/`nl.teruglevering.summaryJson`
 *   und zählt diese Werte nicht erneut in die Home-/EOS-Wallet-Summen.
 */
'use strict';
const { BaseModule } = require('./base');
/**
 * Code-Teil: num
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function num(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: round
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function round(v, digits = 3) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.min(6, Number(digits) || 0)));
  return Math.round(n * f) / f;
}

/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Code-Teil: todayKeyLocal
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function todayKeyLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Code-Teil: monthKeyLocal
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function monthKeyLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Code-Teil: yearKeyLocal
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function yearKeyLocal(date = new Date()) {
  return String(date.getFullYear());
}

/**
 * Code-Teil: normalizePriceEurPerKwh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizePriceEurPerKwh(value, fallback) {
  const n = num(value, fallback);
  if (!Number.isFinite(n)) return fallback;
  const abs = Math.abs(n);
  // Installer geben Preise häufig in ct/kWh ein. Werte >2 und <=500 interpretieren wir als ct/kWh.
  const eur = abs > 2 && abs <= 500 ? n / 100 : n;
  if (!Number.isFinite(eur) || eur < -2 || eur > 5) return fallback;
  return eur;
}

/**
 * Code-Teil: emptyAcc
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function emptyAcc() {
  return {
    pvKwh: 0,
    localUseKwh: 0,
    gridImportKwh: 0,
    gridExportKwh: 0,
    evcsKwh: 0,
    evcsSolarKwh: 0,
    storageChargeKwh: 0,
    storageDischargeKwh: 0,
    avoidedGridCostEur: 0,
    feedInValueEur: 0,
    evcsValueEur: 0,
    storageValueEur: 0,
    potentialAdditionalValueEur: 0,
    curtailedKwh: 0,
    curtailedValueEur: 0,
    unusedPvValueEur: 0,
  };
}

const ACC_KEYS = Object.keys(emptyAcc());

/**
 * Code-Teil: EnergyWalletModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class EnergyWalletModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    const now = new Date();
    this._lastTs = 0;
    this._dayKey = todayKeyLocal(now);
    this._monthKey = monthKeyLocal(now);
    this._yearKey = yearKeyLocal(now);
    this._primed = false;
    this._acc = emptyAcc();
    this._monthAcc = emptyAcc();
    this._yearAcc = emptyAcc();
    this._lastDiagnostics = this._emptyDiagnostics('init');
  }

  _emptyAcc() { return emptyAcc(); }

  _emptyDiagnostics(status = 'init') {
    return {
      status,
      warning: '',
      lastSkippedReason: '',
      dataQualityPercent: status === 'ok' ? 100 : 0,
      missingSources: [],
      staleSources: [],
      clippedSources: [],
      activeSources: {},
      customerWarning: '',
      installerWarning: '',
      updatedAt: Date.now(),
    };
  }

  async init() {
    await this._ensureStates();
    await this._primeFromStates();
    await this._publish('init');
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;

    await a.setObjectNotExistsAsync('energyWallet', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.today', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto heute' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.month', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto aktueller Monat' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.year', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto aktuelles Jahr' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.diagnostics', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto Diagnose' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.configuredPrices', {
      type: 'channel',
      common: { name: 'Energie-Wertkonto konfigurierte Preise' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.ledgerBridge', {
      type: 'channel',
      common: { name: 'Local kWh Ledger Brücke' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.exportGuardBridge', {
      type: 'channel',
      common: { name: 'Export Guard Brücke' },
      native: {},
    });
    await a.setObjectNotExistsAsync('energyWallet.nlBridge', {
      type: 'channel',
      common: { name: 'NL P1/Saldering Brücke' },
      native: {},
    });

/**
 * Code-Teil: mk
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const mk = async (id, name, type, role, unit, def) => {
      const common = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };

    await mk('energyWallet.enabled', 'Energie-Wertkonto aktiv', 'boolean', 'indicator', '', true);
    await mk('energyWallet.editionMode', 'Energie-Wertkonto Editionsmodus', 'string', 'text', '', 'home');
    await mk('energyWallet.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('energyWallet.lastExplanation', 'Letzte Erklärung', 'string', 'text', '', '');
    await mk('energyWallet.explanation', 'Erklärung für Nutzerfrontend', 'string', 'text', '', '');
    await mk('energyWallet.status', 'Status', 'string', 'text', '', 'init');
    await mk('energyWallet.summaryJson', 'Energie-Wertkonto Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('energyWallet.periodsJson', 'Energie-Wertkonto Perioden JSON', 'string', 'json', '', '{}');

    await this._ensurePeriodStates('energyWallet.today', 'Tag', this._dayKey, mk);
    await this._ensurePeriodStates('energyWallet.month', 'Monat', this._monthKey, mk);
    await this._ensurePeriodStates('energyWallet.year', 'Jahr', this._yearKey, mk);

    await mk('energyWallet.diagnostics.status', 'Diagnosestatus', 'string', 'text', '', 'init');
    await mk('energyWallet.diagnostics.warning', 'Diagnosehinweis', 'string', 'text', '', '');
    await mk('energyWallet.diagnostics.customerWarning', 'Kundenhinweis', 'string', 'text', '', '');
    await mk('energyWallet.diagnostics.installerWarning', 'Installateurdiagnose', 'string', 'text', '', '');
    await mk('energyWallet.diagnostics.lastSkippedReason', 'Letzter übersprungener Grund', 'string', 'text', '', '');
    await mk('energyWallet.diagnostics.dataQualityPercent', 'Datenqualität', 'number', 'value.percent', '%', 0);
    await mk('energyWallet.diagnostics.missingSourcesJson', 'Fehlende Quellen JSON', 'string', 'json', '', '[]');
    await mk('energyWallet.diagnostics.staleSourcesJson', 'Veraltete Quellen JSON', 'string', 'json', '', '[]');
    await mk('energyWallet.diagnostics.clippedSourcesJson', 'Begrenzte Quellen JSON', 'string', 'json', '', '[]');
    await mk('energyWallet.diagnostics.activeSourcesJson', 'Aktive Quellen JSON', 'string', 'json', '', '{}');
    await mk('energyWallet.diagnostics.plausibilityJson', 'Plausibilitätsdiagnose JSON', 'string', 'json', '', '{}');

    await mk('energyWallet.configuredPrices.gridImportEurPerKwh', 'wirksamer Netzbezugspreis', 'number', 'value.price', '€/kWh', 0.35);
    await mk('energyWallet.configuredPrices.feedInEurPerKwh', 'Einspeisewert', 'number', 'value.price', '€/kWh', 0.08);
    await mk('energyWallet.configuredPrices.evcsValueEurPerKwh', 'Solar-Ladepunktwert', 'number', 'value.price', '€/kWh', 0.35);
    await mk('energyWallet.configuredPrices.fixedGridImportEurPerKwh', 'fester Preis aus Frontend-Einstellungen', 'number', 'value.price', '€/kWh', 0.35);
    await mk('energyWallet.configuredPrices.dynamicTariffActive', 'dynamischer Zeittarif aktiv', 'boolean', 'indicator', '', false);
    await mk('energyWallet.configuredPrices.dynamicTariffAvailable', 'dynamischer Tarifpreis verfügbar', 'boolean', 'indicator', '', false);
    await mk('energyWallet.configuredPrices.dynamicTariffStale', 'dynamischer Tarifpreis veraltet', 'boolean', 'indicator', '', false);
    await mk('energyWallet.configuredPrices.currentDynamicPriceEurPerKwh', 'aktueller dynamischer Tarifpreis', 'number', 'value.price', '€/kWh', 0);
    await mk('energyWallet.configuredPrices.priceSource', 'Preisquelle', 'string', 'text', '', 'fixed');
    await mk('energyWallet.configuredPrices.priceSourceLabel', 'Preisquelle Anzeige', 'string', 'text', '', 'Festpreis');
    await mk('energyWallet.configuredPrices.currentDynamicPriceSource', 'Quelle dynamischer Tarifpreis', 'string', 'text', '', '');
    await mk('energyWallet.configuredPrices.currentDynamicPriceAgeSec', 'Alter dynamischer Tarifpreis', 'number', 'value.interval', 's', 0);
    await mk('energyWallet.configuredPrices.currentDynamicPriceLastUpdate', 'Zeitstempel dynamischer Tarifpreis', 'number', 'value.time', '', 0);
    await mk('energyWallet.configuredPrices.dynamicTariffWarning', 'Hinweis dynamischer Tarif', 'string', 'text', '', '');

    await mk('energyWallet.ledgerBridge.available', 'Local kWh Ledger verfügbar', 'boolean', 'indicator', '', false);
    await mk('energyWallet.ledgerBridge.countingMode', 'Ledger-Zählmodus', 'string', 'text', '', 'reference-only');
    await mk('energyWallet.ledgerBridge.todayEvcsKwh', 'Ledger EVCS heute', 'number', 'value.energy', 'kWh', 0);
    await mk('energyWallet.ledgerBridge.todayLocalKwh', 'Ledger lokal heute', 'number', 'value.energy', 'kWh', 0);
    await mk('energyWallet.ledgerBridge.todayValueEur', 'Ledger Wert heute', 'number', 'value.currency', '€', 0);
    await mk('energyWallet.ledgerBridge.monthEvcsKwh', 'Ledger EVCS Monat', 'number', 'value.energy', 'kWh', 0);
    await mk('energyWallet.ledgerBridge.yearEvcsKwh', 'Ledger EVCS Jahr', 'number', 'value.energy', 'kWh', 0);
    await mk('energyWallet.ledgerBridge.summaryJson', 'Ledger-Brücke JSON', 'string', 'json', '', '{}');

    await mk('energyWallet.exportGuardBridge.available', 'Export Guard Diagnose verfügbar', 'boolean', 'indicator', '', false);
    await mk('energyWallet.exportGuardBridge.curtailmentPowerW', 'aktuelle geschätzte Abregelungsleistung', 'number', 'value.power', 'W', 0);
    await mk('energyWallet.exportGuardBridge.exportOverLimitW', 'Einspeisung über Limit', 'number', 'value.power', 'W', 0);
    await mk('energyWallet.exportGuardBridge.allowedExportW', 'erlaubte Einspeiseleistung', 'number', 'value.power', 'W', 0);
    await mk('energyWallet.exportGuardBridge.currentExportW', 'aktuelle Einspeisung', 'number', 'value.power', 'W', 0);
    await mk('energyWallet.exportGuardBridge.negativePriceActive', 'negative Preisstrategie aktiv', 'boolean', 'indicator', '', false);
    await mk('energyWallet.exportGuardBridge.summaryJson', 'Export Guard Brücke JSON', 'string', 'json', '', '{}');
    await mk('energyWallet.nlBridge.status', 'NL-Brücke Status', 'string', 'text', '', 'disabled');
    await mk('energyWallet.nlBridge.terugleveringTodayEur', 'Teruglevering Wert heute', 'number', 'value.money', '€', 0);
    await mk('energyWallet.nlBridge.terugleveringCostTodayEur', 'Teruglevering Kosten heute', 'number', 'value.money', '€', 0);
    await mk('energyWallet.nlBridge.salderingExitRiskTodayEur', 'Saldering-Exit Risikowert heute', 'number', 'value.money', '€', 0);
    await mk('energyWallet.nlBridge.summaryJson', 'NL P1/Saldering Brücke JSON', 'string', 'json', '', '{}');
  }

  async _ensurePeriodStates(prefix, keyLabel, defKey, mk) {
    await mk(`${prefix}.${prefix.endsWith('today') ? 'dayKey' : prefix.endsWith('month') ? 'monthKey' : 'yearKey'}`, keyLabel, 'string', 'text', '', defKey);
    await mk(`${prefix}.valueEur`, `Wert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.pvKwh`, `PV-Erzeugung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.localUseKwh`, `Lokal genutzte PV-Energie ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.localUsePercent`, `Lokale Nutzungsquote ${keyLabel.toLowerCase()}`, 'number', 'value.percent', '%', 0);
    await mk(`${prefix}.gridImportKwh`, `Netzbezug ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.gridExportKwh`, `Einspeisung/Rücklieferung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.evcsKwh`, `Ladepunkte Energie ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.evcsSolarKwh`, `Solar-Anteil Ladepunkte ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.storageChargeKwh`, `Speicherladung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.storageDischargeKwh`, `Speicherentladung ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.avoidedGridCostEur`, `Vermiedener Netzbezug ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.feedInValueEur`, `Einspeisewert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.evcsValueEur`, `Solar-Ladepunktwert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.storageValueEur`, `Speicherwert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.potentialAdditionalValueEur`, `Zusätzliches lokales Nutzungspotenzial ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.curtailedKwh`, `abgeregelte PV-Energie ${keyLabel.toLowerCase()}`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.curtailedValueEur`, `Wert abgeregelter PV-Energie ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
    await mk(`${prefix}.unusedPvValueEur`, `nicht genutzter PV-Wert ${keyLabel.toLowerCase()}`, 'number', 'value.money', '€', 0);
  }

  async _primeFromStates() {
    if (this._primed) return;
    this._primed = true;
    const a = this.adapter;
    if (!a || typeof a.getStateAsync !== 'function') return;
    const now = new Date();
    this._dayKey = todayKeyLocal(now);
    this._monthKey = monthKeyLocal(now);
    this._yearKey = yearKeyLocal(now);
    try {
      this._acc = await this._primePeriod('energyWallet.today', 'dayKey', this._dayKey);
      this._monthAcc = await this._primePeriod('energyWallet.month', 'monthKey', this._monthKey);
      this._yearAcc = await this._primePeriod('energyWallet.year', 'yearKey', this._yearKey);
    } catch (_e) {
      this._acc = emptyAcc();
      this._monthAcc = emptyAcc();
      this._yearAcc = emptyAcc();
    }
  }

  async _primePeriod(prefix, keyName, expectedKey) {
    const a = this.adapter;
    const st = await a.getStateAsync(`${prefix}.${keyName}`);
    const stateKey = st && st.val ? String(st.val) : '';
    const acc = emptyAcc();
    if (stateKey !== expectedKey) return acc;
    for (const key of ACC_KEYS) {
      const stateId = `${prefix}.${key}`;
      const s = await a.getStateAsync(stateId);
      const v = num(s && s.val, null);
      if (Number.isFinite(v)) acc[key] = Math.max(0, v);
    }
    return acc;
  }

  _cacheEntry(key) {
    const cache = this.adapter && this.adapter.stateCache ? this.adapter.stateCache : null;
    if (!cache || !key) return null;
    try {
      if (!Object.prototype.hasOwnProperty.call(cache, String(key))) return null;
      const rec = cache[String(key)];
      if (rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value')) return rec;
      if (rec !== undefined && rec !== null) return { value: rec, ts: Date.now() };
    } catch (_e) {}
    return null;
  }

  _readCacheCandidate(keys, options = {}) {
    const list = Array.isArray(keys) ? keys : [keys];
    const staleMs = Number.isFinite(Number(options.staleMs)) ? Number(options.staleMs) : 5 * 60 * 1000;
    const maxAbsW = Number.isFinite(Number(options.maxAbsW)) ? Math.max(1, Number(options.maxAbsW)) : 2_000_000;
    const positive = options.positive === true;
    const now = Date.now();
    const staleSeen = [];

    for (const key of list) {
      const rec = this._cacheEntry(key);
      if (!rec) continue;
      const vRaw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
      let v = num(vRaw, null);
      if (!Number.isFinite(v)) continue;
      const ts = Number(rec && rec.ts ? rec.ts : now);
      if (Number.isFinite(ts) && staleMs > 0 && now - ts > staleMs) {
        staleSeen.push(String(key));
        continue;
      }
      let clipped = false;
      if (positive && v < 0) {
        v = 0;
        clipped = true;
      }
      if (Math.abs(v) > maxAbsW) {
        v = Math.sign(v) * maxAbsW;
        clipped = true;
      }
      return { found: true, key: String(key), value: v, ts, staleSeen, clipped };
    }

    return { found: false, key: '', value: null, ts: 0, staleSeen, clipped: false };
  }

  _readCacheNumber(keys, fallback = null) {
    const c = this._readCacheCandidate(keys, { staleMs: this._staleMs(), maxAbsW: this._maxPlausiblePowerW() });
    return c && c.found && Number.isFinite(Number(c.value)) ? Number(c.value) : fallback;
  }

  _readStateNumber(keys, fallback = null) {
    // Kunden-/Betreiberpreise liegen bewusst als lokale `settings.*`-States vor.
    // Diese Hilfsfunktion liest sie aus dem Adapter-StateCache, damit die Berechnung
    // ohne Admin/App-Center-Config und ohne Hardwarezugriff arbeiten kann.
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const rec = this._cacheEntry(key);
      if (!rec) continue;
      const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }


  _readStateCandidate(keys) {
    // 0.8.24: Für dynamische Tarifpreise reicht der Zahlenwert allein nicht mehr.
    // Das Wertkonto muss auch wissen, welcher State verwendet wurde und wie alt der
    // Preis ist. Nur so kann die LIVE-Karte eine nachvollziehbare Preisquelle zeigen
    // und ein alter Zeittarif sauber auf den festen Preis zurückfallen.
    const list = Array.isArray(keys) ? keys : [keys];
    const now = Date.now();
    for (const key of list) {
      const rec = this._cacheEntry(key);
      if (!rec) continue;
      const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      const tsRaw = rec && typeof rec === 'object' ? Number(rec.ts || rec.lc || 0) : 0;
      const ts = Number.isFinite(tsRaw) && tsRaw > 0 ? tsRaw : now;
      return {
        found: true,
        key: String(key),
        value: n,
        ts,
        ageSec: Math.max(0, Math.round((now - ts) / 1000)),
      };
    }
    return { found: false, key: '', value: null, ts: 0, ageSec: 0 };
  }


  _readStateString(keys, fallback = '') {
    const a = this.adapter;
    const cache = a && a.stateCache && typeof a.stateCache === 'object' ? a.stateCache : null;
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      try {
        const id = String(key || '').trim();
        if (!id) continue;
        let val = null;
        if (cache && Object.prototype.hasOwnProperty.call(cache, id)) {
          const st = cache[id];
          val = st && typeof st === 'object' && 'value' in st ? st.value : st;
        } else if (cache && a && a.namespace && Object.prototype.hasOwnProperty.call(cache, `${a.namespace}.${id}`)) {
          const st = cache[`${a.namespace}.${id}`];
          val = st && typeof st === 'object' && 'value' in st ? st.value : st;
        }
        if (val !== null && val !== undefined && String(val).trim() !== '') return String(val);
      } catch (_e) {}
    }
    return String(fallback || '');
  }


  _readStateBool(keys, fallback = false) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const rec = this._cacheEntry(key);
      if (!rec) continue;
      const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'number') return raw !== 0;
      const txt = String(raw === null || raw === undefined ? '' : raw).trim().toLowerCase();
      if (['true', '1', 'yes', 'ja', 'on', 'an', 'aktiv', 'active'].includes(txt)) return true;
      if (['false', '0', 'no', 'nein', 'off', 'aus', 'inaktiv', 'inactive'].includes(txt)) return false;
    }
    return !!fallback;
  }


  _readJsonState(keys, fallback = {}) {
    // Liest JSON-States aus dem lokalen StateCache. Wird für die 0.8.27-
    // Ledger-Bridge verwendet, damit Energy Wallet und Local kWh Ledger verbunden
    // werden können, ohne Ledger-kWh doppelt in die Wallet-Perioden zu integrieren.
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const rec = this._cacheEntry(key);
      if (!rec) continue;
      const raw = rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(rec, 'value') ? rec.value : rec;
      try {
        if (raw && typeof raw === 'object') return raw;
        if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw);
      } catch (_e) {}
    }
    return fallback;
  }

  _ledgerBridge() {
    const bridge = this._readJsonState(['energyLedger.walletBridge.summaryJson', 'energyLedger.walletBridgeJson'], {});
    const todayRaw = bridge && bridge.today && typeof bridge.today === 'object' ? bridge.today : {};
    const monthRaw = bridge && bridge.month && typeof bridge.month === 'object' ? bridge.month : {};
    const yearRaw = bridge && bridge.year && typeof bridge.year === 'object' ? bridge.year : {};
    const available = !!(bridge && typeof bridge === 'object' && (bridge.available === true || bridge.status === 'ready' || Number(todayRaw.totalKwh ?? todayRaw.evcsKwh ?? todayRaw.ledgerEvcsKwh ?? 0) > 0));
    const today = available ? todayRaw : {};
    const month = available ? monthRaw : {};
    const year = available ? yearRaw : {};
    return {
      available,
      countingMode: String((bridge && bridge.countingMode) || 'reference-only'),
      note: String((bridge && bridge.reason) || 'Ledgerwerte sind Referenzwerte und werden nicht doppelt in das Wertkonto integriert.'),
      todayEvcsKwh: round(today.evcsKwh ?? today.ledgerEvcsKwh ?? 0, 3),
      todayLocalKwh: round(today.localKwh ?? today.ledgerLocalKwh ?? 0, 3),
      todayValueEur: round(today.valueEur ?? today.ledgerValueEur ?? 0, 2),
      monthEvcsKwh: round(month.evcsKwh ?? month.ledgerEvcsKwh ?? 0, 3),
      yearEvcsKwh: round(year.evcsKwh ?? year.ledgerEvcsKwh ?? 0, 3),
      raw: bridge && typeof bridge === 'object' ? bridge : {},
    };
  }

  _cfg() {
    return (this.adapter && this.adapter.config && this.adapter.config.energyWallet && typeof this.adapter.config.energyWallet === 'object')
      ? this.adapter.config.energyWallet
      : {};
  }

  _staleMs() {
    const cfg = this._cfg();
    const sec = Number(cfg.staleTimeoutSec !== undefined ? cfg.staleTimeoutSec : (cfg.plausibilityStaleTimeoutSec !== undefined ? cfg.plausibilityStaleTimeoutSec : 300));
    return Math.round(clamp(Number.isFinite(sec) ? sec : 300, 30, 3600) * 1000);
  }

  _maxPlausiblePowerW() {
    const cfg = this._cfg();
    const raw = cfg.plausibilityMaxPowerW !== undefined ? cfg.plausibilityMaxPowerW : (cfg.maxPlausiblePowerW !== undefined ? cfg.maxPlausiblePowerW : 2_000_000);
    return Math.round(clamp(raw, 1000, 50_000_000));
  }

  /**
   * Code-Teil: _exportGuardBridge
   * Zweck: Liest die Export-Guard-Diagnose als Referenz für das Energie-Wertkonto.
   * Zusammenhang: Diese Brücke zählt keine kWh doppelt und schaltet keine Hardware. Sie übernimmt nur die
   * bereits vom Grid-Constraints-Modul berechnete Abregelungsleistung in die normale Wallet-Integration.
   */

  _nlBridge() {
    // 0.8.31: Referenzbrücke zum NL P1/DSMR-Modul. Wichtig: Diese Werte
    // werden nicht in die Wallet-Summen addiert, weil das Wertkonto Einspeisung
    // bereits über PV/Grid bewertet. Die Brücke macht nur sichtbar, welche NL-
    // Saldering-/Teruglevering-Werte aus dem P1-Modul kommen.
    const salderingRaw = this._readStateString(['nl.saldering.summaryJson'], '');
    const terugRaw = this._readStateString(['nl.teruglevering.summaryJson'], '');
    let saldering = null;
    let teruglevering = null;
    try { saldering = salderingRaw ? JSON.parse(salderingRaw) : null; } catch (_e) { saldering = null; }
    try { teruglevering = terugRaw ? JSON.parse(terugRaw) : null; } catch (_e) { teruglevering = null; }
    const active = !!(saldering || teruglevering);
    return {
      status: active ? 'linked' : 'disabled',
      saldering: saldering || {},
      teruglevering: teruglevering || {},
      terugleveringTodayEur: Number(teruglevering && teruglevering.valueTodayEur) || 0,
      terugleveringCostTodayEur: Number(teruglevering && teruglevering.costTodayEur) || 0,
      salderingExitRiskTodayEur: Number(saldering && saldering.exitRiskEurToday) || 0,
      note: active ? 'NL-Brücke aktiv; Anzeige ohne Doppelzählung in den Wallet-Summen.' : 'Keine NL P1/Saldering-Daten vorhanden.',
    };
  }

  _exportGuardBridge() {
    const a = this.adapter;
/**
 * Code-Teil: val
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const val = (id, fallback = null) => {
      try {
        const v = (a && a.stateCache && a.stateCache[id] && Object.prototype.hasOwnProperty.call(a.stateCache[id], 'val')) ? a.stateCache[id].val : undefined;
        return v === undefined || v === null ? fallback : v;
      } catch (_e) { return fallback; }
    };
    let raw = null;
    try {
      const txt = String(val('gridConstraints.exportLimit.summaryJson', val('gridConstraints.exportLimit.displayJson', '')) || '').trim();
      if (txt) raw = JSON.parse(txt);
    } catch (_e) { raw = null; }
/**
 * Code-Teil: num
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const num = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const curtailmentPowerW = Math.max(0, num(raw?.estimatedCurtailmentW, num(raw?.unusedPvPowerW, num(val('gridConstraints.exportLimit.estimatedCurtailmentW', val('gridConstraints.pvCurtail.estimatedCurtailmentW', 0)), 0))));
    const exportOverLimitW = Math.max(0, num(raw?.exportOverLimitW, num(val('gridConstraints.exportLimit.exportOverLimitW', 0), 0)));
    const allowedExportW = Math.max(0, num(raw?.effectiveMaxFeedInW, num(val('gridConstraints.exportLimit.effectiveMaxFeedInW', 0), 0)));
    const currentExportW = Math.max(0, num(raw?.currentExportW, num(val('gridConstraints.exportLimit.currentExportW', 0), 0)));
    const negativePriceActive = !!(raw?.negativePriceActive || val('gridConstraints.exportLimit.negativePriceActive', false) === true || String(val('gridConstraints.exportLimit.negativePriceActive', '')).toLowerCase() === 'true');
    return { available: !!raw || curtailmentPowerW > 0 || exportOverLimitW > 0, curtailmentPowerW, exportOverLimitW, allowedExportW, currentExportW, negativePriceActive, raw: raw || {} };
  }

  _prices() {
    const cfg = this._cfg();

    // 0.8.24 Preislogik:
    // - Der feste Netzstrompreis bleibt die sichere Basis und wird vom Kunden/Betreiber
    //   im normalen Frontend gepflegt.
    // - Ist der dynamische Zeittarif aktiv, wird der aktuelle Tarifpreis nur verwendet,
    //   wenn er vorhanden und nicht älter als die erlaubte Maximalzeit ist.
    // - Quelle, Alter und Fallback-Grund werden veröffentlicht, damit Nutzerkarte und
    //   Installateurdiagnose nicht dieselbe Warnsprache verwenden müssen.
    const dynamicTariffActive = this._readStateBool(['settings.dynamicTariff', 'dynamicTariff'], false);
    const tariffCandidate = this._readStateCandidate([
      'ems.budget.tariff.currentPriceEurKwh',
      'tarif.preisAktuellEurProKwh',
      'historie.tariff.providerCurrentEurPerKwh',
      'priceCurrent',
      'tarif.priceCurrent',
      'tariff.priceCurrent',
    ]);
    const tariffNow = tariffCandidate.found ? normalizePriceEurPerKwh(tariffCandidate.value, null) : null;
    const maxAgeSecRaw = cfg.dynamicTariffMaxAgeSec !== undefined ? Number(cfg.dynamicTariffMaxAgeSec) : 7200;
    const maxAgeSec = Math.round(clamp(Number.isFinite(maxAgeSecRaw) ? maxAgeSecRaw : 7200, 60, 86400));
    const tariffFinite = Number.isFinite(Number(tariffNow));
    const tariffFresh = tariffFinite && (!tariffCandidate.found || tariffCandidate.ageSec <= maxAgeSec);
    const dynamicTariffAvailable = dynamicTariffActive && tariffFinite && tariffFresh;

    const fixedInput = this._readStateNumber([
      'settings.energyWalletFixedImportEurPerKwh',
      'settings.energyWalletGridImportEurPerKwh',
      // settings.price ist der bereits vorhandene kundennahe Festpreis aus der Tarifseite.
      // Er bleibt Fallback, damit der Nutzer nicht denselben Preis doppelt pflegen muss.
      'settings.price',
    ], null);
    const legacyFixedInput = cfg.gridImportEurPerKwh !== undefined ? cfg.gridImportEurPerKwh
      : (cfg.importPriceEurPerKwh !== undefined ? cfg.importPriceEurPerKwh
        : (cfg.importPriceEurKwh !== undefined ? cfg.importPriceEurKwh
          : (cfg.gridImportCtKwh !== undefined ? cfg.gridImportCtKwh : undefined)));
    const fixedGridImport = normalizePriceEurPerKwh(fixedInput !== null ? fixedInput : legacyFixedInput, 0.35);
    const gridImport = dynamicTariffAvailable ? tariffNow : fixedGridImport;

    const feedInInput = this._readStateNumber(['settings.energyWalletFeedInEurPerKwh'], null);
    const feedIn = normalizePriceEurPerKwh(
      feedInInput !== null ? feedInInput
        : (cfg.feedInEurPerKwh !== undefined ? cfg.feedInEurPerKwh
          : (cfg.feedInPriceEurPerKwh !== undefined ? cfg.feedInPriceEurPerKwh
            : (cfg.feedInPriceEurKwh !== undefined ? cfg.feedInPriceEurKwh
              : (cfg.feedInCtKwh !== undefined ? cfg.feedInCtKwh : undefined)))),
      0.08
    );
    const evcsInput = this._readStateNumber(['settings.energyWalletEvcsValueEurPerKwh'], null);
    const evcsValue = normalizePriceEurPerKwh(
      evcsInput !== null ? evcsInput
        : (cfg.evcsValueEurPerKwh !== undefined ? cfg.evcsValueEurPerKwh : (cfg.evcsValueEurKwh !== undefined ? cfg.evcsValueEurKwh : gridImport)),
      gridImport
    );

    let dynamicTariffWarning = '';
    if (dynamicTariffActive && !tariffCandidate.found) {
      dynamicTariffWarning = 'Dynamischer Zeittarif ist aktiv, aber es wurde kein aktueller Tarifpreis gefunden. Das Wertkonto nutzt den festen Netzstrompreis.';
    } else if (dynamicTariffActive && tariffCandidate.found && !tariffFinite) {
      dynamicTariffWarning = `Dynamischer Tarifpreis aus ${tariffCandidate.key} ist nicht plausibel. Das Wertkonto nutzt den festen Netzstrompreis.`;
    } else if (dynamicTariffActive && tariffCandidate.found && !tariffFresh) {
      dynamicTariffWarning = `Dynamischer Tarifpreis aus ${tariffCandidate.key} ist ${tariffCandidate.ageSec}s alt. Das Wertkonto nutzt den festen Netzstrompreis.`;
    }

    const priceSource = dynamicTariffAvailable ? 'dynamicTariff' : (fixedInput !== null ? 'frontendFixed' : (legacyFixedInput !== undefined ? 'legacyConfig' : 'fallback'));
    const priceSourceLabel = dynamicTariffAvailable
      ? 'Dynamischer Zeittarif'
      : (priceSource === 'frontendFixed' ? 'Fester Preis aus Einstellungen'
        : (priceSource === 'legacyConfig' ? 'Legacy-Installerwert' : 'Fallback-Preis'));

    return {
      gridImportEurPerKwh: gridImport,
      feedInEurPerKwh: feedIn,
      evcsValueEurPerKwh: evcsValue,
      fixedGridImportEurPerKwh: fixedGridImport,
      dynamicTariffActive: !!dynamicTariffActive,
      dynamicTariffAvailable: !!dynamicTariffAvailable,
      dynamicTariffStale: !!(dynamicTariffActive && tariffCandidate.found && tariffFinite && !tariffFresh),
      currentDynamicPriceEurPerKwh: tariffFinite ? tariffNow : null,
      currentDynamicPriceSource: tariffCandidate.found ? tariffCandidate.key : '',
      currentDynamicPriceAgeSec: tariffCandidate.found ? tariffCandidate.ageSec : 0,
      currentDynamicPriceLastUpdate: tariffCandidate.found ? tariffCandidate.ts : 0,
      dynamicTariffMaxAgeSec: maxAgeSec,
      dynamicTariffWarning,
      priceSource,
      priceSourceLabel,
    };
  }

  _snapshotPower() {
    const staleMs = this._staleMs();
    const maxAbsW = this._maxPlausiblePowerW();
    const missingSources = [];
    const staleSources = [];
    const clippedSources = [];
    const activeSources = {};
    const requiredLabels = new Set(['pv', 'gridSigned', 'gridImport', 'gridExport']);
    const staleRequiredSources = [];
    const clippedRequiredSources = [];

/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const read = (label, keys, opts = {}) => {
      const c = this._readCacheCandidate(keys, { staleMs, maxAbsW, positive: opts.positive === true });
      if (c.staleSeen && c.staleSeen.length) {
        const rows = c.staleSeen.map(k => `${label}:${k}`);
        staleSources.push(...rows);
        if (requiredLabels.has(label) && !c.found) staleRequiredSources.push(...rows);
      }
      if (c.found) {
        activeSources[label] = c.key;
        if (c.clipped) {
          const row = `${label}:${c.key}`;
          clippedSources.push(row);
          if (requiredLabels.has(label)) clippedRequiredSources.push(row);
        }
        return c;
      }
      return c;
    };

    const pv = read('pv', ['ems.budget.pvPowerW', 'pvPower', 'productionPowerW', 'derived.core.pv.totalW'], { positive: true });
    const signedGrid = read('gridSigned', ['ems.gridPowerRawW', 'ems.gridPowerW', 'gridPower', 'gridPowerW'], {});
    const gridBuy = read('gridImport', ['gridBuyPower'], { positive: true });
    const gridSell = read('gridExport', ['gridSellPower'], { positive: true });
    const evcs = read('evcs', ['chargingManagement.control.usedW', 'consumptionEvcs', 'evcs.totalPowerW', 'evcsPower'], { positive: true });
    const storageCharge = read('storageCharge', ['storageFarm.totalChargePowerW', 'storageChargePower'], { positive: true });
    const storageDischarge = read('storageDischarge', ['storageFarm.totalDischargePowerW', 'storageDischargePower'], { positive: true });
    const batterySigned = read('batterySigned', ['batteryPower', 'storagePower'], {});

    const hasPvSource = !!pv.found;
    const hasGridSource = !!(signedGrid.found || gridBuy.found || gridSell.found);
    if (!hasPvSource) missingSources.push('pvPower');
    if (!hasGridSource) missingSources.push('gridPower');

    const pvW = hasPvSource ? Math.max(0, Number(pv.value) || 0) : 0;
    const signedGridW = signedGrid.found ? Number(signedGrid.value) : null;
    const importFallback = Number.isFinite(Number(signedGridW)) ? Math.max(0, Number(signedGridW)) : 0;
    const exportFallback = Number.isFinite(Number(signedGridW)) ? Math.max(0, -Number(signedGridW)) : 0;
    const gridImportW = gridBuy.found ? Math.max(0, Number(gridBuy.value) || 0) : importFallback;
    const gridExportW = gridSell.found ? Math.max(0, Number(gridSell.value) || 0) : exportFallback;
    const evcsW = evcs.found ? Math.max(0, Number(evcs.value) || 0) : 0;

    let storageChargeW = storageCharge.found ? Math.max(0, Number(storageCharge.value) || 0) : 0;
    let storageDischargeW = storageDischarge.found ? Math.max(0, Number(storageDischarge.value) || 0) : 0;
    if (batterySigned.found) {
      const b = Number(batterySigned.value);
      if (storageChargeW <= 0 && b < 0) storageChargeW = Math.max(0, -b);
      if (storageDischargeW <= 0 && b > 0) storageDischargeW = Math.max(0, b);
    }

    const plausibleBalanceWarn = (hasPvSource && hasGridSource && pvW <= 0 && gridExportW > 200)
      ? 'Einspeisung erkannt, aber PV-Leistung ist 0 W. Bitte PV- oder Netz-Vorzeichen prüfen.'
      : '';

    let dataQualityPercent = 100;
    if (!hasPvSource) dataQualityPercent -= 45;
    if (!hasGridSource) dataQualityPercent -= 45;
    // Die sichtbare Datenqualität bewertet nur die Kernquellen PV/Netz hart.
    // Optionale Zusatzquellen (EVCS, Speicher) können bei vielen Anlagen selten schreiben
    // oder gar nicht vorhanden sein. Sie bleiben in den Diagnose-JSONs, sollen aber den
    // Endkunden nicht unnötig mit einer Warnung verunsichern, wenn die Hauptberechnung stimmt.
    if (staleRequiredSources.length) dataQualityPercent -= Math.min(25, staleRequiredSources.length * 8);
    if (clippedRequiredSources.length) dataQualityPercent -= Math.min(25, clippedRequiredSources.length * 12);
    if (plausibleBalanceWarn) dataQualityPercent -= 15;
    dataQualityPercent = clamp(dataQualityPercent, 0, 100);

    let status = 'ok';
    let customerWarning = '';
    if (!hasPvSource || !hasGridSource) {
      status = 'waiting-data';
      customerWarning = `Energie-Wertkonto wartet auf ${missingSources.join(' und ')}.`;
    } else if (plausibleBalanceWarn) {
      status = 'warn';
      customerWarning = plausibleBalanceWarn;
    } else if (staleRequiredSources.length || clippedRequiredSources.length) {
      // 0.8.24: Technische Qualitätsdetails bleiben für Service/Installer sichtbar,
      // werden aber nicht mehr als gelber Kundenhinweis angezeigt, solange die
      // Berechnung mit gültigen Kernquellen läuft.
      status = 'warn';
    }

    const integratable = hasPvSource && hasGridSource && dataQualityPercent >= 40;

    const installerWarningParts = [];
    if (customerWarning) installerWarningParts.push(customerWarning);
    if (staleSources.length) installerWarningParts.push(`Veraltete Kandidaten: ${staleSources.join(', ')}`);
    if (clippedSources.length) installerWarningParts.push(`Begrenzte Kandidaten: ${clippedSources.join(', ')}`);

    const diagnostics = {
      status,
      // `warning` bleibt für alte UI-Pfade vorhanden, enthält aber nur noch den
      // kundenrelevanten Hinweis. Technische Details stehen in installerWarning.
      warning: customerWarning,
      customerWarning,
      installerWarning: installerWarningParts.join(' | '),
      lastSkippedReason: integratable ? '' : (missingSources.length ? `missing:${missingSources.join(',')}` : 'low-quality'),
      dataQualityPercent: round(dataQualityPercent, 0),
      missingSources,
      staleSources,
      staleRequiredSources,
      clippedSources,
      clippedRequiredSources,
      activeSources,
      updatedAt: Date.now(),
    };

    const exportGuardBridge = this._exportGuardBridge();
    const curtailmentW = Math.max(0, Number(exportGuardBridge.curtailmentPowerW) || 0);

    return { pvW, gridImportW, gridExportW, evcsW, storageChargeW, storageDischargeW, curtailmentW, exportGuardBridge, diagnostics, integratable };
  }

  _isEnabled() {
    const cfg = this._cfg();
    // Kundenfreiheit: Der Nutzer/Betreiber darf das Energie-Wertkonto im Frontend
    // ausschalten. Der Installer-Schalter bleibt technischer Fallback, aber der
    // kundennahe `settings.energyWalletEnabled` hat Vorrang für Anzeige und Berechnung.
    const customerEnabled = this._readStateBool(['settings.energyWalletEnabled'], true);
    return cfg.enabled !== false && customerEnabled !== false;
  }

  async tick() {
    if (!this._isEnabled()) {
      this._lastDiagnostics = this._emptyDiagnostics('disabled');
      try { await this.adapter.setStateAsync('energyWallet.enabled', false, true); } catch (_e) {}
      return;
    }

    const now = Date.now();
    const date = new Date(now);
    const currentDay = todayKeyLocal(date);
    const currentMonth = monthKeyLocal(date);
    const currentYear = yearKeyLocal(date);

    let resetStatus = '';
    if (currentYear !== this._yearKey) {
      this._yearKey = currentYear;
      this._yearAcc = emptyAcc();
      resetStatus = 'reset-year';
    }
    if (currentMonth !== this._monthKey) {
      this._monthKey = currentMonth;
      this._monthAcc = emptyAcc();
      resetStatus = resetStatus || 'reset-month';
    }
    if (currentDay !== this._dayKey) {
      this._dayKey = currentDay;
      this._acc = emptyAcc();
      this._lastTs = now;
      resetStatus = resetStatus || 'reset-day';
      await this._publish(resetStatus);
      return;
    }

    if (!this._lastTs) {
      this._lastTs = now;
      await this._publish('ready');
      return;
    }

    const dtMsRaw = now - this._lastTs;
    this._lastTs = now;
    // Schutz gegen Neustart-/Sleep-Ausreißer. Lange Lücken nicht blind integrieren.
    if (!Number.isFinite(dtMsRaw) || dtMsRaw < 250 || dtMsRaw > 10 * 60 * 1000) {
      this._lastDiagnostics = {
        ...this._emptyDiagnostics('skip-interval'),
        lastSkippedReason: 'interval-out-of-range',
        warning: 'Das Energie-Wertkonto hat eine unplausible Zeitlücke übersprungen.',
        customerWarning: 'Das Energie-Wertkonto hat eine unplausible Zeitlücke übersprungen.',
        installerWarning: 'Integrationsintervall außerhalb des erlaubten Bereichs; keine kWh-/Euro-Fortschreibung.',
        dataQualityPercent: 0,
      };
      await this._publish('skip-interval');
      return;
    }

    const p = this._snapshotPower();
    this._lastDiagnostics = p.diagnostics || this._emptyDiagnostics('ok');
    if (!p.integratable) {
      await this._publish(p.diagnostics && p.diagnostics.status ? p.diagnostics.status : 'waiting-data');
      return;
    }

    const hours = dtMsRaw / 3600000;
    const prices = this._prices();

    const pvKwh = p.pvW / 1000 * hours;
    const exportKwh = p.gridExportW / 1000 * hours;
    const importKwh = p.gridImportW / 1000 * hours;
    const evcsKwh = p.evcsW / 1000 * hours;
    const chargeKwh = p.storageChargeW / 1000 * hours;
    const dischargeKwh = p.storageDischargeW / 1000 * hours;
    const localUseKwh = Math.max(0, pvKwh - exportKwh);
    const evcsSolarKwh = Math.min(evcsKwh, localUseKwh);

    const avoidedGridCost = localUseKwh * prices.gridImportEurPerKwh;
    const feedInValue = exportKwh * prices.feedInEurPerKwh;
    const evcsValue = evcsSolarKwh * prices.evcsValueEurPerKwh;
    const storageValue = Math.min(chargeKwh, localUseKwh) * Math.max(0, prices.gridImportEurPerKwh - prices.feedInEurPerKwh);
    const potential = exportKwh * Math.max(0, prices.gridImportEurPerKwh - prices.feedInEurPerKwh);
    const curtailedKwh = Math.max(0, Number(p.curtailmentW) || 0) / 1000 * hours;
    const curtailedValueEur = curtailedKwh * Math.max(0, prices.feedInEurPerKwh);
    const unusedPvValueEur = curtailedKwh * Math.max(0, prices.gridImportEurPerKwh);

    const delta = {
      pvKwh,
      localUseKwh,
      gridImportKwh: importKwh,
      gridExportKwh: exportKwh,
      evcsKwh,
      evcsSolarKwh,
      storageChargeKwh: chargeKwh,
      storageDischargeKwh: dischargeKwh,
      avoidedGridCostEur: avoidedGridCost,
      feedInValueEur: feedInValue,
      evcsValueEur: evcsValue,
      storageValueEur: storageValue,
      potentialAdditionalValueEur: potential,
      curtailedKwh,
      curtailedValueEur,
      unusedPvValueEur,
    };

    this._addDelta(this._acc, delta);
    this._addDelta(this._monthAcc, delta);
    this._addDelta(this._yearAcc, delta);

    await this._publish(p.diagnostics && p.diagnostics.status === 'warn' ? 'warn' : 'ok');
  }

  _addDelta(target, delta) {
    for (const key of ACC_KEYS) {
      const v = Number(delta[key]);
      if (Number.isFinite(v)) target[key] = Math.max(0, Number(target[key] || 0) + v);
    }
  }

  _periodSummary(acc, key) {
    const localUsePercent = acc.pvKwh > 0 ? (acc.localUseKwh / acc.pvKwh * 100) : 0;
    const valueEur = acc.avoidedGridCostEur + acc.feedInValueEur;
    return {
      key,
      valueEur: round(valueEur, 2),
      pvKwh: round(acc.pvKwh, 3),
      localUseKwh: round(acc.localUseKwh, 3),
      localUsePercent: round(localUsePercent, 1),
      gridImportKwh: round(acc.gridImportKwh, 3),
      gridExportKwh: round(acc.gridExportKwh, 3),
      evcsKwh: round(acc.evcsKwh, 3),
      evcsSolarKwh: round(acc.evcsSolarKwh, 3),
      storageChargeKwh: round(acc.storageChargeKwh, 3),
      storageDischargeKwh: round(acc.storageDischargeKwh, 3),
      avoidedGridCostEur: round(acc.avoidedGridCostEur, 2),
      feedInValueEur: round(acc.feedInValueEur, 2),
      evcsValueEur: round(acc.evcsValueEur, 2),
      storageValueEur: round(acc.storageValueEur, 2),
      potentialAdditionalValueEur: round(acc.potentialAdditionalValueEur, 2),
      curtailedKwh: round(acc.curtailedKwh, 3),
      curtailedValueEur: round(acc.curtailedValueEur, 2),
      unusedPvValueEur: round(acc.unusedPvValueEur, 2),
    };
  }


  _summary(status) {
    const prices = this._prices();
    const ledgerBridge = this._ledgerBridge();
    const exportGuardBridge = this._exportGuardBridge();
    const today = this._periodSummary(this._acc, this._dayKey);
    const month = this._periodSummary(this._monthAcc, this._monthKey);
    const year = this._periodSummary(this._yearAcc, this._yearKey);
    const editionMode = this._isEos() ? 'eos' : 'home';
    const diagnostics = { ...(this._lastDiagnostics || this._emptyDiagnostics(status)) };
    if (prices.dynamicTariffWarning) {
      diagnostics.installerWarning = [diagnostics.installerWarning, prices.dynamicTariffWarning].filter(Boolean).join(' | ');
      // Kein Kunden-Banner für Tarif-Fallback: Die LIVE-Karte kann die Preisquelle
      // optional anzeigen; der technische Grund bleibt in installerWarning.
    }
    if (!diagnostics.warning && diagnostics.customerWarning) diagnostics.warning = diagnostics.customerWarning;
    const explanation = this._buildExplanation(today.valueEur, today.localUsePercent, diagnostics, month, year);
    return {
      status,
      dayKey: this._dayKey,
      monthKey: this._monthKey,
      yearKey: this._yearKey,
      editionMode,
      prices,
      valueEur: today.valueEur,
      ...today,
      explanation,
      today,
      month,
      year,
      diagnostics,
      ledgerBridge,
      exportGuardBridge,
      updatedAt: Date.now(),
    };
  }

  _isEos() {
    const info = this.adapter && this.adapter._nwLicenseInfo && typeof this.adapter._nwLicenseInfo === 'object' ? this.adapter._nwLicenseInfo : {};
    return String(info.edition || '').trim().toLowerCase() === 'eos';
  }

  _buildExplanation(valueEur, localUsePercent, diagnostics, month, year) {
    const v = Number(valueEur) || 0;
    const pct = Number(localUsePercent) || 0;
    const customerWarning = diagnostics && (diagnostics.customerWarning || diagnostics.warning) ? String(diagnostics.customerWarning || diagnostics.warning) : '';
    if (diagnostics && diagnostics.status === 'waiting-data') return customerWarning || 'Das Energie-Wertkonto wartet auf vollständige PV- und Netzdaten.';
    if (diagnostics && diagnostics.status === 'warn' && customerWarning) return customerWarning;
    if (this._acc.pvKwh <= 0.001 && (month.valueEur || 0) > 0) return `Heute wartet das Energie-Wertkonto auf PV-Erzeugung. Im aktuellen Monat sind bereits ${round(month.valueEur, 2)} € Energiewert entstanden.`;
    if (this._acc.pvKwh <= 0.001 && (year.valueEur || 0) > 0) return `Heute wartet das Energie-Wertkonto auf PV-Erzeugung. Dieses Jahr sind bereits ${round(year.valueEur, 2)} € Energiewert entstanden.`;
    if (this._acc.pvKwh <= 0.001) return 'Das Energie-Wertkonto wartet auf PV-Erzeugung.';
    if (pct >= 80) return `Sehr gute lokale Nutzung: ${Math.round(pct)} % deines erzeugten Stroms wurden lokal genutzt.`;
    if (this._acc.gridExportKwh > 0.5) return `Heute wurden ${round(this._acc.gridExportKwh, 1)} kWh eingespeist. Mehr lokale Nutzung könnte den Anlagenwert erhöhen.`;
    return `Heute hat deine Anlage bisher ${round(v, 2)} € Energiewert erzeugt.`;
  }

  async _publish(status) {
    const a = this.adapter;
    if (!a || typeof a.setStateAsync !== 'function') return;
    const s = this._summary(status);
/**
 * Code-Teil: set
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const set = async (id, val) => {
      try {
        await a.setStateAsync(id, val, true);
        if (typeof a.updateValue === 'function') a.updateValue(id, val, Date.now());
      } catch (_e) {}
    };

    await set('energyWallet.enabled', this._isEnabled());
    await set('energyWallet.editionMode', s.editionMode);
    await set('energyWallet.lastUpdate', s.updatedAt);
    await set('energyWallet.lastExplanation', s.explanation);
    await set('energyWallet.explanation', s.explanation);
    await set('energyWallet.status', s.status);
    await set('energyWallet.summaryJson', JSON.stringify(s));
    await set('energyWallet.periodsJson', JSON.stringify({ today: s.today, month: s.month, year: s.year }));

    await this._publishPeriod('energyWallet.today', 'dayKey', s.dayKey, s.today, set);
    await this._publishPeriod('energyWallet.month', 'monthKey', s.monthKey, s.month, set);
    await this._publishPeriod('energyWallet.year', 'yearKey', s.yearKey, s.year, set);

    const d = s.diagnostics || this._emptyDiagnostics(s.status);
    await set('energyWallet.diagnostics.status', d.status || s.status);
    await set('energyWallet.diagnostics.warning', d.warning || '');
    await set('energyWallet.diagnostics.customerWarning', d.customerWarning || d.warning || '');
    await set('energyWallet.diagnostics.installerWarning', d.installerWarning || '');
    await set('energyWallet.diagnostics.lastSkippedReason', d.lastSkippedReason || '');
    await set('energyWallet.diagnostics.dataQualityPercent', round(d.dataQualityPercent, 0));
    await set('energyWallet.diagnostics.missingSourcesJson', JSON.stringify(d.missingSources || []));
    await set('energyWallet.diagnostics.staleSourcesJson', JSON.stringify(d.staleSources || []));
    await set('energyWallet.diagnostics.clippedSourcesJson', JSON.stringify(d.clippedSources || []));
    await set('energyWallet.diagnostics.activeSourcesJson', JSON.stringify(d.activeSources || {}));
    await set('energyWallet.diagnostics.plausibilityJson', JSON.stringify(d));

    await set('energyWallet.configuredPrices.gridImportEurPerKwh', round(s.prices.gridImportEurPerKwh, 4));
    await set('energyWallet.configuredPrices.feedInEurPerKwh', round(s.prices.feedInEurPerKwh, 4));
    await set('energyWallet.configuredPrices.evcsValueEurPerKwh', round(s.prices.evcsValueEurPerKwh, 4));
    await set('energyWallet.configuredPrices.fixedGridImportEurPerKwh', round(s.prices.fixedGridImportEurPerKwh, 4));
    await set('energyWallet.configuredPrices.dynamicTariffActive', !!s.prices.dynamicTariffActive);
    await set('energyWallet.configuredPrices.dynamicTariffAvailable', !!s.prices.dynamicTariffAvailable);
    await set('energyWallet.configuredPrices.dynamicTariffStale', !!s.prices.dynamicTariffStale);
    await set('energyWallet.configuredPrices.currentDynamicPriceEurPerKwh', s.prices.currentDynamicPriceEurPerKwh === null ? 0 : round(s.prices.currentDynamicPriceEurPerKwh, 4));
    await set('energyWallet.configuredPrices.priceSource', String(s.prices.priceSource || 'fixed'));
    await set('energyWallet.configuredPrices.priceSourceLabel', String(s.prices.priceSourceLabel || s.prices.priceSource || 'Festpreis'));
    await set('energyWallet.configuredPrices.currentDynamicPriceSource', String(s.prices.currentDynamicPriceSource || ''));
    await set('energyWallet.configuredPrices.currentDynamicPriceAgeSec', Math.max(0, Math.round(Number(s.prices.currentDynamicPriceAgeSec || 0))));
    await set('energyWallet.configuredPrices.currentDynamicPriceLastUpdate', Math.max(0, Math.round(Number(s.prices.currentDynamicPriceLastUpdate || 0))));
    await set('energyWallet.configuredPrices.dynamicTariffWarning', String(s.prices.dynamicTariffWarning || ''));

    const lb = s.ledgerBridge || {};
    await set('energyWallet.ledgerBridge.available', !!lb.available);
    await set('energyWallet.ledgerBridge.countingMode', String(lb.countingMode || 'reference-only'));
    await set('energyWallet.ledgerBridge.todayEvcsKwh', round(lb.todayEvcsKwh, 3));
    await set('energyWallet.ledgerBridge.todayLocalKwh', round(lb.todayLocalKwh, 3));
    await set('energyWallet.ledgerBridge.todayValueEur', round(lb.todayValueEur, 2));
    await set('energyWallet.ledgerBridge.monthEvcsKwh', round(lb.monthEvcsKwh, 3));
    await set('energyWallet.ledgerBridge.yearEvcsKwh', round(lb.yearEvcsKwh, 3));
    await set('energyWallet.ledgerBridge.summaryJson', JSON.stringify(lb));

    const eb = s.exportGuardBridge || {};
    await set('energyWallet.exportGuardBridge.available', !!eb.available);
    await set('energyWallet.exportGuardBridge.curtailmentPowerW', round(eb.curtailmentPowerW, 0));
    await set('energyWallet.exportGuardBridge.exportOverLimitW', round(eb.exportOverLimitW, 0));
    await set('energyWallet.exportGuardBridge.allowedExportW', round(eb.allowedExportW, 0));
    await set('energyWallet.exportGuardBridge.currentExportW', round(eb.currentExportW, 0));
    await set('energyWallet.exportGuardBridge.negativePriceActive', !!eb.negativePriceActive);
    await set('energyWallet.exportGuardBridge.summaryJson', JSON.stringify(eb));

    const nb = this._nlBridge();
    await set('energyWallet.nlBridge.status', String(nb.status || 'disabled'));
    await set('energyWallet.nlBridge.terugleveringTodayEur', round(nb.terugleveringTodayEur || 0, 2));
    await set('energyWallet.nlBridge.terugleveringCostTodayEur', round(nb.terugleveringCostTodayEur || 0, 2));
    await set('energyWallet.nlBridge.salderingExitRiskTodayEur', round(nb.salderingExitRiskTodayEur || 0, 2));
    await set('energyWallet.nlBridge.summaryJson', JSON.stringify(nb));
  }

  async _publishPeriod(prefix, keyName, periodKey, summary, set) {
    await set(`${prefix}.${keyName}`, periodKey);
    await set(`${prefix}.valueEur`, summary.valueEur);
    await set(`${prefix}.pvKwh`, summary.pvKwh);
    await set(`${prefix}.localUseKwh`, summary.localUseKwh);
    await set(`${prefix}.localUsePercent`, summary.localUsePercent);
    await set(`${prefix}.gridImportKwh`, summary.gridImportKwh);
    await set(`${prefix}.gridExportKwh`, summary.gridExportKwh);
    await set(`${prefix}.evcsKwh`, summary.evcsKwh);
    await set(`${prefix}.evcsSolarKwh`, summary.evcsSolarKwh);
    await set(`${prefix}.storageChargeKwh`, summary.storageChargeKwh);
    await set(`${prefix}.storageDischargeKwh`, summary.storageDischargeKwh);
    await set(`${prefix}.avoidedGridCostEur`, summary.avoidedGridCostEur);
    await set(`${prefix}.feedInValueEur`, summary.feedInValueEur);
    await set(`${prefix}.evcsValueEur`, summary.evcsValueEur);
    await set(`${prefix}.storageValueEur`, summary.storageValueEur);
    await set(`${prefix}.potentialAdditionalValueEur`, summary.potentialAdditionalValueEur);
    await set(`${prefix}.curtailedKwh`, summary.curtailedKwh);
    await set(`${prefix}.curtailedValueEur`, summary.curtailedValueEur);
    await set(`${prefix}.unusedPvValueEur`, summary.unusedPvValueEur);
  }
}

module.exports = { EnergyWalletModule };
