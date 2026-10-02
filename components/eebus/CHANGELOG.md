# Changelog

## 0.3.0 (2026-08-05)

- Added versioned direct `ioBroker.eebus` -> `nexowatt-ui` §14a API; no manual CLS datapoint mapping is required in direct mode.
- Added IF_CLS_CTRL/LPC parsing for consumption limits, release, partial writes, heartbeat and failsafe configuration, including strictest-limit aggregation and production-limit rejection.
- Added an in-memory, event-driven command path that sends each time-critical control command exactly once and queues a 0 ms full EOS control cycle before diagnostic state writes. Genuine SPINE retransmissions remain idempotent through the stable command ID, including retransmissions arriving while the first ioBroker acceptance callback is still pending.
- Added direct in-memory EOS acceptance plus final protocol feedback: negative rejections are returned immediately, while a positive correlated SPINE ResultData is sent only after the complete EOS controller/write cycle; the effective LoadControl readback follows only on success.
- Added configurable end-to-end engineering targets of 250 ms for API acceptance, 1,000 ms from CLS receipt to the completed central control cycle, and 1,500 ms from CLS receipt to implementation feedback.
- Added heartbeat/validity supervision with fail-restrictive behavior: a configured failsafe never widens the last active limit, remains active for the transmitted duration and is then released locally without reusing the old SPINE acknowledgement correlation. Heartbeat recovery alone does not immediately release it; without a valid duration the restrictive field-test fallback remains active until a fresh explicit LPC write or release.
- Added bridge, CLS and per-device diagnostics plus automatic same-host `nexowatt-ui` instance discovery.
- Added parser, bridge, timing, duplicate-command and configuration regression tests.
- Kept field-test defaults conservative: trusted pairing is required, unknown peers are rejected and real CLS/SHIP/SPINE interoperability must still be validated on hardware.

## 0.2.2 (2026-07-31)

- Renamed the adapter display title to NexoWatt EOS EEBUS Adapter.
- Added automatic migration of legacy instance values: `model=EEBUS Adapter` becomes `EOS` and `deviceType=EnergyOperationSystem` becomes `EnergyManagementSystem`.
- Persisted corrected service identity values so existing installations display NexoWatt EOS consistently after restart.
- Fixed the local HEMS identity to brand `NexoWatt`, model `EOS`, device type `EnergyManagementSystem` and EEBUS category `2` in the admin page.
- Added a clear warning for the field-test IANA PEN placeholder `999999`.
- Added identity states for brand, model, category, IANA PEN and placeholder status.
- Added the German operating, pairing, read/write and troubleshooting guide `docs/ANWENDUNG_DE.md`.

## 0.2.1 (2026-07-31)

- Enabled JSONConfig internationalization with top-level `i18n: true` so the adapter admin settings follow the ioBroker admin/system language.
- Added complete German translations for all JSONConfig labels and help texts.
- Added Weblate-friendly translation files under `admin/i18n/de/translations.json` and `admin/i18n/en/translations.json` while keeping legacy `de.json`/`en.json` files for compatibility.

## 0.2.0 (2026-07-30)

- Added field-test SHIP session handling:
  - CMI frame exchange
  - Hello pending/ready handling
  - protocol handshake with JSON-UTF8
  - PIN state/input handling
  - SHIP data-exchange state tracking
- Added outgoing SHIP client connections to discovered `_ship._tcp` devices.
- Added incoming SHIP pairing state exposure for wallboxes that actively connect to NexoWatt EOS.
- Added pairing/trust workflow states, including per-device approve/reject buttons and global field-test auto-accept.
- Added SPINE data wrapper support for `ee1.0` payloads.
- Added SPINE NodeManagement detailed discovery read request after SHIP data exchange is ready.
- Added generic SPINE parser for feature/use-case extraction and basic measurement mapping.
- Added device-class detection for wallbox, CLS/control box, smart meter, grid connection, inverter, battery, heat pump, HVAC and climate devices.
- Added field-test command datagram generation for LoadControl, power limits, setpoint power and HVAC setpoints.
- Extended object model with `connection.*`, `useCases.*`, additional `measurements.*`, and richer `pairing.*` diagnostics.
- Kept write commands in dry-run mode by default; read-only NodeManagement discovery is sent when a SHIP data-exchange session exists.

## 0.1.2 (2026-07-30)

- Announce NexoWatt EOS as visible local HEMS / EnergyManagementSystem via mDNS.
- Enforce mDNS announcement in EnergyManagementSystem mode even when older native config contains `announceShipService=false`.
- Improve WebSocket setup for SHIP field tests.

## 0.1.1 (2026-07-30)

- Enable local SHIP mDNS announcement by default.
- Correct TXT `ecc=false` for the current secp256r1-only identity.

## 0.1.0 (2026-07-30)

- Initial NexoWatt EEBUS adapter scaffold.
