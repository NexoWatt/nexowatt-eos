# js-controller 7.2.2 – verbindliches EOS-Testprofil

Stand: 01.10.2026. Basis: `EOS-BASE-CONTROLLER-001`; integrierte Fortschreibung:
`EOS-INTEGRATION-CONTROLLER-002`.
Status: implementierter und lokal geprüfter Entwicklungsbaustein der isolierten
Testbasis. **Kein unveränderter ioBroker-Upstreamstand und keine Serienfreigabe.**

## Fortschreibung im integrierten Entwicklungsstand

Die neue hashgebundene Transformation entfernt zusätzlich den automatischen
`setExecutableCapabilities`-Aufruf bei einem Node-Versionswechsel, in CJS, ESM
und dem gebundenen TypeScript-Quellspiegel. Der Controller versucht dadurch
keine nachträgliche `sudo`-/`setcap`-Erweiterung der Node-Binary. Eine
Umgebungsvariable kann den entfernten Aufruf nicht wieder aktivieren. Der
Versionszustand wird weiterhin aktualisiert. Drei zusätzliche Tests führen den
betroffenen Funktionskörper aus; der aktuelle Profillauf umfasst 29 bestandene
Tests (`reports/integration/raw/controller-profile.tap`).

Der Admin-/UI-Laboraufbau enthält genau die beiden freigegebenen Profileinträge;
die nachfolgende leere Beispielliste beschreibt die frühere Kernbasis.
Aktuelle Transformation und SBOM-Bindung stehen unter
`reports/integration/sbom/candidate-final-controller-transform.json` und
`candidate-final-tree.cdx.json`. Sie ersetzen keine Zielhost-Abnahme.

## Sicherheitswirkung

Der Paketkatalog allein verhindert keine ioBroker-Installation über Admin,
Hostnachrichten oder CLI. Außerdem übernimmt der bisherige Controller
`common.nodeProcessParams` aus der Objektdatenbank in die Node-Startargumente.
Damit könnte beispielsweise ein `--require`-Argument JavaScript aus einem
beschreibbaren Datenverzeichnis laden, obwohl der Paketbaum schreibgeschützt ist.

Das EOS-Testprofil ergänzt deshalb dauerhafte Prüfungen in den tatsächlich
ausgelieferten ESM- und CommonJS-Dateien von Controller und CLI. Die Sperren
besitzen keinen abschaltbaren Umgebungsvariablen- oder Admin-Schalter. Die Datei
`controller.js` lädt die ESM-Ausgabe; ausschließlich CommonJS zu ändern hätte
den normalen Start nicht geschützt.

| Grenze | Implementiertes Verhalten |
| --- | --- |
| Controller-Hostnachrichten | `cmdExec`, `shell`, Controller-/Adapter-/OS-Upgrades, Rebuild, Multihost-Neukonfiguration, Basiskonfiguration lesen/schreiben sowie ZIP-Importpfade werden vor ihrem ursprünglichen Funktionskörper abgewiesen. Fehler enthalten feste Codes. |
| Automatische Installation | Der Installations-/Rebuild-Warteschlangenpfad wird geleert und abgewiesen. Fehlende Adapter werden nicht aus npm nachgeladen. |
| Automatische Adapterupdates | Der Controller führt keine eigenen automatischen Adapterupdates aus. Ein Update benötigt einen neuen geprüften Systemlieferstand. |
| CLI | URL-/Installations-/Upgrade-/Rebuild- und Aliasbefehle sowie Debug-, Plugin-, Vendor-, Restore-, Repository- und Compact-Umschaltungen werden vor Datenbank-/Installerzugriff abgewiesen. |
| npm-Installerklasse | Auch ein direkter Aufruf der bestehenden `Install._npmInstall`-Methode wird abgewiesen. Dies ist keine allgemeine Sandbox für beliebigen Node-Code. |
| Normaler Adapterstart | Paketname, exakte Version, freigegebener Einstiegspunkt, Pfad und Startkonfiguration werden gegen die unveränderbare Profildatei geprüft. |
| Geplanter Adapterstart | Der getrennte Scheduler-Forkpfad prüft erneut; eine alte Warteschlangenfreigabe reicht nicht aus. |
| Node-Startargumente | `nodeProcessParams` muss fehlen oder ein leeres Array sein; keine Preloads, Inspector- oder beliebigen Node-Argumente aus der Datenbank. Speichergrenzen bleiben als begrenzte Zahlen möglich. |
| Ausführungsarten | Zunächst nur `daemon`, `once` und `schedule`. Compact-/Extension-Ausführung ist in dieser Testbasis nicht freigegeben. |
| Dynamische Adapteroptionen | Bekannte Optionen für zusätzliche npm-Module oder Shellausführung können keine Freigabe erhalten. Der JavaScript-Adapter ist ausgeschlossen. Weitere adapterspezifische dynamische Codepfade müssen vor Aufnahme geprüft werden. |
| Plugins | Controllerplugins werden nicht geladen. Fehlende/leere Plugin-Konfiguration oder ausschließlich `sentry.enabled: false` wird akzeptiert; Aktivierung/zusätzliche Plugin-Konfiguration wird abgewiesen. |
| Startumgebung | `NODE_OPTIONS` und `NODE_PATH` müssen leer sein; `system.allowShellCommands` und `system.compact` müssen exakt Boolean `false` sein. |

Normale lesende Hostdiagnose bleibt vorhanden. Der Test weist unter anderem
nach, dass `getInterfaces` weiterhin den ursprünglichen Funktionspfad benutzt.
Die grundsätzliche Netz-Erreichbarkeit wird von diesen Prüfungen nicht verändert.

`NODE_OPTIONS` wird vom Node-Prozess schon vor JavaScript ausgewertet. Deshalb
ist die zusätzliche Prüfung im Controller allein kein Schutz vor einem bereits
ausgeführten Preload. Der Hostdienst muss die Prozessumgebung vorher aus
geschützter Konfiguration bereinigen. Gleiches gilt für Node-/Controllerdateien,
Prüfcode und übergeordnete Codeverzeichnisse: sie dürfen für das Dienstkonto
nicht beschreibbar sein.

## Unveränderbare Freigabedatei

Im vollständigen Systemlieferstand:

```text
app/node_modules/iobroker.js-controller/eos-test-profile.json
app/node_modules/iobroker.js-controller/eos-test-profile.cjs
```

Die Standarddatei enthält bewusst keine Adapter:

```json
{
  "schemaVersion": 1,
  "kind": "eos-controller-test-profile",
  "controllerVersion": "7.2.2",
  "adapters": []
}
```

Eine geprüfte Erweiterung ergänzt exakt `{ "package": "iobroker.name",
"version": "1.2.3", "main": "build/main.js" }`. Das ist nur ein Formatbeispiel,
keine reale Adapterfreigabe. Der Buildschritt muss diese Liste aus dem zuvor
geprüften, signierten Adapterkatalog ableiten und die dazugehörigen vollständigen
Dateibäume binden. Der Hash der Controllerkomponente ändert sich bei einer
Änderung dieser Profildatei. Ein bloßer zusätzlicher Datensatz in der
ioBroker-Objektdatenbank erzeugt keine Freigabe.

Der Einstiegspunkt muss als reguläre Datei ohne Pfadtraversal innerhalb des
realen freigegebenen Paketverzeichnisses liegen. Das Paketmanifest muss Name und
Version bestätigen. Der Startguard berechnet nicht bei jedem Prozessstart alle
Dateihashes neu: vollständige Integrität muss der Installations-/Startpfad
prüfen, während der Laufzeit hält der unveränderbare Dateibaum diese Bindung.

## Hashgebundene Buildtransformation

| Datei im EOS-Repository | Aufgabe |
| --- | --- |
| `runtime/controller-profile/guard.cjs` | Validierung und immer aktive Laufzeitprüfungen |
| `runtime/controller-profile/transform.cjs` | Versions- und SHA-256-gebundene Offline-Transformation |
| `runtime/controller-profile/pinned-build.json` | Feste erwartete Hashes der sechs geschützten JS-Ausgaben, des Laufzeitguards und des Verzeichnismarkers |
| `tests/system/controller-profile-fixtures/` | Originale ausgewählter veröffentlichter 7.2.2-Dateien, TypeScript-Quellspiegel und Upstream-MIT-Lizenz für reproduzierbare Tests |
| `tests/system/controller-profile.test.cjs` | Positive/negative Prüfungen einschließlich Ausführung real transformierter Funktionskörper |
| `reports/test-base/controller-profile-transform.json` | Original- und Ergebnisdigests der tatsächlich transformierten Stagingdateien |

Die Transformation akzeptiert nur `iobroker.js-controller@7.2.2` und
`@iobroker/js-controller-cli@7.2.2` sowie sechs konkrete Originaldateihashes.
Schon eine geänderte Zeile oder ein unbekannter Quellstand führt zum Abbruch.
Alle Eingaben werden vor dem ersten Schreiben geprüft. Das Werkzeug lädt nichts
aus dem Netz und startet keine Paket-Lifecycle-Skripte.

Der Paketbau muss zusätzlich `verifyBuildProfile(appRoot, expectedAdapters)`
aufrufen. Diese Pflichtprüfung akzeptiert nur die fest gebundenen transformierten
Dateien; ein versehentlich signierter unveränderter Controller reicht nicht aus.
Die Profildatei muss exakt die vom Katalog ausgewählten Adapterpakete und Versionen
enthalten, optional auch die vorgegebenen Einstiegspunkte. Die Funktion prüft
reguläre, größenbegrenzte Dateien ohne Symlink-Auflösung im geprüften Teilbaum,
die Paketversionen und die Übereinstimmung des Guardquelltextes mit dem gebundenen
Helper. Die dynamische Profildatei bleibt separat an das signierte Gesamtartefakt
gebunden. Vollständige Adapterdateibäume und Abhängigkeiten muss der umgebende
Bundleprüfer weiterhin prüfen. Ein gleichzeitig durch Angreifer austauschbarer
Build-Elternpfad ist nicht unterstützt; der Buildbereich muss geschützt sein.

Es ist ein **Werkzeug für einen separaten Buildbaum**, kein Root-Updater und
keine Livepatch-Funktion. Sein Schreibvorgang ist keine atomare Systemaktivierung.
Die eigentliche Auslieferung enthält die fertig transformierten Dateien, ihre
Provenienz und den gebundenen vollständigen Lieferstand. Eine signierte
Installation darf keine ungeprüfte Transformation auf dem Kundengerät ausführen.

Die passenden drei TypeScript-Quellspiegel sind ebenfalls an feste Originalhashes
gebunden und können mit `transformFile(..., true)` entsprechend transformiert
werden. **Ein vollständiger Neuaufbau des ioBroker-Monorepositories aus diesen
Quellen wurde in diesem Arbeitsschritt nicht ausgeführt.** Die geprüfte
Testlieferung verwendet die nachweisbar transformierten veröffentlichten ESM-
und CommonJS-Dateien. Künftig ist ein regulärer eigener Quellbuild mit derselben
Prüfung und erneuter Integrationsabnahme vorzuziehen.

`tmp/.eos-readonly` legt das vom normalen ioBroker-Setup erwartete
Controller-Unterverzeichnis bereits im signierten Baum an. Laufzeit-Schreibrechte
werden dadurch nicht vergeben. Der Installer kann die Verzeichnisstruktur so
auch wiederherstellen, wenn er ausschließlich manifestierte Dateien kopiert.

## Kompatibilität und Betriebsgrenzen

`setup` für die vorbereitete lokale Datenbank bleibt zugelassen. Der Dienst
erhält dadurch keine Rechte zum Ersetzen seiner Root-eigenen Konfiguration.
Die Testbasis startet den Controller ohne freigegebene Fachadapter. Eine spätere
Aufnahme von Admin/UI/Devices/EEBUS/OCPP/Backup erfordert jeweils die geprüften
Artefakte, eine Profileintragung und Funktions-/Betriebstests.

Die bisherigen Admin-Funktionen für direkte URL-Installation, individuelle
Upgrades, npm-Zusatzmodule oder ungeprüfte Wiederherstellung funktionieren in
diesem Profil absichtlich nicht. Die Oberfläche muss diese Abläufe bei ihrer
Integration auf den begrenzten Systeminstaller umstellen und verständliche
Fehler anzeigen. Das bestehende visuelle Design wird durch diese Controller-
Änderung nicht bearbeitet. Eine unveränderte Gesamtfunktion aller Adapter wird
hier nicht bescheinigt.

Auch interne allgemeine `cmdExec`-Aufträge erhalten die Sperre. Dienstneustart,
Updates und Wiederherstellung müssen über den festgelegten Hostdienst erfolgen.
Unvollständige Adapterinstallation, fehlende native Abhängigkeiten oder eine
abweichende Laufzeit werden nicht durch einen automatischen npm-Rebuild verdeckt.

## STRIDE und verbleibende Risiken

| Kategorie | Maßnahme im Testprofil | Verbleibende Grenze |
| --- | --- | --- |
| Spoofing | Datenbankeintrag allein reicht nicht; unveränderbare Paket-/Versions-/Einstiegsliste | Gemeinsame ioBroker-Identität; keine gesonderte kryptografische Adapteridentität |
| Tampering | Hashgebundener Build, konkrete Startpfade und erneute Schedulerprüfung | Dateiintegrität und Root-eigene Vorfahren muss der Host tatsächlich durchsetzen |
| Repudiation | Feste Diagnosecodes, Quell-/Ergebnisdigests und Testrohbelege | Kein manipulationssicheres Produktions-Audit allein durch Logmeldungen |
| Information Disclosure | Basiskonfigurationsabruf gesperrt; Fehler ohne Nutzdaten | Gemeinsamer Dienstnutzer kann weiterhin berechtigte Prozess-/Dateidaten lesen |
| Denial of Service | Keine spontanen npm-Installationen/Rebuilds; begrenzte Profile | Last-, Ressourcen-, Wiederanlauf- und gerätespezifische Failsafe-Prüfung bleibt erforderlich |
| Elevation of Privilege | Keine Datenbank-Preloads, keine dynamischen Hostinstallationen; externe Codepfade geprüft | Bereits laufender kompromittierter Node-Code ist nicht durch diese Guardbibliothek sandboxiert |

Die technische Sperre ist auf die beobachteten 7.2.2-Pfade begrenzt. Änderungen
an Controller, CLI oder Node benötigen erneute Prüfung. Fremdadapter können
eigene Code-, Download- oder Unterprozesswege enthalten; sie werden nicht allein
durch ein korrektes Katalogformat sicher. Ein Angreifer mit Rootrechten fällt
ebenfalls außerhalb dieser Laufzeitgrenze.

## Ausgeführte Prüfungen

```bash
node --test tests/system/policy-admission.test.cjs tests/system/controller-profile.test.cjs
```

Am 01.10.2026: **52 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen**,
Node `v24.19.0`, Linux x86-64. Davon 26 Katalog-/Parserprüfungen und 26
Controllerprofil-Prüfungen. Rohbeleg:
`reports/test-base/admission-and-controller.tap`.

Die Controllerprüfungen binden originale ESM-/CJS-Dateien per Hash, transformieren
sie, prüfen sie mit dem realen Node-Parser und führen die betroffenen originalen
Funktionskörper mit begrenzten Testabhängigkeiten aus. Abgewiesene Host-/CLI-
Aktionen, Node-Preloadversuche, Schedulerstart und automatische Installation
erreichen die ursprünglichen ausführenden Zweige nicht. Die lesende
`getInterfaces`-Route bleibt erhalten. Zusätzlich werden echte lokale Dateien,
geänderte Paketversionen und Symlink-Einstiegspunkte geprüft. Die verbindliche
Artefaktprüfung weist unveränderte Upstreamdateien, manipulierte Helper,
fehlende Profile, zusätzliche nicht ausgewählte Pakete, ungültiges UTF-8 und
ausgetauschte Symlink-Verzeichnisse ab.

Dies sind **keine vollständigen Controller-Prozesstests** und keine realen
Fachadapter-/Gerätetests. Der gesonderte Transport-/Bootstrap-Test startet den
tatsächlichen Controller; dessen Ergebnis und Umgebung müssen separat im
Systemprüfbericht geführt werden. Keine Raspberry-Pi-Abnahme, kein unabhängiger
Penetrationstest und keine CRA-/IEC-Konformitätsbestätigung werden aus diesen
Tests abgeleitet.

Verantwortlich für Erweiterungs-, Host- und Abnahmeschritte: EOS-Entwicklung /
Hersteller. Die historische Befundliste bleibt für andere Quell-/Lieferstände
gültig; diese Änderung dokumentiert die konkrete Begrenzung im EOS-Testbuild.
