# Admin-Erststart und unveränderliche Rollback-Ausgangsdaten

15.10.2026; lokaler Ausgangscommit `2a936d3ba16cf58045f6916605c75cc0b7cb7c54`.
Nativer CI-Lauf `38713770220`, Job `116351337525`, Artefakt `11962640393`.

Der dritte native Lauf bestand die ersten zwölf Prüfschritte und 17 von 21
fachlichen Checks. Beide tatsächlichen Backup-Archive wurden geöffnet und
geprüft; sie enthalten jeweils 305 Objekte und 268 States. Der anschließende
Controller-Stopp war erfolgreich. Alle zwölf Protokollprüfungen enthielten
nur den vorgesehenen Lizenzstatus `LICENSE_MISSING`, keinen unerwarteten
Laufzeitfehler. Danach verweigerte `rollbackMigration` mit
`OWN_ENROLLMENT_BASELINE_CHANGED` den dreizehnten Schritt. Ein erfolgreicher
Rollback und nachfolgender Neustart sind mit diesem Lauf **nicht belegt**.

## Reproduzierbarer Befund

Die anfängliche Zwei-Adapter-Konfiguration wird im Test vor ihrem allerersten
Admin-Start migriert. `enrollment.instanceDocument` enthielt bisher weder
`native._nexowattEosRoleReadableAclManaged` noch eine ausdrückliche Admin-ACL.
Der vorhandene Admin-Startpfad `ensureProtectedAdapter('eos-admin')` ruft
`ensureEosRoleReadableAcl` auf. Dieser ergänzt das Flag mit `true` und die ACL
mit Eigentümer `system.user.admin`, Gruppe `system.group.administrator` und
Objektrechten `0x664`.

Der echte, kompilierte Admin-Methodencode wurde lokal mit dem vorhandenen
Objektspeicher-Test der Migration ausgeführt. Die beiden Ergänzungen führten
reproduzierbar zu `OWN_ENROLLMENT_BASELINE_CHANGED`; es gab dabei **null
Löschungen**. Der gepinnte Adapterkern ergänzt bei einem solchen Schreibaufruf
außerdem ein fehlendes `user` mit `system.user.admin`; vorhandene `from`- und
`ts`-Werte bleiben erhalten. Der verwendete PostgreSQL-/Objects-Pfad ergänzt
keine automatische `_rev`. Diese Metadaten werden nicht aus Hashes entfernt.

## Eng begrenzte Korrektur

Nur das neu erzeugte Admin-Instanzobjekt erhält bereits im Root-Bootstrap
genau die vorhandene Laufzeit-ACL und das zugehörige Flag. Die echte
Admin-Methode ist danach auch bei wiederholtem Aufruf schreibfrei. Damit
ändert dieser Erststart weder Ausgangshash noch Herkunfts-/Zeitmetadaten.
Benutzer, Gruppen, UI und vier zusätzliche Adapter erhalten dadurch keine
anderen Zugriffsrechte. Insbesondere bleiben Servicekonto und neue
Adapterinstanzen bei ihrer privaten ACL `0x600`.

`rollbackMigration`, Plandaten, vollständige Ausgangshashes und die Verweigerung
fremder Konfigurationen bleiben unverändert. Es gibt kein nachträgliches
Neufestlegen der Ausgangsdaten und keine Ausnahme für beliebige Metadaten.
Auch `assertInstance` wird nicht verschärft: historische, bereits gestartete
R9-Instanzen bleiben gültig, und ihre tatsächlichen gespeicherten Metadaten
werden weiterhin vollständig in den Plan eingebunden.

Quellprüfung der weiteren Instanzen: UI normalisiert seine Startkonfiguration
nur im Speicher. Devices migriert nur nichtleere alte Gerätelisten; die neue
Liste ist leer. EEBUS-Identitätsänderungen liegen hinter der deaktivierten
Inbetriebnahme. Backup-Cloudspeicherung ist im neuen Profil deaktiviert.
Admins alte ACL-Reparatur betrifft die privaten `0x600`-Instanzen nicht.
Dies ist eine gezielte Quellprüfung, kein Ersatz für den nativen Gesamtlauf.

## Lokale Prüfung und offene Grenze

Linux x64, Node 24.19.0: **64/64** Enrollment-/Rollback-Tests bestanden,
einschließlich tatsächlicher kompilierter Admin-Projektion, wiederholtem
schreibfreiem Erststart, historisch normalisierter R9-Quelle und weiterer
Verweigerung geänderter Admin-Konfiguration/ACL vor jeder Löschung.
[TAP-Rohbeleg](rollback-baseline-regression.tap).
Weitere **44/44** Erststart-/Updatekoordinatortests bestanden
([Rohbeleg](rollback-update-followup.txt)). Die
[Dateihashes](rollback-baseline-summary.json) binden die lokalen Ergebnisse
an die geprüften Quellen.

Die native Gesamtprüfung auf dem neuen Quellstand, der tatsächliche Rollback
mit anschließendem Neustart und Pi-/ARM64-/Stromausfallprüfungen bleiben
**OFFEN**. Dieser Bericht behauptet keine Geräte-, Produktions- oder CRA-Freigabe.
