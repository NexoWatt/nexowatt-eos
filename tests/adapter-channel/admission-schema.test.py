"""Agreement of catalogue JSON schema and runtime across transport profiles."""
import json
from pathlib import Path
import unittest
import jsonschema

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = json.loads((ROOT / 'system/contracts/adapter-admission.schema.json').read_text())

def catalog(transport, approved):
    return {'schemaVersion': 1, 'kind': 'eos-adapter-admission', 'catalogRevision': 1, 'entries': [{
        'id': 'fixture', 'package': 'eos-fixture', 'version': '1.0.0', 'sha256': 'a' * 64, 'digestKind': 'tree-sha256-v1',
        'kind': 'adapter', 'required': False, 'review': {'status': 'approved-test' if approved else 'pending', 'evidenceId': 'fixture-evidence' if approved else None},
        'communication': transport, 'permissions': {'capabilities': ['state.read'], 'protocols': [transport], 'network': 'declared-endpoints-and-discovery',
            'shellExec': False, 'additionalNpmModules': [], 'arbitraryCode': False}}]}

class SchemaTests(unittest.TestCase):
    def test_postgresql_approved_declaration(self):
        jsonschema.Draft202012Validator(SCHEMA).validate(catalog('eos-postgresql-mtls13-v1', True))
    def test_legacy_redis_schema_remains_parseable(self):
        jsonschema.Draft202012Validator(SCHEMA).validate(catalog('eos-redis-tls13-v1', True))
    def test_gateway_pending_can_be_inventoried(self):
        jsonschema.Draft202012Validator(SCHEMA).validate(catalog('eos-channel-mtls13-v1', False))
    def test_gateway_cannot_skip_host_acceptance(self):
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.Draft202012Validator(SCHEMA).validate(catalog('eos-channel-mtls13-v1', True))
    def test_approved_transport_must_match_declared_protocol(self):
        c = catalog('eos-postgresql-mtls13-v1', True); c['entries'][0]['permissions']['protocols'] = ['https']
        with self.assertRaises(jsonschema.ValidationError):
            jsonschema.Draft202012Validator(SCHEMA).validate(c)

if __name__ == '__main__':
    unittest.main()
