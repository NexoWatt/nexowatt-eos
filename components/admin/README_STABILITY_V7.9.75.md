# NexoWatt EOS Admin v7.9.75 – type-aware manual datapoint controls

This stability release makes every writable datapoint operable according to its native behavior:

- button/trigger: writes `true` directly;
- writable boolean: toggles reliably, including `null`, string and numeric source values;
- number/string/enum/JSON: opens the native ObjectBrowser value dialog;
- `common.write === false`: always read-only;
- safety-relevant commands: writable only in expert mode.

Safety policy supports explicit metadata (`manualWriteExpertOnly`) and conservative fallback detection for resets, charging/discharging power, current limits, export limits, setpoints and operating modes.
