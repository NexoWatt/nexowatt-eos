# Sungrow Residential Hybrid Protocol V1.1.11 Fix (0.5.131)

This build updates the Sungrow Residential Hybrid inverter template to the supplied V1.1.11 protocol document.

Implemented changes:

- Keep existing template id `ess.sungrow.ResidentialHybridV119` for compatibility, but expose V1.1.11 in name/model/notes.
- Use zero-based Modbus protocol addresses (`documentation register - 1`).
- Keep U32/S32 little-word-endian handling.
- Switch signed battery setpoint helper to External EMS mode (`13050 = 3`).
- Write `13051` command (`0xAA` charge, `0xBB` discharge, `0xCC` stop) and `13052` power in W.
- Keep `13080` External EMS heartbeat fixed at `20` and refresh it at a safe cadence.
- Add `PVPowerLimitation` (`13018` document / `13017` protocol address).
- Add state mappings for Sungrow hybrid device type codes including MG8RL and MG10RL.
- Reduce fast polling of RW settings to avoid stressing WiNet/Logger forwarding.
