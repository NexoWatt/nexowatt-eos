# NexoWatt EOS Admin 7.10.11

Die Anmeldung ist im Sicherheitsprofil verpflichtend. Ein alter `auth=false`-Wert wird zur Laufzeit für HTTP und WebSockets übersteuert; eine Standardbenutzer-Identität ohne Anmeldung gewährt keine Rechte. Der gespeicherte Altwert ist keine Ausnahme vom Schutzprofil.

Sicherheits- und Lizenz-Integrationsstand vom 30.09.2026. Vollständiges Repository,
kein Admin-8-Rebase und keine bescheinigte IEC-/CRA-Konformität.

Aktueller Quellstand vom 07.10.2026: Der separate Hersteller-Keygen erzeugt
**NWL3-Systemlizenzen für Home oder Pro und die System-UUID**, ohne zusätzliche
Adapterauswahl. Die Mengen und Funktionen folgen der zentralen Produktpolicy.
Alte NWL2-Lizenzen behalten ihre engeren signierten Bedingungen. Der Admin
speichert den Code mit AES-256-GCM verschlüsselt und gibt kurze, geprüfte
Berechtigungen an den gemeinsamen Adapter-Client weiter. Private
Herstellerschlüssel gehören niemals in dieses Repository oder auf Kundengeräte.

Die Lizenzseite zeigt nach bestätigter Aktivierung deutlich „EOS Home/Pro
aktiviert“, Gültigkeit und letzten Prüfzeitpunkt. Das Codefeld wird **erst nach
erfolgreicher Speicherung und Rückprüfung** geleert; es ist kein Statusfeld.
Nach erneutem Öffnen wird die gespeicherte Lizenz wieder geprüft. Bei einem
Fehler bleibt die Eingabe erhalten, bei Verbindungsverlust ist der Status
ausdrücklich unbestätigt. Details und Fehlerhilfe:
[Lizenzstatus und Import](docs/licensing/ISSUER_AND_STORAGE.md#aktivierungsstatus-und-fehlerhilfe-07102026).
Dies beschreibt Quellcode, nicht automatisch den installierten Pi-Stand.

**Vor einem Update den Wiederzugang sicherstellen:** Unverschlüsseltes HTTP wird
auch bei alter LAN-Konfiguration nur noch an Loopback gebunden. Für Fernzugriff
vorher funktionierendes HTTPS oder einen kontrollierten SSH-Tunnel einrichten.
Bestehende Sitzungen müssen neu angemeldet werden. Ungeprüfte automatische Updates
und die bisher ohne eigene Authentifizierung gestartete externe MCP-Erweiterung
werden im Sicherheitsprofil nicht ausgeführt.

Einrichtung und Prüfgrenzen:

- [Installation, Test und Rückfall](docs/operations/SECURITY_LICENSING_TEST_7.10.11.md)
- [Prüfergebnis und offene Freigabeschritte](reports/security/RELEASE_REVIEW_7.10.11.md)
- [Zentrale Adapter-Anbindung](docs/licensing/ADAPTER_INTEGRATION.md)
- [Hersteller-Keygen, Trust-Provisionierung und Ablage](docs/licensing/ISSUER_AND_STORAGE.md)
- [CRA-/IEC-Arbeitsliste](docs/cra/CRA_IEC_GAP_ANALYSIS_2026-09-30.md)

Der Client sperrt ohne gültige aktuelle Freigabe. Andere installierte Adapter
werden dadurch noch nicht umgebaut: Ihre vollständigen Quellen, tatsächlichen
Betriebsbefehle und gerätespezifischen sicheren Zustände müssen einzeln integriert
und auf dem Testsystem geprüft werden. Systemweite Mengen müssen gemeinsam
gezählt werden, damit mehrere Instanzen die Lizenzgrenzen nicht umgehen.

Der normale Build, die tatsächlichen Abhängigkeiten, der reale ioBroker-Stack und
die Anlage benötigen die im Prüfbericht aufgeführten Freigaben. Historische
Dokumente früherer Versionen im Repository gelten nicht als aktueller Nachweis.
