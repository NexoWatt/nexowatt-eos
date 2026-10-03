'use strict';
// Generate one pasteable authenticated TEST entry. Never reset arbitrary hosts.
const fs = require('node:fs');
const path = require('node:path');
const { identity, installCommand } = require('./build-github-download.cjs');
const { DELIVERY_REVISION } = require('../system/install-from-checkout.cjs');
const ROOT = path.resolve(__dirname, '../..');
const BOOTSTRAP = `delivery/bootstrap-test3-r${DELIVERY_REVISION}`;
const fail = code => { throw Object.assign(new Error(code), { code }); };
function updateDocumentation(command) {
    const begin = '<!-- EOS_PRIVATE_GITHUB_INSTALL_START -->', end = '<!-- EOS_PRIVATE_GITHUB_INSTALL_END -->';
    const readmePath = path.join(ROOT, 'README.md'), old = fs.readFileSync(readmePath, 'utf8');
    if (old.split(begin).length !== 2 || old.split(end).length !== 2) fail('STABILITY_ENTRY_README_MARKERS');
    const section = `${begin}
# EOS auf dem Debian-13-Test-Pi installieren

Aktueller **signierter ARM64-Testkandidat: test.3 Revision ${DELIVERY_REVISION}**.
Quellstand und Nachweise: [Stabilisierung](reports/integration/stability-20261003/README.md).
Die frühere Revision 3 enthält den behobenen PostgreSQL-Verzeichnisfehler und ist
kein aktueller Neuinstallationsweg. Historische Dateien bleiben unverändert.

1. Mit PuTTY/SSH als Benutzer mit sudo-Recht am Pi anmelden.
2. Den gesamten folgenden Block einmal einfügen. Er lädt alle Teile über curl,
   prüft ihre festen Fingerabdrücke und richtet Node, PostgreSQL und EOS ein.
   Ein sudo-Passwort und einmal der nur lesende GitHub-Token werden gegebenenfalls
   verdeckt abgefragt. Keine Benutzerpasswörter werden im Terminal eingerichtet.
3. Nach erfolgreicher Installation die angezeigte HTTPS-Adresse öffnen, die
   Geräte-CA über SSH samt Fingerabdruck übernehmen und den Erststart-Assistenten
   mit dem kurzlebigen Einrichtungscode durchlaufen. UUID, Lizenz und persönliche
   Passwörter werden im Frontend behandelt.

Voraussetzung: Debian 13/Raspberry Pi OS 13, ARM64, laufendes systemd, korrekte Uhr,
bash, sudo, curl, python3 und mindestens 6 GiB frei. Das Repository bleibt privat;
deshalb ist für den Download Leserecht auf NexoWatt/nexowatt-eos erforderlich.

Der Befehl unterstützt einen frischen Host sowie ausschließlich den bereits
diagnostizierten R2-Sudo-Abbruch: dieser alte Stand wird streng geprüft und
erhalten. Andere bestehende Installationen/Daten werden abgewiesen. Der Befehl
ist kein Updater und keine allgemeine Reparaturfunktion.

\`\`\`bash
${command.trimEnd()}
\`\`\`

[Befehl als Textdatei](${BOOTSTRAP}/INSTALL_ONE_COMMAND.txt) ·
[SBOM und Buildnachweise](reports/integration/installable-test3-r4-20261003/) ·
[Pi-Abnahme und Fehlerdiagnose](docs/operations/STABILITY_TEST4_DE.md).

**Pi-Vollinstallation, Reboot, Backup/Restore und Geräteabnahme bleiben OFFEN,
bis ihre tatsächlichen Ergebnisse vorliegen.** Anlagenbefehle bleiben gesperrt.
Das Paket ist kein Produktionsrelease und keine CRA-/IEC-Konformitätserklärung.
Die PostgreSQL-Zertifikate benötigen vor Dauerbetrieb einen separat abgenommenen
Erneuerungsweg; diese Testlieferung implementiert keine automatische Rotation.
${end}`;
    fs.writeFileSync(readmePath, old.slice(0, old.indexOf(begin)) + section + old.slice(old.indexOf(end) + end.length));
    const productPath = path.join(ROOT, 'system/product.json'), product = JSON.parse(fs.readFileSync(productPath));
    product.currentVerification = 'reports/integration/stability-20261003/verification.json';
    product.currentRuntimeArtifact = `delivery/test-pi-0.2.0-test.3-r${DELIVERY_REVISION}/delivery.json`;
    product.currentBuildStatus = 'reports/integration/installable-test3-r4-20261003/build-verification.json';
    product.installationHold = null;
    product.productionReleaseApproved = false;
    product.targetHardwareAccepted = false;
    product.firstStart.runtimeBuildEvidence = product.currentBuildStatus;
    product.firstStart.nativeTargetProbe = 'mandatory-before-host-installation; revision4 target acceptance open';
    Object.assign(product.firstStart.oneCommandInstallation, { bootstrapEntryReady: true,
        bootstrapEntryManifest: `${BOOTSTRAP}/github-manifest.json`,
        entryCommand: `${BOOTSTRAP}/INSTALL_ONE_COMMAND.txt`,
        verification: 'reports/integration/stability-20261003/verification.json',
        privateRepositoryBootstrapPublished: false, privateRepositoryBootstrapReadbackPassed: false,
        targetInstallationTested: false });
    fs.writeFileSync(productPath, JSON.stringify(product, null, 2) + '\n');
}
function render(driver, manifest, helper) {
    if (!helper || !/^[a-f0-9]{40}$/.test(helper.blob || '') ||
        !/^[a-f0-9]{64}$/.test(helper.sha256 || '') || !Number.isSafeInteger(helper.bytes) ||
        helper.bytes < 1 || helper.bytes > 1024 * 1024) fail('STABILITY_ENTRY_PIN');
    const base = installCommand(driver, manifest);
    const marker = 'exec 3< <(printf';
    if (base.split(marker).length !== 2 || !base.startsWith('/bin/bash ')) fail('STABILITY_ENTRY_BASE');
    const recovery = `# Only the separately diagnosed R2 sudo-abort state may be preserved automatically.
if [[ -e /opt/nexowatt/eos || -L /opt/nexowatt/eos ]]; then
  printf 'EOS: Vorhandenen Installationszustand streng pruefen; kein pauschales Zuruecksetzen.\\n'
  printf 'header = "Authorization: Bearer %s"\\n' "$eos_token" | /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/curl -q --config - --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize ${helper.bytes} --header 'Accept: application/vnd.github.raw+json' --header 'X-GitHub-Api-Version: 2022-11-28' 'https://api.github.com/repos/NexoWatt/nexowatt-eos/git/blobs/${helper.blob}' -o "$eos_stage/recover-sudo-abort.py"
  printf '%s  %s\\n' '${helper.sha256}' "$eos_stage/recover-sudo-abort.py" | /usr/bin/sha256sum --check --status
  /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/recover-sudo-abort.py" --recover
fi
`;
    return base.replace('/bin/bash ', 'sudo /bin/bash ').replace(marker, recovery + marker) + '\n';
}
function build() {
    const directory = path.join(ROOT, BOOTSTRAP);
    const driver = identity(fs.readFileSync(path.join(directory, 'github-download.py')));
    const manifestBytes = fs.readFileSync(path.join(directory, 'github-manifest.json'));
    const manifest = identity(manifestBytes);
    const decoded = JSON.parse(manifestBytes);
    if (decoded.deliveryDirectory !== `delivery/test-pi-0.2.0-test.3-r${DELIVERY_REVISION}` || decoded.ready !== true)
        fail('STABILITY_ENTRY_MANIFEST');
    const source = 'tools/bootstrap/recover-sudo-abort.py';
    const helperBytes = fs.readFileSync(path.join(ROOT, source));
    const helper = identity(helperBytes), command = render(driver, manifest, helper);
    fs.writeFileSync(path.join(directory, 'INSTALL_ONE_COMMAND.txt'), command, { flag: 'wx' });
    const evidence = { schemaVersion: 1, kind: 'eos-one-command-test-entry', bootstrap: BOOTSTRAP,
        driver, manifest, recovery: { source, ...helper, acceptedState: 'diagnosed-r2-sudo-abort-only',
            preservesFilesAndUidGid: true, arbitraryExistingInstallationsAccepted: false },
        command: identity(Buffer.from(command)), automaticUserPasswordProvisioning: false,
        userPasswordsInFrontend: true, tokenStored: false, targetInstallationExecuted: false,
        targetRecoveryExecuted: false, productionReleaseApproved: false };
    fs.writeFileSync(path.join(directory, 'one-command-verification.json'), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
    updateDocumentation(command);
    return evidence;
}
module.exports = { render, build, BOOTSTRAP };
if (require.main === module) {
    try { if (process.argv.length !== 2) fail('STABILITY_ENTRY_USAGE'); console.log(JSON.stringify(build(), null, 2)); }
    catch (error) { console.error(JSON.stringify({ ok: false, code: /^STABILITY_ENTRY_[A-Z_]+$/.test(error.code || '') ? error.code : 'STABILITY_ENTRY_BUILD_FAILED' })); process.exitCode = 1; }
}
