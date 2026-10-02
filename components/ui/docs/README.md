# NexoWatt EOS

NexoWatt EOS is the local platform for energy, charging and building control, including the responsive customer cockpit and installer workspace.

**Current stable release:** `1.0.21` (2026-09-25)

It provides live energy-flow visualization, historical analysis, SmartHome visualization, installer-controlled EMS applications, and selected customer controls for desktop, tablet, and smartphone use.

## Documentation

All Markdown documentation is collected under `docs/`.

- [Release 1.0.21: Nulleinspeisung, Wechselrichter-Zuordnung und SmartHome-Rechte](STABLE_1_0_21_RELEASE_DE.md)
- [Nulleinspeisung Schritt für Schritt einrichten](NULL_EINSPEISUNG_EINRICHTUNG_DE.md)
- [Release 1.0.20: Speicherunterstützung und erlaubter Netzbezug bei Nulleinspeisung](STABLE_1_0_20_RELEASE_DE.md)
- [Release 1.0.19: Netzanteil je Ladepunkt, Auto und PV](STABLE_1_0_19_RELEASE_DE.md)
- [Release 1.0.18: PV-Taktschutz und damalige Boost-Grenze](STABLE_1_0_18_RELEASE_DE.md)
- [Release 1.0.17: Gemeinsame PV-Strategie bei Nulleinspeisung](STABLE_1_0_17_RELEASE_DE.md)
- [Nulleinspeisung: Voraussetzungen und Inbetriebnahme](NULL_EINSPEISUNG_PV_STRATEGIE_DE.md)
- [Release 1.0.16: Microgrid als gemeinsame EMS-App](STABLE_1_0_16_RELEASE_DE.md)
- [Release 1.0.15: Transformer limits, meter archives and billing drafts](STABLE_1_0_15_RELEASE_DE.md)
- [Microgrid setup and safety contract](MICROGRID_MASTER_SLAVE_DE.md)
- [Release 1.0.13: SmartHome setup permissions and logo correction](STABLE_1_0_13_RELEASE_DE.md)
- [Release 1.0.12: reliable ZIP updates and publishing](STABLE_1_0_12_RELEASE_DE.md)
- [Quellcode verstehen – deutscher Wegweiser](QUELLCODE_WEGWEISER_DE.md)
- [Funktions- und Dateiverknüpfungen](QUELLCODE_VERKNUEPFUNGEN_DE.md)
- [Verbindlicher Dokumentationsstandard](DOKUMENTATIONSSTANDARD_DE.md)
- [Changelog](CHANGELOG.md)
- [Contribution guidelines](CONTRIBUTING.md)
- [Repository guidelines](AGENTS.md)
- [GitHub upload](GITHUB_UPLOAD.md)
- [TypeScript development](development/TYPESCRIPT_README.md)
- [Historical validation reports](reports/)

## Main features

- **LIVE dashboard** with PV, grid, storage, building load, weather, KPIs, quick actions, and AI advisor cards.
- **History and reports** for energy flows, storage, grid import/export, tariff costs, EVCS reports, and yearly reports.
- **SmartHome visualization and Installer/Admin setup** with rooms, devices, favorites, and responsive mobile navigation.
- **Admin-only SMTP and license management**, including direct page and API access.
- **Storage farm licenses:** Home includes up to 2 configured storage systems; Pro supports up to 10.
- **Installer App-Center** for datapoint mapping, EMS apps, heating rod control, storage farm setup, EVCS/charging management, tariff logic, and diagnostics.
- **Responsive frontend** for desktop, tablet, and smartphone.

## Technical platform compatibility

NexoWatt EOS runs locally as an adapter on the ioBroker platform and is prepared for Node.js 22+. The platform identifier remains technical; all customer-visible product branding uses NexoWatt EOS.

Recommended runtime baseline:

- Node.js: `>=22`
- js-controller: `>=6.0.11`
- Admin: `>=7.0.0`

Before publishing or submitting the adapter, run:

```bash
npm run publish:check
npm run test:package
```

For repository submission, additionally run the official ioBroker Adapter Checker and fix any reported findings.

## Configuration

The basic HTTP port and IP binding are configured through the underlying platform administration.

EMS datapoint mapping and installer-specific configuration are handled inside the protected NexoWatt EOS App-Center.

## License

This repository is proprietary and not open source.

Copyright (c) 2025–2026 NexoWatt. All rights reserved.

Use, copying, modification, distribution, hosting, or sublicensing is not permitted without explicit written permission from NexoWatt.

See [LICENSE](../LICENSE) for details.

## Netzbetreiber-Schnittstelle

NexoWatt EOS enthält eine vorbereitete, standardmäßig deaktivierte und read-only Schnittstellen-App für zertifizierte EZA-/Parkregler. Herstellerspezifische Register werden ausschließlich über versionierte Treiberprofile ergänzt; der EOS-Core arbeitet mit einem kanonischen Datenmodell. Die operative Übergabe an Assets bleibt bis zur Hersteller- und Projektabnahme gesperrt.
