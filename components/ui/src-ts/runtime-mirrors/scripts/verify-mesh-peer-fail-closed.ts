// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-peer-fail-closed.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-peer-fail-closed.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: d1ca313c59fc34a079c2d1c3ad78ebece99e679f3fb9113ffce2ecb9caddd566
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

/** Mesh-/Peer-Sicherheitsregression: Token nur im Header, fehlender Token sperrt. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = ['src-ts/runtime-executables/main.ts', 'main.js'];
for (const rel of files) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  const start = text.indexOf('const _nwMeshPeerTokenFromReq');
  const end = text.indexOf('const _nwMeshWriteState', start);
  assert.ok(start >= 0 && end > start, `${rel}: token helper missing`);
  const block = text.slice(start, end);
  assert.ok(block.includes("req.headers['x-nexowatt-mesh-token']"), `${rel}: header token missing`);
  assert.ok(!block.includes('req.query'), `${rel}: query token remains allowed`);
  assert.ok(!block.includes('req.body'), `${rel}: body token remains allowed`);
  assert.ok(block.includes('if (!token || !given) return false;'), `${rel}: missing token is not fail-closed`);
  assert.ok(block.includes('crypto.timingSafeEqual'), `${rel}: token compare is not timing-safe`);
  assert.ok(text.includes("app.post('/api/mesh/microgrid/command', requireInstaller"), `${rel}: mesh operator command not installer protected`);
  assert.ok(text.includes("app.post('/api/mesh/local-bridge/release', requireInstaller"), `${rel}: bridge release not installer protected`);
  assert.ok(text.includes("app.post('/api/mesh/peer/fieldtest', requireInstaller"), `${rel}: peer fieldtest POST not installer protected`);
  assert.ok(text.includes("app.get('/api/mesh/peer/fieldtest', requireInstaller"), `${rel}: peer fieldtest GET not installer protected`);
}
console.log('[mesh-peer-fail-closed] OK: receiver requires header token and operator endpoints require installer access.');
