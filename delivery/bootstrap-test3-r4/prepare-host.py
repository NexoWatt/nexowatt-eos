#!/usr/bin/python3
"""Pinned online preparation for a fresh Debian 13 ARM64 EOS test host.

No environment/CLI switch changes the target root or bypasses admission. The
outer, authenticated shell provides this script and its hash-bound asset list.
Runtime signature/manifest and first-start checks remain in first-start.cjs.
"""
import hashlib
import ipaddress
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from urllib.parse import urlsplit
import zipfile

NODE_VERSION = "24.21.0"
NODE_ASSET = "node-v24.21.0-linux-arm64.tar.xz"
NODE_SHA256 = "6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2"
NODE_MEMBER = "node-v24.21.0-linux-arm64/bin/node"
NODE_DEST = Path("/opt/nexowatt-node") / NODE_MEMBER
EOS_ASSET = "eos-0.2.0-test.3-linux-arm64.tar.gz"
ASSETS = ("installer-kit.zip", NODE_ASSET, EOS_ASSET)
DELIVERY = "delivery/test-pi-0.2.0-test.3-r4"
LIMITS = {ASSETS[0]: 64 * 1024**2, NODE_ASSET: 128 * 1024**2, EOS_ASSET: 1024**3}
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C", "LC_ALL": "C",
       "DEBIAN_FRONTEND": "noninteractive", "NEEDRESTART_MODE": "l"}
EOS_PATHS = ("/etc/nexowatt-eos", "/var/lib/nexowatt-eos", "/var/log/nexowatt-eos",
             "/opt/nexowatt/eos", "/opt/nexowatt-eos", "/opt/iobroker",
             "/etc/nexowatt-eos-os-updates", "/var/lib/nexowatt-eos-os-updates",
             "/run/nexowatt-eos-postgresql")
ACCOUNTS = ("eos-runtime", "eos-postgres", "eos-setup", "iobroker")
CLUSTER_PATHS = (Path("/etc/postgresql"), Path("/var/lib/postgresql"))
UNIT_ROW = re.compile(r"^((?:[A-Za-z0-9:_.@-]|\\x[0-9a-fA-F]{2})+\.(?:service|socket|device|mount|automount|swap|target|path|timer|slice|scope))"
                      r"[ \t]+(?:enabled|enabled-runtime|linked|linked-runtime|alias|masked|masked-runtime|static|disabled|indirect|generated|transient|bad)"
                      r"[ \t]+(?:enabled|disabled|ignored|unknown|n/a|-)[ \t]*$")
APT_OPTIONS = ("-o", "APT::Get::AllowUnauthenticated=false", "-o", "Acquire::AllowInsecureRepositories=false",
               "-o", "Acquire::AllowDowngradeToInsecureRepositories=false", "-o", "Acquire::AllowWeakRepositories=false",
               "-o", "Acquire::https::Verify-Peer=true", "-o", "Acquire::https::Verify-Host=true",
               "-o", "Acquire::Check-Valid-Until=true", "-o", "APT::Update::Error-Mode=any",
               "-o", "Dir::Etc::sourcelist=/etc/apt/sources.list", "-o", "Dir::Etc::sourceparts=/etc/apt/sources.list.d")
PACKAGES = ("postgresql-common", "python3-apt", "unattended-upgrades", "needrestart", "ca-certificates",
            "debian-archive-keyring", "openssl", "libcap2-bin", "iproute2")
OFFICIAL_REPOS = {"deb.debian.org": {"/debian", "/debian-security"},
                  "security.debian.org": {"/debian-security"},
                  "archive.raspberrypi.com": {"/debian"}, "archive.raspberrypi.org": {"/debian"},
                  "raspbian.raspberrypi.com": {"/raspbian"}, "raspbian.raspberrypi.org": {"/raspbian"}}
SUITES = {"trixie", "trixie-updates", "trixie-security", "trixie-backports"}
# Current Debian/Raspberry Pi images use .pgp; older package aliases use .gpg.
# This only recognizes the protected distro keyring location. APT still verifies
# repository signatures and the source files retain their root ownership checks.
APT_SIGNED_BY = r"/usr/share/keyrings/[A-Za-z0-9_.-]+\.(?:gpg|asc|pgp)"


class Rejected(Exception):
    pass


def fail(code):
    raise Rejected(code)


def unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            fail("BOOTSTRAP_JSON_DUPLICATE")
        value[key] = item
    return value


def exists(path):
    return os.path.lexists(path)


def trusted_path(path, *, executable=False, directory=False):
    """Check both lexical and resolved paths; protected distribution links allowed."""
    path = Path(path)
    if not path.is_absolute() or ".." in path.parts:
        fail("BOOTSTRAP_PATH")
    pending, checked = [path], set()
    while pending:
        current = pending.pop()
        for item in (Path(current.anchor), *reversed(current.parents[:-1]), current):
            if item in checked:
                continue
            checked.add(item)
            if len(checked) > 128:
                fail("BOOTSTRAP_PATH_DEPTH")
            try:
                info = item.lstat()
            except OSError:
                fail("BOOTSTRAP_PATH_MISSING")
            if info.st_uid != 0:
                fail("BOOTSTRAP_PATH_OWNER")
            if stat.S_ISLNK(info.st_mode):
                try:
                    pending.append(item.resolve(strict=True))
                except (OSError, RuntimeError):
                    fail("BOOTSTRAP_PATH_LINK")
            elif info.st_mode & 0o022 or not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                fail("BOOTSTRAP_PATH_MODE")
            elif stat.S_ISREG(info.st_mode) and info.st_mode & 0o6000:
                fail("BOOTSTRAP_PATH_MODE")
            elif executable and stat.S_ISDIR(info.st_mode) and not info.st_mode & 0o001:
                fail("BOOTSTRAP_TOOL_PATH")
    info = path.stat()
    if directory and not stat.S_ISDIR(info.st_mode):
        fail("BOOTSTRAP_DIRECTORY")
    if executable and (not stat.S_ISREG(info.st_mode) or info.st_mode & 0o005 != 0o005):
        fail("BOOTSTRAP_TOOL")
    return path


def private_file(path, limit):
    trusted_path(path)
    info = Path(path).lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > limit:
        fail("BOOTSTRAP_FILE")
    with open(path, "rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        fail("BOOTSTRAP_FILE_SIZE")
    return data


def validate_config(value):
    if not isinstance(value, dict) or set(value) != {"schemaVersion", "baseUrl", "assets", "deliveryDirectory"}:
        fail("BOOTSTRAP_CONFIG")
    if type(value["schemaVersion"]) is not int or value["schemaVersion"] != 1 or value["deliveryDirectory"] != DELIVERY:
        fail("BOOTSTRAP_CONFIG")
    base = value["baseUrl"]
    if not isinstance(base, str) or len(base) > 2048:
        fail("BOOTSTRAP_BASE_URL")
    try:
        url = urlsplit(base)
        valid = (url.scheme == "https" and url.hostname and not url.username and not url.password
                 and url.port in (None, 443) and not url.query and not url.fragment
                 and re.fullmatch(r"https://[A-Za-z0-9.-]+(?::443)?(?:/[A-Za-z0-9._~-]+)*/?", base)
                 and all(part not in (".", "..") for part in url.path.split("/")))
    except ValueError:
        valid = False
    if not valid:
        fail("BOOTSTRAP_BASE_URL")
    assets = value["assets"]
    if not isinstance(assets, list) or len(assets) != len(ASSETS):
        fail("BOOTSTRAP_ASSETS")
    found = {}
    for asset in assets:
        if (not isinstance(asset, dict) or set(asset) != {"name", "sha256", "bytes"}
                or asset.get("name") not in ASSETS or asset["name"] in found
                or not isinstance(asset.get("sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", asset["sha256"])
                or type(asset.get("bytes")) is not int or not 0 < asset["bytes"] <= LIMITS[asset["name"]]):
            fail("BOOTSTRAP_ASSETS")
        found[asset["name"]] = asset
    if found[NODE_ASSET]["sha256"] != NODE_SHA256:
        fail("BOOTSTRAP_NODE_PIN")
    return {**value, "baseUrl": base.rstrip("/")}


def run(arguments, *, capture=False, timeout=1800, env=None, cwd=None):
    trusted_path(arguments[0], executable=True)
    try:
        result = subprocess.run(arguments, env=env or ENV, cwd=cwd, timeout=timeout,
                                stdout=subprocess.PIPE if capture else None,
                                stderr=subprocess.PIPE if capture else None, check=False)
    except (OSError, subprocess.TimeoutExpired):
        fail("BOOTSTRAP_COMMAND_FAILED")
    if capture and (len(result.stdout) > 1024**2 or len(result.stderr) > 65536):
        fail("BOOTSTRAP_COMMAND_OUTPUT")
    return result


def output(arguments):
    result = run(arguments, capture=True, timeout=30)
    if result.returncode != 0 or result.stderr:
        fail("BOOTSTRAP_QUERY_FAILED")
    try:
        return result.stdout.decode("utf-8", errors="strict")
    except UnicodeError:
        fail("BOOTSTRAP_QUERY_OUTPUT")


def check_units(text):
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        fail("BOOTSTRAP_UNIT_OUTPUT")
    for line in lines:
        match = UNIT_ROW.fullmatch(line)
        if not match or len(match[1]) > 255:
            fail("BOOTSTRAP_UNIT_OUTPUT")
        if match[1].startswith(("nexowatt-eos", "iobroker")):
            fail("BOOTSTRAP_EXISTING_UNITS")


def check_clusters():
    for path in CLUSTER_PATHS:
        if exists(path) and (path.is_symlink() or not path.is_dir() or any(path.iterdir())):
            fail("BOOTSTRAP_EXISTING_CLUSTER_DATA")
    if exists("/usr/bin/pg_lsclusters") and output(["/usr/bin/pg_lsclusters", "--no-header"]).strip():
        fail("BOOTSTRAP_EXISTING_CLUSTERS")


def check_existing_installation():
    for path in EOS_PATHS:
        if exists(path):
            fail("BOOTSTRAP_EXISTING_EOS")
    for table in ("passwd", "group"):
        for account in ACCOUNTS:
            result = run(["/usr/bin/getent", table, account], capture=True, timeout=15)
            if result.returncode != 2 or result.stdout or result.stderr:
                fail("BOOTSTRAP_EXISTING_ACCOUNT")
    check_units(output(["/usr/bin/systemctl", "list-unit-files", "--no-legend", "--no-pager", "--full"]))
    check_clusters()


def check_repo_url(uri, suites):
    try:
        url = urlsplit(uri)
        valid = (url.scheme in ("http", "https") and url.hostname in OFFICIAL_REPOS
                 and not url.username and not url.password and url.port is None
                 and not url.query and not url.fragment
                 and url.path.rstrip("/") in OFFICIAL_REPOS[url.hostname]
                 and suites and set(suites) <= SUITES)
    except ValueError:
        valid = False
    if not valid:
        fail("BOOTSTRAP_APT_SOURCE")


def validate_apt_sources(text, *, deb822):
    """Recognize official source forms; reject trust bypasses or custom fields."""
    count = 0
    if not deb822:
        for raw in text.splitlines():
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            match = re.fullmatch(r"deb(?:-src)?(?:\s+\[([^\]]+)\])?\s+(\S+)\s+(\S+)\s+([A-Za-z0-9 -]+)", line)
            if not match:
                fail("BOOTSTRAP_APT_SOURCE_SYNTAX")
            if match[1]:
                for option in match[1].split():
                    if not re.fullmatch(r"(?:arch=arm64|signed-by=" + APT_SIGNED_BY + r")", option):
                        fail("BOOTSTRAP_APT_SOURCE_OPTIONS")
            check_repo_url(match[2], [match[3]])
            if not set(match[4].split()) <= {"main", "contrib", "non-free", "non-free-firmware", "rpi"}:
                fail("BOOTSTRAP_APT_COMPONENTS")
            count += 1
        return count
    paragraph = {}
    for line in [*text.splitlines(), ""]:
        if line.lstrip().startswith("#"):
            continue
        if not line.strip():
            if not paragraph:
                continue
            if set(paragraph) - {"Types", "URIs", "Suites", "Components", "Architectures", "Signed-By", "Enabled"}:
                fail("BOOTSTRAP_APT_SOURCE_OPTIONS_FIELDS")
            if paragraph.get("Enabled", "yes") != "yes":
                if paragraph["Enabled"] == "no":
                    paragraph = {}
                    continue
                fail("BOOTSTRAP_APT_SOURCE_OPTIONS_ENABLED")
            if not set(paragraph.get("Types", "").split()) or not set(paragraph["Types"].split()) <= {"deb", "deb-src"}:
                fail("BOOTSTRAP_APT_SOURCE_SYNTAX")
            if paragraph.get("Architectures", "arm64") != "arm64":
                fail("BOOTSTRAP_APT_SOURCE_OPTIONS_ARCHITECTURES")
            if not re.fullmatch(APT_SIGNED_BY, paragraph.get("Signed-By", "")):
                fail("BOOTSTRAP_APT_SOURCE_OPTIONS_SIGNED_BY")
            if (not set(paragraph.get("Components", "").split())
                    or not set(paragraph["Components"].split()) <= {"main", "contrib", "non-free", "non-free-firmware", "rpi"}):
                fail("BOOTSTRAP_APT_SOURCE_OPTIONS_COMPONENTS")
            uris = paragraph.get("URIs", "").split()
            if not uris:
                fail("BOOTSTRAP_APT_SOURCE_SYNTAX")
            for uri in uris:
                check_repo_url(uri, paragraph.get("Suites", "").split())
            count += 1
            paragraph = {}
        else:
            match = re.fullmatch(r"([A-Za-z-]+):[ \t]*(\S(?:.*\S)?)", line)
            if not match or match[1] in paragraph:
                fail("BOOTSTRAP_APT_SOURCE_SYNTAX")
            paragraph[match[1]] = match[2]
    return count


def check_apt_sources():
    files = []
    if exists("/etc/apt/sources.list"):
        files.append(Path("/etc/apt/sources.list"))
    directory = Path("/etc/apt/sources.list.d")
    if exists(directory):
        trusted_path(directory, directory=True)
        files += sorted(p for p in directory.iterdir() if p.suffix in (".list", ".sources"))
    count = 0
    for file in files:
        count += validate_apt_sources(private_file(file, 65536).decode("utf-8"), deb822=file.suffix == ".sources")
    if count == 0:
        fail("BOOTSTRAP_APT_SOURCES_MISSING")


def preflight(staging):
    if sys.platform != "linux" or os.getuid() != 0 or platform.machine() not in ("aarch64", "arm64"):
        fail("BOOTSTRAP_LINUX_ARM64_ROOT_REQUIRED")
    trusted_path(staging, directory=True)
    if (staging.parent != Path("/root") or not re.fullmatch(r"eos-download-[A-Za-z0-9_-]+", staging.name)
            or staging.lstat().st_mode & 0o077):
        fail("BOOTSTRAP_PRIVATE_STAGING_REQUIRED")
    for tool in ("/usr/bin/python3", "/usr/bin/curl", "/usr/bin/systemctl", "/usr/bin/getent", "/usr/bin/apt-get"):
        trusted_path(tool, executable=True)
    trusted_path("/etc/os-release")
    os_release = private_file(Path("/etc/os-release").resolve(), 16384).decode("utf-8")
    values = dict(re.findall(r'^([A-Z_]+)=[\"\']?([A-Za-z0-9._-]+)[\"\']?$', os_release, re.M))
    if values.get("ID") not in ("debian", "raspbian") or not re.fullmatch(r"13(?:\.\d+)*", values.get("VERSION_ID", "")):
        fail("BOOTSTRAP_DEBIAN13_REQUIRED")
    if not Path("/run/systemd/system").is_dir():
        fail("BOOTSTRAP_SYSTEMD_REQUIRED")
    manager = output(["/usr/bin/systemctl", "show", "--property=Version", "--property=SystemState"])
    version = re.search(r"^Version=(\d+)", manager, re.M)
    if not version or int(version[1]) < 257 or not re.search(r"^SystemState=(running|degraded)$", manager, re.M):
        fail("BOOTSTRAP_SYSTEMD_REQUIRED")
    if shutil.disk_usage("/").free < 6 * 1024**3:
        fail("BOOTSTRAP_SPACE_REQUIRED")
    try:
        terminal = os.open("/dev/tty", os.O_RDWR | os.O_NOCTTY)
        try:
            if not os.isatty(terminal):
                fail("BOOTSTRAP_TTY_REQUIRED")
        finally:
            os.close(terminal)
    except OSError:
        fail("BOOTSTRAP_TTY_REQUIRED")
    check_existing_installation()
    check_apt_sources()
    if exists("/usr/bin/node"):
        if output(["/usr/bin/node", "--version"]).strip() != "v" + NODE_VERSION:
            fail("BOOTSTRAP_NODE_VERSION_CONFLICT")
        return True
    trusted_path("/opt", directory=True)
    if not Path("/opt").stat().st_mode & 0o001:
        fail("BOOTSTRAP_NODE_PARENT_MODE")
    node_parent = NODE_DEST.parent.parent.parent
    if exists(node_parent):
        trusted_path(node_parent, directory=True)
        if not node_parent.stat().st_mode & 0o001:
            fail("BOOTSTRAP_NODE_PARENT_MODE")
    if exists(NODE_DEST.parent.parent):
        fail("BOOTSTRAP_NODE_DESTINATION_EXISTS")
    return False


def digest_file(path, expected):
    info = Path(path).lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size != expected["bytes"]:
        fail("BOOTSTRAP_ASSET_SIZE")
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024**2), b""):
            digest.update(block)
    if digest.hexdigest() != expected["sha256"]:
        fail("BOOTSTRAP_ASSET_HASH")


def download_assets(config, staging):
    files = {}
    for asset in config["assets"]:
        name = asset["name"]
        destination = staging / name
        with open(destination, "xb"):
            pass
        os.chmod(destination, 0o600)
        result = run(["/usr/bin/curl", "-q", "--proto", "=https", "--proto-redir", "=https", "--tlsv1.2",
                      "--fail", "--show-error", "--silent", "--connect-timeout", "30", "--max-time", "1800",
                      "--max-filesize", str(asset["bytes"]), "--output", str(destination),
                      "--url", config["baseUrl"] + "/" + name], timeout=1830)
        if result.returncode != 0:
            fail("BOOTSTRAP_DOWNLOAD_FAILED")
        digest_file(destination, asset)
        os.chmod(destination, 0o400)
        files[name] = destination
    # No extraction or host mutation can begin until all three have passed.
    return files


def zip_path(name):
    path = PurePosixPath(name.rstrip("/"))
    if (not name or "\\" in name or "\0" in name or path.is_absolute() or not path.parts
            or any(part in (".", "..") or not re.fullmatch(r"[A-Za-z0-9_.@+-]+", part) for part in path.parts)
            or path.as_posix() != name.rstrip("/")):
        fail("BOOTSTRAP_ZIP_PATH")
    return path


def extract_kit(archive, destination):
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if not entries or len(entries) > 10000:
            fail("BOOTSTRAP_ZIP_ENTRIES")
        seen, files, total = set(), set(), 0
        for entry in entries:
            name = zip_path(entry.filename).as_posix()
            mode = entry.external_attr >> 16
            kind = stat.S_IFMT(mode)
            if (entry.orig_filename != entry.filename or name in seen or entry.flag_bits & 1
                    or entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED)
                    or kind not in (0, stat.S_IFREG, stat.S_IFDIR) or mode & 0o7000
                    or bool(kind == stat.S_IFDIR) != entry.is_dir() and kind != 0
                    or entry.file_size > 16 * 1024**2):
                fail("BOOTSTRAP_ZIP_ENTRY")
            seen.add(name)
            if not entry.is_dir():
                files.add(name)
            elif entry.file_size:
                fail("BOOTSTRAP_ZIP_ENTRY")
            total += entry.file_size
            if total > 256 * 1024**2:
                fail("BOOTSTRAP_ZIP_SIZE")
        for name in seen:
            if any(parent.as_posix() in files for parent in PurePosixPath(name).parents):
                fail("BOOTSTRAP_ZIP_COLLISION")
        required = {"tools/bootstrap/first-start.cjs", "bootstrap.json", "license-public-trust.json",
                    DELIVERY + "/delivery.json", DELIVERY + "/release-public.pem"}
        if not required <= files or DELIVERY + "/" + EOS_ASSET in seen:
            fail("BOOTSTRAP_KIT_LAYOUT")
        destination.mkdir(mode=0o700)
        for entry in entries:
            target = destination.joinpath(*zip_path(entry.filename).parts)
            if entry.is_dir():
                target.mkdir(mode=0o700, parents=True, exist_ok=True)
                continue
            target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            with source.open(entry) as incoming, open(target, "xb") as outgoing:
                copied = 0
                while block := incoming.read(1024**2):
                    copied += len(block)
                    if copied > entry.file_size:
                        fail("BOOTSTRAP_ZIP_SIZE")
                    outgoing.write(block)
                if copied != entry.file_size:
                    fail("BOOTSTRAP_ZIP_SIZE")
            os.chmod(target, 0o600)
    return destination


def extract_node(archive, destination):
    found, total, count = False, 0, 0
    with tarfile.open(archive, "r|xz") as source:
        for entry in source:
            count += 1
            total += entry.size
            if count > 20000 or total > 512 * 1024**2 or entry.size < 0:
                fail("BOOTSTRAP_NODE_ARCHIVE_SIZE")
            if entry.name != NODE_MEMBER:
                continue
            if found or not entry.isreg() or not 64 <= entry.size <= 256 * 1024**2:
                fail("BOOTSTRAP_NODE_MEMBER")
            found = True
            with source.extractfile(entry) as incoming, open(destination, "xb") as outgoing:
                header = incoming.read(64)
                if (len(header) != 64 or header[:6] != b"\x7fELF\x02\x01"
                        or int.from_bytes(header[18:20], "little") != 183
                        or int.from_bytes(header[16:18], "little") not in (2, 3)):
                    fail("BOOTSTRAP_NODE_ELF")
                outgoing.write(header)
                copied = len(header)
                while block := incoming.read(1024**2):
                    copied += len(block)
                    if copied > entry.size:
                        fail("BOOTSTRAP_NODE_MEMBER")
                    outgoing.write(block)
                if copied != entry.size:
                    fail("BOOTSTRAP_NODE_MEMBER")
            os.chmod(destination, 0o400)
    if not found:
        fail("BOOTSTRAP_NODE_MEMBER")
    return destination


def cluster_config(text, *, stock_include_empty):
    if len(text.encode("utf-8")) > 65536 or "\0" in text:
        fail("BOOTSTRAP_CLUSTER_CONFIG")
    seen, output_lines = set(), []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            output_lines.append(line)
            continue
        if re.fullmatch(r"include_dir\s+'\/etc/postgresql-common/createcluster.d'\s*(?:#.*)?", stripped):
            if not stock_include_empty or "include_dir" in seen:
                fail("BOOTSTRAP_CLUSTER_INCLUDE")
            seen.add("include_dir")
            output_lines.append(line)
            continue
        match = re.fullmatch(r"([a-z][a-z0-9_]*)\s*=\s*(?:'([^']*)'|([A-Za-z0-9_./%+-]+))\s*(?:#.*)?", stripped)
        if not match or match[1] in seen or match[1].startswith("include"):
            fail("BOOTSTRAP_CLUSTER_CONFIG")
        seen.add(match[1])
        if match[1] == "create_main_cluster":
            if match[2] is not None or match[3] not in ("true", "false"):
                fail("BOOTSTRAP_CLUSTER_CONFIG")
            output_lines.append("# EOS preserved previous setting: " + line)
        else:
            output_lines.append(line)
    return "\n".join(output_lines) + "\n# EOS: dedicated cluster is provisioned by the signed installer.\ncreate_main_cluster = false\n"


def disable_distribution_cluster(staging):
    path = Path("/etc/postgresql-common/createcluster.conf")
    before = private_file(path, 65536)
    include = Path("/etc/postgresql-common/createcluster.d")
    empty = not exists(include)
    if not empty:
        trusted_path(include, directory=True)
        empty = not any(include.iterdir())
    after = cluster_config(before.decode("utf-8"), stock_include_empty=empty).encode("utf-8")
    backup = staging / "createcluster.conf.before"
    with open(backup, "xb") as stream:
        stream.write(before)
    os.chmod(backup, 0o600)
    descriptor, name = tempfile.mkstemp(prefix=".eos-createcluster-", dir=path.parent)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write(after)
        stream.flush()
        os.fsync(stream.fileno())
        os.fchmod(stream.fileno(), 0o644)
    if private_file(path, 65536) != before:
        fail("BOOTSTRAP_CLUSTER_CONFIG_CHANGED")
    os.replace(name, path)


def prepare_packages(staging):
    check_existing_installation()
    check_apt_sources()
    if shutil.disk_usage("/").free < 6 * 1024**3:
        fail("BOOTSTRAP_SPACE_REQUIRED")
    for command in (["/usr/bin/apt-get", *APT_OPTIONS, "update"],
                    ["/usr/bin/apt-get", *APT_OPTIONS, "install", "-y", "--no-remove", "--no-install-recommends", *PACKAGES]):
        if run(command).returncode != 0:
            fail("BOOTSTRAP_APT_FAILED")
    check_clusters()
    disable_distribution_cluster(staging)
    check_clusters()
    if run(["/usr/bin/apt-get", *APT_OPTIONS, "install", "-y", "--no-remove", "--no-install-recommends",
            "postgresql-17", "postgresql-client-17"]).returncode != 0:
        fail("BOOTSTRAP_APT_FAILED")
    check_clusters()


def install_node(node_file, node_present):
    if node_present:
        if output(["/usr/bin/node", "--version"]).strip() != "v" + NODE_VERSION:
            fail("BOOTSTRAP_NODE_CHANGED")
        return
    if exists("/usr/bin/node") or exists(NODE_DEST.parent.parent):
        fail("BOOTSTRAP_NODE_DESTINATION_EXISTS")
    trusted_path("/opt", directory=True)
    parent = NODE_DEST.parent.parent.parent
    if not exists(parent):
        parent.mkdir(mode=0o755)
        os.chmod(parent, 0o755)
    trusted_path(parent, directory=True)
    NODE_DEST.parent.parent.mkdir(mode=0o755)
    os.chmod(NODE_DEST.parent.parent, 0o755)
    NODE_DEST.parent.mkdir(mode=0o755)
    os.chmod(NODE_DEST.parent, 0o755)
    with open(node_file, "rb") as incoming, open(NODE_DEST, "xb") as outgoing:
        shutil.copyfileobj(incoming, outgoing, 1024**2)
    os.chmod(NODE_DEST, 0o755)
    trusted_path("/usr/bin", directory=True)
    os.symlink(str(NODE_DEST), "/usr/bin/node")
    if output(["/usr/bin/node", "--version"]).strip() != "v" + NODE_VERSION:
        fail("BOOTSTRAP_NODE_START_FAILED")


def ssh_environment(value):
    env = dict(ENV)
    if value:
        parts = value.split()
        try:
            valid = (len(parts) == 4 and all(0 < int(parts[index]) <= 65535 for index in (1, 3))
                     and all(ipaddress.ip_address(parts[index]) for index in (0, 2)))
        except ValueError:
            valid = False
        if valid:
            env["SSH_CONNECTION"] = " ".join(parts)
    return env


def install_downloaded(config, staging):
    """Internal handoff from an authenticated downloader, never a CLI bypass.

    Recheck the fresh host and every complete asset. A downloader's earlier
    checks are not evidence that the bytes still present are the pinned ones.
    """
    config = validate_config(config)
    node_present = preflight(staging)
    assets = {}
    for asset in config["assets"]:
        path = staging / asset["name"]
        trusted_path(path)
        digest_file(path, asset)
        os.chmod(path, 0o400)
        assets[asset["name"]] = path
    kit = extract_kit(assets["installer-kit.zip"], staging / "kit")
    node = extract_node(assets[NODE_ASSET], staging / "node.bin")
    destination = kit / DELIVERY / EOS_ASSET
    with open(assets[EOS_ASSET], "rb") as incoming, open(destination, "xb") as outgoing:
        shutil.copyfileobj(incoming, outgoing, 1024**2)
    os.chmod(destination, 0o400)
    # Public artifacts are authenticated before any package transaction or Node
    # installation. Native release/signature checks follow in the fixed runner.
    print("EOS: Alle Download-Hashes stimmen. Bereite Node und PostgreSQL vor.", flush=True)
    prepare_packages(staging)
    install_node(node, node_present)
    result = run(["/usr/bin/node", str(kit / "tools/bootstrap/first-start.cjs")],
                 timeout=3600, cwd=kit, env=ssh_environment(os.environ.get("SSH_CONNECTION", "")))
    if result.returncode != 0:
        fail("BOOTSTRAP_FIRST_START_FAILED")


def prepare(config, staging):
    config = validate_config(config)
    preflight(staging)
    print("EOS: Voraussetzungen geprüft; lade die drei festgelegten Installationsdateien.", flush=True)
    download_assets(config, staging)
    install_downloaded(config, staging)


def main():
    if len(sys.argv) != 2:
        fail("BOOTSTRAP_USAGE")
    config_path = Path(sys.argv[1])
    if not config_path.is_absolute() or config_path.name != "download.json":
        fail("BOOTSTRAP_CONFIG_PATH")
    config = json.loads(private_file(config_path, 16384), object_pairs_hook=unique_object)
    prepare(config, config_path.parent)


if __name__ == "__main__":
    try:
        main()
    except (Rejected, OSError, ValueError, zipfile.BadZipFile, tarfile.TarError) as error:
        code = str(error) if isinstance(error, Rejected) else "BOOTSTRAP_PREPARATION_FAILED"
        print("EOS: Vorbereitung abgebrochen: " + code + ". Die Ablage und vorhandene Daten bleiben erhalten.", file=sys.stderr)
        sys.exit(1)
