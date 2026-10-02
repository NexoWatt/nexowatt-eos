#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { AdmissionError, LIMITS, parseCatalog, parseBoundedJson, planAdmission } = require('./admission.cjs');

function read(path) {
    const fd = fs.openSync(path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > LIMITS.bytes) throw new AdmissionError('E_INPUT_FILE');
        const buffer = Buffer.alloc(LIMITS.bytes + 1);
        let used = 0, count;
        while ((count = fs.readSync(fd, buffer, used, buffer.length - used, null)) > 0) {
            used += count;
            if (used > LIMITS.bytes) throw new AdmissionError('E_INPUT_SIZE');
        }
        try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, used)); }
        catch { throw new AdmissionError('E_INPUT_ENCODING'); }
    } finally { fs.closeSync(fd); }
}
try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--catalog' || args[2] !== '--request') throw new AdmissionError('E_USAGE');
    const plan = planAdmission(parseCatalog(read(args[1])), parseBoundedJson(read(args[3])));
    process.stdout.write(`${JSON.stringify({ ok: true, plan })}\n`);
} catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, code: error instanceof AdmissionError ? error.code : 'E_INPUT_IO' })}\n`);
    process.exitCode = 1;
}
