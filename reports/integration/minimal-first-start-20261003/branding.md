# EOS Startlogo: Befund und Änderung vom 03.10.2026

## Nachgereichte Originalquelle

Der Nutzer hat anschließend ausdrücklich
`https://github.com/NexoWatt/vendor-nexowatt.git` als Quelle seines gewünschten
Bootlogos genannt. Die GitHub-Verbindung liefert beim Zugriff auf das Repository
und dessen Baum HTTP 404; auch die Suche in den zugänglichen Repositories nach
`vendor-nexowatt` bzw. `vendor` unter `NexoWatt` ergab keinen Treffer.
Repository, README und Originalasset konnten daher noch nicht gelesen werden.
Ob eine Freigabe fehlt oder das Repository anders heißt, ist damit nicht belegt.

Die nachfolgende Umsetzung verwendet bis zu diesem Abgleich ausschließlich das
bereits vorhandene NexoWatt-Bild aus EOS. Sie ist **noch keine bestätigte Übernahme
des ausdrücklich gewünschten Original-Bootlogos aus `vendor-nexowatt`**.
Nächster Schritt: lesbare Repository-Freigabe oder Originaldatei bereitstellen,
Verwendung und Dateihash prüfen, anschließend das gebundene Asset abgleichen und
bei Abweichung ersetzen. Keine Ersatzgrafik wurde neu erfunden.

## Problem und Herkunft

Der Nutzer meldet beim Start weiterhin das ioBroker-Logo. Im tatsächlich
ausgelieferten R4-Frontend ist dieser Fall nachvollziehbar: Der gemeinsame
React-Loader in `components/admin/adminWww/assets/index-D2ymscJA-v84.js`
zeichnet das ioBroker-Zeichen mit sechs CSS-Formen und einem animierten Kreis.
Ein Bilddateitausch oder das vorhandene Umschreiben vollständiger Markenlabels
erfasst diese Formen nicht. Der Admin-Header, die Anmeldung und die vorhandenen
App-Icons verwenden dagegen bereits die vorhandenen NexoWatt-Bilddateien.

Untersuchter Repository-Stand: `6ee690e7503f7f609de1f7c1db1689a6ca39aec3`.
Die untersuchten ausgelieferten Dateien wurden dem R4-Archiv entnommen; ihre
Git-Blob-IDs stimmen mit den Repository-Dateien überein. R4-Archiv, signiertes
Manifest und historische Prüfbelege wurden nicht verändert.

## Änderung

Die zusätzliche `eos-startup-branding.css` wird in Quell- und gebauter
Admin-Startseite vor dem verzögerten React-Einstieg geladen. Sie ersetzt die
sechs rein dekorativen Loader-Formen und ihren Kreis ausschließlich innerhalb
des bestehenden `.logo-back`-Containers durch das bereits vorhandene
`img/eos/nexowatt-192.png` und den Text „NexoWatt EOS“. Die Regeln greifen durch
ihre höhere Spezifität auch dann, wenn die Abhängigkeit ihre CSS-Regeln erst
nachträglich einfügt. Sie benötigen weder zusätzliche Animationen noch Timer,
Beobachter, fremde Netzabfragen oder Eingriffe in den React-DOM.

Die Anmeldung, Fehlermeldungen, fachlichen Adapter-Icons, Protokollnamen und
Paketkennungen bleiben unverändert. Urheberrechts- und Lizenztexte der
Abhängigkeiten werden erhalten. Diese Änderung betrifft das Browser-Startlogo;
ein Linux-/Raspberry-Pi-Bootbild wird von dieser Lieferung nicht eingerichtet.

## Tatsächlich ausgeführte Prüfung

`node --test --test-reporter=tap tests/system/admin-startup-branding.test.cjs`

Ergebnis: **3 bestanden, 0 fehlgeschlagen, 0 übersprungen**. Rohbeleg:
[`raw/branding.tap`](raw/branding.tap). Die Prüfung liest die unveränderte,
wirklich ausgelieferte React-Loader-Funktion und führt sie in einer isolierten
JavaScript-Testumgebung für die vier Farbschemata aus. Alle sechs Formen und der
Kreis müssen von den eng begrenzten Regeln erfasst werden. Zusätzlich geprüft:
Quell-/Build-Gleichheit der neuen CSS-Datei, Einbindung vor React, lokale
Bildauflösung und genaue Identität des vorhandenen NexoWatt-Bildes. Eine
geänderte Loader-Struktur lässt den Test fehlschlagen und verlangt eine erneute
Prüfung bei einem Abhängigkeits- oder Frontend-Neubau.

Dateihashes, Node-Version und Befehle:
[`branding-verification.json`](branding-verification.json).

**OFFEN:** visuelle Browserabnahme nach Anmeldung, Seitenneuladen und erneuter
Verbindung auf dem Pi; in dieser Arbeitsumgebung ist kein Browser installiert.
Der Strukturtest ist kein Screenshot- oder kompletter Admin-Funktionstest.

## Lieferung, SBOM und CRA-Nachweis

Die Änderung ist bisher Quellcode und gebauter statischer Frontendbestand im
Arbeitsbaum. Zur Auslieferung sind ein neues gebundenes Testartefakt, aktualisierte
Admin-Datei-/Baumnachweise und die Zuordnung zu dessen SBOM erforderlich. Die
existierende R4-SBOM ist damit nicht automatisch Nachweis für das korrigierte
Artefakt. Es gibt keine neuen Abhängigkeiten; der gemeinsame Loader sowie seine
MIT-Hinweise bleiben Teil der Lieferung. Die Branding-Prüfung bestätigt keine
allgemeine CRA-Konformität, Anmeldung, Adapter- oder Hardwarefreigabe.
