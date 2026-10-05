# EOS-Lizenzintegration OCPP: Änderung und Prüfung

Stand: 05.10.2026; Quellbasis `4e171e4` plus dieser Arbeitsstand. Node.js 24.19.0,
Linux x64. Anforderungen: EOS-Laufzeitbindung, zentrale Home-/Pro-Freigabe,
keine neuen Geräteaktionen ohne frische Freigabe, keine pauschale physische
Abschaltung bei Lizenzverlust. Die lokale Messagebox ist keine Sicherheitsgrenze
gegen kompromittierte Adapter unter derselben OS-Identität. Der gebündelte
Client 1.0.2 enthält keine Lizenzschlüssel oder Tokens und prüft die geschützte
aktive EOS-Release-/Profilbindung vor Start und bei jeder Lease-Erneuerung.

Der vollständige Client liegt in `packages/eos-license-client` und wird direkt
relativ geladen. Die npm-Dateiliste enthält JavaScript, Plattformprüfung,
Deklaration und Paketmanifest; es entsteht keine neue npm-Laufzeitabhängigkeit.
Quellcode-Dateihashes und bereinigte Testausgabe liegen unter
`reports/licensing-20261005/`. Unveränderte historische Prüfungen und Hinweise
behalten ihre eigenen Geltungsbereiche.

## Änderung und Sicherheitswirkung

Der Adapter startet erst nach zentraler `energy`-Freigabe; eine spätere
Aktivierung startet ihn automatisch. Jede neue Stationsautorisierung und jeder
Bedien-/RPC-/Smart-Charging-Schreibpfad wird geprüft. `_callClient` ist die letzte
gemeinsame Grenze vor einem ausgehenden Geräteaufruf. Ausschließlich interne
`TriggerMessage`-Abfragen für MeterValues/StatusNotification dürfen als reine
Telemetrie weiterlaufen. Die frei bedienbare RPC-Schnittstelle kann diese interne
Ausnahme nicht einschalten. Bereits empfangene TransactionEvent-Berichte bleiben
quittiert, erteilen ohne Freigabe aber keine neue Tokenakzeptanz.

Lizenzverlust beendet keine bestehende Verbindung und sendet keinen Reset,
Ladestopp oder Profil-Löschbefehl. Alte wartende Smart-Charging-Aufträge verlieren
ihre Generation; nach Reaktivierung ist ein neuer Sollwert erforderlich.
Geräteseitige Schutz- und Abbruchfunktionen bleiben zuständig.

## Ladepunktumfang und Migration

Neu ist `chargePointInventory`: vollständige physische Liste aus exakter
Stationsidentität, EVSE-ID und Connector-ID (OCPP 1.6: EVSE immer 1). Die Zahl wird
zentral als benötigte Menge angefragt und bei jeder Geräteaktion gegen die
aktuelle Freigabe geprüft. Getrennte Anschlüsse bleiben Bestandteil des Inventars.
Leeres Inventar sperrt Steuerung/Autorisierung bei weiterhin möglicher Diagnose;
unbekannte Zielstationen, nicht deklarierte beobachtete Anschlüsse und ungültige
Ziele werden verweigert. Reconnect löscht das beobachtete Inventar nicht.

Der bisherige synthetische Standardanschluss `1:1` war kein Bestandsnachweis.
Optionale Connector-Diagnoseobjekte sind standardmäßig aus und werden bereinigt;
sie dürfen keine lizenzierte Gesamtmenge vortäuschen. Deshalb ist die einmalige
vollständige Inventarisierung bestehender Instanzen eine notwendige Migration.
Das Feld enthält keine Schlüssel. Diese Prüfung reserviert keine globalen
Kontingente über mehrere Adapterinstanzen hinweg; Gesamtanlageninventar und
Lizenzumfang müssen bei der Inbetriebnahme zusätzlich abgeglichen werden.

## Ausgeführte Prüfung

`npm test` **BESTANDEN**: 25 Kernregressionen, 46 Paketprüfungen,
7 Lizenz-/Inventarregressionen und 13 lokale Transportprüfungen (einschließlich
Untertests): echter TLS-1.3/mTLS-Handshake, OCPP-Frame sowie negative Zertifikat-,
SAN-, TLS-1.2- und Klartextfälle. Die Lizenzsuite prüft spätere zentrale
Aktivierung, fehlende/veraltete Freigabe, unbekannten Umfang, alle drei
Autorisierungsprotokolle und Telemetrieerhalt.

Der zuvor leere/veraltete `tests.unit`-Aufruf ist durch die Lizenztests ersetzt.
`test:integration` bezeichnet nun ausdrücklich den vorhandenen lokalen echten
TLS/OCPP-Test. Der unveränderte generische ioBroker-Controller-Harness bleibt
als `test:controller:upstream` verfügbar und wurde **NICHT AUSGEFÜHRT**: ein
gewöhnlicher ioBroker-Start entspricht nicht der neu erforderlichen EOS-Bindung.
Ein erfolgreicher Management-Integrationstest ersetzt diese Protokolltests
oder einen realen EOS/OCPP-Gesamttest nicht.

## Offene Prüfung und Anlagenversuch

**OFFEN:** Pi/systemd, native kombinierte EOS-Admin/OCPP-Lizenzumschaltung,
Mehrinstanz-Gesamtkontingente und reale Stationsmodelle/Firmware. Keine
Produktions-, Anlagen-, CRA- oder IEC-Freigabe. Vor Update Backup und
Rückfallstand sichern; Inventar mit Herstellerdokumentation/Anlage abgleichen.
Im isolierten Anlagenversuch: ohne Lizenz keine Listeneröffnung, zentrale
Aktivierung startet automatisch, leeres/falsches Inventar blockiert Steuerung,
vollständiges zulässiges Inventar erlaubt neuen Testbefehl. Lizenz während einer
Ladung sperren: Messdaten weiter, kein automatischer Stop/Reset/Profilverlust,
neue Autorisierung und Befehle gesperrt. Erneut aktivieren: kein altes Replay;
neuen Sollwert bewusst senden. Geräte/Firmware und bereinigte Soll-/Ist-Belege
festhalten. Bei Fehler auf den gesicherten EOS-Lieferstand zurückfallen, den
Guard nicht deaktivieren.
