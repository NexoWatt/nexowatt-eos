#!/usr/bin/env bash
# Development-only native PostgreSQL laboratory. No host package or service changes.
NATIVE_PG_LAB_VERSION='2026-10-04'
set -euo pipefail
umask 077
[[ ${EUID} -ne 0 && $# -eq 1 && $1 = /* && -d $1 && ! -L $1 ]] || exit 1
lab_root=$(realpath -- "$1")
[[ $(stat -c %u -- "$lab_root") = "$EUID" && $(stat -c %a -- "$lab_root") = 700 ]] || exit 1
repo_root=$(git rev-parse --show-toplevel)
printf 'EOS native PostgreSQL laboratory preparation %s\n' "$NATIVE_PG_LAB_VERSION"
for tool in curl tar sha256sum make gcc bison flex openssl npm; do command -v "$tool" >/dev/null; done
node -e 'if (process.version !== "v24.21.0" || process.platform !== "linux" || process.arch !== "x64") process.exit(1)'

mkdir "$lab_root/controller" "$lab_root/pg-client" "$lab_root/source"
cp "$repo_root/system/test-base/app/package.json" "$repo_root/system/test-base/app/package-lock.json" "$lab_root/controller/"
cp "$repo_root/reports/integration/postgresql/raw/pg-package.json" "$lab_root/pg-client/package.json"
cp "$repo_root/reports/integration/postgresql/raw/pg-package-lock.json" "$lab_root/pg-client/package-lock.json"
# npm checks every downloaded package against the committed lock's integrity.
# Product lifecycle scripts are never run by laboratory dependency preparation.
npm --prefix "$lab_root/controller" ci --ignore-scripts --no-audit --no-fund
npm --prefix "$lab_root/pg-client" ci --ignore-scripts --no-audit --no-fund

# Same upstream source and SHA-256 recorded in the qualified 2026-10-01 fixture.
# This is a test-only compiler build, not an assertion of current security status.
archive="$lab_root/source/postgresql-17.11.tar.bz2"
curl -q --proto '=https' --tlsv1.2 --fail --silent --show-error \
  --connect-timeout 20 --max-time 180 --max-filesize 21787224 \
  https://ftp.postgresql.org/pub/source/v17.11/postgresql-17.11.tar.bz2 -o "$archive"
[[ $(stat -c %s -- "$archive") = 21787224 ]]
printf '%s  %s\n' dd27f2b3c59e73ed14aa3324901242bf69a032a6347805f274e6260322d42979 "$archive" | sha256sum --check --status
tar --no-same-owner -xjf "$archive" -C "$lab_root/source"
cd "$lab_root/source/postgresql-17.11"
./configure --prefix="$lab_root/postgresql" --with-ssl=openssl --without-readline --without-icu
make -j2
make install
"$lab_root/postgresql/bin/postgres" --version
