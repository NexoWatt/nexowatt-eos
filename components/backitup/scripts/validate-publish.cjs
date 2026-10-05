'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function fail(message) {
    failures.push(message);
}

function readText(relativePath) {
    try {
        return fs.readFileSync(path.join(root, relativePath), 'utf8');
    } catch (error) {
        fail(`${relativePath} konnte nicht gelesen werden: ${error.message}`);
        return '';
    }
}

function readJson(relativePath) {
    const text = readText(relativePath);
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        fail(`${relativePath} ist kein gültiges JSON: ${error.message}`);
        return null;
    }
}

function readJson5AsObject(relativePath) {
    const text = readText(relativePath);
    if (!text) {
        return null;
    }
    try {
        return vm.runInNewContext(`(${text}\n)`, Object.create(null), {
            filename: relativePath,
            timeout: 1_000,
        });
    } catch (error) {
        fail(`${relativePath} konnte nicht als JSON5 gelesen werden: ${error.message}`);
        return null;
    }
}

function sha256(absolutePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function walkFiles(relativeDir) {
    const start = path.join(root, relativeDir);
    if (!fs.existsSync(start)) {
        return [];
    }
    const result = [];
    const stack = [start];
    while (stack.length) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const absolute = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(absolute);
            } else if (entry.isFile()) {
                result.push(path.relative(root, absolute).split(path.sep).join('/'));
            }
        }
    }
    return result.sort();
}

function walkObject(value, visitor, trail = []) {
    if (!value || typeof value !== 'object') {
        return;
    }
    visitor(value, trail);
    for (const [key, child] of Object.entries(value)) {
        walkObject(child, visitor, [...trail, key]);
    }
}

const packageJson = readJson('package.json');
const packageLock = fs.existsSync(path.join(root, 'package-lock.json')) ? readJson('package-lock.json') : null;
const ioPackage = readJson('io-package.json');
const manifest = readJson('release-manifest.json');

if (packageJson) {
    if (packageJson.name !== 'iobroker.nexowatt-backup') {
        fail(`Unerwarteter Paketname: ${packageJson.name}`);
    }
    if (packageJson.version !== '1.0.10') {
        fail(`Diese Freigabe muss Version 1.0.10 sein; gefunden: ${packageJson.version}`);
    }
    if (packageJson.private === true) {
        fail('package.json enthält private=true.');
    }
    if (packageJson.main !== 'build/main.js') {
        fail(`Unerwarteter main-Eintrag: ${packageJson.main}`);
    }
    if (!packageJson.publishConfig || packageJson.publishConfig.access !== 'public') {
        fail('publishConfig.access muss public sein.');
    }
    const currentMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
    if (!Number.isFinite(currentMajor) || currentMajor < 22) {
        fail(`Node.js 22 oder neuer erforderlich; gefunden: ${process.version}`);
    }
}

if (packageJson && packageLock) {
    if (packageLock.version !== packageJson.version || packageLock.packages?.['']?.version !== packageJson.version) {
        fail('package-lock.json verwendet nicht dieselbe Paketversion wie package.json.');
    }
}

if (packageJson && ioPackage) {
    if (ioPackage.common?.name !== 'nexowatt-backup') {
        fail(`io-package.json common.name ist ${ioPackage.common?.name || 'nicht gesetzt'}.`);
    }
    if (packageJson.version !== ioPackage.common?.version) {
        fail(`Versionsabweichung: package.json=${packageJson.version}, io-package.json=${ioPackage.common?.version}`);
    }
    const globalDependencies = Array.isArray(ioPackage.common?.globalDependencies)
        ? ioPackage.common.globalDependencies
        : [];
    const adminDependency = globalDependencies.find(dependency => dependency && typeof dependency === 'object' && dependency.admin);
    if (!adminDependency) {
        fail('io-package.json enthält keine globale Admin-Abhängigkeit.');
    } else if (adminDependency.admin !== '>=7.0.0') {
        fail(`Die Admin-Kompatibilität muss >=7.0.0 sein; gefunden: ${adminDependency.admin}`);
    }
    if (ioPackage.common?.adminUI?.config !== 'json') {
        fail('Die Konfiguration muss die native JSONConfig-Oberfläche verwenden.');
    }
}

const required = [
    'build/main.js',
    'build/lib/sdCard.js',
    'build/lib/influxDbCli.js',
    'build/lib/scripts/12-influxDB.js',
    'build/lib/restore/influxDB.js',
    'build/lib/scripts/01-mount.js',
    'build/lib/scripts/60-cifs.js',
    'admin/jsonConfig.json5',
    'admin/main.jsonConfig.json5',
    'admin/iob.jsonConfig.json5',
    'admin/tab_m.html',
    'admin/nexowatt-backup.png',
    'admin/nexowatt-eos-logo.png',
    'admin/favicon.ico',
    'test/eos-profile.js',
    'test/sd-card.js',
    'test/sd-card-access.js',
    'test/helpers/sd-card-permission-child.cjs',
    'test/influxdb-cli.js',
    'README.md',
    'LICENSE',
    'NOTICE.md',
    'CHANGELOG.md',
];
for (const file of required) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
        fail(`Pflichtdatei fehlt: ${file}`);
    }
}

if (fs.existsSync(path.join(root, 'admin/custom'))) {
    fail('admin/custom darf in 1.0.10 nicht mehr vorhanden sein; die React-Custom-Components wurden durch native Admin-Steuerelemente ersetzt.');
}

for (const file of ['.npmrc', '.env', 'iob-vendor-secret.json', 'admin/iob-vendor-secret.json', 'build/iob-vendor-secret.json']) {
    if (fs.existsSync(path.join(root, file))) {
        fail(`Sensible oder unerlaubte Datei im Veröffentlichungsverzeichnis: ${file}`);
    }
}

let configCount = 0;
let customCount = 0;
const visibleFields = new Set(['label', 'text', 'help', 'alert', 'title', 'tooltip']);
const jsonConfigFiles = walkFiles('admin').filter(file => /\.jsonConfig\.json5$/.test(file));
for (const file of jsonConfigFiles) {
    const config = readJson5AsObject(file);
    if (!config) {
        continue;
    }
    configCount += 1;
    walkObject(config, (node, trail) => {
        if (node.type === 'custom') {
            customCount += 1;
            fail(`${file}:${trail.join('.')} verwendet noch eine React-Custom-Component.`);
        }
        for (const field of visibleFields) {
            const value = node[field];
            if (typeof value === 'string' && /\bioBroker\b/i.test(value)) {
                fail(`${file}:${trail.join('.')} enthält noch eine sichtbare ioBroker-Bezeichnung in ${field}.`);
            }
        }
    });
    if (/customComponents|ConfigCustomBackItUpSet|bundlerType\s*[:=]\s*['"]module/i.test(readText(file))) {
        fail(`${file} enthält noch einen Verweis auf die entfernte Module-Federation-Oberfläche.`);
    }
}
if (configCount < 20) {
    fail(`Es wurden nur ${configCount} JSONConfig-Dateien gefunden.`);
}
if (customCount !== 0) {
    fail(`Es wurden noch ${customCount} React-Custom-Components gefunden.`);
}

const mainConfig = readJson5AsObject('admin/main.jsonConfig.json5');
const iobConfig = readJson5AsObject('admin/iob.jsonConfig.json5');
const rootConfig = readJson5AsObject('admin/jsonConfig.json5');
const cifsConfig = readJson5AsObject('admin/cifs.jsonConfig.json5');
const influxConfig = readJson5AsObject('admin/influxdb.jsonConfig.json5');
if (mainConfig?.items?.minimalEnabled?.type !== 'checkbox' || mainConfig?.items?.minimalEnabled?.label !== 'NexoWatt EOS') {
    fail('Die Hauptauswahl muss ein natives Kontrollfeld mit der Bezeichnung NexoWatt EOS sein.');
}
if (iobConfig?.label !== 'NexoWatt EOS' || iobConfig?.items?._header?.text !== 'NexoWatt EOS backup') {
    fail('Der Systemsicherungs-Reiter ist nicht vollständig auf NexoWatt EOS umgestellt.');
}
if (
    iobConfig?.items?.backupNow?.type !== 'setState' ||
    iobConfig?.items?.backupNow?.id !== 'oneClick.iobroker' ||
    iobConfig?.items?.backupNow?.val !== true
) {
    fail('Der native Button für die manuelle EOS-Sicherung ist nicht korrekt konfiguriert.');
}
if (rootConfig?.items?._iobroker?.icon !== 'nexowatt-backup.png') {
    fail('Der Systemsicherungs-Reiter verwendet nicht das NexoWatt-EOS-Symbol.');
}


const sdCardOption = cifsConfig?.items?.connectType?.options?.find(option => option?.value === 'SDCard');
if (!sdCardOption || sdCardOption.label !== 'SD card') {
    fail('Die Speicherziel-Auswahl enthält keine native SD-Karten-Option.');
}
if (
    cifsConfig?.items?.sdCardMountPath?.type !== 'selectSendTo' ||
    cifsConfig?.items?.sdCardMountPath?.command !== 'getSdCardTargets'
) {
    fail('Die SD-Karten-Auswahl ist nicht als dynamische selectSendTo-Erkennung konfiguriert.');
}
if (
    cifsConfig?.items?._testSdCard?.type !== 'sendTo' ||
    cifsConfig?.items?._testSdCard?.command !== 'testSdCardTarget'
) {
    fail('Der native Schreib- und Einhängepunkttest für die SD-Karte fehlt.');
}
if (!String(cifsConfig?.items?._sdCardInfo?.text || '').includes('without falling back to the system disk')) {
    fail('Der Sicherheitshinweis zum Abbruch ohne Fallback auf den Systemdatenträger fehlt.');
}
if (!String(cifsConfig?.items?._sdCardRetentionInfo?.text || '').includes('newest 3 backups')) {
    fail('Der Hinweis zur rollierenden InfluxDB-Aufbewahrung von drei Generationen fehlt.');
}
if (mainConfig?.items?.cifsEnabled?.label !== 'NAS / SD card / Copy') {
    fail('Die SD-Karte ist in der Hauptauswahl der Speicherorte nicht sichtbar.');
}


if (influxConfig?.items?.influxDBDumpExe?.label !== 'InfluxDB CLI path (optional)') {
    fail('Das ausführbare InfluxDB-Programm ist in der Oberfläche nicht eindeutig als optionaler CLI-Pfad bezeichnet.');
}
if (!String(influxConfig?.items?.influxDBDumpExe?.help || '').includes('Do not enter a bucket name or backup directory')) {
    fail('Der InfluxDB-CLI-Hinweis warnt nicht vor Bucket- oder Sicherungsverzeichnisnamen im Programmfeld.');
}
if (!String(influxConfig?.items?.influxDBDumpExe?.validator || '').includes("startsWith('/')")) {
    fail('Die InfluxDB-CLI-Pfadprüfung akzeptiert nicht ausschließlich Standardnamen oder absolute Linux-Pfade.');
}
if (influxConfig?.items?.influxDBToken?.validator || influxConfig?.items?.influxDBToken?.validatorNoSaveOnError) {
    fail('Der geschützte InfluxDB-Token darf nach dem erneuten Öffnen der Einstellungen keinen Speichervalidator auslösen.');
}
if (!String(influxConfig?.items?.influxDBToken?.help || '').includes('stored encrypted')) {
    fail('Der Hinweis zur verschlüsselten Speicherung des InfluxDB-Tokens fehlt.');
}
if (!String(influxConfig?.items?._influxTokenInfo?.text || '').includes('remains stored')) {
    fail('Der sichtbare Hinweis zum weiterhin gespeicherten InfluxDB-Token fehlt.');
}

if (ioPackage) {
    if (ioPackage.native?.sdCardMountPath !== '') {
        fail('Der Standardwert für sdCardMountPath muss leer sein, damit kein Datenträger stillschweigend gewählt wird.');
    }
    if (ioPackage.native?.sdCardBackupSubDir !== 'nexowatt-eos-backups') {
        fail('Der Standard-Unterordner der SD-Karte muss nexowatt-eos-backups sein.');
    }
    if (ioPackage.native?.sdCardInfluxRetention !== 3) {
        fail('Die InfluxDB-Aufbewahrung auf der SD-Karte muss fest auf drei Generationen voreingestellt sein.');
    }

    for (const listName of ['encryptedNative', 'protectedNative']) {
        if (!Array.isArray(ioPackage[listName]) || !ioPackage[listName].includes('influxDBToken')) {
            fail(`io-package.json muss influxDBToken in ${listName} enthalten.`);
        }
    }
}

const sdCardBuild = readText('build/lib/sdCard.js');
const sdCardTest = readText('test/sd-card.js');
if (sdCardBuild.includes('options.createDirectory === false ? expectedTarget : backupDir')) {
    fail('Die SD-Rechteprüfung darf nicht auf den Einhängepunkt statt Sicherungsunterordner zurückfallen.');
}
if (!readText('build/lib/list/cifs.js').includes("accessMode: 'read'")) {
    fail('Die SD-Backup-Liste muss ausschließlich lesend geprüft werden.');
}
if (!packageJson.scripts?.['test:offline']?.includes('test/sd-card-access.js')) {
    fail('Die SD-Rechte-Regressionstests fehlen im Publish-Ablauf.');
}
const eosProfileTest = readText('test/eos-profile.js');
const platformChecks = [
    ['build/lib/sdCard.js', sdCardBuild, 'node_path_1.posix.resolve'],
    ['test/sd-card.js', sdCardTest, "const { posix: pathPosix } = require('node:path');"],
    ['test/eos-profile.js', eosProfileTest, "process.platform !== 'linux'"],
];
if (fs.existsSync(path.join(root, 'src/lib/sdCard.ts'))) {
    platformChecks.unshift([
        'src/lib/sdCard.ts',
        readText('src/lib/sdCard.ts'),
        "import { posix as pathPosix } from 'node:path';",
    ]);
}
for (const [file, content, expected] of platformChecks) {
    if (!content.includes(expected)) {
        fail(`${file} enthält die Windows-/Linux-kompatible Publish-Kennung nicht: ${expected}`);
    }
}

for (const expected of [
    'selectSdCardTargets',
    'validateSdCardTarget',
    "device.transport === 'usb' && device.removable",
    'Der ausgewählte Datenträger ist der Systemdatenträger',
    'es gibt kein Fallback auf den Systemdatenträger',
]) {
    if (!sdCardBuild.includes(expected)) {
        fail(`Die ausgelieferte SD-Karten-Prüfung enthält die erwartete Sicherheitskennung nicht: ${expected}`);
    }
}
const sdMountBuild = readText('build/lib/scripts/01-mount.js');
if (!sdMountBuild.includes("options.mountType === 'SDCard'") || !sdMountBuild.includes('validateSdCardTarget')) {
    fail('Die SD-Karte wird nicht vor Beginn der Sicherung validiert.');
}
const sdCopyBuild = readText('build/lib/scripts/60-cifs.js');
for (const [file, content] of [
    ['build/lib/scripts/01-mount.js', sdMountBuild],
    ['build/lib/scripts/60-cifs.js', sdCopyBuild],
]) {
    if (/\bctx\.log\.info\s*\(/.test(content)) {
        fail(`${file} ruft ctx.log.info() auf, obwohl der Sicherungskontext nur debug, warn und error bereitstellt.`);
    }
}
if (!sdMountBuild.includes('ctx.log.debug(`SD-Karte geprüft:')) {
    fail('Die erfolgreiche SD-Karten-Prüfung verwendet nicht den unterstützten debug-Logger.');
}
if (!sdCopyBuild.includes('ctx.log.debug(`SD-Karten-Rotation:')) {
    fail('Die SD-Karten-Rotation verwendet nicht den unterstützten debug-Logger.');
}
for (const expected of [
    'selectInfluxBackupsToDelete',
    "options.mountType === 'SDCard'",
    'sdCardInfluxRetention',
    'SD-Karten-Rotation',
]) {
    if (!sdCopyBuild.includes(expected)) {
        fail(`Die ausgelieferte SD-Karten-Kopie/Rotation enthält die erwartete Kennung nicht: ${expected}`);
    }
}
const executeBuild = readText('build/lib/execute.js');
if (!executeBuild.includes("fatalSdCardStep") || !executeBuild.includes("options?.mountType === 'SDCard'")) {
    fail('Fehler beim SD-Karten-Mount oder -Kopieren werden nicht als fataler Sicherungsfehler behandelt.');
}


const influxCliBuild = readText('build/lib/influxDbCli.js');
for (const expected of [
    'buildInfluxBackupInvocation',
    'buildInfluxRestoreInvocation',
    'env.INFLUX_TOKEN',
    'Das Feld ist kein Sicherungsverzeichnis',
    'wurde nicht gefunden',
]) {
    if (!influxCliBuild.includes(expected)) {
        fail(`Die ausgelieferte InfluxDB-CLI-Härtung enthält die erwartete Kennung nicht: ${expected}`);
    }
}
const influxBackupBuild = readText('build/lib/scripts/12-influxDB.js');
const influxRestoreBuild = readText('build/lib/restore/influxDB.js');
for (const [file, content, builder] of [
    ['build/lib/scripts/12-influxDB.js', influxBackupBuild, 'buildInfluxBackupInvocation'],
    ['build/lib/restore/influxDB.js', influxRestoreBuild, 'buildInfluxRestoreInvocation'],
]) {
    if (!content.includes('execFile') || !content.includes(builder) || !content.includes('formatInfluxCliError')) {
        fail(`${file} verwendet nicht den gehärteten shellfreien InfluxDB-CLI-Aufruf.`);
    }
    if (content.includes('-t ${options.token}') || content.includes('--token') && content.includes('options.token')) {
        fail(`${file} legt den InfluxDB-Token weiterhin in Prozessargumenten offen.`);
    }
}

function resolveTabScriptAsset(html) {
    const modules = [...html.matchAll(/<script\b[^>]*>/gi)]
        .filter(([tag]) => /\stype=(["'])module\1/i.test(tag));
    if (modules.length !== 1) return null;
    const script = modules[0][0].match(/\ssrc=(["'])([^"']+)\1/i);
    if (!script) return null;
    // Only generated local asset filenames and the EOS date cache key are valid.
    // Never join an arbitrary URL, query value, encoded slash or traversal path.
    const asset = script[2].match(/^\.\/assets\/([A-Za-z0-9_-]+\.js)(?:\?v=eos-[0-9]{8})?$/);
    return asset ? `admin/assets/${asset[1]}` : null;
}
const tabHtml = readText('admin/tab_m.html');
const tabAsset = resolveTabScriptAsset(tabHtml);
if (!tabAsset) {
    fail('admin/tab_m.html verweist auf kein zulässiges lokales JavaScript-Bundle.');
}
const tabBundle = tabAsset ? readText(tabAsset) : '';
for (const expected of [
    'SYSTEM WIRD GELADEN',
    './nexowatt-eos-logo.png',
    '{name:`minimalEnabled`,label:`NexoWatt EOS`}',
    'Last NexoWatt EOS backup:',
    'Next NexoWatt EOS backup:',
    'NexoWatt EOS start backup',
]) {
    if (!tabBundle.includes(expected)) {
        fail(`Das ausgelieferte Dashboard-Bundle enthält die erwartete NexoWatt-Kennung nicht: ${expected}`);
    }
}
for (const forbidden of [
    'Last ioBroker backup:',
    'Next ioBroker backup:',
    'ioBroker start backup',
    'Iobroker start backup',
    'Next iobroker Backup:',
    '{name:`minimalEnabled`,label:`ioBroker`}',
    'children:(0,U.jsx)(_j,{themeType:this.state.themeType})',
    'io经纪商',
]) {
    if (tabBundle.includes(forbidden)) {
        fail(`Das ausgelieferte Dashboard-Bundle enthält noch eine alte sichtbare Kennung: ${forbidden}`);
    }
}
if (!tabHtml.includes('nexowatt-backup.png') || !tabHtml.includes('<title>NexoWatt EOS Backup</title>')) {
    fail('Die Dashboard-HTML-Datei verwendet nicht vollständig das NexoWatt-EOS-Branding.');
}
const tabCssAssetMatch = tabHtml.match(/href=["']\.\/assets\/([^"']+\.css)["']/);
const tabCssAsset = tabCssAssetMatch ? `admin/assets/${tabCssAssetMatch[1]}` : '';
const tabCss = tabCssAsset ? readText(tabCssAsset) : '';
for (const expected of ['nexowatt-eos-theme-v105', '#01bc69', '#03111c', '#5ee0c2']) {
    if (!tabCss.toLowerCase().includes(expected.toLowerCase())) {
        fail(`Das ausgelieferte Dashboard-Stylesheet enthält die erwartete EOS-Farbkennung nicht: ${expected}`);
    }
}

for (const file of walkFiles('admin/i18n').filter(file => file.endsWith('/translations.json'))) {
    const translations = readJson(file);
    if (translations?.ioBroker !== 'NexoWatt EOS') {
        fail(`${file} übersetzt die sichtbare Systembezeichnung nicht als NexoWatt EOS.`);
    }
    for (const key of ['SD card', 'Mounted SD card', 'Test SD card target', 'InfluxDB CLI path (optional)', 'The InfluxDB token remains stored even when no readable value is shown after reopening the settings.']) {
        if (typeof translations?.[key] !== 'string' || !translations[key].trim()) {
            fail(`${file} enthält keine Übersetzung für ${key}.`);
        }
    }
    if (translations) {
        for (const [key, value] of Object.entries(translations)) {
            if (typeof value === 'string' && /\bioBroker\b/i.test(value)) {
                fail(`${file} enthält noch eine sichtbare ioBroker-Bezeichnung im Übersetzungswert ${key}.`);
            }
        }
    }
}

if (manifest && Array.isArray(manifest.files)) {
    if (packageJson && manifest.package?.name !== packageJson.name) {
        fail('release-manifest.json gehört zu einem anderen Paketnamen.');
    }
    if (packageJson && manifest.package?.version !== packageJson.version) {
        fail('release-manifest.json gehört zu einer anderen Version.');
    }
    const expectedMap = new Map(manifest.files.map(entry => [entry.path, entry]));
    for (const [relativePath, entry] of expectedMap) {
        const absolute = path.join(root, relativePath);
        if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
            fail(`Manifest-Datei fehlt: ${relativePath}`);
            continue;
        }
        const size = fs.statSync(absolute).size;
        if (size !== entry.size) {
            fail(`Dateigröße weicht ab: ${relativePath} (${size} statt ${entry.size})`);
            continue;
        }
        if (sha256(absolute) !== entry.sha256) {
            fail(`SHA-256-Prüfung fehlgeschlagen: ${relativePath}`);
        }
    }
    const controlledRoots = ['admin', 'build', 'docs', 'packages'];
    const actualControlled = controlledRoots.flatMap(walkFiles).sort();
    const expectedControlled = [...expectedMap.keys()]
        .filter(file => controlledRoots.some(rootName => file === rootName || file.startsWith(`${rootName}/`)))
        .sort();
    const expectedSet = new Set(expectedControlled);
    const actualSet = new Set(actualControlled);
    for (const file of actualControlled) {
        if (!expectedSet.has(file)) {
            fail(`Unerwartete Release-Datei gefunden: ${file}. Die aktuelle Publish-ZIP bitte vollständig über den Projektordner kopieren und erneut veröffentlichen.`);
        }
    }
    for (const file of expectedControlled) {
        if (!actualSet.has(file)) {
            fail(`Erwartete Release-Datei fehlt: ${file}`);
        }
    }
} else {
    fail('release-manifest.json fehlt oder enthält keine gültige Dateiliste.');
}

if (packageJson) {
    const files = Array.isArray(packageJson.files) ? packageJson.files : [];
    for (const expected of ['admin/', 'build/', 'packages/eos-license-client/', 'test/license-guard.js', 'io-package.json', 'scripts/prepare-publish.cjs', 'scripts/validate-publish.cjs', 'test/eos-profile.js', 'test/sd-card.js', 'test/influxdb-cli.js', 'release-manifest.json']) {
        if (!files.includes(expected)) {
            fail(`package.json files-Whitelist enthält ${expected} nicht.`);
        }
    }
    if (!packageJson.scripts?.['test:offline']?.includes('test/license-guard.js')) fail('Zentrale Lizenz-/Recoveryprüfungen fehlen im Offline-Gate.');
    const prepublishOnly = packageJson.scripts?.prepublishOnly || '';
    const preparePublish = packageJson.scripts?.['prepare:publish'] || '';
    const verifyPublish = packageJson.scripts?.['verify:publish'] || '';
    const testSdCard = packageJson.scripts?.['test:sd-card'] || '';
    const testInfluxDbCli = packageJson.scripts?.['test:influxdb-cli'] || '';
    const testOffline = packageJson.scripts?.['test:offline'] || '';
    if (!prepublishOnly.includes('verify:publish')) {
        fail('prepublishOnly führt die Veröffentlichungsprüfung nicht aus.');
    }
    if (!preparePublish.includes('scripts/prepare-publish.cjs')) {
        fail('prepare:publish führt die automatische Altdatei-Bereinigung nicht aus.');
    }
    if (!verifyPublish.includes('prepare:publish') || !verifyPublish.includes('test:offline') || !verifyPublish.includes('scripts/validate-publish.cjs')) {
        fail('verify:publish muss die Altdatei-Bereinigung, Offline-Funktionstests und Paketprüfung ausführen.');
    }
    if (!testSdCard.includes('test/sd-card.js') || !testOffline.includes('test/sd-card.js')) {
        fail('Die automatisierten SD-Karten- und Rotationsprüfungen sind nicht in den Publish-Ablauf eingebunden.');
    }
    if (!testInfluxDbCli.includes('test/influxdb-cli.js') || !testOffline.includes('test/influxdb-cli.js')) {
        fail('Die automatisierten InfluxDB-CLI- und Tokenprüfungen sind nicht in den Publish-Ablauf eingebunden.');
    }
    if (!files.includes('!admin/custom/**')) {
        fail('package.json muss admin/custom/** zusätzlich von der Veröffentlichung ausschließen.');
    }
    if (/npm run build/.test(prepublishOnly)) {
        fail('prepublishOnly darf für dieses vorgebaute Paket keinen vollständigen Build starten.');
    }
}

if (failures.length) {
    console.error('\n[NexoWatt EOS Backup] Veröffentlichung abgebrochen:\n');
    for (const item of failures) {
        console.error(`  - ${item}`);
    }
    console.error('\nKopiere die vollständige aktuelle Publish-ZIP über den Projektordner. Die Publish-Vorbereitung entfernt bekannte Altdateien automatisch.\n');
    process.exit(1);
}

for (const warning of warnings) {
    console.warn(`[WARNUNG] ${warning}`);
}

console.log(`[NexoWatt EOS Backup] Publish-Prüfung bestanden: ${packageJson.name}@${packageJson.version}`);
console.log(`[NexoWatt EOS Backup] ${configCount} native JSONConfig-Dateien ohne React-Custom-Components geprüft.`);
console.log('[NexoWatt EOS Backup] NexoWatt-EOS-Logo, Ladebildschirm und sichtbare Produktbezeichnungen geprüft.');
console.log('[NexoWatt EOS Backup] SD-Karten-Erkennung, POSIX-Pfadlogik, Systemdatenträger-Schutz und InfluxDB-Rotation auf drei Generationen geprüft.');
console.log('[NexoWatt EOS Backup] InfluxDB-CLI-Pfad, verschlüsselte Tokenkonfiguration und shellfreie Backup-/Restore-Aufrufe geprüft.');
console.log(`[NexoWatt EOS Backup] ${manifest.files.length} Release-Dateien wurden per SHA-256 geprüft.`);
