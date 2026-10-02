'use strict';
// Always-on in the EOS build. This controls configuration-based code loading;
// it does not sandbox arbitrary code already running under the ioBroker UID.
const fs = require('node:fs');
const path = require('node:path');

const HOST_BLOCKED = new Set(['cmdExec', 'shell', 'upgradeController', 'upgradeAdapterWithWebserver',
    'rebuildAdapter', 'upgradeOsPackages', 'updateMultihost', 'writeBaseSettings', 'readBaseSettings',
    'writeDirAsZip', 'writeObjectsAsZip']);
const CLI_BLOCKED = new Set(['url', 'a', 'add', 'install', 'i', 'rebuild', 'upgrade', 'package',
    'delete', 'del', 'unsetup', 'restore', 'clean', 'vendor', 'plugin', 'compact', 'debug',
    'visdebug', 'repo', 'update', 'multihost', 'mh']);
function denied(code) { const error = new Error(code); error.code = code; throw error; }
function ensure(condition, code) { if (!condition) denied(code); }
function sameKeys(object, expected) {
    ensure(object && typeof object === 'object' && !Array.isArray(object), 'EOS_PROFILE_FORMAT');
    ensure(Object.keys(object).length === expected.length && expected.every(k => Object.hasOwn(object, k)), 'EOS_PROFILE_FORMAT');
}
function safeRelative(file) {
    return typeof file === 'string' && file.length > 0 && file.length < 512 &&
        !/[\\\x00-\x1f\x7f]/.test(file) && !path.isAbsolute(file) &&
        file.split('/').every(part => part && part !== '.' && part !== '..') && /\.(?:cjs|mjs|js)$/.test(file);
}
function validateProfile(profile) {
    sameKeys(profile, ['schemaVersion', 'kind', 'controllerVersion', 'adapters']);
    ensure(profile.schemaVersion === 1 && profile.kind === 'eos-controller-test-profile' &&
        profile.controllerVersion === '7.2.2' && Array.isArray(profile.adapters) && profile.adapters.length <= 128, 'EOS_PROFILE_FORMAT');
    const seen = new Set();
    for (const adapter of profile.adapters) {
        sameKeys(adapter, ['package', 'version', 'main']);
        ensure(typeof adapter.package === 'string' && /^iobroker\.[a-z][a-z0-9_-]{0,63}$/.test(adapter.package) &&
            !['iobroker.javascript', 'iobroker.js-controller'].includes(adapter.package), 'EOS_PROFILE_PACKAGE');
        ensure(typeof adapter.version === 'string' && /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?$/.test(adapter.version) &&
            adapter.version.length <= 80 && safeRelative(adapter.main), 'EOS_PROFILE_VERSION_OR_MAIN');
        ensure(!seen.has(adapter.package), 'EOS_PROFILE_DUPLICATE'); seen.add(adapter.package);
    }
    return JSON.parse(JSON.stringify(profile));
}
function createGuard(profileInput, nodeModulesRoot) {
    const profile = validateProfile(profileInput);
    const admitted = new Map(profile.adapters.map(a => [a.package, Object.freeze(a)]));
    const root = path.resolve(nodeModulesRoot);
    function instanceCheck(instance) {
        ensure(instance && typeof instance._id === 'string' && /^system\.adapter\.[a-z][a-z0-9_-]{0,63}\.[0-9]{1,6}$/.test(instance._id), 'EOS_PROFILE_INSTANCE');
        const common = instance.common;
        ensure(common && typeof common === 'object', 'EOS_PROFILE_INSTANCE');
        const name = instance._id.split('.')[2], spec = admitted.get(`iobroker.${name}`);
        ensure(spec && common.name === name && common.version === spec.version, 'EOS_PROFILE_NOT_ADMITTED');
        ensure(common.nodeProcessParams === undefined || (Array.isArray(common.nodeProcessParams) && common.nodeProcessParams.length === 0), 'EOS_PROFILE_NODE_ARGS');
        ensure(common.main === undefined || common.main === spec.main, 'EOS_PROFILE_MAIN');
        ensure((common.runAsCompactMode === undefined || common.runAsCompactMode === false) &&
            ['daemon', 'once', 'schedule'].includes(common.mode), 'EOS_PROFILE_EXECUTION_MODE');
        if (common.memoryLimitMB !== undefined && common.memoryLimitMB !== 0)
            ensure(Number.isInteger(common.memoryLimitMB) && common.memoryLimitMB >= 16 && common.memoryLimitMB <= 16384, 'EOS_PROFILE_MEMORY');
        for (const settings of [common, instance.native || {}]) {
            ensure(settings && typeof settings === 'object' && !Array.isArray(settings), 'EOS_PROFILE_INSTANCE');
            for (const key of ['additionalNpmModules', 'additionalNpmPackages', 'npmLibs', 'libraries']) {
                const value = settings[key];
                ensure(value === undefined || value === '' || (Array.isArray(value) && value.length === 0), 'EOS_PROFILE_DYNAMIC_NPM');
            }
            for (const key of ['exec', 'enableExec', 'allowExec', 'allowShellCommands'])
                ensure(settings[key] === undefined || settings[key] === false, 'EOS_PROFILE_SHELL');
        }
        return spec;
    }
    function entryCheck(instance, adapterDir, entryFile) {
        const spec = instanceCheck(instance);
        const expectedDir = path.join(root, spec.package);
        ensure(adapterDir === expectedDir && fs.realpathSync(expectedDir) === expectedDir, 'EOS_PROFILE_PACKAGE_PATH');
        const expectedFile = path.join(expectedDir, spec.main);
        ensure(typeof entryFile === 'string' && path.resolve(entryFile) === expectedFile &&
            fs.realpathSync(expectedFile) === expectedFile && fs.statSync(expectedFile).isFile(), 'EOS_PROFILE_ENTRY_PATH');
        const packageJson = JSON.parse(fs.readFileSync(path.join(expectedDir, 'package.json'), 'utf8'));
        ensure(packageJson.name === spec.package && packageJson.version === spec.version, 'EOS_PROFILE_PACKAGE_VERSION');
        return true;
    }
    function environmentCheck(env, config) {
        ensure(!env.NODE_OPTIONS && !env.NODE_PATH, 'EOS_PROFILE_NODE_ENV');
        ensure(config?.system?.allowShellCommands === false && config?.system?.compact === false, 'EOS_PROFILE_HOST_CONFIG');
        const plugins = config?.plugins;
        ensure(plugins === undefined || (plugins && typeof plugins === 'object' && !Array.isArray(plugins)), 'EOS_PROFILE_PLUGINS');
        const onlyDisabledSentry = plugins && Object.keys(plugins).length === 1 && Object.hasOwn(plugins, 'sentry') &&
            plugins.sentry && Object.keys(plugins.sentry).length === 1 && plugins.sentry.enabled === false;
        ensure(!plugins || Object.keys(plugins).length === 0 || onlyDisabledSentry, 'EOS_PROFILE_PLUGINS');
    }
    return Object.freeze({
        blockHostCommand: command => HOST_BLOCKED.has(command),
        blockCliCommand: command => CLI_BLOCKED.has(command),
        assertInstance: instanceCheck, assertEntry: entryCheck, assertEnvironment: environmentCheck,
        configuration: Object.freeze({ controllerVersion: profile.controllerVersion, admittedPackages: Object.freeze([...admitted.keys()]) })
    });
}
module.exports = { validateProfile, createGuard };
