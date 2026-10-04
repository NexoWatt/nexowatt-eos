# Prüfung der Frontendübernahme in den aktuellen main-Stand

Ausgangscommit: `4ac429e1f4f06a249053487f719f670a8d03472b`.
Umgebung: Linux x86_64, Node.js 24.19.0. Tatsächlicher Lauf am 04.10.2026.
Keine Browser-, Pi-, Anlagen- oder neue Runtimeveröffentlichung.

## Änderungsumfang und Erhalt des neueren Stands

46 Frontend-/Werkzeug-/Testdateien wurden nur übernommen, nachdem die
Dreiwegeprüfung sie als allein lokal geändert oder neu ausgewiesen hatte und
der tatsächliche Ziel-Gitblob mit dem ausgewerteten main-Blob übereinstimmte.
Die divergierenden `src-admin/index.html` und `adminWww/index.html` wurden
manuell zusammengeführt. Die bereits vorhandene R5-Startup-CSS bleibt erhalten;
die neue breite Ladeanzeige ergänzt sie und ist auf die EOS-Shell beschränkt.
Die Änderung des vorhandenen R5-Loader-Tests betrifft dessen erwartete aktuelle
Cache-URL und verlangt zusätzlich die neue Produkt-Loader-CSS vor dem Bootstrap.

Der aktuelle aufgelöste Abhängigkeitsbaum blieb erhalten. Nur die Root-Metadaten
der Lockdatei wurden aus dem gegenwärtigen Admin-`package.json` übernommen.
NWL3, Herstellertrust, Onboarding und Systemruntime wurden durch diese
Frontendarbeit nicht verändert. Die parallel geprüfte R5-Backendkorrektur wurde
vor der gemeinsamen Admin-Versiegelung abgewartet.

Die aktive Bootstrapdatei erhält die korrigierte Loginmethode sowie aktualisierte
Import-URLs und die eigene lange Logoreferenz. Ihre abhängige Importkette von 34
Anwendungsmodulen benutzt denselben Cachemarker. Die Hashes von 211 unabhängigen
JavaScriptdateien stimmen vor/nach dem Cachewerkzeug überein. Ein neuer
kompletter Vite-Build wurde nicht ausgeführt; geprüft wurden die mitgelieferten
vorgebauten Dateien sowie die tatsächlichen Source-/Build-Loginmethoden.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis | Rohbeleg |
| --- | --- | --- |
| Branding, Cachegraph und erhaltener R5-Loadervertrag | 14/14 bestanden | `raw/branding-cache.tap` |
| Loginregression im aktuellen R5-Backend und Source-/Build-Frontend | 15/15 bestanden | `raw/login-recovery.tap` |
| Paketvalidator | Bestanden | `raw/package-final.log` |
| Einstiegspunkt, Import-/Ladereihenfolge | Bestanden | `raw/entrypoint.log` |
| Rollenvertrag und Produktshell | Bestanden | `raw/roles.log`, `raw/clean-core.log` |
| Adminbranding-Selbsttest | Bestanden | `raw/admin-branding.log` |
| Syntax aller 34 betroffenen Anwendungsmodule | Bestanden | `raw/module-syntax.json` |
| Admin neu versiegeln und anschließend prüfen | 1471 Dateien, 24 Backenddateien, bestanden | `raw/prebuilt-seal.log`, `raw/prebuilt-verify.log` |

Die gesonderte Backup-/Installer-Assetübernahme hat einen eigenen aktuellen
Prüfvermerk in diesem Verzeichnis (`BACKUP_ASSETS.md`); ihre 6 bestandenen
Prüfungen sind zusätzliche Belege. Backend-HTTPS-/Passwortableitung wurden vom
zugeordneten Backend-Prüfer separat im aktuellen main-Stand nachgewiesen.

Dateibindung und tatsächlicher Endstand:
`frontend-source-hashes.json`. Nach der abschließenden Versiegelung wurden durch
diesen Arbeitsschritt keine Admin-Quell-/Runtime-Dateien mehr verändert.

## Lieferung und offene Prüfungen

Die bereits signierte R5-Runtime und ihre Installationspins sind unverändert.
Der neue Quellstand ist damit nicht automatisch in jenem Archiv enthalten und
noch nicht auf einem Pi installiert. Eine spätere Runtime-Neuveröffentlichung
benötigt einen eigenen gebundenen Build und die zugehörigen Prüfungen.
Echte Browserdarstellung, Cachewechsel in einem bestehenden Browserprofil,
Pi-Neustart und Anlagenbetrieb bleiben **OFFEN**. Keine CRA-/IEC-Konformität
oder Produktionsfreigabe wird aus diesen Prüfungen abgeleitet.

Der bestehende Prebuilt-Prüfer bindet nun zusätzlich `package.json` und
`package-lock.json` in seiner Dateihashtabelle. Beide tatsächlichen Paket- und
Abhängigkeitsdateien wurden damit nach erfolgreicher Paketvalidierung
mitversiegelt; zuvor wurden sie nur durch den gesonderten Paketvalidator geprüft.
