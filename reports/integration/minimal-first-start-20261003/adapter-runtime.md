# Adapterkommunikation und Wiederanlauf: gezielte Prüfung

Stand: 03.10.2026, Quellenbasis `6ee690e7503f7f609de1f7c1db1689a6ca39aec3`
mit separat erfassten lokalen Änderungen. Linux x64, Node.js 24.19.0,
Node-OpenSSL 3.5.7. Dies ist kein Lauf auf dem ARM64-Ziel mit Node.js 24.21.0.
Dateibindungen und Prüfkommandos: `adapter-runtime-verification.json`.

## Reproduzierter Befund EOS-PG-OBJECTS-STALE-20261003

Das Objects-Backend ließ bereits eingereihte Änderungen nach einem
Datenbankabbruch durch. Auch ein während der asynchronen Rechteprüfung
eintretender Abbruch oder `destroy()` verhinderte den anschließenden Callback
nicht. Ein alter, verspätet erfolgreicher Protokollcheck konnte zusätzlich
einen bereits wieder getrennten Client als verbunden melden.

Reproduktion: tatsächlicher ausgelieferter Upstream-Objects-Client 7.2.2 und
EOS-Objects-Code, darunter ein ausdrücklich künstlicher Store. Ein Ereignis
wurde eingereiht, anschließend die Verbindung getrennt; der Änderungs-Callback
wurde trotzdem ausgeführt. Sechs gezielte Fälle versagen vor der Änderung.
Der Befund betrifft veraltete Objekt-/Dateibenachrichtigungen und den gemeldeten
Verbindungszustand. Er ist **kein Nachweis der Ursache des gemeldeten
Admin-Absturzes nach der Passworteingabe**.

Der Quellfix verwendet eine Verbindungs-/Ereignisgeneration. Abbruch,
Wiederverbindung, fataler Ereignisfehler und Schließen invalidieren ältere
Arbeit. Vor Bearbeitung und nach jedem asynchronen Rechteprüfungsschritt wird
erneut geprüft; verspätete Ergebnisse werden verworfen. Alte fehlgeschlagene
Arbeit darf keine neuere Verbindung schließen. SQL-Schema, Datenbankrechte,
TLS-Prüfung und Abhängigkeiten bleiben unverändert.

## Tatsächliche Prüfungen

| Prüfung | Ergebnis | Aussagegrenze |
| --- | --- | --- |
| Store-, States-, Rechte- und Adapterkanalsuites | 93/93 bestanden | PostgreSQL-Testdoubles; Adapterkanal mit echten Loopback-TLS-1.3-Verbindungen |
| Objects-Lifecycle vor Fix | 0/6 bestanden | Beabsichtigter negativer Regressionsbeleg |
| Objects-Lifecycle nach Fix | 6/6 bestanden | Echter Upstream-Client 7.2.2, künstlicher Store; keine native DB |

Rohbelege: `adapter-runtime-tests.tap`, `objects-lifecycle-before.tap`,
`objects-lifecycle-after.tap`. Die sechs neuen Fälle prüfen die eingereihte
Änderung nach Abbruch, verspätete Benutzer-ACL, Wiederverbindung ohne alte
Ereignisse, Schließen während einer ACL-Prüfung, verspätete Datei-ACL und den
überholten Protokollcheck. Der erfolgreiche Wiederverbindungsfall belegt auch,
dass neue Ereignisse weiterhin zugestellt werden.

Die 93 vorhandenen Fälle umfassen unter anderem verweigerte Schreibzugriffe
bei Verbindungsabbruch, Wiederaufnahme von Live-Subscriptions, Session-TTL,
Callbackvertrag, Transaktionsrollback, Nachrichten-/Ereignisgrenzen,
Replay-Unterdrückung, falsche/abgelaufene Zertifikate, TLS-1.2-/Klartextabwehr,
Widerruf während asynchroner Arbeit sowie echte Abbrüche am Gesamtzeitlimit.

## Tatsächlicher Liefer- und Aktivierungsumfang

`runtime/product/scope.cjs` trennt bewusst Bündelung von Ausführungszulassung:

| Komponente | Version | Profilstatus |
| --- | --- | --- |
| js-controller | 7.2.2 | Controller, zur Testausführung zugelassen |
| eos-admin | 7.10.11 | Zur Testausführung zugelassen |
| nexowatt-ui | 1.0.21 | Zur Testausführung zugelassen |
| nexowatt-devices | 0.5.169 | Gebündelt, Ausführung nicht zugelassen |
| eebus | 0.3.0 | Gebündelt, Ausführung nicht zugelassen |
| ocpp21 | 0.4.0 | Gebündelt, Ausführung nicht zugelassen |
| nexowatt-backup | 1.0.10 | Gebündelt, Ausführung nicht zugelassen |

Die tatsächliche Aktivität auf dem Pi ist damit nicht gemessen. Der separate
mTLS-Adapterkanal ist ein Laborprofil, kein vom aktuellen Installer aktivierter
Dienst. Der JavaScript-Adapter ist nicht zugelassen. Diese Grenzen wurden in
der Zuverlässigkeitskorrektur nicht pauschal geöffnet.

## Offene Abnahme und Lieferbindung

Native PostgreSQL-17-Neustarts/Verbindungsunterbrechungen mit Controller und
allen zugelassenen Adapterprozessen, reale Admin-Anmeldung, Pi-Neustart,
Speicher-/Lastverhalten, Gerätekommunikation und Backup/Restore bleiben offen.
Die lokale Umgebung hat keinen PostgreSQL-Client/Server bereitgestellt.
Die Installer-Zielprüfung besitzt getrennte TLS-/RLS-Prüfungen, aber keinen
Nachweis des vollständigen Controller-Reconnects; ihre Implementierung ist
kein hier ausgeführter Test. Für den Nutzerbericht zum Prozessabbruch fehlen
weiterhin bereinigte Dienst-/Exit-Daten des Zielgeräts.

Für R5 muss der geänderte Code sowohl unter
`runtime/postgresql/packages/db-objects-postgresql/index.cjs` als auch in
`app/node_modules/@iobroker/db-objects-postgresql/index.cjs` stehen. Neue
Dateihashes, Komponenten-/SBOM-Bindung und Signatur sind erforderlich.
Die R4-Signatur und R4-SBOM werden nicht geändert oder für den neuen Code
beansprucht. Es wurden keine Abhängigkeiten ergänzt; aus diesen Tests folgen
weder Produktionsfreigabe noch CRA-/IEC-Konformität.
