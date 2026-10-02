'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/adapter/connection-state.ts
 * Quell-Hash: sha256:52fefa4464dd0cfe1b25e2c43226823bf0905239d6edb51be19174def4a2c846
 * Erzeugung: npm run sync:ts-adapter-helpers
 *
 * Zweck:
 * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.
 * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime
 * nicht von einem Migrationsartefakt abhängig wird.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInfoConnectionWritePlan = buildInfoConnectionWritePlan;
/**
 * Code-Teil: buildInfoConnectionWritePlan
 *
 * Zweck:
 * Baut einen eindeutigen Schreibplan für `info.connection`.
 */
function buildInfoConnectionWritePlan(online, reason) {
    return { stateId: 'info.connection', value: online, ack: true, reason };
}
