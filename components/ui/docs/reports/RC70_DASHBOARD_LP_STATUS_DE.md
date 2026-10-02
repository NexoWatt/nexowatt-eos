# NexoWatt UI 0.8.195 RC70 – Dashboard-Ladepunktstatus

RC70 korrigiert zwei ausschließlich darstellungsbezogene Punkte im LIVE-Dashboard. Die Lade-, Speicher-, Tarif-, §14a-, Betriebsstrategien- und Hardware-Writer-Logik bleibt unverändert.

## Details-Link nur bei mehreren Ladepunkten

Die separate Lademanagement-Übersicht ist für Stationen mit mehreren aktiven Ladepunkten vorgesehen. Deshalb gilt jetzt:

- genau ein aktiver Ladepunkt: „Details“ wird ausgeblendet und ist weder per Maus noch per Tastatur aufrufbar;
- mindestens zwei aktive Ladepunkte: „Details“ wird sichtbar und öffnet weiterhin `evcs.html`;
- deaktivierte oder alte Runtime-Ladepunkte werden bei der Zählung nicht berücksichtigt.

## Gewählten Modus korrekt anzeigen

Das Dashboard unterscheidet nun zwischen:

- `userMode`: vom Kunden gewählter Modus, zum Beispiel Auto, Boost, Min+PV oder PV;
- `effectiveMode`: aktuell wirksamer Auto-Untermodus, zum Beispiel PV-orientiertes Warten innerhalb von Auto.

In der kompakten Ladepunktzeile wird immer der gewählte Kundenmodus angezeigt. Steht der Ladepunkt auf Auto, erscheint daher „Auto“ und nicht fälschlich „PV“. Der wirksame Untermodus bleibt weiterhin für die fachliche Begründung verfügbar, sodass beispielsweise „Wartet auf PV-Überschuss“ korrekt angezeigt werden kann.

## Sicherheits- und Regelungsvertrag

RC70 ist eine rein lesende Präsentationskorrektur. Es werden keine neuen Steuerbefehle, Sollwerte oder Datenpunkt-Schreibpfade eingeführt.
