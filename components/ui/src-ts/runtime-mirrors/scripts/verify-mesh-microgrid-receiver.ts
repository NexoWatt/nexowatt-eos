// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-mesh-microgrid-receiver.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-mesh-microgrid-receiver.js
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
 * Original-Hash: 846629afd7fc4a9ae5293cb97a36071d2daf4977809f49c7035c7443336c45ac
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
/**
 * Regressionstest für 0.8.41 Mesh/Microgrid Peer-Handshake & Command-Receiver.
 * Der Test schützt die Architekturregel: Remote-Kommandos über das separate
 * Mesh-Tailscale werden nur als neutrale Command-Envelope empfangen und niemals
 * direkt als Hardware-/OCPP-/Modbus-/MQTT-Schreibpfad ausgeführt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
/**
 * Code-Teil: has
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const has = (text, needle, label) => { if (!text.includes(needle)) throw new Error(`${label} fehlt: ${needle}`); };
/**
 * Code-Teil: not
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const not = (text, needle, label) => { if (text.includes(needle)) throw new Error(`${label} darf nicht enthalten sein: ${needle}`); };
const mainTs = read('src-ts/runtime-executables/main.ts');
const moduleTs = read('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts');
const uiTs = read('src-ts/runtime-executables/www/mesh-microgrid.ts');
const appTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const html = read('www/mesh-microgrid.html');

has(moduleTs, 'function normalizeReceiverCfg', 'Receiver-Konfiguration im TS-Modul');
has(moduleTs, 'meshMicrogrid.receiver.processedCommandIdsJson', 'Replay-Schutz-State');
has(moduleTs, 'meshMicrogrid.receiver.localCommandStateDp', 'lokaler Empfangs-Command-State');
has(moduleTs, '_sendFieldCommandsToPeers', 'Peer-Command-Dispatch');
has(moduleTs, '/api/mesh/command/receive', 'Peer-Receiver Endpoint-Ziel');
has(moduleTs, 'directHardwareWrite: false', 'direktes Hardware-Schreiben gesperrt im Modul');
has(moduleTs, 'neutralCommandOnly: true', 'neutrale Command-Pipeline im Modul');
not(moduleTs, 'ocpp.', 'keine OCPP-Hartkopplung im Mesh-Modul');
not(moduleTs, 'modbus.', 'keine Modbus-Hartkopplung im Mesh-Modul');

has(mainTs, '/api/mesh/handshake', 'Peer-Handshake API');
has(mainTs, '/api/mesh/status', 'Peer-Status API');
has(mainTs, '/api/mesh/command/receive', 'Command-Receiver API');
has(mainTs, 'nexowatt.mesh-received-command-envelope.v1', 'Received-Command Envelope');
has(mainTs, 'replay_blocked', 'Replay-Schutz im Receiver');
has(mainTs, 'setForeignStateAsync(cfg.localCommandStateDp', 'Receiver schreibt nur lokalen Command-State');
has(mainTs, 'directHardwareWrite: false', 'API blockiert direkten Hardware-Write');
has(mainTs, 'neutralCommandOnly: true', 'API bleibt herstellerneutral');

has(appTs, 'meshMicrogridReceiverEnabled', 'Receiver aktiv im Mesh-Reiter');
has(appTs, 'meshMicrogridReceiverStateDp', 'Receiver Command-State im Mesh-Reiter');
has(appTs, 'meshMicrogridReceiverReplayTtl', 'Replay-TTL im Mesh-Reiter');
has(uiTs, 'renderReceiver', 'Betreiberansicht rendert Receiver');
has(html, 'Command Receiver / Peer-Handshake', 'Receiver Abschnitt im HTML');
has(html, 'meshReceiverAck', 'ACK-Anzeige im HTML');
console.log('OK: Mesh/Microgrid Peer-Handshake und Command-Receiver sind neutral, tokenisiert und ohne direkten Hardware-Schreibpfad vorbereitet.');
