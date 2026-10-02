# Testbericht – NexoWatt EOS EEBUS Adapter 0.3.0

**Stand:** 05.08.2026  
**Prüfumfang:** Direkte §14a-/CLS-Anbindung an NexoWatt EOS, IF_CLS_CTRL/LPC-Parser, Heartbeat/Failsafe, korrelierte SPINE-Rückmeldung und Paketstruktur.

## Erfolgreich geprüft

- TypeScript-Kompilierung mit `tsc -p tsconfig.json`
- Konfigurationsmigration und Standardwerte
- Parsing aktiver LPC-Verbrauchsgrenzen und Freigaben
- `write` und `writePartial`, einschließlich Wertübernahme aus dem letzten bestätigten Befehl
- Auswahl der strengsten gleichzeitig aktiven Verbrauchsgrenze
- Trennung von Verbrauchs- und Erzeugungsgrenzen
- Heartbeat- und Failsafe-Konfiguration
- Vertrauensprüfung vor jeder wirksamen CLS-Zustandsänderung
- Direkte, versionierte Adapter-API zu `nexowatt-ui`
- Automatische Erkennung einer geeigneten NexoWatt-UI-Instanz auf demselben Host
- Genau-einmal-Versand eines zeitkritischen internen Regelbefehls ohne Transport-Retry
- Idempotenz abgeschlossener und noch in Bearbeitung befindlicher SPINE-Wiederholungen über die stabile Command-ID
- Abschließende positive SPINE-ResultData erst nach dem vollständigen EOS-Regel-/Schreibzyklus
- Negative SPINE-ResultData bei Ablehnung, Fehler, Degradierung, Timeout oder Ablösung durch einen neueren Befehl
- Effektiver LoadControl-Readback nur nach erfolgreicher Umsetzung
- Fail-restriktive Heartbeat-/Failsafe-Logik: Ein Kommunikationsfehler erweitert die zulässige Leistung nicht
- Ablauf einer übertragenen Failsafe-Dauer mit genau einer lokalen Freigabe über den direkten EOS-Regelpfad
- Lokale Failsafe-/Gültigkeits-Folgetransaktionen verwenden keine veraltete SPINE-Quittung des ursprünglichen Schreibbefehls
- Paket-Metadaten, JSON-Dateien, Konfliktmarker und `npm pack --dry-run`

## Ausgeführte Funktionstests

```text
npm run build
npm run test:config
npm run test:cls-control
npm run test:nexowatt-bridge
npm run test:implementation-result-order
```

Zusätzlich wurde ein adapterübergreifender Test für folgende Kette ausgeführt:

```text
EEBUS-LPC -> direkte EOS-Annahme -> sofortiger EMS-Zyklus
-> vollständige Umsetzungsrückmeldung -> korrelierte SPINE-ResultData
```

## Paketprüfung

`npm pack --dry-run --json` erzeugt für Version 0.3.0 ein gültiges Paket mit den kompilierten Dateien unter `build/`, Admin-Konfiguration, Übersetzungen und Dokumentation.

## Einschränkungen der lokalen Testumgebung

Der ioBroker-Pakettest `test/package.js` konnte in dieser Arbeitsumgebung nicht ausgeführt werden, weil das Dev-Paket `@iobroker/testing` nicht installiert war. Die Nachinstallation der Dev-Abhängigkeiten war nicht möglich, da die in der Umgebung konfigurierte interne npm-Registry benötigte Pakete nicht bereitstellte. Aus demselben Grund wurde der ESLint-Lauf nicht als bestanden gewertet.

Die TypeScript-Kompilierung und die fachlichen Parser-, Bridge-, Timing-, Idempotenz- und Rückmeldetests sind vollständig durchgelaufen.

## Vor Feldfreigabe erforderlich

- Pairing und Datenaustausch mit der konkret eingesetzten CLS-/Steuerbox
- Prüfung der real übertragenen SPINE-Adressierung, Limit-IDs und ResultData-Korrelation
- Messung der Reaktionszeiten unter realer Controllerlast
- Test von aktivem Limit, Freigabe, Wiederholung, Heartbeat-Ausfall, Failsafe und einem absichtlich fehlschlagenden Geräte-Schreibpfad
- Gestaffelter Rollout zunächst auf einer ausgewählten Feldtestanlage

Die Software-Rückmeldung bestätigt den abgeschlossenen EOS-Regel- und Schreibpfad. Sie stellt keine unabhängige messtechnische Bestätigung der elektrischen Geräteleistung dar.
