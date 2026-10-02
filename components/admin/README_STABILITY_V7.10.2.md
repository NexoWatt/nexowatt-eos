# NexoWatt EOS Admin 7.10.2 – reparierter Stable-Kandidat

Version 7.10.2 ist ein gezieltes Stabilitäts-Hotfix für den fehlerhaften Stand 7.10.1. Die Oberfläche und die bereits freigegebenen Funktionen aus 7.10.1 bleiben erhalten.

## Behobene Fehler

- Die automatische NexoWatt-Stable-Updateverwaltung schreibt ihren Laufzeitstatus nicht mehr in `system.adapter.eos-admin.0.native`. Dadurch wird die laufende EOS-Admin-Instanz beim Start nicht mehr fortlaufend neu gestartet.
- Die erste Synchronisierung der Stable-Update-Richtlinien erfolgt erst nach einer Startschutzzeit. Der HTTP-Server kann JavaScript- und CSS-Dateien vollständig ausliefern, bevor Repository-Richtlinien geprüft werden.
- Der Update-Manager beendet alle Zeitgeber beim Herunterfahren des Webservers.
- Das geprüfte Backend ist vollständig vorkompiliert und über ein SHA-256-Manifest versiegelt. `npm publish` und `npm pack` benötigen deshalb keine lokalen TypeScript-/TSX-Entwicklungswerkzeuge und starten weder `tsc` noch `tsx`.
- Ein Backend-Runtime-Test prüft alle lokalen `require`-/Import-Abhängigkeiten, ihre Syntax und ihre Abdeckung durch die explizite npm-Dateiliste. Er startet dabei keinen verschachtelten `npm pack`-Prozess mehr, damit `npm publish` unter Windows nicht beim Aufruf von `npm.cmd` abbricht.
- `build/lib/eosRequestSecurity.js` ist fest Bestandteil des geprüften Runtime-Artefakts.

## Unverändert übernommen

- Native ioBroker-Passwortverwaltung ohne erzwungene EOS-Erstpasswortseite.
- Dauerhafter vertikaler Cockpit-Scrollbereich.
- Bearbeiten-Stift innerhalb des unteren Kartenrasters.
- Rollen- und Sicherheitssystem des 7.10.1-UI-Baselines.
- Automatische Stable-Updates ausschließlich für installierte NexoWatt-Adapter; durch Admin/Service abschaltbar.
