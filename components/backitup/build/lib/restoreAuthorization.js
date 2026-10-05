"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stageAuthorizedRestore = stageAuthorizedRestore;
exports.consumeAuthorizedRestore = consumeAuthorizedRestore;
/** A one-shot restore handoff within the trusted local EOS runtime. No offline adapter lease. */
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const MAX_ADMISSION_MS = 10 * 60 * 1000;
const MAX_TICKET_BYTES = 1024 * 1024;
const BACKUP_TYPES = new Set(['iobroker', 'redis']);
async function archiveHash(fileName) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    const stat = (0, node_fs_1.lstatSync)(fileName);
    if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error('EOS_RECOVERY_ARCHIVE_INVALID');
    for await (const chunk of (0, node_fs_1.createReadStream)(fileName))
        hash.update(chunk);
    return hash.digest('hex');
}
/** Called only after a fresh operational entitlement check, before stopping Admin. */
async function stageAuthorizedRestore(directory, config, assertAllowed) {
    if (!BACKUP_TYPES.has(config.backupType) || !(0, node_path_1.isAbsolute)(config.fileName)) {
        throw new Error('EOS_RECOVERY_SCOPE_INVALID');
    }
    assertAllowed();
    const archiveSha256 = await archiveHash(config.fileName);
    assertAllowed();
    const key = (0, node_crypto_1.randomBytes)(32).toString('hex');
    const payload = JSON.stringify({
        v: 1,
        operation: 'restore',
        expiresAt: Date.now() + MAX_ADMISSION_MS,
        archiveSha256,
        config,
    });
    const mac = (0, node_crypto_1.createHmac)('sha256', Buffer.from(key, 'hex')).update(payload).digest('hex');
    const ticket = JSON.stringify({ payload, mac });
    if (Buffer.byteLength(ticket) > MAX_TICKET_BYTES)
        throw new Error('EOS_RECOVERY_CONFIG_TOO_LARGE');
    // A stale ticket is deliberately not overwritten: the operator must investigate it.
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(directory, 'restore.json'), ticket, { mode: 0o600, flag: 'wx' });
    return key;
}
/** Atomically claim and consume the exact admitted operation; a copied JSON file is insufficient. */
async function consumeAuthorizedRestore(directory, key) {
    if (!key || !/^[a-f0-9]{64}$/.test(key))
        throw new Error('EOS_RECOVERY_AUTH_REQUIRED');
    const ticketPath = (0, node_path_1.join)(directory, 'restore.json');
    const consumedPath = (0, node_path_1.join)(directory, `restore.consuming-${(0, node_crypto_1.randomBytes)(16).toString('hex')}.json`);
    (0, node_fs_1.renameSync)(ticketPath, consumedPath);
    let ticket;
    try {
        const stat = (0, node_fs_1.lstatSync)(consumedPath);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_TICKET_BYTES
            || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()) {
            throw new Error('EOS_RECOVERY_TICKET_INVALID');
        }
        ticket = JSON.parse((0, node_fs_1.readFileSync)(consumedPath, 'utf8'));
    }
    finally {
        (0, node_fs_1.unlinkSync)(consumedPath);
    }
    if (!ticket || typeof ticket.payload !== 'string' || !/^[a-f0-9]{64}$/.test(ticket.mac)) {
        throw new Error('EOS_RECOVERY_TICKET_INVALID');
    }
    const mac = (0, node_crypto_1.createHmac)('sha256', Buffer.from(key, 'hex')).update(ticket.payload).digest();
    if (!(0, node_crypto_1.timingSafeEqual)(mac, Buffer.from(ticket.mac, 'hex')))
        throw new Error('EOS_RECOVERY_AUTH_REQUIRED');
    const grant = JSON.parse(ticket.payload);
    const now = Date.now();
    if (grant.v !== 1 || grant.operation !== 'restore' || !Number.isSafeInteger(grant.expiresAt)
        || grant.expiresAt <= now || grant.expiresAt > now + MAX_ADMISSION_MS
        || !grant.config || !BACKUP_TYPES.has(grant.config.backupType)
        || typeof grant.config.fileName !== 'string' || !(0, node_path_1.isAbsolute)(grant.config.fileName)
        || grant.archiveSha256 !== await archiveHash(grant.config.fileName)) {
        throw new Error('EOS_RECOVERY_SCOPE_INVALID');
    }
    return grant.config;
}
