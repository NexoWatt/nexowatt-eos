// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet Speicher-Konfiguration und Messdatenpunkte mit den normierten Werten für die anschließende Speicherregelung.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/storage-mapping.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Kanonische Runtime-Quelle für das herstellerunabhängige Speicher-Mapping.
 * Registriert ausschließlich Mess- und Steuer-DPs; aktive Regelentscheidungen
 * bleiben in storage-control. Explizite AppCenter-Overrides haben Vorrang vor
 * Speicherfarm- und Bilanz-Fallbacks.
 */

'use strict';

const { BaseModule } = require('./base');
const {
    normalizeStorageDatapointsConfig,
    buildStorageMeasurementFallbackFromGlobal,
    mergeStorageMeasurementFallback,
} = require('../services/storage-datapoint-config');

/**
 * Speicher-Datenpunkt-Zuordnung (Installateur)
 * - liest die Konfiguration (storage.*)
 * - legt Diagnose-Zustände im Adapter an
 * - registriert die gemappten Datenpunkte in der internen Datenpunkt-Registry (st.*)
 *
 * Hinweis: Diese Stufe macht noch keine aktive Speicher-Regelung.
 * Sie stellt nur sicher, dass die Zuordnung sauber vorhanden ist und später
 * herstellerunabhängig genutzt werden kann.
 */
class SpeicherMappingModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);

        /** @type {string} */
        this._lastMissing = '';
        /** @type {boolean} */
        this._lastOk = false;
    }

    async init() {
        await this._ensureStates();
        await this._upsertFromConfig();
    }
    async tick() {
        // Nur Diagnose: Einzel-Mapping ist genau dann der aktive Ausgang, wenn
        // die zentrale Speicher-Steuerhoheit `single` ausgewaehlt hat. Die DPs
        // bleiben trotzdem registriert, damit ein spaeterer Topologiewechsel ohne
        // Verlust der manuellen AppCenter-Zuordnung moeglich ist.
        const authority = (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function')
            ? this.adapter._nwGetStorageControlAuthority()
            : { selectedTopology: this.adapter.config.enableStorageControl === true ? 'single' : 'none' };
        const enabled = String(authority.selectedTopology || 'none') === 'single';

        await this._setIfChanged('speicher.mapping.aktiv', enabled);

        if (!this.dp) return;

        const soc = this.dp.getNumber('st.socPct', null);
        const socAge = this.dp.getAgeMs('st.socPct');

        if (typeof soc === 'number') {
            await this._setIfChanged('speicher.socPct', soc);
        }
        if (typeof socAge === 'number') {
            await this._setIfChanged('speicher.socAlterMs', Math.round(socAge));
        }

        // Einzel-DC-/Hybrid-Speicher: PV-Erzeugungswert separat spiegeln, damit
        // Diagnose und 0-Einspeise-/FENECON-Erkennung nicht den Batterie-Sollwert
        // oder den gemischten AC-Ausgang als PV-Quelle missverstehen.
        // Wichtig: Der Wert wird nur bei aktivem DC-/Hybrid-Typ und gemapptem DP genutzt;
        // alte Mapping-Reste aus AC-Konfigurationen werden bewusst auf 0 gespiegelt.
        const cfg = this._getCfg();
        const dcPvMapped = cfg.coupling === 'dc' && !!String(cfg.dp && cfg.dp.dcPvPowerObjectId || '').trim();
        const dcPvW = dcPvMapped ? this.dp.getNumber('st.dcPvPowerW', null) : null;
        if (typeof dcPvW === 'number' && Number.isFinite(dcPvW)) {
            await this._setIfChanged('speicher.dcPvPowerW', Math.round(dcPvW));
        } else {
            await this._setIfChanged('speicher.dcPvPowerW', 0);
        }
    }

    async _ensureStates() {
        const base = 'speicher';
        const defs = [
            { id: `${base}.mapping.aktiv`, name: 'Speicher-Zuordnung aktiv', type: 'boolean', role: 'indicator', def: false },
            { id: `${base}.mapping.modus`, name: 'Speicher Steuerungsart', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.kopplung`, name: 'Speicher-Kopplung AC/DC', type: 'string', role: 'text', def: 'ac' },
            { id: `${base}.mapping.herstellerprofil`, name: 'Speicher-Herstellerprofil', type: 'string', role: 'text', def: 'generic' },
            { id: `${base}.mapping.feneconRegelart`, name: 'FENECON Hybrid Regelart', type: 'string', role: 'text', def: 'auto' },
            { id: `${base}.mapping.ok`, name: 'Speicher-Zuordnung vollständig', type: 'boolean', role: 'indicator', def: false },
            { id: `${base}.mapping.fehlt`, name: 'Fehlende Datenpunkte (Liste)', type: 'string', role: 'text', def: '' },

            { id: `${base}.mapping.socId`, name: 'SoC Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.istLeistungId`, name: 'Ist-Leistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.istLadeId`, name: 'Ist-Leistung Laden Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.istEntladeId`, name: 'Ist-Leistung Entladen Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.istLeistungQuelle`, name: 'Aufgelöste Ist-Leistungsquelle', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.dcPvId`, name: 'DC-/Hybrid-PV Leistungs-Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.sollLeistungId`, name: 'Sollleistung signed Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.sollLadeId`, name: 'Sollwert Laden Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.sollEntladeId`, name: 'Sollwert Entladen Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.runId`, name: 'Run/Externe Regelung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.maxLadeId`, name: 'Max Ladeleistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.maxEntladeId`, name: 'Max Entladeleistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.ladenErlaubtId`, name: 'Laden erlaubt Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.entladenErlaubtId`, name: 'Entladen erlaubt Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.reserveSocId`, name: 'Reserve-SoC Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconGridSetpointId`, name: 'FENECON FEMS NVP-Ziel Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconEssActualPowerId`, name: 'FENECON ESS Aktor-Istleistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconNvpPowerId`, name: 'FENECON NVP-Istleistung Shadow Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconConsumptionTotalId`, name: 'FENECON Gesamtverbrauch Shadow Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconMinPowerId`, name: 'FENECON minimale ESS-Leistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconMaxPowerId`, name: 'FENECON maximale ESS-Leistung Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconActualSetpointId`, name: 'FENECON Vorgabe-Readback Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconPvDcId`, name: 'FENECON interne DC-PV Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconPvAcId`, name: 'FENECON externe AC-PV Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.feneconPvTotalId`, name: 'FENECON gesamte PV Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.e3dcSetPowerModeId`, name: 'E3/DC EMS.SET_POWER_MODE Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.e3dcSetPowerValueId`, name: 'E3/DC EMS.SET_POWER_VALUE Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.e3dcPowerLimitsUsedId`, name: 'E3/DC EMS.POWER_LIMITS_USED Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.e3dcMaxChargePowerId`, name: 'E3/DC EMS.MAX_CHARGE_POWER Datenpunkt-ID', type: 'string', role: 'text', def: '' },
            { id: `${base}.mapping.e3dcMaxDischargePowerId`, name: 'E3/DC EMS.MAX_DISCHARGE_POWER Datenpunkt-ID', type: 'string', role: 'text', def: '' },

            { id: `${base}.socPct`, name: 'Speicher Ladezustand (SoC)', type: 'number', role: 'value.battery', def: 0 },
            { id: `${base}.dcPvPowerW`, name: 'DC-/Hybrid-PV Erzeugungsleistung', type: 'number', role: 'value.power', def: 0 },
            { id: `${base}.socAlterMs`, name: 'SoC Alter (ms)', type: 'number', role: 'value.interval', def: 0 },
        ];

        for (const d of defs) {
            await this.adapter.extendObjectAsync(d.id, {
                type: 'state',
                common: {
                    name: d.name,
                    type: d.type,
                    role: d.role,
                    read: true,
                    write: false,
                    def: d.def,
                },
                native: {},
            });

            // Default nur setzen, wenn noch kein State vorhanden ist
            try {
                const cur = await this.adapter.getStateAsync(d.id);
                if (!cur) {
                    await this.adapter.setStateAsync(d.id, d.def, true);
                }
            } catch {
                // ignore
            }
        }
    }

    _getCfg() {
        const storage = (this.adapter.config && this.adapter.config.storage) ? this.adapter.config.storage : {};
        const controlMode = (storage && typeof storage.controlMode === 'string') ? storage.controlMode : 'targetPower';
        const couplingRaw = (storage && typeof storage.coupling === 'string') ? storage.coupling.trim().toLowerCase() : 'ac';
        const coupling = couplingRaw === 'dc' ? 'dc' : 'ac';
        const normalizeVendorProfile = (value) => {
            const raw = String(value || '').trim().toLowerCase();
            if (raw === 'fenecon' || raw === 'openems' || raw === 'fems' || raw === 'fenecon-openems') return 'fenecon-openems';
            if (raw === 'sungrow' || raw === 'sungrow-ess' || raw === 'sungrow-hybrid') return 'sungrow-hybrid';
            if (raw === 'e3dc' || raw === 'e3/dc' || raw === 'e3dc-rscp' || raw === 'e3dc-rscp-iobroker') return 'e3dc-rscp';
            if (!raw && storage && storage.e3dcRscpEnabled === true) return 'e3dc-rscp';
            return 'generic';
        };
        const vendorProfile = normalizeVendorProfile(storage.vendorProfile);
        // Dauerhafte Speicherzuordnung und globales Energiefluss-Mapping bleiben
        // strikt getrennt. Die globale Messquelle wird nur über den privaten,
        // nicht persistierbaren Runtime-Fallback ergänzt.
        const localDp = normalizeStorageDatapointsConfig(storage);
        const runtimeFallback = (this.adapter && this.adapter._nwStorageMeasurementFallback
            && typeof this.adapter._nwStorageMeasurementFallback === 'object')
            ? this.adapter._nwStorageMeasurementFallback
            : buildStorageMeasurementFallbackFromGlobal(this.adapter && this.adapter.config ? this.adapter.config : {});
        const dp = mergeStorageMeasurementFallback({ ...storage, datapoints: localDp }, runtimeFallback);
        const boolValue = (value, fallback = false) => {
            if (typeof value === 'boolean') return value;
            const normalized = String(value === undefined || value === null ? '' : value).trim().toLowerCase();
            if (value === 1 || normalized === '1' || normalized === 'true') return true;
            if (value === 0 || normalized === '0' || normalized === 'false') return false;
            return fallback;
        };
        const inherit = (canonical, aliases = []) => {
            if (dp[canonical] !== undefined && dp[canonical] !== null && dp[canonical] !== '') return;
            for (const key of [canonical, ...aliases]) {
                if (storage[key] !== undefined && storage[key] !== null && storage[key] !== '') {
                    dp[canonical] = storage[key];
                    return;
                }
            }
        };

        for (const [canonical, aliases] of [
            ['socScale', []],
            ['batteryPowerScale', ['powerScale']], ['batteryPowerInvert', ['invertSignedPowerSign']],
            ['batteryChargePowerScale', ['chargePowerScale']], ['batteryDischargePowerScale', ['dischargePowerScale']],
            ['batteryFeedbackSource', []],
            ['dcPvPowerScale', ['pvPowerScale']], ['dcPvPowerInvert', ['pvPowerInvert']],
            ['targetPowerScale', ['setSignedPowerScale']], ['targetPowerInvert', ['invertSetSignedPowerSign']],
            ['targetChargePowerScale', ['setChargePowerScale']], ['targetChargePowerInvert', ['invertSetChargePowerSign']],
            ['targetDischargePowerScale', ['setDischargePowerScale']], ['targetDischargePowerInvert', ['invertSetDischargePowerSign']],
            ['runInvert', []],
        ]) inherit(canonical, aliases);
        for (const key of [
            'batteryPowerInvert', 'dcPvPowerInvert', 'targetPowerInvert',
            'targetChargePowerInvert', 'targetDischargePowerInvert', 'runInvert',
        ]) {
            dp[key] = boolValue(dp[key], false);
        }

        const feneconGridControlEnabled = storage.feneconGridControlEnabled;
        const feneconAcMode = storage.feneconAcMode;
        let farmEnabled = false;
        try {
            if (this.adapter && typeof this.adapter._nwGetStorageControlAuthority === 'function') {
                const authority = this.adapter._nwGetStorageControlAuthority();
                farmEnabled = String(authority && authority.selectedTopology || 'none') === 'farm';
            } else if (this.adapter && typeof this.adapter._nwGetStorageFarmRuntimeInfo === 'function') {
                const farmInfo = this.adapter._nwGetStorageFarmRuntimeInfo();
                // Alt-Runtime-Fallback: Nur eine tatsächlich beschreibbare Farm ersetzt
                // den Einzel-Speicher-Zielpfad. Reine Mess-/Status-Farmen nicht.
                farmEnabled = (farmInfo && typeof farmInfo.dispatchActive === 'boolean')
                    ? farmInfo.dispatchActive
                    : false;
            } else {
                farmEnabled = !!(this.adapter && this.adapter.config && this.adapter.config.enableStorageFarm);
            }
        } catch {
            // Legacy-Fallback bleibt erhalten.
        }
        return { controlMode, coupling, vendorProfile, dp, feneconControlMode: String(storage.feneconControlMode || 'auto'), feneconGridControlEnabled, feneconAcMode, farmEnabled };
    }

    async _upsertFromConfig() {
        if (!this.dp) return;

        const { controlMode, coupling, vendorProfile, dp, feneconControlMode, feneconGridControlEnabled, feneconAcMode, farmEnabled } = this._getCfg();

        const socId = String(dp.socObjectId || '').trim();
        const socScale = Number.isFinite(Number(dp.socScale)) ? Number(dp.socScale) : 1;

        const istId = String(dp.batteryPowerObjectId || '').trim();
        const istScale = Number.isFinite(Number(dp.batteryPowerScale)) ? Number(dp.batteryPowerScale) : 1;
        const istInv = !!dp.batteryPowerInvert;
        const istChargeId = String(dp.batteryChargePowerObjectId || '').trim();
        const istChargeScale = Number.isFinite(Number(dp.batteryChargePowerScale)) ? Number(dp.batteryChargePowerScale) : 1;
        const istDischargeId = String(dp.batteryDischargePowerObjectId || '').trim();
        const istDischargeScale = Number.isFinite(Number(dp.batteryDischargePowerScale)) ? Number(dp.batteryDischargePowerScale) : 1;
        const istFeedbackSource = String(dp.batteryFeedbackSource || (istId ? 'storage-tab-signed' : ((istChargeId || istDischargeId) ? 'storage-tab-split' : ''))).trim();

        // Optionaler DC-/Hybrid-PV-Messwert fuer Einzel-Speicher.
        // Dieser Wert ist bewusst ein Eingang (PV-Erzeugung), kein Speicher-Sollwert.
        // Er hilft der 0-Einspeise- und FENECON-/OpenEMS-Erkennung, wenn PV und Batterie
        // am gleichen Hybrid-/Gateway-Ausgang zusammenfallen.
        const dcPvId = String(dp.dcPvPowerObjectId || '').trim();
        const dcPvScale = Number.isFinite(Number(dp.dcPvPowerScale)) ? Number(dp.dcPvPowerScale) : 1;
        const dcPvInv = !!dp.dcPvPowerInvert;

        const sollId = String(dp.targetPowerObjectId || '').trim();
        const sollScale = Number.isFinite(Number(dp.targetPowerScale)) ? Number(dp.targetPowerScale) : 1;
        const sollInv = !!dp.targetPowerInvert;

        // Hersteller-offene Einzel-Speicherregelung:
        // Einige Systeme (z. B. Split-Sollwertsysteme über nexowatt-devices) nutzen keine signed
        // Sollleistung, sondern getrennte positive Vorgaben für Laden und Entladen.
        // Diese DPs werden als alternative Zielpfade zum allgemeinen signed targetPower
        // registriert. storage-control beruecksichtigt jeden Split-DP einzeln: sind
        // beide vorhanden, werden beide sauber gegeneinander verriegelt; ist nur eine
        // Richtung vorhanden, bleibt diese nutzbar und die fehlende Richtung kann bei
        // Bedarf ueber den signed-DP als Fallback laufen.
        const sollChargeId = String(dp.targetChargePowerObjectId || '').trim();
        const sollChargeScale = Number.isFinite(Number(dp.targetChargePowerScale)) ? Number(dp.targetChargePowerScale) : 1;
        const sollChargeInv = !!dp.targetChargePowerInvert;
        const sollDischargeId = String(dp.targetDischargePowerObjectId || '').trim();
        const sollDischargeScale = Number.isFinite(Number(dp.targetDischargePowerScale)) ? Number(dp.targetDischargePowerScale) : 1;
        const sollDischargeInv = !!dp.targetDischargePowerInvert;
        const runId = String(dp.runObjectId || '').trim();
        const runInv = !!dp.runInvert;

        const maxChargeId = String(dp.maxChargeObjectId || '').trim();
        const maxDischargeId = String(dp.maxDischargeObjectId || '').trim();
        const chargeEnId = String(dp.chargeEnableObjectId || '').trim();
        const dischargeEnId = String(dp.dischargeEnableObjectId || '').trim();
        const reserveSocId = String(dp.reserveSocObjectId || '').trim();
        // FENECON Hybrid/OpenEMS: Native FEMS-Netzpunktführung ist nur bei
        // explizitem DC-/Hybrid-Profil zulässig. Die DPs bleiben getrennte Rollen:
        // GridTarget = Steuerung des FEMS-Balancing-Controllers,
        // ESS actual/min/max/readback = Aktorfeedback und Grenzen,
        // PV DC/AC/Total = ausschließlich Anzeige/Plausibilisierung.
        const feneconGridSetpointId = String(dp.feneconGridSetpointObjectId || '').trim();
        const feneconEssActualPowerId = String(dp.feneconEssActualPowerObjectId || '').trim();
        const feneconNvpPowerId = String(dp.feneconNvpPowerObjectId || '').trim();
        const feneconConsumptionTotalId = String(dp.feneconConsumptionTotalObjectId || '').trim();
        const feneconMinPowerId = String(dp.feneconMinPowerObjectId || '').trim();
        const feneconMaxPowerId = String(dp.feneconMaxPowerObjectId || '').trim();
        const feneconActualSetpointId = String(dp.feneconActualSetpointObjectId || '').trim();
        const feneconPvDcId = String(dp.feneconPvDcObjectId || '').trim();
        const feneconPvAcId = String(dp.feneconPvAcObjectId || '').trim();
        const feneconPvTotalId = String(dp.feneconPvTotalObjectId || '').trim();

        // E3/DC RSCP / ioBroker.e3dc-rscp: Dieser Adapter steuert aktive
        // Batterie-Vorgaben nicht ueber einen signed Leistungs-DP, sondern ueber
        // das gekoppelte Tupel EMS.SET_POWER_MODE + EMS.SET_POWER_VALUE.
        // Optional koennen PowerLimits mitgefuehrt werden, wenn die Anlage diese
        // Grenzen ebenfalls ueber den RSCP-Adapter setzen soll.
        const e3dcSetPowerModeId = String(dp.e3dcSetPowerModeObjectId || '').trim();
        const e3dcSetPowerValueId = String(dp.e3dcSetPowerValueObjectId || '').trim();
        const e3dcPowerLimitsUsedId = String(dp.e3dcPowerLimitsUsedObjectId || '').trim();
        const e3dcMaxChargePowerId = String(dp.e3dcMaxChargePowerObjectId || '').trim();
        const e3dcMaxDischargePowerId = String(dp.e3dcMaxDischargePowerObjectId || '').trim();

        // Diagnose schreiben
        await this._setIfChanged('speicher.mapping.modus', String(controlMode || ''));
        await this._setIfChanged('speicher.mapping.kopplung', String(coupling || 'ac'));
        await this._setIfChanged('speicher.mapping.herstellerprofil', String(vendorProfile || 'generic'));
        await this._setIfChanged('speicher.mapping.feneconRegelart', String(feneconControlMode || 'auto'));
        await this._setIfChanged('speicher.mapping.socId', socId);
        await this._setIfChanged('speicher.mapping.istLeistungId', istId);
        await this._setIfChanged('speicher.mapping.istLadeId', istChargeId);
        await this._setIfChanged('speicher.mapping.istEntladeId', istDischargeId);
        await this._setIfChanged('speicher.mapping.istLeistungQuelle', istFeedbackSource);
        await this._setIfChanged('speicher.mapping.dcPvId', dcPvId);
        await this._setIfChanged('speicher.mapping.sollLeistungId', sollId);
        await this._setIfChanged('speicher.mapping.sollLadeId', sollChargeId);
        await this._setIfChanged('speicher.mapping.sollEntladeId', sollDischargeId);
        await this._setIfChanged('speicher.mapping.runId', runId);
        await this._setIfChanged('speicher.mapping.maxLadeId', maxChargeId);
        await this._setIfChanged('speicher.mapping.maxEntladeId', maxDischargeId);
        await this._setIfChanged('speicher.mapping.ladenErlaubtId', chargeEnId);
        await this._setIfChanged('speicher.mapping.entladenErlaubtId', dischargeEnId);
        await this._setIfChanged('speicher.mapping.reserveSocId', reserveSocId);
        await this._setIfChanged('speicher.mapping.feneconGridSetpointId', feneconGridSetpointId);
        await this._setIfChanged('speicher.mapping.feneconEssActualPowerId', feneconEssActualPowerId);
        await this._setIfChanged('speicher.mapping.feneconNvpPowerId', feneconNvpPowerId);
        await this._setIfChanged('speicher.mapping.feneconConsumptionTotalId', feneconConsumptionTotalId);
        await this._setIfChanged('speicher.mapping.feneconMinPowerId', feneconMinPowerId);
        await this._setIfChanged('speicher.mapping.feneconMaxPowerId', feneconMaxPowerId);
        await this._setIfChanged('speicher.mapping.feneconActualSetpointId', feneconActualSetpointId);
        await this._setIfChanged('speicher.mapping.feneconPvDcId', feneconPvDcId);
        await this._setIfChanged('speicher.mapping.feneconPvAcId', feneconPvAcId);
        await this._setIfChanged('speicher.mapping.feneconPvTotalId', feneconPvTotalId);
        await this._setIfChanged('speicher.mapping.e3dcSetPowerModeId', e3dcSetPowerModeId);
        await this._setIfChanged('speicher.mapping.e3dcSetPowerValueId', e3dcSetPowerValueId);
        await this._setIfChanged('speicher.mapping.e3dcPowerLimitsUsedId', e3dcPowerLimitsUsedId);
        await this._setIfChanged('speicher.mapping.e3dcMaxChargePowerId', e3dcMaxChargePowerId);
        await this._setIfChanged('speicher.mapping.e3dcMaxDischargePowerId', e3dcMaxDischargePowerId);

        // Datenpunkte registrieren (st.*)
        if (socId) {
            await this.dp.upsert({
                key: 'st.socPct',
                name: 'Speicher SoC',
                objectId: socId,
                dataType: 'number',
                direction: 'in',
                unit: '%',
                scale: socScale,
                offset: 0,
                invert: false,
                deadband: 0,
                min: 0,
                max: 100,
                note: 'Speicher Ladezustand'
            });
        }

        if (istId) {
            await this.dp.upsert({
                key: 'st.batteryPowerW',
                name: 'Speicher Ist-Leistung',
                objectId: istId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                scale: istScale,
                offset: 0,
                invert: istInv,
                deadband: 0,
                note: 'Optional'
            });
        }

        // Getrennte positive Istwerte werden intern erst in storage-control zu
        // einer signed Leistung zusammengeführt: +W Entladen, -W Laden.
        if (istChargeId) {
            await this.dp.upsert({
                key: 'st.batteryChargePowerW',
                name: 'Speicher Ist-Leistung Laden',
                objectId: istChargeId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                scale: istChargeScale,
                offset: 0,
                invert: false,
                deadband: 0,
                note: 'Positive Ladeleistung; AppCenter-Override oder Einzel-Speicher-Mapping'
            });
        }

        if (istDischargeId) {
            await this.dp.upsert({
                key: 'st.batteryDischargePowerW',
                name: 'Speicher Ist-Leistung Entladen',
                objectId: istDischargeId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                scale: istDischargeScale,
                offset: 0,
                invert: false,
                deadband: 0,
                note: 'Positive Entladeleistung; AppCenter-Override oder Einzel-Speicher-Mapping'
            });
        }

        if (coupling === 'dc' && dcPvId) {
            await this.dp.upsert({
                key: 'st.dcPvPowerW',
                name: 'DC-/Hybrid-PV Erzeugung',
                objectId: dcPvId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                scale: dcPvScale,
                offset: 0,
                invert: dcPvInv,
                deadband: 0,
                note: 'Optional; Einzel-DC-/Hybrid-Speicher, Erzeugungsleistung des PV-/Hybrid-Wechselrichters'
            });
        }

        if (sollId) {
            await this.dp.upsert({
                key: 'st.targetPowerW',
                name: 'Speicher Sollleistung signed',
                objectId: sollId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                scale: sollScale,
                offset: 0,
                invert: sollInv,
                deadband: 0,
                note: 'Schreiben; NexoWatt-Konvention +W=Entladen, -W=Laden'
            });
        }

        if (sollChargeId) {
            await this.dp.upsert({
                key: 'st.targetChargePowerW',
                name: 'Speicher Sollwert Laden',
                objectId: sollChargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                scale: sollChargeScale,
                offset: 0,
                invert: sollChargeInv,
                deadband: 0,
                min: 0,
                note: 'Schreiben; getrennte positive Ladeleistung'
            });
        }

        if (sollDischargeId) {
            await this.dp.upsert({
                key: 'st.targetDischargePowerW',
                name: 'Speicher Sollwert Entladen',
                objectId: sollDischargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                scale: sollDischargeScale,
                offset: 0,
                invert: sollDischargeInv,
                deadband: 0,
                min: 0,
                note: 'Schreiben; getrennte positive Entladeleistung'
            });
        }

        if (runId) {
            await this.dp.upsert({
                key: 'st.run',
                name: 'Speicher Run / externe Regelung',
                objectId: runId,
                dataType: 'boolean',
                direction: 'out',
                invert: runInv,
                maxWriteIntervalMs: 900,
                note: 'Optional; true bei aktiver NexoWatt-Sollwertvorgabe, false bei 0 W; sekündlicher Watchdog-Refresh'
            });
        }

        if (maxChargeId) {
            await this.dp.upsert({
                key: 'st.maxChargeW',
                name: 'Max Ladeleistung',
                objectId: maxChargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                note: 'Schreiben'
            });
        }

        if (maxDischargeId) {
            await this.dp.upsert({
                key: 'st.maxDischargeW',
                name: 'Max Entladeleistung',
                objectId: maxDischargeId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                note: 'Schreiben'
            });
        }

        if (chargeEnId) {
            await this.dp.upsert({
                key: 'st.chargeEnable',
                name: 'Laden erlaubt',
                objectId: chargeEnId,
                dataType: 'boolean',
                direction: 'out',
                maxWriteIntervalMs: 900,
                note: 'Schreiben; sekündlicher Watchdog-Refresh'
            });
        }

        if (dischargeEnId) {
            await this.dp.upsert({
                key: 'st.dischargeEnable',
                name: 'Entladen erlaubt',
                objectId: dischargeEnId,
                dataType: 'boolean',
                direction: 'out',
                maxWriteIntervalMs: 900,
                note: 'Schreiben; sekündlicher Watchdog-Refresh'
            });
        }

        if (feneconGridSetpointId) {
            await this.dp.upsert({
                key: 'st.feneconGridSetpointW',
                name: 'FENECON FEMS NVP-Ziel',
                objectId: feneconGridSetpointId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                maxWriteIntervalMs: 30000,
                note: 'Nur FENECON Hybrid/OpenEMS: ctrlBalancing0/SetGridActivePower; +W Bezug, -W Einspeisung'
            });
        }
        if (feneconEssActualPowerId) {
            await this.dp.upsert({
                key: 'st.feneconEssActualPowerW',
                name: 'FENECON ESS Aktor-Istleistung',
                objectId: feneconEssActualPowerId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                note: 'Typisch ess0/ActivePower (604); +W Entladen, -W Laden'
            });
        }
        if (feneconNvpPowerId) {
            await this.dp.upsert({
                key: 'st.feneconNvpPowerW',
                name: 'FENECON NVP-Istleistung (Shadow)',
                objectId: feneconNvpPowerId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                note: 'Nur RC42-Shadow/Plausibilisierung; +W Bezug, -W Einspeisung; niemals Schreibziel oder Safety-Ersatz'
            });
        }
        if (feneconConsumptionTotalId) {
            await this.dp.upsert({
                key: 'st.feneconConsumptionTotalW',
                name: 'FENECON Gesamtverbrauch (Shadow)',
                objectId: feneconConsumptionTotalId,
                dataType: 'number',
                direction: 'in',
                unit: 'W',
                note: 'Nur RC42-Shadow/Plausibilisierung; direkter Gesamt-/Hausverbrauch ohne abgeleitete Regelkreis-Rueckkopplung'
            });
        }
        if (feneconMinPowerId) {
            await this.dp.upsert({ key: 'st.feneconMinPowerW', name: 'FENECON minimale ESS-Leistung', objectId: feneconMinPowerId, dataType: 'number', direction: 'in', unit: 'W', note: 'Typisch 702' });
        }
        if (feneconMaxPowerId) {
            await this.dp.upsert({ key: 'st.feneconMaxPowerW', name: 'FENECON maximale ESS-Leistung', objectId: feneconMaxPowerId, dataType: 'number', direction: 'in', unit: 'W', note: 'Typisch 704' });
        }
        if (feneconActualSetpointId) {
            await this.dp.upsert({ key: 'st.feneconActualSetpointW', name: 'FENECON tatsächliche externe Vorgabe', objectId: feneconActualSetpointId, dataType: 'number', direction: 'in', unit: 'W', note: 'Optionales Readback von SetActivePowerEquals' });
        }
        if (feneconPvDcId) {
            await this.dp.upsert({ key: 'st.feneconPvDcPowerW', name: 'FENECON interne DC-PV', objectId: feneconPvDcId, dataType: 'number', direction: 'in', unit: 'W', note: 'Typisch ProductionDcActualPower (339)' });
        }
        if (feneconPvAcId) {
            await this.dp.upsert({ key: 'st.feneconPvAcPowerW', name: 'FENECON externe AC-PV', objectId: feneconPvAcId, dataType: 'number', direction: 'in', unit: 'W', note: 'Typisch ProductionAcActivePower (331)' });
        }
        if (feneconPvTotalId) {
            await this.dp.upsert({ key: 'st.feneconPvTotalPowerW', name: 'FENECON gesamte PV-Erzeugung', objectId: feneconPvTotalId, dataType: 'number', direction: 'in', unit: 'W', note: 'Typisch ProductionActivePower (327); nur Anzeige/Plausibilisierung' });
        }

        if (e3dcSetPowerModeId) {
            await this.dp.upsert({
                key: 'st.e3dcSetPowerMode',
                name: 'E3/DC EMS.SET_POWER_MODE',
                objectId: e3dcSetPowerModeId,
                dataType: 'number',
                direction: 'out',
                unit: '',
                min: 0,
                max: 4,
                note: 'E3/DC RSCP Connector; 0=NORMAL, 1=IDLE, 2=DISCHARGE, 3=CHARGE, 4=GRID_CHARGE'
            });
        }

        if (e3dcSetPowerValueId) {
            await this.dp.upsert({
                key: 'st.e3dcSetPowerValueW',
                name: 'E3/DC EMS.SET_POWER_VALUE',
                objectId: e3dcSetPowerValueId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                min: 0,
                note: 'E3/DC RSCP Connector; positive Absolutleistung passend zum SET_POWER_MODE'
            });
        }

        if (e3dcPowerLimitsUsedId) {
            await this.dp.upsert({
                key: 'st.e3dcPowerLimitsUsed',
                name: 'E3/DC EMS.POWER_LIMITS_USED',
                objectId: e3dcPowerLimitsUsedId,
                dataType: 'boolean',
                direction: 'out',
                note: 'Optional; aktiviert RSCP PowerLimits, wenn im Herstellerprofil freigegeben'
            });
        }

        if (e3dcMaxChargePowerId) {
            await this.dp.upsert({
                key: 'st.e3dcMaxChargePowerW',
                name: 'E3/DC EMS.MAX_CHARGE_POWER',
                objectId: e3dcMaxChargePowerId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                min: 0,
                note: 'Optional; Ladeleistungsgrenze fuer E3/DC RSCP'
            });
        }

        if (e3dcMaxDischargePowerId) {
            await this.dp.upsert({
                key: 'st.e3dcMaxDischargePowerW',
                name: 'E3/DC EMS.MAX_DISCHARGE_POWER',
                objectId: e3dcMaxDischargePowerId,
                dataType: 'number',
                direction: 'out',
                unit: 'W',
                min: 0,
                note: 'Optional; Entladeleistungsgrenze fuer E3/DC RSCP'
            });
        }

        if (reserveSocId) {
            await this.dp.upsert({
                key: 'st.reserveSocPct',
                name: 'Reserve-SoC',
                objectId: reserveSocId,
                dataType: 'number',
                direction: 'out',
                unit: '%',
                min: 0,
                max: 100,
                note: 'Optional'
            });
        }

        // Prüfen, ob Zuordnung je Modus vollständig ist
        const missing = [];
        if (!socId) missing.push('SoC');

        const feneconHybridConfiguredRaw = (typeof feneconGridControlEnabled === 'boolean') ? (feneconGridControlEnabled === true) : (feneconAcMode === true);
        const feneconHybridConfigured = !!(feneconHybridConfiguredRaw && !farmEnabled);
        if (feneconHybridConfigured || String(controlMode) === 'targetPower') {
            // Für targetPower reicht entweder ein allgemeiner signed Sollleistungs-DP,
            // ein Split-Zielpfad oder beim E3/DC-RSCP-Profil das Tupel aus
            // EMS.SET_POWER_MODE + EMS.SET_POWER_VALUE. Split-Zielpfade duerfen auch
            // einzeln vorhanden sein; storage-control sperrt die nicht gemappte Richtung
            // oder nutzt signed als Fallback, falls vorhanden.
            const hasSignedTarget = !!sollId;
            const hasSplitTarget = !!(sollChargeId || sollDischargeId);
            const hasE3dcTarget = !!(e3dcSetPowerModeId && e3dcSetPowerValueId);
            if (vendorProfile === 'e3dc-rscp') {
                if (!hasE3dcTarget && !hasSignedTarget && !hasSplitTarget) {
                    missing.push('E3/DC EMS.SET_POWER_MODE + EMS.SET_POWER_VALUE oder normaler Sollwert');
                }
            } else if (!hasSignedTarget && !hasSplitTarget) {
                missing.push('Sollleistung signed oder Sollwert Laden/Entladen');
            }
        } else if (String(controlMode) === 'limits') {
            // Ein einzelner Richtungs-DP ist eine gültige, bewusst einseitige
            // Zuordnung. Die nicht gemappte Richtung wird im Regler sicher gesperrt.
            if (!maxChargeId && !maxDischargeId) missing.push('Max Ladeleistung und/oder Max Entladeleistung (W)');
        } else if (String(controlMode) === 'enableFlags') {
            if (!chargeEnId && !dischargeEnId) missing.push('Laden erlaubt und/oder Entladen erlaubt');
        }

        const ok = missing.length === 0;
        const missingStr = missing.join(', ');

        if (missingStr !== this._lastMissing) {
            this._lastMissing = missingStr;
            await this._setIfChanged('speicher.mapping.fehlt', missingStr);
        }
        if (ok !== this._lastOk) {
            this._lastOk = ok;
            await this._setIfChanged('speicher.mapping.ok', ok);
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
        } catch (e) {
            try {
                this.adapter.log.debug(`speicher: setState ${id} Fehler: ${e?.message || e}`);
            } catch {
                // ignore
            }
        }
    }
}

module.exports = { SpeicherMappingModule };
