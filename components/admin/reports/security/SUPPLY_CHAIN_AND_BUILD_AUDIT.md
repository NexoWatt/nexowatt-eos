# Lieferketten- und Buildprüfung – 30.09.2026

Geprüfter Ausgangspunkt: hochgeladenes vollständiges Repository `iobroker.eos-admin` 7.10.9. Die aktuelle Version und Dateihashes des bearbeiteten Standes stehen in `inventory-summary.json`, `source-runtime-manifest.json` und `fallback-build-provenance.json`. Diese Prüfung ist eine Quell-/Artefaktprüfung, kein Nachweis eines installierten Systems und keine Normzertifizierung.

## Tatsächlich erhobener Umfang

| Bereich | Quelle | Ergebnis und Grenze |
| --- | --- | --- |
| Backend-Abhängigkeiten | `package.json`, `package-lock.json` | 788 Paketeinträge; 315 ohne `dev`-Markierung. Lockfile-Bestand, kein installierter Runtime-Baum. |
| Frontend-Abhängigkeiten | `src-admin/package.json`, `src-admin/package-lock.json` | 768 Paketeinträge; 371 ohne `dev`-Markierung. Buildwerkzeuge und Browserabhängigkeiten können beide in `devDependencies` stehen; diese Markierung beweist keine Bundle-Zusammensetzung. |
| Abgleich Manifest/Lockfile | Name, Version, dependencies, devDependencies, optionalDependencies | Zum Prüfzeitpunkt keine Abweichung. Nach Versionsänderungen erneut erzeugen. |
| Aufgelöste Beziehungen | npm-Verzeichnismodell | 9 Backend- und 19 Frontend-Beziehungen ohne Lockfile-Ziel; ausschließlich als optional markierte Peer-Abhängigkeiten. Keine daraus abgeleitete fehlende Pflichtabhängigkeit. |
| Vorbereitete Dateien | `src/`, `build/`, `admin/`, `adminWww/`, `public/` | SHA-256-Dateiinventar. Ein Hash beweist den Dateiinhalt, nicht dessen korrekte Ableitung aus dem Quellcode. |
| Mitgelieferte Bibliothekskopie | `adminWww/lib/js/crypto-js/package.json` | Manifest nennt crypto-js 4.2.0/MIT. Original-Tarball und tatsächliche Einbindung im Browser nicht verifiziert. Weitere gebündelte Fremdkomponenten sind über das Dateiinventar allein nicht identifiziert. |

Die beiden `sbom-*-lock.cdx.json` sind maschinenlesbare CycloneDX-1.5-**Referenzinventare der vorhandenen Lockfiles**. Sie dürfen nicht als endgültige Build-/Auslieferungs-SBOM oder als Schwachstellenfreiheit ausgegeben werden. Das Werkzeug enthält keine Netzabfrage und keine CVE-Datenbank.

## Offene konkrete Befunde

| Kennung | Betroffene Komponente | Befund/Beleg | Maßnahme und Status |
| --- | --- | --- | --- |
| SC-01 | Backend package-lock.json | 563 von 788 Einträgen ohne `resolved` und `integrity`; darunter 216 Einträge ohne `dev`. Diese Informationen fehlen bereits im Eingangsartefakt. | Offen: in einer kontrollierten Buildumgebung Herkunft und exakte Paketbytes aus einer vertrauenswürdigen Registry verifizieren, Lockfile nachvollziehbar regenerieren und Diff prüfen. Keine Prüfsummen offline erfinden. |
| SC-02 | Bereits gebaute Frontend-Dateien | Quell-/Lockfile-Stand und vorhandene Bundles liegen vor, aber kein durchgeführter sauberer Frontend-Build mit installierten Abhängigkeiten und Bundle-Komponentenliste. | Offen: `npm ci` für beide Manifeste, vollständiger Build, Artefaktvergleich und echte Build-SBOM. Frontend-dev-Markierung nicht zum Weglassen ausgelieferter Bibliotheken verwenden. |
| SC-03 | Backend / TypeScript | Normaler tsc-/tsx-Build nicht ausgeführt: Abhängigkeiten und TypeScript-Compiler fehlen; externer Paketabruf in dieser Umgebung nicht verfügbar. | Für die geänderten Dateien isolierten lokalen Fallback-Emit samt Provenienz erstellt. Typprüfung, vollständiger Normalbuild und ioBroker-Integration bleiben offen. |
| SC-04 | `.github/workflows/` | Actions verwenden bewegliche Versions-Tags statt geprüfter vollständiger Commit-SHAs. Teilweise fehlen explizite minimale Workflow-Rechte. Automatisches Approve/Merge sowie Release-Metadaten stammen aus dem ioBroker-Ursprung. | Offen: verifizierte Actions-SHAs, minimale Tokenrechte, eigene Releaseverantwortung/Repositoryregeln und Geheimnisse festlegen; keine unbekannten SHAs eintragen. `pull_request_target` führt hier nach sichtbarem YAML keinen ausgecheckten PR-Code aus; daraus wird keine reproduzierte Ausnutzung behauptet. |
| SC-05 | Adapter-/OS-/Node-/Controller-Gesamtsystem | Kein tatsächlich installiertes EOS-Gerät inventarisiert; Lockfile-Inventar umfasst weder OS noch Controller und andere EOS-Adapter. | Offen: genaues Zielsystem erfassen, unterstützten Node-/Controller-Stand festlegen, vollständiges Produktinventar und SBOM aus dem Auslieferungsimage ableiten. |
| SC-06 | Abhängigkeiten allgemein | Kein aktueller Advisory-Abgleich mit Registry/Herstellerquellen und kein `npm audit` ausgeführt. | Offen: zeitgestempelten Abgleich nachholen, konkrete Betroffenheit und Aufrufpfade bewerten. Keine CVE-Zuordnung und keine Aussage „keine Schwachstellen“ aus dieser Prüfung. |

Verantwortlich für die offenen Freigabeentscheidungen: NexoWatt/Produktverantwortung. Diese Tabelle bescheinigt keine Produktionsfreigabe. Die Lockfile-Lücken, der fehlende Normalbuild und die fehlende Systemintegration müssen für eine belastbare Serienfreigabe geklärt werden.

## Lokaler Fallback für geändertes Backend

`tools/nexowatt-transpile-security-backend.cjs` bearbeitet ausschließlich `src/main.ts`, `src/lib/web.ts`, `src/lib/eosRequestSecurity.ts` und kopiert die neuen `src/lib/eosLicense*.js` nach `build/lib/`. Standardmäßig erfolgt nur ein Probelauf. Mit `--write` werden geparste Ausgaben, echte verkettete Quellkarten und `fallback-build-provenance.json` geschrieben.

Das Werkzeug nutzt Node 24 `stripTypeScriptTypes` und den bereits lokal installierten Babel-Compiler aus Playwright. Das CommonJS-Modulverhalten wird explizit mit `noInterop:true` erzeugt. Damit bleiben die im Projekt verwendeten aufrufbaren Namespace-Imports (`express`, `compression` usw.) und `require(...).default` erhalten. Normale Babel-Standardeinstellungen wären für diese Imports ungeeignet. Quellcode wird beim Emit nicht ausgeführt; jede Ausgabe wird zusätzlich syntaktisch geparst. Der Fallback benötigt keine zusätzlichen npm-Abhängigkeiten im Adapterbetrieb.

Diese Transpilation ersetzt keine semantische TypeScript-Prüfung und keinen vollständigen tsc-/tsx-Build. Compilername, verwendete Node-Version, Babel-Dateihash und Quell-/Ausgabehashes stehen im Provenienznachweis. Die Änderung des Bundler-internen Layouts lässt das Werkzeug abbrechen, statt ungeprüft mit anderen Compileroptionen fortzufahren.

```sh
node tools/nexowatt-transpile-security-backend-selftest.cjs
node tools/nexowatt-transpile-security-backend.cjs
node tools/nexowatt-transpile-security-backend.cjs --write
node tools/nexowatt-security-inventory-selftest.cjs
node tools/nexowatt-security-inventory.cjs
```

Bei Bedarf kann `NEXOWATT_BABEL_BUNDLE` den Pfad zu einer **lokal installierten** passenden Playwright-Compilerdatei angeben. Das Werkzeug lädt nichts herunter. Der reguläre Projektweg bleibt `npm ci`, `npm --prefix src-admin ci`, Typprüfung sowie `npm run build` mit den verfügbaren und geprüften Projektabhängigkeiten. Installationsskripte und die Abhängigkeitsherkunft sind dabei Teil der kontrollierten Buildumgebung.

## Tatsächlich ausgeführte Prüfungen

- Inventar-Selbsttest: SRI-Hashumwandlung, Zurückweisung credential-/queryhaltiger Herkunfts-URLs, npm-Scopes, verschachtelte Abhängigkeitsauflösung, Drift-Erkennung, Graphreferenzen, deterministische Ausgabe – bestanden.
- Fallback-Emitter-Selbsttest: aufrufbare Namespace-Imports, Default-/Named-Imports, Entfernen expliziter Typimporte, Parameter-Properties, moderne Klassenfeldsemantik und Quellkarten mit originalem TypeScript – bestanden.
- Geänderte Backend-Dateien lokal emittiert und geparst; `nexowatt-backend-runtime-selftest.cjs` – bestanden (17 lokale Runtime-Dateien zum ersten Durchlauf).
- Bestehende ESM-Syntax-, Importintegritäts- und Entrypoint-Smoke-Prüfungen – bestanden.
- Kein installierter ioBroker, keine HTTP-Ende-zu-Ende-Prüfung, kein Gerätetest, kein vollständiger Normalbuild, keine externe CVE-Prüfung in diesem Unterauftrag.

Die endgültigen aggregierten Testzahlen des gesamten Änderungspakets sind im übergeordneten Prüfbericht maßgeblich. Berichte und Inventare nach dem letzten Source-/Build-/Versionswechsel neu erzeugen. Automatisches Erzeugen eines Inventars beim Freigabeschritt darf nicht automatisch einen anderen Code neu bauen oder ungeprüfte Änderungen als bestanden versiegeln.

## Nachtrag: Paketbereinigung und fortgeführte Regressionen

Beim Wechsel auf 7.10.10 wurde ein realer Paketfehler gefunden: Die vorhandene Runtime-Bereinigung löschte `tools/nexowatt-v7109-clean-core-selftest.cjs` allein aufgrund der älteren Versionsnummer im Dateinamen. Das Skript wird aber weiterhin ausdrücklich durch Paketinhalt und Prüfskripte referenziert. Die Originaldatei wurde aus dem Eingangs-ZIP wiederhergestellt. Die Bereinigung erhält jetzt exakt referenzierte Prüfdateien aus `package.json` (`files` und `scripts`), entfernt weiterhin nicht referenzierte Altreste und bleibt idempotent. Der Regressionstest prüft ausdrücklich Dateiliste, Skriptverweise, Anführungszeichen, Windows-Pfade und einen ähnlich benannten, aber nicht referenzierten Altbestand.

Der Vorab-Manifestgenerator versiegelt zusätzlich `packages/eos-license-client` und `test`. Damit werden Änderungen am mitgelieferten Adapter-SDK und an den Lizenzprüfungen beim nachfolgenden Integritätscheck sichtbar. Eine abschließende Versiegelung erfolgt erst nach dem letzten Bearbeitungsstand.

Die komplette Prüfketten-Erkundung führte 40 Befehlsgruppen aus, zunächst 34 erfolgreich. Vier Fehlschläge waren feste Erwartungen der alten Produktversion 7.10.9, einer war eine reine Einzeilen-Formatannahme für dieselbe schreibgeschützte Benutzer-ACL nach der Transpilation und einer erwartete die alte, inzwischen um `eos-admin` und `xterm` erweiterte Schutzliste. Die betreffenden Prüfungen wurden an 7.10.10, formatunabhängige ACL-Auswertung und die stärkere Schutzliste angepasst; alle sechs Nachprüfungen bestanden. Die ursprünglichen Rohbelege unter `raw/stability-discovery/` bleiben als Fehler-/Nachbesserungshistorie erhalten, sind keine Endabnahme.

Die Paketprüfung enthielt außerdem alte Vorgaben, welche die Kontoverwaltung und die Kennwortänderungsmaske untersagten. Die neue Sicherheitsmigration deaktiviert gemeinsam genutzte Altkennwörter und benötigt ausdrücklich die abgesicherte Administration für individuelle temporäre Kennwörter. Deshalb verlangt die aktualisierte Prüfung nun die abgesicherte Kontoverwaltung, ihre Migrations-/Kennwortmarker und die blockierende Kennwortänderungsmaske **nach erfolgreicher Anmeldung**. Kennwortlose Erstaktivierung bleibt untersagt. Diese Änderungen ersetzen die alte Sicherheitsanforderung gezielt; sie entfernen keine Prüfpflicht. `npm run check:eos-package` und die nachgebesserten Einzelprüfungen bestanden im Nachlauf. Der endgültige Gesamtprüflauf wird separat protokolliert.

## Fortschreibung 7.10.11: Unbeaufsichtigte Installation und CI

Die frühere automatische `major`-Freigabe wird nicht mehr erteilt. `src/lib/eosAutoUpdate.ts` beginnt beim Start unmittelbar mit einer Sicherheitsmigration: installierte `eos-*`/`nexowatt-*`-Adapter sowie zuvor nachweislich vom EOS-Manager verwaltete Adapter erhalten `automaticUpgrade: none`. Namenspräfixe bestimmen ausschließlich diesen Sperrumfang, niemals die Vertrauenswürdigkeit einer Veröffentlichung. Freie Publisher-/Titel-/URL-Metadaten werden nicht als Herkunftsnachweis verwendet. Bereits bestehende globale Drittanbieter-Richtlinien bleiben erhalten; vom EOS-Manager eingeschaltete Repository-Freigaben werden anhand seines vorhandenen Migrationsstands zurückgenommen. Alte Policywerte bleiben als Diagnose-/Migrationsdaten erhalten und werden nicht automatisch wieder aktiviert.

Der alte Ein/Aus-Schalter und direkte API-Aufrufe können die Integritätsprüfung nicht umgehen: Status enthält `enabled: false`, `blocked: true`, `policy: none` und einen eindeutigen Grund. Die Oberfläche erklärt die Sperre auf Deutsch und weist auf manuelle, geprüfte Administrator-Updates hin. Fehler bei der Migration werden als `UNATTENDED_UPDATE_MIGRATION_FAILED` sichtbar. Ein Datenbankfehler kann die systemweite Durchsetzung verhindern; der Status ist dann kein Beleg, dass der Controller tatsächlich alle alten Installationsaufträge gestoppt hat. Bereits laufende Controller-Installationen und unabhängige OS-/Drittanbieter-Updater werden durch diese Adapteränderung nicht abgebrochen. Diese Grenze ist auf dem Zielgerät zu prüfen. Manuelle Sicherheitsupdates brauchen bis zur fertig verifizierten Release-Pipeline eine verantwortliche und zeitnahe Bearbeitung.

**EOS-SUPPLY-001 / SC-04:** Die konkrete ungesicherte automatische Freigabe im EOS-Manager ist abgeschaltet und mit Migrationstests belegt. Eine kryptografisch abgesicherte automatische Release-Pipeline mit Hersteller-Vertrauensanker, exakter Version, Paketintegrität, Kompatibilitätsfreigabe und Rückfalltest ist weiterhin nicht implementiert. Keine allgemeine Lieferkettenfreigabe ableiten.

Die fünf bestehenden GitHub-Workflows wurden lokal gehärtet: keine automatische Freigabe, kein automatischer Dependency-Merge, kein npm-Publish/Release-Anlegen durch Tag-Push, keine fremde Upstream-Autoren-/Sentry-Zuordnung. Der manuelle Release-Review führt nur die schreibfreie Prüfstrecke aus. Checkout speichert keine Git-Zugangsdaten; allgemeine Rechte sind `contents: read`, CodeQL erhält ausschließlich für Ergebnisse zusätzlich `security-events: write` und `actions: read`. Aktionen sind auf vollständige Commit-IDs fixiert. Primärquelle, Tag-/Commit-Auflösung und Grenzen stehen in `action-pins-2026-09-30.json`; beim CodeQL-Tag wird ausdrücklich keine verifizierte Herausgebersignatur behauptet.

`tools/nexowatt-lock-provenance-check.cjs` ist eine neue, absichtlich blockierende Vorprüfung für einen künftigen sauberen CI-Build. Sie verlangt kohärente Manifest-/Lock-Metadaten, starke SRI-Prüfsummen und credentialfreie HTTPS-Tarball-URLs der vorgesehenen npm-Registry. Lokale Links und abweichende Herkunft benötigen gesonderte Prüfung; es werden keine Hashes ergänzt oder erfunden. Der Backend-Lock scheitert weiterhin an **563 fehlenden starken Integritätswerten und 563 nicht belegten Registry-Herkünften**. Der Frontend-Lock besteht diese begrenzte Metadatenprüfung. Das ist keine Prüfung tatsächlich heruntergeladener Bytes und kein Advisory-Abgleich. Der neue CI-Normalbuild bleibt deshalb bewusst blockiert, bis die Herkunftslücken in einer kontrollierten Umgebung behoben sind.

Nach erfolgreicher Aufnahmeprüfung sieht CI Node 22/24, Installation ohne Lifecycle-Skripte, tatsächliche `npm ls`-Bäume, npm-CycloneDX-Inventare, Lint, normalen vollständigen Build, vorhandene Tests und aktuelle Advisory-Ausgaben vor. Diese Pipeline wurde hier **nicht auf GitHub ausgeführt**. YAML wurde lokal geparst und die unveränderlichen Action-Referenzen/fehlende PR-Target-Ausführung kontrolliert. Keine Aussage „CI grün“, „Normalbuild bestanden“, „installierte SBOM“ oder „CVE-frei“ wird daraus abgeleitet. Lokal fehlen weiterhin TypeScript, tsx, Express und ioBroker-Abhängigkeiten; es wurde kein Ersatzpaket über einen unkontrollierten Pfad bezogen.

Tatsächlich ausgeführt: **25/25 AutoUpdate-Verhaltensprüfungen**, **11 Lock-Aufnahmefälle**, vorhandene UI-Platzierungsprüfung sowie echte Chromium-DOM-Prüfung des ausgelieferten AutoUpdate-Overlays in **1280 und 390 Pixel Breite**. Statusabrufe wurden im Browser gemockt: gesperrter/ungewählter Schalter, verständlicher Hinweis, keine Seitenfehler und kein horizontaler Überlauf. Rohbelege und reproduzierbare Preview liegen unter `raw/supply-7.10.11/`; kein Live-ioBroker/Controller-/Hardwaretest. Die Quell-/Build-Zuordnung wird im abschließend neu erzeugten Fallback-/Release-Manifest dokumentiert. Frühere Behauptungen „verzögerter Start“ oder „automatische Stable-Freigabe“ gelten für diesen Stand nicht mehr.

Zusätzlicher lesender Lizenzreview: zentrale Entschlüsselung statt Verteilung des AES-Schlüssels ist beibehalten; das lokale ioBroker-Messagebox-Protokoll ist keine isolierte Vertrauensgrenze gegen einen manipulierten Adapter mit denselben Betriebssystem-/Datenbankrechten. UUID-Bindung verhindert allein keinen vollständigen Systemklon. Windows-ACL, hardwaregestützter Schutz und geräteübergreifende Zähler bleiben gesonderte Integrationsanforderungen; hier wurde keine neue nachgewiesene Umgehung des Ed25519-/AES-Vertrags gefunden und keine stärkere Garantie behauptet.
