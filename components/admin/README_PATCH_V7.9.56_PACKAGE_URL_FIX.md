# NexoWatt EOS Admin v7.9.56 Package URL Fix

Fixes package metadata URLs in `io-package.json` so `common.extIcon`, `common.readme` and `common.meta` point to the active package version `7.9.56`.

This resolves the NexoWatt EOS package validation error that still referenced `iobroker.eos-admin@7.9.54`.
