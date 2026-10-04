#!/usr/bin/env node
'use strict';
// Files-only support evidence. No DB client, service invocation, lock mutation,
// password verification, code loaded from the installation, or recovery action.
const fs = require('node:fs');
const path = require('node:path');
const RELEASES = Object.freeze({
    '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8': 'R4',
    '6afb22793667514f76bbcceb785ba84b00757105577a9909c182f8fc41e45061': 'R5',
    '80063204cfd1dad6dbd6b8b22462bd08deeee430c2b7c4ab0c6d316d4ac90a07': 'R6',
});
const BASE = '/etc/nexowatt-eos';
const ONBOARDING = '/var/lib/nexowatt-eos/onboarding';
const FLAGS = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const release = value => typeof value === 'string' && Object.hasOwn(RELEASES, value) ? RELEASES[value] : 'OTHER';
const hex = (value, length) => typeof value === 'string' && value.length === length && /^[a-f0-9]+$/.test(value);
const oneOf = (value, options) => options.includes(value) ? value : 'OTHER';
const version = value => [1, 2, 3].includes(value) ? value : null;
const match = (a, b, length) => hex(a, length) && hex(b, length) ? a === b : null;

// root/owner injection exists only for filesystem tests. The CLI exposes no
// path, UID, input-file, or bypass option and always checks the real host.
function inspect(dependencies = {}) {
    if ((dependencies.uid ?? process.getuid?.()) !== 0 || process.platform !== 'linux') fail('DIAGNOSTIC_ROOT_LINUX_REQUIRED');
    const root = dependencies.root || '/';
    if (!path.isAbsolute(root) || path.resolve(root) !== root) fail('DIAGNOSTIC_TEST_ROOT');
    const rootUid = dependencies.rootUid ?? 0;
    const at = name => path.join(root, name);
    const same = (a, b) => a.dev === b.dev && a.ino === b.ino && a.uid === b.uid && a.mode === b.mode && a.nlink === b.nlink;
    function directory(stat, uid = rootUid, privateMode = false) {
        if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== uid || stat.mode & (privateMode ? 0o077 : 0o022)) fail('UNSAFE');
    }
    function withParent(name, setupUid, operation) {
        // Pin each checked parent by descriptor. The setup account can rename
        // its own directory; ordinary path checks alone leave an ancestor race.
        let fd = fs.openSync(at('/'), FLAGS | fs.constants.O_DIRECTORY);
        try {
            directory(fs.fstatSync(fd));
            let cursor = '/';
            for (const part of path.dirname(name).split('/').filter(Boolean)) {
                const next = fs.openSync(`/proc/self/fd/${fd}/${part}`, FLAGS | fs.constants.O_DIRECTORY);
                fs.closeSync(fd); fd = next;
                cursor = path.posix.join(cursor, part);
                directory(fs.fstatSync(fd), cursor === ONBOARDING ? setupUid : rootUid, cursor === ONBOARDING);
            }
            return operation(`/proc/self/fd/${fd}/${path.basename(name)}`);
        } finally { fs.closeSync(fd); }
    }
    function read(name, limit, { uid = rootUid, privateMode = false, setupUid } = {}) {
        return withParent(name, setupUid, file => {
        const before = fs.lstatSync(file);
        const safe = stat => stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.uid === uid &&
            !(stat.mode & (privateMode ? 0o077 : 0o022)) && stat.size <= limit;
        if (!safe(before)) fail('UNSAFE');
        const fd = fs.openSync(file, FLAGS);
        try {
            const opened = fs.fstatSync(fd);
            if (!safe(opened) || !same(before, opened)) fail('UNSAFE');
            const buffer = Buffer.alloc(limit + 1); let count = 0;
            try {
                while (count < buffer.length) {
                    const n = fs.readSync(fd, buffer, count, buffer.length - count, null);
                    if (!n) break;
                    count += n;
                }
                const after = fs.fstatSync(fd);
                if (count > limit || count !== opened.size || !same(opened, after) || after.size !== opened.size ||
                    after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs ||
                    !same(after, fs.lstatSync(file))) fail('UNSAFE');
                return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, count));
            } finally { buffer.fill(0); }
        } finally { fs.closeSync(fd); }
        });
    }
    function observed(operation) {
        try { return { status: 'present', value: operation() }; }
        catch (error) {
            return { status: error.code === 'ENOENT' ? 'absent' : error.code === 'UNSAFE' || error.code === 'ELOOP' ? 'unsafe' : 'unreadable' };
        }
    }
    function json(name, limit, options) {
        const result = observed(() => read(name, limit, options));
        if (result.status !== 'present') return result;
        try {
            const value = JSON.parse(result.value);
            return object(value) ? { status: 'present', value } : { status: 'invalid' };
        } catch { return { status: 'invalid' }; }
    }
    const setup = observed(() => {
        if (dependencies.setupUid !== undefined) return dependencies.setupUid;
        const rows = read('/etc/passwd', 1024 * 1024).split('\n').filter(row => row.startsWith('eos-setup:'));
        const id = rows.length === 1 ? rows[0].split(':')[2] : '';
        if (!/^[1-9][0-9]{0,9}$/.test(id) || !Number.isSafeInteger(Number(id))) fail('UNSAFE');
        return Number(id);
    });
    const state = json(BASE + '/release-state.json', 16384);
    const lock = json(BASE + '/.activation.lock', 8192, { privateMode: true });
    const complete = json(BASE + '/first-start-complete.json', 16384);
    const initialized = json('/var/lib/nexowatt-eos/.initialized', 16384);
    const permit = json(BASE + '/maintenance-start.json', 8192);
    const update = json(BASE + '/test-update-r6-status.json', 16384);
    const onboardingOptions = { uid: setup.value, setupUid: setup.value, privateMode: true };
    const onboarding = setup.status === 'present' ? json(ONBOARDING + '/state.json', 4096, onboardingOptions) : { status: 'unsafe' };
    const handoff = setup.status === 'present' ? json(ONBOARDING + '/handoff.json', 65536, onboardingOptions) : { status: 'unsafe' };
    const pointer = observed(() => {
        return withParent('/opt/nexowatt/eos/current', undefined, file => {
        const before = fs.lstatSync(file);
        if (!before.isSymbolicLink() || before.uid !== rootUid || before.nlink !== 1) fail('UNSAFE');
        const target = fs.readlinkSync(file);
        if (!same(before, fs.lstatSync(file)) || !/^\/opt\/nexowatt\/eos\/releases\/[a-f0-9]{64}$/.test(target)) fail('UNSAFE');
        return target.slice(target.lastIndexOf('/') + 1);
        });
    });
    const summarize = (record, select) => record.status === 'present' ? { status: 'present', ...select(record.value) } : { status: record.status };
    const result = {
        schemaVersion: 1,
        code: 'FIRST_START_FILES_DIAGNOSTIC',
        readOnly: true,
        recoveryAuthorized: false,
        releaseState: summarize(state, value => ({ schemaVersion: version(value.schemaVersion), release: release(value.releaseId),
            sequence: [7, 8, 9].includes(value.sequence) ? value.sequence : null, profile: oneOf(value.profile, ['test']) })),
        current: summarize(pointer, value => ({ release: release(value), matchesReleaseState: match(value, state.value?.releaseId, 64) })),
        activationLock: summarize(lock, value => ({ operation: oneOf(value.operation, ['ui-onboarding', 'test-release-repair', 'additive-release', 'certificate-rotation', 'web-certificate-rotation']),
            release: release(value.releaseId), matchesReleaseState: match(value.releaseId, state.value?.releaseId, 64),
            invocationIdValid: hex(value.invocationId, 32), pidValid: Number.isSafeInteger(value.pid) && value.pid > 1 && value.pid <= 2147483647 })),
        completion: summarize(complete, value => ({ schemaVersion: version(value.schemaVersion), release: release(value.releaseId),
            licenseConfigured: typeof value.licenseConfigured === 'boolean' ? value.licenseConfigured : null,
            physicalControlEnabled: typeof value.physicalControlEnabled === 'boolean' ? value.physicalControlEnabled : null })),
        initialized: summarize(initialized, value => ({ release: release(value.releaseId), profile: oneOf(value.profile, ['test']) })),
        maintenancePermit: { status: permit.status },
        r6Update: summarize(update, value => ({ phase: oneOf(value.phase, ['PREPARED', 'TRIAL', 'ACTIVE', 'RESTORED_STOPPED', 'RECOVERY_REQUIRED']) })),
        setupAccount: { status: setup.status },
        onboardingState: summarize(onboarding, value => ({ schemaVersion: version(value.schemaVersion), release: release(value.releaseId),
            state: oneOf(value.state, ['awaiting-code', 'claimed', 'committing', 'blocked']),
            matchesReleaseState: match(value.releaseId, state.value?.releaseId, 64) })),
        handoff: summarize(handoff, value => ({ schemaVersion: version(value.schemaVersion), release: release(value.releaseId),
            settingsSchemaVersion: version(value.settings?.schemaVersion), licenseMode: oneOf(value.license?.mode, ['activate', 'unlicensed']),
            matchesReleaseState: match(value.releaseId, state.value?.releaseId, 64),
            matchesSetupId: match(value.setupId, onboarding.value?.setupId, 32),
            passwordHashPresent: typeof value.passwordHash === 'string' && value.passwordHash.length > 0,
            licenseTokenPresent: typeof value.license?.token === 'string' && value.license.token.length > 0 })),
        notChecked: ['release-signature', 'database-enrollment', 'password-binding', 'license-validity', 'service-status', 'live-coordinator'],
    };
    result.ok = ![state, lock, complete, initialized, permit, update, setup, onboarding, handoff, pointer].some(row => !['present', 'absent'].includes(row.status));
    // Do not retain secret-containing parsed records in the returned object.
    if (handoff.value) { handoff.value.passwordHash = undefined; if (object(handoff.value.license)) handoff.value.license.token = undefined; }
    return result;
}

function main(argv = process.argv.slice(2), dependencies = {}) {
    if (argv.length) return { schemaVersion: 1, ok: false, code: 'DIAGNOSTIC_USAGE', readOnly: true, recoveryAuthorized: false };
    try { return inspect(dependencies); }
    catch { return { schemaVersion: 1, ok: false, code: 'DIAGNOSTIC_UNAVAILABLE', readOnly: true, recoveryAuthorized: false }; }
}
module.exports = { RELEASES, inspect, main };
if (require.main === module) {
    const report = main();
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    process.exitCode = report.ok ? 0 : 1;
}
