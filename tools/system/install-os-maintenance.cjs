'use strict';
// Fresh managed hosts only. Preserve foreign policy rather than replacing it.
const fs = require('node:fs');
const path = require('node:path');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const { privateWrite } = require('./install-host.cjs');
const { command, toolTrust } = require('./host-preflight.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const LOCK = '/var/lib/nexowatt-eos-os-updates/private/maintenance.lock';
const POLICY = '/usr/sbin/policy-rc.d';
const APT_CONFIG = '/etc/apt/apt.conf.d/90nexowatt-eos-managed';
function installOSMaintenance({ releaseId }, { root = '/', owner = rootOwned, exec = command, trust = toolTrust } = {}) {
    if (process.getuid?.() !== 0 || !/^[a-f0-9]{64}$/.test(releaseId || '')) fail('OS_MAINTENANCE_INPUT');
    const at = name => path.join(root, name), release = at('/opt/nexowatt/eos/releases/' + releaseId);
    for (const name of [release, path.dirname(at(LOCK)), path.dirname(at(POLICY)), path.dirname(at(APT_CONFIG))]) owner(name);
    for (const name of [LOCK, POLICY, APT_CONFIG]) {
        try { fs.lstatSync(at(name)); fail('OS_MAINTENANCE_EXISTS'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    for (const binary of ['/usr/bin/systemctl', '/usr/bin/apt-config'])
        if (!trust(binary, root).trusted) fail('OS_MAINTENANCE_TOOL');
    const run = (binary, args) => {
        const result = exec(binary, args);
        if (result.error || result.status !== 0) fail('OS_MAINTENANCE_COMMAND');
        return result.stdout;
    };
    if (run('/usr/bin/systemctl', ['show', 'apt-daily-upgrade.service', '--property=ActiveState', '--value']).trim() !== 'inactive')
        fail('OS_MAINTENANCE_APT_BUSY');
    const helperFile = path.join(release, 'runtime/os-updates/policy-rc.d'); owner(helperFile);
    const configFile = path.join(release, 'system/managed-test/apt-managed.conf'); owner(configFile);
    const helper = readFileLimited(helperFile, 16384).bytes, config = readFileLimited(configFile, 16384).bytes;
    if (!helper.toString('utf8').startsWith('#!/usr/bin/python3 -I\n') || !config.includes('Unattended-Upgrade "0";'))
        fail('OS_MAINTENANCE_TEMPLATE');
    // No active dpkg/service transaction is stopped. Only future scheduling is
    // disabled; the EOS timer is enabled later after the complete host install.
    run('/usr/bin/systemctl', ['disable', '--now', 'apt-daily-upgrade.timer']);
    run('/usr/bin/systemctl', ['mask', 'apt-daily-upgrade.timer']);
    privateWrite(at(LOCK), '', 0o600);
    privateWrite(at(POLICY), helper, 0o755);
    privateWrite(at(APT_CONFIG), config, 0o644);
    const periodic = run('/usr/bin/apt-config', ['dump']);
    for (const name of ['Update-Package-Lists', 'Unattended-Upgrade'])
        if (!new RegExp('^APT::Periodic::' + name + ' "0";$', 'm').test(periodic)) fail('OS_MAINTENANCE_PERIODIC_POLICY');
    const timer = run('/usr/bin/systemctl', ['show', 'apt-daily-upgrade.timer', '--property=ActiveState', '--property=UnitFileState']);
    if (!/^ActiveState=inactive$/m.test(timer) || !/^UnitFileState=masked$/m.test(timer)) fail('OS_MAINTENANCE_TIMER_POLICY');
    return { installed: true, automaticSecurityMaintenance: true, serviceRestartPolicy: 'defer-package-service-actions',
        automaticReboot: false, independentAptTimerMasked: true, historicalInstallsChanged: false };
}
module.exports = { installOSMaintenance, LOCK, POLICY, APT_CONFIG };
