# NexoWatt Devices 0.5.143 - ABL eMH1 PWM current control

## Root cause

The ABL eMH1 EVCC2/3 Modbus-ASCII interface does not accept a charging-current value in amperes at register `0x0014`. The register expects the IEC 61851 control-pilot duty cycle in percent multiplied by ten.

The prior NexoWatt alias already converted amperes for `aliases.ctrl.currentLimitA`, but the control contract was incomplete:

- normal pause/resume used the service-state register `0x0005` (`mODIFY_STATE`),
- the conversion rounded 10 A to 16.7 percent although the ABL example specifies 16.6 percent,
- 100 percent was not used consistently as the normal waiting command,
- there was no explicit waiting/release feedback alias,
- direct invalid PWM values could reach the raw write datapoint.

## Vendor contract implemented

Native write datapoint:

```text
nexowatt-devices.0.devices.<device>.sET_ICMAX_DUTY_CYCLE_PCT
```

Protocol mapping:

```text
Unit ID:        configured outlet ID, normally 1
Function:       0x10 / FC16
Register:       0x0014
Length:         1 x 16 bit
Engineering:    PWM duty cycle in percent
Raw register:   percent x 10
Allowed raw DP: 8.0 .. 100.0 percent
```

Normal current ranges:

```text
6 A <= I <= 51 A:   duty = I / 0.6
51 A < I <= 80 A:   duty = I / 2.5 + 64
100 percent:         no current available / wait
```

NexoWatt truncates the duty cycle to 0.1 percent instead of rounding upward. The commanded current limit therefore never exceeds the requested EMS current.

Examples:

| EOS command | PWM command | Raw register |
|---:|---:|---:|
| 0 A | 100.0 % | 1000 / `0x03E8` |
| 6 A | 10.0 % | 100 / `0x0064` |
| 10 A | 16.6 % | 166 / `0x00A6` |
| 16 A | 26.6 % | 266 / `0x010A` |
| 32 A | 53.3 % | 533 / `0x0215` |
| 51 A | 85.0 % | 850 / `0x0352` |
| 80 A | 96.0 % | 960 / `0x03C0` |

Any requested current below 6 A is converted to 100 percent and therefore waits instead of accidentally releasing the 6-A minimum current.

## Alias contract

### Primary EOS current command

```text
aliases.ctrl.currentLimitA
```

The EOS writes amperes. The adapter converts the value to PWM percent and writes `sET_ICMAX_DUTY_CYCLE_PCT`.

### Direct PWM command

```text
aliases.ctrl.currentLimitPct
```

This is an expert/direct alias. It permits normal analogue duty cycles from 10 to 96 percent and 100 percent for waiting. Reserved gaps are normalized to 100 percent.

### Pause/resume

```text
aliases.ctrl.run
aliases.ctrl.chargeEnable
```

Both aliases now use Icmax:

```text
false -> 100 percent -> wait / no current available
true  -> restore the last active 10..96 percent command
```

If no active value is known after a restart, resume uses the safe minimum of 10 percent, corresponding to 6 A.

Register `0x0005` remains available as `mODIFY_STATE`, but it is explicitly marked as an expert/service state-transition command. It is no longer used for normal EMS pause/resume.

### Feedback

```text
aliases.r.currentLimitPct       actual PWM duty-cycle feedback
aliases.r.currentLimitA         PWM feedback converted to amperes
aliases.r.waitingForCurrent     true at 100 percent
aliases.r.chargingReleased      true for an active 10..96 percent duty cycle
```

## Exact Modbus-ASCII frames verified

ABL vendor example, 10 A = 16.6 percent:

```text
:0110001400010200A632\r\n
```

NexoWatt wait command, 100 percent:

```text
:0110001400010203E8ED\r\n
```

## Compatibility

The 0.5.141 live-current alias correction and the 0.5.142 exact ABL read groups remain unchanged. No other manufacturer template uses this ABL-specific conversion path.
