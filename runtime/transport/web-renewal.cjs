'use strict';
// Root-only local HTTPS leaf renewal. The browser trust anchor is unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { rootOwned } = require('../release/installed-check.cjs');
const { readFileLimited } = require('../release/bundle.cjs');
const { parseBoundedJson } = require('../policy/admission.cjs');
const { inspectWeb, prepareWebRenewal } = require('./web-certificates.cjs');
const FILES = ['manifest.json', 'ca.crt', 'authority/ca.key', 'admin.crt', 'admin.key', 'ui.crt', 'ui.key'];
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function sync(p) { const fd = fs.openSync(p, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function tree(directory) { return hash(JSON.stringify(FILES.map(file => { rootOwned(path.join(directory, file)); return [file, hash(readFileLimited(path.join(directory, file), 16384).bytes)]; }))); }
function layout(directory) {
    if (process.getuid?.() !== 0) fail('WEB_CERTIFICATE_ROOT_REQUIRED');
    if (typeof directory !== 'string' || !path.isAbsolute(directory) || path.resolve(directory) !== directory) fail('WEB_CERTIFICATE_PATH');
    rootOwned(path.dirname(directory));
    const work = path.join(path.dirname(directory), '.eos-web-renewal');
    return { directory, work, next: path.join(work, 'next'), previous: path.join(work, 'previous'), journal: path.join(work, 'journal.json') };
}
function writeJournal(p, j) {
    const next = path.join(p.work, `.journal-${crypto.randomBytes(12).toString('hex')}`);
    const fd = fs.openSync(next, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(j) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    try { fs.renameSync(next, p.journal); sync(p.work); } finally { if (fs.existsSync(next)) fs.unlinkSync(next); }
}
function readJournal(p) {
    rootOwned(p.journal);
    const j = parseBoundedJson(readFileLimited(p.journal, 16384).bytes.toString('utf8'));
    if (j.version !== 1 || j.directory !== p.directory || !['prepared', 'switching', 'switched', 'complete', 'restored'].includes(j.state) ||
        !/^[a-f0-9]{64}$/.test(j.oldTree || '') || !/^[a-f0-9]{64}$/.test(j.nextTree || '')) fail('WEB_RENEWAL_JOURNAL');
    return j;
}
function retire(p) {
    const retired = `${p.work}-retired-${crypto.randomBytes(12).toString('hex')}`;
    fs.renameSync(p.work, retired); sync(path.dirname(p.work));
    try { fs.rmSync(retired, { recursive: true }); sync(path.dirname(retired)); return true; } catch { return false; }
}
function checkHooks(hooks) { if (typeof hooks?.stop !== 'function' || typeof hooks.start !== 'function' || typeof hooks.probe !== 'function') fail('WEB_RENEWAL_HOST_HOOKS'); }
function prepareRenewal({ directory }) {
    const p = layout(directory); inspectWeb({ directory, allowExpiredLeaves: true });
    try { fs.mkdirSync(p.work, { mode: 0o700 }); } catch (e) { if (e.code === 'EEXIST') fail('WEB_RENEWAL_ALREADY_PENDING'); throw e; }
    sync(path.dirname(p.work));
    try {
        prepareWebRenewal({ directory, destination: p.next });
        const j = { version: 1, directory, state: 'prepared', oldTree: tree(directory), nextTree: tree(p.next) };
        writeJournal(p, j); return { status: 'WEB_RENEWAL_PREPARED' };
    } catch (e) { fs.rmSync(p.work, { recursive: true, force: true }); sync(path.dirname(p.work)); throw e; }
}
async function recoverRenewal({ directory }, hooks) {
    const p = layout(directory); checkHooks(hooks); const j = readJournal(p);
    await hooks.stop();
    if (j.state === 'complete') {
        if (tree(directory) !== j.nextTree) fail('COMMITTED_WEB_GENERATION_REJECTED');
        inspectWeb({ directory });
        await hooks.start(); await hooks.probe();
        const retiredSecretsRemoved = retire(p);
        return { status: 'COMMITTED_WEB_CERTIFICATES_CONFIRMED', retiredSecretsRemoved };
    }
    if (fs.existsSync(p.previous)) {
        if (tree(p.previous) !== j.oldTree) fail('WEB_RENEWAL_BACKUP_CHANGED');
        if (fs.existsSync(directory)) {
            if (tree(directory) !== j.nextTree || fs.existsSync(p.next)) fail('WEB_RENEWAL_LIVE_CHANGED');
            fs.renameSync(directory, p.next);
        }
        fs.renameSync(p.previous, directory); sync(path.dirname(directory)); sync(p.work);
    } else if (!fs.existsSync(directory) || tree(directory) !== j.oldTree) fail('WEB_RENEWAL_BACKUP_MISSING');
    j.state = 'restored'; writeJournal(p, j);
    inspectWeb({ directory }); // Never restart a restored expired certificate.
    await hooks.start(); await hooks.probe();
    const retiredSecretsRemoved = retire(p);
    return { status: 'PREVIOUS_WEB_CERTIFICATES_RESTORED', retiredSecretsRemoved };
}
async function activateRenewal({ directory }, hooks) {
    const p = layout(directory); checkHooks(hooks); const j = readJournal(p);
    if (j.state !== 'prepared' || tree(directory) !== j.oldTree || tree(p.next) !== j.nextTree) fail('WEB_RENEWAL_PREPARED_CHANGED');
    try {
        await hooks.stop(); j.state = 'switching'; writeJournal(p, j);
        fs.renameSync(directory, p.previous); sync(path.dirname(directory)); sync(p.work);
        fs.renameSync(p.next, directory); sync(path.dirname(directory)); sync(p.work);
        j.state = 'switched'; writeJournal(p, j); inspectWeb({ directory });
        await hooks.start(); await hooks.probe();
        j.state = 'complete'; writeJournal(p, j);
        const retiredSecretsRemoved = retire(p);
        return { status: 'WEB_CERTIFICATES_RENEWED', trustAnchorPreserved: true, retiredSecretsRemoved };
    } catch {
        try { await recoverRenewal({ directory }, hooks); } catch { fail('WEB_RENEWAL_FAILED_RECOVERY_REQUIRED'); }
        fail('WEB_RENEWAL_FAILED_PREVIOUS_RESTORED');
    }
}
module.exports = { prepareRenewal, activateRenewal, recoverRenewal };
