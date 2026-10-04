'use strict';
const fs = require('node:fs');
const path = require('node:path');
const SIGNALS = Object.freeze({ LICENSE_VALID: '[EOS licensing] LICENSE_VALID', LICENSE_MISSING: '[EOS licensing] LICENSE_MISSING',
    TLS_PROVISIONING: 'EOS_TLS_PROVISIONING_REQUIRED', PG_TRANSACTION: 'EOS_PG_TRANSACTION_FAILED', READ_ONLY_WRITE: 'EROFS',
    PERMISSION_DENIED: 'EACCES', TYPE_ERROR: 'TypeError:', REFERENCE_ERROR: 'ReferenceError:', OAUTH_DEPENDENCY: 'EOS_OAUTH_DEPENDENCY',
    UNCAUGHT_EXCEPTION: 'uncaught exception', UNHANDLED_REJECTION: 'UnhandledPromiseRejection' });
function indicators(text) {
    text = text.replace(/\x1b\[[0-9;]*m/g, '');
    const result = new Set(Object.entries(SIGNALS).filter(([, needle]) => text.includes(needle)).map(([code]) => code));
    if (/\b(?:error|fatal):/i.test(text)) result.add('RUNTIME_ERROR_LOGGED');
    return result;
}
function loggerConfiguration(directory) {
    return { level: 'info', noStdout: false, transport: { file1: { type: 'file', enabled: true, level: 'info',
        filename: path.join(directory, 'runtime'), maxSize: '1m', maxFiles: 4, zippedArchive: false, createSymlink: false } } };
}
class RuntimeLog {
    constructor(directory) { this.directory = directory; this.positions = new Map(); this.total = 0; this.seen = new Set(); this.scan(true); }
    scan(baseline = false) {
        const names = fs.readdirSync(this.directory).filter(name => /^runtime\.\d{4}-\d{2}-\d{2}\.log(?:\.\d+)?$/.test(name));
        if (names.length > 8) throw new Error('MANAGEMENT_LOG_LIMIT');
        for (const name of names) {
            const filename = path.join(this.directory, name), before = fs.lstatSync(filename);
            if (!before.isFile() || before.isSymbolicLink()) throw new Error('MANAGEMENT_LOG_BOUNDARY');
            const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
            try {
                const stat = fs.fstatSync(fd);
                if (!before.isFile() || before.isSymbolicLink() || !stat.isFile() || stat.uid !== process.getuid() || stat.nlink !== 1 ||
                    (stat.mode & 0o077) || before.dev !== stat.dev || before.ino !== stat.ino) throw new Error('MANAGEMENT_LOG_BOUNDARY');
                if (stat.size > 2 * 1024 * 1024) throw new Error('MANAGEMENT_LOG_LIMIT');
                const key = stat.dev + ':' + stat.ino, previous = this.positions.get(key) || { offset: 0, tail: '' };
                if (baseline) { this.positions.set(key, { offset: stat.size, tail: '' }); continue; }
                if (stat.size < previous.offset) throw new Error('MANAGEMENT_LOG_TRUNCATED');
                const length = stat.size - previous.offset;
                if (this.total + length > 4 * 1024 * 1024) throw new Error('MANAGEMENT_LOG_LIMIT');
                const bytes = Buffer.alloc(length); let read = 0;
                while (read < length) { const n = fs.readSync(fd, bytes, read, length - read, previous.offset + read); if (!n) break; read += n; }
                const text = previous.tail + bytes.subarray(0, read).toString('utf8');
                for (const code of indicators(text)) this.seen.add(code);
                this.total += read; this.positions.set(key, { offset: previous.offset + read, tail: text.slice(-1024) });
            } finally { fs.closeSync(fd); }
        }
        return { bytesRead: this.total, indicators: [...this.seen].sort() };
    }
}
module.exports = { RuntimeLog, indicators, loggerConfiguration };
