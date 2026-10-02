# 0.7.83 – Shadow-Diagnose Bedienbarkeit und Core-Limits-Abgleich

Diese Version ist ein kleiner Stabilisierungs- und Diagnose-Schritt innerhalb der TypeScript-Migration.

## Warum dieser Schritt nötig war

Im App-Center wurden Shadow-Diagnosefehler angezeigt, obwohl die produktive Runtime weiterhin korrekt über JavaScript lief. Außerdem klappte die JSON-Anzeige durch den 2-Sekunden-Refresh sofort wieder zu.

## Änderungen

- Shadow-Abweichungen werden als `ABWEICHUNG` angezeigt, technische Parser-/Runtime-Probleme bleiben `FEHLER`.
- JSON-Diagnosen öffnen jetzt in einem separaten Dialog, damit sie beim automatischen Refresh nicht wieder schließen.
- Prozentkodierte Texte wie `%20` werden vor der Anzeige wieder lesbar dekodiert.
- Core-Limits-TS-Shadow bekommt den aktuellen JS-Gesamtbudget-Deckel, damit unterschiedliche Budgetbegriffe nicht als falscher Fehler erscheinen.

## Wichtig

Diese Version ändert keine produktive EMS-Logik. Energiefluss, Core-Limits und Heizstab bleiben weiterhin über die bestehende Runtime geführt. Die Änderungen betreffen Diagnose, Anzeige und Shadow-Abgleich.

## Nächster Schritt

Nach erfolgreichem Test kann 0.7.84 den Energiefluss-TS-Kandidatenmodus weiter auswerten oder – falls alle Shadow-Werte sauber sind – die nächste kontrollierte Umschaltvorbereitung starten.
