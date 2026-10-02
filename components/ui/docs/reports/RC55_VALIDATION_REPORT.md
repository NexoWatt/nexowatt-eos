# RC55 validation report

- Source: `NexoWatt-ui-0.8.178-RC54-OPERATING-STRATEGIES-RULE-BUILDER-SIMULATION-NPM-READY.zip`
- Output version: `0.8.179`
- Focused Auto-arbitration safety test: PASSED
- TypeScript/project type check executed: YES
- Direct hardware writes in arbitration module: NONE
- Default Auto source: STANDARD
- Default control stage: SHADOW
- Per-resource opt-in: REQUIRED
- Commissioning confirmation: REQUIRED
- Request TTL default: 15 seconds
- Fallback: STANDARD AUTO

## Safety invariants

- Strategy is ineligible outside operating mode Auto.
- Strategy is ineligible while Standard Auto is selected.
- Shadow and commissioning stages do not permit productive handover.
- Expired requests are discarded.
- Safety force-stop overrides all strategy requests.
- Final planner power is clamped to the supplied safety envelope.
- Existing load-management/device writer remains the execution owner.

## Build log

```text
Project root: /mnt/data/rc55_build_work$ node scripts/test-rc55-operating-strategy-auto-arbitration.js
RC55 operating-strategy Auto arbitration: all safety contract tests passed.
$ npm run typecheck

> iobroker.nexowatt-ui@0.8.179 typecheck
> tsc -p tsconfig.json --noEmit


```

- Focused executable fail-closed arbitration tests: PASSED
