# ABL eMH1 EVCC2/3 Modbus-ASCII read-group fix – 0.5.142

## Field symptom

The adapter emitted this warning although the live current/status group continued to work:

```text
Optional Modbus read group failed and will be skipped temporarily:
UID1 FC3 1-3 (...): Modbus ASCII: timeout waiting for response (2000 ms)
trace=tx :010300010003F8
```

## Root cause

The generic Modbus grouping merged two contiguous but protocol-distinct EVCC2/3 commands:

- register `0x0001..0x0002`: device ID and firmware, exact request type **R2**
- register `0x0003`: Modbus settings, exact request type **R1**

This produced the unsupported request:

```text
:010300010003F8
```

ABL EVCC2/3 does not return a Modbus exception for an invalid read request; it remains silent. The adapter therefore reached its 2000 ms response timeout.

## Correct requests

Version 0.5.142 sends the two documented requests separately:

```text
:010300010002F9   # FC3, start 0x0001, quantity 2 (R2)
:010300030001F8   # FC3, start 0x0003, quantity 1 (R1)
```

The other EVCC2/3 protocol blocks remain atomic as well:

```text
0x0006..0x0007   # system flags, R2
0x002E..0x0032   # full current/status response, R5
```

## Implementation

The Modbus driver now supports an optional per-source `readRequestGroup`. Datapoints with different explicit request-group IDs are never merged, even when their addresses are directly adjacent. Untagged templates keep the previous generic grouping behaviour.

## Verification

Automated tests assert the exact driver calls:

```text
UID1 FC3 0x0001 length 2
UID1 FC3 0x0003 length 1
UID1 FC3 0x0006 length 2
UID1 FC3 0x002E length 5
```

The invalid `UID1 FC3 0x0001 length 3` request is explicitly rejected by the test suite.
