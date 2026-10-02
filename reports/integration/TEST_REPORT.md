# Prüfbericht: Komponenten, aktuelles UI und RPi-5-Profil

Stand: 30.09.2026; Architekturrevision `2026-09-30.3`. Die initiale Komponentenaufnahme ist im lokalen Commit `0e34142a` gesichert und baut auf `8da1152d556625bb8173fc8b5953d0caaef992f1` auf. Die aktuelle Erweiterung nimmt das vom Nutzer bestätigte UI-Archiv 1.0.21 auf. Geändert wurden Architektur-/Integrationsdaten, Dokumentation und der lokale Komponenten-SBOM-Generator samt Tests. Keine Installer- oder Adapterproduktdatei wurde in dieser Integrationsetappe geändert, kein Paket auf einem Gerät installiert.

## Tatsächlich geprüfter Umfang

| Prüfgruppe | Ergebnis | Bedeutung |
|---|---|---|
| Blueprint | 31 Tests bestanden | Architektur-/Referenzkonsistenz; Quellenbeobachtung bedeutet keine Isolation oder Freigabe |
| Komponenten-SBOM-Generator 0.2.1 | 29 Tests bestanden | Getrennte Git-/Archivherkunft, Controller im Scope, keine erfundenen Remote-Commitlinks oder Installed-/Complete-Angaben |
| Vertragsvalidator | 31 Tests bestanden | Schema-/Semantikprüfung; keine echte Authentifizierung oder TLS-Ausführung |
| Installer-Quell-SBOM-Generator | 21 Tests bestanden | Bestehende begrenzte SBOM-Vorbereitung bleibt funktionsfähig |
| Admin 7 | 5 isolierte Assertions bestanden | Unsichere Erstkonten/HTTP und positive Rollenprüfung reproduziert |
| Devices | 13 isolierte Assertions bestanden | Kontrollen und offene HTTP-/MQTT-/Migrationspunkte mit Stubs geprüft |
| EEBUS / OCPP | 7 isolierte Assertions bestanden | Identitäts-/Handshake-/Servergrenzen im Quellausschnitt reproduziert |
| Backitup | 6 isolierte Assertions bestanden | Offene TLS-/Dateiserverkonfiguration; positiver Test hält Token aus argv |
| UI 1.0.21 | 10 isolierte Assertions bestanden | HTTP, anonyme Kundensteuerung, Lizenz-/Session-/Parserbefunde und wirksame Kontrollen |
| Vorhandene OCPP-Core-Suite | 25 Tests bestanden | Reine Core-Funktionen, kein kompletter Adapter-/Gerätetest |
| Vier vorhandene UI-Skripte | 4 Skripte bestanden | Drei synthetische Funktionsregressionen und eine Strukturprüfung; keine Gesamtabnahme |
| Backup-Publish-Validator | **Fehlgeschlagen, Exit 1** | Zwei erwartete Builddateien fehlen; kein erfolgreicher Build behauptet |

**112 Werkzeugtests**, **41 gezielte Quellassertionen**, **25 vorhandene OCPP-Coretests** und **vier vorhandene UI-Prüfskripte** sind unterschiedliche Nachweisgruppen. Die 41 Quellassertionen zählen nicht als behobene Befunde oder bestandene Produktsicherheitsanforderungen. Wiederholungen werden nicht aufsummiert. Der erste Backup-Reproduktionsversuch gegen eine fehlende Builddatei scheiterte; sein Rohbeleg bleibt archiviert.

## Belegbindung und Historie

- Aktuelle Werkzeugläufe: `ui-extension-test-results.json` und `ui-extension-checks/`. Nach Review wurde Generator 0.2.1 gezielt erneut geprüft; vorherige 0.2.0-Logs bleiben als überholte Zwischenstände erhalten.
- Initiale Integration: `tool-test-results.json` und `tool-checks/` dokumentieren den damaligen Stand mit 106 Werkzeugtests. Diese Zahl wird nicht zum aktuellen Ergebnis addiert.
- UI-Quellreproduktionen: `ui-source-reproduction.tap`, Testskript und Hashbindung in `system/integration/ui-security-observations.json`.
- Vorhandene UI-Prüfungen: `ui-existing-tests.json` und `.log`; Befehle, Zeiten, Skripthashes und genaue Grenzen enthalten.
- Aktuelle Änderungshashes: `UI_EXTENSION_FILE_EVIDENCE.json`. `FILE_EVIDENCE.json` bleibt historische Evidenz der initialen Integration im Commit `0e34142a`; seine Hashes dürfen nicht mit später veränderten Dateien gleichgesetzt werden.

Das Register `system/integration/finding-register.json` enthält **33 offene Befunde und Integrationspunkte**. Fünf UI-Punkte sind als konkrete Quell-/Stubbefunde beschrieben; beim sechsten ist nur die Parser-Ausnahme reproduziert, nicht ihre Server-/DoS-Wirkung. Controllerbeobachtungen stehen zusätzlich im eigenen Bericht. Diese Liste ist keine CVE-Liste.

## Umgebung, Umsetzung und Validierung

Linux-x86-64-Entwicklungscontainer, Python 3.12 mit gebundener Werkzeugumgebung, Node.js 24.19.0. Keine echten Netzwerklistener, Hardwarebefehle oder Root-Hostaktionen in den Reproduktionen. Befehle und Quellverzeichnisse: `REPRODUCTION_GUIDE.md`.

Die Quell-SBOM enthält jetzt neun beobachtete Quellpakete, geprüft gegen die offiziellen lokal gebundenen CycloneDX-1.7-Schemas und zusätzliche semantische Grenzen. UI-Herkunft ist ein Nutzerarchiv; der angegebene GitHub-Ursprung bleibt ungeprüft. Git-Origin und beobachteter Commit sind getrennte Angaben: insbesondere wurde der lokale Installer-Commit nicht auf GitHub veröffentlicht. Manifesthashes sind keine Paket-/Imagehashes. Die SBOM bleibt ausdrücklich `pre-build`/`incomplete` ohne vollständigen Abhängigkeitsbaum.

Der UI-Upload enthält 2.098 Dateien; die Extraktion blieb byteidentisch. Design- und Regeldateien wurden nicht verändert. Der UI-Adapter enthält heute auch EMS-/Lade-/Speicher-/Netz-/Mesh-Logik. Logische Core-/UI-Zielgrenzen sind noch keine tatsächlich isolierten Prozesse. Die deklarierte UI-Kompatibilität Node >=22, Controller >=6.0.11 und Admin >=7.0.0 ist kein Nachweis der Geräteversionen.

Die CI wurde lokal vorbereitet; GitHub Actions wurde nicht ausgeführt. Die vorherige YAML-/Shellsyntaxprüfung bleibt als historischer Nachweis des unveränderten Workflows erhalten. Keine Produkt-Sicherheitsfreigabe aus den lokalen Werkzeugtests ableiten.

## Grenzen und Freigabehindernisse

Keine komplette EOS-Installation, kein vollständiger Adapterbuild, kein vollständiger Produkt-Schwachstellen-/Lizenzscan. Keine visuelle/fachliche Gesamtregression, kein echter TLS-/mTLS-Handshake, keine echte Rücksicherung, kein Stromverlust-/Update-/Hardwaretest und keine unabhängige Penetrationsprüfung. 40 geplante Produkttests und sieben Hardwareprüfungen bleiben unausgeführt.

Die genaue Distribution, Architektur und installierten Versionen fehlen weiterhin; die aktuelle UI-Quelle fehlt dagegen nicht mehr. Hohe/P1-Befunde und fehlgeschlagener Backup-Publish-Check bleiben offen. Produktionsfreigabe, CRA-/IEC-Konformität und Erhalt sämtlicher Produktfunktionen werden nicht bescheinigt. Dieser Quellstand ist noch kein fertig gehärtetes Gesamtsystem.
