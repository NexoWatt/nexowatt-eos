# EOS-Stabilisierungsstand 0.2.0-dev.3

Stand 01.10.2026; signiertes ARM64-Laborpaket `0.2.0-test.1`. Basiscommit `c211f1a48ee0b667fcc739ee9134616af43b6076`, finaler Liefercommit im äußeren Übergabenachweis. Die maschinenlesbare Bindung liegt unter `reports/integration/stabilization/verification-summary.json`.

## Ergebnis und Umfang

Ein getrennt installierbares Testpaket für Controller, EOS Admin und NexoWatt UI liegt vor. Persönliche Service-/Installateur-/Benutzerzugänge, HTTPS, zentrale Lizenzprüfung und verschlüsselte Objects-/States-Verbindungen gehören zum Profil. Das vorhandene UI und die übrigen Adapterquellen bleiben erhalten. Devices, EEBUS, OCPP und Backitup sind noch keine aktivierten, abgenommenen Anlagenadapter dieser Lieferung.

**Das Gesamtprodukt ist nicht produktionsfreigegeben.** Der vollständige UI-Pflichtlauf bleibt wegen sporadischer Mesh-Zeitüberschreitungen fehlgeschlagen. Eine Test-Pi-Installation kann jetzt die verbleibenden Zielgerätefragen prüfen; dieser Bericht behauptet weder einen bereits erfolgten Pi-Test noch einen vollständigen oder unabhängigen Penetrationstest.

## Änderungen mit Sicherheitswirkung

| Änderung | Umsetzung | Belastbarer Nachweis |
| --- | --- | --- |
| esbuild-Advisory | Exakte Blattabhängigkeit 0.11.23 → 0.28.2; Controller 7.2.2 und Loader 2.5.1-1 unverändert; tatsächliche Auflösung geprüft | Controller-Lader mit TS/JSX/TSX, Syntaxfehler, Quellpositionen und CORS getestet. Drei frühere Paketknoten gehörten zu einer GHSA, nicht drei CVEs. |
| Build-Vertraulichkeit | Private Assemblierung ausschließlich offline, keine npm-Lifecycle-Hooks, feste Node-/npm-Toolchain und ausdrückliche Plattformwahl | Leerer Cache und abweichender PATH negativ geprüft; tatsächliche Builds mit Node 24.21.0/npm 11.19.0. |
| ARM64-Zielbindung | Getrennte installierte Bäume, native Header/Plattformverträge, unbekannte Node-ABI gesperrt | Beide statischen Prüfungen bestanden; x64 als ARM64 abgewiesen. Keine ARM64-Ausführung behauptet. |
| SBOM-Integrität | Root-/Lock-/Manifestidentitäten, versteckte npm-Pakete, bekannte eingebettete Verzeichnisse und lokale Transformationen gebunden | Negative Tests einschließlich vor Transformation erzeugter SBOM und Python-/JS-Parität. Abhängigkeitsgraph nur auf gültige Referenzen geprüft, keine vollständige Kantenrekonstruktion zugesagt. |
| Installationsvorprüfung | Signatur, Profil, SBOM, Einrichtungsdateien, Hostwerkzeuge, Node, Ports und Systemd vor Installation prüfen | Signierte Vertragsfixtures, kein Zielhosttest. Webports auch im eigentlichen Installationsweg geprüft. |
| Zertifikatswechsel mit Rollen | Veraltete Enrollment-v1-Annahme korrigiert; v2 und bestehende Konten-/Gruppen-/ACL-Verträge vor/nach Markerwechsel prüfen | 48 Lifecycle-/Host-/Web-Prüfungen plus ein echter isolierter Redis-TLS/AOF-Lauf bestanden. |
| Mesh-Diagnose | Dauer fehlgeschlagener Versuche getrennt von alter erfolgreicher RTT; redundante Rückfallplanung reduziert | Neun deterministische Tests, Vergleich zum unveränderten Basisplaner. Zeitgrenzen unverändert; intermittierende Ursache weiterhin offen. |

## Tatsächlich ausgeführte Prüfungen

- Abschließender System-/Integrations-Regressionslauf: **406 bestanden, 0 fehlgeschlagen** auf Linux-x64 mit Node 24.21.0.
- Tatsächlicher Controller-/Redis-/Admin-/UI-/Browserlauf: **16 TAP-Tests einschließlich Elternfall** bestanden, entsprechend 15 Stufen. TLS 1.3 mit CA-/Hostprüfung, persönliche Rollen, eigene Passwörter, Lizenzwege und verweigerte physische/Mesh-Mutationen wurden ausgeführt.
- Dieser Prozesslauf verwendete eine explizite hashgebundene OS-Interface-Testfixture, temporäre Schlüssel/Konten und UID 0. Chromium nutzte genaue temporäre Zertifikats-SPKI-Pins; die Browser-Sandbox war im isolierten Root-Labor ausgeschaltet. Das ist kein Systemd-/unprivilegierter-Pi-Nachweis.
- Build-/Loader-/Offline-Nachprüfung: **27 bestanden**. Teile überschneiden sich mit anderen Läufen; die Zahlen werden nicht zu einer künstlichen Gesamtsumme addiert.
- Frischer Offline-`npm ci` auf beiden Plattformbäumen: je **466 installierte Paketmanifeste** und Lock unverändert reproduziert. Tatsächlich installiert sind je 426 unterschiedliche npm-Identitäten plus drei ausdrücklich gebundene eingebettete Verzeichnisse (zwei Identitäten).
- Vier CycloneDX-1.5-Dokumente gegen lokale Schemas validiert: x64-Laufzeit, ARM64-Laufzeit, Quell-Lockinventar und mitgeliefertes Node-Archiv. Betriebssystem, Redis, Firmware und vollständige Frontend-Bundlezuordnung bleiben eigener Inventarumfang.
- **UI-Gesamtsuite fehlgeschlagen:** zusätzlicher NORMAL-Lastfall meldete in Runde 12 einen tatsächlich gemessenen Versuch von 545,30 ms bei unveränderten 200 ms. Der alte kombinierte 99-Peer-/fsync-Fall bestand in diesem Lauf, scheiterte aber zuvor erneut. Einzelne grüne Läufe schließen den Befund `UI-MESH-PERF-20261001` nicht.

Die automatische Freigabeprüfung lehnte vollständige Online-Audits und Online-Installation des privaten EOS-Baums ab, weil private Paketnamen/-versionen an die öffentliche Registry gelangen könnten. Die Assemblierung wurde offline durchgeführt. Der öffentliche isolierte Loader-Probeaudit meldete null Befunde; daraus wird kein vollständiger aktueller EOS-Audit abgeleitet.

## Verbleibende Abnahme und Installation

Der Test-Pi muss noch identifiziert werden: Modell, RAM, 64-Bit-OS, SSD/Datenträger und vorhandene Daten. Die [Installationsanleitung](../operations/TEST_PI_INSTALLATION_DE.md) beginnt mit rein lesenden Befehlen. Notwendig ist außerdem ein echter öffentlicher Hersteller-Lizenz-Trust-Export; der private Lizenzschlüssel wird weder benötigt noch geliefert.

Danach offen: wirkliche ARM64-/Systemd-Installation, Neustarts/Dauerlauf, Zertifikatsbetrieb, Netzwechsel/IPv6-Konzept, Tailscale-Regeln und Fernwartung, Installation zusätzlicher Adapter im erweiterten Profil, sichere physische Regelung, Backup/Wiederherstellung, Update/Rückfall und unabhängige Sicherheitsprüfung. Gemeinsame Adapter-UID und Datenbankidentität bleiben eine gemeinsame Vertrauenszone; TLS ersetzt diese fehlende gegenseitige Isolation nicht.

CRA-/IEC-Ausrichtung verlangt über diesen Code hinaus Produktabgrenzung, Herstellerprozesse, Support-/Updateplanung, Risikobewertung und releasebezogene Nachweise. Signatur, SBOM und grüne Teilprüfungen allein bescheinigen keine Konformität. Der gewünschte Zeitraum 12.–18.10.2026 bleibt ein Ziel; eine stabile Anlagenfreigabe zu diesem Termin ist durch die vorliegenden Daten nicht zugesagt.
