# NexoWatt EOS Admin 7.10.10 – Sicherheits- und Lizenzprüfstand

Datum: 30.09.2026. Status: **Integrations-Teststand, keine allgemeine Produktionsfreigabe und kein IEC-/CRA-Konformitätsnachweis.** Keine Veröffentlichung und keine Änderung eines Live-Geräts vorgenommen.

## Ergebnis und Lieferumfang

Die hochgeladene vollständige Version 7.10.9 wurde geprüft und als 7.10.10 weiterentwickelt. Der Dateiname eines früheren Admin-8-Versuchs ist kein Herkunftsnachweis; dieser Stand enthält ausdrücklich keinen Admin-8-Rebase. Eingangshash: `input-provenance.json`. Vollständige Quellen, vorhandene Frontendbasis, aktualisierte Backend-Runtime, neue Lizenzverwaltung, SDK, Tests und Nachweise liegen gemeinsam in der Repository-ZIP.

Neu sind serverseitige Ed25519-Lizenzprüfung für Home/Pro mit UUID-, Adapter- und Mengenbindung, AES-256-GCM-Ablage außerhalb des Pakets, Administrator-Lizenzoberfläche, begrenzte Messagebox-Freigaben sowie ein gemeinsam verwendbarer Adapter-Guard. Die Lizenzdatei enthält keine lesbaren Lizenzdaten. Öffentlicher Herstellerschlüssel und privater lokaler Ablageschlüssel sind getrennt. Weder Hersteller-Signierschlüssel noch produktive Testlizenzen werden ausgeliefert.

Der Guard sperrt ohne gültige Antwort, bei falscher Nonce, Manipulation, Ablauf, fehlender Funktion, überschrittenen Mengen und Dienstverlust. Nach asynchronen Schritten muss der Verbraucher unmittelbar vor jedem Betriebsbefehl erneut prüfen. Eine übersehene Schreibstelle ist weiterhin ein Integrationsfehler; die mitgelieferte SDK-Datei allein sperrt keine anderen vorhandenen Adapter.

Die Lizenzprüfung ist eine geschäftliche Berechtigung, kein Ersatz für Benutzerrechte, Netzschutz oder physische Sicherheitsfunktionen. Admin-/Wiederherstellungs-/Sicherheitszugänge bleiben erreichbar. Vollständiger Schutz gegen root, manipulierten JavaScript-Code, kompromittierte gleichberechtigte Adapter oder ein komplett geklontes Gerät wird ausdrücklich nicht behauptet.

## Konkret behobene Grenzen

| Bezug | Änderung | Nachweis |
|---|---|---|
| LIC-01 | Ausschließlich explizite öffentliche Ed25519-Prüfschlüssel; Signatur, UUID, Edition, Zeiten, Adapterliste und Mengen streng geprüft | test/eos-license-core.test.cjs |
| LIC-02 | AES-GCM, zufälliger lokaler 32-Byte-Schlüssel, frische Nonce, UUID-AAD, private Dateirechte, atomarer Austausch; beschädigte Dateien/fehlende Schlüssel sperren | Reale temporäre Dateisystem-/Kryptografietests im Core |
| LIC-03 | Maximal 15 s Freigabe, 5 s Wiederprüfung, Nonce, begrenzte Anfragen/Queue, 2-s-Datenbankfrist, kein späterer Grant nach Shutdown | Service- und SDK-Tests |
| LIC-04 | Admin-Rolle, gültige Sitzung, HTTPS/Loopback, strikter Origin, Parser erst nach Guard, begrenzte Eingabe, keine Schlüsselrückgabe | HTTP-Handler-Harness und Quellprüfung der Routen; echte Express/TLS-Integration offen |
| LIC-05 | Fester monotoner Zeitanker und verschlüsselter Zeit-Höchststand gegen einfache Uhrenmanipulation | Gefrorene/schleichend rückläufige Uhr erst reproduziert, dann Regression bestanden; kein Hardware-Antirollback |
| EOS-AUTH/EXEC/HTTP | Gemeinsame Kontenpasswörter gesperrt, individuelle Reset-Kennwörter, Sitzungsablauf-/Konten-/Gruppenprüfung, beschränkte Upload-/Befehlsrechte, Origin-/Pfadgrenzen, atomare Rollenaktualisierung | docs/security/AUDIT_BACKEND_2026-09-30.md und ausgelieferter Backend-Verhaltenstest |
| EOS-SECRET-001 | Statischen Sitzungs-Fallback entfernt; neues Zufallsgeheimnis muss vor Serverstart erfolgreich persistieren | Neue OnReady-Regressionen im Backend-Grenztest |
| PKG-01 | Versionen/Laufzeitdateien synchronisiert; Cleanup löscht ausdrücklich gelieferte Regressionstests nicht mehr; SDK/Tests in Integritätsmanifest aufgenommen | Paket-/Versions-/Cleanup- und Manifestprüfungen |

## Prüfverfahren und Aussagegrenzen

Abschlusslauf: Paketprüfung und vollständige vorhandene Stabilitätskette bestanden; **74/74 Lizenztests**, **37/37 Backendtests** und **8/8 simulierte Browser-Prüfungen** bestanden. Der npm-Pack-Dry-Run enthält alle neuen Runtime-, SDK- und UI-Dateien. Diese Zahlen bezeichnen die jeweils abgegrenzten Testgruppen; mehrfach in Sammelläufen ausgeführte Fälle werden nicht zusätzlich gezählt.

Die abschließenden tatsächlich ausgeführten Kommandos, UTC-Zeiten, Laufzeitversionen und Rückgabecodes stehen in `raw/final/results.json`; rohe Ausgaben direkt daneben. Lizenztests nutzen echte Node-Kryptografie und echte temporäre Dateien, aber simulierte ioBroker-Datenbank-/Transportgrenzen. Backendtests führen tatsächliche ausgelieferte JavaScript-Methoden in einer isolierten Umgebung aus; Upload-Parserverdrahtung wird zusätzlich statisch geprüft. Browseransichten verwenden simulierte Statusantworten. Kein unabhängiger Penetrationstest und kein Anlagen-/Controller-/OAuth-Integrationstest wurden ausgeführt.

Normale Buildabhängigkeiten waren nicht installiert; der Registry-Abruf scheiterte in dieser Umgebung. Deshalb wurden die betroffenen TypeScript-Dateien mit dem beschriebenen lokalen Fallback (Node-TypeScript-Stripper plus Babel CommonJS ohne Interop-Uminterpretation) erzeugt und syntaktisch bzw. verhaltensbezogen geprüft. Der unveränderte große React-Build stammt aus dem Eingangspaket; nur gezielte JS-Overlays/HTML wurden bearbeitet. **Vollständiges tsc, regulärer Backend-/Frontend-Build und tatsächliches npm ci bleiben offen.** Provenienz und Grenzen: `fallback-build-provenance.json`, `SUPPLY_CHAIN_AND_BUILD_AUDIT.md`.

SBOMs sind maschinenlesbare CycloneDX-Referenzen der vorhandenen Lockfiles, keine behauptete Live-/Build-SBOM. 563 Backend-Einträge enthalten weder resolved noch integrity, darunter 216 Nicht-dev-Einträge. Fehlende Prüfsummen wurden nicht erfunden. Scannergebnis zu bekannten Geheimnismustern: `secret-pattern-scan.json`; dies ist kein umfassendes Geheimnisfreiheits-Zertifikat. Frühere Berichte im vollständigen Repository sind historische Belege ihrer jeweiligen Version, keine Freigabe dieses Stands.

## Offene Arbeiten vor einer sicheren Produktfreigabe

| Priorität | Betroffene Komponente | Nächster konkreter Schritt / Verantwortlichkeit |
|---|---|---|
| P0 | Keygen / EOS Admin | Aktuellen separaten Keygen ohne privaten Schlüssel bereitstellen; Ed25519/NWL2-Vertrag an vorhandene Ausgabe anbinden oder kontrollierte Migration implementieren; öffentlichen Herstelleranker provisionieren; echte Home-/Pro-/Zeitlizenzen und UUIDs prüfen. NexoWatt Entwicklung. |
| P0 | nexowatt-ui, nexowatt-devices und alle zu sperrenden EOS-Adapter | Je vollständigem aktuellen Repository SDK integrieren, alle Betriebs-/API-/Queue-/Geräteschreibpfade prüfen, gerätespezifischen sicheren Zustand testen. Solange nicht erfolgt, laufen bisherige Adapter weiterhin nach ihrer bisherigen Logik. NexoWatt Entwicklung. |
| P0 | EOS Admin / ioBroker-Webserver / js-controller | Alte Access-/Refresh-/WebSocket-Sitzungen nach Passwortreset, persönlichem Kennwortwechsel und Rollenentzug vollständig widerrufen und am realen Stack nachweisen. Aktuelle-Kennwort-Abfrage bei Erstwechsel behebt nicht allein den späteren Alt-Token-Widerruf. |
| P0 | Build, Abhängigkeiten und Updatekanal | Sauberes npm ci, vollständiger Build/Typprüfung, Herkunft und Integritäten der fehlenden Lock-Einträge, echte Build-SBOM, aktuelle Advisory-Zuordnung; Herausgebersignaturen/Repository- und Updatevertrauen nachweisen. Keine automatische Produktionsfreigabe aus Lockfile-Liste. |
| P1 | Gesamtsystem / Verbraucheradapter | Mengen systemweit aggregieren, damit mehrere Instanzen Home-Limits nicht umgehen. Signierter Einzelwert und Clientangabe ersetzen keine gemeinsame Anlagenzählung. |
| P1 | Installer / OS / Netzwerk | Eindeutige Erstzugänge, vertrauenswürdiges TLS, minimale Benutzer-/Dateirechte, gesicherte Backups und getestete Wiederherstellung; getrennte Dienste/Secure Boot/TPM nach Bedrohungsmodell bewerten. HTTP-Basisprofil ist noch kein sicheres Vertriebsprofil. |
| P1 | EOS Admin Altbestand | Offene Netzwerkabruf-Deadlines/Größenlimits, Log-Dekompression/Upload-Ressourcen, weitere Host-/Socket-Umwege und Rate-Limits aus Backendbericht abarbeiten. |
| P1 | Alle ausgelieferten Basis-/Drittadapter | Tatsächliche Versionen, Konfigurationen und Firmwarestände inventarisieren; jede relevante Grenze gegen die EOS-Programmierlinie prüfen. Ein Fork allein ist keine Absicherung. |
| P1 | Produkt-/CRA-Verantwortung | Produktabgrenzung, Klassifikation, Supportzeitraum, Schwachstellen-/Meldeverfahren, erforderliches Konformitätsverfahren, technische Unterlagen und Tests nach `docs/cra/CRA_IEC_GAP_ANALYSIS_2026-09-30.md` abschließen. |

IEC 62443-4-1 dient als Prozessmaßstab, -4-2 als Komponentenmaßstab und -3-3 als Systemmaßstab. Diese Zuordnung und eigene Prüfungen ergeben keine IEC-Zertifizierung, keinen behaupteten Security Level und keine automatische CRA-Konformität. Die Herstellerpflichten, aktuelle Normenanwendbarkeit und gegebenenfalls unabhängige Prüfung bleiben Teil der Gesamtproduktfreigabe. Offizielle Quellen mit Abrufstand sind im CRA-Dokument enthalten.

## Nutzung dieses Stands

Installations-/Rückfallanleitung vor jeder Änderung lesen. Die neue Benutzerkonto-Migration ist absichtlich inkompatibel zum früheren gemeinsamen Startkennwort. Bestehender individueller Administratorzugang und Sicherung sind erforderlich. Zulässiger Zweck dieses Artefakts: nachvollziehbare Entwicklungs-, Review- und Integrationsarbeit; keine bescheinigte Kunden-/Serienfreigabe. Über deren Erteilung hat kein automatischer Test und keine künstliche Unterschrift entschieden.
