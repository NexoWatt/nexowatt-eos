# Lokaler Prüfvermerk, 05.10.2026

Änderung: eigener R9-Harness für die tatsächliche unsigned, aus signiertem R8
und sechs aktuellen Quellpaketen vorbereitete App. Keine Änderung historischer
R7-Tests, keine Produkt-Bypassvariable, kein Livehost/SSH und kein Dienststart.

Umgebung: Linux x64, Node 24.19.0, ausschließlich UID 0. Der native Supervisor
verlangt bewusst Node 24.21.0 und einen normalen UID; der Roothelfer verlangt
einen expliziten, frischen, disponiblen GitHub-Runner. Diese Voraussetzungen
fehlen lokal. **Native PostgreSQL-/Admin-/UI-Ausführung dieses R9-Harness wurde
nicht durchgeführt und bleibt bis zum tatsächlichen CI-Lauf OFFEN.**

Tatsächlich ausgeführt:

- `node --test --test-reporter=tap tests/integration-r9/fixture.test.cjs tests/integration-r9/license-session.test.cjs`: **10/10 bestanden**, keine Skips.
- `node --check` für Nativeharness, Appvorbereitung, Roothelper und Supervisor: bestanden.
- `git diff --check -- tests/integration-r9`: bestanden.

Die Contracttests führen die echte NWL2-Signatur-/Claimprüfung durch und prüfen
metadatengebundene Ablehnung, Contenthash-Projektion sowie begrenzte, bereinigte
HTTPS-/UI-Ergebnisvalidierung. Sie erzeugen keine Produktionslizenz und sind
kein Ersatz für die Netzwerk-/Lifecycle-Prüfung im nativen Harness.

Rohbeleg: `evidence/local-contracts.tap`. Quellen, Ausgangscommit und Umgebung:
`evidence/local-source-binding.json`. Keine R9-Nativ-, Pi-, Anlagen-,
Produktions- oder Konformitätsfreigabe aus diesen lokalen Prüfungen ableiten.

Statische Nachprüfung nach zentralem Review: Der zunächst falsche erwartete
Plattformfehler wurde auf den vorhandenen Produktcode `EOS_PLATFORM_ENTRY`
korrigiert. Die Erststartkonfiguration verwendet ausdrücklich `unlicensed`,
passend zum zunächst fehlenden Lizenzdatensatz. Die Anleitung enthält die
benötigte gelockte UI-Abhängigkeitsinstallation vor der TS-Paritätsprüfung.
HTTP-Routen, CSRF-Header, UI-Cookiename, Home-/Pro-Featurezuordnung,
Kontingentstates und Rückgabeformate wurden gegen die aktuellen Produktquellen
abgeglichen. 10/10 lokale Contracttests und Syntaxprüfung danach erneut bestanden;
Quellenbindung und TAP sind aktualisiert. Native Ausführung bleibt offen.
