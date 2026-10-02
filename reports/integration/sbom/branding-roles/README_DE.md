# SBOM und Wiederholungsnachweis – EOS 0.2.0-dev.2

Maßgeblich ist der tatsächlich gebaute Admin-/UI-Kandidat **r2**. Sein Lock-SHA256
ist `b0db18741ac1aefbfb3ac15dfc74826aa551a84d327a6e0aae0be20178135ab6`.
Der Baum enthält 465 installierte npm-Paketverzeichnisse mit 425 unterschiedlichen
npm-Identitäten. Zusätzlich sind drei tatsächlich enthaltene Paketverzeichnisse
mit zwei unterschiedlichen eingebetteten Identitäten erfasst: `crypto-js` im
Admin sowie der Lizenzclient jeweils im Admin und in der UI. Beide Clientkopien
haben eigene Dateibaumhashes und Verweise auf den jeweiligen Adapter.

Die frühere Inventarlücke der UI-Lizenzclientkopie ist damit geschlossen. Die
höhere Zahl eingebetteter Verzeichnisse bedeutet keine zusätzliche Installation
von Laufzeitcode. Unbekannte Browserbundle-Inhalte werden weiterhin nicht aus
Lockdateien als vollständig inventarisiert ausgegeben.

| Datei | Nachweis |
| --- | --- |
| `runtime.npm.cdx.json` | Unveränderte npm-Ausgabe des installierten Baums. |
| `runtime.cdx.json` | CycloneDX 1.5 mit Manifest-/Lockbindung, bekannten eingebetteten Kopien und lokal verändertem Controller, CLI und WebSocket-Transport. |
| `runtime.coverage.json` | Erfasste Pfade, Identitäten, Manifest-/Dateihashes, Plattformauslassungen und offene Inventarbereiche. |
| `source-lock-inventory.cdx.json` | Quellen- und Lockinventar aller sechs Komponenten, einschließlich Entwicklungs-/Frontend-Abhängigkeiten; kein Installationsnachweis. |
| `controller-transform.json`, `controller-profile.json` | Zehn tatsächlich geänderte beziehungsweise geprüfte Controller-/Transportdateien und genau zwei zugelassene Adapter. |
| `schema-validation.json` | Offline-Validierung der drei CycloneDX-Dateien mit ihren jeweiligen SHA256. |
| `runtime.audit.json`, `dependency-disposition.json` | Tatsächlicher npm-Audit und weiter zu untersuchende Befundzuordnung. |
| `replay-verification.json` | Frischer `npm ci`-Aufbau: identische 465 Paketmanifeste, unveränderter Lock, zwei lokale Archiv-SRIs und zehn identische Transformationsdateien. |
| `verification.json`, `commands.json` | Zusammenfassung, tatsächliche Befehle und Artefakt-/Werkzeugbindungen. |

Die ursprünglichen Registry-Archivhashes lokal veränderter Pakete stehen nur in
`pedigree.ancestors`. Die aktuellen Bytes werden durch die Transformationshashes
und später durch den signierten vollständigen Release-Dateibaum gebunden. Eine
SBOM-Prüfsumme ist selbst keine Release-Signatur.

Der aktuelle Audit meldet **drei moderate Paketknoten** der esbuild-Kette und
keine hohen oder kritischen Meldungen in diesem konkreten Admin-/UI-Baum.
Dies ist keine Null-Schwachstellen-Aussage. Paketknoten sind keine Anzahl
unabhängiger CVEs; Aufrufpfade und konkrete Betroffenheit bleiben zu bewerten.
Die bekannten Befunde des getrennten, inaktiven Gesamtadapterumfangs werden
hierdurch nicht als behoben bewertet.

Die 46 bestandenen Werkzeugtests umfassen 28 Basisscope-/Transformationsfälle,
8 Buildfälle, 4 Quelleninventarfälle und 6 Einbettungsfälle. Synthetische
Testdateien prüfen Verträge; der tatsächliche r2-Baum und der frische Replay
sind eigene Nachweise. Anwendung, Browser und Zielgeräte werden außerhalb
dieses Inventarberichts geprüft.

Die reproduzierbaren Eingaben liegen unter
`delivery/reproducible-roles-lab/`. Registry-Pakete werden beim Wiederholen über
Netzwerk oder einen passenden verifizierten npm-Cache bezogen; ein Offline-
Geräteinstaller wird nicht behauptet. Nach `npm ci` muss die EOS-Transformation
vor einem Laborstart erneut ausgeführt und geprüft werden.

`review-snapshots/r1/` enthält einen früheren diagnostischen Kandidatenstand,
insbesondere die damalige noch unvollständige Einbettungserfassung. Er ist kein
aktueller r2-Nachweis. Auch `delivery/reproducible-ui-lab/` gehört weiterhin zum
historischen Produktstand `0.2.0-dev.1`.

Nicht enthalten sind eine vollständige Geräteimage-SBOM, OS-Pakete, Firmware,
Node-/Redis-Binary-Provenienz, native ARM64-Abnahme und die vollständige Zuordnung
aller Browserbundle-Abhängigkeiten. Keine Produktionsfreigabe oder CRA-/IEC-
Konformitätserklärung.
