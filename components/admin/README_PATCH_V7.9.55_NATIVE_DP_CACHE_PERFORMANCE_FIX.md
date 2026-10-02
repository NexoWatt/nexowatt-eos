# NexoWatt EOS Admin v7.9.55 Native DP Cache/Performance Fix

- Restores ioBroker Admin datapoint semantics: `common.write=false` read-only, `common.write!==false` writable.
- Fixes ignored clicks on writable value cells while the ObjectBrowser states cache is still loading.
- Allows context-menu value editing before the states cache is complete.
- Updates local state after successful manual writes.
- Adds early console-noise filtering for known ioBroker Admin diagnostic logs.
- Overwrites stale `eos-performance-guard.js` from v50-v53 with a no-op neutralizer.
- Reduces EOS DOM observers on large virtualized admin surfaces.
