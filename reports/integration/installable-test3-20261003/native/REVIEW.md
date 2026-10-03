# Native TEST policy review — 2026-10-03

This review permits packaging two exact Serialport ARM64/glibc libraries. It does not record a successful Pi installation, a target load, or a hardware acceptance. The installer must run the signed `runtime/native/serialport-acceptance.cjs --app <verified-app>` on the actual target before changing host directories or services. A failure stops installation.

The original full npm tree contained 23 Serialport `.node` files. Both original npm archives were checked against their lockfile SHA-512 SRI, and all 48/53 package files were compared byte for byte with the isolated installed tree. The new normalization verifies both entire original packages before changing either. It removes only 21 enumerated foreign prebuilds, keeps the two selected libraries, changes the precise JavaScript loader, and adds a fixed loader. Package metadata and upstream license files retain their original bytes. No lifecycle script, compiler, target binary, or serial-device method runs during the build.

| Package | Exact selected library SHA-256 | Declared Node-API |
| --- | --- | --- |
| `@serialport/bindings-cpp@12.0.1` | `2341a58d2c3d99f827a411c65cb1c9c9f00a80b62e9bbbde58b2f29625fd56d9` | 6 |
| `@serialport/bindings-cpp@13.0.0` | `a92389bed45b1ea7f9613e6c01de18e60cf58d484cddf065d8603c9143876f8f` | 8 |

`serialport-policy.json` binds exact package paths, versions, upstream archive URLs/SRI/SHA-256, complete original inventories, selected native hashes, modified loader hashes, and generated fixed-loader hashes. An added or changed package file, a link, another package location/version, another target, or an unreviewed addon fails the architecture gate. The original historical `d` tree and historical signed packages are not rewritten.

The fixed loader requires Linux ARM64, Node 24.21.0, Node-API at least 8, libuv major 1, and glibc 2.28 or newer within major 2. It accepts no Electron/NW.js runtime. It checks the fixed native path and all ancestors for root ownership, links, and group/world writes, then checks a regular singly linked file through an `O_NOFOLLOW` descriptor and its complete SHA-256. The loader does not consult environment-based selectors, build directories, nearby executables, or `node-gyp-build`. `process.dlopen(..., RTLD_NOW)` forces imported symbols to resolve immediately. Libraries remain mode 0644; they are not executables.

Static ELF inspection found only the expected ARM64 ELF shared objects and no imported Node/V8 C++ interfaces. Both libraries import `uv_close`, `uv_default_loop`, `uv_poll_init`, `uv_poll_start`, `uv_poll_stop`, `uv_strerror`, and `uv_unref`, so Node-API stability alone is insufficient. Their system-library requirements are bounded by GLIBC 2.28, GLIBCXX 3.4.21, CXXABI 1.3.9, and GCC 3.0. The target's actual loader must resolve these dependencies and symbols; the cross-build never claims that it did so. Detailed imports, exports, `DT_NEEDED`, version requirements, and absence of a runtime search path are in `elf-observation.json`.

After eager loading, the target probe checks exactly the nine Linux exports `Poller`, `close`, `drain`, `flush`, `get`, `getBaudRate`, `open`, `set`, and `update`, each a function. It does not call any export, construct a Poller, enumerate ports, or open/write a device. The target JSON explicitly retains `hardwareAccepted:false` and `deviceIoPerformed:false`. Controller admission of physical adapters remains separate and unchanged.

SBOM components for both modified packages have `modified:true`. Upstream archive hashes appear only in `pedigree.ancestors`. Separate native evidence binds both original and normalized file tables, every removed/modified/added file, provenance, and the mandatory target probe. The runtime verifier independently checks the normalized bytes, exact ancestor hashes, expected native properties, and canonical evidence digest. This does not misrepresent the modified package as its original upstream archive.

Primary-source basis, consulted 2026-10-03:

- [Serialport supported environments](https://serialport.io/docs/guide-platform-support/) documents Node-API use and marks ARM64 as built but outside its fully supported platform set. This review does not turn that upstream best-effort status into a hardware qualification.
- [Node-API ABI implications](https://nodejs.org/api/n-api.html#implications-of-abi-stability) distinguish the stable Node-API surface from libuv, Node/V8 C++ interfaces, and external libraries. The actual package metadata and ELF imports determine this policy's narrower contract.
- [libuv versioning and ABI policy](https://raw.githubusercontent.com/libuv/libuv/v1.x/README.md) supplies the libuv major-version compatibility basis; the target probe additionally checks immediate symbol resolution.
- [node-gyp-build 4.8.4 loader](https://raw.githubusercontent.com/prebuild/node-gyp-build/v4.8.4/node-gyp-build.js) shows environment selectors and fallback search paths removed from these two packages.
- [Node process.dlopen API](https://nodejs.org/api/process.html#processdlopenmodule-filename-flags) documents explicit loader flags; `RTLD_NOW` avoids mistaking lazy loading for an immediate symbol-resolution check.
- [Serialport 12.0.1 source](https://github.com/serialport/bindings-cpp/tree/v12.0.1) and [13.0.0 source](https://github.com/serialport/bindings-cpp/tree/v13.0.0) describe the initialization/export surface. The pinned npm archive inventories include their source files.

Open acceptance: actual Linux ARM64 eager loading; full clean Pi installation and reboot; first-start HTTPS/password/license flows on that host; all device protocols and physical control. The Windows-host tests and full-tree static gate are evidence for packaging and rejection behavior only.
