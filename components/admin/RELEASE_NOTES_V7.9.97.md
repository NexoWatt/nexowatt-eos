# Release Notes 7.9.97

## Anmeldung

- Rückkehr zur bewährten kompakten Kartenstruktur.
- Außenrahmen und Formular sind nur ungefähr sieben Prozent größer als der frühere stabile Stand.
- Meldungen wachsen innerhalb der Karte, ohne Scrollleisten oder überlange Eingabefelder.
- Laufzeitskripte verändern keine Breite, Höhe oder Padding der Karte mehr.

## Übersicht und EMS

- Admin, Installateur und Endkunde nutzen dieselbe native Intro-Kartenkomponente.
- Die NexoWatt-UI-Karte bleibt für freigegebene Rollen sichtbar.
- Die EMS-Live-Diagnose übernimmt die produktive EOS-Admin-Verbindung und liest ausschließlich `info.adminOverview.*`.
- Mindestversion für den vollständigen Publisher: NexoWatt UI `0.8.198`.

## Sicherheit

Keine Änderung an Geräte-/Setpoint-Schreibwegen. Die Diagnose bleibt vollständig read-only.
