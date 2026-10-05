# Gemeinsame Abnahme: zentrale EOS-Lizenz, Branding und R9-Vorbereitung

05.10.2026 · Basis `4e171e4` · Linux x64, Node 24.19.0 · aktueller Arbeitsbaum,
zugeordnet über `source-hashes.json` und den veröffentlichenden Commit.

Die sechs Komponenten sind im [Änderungsvermerk](../../../docs/development/EOS_CENTRAL_LICENSE_2026-10-05_DE.md)
zusammengeführt. Jede enthält denselben zentralen Client 1.0.2. Root ergänzte den
frühen EOS-Startcheck in Admin und UI, führte die UI-Quellen/Runtime/typisierten
Spiegel zusammen und nahm den R9-Updater in den signierten Werkzeugumfang auf.
Admin-main wurde mit dem gelockten TypeScript 5.9.3 transpiliert und einschließlich
Source Map abgeglichen; dies allein ist kein vollständiger Admin-Backend-Neubuild.

## Tatsächlich lokale Prüfungen

| Prüfung | Ergebnis | Rohbeleg |
| --- | --- | --- |
| Ausgewählte bestehende und aktuelle Produkt-, Lizenz-, Rollen-, PostgreSQL-, Branding- und Transportverträge aus `security-review.yml` | 436/436 bestanden | `product-contracts.tap` |
| Tatsächliche Admin-/UI-Einstiegsmethoden verweigern Start außerhalb EOS vor Seiteneffekten; sechs Clientkopien; vollständige UI-Lifecycle-Spiegelparität | 4/4 bestanden | `own-adapter-admission.tap` |
| UI: echte HTTPS-/Authgrenzen, zentrale Home/Pro-Freigaben, Widerruf und lokale Schlüsselablehnung | 52/52 bestanden | `ui-license-auth.tap` |
| R9-Overlay, abgeleitete SBOM, Runtime-SBOM und Updater-Fehlerfälle | 45/45 bestanden | `r9-contracts.tap` |
| UI-Runtimeparität, 501 Spiegel, Typprüfung des Main-Spiegels und deutsche Modulverknüpfungen | Bestanden | Komponentenbericht und ausgeführte CLI-Prüfungen |
| Admin vollständiger kanonischer `check:eos-stability` und Prebuilt-Seal | Bestanden | `components/admin/reports/security/admin-branding-20261005/raw/full-stability.log` |

Die Suiten überlappen; ihre Zahlen sind keine Anzahl unabhängiger Produktanforderungen.
Beim gemeinsamen Lauf wurde ein fester alter Cachewert im Startbranding-Test
auf die gemeinsame Versionskonstante umgestellt. Der UI-Kaltstarttest ersetzt
explizit nur die root-geschützte Plattformprüfung; deren echte negative Prüfung
erfolgt getrennt, deren positive vollständige Prüfung im nativen Labor.
Keine fehlgeschlagene kritische Prüfung wurde unterdrückt.

Komponentenberichte enthalten weitere tatsächliche Tests: Admin 96 Lizenzfälle,
Devices 14 Lizenzfälle und 275 bestandene Gesamtfälle mit neun wegen fehlender
Transportabhängigkeiten übersprungenen Fällen; EEBUS/OCPP ihre Build-/Metadaten-/
TLS-Verträge; Backup 14 Lizenz- und 35 bestehende Offlinefälle. Ein nicht-root-
Rechtefall war im lokalen UID-0-Umfeld nicht ausführbar und bleibt dort offen.
Die normale nicht-root-CI führt die Backup-Offlinesuite ohne diesen Ausschluss aus.

## Lieferketten- und Updategrenzen

Der [interne parallele Review](../installable-test3-r9-20261005/INTERNAL_REVIEW_DE.md)
prüfte unabhängig vom Implementierer die echte R8-Signatur, 22.842 gebundene
Dateien und die Paket-/SBOM-Überlagerung. Der neue R9-Lauf verlangt außerdem
einen erfolgreichen nativen Test genau derselben Quellversion und App-Bytes vor
Signierung. Unabhängiges Rücklesen des späteren signierten Archivs bleibt nötig.

Der Updater wurde mit Fehler-Injektion, echter Signaturmanipulation und
unveränderten geschützten Konfigurationen geprüft; [19 Testgruppen und Grenzen](../test-update-r9-20261005/README.md).
Die tatsächliche systemd-/Pi-Umschaltung wurde lokal nicht ausgeführt.
Historische Lieferdateien wurden nicht verändert.

**Noch nicht durch diese lokalen Belege nachgewiesen:** nativer R9-Start unter
Node 24.21.0, neues signiertes R9-Archiv, öffentliches Rücklesen, Pi-Update,
Browserabnahme und Geräte-/Hausanlagenbetrieb. Der Auslieferungslauf muss die
ersten drei Punkte separat belegen. Native Systemrestores und globale
Kontingent-Deduplizierung bleiben ausdrücklich offene Funktionsgrenzen.

Keine Produktionsfreigabe, keine externe Sicherheitsprüfung und keine CRA-/IEC-
Konformitätsbehauptung. Der Testumfang startet weiterhin nur Admin/UI.
