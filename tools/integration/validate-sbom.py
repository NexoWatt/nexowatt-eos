#!/usr/bin/env python3
"""Offline CycloneDX 1.5 schema validation. Requires Python jsonschema package."""
import argparse
import hashlib
import json
from pathlib import Path
import jsonschema
from referencing import Registry, Resource

SCHEMA = Path(__file__).resolve().parent / 'vendor/cyclonedx-1.5'

def validate(file):
    resources = []
    for item in SCHEMA.glob('*.schema.json'):
        doc = json.loads(item.read_text())
        for uri in {doc.get('$id', ''), 'http://cyclonedx.org/schema/' + item.name, 'https://cyclonedx.org/schema/' + item.name} - {''}:
            resources.append((uri, Resource.from_contents(doc)))
    registry = Registry().with_resources(resources)
    schema = json.loads((SCHEMA / 'bom-1.5.schema.json').read_text())
    raw = file.read_bytes()
    bom = json.loads(raw)
    validator = jsonschema.Draft7Validator(schema, registry=registry)
    errors = sorted(validator.iter_errors(bom), key=lambda x: str(list(x.path)))
    return {'file': file.name, 'sha256': hashlib.sha256(raw).hexdigest(), 'schema': 'CycloneDX1.5',
            'validator': 'jsonschema.Draft7Validator', 'offline': True, 'errorCount': len(errors),
            'errors': [{'path': list(e.path), 'validator': e.validator} for e in errors[:100]], 'valid': not errors}

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('files', nargs='+', type=Path)
    p.add_argument('--output', required=True, type=Path)
    a = p.parse_args()
    data = [validate(f) for f in a.files]
    a.output.write_text(json.dumps({'schemaVersion': 1, 'results': data}, indent=2) + '\n')
    print(json.dumps({'files': len(data), 'valid': all(d['valid'] for d in data)}))
    raise SystemExit(0 if all(d['valid'] for d in data) else 1)
