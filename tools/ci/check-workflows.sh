#!/usr/bin/env bash
# Development-only GitHub Actions syntax/expression validator; no product install.
set -euo pipefail

[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || {
  printf '%s\n' 'Workflow validation requires Linux x86_64.' >&2
  exit 1
}

validator_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/eos-actionlint.XXXXXXXX")"
trap 'rm -rf -- "$validator_dir"' EXIT
validator_archive="$validator_dir/actionlint.tar.gz"
# rhysd/actionlint v1.7.12 official release asset digest, checked 2026-10-04.
curl -q --fail --silent --show-error --proto '=https' --proto-redir '=https' \
  --tlsv1.2 --location --max-redirs 3 --connect-timeout 10 --max-time 60 \
  --max-filesize 16777216 \
  'https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz' \
  --output "$validator_archive"
printf '%s  %s\n' \
  '8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8' \
  "$validator_archive" | sha256sum --check --status
tar --extract --gzip --file "$validator_archive" --directory "$validator_dir" \
  --no-same-owner --no-same-permissions actionlint
chmod 700 "$validator_dir/actionlint"
"$validator_dir/actionlint" -version
# Validate GitHub syntax, expressions and job dependencies. Shell and Python
# regression checks are separate; optional unpinned local linters are not invoked.
shopt -s nullglob
workflow_files=(.github/workflows/*.yml .github/workflows/*.yaml)
(( ${#workflow_files[@]} > 0 )) || {
  printf '%s\n' 'No workflow definitions found.' >&2
  exit 1
}
"$validator_dir/actionlint" -color -shellcheck='' -pyflakes='' "${workflow_files[@]}"
