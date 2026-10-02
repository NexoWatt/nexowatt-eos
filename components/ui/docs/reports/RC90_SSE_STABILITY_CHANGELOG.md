# RC90 SSE stability fix

- Fixes the backpressure-resync callback so it uses the exported public snapshot builder instead of a startServer-local symbol.
- Prevents `resync-error` reconnect loops by returning a bounded fallback snapshot on serialization or initialization errors.
- Coalesces only the immediate initial-write/drain-resync pair with a 250 ms cache; it is not a long-lived data cache.
- Adds rate-limited diagnostics and explicit comments at the scope/lifetime boundary.
- Does not change NVP, charging, storage, tariff, PV, §14a or hardware-setpoint decisions.
