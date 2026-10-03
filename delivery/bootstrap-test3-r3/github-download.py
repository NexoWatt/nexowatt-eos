#!/usr/bin/python3
"""Authenticated, pinned private-repository download; never takes a CLI token.

The authenticated outer launcher provides a token through FD 3. Only reviewed
public blob/SHA-256 identifiers appear in argv. HTTPS always verifies GitHub's
certificate; this module neither follows redirects nor reads proxy settings.
The host preparer independently rechecks every asset before host mutation.
"""
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import re
import select
import ssl
import stat
import sys
import tempfile
import time

REPOSITORY = "NexoWatt/nexowatt-eos"
HOST = "api.github.com"
SYSTEM_CA = Path("/etc/ssl/certs/ca-certificates.crt")
API_PREFIX = "/repos/" + REPOSITORY + "/git/blobs/"
KIND = "eos-private-github-test-install"
DELIVERY = "delivery/test-pi-0.2.0-test.3-r3"
ASSETS = ("installer-kit.zip", "node-v24.21.0-linux-arm64.tar.xz",
          "eos-0.2.0-test.3-linux-arm64.tar.gz")
# The raw Git blob API supports at most 100 MB; larger artifacts need a separately
# reviewed transport, never a redirect or an unchecked download_url fallback.
LIMITS = {ASSETS[0]: 64 * 1024**2, ASSETS[1]: 100 * 1024**2, ASSETS[2]: 100 * 1024**2}
MANIFEST_LIMIT = 16384
PREPARE_LIMIT = 256 * 1024
TOKEN_LIMIT = 4096
CHUNK = 128 * 1024


class Rejected(Exception):
    pass


def fail(code):
    raise Rejected(code)


def unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            fail("GITHUB_MANIFEST_DUPLICATE")
        value[key] = item
    return value


def parse_arguments(arguments):
    if (len(arguments) != 4 or arguments[0] != "--manifest-blob"
            or arguments[2] != "--manifest-sha256"
            or not re.fullmatch(r"[a-f0-9]{40}", arguments[1])
            or not re.fullmatch(r"[a-f0-9]{64}", arguments[3])):
        fail("GITHUB_USAGE")
    return arguments[1], arguments[3]


def read_token():
    """Read bounded ASCII from the single fixed descriptor, closing it on error too."""
    token = bytearray()
    try:
        os.set_inheritable(3, False)
        deadline = time.monotonic() + 30
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not select.select([3], [], [], remaining)[0]:
                fail("GITHUB_TOKEN_INPUT")
            block = os.read(3, TOKEN_LIMIT + 2 - len(token))
            if not block:
                break
            token.extend(block)
            if len(token) > TOKEN_LIMIT + 1:
                fail("GITHUB_TOKEN_INPUT")
        if token.endswith(b"\n"):
            del token[-1:]
        if not 20 <= len(token) <= TOKEN_LIMIT or any(byte < 33 or byte > 126 for byte in token):
            fail("GITHUB_TOKEN_INPUT")
        return token
    except (OSError, ValueError):
        fail("GITHUB_TOKEN_INPUT")
    finally:
        try:
            os.close(3)
        except OSError:
            pass
        if sys.exc_info()[0] is not None:
            token[:] = b"\0" * len(token)


def check_host():
    if sys.platform != "linux" or os.geteuid() != 0:
        fail("GITHUB_LINUX_ROOT_REQUIRED")
    descriptor = None
    try:
        descriptor = os.open("/dev/tty", os.O_WRONLY | os.O_NOFOLLOW | os.O_NOCTTY)
        if not stat.S_ISCHR(os.fstat(descriptor).st_mode) or not os.isatty(descriptor):
            fail("GITHUB_CONTROLLING_TTY_REQUIRED")
    except OSError:
        fail("GITHUB_CONTROLLING_TTY_REQUIRED")
    finally:
        if descriptor is not None:
            os.close(descriptor)


def create_staging():
    for path in (Path("/"), Path("/root")):
        info = path.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            fail("GITHUB_STAGING_PARENT")
    staging = Path(tempfile.mkdtemp(prefix="eos-download-", dir="/root"))
    os.chmod(staging, 0o700)
    info = staging.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o700:
        fail("GITHUB_STAGING_MODE")
    return staging


def descriptor(value, *, limit, named=False):
    keys = {"blob", "sha256", "bytes"} | ({"name"} if named else set())
    if (not isinstance(value, dict) or set(value) != keys
            or not isinstance(value["blob"], str) or not re.fullmatch(r"[a-f0-9]{40}", value["blob"])
            or not isinstance(value["sha256"], str) or not re.fullmatch(r"[a-f0-9]{64}", value["sha256"])
            or type(value["bytes"]) is not int or not 0 < value["bytes"] <= limit):
        fail("GITHUB_MANIFEST_DESCRIPTOR")


def validate_manifest(value):
    if (not isinstance(value, dict) or type(value.get("schemaVersion")) is not int
            or value["schemaVersion"] != 1 or value.get("kind") != KIND
            or value.get("repository") != REPOSITORY or type(value.get("ready")) is not bool):
        fail("GITHUB_MANIFEST")
    common = {"schemaVersion", "kind", "repository", "ready"}
    if not value["ready"]:
        if set(value) != common | {"reason"} or value["reason"] != "manufacturer-license-trust-missing":
            fail("GITHUB_MANIFEST")
        fail("BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING")
    if (set(value) != common | {"deliveryDirectory", "prepareHost", "assets"}
            or value["deliveryDirectory"] != DELIVERY):
        fail("GITHUB_MANIFEST")
    descriptor(value["prepareHost"], limit=PREPARE_LIMIT)
    if not isinstance(value["assets"], list) or len(value["assets"]) != len(ASSETS):
        fail("GITHUB_MANIFEST_ASSETS")
    names = set()
    for asset in value["assets"]:
        if not isinstance(asset, dict) or asset.get("name") not in ASSETS or asset["name"] in names:
            fail("GITHUB_MANIFEST_ASSETS")
        descriptor(asset, limit=LIMITS[asset["name"]], named=True)
        names.add(asset["name"])
    return value


def _connection():
    # Do not let SSL_CERT_FILE/SSL_CERT_DIR choose a different trust anchor.
    # Debian's protected CA bundle is available before the first HTTPS fetch.
    for path in (*reversed(SYSTEM_CA.parents), SYSTEM_CA):
        info = path.lstat()
        expected_type = stat.S_ISREG if path == SYSTEM_CA else stat.S_ISDIR
        if (not expected_type(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022
                or path == SYSTEM_CA and (info.st_nlink != 1 or not 0 < info.st_size <= 8 * 1024**2)):
            fail("GITHUB_SYSTEM_CA_REJECTED")
    context = ssl.create_default_context(cafile=str(SYSTEM_CA))
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    return http.client.HTTPSConnection(HOST, 443, timeout=30, context=context)


def fetch_blob(blob, sha256, token, *, limit, expected_bytes=None, output=None):
    """One fixed-host GET, bounded streaming, two independent content digests."""
    if (not isinstance(blob, str) or not re.fullmatch(r"[a-f0-9]{40}", blob)
            or not isinstance(sha256, str) or not re.fullmatch(r"[a-f0-9]{64}", sha256)
            or type(limit) is not int or limit <= 0
            or expected_bytes is not None and (type(expected_bytes) is not int or not 0 < expected_bytes <= limit)):
        fail("GITHUB_BLOB_INPUT")
    # Only the small manifest may be buffered; its final size is not known yet.
    if expected_bytes is None and (output is not None or limit > MANIFEST_LIMIT):
        fail("GITHUB_BLOB_INPUT")
    connection = None
    data = bytearray() if output is None else None
    digest = hashlib.sha256()
    git_digest = hashlib.sha1(b"blob " + str(expected_bytes).encode("ascii") + b"\0") if expected_bytes is not None else None
    total = 0
    deadline = time.monotonic() + (60 if output is None else 900)
    try:
        connection = _connection()
        connection.request("GET", API_PREFIX + blob, headers={
            "Accept": "application/vnd.github.raw+json", "Authorization": "Bearer " + token.decode("ascii"),
            "User-Agent": "NexoWatt-EOS-private-bootstrap", "X-GitHub-Api-Version": "2022-11-28",
            "Accept-Encoding": "identity", "Connection": "close"})
        response = connection.getresponse()
        if response.status != 200:
            # Do not read/print an error body, URL or Location; never follow it.
            if response.status in (401, 403, 404):
                fail("GITHUB_ACCESS_REJECTED")
            if 300 <= response.status < 400:
                fail("GITHUB_REDIRECT_REJECTED")
            fail("GITHUB_HTTP_REJECTED")
        if response.getheader("Content-Encoding", "identity").lower() != "identity":
            fail("GITHUB_RESPONSE_ENCODING")
        declared = response.getheader("Content-Length")
        if declared is not None and (not re.fullmatch(r"[0-9]{1,10}", declared)
                                     or int(declared) > limit
                                     or expected_bytes is not None and int(declared) != expected_bytes):
            fail("GITHUB_RESPONSE_SIZE")
        while True:
            if time.monotonic() > deadline:
                fail("GITHUB_DOWNLOAD_TIMEOUT")
            block = response.read(min(CHUNK, limit - total + 1))
            if not block:
                break
            total += len(block)
            if total > limit or expected_bytes is not None and total > expected_bytes:
                fail("GITHUB_RESPONSE_SIZE")
            digest.update(block)
            if git_digest is not None:
                git_digest.update(block)
            if output is None:
                data.extend(block)
            else:
                output.write(block)
        if (total == 0 or expected_bytes is not None and total != expected_bytes
                or declared is not None and total != int(declared)):
            fail("GITHUB_RESPONSE_SIZE")
        if git_digest is None:
            git_digest = hashlib.sha1(b"blob " + str(total).encode("ascii") + b"\0" + data)
        if digest.hexdigest() != sha256 or git_digest.hexdigest() != blob:
            fail("GITHUB_BLOB_HASH")
        return bytes(data) if data is not None else None
    except (OSError, UnicodeError, ValueError, http.client.HTTPException):
        fail("GITHUB_DOWNLOAD_FAILED")
    finally:
        if connection is not None:
            connection.close()


def _check_private_file(descriptor_number):
    info = os.fstat(descriptor_number)
    if (not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_nlink != 1
            or stat.S_IMODE(info.st_mode) != 0o600):
        fail("GITHUB_STAGING_FILE")


def download_file(staging, name, expected, token, limit):
    if name not in (*ASSETS, "prepare-host.py"):
        fail("GITHUB_STAGING_NAME")
    path = staging / name
    number = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    with os.fdopen(number, "wb") as stream:
        _check_private_file(stream.fileno())
        fetch_blob(expected["blob"], expected["sha256"], token, limit=limit,
                   expected_bytes=expected["bytes"], output=stream)
        stream.flush()
        os.fsync(stream.fileno())
    return path


def load_prepare(path, expected):
    # The new root-private directory contains no cache; never create bytecode.
    sys.dont_write_bytecode = True
    with open(path, "rb") as stream:
        _check_private_file(stream.fileno())
        content = stream.read(PREPARE_LIMIT + 1)
    if (len(content) != expected["bytes"] or hashlib.sha256(content).hexdigest() != expected["sha256"]
            or hashlib.sha1(b"blob " + str(len(content)).encode("ascii") + b"\0" + content).hexdigest() != expected["blob"]):
        fail("GITHUB_PREPARER_HASH")
    spec = importlib.util.spec_from_file_location("eos_authenticated_prepare_host", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main(arguments=None):
    token = None
    token_descriptor_pending = True
    try:
        blob, digest = parse_arguments(sys.argv[1:] if arguments is None else arguments)
        token_descriptor_pending = False  # read_token closes even on failure.
        token = read_token()  # Descriptor 3 is closed before any other operation.
        check_host()
        raw = fetch_blob(blob, digest, token, limit=MANIFEST_LIMIT)
        try:
            manifest = validate_manifest(json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object))
        except (UnicodeError, ValueError, RecursionError):
            fail("GITHUB_MANIFEST_JSON")
        staging = create_staging()
        helper_path = download_file(staging, "prepare-host.py", manifest["prepareHost"], token, PREPARE_LIMIT)
        helper = load_prepare(helper_path, manifest["prepareHost"])
        helper.preflight(staging)
        for asset in manifest["assets"]:
            download_file(staging, asset["name"], asset, token, LIMITS[asset["name"]])
        config = {"schemaVersion": 1, "baseUrl": "https://" + HOST + "/repos/" + REPOSITORY,
                  "deliveryDirectory": DELIVERY,
                  "assets": [{key: asset[key] for key in ("name", "sha256", "bytes")} for asset in manifest["assets"]]}
        token[:] = b"\0" * len(token)
        token = None
        # The token descriptor and every HTTPS connection are closed. No token
        # goes to a subprocess, environment, file, log or the host preparer.
        helper.install_downloaded(config, staging)
    finally:
        if token is not None:
            token[:] = b"\0" * len(token)
        if token_descriptor_pending:
            try:
                os.close(3)
            except OSError:
                pass


def error_message(error):
    # The trusted preparer's Rejected type is intentionally independent of ours.
    code = str(error) if type(error).__name__ == "Rejected" else "GITHUB_BOOTSTRAP_FAILED"
    if not re.fullmatch(r"(?:GITHUB|BOOTSTRAP)_[A-Z0-9_]{1,80}", code):
        code = "GITHUB_BOOTSTRAP_FAILED"
    if code == "BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING":
        return "EOS: Installation gesperrt: Der echte oeffentliche Hersteller-Lizenzschluessel fehlt. (" + code + ")"
    return "EOS: Installation abgebrochen: " + code + ". Vorhandene Daten bleiben erhalten."


if __name__ == "__main__":
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print(error_message(error), file=sys.stderr)
        sys.exit(1)
