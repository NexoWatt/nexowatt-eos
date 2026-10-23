#!/usr/bin/env python3
"""Read-only evidence check of the received public metadata; never runs its entry."""
import hashlib
import json
from pathlib import Path
import platform
import stat
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[3]
EXPECTED = {
    "release-public.pem": (113, "518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40"),
    "delivery.json": (2632, "bd16e1cd02cf5816c869030686d5aec2a7d9f796a30aa4fd3c2d0d1048675d43"),
    "test.json": (322, "8c6dd3d316e397dda4a388e80865f637b142160a3b430d6ab52409b3c6c92acf"),
    "summary.json": (764, "ba9d90a98bd01066f935353878b1e4f6b935da5f2a4aa88ab9d9fe524a7da500"),
    "r8-entry/update.sh": (81554, "42a66e9aa3a1a5f71a438d6606ffeebfdef5e55de4884bb906f8559e58293d67"),
    "r8-entry/preparation.json": (2821, "66438f6764995dacb011717f9afd1bc68cb564fdfd721443876d16a3265fd817"),
}


def require(condition, code):
    if not condition:
        raise ValueError(code)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "DUPLICATE_JSON_KEY")
        result[key] = value
    return result


require(len(sys.argv) == 2, "EXPECTED_METADATA_ZIP")
source = Path(sys.argv[1])
require(source.is_file() and source.stat().st_size <= 1024 * 1024, "ZIP_SIZE")
raw = source.read_bytes()
require(len(raw) == 33382 and hashlib.sha256(raw).hexdigest() ==
        "92b3c6802d7631b536235d343c9ddc489d757c9405234576ed0f7f9812282e32", "ZIP_IDENTITY")
members = {}
with zipfile.ZipFile(source) as archive:
    infos = archive.infolist()
    require(len(infos) == len(EXPECTED) and {i.filename for i in infos} == set(EXPECTED), "ZIP_MEMBERS")
    for info in infos:
        size, digest = EXPECTED[info.filename]
        require(not info.flag_bits & 1 and not info.is_dir() and info.file_size == size, "ZIP_TYPE_SIZE")
        require(stat.S_IFMT(info.external_attr >> 16) in (0, stat.S_IFREG), "ZIP_SPECIAL_FILE")
        data = archive.read(info)
        require(len(data) == size and hashlib.sha256(data).hexdigest() == digest, "MEMBER_IDENTITY")
        if info.filename.endswith(".json"):
            json.loads(data.decode("utf-8"), object_pairs_hook=unique_object)
        members[info.filename] = data.decode("utf-8")

# Executes only this reviewed verifier and tracked repository modules, never uploaded code.
javascript = r'''
const fs = require('node:fs'), cp = require('node:child_process');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const entry = require('./tools/bootstrap/build-public-r8-managed-entry.cjs');
const channel = require('./runtime/updates/channel.cjs');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const b = name => Buffer.from(input[name]);
const j = name => JSON.parse(input[name]);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const id = data => ({ bytes: data.length, sha256: hash(data) });
const sourceCommit = 'f353dd08bf8ac5897e9b1c357994d4047a82ed6d';
const source = name => cp.execFileSync('git', ['show', `${sourceCommit}:${name}`], { maxBuffer: 1048576 });
const delivery = j('delivery.json'), summary = j('summary.json'), prepared = j('r8-entry/preparation.json');
const key = b('release-public.pem');
assert.deepEqual(key, fs.readFileSync('docs/security/release-trust/manufacturer-20261023-2.pem'));
assert.equal(delivery.sourceCommit, sourceCommit);
assert.equal(delivery.releaseId, '95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534');
assert.equal(delivery.bytes, 134278673);
assert.equal(delivery.sha256, 'dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44');
for (const name of ['releaseId', 'releaseSequence', 'sourceCommit', 'bytes', 'sha256', 'signingPublicKeySha256'])
    assert.deepEqual(summary[name], delivery[name]);
const entryPath = 'tools/bootstrap/build-public-r8-managed-entry.cjs';
assert.equal(hash(source(entryPath)), summary.entryTool.qualifiedSha256);
assert.equal(hash(fs.readFileSync(entryPath)), summary.entryTool.replacementSha256);
assert.equal(summary.entryTool.path, entryPath);
assert.equal(summary.entryTool.qualifiedSourceRestored, true); // reported, not observation of the WSL checkout
const config = entry.validateConfig(entry.configFor(delivery, key));
const helpers = Object.fromEntries(Object.entries(entry.HELPERS).map(([name, file]) => {
    const data = source(file); assert.deepEqual(data, fs.readFileSync(file)); return [name, data];
}));
const script = entry.render(config, key, helpers);
assert.deepEqual(script, b('r8-entry/update.sh'));
const expectedPreparation = {
    schemaVersion: 1, kind: 'eos-r8-managed-entry-preparation', config, baseline: entry.BASELINE,
    releaseSequence: 15, nodeVersion: '24.22.1',
    sources: Object.fromEntries(entry.SOURCE_PATHS.map(name => [name, id(source(name))])),
    helpers: Object.fromEntries(Object.entries(helpers).map(([name, data]) => [name, id(data)])),
    supervisor: id(entry.SUPERVISOR), deliveryMetadata: id(b('delivery.json')), installer: id(script),
    archiveSignatureVerified: true, archiveReadbackVerified: true, commandReady: false,
    published: false, publicReadbackPerformed: false, targetUpdateExecuted: false,
    hardwareAcceptance: 'OPEN', productionReleaseApproved: false,
};
assert.deepEqual(prepared, expectedPreparation); // archive flags are received claims, not reverified here
assert.deepEqual(b('r8-entry/preparation.json'), Buffer.from(JSON.stringify(expectedPreparation, null, 2) + '\n'));
const now = Date.now();
const feed = channel.verifyFeed(b('test.json'), key, { now });
assert.deepEqual(feed.releases, []);
assert.equal(delivery.published, false); assert.equal(summary.published, false);
assert.equal(delivery.freshPiInstallationTested, false); assert.equal(summary.physicalPiTested, false);
assert.equal(delivery.productionReleaseApproved, false);
process.stdout.write(JSON.stringify({ checkedAt: new Date(now).toISOString(), node: process.version,
    sourceCommit, verifierSourceCommit: cp.execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(),
    releaseId: delivery.releaseId, releaseSequence: delivery.releaseSequence,
    declaredArchive: { bytes: delivery.bytes, sha256: delivery.sha256 },
    metadataBindingsVerified: true, entryRegeneratedByteExactly: true,
    preparationRegeneratedByteExactly: true, signedFeedVerified: true, feed,
    uploadedEntryExecuted: false, archiveReceived: false, archiveSignatureIndependentlyVerified: false,
    archiveReadbackIndependentlyPerformed: false, runtimePublished: false, piMigrationTested: false,
    productionReleaseApproved: false }, null, 2));
'''
completed = subprocess.run(["node", "-e", javascript], input=json.dumps(members),
                           text=True, capture_output=True, cwd=ROOT, timeout=30, check=True)
result = json.loads(completed.stdout)
result.update({"python": platform.python_version(), "zipBytes": len(raw),
               "zipSha256": hashlib.sha256(raw).hexdigest(), "safeZipInventoryVerified": True,
               "members": [{"name": name, "bytes": size, "sha256": digest}
                           for name, (size, digest) in EXPECTED.items()]})
print(json.dumps(result, indent=2) + "\n", end="")
