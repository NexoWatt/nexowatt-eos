# NexoWatt EOS Admin v7.9.74

Targeted datapoint interaction stabilization on top of v7.9.72.

- Expert mode does not block writable state editing.
- Header/filter background styling has no relationship to write access.
- Writable value cells stop mouse-down propagation before row selection can re-render the virtual row.
- The native ioBroker value dialog remains the only normal state-write path.
- `common.write=false` stays read-only.
- Writable cells receive a clear hover/focus indicator.
