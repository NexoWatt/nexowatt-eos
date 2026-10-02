#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f package.json ]]; then
  echo "package.json fehlt. Die Merge-ZIP muss direkt in den vorhandenen Repository-Ordner entpackt werden." >&2
  exit 1
fi
if [[ ! -f tools/nexowatt-apply-ems-overview.cjs ]]; then
  echo "Die EMS-Live-Diagnose aus der bereitgestellten Merge-ZIP fehlt." >&2
  exit 1
fi

version="$(node -p "require('./package.json').version")"
echo "NexoWatt EOS Admin Merge-Prüfung für Version ${version}"
node tools/nexowatt-apply-ems-overview.cjs
npm run sync:eos-version
npm run prepare:eos-release-defaults
npm run clean:eos-runtime
npm run check:eos-package
npm run check:eos-stability
npm pack --dry-run
echo "MERGE ERFOLGREICH: Version ${version} ist geprüft und für die manuelle Veröffentlichung bereit."
