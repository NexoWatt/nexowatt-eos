# Bedrohungsmodell der Test-Pi-Lieferung

Stand: 01.10.2026. Produktquellen `0.2.0-dev.3`; vorgesehenes signiertes Testprofil `0.2.0-test.1`. Dieses Dokument beschreibt die geänderten Vertrauensgrenzen. Es ist keine CRA-Konformitätserklärung, IEC-Zertifizierung oder unabhängige Penetrationsprüfung.

## Umfang und Vertrauensgrenzen

Der Build-Rechner verarbeitet kontrollierte EOS-Quellen und zuvor beschaffte Abhängigkeiten. Der Paketbau arbeitet offline und führt keine npm-Lifecycle-Skripte aus. Release-Schlüssel bleiben außerhalb der Lieferung. Ein frisch vorbereiteter Test-Pi prüft mit einem getrennt vertrauten öffentlichen Schlüssel Signatur, Dateibaum, Katalog, Controller-Profil, SBOM-Bindung und Zielarchitektur. Root führt nur die begrenzten Installations- und Einrichtungswerkzeuge aus. Controller und Adapter erhalten darüber keine allgemeinen sudo-Rechte.

Die signierte Anwendung enthält Controller, EOS Admin und NexoWatt UI. Die übrigen Adapterquellen gehören zum Repository, sind damit jedoch weder installiert noch für physische Regelung freigegeben. Node, Linux, Redis, Bootloader und Firmware benötigen eine eigene Herkunfts-, Versions- und Zielgeräteprüfung. Die npm-SBOM beansprucht diese Abdeckung nicht.

| STRIDE-Risiko | Maßnahme und Prüfung | Verbleibende Grenze |
| --- | --- | --- |
| Spoofing: fremdes Release oder gefälschte Paketidentität | Ed25519-Signatur, getrennte Schlüsselvertrauensstellung, exakte installierte Identitäten, Hashbindung an Release-Dateien | Ein mit dem Archiv zusammen ausgetauschter Schlüssel ist ohne externen Fingerprint kein Vertrauensanker. |
| Tampering: andere Abhängigkeiten als geprüft | Offline-Build, gesperrte Lifecycle-Skripte, exakter Controller/Loader/esbuild-Vertrag, lokale Archivintegrität, signierter Dateibaum | Ein kontrollierter Build-Host und geschützter Freigabeschlüssel bleiben notwendig. |
| Repudiation: unklarer Prüfstand | Versions-/Dateihashbindung, Rohprotokolle, getrennte Negativ- und Positivnachweise | Lokale Tests ersetzen keine unabhängige Prüfung oder Tests auf einem Zielgerät. |
| Information disclosure: private Paketmetadaten oder Passwörter | Private EOS-Builds offline; kein vollständiger Remote-Audit nach Ablehnung; rootgeschützte Eingabedateien, keine Geheimnisse in Vorprüfungs-JSON | Nur öffentliche Dependency-Teilprüfungen sind kein vollständiger aktueller Schwachstellenscan. |
| Denial of service: falsche native Architektur oder belegte Ports | Zielgebundene npm-Auswahl und bounded Dateiprüfung; unbekannte native Artefakte gesperrt; DB- und Webports vor und während Installation geprüft | ELF-Header beweisen keine ABI-/Hardwarefunktion. Portfreiheit kann sich nach Prüfung ändern. Mesh-Timing bleibt offen. |
| Elevation of privilege: manipuliertes Hostwerkzeug oder uneinheitliche Installation | Eigentümer-, Schreibrechte-, Ausführbarkeits- und Pfadprüfung vor Toolausführung; gemeinsame Host-/Onboarding-Validatoren; direkter Installationsweg prüft ebenfalls Webports | Laufender Root-Angreifer liegt außerhalb dieser lokalen Integritätsgrenze. Gemeinsame Adapter-UID ist weiterhin keine gegenseitige Prozessisolation. |
| Tampering: alte oder unvollständige SBOM | `verifySbomBinding`: Root-/Lock-Hash, tatsächliche npm-Identitäten, nicht inventarisierte Pakete, optionale Auslassungen und bekannte eingebettete Verzeichnisse mit Tree-Hash prüfen | Keine vollständige Rekonstruktion sämtlicher Frontend-Bundles, kein Betriebssystem-/Firmwareinventar. |

## Sicherheits- und Betriebsentscheidungen

- Die Test-Pi-Lieferung darf nicht als stabiler Gesamtproduktstand oder als Freigabe realer Lade-/Energiegeräte beworben werden. Fehlgeschlagene Mesh-Prüfungen bleiben sichtbar; Zeitgrenzen werden nicht zur Erzeugung grüner Tests gelockert.
- Node 24.21.0 ist ein neuer, getrennt zu prüfender Laufzeitvertrag. Ein neueres Release allein beweist keine konkrete Schwachstelle des vorherigen Vertrags. Die tatsächlich verwendeten Binärhashes und Testlaufzeiten werden im Liefernachweis festgehalten.
- Architekturprüfung führt kein Zielbinary aus. Bekannte Bare-Runtime-Varianten werden explizit inventarisiert; dies behauptet keine mathematische Unerreichbarkeit. Native Node-Addons ohne geprüften ABI-Vertrag werden abgelehnt.
- Vorprüfung ist lesend; Redis-TLS gilt erst nach dem echten Bootstrap-Handshake als geprüft. Die OpenSSL-Cipherprüfung allein beweist keine Redis-TLS-Unterstützung.
- Der Signaturschlüssel dieser Entwicklungslieferung ist ein Test-Vertrauensanker. Seine Annahme ersetzt weder den späteren Hersteller-Freigabeprozess noch ein Rücknahme-/Schlüsselwechselkonzept.

## Nachweise und offene Abnahme

Tests zu diesen Grenzen liegen in `tests/system/sbom-binding.test.cjs`, `tests/system/release-cli.test.cjs`, den Host-/Vorprüfungstests sowie `tests/integration/runtime-architecture.test.cjs`, `runtime-dependency-policy.test.cjs` und `build-runtime.test.cjs`. Tatsächliche Ausführungsresultate und Grenzen stehen unter `reports/integration/stabilization/`; Testdefinitionen allein sind kein Ausführungsnachweis.

Auf dem Test-Pi offen: Modell/64-Bit-OS/SSD erheben, Installation und Signaturprüfung durchführen, TLS-/Zertifikatsvertrauen bestätigen, persönliche Rollen anmelden und negative Berechtigungsfälle prüfen, Neustart/Offlinebetrieb/Netzwerkwechsel beobachten, Wiederherstellung und Update/Rückfall abnehmen. Tailscale-Zugriff und erforderliche IPv4-/IPv6-/Discovery-Protokolle sind mit konkreter Netzkonfiguration zu prüfen. Die Freigabe zusätzlicher Adapter erfolgt separat über den versionierten Katalog und deren jeweilige Geräte-/Sicherheitsnachweise.


## Fortschreibung 0.2.0-dev.4 – EOS-HOST-REDIS-20261001

| STRIDE-Risiko | Neue Maßnahme | Nachweis und Grenze |
| --- | --- | --- |
| Tampering / falsche Herkunftsannahme: signiertes EOS-Paket suggeriert geprüften externen Redis-Stand | Separates Hostartefakt-Gate; derzeit keine Neuinstallationsfreigabe | Tatsächlicher Hostcheck und Installer mit isoliertem Zielhost getestet. Alte Offlinekopien nicht technisch widerrufen. |
| Elevation of privilege / Denial of service: bekannte TLS-Speicherlücke im Trixie-Redis | Installation des ungeprüften Hoststands verhindern; TLS bleibt erforderlich | Debian-Advisory CVE-2026-81934; keine Exploit-Reproduktion oder behauptete Betroffenheit des unbekannten Pi-Paketstands. |
| Repudiation: Funktionstest als Sicherheitsabnahme missverstanden | Strukturprüfung, Kompatibilität und Freigabestatus getrennt ausgeben | Redis8-Labortests bestanden; Deployment bleibt gesperrt. |

Auch Debian12 darf nicht allein aufgrund der OS-Version als Ersatzfreigabe
gelten. Neues Redis-Artefakt, OS-SBOM, Lizenzbewertung und tatsächliche
unprivilegierte ARM64-/Systemd-Abnahme sind Voraussetzungen für eine spätere
Freigabe. Der vorliegende Pi ist anhand der Nutzerausgabe identifiziert:
Pi5/8GB/Debian13.4/ARM64/SD, keine SSD angezeigt; Installation noch offen.
