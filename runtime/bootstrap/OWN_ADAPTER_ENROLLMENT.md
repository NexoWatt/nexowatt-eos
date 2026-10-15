# Sechs eigene Adapter: begrenzte Test-Einrichtung

Stand: 15.10.2026. Quellmodule: `own-adapter-enrollment.cjs` und die ausdrücklich
begrenzte Weiterleitung in `enrollment.cjs`. Dieser Baustein ist **noch kein
veröffentlichtes Update**, keine Host-Isolierung und kein Hardwareprüfbeleg.

## Vertrag

Das neue Profil `eos-six-own-adapters-test-v1` lässt ausschließlich die sechs
bekannten eigenen Adapter mit festgelegten Versionen und Einstiegspfaden zu.
JavaScript, zusätzliche Instanzen, dynamische npm-Module, Shellfreigaben und
zusätzliche Node-Prozessargumente werden dadurch nicht zugelassen. Das signierte
Controllerprofil muss genau mit diesen sechs Einträgen übereinstimmen.

Die bisherigen zwei Managementinstanzen und der Marker
`system.meta.eosEnrollment` bleiben unverändert. Die zusätzliche Einrichtung
bekommt einen eigenen Marker `system.meta.eosOwnAdapterEnrollment`, Schema 1.
Ohne diesen gültigen Marker akzeptiert der alte Bootpfad weiterhin nur sein
ursprüngliches Zwei-Adapter-Profil. Mit Marker werden weiterhin dieselben
Admin-/UI-, Passwort-, Benutzer-, Gruppen-, Repository- und TLS-Einstellungen
geprüft; die zusätzliche Prüfung ist keine Abschwächung dieser Regeln.

## Sichere Ausgangskonfiguration

| Adapter | Neu angelegte Instanz |
| --- | --- |
| Devices | Keine Geräteadressen, leeres Geräteverzeichnis. |
| EEBUS | `eosCommissioningEnabled: false`; Discovery, SHIP-Listener, Ankündigung, automatische Verbindung, Bridge und automatische Grenzwertübernahme aus; keine automatische Vertrauensannahme; Dry-run an. |
| OCPP | `eosCommissioningEnabled: false`, keine Stationen; Transportvertrauen muss gesondert bereitgestellt werden. |
| Backup | Automatische Sicherungen und Speicherdienste aus; kein Mount-/sudo-Auftrag, keine automatische Wiederherstellung. |

Die vier neuen Instanzen werden zunächst deaktiviert angelegt, erst nach
Prüfung der vollständigen Konfiguration aktiviert. Ein laufender Prozess mit
leerer Gerätekonfiguration ist **keine** bestätigte Geräteverbindung. Die
Konfiguration darf anschließend gezielt über die autorisierten Produktwege
geändert werden; der Bootprüfer setzt diese Änderungen nicht zurück. Die
jeweiligen Adapter müssen Transport-, Lizenz- und Befehlsregeln selbst prüfen.

## Aufruf und Rückfall

Der aufrufende Host-Koordinator muss beide Releases authentifizieren, eine
exklusive geschützte Wartungssperre halten und sämtliche Runtimeprozesse
stoppen. Eine negative DB-Heartbeat-Prüfung im Modul ersetzt diesen Hostnachweis
nicht. Das Modul ändert weder Systemdienste noch Releasezeiger, Konten,
Zertifikate oder Hostberechtigungen.

1. `planMigration({objects, states, config, sourceApp, targetApp,
   sourceReleaseId, targetReleaseId})` prüft das abgeschlossene historische
   Managementprofil und fehlende neue Instanzen. Rückgabe ist ein begrenzter
   Plan mit exakten neuen Dokumenten sowie Hashes der ursprünglichen Marker
   und Managementinstanzen; keine kopierten Kennwörter oder Lizenzschlüssel.
2. `applyMigration({... , targetApp, plan, checkpoint})` verlangt einen
   erfolgreichen `checkpoint(plan)` vor der ersten Datenbankänderung. Der
   Koordinator muss den Plan dort dauerhaft im root-geschützten Journal
   speichern. Der Marker bleibt bis zur letzten Prüfung `pending` und
   verhindert einen als erfolgreich ausgegebenen Teilstart.
3. `rollbackMigration({... , sourceApp, targetApp, plan})` prüft vor Löschungen
   alle verbliebenen Dokumente gegen die exakten vom Plan angelegten Varianten.
   Es löscht nur diese vier konkreten Instanzobjekte und den eigenen Marker.
   Fremde/geänderte Dokumente werden nicht überschrieben oder entfernt. Ein
   unterbrochener Rückfall kann mit demselben geschützten Plan fortgesetzt
   werden. Erst nach erfolgreicher historischer Enrollmentprüfung darf der
   Koordinator den alten Releasezeiger/Dienst wieder aktivieren.

Ein später nach Gerätekonfiguration gewünschtes Downgrade ist ausdrücklich
**nicht** dieser unmittelbare Transaktionsrückfall. Geänderte Dokumente werden
abgelehnt und benötigen einen gesonderten, gesicherten Migrationsweg. Ein
Quelltest bestätigt auch nicht die reale atomare Speicherung des Hostjournals.

## Prüfstand

Ausgeführt unter Linux x64, Node 24.19.0:

```sh
node --test tests/integration/own-adapter-enrollment.test.cjs \
  tests/integration/enrollment.test.cjs tests/onboarding/enrollment.test.cjs
```

69 Tests bestanden. Der neue Vertrag prüft sichere Ausgangswerte, exakte
Sechs-Adapter-Zulassung, unveränderte Managementschutzregeln, Journalfehler vor
Mutation, Abbruch nach jeder der zehn Schreiboperationen sowie fortsetzbaren
Rückfall nach jeder der fünf Löschoperationen. Geänderte fremde Konfigurationen
und unsichere/zusätzliche Instanzen werden abgewiesen. `node --check` und
`git diff --check` für diese Änderung bestanden.

Das sind Object-Store-Vertragstests mit Fault Injection, keine native
PostgreSQL-/Systemd-/Pi-Abnahme. Tatsächlicher Paketstart, Objekt-Normalisierung
durch den Controller, TLS-/Geräteverbindungen, signierte R10-Lieferung und
Zielhardwareprüfungen bleiben gesondert nachzuweisen. Globale Produktzulassung
und historische signierte Auslieferungen werden durch dieses Modul nicht
verändert.

## Statische Admin-Oberflächen

Die getrennte Vorlage
`system/own-adapter-test/systemd/nexowatt-eos-upload.service` ruft ausschließlich
`runtime/bootstrap/upload-own-assets.cjs` ohne Argumente als `eos-runtime` auf.
Dieser begrenzte Helfer lädt die statischen Oberflächen der sechs signierten
Adapter, ohne Instanzkonfigurationen oder Enrollmentmarker umzuschreiben.
Der generische ioBroker-Aufruf `upload NAME` ist dafür ungeeignet: er führt
auch Objekt-Upgrades und gegebenenfalls Adapter-Neustarts aus.
Alle Sandbox-, Schreibpfad-, Berechtigungs- und Ressourcenregeln bleiben
bytegleich zur historischen PostgreSQL-Vorlage; nur Beschreibung und der
auszuführende Helfer ändern sich. Die historische Vorlage bleibt
unverändert. Erst der ausdrücklich gewählte Own-Adapter-Test-Build darf diese
Vorlage an die bekannte Zielposition im signierten Payload übernehmen.

Der Host-Updater muss alte und neue Unit authentifizieren, die neue Unit
innerhalb seiner protokollierten Transaktion installieren, `daemon-reload`
ausführen und bei Rückfall die exakten alten Unit-Bytes wiederherstellen.
Uploads laufen nie als root. Bereits hochgeladene, nicht mehr referenzierte
statische Daten sind kein Grund für pauschale Löschungen im Objekt-Store.

`node --test tests/system/own-adapter-upload.test.cjs`: vier statische
Vertragstests bestanden. Das prüft den festen Helfer ohne frei wählbare
Argumente, den festen Sechs-Adapter-Umfang, die unveränderte historische
Unit/Sandbox und die bestehenden CLI-/Shell-Sperren. Reale Uploads
und per HTTPS erreichbare Admin-Konfigurationsdateien sind gesonderte native
Integrationsnachweise.
