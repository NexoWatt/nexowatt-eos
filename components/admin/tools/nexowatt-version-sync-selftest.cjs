#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { syncReleaseVersion } = require('./nexowatt-sync-release-version.cjs');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-eos-version-sync-'));
const fail = message => {
    console.error(`[NexoWatt EOS version sync selftest] ${message}`);
    fs.rmSync(temp, { recursive: true, force: true });
    process.exit(1);
};
const readJson = file => JSON.parse(fs.readFileSync(path.join(temp, file), 'utf8'));
const writeJson = (file, value) => {
    const target = path.join(temp, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

try {
    const currentPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const version = currentPkg.version;
    writeJson('package.json', currentPkg);
    writeJson('package-lock.json', {
        name: currentPkg.name,
        version: '7.9.92',
        packages: {
            '': {
                version: '7.9.92',
                description: 'stale description',
                files: ['README_STABILITY_V7.9.92.md'],
                scripts: { 'check:eos-stable-v92': 'node stale.js' },
                nexowattReleasePolicy: { distTag: 'latest', purpose: 'stale 7.9.92 policy' },
            },
        },
    });
    writeJson('io-package.json', {
        version: '7.9.92',
        common: {
            version: '7.9.92',
            extIcon: 'https://unpkg.com/iobroker.eos-admin@7.9.92/admin/admin.svg',
            readme: 'https://unpkg.com/iobroker.eos-admin@7.9.92/README.md',
            meta: 'https://unpkg.com/iobroker.eos-admin@7.9.92/io-package.json',
        },
        native: {},
    });
    writeJson('src-admin/package.json', { name: 'src-rx', version: '7.9.92' });
    writeJson('src-admin/package-lock.json', { name: 'src-rx', version: '7.9.92', packages: { '': { version: '7.9.92' } } });
    writeJson('src-admin/src/version.json', { version: '7.9.92' });
    writeJson('NEXOWATT_EOS_BUILD_INFO.json', { version: '7.9.92', label: 'v92', repositoryEntry: 'nexowatt-eos-admin-repository-entry-v92.json' });
    writeJson('nexowatt-eos-admin-repository-entry-v92.json', {
        'eos-admin': {
            version: '7.9.92',
            meta: 'https://unpkg.com/iobroker.eos-admin@7.9.92/io-package.json',
            icon: 'https://unpkg.com/iobroker.eos-admin@7.9.92/admin/admin.png',
            extIcon: 'https://unpkg.com/iobroker.eos-admin@7.9.92/admin/admin.svg',
            readme: 'https://unpkg.com/iobroker.eos-admin@7.9.92/README.md',
        },
    });

    const result = syncReleaseVersion(temp);
    if (result.version !== version) fail(`expected ${version}, got ${result.version}`);

    const io = readJson('io-package.json');
    const lock = readJson('package-lock.json');
    const src = readJson('src-admin/package.json');
    const srcLock = readJson('src-admin/package-lock.json');
    const srcVersion = readJson('src-admin/src/version.json');
    const build = readJson('NEXOWATT_EOS_BUILD_INFO.json');
    const entry = readJson(build.repositoryEntry)['eos-admin'];
    const expectedBase = `https://unpkg.com/iobroker.eos-admin@${version}`;

    for (const [label, actual] of [
        ['io top-level', io.version],
        ['io common', io.common.version],
        ['lock', lock.version],
        ['lock root', lock.packages[''].version],
        ['src package', src.version],
        ['src lock', srcLock.version],
        ['src lock root', srcLock.packages[''].version],
        ['src version', srcVersion.version],
        ['build version', build.version],
        ['entry version', entry.version],
    ]) {
        if (actual !== version) fail(`${label} was not synchronized: ${actual}`);
    }
    for (const key of ['description', 'files', 'scripts', 'nexowattReleasePolicy']) {
        if (JSON.stringify(lock.packages[''][key]) !== JSON.stringify(currentPkg[key])) {
            fail(`package-lock root ${key} was not synchronized`);
        }
    }
    if (io.common.meta !== `${expectedBase}/io-package.json`) fail('io-package URL was not synchronized');
    if (entry.meta !== `${expectedBase}/io-package.json`) fail('repository entry URL was not synchronized');
    if (!fs.existsSync(path.join(temp, build.repositoryEntry))) fail('current repository entry was not created');

    fs.rmSync(temp, { recursive: true, force: true });
    console.log(`[NexoWatt EOS version sync selftest] OK (${version}; stale 7.9.92 merge repaired)`);
} catch (error) {
    fail(error instanceof Error ? error.stack || error.message : String(error));
}
