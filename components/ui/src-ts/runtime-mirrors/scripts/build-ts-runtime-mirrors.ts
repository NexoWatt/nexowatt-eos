// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/build-ts-runtime-mirrors.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/build-ts-runtime-mirrors.js
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
 * Original-Hash: 5a04097f84c4bddc97c31f3295a26a334875d120260ceb90aa00e8fe25d948b6
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
 * Datei: scripts/build-ts-runtime-mirrors.js
 *
 * Zweck:
 * Baut parallele TypeScript-Spiegel für die vorhandenen JavaScript-Runtime-Dateien.
 *
 * Zusammenhang:
 * Dieser Schritt ist Teil der großen JS→TS-Migration. Die produktive Runtime bleibt
 * weiterhin JavaScript, aber zu jeder wichtigen JS-Datei entsteht eine gleichnamige
 * TS-Parallelquelle unter `src-ts/runtime-mirrors/`. Dadurch können wir später Datei
 * für Datei auf TypeScript umstellen, ohne die laufende Adapterlogik sofort zu ändern.
 *
 * Wichtig:
 * Diese Spiegel sind aktuell noch nicht produktiv. Sie enthalten bewusst `@ts-nocheck`,
 * weil der erste große Umbau nur Syntax, Struktur, Kommentare und Zuordnung absichert.
 * Die fachliche Typisierung folgt danach Schritt für Schritt pro Modul.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const TARGET_ROOT = path.join(ROOT, 'src-ts', 'runtime-mirrors');
const CHECK_ONLY = process.argv.includes('--check');

const EXCLUDE_PARTS = [
  'node_modules',
  'build-ts',
  'dist',
  'coverage',
  'admin/react/assets',
  'lib/ts-mirrors',
  'www/static/ts-mirrors',
  'src-admin-tab/node_modules',
  'src-ts',
  '.git',
];

const EXCLUDE_FILES = new Set([
  // Diese Datei wird bereits bewusst aus src-ts/scripts gebaut und gespiegelt.
  'scripts/publish-check-rules.js',
  'scripts/ts-scaffold-rules.js',
  // Eigener, selbstvalidierender Release-Runner; kein produktiver Adapter-Runtimepfad.
  'scripts/publish-check-runner.js',
  // RC73: reiner Release-/Diagnosevertragstest, keine produktive Adapter-Runtime.
  'scripts/verify-rc73-ems-admin-overview.js',
]);

/**
 * Code-Teil: MANUALLY_TYPED_MIRROR_SOURCES
 *
 * Zweck:
 * Einige große Runtime-Spiegel werden ab der TypeScript-Migration nicht mehr 1:1 aus
 * der JS-Datei überschrieben, weil dort bereits echte Typverträge ergänzt wurden.
 * Für diese Dateien prüft der Sync nur noch: Datei vorhanden, Original-Hash aktuell
 * und Migrationskommentar vorhanden.
 *
 * Zusammenhang:
 * `src-ts/runtime-mirrors/ems/modules/core-limits.ts`,
 * `src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts`,
 * `src-ts/runtime-mirrors/ems/modules/ai-advisor.ts` und
 * `src-ts/runtime-mirrors/www/history.ts` und
 * `src-ts/runtime-mirrors/www/smarthome.ts` und
 * `src-ts/runtime-mirrors/www/smarthome-config.ts` und
 * `src-ts/runtime-mirrors/www/ems-apps.ts` und
 * `src-ts/runtime-mirrors/www/app.ts` sind gezielt
 * typisierte Spiegel. Ein normales `sync:ts-runtime-mirrors` darf diese Arbeit nicht
 * wieder mit einer rohen Kopie überschreiben.
 */
const MANUALLY_TYPED_MIRROR_SOURCES = new Set([
  'main.js',
  'ems/modules/core-limits.js',
  'ems/modules/heating-rod-control.js',
  'ems/modules/ai-advisor.js',
  'www/history.js',
  'www/smarthome.js',
  'www/smarthome-config.js',
  'www/ems-apps.js',
  'www/app.js',
]);

/**
 * Code-Teil: toPosix
 *
 * Zweck:
 * Normalisiert Dateipfade auf `/`, damit Hashes, Manifest und Prüfungen unter Windows,
 * Linux und macOS gleich funktionieren.
 */
function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

/**
 * Code-Teil: sha256
 *
 * Zweck:
 * Bildet einen stabilen Hash der Original-JavaScript-Datei. Der Hash steht im TS-Spiegel
 * und erlaubt später die Prüfung, ob Quelle und Spiegel synchron sind.
 */
function sha256(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex');
}

/**
 * Code-Teil: walk
 *
 * Zweck:
 * Sammelt rekursiv alle JS-/JSX-Dateien, die echte Projektquelle sind. Generierte Bundles,
 * Mirrors, node_modules und Build-Artefakte werden bewusst ausgeschlossen.
 */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = toPosix(path.relative(ROOT, abs));
    if (EXCLUDE_PARTS.some((part) => rel === part || rel.startsWith(part + '/'))) continue;
    if (entry.isDirectory()) {
      walk(abs, out);
    } else if (entry.isFile() && (rel.endsWith('.js') || rel.endsWith('.jsx')) && !EXCLUDE_FILES.has(rel)) {
      out.push(rel);
    }
  }
  return out;
}

/**
 * Code-Teil: targetPathForSource
 *
 * Zweck:
 * Ordnet eine JS-Datei an die fachlich gleiche Stelle unter `src-ts/runtime-mirrors/`.
 * Der Spiegelpfad folgt dem Runtime-Pfad. Der alte versteckte `.nwcore`-Doppelbaum
 * wird seit 0.7.132 nicht mehr als Runtime-Quelle geführt.
 */
function targetPathForSource(rel) {
  const clean = toPosix(rel).replace(/^\.\//, '');
  if (clean.endsWith('.jsx')) return path.join(TARGET_ROOT, clean).replace(/\.jsx$/, '.tsx');
  return path.join(TARGET_ROOT, clean).replace(/\.js$/, '.ts');
}

/**
 * Code-Teil: commentForLine
 *
 * Zweck:
 * Erzeugt kleine, konkrete deutsche Kommentare vor wichtigen Funktions-/Klassenstellen.
 * Diese Kommentare sind bewusst allgemein genug, um automatisch erzeugt zu werden, aber
 * konkret genug, damit man später beim TS-Umbau schnell erkennt: Hier beginnt ein
 * wartbarer Code-Abschnitt.
 */
function commentForLine(line) {
  const trimmed = String(line || '').trim();
  let name = '';
  let kind = '';
  let m = trimmed.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (m) { name = m[1]; kind = 'Funktion'; }
  if (!name) {
    m = trimmed.match(/^class\s+([A-Za-z_$][\w$]*)\b/);
    if (m) { name = m[1]; kind = 'Klasse'; }
  }
  if (!name) {
    m = trimmed.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/);
    if (m) { name = m[1]; kind = 'Arrow-Funktion'; }
  }
  if (!name) return null;
  return `/**\n * Code-Teil: ${name}\n *\n * Zweck:\n * Automatisch markierter ${kind}-Abschnitt aus der ursprünglichen JavaScript-Datei.\n * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.\n *\n * Zusammenhang:\n * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,\n * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.\n */`;
}

/**
 * Code-Teil: addSectionComments
 *
 * Zweck:
 * Fügt in den TS-Spiegeln Abschnittskommentare vor Funktionen, Klassen und einfachen
 * Arrow-Funktionen ein. Banalzeilen werden nicht kommentiert, damit der Code nicht durch
 * unnötige Kommentare unlesbar wird.
 */
function addSectionComments(source) {
  const lines = String(source || '').split(/\r?\n/);
  const out = [];
  let previousWasComment = false;
  for (const line of lines) {
    const sectionComment = previousWasComment ? null : commentForLine(line);
    if (sectionComment) out.push(sectionComment);
    out.push(line);
    const t = line.trim();
    previousWasComment = t.startsWith('*') || t.startsWith('/**') || t.startsWith('//');
    if (!t) previousWasComment = false;
  }
  return out.join('\n');
}

/**
 * Code-Teil: buildMirrorText
 *
 * Zweck:
 * Baut den Inhalt einer TS-Spiegeldatei aus der JS-Quelle. Die Datei enthält Header,
 * Hash, Migrationshinweise, deutsche Kommentare und danach den ursprünglichen Code.
 */
function buildMirrorText(rel, jsText) {
  let body = String(jsText || '');
  // Shebangs dürfen in TS nur ganz vorne stehen. Da der Spiegel nicht direkt ausgeführt
  // wird, entfernen wir den Shebang und dokumentieren den Quellbezug im Header.
  body = body.replace(/^#!.*\r?\n/, '');
  body = addSectionComments(body);
  const hash = sha256(jsText);
  const header = `// @ts-nocheck\n/**\n * TypeScript-Parallelspiegel: ${rel}\n *\n * Zweck:\n * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.\n * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:\n * ${rel}\n *\n * Zusammenhang:\n * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und\n * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter\n * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.\n * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.\n * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.\n *\n * Wichtig für die Migration:\n * - Diese Datei enthält vorübergehend @ts-nocheck.\n * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.\n * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.\n *\n * Original-Hash: ${hash}\n */\n\n/**\n * Code-Teil: Runtime-Spiegel der kompletten Datei\n *\n * Zweck:\n * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.\n * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene\n * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.\n */\n\n`;
  return header + body.replace(/\s*$/, '') + '\n';
}

/**
 * Code-Teil: isManualTypedMirrorCurrent
 *
 * Zweck:
 * Prüft einen bereits gezielt typisierten Runtime-Spiegel, ohne ihn wieder mit der
 * rohen JS-Kopie zu überschreiben. So bleibt echte Typisierungsarbeit erhalten und der
 * Hash zeigt trotzdem, ob die produktive JS-Quelle seitdem verändert wurde.
 */
function isManualTypedMirrorCurrent(rel, targetAbs, jsText) {
  if (!fs.existsSync(targetAbs)) return false;
  const current = fs.readFileSync(targetAbs, 'utf8');
  const hash = sha256(jsText);
  const hasBase = current.includes(`Original-Hash: ${hash}`)
    && (current.includes('TypeScript-Migrationshinweis (DE)') || current.includes('Main Runtime-Migrationshinweis (DE)') || current.includes('History Runtime-Migrationshinweis (DE)') || current.includes('SmartHome Runtime-Migrationshinweis (DE)') || current.includes('SmartHomeConfig Runtime-Migrationshinweis (DE)') || current.includes('EmsApps Runtime-Migrationshinweis (DE)') || current.includes('App Runtime-Migrationshinweis (DE)'));
  if (!hasBase) return false;
  if (rel === 'main.js') {
    return current.includes('Main Runtime-Migrationshinweis (DE)')
      && current.includes('interface MainAdapterConfig')
      && current.includes('interface MainRuntimeInternals')
      && current.includes('class NexoWattVis extends utils.Adapter');
  }
  if (rel === 'ems/modules/core-limits.js') {
    return current.includes('type CoreLimitsAdapterLike')
      && current.includes('type CoreBudgetSnapshotLike');
  }
  if (rel === 'ems/modules/heating-rod-control.js') {
    return current.includes('type HeatingRodAdapterLike')
      && current.includes('type HeatingRodRuntimeDevice')
      && current.includes('class HeatingRodControlModule extends BaseModule');
  }
  if (rel === 'ems/modules/ai-advisor.js') {
    return current.includes('Ai-Advisor Runtime-Migrationshinweis (DE)')
      && current.includes('type AiAdvisorAdapterLike')
      && current.includes('type AiAdvisorSuggestion')
      && current.includes('class AiAdvisorModule extends BaseModule');
  }
  if (rel === 'www/history.js') {
    return current.includes('History Runtime-Migrationshinweis (DE)')
      && current.includes('interface HistoryApiResponse')
      && current.includes('interface HistoryReportVisibility')
      && current.includes('HistoryRuntimeApiResponse');
  }
  if (rel === 'www/smarthome.js') {
    return current.includes('SmartHome Runtime-Migrationshinweis (DE)')
      && current.includes('type SmartHomeDeviceType')
      && current.includes('interface SmartHomeDeviceView')
      && current.includes('interface SmartHomeApiDevicesResponse');
  }
  if (rel === 'www/smarthome-config.js') {
    return current.includes('SmartHomeConfig Runtime-Migrationshinweis (DE)')
      && current.includes('interface SmartHomeConfigRoot')
      && current.includes('interface SmartHomeConfigStateShape')
      && current.includes('SmartHome-Config-Browser-Runtime-Abschnitt');
  }
  if (rel === 'www/ems-apps.js') {
    return current.includes('EmsApps Runtime-Migrationshinweis (DE)')
      && current.includes('interface EmsAppsConfigRoot')
      && current.includes('interface EmsAppsDomRefs')
      && current.includes('EmsApps-Browser-Runtime-Abschnitt');
  }
  if (rel === 'www/app.js') {
    return current.includes('App Runtime-Migrationshinweis (DE)')
      && current.includes('interface AppEnergyFlowDisplaySnapshot')
      && current.includes('interface AppDashboardRuntimeState')
      && current.includes('App-Browser-Runtime-Abschnitt');
  }
  if (rel === 'www/app.js') {
    return current.includes('App Runtime-Migrationshinweis (DE)')
      && current.includes('interface AppConfigResponse')
      && current.includes('interface AppEnergyFlowDisplaySnapshot')
      && current.includes('App-Browser-Runtime-Abschnitt');
  }
  return true;
}


/**
 * Code-Teil: syncMirrors
 *
 * Zweck:
 * Schreibt oder prüft alle TS-Parallelspiegel. Im Check-Modus wird kein File geändert;
 * stattdessen bricht der Prozess ab, wenn ein Spiegel fehlt oder nicht synchron ist.
 */
function syncMirrors() {
  const sources = walk(ROOT).sort();
  const expectedTargets = new Set();
  const changed = [];
  for (const rel of sources) {
    const sourceAbs = path.join(ROOT, rel);
    const targetAbs = targetPathForSource(rel);
    const jsText = fs.readFileSync(sourceAbs, 'utf8');
    const next = buildMirrorText(rel, jsText);
    expectedTargets.add(toPosix(path.relative(ROOT, targetAbs)));

    if (MANUALLY_TYPED_MIRROR_SOURCES.has(rel)) {
      if (!isManualTypedMirrorCurrent(rel, targetAbs, jsText)) {
        changed.push(toPosix(path.relative(ROOT, targetAbs)));
        if (!CHECK_ONLY && !fs.existsSync(targetAbs)) {
          fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
          fs.writeFileSync(targetAbs, next, 'utf8');
        }
      }
      continue;
    }

    const current = fs.existsSync(targetAbs) ? fs.readFileSync(targetAbs, 'utf8') : null;
    if (current !== next) {
      changed.push(toPosix(path.relative(ROOT, targetAbs)));
      if (!CHECK_ONLY) {
        fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
        fs.writeFileSync(targetAbs, next, 'utf8');
      }
    }
  }

  // Entfernt stale Spiegel nur im Schreibmodus. Im Check-Modus melden wir sie als Fehler.
  const stale = [];
  if (fs.existsSync(TARGET_ROOT)) {
    for (const abs of walkTarget(TARGET_ROOT)) {
      const rel = toPosix(path.relative(ROOT, abs));
      if (!expectedTargets.has(rel)) stale.push(rel);
    }
  }
  if (stale.length && !CHECK_ONLY) {
    for (const rel of stale) fs.unlinkSync(path.join(ROOT, rel));
  }

  if (CHECK_ONLY && (changed.length || stale.length)) {
    console.error('[ts-runtime-mirrors] ERROR: Runtime-TS-Spiegel sind nicht synchron.');
    for (const rel of changed) console.error(' - abweichend/fehlend: ' + rel);
    for (const rel of stale) console.error(' - veraltet: ' + rel);
    console.error('Bitte `npm run sync:ts-runtime-mirrors` ausführen.');
    process.exit(1);
  }

  console.log(`[ts-runtime-mirrors] OK: ${sources.length} JS-/JSX-Dateien als TS-/TSX-Parallelspiegel ${CHECK_ONLY ? 'geprüft' : 'synchronisiert'}.`);
}

/**
 * Code-Teil: walkTarget
 *
 * Zweck:
 * Findet alle vorhandenen TS-Spiegel im Zielordner, damit veraltete Dateien erkannt
 * werden. Dadurch bleiben Git und VS Code später sauber.
 */
function walkTarget(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTarget(abs, out);
    else if (entry.isFile() && (abs.endsWith('.ts') || abs.endsWith('.tsx'))) out.push(abs);
  }
  return out;
}

syncMirrors();
