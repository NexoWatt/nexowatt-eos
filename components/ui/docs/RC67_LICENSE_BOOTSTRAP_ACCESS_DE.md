# NexoWatt UI RC67 – Lizenzaktivierung auf neuen Systemen

## Zweck

RC67 korrigiert den Erstinbetriebnahme-Pfad eines noch nicht lizenzierten NexoWatt-EOS-Systems. Die allgemeine Lizenzsperre darf die Lizenzverwaltung selbst nicht blockieren.

## Verhalten

- `/license.html` bleibt auch ohne aktive Lizenz technisch erreichbar.
- Vor Anzeige von System-UUID und Lizenzfeld ist weiterhin eine echte EOS-Admin- oder Installer-Anmeldung erforderlich.
- Die Endpunkte `/api/license/info` und `/api/license/save` bleiben serverseitig durch `license.manage` geschützt.
- Nach erfolgreichem Speichern wird die Lizenz sofort geprüft und in die laufende Adapterinstanz übernommen.
- LIVE, Einstellungen, AppCenter, Simulation und alle weiteren lizenzpflichtigen Bereiche bleiben bis zu einer gültigen Lizenz unverändert gesperrt.

## Enger Bootstrap-Vertrag

Ohne Lizenz dürfen nur folgende Pfadgruppen das allgemeine Lizenz-Gate passieren:

1. Lizenzseite und minimale statische Dateien (`license.html`, `auth.js`, `license.js`, Styles und Logo)
2. strikte Installer-/Admin-Session-Endpunkte
3. streng rollen-geschützte Lizenz-APIs

Es existiert kein allgemeiner `/static/*`- oder `/api/*`-Bypass.

## Inbetriebnahme

1. Im EOS Admin den Bereich **Lizenz** öffnen.
2. Auf der Runtime-Seite mit EOS-Admin- oder Installer-Zugangsdaten anmelden.
3. System-UUID kopieren beziehungsweise den bereitgestellten Lizenzschlüssel eintragen.
4. **Speichern** auswählen.
5. Bei gültiger Lizenz werden die übrigen EOS-Bereiche sofort freigeschaltet. Ein Adapterneustart ist normalerweise nicht notwendig.
