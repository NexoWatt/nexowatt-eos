# RC93 Validierungsbericht – NexoWatt UI 0.8.218

## Prüfumfang

RC93 setzt die letzte Stable-Anforderung für die Netzlimit-App um: Zertifizierte EZA-/Parkregler werden nach vollständiger Aktivierung, Inbetriebnahme und Installateurfreigabe als bevorzugte Einspeisegrenzquelle verwendet; ohne diese Freigabe regelt EOS selbst. Der vorhandene `GridConstraints Export Guard` bleibt der einzige produktive Asset-Writer. Zusätzlich wurde die Senkenreihenfolge auf lokale Lasten sowie freigegebene Ladepunkte und flexible Verbraucher vor Speicherladung und PV-Abregelung angeglichen.

## Sicherheitsinvarianten

- Die Netzbetreiber-/Parkregler-Schnittstelle bleibt gegenüber Regler und Assets read-only.
- Es existiert genau ein produktiver Sollwertschreiber für die Einspeisebegrenzung: `gridConstraints.exportGuard`.
- Externe Vorgaben können die lokal konfigurierte Sicherheitsobergrenze niemals anheben; wirksam ist stets der strengere Wert.
- Fehlende, leere, ungültige oder veraltete Vorgaben werden nie versehentlich als `0 W` interpretiert.
- Trip/Sperre beziehungsweise eine ausdrückliche `0-W`-Vorgabe bleiben echte Nulleinspeisung.
- Prozentvorgaben werden anhand der konfigurierten PV-Nennleistung eindeutig in Watt normalisiert.
- Reine Blindleistungs-/cos-phi-Vorgaben werden nicht als aktive Wirkleistungsgrenze dargestellt.
- TTL, Gültigkeit, Qualität, Quelle und vier klar definierte Rückfallarten werden ausgewertet.
- Die Entscheidungshistorie ist SHA-256-hashverkettet und damit manipulationsanzeigend; beim Wiederanlauf wird nur ein verifizierter Audit-Head übernommen.

## Geänderte Funktionsbereiche

1. `GridConstraints`: Führungsquellenentscheidung, lokale Obergrenze, TTL/Rückfall, Diagnose-States, Hash-Audit und Senkenpriorität.
2. `NetOperatorInterface`: standardisierter read-only Operations-Envelope, Watt-Normalisierung, Aktivierungs-Gates und korrekte operative Bindungsanzeige.
3. Netzlimit-/Netzbetreiber-UI: Installateurhinweise, Rückfallparameter, Quelle, Qualität, Gültigkeit und eindeutige Single-Writer-Darstellung.
4. Release-/Regressionstests: neuer RC93-Vertrag und Anpassung bestehender Export-Guard-, Inbetriebnahme- und UI-Verträge.

## Automatische Prüfungen

### Quellen, Runtimes und Typisierung

| Prüfung | Ergebnis |
| --- | --- |
| TypeScript-Quellsyntax | **OK – 738 Quellen** |
| Synchronisierte Produkt-Runtimes | **OK – 120 Dateien** |
| Typisierte Runtime-Spiegel | **OK – 483 Spiegel** |
| Canonical TypeScript Typecheck | **OK** |
| Runtime-Mirror Typecheck | **OK** |
| Vollständiger TypeScript-Build (`build:ts`) | **OK** |
| JavaScript-Syntax der zentralen Runtimes | **OK** |

### Regression und Schutzketten

- Der neue Test `verify-rc93-certified-export-authority.cjs` ist vollständig grün. Abgedeckt sind lokale/externe Priorität, strikte lokale Obergrenze, echte `0-W`-Vorgabe, Prozent-zu-Watt-Normalisierung, Null-/Leerwertsicherheit, Release, TTL, alle Rückfallarten, Last-Valid-Hold, Diagnosemodus, Hash-Kette, read-only State-Map sowie reine Q-Vorgaben ohne falsche P-Bindung.
- Die bestehenden Netzbetreiber-, Grid-Export-Guard-, Diagnose-, Stabilisierung-, Nulleinspeisungs-, Inbetriebnahme-, Fast-Path- und ACK-Prüfungen sind grün.
- Die Schutzketten RC79 bis RC82 sind grün: signierter NVP, 90-/100-%-Schutz, Speicher-/PV-Koordination und finaler Safety-Writer bleiben intakt.
- Die vorhandenen Funktions- und Release-Prüfungen RC57 bis RC93 wurden ohne fachlichen Fehler durchlaufen, einschließlich OCPP, Speicher, Lizenzierung, §14a, PV-Prognose, Dashboard, API-, Sichtbarkeits- und Runtime-Verträgen.
- Der monolithische Aufruf `test:all` erreichte nach 30 Minuten die Laufzeitgrenze der Prüfumgebung, ohne bis dahin einen Fehler zu melden. Sämtliche danach noch offenen Einzelbefehle der Testkette wurden separat ausgeführt und bestanden. Es wurde kein Test-Gate ausgelassen.

### Paket und Release-Artefakt

| Prüfung | Ergebnis |
| --- | --- |
| Release-Manifest | **OK – 313 definierte Paketdateien** |
| Bytegenaue Artefaktprüfung | **OK – 313 geprüfte Paketdateien** |
| `npm pack --dry-run --json --ignore-scripts` | **OK** |
| npm-Paketinhalt | **314 Einträge** |
| Gepackte Größe | **7.693.530 Byte** |
| Entpackte Größe | **17.464.718 Byte** |

Die Paketprüfung enthält die RC93-Dokumentation, den neuen Regressionstest, die synchronisierten Produkt-Runtimes und alle durch das `files`-Whitelist-Modell vorgesehenen Laufzeitdateien.

## Einschränkung der Prüfumgebung

Eine erneute vollständige Abhängigkeitsinstallation über `npm ci` konnte wegen eines DNS-/Registry-Zugriffsfehlers (`EAI_AGAIN`) in der isolierten Prüfumgebung nicht abgeschlossen werden. Für die Implementierung wurden keine neuen Produktionsabhängigkeiten eingeführt. TypeScript 5.8.3 und die vorhandenen Werkzeuge waren lokal verfügbar; Typisierung, Build, Laufzeit-, Paket- und Release-Prüfungen wurden damit erfolgreich ausgeführt. Die tatsächliche npm-Versionsverfügbarkeit wird beim späteren `npm publish` weiterhin durch den vorhandenen `prepublishOnly`-Guard geprüft.

## Feldfreigabe vor 1.0.0

Die Software-Gates ersetzen nicht die projektspezifische Inbetriebnahme am realen Netzverknüpfungspunkt. Vor dem Tag `1.0.0 Stable` soll exakt dieser Stand ohne weitere Funktionsänderung mindestens 24–48 Stunden auf zwei unterschiedlichen Anlagen laufen. Dabei sind insbesondere Vorzeichen, Messwertfrische, ACK/Rückmeldung, Kommunikationsausfall, Übergang EOS ↔ zertifizierter Regler und die konfigurierte Rückfallart zu protokollieren. Bei Anlagen mit vorgeschriebenem EZA-/Parkregler bleiben Netzbetreiber-, Zertifizierer- und Herstellerabnahme zusätzlich maßgeblich.

## Freigabeurteil

`0.8.218 RC93` ist nach den automatisierten Prüfungen ein belastbarer **Stable Candidate**. Die gewünschte Einspeisebegrenzung, Führungsquellenpriorität und Single-Writer-Architektur sind implementiert und regressionsgesichert. Die endgültige Kennzeichnung als `1.0.0 Stable` erfolgt erst nach dem beschriebenen unveränderten Feldlauf.
