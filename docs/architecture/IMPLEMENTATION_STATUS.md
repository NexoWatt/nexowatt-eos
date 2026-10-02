> Dev8-Ergänzung vom 02.10.2026: Gehärteter PostgreSQL-Store und separater
> mTLS-Erweiterungskanal; Details, Prüfgrenzen und offene Isolation unter
> `docs/security/ADAPTER_CHANNEL_DEV8_DE.md`. Vorhandene Testinstaller sind unverändert.

# EOS-System: erster Architektur- und Werkzeugstand

**Aktueller integrierter Entwicklungsstand `0.2.0-dev.1`:**
[Architektur](INTEGRATED_SYSTEM.md), [Prüfbericht](../security/INTEGRATED_REPORT_DE.md)
und [Einrichtung](../operations/INTEGRATED_UI_LAB_DE.md). Die folgenden Abschnitte
bleiben die historische Dokumentation der ersten Etappen.

**Fortschreibung 01.10.2026:** Der nachfolgende Text bleibt der historische
Architekturstand. Inzwischen wurde ein ausführbarer Controller-Testkern mit
TLS-1.3-Datenbanken, gesperrtem Bootstrap, Controllerprofil, signierten
Offline-Paketen und systemd-Installations-/Startwerkzeugen ergänzt.
Aktueller Umfang und geprüfte Grenzen:
[`TEST_BASE_REPORT_DE.md`](../security/TEST_BASE_REPORT_DE.md) und
[`TEST_BASE_QUICKSTART_DE.md`](../operations/TEST_BASE_QUICKSTART_DE.md).
Die Gesamtarchitekturdatei `system/product-plan.json` beschreibt weiterhin das
vollständige Zielprodukt; ihre offenen Gesamtprodukt-Gates werden durch diese
Core-Etappe nicht pauschal geschlossen.

Stand: 30.09.2026; Revision `2026-09-30.1`. Ausgangspunkt ist der lokale Installer-Härtungskandidat `1e6d0377d2cb184714f0d7f6f03066a2c1a150ac`. Dieser Stand ist eine Entwicklungsetappe und keine installierbare Gesamtsystemfreigabe.

Fortschreibung: Dieser Abschnitt dokumentiert die erste Etappe. Die Revision `2026-09-30.2` ergänzt externe Komponentenquellen einschließlich js-controller, Adapter-Core und Admin 7 sowie das RPi-5-Profil. Revision `2026-09-30.3` ergänzt das vom Nutzer gelieferte UI-Archiv 1.0.21, dessen Funktionsbaseline, sechs offene UI-Befunde und die getrennte Archivherkunft im Komponenten-SBOM-Generator. Aktueller Integrations-/Befundstand: [`SOURCE_BASELINE.md`](../integration/SOURCE_BASELINE.md). Die dortigen Quellenbeobachtungen ersetzen keinen installierten Gerätebestand.

## Änderung und Wirkung

Die Architektur beschreibt zwölf Module mit eigenen Aufgaben und künftigen Sicherheitsgrenzen. `system/product-plan.json` enthält sichere Zielvorgaben, Bestandserhalt und offene Freigabegates. Die drei JSON-Schemas begrenzen Dienstaufträge, Berechtigungsantworten und Update-Manifeste. Lokale Python-Werkzeuge prüfen Verträge, Referenzen und eine unvollständige CycloneDX-1.7-Quell-SBOM. Sie starten keine EOS-Dienste und ändern keine Hostkonfiguration. SBOM-Ausgaben werden ausschließlich an ausdrücklich angegebene neue Dateien geschrieben.

UI, Navigation, bestehende Datenpunkte, Einheiten, Konfiguration und Regelverhalten müssen erhalten bleiben. Die dafür notwendigen Referenztests sind noch zu erheben. Im verfügbaren Repository fehlen die vollständigen aktuellen EOS-Adapterquellen; Admin 7 bleibt laut Nutzer die Ausgangsbasis. Die bereits vorhandenen Installer-Härtungsdateien werden in dieser Etappe nicht verändert.

## Entwicklung und lokale Prüfung

Die nach Hash und Version gebundenen Entwicklungsabhängigkeiten gelten bewusst für **CPython 3.12 auf Linux x86-64**. Sie sind keine Produktlaufzeitabhängigkeiten und keine Freigabe für andere Hardwareprofile. Für eine andere Entwicklungsplattform müssen passende Artefakte geprüft und ihre Hashes ergänzt werden. Die Installation akzeptiert nur Wheels; keine Paket-Buildskripte werden ausgeführt. Hashbindung belegt Integrität zur geprüften Datei, nicht Schwachstellenfreiheit.

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes --only-binary=:all: --no-deps \
  -r tools/architecture/requirements-linux-x86_64-py312.txt
.venv/bin/python -m pip check
export PYTHONDONTWRITEBYTECODE=1
for test_script in tests/architecture/*.test.py; do
  .venv/bin/python "$test_script"
done
.venv/bin/python tools/architecture/check-blueprint.py
.venv/bin/python tools/architecture/validate-contracts.py --examples
.venv/bin/python tools/sbom/source_sbom.py --validate sbom/eos-installer-source.cdx.json
```

Die GitHub-CI enthält dieselben Architekturprüfungen in einem eigenen Job ohne Rootrechte. Der Workflow wurde lokal vorbereitet; ein erfolgreicher GitHub-Lauf wird erst nach tatsächlicher Ausführung nachgetragen. Lokale Rohbelege und Quellhashes stehen unter `reports/architecture/`.

## Verbindliche Entwicklungsregeln

- Zu jeder neuen Komponente oder Funktion werden Bedrohungen, betroffene Schnittstellen, positive und negative Tests sowie verbleibende Risiken im selben Stand dokumentiert. Tests belegen tatsächliches Verhalten; geplante Tests bleiben als geplant markiert.
- Kommentare erklären Sicherheitsannahmen und Grenzen. Typisierte, begrenzte Verträge werden serverseitig geprüft. Authentifizierung, Autorisierung und replaygeschützte Ausführung sind zusätzlich erforderlich.
- Neue native sicherheitskritische Dienste bevorzugen speichersichere Ansätze. Vorhandene Node.js-/TypeScript-Funktionen werden kompatibel integriert; native Abhängigkeiten werden separat bewertet.
- Versionen, Quellstände, Abhängigkeiten, Hashes und Lizenzpflichten werden je Lieferstand erfasst. Die derzeitige Quell-SBOM ist ausdrücklich unvollständig. Vollständige SBOMs müssen aus tatsächlichen Builds entstehen.
- Erfüllung einer einzelnen technischen Vorgabe ist keine CRA-/IEC-Konformität. Produktabgrenzung, Lebenszyklusprozesse und konkrete Nachweise bleiben Bestandteil der Freigabe.

## Bedrohungsanalyse des Architekturprüfers und der CI

| STRIDE | Risiko | Maßnahme dieses Stands / Grenze |
|---|---|---|
| Spoofing | Entwurfsdaten geben einen geprüften Produktstand vor | Prüfer akzeptiert nur diesen offenen Entwurfsstatus; keine kryptografische Echtheitsbestätigung der Dokumente. |
| Tampering | Ungültige Verweise oder widersprüchliche Sicherheitsangaben | Begrenzter Parser, Referenz- und Statusprüfungen sowie Negativtests. Kein vollständiger semantischer Beweis aller Freitexte. |
| Repudiation | Ergebnis lässt sich keinem Stand zuordnen | Befehle, Zeiten, Rohbelege und Datei-Hashes im Prüfbericht; keine unabhängige Signatur dieses Berichts. |
| Information Disclosure | Eingabewerte gelangen in Fehlermeldungen | Feste Diagnosecodes; keine Lizenz-, Schlüssel- oder Kundendaten in Beispielen. |
| Denial of Service | Unbegrenzte oder blockierende Eingabedateien | Begrenzte reguläre Dateien; CI-Zeitlimit. Keine Lastprüfung eines EOS-Netzwerkdiensts. |
| Elevation of Privilege | Pull-Request-Code oder Paketinstallation erhält Hostrechte | Eigener CI-Job ohne Root, `contents: read`, Checkout ohne gespeicherte Credentials, versionierte Action, Wheels mit Hashbindung. PR-Code bleibt ausführbarer Code innerhalb des isolierten CI-Jobs. |

Die detaillierten Werkzeuganalysen stehen in `INTERFACE_CONTRACTS.md` und `../security/SBOM_PIPELINE.md`. Die Systembedrohungen stehen getrennt in `../security/THREAT_MODEL_SYSTEM.md`.

## Nächste Integration

1. Vollständige freigegebene Quellen und Versionen für Core, Admin, UI, Devices, Backitup, EEBUS und unterstützte Drittadapter aufnehmen; Hardwareprofile festlegen.
2. Visuelle, API-, Datenpunkt- und Regelreferenzen erfassen; Lizenzpflichten und Systemumfang klären.
3. Geschützte Ersteinrichtung, lokale Identitäts-/Lizenzprüfung und Schlüsselverwaltung auf isoliertem Testsystem umsetzen.
4. Kommunikationsgrenzen, getrennte Rechte und Adapterzugriffe einzeln integrieren; vorhandenes Verhalten sowie Replay, Ausfall, Neustart und Ressourcenlimits prüfen.
5. Signierte Lieferung, Migration, Backup/Restore, Stromverlust und Recovery auf Zielhardware nachweisen; vollständige Build-SBOM und releasebezogene CRA-Unterlagen erstellen.

Bis dahin bleiben Produktionsfreigabe, Laufzeitverschlüsselung, echte Adapterisolation, vollständiger Funktionserhalt und Hardware-/IEC-Nachweise offen.
