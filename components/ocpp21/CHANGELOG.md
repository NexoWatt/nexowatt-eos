# Changelog

## 0.4.0 (2026-08-12)

- Replace the former deep per-protocol object tree with compact station-level folders: `info`, `health`, `measurements`, `vehicle`, `transactions` and `control`.
- Make the optional flat `connectors` branch opt-in and remove obsolete connector details when it is disabled.
- Remove legacy `main`, `meterValues`, `evse`, `evChargingNeeds`, `ocpp` and `dm` branches during migration when cleanup is enabled.
- Map `Power.Active.Import`, `ActivePowerImport`, the vendor typo `ActivePowerInport` and related spellings to `measurements.powerW`.
- Remove obsolete compact-tree `ActivePowerInport` duplicate states during migration, so only `measurements.powerW` remains.
- Infer W/A/V/Wh/% correctly when a station provides an explicit measurand but omits its unit.
- Correct phase aggregation: phase power is summed, while station current is the highest phase current instead of an invalid arithmetic sum.
- Aggregate import and export power/current phase values across separate MeterValues messages.
- Return OCPP CALLRESULT before ioBroker object/state processing and serialize deferred work per station.
- Await status and SoC side effects inside their deferred task so safe-zero/freshness updates cannot be reordered.
- Disable periodic StatusNotification TriggerMessage requests by default and request MeterValues only when active-import power is stale.
- Detect a disconnect within 30 seconds after TriggerMessage and suppress active refresh for six hours while passive OCPP telemetry remains available.
- Add disconnect/refresh correlation diagnostics under `health.refreshRelatedDisconnects`, `refreshSuppressedUntil` and `refreshSuppressedReason`.
- Use deterministic smart-charging profile IDs, latest-command-wins queuing, deadbands and minimum command intervals.
- Separate physical WebSocket state, OCPP application activity and Heartbeat freshness into `info.socketConnected`, `health.activityFresh`/`health.online` and `health.heartbeatAlive`.
- Keep the conventional `info.connection` state tied to the real WebSocket instead of an overdue Heartbeat or quiet application window.
- Count successful OCPP CALLRESULT responses as application activity without falsely refreshing `heartbeatAlive`.
- Use an activity window of at least 90 seconds and never shorter than the configured Heartbeat tolerance.
- Derive deterministic charging-profile and schedule IDs from station, control function and connector/station scope.
- Raise the default minimum interval between charging-profile changes to five seconds.
- Keep the last safe charging profile for a zero EOS limit by default and clamp sub-minimum requests to at least 6 A.
- Prevent active telemetry requests from running in parallel with pending smart-charging commands.
- Keep OCPP 1.6 concurrent transactions assigned to their original connector without recreating disabled connector folders.
- Add dependency-free tests for compact mappings, vendor typos, unit inference, current aggregation, optional connector folders and ordered status handling.

## 0.3.0 (2026-08-12)

- Rename the visible adapter to **NexoWatt OCPP** while retaining the compatible technical ID `ocpp21`.
- Add EOS freshness watchdog and health datapoints for socket, heartbeat, online state, meter age, data quality and stale reason.
- Refresh unchanged values on every real OCPP message and periodically republish still-valid cached states per datapoint.
- Rotate large datapoint sets and multi-connector refresh requests fairly so entries beyond a per-cycle limit are not starved.
- Add optional active `TriggerMessage` refresh for MeterValues and StatusNotification with support detection and backoff.
- Keep health processing non-blocking during slow active-refresh calls and correctly enforce the configured 5–120 second OCPP command timeout.
- Add safe zeroing on definite idle/ended states without masking stale active charging telemetry.
- Improve station identity sanitization, duplicate-session handling, command timeout/auditing and shutdown behavior.
- Process OCPP 1.6 StopTransaction transactionData and all OCPP 2.x TransactionEvent variants.
- Apply the SampledValue defaults consistently for OCPP 1.6, 2.0.1 and 2.1.
- Track general MeterValues, active-import power, export power, current and SoC freshness independently.
- Reset persisted online/fresh flags and realtime/session caches on restart or reconnect.
- Fail closed for unsupported generic actions and explicitly reject PKI workflows without a backend.

## 0.2.2 (2026-02-25)

- Derive total `Power.Active.Import` from per-phase values if the station does not provide a total.
- Add phase aliases for current/power with L1N/L2N/L3N notation.
- Mirror Device Model `ConnectedEV.StateOfCharge` into the SoC datapoint.

## 0.2.1 (2026-02-25)

- Add RFID capture and aliases.
- Mirror Wh energy datapoints into kWh helper datapoints.
- Extend aliases for energy, phases and transaction energy.

## 0.2.0 (2026-02-25)

- Add full OCPP payload capture and Device Model handling.
- Add key aliases and writable `control.numberOfPhases`.
- Add remote start/stop and smart-charging controls.

## 0.1.6 (2026-02-23)

- Add English/German documentation, translated admin configuration, tests and CI scaffold.

## 0.1.5 (2026-02-23)

- Add start/stop control wrappers and control response/error states.

## 0.1.4 (2025-10-26)

- Add SoC, full measurands, aggregate states and phase-count heuristic.
