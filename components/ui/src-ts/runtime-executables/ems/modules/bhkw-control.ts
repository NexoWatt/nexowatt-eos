// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bindet BHKW-Betriebsanforderungen in die gemeinsame Steuerung für regelbare Erzeuger ein.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/bhkw-control.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

declare const require: (id: string) => any;
declare const module: { exports: unknown };

const { PrimeMoverControlModule } = require('./prime-mover-control');

export class BhkwControlModule extends PrimeMoverControlModule {
  constructor(adapter: Record<string, any>, dpRegistry: Record<string, any> | null) {
    super(adapter, dpRegistry, {
      kind: 'bhkw',
      label: 'BHKW',
      devicePrefix: 'b',
      moduleName: 'bhkwControl',
    });
  }
}

module.exports = { BhkwControlModule };
