# EOS-ADAPTER-SHUTDOWN-001 – doppelte Abschaltfinalisierung

## Befund und Ursache

Der native Sechs-Adapter-Prüflauf `38715663096`, Job `116357602344`, erreichte
Lizenzwechsel und beide geprüften logischen Sicherungen. Beim anschließenden
Stopp zeigte der begrenzte Laufzeitnachweis für `eos-admin` erstmals
`ALIVE_SHUTDOWN_WRITE_FAILED` und `RUNTIME_ERROR_LOGGED`; unmittelbar vor dem
Stopp waren beide nicht vorhanden. Der Migrationsrücklauf war noch nicht
erreicht. Diese Fehler sind kein erwarteter Lizenzwiderruf und bleiben fatal.

Die tatsächlichen CJS-/ESM-Methoden des Adapter-Core 7.2.2 reproduzieren die
Ursache mit kontrollierter Uhr und Datenbankgrenze: Der Unload-Callback startet
`finishUnload()` und schreibt `alive=false`. Unabhängig davon ruft der
Abschalttimer nach standardmäßig 500 ms dieselbe Funktion nochmals auf.
`terminate()` schließt die Datenbank ebenfalls nach 500 ms. Das zweite
Alive-Schreiben kann mit dem Schließen der PostgreSQL-Verbindung kollidieren.
In der deterministischen Reproduktion beginnt Schreiben 2 bei 500 ms, die
Verbindung schließt bei 501 ms und Schreiben 2 scheitert bei 520 ms.

## Änderung und Sicherheitswirkung

`runtime/controller-profile/adapter-shutdown.cjs` ergänzt für neue, noch
unsignierte Kandidaten genau eine gemeinsam verwendete Finalisierungs-Promise.
Diese wird vor Ausführung des Cleanup-Rumpfs veröffentlicht. Callback,
Wiedereintritt und Abschalttimer warten damit auf denselben Abschluss.
Insbesondere führt ein bereits laufendes Alive-Schreiben nicht zu einer
sofort aufgelösten Zweit-Promise und vorzeitiger Terminierung.

Der Transform akzeptiert ausschließlich beide vollständigen gepinnten
7.2.2-Distributionsdateien und prüft zusätzlich die festgelegten Ausgabehashes,
Paketidentität und Modulauflösung. Beide Eingaben werden vor dem ersten
Schreiben geprüft. Bereits vollständig transformierte Kandidaten werden
unverändert verifiziert; Mischstände, unbekannte Bytes, alternative
Paketauflösung, Symlinks, Hardlinks, ungeeignete Dateitypen, unsichere Modi und
Dateien oberhalb 1 MiB werden abgelehnt. Historische R9-Pakete und laufende
Installationen werden nicht verändert.

Die vorhandene Fehlerprotokollierung, PostgreSQL-Prüfungen, Verbindungsgrenzen
und der Unload-Fallback bleiben unverändert. Ein tatsächlich fehlgeschlagenes
Alive-Schreiben wird weiterhin als Fehler protokolliert. Das Verhalten der
bereits vorgelagerten Promise-Unload-Behandlung bei dauerhaft hängendem
Anwendungscode wird durch diese eng begrenzte Änderung nicht erweitert.

## Lokale Prüfung

Ausgeführt am 15.10.2026 auf Linux x64 mit Node 24.19.0:

```sh
node --test --test-reporter=tap tests/system/adapter-shutdown.test.cjs
```

**19 von 19 Tests bestanden.** Geprüft wurden beide vollständigen
Distributionsdateien, Syntax, Hash-/Pfad-/Paketgrenzen sowie tatsächliche
Methodenkörper in folgenden Abläufen: Originalfehler reproduziert; nach
Korrektur ein Alive-Schreiben und eine DB-Schließung; ausstehendes Schreiben
über den Fallback hinaus; synchroner Wiedereintritt; tatsächliche Ablehnung
weiterhin einmal protokolliert; fehlender und verspäteter Unload-Callback.

Belege: `adapter-shutdown-regression.tap` und
`adapter-shutdown-source-binding.json`. Die vollständigen Originalfixtures,
Paketprovenienz und MIT-Lizenz stehen unter
`tests/system/controller-profile-fixtures/adapter-7.2.2.PROVENANCE.md`.

Zusätzliche, vom Hauptagenten ausgeführte bestehende Regressionen für
SBOM-Bindung, Bundle-Erstellung, Controller-Profil und R9-Ableitung:
**65 von 65 bestanden**, Beleg `shutdown-legacy-regression.tap`. Diese Suite
überschneidet sich mit anderen Integrationsprüfungen; ihre Testzahlen werden
nicht zu einer Gesamtzahl addiert. Der lokale Abruf des Workflow-Prüfwerkzeugs
wurde wegen des 5-Sekunden-Abrufbudgets abgebrochen und ist kein bestandener
Workflow-Syntaxtest. Hierfür bleibt der neue GitHub-Prüflauf maßgeblich.

**Offen bei Erstellung:** erneuter nativer Gesamtlauf mit PostgreSQL 17.11 und
Node 24.21.0 einschließlich Stopp, Migrationsrücklauf, Wiederanwendung und
Neustart; signiertes R10-Testpaket; Pi-Installation und Hardwareabnahme.
Die lokalen Regressionen belegen keine allgemeine Produktionsfreigabe oder
CRA-Konformität. Die bestehende strikte Laufzeitfehlerschranke bleibt aktiv.
