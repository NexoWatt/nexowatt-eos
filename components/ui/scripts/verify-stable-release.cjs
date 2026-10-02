#!/usr/bin/env node
'use strict';

/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft die zusammengehörigen Stable-Metadaten und dauerhaft eingebundene Regressionen.
 * Daten und Wirkung: Liest lokale Quellen, npm-Skripte und Artefaktmanifest; beendet bei Abweichungen mit Fehler.
 * Bei Änderungen: Neue Release-Dateien und Pflichtprüfungen eintragen. Kein Neubau, keine Neuversiegelung
 * und keine Hardwarezugriffe in diesem schnellen Prüfschritt der prepublishOnly-Kette.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fail = (message) => {
  console.error(`[stable-release] ERROR: ${message}`);
  process.exit(1);
};
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const ioPackage = readJson('io-package.json');
const webManifest = readJson('www/manifest.webmanifest');
const releaseManifest = readJson('scripts/release-artifact-manifest.json');
const version = String(pkg.version || '');
const stableDocPath = `docs/STABLE_${version.replace(/\./g, '_')}_RELEASE_DE.md`;

if (!/^[1-9]\d*\.\d+\.\d+$/.test(version)) {
  fail(`Version ist keine stabile SemVer ab 1.0.0: ${version || '<leer>'}`);
}
const aligned = {
  package: version,
  lock: String(lock.version || ''),
  lockRoot: String(lock.packages?.['']?.version || ''),
  ioPackage: String(ioPackage.common?.version || ''),
  webManifest: String(webManifest.version || ''),
  webAppVersion: String(webManifest.appVersion || ''),
  releaseManifest: String(releaseManifest.version || ''),
};
for (const [source, value] of Object.entries(aligned)) {
  if (value !== version) fail(`Versionskonflikt ${source}=${value || '<leer>'}, erwartet ${version}`);
}
if (releaseManifest.package !== pkg.name) fail('Release-Manifest enthält einen abweichenden Paketnamen.');
const newsVersions = Object.keys(ioPackage.common?.news || {});
if (!ioPackage.common?.news?.[version]) fail(`io-package.json enthält keinen News-Eintrag für ${version}.`);
if (newsVersions[0] !== version) fail(`Aktuelle Stable-Version ${version} ist nicht der erste News-Eintrag.`);
if (newsVersions.length > 7) fail(`io-package.json enthält ${newsVersions.length} News-Einträge; maximal 7 sind zulässig.`);

const files = Array.isArray(pkg.files) ? pkg.files : [];
for (const required of [
  stableDocPath,
  'scripts/verify-stable-release.cjs',
  'scripts/verify-stable-1.0.2-health-heartbeat.cjs',
  'scripts/verify-stable-1.0.3-home-appcenter-access.cjs',
  'scripts/verify-stable-1.0.4-auto-pv-phases.cjs',
  'scripts/verify-stable-1.0.5-storage-protection-telemetry.cjs',
  'scripts/verify-stable-1.0.6-dc-control.cjs',
  'lib/evcs-electrical-limits.js',
  'lib/notification-mail.js',
  'lib/notification-policy.js',
  'scripts/verify-stable-1.0.7-notifications.cjs',
  'scripts/verify-stable-1.0.8-storage-licenses.cjs',
  'scripts/verify-rc60-universal-auto-wallbox.js',
  'ems/services/zero-export-storage-credit.js',
  'scripts/verify-zero-export-storage-credit.cjs',
  'scripts/verify-stable-1.0.20-storage-allocation.cjs',
  'scripts/verify-stable-1.0.20-storage-grid-share.cjs',
  'scripts/verify-heating-rod-zero-export-tariff.cjs',
]) {
  if (!files.includes(required)) fail(`Stable-Paketdatei fehlt in package.json files: ${required}`);
  if (!fs.existsSync(path.join(root, required))) fail(`Stable-Paketdatei fehlt im Repository: ${required}`);
  if (!releaseManifest.files.some((entry) => entry.path === required)) fail(`Stable-Paketdatei fehlt im Release-Manifest: ${required}`);
}
if (pkg.scripts?.['test:stable-release'] !== 'node scripts/verify-stable-release.cjs') {
  fail('test:stable-release ist nicht korrekt registriert.');
}
if (pkg.scripts?.['test:stable-1.0.2-health'] !== 'node scripts/verify-stable-1.0.2-health-heartbeat.cjs') {
  fail('test:stable-1.0.2-health ist nicht korrekt registriert.');
}
if (!String(pkg.scripts?.['test:all'] || '').includes('npm run test:stable-1.0.2-health')) {
  fail('test:stable-1.0.2-health ist nicht Bestandteil von test:all.');
}
if (pkg.scripts?.['test:stable-1.0.3-home-appcenter'] !== 'node scripts/verify-stable-1.0.3-home-appcenter-access.cjs') {
  fail('test:stable-1.0.3-home-appcenter ist nicht korrekt registriert.');
}
if (!String(pkg.scripts?.['test:all'] || '').includes('npm run test:stable-1.0.3-home-appcenter')) {
  fail('test:stable-1.0.3-home-appcenter ist nicht Bestandteil von test:all.');
}
if (!String(pkg.scripts?.['test:all'] || '').includes('npm run test:stable-release')) {
  fail('test:stable-release ist nicht Bestandteil von test:all.');
}
const prepublishOnly = String(pkg.scripts?.prepublishOnly || '');
for (const requiredStep of ['npm run release:check-version-free', 'npm run release:prepare', 'npm run publish:check', 'npm run test:stable-release', 'node scripts/verify-publish.js', 'npm run test:package-runtime-start-smoke']) {
  if (!prepublishOnly.includes(requiredStep)) fail(`Prepublish-Guard enthält den Pflichtschritt nicht: ${requiredStep}`);
}
const releaseCheck = String(pkg.scripts?.['release:check'] || '');
for (const requiredStep of ['npm run test:all', 'npm run build:ts', 'npm run publish:check', 'npm run test:package-runtime-start-smoke', 'npm run test:package']) {
  if (!releaseCheck.includes(requiredStep)) fail(`Release-Check enthält den Pflichtschritt nicht: ${requiredStep}`);
}

const changelog = read('docs/CHANGELOG.md');
const firstHeading = changelog.match(/^##\s+([^\s]+)\s+-\s+(\d{4}-\d{2}-\d{2})/);
if (!firstHeading || firstHeading[1] !== version) fail('CHANGELOG beginnt nicht mit der aktuellen Stable-Version.');
const nextHeadingIndex = changelog.indexOf('\n## ', firstHeading[0].length);
const currentSection = nextHeadingIndex >= 0 ? changelog.slice(0, nextHeadingIndex) : changelog;
if (!/Official Stable/i.test(currentSection)) fail('Aktueller CHANGELOG-Abschnitt ist nicht als Official Stable gekennzeichnet.');
if (/Stable Candidate/i.test(currentSection)) fail('Aktueller CHANGELOG-Abschnitt enthält noch Stable-Candidate-Text.');

const publishNow = read('PUBLISH_NOW.txt');
if (!publishNow.includes(`NexoWatt UI ${version} – OFFICIAL STABLE RELEASE`)) fail('PUBLISH_NOW.txt trägt nicht die offizielle Stable-Kennung.');
if (/Stable Candidate/i.test(publishNow)) fail('PUBLISH_NOW.txt enthält noch Stable-Candidate-Text.');
const publishCmd = read('PUBLISH_NPM.cmd');
if (!publishCmd.includes(`NexoWatt EOS ${version} Stable`)) fail('PUBLISH_NPM.cmd enthält nicht die aktuelle Stable-Version.');
if (/0\.8\.203/.test(publishCmd)) fail('PUBLISH_NPM.cmd enthält noch die veraltete RC78-Version.');

const readme = read('docs/README.md');
if (!readme.includes(`**Current stable release:** \`${version}\``)) fail('README enthält nicht die aktuelle Stable-Version.');
const stableDoc = read(stableDocPath);
if (!stableDoc.includes(`NexoWatt EOS ${version}`) || !/offizielle Stable-Version/i.test(stableDoc)) {
  fail('Stable-Release-Dokumentation ist unvollständig.');
}

for (const relativePath of ['src-ts/runtime-executables/www/ems-apps.ts', 'src-ts/runtime-mirrors/www/ems-apps.ts', 'www/ems-apps.js']) {
  const text = read(relativePath);
  if (text.includes('RC93‑Reihenfolge') || text.includes('RC93-Reihenfolge')) {
    fail(`Sichtbarer Candidate-Hinweis verbleibt in ${relativePath}.`);
  }
}
for (const relativePath of ['src-ts/runtime-executables/www/sw.ts', 'src-ts/runtime-mirrors/www/sw.ts', 'www/sw.js']) {
  const text = read(relativePath);
  if (!text.includes("const CACHE_NAME = 'nexowatt-cache-v520';")) fail(`PWA-Cache-Bump fehlt in ${relativePath}.`);
}


const hardeningSource = read('src-ts/runtime-executables/ems/rc85-runtime-hardening.ts');
const sseSource = read('src-ts/runtime-executables/lib/sse-runtime-guard.ts');
const mainSource = read('src-ts/runtime-executables/main.ts');
if (!hardeningSource.includes('rc88ClassifyHeapPressure')) {
  fail('Ratio-basierte Heap-Klassifizierung für den 1.0.1-Stable-Patch fehlt.');
}
if (hardeningSource.includes('ratio >= warnRatio || fastGrowth') || hardeningSource.includes('ratio >= pressureRatio || fastGrowth')) {
  fail('Schnelles Heap-Wachstum löst weiterhin allein Warnung oder Druckentlastung aus.');
}
if (!hardeningSource.includes('[memory-guard]') || hardeningSource.includes('[RC88 heap]') || mainSource.includes('[RC88 heap]')) {
  fail('Versionsneutrale Memory-Guard-Logkennzeichnung ist nicht vollständig umgesetzt.');
}
if (!sseSource.includes('freshSnapshotBackpressure') || !sseSource.includes('stronglyBuffered')) {
  fail('Selektive SSE-Druckentlastung für Initialsnapshot und echte Pufferlast fehlt.');
}
if (!sseSource.includes('criticalReconnectCooldownMs') || !sseSource.includes('10_000, 1_000, 10_000')) {
  fail('Kritische SSE-Reconnect-Sperre ist nicht auf höchstens zehn Sekunden begrenzt.');
}
if (sseSource.includes("Date.now() + (closeAll ? 60_000 : 30_000)")) {
  fail('Alte globale 30/60-Sekunden-SSE-Reconnect-Sperre ist noch vorhanden.');
}
if (!sseSource.includes('[sse-guard]')) {
  fail('Versionsneutrale SSE-Guard-Logkennzeichnung fehlt.');
}

// Stable 1.0.2: adapter liveness, EMS scheduler, regulation tick and
// diagnostic publisher must be independent. This prevents the former 20/30-s
// oscillation without hiding a genuine adapter or HTTP-server outage.
const overviewSource = read('src-ts/runtime-executables/ems/services/admin-overview-publisher.ts');
const engineSource = read('src-ts/runtime-executables/ems/engine.ts');
const healthRegression = read('scripts/verify-stable-1.0.2-health-heartbeat.cjs');
if (!overviewSource.includes('DEFAULT_HEARTBEAT_INTERVAL_MS = 4_000')) {
  fail('Unabhängiger Vier-Sekunden-Heartbeat des Diagnose-Publishers fehlt.');
}
for (const token of ['Independent compatibility heartbeat for EOS Admin', 'newestTimestamp', 'emsSchedulerHeartbeatAt', 'emsTickStalled', 'summaryRefreshThresholdMs']) {
  if (!overviewSource.includes(token)) fail(`1.0.2-Übersichtsvertrag fehlt: ${token}`);
}
if (!engineSource.includes('this._schedulerHeartbeatIntervalMs = 4000')
  || !engineSource.includes("_publishSchedulerHeartbeat('timer')")
  || !engineSource.includes('ems.core.schedulerHeartbeatAt')) {
  fail('Unabhängiger Vier-Sekunden-Heartbeat des EMS-Schedulers fehlt.');
}
const connectionHeartbeatStart = mainSource.indexOf('_nwStartConnectionHeartbeat()');
const connectionHeartbeatEnd = mainSource.indexOf('_nwStopConnectionHeartbeat()');
const connectionHeartbeatBlock = connectionHeartbeatStart >= 0 && connectionHeartbeatEnd > connectionHeartbeatStart
  ? mainSource.slice(connectionHeartbeatStart, connectionHeartbeatEnd)
  : '';
if (!connectionHeartbeatBlock.includes('}, 4000);')) {
  fail('info.connection wird nicht im Vier-Sekunden-Takt bestätigt.');
}
if (connectionHeartbeatBlock.includes('}, 30000);')) {
  fail('Alte 30-Sekunden-info.connection-Taktung ist noch aktiv.');
}
for (const token of ['25_000', '35_000', "offlineValues['info.connection'] = false", 'heartbeatIntervalMs: 4_000']) {
  if (!healthRegression.includes(token)) fail(`1.0.2-Feldregression unvollständig: ${token}`);
}


// Stable 1.0.3: a valid Home admin session must not be invalidated by
// business-level 403 responses from Pro-only APIs. Genuine session/capability
// loss remains fail-closed.
const authSource = read('src-ts/runtime-executables/www/auth.ts');
const appCenterSource = read('src-ts/runtime-executables/www/ems-apps.ts');
const netOperatorSource = read('src-ts/runtime-executables/www/netoperator-appcenter.ts');
const homeAppCenterRegression = read('scripts/verify-stable-1.0.3-home-appcenter-access.cjs');
for (const token of [
  'const mustPromptForAuthentication = authStatusUnavailable || sessionMissing || pageCapabilityMissing',
  'Ein fachlicher API-Fehler bleibt',
]) {
  if (!authSource.includes(token)) fail(`1.0.3-Auth-Vertrag fehlt: ${token}`);
}
for (const token of [
  "_isAppLicensed('netOperator') && (() =>",
  "_isAppLicensed('operatingStrategies') && (() =>",
  "if (_isAppLicensed('netOperator') && window.NexoWattNetOperatorAppCenter)",
  "if (_isAppLicensed('operatingStrategies') && window.NexoWattOperatingStrategiesAppCenter)",
]) {
  if (!appCenterSource.includes(token)) fail(`1.0.3-Home-AppCenter-Guard fehlt: ${token}`);
}
const editionCheck = netOperatorSource.indexOf("const eos = String(getEdition() || '').toLowerCase() === 'eos';");
const homeReturn = netOperatorSource.indexOf('if (!eos) {', editionCheck);
const driverLoad = netOperatorSource.indexOf('if (!driverRows.length) await loadDrivers();', editionCheck);
if (!(editionCheck >= 0 && homeReturn > editionCheck && driverLoad > homeReturn)) {
  fail('Netzbetreiber-Treiber werden weiterhin vor dem Home-Editions-Guard geladen.');
}
for (const token of [
  "error: 'eos_required'",
  "fetch('/api/pro-only-fixture')",
  "fetch('/api/protected-fixture')",
  '/api/netoperator/drivers',
  'genuine lost session',
]) {
  if (!homeAppCenterRegression.includes(token)) fail(`1.0.3-Home-Feldregression unvollständig: ${token}`);
}
if (!mainSource.includes('cfgOut.emsApps = this._nwApplyLicenseLimitsToEmsApps(cfgOut.emsApps)')) {
  fail('Home-Konfigurationskopie wird nicht über die Lizenznormalisierung maskiert.');
}

const rc66Verifier = read('scripts/verify-rc66-station-display-stable.js');
if (!rc66Verifier.includes("isVersionAtLeast(pkg.version, '0.8.191')")) {
  fail('RC66-Prüfer besitzt keinen SemVer-festen Mindestversionsvergleich.');
}
if (/versionParts\[0\]\s*!==\s*0/.test(rc66Verifier)) {
  fail('RC66-Prüfer enthält noch eine auf 0.8.x fest verdrahtete Major-Version.');
}


if (!String(pkg.scripts?.['test:all'] || '').includes('npm run test:stable-1.0.4-auto-pv')) {
  fail('Auto-PV-/Phasenregression ist nicht Bestandteil von test:all.');
}

// 1.0.5 must remain part of every full release validation.
if (pkg.scripts?.['test:stable-1.0.5-storage-protection'] !== 'node scripts/verify-stable-1.0.5-storage-protection-telemetry.cjs'
    || !String(pkg.scripts?.['test:all'] || '').includes('npm run test:stable-1.0.5-storage-protection')) {
  fail('1.0.5-Speicherschutz-Regression fehlt in der Freigabekette.');
}
for (const token of ['protectedLoadUnknown', 'resolveEvcsStorageProtectionSnapshot', 'stop-discharge-evcs-load-unknown']) {
  if (!read('src-ts/runtime-executables/ems/modules/storage-control.ts').includes(token)) fail(`1.0.5-Speicherschutz fehlt: ${token}`);
}

// Die Quellen-/Writer-Regressionen bleiben in test:all, nicht in jeder schnellen
// npm-Veröffentlichung. Hier werden ihre unverzichtbare Registrierung und die
// versiegelten Paketdateien geprüft; die vollständige Prüfung erfolgt vor Release.
const storageRegressionCommand = 'node scripts/verify-zero-export-storage-credit.cjs && node scripts/verify-stable-1.0.20-storage-allocation.cjs && node scripts/verify-stable-1.0.20-storage-grid-share.cjs';
if (pkg.scripts?.['test:stable-1.0.20-storage'] !== storageRegressionCommand
    || !String(pkg.scripts?.['test:all'] || '').includes('npm run test:stable-1.0.20-storage')) {
  fail('1.0.20-Speicherquellen-/Verteilungs-/Writer-Regression fehlt in der Freigabekette.');
}
if (!String(pkg.scripts?.['test:zero-export-pv'] || '').includes('node scripts/verify-heating-rod-zero-export-tariff.cjs')
    || !String(pkg.scripts?.['test:all'] || '').includes('npm run test:zero-export-pv')) {
  fail('Heizstab-Tarifregression bei Nulleinspeisung fehlt in der Freigabekette.');
}

console.log(`[stable-release] OK: ${pkg.name}@${version} ist konsistent als Official Stable versiegelt.`);
console.log('[stable-release] OK: 1.0.20-Speicherquellen/Writer, Heizstab-Tarif, 1.0.5-Speicherschutz, Auto/PV/Phasen und bisherige Home-/Liveness-/Memory-/Regelungsregressionen sind eingebunden.');
