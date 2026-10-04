# Controller-Erststart: Befund, Korrektur und Prüfgrenzen

Stand: 04.10.2026. Ausgangsquelle: `a02bba50978fa0f9bac893e1921487b457298e7f`.

## Beobachtung am Testgerät

Der vom Betreiber bereitgestellte Journal-Ausschnitt zeigt einen
`ui-onboarding`-Startversuch des authentifizierten R4-Standes (Sequenz 7),
keinen nachgewiesenen R6-Updateversuch. PostgreSQL war aktiv und die separate
mTLS-/Schema-Vorprüfung bestand. Beim Controllerstart folgten:

1. `Cannot write host object: EOS_PG_TRANSACTION_FAILED`.
2. Wiederholtes `EROFS` beim Schreiben von `pids.txt` im unveränderlichen
   Controllerpaket.
3. `CONTROLLER_NOT_READY` aus der Startnachprüfung; systemd beendete den
   Controller. Die Wartungssperre blieb vorhanden.

Das rohe Betreiberprotokoll mit privaten Netzwerkdaten wird nicht im
öffentlichen Repository abgelegt. Der Ausschnitt belegt weder abgeschlossene
Ersteinrichtung noch gültige Datenbank-/Lizenzbindungen. Das Fehlen eines
R6-Updatejournals und der R4-Pointer belegen keinen erfolgreichen R6-Wechsel.

## Technisch reproduzierbare Unverträglichkeiten

Der echte Host-Objektgenerator aus Controller 7.2.2 übernimmt `process.env`
unverändert in die Host-Metadaten. Dieses Node-Objekt besitzt einen besonderen
Prototyp. Die PostgreSQL-Dokumentprüfung weist es zurück; der äußere
Transaktionscode meldete anschließend nur `EOS_PG_TRANSACTION_FAILED`.
Die Korrektur lässt ausschließlich beim eigenen, autorisierten Host-Objekt
diese exakte Referenz zu und ersetzt ihren Inhalt durch ein leeres Objekt.
Prozess-Umgebungswerte werden damit nicht in Datenbank oder Ereignisse kopiert.
Die verbleibenden Dokument-, ACL- und Transaktionsprüfungen bleiben aktiv.
Dokumentfehler behalten künftig ihre festen Diagnosecodes.

Der originale PID-Helfer verwendet einen Pfad unterhalb des Controllerpakets.
Ein neuer, an die exakten ursprünglichen Dateien gebundener Build-Transform
verlegt ihn in das bereits erlaubte Datenverzeichnis. Er gilt nur für eine
neue signierte Lieferung. Der Releasebaum bleibt schreibgeschützt; Dienste
erhalten keine zusätzlichen Schreibpfade oder Berechtigungen.

Die Host-Schreibunverträglichkeit passt zum Betreiberfehler. Ein vollständiger
Nachweis auf diesem Pi steht aus. Die separat abgefangenen PID-Fehler werden
nicht als bewiesene alleinige Ursache des Bereitschaftsabbruchs bezeichnet.

## Abgebrochener Erststart

Der vorhandene R6-Updater verlangt einen abgeschlossenen Erststart und eine
freie Wartungssperre. Er ist auf den gemeldeten Zustand nicht anwendbar.
`tools/system/diagnose-first-start.cjs` liest ausschließlich begrenzte lokale
Dateien und gibt feste Zustandswerte bzw. boolesche Vergleiche aus. Er lädt
keinen installierten Code, verbindet sich nicht zur Datenbank, startet keinen
Dienst und verändert keine Sperre. Passwort-/Lizenzwerte, UUID, Setup-ID und
freie Fehlertexte werden nicht ausgegeben. Seine Ausgabe ist keine
Wiederherstellungsfreigabe.

## Prüfbelege und offene Grenzen

Die Teilberichte in diesem Verzeichnis nennen ausgeführte Befehle, Ergebnisse
und die jeweils verwendete Umgebung. Tests mit echten Controllerfunktionen
und SQL-Testdoubles belegen JavaScript-Verhalten, keinen nativen PostgreSQL-
oder Pi-Lauf. Ein separater nativer PostgreSQL-/Controllerlauf wird als eigener
Nachweis geführt; sein Ergebnis darf erst nach tatsächlichem Abschluss als
bestanden gelten.

Offen bleiben der gezielte Paketwechsel auf dem betroffenen Pi, vollständiger
Erststartabschluss, HTTPS-Anmeldung, Dienst-/Geräteneustart und Backup/Restore.
Physische Anlagenbefehle bleiben gesperrt. Keine Produktionsfreigabe oder
CRA-Konformitätsaussage.
