#!/usr/bin/env node
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
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const has = (text, needle, label) => { if (!text.includes(needle)) throw new Error(`${label} fehlt: ${needle}`); };
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
