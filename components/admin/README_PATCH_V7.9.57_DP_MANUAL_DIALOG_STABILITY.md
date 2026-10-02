# NexoWatt EOS Admin v7.9.57

Native datapoints stability patch.

- Keeps ioBroker semantics: common.write=false is read-only, common.write=true/undefined is writable.
- Opens the normal value dialog for writable state values instead of silently direct-writing switch/button cells.
- Renders value/tooltip placeholders while the state cache is still loading, so clicks do not vanish.
- Allows German decimal comma in number value dialog by using text input with decimal input mode.
- Keeps EOS branding observers away from large ObjectBrowser surfaces.
