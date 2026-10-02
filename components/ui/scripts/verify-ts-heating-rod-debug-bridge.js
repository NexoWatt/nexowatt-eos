#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-heating-rod-debug-bridge.js
 *
 * Zweck:
 * Prüft 0.7.116: Der alte Heizstab-JS-Referenzpfad wird nur noch als kompakte
 * Debug-Brücke und harte Notbremse geführt.
 */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function fail(msg){console.error('[heating-rod-debug-bridge] ERROR: '+msg);process.exit(1);}
function must(file,marker,label){if(!read(file).includes(marker)) fail(`${file}: fehlt ${label||marker}`);}
const js=read('ems/modules/heating-rod-control.js');
const count=(js.match(/_buildHeatingRodTsLegacyDebugBridgeState/g)||[]).length;
if(count < 2) fail('Debug-Bridge-Builder fehlt.');
if(count > 3) fail('Debug-Bridge-Builder ist mehrfach/dupliziert vorhanden.');
must('ems/modules/heating-rod-control.js','heatingRod.summary.tsLegacyDebugBridgeJson','Debug-Bridge State');
must('ems/modules/heating-rod-control.js','heating-rod-legacy-js-debug-bridge-v1','Debug-Bridge Version v1');
must('ems/modules/heating-rod-control.js','debugBridgeActive','Debug-Bridge Aktivmarker');
must('ems/modules/heating-rod-control.js','fullReferencePayloadAllowed','vollständige JS-Referenzpayload-Regel');
must('ems/modules/heating-rod-control.js','debugPayloadSuppressed','Debug-Payload wird komprimiert');
must('ems/modules/heating-rod-control.js','legacy-reference-full-mismatch-list','entfernbare vollständige Mismatchliste');
must('ems/modules/heating-rod-control.js','heatingRod.summary.legacyJsReferenceJson', 'Legacy-Alias bleibt vorhanden');
must('www/ems-apps.js','JS-Debug-Brücke','App-Center zeigt Debug-Brücke');
must('www/ems-apps.js','JS-Debug-Nutzlast','App-Center zeigt Debug-Nutzlast');
console.log('[heating-rod-debug-bridge] OK: Alter JS-Heizstabpfad ist auf Debug-Brücke/Notfallback vorbereitet.');
