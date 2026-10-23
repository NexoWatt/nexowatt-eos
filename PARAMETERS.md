# NexoWatt EOS review profile — parameters

## Managed test baseline and update candidates (2026-10-23)

For fresh signing, manufacturer helper `tools/bootstrap/sign-qualified-r8-wsl.py`
takes two required positional paths: the original qualified unsigned ZIP and native-evidence
ZIP from source `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`. An optional third
positional path selects a protected absolute signing-key directory below the
current user's Linux home; omitted, it defaults to `~/nexowatt-signing`.
It pins sequence 15, Node 24.22.1 and the replacement manufacturer public-key
hash `518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40`
confirmed later on 2026-10-23 after another passphrase loss. It supersedes the
first replacement from that date; both earlier public keys and reports remain
historical evidence. No private-key compromise was reported. The directory
argument does not override that trust pin.
No bypass, arbitrary-key, publication or host-installation option is provided.
It runs as a normal Linux-x64 user under `/home`, with the prepared local Node
distribution and encrypted key paths described in the
[WSL procedure](docs/operations/WINDOWS_SIGNIERRECHNER_DE.md).
The passphrase is requested interactively by OpenSSL, never as an argument.
The runtime build retains its clean qualified source. After signing and private
temporary-file cleanup, the helper temporarily uses the fully hash-pinned entry
generator with only its manufacturer-key pin replaced, then restores the original.
The final source check rejects all tracked or staged changes reported by Git and
every Git-visible untracked path except the three expected files below `delivery/managed-test-15/`:
`eos-linux-arm64.tar.gz`, `release-public.pem`, and `delivery.json`. This is an
exact output allowlist, not an exclusion of the delivery directory from checks.
Original and replacement entry-tool hashes are recorded separately from the
runtime source in the public summary.

The separate recovery invocation `sign-qualified-r8-wsl.py --finish ABS_WORKDIR`
is pinned to the specific release, archive, delivery metadata and R8 entry
reported in the interrupted run; it is not a generic export or repair command.
It checks canonical paths, ownership and modes, qualified HEAD and the exact
output allowlist, the signed empty feed including expiry, and the signed archive
through a complete readback. It regenerates the public entry and preparation
metadata in a disposable subdirectory, compares both byte-for-byte, and restores
the pinned original entry generator before checking the source state again.
Only then does it create a new `public-finished/` with the allowlisted public
files, summary and metadata ZIP. It retains the original `public/` and refuses
to overwrite an existing `public-finished/`.
An interruption during export can leave a partial destination; retain it for
diagnosis rather than treating a repeated invocation as an overwrite or repair.
It neither opens a private key nor requests a passphrase, signs again, downloads
inputs, publishes files, or installs on a host. A reported signing run stopped
at the former final clean-source check because the three generated delivery
files were untracked. Its log reports successful local signing/readback and
entry preparation, but does not prove an independently verified delivered
archive, successful recovery, publication, or Pi migration. See the
[finalization correction](reports/integration/wsl-signing-finalization-20261023/README_DE.md)
and the recovery procedure in the WSL document.

The received public metadata export was independently checked on 2026-10-23:
exact six-file ZIP inventory, confirmed public-key identity, matching delivery
bindings, a byte-identical R8 entry and preparation document regenerated from
trusted sources, and a cryptographically valid signed empty channel. The feed
expires at `2026-11-22T19:13:09.971Z`; it must be rechecked before publication.
The actual 134278673-byte signed runtime archive was not included. Its signature
and complete payload have not been independently verified in this metadata review.
No runtime release, active feed or installation command was published by this step.
See the [received metadata evidence](reports/integration/managed15-public-metadata-20261023/README_DE.md).

Subsequently, the complete signed archive was received and independently verified:
134278673 bytes, SHA-256 `dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44`,
release `95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534`.
Ed25519 signature, all 22606 payload files, payload/SBOM checks, 169 qualified
source/host bindings, and independently retrieved historical native CI evidence
passed. No target code was executed. The actual archive and entry bindings are
recorded in the [archive verification](reports/integration/managed15-archive-verification-20261023/README_DE.md).
`delivery/r8-managed15/` now holds the prepared public entry and original
preparation evidence; `delivery/managed-test-15/` holds public key/metadata only.
The runtime is prepared as a GitHub Release asset, not a Git file. Asset upload,
public archive readback, active channel publication and the final operator
command remain pending. Existing dependency findings and conditional legacy
PostgreSQL provider concerns remain open; no production or Pi acceptance follows.

The automatic Node policy is separate from the manually confirmed EOS update
operation. Signed feed entries may opt into `automaticNodeUpdate: true`; the
receiver additionally requires a strictly newer supported Node 24 runtime and
byte-identical application, catalogue and host files. Only the three Node files,
`sbom.cdx.json` and `runtime-build.json` may change. The daily activation window
is 02:30–03:00 Europe/Berlin, with no daytime catch-up and at most one persisted
attempt per local calendar day. This uses the existing TEST completion policy
(`physicalControlEnabled: false`), shared OS maintenance lock and proven rollback;
it never fabricates an operator backup/maintenance confirmation.

`tools/system/update-r8-to-managed.cjs` is a separate one-time coordinator for
the exact authenticated completed R8 sequence 11, targeting sequence 15. It
accepts only `--bundle`, `--public-key`, `--expected-release-id` and
`--expected-key-sha256`; `--quiesce-incomplete` is supervisor-only. It runs with
R8's trusted system Node 24.21.0 and probes the target bundled Node 24.22.1 before
activation. There is no intermediate R9/R10/R11 installation. The permanent
manufacturer key is bound by the new immutable entry, not inferred from the old
R8 key. Existing license trust is retained and needs no replacement input.
`tools/bootstrap/build-public-r8-managed-entry.cjs --output <absolute-directory>`
requires the actual signed `delivery/managed-test-15` package and produces the
entry; `--finalize-command <absolute-directory> --entry-base-url <immutable-raw-base>`
binds the generated operator command after the entry location is known. Local
finalization does not attest public readback. See the
[R8 procedure](docs/operations/R8_DIREKT_MANAGED_UPDATE_DE.md).

These source tools do not constitute a published installation release.
`tools/system/install-managed-from-checkout.cjs preflight` only inspects the
prepared host. Its `install` operation requires the five explicit values
`--release-public-key-sha256`, `--origin`, `--hosts-file`, `--license-trust`,
and `--license-trust-sha256`. It accepts only the separately authenticated
sequence-15 ARM64 test baseline. It neither downloads OS packages nor accepts
user passwords on the command line.

Manufacturer tooling `tools/bootstrap/build-managed-test.cjs` requires, in
order, `--prepared-runtime`, `--native-evidence`, `--private-key`,
`--public-key-sha256`, `--sequence` (15 or higher), and `--node-archive`.
The archive is the exact official ARM64 Node 24.22.1 input already bound to
prepared-runtime and native evidence; it is not a signing-key input. `tools/bootstrap/sign-managed-channel.cjs` requires,
in order, `--input`, `--private-key`, `--public-key-sha256`, and `--output`.
Private-key arguments are paths to protected external files, never key values.
The tools create local candidates only; neither publishes automatically.
`tools/integration/prepare-security-refresh.cjs` takes, in order,
`--output`, `--sequence`, `--resolution-lock`, and `--node-archive`; the last argument is
the pinned ARM64 archive that becomes part of the signed payload.

The manufacturer compiler is exactly Node **24.22.1** with npm **11.19.0**.
Node 24.22.1's bundled npm 11.19.1 is not the separately qualified compiler.
Install npm 11.19.0 into that Node distribution's own prefix, then verify the
adjacent `lib/node_modules/npm/package.json` and `npm-cli.js --version` before
resolution or assembly. A different npm found through `PATH` does not satisfy
the build gate. Fresh CI performs this explicit pin; historical jobs retain
their original toolchains. npm is a manufacturer build tool and is not part
of the three-file Node runtime shipped to the Pi. See the exact local command
in [manufacturer preparation](docs/operations/WINDOWS_SIGNIERRECHNER_DE.md).

`tools/bootstrap/build-managed-download.cjs` takes `--base-url`,
`--license-trust`, `--license-trust-sha256`, `--release-public-key-sha256`,
`--output`, and `--node-archive`. For the exact GitHub Release asset base
`https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-<releaseId>`,
it prepares assets without an operator command. Publish the small `install.sh`
separately in an immutable Git commit, then invoke the same tool with
`--finalize-command <absolute-output-directory> --entry-base-url <immutable-raw-delivery-base>`.
The entry base must be `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/<40hex>/delivery/<directory>`.
Finalization binds the local script hash and creates `INSTALL_COMMAND.txt`;
it does not perform public readback. Verify the actual public script and all
assets before handing that command to an operator.
See [scope and outstanding acceptance](docs/operations/MANAGED_TEST_UPDATES_DE.md).

## Failed first-start diagnosis (2026-10-04)

`tools/system/diagnose-first-start.cjs` is a standalone files-only diagnostic.
It accepts no arguments and requires Linux/root to inspect the fixed protected
state paths. It does not connect to PostgreSQL, execute installed modules,
control services or alter a maintenance lock. Output is restricted to known
enums and Boolean comparisons; no credentials or complete device identities
are returned. `ok` describes report generation, never recovery eligibility.
See [operator procedure](docs/operations/FIRST_START_DIAGNOSTIC_DE.md).
Historical signed R4/R5/R6 payloads do not contain this new helper.

## R8 recovery after an R7 rollback (2026-10-04)

`tools/system/recover-r4-restored-r7-to-r8.cjs` is a separate coordinator for
exactly authenticated R4 sequence 7 with the retained published R7 journal in
`RESTORED_STOPPED`. It accepts the same four pinned bundle/key arguments as
R7; no force, arbitrary root, credential replacement or validation bypass is
available. The protected R7 journal, guard, original R4 state and historical
release signatures must agree before any mutation. The R7 evidence remains
unchanged. Separate R8 gates preserve a stopped recovery state on failure.
Fixed `failureStage`, `failureCode` and `failureReason` values survive rollback;
private exception text and device configuration are not exposed.
See [R8 eligibility and failure handling](docs/operations/RECOVER_R4_RESTORED_R7_TO_R8_DE.md).

Management readiness uses fresh adapter heartbeats followed by concurrent
strict HTTPS checks on ports 8081 and 8188. Each endpoint has one monotonic
5000 ms budget including bounded listener retries; only connection refusal or
reset before any response is retried. TLS 1.3, trusted CA/hostname, exact login
redirect and strict anonymous UI authorization predicates remain mandatory.
The source CI and R8 delivery require real native PostgreSQL/Admin/UI startup
and restart in a disposable unprivileged laboratory. Native x64 success does
not establish Pi, systemd, browser login or plant acceptance.

Manufacturer commands `build-public-r8-recovery-entry.cjs` and
`prepare-public-r8-recovery-publication.cjs` under `tools/bootstrap/` use the
same stage-specific argument forms as R7. They authenticate the new sequence-11
archive and retained R7 identity before generating a pinned public entry.
The initial build requires a marker-only child commit bound to its exact source
parent; manual dispatch can only resume an already published R8. No signed R8
or usable operator command is implied until publication and readback succeed.

## R7 failed first-start recovery tools (2026-10-04)

`tools/system/recover-r4-first-start-to-r7.cjs` is a separate, narrowly scoped
coordinator for the authenticated R4 sequence-7 failed first-start state. It
requires exactly `--bundle`, `--public-key`, `--expected-release-id`, and
`--expected-key-sha256`, supplied by a pinned entry for a new signed R7
sequence-10 package. No force, alternate-root or host-validation bypass is
exposed. `--quiesce-incomplete` is reserved for the same systemd invocation.
It verifies the historical schema-2 handoff and existing enrollment/license
bindings before adopting the old maintenance lock. It preserves existing
credentials and requires successful runtime checks before completing setup.
See [scope and failure handling](docs/operations/RECOVER_R4_FIRST_START_R7_DE.md).

The new manufacturer commands are
`tools/bootstrap/build-public-r7-recovery-entry.cjs --asset-commit <40hex>` and,
after publication of that entry, `--entry-commit <40hex>`.
`tools/bootstrap/prepare-public-r7-recovery-publication.cjs` accepts
`--readback <asset-commit>`, `--command-report <entry-commit>`, or
`--check-stage entry|command <HEAD>`. They require the actual signature-verified
R7 archive and verify the packaged coordinator's source binding. These
manufacturer commands do not repair a Pi. A completed R4/R5/R6 installation
does not meet this particular recovery tool's eligibility conditions.

## Current public R6 TEST update (2026-10-04)

The current operator command is always the one published in the README on `main`.
The published and publicly reread R6 path updates an exactly authenticated, completed R4
or R5 TEST installation directly to revision 6 / signed sequence 9. It does not
provide a fresh installation or a general key-rotation interface. See
[R6 procedure and target tests](docs/operations/TEST_R6_UPDATE_DE.md).

Manufacturer-only builder
`reports/integration/installable-test3-r6-20261004/build-revision.cjs` takes no
arguments in CI. Its optional `--base-directory <absolute-path>` selects a local
copy of the same immutable R5 delivery; exact archive, key and release pins are
still mandatory. It requires a clean reviewed Git commit and never persists the
ephemeral private TEST signing key. It writes only the new R6 delivery and its
evidence; historical R4/R5 archives are not overwritten.

The new target tool `tools/system/update-test-to-r6.cjs` requires exactly
`--bundle`, `--public-key`, `--expected-release-id`, and
`--expected-key-sha256`. Those values are supplied by the generated, pinned
download entry, not collected as secrets from the user. No force, target-root,
host-check bypass or password option is exposed. The cleanup entry
`--quiesce-incomplete` is reserved for the same protected systemd invocation.

`tools/bootstrap/build-public-r6-update-entry.cjs --asset-commit <40hex>` builds
the new entry from the real, signature-verified R6 archive; after committing the
entry, `--entry-commit <40hex>` creates its pinned command.
`tools/bootstrap/prepare-public-r6-update-publication.cjs` accepts the separate
manufacturer checks `--readback <asset-commit>`,
`--command-report <entry-commit>`, or `--check-stage entry|command <HEAD>`.
No one of these manufacturer commands updates a Pi.

The R6 workflow supports resuming entry publication after the immutable archive
was published: a subsequent run verifies the existing archive again and may
create only its missing entry. Existing signed deliveries and existing entries
remain immutable. A failed build cannot enter the publication path.

## Historical public R4 one-command TEST download

The user made the repository public on 03.10.2026. The historical R4 entry uses
`delivery/public-entry-test3-r4-recovery2/INSTALL_COMMAND.txt` without a GitHub token.
`tools/bootstrap/build-public-entry.cjs` generates a complete, pinned script
from the exact published R4 host preparer and diagnosed R2 recovery helper.
The command verifies its size and SHA-256 before execution in a root-owned
temporary directory. Both script and unchanged asset mirror use complete Git
commit IDs. Runtime signatures, host admission and license gates are retained.
Entry revision 2 validates the actual local postgres identity for the two empty
PostgreSQL directories, while tool/ancestor checks remain root-only. It fixes
the confirmed RECOVERY_PATH_OWNER false rejection without changing host ownership.
The original entry and signed R4 runtime/App SBOM remain unchanged.
See [correction and evidence](reports/integration/recovery-pg-owner-20261003/README.md).
The public command is for a fresh test host or exactly the diagnosed R2 abort,
never arbitrary existing installations. Making the repository private again
causes a closed download failure. The authenticated route below is historical.
See [publication/readback](reports/integration/recovery-pg-owner-20261003/publication.json)
and [target procedure](docs/operations/STABILITY_TEST4_DE.md).

## Historical private R4 one-command TEST download

The private GitHub route uses `tools/bootstrap/build-github-download.cjs` on the
manufacturer host with exactly `--license-trust`, `--license-trust-sha256`,
`--release-public-key-sha256`, and `--output` (a fresh absolute direct child of
this checkout's `delivery/`). Repository `NexoWatt/nexowatt-eos` and the r4
runtime (delivery revision 4, signed sequence 7) are fixed. Generated byte-exact
Git blobs avoid mutable branch downloads.
The historical private command asks once for a read-only repository token through `/dev/tty`.
It verifies the entire loader before running it and transfers the token only
through FD 3. The loader accepts only the public `--manifest-blob` and
`--manifest-sha256` pins; no token CLI/environment/file, redirect, TLS exception,
or host-check bypass exists. APT/EOS do not receive the token. The preparation
helper rechecks all locally downloaded assets before extraction or mutation.
`verify-private-github-blobs.py` is a manufacturer-only remote readback using
normal existing Git authentication; its OS TLS check is not a target Pi test.

The generated historical packet is `delivery/bootstrap-test3-r4`; its existence
and actual publication are recorded in the [R4 build report](reports/integration/installable-test3-r4-20261003/README.md).
`tools/bootstrap/build-stability-entry.cjs` generates `INSTALL_ONE_COMMAND.txt`
after the signed build and updates the README and product pointers together.
It enters through sudo from the normal SSH account and uses the same fixed pins.
The signed host installers
require a successful root sudo query and its complete C-locale denial for the
specific service account; an exit code alone does not establish absent rights.
A previous `PG_SUDO_POLICY_REJECTED` failure may already have created
`eos-runtime` and staged `/opt/nexowatt/eos` files. The unified R4 entry checks
this state before continuing. The separate `tools/bootstrap/recover-sudo-abort.py`
accepts exactly `--check` (read only) or `--recover` (guarded quarantine).
It is restricted to the diagnosed R2 release and UID 999 / GID 985; it has no
target-root, force or bypass option. It preserves the old tree and numerical
account identity, renames the account/group, journals mutations and stops on
partial failure. No account deletion or sudoers change is provided. The
[separate recovery entry](docs/operations/SUDO_ABORT_RECOVERY_DE.md) is historical
and still pins R3. The R4 fresh-install entry is documented in the historical
R4 procedure linked above; never silently change a historical command or
signature. Other existing installations are rejected by that entry. The current
README provides the R6 update for authenticated, completed R4/R5 installations.

`tools/bootstrap/build-download.cjs` runs only on the manufacturer build host.
It requires exactly `--base-url` (fixed HTTPS directory), `--license-trust`
(absolute authentic public NWL2 export), `--license-trust-sha256`,
`--release-public-key-sha256` (independently authenticated pins), and `--output`
(absolute fresh directory). It does not publish or accept private keys.
Its generated root install command verifies the complete downloaded script
before execution; no target flags disable host, signature or license checks.
The target runner `tools/bootstrap/first-start.cjs` accepts no arguments.
See [scope, prerequisites and still missing deployment inputs](docs/operations/ONE_COMMAND_INSTALLATION_DE.md).

## Browser first-start profile (dev9 / candidate test.3)

The PostgreSQL full-product candidate requires `--setup-input` with `eos-base.cjs install`.
Prepare **public host/trust data only** using `tools/system/prepare-onboarding.cjs`
with `--hosts-file`, `--origin` (HTTPS, port 8443), `--license-trust`,
`--license-trust-sha256` (independently authenticated) and `--output`.
No user password is accepted by this preparation flow. The new frontend sets it.
Local root can renew an uncommitted possession code using
`runtime/onboarding/issue-code.cjs` without arguments. A pending commit cannot
be reopened through this command. See the [complete workflow and open tests](docs/operations/FIRST_START_INSTALLATION_DE.md).

This branch prepares host hardening; it is **not a completed product release**. See [acceptance gates](docs/security/ACCEPTANCE.md). The previous upstream installation commands fetch upstream ioBroker and do not apply these changes.

## Build and source execution

From a reviewed, administrator-controlled checkout outside `/opt/iobroker` and the service account home:

```sh
node tasks --create
bash dist/install.sh --silent --no-autostart
```

The shell profile requires 64-bit Linux, systemd, the fixed `/opt/iobroker` runtime location, and root-owned OS tools under `/usr/bin`. It rejects existing runtime trees; use the maintenance procedure for those. Installer defaults always leave the service **stopped and disabled**. `--no-autostart` remains accepted. `--silent` keeps existing non-interactive installation behavior. No flag bypasses the security/provisioning gates.

`--redis` is rejected before host changes: it used to provision plaintext connections and overwrite configuration. `IOB_FORCE_INITD` is rejected. Windows, macOS and FreeBSD are outside this profile. The upstream NPX entry points remain separate and are not a way to install this hardened profile.

## Existing installation maintenance

Back up and verify recovery first. Stop ioBroker and every service-account process using a separate OS administrator. Then run the **reviewed local** `dist/fix.sh` or `fix_installation.sh`. The maintenance script disables old autostart before changing policy. It aborts for unknown/custom sudo policy and capabilities. It does not compress databases, install latest npm tools, upgrade the OS, or migrate JSONL to Redis. `--no-update` remains harmless because updates are never automatic here.

The script installs a protected CLI and a service with a static TLS configuration check. Read [host privilege migration](docs/security/HOST_PRIVILEGES.md) before execution. Failure may leave a partially applied, stopped migration; recover from the documented backup and review the error. Never automatically restore the old broad sudo policy.

## CLI and local tools

`iob start`, `iob stop`, `iob restart` require an OS administrator's existing authorization. Other CLI calls run as `iobroker`, including calls issued by root. `--allow-root` cannot turn the protected wrapper into a root runtime.

The `iob fix`, `iob diag`, and `iob nodejs-update` remote download shortcuts are disabled. Execute reviewed local scripts instead; e.g. `bash /trusted/review/diag.sh --de --summary`, or `bash /trusted/review/node-update.sh --dry-run`. Diagnostics may include confidential data with `--unmask`. The updater still has its own Debian/non-root/Docker restrictions; its new log behavior does not certify its entire update chain.

## Verification and deployment

```sh
node security/verify-runtime-tls.cjs /path/to/iobroker.json
node --test tests/security/*.test.cjs
python3 tests/security/host-policy.test.py
python3 tests/security/wrapper.test.py
python3 tests/security/node-update-log.test.py
python3 tests/security/profile.test.py
```

The TLS command validates configuration only. It does not provision certificates/Redis, test a connection, migrate data, secure Admin, or prove adapter isolation.

`node tasks --create` needs no deployment secrets. SFTP additionally requires `SFTP_HOST`, `SFTP_PORT`, `SFTP_USER`, `SFTP_PASS`, and an independently verified `SFTP_HOST_KEY_SHA256`. See [SFTP deployment](docs/security/SFTP_DEPLOYMENT.md). Do not publish this branch as a secure product until acceptance is complete.
