# NexoWatt EOS Admin v7.9.54 – Native Admin Datapoints Restore

This patch restores the stable ioBroker Admin/ObjectBrowser datapoint flow while keeping the NexoWatt EOS design and the previous delete/logquiet/role fixes.

## Why

The v50-v53 DPWrite experiments replaced the normal module-federation entry/bundles and introduced additional datapoint click/write handlers. That could trigger duplicate React-DnD HTML5Backend initialization and could make the Objects/Datapoints page disappear or behave inconsistently.

## What changed

- Restored the stable Admin module-federation entry path.
- Removed the EOS performance guard injection from the Admin page.
- Replaced the datapoint helper with a passive marker only; it no longer captures clicks or scans the ObjectBrowser DOM.
- Writability follows ioBroker object metadata again:
  - `common.write === false` => read-only
  - `common.write !== false` => writable
- Expert mode no longer turns read-only states into writable states.
- The value dialog now returns changes through the native ObjectBrowser `onClose/onUpdate` path.
- The robust switch boolean parsing from v49 is preserved.

## Expected behavior

Read registers must be created with `common.read=true` and `common.write=false`.
Write/command registers must be created with `common.read=true` and `common.write=true`.

The ObjectBrowser will only offer value editing for writable states.
