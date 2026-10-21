# UI-Adapter-Core: Abgleich mit der geprüften Gesamtlaufzeit

Die frische Laufzeitprüfung verlangt für alle tatsächlichen Adapter-Core-Kopien
Version 3.4.3. Das UI-Manifest band noch exakt 3.4.1. Anders als ein offener
Versionsbereich erzwingt dieser alte Pin eine zusätzliche ältere Kopie bei der
Gesamtinstallation. Die Laufzeitprüfung wurde nicht gelockert: UI bindet nun
ebenfalls exakt **3.4.3**, und das Lockfile wurde mit abgeschalteten npm-Hooks
aktualisiert.

Adapter-Core 3.4.3 deklariert einen Peer auf Controller-Common-DB. Dieser wird
lokal auf **7.2.5** aufgelöst. Die damit zusätzlich aufgenommenen Peer-Pakete
erklären den größeren Lockfile-Diff; es erfolgte kein allgemeines npm-Upgrade
oder `audit fix --force`. Die bisher nur für Entwicklung aufgelöste Kopie
`follow-redirects` 1.16.0 wurde dadurch für Produktion relevant und mit dem
bereits geprüften Override **1.16.1** ersetzt. Axios löst auf 1.20.0 auf. Es
wurde keine js-controller-Hauptversion 8 eingeführt.

Der neue Quellpaket-Audit meldet **drei hoch eingestufte Paketknoten**:
`@iobroker/adapter-core`, `@iobroker/js-controller-common-db`, `node-forge`.
Sie gehören zur bereits dokumentierten ungepatchten Forge-Kette. Dies ist keine
neue Behauptung eines erfolgreichen Gesamt-Audits: der frühere UI-Nullbefund
galt für das vorherige Lockfile und wird nicht auf das neue übertragen.
`ui-adapter-core-audit.json` enthält die unveränderte Ausgabe des erneuten
Produktions-Audits. Die Forge-Kette war in der vorherigen Gesamtlaufzeit bereits
über den Controller enthalten; ein neuer montierter Gesamtbaum muss dennoch
gesondert geprüft werden.

| Prüfung nach finalem `npm ci --ignore-scripts` | Ergebnis |
|---|---|
| `npm run build:types` | Bestanden gegen die neuen Abhängigkeiten |
| Adapter-State-/API-Vorbereitung und Laufzeittest | Bestanden, 7 Laufzeitfälle |
| Startkettenprüfung | Bestanden, 238 JS/MJS-Dateien und relative Import-/Startpfade |
| UI-CI-Befehl: Integration, Authentifizierung, Entitlements | 53/53 bestanden |
| Bestehende HTTPS-Zugriffsregression | Bestanden, synthetische lokale Gegenstellen |
| Abhängigkeitsregression | 6/6 bestanden, nun zusätzlich tatsächliche Auflösung UI → Adapter-Core 3.4.3 → Common-DB 7.2.5 → Axios 1.20.0 → follow-redirects 1.16.1 |
| Aktueller Artefaktgenerator und `publish:check` | Bestanden, 408 inventarisierte Dateien |
| `npm pack --dry-run --json --ignore-scripts` | Bestanden, 409 Einträge |

Die zusätzliche Auflösungsprüfung liest Metadaten aus dem tatsächlich durch
Node aufgelösten Paketpfad. Sie benötigt keinen nicht exportierten
`package.json`-Subpfad und prüft den Paketnamen. Die bestehende strengere Prüfung
des späteren Gesamtbaums bleibt unverändert.

Der Artefaktgenerator wurde erneut ausgeführt. Da Paketmanifest/Lockfile nicht
in der Runtime-Dateiliste stehen, erzeugt diese Pin-Änderung keine zusätzliche
Runtime-Dateiänderung im aktuellen Artefaktmanifest. Dessen bereits offene
Fixture-Änderung ist separat in `CI_UI_LICENSE_FIXTURE_DE.md` nachgewiesen.
Produktlogik, Lizenz-/Plattformzulassung und Gerätesteuerung wurden nicht geändert.

Lokale Umgebung: Linux/x64, Node 24.19.0, npm 11.9.0. Kein neuer vollständiger
Browserlauf, ARM64-/Pi-Test, Dienststart oder veröffentlichter Gesamtbuild wird
behauptet. Vorherige Nachweise bleiben historische Momentaufnahmen; die neuen
Dateihashes und Versionen stehen in `ui-adapter-core-followup.json`.
