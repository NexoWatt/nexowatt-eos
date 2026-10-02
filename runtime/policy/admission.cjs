'use strict';

// This is a decision library, not an ioBroker sandbox. The caller must verify the
// signed catalogue and enforce an immutable code tree before using a decision.
const { createHash } = require('node:crypto');

const LIMITS = Object.freeze({ bytes: 1048576, depth: 20, nodes: 65536, entries: 128 });
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ID = /^[a-z][a-z0-9-]{0,63}$/;
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]{0,63}\/)?[a-z0-9][a-z0-9._-]{0,127}$/;
const VERSION = /^(?:0|[1-9][0-9]{0,8})\.(?:0|[1-9][0-9]{0,8})\.(?:0|[1-9][0-9]{0,8})(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CAPABILITIES = new Set(['state.read', 'state.write', 'device.tcp', 'device.udp',
    'device.serial', 'device.discovery', 'http.listen', 'https.listen', 'https.client',
    'backup.read', 'backup.write', 'process.fixed']);
const PROTOCOLS = new Set(['eos-redis-tls13-v1', 'eos-postgresql-mtls13-v1', 'eos-channel-mtls13-v1', 'https', 'modbus-tcp', 'modbus-rtu',
    'mqtt-tls', 'mqtt-legacy', 'http-legacy', 'ocpp-wss', 'ocpp-ws-legacy', 'eebus-ship',
    'dns', 'mdns', 'ntp', 'serial-vendor']);

class AdmissionError extends Error {
    constructor(code) { super(code); this.name = 'AdmissionError'; this.code = code; }
}
function fail(code) { throw new AdmissionError(code); }
function assert(condition, code) { if (!condition) fail(code); }
function unicode(value) {
    for (let i = 0; i < value.length; i++) {
        const c = value.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff) {
            const next = value.charCodeAt(++i);
            assert(next >= 0xdc00 && next <= 0xdfff, 'E_UNICODE');
        } else assert(c < 0xdc00 || c > 0xdfff, 'E_UNICODE');
    }
}

// A bounded JSON parser preserves duplicate-key information which JSON.parse
// alone loses. Never merge attacker-controlled object properties into options.
function parseBoundedJson(input) {
    assert(typeof input === 'string', 'E_INPUT_TYPE');
    assert(Buffer.byteLength(input, 'utf8') <= LIMITS.bytes, 'E_INPUT_SIZE');
    let position = 0, nodes = 0;
    const white = () => { while (' \t\r\n'.includes(input[position]) && position < input.length) position++; };
    function string() {
        assert(input[position] === '"', 'E_JSON');
        const start = position++;
        while (position < input.length) {
            const c = input[position++];
            if (c === '\\') { position++; continue; }
            if (c === '"') {
                let value;
                try { value = JSON.parse(input.slice(start, position)); } catch { fail('E_JSON'); }
                unicode(value);
                return value;
            }
        }
        fail('E_JSON');
    }
    function value(depth) {
        assert(depth <= LIMITS.depth && ++nodes <= LIMITS.nodes, 'E_INPUT_COMPLEXITY');
        white();
        if (input[position] === '"') return string();
        if (input[position] === '{') {
            position++; white();
            const result = Object.create(null);
            if (input[position] === '}') { position++; return result; }
            while (true) {
                const key = string();
                assert(!FORBIDDEN_KEYS.has(key), 'E_FORBIDDEN_KEY');
                assert(!Object.hasOwn(result, key), 'E_DUPLICATE_KEY');
                white(); assert(input[position++] === ':', 'E_JSON');
                result[key] = value(depth + 1); white();
                const end = input[position++];
                if (end === '}') return result;
                assert(end === ',', 'E_JSON'); white();
            }
        }
        if (input[position] === '[') {
            position++; white();
            const result = [];
            if (input[position] === ']') { position++; return result; }
            while (true) {
                result.push(value(depth + 1)); white();
                const end = input[position++];
                if (end === ']') return result;
                assert(end === ',', 'E_JSON'); white();
            }
        }
        const start = position;
        while (position < input.length && !' \t\r\n,]}'.includes(input[position])) position++;
        assert(position > start, 'E_JSON');
        let result;
        try { result = JSON.parse(input.slice(start, position)); } catch { fail('E_JSON'); }
        assert(result === null || typeof result === 'boolean' ||
            (typeof result === 'number' && Number.isFinite(result) &&
            (!Number.isInteger(result) || Number.isSafeInteger(result))), 'E_JSON_NUMBER');
        return result;
    }
    const result = value(0); white();
    assert(position === input.length, 'E_JSON');
    return result;
}

// Public object APIs accept data only: accessors, unusual prototypes, symbols,
// hidden fields, cycles and sparse arrays are rejected before any property read.
function inspectData(root) {
    let nodes = 0;
    const ancestors = new Set();
    function visit(value, depth) {
        assert(depth <= LIMITS.depth && ++nodes <= LIMITS.nodes, 'E_INPUT_COMPLEXITY');
        if (value === null || typeof value === 'boolean') return;
        if (typeof value === 'string') { assert(value.length <= LIMITS.bytes, 'E_INPUT_SIZE'); unicode(value); return; }
        if (typeof value === 'number') {
            assert(Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value)), 'E_JSON_NUMBER');
            return;
        }
        assert(typeof value === 'object', 'E_DATA_TYPE');
        assert(!ancestors.has(value), 'E_INPUT_COMPLEXITY');
        const isArray = Array.isArray(value), proto = Object.getPrototypeOf(value);
        assert(isArray ? proto === Array.prototype : proto === Object.prototype || proto === null, 'E_OBJECT_PROTOTYPE');
        ancestors.add(value);
        assert(Object.getOwnPropertySymbols(value).length === 0, 'E_DATA_PROPERTY');
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const keys = Object.keys(descriptors);
        if (isArray) assert(keys.length === value.length + 1, 'E_DATA_PROPERTY');
        for (const key of keys) {
            if (isArray && key === 'length') continue;
            assert(!FORBIDDEN_KEYS.has(key), 'E_FORBIDDEN_KEY');
            const descriptor = descriptors[key];
            assert(descriptor.enumerable && Object.hasOwn(descriptor, 'value'), 'E_DATA_PROPERTY');
            if (isArray) assert(/^(0|[1-9][0-9]*)$/.test(key) && Number(key) < value.length, 'E_DATA_PROPERTY');
            visit(descriptor.value, depth + 1);
        }
        ancestors.delete(value);
    }
    visit(root, 0);
    assert(Buffer.byteLength(JSON.stringify(root), 'utf8') <= LIMITS.bytes, 'E_INPUT_SIZE');
}
function object(value, keys) {
    assert(value !== null && typeof value === 'object' && !Array.isArray(value), 'E_OBJECT');
    const actual = Object.keys(value);
    assert(actual.length === keys.length && actual.every(key => keys.includes(key)), 'E_FIELDS');
}
function text(value, max = 128) { assert(typeof value === 'string' && value.length > 0 && value.length <= max, 'E_STRING'); }
function id(value) { text(value, 64); assert(ID.test(value), 'E_ID'); }
function version(value) {
    text(value, 80); assert(VERSION.test(value), 'E_EXACT_VERSION');
    const prerelease = value.split('-').slice(1).join('-');
    if (prerelease) assert(prerelease.split('.').every(part => !/^[0-9]+$/.test(part) || part === '0' || !part.startsWith('0')), 'E_EXACT_VERSION');
}
function hash(value) { assert(typeof value === 'string' && SHA256.test(value), 'E_DIGEST'); }
function array(value, maximum) { assert(Array.isArray(value) && value.length <= maximum, 'E_ARRAY'); }
function uniqueStrings(value, allowed) {
    array(value, 32); assert(new Set(value).size === value.length, 'E_DUPLICATE');
    for (const member of value) assert(typeof member === 'string' && allowed.has(member), 'E_ENUM');
}
function freeze(value) {
    if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); }
    return value;
}
function snapshot(value) { return freeze(JSON.parse(JSON.stringify(value))); }
function entryCheck(entry) {
    object(entry, ['id', 'package', 'version', 'sha256', 'digestKind', 'kind', 'required', 'review', 'permissions', 'communication']);
    id(entry.id); text(entry.package); assert(PACKAGE.test(entry.package), 'E_PACKAGE'); version(entry.version); hash(entry.sha256);
    assert(entry.digestKind === 'tree-sha256-v1', 'E_DIGEST_KIND');
    assert(['core', 'adapter'].includes(entry.kind) && typeof entry.required === 'boolean', 'E_ENTRY_KIND');
    object(entry.review, ['status', 'evidenceId']);
    assert(['pending', 'approved-test', 'approved-production', 'rejected'].includes(entry.review.status), 'E_REVIEW');
    if (entry.review.evidenceId !== null) id(entry.review.evidenceId);
    const approved = entry.review.status.startsWith('approved-');
    assert(!approved || entry.review.evidenceId !== null, 'E_REVIEW_EVIDENCE');
    const p = entry.permissions;
    object(p, ['capabilities', 'protocols', 'network', 'shellExec', 'additionalNpmModules', 'arbitraryCode']);
    uniqueStrings(p.capabilities, CAPABILITIES); uniqueStrings(p.protocols, PROTOCOLS);
    assert(['none', 'declared-endpoints-and-discovery'].includes(p.network), 'E_NETWORK');
    assert(typeof p.shellExec === 'boolean' && typeof p.arbitraryCode === 'boolean', 'E_PERMISSION');
    array(p.additionalNpmModules, 0);
    assert(['eos-redis-tls13-v1', 'eos-postgresql-mtls13-v1', 'eos-channel-mtls13-v1', 'legacy-unintegrated'].includes(entry.communication), 'E_COMMUNICATION');
    if (approved) {
        // Source/laboratory transport exists; host isolation and installation
        // enforcement are not yet accepted. TLS alone must not admit a package.
        assert(entry.communication !== 'eos-channel-mtls13-v1', 'E_CHANNEL_HOST_PENDING');
        assert(!p.shellExec && !p.arbitraryCode && entry.package !== 'iobroker.javascript', 'E_UNSAFE_EXECUTION');
        assert(['eos-redis-tls13-v1', 'eos-postgresql-mtls13-v1'].includes(entry.communication) && p.protocols.includes(entry.communication), 'E_INTERNAL_TRANSPORT');
    }
    if (p.network === 'none') {
        assert(p.protocols.length === 0 && !p.capabilities.some(item =>
            ['device.tcp', 'device.udp', 'device.discovery', 'http.listen', 'https.listen', 'https.client'].includes(item)), 'E_NETWORK_CONFLICT');
    }
}

function validateCatalog(catalog) {
    inspectData(catalog);
    object(catalog, ['schemaVersion', 'kind', 'catalogRevision', 'entries']);
    assert(catalog.schemaVersion === 1 && catalog.kind === 'eos-adapter-admission', 'E_SCHEMA');
    assert(Number.isSafeInteger(catalog.catalogRevision) && catalog.catalogRevision >= 1, 'E_REVISION');
    array(catalog.entries, LIMITS.entries);
    const ids = new Set(), packages = new Set();
    for (const entry of catalog.entries) {
        entryCheck(entry);
        assert(!ids.has(entry.id) && !packages.has(entry.package), 'E_DUPLICATE_COMPONENT');
        ids.add(entry.id); packages.add(entry.package);
    }
    return snapshot(catalog);
}
function parseCatalog(input) { return validateCatalog(parseBoundedJson(input)); }
function approvedFor(entry, profile) {
    return entry.review.status === 'approved-production' || (profile === 'test' && entry.review.status === 'approved-test');
}
function componentReference(reference, installed) {
    object(reference, installed ? ['id', 'version', 'sha256'] : ['id', 'version']);
    id(reference.id); version(reference.version); if (installed) hash(reference.sha256);
}

// installed and active are separate observations supplied by the trusted host
// agent. Neither a requested package nor catalogue approval means it is running.
function planAdmission(inputCatalog, request) {
    const catalog = validateCatalog(inputCatalog);
    inspectData(request);
    object(request, ['profile', 'requested', 'installed', 'active']);
    assert(['test', 'production'].includes(request.profile), 'E_PROFILE');
    const maps = {};
    for (const field of ['requested', 'installed', 'active']) {
        array(request[field], LIMITS.entries);
        maps[field] = new Map();
        for (const reference of request[field]) {
            componentReference(reference, field === 'installed');
            assert(!maps[field].has(reference.id), 'E_DUPLICATE_COMPONENT');
            maps[field].set(reference.id, reference);
        }
    }
    const byId = new Map(catalog.entries.map(entry => [entry.id, entry]));
    const selected = new Map();
    function select(reference) {
        const entry = byId.get(reference.id);
        assert(entry && entry.version === reference.version, 'E_NOT_IN_CATALOG');
        assert(approvedFor(entry, request.profile), 'E_NOT_APPROVED');
        selected.set(entry.id, entry);
    }
    for (const entry of catalog.entries) if (entry.required) select(entry);
    for (const reference of request.requested) select(reference);
    for (const reference of request.active) {
        const entry = byId.get(reference.id), installed = maps.installed.get(reference.id);
        assert(entry && selected.has(reference.id) && approvedFor(entry, request.profile) &&
            entry.version === reference.version, 'E_ACTIVE_NOT_APPROVED');
        assert(installed && installed.version === entry.version && installed.sha256 === entry.sha256, 'E_ACTIVE_NOT_INSTALLED');
    }
    const selection = [...selected.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(entry => {
        const current = maps.installed.get(entry.id);
        const installed = Boolean(current && current.version === entry.version && current.sha256 === entry.sha256);
        const active = maps.active.has(entry.id);
        return { id: entry.id, package: entry.package, version: entry.version, sha256: entry.sha256,
            digestKind: entry.digestKind, required: entry.required, reviewStatus: entry.review.status,
            communication: entry.communication, installed, active,
            nextAction: installed ? (active ? 'none' : 'activate') : 'install' };
    });
    const quarantine = request.installed.filter(current => {
        const entry = byId.get(current.id);
        return !entry || !selected.has(current.id) || !approvedFor(entry, request.profile) ||
            current.version !== entry.version || current.sha256 !== entry.sha256;
    }).map(current => ({ id: current.id, version: current.version, reason: 'not-in-selected-release' }));
    return snapshot({ schemaVersion: 1, kind: 'eos-admission-plan', profile: request.profile,
        catalogRevision: catalog.catalogRevision, productionReleaseApproved: false,
        enforcement: 'trusted-host-installer-required', selected: selection, quarantine });
}

// tree-sha256-v1: SHA256(UTF8(JSON.stringify(sorted rows))). Every regular
// package-tree file is included, with exact relative POSIX path, byte size and
// SHA256 of its bytes. Sort by UTF-8 bytes; properties are path,size,sha256.
// The privileged enumerator must reject symlinks/special files and verify actual
// bytes without TOCTOU. This function verifies metadata, not filesystem contents.
function componentTreeDigest(files) {
    assert(Array.isArray(files) && files.length > 0 && files.length <= 100000, 'E_TREE_FILES');
    assert(Object.getPrototypeOf(files) === Array.prototype && Object.getOwnPropertySymbols(files).length === 0, 'E_DATA_PROPERTY');
    const descriptors = Object.getOwnPropertyDescriptors(files);
    assert(Object.keys(descriptors).length === files.length + 1, 'E_DATA_PROPERTY');
    for (let i = 0; i < files.length; i++) {
        const descriptor = descriptors[i];
        assert(descriptor && descriptor.enumerable && Object.hasOwn(descriptor, 'value'), 'E_DATA_PROPERTY');
    }
    const seen = new Set();
    const rows = files.map(row => {
        inspectData(row); object(row, ['path', 'size', 'sha256']);
        text(row.path, 1024);
        assert(!/[\\\x00-\x1f\x7f]/.test(row.path) && !row.path.startsWith('/') &&
            row.path.split('/').every(part => part.length > 0 && part !== '.' && part !== '..'), 'E_TREE_PATH');
        assert(!seen.has(row.path), 'E_TREE_DUPLICATE'); seen.add(row.path);
        assert(Number.isSafeInteger(row.size) && row.size >= 0, 'E_TREE_SIZE'); hash(row.sha256);
        return { path: row.path, size: row.size, sha256: row.sha256 };
    });
    rows.sort((a, b) => Buffer.compare(Buffer.from(a.path, 'utf8'), Buffer.from(b.path, 'utf8')));
    return createHash('sha256').update(JSON.stringify(rows), 'utf8').digest('hex');
}

module.exports = { AdmissionError, LIMITS, parseBoundedJson, parseCatalog, validateCatalog, planAdmission, componentTreeDigest };
