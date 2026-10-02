# NexoWatt EOS Admin v7.9.82 – Native NexoWatt Shell Foundation

## Ziel

v7.9.82 removes the legacy branding/security DOM overlay chain from the active browser entry and moves the visible EOS navigation into the React source. The ioBroker Admin functional core remains for socket, objects, adapters, users, hosts and update compatibility, while the product shell is owned by NexoWatt.

## Active browser stack

- `hostInit-v82.js`
- `remoteEntry-v82.js`
- `bootstrap-COulQZax-v82.js`
- v82 route bundles
- `nexowatt-native-shell.css?v=82`
- `nexowatt-native-shell.js?v=82`
- `eos-native-security.js?v=82`
- `eos-policy-client.js?v=82`
- `eos-role-ui.js?v=82`
- `eos-manual-write-policy.js?v=82`

The active `adminWww/index.html` no longer loads `eos-branding.js`, `eos-security-ui.js`, `eos-console-quiet.js` or `eos-objects-state-tools.js`.

## Native React ownership

The following navigation concerns are now rendered in React:

- EOS tab labels
- modern SVG icons
- active tab state
- keyboard focus
- click navigation
- core and selected dynamic tab titles

The shell runtime only handles the fixed product frame, logo, route classes and navigation container layout. It does not rewrite React labels or icons after render.

## Compatibility boundary

This is a NexoWatt fork and product shell, not a from-zero replacement of the ioBroker protocol stack. The ioBroker Admin functional core is retained for proven controller/socket compatibility. The legacy visible skin and overlapping DOM interception are no longer part of the active production entry.

## Validation

Run:

```bash
npm run check:eos-package
npm run check:eos-stability
npm pack --dry-run
```
