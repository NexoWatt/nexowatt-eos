// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-smarthome-contract-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-smarthome-contract-runtime.js
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
 * Original-Hash: c0e1b3e8719b7eb0117bbe27b04b2879241a732fbd6d3fbc696af14d68ae3365
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
const {
  normalizeSmartHomeDevice,
  normalizeSmartHomeConfig,
  validateSmartHomeConfig,
  normalizeSceneActionKind,
  sceneActionTargetAvailable,
} = require('../lib/smarthome-contract');

// 1) Historische Blind-Konfigurationen müssen Position lesen und schreiben können.
const blind = normalizeSmartHomeDevice({
  id: 'blind1', type: 'blind', io: { cover: { positionId: 'knx.0.blind.pos', positionWriteId: 'knx.0.blind.set' } },
});
assert.strictEqual(blind.io.level.readId, 'knx.0.blind.pos');
assert.strictEqual(blind.io.level.writeId, 'knx.0.blind.set');
assert.strictEqual(blind.io.level.min, 0);
assert.strictEqual(blind.io.level.max, 100);
assert(sceneActionTargetAvailable(blind, 'cover', 50));

// 2) Momentary-Taster und schreibbare Wertgeber erhalten einen echten Vertrag.
const momentary = normalizeSmartHomeDevice({
  id: 'button1', type: 'switch', templateId: 'button_press_release', io: { switch: { writeId: 'device.0.button' } },
});
assert.strictEqual(momentary.behavior.commandMode, 'momentary');
assert.strictEqual(momentary.capabilities.momentary, true);
assert(momentary.behavior.pulseMs >= 50);

const value = normalizeSmartHomeDevice({
  id: 'value1', type: 'sensor', templateId: 'value_percent', behavior: { readOnly: false },
  io: { sensor: { readId: 'device.0.value', writeId: 'device.0.value' } },
});
assert.strictEqual(value.behavior.readOnly, false);
assert.strictEqual(value.io.sensor.min, 0);
assert.strictEqual(value.io.sensor.max, 100);
assert.strictEqual(value.ui.unit, '%');
assert(sceneActionTargetAvailable(value, 'value', 42));

// 3) Player-Fähigkeiten inklusive Position/TTS und Range-Validierung.
const player = normalizeSmartHomeDevice({
  id: 'player1', type: 'player', templateId: 'audio_tts', io: { player: {
    playingId: 'media.0.playing', playId: 'media.0.play', pauseId: 'media.0.pause', volumeId: 'media.0.volume',
    seekId: 'media.0.seek', seekMin: 0, seekMax: 3600, seekStep: 1, ttsId: 'media.0.tts',
    shuffleId: 'media.0.shuffle', repeatId: 'media.0.repeat', stationId: 'media.0.station', playlistId: 'media.0.playlist',
  } },
});
assert.strictEqual(player.io.player.seekMax, 3600);
assert.strictEqual(player.capabilities.tts, true);
for (const kind of ['player', 'playerVolume', 'playerSeek', 'playerTts', 'playerShuffle', 'playerRepeat', 'playerStation', 'playerPlaylist']) {
  const sample = kind === 'player' ? 'play' : 1;
  assert(sceneActionTargetAvailable(player, kind, sample), `${kind} muss als Szenenaktion verfügbar sein`);
}

// 4) URL-Widgets sind echte URL-Verträge und werden validiert.
const urlWidget = normalizeSmartHomeDevice({ id: 'url1', type: 'scene', templateId: 'url_call', io: { widget: { openUrl: 'https://example.invalid/path' } } });
assert.strictEqual(urlWidget.type, 'widget');
assert.strictEqual(urlWidget.capabilities.openUrl, true);
assert.strictEqual(urlWidget.behavior.readOnly, true);
const badUrl = validateSmartHomeConfig({ devices: [{ id: 'bad', type: 'widget', io: { widget: { openUrl: 'javascript:alert(1)' } } }] });
assert.strictEqual(badUrl.ok, false);
assert(badUrl.errors.some((row) => row.code === 'WIDGET_URL_INVALID'));

// 5) Szenen werden vollständig normalisiert, neue Aktionstypen erhalten keine
// stille Switch-Umdeutung und Rekursion wird vor der Aktivierung blockiert.
const config = normalizeSmartHomeConfig({
  devices: [
    { id: 'light', type: 'color', io: { color: { writeId: 'device.0.rgb' }, level: { writeId: 'device.0.level' }, colorTemperature: { writeId: 'device.0.cct' } } },
    { id: 'cover', type: 'blind', io: { cover: { upId: 'device.0.up', downId: 'device.0.down', stopId: 'device.0.stop', tiltWriteId: 'device.0.tilt' }, level: { writeId: 'device.0.pos' } } },
    { id: 'climate', type: 'rtr', io: { climate: { setpointId: 'device.0.setpoint', powerId: 'device.0.power' } } },
  ],
  scenes: [{ id: 'evening', actions: [
    { deviceId: 'light', kind: 'colorTemperature', value: 2700 },
    { deviceId: 'cover', kind: 'coverTilt', value: 30 },
    { deviceId: 'climate', kind: 'climatePower', value: true },
  ] }],
});
assert.strictEqual(config.scenes[0].actions[0].kind, 'colortemperature');
assert.strictEqual(config.scenes[0].actions[1].kind, 'covertilt');
assert.strictEqual(normalizeSceneActionKind('player_tts'), 'playertts');
assert.strictEqual(validateSmartHomeConfig(config).ok, true);

const cycle = validateSmartHomeConfig({
  devices: [],
  scenes: [
    { id: 'a', actions: [{ kind: 'scene', value: 'b' }] },
    { id: 'b', actions: [{ kind: 'scene', value: 'a' }] },
  ],
});
assert.strictEqual(cycle.ok, false);
assert(cycle.errors.some((row) => row.code === 'SCENE_CYCLE'));

const unmapped = validateSmartHomeConfig({
  devices: [{ id: 'sensor', type: 'sensor', io: { sensor: { readId: 'device.0.sensor' } } }],
  scenes: [{ id: 'bad', actions: [{ deviceId: 'sensor', kind: 'value', value: 1 }] }],
});
assert.strictEqual(unmapped.ok, false);
assert(unmapped.errors.some((row) => row.code === 'SCENE_DEVICE_READONLY' || row.code === 'SCENE_ACTION_UNMAPPED'));

console.log('[smarthome-contract-runtime] OK');
