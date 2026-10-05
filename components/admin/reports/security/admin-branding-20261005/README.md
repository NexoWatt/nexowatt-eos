# Admin: kleine Produktlogos und Browsercache, 05.10.2026

## Bezug und Änderung

Kennung **ADMIN-BRANDING-20261005**, Admin **7.10.11**, Ausgangscommit
`4e171e4` (vollständiger Commit und Dateihashes: `final-bundle-provenance.json`).
Der Nutzer meldete nach der Wizard-Reparatur verbliebene kleine ioBroker-Logos.
Im ausgelieferten React-Bootstrap steckte weiterhin das blaue ioBroker-Zahnrad
als eingebettetes SVG. Es wurde im Wizard-Kopf und in den vorhandenen
Zugangsdatenvorlagen verwendet. Die zugehörige Quelldatei `assets/logo.svg`
enthielt bereits das freigegebene grüne NexoWatt-Emblem.

`tools/nexowatt-build-branding-assets.cjs` übernimmt genau dieses vorhandene
Quell-SVG in die ausgelieferte Konstante. Die darin enthaltenen PNG-Bytes müssen
mit `src-admin/public/img/eos/nexowatt-192.png` übereinstimmen. Nur der bekannte
Altinhalt mit festem SHA-256 oder das bereits korrekte Ergebnis werden akzeptiert;
unbekannte oder mehrfach vorkommende Grafiken brechen die Transformation ab.
Die zwei Wizard-Bildbeschriftungen lauten ebenfalls NexoWatt EOS. Der Header-
Fallback im TypeScript verwendet nun denselben EOS-Pfad wie der schon vorhandene
Laufzeit-Header. Favicon, Manifestgrafiken, Navigationslogo und Start-Loader waren
bereits NexoWatt; sie wurden kontrolliert und nicht neu gestaltet.

Die bestehende Cache-Transformation setzt Version **20261005** für 34
zusammenhängende Anwendungsmodule und die zwei HTML-Einstiege. Sie berücksichtigt
auch Rückverweise und dynamische Preload-Listen, damit alte Seitenmodule nicht
wieder den alten Bootstrap laden. Die Bibliotheksinhalte bleiben bytegleich.
Eine gemeinsame Versionskonstante wird von Cache-Werkzeug und Paketprüfungen
verwendet. Das Werkzeug aktualisiert jetzt auch einen vorhandenen HTML-Versions-
Metatag. Zwei Importprüfungen lösen Query/Fragment korrekt als URL-Zusatz auf,
statt sie irrtümlich als Bestandteil eines Dateinamens zu behandeln.

Der bestehende Post-Build-Guard hatte eine widersprüchliche Forderung nach dem
aktiven Text „EOS Hilfe“. Das stabile Profil deaktiviert den Assistenten bereits
seit 7.9.97. Der Guard prüft jetzt den vorhandenen Separationstest: Konfiguration
deaktiviert beide Assistenten, der Browser entfernt dessen Einstieg, das Backend
weist `chat:` ab. Zusätzlich wird die Quell-/Laufzeitgleichheit geprüft. Es wurde
kein Assistent aktiviert und keine Sicherheitsprüfung ersatzlos entfernt.

## Risiko und Grenzen

Reine lokale Produktgrafik- und Buildprüfungsänderung: keine neuen Netzabrufe,
Zugangsdaten, Berechtigungen, Steuerbefehle oder Gerätefunktionen. Technische
Adapter-/Providernamen, URLs, fremde Adaptergrafiken und MIT-/Urheberhinweise
bleiben erhalten. Die exakte Transformation aller 245 vorhandenen JS-Module
wurde gegen den Ausgangscommit nachgewiesen; 34 ändern sich, davon 33 nur durch
die bestehende Cache-Transformation.

Dies ist eine begrenzte, reproduzierbare Aktualisierung des geprüften
v84-Vorbuilds, **kein vollständiger Vite-/TypeScript-Neubuild**. Die regulären
Frontend-Abhängigkeiten sind hier nicht installiert. Bestehende signierte
Lieferdateien wurden nicht neu versiegelt. Keine Produktions-, IEC- oder
CRA-Freigabe wird behauptet.

## Tatsächliche Prüfung

Umgebung: Linux, Node **24.19.0**, 05.10.2026. Befehle im Verzeichnis
`components/admin`, außer ausdrücklich anders angegeben.

| Prüfung | Befehl / Beleg | Ergebnis |
| --- | --- | --- |
| Geprüfter Grafikabgleich | `node tools/nexowatt-build-branding-assets.cjs`; `asset-transform.json` | Bestanden; alte eingebettete Grafik ersetzt, wiederholter Lauf unverändert |
| Cache-Abschlussmenge | `node ../../tools/integration/version-admin-browser-assets.cjs`; ab Repositorywurzel: `reports/integration/admin-browser-cache-20261005/asset-versioning.json` | Bestanden; 34 Anwendungsmodule, 36 veränderte Dateien beim ersten Lauf |
| Positiv-, Negativ-, Erhaltungstests | `node --test test/eos-branding-assets.test.cjs ../../tests/integration/admin-browser-cache.test.cjs`; `raw/branding-and-cache-tests.log` | 7/7 bestanden |
| Quellen/Laufzeit/Favicon/Manifest | `node tools/nexowatt-branding-selftest.cjs`; `raw/branding-selftest.log` | Bestanden |
| Vorhandene Paketprüfung | `node tools/nexowatt-validate-package.cjs`; `raw/package-validation.log` | Bestanden |
| Importziele und Versionskonsistenz | `node tools/nexowatt-import-integrity-selftest.cjs`; `raw/import-integrity.log` | Bestanden |
| Erreichbarer Modulgraph | `node tools/nexowatt-frontend-graph-check.cjs`; `raw/frontend-graph.log` | 208 erreichbare Module, ein HTML5-Backend |
| JavaScript-Parser | `node tools/nexowatt-esm-syntax-selftest.cjs`; `raw/esm-syntax.log` | Bestanden |
| Rollen, stabiler Kern, Assistententrennung | Entsprechende `nexowatt-*-selftest.cjs`; `raw/role-security.log`, `raw/clean-core.log`, `raw/assistant-separation.log` | Bestanden |
| Post-Build-Guard | `node tools/nexowatt-patch-built-frontend.cjs`; `raw/post-build-guard.log` | Bestanden; Grafik, Syntax, Schreibregeln, Importe, Rollen, deaktivierter Assistent |
| Vollständige vorhandene Stabilitätskette | `npm run check:eos-stability`; `raw/full-stability.log` | Bestanden, Exit 0; einschließlich Lizenz-, Rollen-, Passwort- und Sicherheitsprüfungen |
| Abschließender lokaler Quell-/Runtime-Seal | `node tools/nexowatt-prebuilt-release-selftest.cjs --write`, danach Prüfung ohne `--write`; `raw/prebuilt-seal.log` | 1478 Dateien, 26 Backendmodule; nach vollständiger Stabilitätskette erneut gültig |
| Exakte Artefaktänderung | `final-bundle-provenance.json` | 245 Module gegen Ausgangscommit geprüft; ausschließlich Grafik-/Beschriftungs-/Cache-Transformation |
| Sichtprüfung der Grafiken | `visual-asset-check.png` | Vorheriges blaues Logo und vorhandenes NexoWatt-Emblem tatsächlich gerendert/angesehen; NexoWatt-Pfade und 24px-Darstellung kontrolliert |
| Browser/Installation/Hausanlage | Vollständige laufende Admin-Oberfläche, Pi-Update und Gerätefunktionen | **OFFEN**; kein Browser-Binary, kein laufender Admin und keine Hausanlage in dieser Umgebung |

Die zusätzliche vollständige Stabilitätskette fand weitere historische
Cache-Erwartungen (`?v=7109` bzw. `security=20260930`). Die aktiven Prüfungen
verwenden nun dieselbe aktuelle Cachekonstante wie die gelieferten HTML-Dateien;
die inhaltlichen Schutzprüfungen bleiben erhalten. Der npm-Prehook ergänzte acht
bereits vorhandene Paketmetadaten im Admin-Quell-Lock; keine Abhängigkeitsversion
wurde dabei geändert. Der finale lokale Seal wurde danach auf ausdrücklichen
Auftrag erneuert; bestehende signierte historische Lieferungen bleiben unverändert.

Zwei bestehende isolierte Test-Harnesses wurden an tatsächlich geltende
Schnittstellen angepasst: Der Sessionsecret-Harness modelliert jetzt nur die
Plattformzulassungsgrenze und führt den echten frühen Start-Guard weiter aus.
Ein neuer Negativtest weist nach, dass verweigerte Plattformzulassung keinerlei
Konfigurationslesen, Zufallsgeheimnis, Konto-/Lizenzdienst oder Webstart erreicht.
Die Sicherheitsgrenzen bestehen mit **41/41** Fällen. Der Passworttest prüft
atomaren Controller-Schreibvorgang, sofortigen Sessionwiderruf und anschließende
Verifikation in dieser Reihenfolge; ein Widerruf vor dem atomaren Schreiben
würde dessen eigene frische Berechtigungsprüfung ungültig machen. Hier wurde
ausschließlich die Testannahme berichtigt, kein Produkt-Schutz entfernt.

## Kurzer Praxistest und Rückfall

Vor dem vorgesehenen Testupdate die bisherige Installation sichern. Admin neu
öffnen; gegebenenfalls einen bereits offenen Tab neu laden. Kopf-/Seitenlogo,
Login, Favicon, Wizard-Kopf und Wizard-Abschluss müssen NexoWatt zeigen. Bei
vorhandenen Zugangsdatenvorlagen erscheint das gleiche kleine grüne Emblem;
Providerbezeichnungen bleiben korrekt. Anmeldung, Rollenzuordnung und bisherige
Menü-/Datenpunktbedienung müssen unverändert funktionieren. Der stabile
Assistent bleibt deaktiviert. Bei Fehlern auf die vorherige gesicherte Version
zurückkehren; Version, Browser und betroffene Ansicht ohne Zugangsdaten melden.
