# Sungrow direction/timing fix 0.5.133

- Sungrow Residential Hybrid V1.1.11 control now prefers one FC16 block over documentation registers 13050..13052 (protocol address 13049, length 3): EMS mode 3 + charge/discharge command + power.
- `aliases.ctrl.chargePowerW` and `aliases.ctrl.dischargePowerW` use the dedicated virtual charge/discharge writepoints when the template exposes them, while `aliases.ctrl.powerSetpointW` remains the signed setpoint mirror.
- Automatic wide-power helper writes to register 33148 are disabled by default for normal residential setpoints; register 13052 in W is sufficient below 65 kW and avoids an extra firmware-dependent write.
- Delayed post-write repeats are no longer needed for Sungrow hybrid setpoints; External EMS heartbeat remains the watchdog.
- Fast polling is reduced and compact read grouping is enabled; write commands are not kept behind a 1 Hz write queue.
- Adapter-side Modbus pacing for this profile is reduced to improve EMS responsiveness. If a specific WiNet/RS485 path becomes unstable, raise `minCommandIntervalMs` again in the profile/device config.
