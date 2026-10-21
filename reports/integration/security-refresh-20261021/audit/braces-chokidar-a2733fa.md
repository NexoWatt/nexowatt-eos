# Braces/Chokidar: offene Kompatibilitätsprüfung

21.10.2026; tatsächlicher CI-Stand
`a2733fa5561f7327ff3689b7464f8727760fb670`.
Nur lesende Nachanalyse der heruntergeladenen Build-Artefakte und offizieller
Upstream-Quellen. Dateihashes, Paketidentitäten und Quellen stehen in
`braces-chokidar-a2733fa.json`.

**Kein kompatibles veröffentlichtes Sicherheitsupdate wurde nachgewiesen.**
Der tatsächliche Baum enthält `iobroker.js-controller@7.2.5` →
`@iobroker/js-controller-cli@7.2.5` → `chokidar@3.6.0` → `braces@3.0.3`.
Die ältere Braces-Lücke mit betroffenen Versionen unter 3.0.3 ist damit bereits
ausgeschlossen. Die nachträglich abgeglichene offizielle Advisory
[GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
betrifft dagegen Versionen bis einschließlich 3.0.3 und nennt keine reparierte
Version. Die Upstream-Diskussion bestreitet Teile der Einstufung; das hebt die
offene Advisory nicht auf. Dort vorgeschlagene fremde Forks sind keine
übernommene oder freigegebene Lösung.

Die tatsächliche Controller-CLI verwendet Chokidar für `logs --watch`: Sie
ermittelt den Logpfad aus der Konfiguration und überwacht dessen Verzeichnis mit
dem Muster `/iobroker*`. Die CLI verlangt Chokidar `^3.5.3`.
[Chokidar 4 entfernt laut Upstream die Glob-Unterstützung](https://github.com/paulmillr/chokidar/releases).
Ein einfaches Major-Override würde daher den vorhandenen Aufruf ändern bzw.
seine Funktion brechen. Ein Wechsel zu Chokidar 5 hätte zusätzlich die
ESM-Umstellung zu beachten. Dies ist keine reine Patch-Aktualisierung.

Eine gezielte Anpassung des Watchers kann grundsätzlich innerhalb des
Controller-7-Profils entwickelt werden; daraus folgt kein Bedarf, heimlich
auf Controller 8 zu wechseln. Sie benötigt aber eine bewusst versionierte
CLI-Anpassung oder einen geprüften Backport, reale Dateisystemtests für
Erzeugen/Anhängen/Rotation/Umbenennen, Filter, Symlinks und Fehlerbehandlung
sowie erneute Lock-, SBOM-, Audit- und native Laufzeitnachweise.
Eine solche Änderung wurde hier nicht implementiert.

Der überprüfte Chokidar-Pfad ruft `braces.expand` für Globpfade mit öffnender
geschweifter Klammer auf. Die ermittelte Herkunft über das konfigurierte
Logverzeichnis grenzt die weitere Analyse ein. Sie belegt weder eine
Fernangriffsmöglichkeit noch die Nichterreichbarkeit im Gesamtprodukt und
ersetzt kein VEX-Ergebnis.

Der CI-Audit hat 26 betroffene Paketknoten (20 hoch, 6 mittel) gespeichert;
das sind keine 26 voneinander unabhängigen Schwachstellen. Er enthält nur
Paketnamen und Zähler. Die ursprünglichen `via`- und `fixAvailable`-Felder
sind nicht erhalten. Ein unabhängiger erneuter Audit des exakten Locks lieferte
vor dem begrenzten Gesamtabbruch keine JSON-Antwort. Daher wird kein konkreter
`fixAvailable`-Wert behauptet und die Advisory-Zuordnung ausdrücklich als
nachträglicher Abgleich ausgewiesen.

Status: **OFFEN**. Keine Quell-/Lockänderung, kein neues Runtime-Build, kein
Angriffsversuch und kein neuer Pi- oder Produkttest. Controller bleibt 7.2.5;
kein `npm audit fix --force`, kein ungeprüfter Fork und keine stille
Unterdrückung des Befunds.
