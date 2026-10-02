'use strict';
// Small signed contract fixture. It is not an executable EOS distribution and
// cannot be used as hardware/installer acceptance evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createBundle, inventory, sha256 } = require('../../../runtime/release/bundle.cjs');
const { applyToBuild } = require('../../../runtime/controller-profile/transform.cjs');
const { componentTreeDigest } = require('../../../runtime/policy/admission.cjs');
const { REQUIRED } = require('../../../tools/system/host-preflight.cjs');
const { SPECS } = require('../../../runtime/bootstrap/enrollment.cjs');
const { transformedComponent } = require('./sbom-transform.cjs');
const REPO = path.resolve(__dirname, '../../..');
function fixture(t) {
    const root = fs.mkdtempSync('/root/eos-install-preflight-fixture-');
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const payload = path.join(root, 'payload'); fs.mkdirSync(payload);
    const app = path.join(payload, 'app');
    const write = (relative, content, mode = 0o644) => {
        const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, typeof content === 'string' || Buffer.isBuffer(content) ? content : JSON.stringify(content), { mode }); return file;
    };
    const deps = { 'iobroker.js-controller': '7.2.2', ...Object.fromEntries(SPECS.map(spec => [`iobroker.${spec.name}`, spec.version])) };
    const packages = { ...deps, '@iobroker/js-controller-cli': '7.2.2', '@iobroker/ws-server': '4.5.1' };
    for (const [name, version] of Object.entries(packages)) {
        const spec = SPECS.find(row => `iobroker.${row.name}` === name);
        write(`payload/app/node_modules/${name}/package.json`, { name, version, ...(spec ? { main: spec.main } : name === '@iobroker/ws-server' ? { main: 'build/index.js' } : {}) });
        if (spec) write(`payload/app/node_modules/${name}/io-package.json`, { common: { name: spec.name, version }, native: {} });
    }
    const originals = {
        'cjs-main': 'iobroker.js-controller/build/cjs/main.js', 'esm-main': 'iobroker.js-controller/build/esm/main.js',
        'cjs-setup': '@iobroker/js-controller-cli/build/cjs/lib/setup.js', 'esm-setup': '@iobroker/js-controller-cli/build/esm/lib/setup.js',
        'cjs-setupInstall': '@iobroker/js-controller-cli/build/cjs/lib/setup/setupInstall.js', 'esm-setupInstall': '@iobroker/js-controller-cli/build/esm/lib/setup/setupInstall.js',
        'ws-server-4.5.1': '@iobroker/ws-server/build/index.js',
    };
    for (const [name, target] of Object.entries(originals)) write(`payload/app/node_modules/${target}`, fs.readFileSync(path.join(REPO, 'tests/system/controller-profile-fixtures', `${name}.original.txt`)));
    write('payload/app/node_modules/iobroker.eos-admin/build/lib/eosLicenseCore.js', fs.readFileSync(path.join(REPO, 'components/admin/src/lib/eosLicenseCore.js')));
    const transformation = applyToBuild(app, SPECS.map(spec => ({ package: `iobroker.${spec.name}`, version: spec.version, main: spec.main })));
    const appPackage = { name: 'eos-install-preflight-contract-fixture', version: '0.2.1-test.1', dependencies: deps };
    write('payload/app/package.json', appPackage);
    write('payload/app/package-lock.json', { lockfileVersion: 3, packages: { '': appPackage,
        ...Object.fromEntries(Object.entries(packages).map(([name, version]) => [`node_modules/${name}`, { version }])) } });
    const catalog = { schemaVersion: 1, kind: 'eos-adapter-admission', catalogRevision: 1, entries: Object.entries(deps).map(([name, version]) => ({
        id: name.slice('iobroker.'.length), package: name, version,
        sha256: componentTreeDigest(inventory(path.join(app, 'node_modules', name)).map(({ path, size, sha256 }) => ({ path, size, sha256 }))),
        digestKind: 'tree-sha256-v1', kind: name === 'iobroker.js-controller' ? 'core' : 'adapter', required: name === 'iobroker.js-controller',
        review: { status: 'approved-test', evidenceId: 'unit-test-fixture-not-a-product-release' },
        permissions: { capabilities: ['state.read', 'state.write'], protocols: ['eos-redis-tls13-v1'], network: 'declared-endpoints-and-discovery', shellExec: false, additionalNpmModules: [], arbitraryCode: false },
        communication: 'eos-redis-tls13-v1',
    })) };
    write('payload/catalog.json', catalog);
    write('payload/sbom.cdx.json', { bomFormat: 'CycloneDX', specVersion: '1.5', version: 1,
        metadata: { component: { type: 'application', name: appPackage.name, version: appPackage.version, 'bom-ref': `${appPackage.name}@${appPackage.version}` },
            properties: [{ name: 'eos:sbom:scope', value: 'installed-test-runtime-npm-tree' },
                ...['json', 'lock'].map(kind => ({ name: `eos:sbom:package-${kind}-sha256`,
                    value: sha256(fs.readFileSync(path.join(app, kind === 'json' ? 'package.json' : 'package-lock.json'))) }))] },
        components: Object.entries(packages).map(([name, version]) => transformedComponent(name, version, transformation)),
        dependencies: [{ ref: `${appPackage.name}@${appPackage.version}`, dependsOn: Object.entries(deps).map(([name, version]) => `${name}@${version}`) }] });
    const signing = crypto.generateKeyPairSync('ed25519');
    const publicKey = write('release-public.pem', signing.publicKey.export({ type: 'spki', format: 'pem' }));
    const bundle = path.join(root, 'bundle');
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.1-test.1', sequence: 2, profile: 'test', nodeVersion: process.versions.node, platforms: [`${process.platform}-${process.arch}`] };
    const sign = () => createBundle({ sourceDirectory: payload, bundleDirectory: bundle, metadata, privateKey: signing.privateKey.export({ type: 'pkcs8', format: 'pem' }) });
    const passwords = Array.from({ length: 3 }, () => crypto.randomBytes(32).toString('base64url'));
    const accounts = { schemaVersion: 1, accounts: [{ username: 'fixture_installer', role: 'installer', password: passwords[1] }, { username: 'fixture_enduser', role: 'enduser', password: passwords[2] }] };
    const issuer = crypto.generateKeyPairSync('ed25519');
    const options = { '--bundle': bundle, '--public-key': publicKey,
        '--password-file': write('service-password', passwords[0], 0o600), '--accounts-file': write('accounts.json', accounts, 0o600),
        '--license-trust': write('license-trust.json', { 'fixture-issuer': issuer.publicKey.export({ type: 'spki', format: 'pem' }).toString() }),
        '--hosts-file': write('hosts.json', ['eos.test']) };
    const target = path.join(root, 'target'); fs.mkdirSync(target, { mode: 0o755 });
    write('target/etc/os-release', 'ID=debian\nVERSION_ID="12"\n'); fs.mkdirSync(path.join(target, 'run/systemd/system'), { recursive: true });
    for (const file of REQUIRED) write(`target${file}`, '', 0o755);
    write('target/usr/share/keyrings/debian-archive-keyring.gpg', 'fixture-keyring');
    const calls = [];
    const exec = (file, args) => {
        calls.push([file, args]);
        if (file.endsWith('/node')) return { status: 0, stdout: `v${process.versions.node}\n` };
        if (file.endsWith('/systemctl')) return { status: 0, stdout: args[0] === '--version' ? 'systemd 252\n' : 'Version=252\nSystemState=running\n' };
        if (file.endsWith('/openssl')) return { status: 0, stdout: 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256\n' };
        if (file.endsWith('/redis-server')) return { status: 0, stdout: 'Redis server v=7.0.15\n' };
        if (file.endsWith('/getent')) return { status: 2, stdout: '' };
        if (file.endsWith('/dpkg-query')) return { status: 0, stdout: 'install ok installed\t1.0-fixture\n' };
        return { status: 0, stdout: '' };
    };
    return { root, payload, app, catalog, metadata, options, passwords, accounts, write, sign, target, calls,
        dependencies: { uid: 0, hostFixture: { root: target, uid: 0, exec, hostname: 'eos-fixture' } } };
}
module.exports = { fixture };
