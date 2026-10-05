# Einmalige zentrale Lizenzaktivierung: UI-Änderungs- und Prüfvermerk

Stand: 05.10.2026, UI 1.0.21, Basis-Commit `4e171e4`; Änderungen im Arbeitsbaum.
Kennung **EOS-UI-LIC-02**. Umfang: zentraler Lizenzstatus, Browseranzeige,
Legacy-Schlüsselpfade, generierte Runtime und Paketdateiliste.

## Änderung und Sicherheitswirkung

Home oder Pro wird einmal im EOS Admin aktiviert. Die UI übernimmt ausschließlich
die kurzlebige zentrale Freigabe mit Edition, Features und signierten Kontingenten.
Die vorhandene Home-/Pro-Matrix, Datenpunktnamen und Geräteprotokolle bleiben
unverändert. Die bestehende feste Inbetriebnahme-/Geräteschreibsperre bleibt aktiv.

Entfernt wurden der ungenutzte lokale Schlüsselvalidator und die ungenutzten
React-Hilfen für Schlüsselübertragung und Statuslesen aus lokalen States. Der
alte `/api/license/save`-Pfad ist ausschließlich eine rollenprüfende
Kompatibilitätsablehnung (`409 CENTRAL_LICENSE_MANAGEMENT`); er besitzt keinen
Schlüsselparser und kann weder importieren, speichern noch löschen. Nicht
angemeldete Aufrufe bleiben `401`. Der historische Methodenname
`_nwRefreshLicenseFromConfiguredKey` bleibt für bestehende interne Aufrufer
bestehen, fragt aber ausschließlich den zentralen Client ab.

Die API bildet Gültigkeit, Edition, Statusmeldung und Kontingente aus der zentralen
Freigabe. Alte `_nwLicenseInfo`-/`_nwLicenseOk`-Werte, native Schlüssel oder
State-Spiegel erteilen keine Rechte und bestimmen keine Statusmeldung. Die
Lizenzseite enthält kein Eingabefeld, verweist auf EOS Admin, aktualisiert alle
fünf Sekunden und verwirft eine positive Anzeige spätestens zum Lease-Ablauf.

Der gemeinsame EOS-Client wird inklusive `eos-platform.js` und Typdeklaration
gepackt. Seine neue Plattformprüfung wird im gesonderten zentralen
Lizenz-/Plattformnachweis geprüft. Die isolierten UI-Komponententests ersetzen
**ausdrücklich nur diese root-geschützte Plattformprüfung** in einem Testloader;
die produktiven Module bieten keinen Testschalter. HTTPS, Rollenprüfung,
NWL2-Verifikation, verschlüsselter Lizenzspeicher und Lease-Validierung laufen
als echter Quellcode. Controller, Transport und Browser-DOM sind Fixtures.

## Tatsächlich ausgeführte Prüfung

Umgebung: Linux x86_64, Node 24.19.0, TypeScript 5.8.3. Abhängigkeiten aus beiden
bestehenden UI-Lockdateien mit `npm ci --ignore-scripts --no-audit --no-fund`;
keine Lock-Neuauflösung oder Lifecycle-Ausführung.

| Befehl | Ergebnis |
| --- | --- |
| `npm run build:ts` | Bestanden, vollständiger TS-Build einschließlich Spiegel und Deklarationen |
| `npm run admin:build` | Bestanden, Vite-Produktionsbuild; ungenutzte entfernte Exporte waren bereits aus dem Bundle eliminiert |
| `npm run typecheck` | Bestanden |
| `npm run typecheck:runtime-mirrors` | Bestanden |
| `npm run test:main-runtime-typing` | Bestanden, manuell typisierte Main-Spiegel erhalten |
| `npm run check:ts-runtime-executables` | Bestanden, 135 Runtime-Dateien synchron |
| `npm run check:ts-runtime-mirrors` | Bestanden, 501 Spiegel geprüft |
| `node --test --test-reporter=tap scripts/verify-eos-integrated.cjs scripts/verify-eos-auth-security.cjs test/eos-license-entitlements.test.cjs` | **52/52 bestanden** |
| `npm run docs:build` und `npm run docs:check` | Bestanden, 237 Modulbeschreibungen synchron |
| `npm pack --dry-run --json --ignore-scripts` | Bestanden; alle vier zentralen Clientdateien enthalten |

Der erste Komponentenlauf hatte 47/51 bestandene Fälle und vier Fehler durch
die neu hinzugekommene Plattformprüfung im noch nicht angepassten Admin-Fixture.
Nach expliziter Testloader-Anpassung bestand der Wiederholungslauf; zusätzlich
kam ein Browser-Verhaltenstest hinzu. Beide Rohstände bleiben erhalten.

Belege: `reports/security/central-license-20261005/central-license.tap`,
`central-license-first-attempt.tap`, `build-ts.log`, `package-dry-run.json` und
`source-hashes.json` relativ zur UI-Komponente. Die Tests prüfen Home/Pro,
Null-/Teilmengenkontingente, Widerruf/Ablauf/Identitätswechsel, Manipulation des
verschlüsselten Datensatzes, gefälschte lokale Statuswerte, ausbleibende lokale
Schlüsselspeicherung sowie echte HTTPS-/Rollen-/Schreibsperren.

## Migration, Praxistest und Grenzen

Vor einem späteren Anlagenupdate geprüfte Sicherung und bisherigen freigegebenen
Stand für einen kontrollierten Rückfall behalten. Alte UI-Schlüssel werden nicht
übernommen oder gelöscht; sie haben keine Freigabewirkung. Im EOS Admin einmal
Home/Pro aktivieren und anschließend die UI öffnen: enthaltene Apps und engere
signierte Kontingente müssen ohne weitere Schlüsselabfrage erscheinen. Nach
zentralem Widerruf müssen die lizenzpflichtigen Wege innerhalb der begrenzten
Lease gesperrt sein; Status-/Anmeldeweg bleibt für Admin erreichbar.

Realer Browser, Pi/systemd, native Gesamtinstallation und Geräte-/Hausanlagentest
wurden in diesem Komponentenlauf **nicht ausgeführt (OFFEN)**. Die feste
Inbetriebnahmesperre wird durch eine gültige Lizenz nicht aufgehoben. Kein
Signieren, Versiegeln, Deployment, npm-Publish oder Produktionseingriff erfolgte.
Die historische separate UI-Release-Artefaktsperre bleibt unverändert; diese
fokussierte Abnahme ist kein vollständiger `test:all`-/Release-Nachweis.
