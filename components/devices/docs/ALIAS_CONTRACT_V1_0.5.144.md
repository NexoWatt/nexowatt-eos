# NexoWatt Device Alias Contract v1

Version: `1`  
Adapter release: `0.5.144`  
Status: **stable**

## Purpose

The Alias Contract is the manufacturer-independent interface between
`nexowatt-devices` and higher-level NexoWatt components such as the NexoWatt UI,
load management, storage control and third-party integration hosts.

Raw manufacturer datapoints remain available. Existing aliases under
`devices.<id>.aliases.*` are also preserved for backwards compatibility. New
automatic integrations must use the versioned namespace:

```text
devices.<id>.aliases.v1.*
```

## Discovery

Each configured device exposes a machine-readable manifest at:

```text
devices.<id>.aliases.meta.manifest
```

The manifest is a JSON string with this structure:

```json
{
  "schemaVersion": 1,
  "namespace": "v1",
  "standardPath": "aliases.v1",
  "deviceClass": "evCharger",
  "templateId": "evcs.alfen.ng9xx.ace.socket1.modbusTcp",
  "category": "EVCS",
  "manufacturer": "Alfen",
  "model": "NG9xx ACE Socket 1 Control Only",
  "capabilities": [
    "read.power",
    "read.statusCode",
    "write.currentLimitA"
  ],
  "missingRequired": []
}
```

Additional metadata states:

```text
aliases.meta.schemaVersion
aliases.meta.deviceClass
aliases.meta.namespace
aliases.meta.capabilities
aliases.meta.capabilityCount
aliases.meta.missingRequired
aliases.meta.templateId
aliases.meta.category
aliases.meta.manufacturer
aliases.meta.model
```

## Device classes

| Template category | Canonical device class |
|---|---|
| `EVCS`, `EVSE` | `evCharger` |
| `METER` | `meter` |
| `PV_INVERTER` | `pvInverter` |
| `ESS` | `storageSystem` |
| `BATTERY` | `battery` |
| `BATTERY_INVERTER` | `batteryInverter` |
| `HEAT` | `heat` |
| `IO` | `io` |
| `CHARGER`, `DC_CHARGER` | `solarCharger` |
| other | `generic` |

`CHARGER` and `DC_CHARGER` deliberately do **not** represent vehicle charging
points. They are solar/battery DC chargers and must never be listed in the EVCS
UI.

## Canonical units

The `aliases.v1` namespace always uses the following units, independent of the
manufacturer protocol:

| Quantity | Unit |
|---|---|
| Power | `W` |
| Energy | `Wh` |
| Current | `A` |
| Voltage | `V` |
| Temperature | `°C` |
| Duration | `s` |
| Percentage | `%` |
| Frequency | `Hz` |
| Unix timestamp | `ms` |

The runtime converts values in both directions. For example, a FENECON setpoint
that is natively expressed in `kW` is written through
`aliases.v1.ctrl.powerSetpointW` in watts. Manufacturer-specific semantics are
also retained: the ABL eMH1 still receives its documented PWM duty cycle while
NexoWatt writes amperes to `aliases.v1.ctrl.currentLimitA`.

## Common aliases

Every device exposes:

```text
aliases.v1.comm.connected
aliases.v1.comm.lastError
aliases.v1.alarm.offline
aliases.v1.r.online
aliases.v1.r.heartbeat
aliases.v1.r.lastSeenMs
```

Device-specific aliases are published only when the template supports the
corresponding capability. Consumers must check the manifest instead of assuming
that every optional state exists.

## Capability rules

Capabilities use stable strings:

```text
read.<name>
write.<name>
```

Examples:

```text
read.power
read.energyTotal
read.soc
read.vehicleConnected
write.run
write.currentLimitA
write.powerSetpointW
```

A UI integration should:

1. enumerate `nexowatt-devices.*.devices.*` channels;
2. read `aliases.meta.manifest`;
3. require `schemaVersion === 1`;
4. select devices by `deviceClass`;
5. bind only capabilities listed in the manifest;
6. access values exclusively through `aliases.v1`.

## Compatibility and validation

- Existing `aliases.*` paths are retained.
- The current catalogue produces 2,230 canonical `aliases.v1` definitions across 181 templates.
- Every currently published legacy alias path is represented in v1 after the documented canonical name mapping.
- All 181 templates declare their device class explicitly.
- Runtime/admin template copies and contract copies must be byte-identical.
- The release guard rejects missing metadata, invalid classes, duplicate template
  IDs, invalid JSON and unresolved merge conflicts.
- Automated tests instantiate every template and verify canonical paths, types,
  roles, units, required aliases and device-class separation.

## Compatibility lock added in adapter 0.5.146

The standard namespace is strictly additive. The adapter does not create new
compatibility states in the unversioned `aliases.*` namespace and does not
change any existing legacy alias target, type, role, unit or conversion.
Canonical-only fallbacks and solar-charger discovery paths are built directly
under `aliases.v1.*`.

A permanent automated baseline compares all 181 raw templates and legacy alias
definitions with the pre-contract production release 0.5.143. Destructive
object/state migrations are forbidden.
