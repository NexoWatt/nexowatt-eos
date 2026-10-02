# EOS-Testbasis: Komponenten, Erststart und Nachweisgrenzen

Stand: 01.10.2026. Entwicklungsstand `0.1.0-test.1`, keine Serienfreigabe.
Diese Datei ergänzt das bestehende Quelleninventar. Ein verfügbarer Quellstand
ist weder automatisch im Testsystem enthalten noch installiert, aktiviert oder
für eine reale Anlage freigegeben.

## Tatsächlich vorbereitete Controller-Laufzeit

Für die neue Testbasis wurde ein isolierter npm-Baum mit exakt
`iobroker.js-controller@7.2.2` installiert. npm-Lebenszyklusskripte waren deaktiviert;
`setup first` wurde dabei nicht ausgeführt. Der Controller, seine Objekt-/State-
Redis-Clients, Adapter-Basis und CLI liegen als veröffentlichte gebaute Pakete
vor. Der abschließende EOS-Testlieferstand verändert anschließend den Controller
und `@iobroker/js-controller-cli` gezielt durch das EOS-Profil. Die Transformations-
datei bindet jeden ursprünglichen und geänderten Dateihash; in der SBOM sind beide
Komponenten als modifiziert markiert. Originale npm-Archivprüfsummen stehen bei
der Herkunftskomponente (`pedigree.ancestors`) und werden nicht als Hash des
lokal veränderten Pakets ausgegeben. Die Redis-Clientmodule ließen sich unter Node **24.19.0**, npm **11.9.0**,
Linux x86_64 importieren. Das Paket deklariert Node `>=18.0.0`; diese Angabe und ein
Importtest sind keine vollständige Node-/Hardware-Kompatibilitätsfreigabe.

Der neue Runtime-Lockfile löst `ioredis@4.31.0` auf. Der ältere Controller-
Quelllockfile enthält dagegen `4.28.5`; beide Belege dürfen nicht vertauscht
werden. Der neue Baum enthält **253 installierte Paketverzeichnisse / 250
eindeutige npm-Komponenten**. Die CycloneDX-Datei beschreibt diesen npm-Baum,
nicht Linux, den Node-Binärcode, Redis, Firmware oder weitere Adapter.

Belege:

- `reports/test-base/controller-runtime.cdx.json`
- `reports/test-base/controller-runtime.coverage.json`
- `reports/test-base/controller-npm-install.log`
- `reports/test-base/controller-npm-audit.json`
- `reports/test-base/controller-runtime.schema-validation.json`
- `reports/test-base/controller-profile-transform.json`

Die Prüfung des neuen Controller-Baums meldet **drei moderate Paketbefunde**, die
auf denselben transitiven Pfad zurückgehen: `iobroker.js-controller` →
`@alcalzone/esbuild-register@2.5.1-1` → `esbuild@0.11.23`, Advisory
[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
Das Advisory betrifft den esbuild-Entwicklungsserver. Der untersuchte Register-
Aufruf verwendet `transformSync`; ein solcher Entwicklungsserver wird durch die
Testbasis nicht eingerichtet. Dies ist eine begrenzte Quellbewertung, kein
allgemeiner Ausschluss der Betroffenheit. Ein Abhängigkeitsupdate einschließlich
TypeScript-/JSX-Adaptertests bleibt offen. `npm audit fix --force` ist keine
geeignete Korrektur: die beobachtete Empfehlung würde den Controller auf 3.3.10
zurückstufen. Wegen deaktivierter Installationsskripte ist insbesondere die
Bereitstellung nativer esbuild-Binärdateien noch kein geprüfter Funktionsnachweis.

## Verfügbare Quellen und weitere Integration

| Komponente | Verifizierter Quellstand | Umfang und Status vor Gesamtintegration |
| --- | --- | --- |
| js-controller | 7.2.2, `88516d65367580088327214bd9decedca77beea7` | Vollständiger Quellcheckout; veröffentlichter npm-Runtimebaum zusätzlich vorbereitet |
| Adapter-Core | 3.4.3, `cc8c32f9d7b3e94bab5c07c34b14a0b36b48978f` | Vollständiger Checkout; nicht allein Nachweis der tatsächlich geladenen Controllerklasse |
| EOS Admin | 7.10.9, `93e155b50e0c56aea506ba4ea7a23dde2ea8b09a` | Vollständiger Checkout; bestehende Erstkennwort-/TLS-/Lizenzbefunde offen |
| NexoWatt UI | 1.0.21, lokaler Entwicklungscommit `10d5f5a4b0b8aba6d18fc32c5c3508b2db538310` | Separater vollständiger, gehärteter Entwicklungsstand; nicht automatisch Bestandteil des Controllerpakets |
| NexoWatt Devices | 0.5.168, Referenz `6de81f6c67294c4b26933c38715b09455c204de2` | Bisher nur 16 lokale Prüfdateien; kein vollständiger Lieferstand |
| EEBUS | 0.3.0, `1c0eb410d516b90d60f6e475e6822bf5836bfd66` | Vollständiger Checkout; Protokoll-/Gerätefreigabe offen |
| OCPP21 | 0.4.0, `ca55a1596e16ba814399de3a781c16d6d61e0f04` | Vollständiger Checkout, kein eigener Lockfile; nicht automatisch integriert |
| NexoWatt Backup | 1.0.10, `88dd860aa3c1a7a2fe1c025fa87e5cc2bcfa4b53` | Vollständiger Checkout; privilegierte Mount-/Restorepfade separat abzusichern |

Die ursprüngliche UI-Archivquelle ist mit SHA-256
`90db619ecd754cab335dae92fdc123a48f62ceffb505a2a2b832e119d885eefe`
gebunden. Der gehärtete UI-Stand hat einen eigenen Lockfile und eigene Prüfbelege.
Sein npm-Prüfergebnis darf nicht auf den Controller oder das Gesamtsystem
übertragen werden. Im Controllerkern werden zunächst keine Adapterinstanzen
aktiviert. Zusätzliche Adapter brauchen ein eigenes geprüftes Artefakt, feste
Versionen, Hash-/Signaturbindung und die Freigabe des Zulassungsmechanismus.

## Erststart des gesperrten Controllerkerns

`runtime/bootstrap/initialize.cjs` wird nach gewöhnlichem `iobroker.js setup`
innerhalb einer frischen isolierten Installation unter dem Dienstkonto ausgeführt.
Es führt weder npm noch Shellbefehle aus und verändert die schreibgeschützte
TLS-Konfiguration und den Paketbaum nicht. Die Konfiguration muss ausdrücklich
lokale getrennte TLS-1.3-Datenbanken, Zertifikatsprüfung, einen gültigen Hostnamen,
deaktivierten Multihostdienst und deaktivierte Zusatzplugins enthalten.
`system.compact` und `system.allowShellCommands` müssen ausdrücklich Boolean
`false` sein; fehlende Werte und Strings werden abgewiesen. Verbindungs- und
Befehlsfristen sind auf fünf Sekunden und Retries auf höchstens eins begrenzt;
eine unbegrenzte Offlinewarteschlange ist nicht zugelassen.

Die Freigabe ist bewusst auf einen **Controllerkern ohne Bedienoberfläche und
ohne aktive Adapter** beschränkt:

- Bestehende Adapterinstanzen, zusätzliche Konten und Anwendungsdaten werden als
  Bestandsinstallation abgewiesen; das Werkzeug führt keine Migration durch.
- `system.user.admin` wird deaktiviert und sein Erstkennwort entfernt. Eine spätere
  UI-Ersteinrichtung muss einen individuellen Zugang sicher neu bereitstellen.
- `system.config.common.diag = "none"`, `activeRepo = []` und
  `adapterAutoUpgrade = {"defaultPolicy":"none","repositories":{}}` unterbinden
  die entsprechenden Upstream-Funktionen. Die Repositorylisten werden geleert.
- Der Sentry-Enabled-State wird deaktiviert. Der signierte EOS-Controllerprofil-
  Umbau registriert keine Controller-/CLI-Plugins; dessen reguläre Bereinigung
  kann den dann funktionslosen Sentry-State entfernen. Nur mit geprüftem
  EOS-Profil wird ein fehlender State deshalb akzeptiert; vorhandene aktivierte
  oder falsch typisierte Werte werden weiterhin verworfen. Ein zusätzliches Feld
  `host.common.disableDataReporting` wäre nicht dauerhaft: Controller 7.2.2
  überschreibt das Hostobjekt beim Start. Darauf stützt sich die Absicherung nicht.
- Ein Datenbankmarker bindet Profil, Bootstrap-Policyversion 1, Controller 7.2.2
  und Laufzeitkonfiguration. Der anfängliche App-Lockfilehash wird nur als
  Herkunftsnachweis gespeichert. Ein additiver signierter Paketlieferstand darf
  einen neuen Lockfile haben; dessen vollständige Datei-/Signaturprüfung und
  Beibehaltung der bisherigen Pakete muss der getrennte Host-Aktivierungspfad
  vor jedem Start erzwingen. Der Marker ersetzt diese Prüfung nicht. Ein
  unterbrochener passender `pending`-Stand kann erneut initialisiert werden; ein
  vollständiger Stand wird nur geprüft. Abweichungen werden nicht still repariert.
- `--wait-controller --controller-pid <PID>` bestätigt nach dem Start ein aktuelles,
  quittiertes Alive-Signal, die erwartete Prozess-ID und die Hostversion 7.2.2.
  Ein vorhandener Prozess allein zählt nicht als erfolgreicher Start.

Der Host-Installer muss zusätzlich eine wirklich neue Datenablage sicherstellen,
Dienste bei fehlgeschlagener Initialisierung stoppen und seine eigene geschützte
Installationsmarkierung führen. Der Datenbankmarker ist kein Schutz gegenüber
bereits kompromittierten Prozessen mit denselben DB-Zugangsdaten. Zusätzliche signierte Adapterpakete können im unveränderbaren Paketbaum
vorliegen, ohne eine Adapterinstanz zu aktivieren. Die Aktivierung echter
Adapterinstanzen benötigt eine kompatible Erweiterung der Betriebs-/Bootstrap-
Politik; dieser Kernstand schaltet keine Adapter eigenmächtig frei. Unbekannte
Marker, andere Policy-/Controllerversionen und Konfigurationsänderungen werden
weiterhin abgewiesen; eine Datenmigration wird daraus nicht abgeleitet.

## STRIDE und Testumfang

| Bedrohung | Umsetzung / Nachweis | Verbleibende Grenze |
| --- | --- | --- |
| Spoofing | TLS-Serverprüfung, eindeutige Store-Zugänge; Erstkonto deaktiviert | Gemeinsame Controller-Vertrauenszone, keine getrennte Adapteridentität |
| Tampering | Konfigurations-/Lockfilebindung, verweigerte Profilabweichung | Datenbankmarker selbst vom Runtimekonto schreibbar; Hostgrenzen erforderlich |
| Repudiation | Stabile Ergebnis-/Fehlercodes, Rohprotokolle | Kein manipulationssicheres Betriebs-Audit implementiert |
| Information Disclosure | Keine Ausgabe von Credentials/DB-Inhalten; Diagnose aus | Kein pauschaler Nachweis jeglichen externen Datenverkehrs |
| Denial of Service | Gesamtabbruchfrist, begrenzter Kernobjektbestand, Fehler blockieren Start | Zielgeräte-Ausfall-/Last-/SSD-Tests offen |
| Elevation of Privilege | Kein npm-/Shellaufruf, keine aktiven Adapter, unprivilegierter Aufruf | Wirkung der systemd-/Dateirechte separat auf Zielhost prüfen |

`tests/system/bootstrap.test.cjs`: **46/46 Unit-/Negativtests** gegen kontrollierte
DB-Fixtures einschließlich unterbrochener Initialisierung, idempotentem Neustart,
Fremddaten, Profilabweichung und veraltetem/falschem Heartbeat. Dies sind keine
Hardware- oder vollständigen Controller-Starttests. Reale Redis-/Controller-
Transport- und Prozessprüfungen werden separat in den Testbasis-Berichten geführt.

`tools/sbom/test_base.py` bindet die von `npm sbom --omit=dev --sbom-format cyclonedx`
erzeugte Datei an Lockfile und tatsächlich installierte Paketmanifeste. Es führt
keinen Paketcode und keine Netzabrufe aus. Optional nicht installierte Pakete
werden ausdrücklich erfasst; Pfadausbrüche, Symlinks, Versionsabweichungen,
nicht installierte Komponenten und ungültige Graphreferenzen werden verworfen.
`tests/system/sbom-test-base.test.py`: **13/13 Tests**. Die strukturelle Bindung ist
kein Schwachstellenscan. Der abschließend erzeugte modifizierte Controller-SBOM
wurde zusätzlich vollständig gegen das lokale CycloneDX-1.5-JSON-Schema geprüft:
**bestanden, null Schemafehler**. Schemaherkunft, Dateihashes, Validatorversionen
und der exakte geprüfte SBOM-Hash stehen im separaten Schema-Prüfbericht. Es gab
keinen Netzabruf zur Auflösung von Schema-Referenzen. Die eigenen Bootstrap-/
Installer-/Zulassungswerkzeuge sind keine npm-Komponenten dieses SBOM und
werden ausdrücklich als fehlender Umfang ausgewiesen; deren Bytes werden durch
die separate signierte Release-Dateiliste gebunden. Ein kompletter OS-/Geräte-
SBOM ergibt sich daraus weiterhin nicht.

Alle Linux-/Node-/CPU-Angaben beziehen sich auf den Prüfhost. Ein x86_64-Baum darf
wegen möglicher nativer npm-Pakete nicht als geprüftes ARM64-Image ausgegeben
werden. RPi-5-Installation, Linux-12-Hostdienste, Stromausfall/Wiederherstellung,
Tailscale-Fernwartung, komplette Lizenzfreischaltung und physische Gerätefunktion
bleiben eigene Abnahmeschritte. Eine CRA-/IEC-Konformitätserklärung ergibt sich
aus diesen Nachweisen nicht.
