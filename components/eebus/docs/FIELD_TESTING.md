# NexoWatt EEBUS field testing

This document describes the first real-device test flow for `iobroker.eebus` version `0.2.2`.

## 1. Preconditions

- NexoWatt EOS and the EEBUS device are in the same LAN/VLAN.
- mDNS/DNS-SD is not blocked.
- UDP 5353 works in the local network.
- TCP 4712 is reachable on the EOS host.
- The adapter instance is running.
- `serviceName` is `NexoWatt EOS`.
- `deviceType` is `EnergyManagementSystem`.
- `model` is `EOS` and device category is `2`.

## 2. Discovery check

On the EOS system:

```bash
avahi-browse -rt _ship._tcp
```

Expected:

```text
NexoWatt EOS._ship._tcp.local
```

The TXT record should include at least:

```text
id=<local SHIP ID>
path=/ship/
ski=<local SKI>
register=true
brand=NexoWatt
model=EOS
type=EnergyManagementSystem
```

## 3. Pairing flow

1. Start the adapter.
2. Start EEBUS/HEMS pairing on the remote device.
3. The remote device should show `NexoWatt EOS`.
4. Select `NexoWatt EOS` on the device.
5. Watch the ioBroker objects:

```text
eebus.0.devices.<deviceId>.pairing.pairingState
eebus.0.devices.<deviceId>.connection.shipState
eebus.0.devices.<deviceId>.raw.lastShipFrame
```

6. Approve the device:

```text
eebus.0.devices.<deviceId>.pairing.approve = true
```

or:

```text
eebus.0.devices.<deviceId>.pairing.trusted = true
```

7. Expected final state:

```text
eebus.0.devices.<deviceId>.connection.dataExchangeReady = true
eebus.0.devices.<deviceId>.pairing.pairingState = paired-data-exchange
```

## 4. SPINE discovery

When data exchange becomes ready, the adapter sends a read-only NodeManagement detailed discovery request.

Check:

```text
eebus.0.devices.<deviceId>.raw.lastCommand
eebus.0.devices.<deviceId>.raw.lastSpineFrame
eebus.0.devices.<deviceId>.useCases.*
eebus.0.devices.<deviceId>.info.deviceClass
```

Expected device classes include:

```text
wallbox
clsBox
smartMeter
gridConnection
inverter
battery
heatPump
hvac
climate
unknown
```

## 5. Write-command safety

Write commands remain blocked unless:

```text
pairing.trusted = true
```

and one of these is true:

```text
allowCommandsToUntrustedDevices = true
```

or the device is trusted.

Additionally, `commandDryRun` is enabled by default. While it is enabled, write commands only create `raw.lastCommand`; they are not sent.

## 6. Logs to capture

For every real-device test, save:

- ioBroker log from adapter start until pairing result
- mDNS output from `avahi-browse -rt _ship._tcp`
- `devices.<deviceId>.raw.discovery`
- `devices.<deviceId>.raw.lastShipFrame`
- `devices.<deviceId>.raw.lastSpineFrame`
- `devices.<deviceId>.raw.lastCommand`
- Remote device screen/error message

These logs are required to validate or adjust vendor-specific SPINE feature addressing, limit IDs and selectors.
