# NexoWatt EOS Admin v7.9.58 – Admin Stability / Delete / Version Install Fix

This patch keeps the native ioBroker Admin datapoint semantics and focuses on stability/performance around the NexoWatt EOS skin.

## Changes

- Stops route chunks from importing older `bootstrap-COulQZax-v54/v55/v56/v57.js` bundles. Those stale imports could render the app twice and trigger the ioBroker "Error in GUI" / GitHub issue page.
- Adds v58 cache-busted entry files for `hostInit`, `remoteEntry`, `bootstrap`, `Objects`, adapter-react shared bundle, and route chunks.
- Optimizes the EOS console quiet filter so it no longer stringifies large objects for every console call.
- Reduces branding/security DOM work on heavy admin surfaces: datapoints, adapters/modules, instances/services, hosts, and logs.
- Restores instance-aware delete protection: only `eos-admin.0` is protected; extra test instances like `eos-admin.1` are deletable.
- Keeps protected core adapters guarded: `admin.0`, `eos-admin.0`, `backitup`, `nexowatt-devices`, `nexowatt-device`, `nexowatt-dev`, `nexowatt-ui`.
- Shows the expert "Install specific version" action for installed adapters even when repository metadata disables normal adapter update buttons.
- Keeps datapoints on native ioBroker ObjectBrowser behavior: `common.write === false` is read-only; otherwise the native value dialog is used.

## Cache note

After installing, remove stale uploaded files from `iobroker-data/files/eos-admin.admin` and clear browser site data, because older v50-v57 module-federation bundles can survive normal uploads.
