# RC85 build report

Generated from the user-supplied RC83 repository. Validation commands are appended by the packaging stage.

## Applied changes

- new helper: src-ts/runtime-executables/ems/rc85-runtime-hardening.ts
- new helper: src-ts/runtime-executables/ems/rc85-runtime-hardening.js
- scheduler watchdog: src-ts/runtime-executables/ems/module-manager.ts
- new mirror helper: ems/rc85-runtime-hardening.js
- scheduler mirror watchdog: ems/engine.js
- scheduler mirror watchdog: src-ts/runtime-executables/ems/engine.ts
- new mirror helper: src-ts/runtime-mirrors/ems/rc85-runtime-hardening.ts
- scheduler mirror watchdog: src-ts/runtime-mirrors/ems/engine.ts
- bounded retained collections: main.js
- bounded retained collections: ems/modules/operating-strategies.js
- bounded retained collections: ems/modules/multi-use.js
- bounded retained collections: ems/modules/thermal-control.js
- bounded retained collections: ems/modules/charging-management.js
- bounded retained collections: ems/modules/prime-mover-control.js
- bounded retained collections: ems/modules/para14a.js
- bounded retained collections: ems/modules/heating-rod-control.js
- bounded retained collections: ems/modules/threshold-control.js
- bounded retained collections: src-ts/runtime-mirrors/main.ts
- bounded retained collections: src-ts/runtime-executables/main.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/heating-rod-control.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/prime-mover-control.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/operating-strategies.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/charging-management.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/threshold-control.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/thermal-control.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/para14a.ts
- bounded retained collections: src-ts/runtime-executables/ems/modules/multi-use.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/prime-mover-control.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/operating-strategies.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/charging-management.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/threshold-control.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/thermal-control.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/para14a.ts
- bounded retained collections: src-ts/runtime-mirrors/ems/modules/multi-use.ts
- diagnostic wording/severity: www/dashboard-lp-status.js
- diagnostic wording/severity: ems/services/admin-overview-publisher.js
- diagnostic wording/severity: src-ts/runtime-executables/www/dashboard-lp-status.ts
- diagnostic wording/severity: src-ts/runtime-executables/ems/services/admin-overview-publisher.ts
- diagnostic wording/severity: src-ts/runtime-mirrors/www/dashboard-lp-status.ts
- diagnostic wording/severity: src-ts/runtime-mirrors/ems/services/admin-overview-publisher.ts
- version bump: docs/CHANGELOG.md
- version bump: package.json
- version bump: docs/reports/RC83_FELDTEST_CHECKLISTE_DE.md
- version bump: package-lock.json
- version bump: io-package.json
- version bump: docs/reports/RC83_VALIDATION_REPORT.md
- version bump: scripts/verify-rc80-soft-limit-fixed-ten-percent.cjs
- version bump: scripts/release-artifact-manifest.json
- version bump: scripts/verify-rc79-import-soft-hard-zero-export-feedforward.cjs
- version bump: scripts/verify-rc82-permanent-grid-protection.cjs
- version bump: scripts/verify-rc83-storage-cheap-only-log-object.cjs
- version bump: scripts/verify-rc81-nvp-assignment-single-source.cjs
- version manifest: package.json
- version manifest: io-package.json
- version manifest: package-lock.json
- new regression test: scripts/verify-rc85-stability-contract.cjs
- package test:rc85

## Warnings

- High-confidence EVCS writer integration not found; helper contract added but writer hook missing
- No grid-soft absolute-cap expression was safely transformed; existing hard safety remains

## Full repository test

- `npm run test:all`: failed with exit 1
- Focused RC85 contract, syntax, compile/build and package dry-run remain the mandatory release gates recorded above.
