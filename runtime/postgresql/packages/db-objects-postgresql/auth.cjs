'use strict';

const { isDeepStrictEqual } = require('node:util');
const ADMIN = 'system.user.admin';
const ADMIN_GROUP = 'system.group.administrator';
const actions = ['list', 'read', 'write', 'create', 'delete'];
const domains = ['object', 'file', 'state', 'users'];
function rights(allowed) { return Object.fromEntries(domains.map(domain => [domain, Object.fromEntries(actions.map(action => [action, allowed]))])); }
function denied() { return new Error('permissionError'); }
function parse(buffer) { return buffer === null ? null : JSON.parse(buffer.toString('utf8')); }

function cleanOptions(value) {
    if (value === undefined || value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error('EOS_PG_OPTIONS_INVALID');
    const options = { ...value };
    for (const key of ['acl', 'groups', 'group', 'checked', '__proto__', 'constructor', 'prototype']) delete options[key];
    if (options.user !== undefined && (typeof options.user !== 'string' || !/^system\.user\.[a-zA-Z0-9_.@-]{1,128}$/.test(options.user))) throw denied();
    return options;
}

async function resolve(store, prefix, supplied) {
    const options = cleanOptions(supplied);
    const user = options.user || ADMIN;
    // Legacy ioBroker callers omit user for their trusted service operations.
    // This compatibility contract is NOT authentication of hostile adapter code.
    if (user === ADMIN) return { ...options, user, groups: [ADMIN_GROUP], group: ADMIN_GROUP, acl: rights(true) };
    const userObject = parse(await store.get(prefix + user));
    if (!userObject || userObject.type !== 'user' || userObject.common?.enabled !== true) throw denied();
    const keys = await store.keys(prefix + 'system.group.*');
    const groupRows = [];
    for (let i = 0; i < keys.length; i += 10000) groupRows.push(...await store.getMany(keys.slice(i, i + 10000)));
    const groups = [];
    const acl = rights(false);
    for (const row of groupRows) {
        const group = parse(row);
        if (!group || group.type !== 'group' || !Array.isArray(group.common?.members) || !group.common.members.includes(user)) continue;
        groups.push(group._id);
        if (group._id === ADMIN_GROUP) return { ...options, user, groups: [ADMIN_GROUP], group: ADMIN_GROUP, acl: rights(true) };
        for (const domain of domains) for (const action of actions) if (group.common.acl?.[domain]?.[action] === true) acl[domain][action] = true;
    }
    return { ...options, user, groups, group: groups[0], acl };
}

function admin(options) { return options.user === ADMIN || options.groups.includes(ADMIN_GROUP); }
function requireRight(options, domain, action) { if (options.acl[domain]?.[action] !== true) throw denied(); }
function objectRight(object, options, action) {
    if (!object || admin(options)) return true;
    if (!object.acl || !Number.isInteger(object.acl.object)) return false;
    const shift = object.acl.owner === options.user ? 8 : options.groups.includes(object.acl.ownerGroup) ? 4 : 0;
    return !!(object.acl.object & ((action === 'read' ? 4 : 2) << shift));
}

function protectAcl(oldObject, nextObject, options) {
    if (admin(options)) return;
    if (oldObject && nextObject.acl && !isDeepStrictEqual(oldObject.acl, nextObject.acl)) throw denied();
    if (!oldObject && nextObject.acl && (nextObject.acl.owner !== options.user || !options.groups.includes(nextObject.acl.ownerGroup))) throw denied();
}

function prepareHostDocument(id, document, options, hostname) {
    // Controller 7.2.2 places the actual Node process.env object into its own
    // host metadata. That object has an exotic prototype and can contain
    // secrets. Admit only this exact trusted service shape, omit environment
    // contents, and still validate every remaining document field normally.
    // Do not mutate the caller or broadly accept custom prototypes/toJSON.
    const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
    if (!plain(document) || !plain(document.native) || !plain(document.native.process)) return document;
    if (id !== `system.host.${hostname}` || document.type !== 'host' || !admin(options) || document.native.process.env !== process.env) return document;
    return { ...document, native: { ...document.native, process: { ...document.native.process, env: {} } } };
}

function documentError(code) { const error = new Error(code); error.code = code; return error; }
function validateDocument(document) {
    const visited = new Set();
    let count = 0;
    function walk(value, depth) {
        if (++count > 100000 || depth > 64) throw documentError('EOS_PG_DOCUMENT_LIMIT');
        if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
        if (typeof value === 'number' && Number.isFinite(value)) return;
        if (!value || typeof value !== 'object' || visited.has(value) || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw documentError('EOS_PG_DOCUMENT_INVALID');
        visited.add(value);
        for (const key of Object.keys(value)) {
            if (['__proto__', 'prototype', 'constructor'].includes(key)) throw documentError('EOS_PG_DOCUMENT_UNSAFE_KEY');
            if (value[key] !== undefined) walk(value[key], depth + 1);
        }
        visited.delete(value);
    }
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw documentError('EOS_PG_DOCUMENT_INVALID');
    walk(document, 0);
}

module.exports = { ADMIN, ADMIN_GROUP, rights, denied, parse, resolve, cleanOptions, admin, requireRight, objectRight, protectAcl, prepareHostDocument, validateDocument };
