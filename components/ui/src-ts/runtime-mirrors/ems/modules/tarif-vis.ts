// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/tarif-vis.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/tarif-vis.js
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
 * Original-Hash: 9bcc9d45126ef452d6575cedbc2f2dfa76dd43897a0fdaf4d110f8c3cdd4e560
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
 * Quelle: src-ts/runtime-executables/ems/modules/tarif-vis.ts
 * Quell-Hash: sha256:a5d2c753e9ec80f0778ff19aff64a0fd53ad595b616a39a75ae2a5ef587b627e
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/tarif-vis.js.
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
 * Aufgabe: Bereitet Tarifinformationen für Anzeige und die zugehörigen Laufzeit-States auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/tarif-vis.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/tarif-vis.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/tarif-vis.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: ems/modules/tarif-vis.js
 * Rolle im Projekt: Tarif-Visualisierung.
 * Zweck: Bereitet Tarife, Preisfenster und Prognosen für Frontend/EMS auf.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Tarif-/Preisvisualisierung und dynamische Tarifzustände für EMS und Dashboard.
 * Zusammenhänge:
 * - Liefert Preis- und Zeitfenster an app.js, ai-advisor.js und ggf. Lade-/Thermiklogik.
 * - Reports nutzen dieselben Tarifdaten.
 * Wartungshinweise:
 * - Einheiten konsequent EUR/kWh bzw. ct/kWh trennen.
 */

'use strict';

const { BaseModule } = require('./base');

/**
 * Speicher-Netzladen ist strikt an einen frischen, aktiven und als „günstig“
 * klassifizierten dynamischen Tarif gebunden. Neutral, teuer, unbekannt, stale
 * oder ein deaktivierter Tarif sperren Netzladen immer. Ist das zeitvariable
 * Netzentgelt aktiviert, muss zusätzlich das manuell konfigurierte NT-/
 * Quartalsfenster aktiv sein. Außerhalb dieser Freigabe übernimmt ausschließlich
 * die Eigenverbrauchsoptimierung; PV-/NVP-Laden bleibt davon unberührt.
 */
function resolveStorageGridChargePermission({
    appCenterAllowed = false, tariffActive = false, currentPriceFresh = false,
    tariffState = 'unknown', manualNetFeeEnabled = false, manualNtWindowActive = false,
    priorityAllowsStorage = false, storageWriterAvailable = false, storagePowerW = 0,
} = {}) {
    if (!appCenterAllowed) return { allowed: false, source: 'blocked', reason: 'Netzladen im AppCenter nicht freigegeben' };
    if (!storageWriterAvailable) return { allowed: false, source: 'blocked', reason: 'Kein beschreibbarer Speicher-Ausgang aktiv' };
    if (!(Number(storagePowerW) > 0)) return { allowed: false, source: 'blocked', reason: 'Keine Speicher-Netzladeleistung konfiguriert' };
    if (!priorityAllowsStorage) return { allowed: false, source: 'blocked', reason: 'Tarif-Priorität gibt den Speicher nicht frei' };

    const normalizedTariffState = String(tariffState || 'unknown').trim().toLowerCase().replace(/ü/g, 'ue');
    if (!tariffActive) {
        return { allowed: false, source: 'dynamic-tariff', reason: 'Dynamischer Tarif ist nicht aktiv – Speicher bleibt eigenverbrauchsoptimiert' };
    }
    if (!currentPriceFresh) {
        return { allowed: false, source: 'dynamic-tariff', reason: 'Aktueller Tarifpreis fehlt oder ist veraltet – Speicher bleibt eigenverbrauchsoptimiert' };
    }
    if (normalizedTariffState !== 'guenstig') {
        const label = normalizedTariffState === 'neutral' ? 'neutral' : normalizedTariffState === 'teuer' ? 'teuer' : String(tariffState || 'unbekannt');
        return { allowed: false, source: 'dynamic-tariff', reason: `Tarif ist ${label} – Netzladen gesperrt, Eigenverbrauchsoptimierung aktiv` };
    }
    if (manualNetFeeEnabled && !manualNtWindowActive) {
        return { allowed: false, source: 'net-fee', reason: 'Tarif ist günstig, aber das konfigurierte NT-/Quartalsfenster ist nicht aktiv – Eigenverbrauchsoptimierung aktiv' };
    }

    return manualNetFeeEnabled
        ? { allowed: true, source: 'net-fee-nt-cheap', reason: 'Dynamischer Tarif günstig und konfiguriertes NT-/Quartalsfenster aktiv' }
        : { allowed: true, source: 'dynamic-tariff-cheap', reason: 'Dynamischer Tarif günstig + AppCenter-/Prioritätsfreigabe' };
}

/**
 * Code-Teil: formatStorageNtWindowLabel
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function formatStorageNtWindowLabel({ model = 1, quarter = 1, startRaw = '', endRaw = '' } = {}) {
    const start = String(startRaw ?? '').trim();
    const end = String(endRaw ?? '').trim();
    const prefix = Number(model) === 2 ? `Q${Math.max(1, Math.min(4, Number(quarter) || 1))} NT` : 'NT';
    return start && end ? `${prefix} ${start}–${end}` : `${prefix} nicht konfiguriert`;
}

/**
 * Liest die Tarif-Einstellungen aus der NexoWatt UI (nexowatt-ui.0.settings.*)
 * und berechnet daraus einen Ladepark-Leistungsdeckel (W), damit Speicher/Ladepark
 * sich nicht gegenseitig aushebeln.
 *
 * Hinweis: Der Deckel wird als Datenpunkt-Schlüssel "cm.tariffBudgetW" bereitgestellt,
 * damit das Ladepark-Management ihn automatisch als Begrenzung nutzen kann.
 */
/**
 * Code-Teil: Klasse `TarifVisModule`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
// Klassen-Kommentar: Klasse: TarifVisModule. Aufgabe: kapselt eine fachliche Teilaufgabe dieser Datei. Beim TypeScript-Umbau Eingaben, Rückgaben und Seiteneffekte typisieren. Zusammenhang: EMS-Modul mit eigener Regelungs-/Diagnoseaufgabe; wird durch ems/module-manager.js und ems/engine.js ausgeführt.
/**
 * Klasse: TarifVisModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
class TarifVisModule extends BaseModule {
    /**
     * @param {any} adapter
     * @param {*} dpRegistry
     */
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {number} */
        this._lastLimitW = NaN;

        /** @type {boolean} */
        this._warnedManualPriceMissing = false;

        /**
         * SoC-basierte Tarif-Ladehysterese ("günstig"-Fenster):
         * - Start charging when SoC <= start threshold
         * - Stop charging when SoC >= stop threshold
         * - Between start/stop we keep the previous decision to avoid flapping.
         *
         * This avoids "SoC 100%" batteries being continuously requested to charge.
         * (The storage-control already blocks at SoC-max, but this makes the intent
         * explicit and keeps UI/status stable.)
         *
         * @type {boolean}
         */
        this._tariffChargeLatch = false;
    }

    /**
     * Code-Teil: Methode `init`
     * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: init
     * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async init() {
        // Eigene Zustände anlegen (nur Diagnose + berechneter Deckel)
        await this.adapter.setObjectNotExistsAsync('tarif', {
            type: 'channel',
            common: { name: 'Tarif' },
            native: {},
        });

        /**
         * Code-Teil: Arrow-Funktion `mk`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mk
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mk = async (id, name, type, role) => {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: 'state',
                common: { name, type, role, read: true, write: false },
                native: {},
            });
        };

        await mk('tarif.aktiv', 'Tarif aktiv (VIS)', 'boolean', 'indicator');
        await mk('tarif.modus', 'Tarif Modus (VIS)', 'number', 'value');
        await mk('tarif.preisEurProKwh', 'Tarif Preis (€/kWh, VIS)', 'number', 'value');
        await mk('tarif.prioritaet', 'Priorität Speicher↔Ladepark (VIS)', 'number', 'value');
        await mk('tarif.speicherLeistungW', 'Speicher Leistung (W, VIS)', 'number', 'value.power');
        await mk('tarif.ladeparkMaxW', 'Ladepark Max (W, VIS)', 'number', 'value.power');
        await mk('tarif.ladeparkLimitW', 'Ladepark Limit (W, berechnet)', 'number', 'value.power');
        await mk('tarif.preisGrenzeEurProKwh', 'Tarif Preisgrenze (€/kWh, VIS)', 'number', 'value');
        await mk('tarif.preisAktuellEurProKwh', 'Tarif Preis aktuell (€/kWh, Provider)', 'number', 'value');
        await mk('tarif.preisDurchschnittEurProKwh', 'Tarif Preis Durchschnitt (€/kWh, Provider)', 'number', 'value');
        await mk('tarif.currentPriceFresh', 'Aktueller Tarifpreis frisch', 'boolean', 'indicator');
        await mk('tarif.currentPriceAgeMs', 'Alter aktueller Tarifpreis (ms)', 'number', 'value.interval');
        await mk('tarif.currentPriceMaxAgeMs', 'Maximales Alter aktueller Tarifpreis (ms)', 'number', 'value.interval');
        await mk('tarif.currentPriceSource', 'Quelle aktueller Tarifpreis', 'string', 'text');
        await mk('tarif.curveFresh', 'Tarifkurve frisch', 'boolean', 'indicator');
        await mk('tarif.curveAgeMs', 'Alter Tarifkurve (ms)', 'number', 'value.interval');
        await mk('tarif.curveMaxAgeMs', 'Maximales Alter Tarifkurve (ms)', 'number', 'value.interval');
        await mk('tarif.priceDataStatus', 'Status Tarifdaten', 'string', 'text');
        await mk('tarif.dynamicTariffStale', 'Dynamischer Tarif stale', 'boolean', 'indicator');
        await mk('tarif.preisRefEurProKwh', 'Tarif Referenzpreis (€/kWh, wirksam)', 'number', 'value');
        await mk('tarif.preisMinEurProKwh', 'Tarif Preis Minimum (€/kWh, Horizon)', 'number', 'value');
        await mk('tarif.preisSchwelleGuensigEurProKwh', 'Tarif Schwelle günstig (€/kWh, Auto: min+Band, capped@Ø)', 'number', 'value');
        await mk('tarif.naechstesGuensigVon', 'Nächstes günstiges Fenster ab (ISO)', 'string', 'text');
        await mk('tarif.naechstesGuensigBis', 'Nächstes günstiges Fenster bis (ISO)', 'string', 'text');

        await mk('tarif.state', 'Tarif Zustand (günstig/neutral/teuer)', 'string', 'text');
        await mk('tarif.speicherSollW', 'Tarif Sollleistung Speicher (W, berechnet)', 'number', 'value.power');
        await mk('tarif.netzLadenErlaubt', 'Netzladung erlaubt (Tarif-Logik)', 'boolean', 'indicator');
        await mk('tarif.entladenErlaubt', 'Entladen erlaubt (Tarif-Logik)', 'boolean', 'indicator');
        await mk('tarif.statusText', 'Tarif Status – tatsächliche Steuerkette', 'string', 'text');
        await mk('tarif.intentStatusText', 'Tarif Absicht – vor Resolver/Gates', 'string', 'text');
        await mk('tarif.speicherIntentW', 'Tarif Speicher-Absicht (W)', 'number', 'value.power');
        await mk('tarif.speicherIntentStatus', 'Tarif Speicher-Absicht Status', 'string', 'text');
        await mk('tarif.speicherIntentGrund', 'Tarif Speicher-Absicht Grund', 'string', 'text');
        await mk('tarif.netFeeEnabled', 'Zeitvariables Netzentgelt aktiv (VIS)', 'boolean', 'indicator');
        await mk('tarif.netFeeMode', 'Netzentgelt Modus (NT/Standard/HT)', 'string', 'text');
        await mk('tarif.speicherNetzLadenErlaubt', 'Speicher-Netzladen erlaubt', 'boolean', 'indicator');
        await mk('tarif.speicherNetzLadenSperrgrund', 'Speicher-Netzladen Sperrgrund', 'string', 'text');
        await mk('tarif.speicherPreisGuensig', 'Speichertarif günstig und frisch', 'boolean', 'indicator');
        await mk('tarif.speicherZeitfensterAktiv', 'Manuelles Speicher-NT-Zeitfenster aktiv', 'boolean', 'indicator');
        await mk('tarif.speicherZeitfensterLabel', 'Manuelles Speicher-NT-Zeitfenster', 'string', 'text');

        // Gate E – Negativpreis / Tarif-Gewinnoptimierung
        await mk('tarif.negativpreisAktiv', 'Negativpreis aktiv', 'boolean', 'indicator');
        await mk('tarif.netzbezugBevorzugt', 'Netzbezug bevorzugt bei Negativpreis', 'boolean', 'indicator');
        await mk('tarif.negativPreisAktuellEurProKwh', 'Negativpreis aktuell (€/kWh)', 'number', 'value');
        await mk('tarif.negativPreisMinEurProKwh', 'Negativpreis Minimum (€/kWh, Horizon)', 'number', 'value');
        await mk('tarif.naechstesNegativVon', 'Nächstes Negativpreis-Fenster ab (ISO)', 'string', 'text');
        await mk('tarif.naechstesNegativBis', 'Nächstes Negativpreis-Fenster bis (ISO)', 'string', 'text');
        await mk('tarif.negativpreisStatus', 'Negativpreis Status', 'string', 'text');
        // VIS-Settings als Datenpunkte registrieren (nur wenn dp-Registry vorhanden ist)
        if (this.dp && typeof this.dp.upsert === 'function') {
            const visInst = this._getVisInstance();

            // Eingänge aus der VIS (Tarif-UI)
            await this.dp.upsert({ key: 'vis.settings.dynamicTariff', objectId: `${visInst}.settings.dynamicTariff` });
            await this.dp.upsert({ key: 'vis.settings.tariffMode', objectId: `${visInst}.settings.tariffMode` });
            await this.dp.upsert({ key: 'vis.settings.price', objectId: `${visInst}.settings.price` });
            await this.dp.upsert({ key: 'vis.settings.priority', objectId: `${visInst}.settings.priority` });
            await this.dp.upsert({ key: 'vis.settings.storagePower', objectId: `${visInst}.settings.storagePower` });
            await this.dp.upsert({ key: 'vis.settings.evcsMaxPower', objectId: `${visInst}.settings.evcsMaxPower` });

            // PV Saisonprofil (Quartale)
            await this.dp.upsert({ key: 'vis.settings.tariffPvSeasonEnabled', objectId: `${visInst}.settings.tariffPvSeasonEnabled` });
            await this.dp.upsert({ key: 'vis.settings.tariffPvSeasonAiEnabled', objectId: `${visInst}.settings.tariffPvSeasonAiEnabled` });
            await this.dp.upsert({ key: 'vis.settings.tariffPvSeasonQ1Factor', objectId: `${visInst}.settings.tariffPvSeasonQ1Factor` });
            await this.dp.upsert({ key: 'vis.settings.tariffPvSeasonQ2Factor', objectId: `${visInst}.settings.tariffPvSeasonQ2Factor` });
            await this.dp.upsert({ key: 'vis.settings.tariffPvSeasonQ3Factor', objectId: `${visInst}.settings.tariffPvSeasonQ3Factor` });
            await this.dp.upsert({ key: 'vis.settings.tariffPvSeasonQ4Factor', objectId: `${visInst}.settings.tariffPvSeasonQ4Factor` });

            // Zeitvariables Netzentgelt (HT/NT)
            await this.dp.upsert({ key: 'vis.settings.netFeeEnabled', objectId: `${visInst}.settings.netFeeEnabled` });
            await this.dp.upsert({ key: 'vis.settings.netFeeModel', objectId: `${visInst}.settings.netFeeModel` });
            await this.dp.upsert({ key: 'vis.settings.netFeeNtStart', objectId: `${visInst}.settings.netFeeNtStart`, dataType: 'string' });
            await this.dp.upsert({ key: 'vis.settings.netFeeNtEnd', objectId: `${visInst}.settings.netFeeNtEnd`, dataType: 'string' });
            await this.dp.upsert({ key: 'vis.settings.netFeeHtStart', objectId: `${visInst}.settings.netFeeHtStart`, dataType: 'string' });
            await this.dp.upsert({ key: 'vis.settings.netFeeHtEnd', objectId: `${visInst}.settings.netFeeHtEnd`, dataType: 'string' });

            // Quartals-Zeiten (netFeeModel=2): NT/HT je Quartal, Rest = Standard
            const q = ['Q1', 'Q2', 'Q3', 'Q4'];
            for (const qq of q) {
                await this.dp.upsert({ key: `vis.settings.netFee${qq}NtStart`, objectId: `${visInst}.settings.netFee${qq}NtStart`, dataType: 'string' });
                await this.dp.upsert({ key: `vis.settings.netFee${qq}NtEnd`, objectId: `${visInst}.settings.netFee${qq}NtEnd`, dataType: 'string' });
                await this.dp.upsert({ key: `vis.settings.netFee${qq}HtStart`, objectId: `${visInst}.settings.netFee${qq}HtStart`, dataType: 'string' });
                await this.dp.upsert({ key: `vis.settings.netFee${qq}HtEnd`, objectId: `${visInst}.settings.netFee${qq}HtEnd`, dataType: 'string' });
            }

            // Optional: aktueller Tarifpreis direkt als State-ID (ohne globale DP-Tabelle)
            const priceCurrentId = this._getVisPriceCurrentId();
            if (priceCurrentId) {
                await this.dp.upsert({ key: 'tarif.preisAktuellEurProKwh', objectId: priceCurrentId });
            }

            // Optional: Durchschnittspreis (für Automatik)
            const priceAverageId = this._getVisPriceAverageId();
            if (priceAverageId) {
                await this.dp.upsert({ key: 'tarif.preisDurchschnittEurProKwh', objectId: priceAverageId });
            }

            // Optional: Stundenpreise (für Automatik/Forecast)
            const priceTodayId = this._getVisPriceTodayJsonId();
            if (priceTodayId) {
                await this.dp.upsert({ key: 'tarif.pricesTodayJson', objectId: priceTodayId, dataType: 'string' });
            }

            const priceTomorrowId = this._getVisPriceTomorrowJsonId();
            if (priceTomorrowId) {
                await this.dp.upsert({ key: 'tarif.pricesTomorrowJson', objectId: priceTomorrowId, dataType: 'string' });
            }

            // Ausgabe für das Ladepark-Management (Tarif-Deckel)
            await this.dp.upsert({ key: 'cm.tariffBudgetW', objectId: `${this.adapter.namespace}.tarif.ladeparkLimitW` });

            // Ausgabe: Netzladung erlaubt (Preisfreigabe) für Engine/Consumer
            if (!this.dp.getEntry || !this.dp.getEntry('cm.gridChargeAllowed')) {
                await this.dp.upsert({ key: 'cm.gridChargeAllowed', objectId: `${this.adapter.namespace}.tarif.netzLadenErlaubt` });
            }

            if (!this.dp.getEntry || !this.dp.getEntry('cm.dischargeAllowed')) {
                await this.dp.upsert({ key: 'cm.dischargeAllowed', objectId: `${this.adapter.namespace}.tarif.entladenErlaubt` });
            }
            if (!this.dp.getEntry || !this.dp.getEntry('st.tariffGridChargeAllowed')) {
                await this.dp.upsert({ key: 'st.tariffGridChargeAllowed', objectId: `${this.adapter.namespace}.tarif.speicherNetzLadenErlaubt` });
            }
        }
    }

    /**
     * Code-Teil: Methode `_getVisInstance`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getVisInstance
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getVisInstance() {
        const cfg = (this.adapter && this.adapter.config && this.adapter.config.vis) ? this.adapter.config.vis : null;
        const inst = (cfg && typeof cfg.instance === 'string') ? cfg.instance.trim() : '';
        return inst || 'nexowatt-ui.0';
    }
    /**
     * Code-Teil: _getTariffHomePath
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getTariffHomePath() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const dp = cfg.datapoints || {};
        const base = (typeof dp.tariffHomePath === 'string') ? dp.tariffHomePath.trim() : '';
        return base || '';
    }

    /**
     * Code-Teil: Methode `_getVisPriceCurrentId`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getVisPriceCurrentId
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getVisPriceCurrentId() {
        // WICHTIG: Die Tarif-Datenpunkte werden im Admin unter "Datenpunkte" gepflegt.
        // Dort heißen sie: datapoints.priceCurrent / datapoints.priceAverage.
        // Einige ältere (interne) Builds nutzten vis.priceCurrentId / vis.priceAverageId.
        // Wir unterstützen beides, damit Upgrades ohne Neu-Konfiguration funktionieren.
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};

        const dp = cfg.datapoints || {};
        const idPrimary = (typeof dp.priceCurrent === 'string') ? dp.priceCurrent.trim() : '';
        if (idPrimary) return idPrimary;

        const vis = cfg.vis || {};
        const idLegacy = (typeof vis.priceCurrentId === 'string') ? vis.priceCurrentId.trim() : '';
        if (idLegacy) return idLegacy;

        // Optional: Provider-Basisordner (z. B. tibber.0.Homes.<uuid>)
        // Erwartete Struktur: <base>.CurrentPrice.total
        const base = this._getTariffHomePath();
        if (base) return `${base}.CurrentPrice.total`;

        return '';
    }

    /**
     * Code-Teil: Methode `_getVisPriceAverageId`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getVisPriceAverageId
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getVisPriceAverageId() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};

        const dp = cfg.datapoints || {};
        const idPrimary = (typeof dp.priceAverage === 'string') ? dp.priceAverage.trim() : '';
        if (idPrimary) return idPrimary;

        const vis = cfg.vis || {};
        const idLegacy = (typeof vis.priceAverageId === 'string') ? vis.priceAverageId.trim() : '';
        return idLegacy || '';
    }

    /**
     * Code-Teil: Methode `_getVisPriceTodayJsonId`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getVisPriceTodayJsonId
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getVisPriceTodayJsonId() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const dp = cfg.datapoints || {};

        const idPrimary = (typeof dp.priceTodayJson === 'string') ? dp.priceTodayJson.trim() : '';
        if (idPrimary) return idPrimary;

        const base = this._getTariffHomePath();
        if (base) return `${base}.PricesToday.json`;

        return '';
    }

    /**
     * Code-Teil: Methode `_getVisPriceTomorrowJsonId`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _getVisPriceTomorrowJsonId
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _getVisPriceTomorrowJsonId() {
        const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
        const dp = cfg.datapoints || {};

        const idPrimary = (typeof dp.priceTomorrowJson === 'string') ? dp.priceTomorrowJson.trim() : '';
        if (idPrimary) return idPrimary;

        const base = this._getTariffHomePath();
        if (base) return `${base}.PricesTomorrow.json`;

        return '';
    }

    /**
     * Code-Teil: Methode `_num`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _num
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _num(v, fallback = null) {
        // VIS-Felder (z.B. Strompreis) können je nach Browser/Locale als String
        // mit deutschem Dezimaltrennzeichen kommen: "0,40".
        // Number('0,40') => NaN, daher normalisieren wir robust.
        if (v === null || v === undefined) return fallback;

        if (typeof v === 'string') {
            let s = v.trim();
            if (s === '') return fallback;

            // Entferne Leerzeichen
            s = s.replace(/\s+/g, '');

            // Fälle wie "1.234,56" -> "1234.56" (Tausenderpunkt entfernen, Komma -> Punkt)
            if (s.includes(',') && s.includes('.')) {
                // Heuristik: letztes Vorkommen entscheidet über Dezimaltrennzeichen
                const lastComma = s.lastIndexOf(',');
                const lastDot = s.lastIndexOf('.');
                if (lastComma > lastDot) {
                    s = s.replace(/\./g, '').replace(',', '.');
                }
            } else if (s.includes(',') && !s.includes('.')) {
                // Standard-DE: "0,40" -> "0.40"
                s = s.replace(',', '.');
            }

            const nStr = Number(s);
            if (Number.isFinite(nStr)) return nStr;
        }

        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    }

	/**
	 * Code-Teil: _normalizePriceEurPerKwh
	 * Zweck: Wandelt Rohwerte in ein stabiles internes Format um, damit spätere Logik konsistent arbeiten kann.
	 * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
	 * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
	 */
	_normalizePriceEurPerKwh(v, fallback = null) {
		// Normalizes either €/kWh or ct/kWh into €/kWh.
		// Heuristic: values with |v| > 2 are interpreted as ct/kWh (common sources: 31.5, 40, ...).
		let n = (typeof v === 'number') ? v : this._num(v, fallback);
		if (!Number.isFinite(n)) return fallback;

		// Auto-convert ct/kWh -> €/kWh
		const abs = Math.abs(n);
		if (abs > 2 && abs <= 500) {
			n = n / 100;
		}

		// Plausibility (allow small negative prices)
		if (!Number.isFinite(n) || n < -2 || n > 2) return fallback;
		return n;
	}

    /**
     * Code-Teil: Methode `_parsePriceCurve`
     * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _parsePriceCurve
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _parsePriceCurve(raw) {
        // Accepts either a JSON string or already-parsed array/object.
        // Expected (tibber-like) schema: [{ total: 0.318, startsAt: "...", endsAt: "..." }, ...]
        if (raw === null || raw === undefined) return [];

        let data = raw;
        if (typeof raw === 'string') {
            const s = raw.trim();
            if (!s) return [];
            try {
                data = JSON.parse(s);
            } catch {
                return [];
            }
        }

        // Some adapters wrap the array
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            const arr = data.prices || data.data || data.items || data.values || null;
            if (Array.isArray(arr)) {
                data = arr;
            } else {
                return [];
            }
        }

        if (!Array.isArray(data)) return [];

        // NexoWatt Sim-Adapter / lightweight providers: some sources provide a plain
        // numeric array (e.g. [32.1, 30.8, ...]) without timestamps.
        // Interpret this as an hourly curve starting at the current full hour.
        try {
            /**
             * Code-Teil: Arrow-Funktion `isNumLike`
             * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
             * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
             * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
             */
            /**
             * Code-Teil: isNumLike
             * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
             * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
             * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
             */
            const isNumLike = (v) => {
                if (typeof v === 'number') return Number.isFinite(v);
                if (typeof v === 'string') {
                    const s = v.trim();
                    if (!s) return false;
                    const n = Number(s);
                    return Number.isFinite(n);
                }
                return false;
            };

            // If the array contains objects with startsAt/etc. we keep the original parsing logic below.
            const hasObject = data.some((it) => it && typeof it === 'object' && !Array.isArray(it));
            const hasNum = data.some((it) => isNumLike(it));

            if (hasNum && !hasObject) {
                const out = [];
                const base = new Date();
                base.setMinutes(0, 0, 0);
                const baseMs = base.getTime();

                let idx = 0;
                for (const it of data) {
                    if (!isNumLike(it)) {
                        idx++;
                        continue;
                    }
                    const raw = (typeof it === 'number') ? it : Number(String(it).trim());
                    const priceEurKwh = this._normalizePriceEurPerKwh(raw, null);
                    if (!Number.isFinite(priceEurKwh)) {
                        idx++;
                        continue;
                    }
                    const startMs = baseMs + idx * 3600 * 1000;
                    const endMs = startMs + 3600 * 1000;
                    out.push({ startMs, endMs, priceEurKwh });
                    idx++;
                }
                return out;
            }
        } catch (_e) {}

        const out = [];
        for (const it of data) {
            if (!it || typeof it !== 'object') continue;

            // Price field heuristics
            let pRaw = null;
            if (it.total !== undefined) pRaw = it.total;
            else if (it.price !== undefined) pRaw = it.price;
            else if (it.value !== undefined) pRaw = it.value;
            else if (it.marketprice !== undefined) pRaw = it.marketprice;
            else if (it.marketPrice !== undefined) pRaw = it.marketPrice;
            else if (it.energyPrice !== undefined) pRaw = it.energyPrice;

            if (pRaw === null && it.price && typeof it.price === 'object') {
                // nested objects
                if (it.price.total !== undefined) pRaw = it.price.total;
                else if (it.price.value !== undefined) pRaw = it.price.value;
            }

            const price = this._normalizePriceEurPerKwh(pRaw, null);
            if (typeof price !== 'number' || !Number.isFinite(price)) continue;

            // Time field heuristics
            const startRaw = (it.startsAt !== undefined) ? it.startsAt
                : (it.start !== undefined) ? it.start
                : (it.startTime !== undefined) ? it.startTime
                : (it.from !== undefined) ? it.from
                : (it.begin !== undefined) ? it.begin
                : (it.timestamp !== undefined) ? it.timestamp
                : (it.time !== undefined) ? it.time
                : null;

            let startMs = null;
            if (typeof startRaw === 'number' && Number.isFinite(startRaw)) {
                startMs = (startRaw < 1e12) ? startRaw * 1000 : startRaw;
            } else if (typeof startRaw === 'string') {
                const t = Date.parse(startRaw);
                if (Number.isFinite(t)) startMs = t;
            }
            if (!startMs) continue;

            const endRaw = (it.endsAt !== undefined) ? it.endsAt
                : (it.end !== undefined) ? it.end
                : (it.endTime !== undefined) ? it.endTime
                : (it.to !== undefined) ? it.to
                : (it.until !== undefined) ? it.until
                : null;

            let endMs = null;
            if (typeof endRaw === 'number' && Number.isFinite(endRaw)) {
                endMs = (endRaw < 1e12) ? endRaw * 1000 : endRaw;
            } else if (typeof endRaw === 'string') {
                const t = Date.parse(endRaw);
                if (Number.isFinite(t)) endMs = t;
            }

            // Default: 1 hour
            if (!endMs) endMs = startMs + 60 * 60 * 1000;
            if (endMs <= startMs) endMs = startMs + 60 * 60 * 1000;

            out.push({ startMs, endMs, priceEurKwh: price });
        }

        out.sort((a, b) => a.startMs - b.startMs);
        return out;
    }

    /**
     * Code-Teil: Methode `_clamp`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _clamp
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _clamp(n, min, max) {
        if (!Number.isFinite(n)) return n;
        if (Number.isFinite(min)) n = Math.max(min, n);
        if (Number.isFinite(max)) n = Math.min(max, n);
        return n;
    }

    /**
     * Parses a HH:MM time string into minutes from midnight.
     * Returns null if the value is invalid.
     * @param {any} raw
     * @returns {number|null}
     */
    /**
     * Code-Teil: Methode `_parseTimeToMinutes`
     * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _parseTimeToMinutes
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _parseTimeToMinutes(raw) {
        if (raw === null || raw === undefined) return null;
        const s = String(raw).trim();
        if (!s) return null;
        const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
        if (!m) return null;
        const hh = Number(m[1]);
        const mm = Number(m[2]);
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
        return hh * 60 + mm;
    }

    /**
     * Checks if nowMin (minutes from midnight) is inside the [start,end) window.
     * Handles cross-midnight windows (e.g. 22:00-06:00).
     * @param {number} nowMin
     * @param {number|null} startMin
     * @param {number|null} endMin
     */
    /**
     * Code-Teil: Methode `_isInTimeWindow`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _isInTimeWindow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _isInTimeWindow(nowMin, startMin, endMin) {
        if (!Number.isFinite(nowMin)) return false;
        if (startMin === null || startMin === undefined) return false;
        if (endMin === null || endMin === undefined) return false;
        const s = Number(startMin);
        const e = Number(endMin);
        if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
        if (s === e) return false;
        if (s < e) {
            return nowMin >= s && nowMin < e;
        }
        // cross midnight
        return (nowMin >= s) || (nowMin < e);
    }

    /**
     * @param {number} [nowMs]
     */
    /**
     * Code-Teil: Methode `_nowMinutesLocal`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _nowMinutesLocal
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _nowMinutesLocal(nowMs) {
        const d = nowMs ? new Date(nowMs) : new Date();
        return d.getHours() * 60 + d.getMinutes();
    }

    /**
     * Returns the current quarter (1..4) based on local time.
     * Q1 = Jan–Mär, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Okt–Dez
     * @param {number} [nowMs]
     * @returns {number}
     */
    /**
     * Code-Teil: Methode `_currentQuarter`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _currentQuarter
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _currentQuarter(nowMs) {
        const d = nowMs ? new Date(nowMs) : new Date();
        const m = d.getMonth(); // 0..11
        if (m <= 2) return 1;
        if (m <= 5) return 2;
        if (m <= 8) return 3;
        return 4;
    }

    /**
     * Priorität normalisieren:
     *
     * Neue VIS-Logik (Slider, diskret):
     *   1 = Speicher
     *   2 = Auto (Speicher + Ladestation)
     *   3 = Ladestation
     *
     * Legacy-Unterstützung:
     *   0..100 (alt) wird auf 1..3 gemappt:
     *     >= 67  => Speicher
     *     <= 33  => Ladestation
     *     sonst  => Auto
     */
    /**
     * Code-Teil: Methode `_normPrioritaet`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _normPrioritaet
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _normPrioritaet(p) {
        const n = this._num(p, 2);
        if (!Number.isFinite(n)) return 2;
        if (n === 1 || n === 2 || n === 3) return n;

        // Legacy: 0..100
        if (n >= 0 && n <= 100) {
            if (n >= 67) return 1;
            if (n <= 33) return 3;
            return 2;
        }

        // Fallback: runden & clamp
        const r = Math.round(n);
        if (r < 1) return 2;
        if (r > 3) return 2;
        return r;
    }
    /**
     * Debug-Ausgabe mit Drosselung, um Log-Spam zu vermeiden.
     * @param {string} msg
     * @param {number} [intervalMs]
     */
    /**
     * Code-Teil: Methode `_debugThrottle`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _debugThrottle
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    _debugThrottle(msg, intervalMs = 60000) {
        const now = Date.now();
        const intMs = (Number.isFinite(Number(intervalMs)) && Number(intervalMs) >= 0) ? Number(intervalMs) : 60000;
        if (this._lastDebugMs && intMs > 0 && (now - this._lastDebugMs) < intMs) return;
        this._lastDebugMs = now;
        try {
            this.adapter.log.debug(`[TarifVis] ${String(msg || '')}`);
        } catch {
            // ignore
        }
    }

    /**
     * Code-Teil: Methode `tick`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: tick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    /**
     * Liest die zentrale Speicher-Steuerhoheit. TarifVis liefert nur eine Policy und
     * darf ohne aktiven AppCenter-Ausgang keinen Speicherbefehl erzeugen.
     */
    _getStorageControlAuthority() {
        try {
            if (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function') {
                const authority = this.adapter._nwGetStorageControlAuthority();
                if (authority && typeof authority === 'object') return authority;
            }
            const cfg = (this.adapter && this.adapter.config) ? this.adapter.config : {};
            const farm = (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function')
                ? this.adapter._nwGetStorageFarmRuntimeInfo()
                : null;
            const farmDispatchActive = !!(farm && farm.dispatchActive);
            const singleActive = cfg.enableStorageControl === true;
            const selectedTopology = farmDispatchActive ? 'farm' : (singleActive ? 'single' : 'none');
            return {
                selectedTopology,
                writerActive: selectedTopology !== 'none',
                reason: farmDispatchActive ? 'writable-farm-active' : (singleActive ? 'single-active' : 'no-active-storage-output'),
                farmDispatchActive,
                farmAggregationActive: !!(farm && farm.active),
                singleAppActive: singleActive,
            };
        } catch {
            return {
                selectedTopology: 'none',
                writerActive: false,
                reason: 'authority-error',
                farmDispatchActive: false,
                farmAggregationActive: false,
                singleAppActive: false,
            };
        }
    }

    async tick() {
        // VIS-Einstellungen sind Konfigurationswerte und müssen dauerhaft gültig bleiben.
        // Wenn diese nach kurzer Zeit als "stale" gelten, fällt die Logik auf Fallbacks zurück
        // (z.B. Manual-Preis = null) und die Tarifsteuerung wirkt "inaktiv".
        const staleTimeoutMs = 365 * 24 * 60 * 60 * 1000; // 1 Jahr
        // Aktueller Preis und Day-Ahead-Kurve haben unterschiedliche Lebenszeiten:
        // - der aktuelle Stundenpreis darf standardmäßig höchstens 90 Minuten alt sein;
        // - Durchschnitt und Day-Ahead-Kurve dürfen bis zu 36 Stunden alt sein.
        // Ein eingefrorener günstiger/negativer Stundenpreis darf niemals über viele
        // Stunden Netzladen oder einen Negativpreismodus freigeben.
        const tariffCfg = (this.adapter && this.adapter.config && this.adapter.config.tariff) ? this.adapter.config.tariff : {};
        const storageAuthority = this._getStorageControlAuthority();
        const storageTopology = String(storageAuthority.selectedTopology || 'none');
        const storageWriterAvailable = !!storageAuthority.writerActive;
        const currentPriceMaxAgeMs = this._clamp(this._num(tariffCfg.currentPriceMaxAgeMin, 90), 15, 360) * 60 * 1000;
        const averagePriceMaxAgeMs = this._clamp(this._num(tariffCfg.averagePriceMaxAgeHours, 36), 1, 72) * 60 * 60 * 1000;
        const curveMaxAgeMs = this._clamp(this._num(tariffCfg.curveMaxAgeHours, 36), 1, 72) * 60 * 60 * 1000;

        try {
            // --- VIS Settings ---
            const aktiv = this.dp ? this.dp.getBoolean('vis.settings.dynamicTariff', false) : false;
            const aktivAge = this.dp ? this.dp.getAgeMs('vis.settings.dynamicTariff') : null;
            const aktivFresh = (aktivAge === null || aktivAge === undefined) ? true : (aktivAge <= staleTimeoutMs);
            const aktivEff = !!(aktivFresh && aktiv);

            const modusRaw = this.dp ? this.dp.getNumberFresh('vis.settings.tariffMode', staleTimeoutMs, null) : null;
            const modusInt = (typeof modusRaw === 'number' && Number.isFinite(modusRaw)) ? Math.round(modusRaw) : 1;

            const preisGrenzeVisRaw = this.dp ? this.dp.getNumberFresh('vis.settings.price', staleTimeoutMs, null) : null;
            const priorRaw = this.dp ? this.dp.getNumberFresh('vis.settings.priority', staleTimeoutMs, null) : null;
            const storageW = this.dp ? this.dp.getNumberFresh('vis.settings.storagePower', staleTimeoutMs, null) : null;
            const evcsMaxW = this.dp ? this.dp.getNumberFresh('vis.settings.evcsMaxPower', staleTimeoutMs, null) : null;

            const prioritaet = this._normPrioritaet(priorRaw);
            const storagePowerAbsW = Math.max(0, Math.abs(this._num(storageW, 0)));
            const baseW = Math.max(0, Math.abs(this._num(evcsMaxW, 0)));

            // --- Zeitvariables Netzentgelt (HT/NT) ---
            // Unterstützt zwei Modelle:
            // 1) Einfach (HT/NT) – ganzjährig
            // 2) Quartale (NT/HT je Quartal, Rest = Standard)
            const netFeeEnabledRaw = this.dp ? this.dp.getBoolean('vis.settings.netFeeEnabled', false) : false;
            const netFeeAge = this.dp ? this.dp.getAgeMs('vis.settings.netFeeEnabled') : null;
            const netFeeFresh = (netFeeAge === null || netFeeAge === undefined) ? true : (netFeeAge <= staleTimeoutMs);

            // IMPORTANT (Robustness/UX):
            // Das Zeitfenster muss auch ohne dynamischen Stromtarif funktionieren.
            // Ist der dynamische Tarif aktiv, muss sein Preis zusätzlich frisch sein;
            // teuer, stale oder unbekannt sperrt trotz NT die wirtschaftliche Netzladung.
            const netFeeEff = !!(netFeeFresh && netFeeEnabledRaw);

            const netFeeModelRaw = this.dp ? this.dp.getNumberFresh('vis.settings.netFeeModel', staleTimeoutMs, 1) : 1;
            const netFeeModel = (typeof netFeeModelRaw === 'number' && Number.isFinite(netFeeModelRaw)) ? Math.round(netFeeModelRaw) : 1;
            const netFeeModelEff = (netFeeModel === 2) ? 2 : 1;

	            const nowMs = Date.now();
	            const nowMinLocal = this._nowMinutesLocal(nowMs);
	            const quarterNow = this._currentQuarter(nowMs);

            // Speicher-Netzladen verwendet ausschließlich das manuell
            // konfigurierte HT/NT-/Quartalsfenster. Es gibt bewusst kein
            // zusätzliches hardcodiertes Nachtfenster.

            // Default: Simple (global)
            let ntStartRaw = (this.dp && typeof this.dp.getRaw === 'function') ? this.dp.getRaw('vis.settings.netFeeNtStart') : null;
            let ntEndRaw = (this.dp && typeof this.dp.getRaw === 'function') ? this.dp.getRaw('vis.settings.netFeeNtEnd') : null;
            let htStartRaw = (this.dp && typeof this.dp.getRaw === 'function') ? this.dp.getRaw('vis.settings.netFeeHtStart') : null;
            let htEndRaw = (this.dp && typeof this.dp.getRaw === 'function') ? this.dp.getRaw('vis.settings.netFeeHtEnd') : null;

            // Quartalsmodell: ausschließlich die manuell gepflegten Zeiten des
            // aktuellen Quartals verwenden. Fehlende Q-Werte fallen bewusst nicht
            // auf globale Defaults zurück, damit Speicher-Netzladen fail-closed bleibt.
            if (netFeeModelEff === 2 && this.dp && typeof this.dp.getRaw === 'function') {
                const q = this._currentQuarter(nowMs);
                const qq = `Q${q}`;
                const ntS = this.dp.getRaw(`vis.settings.netFee${qq}NtStart`);
                const ntE = this.dp.getRaw(`vis.settings.netFee${qq}NtEnd`);
                const htS = this.dp.getRaw(`vis.settings.netFee${qq}HtStart`);
                const htE = this.dp.getRaw(`vis.settings.netFee${qq}HtEnd`);
                ntStartRaw = (ntS === null || ntS === undefined) ? '' : ntS;
                ntEndRaw = (ntE === null || ntE === undefined) ? '' : ntE;
                htStartRaw = (htS === null || htS === undefined) ? '' : htS;
                htEndRaw = (htE === null || htE === undefined) ? '' : htE;
            }

            // NOTE: "" (empty string) should disable the window instead of falling back.
            // Fehlende Zeiten bedeuten immer: Fenster nicht konfiguriert. Auch
            // das einfache HT/NT-Modell darf Speicher-Netzladen nicht mit
            // versteckten Defaultzeiten freigeben; die Freigabe muss aus der
            // vom Betreiber gespeicherten manuellen Einstellung stammen.
            const ntStartMin = this._parseTimeToMinutes((ntStartRaw === null || ntStartRaw === undefined) ? '' : ntStartRaw);
            const ntEndMin = this._parseTimeToMinutes((ntEndRaw === null || ntEndRaw === undefined) ? '' : ntEndRaw);
            const htStartMin = this._parseTimeToMinutes((htStartRaw === null || htStartRaw === undefined) ? '' : htStartRaw);
            const htEndMin = this._parseTimeToMinutes((htEndRaw === null || htEndRaw === undefined) ? '' : htEndRaw);

            let netFeeMode = 'off'; // off | NT | Standard | HT
            if (netFeeEff) {
                const inNt = this._isInTimeWindow(nowMinLocal, ntStartMin, ntEndMin);
                const inHt = (!inNt) && this._isInTimeWindow(nowMinLocal, htStartMin, htEndMin);
                // Standard = restliche Zeit (ST). Wichtig: Standard darf NICHT die dynamische Tarif-Logik
                // "aushebeln" – nur NT/HT sind echte Overlays.
                netFeeMode = inNt ? 'NT' : inHt ? 'HT' : 'Standard';
            }
            const storageChargeWindowOk = !!(netFeeEff && netFeeMode === 'NT');
            const storageChargeWindowLabel = formatStorageNtWindowLabel({
                model: netFeeModelEff,
                quarter: quarterNow,
                startRaw: ntStartRaw,
                endRaw: ntEndRaw,
            });

			// --- Preise (Provider + VIS) ---
                const preisGrenzeVis = this._normalizePriceEurPerKwh(preisGrenzeVisRaw, null);

                // Debug/Transparenz: im Manuellen Modus muss der VIS-Strompreis vorhanden sein.
                // (Sonst fällt die Logik auf Durchschnitt/Fallbacks zurück.)
                if (aktivEff && modusInt === 1) {
                    const missing = (preisGrenzeVis === null || preisGrenzeVis === undefined || !Number.isFinite(preisGrenzeVis));
                    if (missing && !this._warnedManualPriceMissing) {
                        this._warnedManualPriceMissing = true;
                        this.adapter.log.warn(`[TarifVis] Modus=Manuell, aber VIS-Strompreis fehlt/ungültig (vis.settings.price). Bitte in der VIS unter Einstellungen setzen.`);
                    } else if (!missing && this._warnedManualPriceMissing) {
                        this._warnedManualPriceMissing = false;
                        this.adapter.log.info(`[TarifVis] VIS-Strompreis im Modus=Manuell ist wieder gültig: ${preisGrenzeVis} €/kWh`);
                    }
                }

			let preisAktuell = null;
            let preisAktuellSource = 'missing';
            const currentPriceAgeMs = (this.dp && typeof this.dp.getAgeMs === 'function')
                ? this.dp.getAgeMs('tarif.preisAktuellEurProKwh')
                : null;
            const currentPriceDirectFresh = currentPriceAgeMs === null || currentPriceAgeMs === undefined || currentPriceAgeMs <= currentPriceMaxAgeMs;
			if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.preisAktuellEurProKwh')) {
				const raw = this.dp.getNumberFresh('tarif.preisAktuellEurProKwh', currentPriceMaxAgeMs, null);
				preisAktuell = this._normalizePriceEurPerKwh(raw, null);
                if (typeof preisAktuell === 'number' && Number.isFinite(preisAktuell)) preisAktuellSource = 'provider-current';
			}

			let preisDurchschnitt = null;
            const averagePriceAgeMs = (this.dp && typeof this.dp.getAgeMs === 'function')
                ? this.dp.getAgeMs('tarif.preisDurchschnittEurProKwh')
                : null;
			if (this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.preisDurchschnittEurProKwh')) {
				const raw = this.dp.getNumberFresh('tarif.preisDurchschnittEurProKwh', averagePriceMaxAgeMs, null);
				preisDurchschnitt = this._normalizePriceEurPerKwh(raw, null);
			}

			const preisVisOk = (typeof preisGrenzeVis === 'number' && Number.isFinite(preisGrenzeVis));
			let preisAktuellOk = (typeof preisAktuell === 'number' && Number.isFinite(preisAktuell));
			const preisDurchschnittOk = (typeof preisDurchschnitt === 'number' && Number.isFinite(preisDurchschnitt));

            const todayCurveAgeMs = (this.dp && typeof this.dp.getAgeMs === 'function') ? this.dp.getAgeMs('tarif.pricesTodayJson') : null;
            const tomorrowCurveAgeMs = (this.dp && typeof this.dp.getAgeMs === 'function') ? this.dp.getAgeMs('tarif.pricesTomorrowJson') : null;
            const todayCurveFresh = todayCurveAgeMs === null || todayCurveAgeMs === undefined || todayCurveAgeMs <= curveMaxAgeMs;
            const tomorrowCurveFresh = tomorrowCurveAgeMs === null || tomorrowCurveAgeMs === undefined || tomorrowCurveAgeMs <= curveMaxAgeMs;
            const curveAgeCandidates = [todayCurveAgeMs, tomorrowCurveAgeMs].filter(value => Number.isFinite(Number(value))).map(Number);
            const curveAgeMs = curveAgeCandidates.length ? Math.min(...curveAgeCandidates) : null;
            let curveFresh = false;
            let priceDataStatus = preisAktuellOk ? 'current-price-fresh' : (currentPriceDirectFresh ? 'current-price-missing' : 'current-price-stale');

            // --- Preis-Kurve (Today/Tomorrow) für Automatik/Forecast ---
            const cfgTariff = tariffCfg;
            const autoBandEur = this._clamp(this._num(cfgTariff.autoBandEur, 0.03), 0, 1);
            const horizonHours = this._clamp(this._num(cfgTariff.horizonHours, 36), 6, 72);
            // Hysterese-Bandbreite um den Referenzpreis für neutral/teuer/guenstig
            // NOTE:
            // - In "Manuell" erwarten Anwender meist eine deutlich feinere Schwelle.
            // - In "Automatisch" (Forecast) darf das Band gröber sein, um Flattern zu vermeiden.
            // Beide Werte sind optional per Adapter-Config überschreibbar.
            const deltaAutoEur = this._clamp(this._num(cfgTariff.deltaEur, 0.02), 0, 1);
            const deltaManualEur = this._clamp(this._num(cfgTariff.manualDeltaEur, 0.005), 0, 1);
            // nowMs wird oben bereits einmal bestimmt (u.a. für Netzentgelt/Quartal)
            const horizonEndMs = nowMs + horizonHours * 60 * 60 * 1000;

            let preisMin = null;
            let preisSchwelleGuensig = null;
            let preisDurchschnittCalc = null;
            let nextCheapFromIso = null;
            let nextCheapToIso = null;
            let horizonCurve = null;

            // Gate E – Negativpreis: Wenn der effektive dynamische Preis < 0 ist,
            // soll Netzbezug bewusst bevorzugt werden. Today+Tomorrow werden als
            // Planungs-/Diagnosehorizont ausgewertet, der aktuelle Preis bleibt
            // aber die harte Live-Freigabe.
            let negativeActive = false;
            let negativeWindowNow = false;
            let negativeCurrentPrice = null;
            let negativeMinPrice = null;
            let nextNegativeFromIso = null;
            let nextNegativeToIso = null;

            if (aktivEff && modusInt === 2) {
                const rawToday = (todayCurveFresh && this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.pricesTodayJson'))
                    ? this.dp.getRaw('tarif.pricesTodayJson')
                    : null;
                const rawTomorrow = (tomorrowCurveFresh && this.dp && typeof this.dp.getEntry === 'function' && this.dp.getEntry('tarif.pricesTomorrowJson'))
                    ? this.dp.getRaw('tarif.pricesTomorrowJson')
                    : null;

                const todayArr = this._parsePriceCurve(rawToday);
                const tomorrowArr = this._parsePriceCurve(rawTomorrow);

                const all = [...todayArr, ...tomorrowArr]
                    .filter(x => x && Number.isFinite(x.startMs) && Number.isFinite(x.endMs) && Number.isFinite(x.priceEurKwh))
                    .filter(x => x.endMs > nowMs && x.startMs < horizonEndMs)
                    .sort((a, b) => a.startMs - b.startMs);

                if (all.length > 0) {
                    horizonCurve = all;
                    curveFresh = true;
                    preisMin = Math.min(...all.map(x => x.priceEurKwh));
                    preisSchwelleGuensig = preisMin + autoBandEur;
                    preisDurchschnittCalc = all.reduce((s, x) => s + x.priceEurKwh, 0) / all.length;

                    // Fallback für den aktuellen Stundenpreis: Eine frische Day-Ahead-
                    // Kurve darf den aktuellen Slot liefern, wenn der direkte Provider-
                    // State fehlt oder älter als die erlaubten 90 Minuten ist.
                    if (!preisAktuellOk) {
                        const activeSegment = all.find(x => x.startMs <= nowMs && x.endMs > nowMs);
                        if (activeSegment && Number.isFinite(activeSegment.priceEurKwh)) {
                            preisAktuell = activeSegment.priceEurKwh;
                            preisAktuellOk = true;
                            preisAktuellSource = 'curve-current';
                            priceDataStatus = 'current-from-fresh-curve';
                        }
                    }
                }
            }

            if (!preisAktuellOk && aktivEff) {
                priceDataStatus = curveFresh ? 'current-slot-missing' : (currentPriceDirectFresh ? 'current-price-missing' : 'current-and-curve-stale');
                const eCur = (this.dp && typeof this.dp.getEntry === 'function') ? this.dp.getEntry('tarif.preisAktuellEurProKwh') : null;
                const idCur = eCur && typeof eCur.objectId === 'string' ? eCur.objectId : '';
                this._debugThrottle(`Tarif: aktueller Preis nicht verwendbar (DP='${idCur}', Alter=${currentPriceAgeMs}ms, Kurve=${curveFresh ? 'frisch' : 'stale/leer'}). Wirtschaftliche Netzladung bleibt aus; Eigenverbrauch bleibt aktiv.`);
            }

            // Negativpreis-Fenster aus Today+Tomorrow-Forecast ermitteln.
            if (aktivEff) {
                const negEps = 1e-9;

                if (preisAktuellOk && preisAktuell < -negEps) {
                    negativeActive = true;
                    negativeCurrentPrice = preisAktuell;
                }

                if (Array.isArray(horizonCurve) && horizonCurve.length > 0) {
                    const negAll = horizonCurve
                        .filter(x => x && Number.isFinite(x.startMs) && Number.isFinite(x.endMs) && Number.isFinite(x.priceEurKwh))
                        .filter(x => x.endMs > nowMs && x.priceEurKwh < -negEps)
                        .sort((a, b) => a.startMs - b.startMs);

                    if (negAll.length > 0) {
                        negativeMinPrice = Math.min(...negAll.map(x => x.priceEurKwh));
                        const activeSeg = negAll.find(x => x.startMs <= nowMs && x.endMs > nowMs);
                        if (activeSeg) {
                            negativeActive = true;
                            negativeWindowNow = true;
                            negativeCurrentPrice = activeSeg.priceEurKwh;
                        }

                        const first = negAll[0];
                        let winStart = first.startMs;
                        let winEnd = first.endMs;
                        for (let i = 1; i < negAll.length; i++) {
                            const it = negAll[i];
                            if (it.startMs <= (winEnd + 1000)) {
                                winEnd = Math.max(winEnd, it.endMs);
                            } else {
                                break;
                            }
                        }
                        nextNegativeFromIso = new Date(winStart).toISOString();
                        nextNegativeToIso = new Date(winEnd).toISOString();
                    }
                }
            }

            const gridImportPreferred = !!(aktivEff && negativeActive);

            const preisDurchschnittEff = preisDurchschnittOk ? preisDurchschnitt
                : (Number.isFinite(preisDurchschnittCalc) ? preisDurchschnittCalc : null);
            const preisDurchschnittEffOk = (typeof preisDurchschnittEff === 'number' && Number.isFinite(preisDurchschnittEff));

            // Referenzpreis (Preisgrenze) – wirksam
            let preisRef = null;
            if (modusInt === 2) {
                // Automatisch: Durchschnittspreis (Fallback: VIS)
                preisRef = preisDurchschnittEffOk ? preisDurchschnittEff : (preisVisOk ? preisGrenzeVis : null);
            } else {
                // Manuell: VIS Preis (Fallback: Durchschnitt)
                preisRef = preisVisOk ? preisGrenzeVis : (preisDurchschnittEffOk ? preisDurchschnittEff : null);
            }

            // ───────────────────────────────────────────────────────────
            // Auto‑KI / Tarif‑Optimierung (Automatik/Forecast)
            //
            // Problem (Praxis): Die alte Auto‑Logik definiert „günstig“ als
            //   Preis <= (Minimum + autoBandEur)
            // Wenn autoBandEur größer ist als (Ø − Minimum), liegt diese Schwelle
            // über dem Durchschnitt → der Speicher lädt dann trotz Preis > Ø.
            //
            // Ziel (User‑Wunsch): Im Tarif‑Modus soll Netzladen nur unterhalb des
            // Durchschnitts stattfinden. Daher kappen wir die „günstig“-Schwelle
            // in Auto‑Mode am wirksamen Ø‑Preis (Provider‑Ø oder berechneter Ø).
            //
            // Optional per Config deaktivierbar (Expert‑Patch):
            //   tariff.autoCheapCapToAvg = false
            // ───────────────────────────────────────────────────────────
            if (aktivEff && modusInt === 2) {
                const capToAvg = (cfgTariff.autoCheapCapToAvg !== undefined) ? !!cfgTariff.autoCheapCapToAvg : true;
                if (capToAvg && typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig) && preisDurchschnittEffOk) {
                    preisSchwelleGuensig = Math.min(preisSchwelleGuensig, preisDurchschnittEff);
                }

                // Nächstes günstiges Fenster (für Forecast/Anzeige) – basierend auf der effektiven Schwelle
                if (Array.isArray(horizonCurve) && horizonCurve.length > 0 && typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig)) {
                    const cheap = horizonCurve.filter(x => x.priceEurKwh <= preisSchwelleGuensig + 1e-9);
                    if (cheap.length > 0) {
                        const first = cheap[0];
                        let winStart = first.startMs;
                        let winEnd = first.endMs;

                        for (let i = 1; i < cheap.length; i++) {
                            const it = cheap[i];
                            // contiguous hour blocks; allow small tolerance
                            if (it.startMs <= (winEnd + 1000)) {
                                winEnd = Math.max(winEnd, it.endMs);
                            } else {
                                break;
                            }
                        }

                        nextCheapFromIso = new Date(winStart).toISOString();
                        nextCheapToIso = new Date(winEnd).toISOString();
                    }
                }
            }

            // --- Tarifzustand (mit Hysterese) ---
            // In Manuell ist das Band kleiner (feinere Schwelle). In Auto darf es größer sein.
            const delta = (modusInt === 1) ? deltaManualEur : deltaAutoEur;

            // IMPORTANT: Hysterese "merkt" sich den letzten Zustand (teuer/neutral/guenstig).
            // Wenn der Benutzer den Modus oder den Referenzpreis ändert, soll die Einstufung
            // sofort neu bewertet werden – sonst bleibt z.B. "teuer" aktiv bis zur Gegenschwelle.
            const lastModus = this._tarifLastModusInt;
            const lastRef = this._tarifLastPreisRef;
            const lastAktiv = this._tarifLastAktivEff;
            const lastDelta = this._tarifLastDeltaEur;
            const refChanged = (typeof lastRef === 'number' && Number.isFinite(lastRef) && typeof preisRef === 'number' && Number.isFinite(preisRef))
                ? (Math.abs(preisRef - lastRef) > 0.0005)
                : (lastRef !== preisRef);
            const modeChanged = (typeof lastModus === 'number') ? (lastModus !== modusInt) : false;
            const aktivChanged = (typeof lastAktiv === 'boolean') ? (lastAktiv !== aktivEff) : false;
            const deltaChanged = (typeof lastDelta === 'number' && Number.isFinite(lastDelta)) ? (Math.abs(delta - lastDelta) > 0.0005) : false;
            if (modeChanged || aktivChanged || refChanged || deltaChanged) {
                this._tarifLastState = 'neutral';
            }
            this._tarifLastModusInt = modusInt;
            this._tarifLastPreisRef = (typeof preisRef === 'number' && Number.isFinite(preisRef)) ? preisRef : preisRef;
            this._tarifLastAktivEff = aktivEff;
            this._tarifLastDeltaEur = delta;

            const preisGrenze = (typeof preisRef === 'number' && Number.isFinite(preisRef)) ? (preisRef + delta) : null;
            let tarifState = 'aus'; // aus | unbekannt | neutral | guenstig | teuer

            if (!aktivEff) {
                tarifState = 'aus';
                this._tarifLastState = 'neutral';
            } else if (!preisAktuellOk) {
                tarifState = 'unbekannt';
                this._tarifLastState = 'neutral';
            } else if (modusInt === 2 && typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig)) {
                // Auto-Forecast: günstig = innerhalb Band um Minimum (min + autoBandEur)
                const prev = this._tarifLastState || 'neutral';
                const isCheap = (preisAktuell <= (preisSchwelleGuensig + 1e-9));

                let next = 'neutral';
                if (isCheap) {
                    next = 'guenstig';
                } else if (!(typeof preisRef === 'number' && Number.isFinite(preisRef))) {
                    next = 'neutral';
                } else if (prev === 'teuer') {
                    next = (preisAktuell <= (preisRef - delta)) ? 'neutral' : 'teuer';
                } else {
                    next = (preisAktuell >= (preisRef + delta)) ? 'teuer' : 'neutral';
                }

                this._tarifLastState = next;
                tarifState = next;
            } else if (preisRef === null || preisRef === undefined || !Number.isFinite(preisRef)) {
                tarifState = 'unbekannt';
                this._tarifLastState = 'neutral';
            } else {
                // Original: günstig/teuer relativ zum Referenzpreis (Ø oder VIS)
                const prev = this._tarifLastState || 'neutral';
                let next = 'neutral';
                if (prev === 'guenstig') {
                    next = (preisAktuell >= (preisRef + delta)) ? 'neutral' : 'guenstig';
                } else if (prev === 'teuer') {
                    next = (preisAktuell <= (preisRef - delta)) ? 'neutral' : 'teuer';
                } else {
                    if (preisAktuell <= (preisRef - delta)) next = 'guenstig';
                    else if (preisAktuell >= (preisRef + delta)) next = 'teuer';
                    else next = 'neutral';
                }
                this._tarifLastState = next;
                tarifState = next;
            }

            // Negativpreis ist ein Sonderfall von "günstig" für EVCS und die
            // Tarifklassifikation. Beim Speicher bleiben AppCenter-Freigabe,
            // Priorität und das manuelle NT-/Quartalsfenster trotzdem zwingend.
            if (gridImportPreferred) {
                tarifState = 'guenstig';
                this._tarifLastState = 'guenstig';
            }

            // --- Priorität ---
            // 1 = Speicher | 2 = Auto | 3 = Ladestation
            const allowStorageCheap = (prioritaet === 1 || prioritaet === 2);
            const allowEvcsCheap = (prioritaet === 2 || prioritaet === 3);
            // Negativpreise dürfen die Speicher-Priorität oder das manuelle
            // NT-Fenster nicht umgehen. Für EVCS bleibt das bestehende Verhalten.
            const allowStorageCheapEff = allowStorageCheap;
            const allowEvcsCheapEff = gridImportPreferred ? true : allowEvcsCheap;

            // Speicher-SoC der exklusiv ausgewaehlten Schreibtopologie. Tarif und
            // Speicherregelung muessen dieselbe Quelle verwenden; bei einer Farm gibt
            // es deshalb keinen stillen Rueckfall auf `st.socPct` eines Einzelspeichers.
            let socRaw = storageTopology === 'single' && this.dp
                ? this.dp.getNumber('st.socPct', null)
                : null;
            if (storageTopology === 'farm') {
                const now = Date.now();
                const staleMs = 120000;
                try {
                    const stOnline = await this.adapter.getStateAsync('storageFarm.storagesOnline');
                    const stDispatch = await this.adapter.getStateAsync('storageFarm.storagesDispatchAvailable');
                    const onlineN = stOnline && stOnline.val !== undefined && stOnline.val !== null ? Number(stOnline.val) : NaN;
                    const dispatchN = stDispatch && stDispatch.val !== undefined && stDispatch.val !== null ? Number(stDispatch.val) : NaN;
                    const hasOnline = Number.isFinite(onlineN) && onlineN > 0;
                    const hasDispatchable = Number.isFinite(dispatchN) && dispatchN > 0;

                    if (hasOnline || hasDispatchable) {
                        let stSoc = hasOnline
                            ? await this.adapter.getStateAsync('storageFarm.totalSocOnline')
                            : null;
                        let value = stSoc && stSoc.val !== undefined && stSoc.val !== null ? Number(stSoc.val) : NaN;
                        let age = stSoc && typeof stSoc.ts === 'number' ? (now - Number(stSoc.ts)) : null;
                        if (!Number.isFinite(value)) {
                            stSoc = await this.adapter.getStateAsync('storageFarm.totalSoc');
                            value = stSoc && stSoc.val !== undefined && stSoc.val !== null ? Number(stSoc.val) : NaN;
                            age = stSoc && typeof stSoc.ts === 'number' ? (now - Number(stSoc.ts)) : null;
                        }
                        if (Number.isFinite(value) && (age === null || age <= staleMs)) socRaw = value;
                    }
                } catch (_e) {
                    // Fehlender Farm-SoC bleibt unbekannt; kein Einzel-Fallback.
                }
            }

            const storageSocPct = (typeof socRaw === 'number' && Number.isFinite(socRaw))
                ? this._clamp(socRaw, 0, 100)
                : null;

            // Tarif-SoC-Schwellen (Default: Start <= 98%, Stop >= 100%)
            // Ziel: Wenn Speicher bei 100% ist und Tarif weiterhin günstig ist, soll er ruhen (0 W).
            // Gleichzeitig vermeiden wir "Flattern" durch eine Start/Stop-Hysterese.
            let socStartChargePct = this._clamp(this._num(cfgTariff.socStartChargePct, 98), 0, 100);
            let socStopChargePct = this._clamp(this._num(cfgTariff.socStopChargePct, 100), 0, 100);
            if (socStartChargePct > socStopChargePct) {
                const tmp = socStartChargePct;
                socStartChargePct = socStopChargePct;
                socStopChargePct = tmp;
            }

            const storageConfig = (this.adapter && this.adapter.config && this.adapter.config.storage) || {};
            const storageFarmConfig = (this.adapter && this.adapter.config && this.adapter.config.storageFarm) || {};
            const storageGridChargeConfigured = storageTopology === 'farm'
                ? storageFarmConfig.allowGridCharge !== false
                : storageConfig.allowGridCharge !== false;
            const storageGridChargePermission = resolveStorageGridChargePermission({
                appCenterAllowed: storageGridChargeConfigured,
                tariffActive: aktivEff,
                currentPriceFresh: preisAktuellOk,
                tariffState: tarifState,
                manualNetFeeEnabled: netFeeEff,
                manualNtWindowActive: storageChargeWindowOk,
                priorityAllowsStorage: allowStorageCheapEff,
                storageWriterAvailable,
                storagePowerW: storagePowerAbsW,
            });
            const storageGridChargeAllowed = storageGridChargePermission.allowed === true;
            const storageGridChargeBlockReason = storageGridChargeAllowed ? '' : String(storageGridChargePermission.reason || 'Speicher-Netzladen gesperrt');

            // Sollleistung Speicher: negativ = Laden, positiv = Entladen
            // Zusätzlich: Im günstigen Tarif-Fenster bei vollem Speicher (SoC=100%) 0 W halten.
            let speicherSollW = 0;
            let storageFullHold = false;
            let storageChargeWanted = false;
	            let storageChargeBlockedByTime = false;

            // Speicher-Netzladen ist ausschließlich ein günstiger-Tarif-Pfad.
            // Außerhalb dieser vollständigen Freigabe erzeugt TarifVis keinen eigenen
            // Lade- oder Entladesollwert. Dadurch fällt die Speicherregelung sauber auf
            // die normale Eigenverbrauchsoptimierung zurück.
            if (storageWriterAvailable && (aktivEff || netFeeEff) && storagePowerAbsW > 0) {
                const netFeeActive = !!(netFeeEff && netFeeMode !== 'off');
                const cheapWanted = !!(aktivEff && preisAktuellOk && tarifState === 'guenstig' && allowStorageCheapEff);
                const chargeAllowed = storageGridChargeAllowed;

                if (chargeAllowed) {
                    // Frischer günstiger Tarif; bei aktivem Netzentgelt zusätzlich
                    // manuelles NT-/Quartalsfenster. Laden mit SoC-Hysterese.
                    storageChargeWanted = true;

                    if (typeof storageSocPct === 'number' && Number.isFinite(storageSocPct)) {
                        if (this._tariffChargeLatch) {
                            if (storageSocPct >= (socStopChargePct - 1e-9)) {
                                this._tariffChargeLatch = false;
                            }
                        } else if (storageSocPct <= (socStartChargePct + 1e-9)) {
                            this._tariffChargeLatch = true;
                        }

                        storageChargeWanted = !!this._tariffChargeLatch;
                        storageFullHold = (!storageChargeWanted) && (storageSocPct >= (socStopChargePct - 1e-9));
                    }

                    speicherSollW = storageChargeWanted ? -storagePowerAbsW : 0;
                } else {
                    // Neutral, teuer, unbekannt, stale, Tarif aus oder fehlendes
                    // NT-Fenster: niemals aus dem Netz laden. Keine Tarif-Entladung
                    // erzwingen – die normale Eigenverbrauchsoptimierung übernimmt.
                    this._tariffChargeLatch = false;
                    storageChargeWanted = false;
                    storageFullHold = false;
                    storageChargeBlockedByTime = !!(cheapWanted && netFeeActive && !storageChargeWindowOk);
                    speicherSollW = 0;
                }
            } else {
                this._tariffChargeLatch = false;
                storageChargeWanted = false;
                storageFullHold = false;
                speicherSollW = 0;
            }

            const dynamicTariffStale = !!(aktivEff && !preisAktuellOk);
            // Aktiver Dynamiktarif mit stale Preis sperrt auch innerhalb NT.
            if (dynamicTariffStale) {
                this._tariffChargeLatch = false;
                storageChargeWanted = false;
                storageFullHold = false;
                storageChargeBlockedByTime = false;
                speicherSollW = 0;
            }

            // Netzladen für Ladestationen (globales Gate für Charging-Management):
            // - true wenn Tarif aus (keine Sperre)
            // - false wenn teuer (Netzladen gesperrt; PV-Überschuss ist weiterhin möglich)
            // - true wenn neutral/unbekannt (keine Tarif-Sperre)
            // - bei günstig: nur true, wenn Priorität EVCS zulässt
            let gridChargeAllowed = true;

            // Dynamiktarif: stale/teuer/unbekannt sperrt; neutral erlaubt; günstig folgt Priorität.
            if (aktivEff) {
                if (!preisAktuellOk) {
                    gridChargeAllowed = false;
                } else if (gridImportPreferred) {
                    gridChargeAllowed = true;
                } else if (tarifState === 'teuer') {
                    gridChargeAllowed = false;
                } else if (tarifState === 'guenstig') {
                    gridChargeAllowed = allowEvcsCheapEff ? true : false;
                } else if (tarifState === 'neutral') {
                    gridChargeAllowed = true;
                } else {
                    gridChargeAllowed = false;
                }
            }

            // Netzentgelt: HT sperrt; NT allein erlaubt nur bei deaktiviertem Dynamiktarif.
            const netFeeActiveForGrid = !!(netFeeEff && netFeeMode !== 'off');
            if (netFeeActiveForGrid) {
                if (netFeeMode === 'NT') {
                    if (!aktivEff) gridChargeAllowed = true;
                    else if (!preisAktuellOk || tarifState === 'teuer' || !['guenstig', 'neutral'].includes(tarifState)) gridChargeAllowed = false;
                } else if (netFeeMode === 'HT') gridChargeAllowed = false;
                // Standard (ST): kein Override
            }

            // Negativpreis hat als wirtschaftliches Signal Vorrang vor PV-only-/HT-Sperren:
            // Netzbezug erlauben, Speicherentladung vermeiden. Harte Netz-/§14a-/Peak-Grenzen
            // werden später weiterhin durch die Gates begrenzt.
            if (gridImportPreferred) {
                gridChargeAllowed = true;
            }

            // Entladen-Freigabe (für Speicher-/Assist-Logik):
            //
            // Ziel (Bugfix + bessere Praxis):
            // - Eigenverbrauchs-Optimierung darf grundsätzlich entladen (Netzbezug reduzieren).
            // - Im günstigen Tarif-Fenster sperren wir die Entladung *nur*, wenn der Speicher
            //   tatsächlich im Tarif-Kontext aus dem Netz laden soll (sonst würden wir gegen
            //   das Laden arbeiten und „frieren“ den Speicher fälschlich ein).
            //
            // Wichtiger Bugfix:
            // - Wenn Tarif „günstig“ ist, aber Speicher-Netzladen wegen Zeitfenster-Policy
            //   (storageChargeBlockedByTime = true, Status: „Eigenverbrauchsoptimierung aktiv (tagsüber)“)
            //   blockiert ist, muss Entladung weiterhin möglich sein.
            let dischargeAllowed = true;
            const netFeeActive = !!(netFeeEff && netFeeMode !== 'off');
            const netFeeIsNt = !!(netFeeActive && netFeeMode === 'NT');
            const netFeeIsHt = !!(netFeeActive && netFeeMode === 'HT');

            if (aktivEff || netFeeActive) {
                const storageChargingPlanned = Number.isFinite(speicherSollW) && speicherSollW < 0;
                const forceSelfConsumption = !!storageChargeBlockedByTime || netFeeIsHt;

                if (gridImportPreferred && storageGridChargeAllowed) {
                    // Nur wenn die vollständige Speicher-Netzladefreigabe aktiv
                    // ist, darf ein Negativpreis die Entladung sperren.
                    dischargeAllowed = false;
                } else if (forceSelfConsumption) {
                    // Eigenverbrauch-Modus (tagsüber Policy oder HT): Entladen erlaubt.
                    dischargeAllowed = true;
                } else if (netFeeIsNt) {
                    // NT: Entladung nur sperren, wenn wir wirklich laden wollen.
                    dischargeAllowed = !storageChargingPlanned;
                } else {
                    // Standard (ST) oder Netzentgelt aus:
                    // Im günstigen Fenster nur sperren, wenn Speicher aktiv laden soll.
                    if (aktivEff && tarifState === 'guenstig') {
                        dischargeAllowed = !storageChargingPlanned;
                    } else {
                        dischargeAllowed = true;
                    }
                }
            } else {
                dischargeAllowed = true;
            }

            // Ladepark-Limit: Standard = baseW; Reservierung wenn Speicher im Tarif-Fenster lädt
            let limitW = baseW;
            if (storageGridChargeAllowed && speicherSollW < 0 && baseW > 0) {
                const reserveW = Math.max(0, -speicherSollW);
                const storageShare = (prioritaet === 1) ? 1.0 : (prioritaet === 3) ? 0.0 : 0.5;
                limitW = Math.max(0, Math.round(baseW - (reserveW * storageShare)));
            }

            // --- Diagnose/Transparenz ---
            await this._setIfChanged('tarif.aktiv', aktivEff);
            await this._setIfChanged('tarif.modus', modusInt);
            await this._setIfChanged('tarif.preisEurProKwh', preisVisOk ? preisGrenzeVis : null);
            await this._setIfChanged('tarif.prioritaet', prioritaet);
            await this._setIfChanged('tarif.speicherLeistungW', this._num(storageW, 0));
            await this._setIfChanged('tarif.ladeparkMaxW', this._num(evcsMaxW, 0));

            const effectiveCurrentPriceAgeMs = preisAktuellSource === 'curve-current' ? curveAgeMs : currentPriceAgeMs;
            await this._setIfChanged('tarif.currentPriceFresh', !!preisAktuellOk);
            await this._setIfChanged('tarif.currentPriceAgeMs', Number.isFinite(Number(effectiveCurrentPriceAgeMs)) ? Math.round(Number(effectiveCurrentPriceAgeMs)) : null);
            await this._setIfChanged('tarif.currentPriceMaxAgeMs', Math.round(currentPriceMaxAgeMs));
            await this._setIfChanged('tarif.currentPriceSource', preisAktuellSource);
            await this._setIfChanged('tarif.curveFresh', !!curveFresh);
            await this._setIfChanged('tarif.curveAgeMs', Number.isFinite(Number(curveAgeMs)) ? Math.round(Number(curveAgeMs)) : null);
            await this._setIfChanged('tarif.curveMaxAgeMs', Math.round(curveMaxAgeMs));
            await this._setIfChanged('tarif.priceDataStatus', priceDataStatus);
            await this._setIfChanged('tarif.dynamicTariffStale', dynamicTariffStale);
            await this._setIfChanged('tarif.preisAktuellEurProKwh', preisAktuellOk ? preisAktuell : null);
            await this._setIfChanged('tarif.preisDurchschnittEurProKwh', preisDurchschnittEffOk ? preisDurchschnittEff : null);
            // preisRef = wirksame Referenz (Manuell oder Durchschnitt)
            // preisGrenze = obere Schwelle ("teuer" ab ...) = preisRef + delta
            await this._setIfChanged('tarif.preisGrenzeEurProKwh', (preisGrenze !== null && preisGrenze !== undefined && Number.isFinite(preisGrenze)) ? preisGrenze : null);
            await this._setIfChanged('tarif.preisRefEurProKwh', (preisRef !== null && preisRef !== undefined && Number.isFinite(preisRef)) ? preisRef : null);
            // Forecast/Auto-Min Diagnose (optional)
            await this._setIfChanged('tarif.preisMinEurProKwh', (typeof preisMin === 'number' && Number.isFinite(preisMin)) ? preisMin : null);
            await this._setIfChanged('tarif.preisSchwelleGuensigEurProKwh', (typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig)) ? preisSchwelleGuensig : null);
            await this._setIfChanged('tarif.naechstesGuensigVon', nextCheapFromIso || null);
            await this._setIfChanged('tarif.naechstesGuensigBis', nextCheapToIso || null);

            await this._setIfChanged('tarif.state', tarifState);
            await this._setIfChanged('tarif.speicherSollW', speicherSollW);
            await this._setIfChanged('tarif.netzLadenErlaubt', gridChargeAllowed);
            await this._setIfChanged('tarif.entladenErlaubt', dischargeAllowed);

            await this._setIfChanged('tarif.netFeeEnabled', netFeeEff);
            await this._setIfChanged('tarif.netFeeMode', netFeeMode);
            await this._setIfChanged('tarif.speicherNetzLadenErlaubt', storageGridChargeAllowed);
            await this._setIfChanged('tarif.speicherNetzLadenSperrgrund', storageGridChargeBlockReason);
            await this._setIfChanged('tarif.speicherPreisGuensig', !!(aktivEff && preisAktuellOk && tarifState === 'guenstig'));
            await this._setIfChanged('tarif.speicherZeitfensterAktiv', storageChargeWindowOk);
            await this._setIfChanged('tarif.speicherZeitfensterLabel', storageChargeWindowLabel);

            await this._setIfChanged('tarif.negativpreisAktiv', !!negativeActive);
            await this._setIfChanged('tarif.netzbezugBevorzugt', !!gridImportPreferred);
            await this._setIfChanged('tarif.negativPreisAktuellEurProKwh', (negativeActive && typeof negativeCurrentPrice === 'number' && Number.isFinite(negativeCurrentPrice)) ? negativeCurrentPrice : null);
            await this._setIfChanged('tarif.negativPreisMinEurProKwh', (typeof negativeMinPrice === 'number' && Number.isFinite(negativeMinPrice)) ? negativeMinPrice : null);
            await this._setIfChanged('tarif.naechstesNegativVon', nextNegativeFromIso || null);
            await this._setIfChanged('tarif.naechstesNegativBis', nextNegativeToIso || null);
            await this._setIfChanged('tarif.negativpreisStatus', gridImportPreferred ? 'active_grid_import_preferred' : (nextNegativeFromIso ? 'scheduled' : 'inactive'));

// Tarif-Absicht für Diagnose und nachgelagerte Statusfinalisierung.
// Wichtig: Dieses frühe Modul kennt weder den finalen Resolver-Sollwert noch
// Gate-, Write- oder Readback-Ergebnis. Deshalb darf es nicht mehr behaupten,
// der Speicher lade oder entlade bereits tatsächlich.
let intentStatusText = '';
let storageIntentStatus = 'inactive';
let storageIntentReason = 'Tarif und zeitvariables Netzentgelt sind aus';
const intentDirection = Number.isFinite(speicherSollW)
  ? (speicherSollW < 0 ? 'charge' : (speicherSollW > 0 ? 'discharge' : 'idle'))
  : 'idle';

if (aktivEff || netFeeActive) {
  const priceCurTxt = (preisAktuellOk && Number.isFinite(preisAktuell))
    ? `${preisAktuell.toFixed(3)} €/kWh`
    : '—';
  const tarifStateTxt = (tarifState === 'guenstig')
    ? 'günstig'
    : (tarifState === 'neutral'
      ? 'neutral'
      : (tarifState === 'teuer'
        ? 'teuer'
        : (tarifState === 'aus' ? 'aus' : 'unbekannt')));
  const modeTxt = (modusInt === 2) ? 'Automatik' : (modusInt === 1 ? 'Manuell' : '');
  const baseTarif = aktivEff
    ? (modeTxt
      ? `Tarif ${modeTxt} ${tarifStateTxt} (${priceCurTxt})`
      : `Tarif ${tarifStateTxt} (${priceCurTxt})`)
    : 'Tarif aus';
  const base = netFeeActive ? `Netzentgelt ${netFeeMode} | ${baseTarif}` : baseTarif;
  const parts = [];

  if (intentDirection === 'charge') {
    storageIntentStatus = 'charge';
    storageIntentReason = `Speicher-Netzladen freigegeben: ${String(storageGridChargePermission.reason || 'wirtschaftliches Ladefenster aktiv')}`;
    parts.push(`Tarifwunsch Speicher laden (${Math.abs(Math.round(speicherSollW))} W)`);
  } else if (intentDirection === 'discharge') {
    storageIntentStatus = 'discharge';
    storageIntentReason = (tarifState === 'teuer')
      ? 'Teurer Tarif – Speicherentladung gewünscht'
      : 'Tarif-/Netzentgelt-Policy fordert Entladen';
    parts.push(`Tarifwunsch Speicher entladen (${Math.abs(Math.round(speicherSollW))} W)`);
  } else {
    storageIntentStatus = 'wait';
    if (dynamicTariffStale && aktivEff && !netFeeActive) {
      storageIntentReason = 'Tarifdaten sind zu alt – keine neue Tarifaktion';
    } else if (!storageWriterAvailable) {
      storageIntentReason = String(storageAuthority.reason || 'Kein beschreibbarer Speicher-Ausgang');
    } else if (storageFullHold) {
      storageIntentReason = 'SoC-Ladeziel erreicht';
    } else if (storageChargeBlockedByTime) {
      storageIntentReason = storageGridChargeBlockReason || `Speicher-Netzladen gesperrt (${storageChargeWindowLabel})`;
    } else if (netFeeMode === 'HT') {
      storageIntentReason = 'HT – Eigenverbrauch und Entladung bleiben freigegeben';
    } else if (gridImportPreferred) {
      storageIntentReason = 'Negativpreis aktiv – Speicher wartet';
    } else {
      storageIntentReason = 'Tarif-/Netzentgelt-Policy fordert Warten';
    }
    parts.push(`Tarifwunsch Speicher warten (${storageIntentReason})`);
  }

  parts.push(gridChargeAllowed ? 'EVCS Netzladen freigegeben' : 'EVCS Netzladen gesperrt (PV möglich)');
  if (!dischargeAllowed) parts.push('Speicherentladung durch Tarif-Policy gesperrt');
  if (!storageWriterAvailable) parts.push(`kein beschreibbarer Speicher-Ausgang (${String(storageAuthority.reason || 'unbekannt')})`);
  intentStatusText = `${base}: ${parts.join(' + ')}`;
}

await this._setIfChanged('tarif.intentStatusText', intentStatusText);
await this._setIfChanged('tarif.speicherIntentW', Number.isFinite(speicherSollW) ? Math.round(speicherSollW) : 0);
await this._setIfChanged('tarif.speicherIntentStatus', storageIntentStatus);
await this._setIfChanged('tarif.speicherIntentGrund', storageIntentReason);
            await this._setIfChanged('tarif.ladeparkLimitW', limitW);

            // Für andere Module (synchron) bereithalten
            this.adapter._tarifVis = {
                ts: Date.now(),
                // "aktiv" bedeutet: dieses Modul liefert eine wirksame Policy (Tarif ODER Netzentgelt).
                // Der dynamische Tarif selbst kann separat über "tarifAktiv" geprüft werden.
                aktiv: !!(aktivEff || netFeeEff),
                tarifAktiv: aktivEff,
                modus: modusInt,
                prioritaet,
                state: tarifState,
                netFeeEnabled: netFeeEff,
                netFeeMode,
                deltaEur: delta,
                preisAktuell: preisAktuellOk ? preisAktuell : null,
                preisDurchschnitt: preisDurchschnittEffOk ? preisDurchschnittEff : null,
                preisMin: (typeof preisMin === 'number' && Number.isFinite(preisMin)) ? preisMin : null,
                preisSchwelleGuensig: (typeof preisSchwelleGuensig === 'number' && Number.isFinite(preisSchwelleGuensig)) ? preisSchwelleGuensig : null,
                nextCheapFromIso: nextCheapFromIso || null,
                nextCheapToIso: nextCheapToIso || null,
                negativeActive: !!negativeActive,
                negativeWindowNow: !!negativeWindowNow,
                gridImportPreferred: !!gridImportPreferred,
                netzbezugBevorzugt: !!gridImportPreferred,
                negativeCurrentPrice: (negativeActive && typeof negativeCurrentPrice === 'number' && Number.isFinite(negativeCurrentPrice)) ? negativeCurrentPrice : null,
                negativeMinPrice: (typeof negativeMinPrice === 'number' && Number.isFinite(negativeMinPrice)) ? negativeMinPrice : null,
                nextNegativeFromIso: nextNegativeFromIso || null,
                nextNegativeToIso: nextNegativeToIso || null,
                autoBandEur: (typeof autoBandEur === 'number' && Number.isFinite(autoBandEur)) ? autoBandEur : null,
                horizonHours: (typeof horizonHours === 'number' && Number.isFinite(horizonHours)) ? horizonHours : null,
                preisRef: (preisRef !== null && preisRef !== undefined && Number.isFinite(preisRef)) ? preisRef : null,
                // VIS-Konfiguration (für Auto-Enable anderer Module)
                speicherLeistungW: (typeof storageW === 'number' && Number.isFinite(storageW)) ? storageW : 0,
                speicherLeistungAbsW: (typeof storagePowerAbsW === 'number' && Number.isFinite(storagePowerAbsW)) ? storagePowerAbsW : 0,
                storageTopology,
                storageWriterAvailable,
                storageAuthorityReason: String(storageAuthority.reason || ''),
                currentPriceFresh: !!preisAktuellOk,
                currentPriceAgeMs: Number.isFinite(Number(effectiveCurrentPriceAgeMs)) ? Math.round(Number(effectiveCurrentPriceAgeMs)) : null,
                currentPriceSource: preisAktuellSource,
                curveFresh: !!curveFresh,
                curveAgeMs: Number.isFinite(Number(curveAgeMs)) ? Math.round(Number(curveAgeMs)) : null,
                priceDataStatus,
                dynamicTariffStale,
                speicherSollW,
                intentStatusText,
                storageIntentStatus,
                storageIntentReason,
                // SoC-aware charging (cheap window)
                storageSocPct,
                socStartChargePct,
                socStopChargePct,
                storageChargeWanted,
                storageFullHold,
                // Speicher-Netzladen: separater fail-closed Vertrag.
                storageChargeWindowOk: !!storageChargeWindowOk,
                storageChargeWindowLabel: String(storageChargeWindowLabel || ''),
                storageChargeBlockedByTime: !!storageChargeBlockedByTime,
                storageGridChargeConfigured: !!storageGridChargeConfigured,
                storageGridChargeAllowed: !!storageGridChargeAllowed,
                storageGridChargeBlockReason: String(storageGridChargeBlockReason || ''),
                storageGridChargeSource: String(storageGridChargePermission.source || 'blocked'),
                storageTariffCheap: !!(aktivEff && preisAktuellOk && tarifState === 'guenstig'),
                storageManualWindowActive: !!storageChargeWindowOk,
                storageManualWindowLabel: String(storageChargeWindowLabel || ''),
                gridChargeAllowed,
                dischargeAllowed,
                ladeparkLimitW: limitW,
            };
        } catch (e) {
            const msg = (e && e.message) ? e.message : String(e);
            this.adapter.log.warn(`[TarifVis] Fehler in tick(): ${msg}`);
        }
    }

    /**
     * Code-Teil: Methode `_setIfChanged`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: _setIfChanged
     * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    async _setIfChanged(id, val) {
        const v = (val === undefined) ? null : val;
        try {
            const cur = await this.adapter.getStateAsync(id);
            const curVal = cur ? cur.val : null;
            if (cur && curVal === v) return;
            await this.adapter.setStateAsync(id, v, true);
        } catch {
            // ignore
        }
    }
}

module.exports = {
    TarifVisModule,
    resolveStorageGridChargePermission,
    formatStorageNtWindowLabel,
};
