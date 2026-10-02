'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/backend/api-state/api-state-envelope.ts
 * Quell-Hash: sha256:d6a25a0fbe968511a571fee58c19a880f008c646295443e878f3abc00a74ffeb
 * Erzeugung: npm run sync:ts-backend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein CommonJS-Spiegel einer backendnahen TypeScript-Quelle.
 * Sie wird in 0.7.68 noch nicht von main.js genutzt, legt aber die spätere
 * sichere Migration für StateCache, Lizenz und Feature-Sichtbarkeit fest.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in den passenden Dateien unter src-ts/backend/ vornehmen.
 * 2. npm run sync:ts-backend-mirrors ausführen.
 * 3. npm run test:backend-mirrors prüfen.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApiStateEnvelope = buildApiStateEnvelope;
/**
 * Code-Teil: buildApiStateEnvelope
 *
 * Zweck:
 * Baut eine minimale, typisierte API-Antwort für `/api/state`.
 *
 * Wichtig:
 * Diese Funktion verändert keine State-Werte. Sie verpackt nur vorhandene Werte in eine klare
 * Antwortstruktur. Dadurch ist sie risikoarm und später gut nach `main.ts` übernehmbar.
 */
function buildApiStateEnvelope(input) {
    const states = {};
    for (const [id, raw] of Object.entries(input.states)) {
        const value = (raw && Object.prototype.hasOwnProperty.call(raw, 'value'))
            ? (raw.value ?? null)
            : ((raw && Object.prototype.hasOwnProperty.call(raw, 'val')) ? (raw.val ?? null) : null);
        const entry = {
            id,
            value: value,
            source: raw === undefined ? 'missing' : 'state-cache',
        };
        if (raw && typeof raw.ts === 'number')
            entry.ts = raw.ts;
        if (raw && typeof raw.lc === 'number')
            entry.lc = raw.lc;
        if (raw && typeof raw.ack === 'boolean')
            entry.ack = raw.ack;
        if (raw && typeof raw.q === 'number')
            entry.q = raw.q;
        states[id] = entry;
    }
    const envelope = {
        ok: true,
        generatedAt: input.generatedAt ?? Date.now(),
        states,
        ...(input.features !== undefined ? { features: input.features } : {}),
        ...(input.license !== undefined ? { license: input.license } : {}),
    };
    return envelope;
}
