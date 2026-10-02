'use strict';
// This module is part of the signed, root-owned EOS application tree. There is
// deliberately no environment, database, URL or browser switch to disable it.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { X509Certificate, createPrivateKey, randomBytes, pbkdf2 } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { createRequire } = require('node:module');
const { securityProjection } = require('./eosSessionSecurity');
const PROFILE = Object.freeze({
    id: 'nexowatt-eos-integrated-test-v1',
    auth: true, secure: true, noBasicAuth: true, bind: '0.0.0.0', port: 8081,
    certificate: '/etc/nexowatt-eos/web/admin.crt',
    privateKey: '/etc/nexowatt-eos/web/admin.key',
    licenseTrust: '/etc/nexowatt-eos/license-trust.json',
});
// Authority IDs belong to the signed product profile, never mutable display/configuration data.
const ROLE_GROUPS = Object.freeze({ service: 'system.group.administrator',
    installer: 'system.group.installateur', enduser: 'system.group.endkunde' });
const ERROR = 'EOS_SIGNED_MAINTENANCE_REQUIRED';
const fail = code => Object.assign(new Error(code), { code });
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const MUTATE_OBJECT = new Set(['setObject', 'extendObject', 'delObject', 'delObjects']);
const DENIED = new Set(['addUser', 'delUser', 'addGroup', 'delGroup', 'changePassword', 'cmdExec', 'writeFile', 'writeFile64', 'unlink', 'rename', 'mkdir',
    'chmodFile', 'chownFile', 'deleteFile', 'deleteFolder', 'renameFile', 'upload',
    'updateLicenses', 'httpGet', 'getRatings']);
const HOST_READS = new Set(['getHostInfo', 'getHostInfoShort', 'getDiagData', 'getVersion',
    'getInstalled', 'getFeatures', 'getInterfaces', 'getIPs', 'getLogs', 'getLogFile']);
const COMMON_EDITABLE = new Set(['enabled', 'loglevel']);
const SYSTEM_COMMON_EDITABLE = new Set(['siteName', 'language', 'tempUnit', 'currency', 'dateFormat',
    'isFloatComma', 'defaultHistory', 'defaultLogLevel', 'firstDayOfWeek', 'country', 'city', 'latitude', 'longitude']);
const META = new Set(['ts', 'from', 'user']);
const UNSAFE_NATIVE = new Set(['allowShellCommands', 'allowExec', 'enableExec', 'exec',
    'additionalNpmPackages', 'additionalNpmModules', 'npmLibs', 'nodeProcessParams', 'runAsCompactMode']);
function assertOauthDependency() {
    // npm ignores overrides from a transitive package. Refuse startup if the
    // appliance assembler did not apply the tested override at its root.
    try {
        const webRequire = createRequire(require.resolve('@iobroker/webserver'));
        const filename = webRequire.resolve('oauth2-server');
        const metadata = JSON.parse(fs.readFileSync(path.join(path.dirname(filename), 'package.json'), 'utf8'));
        if (metadata.name !== '@node-oauth/oauth2-server' || metadata.version !== '5.3.0')
            throw fail('EOS_OAUTH_DEPENDENCY');
    }
    catch {
        throw fail('EOS_OAUTH_DEPENDENCY');
    }
}
function applyProfile(config) {
    return { ...config, auth: true, secure: true, noBasicAuth: true, bind: PROFILE.bind,
        port: PROFILE.port, autoUpdate: 0, tmpPathAllow: false,
        eosAutoAssignDefaultRoleUsers: false, eosPasswordlessFirstLogin: false,
        eosAdminOnlyGroup: ROLE_GROUPS.service,
        eosAdminOnlyGroups: [{ group: ROLE_GROUPS.service, enabled: true }],
        eosSecurityAdminGroups: [{ group: ROLE_GROUPS.service, enabled: true }],
        eosServiceGroups: [{ group: ROLE_GROUPS.service, enabled: true }],
        eosInstallerGroups: [{ group: ROLE_GROUPS.installer, enabled: true }],
        eosEndUserGroups: [{ group: ROLE_GROUPS.enduser, enabled: true }],
        defaultUser: 'system.user.admin', ttl: Math.min(3600, Math.max(120, Number(config?.ttl) || 3600)) };
}
function installPasswordPolicy(adapter) {
    let pending = 0;
    const write = async (user, password, options = {}) => {
        const name = typeof user === 'string' ? user.replace(/^system\.user\./, '') : '';
        if (!/^[A-Za-z0-9_.@-]{1,128}$/.test(name) || typeof password !== 'string'
            || Array.from(password).length < 15 || Array.from(password).length > 128 || Buffer.byteLength(password, 'utf8') > 256
            || /[\u0000-\u001f\u007f]/.test(password)
            || pending >= 2)
            throw fail('EOS_PASSWORD_POLICY');
        pending++;
        try {
            const id = `system.user.${name}`;
            const { eosExpectedAccountRevision, eosAuthorizePasswordWrite, ...filteredOptions } = options;
            const databaseOptions = eosExpectedAccountRevision === undefined && eosAuthorizePasswordWrite === undefined ? options : filteredOptions;
            const object = await adapter.getForeignObjectAsync(id, databaseOptions);
            if (object?.type !== 'user')
                throw fail('EOS_PASSWORD_TARGET');
            const revision = JSON.stringify(securityProjection(id, object));
            if (eosExpectedAccountRevision !== undefined && eosExpectedAccountRevision !== revision)
                throw fail('EOS_PASSWORD_ACCOUNT_CHANGED');
            if (eosAuthorizePasswordWrite && await eosAuthorizePasswordWrite() !== true)
                throw fail('EOS_PASSWORD_ACCOUNT_CHANGED');
            const salt = randomBytes(16).toString('hex');
            // Controller7.2.2 uses a 256-byte PBKDF2-SHA256 output. Keep the
            // supported format while increasing its configurable work factor.
            const key = await new Promise((resolve, reject) => pbkdf2(password, salt, 600000, 256, 'sha256', (error, value) => error ? reject(fail('EOS_PASSWORD_HASH')) : resolve(value)));
            // Recheck after expensive KDF work: a concurrent reset, disable or role
            // change must not be overwritten using an earlier credential proof.
            const current = await adapter.getForeignObjectAsync(id, databaseOptions);
            if (revision !== JSON.stringify(securityProjection(id, current))
                || eosAuthorizePasswordWrite && await eosAuthorizePasswordWrite() !== true)
                throw fail('EOS_PASSWORD_ACCOUNT_CHANGED');
            adapter.eosSessionSecurity?.revoke();
            await adapter.extendForeignObjectAsync(id, { common: { password: `pbkdf2$600000$${key.toString('hex')}$${salt}` } }, databaseOptions);
        }
        finally {
            pending--;
        }
    };
    adapter.setPasswordAsync = write;
    adapter.setPassword = (user, password, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const task = write(user, password, options);
        if (typeof callback === 'function') {
            void task.then(() => callback(null), error => callback(error));
            return;
        }
        return task;
    };
}
function readProtectedFile(filename, privateMaterial = false) {
    if (typeof filename !== 'string' || !path.isAbsolute(filename) || path.resolve(filename) !== filename
        || filename.includes('\0') || process.platform !== 'linux')
        throw fail('EOS_TLS_PATH');
    let directory = path.parse(filename).root;
    for (const segment of ['', ...path.dirname(filename).slice(directory.length).split(path.sep).filter(Boolean)]) {
        if (segment)
            directory = path.join(directory, segment);
        const stat = fs.lstatSync(directory);
        if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o022))
            throw fail('EOS_TLS_PERMISSIONS');
    }
    const before = fs.lstatSync(filename);
    const descriptor = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
        const stat = fs.fstatSync(descriptor);
        if (!before.isFile() || before.isSymbolicLink() || !stat.isFile() || stat.uid !== 0 || stat.nlink !== 1
            || (stat.mode & (privateMaterial ? 0o027 : 0o022)) || before.dev !== stat.dev || before.ino !== stat.ino
            || stat.size < 1 || stat.size > 32768)
            throw fail('EOS_TLS_PERMISSIONS');
        const data = Buffer.alloc(32769);
        let length = 0;
        while (length < data.length) {
            const count = fs.readSync(descriptor, data, length, data.length - length, null);
            if (!count)
                break;
            length += count;
        }
        if (length > 32768)
            throw fail('EOS_TLS_SIZE');
        return data.subarray(0, length);
    }
    finally {
        fs.closeSync(descriptor);
    }
}
function validateTlsMaterial(cert, key, now = Date.now()) {
    try {
        const certificate = new X509Certificate(cert);
        const privateKey = createPrivateKey(key);
        if (certificate.ca || !certificate.subjectAltName || !certificate.checkPrivateKey(privateKey)
            || !Number.isFinite(now) || now < Date.parse(certificate.validFrom) || now >= Date.parse(certificate.validTo))
            throw fail('EOS_TLS_CERTIFICATE');
        return { cert, key, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' };
    }
    catch {
        throw fail('EOS_TLS_CERTIFICATE');
    }
}
function createApplianceHttpsServer(app) {
    try {
        return https.createServer(validateTlsMaterial(readProtectedFile(PROFILE.certificate), readProtectedFile(PROFILE.privateKey, true)), app);
    }
    catch {
        throw fail('EOS_TLS_PROVISIONING_REQUIRED');
    }
}
function safeNative(value, depth = 0) {
    if (depth > 20)
        return false;
    if (value === null || ['string', 'boolean', 'number'].includes(typeof value))
        return typeof value !== 'number' || Number.isFinite(value);
    if (Array.isArray(value))
        return value.length <= 10000 && value.every(item => safeNative(item, depth + 1));
    if (!plain(value))
        return false;
    const keys = Object.keys(value);
    if (keys.length > 10000)
        return false;
    return keys.every(key => !['__proto__', 'prototype', 'constructor'].includes(key)
        && !UNSAFE_NATIVE.has(key) && safeNative(value[key], depth + 1));
}
function commonChangeAllowed(previous, next, editable, partial) {
    if (!plain(next))
        return false;
    return Object.keys(next).every(key => editable.has(key) || isDeepStrictEqual(previous?.[key], next[key]))
        && (partial || Object.keys(previous || {}).every(key => editable.has(key) || Object.hasOwn(next, key)));
}
function objectChangeAllowed(command, id, value, previous) {
    // Device enrollment owns identity, membership, setup metadata and ACLs even
    // for Service browsers. Own password/reset changes use narrow HTTP handlers.
    if (/^system\.(?:user|group)(?:\.|$)/.test(id))
        return false;
    if (command === 'delObject' || command === 'delObjects')
        return !id.startsWith('system.') && id !== 'system';
    if (!plain(value))
        return false;
    const instance = /^system\.adapter\.[a-z][a-z0-9-]*\.\d+$/.test(id);
    if (instance || id === 'system.config') {
        if (!plain(previous) || command === 'setObject' && previous.type !== value.type)
            return false;
        const partial = command === 'extendObject';
        for (const [key, entry] of Object.entries(value)) {
            if (META.has(key))
                continue;
            if (key === 'native') {
                if (!instance && !isDeepStrictEqual(previous.native, entry))
                    return false;
                if (instance && !safeNative(entry))
                    return false;
            }
            else if (key === 'common') {
                if (!commonChangeAllowed(previous.common, entry, instance ? COMMON_EDITABLE : SYSTEM_COMMON_EDITABLE, partial))
                    return false;
                if (instance && Object.hasOwn(entry, 'enabled') && typeof entry.enabled !== 'boolean')
                    return false;
                if (instance && Object.hasOwn(entry, 'loglevel') && !['silly', 'debug', 'info', 'warn', 'error'].includes(entry.loglevel))
                    return false;
            }
            else if (!isDeepStrictEqual(previous[key], entry))
                return false;
        }
        if (!partial && Object.keys(previous).some(key => !META.has(key) && !Object.hasOwn(value, key)))
            return false;
        return true;
    }
    if (/^system\.(?:adapter\.|host\.|repositories$|certificates$|licenses$|meta\.)/.test(id))
        return false;
    if (id.startsWith('system.user.')) {
        if (!previous || Object.hasOwn(value.common || {}, 'password')
            && !isDeepStrictEqual(previous.common?.password, value.common.password))
            return false;
    }
    return true; // Account and data permissions are still checked by the role/upstream guards.
}
function socketCommandAllowed(command, args, objects = {}) {
    if (typeof command !== 'string' || !Array.isArray(args) || DENIED.has(command))
        return false;
    if (command === 'sendToHost')
        return typeof args[1] === 'string' && HOST_READS.has(args[1]);
    if (command === 'sendTo' && /^eos-admin\.\d+$/.test(String(args[0]))) {
        return args[1] === 'eos.license.check' || args[1] === 'admin:getNotificationSchema';
    }
    const id = args[0];
    if (MUTATE_OBJECT.has(command)) {
        if (typeof id !== 'string' || id.length > 1024)
            return false;
        return objectChangeAllowed(command, id, args[1], objects[id]);
    }
    // Controller command queues are not ordinary process datapoints.
    if (['setState', 'setBinaryState', 'createState', 'delState'].includes(command)
        && typeof id === 'string' && /^(?:messagebox\.|system\.host\.|system\.adapter\.[^.]+\.\d+\.(?:plugins\.|sigKill$))/.test(id))
        return false;
    return true;
}
// Explicit read/navigation contract: newly added upstream commands do not silently
// become available to installer/end-user accounts. Commissioning writes use scoped
// EOS HTTP/UI APIs. Raw controller state/object/code administration stays Service-only.
const ROLE_READ_COMMANDS = new Set(['authenticate', 'authEnabled', 'updateTokenExpiration',
    'getAdapterName', 'checkFeatureSupported', 'getCurrentInstance', 'getEasyMode',
    'getIsEasyModeStrict', 'getUserPermissions', 'listPermissions', 'getVersion', 'logout']);
function roleSocketCommandAllowed(role, command, args) {
    if (!['admin', 'installer', 'enduser'].includes(role) || !Array.isArray(args))
        return false;
    if (role === 'admin')
        return true; // Immutable appliance and upstream ACL gates still apply.
    // Raw object batches/views and subscription publications can expose native secrets
    // or password hashes through the controller's cached-object path. They belong to
    // Service along with writes. Product reads/commissioning use scoped EOS HTTP APIs.
    return ROLE_READ_COMMANDS.has(command);
}
function installSocketBoundary(commands, authorize, getObjects) {
    // socket-classes2.3.4's _checkPermissions omits the object payload, forwards
    // only the host command and even skips itself for own-password changes.
    // Guard the real dispatch table before any of those lossy/internal checks.
    if (!plain(commands?.commands) || typeof authorize !== 'function' || typeof getObjects !== 'function')
        throw fail('EOS_SOCKET_PROFILE');
    for (const [name, handler] of Object.entries(commands.commands)) {
        if (typeof handler !== 'function')
            throw fail('EOS_SOCKET_PROFILE');
        commands.commands[name] = (socket, ...args) => {
            const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
            let allowed = false;
            try {
                allowed = authorize(socket, name, args) && socketCommandAllowed(name, args, getObjects());
            }
            catch { /* deny */ }
            if (!allowed) {
                if (callback)
                    callback(name === 'sendToHost' || name === 'sendTo' ? { error: ERROR } : ERROR);
                else
                    socket?.emit?.('permissionError', { command: name, reason: ERROR });
                return;
            }
            return handler(socket, ...args);
        };
    }
}
function blockUnsignedUpload(_req, res) { res.status(403).json({ error: ERROR }); }
module.exports = { PROFILE, ROLE_GROUPS, ERROR, applyProfile, roleSocketCommandAllowed, readProtectedFile, validateTlsMaterial,
    createApplianceHttpsServer, socketCommandAllowed, blockUnsignedUpload, installPasswordPolicy, installSocketBoundary, assertOauthDependency };
//# sourceMappingURL=eosApplianceProfile.js.map