const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { describe, it } = require('node:test');

const execFileAsync = promisify(execFile);

const skipLinuxRuntimeTests =
    process.platform !== 'linux' || process.env.NEXOWATT_SKIP_LINUX_RUNTIME_TESTS === '1';


// Replace the runtime tar helper for this focused unit test. This keeps the test runnable even
// when npm dependencies are not available in an offline validation environment.
const targzPath = require.resolve('../build/lib/targz');
require.cache[targzPath] = {
    id: targzPath,
    filename: targzPath,
    loaded: true,
    exports: {
        compressAsync: async ({ src, dest }) => {
            await execFileAsync('tar', ['-czf', dest, '-C', src, '.']);
        },
    },
};

const { run } = require('../build/lib/scripts/11-nexowattEOS');

function hash(file) {
    return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function createContext(backupDir, stateFailure = false) {
    const states = {};
    const adapter = {
        namespace: 'nexowatt-backup.0',
        log: { warn() {} },
        async getObjectViewAsync() {
            return {
                rows: [
                    {
                        id: 'system.adapter.eos-admin.0',
                        value: { common: { version: '1.0.0', enabled: true, host: 'test' } },
                    },
                    {
                        id: 'system.adapter.nexowatt-ui.0',
                        value: { common: { version: '1.0.0', enabled: true, host: 'test' } },
                    },
                    {
                        id: 'system.adapter.ocpp21.0',
                        value: { common: { version: '0.1.0', enabled: false, host: 'test' } },
                    },
                ],
            };
        },
        async setStateAsync(id, value) {
            if (stateFailure) {
                throw new Error('simulated state database failure');
            }
            states[id] = value && typeof value === 'object' && 'val' in value ? value.val : value;
        },
    };
    return {
        states,
        context: {
            adapter,
            log: { debug() {}, warn() {}, error() {} },
            backupDir,
            timestamp: Date.UTC(2026, 7, 17, 18, 17, 4),
            fileNames: [],
            errors: {},
            done: [],
            types: [],
        },
    };
}

const options = {
    enabled: true,
    nameSuffix: 'test',
    includeVendorFile: false,
    includeVendorSecret: false,
    adapterVersion: '1.0.1',
};

describe('NexoWatt EOS profile backup', { timeout: 15_000, skip: skipLinuxRuntimeTests }, () => {
    it('creates a protected profile archive with a verifiable manifest and no vendor secret by default', async () => {
        const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-eos-backup-'));
        try {
            const { context, states } = createContext(backupDir);
            await run({ context, options });

            assert.equal(context.fileNames.length, 1);
            const archive = context.fileNames[0];
            assert.ok(fs.existsSync(archive));
            assert.match(path.basename(archive), /^nexowattEOS_2026_08_17-18_17_04_test_backupconfig\.tar\.gz$/);
            assert.equal(fs.statSync(archive).mode & 0o777, 0o600);
            assert.ok(context.done.includes('nexowattEOS'));
            assert.ok(context.types.includes('nexowattEOS'));
            assert.match(states['info.eosProfileSha256'], /^[a-f0-9]{64}$/);
            assert.equal(states['info.eosProfileSha256'], hash(archive));

            const stateManifest = JSON.parse(states['info.eosProfile']);
            assert.equal(stateManifest.security.vendorSecretIncluded, false);
            assert.equal(stateManifest.eosCoreInstances.length, 3);
            assert.equal(stateManifest.adapter.upstream.version, '4.0.1');

            const extractDir = path.join(backupDir, 'extract');
            fs.mkdirSync(extractDir);
            await execFileAsync('tar', ['-xzf', archive, '-C', extractDir]);
            const profileDir = path.join(extractDir, 'nexowatt-eos-profile');
            const manifestPath = path.join(profileDir, 'manifest.json');
            const readmePath = path.join(profileDir, 'README.txt');
            const checksumsPath = path.join(profileDir, 'CHECKSUMS.sha256');
            assert.ok(fs.existsSync(manifestPath));
            assert.ok(fs.existsSync(readmePath));
            assert.ok(fs.existsSync(checksumsPath));
            assert.ok(!fs.existsSync(path.join(profileDir, 'files', 'iob-vendor-secret.json')));

            const lines = fs.readFileSync(checksumsPath, 'utf8').trim().split('\n');
            for (const line of lines) {
                const match = line.match(/^([a-f0-9]{64})  (.+)$/);
                assert.ok(match, `invalid checksum line: ${line}`);
                assert.equal(hash(path.join(profileDir, match[2])), match[1]);
            }
        } finally {
            fs.rmSync(backupDir, { recursive: true, force: true });
        }
    });

    it('keeps a valid profile archive when only status-state publication fails', async () => {
        const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-eos-backup-state-'));
        try {
            const { context } = createContext(backupDir, true);
            await run({ context, options });
            assert.equal(context.fileNames.length, 1);
            assert.ok(fs.existsSync(context.fileNames[0]));
            assert.deepEqual(context.errors, {});
        } finally {
            fs.rmSync(backupDir, { recursive: true, force: true });
        }
    });
});
