# NexoWatt EOS 1.0.0 – Stable-Validierungsbericht

**Prüfdatum:** 6. September 2026  
**Paket:** `iobroker.nexowatt-ui@1.0.0`  
**Freigabestatus:** Official Stable / Verkaufsstand  
**Ausgangsbasis:** NexoWatt UI `0.8.218 RC93`  
**SHA-256 der Ausgangs-ZIP:** `53547770dcf5e0aa0d75fa7092c334d5d1d4a6a0adc217ab208c3265b9ba7451`

## 1. Umfang der Stable-Promotion

Version, Release-Metadaten, ioBroker-News, Webmanifest, Changelog, Veröffentlichungsanweisungen und PWA-Cache wurden auf `1.0.0` vereinheitlicht. Sichtbare Candidate-Kennzeichnungen wurden aus der produktiven Oberfläche entfernt.

Die produktive EMS-, NVP-, Lade-, Speicher-, Tarif-, §14a-, Geräte- und Hardware-Writer-Logik wurde bei der Stable-Promotion nicht verändert. Gegenüber der RC93-Ausgangsbasis wurden einschließlich dieses Berichts drei Dateien ergänzt, keine Datei entfernt und zwanzig vorhandene Dateien geändert. Die Laufzeitänderungen beschränken sich auf:

- die versionsneutrale Beschriftung der bereits vorhandenen Netzlimit-/0-Einspeise-Reihenfolge;
- den PWA-Cachewechsel von `nexowatt-cache-v493` auf `nexowatt-cache-v500`;
- automatisch synchronisierte Quellhashes der daraus erzeugten Runtime-Dateien.

Die übrigen Änderungen betreffen ausschließlich Release-Metadaten, Dokumentation und Prüfwerkzeuge.

## 2. Zusätzlich behobene Release-Blocker

Während der Stable-Prüfung wurden zwei nicht produktive Release-Probleme erkannt und behoben:

1. Der RC66-Prüfer setzte fälschlich eine Version aus der Reihe `0.8.x` voraus. Der Vergleich arbeitet jetzt numerisch nach SemVer und akzeptiert `1.0.0` korrekt als neuer als `0.8.191`.
2. `io-package.json` enthielt neun News-Einträge. Die zwei ältesten RC-News wurden entfernt; die vollständige Historie bleibt im `docs/CHANGELOG.md`. Der Stable-Gate verhindert künftig mehr als sieben News-Einträge.

Zusätzlich wurde der Veröffentlichungsweg gehärtet. `prepublishOnly` prüft jetzt fail-closed:

- Verfügbarkeit der Zielversion in der npm-Registry;
- bytegenaue Übereinstimmung mit dem Release-Artefaktmanifest;
- Stable-Konsistenz aller Versions- und Releasequellen;
- ioBroker-Metadaten, Konfliktmarker und JavaScript-Syntax;
- startnahe Paket-Runtime einschließlich relativer `require()`-Pfade.

## 3. Bestandene Prüfungen

| Prüfbereich | Ergebnis |
|---|---:|
| TypeScript-Quellsyntax | 738 Dateien bestanden |
| Produktive Runtime-Synchronität | 120 Dateien bestanden |
| Runtime-Parallelspiegel | 483 Dateien bestanden |
| Vollständiger TypeScript-Build | bestanden |
| Allgemeiner Typecheck | bestanden |
| Runtime-Mirror-Typecheck | bestanden |
| Paket-Runtime-Start-Smoke | 182 JS/MJS-Dateien bestanden |
| Release-Artefaktmanifest | 315 Paketdateien bytegenau bestanden |
| npm-Pakettrockenlauf | 316 Dateien bestanden |
| npm-Paketgröße | 7.694.943 Byte |
| Entpackte npm-Paketgröße | 17.470.040 Byte |
| npm-Paket-SHA-1 | `d15ced4df260d6c4778464c914002c09ddf6c00c` |
| RC57 bis RC93 Regressionen | bestanden |
| Stable-Release-Gate | bestanden |

Besonders geprüft wurden unter anderem:

- OCPP-, Wallbox-, Lade- und Stationszuordnungspfade;
- Speicherregelung, günstiger Tarif, PV-only-Schutz und NVP-Koordination;
- §14a-Kommunikationsfallback und finale Safety-Envelope;
- signierter NVP, Import-Soft-/Hard-Limit und dauerhaft aktiver Netzschutz;
- lokale Einspeisebegrenzung bis `0 W` ohne Parkregler;
- bevorzugte Reglerführung nur bei aktivierter, in Betrieb genommener und vom Installateur freigegebener Schnittstelle;
- strengere Auswahl aus lokaler Obergrenze und externer Vorgabe;
- TTL, Qualität, Fail-Safe, begrenzte Haltezeit und hashverkettetes Audit;
- Senkenfolge Verbraucher → Ladepunkte/flexible Verbraucher → Speicher → Mesh/Microgrid → PV-Abregelung;
- Startkette von `main.js`, EMS und §14a ohne fehlende relative Runtime-Abhängigkeit;
- Browserdarstellung des Stationsdisplays mit 4, 5, 6 und 8 Ladepunkten in mehreren Auflösungen;
- SSE-Backpressure, Watchdog-Deduplizierung und Heap-Schutz.

## 4. Einordnung des Sammeltests

Der monolithische Aufruf `npm run test:all` wurde in der isolierten Prüfumgebung zweimal gestartet. Die sehr lange, tief verschachtelte npm-Prozesskette erreichte jeweils das Ausführungslimit der Umgebung, ohne einen fachlichen Fehler auszugeben. Die jeweils zuletzt wartenden TypeScript-Teilprüfungen liefen anschließend separat in unter drei Sekunden beziehungsweise unter einer Sekunde mit Exitcode `0` durch.

Daraufhin wurden sämtliche Bestandteile der Kette kontrolliert einzeln beziehungsweise in klar abgegrenzten Gruppen ausgeführt. Alle fachlichen, typisierten, Browser-, Runtime-, Packaging- und Release-Gates bestanden. Der Abbruch des monolithischen Kommandos wird deshalb als Begrenzung der Prüfumgebung und nicht als Softwarefehler bewertet.

## 5. Registry-Prüfung

Die lokale Registry-Abfrage wurde korrekt fail-closed mit `getaddrinfo EAI_AGAIN registry.npmjs.org` abgebrochen, weil die isolierte Umgebung keinen zuverlässigen DNS-Zugriff auf die npm-Registry besitzt. Die Version wurde daher in dieser Umgebung nicht veröffentlicht.

Beim späteren `npm publish` wird `release:check-version-free` erneut ausgeführt. Der Publish-Vorgang wird automatisch blockiert, wenn die Registry nicht erreichbar oder `1.0.0` bereits vergeben ist.

## 6. Verbleibende projektspezifische Inbetriebnahme

Die Stable-Freigabe bestätigt den reproduzierbar geprüften Software- und Paketstand. Ein realer zertifizierter EZA-/Parkregler sowie eine aktive Einspeisebegrenzung konnten in der aktuellen Anlagenumgebung nicht vollständig als Hardware-Feldtest gefahren werden.

Deshalb sind bei jeder Kundenanlage vor der produktiven Aktivierung weiterhin zu prüfen und zu dokumentieren:

- NVP-Vorzeichen und Maßeinheit;
- Messwertfrische und Kommunikationsausfall;
- Schreibfähigkeit des Wechselrichter-/Regler-Datenpunkts;
- ACK beziehungsweise messbare Sollwertwirkung;
- gewählte Rückfallart und Wiederanlauf;
- Einhaltung der projektspezifisch zulässigen Einspeisegrenze.

Diese Inbetriebnahme ist keine Einschränkung der Softwareversion, sondern Bestandteil der Anlagenparametrierung und der gegebenenfalls erforderlichen Netzbetreiber-, Zertifizierer- oder Herstellerabnahme.

## 7. Freigabeentscheidung

`iobroker.nexowatt-ui@1.0.0` ist als erste offizielle NexoWatt-EOS-Stable-Version für Verkauf und produktiven Softwareeinsatz freigegeben. Spätere Fehlerkorrekturen werden als Patch-Versionen ab `1.0.1` geführt.
