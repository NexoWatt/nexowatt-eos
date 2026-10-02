# Implementation notes

## Status

Version `0.2.2` is a field-test core. It is intended to be installed on NexoWatt EOS and tested with real EEBUS devices.

Implemented:

- mDNS/DNS-SD discovery and announcement.
- Local SHIP TLS/WebSocket endpoint.
- Outgoing SHIP client connections.
- CMI frame exchange.
- Hello pending/ready workflow.
- Protocol handshake with JSON-UTF8.
- PIN state/input handling.
- Per-device pairing/trust states.
- SPINE data wrapper with protocolId `ee1.0`.
- NodeManagement detailed discovery read request.
- Generic parser for feature types, functions, use cases and basic measurement values.
- Field-test command datagrams for selected LoadControl, PowerSequences, Setpoint and HVAC commands.

Not yet verified:

- Real device acceptance of the generated SHIP session sequence.
- Vendor-specific NodeManagement response formats.
- Feature addressing for write commands.
- Limit IDs, selectors and bindings for wallboxes, CLS boxes, smart meters, heat pumps and battery/inverter devices.
- Certification-level interoperability.

## Creator note

The initial container environment could not resolve the npm registry when the project was first created, so the repository was built in a creator-like modern ioBroker TypeScript structure and then kept aligned with current ioBroker metadata patterns.

## Safety defaults

```text
autoAcceptNewDevices = false
allowCommandsToUntrustedDevices = false
commandDryRun = true
```

Read-only NodeManagement discovery is allowed after SHIP data exchange because the adapter needs it for automatic device classification.


## Legacy identity migration

Version `0.2.2` migrates known old instance values such as `model=EEBUS Adapter` and `deviceType=EnergyOperationSystem` to the fixed EOS HEMS identity (`NexoWatt`, `EOS`, `EnergyManagementSystem`, category `2`). Only the changed identity keys are persisted so protected/encrypted certificate and private-key fields are not rewritten by the migration.
