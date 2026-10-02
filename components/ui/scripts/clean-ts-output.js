#!/usr/bin/env node
/**
 * Code-Teil: TypeScript-Build-Ausgabe löschen.
 * Zweck: Entfernt den rein technischen Ordner dist-ts, damit lokale Builds
 *        keine alten Typdateien liegen lassen.
 * Zusammenhang: Wird von npm run clean:ts und vor npm run build:ts genutzt.
 * Wichtig: Dieser Ordner enthält nur generierte Deklarationen und keine
 *          produktive Adapterlogik. ioBroker startet weiterhin main.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'dist-ts');
fs.rmSync(outDir, { recursive: true, force: true });
console.log('[clean-ts-output] removed dist-ts');
