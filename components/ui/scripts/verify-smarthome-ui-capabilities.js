#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const ui = read('www/smarthome.js');
const cfg = read('www/smarthome-config.js');
const main = read('main.js');
const contract = read('lib/smarthome-contract.js');
const css = read('www/styles.css');

const mustContain = (haystack, needles, label) => {
  for (const needle of needles) {
    assert.ok(haystack.includes(needle), `${label}: fehlt ${JSON.stringify(needle)}`);
  }
};

mustContain(ui, [
  "hasValue: hasCurrent",
  "nw-sh-gauge--unknown",
  "valueEl.textContent = hasValue ? format(initial) : '—'",
  "nw-sh-tile--unknown",
  "nw-sh-tile--stale",
  "'nw-sh-tile--quality-' + qualityStatus",
  "nw-sh-tile--error",
  "colorTemperature",
  "io.white",
  "tiltWriteId",
  "Windalarm",
  "Frostalarm",
  "windowOpen",
  "fanSpeedId",
  "swingId",
  "ttsWriteId",
  "writableValue",
], 'SmartHome UI');

mustContain(cfg, [
  "Taster (Drücken/Loslassen)",
  "Dimmer (RGB / RGBW)",
  "Dimmer (Tunable White)",
  "Lamellenwinkel schreiben (optional)",
  "Windalarm (optional)",
  "Frostalarm (optional)",
  "Fenster offen / Sperre",
  "Text-to-Speech schreiben",
  "writableValue: true",
  "Farbtemperatur (K)",
  "Verschachtelte Szene",
], 'SmartHome Konfiguration');

mustContain(main, [
  "_nwReadSmartHomeSafetySignal",
  "_nwCheckSmartHomeCoverSafety",
  "_nwCheckSmartHomeClimateSafetyForScene",
  "_nwExecuteSmartHomeSceneAction",
  "_nwPulseSmartHomeSceneDatapoint",
  "_nwPreflightSmartHomeSceneById",
  "_nwSmartHomeSceneQueue",
], 'SmartHome Backend');

mustContain(contract, [
  "SUPPORTED_SCENE_ACTIONS",
  "normalizeSmartHomeScene",
  "sceneActionTargetAvailable",
  "covertilt",
  "colortemperature",
  "playertts",
  "writableValue",
  "SCENE_CYCLE",
], 'SmartHome Vertrag');

mustContain(css, [
  ".nw-sh-gauge--unknown",
  ".nw-sh-tile--unknown",
  ".nw-sh-tile--stale",
  ".nw-sh-tile--quality-offline",
  ".nw-sh-tile--error",
], 'SmartHome Styles');

console.log('[smarthome-ui-capabilities] OK: Qualitätszustände und gängige Licht-, Beschattungs-, Klima-, Player-, Szenen- und Wertgeberfunktionen sind durchgängig verdrahtet.');
