#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-ai-advisor-payload-productive.js
 *
 * Zweck:
 * Prüft, dass der KI-Berater ab 0.7.115 seinen Publish-Payload produktiv über den
 * TypeScript-Spiegel normalisiert, aber weiterhin JS-Fallback besitzt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function fail(msg) { console.error('[ai-advisor-payload-productive] ERROR: ' + msg); process.exit(1); }
function read(rel) { const f = path.join(root, rel); if (!fs.existsSync(f)) fail('Pflichtdatei fehlt: ' + rel); return fs.readFileSync(f, 'utf8'); }
function must(rel, marker, label) { if (!read(rel).includes(marker)) fail(`${rel}: fehlt ${label}`); }

must('src-ts/ems/ai-advisor/ai-advisor-payload.ts', 'buildAiAdvisorPublishPayload', 'TS-Payload-Builder');
must('src-ts/ems/ai-advisor/ai-advisor-payload.ts', 'KI-Berater bleibt beratend', 'Sicherheitskommentar');
must('lib/ts-mirrors/ems/ai-advisor/ai-advisor-payload.js', 'buildAiAdvisorPublishPayload', 'JS-Spiegel-Export');
must('ems/modules/ai-advisor.js', 'aiAdvisorPayloadTsMirror', 'produktiver TS-Mirror-Load');
must('ems/modules/ai-advisor.js', 'buildAiAdvisorPublishPayload', 'produktive TS-Nutzung');
must('ems/modules/ai-advisor.js', 'Fallback auf JS-Payload', 'JS-Fallback-Log');
must('ems/modules/ai-advisor.js', 'tsPayload', 'Payload-Diagnose im Snapshot');

const mod = require(path.join(root, 'lib/ts-mirrors/ems/ai-advisor/ai-advisor-payload.js'));
const payload = mod.buildAiAdvisorPublishPayload({ suggestions: [{ title: 'Test', text: '0 ist gültig', severity: 'warning', priority: '91' }], score: '82', showInLive: true, learning: { anomalyText: '', forecastQualityPct: 75 } });
if (!payload || !payload.ok || payload.count !== 1) fail('Payload count/ok falsch.');
if (!payload.top || payload.top.title !== 'Test' || payload.top.priority !== 91) fail('Top-Vorschlag nicht korrekt normalisiert.');
if (!payload.suggestionsJson.includes('0 ist gültig')) fail('suggestionsJson enthält Vorschlag nicht.');
console.log('[ai-advisor-payload-productive] OK: KI-Berater-Payload nutzt TS produktiv mit JS-Fallback.');
