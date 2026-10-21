# EOS controller 7.2.5 build profile

This version-specific, offline profile accepts only the published and hash-pinned
7.2.5 controller/CLI/adapter/common-db files. It never installs packages or mutates
an active runtime. Version 8 and unreviewed 7.x versions fail closed.

The caller uses `applySecurityRefreshToBuild(app, adapters)` from the parent
`transform.cjs`, then `verifySecurityRefreshProfile(app, adapters)`. The combined
operation checks all original inputs before writing the first output. Verification
covers the normal/scheduled adapter admission, denied host/CLI installation,
disabled automatic upgrades/plugins/executable capabilities, external PID state,
private backup staging/archive paths and serialized adapter shutdown. The adapter
patch additionally replaces the upstream session-read diagnostic with a fixed
code because OAuth session IDs can contain bearer tokens.

The full product's Admin path requires the separately pinned WebSocket 4.5.2
transform. The exact controller/profile/version is then bound into the fresh
catalogue, source evidence, SBOM and signed release by the build pipeline.
PostgreSQL backend insertion changes controller package metadata and must be
recorded as a separate derivative too.

Historical 7.2.2 guard/helper and pinned-build bytes remain intact. Their old
source entry points and fixtures still verify that exact historical profile.
`profile-validation.cjs` dispatches only between these two reviewed identities;
it does not widen the controller's own immutable guard.

Tests and provenance:
`reports/integration/security-refresh-20261021/controller/README.md`.
No production, native Pi, full-system restore or plant acceptance is asserted.
