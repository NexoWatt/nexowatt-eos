# Sungrow Residential Hybrid – Fast Feedback Fix

This field-test fix addresses delayed and one-command-behind storage feedback during fast NVP control.

## Root cause

The Sungrow template used the command-cadence scheduler. A due fast poll can contain several Modbus read groups. Once that poll started, the runtime awaited the complete poll before flushing a newly queued storage command. Conversely, a continuous stream of storage writes could postpone the next full feedback poll. The result was stale `bATTERY_POWER` feedback and unnecessary corrective steps in the higher-level controller.

There is no 500 W quantisation in the Sungrow Modbus writer. Setpoints are rounded only to whole watts. A valid `0 W` command remains `0 W`.

## Changes

- Sungrow storage writes use the independent throttled write loop instead of waiting for the full-poll cadence loop.
- Wire-level Modbus spacing remains at least 1000 ms for Sungrow/WiNet compatibility.
- After a successful write to `sET_ACTIVE_POWER`, `sET_CHARGE_POWER`, or `sET_DISCHARGE_POWER`, the adapter starts a priority read of `bATTERY_POWER`.
- While EMS commands are active, battery feedback is refreshed approximately every 1.25 s.
- The priority read uses the existing serialized Modbus IO queue, so it can be interleaved safely between normal read groups without parallel access to the inverter.
- Native battery power and `aliases.r.power`, `aliases.r.powerCharge`, and `aliases.r.powerDischarge` are updated immediately from the priority read.
- The priority loop stops adding traffic after 30 s without a storage command.

## Expected result

- New storage commands should reach the inverter after at most the current Modbus operation instead of after a complete multi-group poll.
- Battery response should become visible approximately 1–3 s after the command, depending on inverter and WiNet latency.
- The higher-level NVP controller should no longer keep correcting against an old battery value.
- Arbitrary watt values such as 731 W, 2733 W, and 3407 W remain unchanged; there is no 500 W step rounding.

## Field verification

Use only one control path, preferably:

- `aliases.ctrl.powerSetpointW`

Observe:

- `bATTERY_POWER`
- `aliases.r.power`
- `aliases.r.powerCharge`
- `aliases.r.powerDischarge`

The adapter logs one startup line containing `Sungrow fast feedback active` when the patch is enabled.
