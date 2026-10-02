// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-ai-advisor-payload-productive.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-ai-advisor-payload-productive.js
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
 * Original-Hash: b1f944ffc683f1a9d78b1e8eeb712e24154206e19784ca95c1d9113fcb53828d
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
 * Datei: scripts/verify-ts-ai-advisor-payload-productive.js
 *
 * Zweck:
 * Prüft, dass der KI-Berater ab 0.7.115 seinen Publish-Payload produktiv über den
 * TypeScript-Spiegel normalisiert, aber weiterhin JS-Fallback besitzt.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(msg) { console.error('[ai-advisor-payload-productive] ERROR: ' + msg); process.exit(1); }
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) { const f = path.join(root, rel); if (!fs.existsSync(f)) fail('Pflichtdatei fehlt: ' + rel); return fs.readFileSync(f, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
