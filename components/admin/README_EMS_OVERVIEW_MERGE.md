# NexoWatt EOS Admin – EMS Live-Diagnose Merge

Dieses Merge-Paket erweitert die Cockpit-Übersicht des aktuellen EOS-Admin-Repositorys um eine große, responsive **NexoWatt EMS – Live-Diagnose**.

## Voraussetzungen

- aktueller Quellordner `ioBroker.eos.admin` (gegen den aktuellen 7.9.94-Quellstand und dessen stabile Intro-Anker vorbereitet);
- vorhandene `node_modules` für den normalen Admin-Build;
- NexoWatt UI **0.8.198 oder neuer** mit `info.adminOverview.*`;
- vor der Veröffentlichung muss eine noch freie neue EOS-Admin-Version gesetzt werden.

## Anwendung unter Windows

1. Aktuellen EOS-Admin-Quellordner sichern beziehungsweise committen.
2. Den Inhalt dieser ZIP in den Stamm des EOS-Admin-Repositorys kopieren.
3. `MERGE_UPDATE.cmd` ausführen.
4. Das Skript integriert die Komponente, baut das Frontend und führt die vollständigen EOS-Paket- und Stabilitätsprüfungen aus.
5. Danach über den vorhandenen EOS-Releaseablauf eine **noch freie neue Version** setzen.
6. `npm publish --dry-run` und anschließend `npm publish` ausführen.

## Verhalten

- Polling höchstens alle fünf Sekunden und nur bei sichtbarem Browserreiter.
- Keine ioBroker-State-Schreiboperationen aus EOS Admin.
- Kein NexoWatt-UI-Adapter: verständliche Leermeldung.
- Adapter offline oder Diagnose älter als 20 Sekunden: Warn-/Fehlerstatus.
- Fehlende Module wie Speicher, Tarif, PV-Prognose oder §14a werden automatisch ausgeblendet.
- Admin/Service und Installateur sehen technische Soll-/Istwerte; Endkunden erhalten eine reduzierte Erklärung.
- Maximal sechs aktuelle Ereignisse werden dargestellt.

## Wichtige Abgrenzung

Diese ZIP ist ein **Merge-Paket**, kein eigenständiges npm-Publish-Repository des EOS Admin. Der abschließende Build erfolgt absichtlich im aktuellen Admin-Quellstand, damit vorhandene Rollen-, Login-, Update- und Stabilitätsfunktionen vollständig mitgeprüft werden.


## Sichtbarer Inhalt der Kachel

- EMS-Aktualität und Zykluszeit;
- Gesamt-, Rest- und PV-Budget;
- bindende Netz-/Stations-/Phasen-/§14a-/Safety-Grenze;
- Ladepunkt-Soll/Ist und Warte-/Fehlerzähler;
- Speicher/Speicherfarm mit SoC und Soll/Ist;
- Tarif-, Forecast- und Peak-Shaving-Status;
- aktuelle Regelentscheidungen und die letzten sechs verdichteten Ereignisse;
- Deep-Link zur vollständigen Diagnose im NexoWatt-UI-Adapter.
