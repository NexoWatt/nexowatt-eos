# Betriebssystem-Sicherheitsupdates: schreibgeschützte EOS-Anzeige

Stand: 2026-10-01. Die Änderung ergänzt die vorhandenen Einstellungen; sie erteilt der UI keine Hostrechte. Die tatsächliche Installation von Paketen erfolgt ausschließlich durch den getrennten, root-eigenen Host-Updater. Dieser Quellstand und seine UI-Tests sind keine Hardwareabnahme, kein Penetrationstest und kein CRA-Konformitätsnachweis.

## Schnittstelle und Vertrauensgrenze

`GET /api/system/os-updates` liegt hinter den bestehenden globalen Sitzungs-, Passwortwechsel- und Lizenzprüfungen und zusätzlich hinter `requireAuth` mit `frontend.open`. Service, Installateur und Benutzer erhalten dieselbe nicht geheime Zusammenfassung. Anonyme, abgelaufene, widerrufene oder unvollständig eingerichtete Konten erhalten keine Statusdaten. Es gibt keine Update-, Shell-, sudo- oder Neustartfunktion über diese Schnittstelle. Die Host-Automatik benötigt keine aktive UI-Sitzung.

`lib/os-update-status.js`, erzeugt aus der kanonischen TypeScript-Quelle, liest ausschließlich `/var/lib/nexowatt-eos-os-updates/status.json`. Der Pfad liegt außerhalb des schreibbaren Adapter-Datenbereichs. Jeder Vorfahr muss ein root-eigenes Verzeichnis ohne Gruppen-/Weltschreibrechte sein. Die Datei wird asynchron mit `O_NOFOLLOW | O_NONBLOCK` geöffnet und muss eine root-eigene reguläre Datei ohne zusätzliche Hardlinks und ohne Gruppen-/Weltschreibrechte sein. Ein 65.537-Byte-Puffer begrenzt den Inhalt auf 64 KiB; Dateigröße, Zeitstempel und UTF-8 werden geprüft. Das separate Werkzeug muss atomar ersetzen. Root selbst bleibt eine Vertrauensinstanz; die UI ist keine Sandbox gegen einen bereits kompromittierten Kernel oder Rootprozess.

Das v1-JSON wird typstreng geprüft: endliche ganzzahlige Zähler, definierte Zustände, UTC-Zeitstempel, boolesche bzw. explizit unbekannte Timerwerte und fest begrenzte Frische. Nur ausgewählte Felder werden neu aufgebaut. Paketlisten, Paketquellen, Pfade, SBOM-Dateiinhalte, freie Fehlermeldungen und Ursachenbeschreibungen werden nicht durchgereicht. Unbekannte Codes oder unpassende Strukturen werden abgelehnt. Die Anzeige unterscheidet geplante Automatik von zuletzt beobachtetem Timerzustand.

API-Vertrag:

```json
{
  "schemaVersion": 1,
  "availability": "unavailable",
  "health": "warning",
  "summary": null
}
```

`availability` ist `available`, `stale`, `future`, `invalid` oder `unavailable`. Gültige Zusammenfassungen erhalten HTTP 200, fehlende/ungültige/zukünftige Daten HTTP 503; alle Antworten bleiben `no-store`. Ein initialer `never-run`-Status darf Zeitstempel und Debianversion noch nicht kennen und bleibt eine Warnung. Daten älter als 36 Stunden, fehlende/veraltete Timerbeobachtungen oder Zeitstempel mehr als fünf Minuten in der Zukunft bestätigen niemals einen aktuellen Zustand. Ein kurzer gemeinsamer Cache von fünf Sekunden begrenzt Dateizugriffe; Frische wird bei jeder Anfrage erneut berechnet.

## Anzeige und Grenzen

Die Karte zeigt letzten Versuch/Erfolg, Prüfzeit, Automatik, beobachteten Timer, Sicherheits-/blockierte/zurückgehaltene Pakete, nötige Dienst-/Sitzungsaktivierung, Systemneustart und Quellenabdeckung. Debian, gemischte Raspberry-Pi-Herstellerupdates sowie separat freizugebende EOS-/Adapter-/Node-/Drittsoftware sind ausdrücklich abgegrenzt. Ein erfolgreicher Paketlauf allein ergibt keine positive Gesamtanzeige. Unbekannte Aktivierung, offene Pakete, deaktivierte Timer, Fehler oder Abdeckungslücken bleiben Warnungen.

Die Browserquelle setzt ausschließlich `textContent`. Es gibt höchstens einen Request mit fünf Sekunden Frist und regulär 60 Sekunden Abstand. Verborgene Tabs und Offlinebetrieb pausieren; Fehler überschreiben auch alte Zähler mit `Unbekannt`. Wiederherstellung aus dem Back/Forward-Cache startet mit Warnung und neuer Anfrage. Das Produktdesign nutzt die vorhandenen Einstellungs-Karten und ergänzt eine gelbe Warnüberschrift.

## STRIDE-Betrachtung

| Bedrohung | Maßnahme | Grenze / Nachweis |
| --- | --- | --- |
| Identität vortäuschen | Bestehende Sitzung/Revision/Rollenprüfung vor Dateilesen | Echte TLS/Express-Endpunkttests mit Controllerfixture |
| Status manipulieren | Root-Verzeichnisgrenze, No-follow, Dateirechte, enges Schema | Dateisystemmetadaten im Unit-Test simuliert; Root bleibt vertrauenswürdig |
| Vorgänge abstreiten | UI nennt getrennte letzte Versuchs-/Erfolgs-/Prüfzeiten | Keine eigenständige manipulationssichere Host-Auditablage durch die UI |
| Daten offenlegen | Nur nicht geheime Auswahlfelder, keine Rohfehler/Paketlisten/Pfade | Negativtests für unerwünschte Felder |
| Verfügbarkeit beeinträchtigen | Begrenzter Puffer, gemeinsamer Leseauftrag, kurzer Cache, Browserfrist | Kein Nachweis eines vollständigen Ressourcen-/DoS-Pentests |
| Rechte erweitern | Reine GET-Route, keine Kommandos oder Rootrechte | POST ohne Route; bestehende Authentifizierung bleibt vorgeschaltet |

## Prüfungen und verbleibende Arbeiten

Reproduzierbar mit Node 24.21.0 und vorhandenen Offline-Abhängigkeiten:

```bash
node scripts/build-ts-runtime-executables.js --check
node --test --test-reporter=tap test/eos-os-update-status.test.cjs
node scripts/generate-code-documentation.cjs
node scripts/verify-code-documentation.cjs
```

`scripts/verify-eos-os-updates-browser.cjs` nutzt vorhandene Puppeteer-/Chromium-Module über absolute `EOS_TEST_BROWSER_PUPPETEER`/`EOS_TEST_BROWSER_CHROMIUM_MODULE`-Pfade. Es prüft echte Einstellungen/DOM und authentifizierte HTTPS-Route, aber Controller- und Updaterdaten bleiben lokale Fixtures. Das Zertifikat wird über genau den temporären SPKI akzeptiert, externe Browseranfragen sind blockiert. Der Chromium-Sandboxmodus ist in der isolierten Root-Testumgebung deaktiviert; daraus folgt keine Zielsystem-Härtungsbestätigung.

Rohbelege und Desktop-/Mobilansichten liegen in `reports/security/os-updates-20261001/`. Der erste Browserversuch wartete auf Netzwerkruhe und lief wegen der regulären SSE-Verbindung in das Navigationszeitlimit. Die Korrektur wartet auf DOM-Laden plus den konkret gerenderten Kartenstatus; der ursprüngliche Fehler bleibt dokumentiert. Ein anfänglicher Testausdruck verwechselte den erlaubten Enumwert `complete-for-configured-origins` mit einem verbotenen JSON-Feld und wurde auf tatsächliche Feldnamen eingegrenzt.

Offen bleiben echte Debian-/Pi-Durchläufe, Paket-/Dienstneustarts unter Anlagenlast und Auswirkungen auf Regelungs- und Geräteprozesse. Bestehende Produktfreigabehindernisse, insbesondere die Redis-TLS-Sicherheitsbewertung und die Node-Laufzeitbindung, werden durch eine positive UI-Testanzeige nicht geschlossen. Keine neuen npm-Abhängigkeiten; die SBOM des tatsächlichen späteren Builds muss vom Freigabeprozess neu erzeugt werden.
