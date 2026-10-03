# UUID-gebundene Home-/Pro-Systemlizenz NWL3

Nachweis-ID: `EOS-NWL3-SYSTEM-EDITION-20261003`. Quellbasis der EOS-Dateien: GitHub-Commit `6ee690e7503f7f609de1f7c1db1689a6ca39aec3`. Generatorbasis: vollständige Quelle 1.0.1; Zielversion 1.0.2. Diese Änderung erteilt keine allgemeine Produktiv- oder CRA-Konformitätsfreigabe.

## Verhalten und Vertrag

Der Generator erhält als Produktauftrag genau `{uuid, edition}`. Herausgeberschlüssel und Passphrase bleiben erforderlich; deren Handhabung wird nicht durch die Edition ersetzt. Der Generator setzt Ausgabe-/Startzeit selbst und erzeugt eine unbefristete Lizenz. Es gibt keine auswählbaren Adapter, Mengen oder Zeitfelder.

Token: `NWL3.BASE64URL_PAYLOAD.BASE64URL_SIGNATURE`. Die bestehende Ed25519-Signatur umfasst die exakten ASCII-Bytes `NWL3.` und das kodierte Payload. Erlaubt sind ausschließlich die signierten Felder:

```json
{
  "v": 3,
  "kid": "bestehende-issuer-kennung",
  "licenseId": "zufaellige-ausgabekennung",
  "uuid": "tatsaechliche-system-uuid",
  "edition": "home",
  "issuedAt": 1791028800000,
  "notBefore": 1791028800000,
  "expiresAt": null,
  "scope": "system"
}
```

Das Beispiel beschreibt das Schema, keine nutzbare oder ausgestellte Lizenz. `v === 3`, `scope === 'system'`, `edition` genau `home` oder `pro`, `notBefore === issuedAt` und `expiresAt === null` sind Pflicht. Zusätzliche Adapter-, Mengen- oder Feature-Claims werden auch bei korrekter Herausgebersignatur abgelehnt. UUID, Signatur, bekannte Trust-ID und Zeitbedingungen werden weiterhin geprüft.

Der Verifier liefert unveränderliche normalisierte Rechte mit `scope: 'system'`, leerer `adapters`-Liste und einer serverseitig festgelegten Editionspolitik aus `eosLicensePolicy.js`. Home erhält 3 Ladepunkte/2 Speicher; Pro 50/10. Diese Werte entsprechen den vorhandenen wirksamen UI-Servergrenzen in `components/ui/main.js` an der Quellbasis. Home-Features sind Energie, Wallet, Smart Home und Microgrid-Slave; Pro ergänzt Master, Multisite und Billing. Der alte Pro-Sentinel `maxWallboxes() === 0` aus dem UI-Hilfsmodul ist keine unbegrenzte Freigabe.

Für **NWL2** bleibt das bisherige signierte Schema verpflichtend. Normalisiert erhält es `scope: 'adapters'`; seine konkrete Adapterliste, Mengen und Laufzeit bleiben verbindlich, auch wenn sie enger sind als eine neue Systemedition. NWL2 und NWL3 sind durch Präfix, signierte Version und exakte unterschiedliche Feldmengen getrennt. Das Update erweitert alte Lizenzen nicht automatisch.

Der Lizenzdienst verzichtet nur bei einer verifizierten Systemlizenz auf die lizenzbezogene Adapterliste. Er prüft weiterhin die konkrete aktivierte lokale Senderinstanz, deren Namen, die Anfrage, Features, Kapazität, Uhr, Laufzeit, Rate und Lease. Eine Systemlizenz umgeht keine Paketfreigabe, Betriebssystemisolation oder Hardware-Sicherheitsprüfung. Die SDK-Lease-API liefert weiterhin `edition`, `features` und `limits`; sie wurde nicht gelockert.

## Dateien, Auslieferung und Schlüsselkontinuität

- `components/admin/src/lib/eosLicenseCore.js`: strenge NWL2-/NWL3-Prüfung, normalisierter Scope und verschlüsselte Speicherung beider Formate.
- `components/admin/src/lib/eosLicenseService.js`: System-Scope neben unveränderter NWL2-Listenprüfung.
- Neue `components/admin/src/lib/eosLicensePolicy.js`: unveränderliche, lokale Editionspolitik ohne frei wählbaren oder unbekannten Fallback.
- Entsprechende `build/lib`-Dateien sind bytegleich synchronisiert. Dies sind unmittelbar ausführbare CommonJS-JavaScript-Dateien. Der gezielte Overlay erfordert keine TypeScript-Übersetzung; eine vollständige Admin-Frontend-/Backend-Neukompilierung wurde hier nicht behauptet.
- Tests für neue Claims, Manipulation, UUID-/Trustbindung, alte engere Rechte, echte verschlüsselte Speicherung, Neustart, Senderkontrolle sowie geladene Build-Dateien wurden ergänzt.

Kein Trust-Anker wurde ersetzt und kein produktiver Herausgeberschlüssel erzeugt. Der bestehende verschlüsselte Herstellertresor bleibt erforderlich. Der Generator ist ein separates Herstellerwerkzeug und gehört nicht in das Kunden-Runtime-Paket. Tests verwenden ausschließlich temporäre beziehungsweise im Arbeitsspeicher erzeugte Testschlüssel.

## Ausgeführte Prüfungen

Umgebung: Linux x64, Node.js 24.19.0. Befehl aus der EOS-Repositorywurzel:

```sh
node --test --test-isolation=none --test-reporter=tap components/admin/test/eos-license-*.test.cjs
```

**89 bestanden, 0 fehlgeschlagen, 0 übersprungen.** [Vollständiger TAP-Beleg](raw/admin-licensing.tap). Die Tests verwenden tatsächliche Kryptografie, Dateien, Verifier, Service und SDK; ioBroker-Bus/Objektzugriff ist simuliert. Die bestehende Trust-, HTTP- und Lease-Abwehr wird mitgeprüft. [Quellbindung](raw/source-binding.json). Ein weiterer Generatorlauf umfasst 26 bestandene Issuer-/HTTP-/Frontend-/Vertrags-/Admin-Interop-Tests; dessen Rohbeleg liegt im getrennten Generatorpaket unter `reports/raw/keygen-1.0.2-edition-tests.tap`.

Keine native Debian-13-/ARM64-/Windows-/SMB- oder reale Energiehardware-Abnahme wurde hier durchgeführt. Die Tests ersetzen keine vollständige Neuinstallation, keine echte Browser-/Erststart-Abnahme auf dem Pi und keine Sicherheitszertifizierung. Der Root-Integrationsnachweis muss die angepassten Onboarding-Scope-Prüfungen und das tatsächlich gepackte R5-Artefakt gesondert binden. Ältere EOS-Versionen ohne NWL3-Unterstützung lehnen neue Lizenzen ab; ein Generatorupdate allein aktualisiert keine Kundenanlage.

## CRA und SBOM

Neue externe Abhängigkeiten: **keine**. Vertrauensgrenzen und Formatänderung sind hier dokumentiert; historische NWL2-Belege bleiben historische Nachweise. Das neue Generatorpaket erhält ein aktuelles Quellinventar und CycloneDX-SBOM. Der EOS-Paketierungsnachweis muss die geänderten Admin-Dateien, neue Policy und aktualisierte SBOM an die finale Runtime-Prüfsumme binden. Dieses Dokument erklärt keine CRA-Konformität.
