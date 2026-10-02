# EOS-System: Anforderungen und CRA-Nachweise

Stand: 30.09.2026. Die verbindliche Entwurfsbasis mit 20 Anforderungen und 40 geplanten positiven/negativen Prüffällen liegt in [`system/security/requirements.json`](../../system/security/requirements.json). `designed` bedeutet entworfen, nicht implementiert, bestanden oder konform.

## Umfang und Rückverfolgung

Ein gemeinsamer Lieferstand umfasst OS/Hardwareprofil, Runtime, Controller, EOS Admin, UI, Devices, Backitup, EEBUS, Identitäts-/Lizenzdienst, Kommunikationsbus, Datendienst, Update und Überwachung. Eigene und fremde Komponenten müssen mit ihrer tatsächlichen Version einbezogen werden. Die derzeitige Installer-Härtung ist nur ein Teil davon.

| Anforderungen | Zweck | Erforderlicher Nachweis |
| --- | --- | --- |
| 001–004 | Lieferumfang, Rechte, Einrichtung, Verträge | Inventar, Rechteprüfung, Einrichtungs-/Eingabefehlerfälle |
| 005–008 | Kommunikation, Steuerung, Gerätebereiche, Schlüssel | Handshakes/Autorisierung, Replay/Ausfälle, Rotation/Widerruf |
| 009–012 | Offline-Lizenz, Freigaben, Daten, Restore | Fälschungsabwehr, serverseitige Grenzen, Wiederherstellung |
| 013–016 | Updates, Rückfall, Exponierung, Überwachung | Signaturprüfung, Stromverlust/Migration, Rollen, Ressourcenlimits |
| 017–020 | Kompatibilität, SBOM, Lebenszyklus, Freigabe | Referenzvergleich, Build-Inventar, Prozessübung, konkrete Entscheidung |

Kennungen werden durchgängig verknüpft: `EOS-REQ-*` → `EOS-TM-*` → konkrete Änderung → `EOS-TEST-*-P/N` → Rohbeleg → exakter Lieferstand. Eine Prüfung erhält erst nach tatsächlicher Ausführung Umgebung, Befehl/Ablauf, Zeitpunkt, Soll/Ist und Ergebnis. Automatische Validierung der JSON-Dokumente ist kein Nachweis der geplanten Produktsicherheit.

## Regulatorische Einordnung

Die thematische Ableitung und der verifizierte Referenzstand stehen in [`CRA_IEC_SCOPE.md`](../security/CRA_IEC_SCOPE.md), einschließlich Quellen und Abrufgrenzen. CRA-Zuordnungen sind hier thematisch; exakte Klauselzuordnung, Produktkategorie, Herstellerrolle, Supportzeitraum und Bewertungsverfahren bleiben ausdrücklich zu vervollständigen. IEC 62443-4-1/-4-2/-3-2/-3-3 strukturieren Prozess, Komponenten, Risikobewertung und Systemschutz. Es wird keine vollständige Normerfüllung, harmonisierte Konformitätsvermutung oder Zertifizierung behauptet.

TLS 1.3/mTLS ist eine technische Zielentscheidung für die Modulkommunikation, keine pauschale CRA-Protokollvorgabe. OWASP-ASVS-Prüfungen müssen versionsgebunden auf den tatsächlichen Webumfang angewendet werden. Ein Lizenzfehler darf notwendige Schutzfunktionen, Sicherheitswartung und autorisierte Wiederherstellung nicht abschalten.

## Freigabeverantwortung

Der Hersteller muss neben Code auch Support, Schwachstellenannahme, Meldeentscheidungen, Patchverteilung, sichere Lieferung und Lebensende betreiben. Eine generierte SBOM ersetzt weder Schwachstellenbewertung noch diese Prozesse. Eine vollständige CycloneDX-SBOM kann erst aus dem vollständigen tatsächlichen Build entstehen; geplante Komponenten dürfen keine erfundenen Versionen erhalten.

Offene kritische Risiken, fehlende Zielgeräteprüfung oder ungeklärte Integrität bleiben Freigabehindernisse. Risikoabhängige unabhängige Sicherheitsprüfung wird vor Serienfreigabe vorgesehen. Cybersecurity-Nachweise ersetzen keine elektrische/funktionale Sicherheit oder Prüfung der konkreten Anlagen- und Netzanschlussregeln.
