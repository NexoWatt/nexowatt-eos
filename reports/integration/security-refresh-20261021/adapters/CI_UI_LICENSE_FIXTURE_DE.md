# Nachprüfung der UI-Lizenz-Testfixture

Bezug: Quellstand `19c250aa6516881587cea045ab384308b37647d1`, fehlgeschlagener
Own-Adapters-CI-Job `119450459543`. Der Fehler wurde lokal reproduziert:
vier der acht UI-Entitlement-Tests scheiterten an der Plattformzulassung.

Der Admin-Lizenzdienst lädt nach der vorherigen Änderung den öffentlichen
Einstieg des Lizenzclient-Pakets. Die isolierte UI-Testfixture ersetzte bislang
nur direkte Importe von `eos-platform`. Der verschachtelte Import über den
Paket-Einstieg benutzte deshalb die echte Plattformprüfung. Diese verweigerte
auf dem Entwicklungs-/CI-Rechner korrekt die Zulassung als installiertes EOS.

Die Änderung betrifft ausschließlich die bestehende Testfixture: Sie lädt den
öffentlichen Paket-Einstieg ebenfalls isoliert und ersetzt dort nur dieselbe
Plattformprüfung. Kryptografie, verschlüsselter Lizenzspeicher, Lease- und
Entitlement-Prüfungen laufen weiter mit den tatsächlichen Modulen. Der globale
Node-Modulcache und sämtliche Produktionsmodule bleiben unverändert. Ein neuer
Test prüft ausdrücklich, dass die getrennt geladenen Produktions-Exporte die
Plattformprüfung weiterhin ausführen und nicht durch den Fixture-Stub ersetzt
wurden. Es gibt keinen neuen Produktionsparameter oder Umgebungsschalter.

| Lokale Prüfung | Ergebnis |
|---|---|
| Vorher: `node --test test/eos-license-entitlements.test.cjs` | 4 bestanden, 4 fehlgeschlagen; Fehler reproduziert |
| Gleicher UI-Befehl wie im CI einschließlich neuer Isolationsprüfung | 53/53 bestanden |
| `node scripts/verify-stable-1.0.9-access.cjs` | Bestanden, einschließlich realer lokaler HTTPS-Verbindungen mit synthetischen Testdaten |
| `npm run publish:check` | Bestanden; 408 inventarisierte Dateien, Secret-/Quelltextdokumentationsprüfung bestanden |
| `npm pack --dry-run --json --ignore-scripts` | Bestanden, 409 Einträge |
| `git diff --check -- components/ui` | Bestanden |

Der genaue CI-Befehl wurde im Verzeichnis `components/ui` ausgeführt:

```sh
node --test scripts/verify-eos-integrated.cjs scripts/verify-eos-auth-security.cjs test/eos-license-entitlements.test.cjs
```

Der bestehende Generator aktualisiert im aktuellen UI-Artefaktmanifest exakt
Größe und SHA-256 der geänderten Fixture. Die beiden `.cjs`-Quelldateien besitzen
keinen TypeScript-Spiegel: der vorhandene Spiegelgenerator erfasst `.js`/`.jsx`.
Keine historische Lieferung oder Signatur wurde geändert.

Umgebung weiterhin Linux/x64, Node 24.19.0 und npm 11.9.0. Dies ist der lokale
Nachweis des konkreten CI-Fehlers; ein neuer CI-Lauf und der Zieltest auf dem Pi
sind gesondert zu bewerten. Dateihashes: `ci-ui-license-fixture-followup.json`.
