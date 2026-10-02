// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-npm-version-free-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-npm-version-free-runtime.js
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
 * Original-Hash: fae83aa19d50f481bb0a05fbed9a53ff23bf2fd9a72dee5469630f0fa93cbf27
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

const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const guardPath = path.join(root, 'scripts', 'verify-npm-version-free.js');

/**
 * Code-Teil: runGuard
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function runGuard(registry) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [guardPath], {
      cwd: root,
      env: {
        ...process.env,
        NEXOWATT_NPM_REGISTRY: registry,
        NEXOWATT_NPM_PACKAGE: 'iobroker.nexowatt-ui',
        NEXOWATT_NPM_VERSION: '9.9.999-test',
        NEXOWATT_NPM_TIMEOUT_MS: '3000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

/**
 * Code-Teil: withStatus
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
async function withStatus(statusCode, fn) {
  const server = http.createServer((_request, response) => {
    response.statusCode = statusCode;
    response.setHeader('content-type', 'application/json');
    response.end(statusCode === 404 ? JSON.stringify({ error: 'not found' }) : JSON.stringify({ version: '9.9.999-test' }));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    return await fn(`http://127.0.0.1:${address.port}/`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

(async () => {
  const free = await withStatus(404, runGuard);
  assert.equal(free.code, 0, `404 must mark the version as free: ${free.stderr}`);
  assert.match(free.stdout, /noch nicht veröffentlicht/i);

  const occupied = await withStatus(200, runGuard);
  assert.equal(occupied.code, 1, '200 must block an already published version');
  assert.match(occupied.stderr, /existiert bereits/i);

  const ambiguous = await withStatus(500, runGuard);
  assert.equal(ambiguous.code, 1, 'ambiguous registry failures must block publishing');
  assert.match(ambiguous.stderr, /nicht eindeutig|blockiert/i);

  console.log('[npm-version-free-runtime] OK: HTTP 404 releases the version; existing and ambiguous registry responses fail closed.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
