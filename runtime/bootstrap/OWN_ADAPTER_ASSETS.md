# Fester Asset-Upload für sechs eigene TEST-Adapter

`upload-own-assets.cjs` ersetzt ausschließlich im neuen Sechs-Adapter-Profil die
üblichen `iobroker.js upload NAME`-Aufrufe. Der historische Zwei-Adapter-Pfad bleibt
unverändert. Die Systemd-Unit ruft den Helper ohne Argumente im vorhandenen
unprivilegierten Upload-Sandboxprofil auf. Die allgemeine Installer-/Releaseprüfung
wird dadurch nicht ersetzt.

## Grund und Datenhaltung

Die tatsächlich geprüfte CLI 7.2.2 ruft bei einem vollständigen Upload zusätzlich
`upgradeAdapterObjects` auf. Dadurch werden vorhandene Instanzdokumente inklusive
Metadaten geändert; der exakte Enrollment-Rollback darf solche Änderungen nicht
ignorieren. Auch `Upload.uploadAdapter(..., false, true)` kann über
`checkRestartOther` Instanzen ändern. Einzelne Datei-Schreibfehler werden dort
abgefangen und können trotz unvollständigem Upload Erfolg ergeben.

Deshalb verwendet EOS eine eigene enge Dateischleife mit den tatsächlichen
Objects-Client-Methoden `writeFileAsync` und `readFile` (Promise mit
`{file, mimeType}`). Kein Aufruf von CLI-Upload, `upgradeAdapterObjects`,
`uploadAdapterFullAsync`, Restart-, Shell- oder Paketmanagerfunktionen erfolgt.

Der Helper:

- akzeptiert ausschließlich das feste Sechs-Adapter-Profil und überprüft alle
  Paketnamen, Versionen, Main-Einträge und das bestehende Enrollment;
- verwendet in der CLI nur die signierte aktuelle Release-App und die bereits
  vorhandene `/etc/nexowatt-eos/iobroker.json`, ohne zweite Zugangsdaten-Datei;
- verweigert Root-Ausführung und benötigt den bereits konfigurierten lokalen
  PostgreSQL-mTLS-Pfad mit getrennten Rollen;
- prüft vorab alle Administrator-Assetverzeichnisse sowie vorhandene `www`-Bäume;
  `wwwDontUpload:true` wird beachtet, fehlendes `www` ist zulässig, fehlendes
  `admin` nicht;
- verlangt root-eigene, nicht gruppen-/fremdschreibbare Quellpfade ohne Symlinks,
  Hardlinks oder Sonderdateien; Dateigröße, Anzahl, Tiefe und Gesamtumfang sind
  begrenzt;
- überschreibt nur die explizit im geschützten Kandidaten enthaltenen Dateipfade
  und legt gegebenenfalls deren feste Meta-Namespaces an; bestehende Metaobjekte,
  Benutzerdateien und andere Dateien werden weder umgeschrieben noch gelöscht;
- liest **jede** hochgeladene Datei anschließend zurück und vergleicht Länge,
  SHA-256 und MIME-Typ. Ein Schreibfehler oder abweichender Readback ist ein Fehler;
- vergleicht alle sechs vollständigen Instanzdokumente und die vier
  Bootstrap-/Enrollment-/Erststartmarker vor und nach dem Vorgang einschließlich
  Fehlerpfad. Fremde Änderungen werden nicht automatisch zurückgesetzt;
- verlangt fehlende oder bestätigt falsche `alive`-States für Controller und
  alle sechs Adapter. Der aufrufende Host hält zusätzlich seine Wartungssperre
  und stoppt die echten Prozesse; ein State allein ist keine Prozessisolation.

Vorhandene Dateien außerhalb des expliziten Kandidateninventars bleiben erhalten.
Dieser Helper ist daher **kein Lösch-/Bereinigungswerkzeug** für veraltete oder
verwundbare historische Assets. Eine erforderliche Entfernung verlangt einen
eigenen überprüften Migrationsschritt mit exakten Zielpfaden.

## Grenzen und Wiederholung

Verbindungsaufbau maximal fünf Sekunden je Client, Uploadbudget 180 Sekunden,
gesamter CLI-Prozess einschließlich Bereinigung maximal 210 Sekunden. Die
Systemd-Grenze bleibt zusätzlich aktiv. Fehlerausgabe enthält nur fest definierte
Codes, keine Exceptiontexte, Pfade, Zugangsdaten oder Dateiinhalte.

Eine fehlgeschlagene Teilübertragung verhindert den Start. Nach Behebung darf
derselbe Helper die festen Kandidaten-Dateien erneut schreiben. Er startet keine
Adapter und behauptet keine atomare Rücknahme des Dateispeichers. Der originale
Enrollmentplan und die Instanzdokumente bleiben unverändert; danach kann der
separat geprüfte Enrollment-Rollback ausgeführt werden.

Der Funktionsaufruf `uploadAssets({objects, states, config, app})` dient dem
nativen Integrationstest mit tatsächlichen Clients und geschützten App-Pfaden.
Nur isolierte Tests injizieren Owner-/MIME-Funktionen; CLI und Systemd bieten
keine Flags oder Umgebungsvariablen für einen Pfad-/Prüfungsbypass.

## Prüfstand 15.10.2026

21 isolierte Tests in `tests/system/own-adapter-assets.test.cjs` bestanden mit
Node 24.19.0. Sie verwenden die echte Helper- und Enrollmentlogik, aber eine
In-Memory-Objects-/Dateiimplementierung. Geprüft sind unter anderem erfolgreicher
Upload mit Hash-/MIME-Readback, Wiederholung, Erhaltung von Benutzerdateien,
anschließender exakter Enrollment-Rollback, aktive/falsche `alive`-States,
Zusatzinstanzen, TLS-Downgrade, Namespace-Kollisionen, Symlinks, Hardlinks,
unsichere Rechte, Übergröße, fehlende Assets, Schreibfehler, korrupter Readback,
Quelländerungen, unerwartete Instanz-/Markeränderungen und fehlgeschlagene
Clientbereinigung. Ein Cleanupfehler kann keinen erfolgreichen CLI-Status ergeben.

Diese Ergebnisse ersetzen **nicht** den qualifizierten nativen Lauf mit Node
24.21.0, realem PostgreSQL, authentifizierten Admin-HTTPS-Assetabrufen und
Poststart-Rollback. Ebenso wenig sind sie eine Pi-, Restore-, Produktions- oder
CRA-Abnahme. Der native Sechs-Adapter-Harness muss den Helper nach dem Enrollment
und nach erneuter Anwendung vor dem Neustart tatsächlich ausführen.
