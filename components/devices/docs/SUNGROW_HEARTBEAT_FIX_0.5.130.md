# Sungrow ESS Heartbeat Fix 0.5.130

This build fixes Sungrow ESS control stability when `ExternalEMSHeartbeat` was written with a monotonically increasing counter.

## Changed

- `ExternalEMSHeartbeat` / `ExternalVPPHeartbeat` is now written as fixed `20` seconds.
- Heartbeat writes are throttled with `heartbeatMinIntervalMs = 8000`, so the adapter does not burst-write the heartbeat during setpoint keepalive/retry cycles.
- Optional Sungrow helper writes no longer abort the primary battery power command on Modbus protocol exceptions such as exception 4. Real transport errors still remain fatal.
- FC16 Sungrow control-block rejection now falls back to individual mode/power/command writes for better compatibility.
- Heartbeat write sources are constrained to `0..1000` seconds and rounded to integer seconds.

## Expected log change

The old warning pattern looked like this:

```text
Write ExternalEMSHeartbeat UID1 FC6@13079 ... value=16277 failed: Modbus exception 4
```

After this fix the adapter writes value `20` instead of the invalid counter value.
