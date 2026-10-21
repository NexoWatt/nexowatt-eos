# EOS Admin security refresh — 2026-10-21

This source revision keeps EOS Admin 7.10.11 and the EOS role, licensing,
local-session and signed-maintenance profile. It is not an Admin 8 migration.
The new runtime candidate uses js-controller 7.2.5; controller 8 is not admitted.
No signed delivery, Pi installation or production acceptance is established here.

## Reviewed dependency changes

| Package | Previous Admin source lock | Updated source lock |
| --- | --- | --- |
| @iobroker/adapter-core | 3.4.1 | 3.4.3 |
| @iobroker/socket-classes | 2.3.4 | 2.10.0 |
| @iobroker/webserver | 1.4.0 | 3.3.1 |
| @iobroker/ws-server | 4.4.1 | 4.5.2 |
| compression | 1.8.1 | 1.8.2 |
| proxy-addr | 2.0.7 | 2.0.8 |
| follow-redirects | 1.16.0 | 1.16.1 |

The frontend development lock also changes follow-redirects 1.15.11 to 1.16.1.
The maintained OAuth override `@node-oauth/oauth2-server@5.3.0` and its startup
assertion remain mandatory at the assembled application's dependency root.
Source lock versions are not a claim about an installed Pi. See the parent
refresh report for advisory applicability and the installed runtime SBOM.

Published metadata was read from `https://registry.npmjs.org/` for these exact
versions. Upstream projects are `ioBroker/ioBroker.socket-classes`,
`ioBroker/webserver`, `ioBroker/ioBroker.ws.server`, and `ioBroker/adapter-core`.
The advisory comparison is recorded separately under
`reports/integration/upstream-review-20261021/`.

The inherited backend lock lacked registry origin/integrity metadata for 502
entries. These were repaired from verified published metadata for 475 exact
package/version pairs, without changing their versions. Both lock provenance
gates now pass. A fresh `npm ci --ignore-scripts` installed 757 packages using
the completed integrity pins. This is archive integrity/admission evidence,
not publisher attestation or a complete vulnerability audit. The Admin Node
22 range now starts at 22.12.0 to match the new upstream dependency requirement.

## Preserved and strengthened boundaries

- Missing upstream socket permission hooks now abort initialization. The outer
  EOS dispatcher continues to check the full request, role and current session.
- Optional OAuth authorization-code and registration flows are explicitly off.
  SSO and Chat remain denied. EOS constructs its existing HTTPS server; it does
  not instantiate the new upstream WebServer HTTP/2 or ACME server defaults.
- The new socket library's controller-7 fallback checks state/file metadata with
  the authenticated user, invalidates decisions on changed rights, and rechecks
  revocation before pending events are delivered. Controller-8-only permission
  helpers are not required or claimed.
- Two upstream compatibility limits remain explicitly characterized: nonadmin
  object-event replay and Admin's cached host-read identity forwarding. The
  existing EOS denial of nonadmin raw subscriptions and finite service-only
  host-read policy remain necessary. These tests do not certify repaired
  upstream functionality or complete identity forwarding for every path.
- The new ws-server 4.5.2 build is admitted only with exact published input and
  output hashes and actual Admin dependency resolution. Its 1 MiB inbound
  decompressed-message cap remains mandatory; upstream compression level 6 is
  retained. The historical 4.5.1 profile and hashes remain available only for
  the historical controller profile's explicit verification.
- Existing bounded external-resource calls retain their five-second total
  deadline, TLS verification, no redirect/retry, response-size and cancellation
  controls. No secret, operational credential or persistent test key is added.

## Reproducible backend and retained frontend

The backend build previously inferred a common source root outside `src` and
could emit `build/src/main.js` while leaving the shipped `build/main.js` stale.
An explicit `rootDir` and the existing typed license-client public entry fix
that output path. The embedded license-client package itself is unchanged.
TypeScript sources are compiled; already-runtime JavaScript is copied verbatim,
including the byte-bound license verifier. Inapplicable JavaScript transform
maps are removed. The backend-only asset step no longer fetches mutable remote
schemas or modifies frontend helpers. Existing shipped English/German EOS
translation keys are retained in source so rebuilding preserves them.

No full frontend rebuild was performed. Existing `adminWww`, `src-admin/src`
and `src-admin/public` assets match their previous sealed hashes. The frontend
manifest and lock are now also included in the prebuilt seal. Browser checks
exercise the existing shipped network/update assets with fixture APIs, not a
live appliance login or actual managed update.

## Verification scope

Execution uses Linux x64 and Node 24.19.0 in the local development environment;
the release/CI target remains Node 24.21.0. The results file records exact
commands, counts, package/build hashes, and remaining environment limits.

The combined real-library source and built-runtime tests cover local HTTPS,
TLS rejection, maintained OAuth password/refresh behavior, password-change
revocation, session races, role denial, controller-7 metadata ACL fallback,
resource bounds, and required socket-hook failure. Controller/database I/O
fixtures are identified in the tests. The OAuth integration selects the 7.2.5
DB callback contract; the actual published controller bridge is separately
covered by the PostgreSQL controller-contract test.

The browser checks use an ephemeral npm-pinned `@sparticuz/chromium@143.0.4`
(actual Chromium 143.0.7499.0). The normal Playwright browser download was not
usable in this environment. This test browser is not part of the product.
An npm bulk-advisory request returned HTTP 403; no clean full-audit result is
claimed. A fresh installed-tree audit/SBOM, required CI/native runs and target
Pi acceptance remain separate release gates.
