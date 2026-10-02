'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/charging-management/charging-phase-selection.ts
 * Quell-Hash: sha256:7b3ba4d3e5bb7c21d4773c64e844f78e49c0c0fb234f6923259dc1f7ad40a7d5
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * EVCS-AC-Phasenwahl 1p/3p für PV-Überschussladen mit Hysterese und Cooldown.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-
 * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/ vornehmen.
 * 2. npm run sync:ts-ems-mirrors ausführen.
 * 3. npm run test:ems-mirrors prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Berechnet die gewünschte Phasenzahl und erforderliche Wechselbedingungen für dafür freigegebene AC-Ladepunkte.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/charging-management/charging-phase-selection.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/ems/charging-management/charging-phase-selection.ts
 *
 * Zweck:
 * TypeScript-Entscheidungsschicht für AC-1p/3p-Phasenwahl im EVCS-Lademanagement.
 * Die Datei schreibt keine ioBroker-States. Sie entscheidet nur, ob eine Wallbox
 * im PV-Überschussbetrieb einphasig oder dreiphasig laufen soll und ob eine sichere
 * Umschaltsequenz vorbereitet werden darf.
 *
 * Sicherheitsprinzip:
 * - DC-Lader werden nicht phasenautomatisch geschaltet.
 * - Hoch auf 3p nur bei stabil ausreichendem PV-/EVCS-Budget.
 * - Runter auf 1p bei dauerhaft zu niedrigem Überschuss.
 * - Bei stale Meter keine Hoch-Umschaltung.
 * - Phasenumschaltung ist ein schwerer Schaltvorgang: Stop/0-Setpoint vor Umschaltung,
 *   Cooldown und optionale Rückmeldung werden berücksichtigt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChargingPhaseSelectionPlan = buildChargingPhaseSelectionPlan;
function finiteOrNull(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const s = value.trim().replace(',', '.');
        if (!s)
            return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function nonNegative(value, fallback = 0) {
    const n = finiteOrNull(value);
    const v = n === null ? fallback : n;
    return v > 0 ? Math.round(v) : 0;
}
function boolValue(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'enabled', 'active', 'auto'].includes(s))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive'].includes(s))
            return false;
    }
    return fallback;
}
function str(value, fallback = '') {
    const s = String(value ?? '').trim();
    return s || fallback;
}
function safeKey(value, fallbackIndex = 0) {
    const raw = str(value, `wallbox_${fallbackIndex + 1}`);
    const safe = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return safe || `wallbox_${fallbackIndex + 1}`;
}
function normalizePhaseCount(value, fallback = 3) {
    const raw = str(value, '').toLowerCase();
    if (raw === '1p' || raw === '1phase' || raw === '1-phase' || raw === 'one' || raw === 'single')
        return 1;
    if (raw === '3p' || raw === '3phase' || raw === '3-phase' || raw === 'three')
        return 3;
    const n = finiteOrNull(value);
    return n !== null && Math.round(n) === 1 ? 1 : fallback;
}
function normalizePhaseMode(value, configured) {
    const raw = str(value, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (raw === 'autopv' || raw === 'pvauto' || raw === 'auto13' || raw === 'auto1p3p' || raw === 'auto')
        return 'auto-pv';
    if (raw === 'fixed1p' || raw === '1p' || raw === 'onephase' || raw === 'fixed1')
        return 'fixed-1p';
    if (raw === 'fixed3p' || raw === '3p' || raw === 'threephase' || raw === 'fixed3')
        return 'fixed-3p';
    return configured === 1 ? 'fixed-1p' : 'fixed-3p';
}
function phaseValueFor(target, value1p, value3p) {
    const raw = target === 1 ? value1p : value3p;
    if (typeof raw === 'boolean')
        return raw;
    if (typeof raw === 'number' && Number.isFinite(raw))
        return raw;
    if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s)
            return target;
        const low = s.toLowerCase();
        if (['true', 'false'].includes(low))
            return low === 'true';
        const n = Number(s.replace(',', '.'));
        return Number.isFinite(n) ? n : s;
    }
    return target;
}
/** Selects the stable budget that matches the wallbox charging mode. */
function effectiveStableBudgetW(input, effectiveMode = '') {
    const mode = str(effectiveMode, '').toLowerCase();
    const candidates = mode === 'pv'
        ? [input.stablePvPureAvailableW, input.pvPureAvailableW, input.stablePvAvailableW, input.pvAvailableW]
        : (mode === 'minpv'
            ? [input.stablePvPhysicalAvailableW, input.pvPhysicalAvailableW, input.stablePvAvailableW, input.pvAvailableW]
            : [input.budgetW, input.remainingW, input.stablePvPhysicalAvailableW, input.pvPhysicalAvailableW, input.stablePvAvailableW, input.pvAvailableW]);
    for (const candidate of candidates) {
        const n = finiteOrNull(candidate);
        if (n !== null)
            return Math.max(0, Math.round(n));
    }
    return 0;
}
function unique(values) {
    const out = [];
    for (const value of values) {
        const v = String(value || '').trim();
        if (v && !out.includes(v))
            out.push(v);
    }
    return out;
}
/**
 * Code-Teil: buildChargingPhaseSelectionPlan
 * Zweck: Entscheidet pro AC-Ladepunkt den stabilen 1p/3p-Zielzustand für PV-Überschussladen.
 */
/**
 * Ablauf und Zusammenhang: Ermittelt unter den konfigurierten Freigaben die passende AC-Phasenentscheidung. Ein Wechsel braucht ausreichendes Budget sowie die vorgesehenen Warte-/Sicherheitsbedingungen; DC-Ladepunkte erhalten keine AC-Phasenumschaltung.
 */
function buildChargingPhaseSelectionPlan(input) {
    const now = nonNegative(input.now, Date.now()) || Date.now();
    const phaseAutoEnabled = boolValue(input.phaseAutoEnabled, true);
    const stableBudgetW = effectiveStableBudgetW(input, 'minpv');
    const globalUpW = nonNegative(input.switchUpThresholdW, 4800) || 4800;
    const globalDownW = nonNegative(input.switchDownThresholdW, 3700) || 3700;
    const globalUpMs = nonNegative(input.switchUpStableMs, 5 * 60 * 1000) || 5 * 60 * 1000;
    const globalDownMs = nonNegative(input.switchDownStableMs, 2 * 60 * 1000) || 2 * 60 * 1000;
    const globalCooldownMs = nonNegative(input.switchCooldownMs, 15 * 60 * 1000) || 15 * 60 * 1000;
    const globalSettleMs = nonNegative(input.switchSettleMs, 30 * 1000) || 30 * 1000;
    const globalSafePowerW = nonNegative(input.switchSafePowerW, 150) || 150;
    const staleMeter = boolValue(input.staleMeter, false);
    const staleBudget = boolValue(input.staleBudget, false);
    const wallboxes = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const warnings = [];
    const blockers = [];
    if (!wallboxes.length)
        warnings.push('no-wallboxes-configured');
    if (!phaseAutoEnabled)
        warnings.push('phase-auto-disabled-globally');
    if (staleMeter)
        warnings.push('stale-meter-keeps-phase-or-allows-downshift-only');
    if (staleBudget)
        warnings.push('stale-budget-keeps-phase');
    const decisions = wallboxes.map((wb, index) => {
        const safe = safeKey(wb.safe ?? wb.key ?? wb.id ?? wb.name, index);
        const name = str(wb.name, safe);
        const chargerType = str(wb.chargerType, 'ac').toLowerCase() === 'dc' ? 'dc' : 'ac';
        const configured = normalizePhaseCount(wb.phases, chargerType === 'dc' ? 1 : 3);
        const current = normalizePhaseCount(wb.currentPhaseCount ?? wb.phaseFeedback ?? wb.phases, configured);
        const mode = normalizePhaseMode(wb.phaseMode, configured);
        const enabled = boolValue(wb.enabled, false);
        const online = boolValue(wb.online, false);
        const connected = boolValue(wb.vehiclePlugged, enabled || online);
        const charging = boolValue(wb.charging, false);
        const effectiveMode = str(wb.effectiveMode, 'normal').toLowerCase();
        let wallboxStableBudgetW = effectiveStableBudgetW(input, effectiveMode);
        const gridRaw = wb.zeroExportGridMaxW;
        const gridLimited = gridRaw !== null && gridRaw !== undefined;
        const gridCapW = gridLimited ? (typeof gridRaw !== 'boolean' && Number.isFinite(Number(gridRaw)) ? Math.max(0, Number(gridRaw)) : 0) : Infinity;
        const actualPowerW = nonNegative(wb.actualPowerW, 0);
        const voltageV = nonNegative(wb.voltageV, 230) || 230;
        const minA = finiteOrNull(wb.minA);
        const rawMinA = minA !== null && minA > 0 ? minA : 6;
        const configuredStepA = finiteOrNull(wb.stepA);
        const stepA = configuredStepA !== null && configuredStepA > 0 ? configuredStepA : 0.1;
        // A configured 6.1 A minimum with whole-amp commands requires 7 A, not 6.1 A.
        const effectiveMinA = Math.ceil((rawMinA - 1e-9) / stepA) * stepA;
        const minPower1pW = Math.round(voltageV * effectiveMinA);
        const minPower3pW = Math.round(3 * voltageV * effectiveMinA);
        if (gridLimited) {
            // Phasenwahl nach Netzanteil PLUS stabiler PV, nicht nach einem falschen
            // Gesamt-Boost-Cap. Wolken umgehen weder Stabilitätszeiten noch Cooldown.
            const stablePvW = effectiveStableBudgetW(input, effectiveMode === 'pv' ? 'pv' : 'minpv');
            const baseW = effectiveMode === 'pv' ? 0 : effectiveMode === 'minpv' ? Math.min(gridCapW, minPower3pW) : gridCapW;
            wallboxStableBudgetW = Math.min(nonNegative(input.budgetW), baseW + stablePvW);
            // Die zentrale Runtime bestätigt den gemessenen Speicheranteil frisch und
            // reserviert ihn genau einmal. Er darf eine bereits tatsächlich laufende
            // 3p-Ladung halten, wenn die gesamte 3p-Mindestleistung gedeckt bleibt.
            // Für einen neuen 1p->3p-Wechsel zählt ausschließlich Netz + stabile PV:
            // Batteriereserve allein darf keinen zusätzlichen Schaltvorgang starten.
            const rawCreditW = Math.max(0, Math.floor(finiteOrNull(wb.zeroExportStorageCreditW) ?? 0));
            const creditW = effectiveMode === 'minpv' ? Math.min(rawCreditW, Math.max(0, minPower3pW - gridCapW)) : rawCreditW;
            if (current === 3 && effectiveMode !== 'pv' && boolValue(wb.effectiveStorageAssist, false)
                && !staleMeter && !staleBudget && actualPowerW >= minPower3pW
                && baseW + stablePvW + creditW >= minPower3pW) {
                wallboxStableBudgetW = Math.min(nonNegative(input.budgetW), baseW + stablePvW + creditW);
            }
        }
        const upW = Math.max(minPower3pW, nonNegative(wb.switchUpThresholdW, globalUpW) || globalUpW);
        const downCandidate = nonNegative(wb.switchDownThresholdW, globalDownW) || globalDownW;
        const downW = Math.min(downCandidate, Math.max(0, upW - 200));
        const upMs = nonNegative(wb.switchUpStableMs, globalUpMs) || globalUpMs;
        const downMs = nonNegative(wb.switchDownStableMs, globalDownMs) || globalDownMs;
        const cooldownMs = nonNegative(wb.switchCooldownMs, globalCooldownMs) || globalCooldownMs;
        const settleMs = nonNegative(wb.switchSettleMs, globalSettleMs) || globalSettleMs;
        const safePowerW = nonNegative(wb.switchSafePowerW, globalSafePowerW) || globalSafePowerW;
        const highSince = nonNegative(wb.highSinceMs, 0);
        const lowSince = nonNegative(wb.lowSinceMs, 0);
        const cooldownUntilMs = nonNegative(wb.cooldownUntilMs, 0);
        const settleUntilMs = nonNegative(wb.settleUntilMs, 0);
        const cooldownActive = cooldownUntilMs > now || settleUntilMs > now;
        const cooldownRemainingMs = Math.max(0, Math.max(cooldownUntilMs, settleUntilMs) - now);
        const supportsPhaseSwitch = boolValue(wb.supportsPhaseSwitch, !!str(wb.phaseSwitchKey));
        const phaseSwitchKey = str(wb.phaseSwitchKey);
        const stopBefore = boolValue(wb.stopBeforePhaseSwitch, true);
        const onePhaseLine = str(wb.onePhaseLine, 'L1').toUpperCase();
        let nextHighSinceMs = wallboxStableBudgetW >= upW ? (highSince > 0 ? highSince : now) : 0;
        let nextLowSinceMs = wallboxStableBudgetW <= downW ? (lowSince > 0 ? lowSince : now) : 0;
        if (!phaseAutoEnabled || mode !== 'auto-pv' || chargerType !== 'ac') {
            nextHighSinceMs = 0;
            nextLowSinceMs = 0;
        }
        const stableAbove3p = nextHighSinceMs > 0 && (now - nextHighSinceMs) >= upMs;
        const stableBelow1p = nextLowSinceMs > 0 && (now - nextLowSinceMs) >= downMs;
        let target = mode === 'fixed-1p' ? 1 : (mode === 'fixed-3p' ? 3 : current);
        let reason = '';
        let warning = '';
        let blocker = '';
        if (chargerType === 'dc') {
            target = 1;
            reason = 'dc-no-ac-phase-switch';
        }
        else if (!phaseAutoEnabled) {
            target = current;
            reason = 'phase-auto-disabled';
        }
        else if (!enabled || !online) {
            target = current;
            reason = !enabled ? 'wallbox-disabled-keep-phase' : 'wallbox-offline-keep-phase';
        }
        else if (mode === 'auto-pv') {
            if (staleBudget) {
                target = current;
                reason = 'stale-budget-keep-phase';
                warning = reason;
            }
            else if (staleMeter) {
                // Bei stale Meter nicht hochschalten. Eine bestehende 3p-Ladung darf aber bei wenig Budget auf 1p runter.
                if (current === 3 && stableBelow1p) {
                    target = 1;
                    reason = 'stable-low-budget-downshift-allowed-while-stale-meter';
                }
                else {
                    target = current;
                    reason = 'stale-meter-blocks-phase-upshift';
                    warning = reason;
                }
            }
            else if (current === 1 && boolValue(wb.zeroExportPhaseProbe, false)
                && nonNegative(wb.zeroExportProbeValidUntil) > now && effectiveMode === 'pv') {
                target = 3;
                reason = 'zero-export-central-phase-probe';
            }
            else if (current === 1 && stableAbove3p) {
                target = 3;
                reason = 'stable-pv-budget-upshift-to-3p';
            }
            else if (current === 3 && stableBelow1p) {
                target = 1;
                reason = 'stable-low-pv-budget-downshift-to-1p';
            }
            else {
                target = current;
                if (current === 1)
                    reason = wallboxStableBudgetW >= upW ? 'waiting-for-3p-stability' : 'pv-budget-prefers-1p';
                else
                    reason = wallboxStableBudgetW <= downW ? 'waiting-for-1p-stability' : 'pv-budget-keeps-3p';
            }
        }
        else {
            reason = mode === 'fixed-1p' ? 'fixed-1p-configured' : 'fixed-3p-configured';
        }
        const desiredSwitch = target !== current;
        const direction = !desiredSwitch ? 'none' : (current === 1 && target === 3 ? '1p-to-3p' : '3p-to-1p');
        let switchRequired = desiredSwitch;
        let switchAllowed = true;
        let switchCommandAllowed = false;
        let safetyStopRequired = false;
        if (switchRequired && cooldownActive) {
            switchRequired = false;
            target = current;
            switchAllowed = false;
            reason = 'phase-switch-cooldown';
            warning = reason;
        }
        else if (switchRequired && (!supportsPhaseSwitch || !phaseSwitchKey)) {
            switchAllowed = false;
            blocker = 'missing-phase-switch-datapoint';
            reason = blocker;
            safetyStopRequired = false;
        }
        else if (switchRequired) {
            const needsStop = stopBefore && (charging || actualPowerW > safePowerW);
            safetyStopRequired = stopBefore;
            switchCommandAllowed = !needsStop;
            if (needsStop)
                reason = `stop-before-phase-switch:${direction}`;
            else
                reason = `phase-switch-command-ready:${direction}`;
        }
        // A successful phase command starts an explicit settling interval. Even if
        // feedback already reports the target phases, charging must remain stopped
        // until this interval ends. Cooldown alone only blocks another switch.
        if (chargerType === 'ac' && settleUntilMs > now) {
            switchCommandAllowed = false;
            safetyStopRequired = true;
            reason = 'phase-switch-settling';
        }
        const allocationPhaseCount = switchRequired ? current : target;
        return {
            safe,
            name,
            chargerType,
            effectiveMode,
            mode,
            enabled,
            online,
            connected,
            currentPhaseCount: current,
            configuredPhaseCount: configured,
            targetPhaseCount: target,
            allocationPhaseCount,
            switchRequired,
            switchDirection: switchRequired ? direction : 'none',
            switchAllowed,
            switchCommandAllowed,
            safetyStopRequired,
            stopBeforePhaseSwitch: stopBefore,
            phaseSwitchKey,
            phaseSwitchValue: phaseValueFor(target, wb.phaseSwitchValue1p, wb.phaseSwitchValue3p),
            supportsPhaseSwitch,
            cooldownActive,
            cooldownRemainingMs,
            cooldownUntilMs,
            settleUntilMs,
            highSinceMs: highSince,
            lowSinceMs: lowSince,
            nextHighSinceMs,
            nextLowSinceMs,
            stableAbove3p,
            stableBelow1p,
            stableBudgetW: wallboxStableBudgetW,
            switchUpThresholdW: upW,
            switchDownThresholdW: downW,
            switchUpStableMs: upMs,
            switchDownStableMs: downMs,
            switchCooldownMs: cooldownMs,
            switchSettleMs: settleMs,
            minPower1pW,
            minPower3pW,
            onePhaseLine,
            reason,
            blocker,
            warning,
        };
    });
    const planBlockers = unique([...blockers, ...decisions.map((d) => d.blocker).filter((v) => !!v)]);
    const planWarnings = unique([...warnings, ...decisions.map((d) => d.warning).filter((v) => !!v)]);
    return {
        source: 'ts-charging-phase-selection-v1',
        available: true,
        ok: planBlockers.length === 0,
        productive: true,
        ts: finiteOrNull(input.ts) ?? now,
        mode: str(input.mode, 'auto'),
        budgetMode: str(input.budgetMode, ''),
        phaseAutoEnabled,
        stableBudgetW,
        switchRequiredCount: decisions.filter((d) => d.switchRequired).length,
        commandAllowedCount: decisions.filter((d) => d.switchCommandAllowed).length,
        safetyStopCount: decisions.filter((d) => d.safetyStopRequired).length,
        cooldownCount: decisions.filter((d) => d.cooldownActive).length,
        wallboxCount: decisions.length,
        wallboxes: decisions,
        blockers: planBlockers,
        warnings: planWarnings,
        safety: {
            doesNotWriteIoBrokerStates: true,
            acOnly: true,
            dcIgnored: true,
            highSwitchRequiresStablePvBudget: true,
            staleMeterBlocksPhaseUpshift: true,
            stopBeforePhaseSwitchDefault: true,
            cooldownPreventsFlapping: true,
        },
    };
}
