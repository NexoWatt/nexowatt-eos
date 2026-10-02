# Weidmüller Charge Wallbox Business CH-W-B - 0.5.137

Implemented from the official networking guide `2759890000/00/03.2021` for:

- CH-W-B-A3.7/11-SPNM (`2743980000`)
- CH-W-B-A3.7/11-PPNM (`2743890000`)
- CH-W-B-A7.4/22-SPNM (`2744060000`)
- CH-W-B-A7.4/22-PPNM (`2744070000`)

## Connection

- Protocol: Modbus TCP
- Port: `502`
- Unit-ID / Modbus address: `255`
- Default IP without DHCP: `192.168.0.8`
- Wallbox DIP switch `DP10` must be enabled for Modbus TCP.

## Control

- Charging release: coil `400`
- Actual aggregate charging release: coil `436`
- Charging current setpoint: holding register `528`, raw value `A x 10`
- RFID reader enable: coil `419`

Stable aliases:

- `aliases.ctrl.run`
- `aliases.ctrl.chargeEnable`
- `aliases.ctrl.currentLimitA`
- `aliases.r.chargingReleased`
- `aliases.r.currentLimitA`
- `aliases.r.power`
- `aliases.r.energySession`
- `aliases.r.statusCode`
- `aliases.r.statusText`
- `aliases.r.vehicleConnected`
- `aliases.r.charging`

## Addressing and encoding

The template uses the addresses exactly as printed in the vendor guide and forces address offset `0`. Multi-register values use low 16-bit word first and normal Modbus byte order. The vendor-specific ASCII/RFID fields use a dedicated low-word-first decoder.

Network configuration registers are exposed read-only in this first implementation so an EMS cannot accidentally change the wallbox IP configuration.
