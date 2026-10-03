"""Independent, read-only ELF section inspection. Never loads a native library."""
import hashlib
import json
import os
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[4]
POLICY = ROOT / 'runtime/native/serialport-policy.json'
policy = json.loads(POLICY.read_text(encoding='utf-8'))
app = Path(os.environ['TEMP']) / 'eos-first-start-build-20261002-d/app'
rows = []
for pin in policy['packages']:
    source = app / pin['packagePath'] / pin['native']
    data = source.read_bytes()
    assert data[:7] == b'\x7fELF\x02\x01\x01'
    assert struct.unpack_from('<HH', data, 16) == (3, 183)
    off = struct.unpack_from('<Q', data, 40)[0]
    width, count = struct.unpack_from('<HH', data, 58)
    assert width == 64 and off + count * width <= len(data)
    sections = [struct.unpack_from('<IIQQQQIIQQ', data, off + i * width) for i in range(count)]

    def contents(section):
        start, size = section[4:6]
        assert start + size <= len(data)
        return data[start:start + size]

    def string(table, at):
        return table[at:table.index(0, at)].decode('ascii')

    imports, needed, paths, versions = [], [], [], []
    for section in sections:
        kind, link, entry = section[1], section[6], section[9]
        if kind not in (6, 11, 0x6ffffffe):
            continue
        block, table = contents(section), contents(sections[link])
        if kind == 11:
            assert entry == 24 and len(block) % entry == 0
            for offset in range(0, len(block), entry):
                name, info, other, index, value, size = struct.unpack_from('<IBBHQQ', block, offset)
                if name and index == 0:
                    imports.append(string(table, name))
        elif kind == 6:
            assert entry == 16 and len(block) % entry == 0
            for offset in range(0, len(block), entry):
                tag, value = struct.unpack_from('<qQ', block, offset)
                if tag == 1:
                    needed.append(string(table, value))
                elif tag in (15, 29):
                    paths.append(string(table, value))
        else:
            offset = 0
            while True:
                version, number, file, aux, next_record = struct.unpack_from('<HHIII', block, offset)
                assert version == 1
                cursor = offset + aux
                for index in range(number):
                    digest, flags, other, name, next_aux = struct.unpack_from('<IHHII', block, cursor)
                    versions.append({'library': string(table, file), 'version': string(table, name)})
                    if index < number - 1:
                        assert next_aux > 0
                        cursor += next_aux
                if not next_record:
                    break
                offset += next_record
    sha = hashlib.sha256(data).hexdigest()
    uv = sorted(name for name in imports if name.startswith('uv_'))
    node_v8 = sorted(name for name in imports if name.startswith(('_ZN4node', '_ZN2v8', '_ZNK4node', '_ZNK2v8')))
    assert sha == pin['nativeSha256'] and len(data) == pin['nativeBytes']
    assert needed == pin['elfNeeded'] and versions == pin['elfVersions'] and uv == pin['uvImports']
    assert not paths and not node_v8
    rows.append({'version': pin['version'], 'packagePath': pin['packagePath'], 'native': pin['native'],
                 'sha256': sha, 'bytes': len(data), 'needed': needed, 'versionRequirements': versions,
                 'uvImports': uv, 'nodeV8CppImports': node_v8, 'rpaths': paths,
                 'policyMatchesIndependentParse': True})
record = {'schemaVersion': 1, 'kind': 'independent-static-elf-review', 'passed': True,
          'policySha256': hashlib.sha256(POLICY.read_bytes()).hexdigest(),
          'reviewerSourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'targetCodeExecuted': False, 'deviceIoPerformed': False, 'hardwareAccepted': False,
          'scope': 'ELF64 ARM64 section parsing and exact policy comparison only; no dlopen or target-library availability proof.',
          'packages': rows}
output = Path(__file__).with_name('review-elf.json')
output.write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': True, 'packages': len(rows), 'output': str(output)}))
