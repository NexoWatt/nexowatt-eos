# NexoWatt OCPP

**NexoWatt OCPP** is the local OCPP CSMS adapter for the **NexoWatt Energy Operation System (EOS)**. EOS is based on ioBroker, therefore the technical adapter ID `ocpp21`, package name `iobroker.ocpp21`, instance paths and existing installations remain compatible.

OCPP **1.6J**, **2.0.1** and **2.1** are supported on the same server port.

## Compact datapoint tree

Each station uses a small set of functional folders:

```text
<station>.info
<station>.health
<station>.measurements
<station>.vehicle
<station>.transactions
<station>.control
```

Optional and disabled by default:

```text
<station>.connectors   # separate diagnostics per connector
<station>.advanced     # raw OCPP messages / Device Model report
```

Obsolete deep branches such as `main`, `meterValues`, `evse`, `evChargingNeeds`, `ocpp` and `dm` are removed when cleanup is enabled.

## EOS-relevant datapoints

| Datapoint | Meaning |
|---|---|
| `<station>.measurements.powerW` | Current charging power in W |
| `<station>.measurements.powerExportW` | Current V2G/export power in W |
| `<station>.measurements.currentA` | Highest active phase current in A |
| `<station>.measurements.energyWh` | Total charged energy in Wh |
| `<station>.measurements.energyKWh` | Total charged energy in kWh |
| `<station>.measurements.socPercent` | Vehicle SoC when reported |
| `<station>.info.status` | Station/connector status |
| `<station>.info.socketConnected` | Physical OCPP WebSocket is connected |
| `<station>.health.activityFresh` | Any OCPP request or response was observed within the activity window |
| `<station>.health.online` | WebSocket is connected and OCPP activity is current |
| `<station>.health.heartbeatAlive` | Heartbeat was received within its expected window |
| `<station>.health.dataFresh` | Active-import power is current or a confirmed safe zero is active |
| `<station>.health.powerFresh` | Real active-import power was received within the freshness window |
| `<station>.health.socFresh` | SoC was received within the SoC freshness window |

EOS should normally require:

```text
health.online && health.dataFresh
```

SoC-dependent decisions must additionally require `health.socFresh`.

The connection states are deliberately independent:

```text
info.socketConnected  = physical WebSocket exists
health.activityFresh  = any OCPP application traffic is current
health.heartbeatAlive = Heartbeat diagnostic is current
```

For compatibility, `info.connection` also follows the physical WebSocket. A delayed Heartbeat therefore only clears `health.heartbeatAlive`. As long as the socket exists and `MeterValues`, `StatusNotification`, `TransactionEvent` or an OCPP response is received, `health.activityFresh` and `health.online` remain true.

The activity window is at least 90 seconds and is never shorter than the configured Heartbeat tolerance. A current heartbeat never makes an old power value artificially fresh.

## Correct OCPP mapping

OCPP calls energy flowing into the vehicle **Import**. EOS exposes it as charging power:

| Reported measurand/vendor spelling | EOS datapoint |
|---|---|
| `Power.Active.Import` | `measurements.powerW` |
| `ActivePowerImport` | `measurements.powerW` |
| `ActivePowerInport` | `measurements.powerW` |
| `ImportActivePower` | `measurements.powerW` |
| `Power.Active.Export` | `measurements.powerExportW` |
| `Current.Import` | `measurements.currentA` |
| `Energy.Active.Import.Register` | `measurements.energyWh` and `measurements.energyKWh` |
| `SoC`, `StateOfCharge`, `BatterySoC` | `measurements.socPercent` |

An explicit power/current measurand without a unit receives the correct inferred unit. Only a completely omitted SampledValue measurand uses the OCPP default `Energy.Active.Import.Register` in Wh.
Existing known `ActivePowerInport` duplicate states are removed when legacy cleanup is enabled.

### Phase aggregation

- Per-phase power is summed.
- Station current is the highest phase current, not the arithmetic sum. Three phases at 16 A therefore result in `currentA = 16 A`, not 48 A.
- `L1-N`, `L2-N` and `L3-N` are stored as compact `L1`, `L2` and `L3` suffixes.

## Charging-interruption safeguards

The adapter avoids several patterns that can contribute to interruptions with sensitive station firmware:

1. OCPP CALLRESULT is returned immediately; datapoint work runs afterwards in an ordered per-station queue.
2. Repeated `StatusNotification` TriggerMessage requests are disabled by default.
3. `MeterValues` are requested only when active-import power is stale.
4. If the station disconnects within 30 seconds after TriggerMessage, active refresh is automatically suppressed for six hours while passive station messages remain active.
5. Smart-charging profiles and schedules use deterministic IDs per station, control function and target scope instead of accumulating random profiles.
6. A zero limit keeps the last safe profile by default instead of sending an accidental zero profile.
7. Values below the configured minimum are clamped to at least 6 A.
8. Superseded EOS setpoints are not sent later from a queue.
9. Charging-profile updates are spaced by at least five seconds by default and changes inside the deadband are not sent.
10. Active telemetry refresh is paused while a smart-charging command is pending.

A disconnect close to TriggerMessage is a correlation signal, not proof. Station, vehicle, protection and OCPP logs are still required to identify the exact origin of a field interruption.

## Interruption diagnostics

Relevant states include:

```text
<station>.health.lastDisconnectAt
<station>.health.lastDisconnectCode
<station>.health.lastDisconnectReason
<station>.health.refreshRelatedDisconnects
<station>.health.refreshSuppressedUntil
<station>.health.refreshSuppressedReason
<station>.health.lastOutboundMethod
<station>.health.lastOutboundAt
<station>.health.outboundErrorCount
<station>.health.lastTransactionStopReason
<station>.info.socketConnected
<station>.health.activityFresh
<station>.health.heartbeatAlive
<station>.health.activityAgeSec
<station>.health.activityTimeoutSec
<station>.control.lastCommand
<station>.control.lastCommandAt
<station>.control.lastResponse
<station>.control.lastError
<station>.transactions.lastReason
<station>.transactions.triggerReason
```

## Charging-station endpoint

Default port:

```text
9220
```

Example:

```text
ws://<EOS-IP>:9220/<station-id>
```

Supported WebSocket subprotocols:

```text
ocpp1.6
ocpp2.0.1
ocpp2.1
```

## Main settings

| Setting | Default | Purpose |
|---|---:|---|
| Heartbeat interval | 300 s | Interval returned by BootNotification |
| Health cycle | 5 s | Calculates online and freshness states |
| Minimum activity window | 90 s | Lower bound for `activityFresh`; effective value is never shorter than Heartbeat tolerance |
| Republish unchanged states | 10 s | Refreshes still-valid status/counter states |
| Active refresh | enabled | Requests MeterValues only when power is stale |
| Active refresh interval | 60 s | Gentle minimum TriggerMessage interval |
| Request StatusNotification | disabled | Avoids sensitive-firmware issues |
| Telemetry maximum age | 90 s | `powerFresh` threshold |
| SoC maximum age | 300 s | `socFresh` threshold |
| Connector details | disabled | Enable only for true multi-connector diagnostics |
| Raw OCPP capture | disabled | Enable temporarily for diagnostics |
| Zero-limit behaviour | keep last profile | Prevents unintended charging suspension |
| Minimum charging current | 6 A | Smart-charging lower bound |
| Minimum profile interval | 5 s | Avoids unnecessary rapid profile re-evaluation |

## Control

Important writable states:

```text
<station>.control.availability
<station>.control.chargeLimit
<station>.control.chargeLimitType
<station>.control.numberOfPhases
<station>.control.startTrigger
<station>.control.stopTrigger
<station>.control.hardReset
<station>.control.softReset
```

`control.numberOfPhases` is writable. Applied decisions are exposed through `requestedChargeLimit`, `appliedChargeLimit`, `chargeLimitReason` and `chargeLimitClamped`.

## Aliases

Functional aliases are created below:

```text
alias.0.nexowatt.ocpp.<instance>.<station>
```

Technical `alias.0.ocpp21...` compatibility aliases are optional.

## Development

Dependency-free core tests:

```bash
npm run test:core
```

Full test suite after installing development dependencies:

```bash
npm test
```

A field test with the exact charging-station firmware remains mandatory before production use.
