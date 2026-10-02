# CI: begrenzte Sicherheitsregression

`.github/workflows/security-review.yml` prüft lokale Build-Erzeugung, Shellsyntax
und die fokussierten Sicherheitstests ohne `npm install`, neue Abhängigkeiten
oder Deploymentzugänge. Der Workflow wird manuell sowie bei Push/Pull Request
mit Änderungen an den definierten Quell-, Sicherheits-, Test-, Dokumentations-
oder Workflowpfaden gestartet. Es wird kein `pull_request_target` verwendet.

## Gegenstand

1. Commit und vorhandene Node-, Python- und Bash-Versionen protokollieren.
2. Mit `node tasks --create` die Distributionsskripte erzeugen.
3. Jeden benannten Quell-/Sicherheitsshellcode und jedes `dist/*.sh` einzeln mit
   `bash -n` prüfen; erzeugte Dateien nicht ausführen.
4. `node --test tests/security/*.test.cjs` aufrufen.
5. Jedes `tests/security/*.test.py` über `sudo env
   CODEX_PRIMARY_RUNTIME_NODE="$(command -v node)" python3 "$test_script"`
   ausführen. Die Wrapper-Tests benötigen UID 0 für root-eigene temporäre
   Dateirechte-Fixtures; beim Standardbenutzer des Runners würden sie sonst
   übersprungen. Der ermittelte absolute Node-Pfad bleibt über den
   `sudo`-Umgebungswechsel verfügbar.

Die Testauswahl ist auf die Tests direkt in `tests/security` begrenzt;
historische Belegskripte unter `docs/security/evidence` werden nicht automatisch
als aktuelle Produkttests ausgeführt. Fehler in Build, Syntax oder Tests lassen
den Job fehlschlagen. Die Jobzusammenfassung nennt den begrenzten Prüfumfang auch
bei Fehlern.

Die Python-Tests ändern dabei nur ihre temporären Testdateien; privilegierte
Host-/Dienstoperationen sind durch Stubs ersetzt. Ein echtes Betriebssystem-
oder ioBroker-Installationsskript wird nicht als Installationslauf ausgeführt.
Übersprungene Sicherheitstests gelten nicht als bestandener Nachweis; bei
Änderungen der Testvoraussetzungen sind die ausgeführten und übersprungenen Fälle
erneut zu kontrollieren.

## CI-Vertrauensgrenze

Der Job läuft auf dem GitHub-gehosteten Ubuntu-24.04-Runner mit
`permissions: contents: read`, ohne Produktivgeheimnisse und ohne gespeicherte
Checkout-Credentials. Quellcode aus Pull Requests wird dabei in dieser begrenzten
CI-Umgebung ausgeführt. Die beschriebenen Python-Fixtures laufen mit Rootrechten
im wegwerfbaren gehosteten Runner. Ungeprüfte Beiträge nicht auf eigene
Produktivrunner umleiten. Node und Python stammen aus dem Runnerabbild; die
tatsächlichen Versionen werden protokolliert. Das Runnerabbild ist damit kein
unveränderlicher EOS-Produktbuild.

Die einzige verwendete Action ist an einen vollständigen Commit gebunden:

| Referenz | Nachweis vom 30.09.2026 |
| --- | --- |
| `actions/checkout` Release | `v7.0.1`, vom offiziellen Latest-Release-Endpunkt gemeldet |
| Commit | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| Tagtyp | Commitreferenz, kein unaufgelöstes Tagobjekt |
| GitHub-Signaturstatus | API meldet `verified: true`, `reason: valid` |
| Action-Metadaten | `runs.using: node24`; `persist-credentials` wird explizit auf `false` gesetzt |

Offizielle Prüfpunkte:

- [Release](https://api.github.com/repos/actions/checkout/releases/latest)
- [Release-Tag](https://api.github.com/repos/actions/checkout/git/ref/tags/v7.0.1)
- [Commit](https://api.github.com/repos/actions/checkout/git/commits/3d3c42e5aac5ba805825da76410c181273ba90b1)
- [Action-Metadaten am Commit](https://github.com/actions/checkout/blob/3d3c42e5aac5ba805825da76410c181273ba90b1/action.yml)

Signaturstatus und Herkunftsprüfung sind kein vollständiges Codeaudit der Action.
Bei Action-Updates neue Referenz und Änderungen prüfen, anschließend den
vollständigen SHA aktualisieren.

## Offene Freigaben und Grenzen

Ein vollständiger Installerlauf, echte Betriebssystemupdates, SFTP-Handshakes,
Live-EOS-/Gerätekommunikation, Hardwaretests und Rückfall-/Recoverytests sind
**kein Bestandteil dieses Jobs**. Auch vollständiges SAST, transitive
Abhängigkeitsprüfung, Geheimnissuche, Build-SBOM und Normprüfung werden hier nicht
behauptet. Diese Nachweise müssen ergänzend am tatsächlichen Lieferstand geführt
werden.

Vor Serienfreigabe passende Branch-/Release-Regeln und zwingende Statusprüfungen
einrichten. Bei pfadgefilterten Workflows berücksichtigen, dass ein ausgebliebener
Workflow kein bestandenes Prüfergebnis ist. Bestehende Upstream-Installations-
und Deploymentworkflows bleiben separate Prüfumfänge und müssen auf das
EOS-Produktprofil abgestimmt werden. Diese Datei beschreibt keine bereits
ausgeführte GitHub-Actions-Prüfung und ändert keine externen Repositoryregeln.
