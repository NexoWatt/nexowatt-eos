'use strict';
// Offline, exact-input-bound build transform. No network or package execution.
// This is not an updater and must never be pointed at the live code directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateProfile } = require('./guard.cjs');
const { parseBoundedJson } = require('../policy/admission.cjs');
const websocketBound = require('./websocket-bound.cjs');
const HASHES = Object.freeze({
    'node_modules/iobroker.js-controller/build/cjs/main.js': 'c8e7c0b42e4f7efa85988f2c9bf357cc9190608b34177ba696b3d14cb0c50573',
    'node_modules/iobroker.js-controller/build/esm/main.js': '3e58dde34ed58667fa65104839e1ef87e2075cba96fc1810dc9a5173ebb2fe27',
    'node_modules/@iobroker/js-controller-cli/build/cjs/lib/setup.js': 'fa9f14db6f73db3121610acd29baff5ab01fc6451f4ce0ffd47531022c2e4e69',
    'node_modules/@iobroker/js-controller-cli/build/esm/lib/setup.js': '3e49f39ff1a98a1a4d14bca7db6a5f90435eeeceaff6385bb6069539e35885ab',
    'node_modules/@iobroker/js-controller-cli/build/cjs/lib/setup/setupInstall.js': '709662c216dc10d849ab9cc867fc9dfef8d582e4657b504ee44bc2ac9e2a453b',
    'node_modules/@iobroker/js-controller-cli/build/esm/lib/setup/setupInstall.js': 'd63b5308af6b1c625b00e61ca48e4fcf928a5ce9346c4d3458a2ed0cdca2efa0'
});
const SOURCE_HASHES = Object.freeze({
    'packages/controller/src/main.ts': 'bbf7470b383bb48ab244ac2bb71dac22414885034a09a91e594a936476daa1e7',
    'packages/cli/src/lib/setup.ts': 'c3f3c70a66ceb19ba29335c19094f6280affe5278864b14d62c5fb51768e43ec',
    'packages/cli/src/lib/setup/setupInstall.ts': 'c381e998308dd131459967205c0558c03c447b172be2ab23c3a6c491b3536bec'
});
const CLI_BLOCK = 'new Set(["url","a","add","install","i","rebuild","upgrade","package","delete","del","unsetup","restore","clean","vendor","plugin","compact","debug","visdebug","repo","update","multihost","mh"])';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function once(source, needle, replacement) {
    if (!source.includes(needle) || source.indexOf(needle) !== source.lastIndexOf(needle)) fail('EOS_TRANSFORM_ANCHOR');
    return source.replace(needle, replacement);
}
function afterInFunction(source, functionName, needle, insertion) {
    const start = source.indexOf(`function ${functionName}(`);
    if (start < 0) fail('EOS_TRANSFORM_FUNCTION');
    const end = source.indexOf('\n}', start);
    const target = source.indexOf(needle, start);
    if (target < 0 || (end >= 0 && target > end)) fail('EOS_TRANSFORM_ANCHOR');
    return source.slice(0, target + needle.length) + insertion + source.slice(target + needle.length);
}
function afterSignature(source, name, insertion) {
    const start = source.indexOf(`function ${name}(`);
    if (start < 0) fail('EOS_TRANSFORM_FUNCTION');
    const brace = source.indexOf('{', start);
    if (brace < 0) fail('EOS_TRANSFORM_ANCHOR');
    return source.slice(0, brace + 1) + insertion + source.slice(brace + 1);
}
function transformMain(input, flavor) {
    let source = input;
    const moduleLine = flavor === 'cjs' ? 'const eosTestProfile = require("../../eos-test-profile.cjs");\n' :
        flavor === 'source' ? '// @ts-ignore EOS helper uses the compiled distribution layout and is supplied by the hash-bound transform.\nimport eosTestProfile from "../../eos-test-profile.cjs";\n' :
            'import eosTestProfile from "../../eos-test-profile.cjs";\n';
    source = '// EOS-TEST-PROFILE-001: always-on configuration and install boundary.\n' + moduleLine + source;
    source = afterSignature(source, 'processMessage', `
    if (eosTestProfile.blockHostCommand(msg.command)) {
        logger.warn("EOS_PROFILE_HOST_COMMAND_DENIED");
        if (msg.callback && msg.from) await sendTo(msg.from, msg.command, { error: "EOS_PROFILE_HOST_COMMAND_DENIED" }, msg.callback);
        return;
    }
`);
    source = afterSignature(source, 'installAdapters', `
    installQueue.length = 0;
    logger.warn("EOS_PROFILE_RUNTIME_INSTALL_DENIED");
    return;
`);
    source = afterSignature(source, 'autoUpgradeAdapters', '\n    return; // EOS: updates are applied only as verified offline system bundles.\n');
    source = afterSignature(source, 'init', '\n    eosTestProfile.assertEnvironment(process.env, config);\n');
    source = afterInFunction(source, 'startInstance', 'const instance = proc.config;', `
    try { eosTestProfile.assertInstance(instance); }
    catch { logger.error("EOS_PROFILE_INSTANCE_DENIED"); return; }
`);
    // Placed after native entrypoint resolution and before any normal start path.
    source = afterInFunction(source, 'startInstance', 'proc.downloadRetry = 0;', `
    try { eosTestProfile.assertEntry(instance, adapterDir, adapterMainFile); }
    catch { logger.error("EOS_PROFILE_ENTRY_DENIED"); return; }
`);
    // Scheduled execution has a separate fork path and must validate again.
    source = afterInFunction(source, 'startScheduledInstance', 'const instance = proc.config;', `
    try { eosTestProfile.assertEntry(instance, adapterDir, fileNameFull); }
    catch { logger.error("EOS_PROFILE_SCHEDULE_DENIED"); skipped = true; processNextScheduledInstance(); return; }
`);
    source = once(source, 'pluginHandler.addPlugins(ioPackage.common.plugins, controllerDir)', 'pluginHandler.addPlugins({}, controllerDir)');
    source = once(source, 'pluginHandler.addPlugins(config.plugins, controllerDir)', 'pluginHandler.addPlugins({}, controllerDir)');
    // The appliance Node executable never receives raw-socket/admin/bind caps.
    // Upstream performs this on first boot / Node version change through sudo.
    // Remove the call in both shipped flavors and the matching TypeScript source;
    // an environment variable must not be the only barrier to that host mutation.
    source = once(source, flavor === 'cjs' ?
        'await import_js_controller_common.tools.setExecutableCapabilities(process.execPath, capabilities, true, true, true);' :
        'await tools.setExecutableCapabilities(process.execPath, capabilities, true, true, true);',
    '// EOS: executable capabilities are controlled by the root release policy.');
    const capabilityLog = flavor === 'source' ?
        'logger.info(\n                                `${hostLogPrefix} Successfully updated capabilities "${capabilities.join(\', \')}" for ${\n                                    process.execPath\n                                }`,\n                            );' : flavor === 'cjs' ?
        'logger.info(`${hostLogPrefix} Successfully updated capabilities "${capabilities.join(", ")}" for ${process.execPath}`);' :
        'logger.info(`${hostLogPrefix} Successfully updated capabilities "${capabilities.join(\', \')}" for ${process.execPath}`);';
    source = once(source, capabilityLog,
        'logger.debug("EOS_PROFILE_NODE_CAPABILITIES_DISABLED");');
    return source;
}
function transformCli(input) {
    return afterSignature(input, 'processCommand', `
    if (${CLI_BLOCK}.has(String(command))) {
        console.error("EOS_PROFILE_CLI_COMMAND_DENIED");
        callback(1);
        return;
    }
`);
}
function transformInstall(input, flavor) {
    const needle = flavor === 'source' ?
        'private async _npmInstall(installOptions: NpmInstallOptions): Promise<void | NpmInstallResult> {' :
        'async _npmInstall(installOptions) {';
    return once(input, needle, needle + '\n        throw new Error("EOS_PROFILE_RUNTIME_NPM_DENIED");\n');
}
function transformFile(relative, input, sourceFile = false) {
    const expected = (sourceFile ? SOURCE_HASHES : HASHES)[relative];
    if (!expected || sha(input) !== expected) fail('EOS_TRANSFORM_SOURCE_HASH');
    const text = input.toString('utf8');
    const flavor = sourceFile ? 'source' : relative.includes('/cjs/') ? 'cjs' : 'esm';
    const result = relative.endsWith('/main.js') || relative.endsWith('/main.ts') ? transformMain(text, flavor) :
        relative.endsWith('/setup.js') || relative.endsWith('/setup.ts') ? transformCli(text) : transformInstall(text, flavor);
    return { relativePath: relative, originalSha256: expected, sha256: sha(result), content: result };
}
function readRegular(file) {
    let fd;
    try {
        fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > 2000000) fail('EOS_TRANSFORM_INPUT_FILE');
        const buffer = Buffer.alloc(2000001);
        let used = 0, count;
        while ((count = fs.readSync(fd, buffer, used, buffer.length - used, null)) > 0) {
            used += count;
            if (used > 2000000) fail('EOS_TRANSFORM_INPUT_FILE');
        }
        return buffer.subarray(0, used);
    } catch { fail('EOS_TRANSFORM_INPUT_FILE'); }
    finally { if (fd !== undefined) fs.closeSync(fd); }
}
function helperText() {
    return readRegular(path.join(__dirname, 'guard.cjs')).toString('utf8') +
        '\n// Instantiate from immutable, release-bound metadata. No environment switch.\nmodule.exports = createGuard(require("./eos-test-profile.json"), path.dirname(__dirname));\n';
}
function parseFileJson(bytes) {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { fail('EOS_PROFILE_JSON_ENCODING'); }
    return parseBoundedJson(text);
}
function buildProfileFiles(appRoot, adapters = []) {
    const profile = validateProfile({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2', adapters });
    for (const packageName of ['iobroker.js-controller', '@iobroker/js-controller-cli']) {
        const info = JSON.parse(readRegular(path.join(appRoot, 'node_modules', packageName, 'package.json')));
        if (info.name !== packageName || info.version !== '7.2.2') fail('EOS_TRANSFORM_PACKAGE_VERSION');
    }
    const files = Object.keys(HASHES).map(relative => transformFile(relative, readRegular(path.join(appRoot, relative))));
    if (websocketBound.needed(profile.adapters)) {
        websocketBound.identity(appRoot, relative => readRegular(path.join(appRoot, relative)));
        files.push(websocketBound.transform(readRegular(path.join(appRoot, websocketBound.FILE))));
    }
    const helper = helperText();
    const generated = {
        'node_modules/iobroker.js-controller/eos-test-profile.cjs': helper,
        'node_modules/iobroker.js-controller/eos-test-profile.json': JSON.stringify(profile, null, 2) + '\n',
        'node_modules/iobroker.js-controller/tmp/.eos-readonly': 'EOS immutable controller tmp directory. Runtime writes are denied.\n'
    };
    for (const [relativePath, content] of Object.entries(generated)) {
        if (fs.existsSync(path.join(appRoot, relativePath))) fail('EOS_TRANSFORM_EXISTING_PROFILE');
        files.push({ relativePath, originalSha256: null, sha256: sha(content), content });
    }
    return files;
}
function applyToBuild(appRoot, adapters = []) {
    // Validate all original bytes before writing any output. Caller provides an
    // isolated build tree, never a live runtime or untrusted writable directory.
    const files = buildProfileFiles(appRoot, adapters);
    for (const file of files) {
        fs.mkdirSync(path.dirname(path.join(appRoot, file.relativePath)), { recursive: true });
        fs.writeFileSync(path.join(appRoot, file.relativePath), file.content);
    }
    return { schemaVersion: 1, kind: 'eos-controller-transform-evidence', controllerVersion: '7.2.2',
        profile: 'isolated-test', productionApproved: false,
        files: files.map(({ content, ...row }) => row) };
}

// Mandatory artifact gate: a signed catalogue cannot accidentally approve an
// unpatched controller. The pinned source/build relation lives in trusted build
// tooling. Dynamic profile entries must exactly match the selected catalogue.
function verifyBuildProfile(appRoot, expectedAdapters = []) {
    if (!Array.isArray(expectedAdapters) || expectedAdapters.length > 128) fail('EOS_PROFILE_EXPECTED_ADAPTERS');
    const expected = new Map();
    for (const entry of expectedAdapters) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
            !Object.hasOwn(entry, 'package') || !Object.hasOwn(entry, 'version') ||
            Object.keys(entry).some(key => !['package', 'version', 'main'].includes(key))) fail('EOS_PROFILE_EXPECTED_ADAPTERS');
        validateProfile({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2',
            adapters: [{ package: entry.package, version: entry.version, main: entry.main === undefined ? 'main.js' : entry.main }] });
        if (expected.has(entry.package)) fail('EOS_PROFILE_EXPECTED_ADAPTERS');
        expected.set(entry.package, entry);
    }
    const pinned = parseFileJson(readRegular(path.join(__dirname, 'pinned-build.json')));
    const staticPaths = [...Object.keys(HASHES),
        'node_modules/iobroker.js-controller/eos-test-profile.cjs',
        'node_modules/iobroker.js-controller/tmp/.eos-readonly'];
    if (pinned.schemaVersion !== 1 || pinned.kind !== 'eos-controller-pinned-test-build' ||
        pinned.controllerVersion !== '7.2.2' || !Array.isArray(pinned.files) || pinned.files.length !== staticPaths.length ||
        JSON.stringify(pinned.originalHashes) !== JSON.stringify(HASHES)) fail('EOS_PROFILE_PINNED_BUILD');
    const seen = new Set(), verified = [];
    const root = path.resolve(appRoot);
    function localFile(relative) {
        if (typeof relative !== 'string' || relative.startsWith('/') || relative.split('/').some(part => !part || part === '.' || part === '..'))
            fail('EOS_PROFILE_PINNED_BUILD');
        // This is a trusted build directory; reject static symlinks including
        // parents. Concurrent attacker-writable ancestors are not supported.
        let current = root;
        for (const part of ['', ...relative.split('/').slice(0, -1)]) {
            if (part) current = path.join(current, part);
            let stat; try { stat = fs.lstatSync(current); } catch { fail('EOS_PROFILE_BUILD_PATH'); }
            if (!stat.isDirectory() || stat.isSymbolicLink()) fail('EOS_PROFILE_BUILD_PATH');
        }
        return readRegular(path.join(root, relative));
    }
    for (const entry of pinned.files) {
        if (!entry || Object.keys(entry).length !== 2 || !staticPaths.includes(entry.relativePath) ||
            seen.has(entry.relativePath) || typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256))
            fail('EOS_PROFILE_PINNED_BUILD');
        seen.add(entry.relativePath);
        if (entry.relativePath.endsWith('/eos-test-profile.cjs') && sha(helperText()) !== entry.sha256) fail('EOS_PROFILE_GUARD_SOURCE_DRIFT');
        const actual = sha(localFile(entry.relativePath));
        if (actual !== entry.sha256) fail('EOS_PROFILE_BUILD_HASH');
        verified.push({ relativePath: entry.relativePath, sha256: actual });
    }
    for (const packageName of ['iobroker.js-controller', '@iobroker/js-controller-cli']) {
        const info = parseFileJson(localFile(`node_modules/${packageName}/package.json`));
        if (info.name !== packageName || info.version !== '7.2.2') fail('EOS_PROFILE_PACKAGE_VERSION');
    }
    const profilePath = 'node_modules/iobroker.js-controller/eos-test-profile.json';
    const profileBytes = localFile(profilePath);
    const profile = validateProfile(parseFileJson(profileBytes));
    if (profile.adapters.length !== expected.size) fail('EOS_PROFILE_CATALOG_MISMATCH');
    for (const entry of profile.adapters) {
        const desired = expected.get(entry.package);
        if (!desired || desired.version !== entry.version || (desired.main !== undefined && desired.main !== entry.main))
            fail('EOS_PROFILE_CATALOG_MISMATCH');
    }
    verified.push({ relativePath: profilePath, sha256: sha(profileBytes) });
    if (websocketBound.needed(profile.adapters)) {
        websocketBound.identity(appRoot, localFile);
        const actual = sha(localFile(websocketBound.FILE));
        if (actual !== websocketBound.OUTPUT) fail('EOS_WEBSOCKET_BUILD_PROFILE');
        verified.push({ relativePath: websocketBound.FILE, sha256: actual });
    }
    return { schemaVersion: 1, kind: 'eos-controller-profile-verification', controllerVersion: '7.2.2',
        productionApproved: false, admittedAdapters: profile.adapters, files: verified };
}
module.exports = { HASHES, SOURCE_HASHES, transformFile, buildProfileFiles, applyToBuild, verifyBuildProfile };
