'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Real POSIX modes, filesystem and OpenSSL certificates. Only the root-owned
// ancestor check and effective UID are modeled so an unprivileged CI runner
// can use a private temporary directory. No users, services or cluster created.
const source = path.resolve(__dirname, '../../runtime/postgresql/host.cjs');
const sourceRequire = createRequire(source);
for (const mask of [0o022, 0o077]) {
    test(`PostgreSQL provisioning preserves service traversal and private keys under umask ${mask.toString(8)}`,
        { skip: process.platform === 'win32' ? 'POSIX filesystem mode test requires Linux/macOS' : false }, () => {
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pg-permissions-'));
            const directory = path.join(root, 'postgresql');
            const fixtureModule = { exports: {} };
            const requireFixture = name => name === '../release/installed-check.cjs' ? {
                rootOwned(file) {
                    const resolved = path.resolve(file);
                    assert.ok(resolved === root || resolved.startsWith(root + path.sep));
                },
            } : sourceRequire(name);
            vm.runInThisContext(`(function(require,module,process){${fs.readFileSync(source, 'utf8')}\n})`,
                { filename: 'postgresql-provision-permissions-fixture.cjs' })(requireFixture, fixtureModule,
                { ...process, getuid: () => 0 });
            const oldMask = process.umask(mask);
            try {
                const result = fixtureModule.exports.provision({ directory });
                assert.equal(result.automaticRotationImplemented, false);
                const mode = name => fs.lstatSync(path.join(directory, name)).mode & 0o777;
                assert.equal(mode(''), 0o755, 'separate eos-postgres account must traverse config directory');
                assert.equal(mode('authority'), 0o700);
                assert.equal(mode('authority/ca.key'), 0o600);
                for (const name of ['server.key', 'objects.key', 'states.key', 'databases.json'])
                    assert.equal(mode(name), 0o600, name);
                for (const name of ['postgresql.conf', 'pg_hba.conf', 'pg_ident.conf', 'ca.crt',
                    'server.crt', 'objects.crt', 'states.crt', 'manifest.json'])
                    assert.equal(mode(name), 0o644, name);
            } finally {
                process.umask(oldMask);
                fs.rmSync(root, { recursive: true, force: true });
            }
        });
}
