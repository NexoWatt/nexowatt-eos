/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/bhkw-control.ts
 * Quell-Hash: sha256:35351d639654dc24a1be74e1f69e9737d676ca81e9ef7f0590c912c797f2b445
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/bhkw-control.js.
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
 * Aufgabe: Bindet BHKW-Betriebsanforderungen in die gemeinsame Steuerung für regelbare Erzeuger ein.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/bhkw-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.BhkwControlModule = void 0;
const { PrimeMoverControlModule } = require('./prime-mover-control');
class BhkwControlModule extends PrimeMoverControlModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry, {
            kind: 'bhkw',
            label: 'BHKW',
            devicePrefix: 'b',
            moduleName: 'bhkwControl',
        });
    }
}
exports.BhkwControlModule = BhkwControlModule;
module.exports = { BhkwControlModule };
