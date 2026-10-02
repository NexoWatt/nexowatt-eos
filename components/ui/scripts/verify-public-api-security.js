#!/usr/bin/env node
'use strict';

/**
 * Sicherheits-Regression für öffentliche Kunden-APIs.
 *
 * Der Test prüft die kanonische TypeScript-Runtime und den ausgelieferten JS-Spiegel.
 * Geheimnisse und interne Datenpunktpfade dürfen nicht mehr über /api/state, SSE oder
 * die öffentliche /config-Antwort verteilt werden. RFID-Rohdaten werden ausschließlich
 * über den kontrollierten Kunden-Endpunkt geladen.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const source = read('src-ts/runtime-executables/main.ts');
const runtime = read('main.js');
const appSource = read('src-ts/runtime-executables/www/app.ts');
const appRuntime = read('www/app.js');

for (const [name, text] of [['source', source], ['runtime', runtime]]) {
  assert.ok(text.includes('nwBuildPublicStateSnapshot'), `${name}: public state sanitizer missing`);
  assert.ok(text.includes("lower === 'settings.weatherapikey' || lower === 'settings.email'"), `${name}: settings secrets not blocked`);
  assert.ok(text.includes("lower === 'evcs.rfid.whitelistjson'"), `${name}: RFID whitelist not blocked globally`);
  assert.ok(text.includes("out.datapoints = Object.fromEntries"), `${name}: raw datapoint mapping not replaced`);
  assert.ok(text.includes('nwSanitizePublicConfig(nwConfigPayload'), `${name}: /config sanitizer not wired`);
  assert.ok(text.includes("app.get('/api/state', async (req, res)"), `${name}: async /api/state access check missing`);
  assert.ok(text.includes('installerAccess ? source : nwBuildPublicStateSnapshot(source, true)'), `${name}: /api/state public boundary missing`);
  assert.ok(text.includes("app.get('/events', async (req, res)"), `${name}: SSE access check missing`);
  assert.ok(text.includes('initialPayload = client.internal ? this.stateCache : nwBuildPublicStateSnapshot'), `${name}: SSE init sanitizer missing`);
  assert.ok(text.includes('this._nwBuildPublicStatePatch(p)'), `${name}: SSE update sanitizer missing`);
  assert.ok(text.includes("app.get('/api/rfid/customer', requireAuth"), `${name}: controlled RFID endpoint missing`);
  assert.ok(text.includes('recipient_forbidden'), `${name}: arbitrary customer test-mail target not blocked`);
  assert.ok(!text.includes("res.json(tsStates || this.stateCache);"), `${name}: legacy unfiltered /api/state response still active`);
  assert.ok(!text.includes("payload: this.stateCache }) + \"\\n\\n\""), `${name}: legacy unfiltered SSE init still active`);
}

for (const [name, text] of [['app source', appSource], ['app runtime', appRuntime]]) {
  assert.ok(text.includes("fetch('/api/rfid/customer'"), `${name}: RFID UI does not use controlled endpoint`);
  assert.ok(text.includes('settings.weatherApiKeyConfigured'), `${name}: configured weather secret marker missing`);
  assert.ok(text.includes('settings.emailMasked'), `${name}: masked email marker missing`);
  const rfidBlockStart = text.indexOf('async function reload(){', text.indexOf('function setupRfidWhitelistUi'));
  const rfidBlockEnd = text.indexOf('\n  }', rfidBlockStart);
  const reloadBlock = rfidBlockStart >= 0 && rfidBlockEnd > rfidBlockStart ? text.slice(rfidBlockStart, rfidBlockEnd + 4) : '';
  assert.ok(reloadBlock.includes('loadRfidCustomerState'), `${name}: whitelist reload not routed through RFID endpoint`);
  assert.ok(!reloadBlock.includes("fetch('/api/state'"), `${name}: RFID reload still pulls global state`);
}

console.log('[public-api-security] OK: public state/config/SSE are redacted; RFID and test-mail paths are controlled.');
