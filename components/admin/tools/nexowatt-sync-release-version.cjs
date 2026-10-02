#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function setValue(changes, label, object, key, value) {
    if (object[key] !== value) {
        changes.push({ label, previous: object[key], value });
        object[key] = value;
    }
}

function setJsonValue(changes, label, object, key, value) {
    const previous = object[key];
    if (JSON.stringify(previous) !== JSON.stringify(value)) {
        changes.push({ label, previous, value });
        object[key] = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }
}

function syncReleaseVersion(rootDir) {
    const root = path.resolve(rootDir);
    const packageFile = path.join(root, 'package.json');
    if (!fs.existsSync(packageFile)) {
        throw new Error(`package.json not found in ${root}`);
    }

    const pkg = readJson(packageFile);
    const version = String(pkg.version || '').trim();
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        throw new Error(`Invalid package.json version: ${version || '<missing>'}`);
    }

    const releaseNo = version.match(/^7\.9\.(\d+)/)?.[1] || version.replace(/[^0-9A-Za-z]+/g, '-');
    const expectedBase = `https://unpkg.com/iobroker.eos-admin@${version}`;
    const changes = [];

    // Keep the human-readable release policy aligned with the package version.
    if (pkg.nexowattReleasePolicy && typeof pkg.nexowattReleasePolicy === 'object') {
        const purpose = String(pkg.nexowattReleasePolicy.purpose || '');
        const nextPurpose = purpose
            ? purpose.replace(/\b7\.9\.\d+(?:-[0-9A-Za-z.-]+)?\b/g, version)
            : `accepted NexoWatt EOS release ${version}`;
        setValue(changes, 'package.json nexowattReleasePolicy.purpose', pkg.nexowattReleasePolicy, 'purpose', nextPurpose);
        if (version.includes('-')) {
            setValue(changes, 'package.json nexowattReleasePolicy.acceptedPrerelease', pkg.nexowattReleasePolicy, 'acceptedPrerelease', version);
        } else if (Object.prototype.hasOwnProperty.call(pkg.nexowattReleasePolicy, 'acceptedPrerelease')) {
            changes.push({
                label: 'package.json nexowattReleasePolicy.acceptedPrerelease',
                previous: pkg.nexowattReleasePolicy.acceptedPrerelease,
                value: '<removed>',
            });
            delete pkg.nexowattReleasePolicy.acceptedPrerelease;
        }
    }
    writeJson(packageFile, pkg);

    const jsonTargets = [
        {
            file: 'package-lock.json',
            update(json) {
                setValue(changes, 'package-lock.json version', json, 'version', version);
                if (json.packages?.['']) {
                    const rootPackage = json.packages[''];
                    setValue(changes, 'package-lock.json packages[""] version', rootPackage, 'version', version);
                    // A merge archive can update package.json while leaving stale release scripts,
                    // files and policy metadata in package-lock.json. npm reads the lock root during
                    // packaging, so keep every release-critical root field canonical as well.
                    for (const key of [
                        'name',
                        'description',
                        'license',
                        'author',
                        'private',
                        'engines',
                        'main',
                        'files',
                        'scripts',
                        'dependencies',
                        'devDependencies',
                        'overrides',
                        'keywords',
                        'publishConfig',
                        'nexowattReleasePolicy',
                        'publisher',
                        'copyright',
                    ]) {
                        if (Object.prototype.hasOwnProperty.call(pkg, key)) {
                            setJsonValue(
                                changes,
                                `package-lock.json packages[""] ${key}`,
                                rootPackage,
                                key,
                                pkg[key],
                            );
                        }
                    }
                }
            },
        },
        {
            file: 'io-package.json',
            update(json) {
                setValue(changes, 'io-package.json top-level version', json, 'version', version);
                json.common ||= {};
                setValue(changes, 'io-package.json common.version', json.common, 'version', version);
                setValue(changes, 'io-package.json common.extIcon', json.common, 'extIcon', `${expectedBase}/admin/admin.svg`);
                setValue(changes, 'io-package.json common.readme', json.common, 'readme', `${expectedBase}/README.md`);
                setValue(changes, 'io-package.json common.meta', json.common, 'meta', `${expectedBase}/io-package.json`);
            },
        },
        {
            file: 'src-admin/package.json',
            update(json) {
                setValue(changes, 'src-admin/package.json version', json, 'version', version);
            },
        },
        {
            file: 'src-admin/package-lock.json',
            update(json) {
                setValue(changes, 'src-admin/package-lock.json version', json, 'version', version);
                if (json.packages?.['']) {
                    setValue(changes, 'src-admin/package-lock.json packages[""] version', json.packages[''], 'version', version);
                }
            },
        },
        {
            file: 'src-admin/src/version.json',
            update(json) {
                setValue(changes, 'src-admin/src/version.json version', json, 'version', version);
            },
        },
        {
            file: 'NEXOWATT_EOS_BUILD_INFO.json',
            update(json) {
                setValue(changes, 'NEXOWATT_EOS_BUILD_INFO.json version', json, 'version', version);
                setValue(changes, 'NEXOWATT_EOS_BUILD_INFO.json label', json, 'label', `v${releaseNo}`);
                setValue(
                    changes,
                    'NEXOWATT_EOS_BUILD_INFO.json repositoryEntry',
                    json,
                    'repositoryEntry',
                    `nexowatt-eos-admin-repository-entry-v${releaseNo}.json`,
                );
            },
        },
    ];

    for (const target of jsonTargets) {
        const file = path.join(root, target.file);
        if (!fs.existsSync(file)) {
            throw new Error(`${target.file} is missing`);
        }
        const json = readJson(file);
        target.update(json);
        writeJson(file, json);
    }

    // Keep one canonical repository entry for the current release. When a new
    // patch version is merged over an older folder, the entry is created from
    // the previous canonical entry and then normalized.
    const buildInfo = readJson(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'));
    const targetEntryName = buildInfo.repositoryEntry;
    const targetEntryFile = path.join(root, targetEntryName);
    let entry;
    if (fs.existsSync(targetEntryFile)) {
        entry = readJson(targetEntryFile);
    } else {
        const candidates = fs
            .readdirSync(root)
            .filter(name => /^nexowatt-eos-admin-repository-entry-v.+\.json$/.test(name))
            .sort((a, b) => fs.statSync(path.join(root, b)).mtimeMs - fs.statSync(path.join(root, a)).mtimeMs);
        if (!candidates.length) {
            throw new Error('No repository entry template found');
        }
        entry = readJson(path.join(root, candidates[0]));
        changes.push({ label: targetEntryName, previous: '<missing>', value: 'created' });
    }
    entry['eos-admin'] ||= {};
    setValue(changes, `${targetEntryName} version`, entry['eos-admin'], 'version', version);
    setValue(changes, `${targetEntryName} meta`, entry['eos-admin'], 'meta', `${expectedBase}/io-package.json`);
    setValue(changes, `${targetEntryName} icon`, entry['eos-admin'], 'icon', `${expectedBase}/admin/admin.png`);
    setValue(changes, `${targetEntryName} extIcon`, entry['eos-admin'], 'extIcon', `${expectedBase}/admin/admin.svg`);
    setValue(changes, `${targetEntryName} readme`, entry['eos-admin'], 'readme', `${expectedBase}/README.md`);
    writeJson(targetEntryFile, entry);

    return { root, version, changes, repositoryEntry: targetEntryName };
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const quiet = args.includes('--quiet');
    const rootArg = args.find(arg => !arg.startsWith('--'));
    try {
        const result = syncReleaseVersion(rootArg || path.resolve(__dirname, '..'));
        if (!quiet) {
            if (result.changes.length) {
                console.log(
                    `[NexoWatt EOS version sync] repaired ${result.changes.length} release value(s) for ${result.version}: ${result.changes
                        .map(change => change.label)
                        .join(', ')}`,
                );
            } else {
                console.log(`[NexoWatt EOS version sync] OK (${result.version}; all release files match)`);
            }
        }
    } catch (error) {
        console.error(`[NexoWatt EOS version sync] ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

module.exports = { syncReleaseVersion };
