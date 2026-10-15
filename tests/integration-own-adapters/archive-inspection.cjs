'use strict';
// Parse the actual archive stream without writing/exposing its secrets. Never
// treat tar readability or the CLI exit code alone as proof of a database export.
const crypto = require('node:crypto');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function inspectArchive(tar, file, { requiredObjects, canaryId, canaryValue, configSha256 }) {
    const required = new Set(requiredObjects), found = new Set(), names = new Set(), entryTypes = new Map(), ancestors = new Set();
    let invalid = false, entries = 0, objectCount = 0, stateCount = 0, canaryObject = false, canaryState = false, configMatches = false;
    try {
        await tar.t({ file, strict: true, onentry(entry) {
            // A later duplicate can replace a previously verified export during
            // extraction. Require one canonical POSIX spelling and one entry per
            // path, including file/directory aliases. Do not normalize an unsafe
            // path into an accepted path after its content has been examined.
            const name = typeof entry.path === 'string' && entry.type === 'Directory' && entry.path.endsWith('/')
                ? entry.path.slice(0, -1) : entry.path;
            if (++entries > 50000 || typeof name !== 'string' || !name || Buffer.byteLength(name) > 1024 || /[\\\x00-\x1f\x7f]/.test(name) ||
                path.posix.isAbsolute(name) || path.posix.normalize(name) !== name || name.split('/').some(part => !part || part === '.' || part === '..') ||
                !(name === 'backup' || name.startsWith('backup/')) ||
                name.includes('nexowatt-backup/backups') || name.includes('backup-stage') ||
                !['File', 'Directory'].includes(entry.type) || names.has(name)) invalid = true;
            if (invalid) return;
            const parts = name.split('/');
            for (let n = 1; n < parts.length; n++) {
                const parent = parts.slice(0, n).join('/');
                if (entryTypes.has(parent) && entryTypes.get(parent) !== 'Directory') invalid = true;
                ancestors.add(parent);
            }
            if (entry.type === 'File' && ancestors.has(name)) invalid = true;
            names.add(name); entryTypes.set(name, entry.type);
            if (!['backup/objects.jsonl', 'backup/states.jsonl', 'backup/config.json'].includes(entry.path)) return;
            if (entry.type !== 'File' || !Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > 32 * 1024 * 1024) { invalid = true; return; }
            let pending = '', bytes = 0;
            // tar 7 / minipass fixes encoding at construction. Keep the entry
            // binary and decode independently, including split UTF-8 sequences.
            const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
            const line = text => {
                if (!text || invalid) return;
                if (Buffer.byteLength(text) > 1048576) { invalid = true; return; }
                let value; try { value = JSON.parse(text); } catch { invalid = true; return; }
                if (entry.path === 'backup/objects.jsonl') {
                    if (++objectCount > 50000 || typeof value?._id !== 'string') { invalid = true; return; }
                    if (required.has(value._id)) {
                        if (found.has(value._id)) invalid = true;
                        found.add(value._id);
                    }
                    if (value._id === canaryId) canaryObject = value.type === 'state' && value.common?.type === 'string';
                } else {
                    if (++stateCount > 50000 || typeof value?.id !== 'string') { invalid = true; return; }
                    if (value.id === canaryId) canaryState = value.state?.val === canaryValue && value.state?.ack === true;
                }
            };
            const consume = text => {
                pending += text;
                if (entry.path === 'backup/config.json') {
                    if (bytes > 131072) invalid = true;
                    return;
                }
                let index;
                while ((index = pending.indexOf('\n')) >= 0) {
                    line(pending.slice(0, index)); pending = pending.slice(index + 1);
                }
                if (Buffer.byteLength(pending) > 1048576) { invalid = true; pending = ''; }
            };
            entry.on('data', chunk => {
                if (invalid) return;
                if (!Buffer.isBuffer(chunk)) { invalid = true; return; }
                bytes += chunk.length;
                if (bytes > 32 * 1024 * 1024) { invalid = true; return; }
                // Stream event exceptions are not covered by the outer await.
                try { consume(decoder.decode(chunk, { stream: true })); }
                catch { invalid = true; pending = ''; }
            });
            entry.on('end', () => {
                if (invalid) return;
                try { consume(decoder.decode()); }
                catch { invalid = true; pending = ''; }
                if (invalid) return;
                if (entry.path === 'backup/config.json') {
                    try { configMatches = sha(Buffer.from(JSON.stringify(JSON.parse(pending)))) === configSha256; }
                    catch { invalid = true; }
                } else if (pending) line(pending);
            });
        } });
    } catch { invalid = true; }
    if (invalid || !canaryObject || !canaryState || !configMatches || required.size !== found.size ||
        !['backup/objects.jsonl', 'backup/states.jsonl', 'backup/config.json'].every(name => names.has(name)))
        throw new Error('OWN_NATIVE_BACKUP_CONTENT');
    return { objectCount, stateCount, requiredObjectsPresent: true, canaryObjectAndStatePresent: true,
        exactRuntimeConfigPresent: true, priorArchivesExcluded: true };
}
module.exports = { inspectArchive };
