'use strict';
// Primitive/format feasibility only. This is NOT a backup, archive or restore implementation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

test('CMS encrypted and signed offline container: primitive feasibility only', async t => {
    const previousMask = process.umask(0o077);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-cms-feasibility-'));
    fs.chmodSync(directory, 0o700);
    const at = name => path.join(directory, name);
    const openssl = args => spawnSync('/usr/bin/openssl', args, {
        cwd: directory, timeout: 15000, shell: false, maxBuffer: 65536,
        env: { PATH: '/usr/bin:/bin', LANG: 'C', OPENSSL_CONF: '/dev/null' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const run = args => { const result = openssl(args); assert.equal(result.status, 0, 'OpenSSL fixture operation failed'); return result; };
    try {
        for (const name of ['recipient', 'signer']) {
            fs.writeFileSync(at(`${name}.pass`), crypto.randomBytes(32).toString('hex') + '\n', { mode: 0o600 });
            run(['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-aes-256-cbc',
                '-pass', `file:${name}.pass`, '-out', `${name}.key`]);
            run(['req', '-new', '-x509', '-key', `${name}.key`, '-passin', `file:${name}.pass`, '-days', '1',
                '-sha256', '-subj', `/CN=EOS ${name} feasibility only`, '-out', `${name}.crt`]);
        }
        fs.writeFileSync(at('plain.bin'), 'NONPRODUCTION CRYPTO FEASIBILITY PAYLOAD\n', { mode: 0o600 });
        run(['cms', '-sign', '-binary', '-nodetach', '-nosmimecap', '-md', 'sha256', '-in', 'plain.bin',
            '-signer', 'signer.crt', '-inkey', 'signer.key', '-passin', 'file:signer.pass', '-outform', 'DER', '-out', 'signed.cms']);
        run(['cms', '-encrypt', '-binary', '-aes-256-gcm', '-aes256-wrap', '-in', 'signed.cms',
            '-recip', 'recipient.crt', '-outform', 'DER', '-out', 'encrypted.cms']);
        const decrypt = ['cms', '-decrypt', '-binary', '-inform', 'DER', '-in', 'encrypted.cms', '-recip', 'recipient.crt',
            '-inkey', 'recipient.key', '-passin', 'file:recipient.pass', '-out', 'decrypted-signed.cms'];
        const verify = ['cms', '-verify', '-binary', '-inform', 'DER', '-in', 'decrypted-signed.cms', '-nointern',
            '-certfile', 'signer.crt', '-CAfile', 'signer.crt', '-purpose', 'any', '-out', 'verified.bin'];
        await t.test('AES-256-GCM and ECDH roundtrip', () => {
            run(decrypt); assert.deepEqual(fs.readFileSync(at('decrypted-signed.cms')), fs.readFileSync(at('signed.cms')));
        });
        await t.test('separately pinned ECDSA signer roundtrip', () => {
            run(verify); assert.deepEqual(fs.readFileSync(at('verified.bin')), fs.readFileSync(at('plain.bin')));
        });
        await t.test('GCM tampering rejected; failure output stays private and is never parsed', () => {
            const data = fs.readFileSync(at('encrypted.cms')); data[data.length - 7] ^= 0x40;
            fs.writeFileSync(at('tampered.cms'), data, { mode: 0o600 });
            const args = decrypt.map(value => value === 'encrypted.cms' ? 'tampered.cms'
                : value === 'decrypted-signed.cms' ? 'rejected-output.bin' : value);
            assert.notEqual(openssl(args).status, 0);
            // Some versions write unauthenticated bytes before checking the tag.
            // This test never interprets those bytes; a future tool must quarantine them too.
            if (fs.existsSync(at('rejected-output.bin'))) assert.equal(fs.statSync(at('rejected-output.bin')).mode & 0o077, 0);
        });
        await t.test('untrusted backup signer rejected', () => {
            const args = verify.map(value => value === 'signer.crt' ? 'recipient.crt' : value);
            assert.notEqual(openssl(args).status, 0);
        });
        await t.test('wrong offline recipient key rejected', () => {
            const args = decrypt.map(value => value === 'recipient.key' ? 'signer.key'
                : value === 'file:recipient.pass' ? 'file:signer.pass' : value);
            assert.notEqual(openssl(args).status, 0);
        });
    } finally { fs.rmSync(directory, { recursive: true, force: true }); process.umask(previousMask); }
});
