# NexoWatt EOS 1.0.10 – offizielle Stable-Version

## Anlass und überprüfte Fundstelle

GitGuardian meldete SMTP-Zugangsdaten im Repository NexoWatt/NexoWatt-ui.
Als Funddatei wurde `admin/react/assets/index-BDfvN-Y6.js` genannt.
Geprüft wurde die auf GitHub vorhandene Datei aus Commit `4e41f73`, die auch
im aktuellen Stand `2988b29` noch zusätzlich vorhanden war. Sie entspricht
bytegenau dem lokalen Frontend-Build aus 1.0.7.

SHA-256 der überprüften Datei:
`9b4920b9dcf0d3add7cdfb8306b73636c8cafcd4a58c969aa6035945669e6c12`

Im SMTP-Formular dieses Builds ist der Servername leer. Das Passwort startet
als leerer React-Zustand und wird beim Speichern aus dem Eingabefeld übernommen.
Fest enthalten sind die öffentliche Absender-/Benutzeradresse und Formulartexte,
einschließlich des HTML-Eingabetyps `password`, aber kein festes SMTP-Passwort.
Die Datei ist im aktuellen Einstieg nicht mehr referenziert.
Das spricht für einen Fehlalarm. Ohne den exakten GitGuardian-Match ist der
externe Vorfall damit noch nicht abschließend eingestuft. Es wurden keine
Zugangsdaten beim Mailanbieter ausprobiert und keine Live-Mails versendet.

## Änderungen

- SMTP-Login im Frontend anfänglich leer; die geschützte Admin-API liefert die
  Konfiguration nach Anmeldung. Der Absender bleibt `info@nexowatt.com`.
- Testpasswörter und Test-Systemschlüssel entstehen zufällig pro Testlauf.
  Lokale Mailtests verwenden ausschließlich den lokalen SMTP-Testserver.
- Schutzprüfung mit Node-Bordmitteln: fest zugewiesene SMTP-Passwörter,
  SMTP-URLs mit Zugangsdaten, bestimmte SMTP-Umgebungsvariablen, private Schlüssel,
  lokale Konfigurationsdateien und überholte Admin-Einstiegs-Bundles.
- Die Prüfung läuft vor der Artefaktprüfung (`npm run publish:check`) und damit
  auch vor dem regulären `npm publish`. Ein Fehler bricht die Prüfung ab.
- Optional aktivierter Pre-Commit-Hook prüft den tatsächlichen Git-Index,
  einschließlich bereits erfasster, inzwischen ignorierter Dateien.
  Fehlermeldungen nennen nur Datei, Zeile und Regel, niemals den Fundwert.
- Lokale Mailkonfiguration, Versandhistorie und temporäre Varianten werden
  zusätzlich vom Commit bzw. npm-Paket ausgeschlossen.
- Keine Änderungen an AC/DC-Regelung, Speichergrenzen oder Meldeintervallen.
  SMTP/Lizenz bleiben Admin-only; Kunden-SmartHome bleibt bedienbar.

## Einspielen und Schutz aktivieren

1. ZIP in ein frisches Verzeichnis entpacken. Nicht alle Dateien blind über einen
   alten Stand kopieren: Dadurch bleiben nicht mehr benötigte Bundle-Dateien liegen.
2. Beim Übertragen in das Git-Arbeitsverzeichnis veraltete generierte Dateien
   gezielt entfernen. Im geprüften GitHub-Stand waren dies:
   `admin/react/assets/index-BDfvN-Y6.js`, `admin/react/assets/index-CCQUiWc9.js`
   und `admin/react/assets/index-BVyQqQO2.css`. Nach diesem Update wird auch das
   bisher aktuelle `index-9CRyBUwD.js` durch den neuen Build ersetzt.
   Maßgeblich sind die Referenzen in `admin/react/index.html`; Kundendaten und
   nicht zugehörige Änderungen nicht löschen.
3. `npm run githooks:install` einmal im Git-Arbeitsverzeichnis ausführen.
   Der mitgelieferte Hook ist im ZIP vorhanden, wird aber nicht automatisch aktiv.
4. `npm run check:secrets` und `npm run release:check` ausführen. Bei einer
   Geheimniswarnung nicht die Prüfregeln pauschal abschalten.
5. Adapter neu starten und Browser neu laden. Vorhandene verschlüsselte
   SMTP-Einstellungen bleiben bestehen; danach als Admin eine Testmail auslösen.

Der lokale Hook kann umgangen werden und schützt nicht vor einem Upload über
die GitHub-Weboberfläche. Diese gezielte Musterprüfung ist keine umfassende
Secret-Scanning-Lösung: indirekte/verschleierte Geheimnisse, unbekannte Formate,
Binärinhalte und die gesamte Git-Historie sind nicht abgedeckt. GitGuardian und
verfügbare serverseitige Schutzfunktionen weiterhin nutzen; keine pauschale
Ausnahme für gebaute Dateien oder Tests einrichten.

## Falls doch ein echtes Passwort veröffentlicht wurde

Zuerst das Passwort/App-Passwort beim Mailanbieter widerrufen oder wechseln;
anschließend das neue Passwort ausschließlich in der geschützten Admin-Maske
eintragen. Beim Anbieter nach unbefugten Anmeldungen/Versand prüfen. Nur die
Datei zu löschen beseitigt Kopien, alte Commits und bereits abgeflossene Daten
nicht. Historienbereinigung und Abstimmung mit anderen Repository-Nutzern
separat planen; dieses Paket schreibt keine Git-Historie um.

Quellen: [GitHub: vertrauliche Daten entfernen](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
und [GitGuardian: SMTP-Detektor](https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/specifics/smtp_credentials).
Der beschriebene SMTP-Detektor bietet laut Dokumentation keine Gültigkeitsprüfung.

## Prüfumfang

Erfolgreich geprüft am 18.09.2026 unter Node.js 24.19.0:

- `npm run test:all`, einschließlich AC/DC-, Speicher-, SMTP-, Rollen- und
  neuer Sicherheitsregressionen. Chromium über `CHROMIUM_BIN` bereitgestellt.
- `npm run build:ts`, `npm run publish:check`, `node scripts/verify-publish.js`
  und `npm pack --dry-run --json --ignore-scripts`.
- Browserregressionen für SMTP-Einrichtung und Admin-/Installer-/Kundenrollen
  mit echtem gebautem Frontend, einschließlich SmartHome-Speichern und Neuladen.
- Paket-Startprüfung: Syntax und relative Abhängigkeiten von 197 JS/MJS-Dateien,
  Adapter-/EMS-/§14a-Startkette mit isolierten externen Stubs.
- Echte Git-Index-/Commit-Sperren, redigierte Diagnoseausgaben, Laufzeitdateien,
  SMTP-Muster und Erkennung alter Bundles.

Ein erster Gesamtlauf stoppte wegen eines nicht gesetzten Chromium-Pfads in der
Testumgebung; nach Bereitstellung dieses Pfads lief der vollständige Test erneut
erfolgreich durch. Dafür wurde keine Produktlogik angepasst.
Live-Hardware, Mailanbieter und GitGuardian-Incidentstatus müssen projektseitig
geprüft werden. GitHub wurde durch diese Paketbereitstellung nicht verändert.
