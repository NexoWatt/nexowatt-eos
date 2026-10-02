# Release Notes 7.9.96

## Behoben

1. Die Login-Karte skaliert ohne horizontale oder vertikale Innen-Scrollbalken und zeigt Fehlermeldungen vollständig.
2. Installateur und Endkunde erhalten die native Übersicht statt der separaten Aktionskachel-Überlagerung.
3. Der Fehler `claim is not defined` im Ablauf der persönlichen Erstkennwortvergabe wurde korrigiert.
4. Die UI-Adapter-Diagnose wird als read-only EMS-Kachel in der Übersicht angezeigt.

## EMS-Vertrag

Die Kachel liest `nexowatt-ui.*.info.adminOverview.*` und `system.adapter.nexowatt-ui.*.alive`. Sie schreibt keine Datenpunkte und besitzt keine Regelhoheit.
