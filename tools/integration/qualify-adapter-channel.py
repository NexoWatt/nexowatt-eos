#!/usr/bin/env python3
"""Run dev8 transport/contract tests. Does not install or start a PostgreSQL server."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports/integration/adapter-channel'
NODE_TESTS = ['tests/adapter-channel/channel.test.cjs', 'tests/system/policy-admission.test.cjs',
              'tests/postgresql/store.test.cjs', 'tests/postgresql/store-review.test.cjs',
              'tests/postgresql/store-channel-hardening.test.cjs', 'tests/postgresql/states.test.cjs', 'tests/postgresql/objects.test.cjs']

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def run(node, modules):
    node = node.resolve(); modules = modules.resolve()
    version = subprocess.check_output([str(node), '--version'], text=True).strip()
    if version != 'v24.21.0':
        raise ValueError('EXACT_QUALIFICATION_NODE_24_21_0_REQUIRED')
    pg = modules / '@nexowatt/eos-postgresql-store/node_modules/pg/package.json'
    if json.loads(pg.read_text())['version'] != '8.23.1':
        raise ValueError('PG_DRIVER_VERSION')
    env = {k: v for k, v in os.environ.items() if k not in ['NODE_OPTIONS', 'NODE_PATH', 'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_EXTRA_CA_CERTS', 'SSLKEYLOGFILE']}
    env['NODE_PATH'] = str(modules) + os.pathsep + str(modules / '@nexowatt/eos-postgresql-store/node_modules')
    groups = [('node-contracts-and-local-tls', [str(node), '--test', '--test-reporter=tap', *NODE_TESTS], 'raw/final-node-tests.tap'),
              ('schema', [sys.executable, 'tests/adapter-channel/admission-schema.test.py', '-v'], 'raw/final-schema-tests.log')]
    REPORT.mkdir(parents=True, exist_ok=True); (REPORT / 'raw').mkdir(exist_ok=True)
    results = []
    for name, args, output in groups:
        started = datetime.now(timezone.utc).isoformat()
        proc = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, timeout=60)
        raw = proc.stdout + proc.stderr; (REPORT / output).write_bytes(raw)
        counts = {key: int(found.group(1)) for key in ['tests', 'pass', 'fail', 'cancelled', 'skipped']
                  if (found := re.search(r'^# ' + key + r' (\d+)$', raw.decode(), re.M))}
        if name == 'schema':
            found = re.search(r'Ran (\d+) tests', raw.decode()); count = int(found.group(1)) if found else 0
            counts = {'tests': count, 'pass': count if proc.returncode == 0 else None, 'fail': 0 if proc.returncode == 0 else None}
        results.append({'id': name, 'command': args, 'startedAt': started, 'finishedAt': datetime.now(timezone.utc).isoformat(),
                        'exitCode': proc.returncode, 'counts': counts, 'raw': output, 'rawSha256': sha(REPORT / output)})
    files = set()
    for directory in ['runtime/adapter-channel', 'runtime/postgresql', 'runtime/policy', 'tests/adapter-channel', 'tests/postgresql', 'system/adapter-channel']:
        files.update(p for p in (ROOT / directory).rglob('*') if p.is_file() and p.suffix in ['.cjs', '.json', '.sql', '.py', '.example'])
    files.update(ROOT / p for p in ['system/contracts/adapter-admission.schema.json', 'tests/system/policy-admission.test.cjs', 'tools/integration/qualify-adapter-channel.py'])
    binding = [{'path': p.relative_to(ROOT).as_posix(), 'sha256': sha(p)} for p in sorted(files)]
    (REPORT / 'tested-sources.json').write_text(json.dumps(binding, indent=2) + '\n')
    summary = {'schemaVersion': 1, 'sourceVersion': '0.2.0-dev.8', 'scope': 'Real loopback mTLS gateway with simulated state storage; PostgreSQL client contracts with doubles. No native PostgreSQL, systemd isolation or Pi acceptance.',
               'environment': {'node': version, 'openssl': subprocess.check_output([str(node), '-p', 'process.versions.openssl'], text=True).strip(),
                               'platform': platform.platform(), 'arch': platform.machine(), 'uid': os.getuid(), 'postgresqlDriver': '8.23.1'},
               'groups': results, 'passed': all(r['exitCode'] == 0 and (r['counts'].get('tests') or 0) > 0 for r in results),
               'totalPassed': sum(r['counts'].get('pass') or 0 for r in results), 'sourceBindingSha256': sha(REPORT / 'tested-sources.json'),
               'nativeDatabaseTested': False, 'targetHardwareTested': False, 'javascriptAdapterExecuted': False, 'productionReleaseApproved': False}
    (REPORT / 'verification-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps({'passed': summary['passed'], 'totalPassed': summary['totalPassed'], 'node': version}))
    return 0 if summary['passed'] else 1

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', type=Path, required=True); parser.add_argument('--modules', type=Path, required=True)
    args = parser.parse_args(); sys.exit(run(args.node, args.modules))
