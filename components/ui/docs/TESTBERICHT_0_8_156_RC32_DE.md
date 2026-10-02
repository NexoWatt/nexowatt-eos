# Testbericht – NexoWatt UI 0.8.156 RC32

**Stand:** 05.08.2026  
**Prüfumfang:** Direkte EEBUS-/CLS-Anbindung des zentralen §14a-Reglers, sofortiger EMS-Zyklus, vollständige Regler-/Schreibpfad-Rückmeldung und bestehende Sicherheits-Arbiter.

## Erfolgreich geprüft

- Versionierte Adapter-API `nexowatt.para14a.*.v1`
- Handshake und Absenderprüfung für `eebus.N`
- Bereitschaftsprüfung für AppCenter, Lizenz, Länderprofil und EMS-Engine
- Befehlseingang im Arbeitsspeicher ohne manuelle CLS-Datenpunktzuordnung
- Vollständiger zentraler EMS-Zyklus mit 0 ms Zusatzverzögerung
- Vermeidung paralleler Regelzyklen; bei laufendem Zyklus wird ein sofortiger Folgetick vorgemerkt
- Eindeutige Command-ID, Duplikatbehandlung und Ablösung älterer Befehle
- §14a-Constraint vor Core-Limits und Verbraucherreglern
- Abschließende Rückmeldung nach dem vollständigen Modul-/Schreibzyklus
- Negative Rückmeldung bei Modulfehlern oder gemeldeten Verbraucher-Schreibfehlern
- Keine falsche Behauptung einer unabhängigen physischen beziehungsweise messtechnischen Umsetzung
- Bestehende Prioritäts-, Safety-, Authority- und Shadow-Arbiter
- Speicher-Topologie und Thermik-/Heizstab-Pfade
- TypeScript-Runtime-Quellen und JavaScript-Ausgaben synchron
- TypeScript-Runtime-Spiegel synchron
- JSON, Konfliktmarker, ausgewählte JavaScript-Syntax und Paketstruktur

## Erfolgreiche Regressionstests

```text
npm run test:para14a-eebus-direct-api
npm run test:module-lifecycle-para14a
npm run test:para14a-central-constraint
npm run test:core-budget-publication-object-contract
npm run test:actuator-shadow-arbiter
npm run test:actuator-authority-arbiter
npm run test:actuator-safety-arbiter
npm run test:actuator-c3-thermal-heating
npm run test:storage-topology-authority
npm run check:ts-nocheck-budget
npm run check:ts-source-syntax
npm run check:ts-runtime-executables
npm run check:ts-runtime-mirrors
npm run git:conflicts
node scripts/verify-publish.js
npm pack --dry-run --json
```

Zusätzlich wurde die komplette adapterübergreifende Befehlskette mit dem EEBUS-Adapter 0.3.0 simuliert.

## Überwachte Feldtest-Zielzeiten

```text
CLS-Eingang bis EOS-Annahme:                250 ms
CLS-Eingang bis vollständigem Regelzyklus: 1.000 ms
CLS-Eingang bis Umsetzungsrückmeldung:      1.500 ms
Umsetzungs-Watchdog:                        5.000 ms
```

Diese Werte sind konfigurierbare NexoWatt-Engineering-Ziele für Diagnose und Feldtest, keine pauschalen gesetzlichen Fristen.

## Einschränkung der lokalen Testumgebung

Ein vollständiges Neuinstallieren sämtlicher npm-Abhängigkeiten war in der Arbeitsumgebung nicht möglich, weil die konfigurierte interne Registry benötigte private beziehungsweise Dev-Pakete nicht bereitstellte. Die repository-eigenen Runtime-, Mirror-, Release-, Syntax-, Fach- und Paketprüfungen liefen erfolgreich.

## Vor Feldfreigabe erforderlich

- Installation zusammen mit `ioBroker.eebus` 0.3.0 auf einer ausgewählten Feldtestanlage
- Test mit einer realen CLS-/Steuerbox
- Prüfung aktiver Grenzwerte und Freigaben bei Ladepunkten, Speicher-Netzladung, Wärmepumpen und Klimageräten
- Erzwungener Schreibfehler eines Gerätes zur Kontrolle der negativen Rückmeldung
- Heartbeat-/Failsafe-Test
- Zeitmessung bei normaler und erhöhter Systemlast
- Gestaffelter Rollout nach erfolgreichem Feldtest
