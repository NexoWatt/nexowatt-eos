# Isolierte Befundreproduktionen

Diese Skripte prüfen eng begrenzte Ausschnitte der in `system/components/source-inventory.json` genannten Quellen. Sie bestätigen auch unerwünschtes Verhalten. Ein grünes Ergebnis ist deshalb **keine Sicherheitsabnahme**. Quellversionen und Skript-/Loghashes sind im Integrationsbericht gebunden. Kein Skript gehört auf ein Kunden-/Produktivgerät oder einen privilegierten Runner.

Voraussetzung: die jeweiligen unveränderten Quellstände außerhalb dieses Repositories und Node.js 24, in diesem Lauf 24.19.0. EEBUS nutzt kontrollierte TypeScript-Transformation in einem VM-Loader mit Stubs; Backup nutzt Node-Type-Stripping. Diese Testumgebung ist keine Aussage zur freigegebenen EOS-Node-Version. Vor Ausführung fremder Quellstände müssen Imports und Testgrenzen erneut geprüft werden.

```bash
EOS_ADMIN_SOURCE_DIR=/path/to/eos-admin \
  node --test --test-reporter=tap tests/integration/admin7-source-reproduction.test.cjs
EOS_DEVICES_SOURCE=/path/to/hash-verified-devices-files \
  node --test --test-reporter=tap tests/integration/devices-source-review.test.cjs
# Dieser Ordner enthält unveränderte Unterordner eebus/ und ocpp21/.
EOS_COMPONENT_SOURCES=/path/to/component-sources \
  node --test --test-reporter=tap reports/integration/reproductions/protocol-review/source-behavior.test.cjs
EOS_UI_SOURCE=/path/to/NexoWatt-ui-1.0.21-STABLE \
  node --test --test-reporter=tap tests/integration/ui-source-reproduction.test.cjs
BACKUP_SOURCE=/path/to/backitup \
  node --test --test-reporter=tap reports/integration/reproductions/backitup-review/reproduce.cjs
```

Die vorhandene OCPP-Core-Suite wurde separat direkt im geprüften OCPP-Repository ausgeführt; Rohbeleg `reproductions/protocol-review/ocpp-core.tap`. Sie ist kein Volladapter- oder Hardwaretest. Der bestehende Backup-Publish-Validator schlug wegen zweier fehlender Builddateien fehl; `reproductions/backitup-review/publish-validator.log` bleibt als fehlgeschlagener Nachweis erhalten. Der erste Backup-Reproduktionsversuch gegen die fehlende Builddatei ist ebenfalls archiviert, nicht in einen Erfolg umgedeutet.

Die Komponenten-Sources werden nicht automatisch heruntergeladen, installiert, gebaut oder gestartet. Absender-/Stations-/Zertifikatswerte im Test sind künstliche Fixtures. Netzwerklistener, reale TLS-Handshakes, Gerätebefehle, Rechteänderungen und Hostprozesse werden in den dokumentierten Reproduktionen nicht ausgeführt.

Die vier zusätzlich ausgeführten vorhandenen UI-Prüfskripte stehen mit Befehlen, UTC-Zeiten und Quellhashes in `ui-existing-tests.json`: drei synthetische Funktionsregressionen und eine Strukturprüfung. Sie ersetzen weder einen Browserlauf noch echte Controller-/Anlagenprüfungen. Der UI-Quellbaum blieb byteidentisch zum hochgeladenen Archiv.
