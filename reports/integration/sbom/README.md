# SBOM- und Lieferkettennachweise der Integration

Diese Dateien haben unterschiedliche Geltungsbereiche. Ein Quelleninventar oder Audit eines Bewertungsbaums darf nicht als Freigabe des ausgelieferten Produkts gelesen werden.

| Dateien | Bezug |
| --- | --- |
| `source-lock-inventory.cdx.json` | Quellen und deklarierte Lockeinträge einschließlich Entwicklungs-/Frontendabhängigkeiten; erzeugt mit `tools/integration/source-inventory.py` |
| `assessment-tree.*`, `assessment-build.json`, `assessment-package*.json` | historischer erster isolierter Aufbau aller sechs Adapter, vor den nachfolgenden Admin-/UI-Nachbesserungen; Controller hier noch nicht als EOS-Profil transformiert; ausschließlich Bewertung |
| `candidate-final-*` | letzter Admin-/UI-Kandidat (R4) mit aktueller Admin-Versiegelung, exaktem Lock, lokaler Controllertransformation und gebundenem Ist-SBOM; 465 npm-Verzeichnisse / 425 npm-Identitäten + 2 eingebettete Pakete; Audit: 3 moderate Paketknoten, kein hoch/kritisch |
| `candidate-*` ohne `final` und `review-snapshots/` | historische Admin-/UI-Kandidaten vor den im tatsächlichen Integrationstest gefundenen Korrekturen der UI-State-Initialisierung und des Admin-Gruppen-Views; keine Aussage über den finalen Runtimecode |
| `post-admin-assessment-*` | neuer Bewertungsbaum aller sechs Komponenten nach Admin-Korrektur, vor abschließender EEBUS-Protokollkorrektur; 675 npm-Verzeichnisse / 624 Identitäten + 2 eingebettete Pakete; Audit: 12 Paketknoten (2 kritisch, 10 moderat), keine Freigabe |
| `aggregate-replay.json` | erneuter `npm ci` des historischen Bewertungsbaums: unveränderter Lock und 745 identische installierte Paketmanifeste; keine Behauptung vollständiger Binär-Reproduzierbarkeit |
| `admin-ws-integrity.json`, `ws-registry-dist.json` | ursprüngliche Admin-Lock-Abweichung und Vergleich mit offizieller Registry sowie unabhängig geladenem Archiv |
| `oauth2-modern-registry.json`, `oauth2-isolated.audit.json` | unabhängige Metadaten-/Auditprüfung der konkreten OAuth-Alternative; noch kein API-Kompatibilitätsnachweis des Admin |
| `eebus-build*`, `eebus-resolved-build-lock.json` | tatsächlicher isolierter TypeScript-Build; ursprünglicher EEBUS-Lock war veraltet; keine Geräte-/Protokollabnahme |
| `schema-validation.json` | vollständige lokale CycloneDX-1.5-Schemaprüfung, gebunden an konkrete SHA256 der jeweiligen SBOM-Dateien |
| `*-tests.*` | automatisierte Prüfungen der Inventar-/Buildwerkzeuge mit positiven und negativen Fällen |

Der historische vollständige Bewertungsbaum enthält 745 installierte npm-Paketverzeichnisse, 683 unterschiedliche npm-Name/Versionskombinationen und zwei ausdrücklich erfasste eingebettete Pakete. Sein damaliges Audit meldete 18 betroffene Paketknoten (2 kritisch, 6 hoch, 10 moderat), teilweise entlang derselben Abhängigkeitskette. Das sind weder 18 eigenständige CVEs noch das Ergebnis eines später reparierten Admin-/UI-Kandidaten.

Ein späterer Kandidat braucht eigene `candidate-*`-Nachweise aus seinem tatsächlichen installierten Baum, einschließlich der lokal transformierten Controllerdateien. Ergebnisse dürfen nach Quelländerungen nicht rückwirkend als Prüfung des neuen Stands ausgegeben werden. Die Hashes sind Bindungen der jeweiligen Dateien, keine automatische Freigabeentscheidung.

OS-/Node-/Redis-Binaries, Firmware und reales Geräteinventar sind nicht durch diese npm-SBOM vollständig erfasst. Die vollständige Rekonstruktion der Frontend-Bundle-Abhängigkeiten bleibt über die explizit nachgewiesenen eingebetteten Pakete hinaus offen. Verfügbare Quell-Lockdateien sind dafür eine Ausgangsbasis, kein Ersatznachweis.
