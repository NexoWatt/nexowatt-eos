# Erhaltener Erststart und Home-/Pro-Lizenzvertrag

Nachweis: `EOS-GITHUB-RECONCILE-PRESERVED-SYSTEM-20261004`
Basis: Branch `main`, Commit `4ac429e1f4f06a249053487f719f670a8d03472b`. Prüfung am 04.10.2026. Der Arbeitsbaum enthält parallel bearbeitete Branding-/Login-Dateien anderer Bearbeiter; diese gehören nicht zu diesem Bericht.

## Ergebnis

**Die aktuelle Implementierung bleibt erhalten. 127 von 127 vorhandenen begrenzten Onboarding-/Lizenztests bestanden; 0 Fehler und 0 übersprungen.** In den geprüften Bereichen wurde keine Codeänderung vorgenommen. Alle 18 gebundenen Onboarding-/Lizenzquell- und Build-Dateien stimmen mit `HEAD` überein. Der ältere Test.2-/Test.3-Erststart wurde nicht darüberkopiert.

| Anforderung | Festgestelltes Verhalten | Beleg |
| --- | --- | --- |
| Erststart mit UUID, Lizenz und Admin-Passwort | Authentifizierte UUID ist sichtbar, schreibgeschützt und kopierbar; Lizenz aktivieren, Passwort und Wiederholung. Schema 3 erlaubt keine zusätzlichen Anlagen-/Gerätefelder. | `runtime/onboarding/public/index.html`, `policy.cjs`, `configuration.cjs`, Frontend-/Konfigurationstests |
| Anlagenkonfiguration später | Server erzeugt ausschließlich aufgeschobene Inbetriebnahme; physische Steuerung bleibt gesperrt. HTTPS und Besitzcode bleiben Zugangsschutz vor dem eigentlichen Formular. | Onboarding-Policy und Enrollment-Tests |
| Home-/Pro-Systemlizenz | NWL3 prüft Signatur, UUID, Trust und feste Felder. Nur Home/Pro; keine frei signierten Adapter-, Mengen- oder Featurefreigaben. Home 3 Ladepunkte/2 Speicher, Pro 50/10 aus lokaler Editionspolitik. | `eosLicenseCore.js`, `eosLicensePolicy.js` und Core-Tests |
| Lizenzkontrolle und Neustart | Verschlüsselte Speicherung; Fixture-Neustart erhält Rechte. Aktivierte Senderinstanz, Features, Kapazität, Uhr und kurze Lease bleiben geprüft. | `eosLicenseService.js`, Core-/Service-/Trust-Tests |
| Bestehende Lizenzen | NWL2 behält ausdrücklich signierte Adapter-, Mengen- und Laufzeitgrenzen; keine stille Erweiterung durch NWL3. | Core-/Service-Kompatibilitätstests |
| Hersteller-Keygenerator | Separates Keygen-1.0.2-Paket mit Produktauftrag `{uuid, edition}` ist bereits dokumentiert. Sein eigenes Paket und dessen historische 26 Tests wurden hier nicht erneut geprüft. | `reports/integration/system-edition-license-20261003/README.md` |

## Bestehende R5-Lieferung

`delivery/test-pi-0.2.0-test.3-r5/delivery.json` wurde aus Git gelesen, nicht verändert. Die große Runtime liegt außerhalb des Sparse-Arbeitsbaums. Dieser Durchlauf hat deren Archiv weder entpackt noch die Signatur erneut geprüft. Die folgenden Werte sind historische Liefermetadaten, keine erneute Pi-Abnahme:

- Release-ID: `6afb22793667514f76bbcceb785ba84b00757105577a9909c182f8fc41e45061`
- Archiv-SHA256: `a2956eef2da94b4fd85dc218326e1bcbeeb57c833506ada1411378e624676695`
- Signier-Public-Key-SHA256: `dc73b3399c8c3790051d86461588f4cd716cd44aec1b64f70aa121f0175ab082`
- Version `0.2.0-test.3`, Revision 5, Sequenz 8, Profil `eos-full-install-first-start-v1`, Linux ARM64/PostgreSQL.

| Enthaltene Komponente laut Manifest | Version | Ausführungsfreigabe |
| --- | --- | --- |
| `js-controller` | 7.2.2 | Management-Test |
| `eos-admin` | 7.10.11 | Management-Test |
| `nexowatt-ui` | 1.0.21 | Management-Test |
| `nexowatt-devices` | 0.5.169 | Abnahme offen |
| `eebus` | 0.3.0 | Abnahme offen |
| `ocpp21` | 0.4.0 | Abnahme offen |
| `nexowatt-backup` | 1.0.10 | Abnahme offen |

Alle sieben Komponenten stehen dort auf installiert, nicht konfiguriert, inaktiv und `physicalControlEnabled: false`. R5 und seine Pins bleiben unverändert. Die aktuellen Quelländerungen an Branding/Login erzeugen keine neue signierte Pi-Runtime. Der öffentliche Neuinstallationsweg verweist laut vorhandener Produktdokumentation weiterhin auf R4; der gesonderte R4→R5-Reparaturweg hat eigene Voraussetzungen. Dieses Review ändert daran nichts.

## Ausgeführte Prüfung

Umgebung: Linux x86_64, Node.js v24.19.0. Kein Installieren von Abhängigkeiten.

```sh
node --test --test-reporter=tap tests/onboarding/*.test.cjs tests/system/first-start-license.test.cjs components/admin/test/eos-license-core.test.cjs components/admin/test/eos-license-service.test.cjs components/admin/test/eos-license-trust.test.cjs
```

Exit-Code 0; 127 Tests bestanden, 0 fehlgeschlagen, 0 abgebrochen, 0 übersprungen, 0 TODO. TAP-Laufzeit 2376.252633 ms. [Rohbeleg](preserved-system.tap); [maschinenlesbare Ergebnisse und SHA256-Quellbindung](preserved-system.json).

Der Lauf prüft echte Kryptografie und lokale Testdateien sowie begrenzte Frontend-/Server-/Enrollment-Fixtures. Objektzugriffe und lokale Adapter-Sender werden in Tests simuliert. Es wurde kein echter Browser, Raspberry Pi, nativer PostgreSQL-/systemd-Betrieb, Installer/Update oder physische Anlage ausgeführt. Node 24.19.0 ist keine Bestätigung der Zielumgebung Node 24.21.0. Ein erfolgreicher Kunden-Erststart oder Pi-Login wird daraus nicht abgeleitet.

Keine neuen Abhängigkeiten, Runtime-Dateien, Bundles, Schlüssel, Commits, Pushes oder Branches durch diese Teilprüfung. Keine zusätzliche Codekorrektur innerhalb des geprüften Umfangs erforderlich; reale Zielabnahme bleibt offen.
