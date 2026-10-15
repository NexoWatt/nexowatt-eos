# Laufzeit-Abhängigkeiten: eng begrenzte R9-Nachprüfung

Bezug: **EOS-OCPP-LOCK-AUDIT-20261007**, unveränderte R9-Testlieferung, Sequenz 12.
Dieser Nachtrag ergänzt den [vorhandenen Befundbericht](../../license-status-ci-20261007/README_DE.md).
Er schließt den Befund nicht, unterdrückt keine Auditmeldung und erklärt weder
Fehlerfreiheit noch eine Produktions-/CRA-Freigabe.

## Tatsächlich geprüft

Die von Git geladene unveränderte Archivdatei hat SHA-256
`8adad353b83de5f396cb9402442f430d65f70e9538390e8b02b6073bc21e7d31`.
Die vorgelagerte Bundle-Prüfung bestätigte Signatur und alle 22.316 inventarisierten
Dateien, Release-ID
`97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000`.
Der hier abgelegte Prüfer kontrolliert den bekannten Manifesthash selbst erneut
und vergleicht **jede von ihm untersuchte Datei** mit dessen Inhaltsinventar.
Er ersetzt nicht die vorgelagerte Signaturprüfung.

Ausführung: 15.10.2026, Linux/x64, Node **24.19.0**. Dies ist nicht die qualifizierte
Ziel-Node-Version 24.21.0, kein ARM64-Test und keine Installation auf dem Pi.
Rohdaten: [r9-runtime-evidence.json](r9-runtime-evidence.json).

```sh
node reports/integration/own-adapter-test-20261015/dependency-review/check-r9-runtime.cjs \
  /absolute/authenticated-r9/bundle/payload/app
```

Der Prüfer liest das Artefakt und schreibt JSON auf stdout. Er installiert nichts,
verändert das Artefakt nicht und startet keine Adapter, Dienste, Listener,
Zertifizierungsstellen oder Gerätebefehle. Der untergeordnete Schematest hat ein
hartes Prozesszeitlimit von 5 Sekunden; ein bloßer JavaScript-Timer würde
synchrone blockierende Prüfungen nicht begrenzen.

## Ergebnis und Grenzen

| Gegenstand | Tatsächliches Ergebnis |
|---|---|
| Quelltextinventar | 13.809 JS-/TS-Dateien, 159.570.689 Bytes einschließlich minifizierter Dateien; zusätzlich 803 Paketmanifeste |
| Forge-Importe | Außerhalb von Forge selbst nur zwei wörtliche `node-forge`-Referenzen: CJS-/ESM-Tools von `@iobroker/js-controller-common-db@7.2.2` |
| Forge-Paketbeziehung | Genau dieses Paket deklariert Forge als Laufzeitabhängigkeit; native Modulauflösung führt auf `node-forge@1.4.0` |
| AJV-Auflösung | `ocpp-rpc@2.2.1` lädt tatsächlich seine verschachtelte Kopie `ajv@8.14.0`, nicht die ebenfalls vorhandene 8.20.0 |
| Schemaprüfungen | Alle fünf unten beschriebenen Prüfgruppen bestanden |

Die fünf isolierten Prüfgruppen:

1. Alle drei gebündelten OCPP-Validatoren laden, keiner aktiviert `$data`.
2. Gültiger OCPP-1.6-Heartbeat wird akzeptiert; zusätzliche unbekannte Eigenschaft
   wird verworfen.
3. Die drei gebündelten Schemadateien enthalten keine `$data`-Referenz.
4. Ein dynamisches `$data`-Pattern wird bereits beim Anlegen über die tatsächliche
   Validatorfabrik abgewiesen.
5. Das ungeprüfte Ersetzen durch vorhandenes AJV 8.20.0 reproduziert einen
   **erwarteten Fehler** beim Laden alter URN-Schema-IDs. Dies ist ein
   Kompatibilitätsnachweis gegen einen blinden Versions-Override, kein Produktfix.

### Forge: vorhandene Schwachstellenmeldung, kein pauschaler Entwarnungsnachweis

Das aktuelle [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
(CVE-2026-85393) betrifft Forge bis einschließlich 1.4.0. Beim Abruf am
15.10.2026 wurde keine gepatchte Version genannt. Das
[Upstream-Issue 1149](https://github.com/digitalbazaar/forge/issues/1149) und der
[Reparaturvorschlag 1152](https://github.com/digitalbazaar/forge/pull/1152) waren
offen; ein offener Vorschlag ist kein veröffentlichter Herstellerfix.

Die untersuchten tatsächlichen Common-DB-Dateien benutzen Forge zum Auslesen von
Zertifikatsinformationen sowie zum Erzeugen und Signieren eigener Zertifikate
(RSA-Exponent 65537). Dort gibt es keinen Aufruf der betroffenen
RSA-Signaturprüfung. Eigene EOS-Prüfpfade für Release-Signaturen und TLS verwenden
native Node-Kryptografie beziehungsweise den nativen TLS-Stack. Das ist eine
begrenzte Aufrufpfadbewertung, **keine vollständige Nichterreichbarkeitsbehauptung**.

Eine Suche nach einem Paketnamen erkennt weder beliebig dynamisch konstruierte
Importe noch umbenannte oder ohne Namenshinweis eingebettete Bibliothekskopien.
Source Maps wurden nicht untersucht. Eine vollständige dynamische Aufrufanalyse
oder Exploit-Reproduktion wurde nicht ausgeführt. Der offene Befund bleibt
erhalten; kein pauschales VEX-`not_affected` wird ausgestellt.

### AJV: konkrete Angriffsvoraussetzung nicht aktiviert, Migration bleibt nötig

[GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
(CVE-2025-69873) betrifft dynamische reguläre Ausdrücke bei aktivierter
`$data`-Option. Die referenzierten Versionskorrekturen sind AJV 8.18.0 bzw. 6.14.0.
Die tatsächlich ausgelieferte OCPP-Validatorfabrik setzt nur
`new Ajv({strictSchema: false})`; sie aktiviert `$data` nicht. Genau diese
Angriffsvoraussetzung ist in den hier ausgeführten Fabrik-/Schemaszenarien nicht
aktiv. Daraus folgt **keine allgemeine Sicherheit aller regulären Ausdrücke** und
keine automatische Freigabe der gesamten OCPP-Eingabevalidierung.

Ein bloßer Lockfile-/Versions-Override ist inkompatibel. Upstream dokumentiert
im [Validator-Migrationscommit](https://github.com/mikuso/ocpp-rpc/commit/9aff04d92ec6cadd397811b1b91775e832e35181)
geänderte URN-Namespace-Anforderungen. Der hier ausgeführte Test bestätigt den
Ladefehler. Nächster Schritt ist eine zusammenhängende, getestete
Validator-/Schema-Migration mit neuen Paketpins, Runtime-SBOM und positiven wie
negativen Protokolltests, nicht `npm audit fix --force`.

## Nicht geleistet / Freigabeentscheidung

- Kein frischer vollständiger Schwachstellenscan, keine Paketaktualisierung und
  kein Schließen der bestehenden Auditbefunde.
- Keine Aussage zu künftigen geänderten Artefakten: andere Hashes erfordern
  erneute Bewertung. Der Prüfer ist absichtlich an R9 gebunden.
- Keine Zusage zur Live-Konfiguration, OS-/DB-Trennung oder Gerätefunktion.
- Diese Nachweise können eine begrenzte Testentscheidung unterstützen. Sie
  ersetzen weder die Gesamtintegration noch eine verantwortete Produktionsfreigabe.
