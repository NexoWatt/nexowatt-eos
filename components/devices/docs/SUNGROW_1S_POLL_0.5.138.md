# Sungrow Residential Hybrid 1-second polling – 0.5.138

This field-test build changes only the Sungrow Residential Hybrid control telemetry cadence.

## Effective polling behavior

- Fast control target: 1000 ms start-to-start.
- Fast register groups: four Modbus TCP requests per control snapshot.
- TCP minimum request gap: 200 ms.
- If a cycle takes longer than 1000 ms due to WiNet/LAN latency, the next cycle starts as soon as the serialized Modbus queue is free; polls never overlap.
- Battery power is additionally read once immediately after a successful EMS setpoint write.

## Fast datapoints

- sYSTEM_STATE
- pOWER_FLOW_STATUS
- pV_POWER
- gRID_POWER
- lOAD_POWER
- bATTERY_POWER
- sOC
- bATTERY_VOLTAGE
- bATTERY_TEMPERATURE
- aCTIVE_POWER

## Direction safety

The proven 0.5.133 mapping is unchanged:

- positive aliases.ctrl.powerSetpointW = discharge
- negative aliases.ctrl.powerSetpointW = charge
- 0 W = stop
- Sungrow command 0xAA / 170 = charge
- Sungrow command 0xBB / 187 = discharge
- Sungrow command 0xCC / 204 = stop
