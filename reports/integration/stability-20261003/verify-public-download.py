#!/usr/bin/env python3
"""Build-host anonymous readback only; never execute downloaded product bytes."""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
ENTRY = 'delivery/public-entry-test3-r4'
ASSETS = 'delivery/public-assets-test3-r4'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError('PUBLIC_READBACK_REDIRECT')

def read(row):
    expected = row['pin']
    url = 'https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/' + row['commit'] + '/' + row['path']
    request = urllib.request.Request(url, headers={'User-Agent':'EOS-public-readback', 'Accept-Encoding':'identity'})
    # This build environment may use its configured proxy. No GitHub credential
    # is supplied. Every response must match two pinned content digests.
    opener = urllib.request.build_opener(NoRedirect())
    total = 0
    digest = hashlib.sha256()
    git = hashlib.sha1(b'blob ' + str(expected['bytes']).encode() + b'\0')
    deadline = time.monotonic() + 180
    with opener.open(request, timeout=30) as response:
        if response.status != 200 or response.geturl() != url or response.headers.get('Content-Encoding', 'identity') != 'identity':
            raise RuntimeError('PUBLIC_READBACK_RESPONSE')
        while True:
            if time.monotonic() > deadline:
                raise RuntimeError('PUBLIC_READBACK_DEADLINE')
            block = response.read(min(1024*1024, expected['bytes']-total+1))
            if not block:
                break
            total += len(block)
            if total > expected['bytes']:
                raise RuntimeError('PUBLIC_READBACK_SIZE')
            digest.update(block)
            git.update(block)
    if total != expected['bytes'] or digest.hexdigest() != expected['sha256'] or git.hexdigest() != expected['blob']:
        raise RuntimeError('PUBLIC_READBACK_HASH')
    return {'url':url, 'bytes':total, 'sha256':digest.hexdigest(), 'gitBlob':git.hexdigest(), 'matched':True}

def main():
    if len(sys.argv) != 2 or not re.fullmatch(r'[a-f0-9]{40}', sys.argv[1]):
        raise RuntimeError('PUBLIC_READBACK_USAGE')
    preparation = json.loads((ROOT / ENTRY / 'preparation.json').read_bytes())
    manifest = json.loads((ROOT / 'delivery/bootstrap-test3-r4/github-manifest.json').read_bytes())
    asset_commit = preparation['assetCommit']
    if not re.fullmatch(r'[a-f0-9]{40}', asset_commit):
        raise RuntimeError('PUBLIC_READBACK_COMMIT')
    rows = [{'commit':sys.argv[1], 'path':ENTRY+'/install.sh', 'pin':preparation['installer']}]
    for row in manifest['assets']:
        if row['name'] not in ('installer-kit.zip', 'node-v24.21.0-linux-arm64.tar.xz', 'eos-0.2.0-test.3-linux-arm64.tar.gz'):
            raise RuntimeError('PUBLIC_READBACK_ASSET')
        rows.append({'commit':asset_commit, 'path':ASSETS+'/'+row['name'], 'pin':row})
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(read, rows))
    print(json.dumps({'schemaVersion':1, 'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'installerCommit':sys.argv[1], 'assetCommit':asset_commit, 'anonymousPublicReadbackPassed':True,
        'files':results, 'targetExecutionPerformed':False, 'productionReleaseApproved':False},indent=2))

if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('PUBLIC_READBACK_FAILED',file=sys.stderr)
        sys.exit(1)
