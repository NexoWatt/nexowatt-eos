/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: scripts/secure-loader.js
 * Rolle im Projekt: Build-/Wartungsskript.
 * Zweck: Hilfsskript für Versionierung, Publish-Prüfung, Hooks oder Sicherheit im Releaseprozess.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Wartungs-/Release-Skript für Versionierung, Prüfung oder Sicherheits-/Publish-Aufgaben.
 * Zusammenhänge:
 * - Wird über npm scripts oder Release-Prozess aufgerufen.
 * - Prüft bzw. verändert Metadaten, aber keine EMS-Laufzeitlogik.
 * Wartungshinweise:
 * - Skripte müssen auf Windows und Linux robust laufen.
 */

'use strict';

// NexoWatt SecurePack Loader (IP protection layer)
// NOTE: This is NOT cryptographic security (key is shipped with the app).
// It is meant to reduce casual readability / quick copy-paste of proprietary logic.

const crypto = require('crypto');
const vm = require('vm');
const Module = require('module');
const path = require('path');

// Derive a stable 32-byte key (AES-256) from a constant seed.
const _SEED = 'NexoWattSecurePack::v1::2026-01-30';
const _KEY = crypto.createHash('sha256').update(_SEED, 'utf8').digest(); // 32 bytes
/**
 * Code-Teil: _decryptBase64
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _decryptBase64(blobB64) {
  const buf = Buffer.from(blobB64, 'base64');
  // Layout: [12 bytes IV][ciphertext...][16 bytes GCM tag]
  const iv = buf.subarray(0, 12);
  const body = buf.subarray(12);
  const tag = body.subarray(body.length - 16);
  const ciphertext = body.subarray(0, body.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', _KEY, iv);
  decipher.setAuthTag(tag);

  const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return dec.toString('utf8');
}
/**
 * Code-Teil: load
 * Zweck: Lädt Daten aus API, States oder Konfiguration.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function load(module, filename, blobB64) {
  const code = _decryptBase64(blobB64);

  const wrapper = Module.wrap(code);
  const script = new vm.Script(wrapper, { filename });
  const func = script.runInThisContext();

  // Use module.require to preserve relative require() behaviour
  func(module.exports, module.require.bind(module), module, filename, path.dirname(filename));
}

module.exports = { load };
