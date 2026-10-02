/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/storage-zero-write-policy.ts
 * Quell-Hash: sha256:67ba1db66965f0ddd753c237059667c585e6dcb75dd7cbea2fb03b63956d027f
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/storage-zero-write-policy.js.
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
 * Aufgabe: Bestimmt, wann ein Speicher-Nullsollwert geschrieben beziehungsweise ein unnötiger Wiederholschreibvorgang vermieden wird.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/storage-zero-write-policy.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideStorageZeroWrite = decideStorageZeroWrite;
function finite(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string' && !value.trim())
        return null;
    if (typeof value !== 'number' && typeof value !== 'string')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function text(value) {
    return String(value ?? '').trim();
}
function reasonImpliesExplicitStop(reasonRaw, sourceRaw) {
    const reason = text(reasonRaw).toLowerCase();
    const source = text(sourceRaw).toLowerCase();
    if (source === 'aus' || source === 'reserve')
        return true;
    if (!reason)
        return false;
    return [
        'deaktiviert',
        'nicht unterstützt',
        'datenpunkt fehlt',
        'sicherheitsstopp',
        'failsafe',
        'notstrom-reserve',
        'soc <=',
        'soc >=',
        'hart blockiert',
        'hard block',
        'explizit blockiert',
        'gesperrt',
        'sicherer 0-w',
        'manuell stopp',
        'manual stop',
        'write-stop-',
    ].some((needle) => reason.includes(needle));
}
function holdDecision(input, lastTargetW, reason, status) {
    const noWrite = input.holdByNoWrite === true;
    return {
        action: noWrite ? 'hold-no-write' : 'hold-write',
        outputW: lastTargetW,
        holdW: lastTargetW,
        explicitStop: false,
        status,
        reason,
    };
}
/**
 * Reine Entscheidung ohne Seiteneffekte.
 *
 * Ein Stop wird nur dann geschrieben, wenn er explizit/sicherheitsbedingt ist oder
 * der aktuelle NVP nachweislich zeigt, dass die bisherige Richtung nicht mehr
 * physikalisch zulaessig ist. Andernfalls bleibt der letzte wirksame Nicht-Null-Wert
 * bestehen; bei herstellerseitigem Watchdog kann er erneut geschrieben werden.
 */
function decideStorageZeroWrite(input = {}) {
    const targetW = finite(input.targetW) ?? 0;
    const lastTargetW = finite(input.lastTargetW) ?? 0;
    const reason = text(input.reason);
    const source = text(input.source);
    if (targetW !== 0) {
        return {
            action: 'write-target',
            outputW: targetW,
            holdW: 0,
            explicitStop: false,
            status: 'write-non-zero',
            reason,
        };
    }
    const explicitStop = input.explicitStop === true
        || reasonImpliesExplicitStop(reason, source);
    if (explicitStop) {
        return {
            action: 'write-stop',
            outputW: 0,
            holdW: 0,
            explicitStop: true,
            status: 'write-explicit-stop',
            reason: reason || 'Expliziter Speicher-Stopp',
        };
    }
    if (lastTargetW === 0) {
        return {
            action: 'idle-no-write',
            outputW: 0,
            holdW: 0,
            explicitStop: false,
            status: 'no-write-idle',
            reason: reason || 'Leerlauf ohne externen 0-W-Befehl',
        };
    }
    const nvpW = finite(input.nvpW);
    const nvpTargetW = finite(input.nvpTargetW) ?? 0;
    const nvpDeadbandW = Math.max(0, finite(input.nvpDeadbandW) ?? 100);
    const feedForwardTargetW = finite(input.feedForwardTargetW);
    const measurementGapAgeMs = Math.max(0, finite(input.measurementGapAgeMs) ?? 0);
    const measurementGraceMs = Math.max(0, finite(input.measurementGraceMs) ?? 30000);
    const budgetZeroAgeMs = Math.max(0, finite(input.budgetZeroAgeMs) ?? 0);
    const budgetGraceMs = Math.max(0, finite(input.budgetGraceMs) ?? 20000);
    const measurementGapWithinGrace = input.measurementGap === true && measurementGapAgeMs < measurementGraceMs;
    const budgetZeroWithinGrace = input.budgetZero === true
        && input.budgetZeroConfirmed !== true
        && budgetZeroAgeMs < budgetGraceMs;
    const inTargetBand = nvpW !== null && Math.abs(nvpW - nvpTargetW) <= nvpDeadbandW;
    const feedForwardSameDirection = feedForwardTargetW !== null
        && feedForwardTargetW !== 0
        && Math.sign(feedForwardTargetW) === Math.sign(lastTargetW);
    if (measurementGapWithinGrace) {
        return holdDecision(input, lastTargetW, reason
            ? `${reason} · kurze Messluecke – letzten Sollwert halten`
            : 'Kurze Messluecke – letzten Sollwert halten', 'hold-measurement-grace');
    }
    // Nach Ablauf der Messluecken-Grace darf ein formal vorhandener, aber als
    // unbrauchbar markierter Wert (z. B. alter Cachewert) nicht mehr durch die
    // Zielbandpruefung den alten Nicht-Null-Befehl halten.
    if (input.measurementGap === true || input.measurementUsable === false) {
        return {
            action: 'write-stop',
            outputW: 0,
            holdW: 0,
            explicitStop: true,
            status: 'write-stop-measurement-timeout',
            reason: reason || 'NVP-/Speichermessung nach Grace-Zeit nicht verwendbar',
        };
    }
    if (inTargetBand) {
        return holdDecision(input, lastTargetW, reason
            ? `${reason} · NVP im Zielband – letzten Sollwert halten`
            : 'NVP im Zielband – letzten Sollwert halten', 'hold-nvp-target-band');
    }
    // Der reale NVP hat Vorrang vor transienten Budget- und Feed-forward-Holds:
    // Netzbezug bei laufender PV-Ladung bzw. Einspeisung bei Entladung ist ein
    // physikalisch bestätigter Stopgrund und darf nicht durch eine Grace-Zeit verdeckt werden.
    if (nvpW !== null) {
        const lower = nvpTargetW - nvpDeadbandW;
        const upper = nvpTargetW + nvpDeadbandW;
        if (lastTargetW < 0 && nvpW > upper) {
            return {
                action: 'write-stop', outputW: 0, holdW: 0, explicitStop: true,
                status: 'write-stop-charge-causes-import',
                reason: reason || `Beladung stoppen: NVP ${Math.round(nvpW)} W ueber Zielband`,
            };
        }
        if (lastTargetW > 0 && nvpW < lower) {
            return {
                action: 'write-stop', outputW: 0, holdW: 0, explicitStop: true,
                status: 'write-stop-discharge-causes-export',
                reason: reason || `Entladung stoppen: NVP ${Math.round(nvpW)} W unter Zielband`,
            };
        }
    }
    if (budgetZeroWithinGrace) {
        return holdDecision(input, lastTargetW, reason
            ? `${reason} · Budget kurzzeitig 0 W – letzten Sollwert halten`
            : 'Budget kurzzeitig 0 W – letzten Sollwert halten', 'hold-transient-budget-zero');
    }
    if (feedForwardSameDirection) {
        return holdDecision(input, lastTargetW, reason
            ? `${reason} · PV-/Last-Feed-forward bestaetigt aktive Richtung`
            : 'PV-/Last-Feed-forward bestaetigt aktive Richtung', 'hold-feed-forward');
    }
    // Ein bestaetigt vollstaendig anderweitig reserviertes Budget ist ein echter
    // fachlicher Stop der bisherigen PV-Ladung.
    if (input.budgetZero === true && input.budgetZeroConfirmed === true && lastTargetW < 0) {
        return {
            action: 'write-stop',
            outputW: 0,
            holdW: 0,
            explicitStop: true,
            status: 'write-stop-budget-confirmed',
            reason: reason || 'Zentrales PV-Budget vollstaendig anderweitig reserviert',
        };
    }
    if (nvpW !== null) {
        if (lastTargetW < 0)
            return holdDecision(input, lastTargetW, reason
                ? `${reason} · NVP bestaetigt weitere Beladung`
                : 'NVP bestaetigt weitere Beladung', 'hold-charge-nvp');
        if (lastTargetW > 0)
            return holdDecision(input, lastTargetW, reason
                ? `${reason} · NVP bestaetigt weitere Entladung`
                : 'NVP bestaetigt weitere Entladung', 'hold-discharge-nvp');
    }
    // Ohne einen belastbaren Grund fuer einen Hardware-Stopp bleibt No-Write/Hold
    // die sichere Wahl. Der naechste regulaere NVP-Zyklus liefert wieder einen
    // nicht-null Sollwert oder einen expliziten Stopgrund.
    return holdDecision(input, lastTargetW, reason
        ? `${reason} · 0-W-Firewall: letzten Sollwert halten`
        : '0-W-Firewall: letzten Sollwert halten', 'hold-zero-firewall');
}
module.exports = { decideStorageZeroWrite };
