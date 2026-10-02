# NexoWatt EOS Admin v7.9.56 Native DP Click/Tooltip Performance Stabilization

This patch keeps the NexoWatt EOS design while restoring native ioBroker Admin datapoint behavior.

## Datapoint semantics

- `common.write === false`: read-only / no manual write
- `common.write !== false`: native ObjectBrowserValue dialog opens and writes through the normal ioBroker ObjectBrowser path

No unrestricted EOS write capture and no custom DP write bridge are active for normal datapoint value clicks.

## Stabilization

- value cell click stops bubbling into row selection before opening the native value dialog
- writable value cells keep a minimum click target even while the state cache is still loading
- tooltips receive a non-empty startup title and safe state fallback, so hover information can load reliably
- EOS branding/security/role observers do not scan the native datapoints table, logs table, MUI tooltips, poppers or dialogs on every mutation
- stale `eos-performance-guard.js` is a no-op compatibility shim
- console filtering is resilient against `%c`-prefixed ioBroker admin debug logs and late console rewrites

## Preserved fixes

- protected delete list remains limited to EOS core adapters
- delete/logquiet fixes remain active
- role guard for Admin / Installateur / Endkunde remains active
