// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/smarthome-contract.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * lib/smarthome-contract.js
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
 * Original-Hash: e9abea3aee1e47a4b8e334cc5393509a61a1486ee6405fdb4097331b159f6d22
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/smarthome-contract.ts
 * Quell-Hash: sha256:9d54fc37c7dca421e1484436a1348b9c4b52576b5335a52a808c9ca9fb4351b1
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/smarthome-contract.js.
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
 * Aufgabe: Normalisiert und prüft die gemeinsame SmartHome-Konfiguration für Backend und Bedienoberfläche.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/smarthome-contract.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const SUPPORTED_TYPES = new Set([
    'switch', 'dimmer', 'color', 'blind', 'rtr', 'scene', 'sensor', 'player', 'camera', 'widget',
]);
const SUPPORTED_SCENE_ACTIONS = new Set([
    'switch', 'on', 'off', 'level', 'cover', 'covertilt', 'rtrsetpoint', 'color', 'white', 'colortemperature',
    'climatepower', 'climatemode', 'climatefan', 'climateswing', 'player', 'playervolume',
    'playerseek', 'playermute', 'playerpower', 'playershuffle', 'playerrepeat', 'playerstation',
    'playerplaylist', 'playertts', 'value', 'scene',
]);
const WRITABLE_VALUE_TEMPLATES = {
    value_32bit_signed: { valueType: 'integer', min: -2147483648, max: 2147483647, step: 1, unit: '' },
    value_32bit_unsigned: { valueType: 'integer', min: 0, max: 4294967295, step: 1, unit: '' },
    value_8bit_unsigned: { valueType: 'integer', min: 0, max: 255, step: 1, unit: '' },
    value_8bit_signed: { valueType: 'integer', min: -128, max: 127, step: 1, unit: '' },
    value_decimal: { valueType: 'number', min: -1000000000, max: 1000000000, step: 0.1, unit: '' },
    value_percent: { valueType: 'number', min: 0, max: 100, step: 1, unit: '%' },
    value_temperature: { valueType: 'number', min: -50, max: 100, step: 0.1, unit: '°C' },
};
/**
 * Code-Teil: isPlain
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function isPlain(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
/**
 * Code-Teil: str
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function str(value, max = 512) {
    if (value === null || value === undefined)
        return '';
    const out = String(value).trim();
    return out.length > max ? out.slice(0, max) : out;
}
/**
 * Code-Teil: finite
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function finite(value, fallback, min, max) {
    const n = Number(value);
    let out = Number.isFinite(n) ? n : fallback;
    if (typeof min === 'number')
        out = Math.max(min, out);
    if (typeof max === 'number')
        out = Math.min(max, out);
    return out;
}
/**
 * Code-Teil: nullableId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function nullableId(value) {
    const out = str(value, 512);
    return out || null;
}
/**
 * Code-Teil: cleanIoPair
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function cleanIoPair(source, fallbackRead, fallbackWrite) {
    const row = isPlain(source) ? source : {};
    const readId = nullableId(row.readId || fallbackRead || row.writeId || fallbackWrite);
    const writeId = nullableId(row.writeId || fallbackWrite || row.readId || fallbackRead);
    return { readId, writeId };
}
/**
 * Code-Teil: normalizeTemplateContract
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeTemplateContract(templateId, type, behavior, capabilities, io, ui) {
    const tid = str(templateId, 80).toLowerCase();
    const out = { type, behavior, capabilities, io, ui };
    if (tid === 'button_press_release' || tid === 'iot_trigger') {
        out.type = 'switch';
        out.behavior.commandMode = 'momentary';
        out.behavior.pulseMs = finite(out.behavior.pulseMs, 250, 50, 60000);
        out.capabilities.momentary = true;
    }
    else if (tid === 'button_toggle') {
        out.type = 'switch';
        out.behavior.commandMode = 'toggle';
    }
    else if (tid === 'url_call') {
        out.type = 'widget';
        out.behavior.readOnly = true;
        out.capabilities.openUrl = true;
        out.io.widget = isPlain(out.io.widget) ? out.io.widget : {};
        out.io.widget.kind = 'url';
        out.io.widget.embed = false;
    }
    else if (tid === 'dimmer_tw') {
        out.type = 'dimmer';
        out.capabilities.brightness = true;
        out.capabilities.colorTemperature = true;
    }
    else if (tid === 'dimmer_rgb' || tid === 'hue_lights') {
        out.type = 'color';
        out.capabilities.brightness = true;
        out.capabilities.rgb = true;
        out.capabilities.white = true;
        out.capabilities.colorTemperature = true;
    }
    else if (tid === 'audio_tts') {
        out.type = 'player';
        out.capabilities.tts = true;
    }
    else if (Object.prototype.hasOwnProperty.call(WRITABLE_VALUE_TEMPLATES, tid)) {
        const spec = WRITABLE_VALUE_TEMPLATES[tid];
        out.type = 'sensor';
        out.behavior.readOnly = false;
        out.capabilities.writableValue = true;
        out.io.sensor = isPlain(out.io.sensor) ? out.io.sensor : {};
        out.io.sensor.valueType = str(out.io.sensor.valueType || spec.valueType, 20) || spec.valueType;
        out.io.sensor.min = finite(out.io.sensor.min, spec.min);
        out.io.sensor.max = finite(out.io.sensor.max, spec.max);
        out.io.sensor.step = finite(out.io.sensor.step, spec.step, 0.000001);
        if (!str(out.ui.unit, 32) && spec.unit)
            out.ui.unit = spec.unit;
    }
    return out;
}
/**
 * Code-Teil: normalizeSmartHomeDevice
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeSmartHomeDevice(input, index = 0) {
    const raw = isPlain(input) ? input : {};
    const rawIo = isPlain(raw.io) ? raw.io : {};
    const rawBehavior = isPlain(raw.behavior) ? raw.behavior : {};
    const rawUi = isPlain(raw.ui) ? raw.ui : {};
    const rawCapabilities = isPlain(raw.capabilities) ? raw.capabilities : {};
    const templateId = str(raw.templateId, 80);
    let type = str(raw.type || 'switch', 32).toLowerCase();
    if (!SUPPORTED_TYPES.has(type))
        type = 'switch';
    const id = str(raw.id || `device_${index + 1}`, 80) || `device_${index + 1}`;
    const behavior = {
        readOnly: !!rawBehavior.readOnly,
        favorite: !!rawBehavior.favorite,
        invert: !!rawBehavior.invert,
        commandMode: ['toggle', 'set', 'momentary'].includes(str(rawBehavior.commandMode, 20).toLowerCase())
            ? str(rawBehavior.commandMode, 20).toLowerCase()
            : 'toggle',
        pulseMs: finite(rawBehavior.pulseMs, 250, 50, 60000),
        staleAfterSec: finite(rawBehavior.staleAfterSec, 0, 0, 604800),
    };
    const capabilities = { ...rawCapabilities };
    const ui = {
        ...rawUi,
        unit: str(rawUi.unit ?? raw.unit, 32),
        precision: finite(rawUi.precision ?? raw.precision, 1, 0, 6),
    };
    const io = {};
    const legacyScene = isPlain(rawIo.scene) ? rawIo.scene : {};
    const sw = cleanIoPair(rawIo.switch, legacyScene.triggerId, legacyScene.triggerId);
    if (sw.readId || sw.writeId)
        io.switch = sw;
    const legacyDimmer = isPlain(rawIo.dimmer) ? rawIo.dimmer : {};
    const levelRaw = isPlain(rawIo.level) ? rawIo.level : {};
    const levelRead = levelRaw.readId || legacyDimmer.readId || legacyDimmer.levelId;
    const levelWrite = levelRaw.writeId || legacyDimmer.writeId || legacyDimmer.levelId;
    if (levelRead || levelWrite || type === 'dimmer' || type === 'blind' || type === 'color') {
        io.level = {
            readId: nullableId(levelRead),
            writeId: nullableId(levelWrite || levelRead),
            min: type === 'blind' ? 0 : finite(levelRaw.min ?? legacyDimmer.min, 0),
            max: type === 'blind' ? 100 : finite(levelRaw.max ?? legacyDimmer.max, 100),
            step: finite(levelRaw.step ?? legacyDimmer.step, 1, 0.000001),
        };
        if (io.level.max < io.level.min)
            [io.level.min, io.level.max] = [io.level.max, io.level.min];
    }
    const colorRaw = isPlain(rawIo.color) ? rawIo.color : {};
    const colorRead = colorRaw.readId || colorRaw.rgbId;
    const colorWrite = colorRaw.writeId || colorRaw.rgbId || colorRead;
    if (colorRead || colorWrite || type === 'color') {
        io.color = {
            readId: nullableId(colorRead),
            writeId: nullableId(colorWrite),
            format: ['hex', 'rgb', 'int', 'integer', 'number'].includes(str(colorRaw.format || colorRaw.mode, 16).toLowerCase())
                ? str(colorRaw.format || colorRaw.mode, 16).toLowerCase()
                : 'hex',
        };
    }
    const whiteRaw = isPlain(rawIo.white) ? rawIo.white : {};
    const wwRead = whiteRaw.readId || colorRaw.whiteReadId || colorRaw.wwId;
    const wwWrite = whiteRaw.writeId || colorRaw.whiteWriteId || colorRaw.wwId || wwRead;
    if (wwRead || wwWrite || colorRaw.supportsWarmWhite || colorRaw.supportsColdWhite) {
        io.white = {
            readId: nullableId(wwRead),
            writeId: nullableId(wwWrite),
            min: finite(whiteRaw.min, 0),
            max: finite(whiteRaw.max, 100),
            step: finite(whiteRaw.step, 1, 0.000001),
        };
    }
    const tempRaw = isPlain(rawIo.colorTemperature) ? rawIo.colorTemperature : {};
    const tempRead = tempRaw.readId || colorRaw.temperatureReadId || colorRaw.colorTemperatureId || legacyDimmer.colorTemperatureId;
    const tempWrite = tempRaw.writeId || colorRaw.temperatureWriteId || colorRaw.colorTemperatureId || legacyDimmer.colorTemperatureId || tempRead;
    if (tempRead || tempWrite || templateId === 'dimmer_tw') {
        io.colorTemperature = {
            readId: nullableId(tempRead),
            writeId: nullableId(tempWrite),
            min: finite(tempRaw.min, 2000, 1000, 20000),
            max: finite(tempRaw.max, 6500, 1000, 20000),
            step: finite(tempRaw.step, 100, 1, 5000),
        };
        if (io.colorTemperature.max < io.colorTemperature.min) {
            [io.colorTemperature.min, io.colorTemperature.max] = [io.colorTemperature.max, io.colorTemperature.min];
        }
    }
    const legacyBlind = isPlain(rawIo.blind) ? rawIo.blind : {};
    const coverRaw = isPlain(rawIo.cover) ? rawIo.cover : {};
    if (type === 'blind' || Object.keys(coverRaw).length || Object.keys(legacyBlind).length) {
        const positionReadId = nullableId(coverRaw.positionId
            || coverRaw.readId
            || legacyBlind.posId
            || (io.level && io.level.readId));
        const positionWriteId = nullableId(coverRaw.positionWriteId
            || coverRaw.writeId
            || legacyBlind.posWriteId
            || (io.level && io.level.writeId)
            || positionReadId);
        io.cover = {
            positionId: positionReadId,
            positionWriteId,
            upId: nullableId(coverRaw.upId || legacyBlind.upId),
            downId: nullableId(coverRaw.downId || legacyBlind.downId),
            stopId: nullableId(coverRaw.stopId || legacyBlind.stopId),
            tiltReadId: nullableId(coverRaw.tiltReadId || coverRaw.slatsReadId || legacyBlind.tiltId),
            tiltWriteId: nullableId(coverRaw.tiltWriteId || coverRaw.slatsWriteId || legacyBlind.tiltId),
            movingId: nullableId(coverRaw.movingId),
            directionId: nullableId(coverRaw.directionId),
            lockId: nullableId(coverRaw.lockId),
            windAlarmId: nullableId(coverRaw.windAlarmId),
            rainAlarmId: nullableId(coverRaw.rainAlarmId),
            frostAlarmId: nullableId(coverRaw.frostAlarmId),
            actionId: nullableId(coverRaw.actionId),
            actionMap: isPlain(coverRaw.actionMap) ? { ...coverRaw.actionMap } : undefined,
        };
        // Historische Blind-/Cover-Konfigurationen hielten die Position nur unter
        // `io.cover.positionId`. Die Runtime liest und schreibt die Prozentposition
        // jedoch über den allgemeinen Level-Vertrag. Beide Ansichten werden daher
        // hier bewusst zusammengeführt, statt einen scheinbar vollständigen, aber
        // funktionslosen Rollladen anzulegen.
        io.level = isPlain(io.level) ? io.level : { min: 0, max: 100, step: 1 };
        io.level.readId = nullableId(io.level.readId || positionReadId);
        io.level.writeId = nullableId(io.level.writeId || positionWriteId || positionReadId);
        io.level.min = 0;
        io.level.max = 100;
        io.level.step = finite(io.level.step, 1, 0.000001);
    }
    const legacyRtr = isPlain(rawIo.rtr) ? rawIo.rtr : {};
    const climateRaw = isPlain(rawIo.climate) ? rawIo.climate : {};
    if (type === 'rtr' || Object.keys(climateRaw).length || Object.keys(legacyRtr).length) {
        io.climate = {
            currentTempId: nullableId(climateRaw.currentTempId || legacyRtr.tempId),
            setpointId: nullableId(climateRaw.setpointId || legacyRtr.setId),
            modeId: nullableId(climateRaw.modeId || legacyRtr.modeId),
            humidityId: nullableId(climateRaw.humidityId || legacyRtr.humidityId),
            powerId: nullableId(climateRaw.powerId),
            fanSpeedId: nullableId(climateRaw.fanSpeedId),
            swingId: nullableId(climateRaw.swingId),
            demandId: nullableId(climateRaw.demandId),
            windowId: nullableId(climateRaw.windowId),
            errorId: nullableId(climateRaw.errorId),
            minSetpoint: finite(climateRaw.minSetpoint, 15, -50, 100),
            maxSetpoint: finite(climateRaw.maxSetpoint, 30, -50, 100),
            step: finite(climateRaw.step, 0.5, 0.1, 10),
        };
        if (io.climate.maxSetpoint < io.climate.minSetpoint) {
            [io.climate.minSetpoint, io.climate.maxSetpoint] = [io.climate.maxSetpoint, io.climate.minSetpoint];
        }
    }
    const playerRaw = isPlain(rawIo.player) ? rawIo.player : {};
    if (type === 'player' || Object.keys(playerRaw).length) {
        io.player = {
            playingId: nullableId(playerRaw.playingId),
            titleId: nullableId(playerRaw.titleId),
            artistId: nullableId(playerRaw.artistId),
            sourceId: nullableId(playerRaw.sourceId || playerRaw.albumId),
            coverId: nullableId(playerRaw.coverId),
            volumeReadId: nullableId(playerRaw.volumeReadId || playerRaw.volumeId),
            volumeWriteId: nullableId(playerRaw.volumeWriteId || playerRaw.volumeId || playerRaw.volumeReadId),
            volumeMin: finite(playerRaw.volumeMin, 0),
            volumeMax: finite(playerRaw.volumeMax, 100),
            toggleId: nullableId(playerRaw.toggleId),
            playId: nullableId(playerRaw.playId),
            pauseId: nullableId(playerRaw.pauseId),
            stopId: nullableId(playerRaw.stopId),
            nextId: nullableId(playerRaw.nextId),
            prevId: nullableId(playerRaw.prevId),
            stationId: nullableId(playerRaw.stationId),
            playlistId: nullableId(playerRaw.playlistId),
            muteReadId: nullableId(playerRaw.muteReadId || playerRaw.muteId),
            muteWriteId: nullableId(playerRaw.muteWriteId || playerRaw.muteId || playerRaw.muteReadId),
            powerReadId: nullableId(playerRaw.powerReadId || playerRaw.powerId),
            powerWriteId: nullableId(playerRaw.powerWriteId || playerRaw.powerId || playerRaw.powerReadId),
            seekReadId: nullableId(playerRaw.seekReadId || playerRaw.seekId),
            seekWriteId: nullableId(playerRaw.seekWriteId || playerRaw.seekId || playerRaw.seekReadId),
            seekMin: finite(playerRaw.seekMin, 0),
            seekMax: finite(playerRaw.seekMax, 100),
            seekStep: finite(playerRaw.seekStep, 1, 0.000001),
            shuffleId: nullableId(playerRaw.shuffleId),
            repeatId: nullableId(playerRaw.repeatId),
            ttsWriteId: nullableId(playerRaw.ttsWriteId || playerRaw.ttsId),
        };
        if (io.player.volumeMax < io.player.volumeMin) {
            [io.player.volumeMin, io.player.volumeMax] = [io.player.volumeMax, io.player.volumeMin];
        }
        if (io.player.seekMax < io.player.seekMin) {
            [io.player.seekMin, io.player.seekMax] = [io.player.seekMax, io.player.seekMin];
        }
    }
    const sensorRaw = isPlain(rawIo.sensor) ? rawIo.sensor : {};
    if (type === 'sensor' || Object.keys(sensorRaw).length) {
        const templateValueSpec = Object.prototype.hasOwnProperty.call(WRITABLE_VALUE_TEMPLATES, templateId.toLowerCase())
            ? WRITABLE_VALUE_TEMPLATES[templateId.toLowerCase()]
            : null;
        io.sensor = {
            readId: nullableId(sensorRaw.readId),
            writeId: nullableId(sensorRaw.writeId || (rawBehavior.readOnly === false ? sensorRaw.readId : null)),
            valueType: ['number', 'integer', 'boolean', 'string'].includes(str(sensorRaw.valueType, 20).toLowerCase())
                ? str(sensorRaw.valueType, 20).toLowerCase()
                : (templateValueSpec ? templateValueSpec.valueType : 'number'),
            min: finite(sensorRaw.min, templateValueSpec ? templateValueSpec.min : -1000000000),
            max: finite(sensorRaw.max, templateValueSpec ? templateValueSpec.max : 1000000000),
            step: finite(sensorRaw.step, templateValueSpec ? templateValueSpec.step : 1, 0.000001),
        };
        if (io.sensor.max < io.sensor.min)
            [io.sensor.min, io.sensor.max] = [io.sensor.max, io.sensor.min];
    }
    const cameraRaw = isPlain(rawIo.camera) ? rawIo.camera : {};
    if (type === 'camera' || Object.keys(cameraRaw).length) {
        io.camera = {
            snapshotUrl: str(cameraRaw.snapshotUrl || cameraRaw.url, 2048),
            liveUrl: str(cameraRaw.liveUrl, 2048),
            refreshMs: finite(cameraRaw.refreshMs ?? (Number(cameraRaw.refreshSec) * 1000), 5000, 250, 3600000),
        };
    }
    const widgetRaw = isPlain(rawIo.widget) ? rawIo.widget : {};
    if (type === 'widget' || Object.keys(widgetRaw).length) {
        io.widget = {
            kind: str(widgetRaw.kind, 20) || 'iframe',
            url: str(widgetRaw.url || widgetRaw.iframeUrl, 2048),
            openUrl: str(widgetRaw.openUrl, 2048),
            embed: !!widgetRaw.embed,
            height: finite(widgetRaw.height, 260, 120, 2000),
            label: str(widgetRaw.label, 160),
        };
    }
    const contract = normalizeTemplateContract(templateId, type, behavior, capabilities, io, ui);
    type = contract.type;
    if (type === 'camera' || type === 'widget')
        contract.behavior.readOnly = true;
    if (type === 'scene' && contract.behavior.commandMode === 'toggle')
        contract.behavior.commandMode = 'momentary';
    if (type === 'sensor' && !(contract.io.sensor && contract.io.sensor.writeId)) {
        contract.behavior.readOnly = true;
    }
    return {
        ...raw,
        id,
        alias: str(raw.alias || raw.name || id, 160) || id,
        type,
        templateId: templateId || undefined,
        roomId: nullableId(raw.roomId),
        floorId: nullableId(raw.floorId),
        functionId: nullableId(raw.functionId),
        icon: str(raw.icon, 80),
        size: ['s', 'm', 'l', 'xl'].includes(str(raw.size, 8).toLowerCase()) ? str(raw.size, 8).toLowerCase() : 'm',
        order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : undefined,
        behavior: contract.behavior,
        capabilities: contract.capabilities,
        ui: contract.ui,
        io: contract.io,
        stations: Array.isArray(raw.stations) ? raw.stations : [],
        playlists: Array.isArray(raw.playlists) ? raw.playlists : [],
    };
}
/**
 * Code-Teil: normalizeSceneActionKind
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeSceneActionKind(value) {
    const raw = str(value || 'switch', 40).toLowerCase();
    const aliases = {
        rtrsetpoint: 'rtrsetpoint',
        climate_setpoint: 'rtrsetpoint',
        cct: 'colortemperature',
        color_temperature: 'colortemperature',
        player_volume: 'playervolume',
        player_seek: 'playerseek',
        player_mute: 'playermute',
        player_power: 'playerpower',
        player_tts: 'playertts',
        player_shuffle: 'playershuffle',
        player_repeat: 'playerrepeat',
        player_station: 'playerstation',
        player_playlist: 'playerplaylist',
        cover_tilt: 'covertilt',
        climate_power: 'climatepower',
        climate_mode: 'climatemode',
        climate_fan: 'climatefan',
        climate_swing: 'climateswing',
    };
    return aliases[raw] || raw;
}
/**
 * Code-Teil: normalizeSmartHomeScene
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeSmartHomeScene(input, index = 0) {
    const raw = isPlain(input) ? input : {};
    const id = str(raw.id || `scene_${index + 1}`, 80) || `scene_${index + 1}`;
    return {
        ...raw,
        id,
        alias: str(raw.alias || raw.name || id, 160) || id,
        icon: str(raw.icon, 80),
        roomId: nullableId(raw.roomId),
        floorId: nullableId(raw.floorId),
        functionId: nullableId(raw.functionId),
        order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index,
        ui: isPlain(raw.ui) ? { ...raw.ui } : { size: 'm' },
        behavior: isPlain(raw.behavior) ? { ...raw.behavior } : { favorite: false },
        actions: (Array.isArray(raw.actions) ? raw.actions : []).map((action, actionIndex) => {
            const row = isPlain(action) ? action : {};
            const kind = normalizeSceneActionKind(row.kind || row.type || 'switch');
            const value = Object.prototype.hasOwnProperty.call(row, 'value')
                ? row.value
                : (Object.prototype.hasOwnProperty.call(row, 'val') ? row.val : undefined);
            return {
                ...row,
                id: str(row.id || `${id}_action_${actionIndex + 1}`, 120),
                deviceId: nullableId(row.deviceId || row.idDevice || row.targetId),
                kind,
                value,
            };
        }),
    };
}
/**
 * Code-Teil: sceneActionTargetAvailable
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function sceneActionTargetAvailable(dev, kind, value) {
    const io = dev && dev.io ? dev.io : {};
    const normalized = normalizeSceneActionKind(kind);
    if (normalized === 'switch' || normalized === 'on' || normalized === 'off')
        return !!(io.switch && io.switch.writeId);
    if (normalized === 'level')
        return !!(io.level && io.level.writeId);
    if (normalized === 'covertilt')
        return !!(io.cover && io.cover.tiltWriteId);
    if (normalized === 'cover') {
        const action = typeof value === 'string' ? value.trim().toLowerCase() : value;
        if (typeof action === 'string' && ['up', 'down', 'stop'].includes(action)) {
            const cover = io.cover || {};
            if (action === 'up')
                return !!(cover.upId || cover.actionId);
            if (action === 'down')
                return !!(cover.downId || cover.actionId);
            return !!(cover.stopId || cover.actionId);
        }
        return !!(io.level && io.level.writeId);
    }
    if (normalized === 'rtrsetpoint')
        return !!(io.climate && io.climate.setpointId);
    if (normalized === 'color')
        return !!(io.color && io.color.writeId);
    if (normalized === 'white')
        return !!(io.white && io.white.writeId);
    if (normalized === 'colortemperature')
        return !!(io.colorTemperature && io.colorTemperature.writeId);
    if (normalized === 'climatepower')
        return !!(io.climate && io.climate.powerId);
    if (normalized === 'climatemode')
        return !!(io.climate && io.climate.modeId);
    if (normalized === 'climatefan')
        return !!(io.climate && io.climate.fanSpeedId);
    if (normalized === 'climateswing')
        return !!(io.climate && io.climate.swingId);
    if (normalized === 'value')
        return !!(io.sensor && io.sensor.writeId);
    if (normalized === 'playervolume')
        return !!(io.player && io.player.volumeWriteId);
    if (normalized === 'playerseek')
        return !!(io.player && io.player.seekWriteId);
    if (normalized === 'playermute')
        return !!(io.player && io.player.muteWriteId);
    if (normalized === 'playerpower')
        return !!(io.player && io.player.powerWriteId);
    if (normalized === 'playertts')
        return !!(io.player && io.player.ttsWriteId);
    if (normalized === 'playershuffle')
        return !!(io.player && io.player.shuffleId);
    if (normalized === 'playerrepeat')
        return !!(io.player && io.player.repeatId);
    if (normalized === 'playerstation')
        return !!(io.player && io.player.stationId);
    if (normalized === 'playerplaylist')
        return !!(io.player && io.player.playlistId);
    if (normalized === 'player') {
        const action = str(value, 40).toLowerCase();
        const player = io.player || {};
        if (action === 'play')
            return !!(player.playId || (player.toggleId && player.playingId));
        if (action === 'pause')
            return !!(player.pauseId || (player.toggleId && player.playingId));
        if (action === 'stop')
            return !!player.stopId;
        if (action === 'next')
            return !!player.nextId;
        if (action === 'prev' || action === 'previous')
            return !!player.prevId;
        return false;
    }
    return false;
}
/**
 * Code-Teil: normalizeSmartHomeConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeSmartHomeConfig(input) {
    const raw = isPlain(input) ? input : {};
    return {
        ...raw,
        version: Number.isFinite(Number(raw.version)) ? Number(raw.version) : 3,
        floors: Array.isArray(raw.floors) ? raw.floors : [],
        rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
        functions: Array.isArray(raw.functions) ? raw.functions : [],
        devices: (Array.isArray(raw.devices) ? raw.devices : []).map((row, idx) => normalizeSmartHomeDevice(row, idx)),
        scenes: (Array.isArray(raw.scenes) ? raw.scenes : []).map((row, idx) => normalizeSmartHomeScene(row, idx)),
        pages: Array.isArray(raw.pages) ? raw.pages : [],
        meta: isPlain(raw.meta) ? raw.meta : {},
    };
}
/**
 * Code-Teil: validateSmartHomeConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function validateSmartHomeConfig(input) {
    const config = normalizeSmartHomeConfig(input);
    const errors = [];
    const warnings = [];
    const seen = new Set();
/**
 * Code-Teil: push
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const push = (target, code, message, path, deviceId) => {
        target.push(deviceId ? { code, message, path, deviceId } : { code, message, path });
    };
    config.devices.forEach((dev, index) => {
        const base = `devices[${index}]`;
        if (!dev.id)
            push(errors, 'DEVICE_ID_MISSING', 'Geräte-ID fehlt.', `${base}.id`);
        else if (seen.has(dev.id))
            push(errors, 'DEVICE_ID_DUPLICATE', `Geräte-ID "${dev.id}" ist doppelt.`, `${base}.id`, dev.id);
        else
            seen.add(dev.id);
        if (!SUPPORTED_TYPES.has(dev.type))
            push(errors, 'DEVICE_TYPE_INVALID', `Unbekannter Gerätetyp "${dev.type}".`, `${base}.type`, dev.id);
        const io = dev.io || {};
        const beh = dev.behavior || {};
        if (beh.commandMode === 'momentary' && !(io.switch && io.switch.writeId)) {
            push(warnings, 'MOMENTARY_WRITE_MISSING', 'Taster/Trigger hat noch keinen Schreib-Datenpunkt.', `${base}.io.switch.writeId`, dev.id);
        }
        if (dev.type === 'sensor' && !beh.readOnly && !(io.sensor && io.sensor.writeId)) {
            push(errors, 'VALUE_WRITE_MISSING', 'Beschreibbarer Wertgeber benötigt einen Write-Datenpunkt.', `${base}.io.sensor.writeId`, dev.id);
        }
        if ((dev.type === 'dimmer' || dev.type === 'blind') && io.level && io.level.max <= io.level.min) {
            push(errors, 'LEVEL_RANGE_INVALID', 'Maximalwert muss größer als Minimalwert sein.', `${base}.io.level`, dev.id);
        }
        if (dev.type === 'rtr' && io.climate && io.climate.maxSetpoint <= io.climate.minSetpoint) {
            push(errors, 'CLIMATE_RANGE_INVALID', 'Maximaler Sollwert muss größer als minimaler Sollwert sein.', `${base}.io.climate`, dev.id);
        }
        if (dev.type === 'player' && io.player) {
            if (io.player.volumeMax <= io.player.volumeMin) {
                push(errors, 'PLAYER_VOLUME_RANGE_INVALID', 'Maximale Lautstärke muss größer als minimale Lautstärke sein.', `${base}.io.player`, dev.id);
            }
            if (io.player.seekMax <= io.player.seekMin) {
                push(errors, 'PLAYER_SEEK_RANGE_INVALID', 'Maximale Wiedergabeposition muss größer als minimale Wiedergabeposition sein.', `${base}.io.player`, dev.id);
            }
        }
        if (dev.type === 'widget') {
            const w = io.widget || {};
            const url = str(w.openUrl || w.url, 2048);
            if (url && !/^(https?:\/\/|\/)/i.test(url)) {
                push(errors, 'WIDGET_URL_INVALID', 'Widget-/URL-Aufruf muss mit http://, https:// oder / beginnen.', `${base}.io.widget`, dev.id);
            }
        }
        const hasAnyRead = collectIds(io, 'read').length > 0;
        const hasAnyWrite = collectIds(io, 'write').length > 0;
        if (!hasAnyRead && !hasAnyWrite && dev.type !== 'widget' && dev.type !== 'camera') {
            push(warnings, 'DEVICE_NOT_MAPPED', 'Gerät ist noch keinem Datenpunkt zugeordnet und bleibt inaktiv.', `${base}.io`, dev.id);
        }
    });
    const deviceById = new Map(config.devices.map((device) => [device.id, device]));
    const sceneById = new Map();
    config.scenes.forEach((scene, index) => {
        const base = `scenes[${index}]`;
        if (!scene.id)
            push(errors, 'SCENE_ID_MISSING', 'Szenen-ID fehlt.', `${base}.id`);
        else if (sceneById.has(scene.id))
            push(errors, 'SCENE_ID_DUPLICATE', `Szenen-ID "${scene.id}" ist doppelt.`, `${base}.id`);
        else
            sceneById.set(scene.id, scene);
        if (!Array.isArray(scene.actions) || scene.actions.length === 0) {
            push(warnings, 'SCENE_EMPTY', `Szene "${scene.alias || scene.id}" enthält keine Aktion.`, `${base}.actions`);
        }
    });
    config.scenes.forEach((scene, sceneIndex) => {
        const actions = Array.isArray(scene.actions) ? scene.actions : [];
        actions.forEach((action, actionIndex) => {
            const base = `scenes[${sceneIndex}].actions[${actionIndex}]`;
            const kind = normalizeSceneActionKind(action.kind);
            if (!SUPPORTED_SCENE_ACTIONS.has(kind)) {
                push(errors, 'SCENE_ACTION_INVALID', `Unbekannte Szenenaktion "${action.kind}".`, `${base}.kind`, scene.id);
                return;
            }
            if (kind === 'scene') {
                const targetSceneId = str(action.value || action.sceneId, 80);
                if (!targetSceneId)
                    push(errors, 'SCENE_TARGET_MISSING', 'Verschachtelte Szene benötigt eine Ziel-Szenen-ID.', `${base}.value`, scene.id);
                else if (!sceneById.has(targetSceneId))
                    push(errors, 'SCENE_TARGET_UNKNOWN', `Zielszene "${targetSceneId}" existiert nicht.`, `${base}.value`, scene.id);
                return;
            }
            const deviceId = str(action.deviceId, 80);
            const dev = deviceById.get(deviceId);
            if (!deviceId)
                push(errors, 'SCENE_DEVICE_MISSING', 'Szenenaktion benötigt ein Zielgerät.', `${base}.deviceId`, scene.id);
            else if (!dev)
                push(errors, 'SCENE_DEVICE_UNKNOWN', `Zielgerät "${deviceId}" existiert nicht.`, `${base}.deviceId`, scene.id);
            else if (dev.behavior && dev.behavior.readOnly)
                push(errors, 'SCENE_DEVICE_READONLY', `Zielgerät "${dev.alias || deviceId}" ist nur lesbar.`, `${base}.deviceId`, scene.id);
            else if (!sceneActionTargetAvailable(dev, kind, action.value)) {
                push(errors, 'SCENE_ACTION_UNMAPPED', `Aktion "${kind}" ist für "${dev.alias || deviceId}" keinem beschreibbaren Datenpunkt zugeordnet.`, base, scene.id);
            }
        });
    });
    const sceneAdjacency = new Map(Array.from(sceneById.keys()).map((id) => [id, []]));
    for (const scene of config.scenes) {
        for (const action of Array.isArray(scene.actions) ? scene.actions : []) {
            if (normalizeSceneActionKind(action.kind) !== 'scene')
                continue;
            const target = str(action.value || action.sceneId, 80);
            if (target && sceneAdjacency.has(scene.id) && sceneAdjacency.has(target))
                sceneAdjacency.get(scene.id).push(target);
        }
    }
    const sceneVisiting = new Set();
    const sceneVisited = new Set();
    const sceneStack = [];
/**
 * Code-Teil: visitScene
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const visitScene = (id) => {
        if (sceneVisiting.has(id)) {
            const at = sceneStack.indexOf(id);
            const cycle = (at >= 0 ? sceneStack.slice(at) : sceneStack.slice()).concat(id);
            push(errors, 'SCENE_CYCLE', `Unzulässige Szenenschleife: ${cycle.join(' → ')}.`, 'scenes', id);
            return;
        }
        if (sceneVisited.has(id))
            return;
        sceneVisiting.add(id);
        sceneStack.push(id);
        for (const next of sceneAdjacency.get(id) || [])
            visitScene(next);
        sceneStack.pop();
        sceneVisiting.delete(id);
        sceneVisited.add(id);
    };
    for (const id of sceneAdjacency.keys())
        visitScene(id);
    return { ok: errors.length === 0, config, errors, warnings };
}
/**
 * Code-Teil: collectIds
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function collectIds(io, mode) {
    const out = [];
    const readableKeys = new Set([
        'positionid', 'playingid', 'titleid', 'artistid', 'sourceid', 'coverid', 'humidityid',
        'currenttempid', 'modeid', 'movingid', 'directionid', 'lockid', 'demandid', 'windowid',
        'errorid', 'powerid', 'fanspeedid', 'swingid', 'setpointid', 'shuffleid', 'repeatid',
    ]);
    const writableKeys = new Set([
        'positionwriteid', 'upid', 'downid', 'stopid', 'actionid', 'toggleid', 'playid', 'pauseid',
        'nextid', 'previd', 'stationid', 'playlistid', 'setpointid', 'powerid', 'fanspeedid',
        'swingid', 'shuffleid', 'repeatid', 'ttswriteid',
    ]);
/**
 * Code-Teil: visit
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const visit = (value, key) => {
        if (!value || typeof value !== 'object')
            return;
        for (const [childKey, childValue] of Object.entries(value)) {
            if (childValue && typeof childValue === 'object')
                visit(childValue, childKey);
            else if (typeof childValue === 'string' && childValue.trim()) {
                const lower = String(childKey || key || '').toLowerCase();
                const matches = mode === 'read'
                    ? (lower.includes('readid') || lower.includes('alarmid') || readableKeys.has(lower))
                    : (lower.includes('writeid') || writableKeys.has(lower));
                if (matches)
                    out.push(childValue.trim());
            }
        }
    };
    visit(io, '');
    return Array.from(new Set(out));
}
module.exports = {
    SUPPORTED_SMARTHOME_TYPES: Array.from(SUPPORTED_TYPES),
    WRITABLE_VALUE_TEMPLATES,
    normalizeSmartHomeDevice,
    normalizeSmartHomeConfig,
    validateSmartHomeConfig,
    normalizeSceneActionKind,
    sceneActionTargetAvailable,
    collectSmartHomeIds: collectIds,
};
