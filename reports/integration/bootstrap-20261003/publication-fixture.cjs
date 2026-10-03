'use strict';
// Exercise the real signed delivery -> download builder -> real Python kit
// extractor. The ephemeral license public key is a TEST FIXTURE, never a
// manufacturer trust export. All generated downloads remain in ignored .work.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const { build, parse } = require(path.join(root, 'tools/bootstrap/build-download.cjs'));
const { sha256 } = require(path.join(root, 'runtime/release/bundle.cjs'));
const checkout = require(path.join(root, 'tools/system/install-from-checkout.cjs'));
const directory = fs.mkdtempSync(path.join(root, '.work/bootstrap-publication-fixture-'));
const publicKey = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
const trust = Buffer.from(JSON.stringify({ isolated_fixture_only: publicKey }) + '\n');
const trustFile = path.join(directory, 'fixture-license-public.json'); fs.writeFileSync(trustFile, trust);
const delivery = JSON.parse(fs.readFileSync(path.join(root, checkout.DELIVERY_DIRECTORY, 'delivery.json')));
const output = path.join(directory, 'download');
const prepared = build(parse(['--base-url', 'https://unpublished.example.com/fixture', '--license-trust', trustFile,
    '--license-trust-sha256', sha256(trust), '--release-public-key-sha256', delivery.signingPublicKeySha256, '--output', output]));
const helper = path.join(directory, 'extract-fixture.py');
// No host preparation, downloads, native execution, fixture-root substitution
// or installation; call only data validation and archive extraction functions.
fs.writeFileSync(helper, `import hashlib, importlib.util, json, pathlib, sys\nroot=pathlib.Path(sys.argv[1])\noutput=pathlib.Path(sys.argv[2])\nspec=importlib.util.spec_from_file_location('bootstrap',root/'tools/bootstrap/prepare-host.py')\nmodule=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(module)\nreport=json.loads((output/'download-preparation.json').read_text())\nconfig={'schemaVersion':1,'baseUrl':report['baseUrl'],'assets':report['assets'],'deliveryDirectory':'${checkout.DELIVERY_DIRECTORY}'}\nmodule.validate_config(config)\nfor asset in config['assets']:\n module.digest_file(output/asset['name'],asset)\nkit=module.extract_kit(output/'installer-kit.zip',output.parent/'extracted-kit')\nnode=module.extract_node(output/module.NODE_ASSET,output.parent/'node.bin')\nrows=json.loads((output/'build-record/kit-inputs.json').read_text())\nfor row in rows:\n data=(kit/row['name']).read_bytes()\n assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256']\nprint(json.dumps({'kitFiles':len(rows),'allExtractedBytesMatch':True,'nodeBytes':node.stat().st_size,'nativeCodeExecuted':False,'downloadPerformed':False}))\n`);
const result = cp.spawnSync(process.platform === 'win32' ? 'python' : '/usr/bin/python3', ['-I', '-B', helper, root, output],
    { encoding: 'utf8', shell: false, windowsHide: true, timeout: 180000, maxBuffer: 65536 });
fs.writeFileSync(path.join(__dirname, 'publication-fixture.stdout.log'), result.stdout || '', { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'publication-fixture.stderr.log'), result.stderr || '', { flag: 'wx' });
if (result.error || result.status !== 0) throw new Error('PUBLICATION_FIXTURE_FAILED');
fs.writeFileSync(path.join(__dirname, 'publication-fixture.json'), JSON.stringify({ schemaVersion: 1,
    fixture: true, fixtureLicenseKeyNotForDeployment: true, fixtureUrlNotPublished: true, output,
    prepared, extracted: JSON.parse(result.stdout), hostInstallationExecuted: false, hardwareAcceptance: 'OPEN',
    sourceFiles: ['tools/bootstrap/build-download.cjs', 'tools/bootstrap/build-kit.py', 'tools/bootstrap/prepare-host.py',
        'tools/bootstrap/first-start.cjs'].map(name => ({ path: name, sha256: sha256(fs.readFileSync(path.join(root, name))) }))
}, null, 2) + '\n', { flag: 'wx' });
process.stdout.write('Signed archive, publication kit, Python extraction and pinned Node extraction passed; no download/target execution.\n');
