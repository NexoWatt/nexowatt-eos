# Erststart: begrenzte Browseranfragen und Abgleich nach unklarem Abschluss

Prüftag: 03.10.2026. Basis: Commit `66a3762f75e9e0ffc56159fe7142f6059dd550b3`.
Die folgenden Änderungen betreffen ausschließlich das Setup-Frontend und dessen
Logiktests. Bestehende signierte test.3-/r3-Lieferdateien sind dadurch nicht neu
gebaut, signiert oder nachträglich geändert. Ihr curl-Einstieg enthält diese
Quelländerung erst nach einem getrennt nachgewiesenen Neubau.

## Befund und Korrektur

Ein nicht abschließendes `fetch` konnte Einrichtungscode-/Abschlussformular und
Statusabfrage unbegrenzt blockieren. Dies wurde vorher mit tatsächlichem
`app.js`/HTML und der vorhandenen DOM-Logikfixture reproduziert.

- Jede Anfrage besitzt jetzt ein gemeinsames monotones **5.000-ms-Budget** für
  Antwortheader und vollständigen JSON-Body. `AbortController` bricht die Anfrage
  ab; ein zusätzlicher Promise-Wettlauf begrenzt auch ein nicht abschließendes
  Transport-Promise. Spät ankommende Ergebnisse nach der Frist werden verworfen.
  Der Fristtimer wird bei jedem regulären Ausgang entfernt.
- Eine Zeitüberschreitung erhält eine begrenzte, verständliche Meldung ohne
  Fehlerdetails, Passwort, Lizenz oder Einrichtungscode. Es gibt kein Logging.
- Ein verlorenes Abschlussergebnis löst **keinen automatischen erneuten POST**
  aus. Passwortfelder und Lizenztext werden geleert. Zunächst wird ausschließlich
  der Serverstatus abgefragt. Nur `claimed`, authentisierte Sitzung und ein
  bestätigtes CSRF-Token öffnen das Formular für einen ausdrücklich manuell
  ausgelösten neuen Versuch. Konfigurationsangaben bleiben erhalten; Geheimnisse
  müssen dafür erneut eingegeben werden.
- Bei `committing` oder weiterhin unbekanntem Ergebnis bleibt erneutes Absenden
  gesperrt. Die Oberfläche zeigt den ungeklärten Abschluss und einen Login-Link
  zur Statusprüfung. Allein `SETUP_CLOSED` bestätigt einen Root-Abschluss.
- Polling hat höchstens 90 Versuche und zusätzlich ein **180.000-ms-Gesamtbudget**.
  Die einzelne Anfrage wird auf die noch verbleibende Frist begrenzt. Auch
  dauerhaft hängende Antworten enden damit in einer ehrlichen Statusmeldung.
  Server-, KDF-, Finalizer-, Mesh- und Anlagenfristen wurden nicht verändert.

## Tatsächliche lokale Prüfung

Umgebung: Linux x64, Node.js **v24.19.0**. Die Zielversion v24.21.0 und der Pi
wurden in diesem Teiltest nicht ausgeführt.

```text
node --test --test-reporter=tap tests/onboarding/frontend.test.cjs
# tests 17
# suites 0
# pass 17
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 367.993195
exitCode: 0
```

Die zehn vorhandenen Regressionen bleiben enthalten. Sieben zusätzliche Fälle
prüfen Headerhänger, nach 4 Sekunden gelieferte Header mit hängendem Body,
Verwerfen eines verspäteten Bodys, Abortsignale, Timerbereinigung, unklaren
Abschluss, paralleles erneutes Absenden, bestätigten manuellen Neuversuch sowie
180-Sekunden-Abbruch des Pollings. Die Timer der bestehenden DOM-Fixture wurden
um eine kontrollierte monotone Uhr und `clearTimeout` erweitert. App und HTML
werden weiterhin direkt aus den Produktdateien gelesen.

Der erste Sandboxlauf scheiterte am bereits bestehenden Unterprozesstest für
`issue-code.cjs` (fehlende erwartete stderr-Ausgabe); direkt ausgeführt bestanden
16 Fälle, einer scheiterte. Der komplette oben genannte Nachlauf mit erlaubter
Unterprozessausführung bestand ohne ausgelassene Tests. Beide geänderten Dateien
bestanden anschließend `node --check`.

**Grenzen:** Diese Prüfung ist ein JavaScript-/DOM-Logiktest, keine echte
Browser-, Netzwerk-, TLS-, Server-, Systemd-, Pi- oder Hardwareabnahme. Die
Fristmessung verwendet kontrollierte virtuelle Zeit. Ein blockierter Browser-
Eventloop kann JavaScript-Timer verzögern; der monotone Nachcheck verhindert
anschließend das Akzeptieren eines verspäteten Ergebnisses. Die vorhandenen
serverseitigen Commit-/Mutationssperren bleiben für tatsächliche Parallelität
maßgeblich. Es wird kein Datenverlust aus dem ursprünglichen Befund abgeleitet.

Offen bleiben der komplette reale Browserablauf einschließlich Netzwerkverlust
während der KDF/Übergabe, Geräteinstallation, native Rechteprüfung und die
produktweiten Pflichtgates. Keine Produktions- oder Anlagenfreigabe.

## Bindung des geprüften lokalen Quellstands

| Datei | SHA-256 nach Prüfung |
| --- | --- |
| `runtime/onboarding/public/app.js` | `52ba17278a703150b59249ae4919e369efa72dca2d096b598fc603132c29570c` |
| `tests/onboarding/frontend.test.cjs` | `0281910e8d1544d0f2cefd153a4c1c127d887c4f18229c74fff83353ccced4fe` |

Erfasst: 2026-10-03T17:40:10.494924+00:00.
