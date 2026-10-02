/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/measurement-freshness.ts
 * Quell-Hash: sha256:b0ace7f829f5f852d33e09e3d484c425a549ecd5630e9c8f5fe8cc556d7f2e68
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/measurement-freshness.js.
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
 * Aufgabe: Bewertet Alter und Verwendbarkeit von Messungen und bildet eine gemeinsame aktuelle NVP-Messbasis.
 * Daten und Wirkung: Liest Wert, Zeitstempel und konfigurierte Altersgrenzen; liefert Frische-/Gültigkeitsangaben. Ein Zahlenwert allein beweist keine aktuelle Messung.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/measurement-freshness.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
function finiteOrNull(value) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean')
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function nonNegative(value) {
    const parsed = finiteOrNull(value);
    return parsed === null ? 0 : Math.max(0, parsed);
}
function normalizedAge(value) {
    const parsed = finiteOrNull(value);
    return parsed === null ? null : Math.max(0, parsed);
}
/** Bewertet einen einzelnen Messkanal ohne Connected-fail-open. */
function evaluateMeasurementFreshness(input, policy) {
    const mapped = input.mapped !== false;
    const present = input.present !== false;
    const connected = typeof input.connected === 'boolean' ? input.connected : null;
    const measurementAgeMs = normalizedAge(input.measurementAgeMs);
    const heartbeatAgeMs = normalizedAge(input.heartbeatAgeMs);
    const staleMs = Math.max(1000, finiteOrNull(policy.staleMs) ?? 60000);
    const heartbeatStaleMs = Math.max(1000, finiteOrNull(policy.heartbeatStaleMs) ?? staleMs);
    const maxHeartbeatHoldMs = Math.max(staleMs, finiteOrNull(policy.maxHeartbeatHoldMs) ?? Math.max(staleMs * 3, 15 * 60 * 1000));
    if (!mapped) {
        return { fresh: false, measurementFresh: false, heartbeatFresh: false, connected, reason: 'not-mapped', measurementAgeMs, heartbeatAgeMs };
    }
    if (!present || measurementAgeMs === null) {
        return { fresh: false, measurementFresh: false, heartbeatFresh: false, connected, reason: 'measurement-missing', measurementAgeMs, heartbeatAgeMs };
    }
    if (connected === false) {
        return { fresh: false, measurementFresh: false, heartbeatFresh: false, connected, reason: 'disconnected', measurementAgeMs, heartbeatAgeMs };
    }
    const measurementFresh = measurementAgeMs <= staleMs;
    const heartbeatFresh = heartbeatAgeMs !== null && heartbeatAgeMs <= heartbeatStaleMs;
    if (measurementFresh) {
        return { fresh: true, measurementFresh: true, heartbeatFresh, connected, reason: 'measurement-fresh', measurementAgeMs, heartbeatAgeMs };
    }
    if (heartbeatFresh && measurementAgeMs <= maxHeartbeatHoldMs) {
        return { fresh: true, measurementFresh: false, heartbeatFresh: true, connected, reason: 'heartbeat-confirmed', measurementAgeMs, heartbeatAgeMs };
    }
    if (heartbeatFresh && measurementAgeMs > maxHeartbeatHoldMs) {
        return { fresh: false, measurementFresh: false, heartbeatFresh: true, connected, reason: 'measurement-hold-expired', measurementAgeMs, heartbeatAgeMs };
    }
    return { fresh: false, measurementFresh: false, heartbeatFresh: false, connected, reason: 'measurement-stale', measurementAgeMs, heartbeatAgeMs };
}
function channelTs(channel) {
    const ts = finiteOrNull(channel?.sampleTs);
    return ts !== null && ts > 0 ? ts : null;
}
function channelAge(channel) {
    return normalizedAge(channel?.freshness?.measurementAgeMs);
}
function channelFresh(channel) {
    return !!(channel?.mapped && channel?.freshness?.fresh && finiteOrNull(channel.value) !== null);
}
function staleStatus(channels) {
    return channels.some((channel) => channel?.freshness?.reason === 'disconnected') ? 'disconnected' : 'stale';
}
function parseBoolean(value) {
    if (value === true || value === 1 || value === '1' || value === 'true')
        return true;
    if (value === false || value === 0 || value === '0' || value === 'false')
        return false;
    return null;
}
/** Baut den systemweit kanonischen NVP-Snapshot direkt aus dem DP-Register. */
function buildNvpSnapshotFromRegistry(input) {
    const registry = input.registry;
    const now = finiteOrNull(input.now) ?? Date.now();
    const staleMs = Math.max(1000, finiteOrNull(input.staleMs) ?? 60000);
    const maxSkewMs = Math.max(250, finiteOrNull(input.maxSkewMs) ?? 5000);
    const maxHeartbeatHoldMs = Math.max(staleMs, finiteOrNull(input.maxHeartbeatHoldMs) ?? Math.max(staleMs * 3, 15 * 60 * 1000));
    const signedKey = input.signedKey || 'vis.gridNetW';
    const buyKey = input.importKey || 'vis.gridBuyW';
    const sellKey = input.exportKey || 'vis.gridSellW';
    const connectedKey = input.connectedKey || 'cm.gridConnected';
    const watchdogKey = input.watchdogKey || 'cm.gridWatchdog';
    const invertGrid = input.invertGrid === true;
    const age = (key) => normalizedAge(typeof registry.getMeasurementAgeMs === 'function' ? registry.getMeasurementAgeMs(key) : registry.getAgeMs(key));
    const timestamp = (key) => {
        if (typeof registry.getMeasurementTimestampMs === 'function')
            return finiteOrNull(registry.getMeasurementTimestampMs(key));
        const valueAge = age(key);
        return valueAge === null ? null : now - valueAge;
    };
    const aliveAge = (key) => normalizedAge(typeof registry.getAliveAgeMs === 'function' ? registry.getAliveAgeMs(key) : null);
    let connected = registry.getEntry(connectedKey) ? parseBoolean(registry.getRaw(connectedKey)) : null;
    if (connected === null && typeof registry.getConnectionStatus === 'function') {
        for (const key of [signedKey, buyKey, sellKey]) {
            if (!registry.getEntry(key))
                continue;
            const status = registry.getConnectionStatus(key);
            if (status === false) {
                connected = false;
                break;
            }
            if (status === true)
                connected = true;
        }
    }
    let heartbeatAgeMs = null;
    const watchdogEntry = registry.getEntry(watchdogKey);
    if (watchdogEntry) {
        const watchdogId = String(watchdogEntry.srcObjectId || watchdogEntry.objectId || '');
        if (/lastSeenMs$/i.test(watchdogId)) {
            const lastSeenMs = registry.getNumber(watchdogKey, null);
            if (finiteOrNull(lastSeenMs) !== null && Number(lastSeenMs) > 0)
                heartbeatAgeMs = Math.max(0, now - Number(lastSeenMs));
        }
        else {
            const candidates = [age(watchdogKey), aliveAge(watchdogKey)].filter((value) => value !== null);
            if (candidates.length)
                heartbeatAgeMs = Math.min(...candidates);
        }
    }
    if (heartbeatAgeMs === null) {
        const candidates = [signedKey, buyKey, sellKey]
            .filter((key) => !!registry.getEntry(key))
            .map((key) => aliveAge(key))
            .filter((value) => value !== null);
        if (candidates.length)
            heartbeatAgeMs = Math.min(...candidates);
    }
    const sample = (key, value) => {
        const mapped = !!registry.getEntry(key);
        return {
            mapped,
            value,
            sampleTs: mapped ? timestamp(key) : null,
            freshness: evaluateMeasurementFreshness({
                mapped,
                present: mapped && finiteOrNull(value) !== null,
                measurementAgeMs: mapped ? age(key) : null,
                heartbeatAgeMs,
                connected,
            }, { staleMs, heartbeatStaleMs: staleMs, maxHeartbeatHoldMs }),
        };
    };
    const signedRaw = registry.getNumber(signedKey, null);
    const signedValue = finiteOrNull(signedRaw) === null ? null : (invertGrid ? -Number(signedRaw) : Number(signedRaw));
    const rawBuy = registry.getNumber(buyKey, null);
    const rawSell = registry.getNumber(sellKey, null);
    const importKey = invertGrid ? sellKey : buyKey;
    const exportKey = invertGrid ? buyKey : sellKey;
    const importValue = finiteOrNull(invertGrid ? rawSell : rawBuy);
    const exportValue = finiteOrNull(invertGrid ? rawBuy : rawSell);
    const resolution = resolveNvpMeasurement({
        signed: sample(signedKey, signedValue),
        import: sample(importKey, importValue),
        export: sample(exportKey, exportValue),
        maxSkewMs,
    });
    return {
        ...resolution,
        ts: now,
        fresh: resolution.usable,
        connected,
        heartbeatAgeMs,
        staleMs,
        maxSkewMs,
        maxHeartbeatHoldMs,
        source: `${resolution.source}${invertGrid ? ':inv' : ''}`,
    };
}
/** Vereinheitlicht NVP-Werte für LIVE und Historie ohne zweite Frischelogik. */
function resolveNvpDisplay(input) {
    const mapped = {
        gridBuyMapped: input.gridBuyMapped,
        gridSellMapped: input.gridSellMapped,
        gridNetMapped: input.gridNetMapped,
    };
    const canonicalNetW = finiteOrNull(input.canonicalNetW);
    if (input.canonicalKnown && input.canonicalFresh === true && canonicalNetW !== null) {
        return {
            gridBuyRaw: Math.max(0, canonicalNetW),
            gridSellRaw: Math.max(0, -canonicalNetW),
            gridNetRaw: canonicalNetW,
            gridBuyW: Math.max(0, canonicalNetW),
            gridSellW: Math.max(0, -canonicalNetW),
            hasGrid: true,
            src: String(input.canonicalSource || 'ems-canonical'),
            ...mapped,
        };
    }
    if (input.canonicalKnown && input.canonicalFresh === false) {
        return { gridBuyRaw: null, gridSellRaw: null, gridNetRaw: null, gridBuyW: 0, gridSellW: 0, hasGrid: false, src: `ems-${String(input.canonicalStatus || 'stale')}`, ...mapped };
    }
    const gridNetRaw = finiteOrNull(input.gridNetRaw);
    let gridBuyRaw = finiteOrNull(input.gridBuyRaw);
    let gridSellRaw = finiteOrNull(input.gridSellRaw);
    let src = 'missing';
    if (gridNetRaw !== null) {
        gridBuyRaw = Math.max(0, gridNetRaw);
        gridSellRaw = Math.max(0, -gridNetRaw);
        src = 'net-fresh';
    }
    else if (gridBuyRaw !== null || gridSellRaw !== null) {
        const buyTs = finiteOrNull(input.gridBuyTs);
        const sellTs = finiteOrNull(input.gridSellTs);
        const maxSkewMs = Math.max(250, Math.min(30000, finiteOrNull(input.maxSkewMs) ?? 5000));
        if (gridBuyRaw !== null && gridSellRaw !== null && buyTs !== null && sellTs !== null && Math.abs(buyTs - sellTs) > maxSkewMs) {
            if (buyTs >= sellTs) {
                gridSellRaw = 0;
                src = 'split-newer-import';
            }
            else {
                gridBuyRaw = 0;
                src = 'split-newer-export';
            }
        }
        else if (gridBuyRaw !== null && gridSellRaw !== null)
            src = 'split-coherent';
        else if (gridBuyRaw !== null) {
            gridSellRaw = 0;
            src = 'split-import-only';
        }
        else {
            gridBuyRaw = 0;
            src = 'split-export-only';
        }
    }
    const rawBuyW = Math.max(0, Math.abs(gridBuyRaw ?? 0));
    const rawSellW = Math.max(0, Math.abs(gridSellRaw ?? 0));
    const hasGrid = gridNetRaw !== null || gridBuyRaw !== null || gridSellRaw !== null;
    const resolvedNetW = gridNetRaw !== null ? gridNetRaw : (hasGrid ? rawBuyW - rawSellW : null);
    const gridBuyW = resolvedNetW === null ? 0 : Math.max(0, resolvedNetW);
    const gridSellW = resolvedNetW === null ? 0 : Math.max(0, -resolvedNetW);
    if (rawBuyW > 0 && rawSellW > 0)
        src = `${src}-net-normalized`;
    return {
        gridBuyRaw,
        gridSellRaw,
        gridNetRaw: resolvedNetW,
        gridBuyW,
        gridSellW,
        hasGrid,
        src,
        ...mapped,
    };
}
/** Bewertet, ob ein bereits erzeugter NVP-Snapshot noch für diesen Tick gilt. */
function resolveCurrentNvpSnapshot(snapshot, now, maxAgeMs) {
    const value = snapshot && typeof snapshot === 'object' ? snapshot : null;
    if (!value)
        return { known: false, current: false, usable: false, ageMs: null, measurementAgeMs: null, heartbeatAgeMs: null, netW: null, status: 'missing', source: '', reason: '', connected: null };
    const ts = finiteOrNull(value.ts);
    const ageMs = ts === null ? null : Math.max(0, now - ts);
    const current = ageMs !== null && ageMs <= Math.max(1000, maxAgeMs);
    const netW = finiteOrNull(value.netW);
    return {
        known: true,
        current,
        usable: current && value.usable === true && netW !== null && value.connected !== false,
        ageMs,
        measurementAgeMs: normalizedAge(value.measurementAgeMs),
        heartbeatAgeMs: normalizedAge(value.heartbeatAgeMs),
        netW,
        status: String(value.status || (current ? 'stale' : 'snapshot-stale')),
        source: String(value.source || 'ems-canonical'),
        reason: String(value.reason || ''),
        connected: typeof value.connected === 'boolean' ? value.connected : null,
    };
}
/**
 * Löst den kanonischen NVP-Wert auf. Ein signierter DP ist führend, wenn er
 * frisch ist. Bei Split-DPs wird bei Zeitversatz nur der neuere Kanal verwendet.
 */
function resolveNvpMeasurement(input) {
    const signed = input.signed || null;
    const imp = input.import || null;
    const exp = input.export || null;
    const maxSkewMs = Math.max(250, finiteOrNull(input.maxSkewMs) ?? 5000);
    const signedMapped = !!signed?.mapped;
    const importMapped = !!imp?.mapped;
    const exportMapped = !!exp?.mapped;
    if (channelFresh(signed)) {
        const netW = finiteOrNull(signed?.value);
        return {
            usable: true,
            coherent: true,
            degraded: false,
            mode: 'signed',
            source: 'signed',
            status: 'ok',
            netW,
            importW: Math.max(0, netW),
            exportW: Math.max(0, -netW),
            skewMs: null,
            measurementAgeMs: channelAge(signed),
            reason: signed?.freshness?.reason || 'measurement-fresh',
        };
    }
    if (!importMapped && !exportMapped) {
        const status = signedMapped ? staleStatus([signed]) : 'missing';
        return {
            usable: false,
            coherent: false,
            degraded: false,
            mode: signedMapped ? 'signed' : 'missing',
            source: signedMapped ? 'signed-stale' : 'missing',
            status,
            netW: null,
            importW: 0,
            exportW: 0,
            skewMs: null,
            measurementAgeMs: channelAge(signed),
            reason: signedMapped ? (signed?.freshness?.reason || 'signed-stale') : 'no-nvp-mapping',
        };
    }
    const importFresh = channelFresh(imp);
    const exportFresh = channelFresh(exp);
    const importW = importFresh ? nonNegative(imp?.value) : 0;
    const exportW = exportFresh ? nonNegative(exp?.value) : 0;
    const importTs = channelTs(imp);
    const exportTs = channelTs(exp);
    const skewMs = importTs !== null && exportTs !== null ? Math.abs(importTs - exportTs) : null;
    const ages = [channelAge(imp), channelAge(exp)].filter((age) => age !== null);
    const measurementAgeMs = ages.length ? Math.min(...ages) : null;
    if (importFresh && exportFresh) {
        if (skewMs === null || skewMs <= maxSkewMs) {
            return {
                usable: true,
                coherent: true,
                degraded: false,
                mode: 'split',
                source: 'split-coherent',
                status: 'ok',
                netW: importW - exportW,
                importW,
                exportW,
                skewMs,
                measurementAgeMs,
                reason: 'split-coherent',
            };
        }
        const useImport = importTs !== null && exportTs !== null ? importTs >= exportTs : (channelAge(imp) ?? Infinity) <= (channelAge(exp) ?? Infinity);
        return {
            usable: true,
            coherent: false,
            degraded: true,
            mode: 'split',
            source: useImport ? 'split-newer-import' : 'split-newer-export',
            status: 'degraded',
            netW: useImport ? importW : -exportW,
            importW: useImport ? importW : 0,
            exportW: useImport ? 0 : exportW,
            skewMs,
            measurementAgeMs,
            reason: `split-skew>${Math.round(maxSkewMs)}ms`,
        };
    }
    if (importFresh) {
        return {
            usable: true,
            coherent: false,
            degraded: true,
            mode: 'split',
            source: 'split-import-only',
            status: 'degraded',
            netW: importW,
            importW,
            exportW: 0,
            skewMs,
            measurementAgeMs: channelAge(imp),
            reason: exportMapped ? (exp?.freshness?.reason || 'export-stale') : 'export-not-mapped',
        };
    }
    if (exportFresh) {
        return {
            usable: true,
            coherent: false,
            degraded: true,
            mode: 'split',
            source: 'split-export-only',
            status: 'degraded',
            netW: -exportW,
            importW: 0,
            exportW,
            skewMs,
            measurementAgeMs: channelAge(exp),
            reason: importMapped ? (imp?.freshness?.reason || 'import-stale') : 'import-not-mapped',
        };
    }
    return {
        usable: false,
        coherent: false,
        degraded: false,
        mode: 'split',
        source: 'split-stale',
        status: staleStatus([imp, exp, signed]),
        netW: null,
        importW: 0,
        exportW: 0,
        skewMs,
        measurementAgeMs,
        reason: [imp?.freshness?.reason, exp?.freshness?.reason].filter(Boolean).join('+') || 'split-stale',
    };
}
module.exports = {
    buildNvpSnapshotFromRegistry,
    evaluateMeasurementFreshness,
    resolveCurrentNvpSnapshot,
    resolveNvpDisplay,
    resolveNvpMeasurement,
};
