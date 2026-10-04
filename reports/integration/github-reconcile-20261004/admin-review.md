# Admin-Abgleich mit aktuellem GitHub-main

04.10.2026 · Basis `4ac429e1f4f06a249053487f719f670a8d03472b` · Admin 7.10.11

Der aktuelle main/R5 enthält bereits die wesentliche Login-Korrektur der älteren
ZIP: 15 Sekunden für lokale Passwortableitung, zwei belegte Arbeitsplätze und
weiterhin zwei Sekunden für Datenbank-/Sessionzugriffe. R5 verhindert zusätzlich,
dass eine nach Fristablauf fertige Prüfung noch einen Token-Nachweis erzeugt.
Diese Implementierung und ihre festen Diagnosecodes bleiben vollständig erhalten.
Ein Ersetzen durch die ältere ZIP-Datei wäre eine Regression.

Übernommen wird ausschließlich die frühe Eingabeprüfung vor Datenbanklesevorgängen
und Passwortarbeit: gültiger Benutzerbezeichner, nichtleeres Stringpasswort,
höchstens 128 Unicode-Codepunkte und 256 UTF-8-Bytes. Die Grenzen entsprechen den
bereits vorhandenen EOS-Erststart-, Einladungs- und Passwortwechselpfaden. Es wird
keine neue Mindestlänge oder Zeichenmischung beim Login erzwungen; bestehende kurze
Passwörter bleiben prüfbar. Quell- und Runtime-Spiegel unterscheiden sich gegenüber
main jeweils nur in diesen vier zusätzlichen Zeilen.

Die alten Runtime-/Enrollment-/Onboarding-Implementierungen wurden nicht übernommen.
Rollen- und Lizenzmodule sowie signierte R5-Lieferdateien bleiben unverändert.
`eos-login-recovery.test.cjs` wurde an die aktuellen R5-Options-/Zählernamen angepasst
und enthält zusätzlich positive Grenztests. Die zehn UI-Methodenfälle führt der
Frontend-Arbeitsschritt nach seinem eigenen Freeze aus.

## Ausgeführte Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| Bestehende Session-/Widerruf-/R5-Regressionsfälle | 20/20 gegen Quelle, dieselben 20/20 gegen Runtime-Spiegel |
| Ergänzende langsame Anmeldung, Begrenzung, Widerruf und Eingabegrenzen | 5/5 gegen Quelle, dieselben 5/5 gegen Runtime-Spiegel |
| Vorhandener main-Integrationstest mit realem HTTPS/OAuth | 7/7 einschließlich Elterntest; langsame Ableitung plus 2.100 ms kontrollierte Verzögerung in ca. 2,78 Sekunden erfolgreich |

Befehle (Repositorywurzel):

```sh
node --test components/admin/test/eos-session-security.test.cjs
EOS_TEST_RUNTIME=build node --test components/admin/test/eos-session-security.test.cjs
node --test --test-name-pattern='slow valid proof|password-work cap|revocation or account disable|malformed and oversized|existing EOS password length' components/admin/test/eos-login-recovery.test.cjs
EOS_TEST_RUNTIME=build node --test --test-name-pattern='slow valid proof|password-work cap|revocation or account disable|malformed and oversized|existing EOS password length' components/admin/test/eos-login-recovery.test.cjs
EOS_ADMIN_DEPENDENCIES=/workspace/scratch/a8835322738f/build/final-test3-r2/app/node_modules node --test components/admin/test/eos-appliance-oauth.integration.cjs
```

Umgebung: Linux x64, Node 24.19.0. Der HTTPS-Test führt aktuellen main-Admincode,
aktuelles Enrollment-PBKDF2 und die native EOS-States-Session-API aus. Express,
Webserver, gepflegtes OAuth 5.3.0 und Controller-Passwortprüfung stammen aus dem
zuvor lokal verifizierten r2-Abhängigkeitsbaum. Der darunterliegende Store bleibt
ein ausdrückliches Speichertestdouble. Dies ist keine Ausführung des signierten
R5-Pakets und kein PostgreSQL-/Pi-Ende-zu-Ende-Test.

Dateihashes, unveränderte Sicherheitsmodule, Abhängigkeitsbindung und Rohlog-Hashes
stehen in `admin-evidence.json`; `admin-*.log` enthält unveränderte Testausgaben.
Keine Zugangsdaten oder Schlüsselwerte wurden in Nachweise übernommen.

## Offener Zieltest

Nach einer separat erstellten, signierten Testlieferung auf gesichertem Pi:
vorhandenes Admin-Passwort anmelden, falsches Passwort abweisen, nach Netzunterbruch
erneut anmelden, Kennwortwechsel und Rollenwiderruf prüfen. Vorher Sicherung und
bestehenden Rückfallweg erhalten. Pi-/ARM64-Lauf, vollständiger Admin-/Controller-
und Browserbetrieb sind **OFFEN**. Kein Produktions- oder Konformitätsnachweis.
Ein Git-Commit allein ersetzt oder aktualisiert die signierte R5-Installation nicht.
