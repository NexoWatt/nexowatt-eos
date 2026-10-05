/** A one-shot restore handoff within the trusted local EOS runtime. No offline adapter lease. */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, lstatSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

const MAX_ADMISSION_MS = 10 * 60 * 1000;
const MAX_TICKET_BYTES = 1024 * 1024;
const BACKUP_TYPES = new Set(['iobroker', 'redis']);

type RestoreConfig = Record<string, any>;

async function archiveHash(fileName: string): Promise<string> {
    const hash = createHash('sha256');
    const stat = lstatSync(fileName);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('EOS_RECOVERY_ARCHIVE_INVALID');
    for await (const chunk of createReadStream(fileName)) hash.update(chunk);
    return hash.digest('hex');
}

/** Called only after a fresh operational entitlement check, before stopping Admin. */
export async function stageAuthorizedRestore(directory: string, config: RestoreConfig, assertAllowed: () => void): Promise<string> {
    if (!BACKUP_TYPES.has(config.backupType) || !isAbsolute(config.fileName)) {
        throw new Error('EOS_RECOVERY_SCOPE_INVALID');
    }
    assertAllowed();
    const archiveSha256 = await archiveHash(config.fileName);
    assertAllowed();
    const key = randomBytes(32).toString('hex');
    const payload = JSON.stringify({
        v: 1,
        operation: 'restore',
        expiresAt: Date.now() + MAX_ADMISSION_MS,
        archiveSha256,
        config,
    });
    const mac = createHmac('sha256', Buffer.from(key, 'hex')).update(payload).digest('hex');
    const ticket = JSON.stringify({ payload, mac });
    if (Buffer.byteLength(ticket) > MAX_TICKET_BYTES) throw new Error('EOS_RECOVERY_CONFIG_TOO_LARGE');
    // A stale ticket is deliberately not overwritten: the operator must investigate it.
    writeFileSync(join(directory, 'restore.json'), ticket, { mode: 0o600, flag: 'wx' });
    return key;
}

/** Atomically claim and consume the exact admitted operation; a copied JSON file is insufficient. */
export async function consumeAuthorizedRestore(directory: string, key: string | undefined): Promise<RestoreConfig> {
    if (!key || !/^[a-f0-9]{64}$/.test(key)) throw new Error('EOS_RECOVERY_AUTH_REQUIRED');
    const ticketPath = join(directory, 'restore.json');
    const consumedPath = join(directory, `restore.consuming-${randomBytes(16).toString('hex')}.json`);
    renameSync(ticketPath, consumedPath);
    let ticket;
    try {
        const stat = lstatSync(consumedPath);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_TICKET_BYTES
            || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()) {
            throw new Error('EOS_RECOVERY_TICKET_INVALID');
        }
        ticket = JSON.parse(readFileSync(consumedPath, 'utf8'));
    } finally {
        unlinkSync(consumedPath);
    }
    if (!ticket || typeof ticket.payload !== 'string' || !/^[a-f0-9]{64}$/.test(ticket.mac)) {
        throw new Error('EOS_RECOVERY_TICKET_INVALID');
    }
    const mac = createHmac('sha256', Buffer.from(key, 'hex')).update(ticket.payload).digest();
    if (!timingSafeEqual(mac, Buffer.from(ticket.mac, 'hex'))) throw new Error('EOS_RECOVERY_AUTH_REQUIRED');
    const grant = JSON.parse(ticket.payload);
    const now = Date.now();
    if (grant.v !== 1 || grant.operation !== 'restore' || !Number.isSafeInteger(grant.expiresAt)
        || grant.expiresAt <= now || grant.expiresAt > now + MAX_ADMISSION_MS
        || !grant.config || !BACKUP_TYPES.has(grant.config.backupType)
        || typeof grant.config.fileName !== 'string' || !isAbsolute(grant.config.fileName)
        || grant.archiveSha256 !== await archiveHash(grant.config.fileName)) {
        throw new Error('EOS_RECOVERY_SCOPE_INVALID');
    }
    return grant.config;
}
