# Managed16: tatsächliche Herstellerdateien und Veröffentlichung

Stand: 28.10.2026. Der lokal vom Hersteller signierte Kandidat wurde unverändert
empfangen und vollständig als Daten geprüft. Ziel: frische Debian-13-/zugelassene
Raspberry-Pi-OS-13-ARM64-Testbasis, Sequenz 16, Lieferrevision 13,
js-controller 7.2.5 und Node 24.22.1. Keine R8-Migration oder Löschung.

## Tatsächlich bestandene Prüfungen

- Ed25519-Signatur und vollständiger Archivreadback: 22.605 Payload-Dateien,
  437.912.699 Payload-Bytes; sämtliche Größen, Hashes, Modi und Dateimengen passen.
- Sichere Datenextraktion und erneuter Inventarvergleich; validatePayload,
  CycloneDX-SBOM mit 646 Komponenten, ARM64-Architektur- und Node-Verträge bestanden.
- 169 Quell-/Hostdateien sind an Commit
  `f2ea9a7ba67ef46a7de8a4f0ef05eaa672ca38f4` gebunden; bekannte Lizenzpfad- und
  Managed-Node-Unit-Transformationen sind enthalten.
- Native CI-Nachweise aus Artefakt 12550289644 unabhängig erneut geladen und
  gegen ZIP-SHA `37f871a1fe5df44d4d9dee67351a239c7abba2e523a105d1879e87dae2be1f3e`
  geprüft. 16 historische Linux-x64-Tests binden genau diesen App-/Buildstand.
  Sie wurden hier nicht erneut ausgeführt und ersetzen keinen Pi-Test.
- Installerkit: 146 sichere Dateien, 1.536.180 entpackte Bytes; 142 Quelldateien
  bytegleich mit dem qualifizierten Commit, vier generierte Einträge gebunden.
  Vollständiger Einstieg und eingebetteter Hostvorbereiter stimmen mit ihren
  qualifizierten Render-/Quelldateien überein. Bash-/Python-Syntax bestanden.
- Signierter leerer Updatefeed geprüft; Ablauf 22.11.2026 19:13:09.971 UTC.
  Ein leerer Feed installiert kein Folgepaket. Herstellerfreigaben bleiben nötig.
- [CodeQL](https://github.com/NexoWatt/nexowatt-eos/actions/runs/40069294303),
  [Sicherheits-/native Regression](https://github.com/NexoWatt/nexowatt-eos/actions/runs/40069294296)
  und [Managed-Verträge](https://github.com/NexoWatt/nexowatt-eos/actions/runs/40069294353)
  am qualifizierten Commit erfolgreich; der historische manuelle R9-Job war
  übersprungen und wird nicht als bestanden gezählt.

## Daten- und Sicherheitsgrenzen

Die unabhängige Datentriage identifiziert keine tatsächlichen Hersteller- oder
Kundengeheimnisse bzw. gespeicherten Betreiberzugänge. Ein bekannter öffentlicher
RSA-Testvektor in http-signature-Dokumentation und drei generische Windows-
Entwicklerpfade bleiben enthalten. Musterprüfungen beweisen keinen vollständigen
Geheimnisausschluss. Details und Grenzen stehen in [data-review.json](data-review.json).

Der gebundene historische Dependency-Audit hat weiterhin 27 betroffene Knoten
(19 high, 8 moderate, 0 critical), keine 27 eindeutig verschiedenen CVEs.
Erreichbarkeit ist nicht vollständig bewertet; kein neuer Advisory-Abgleich
und keine Schließung dieser Befunde durch diese Veröffentlichung. Der optionale
Legacy-PostgreSQL-Backup-/Restore-Provider bleibt bis zur separaten Korrektur
unbenutzt; der native logische EOS-Backupweg ist getrennt. Isolierter Testbetrieb
mit deaktivierter physischer Steuerung; keine Produktions- oder CRA-Freigabe.

## Reproduzierbare Belege

[Archiv-/Payload-/Quellprüfung](archive-verification.json),
[Prüfskript](verify-received-archive.cjs), [Installerprüfung](installer-review.json),
[öffentliche Assetpins](release-assets.json),
[gebundener Audit](qualified-dependency-audit.json).

Das Prüfskript erhält das Archiv, den sicher extrahierten Payload-Pfad und das
unabhängig hashgeprüfte native Nachweisverzeichnis als drei absolute Argumente.
Es führt ausschließlich vertrauenswürdige Repository-Prüfer aus, keinen Payload.
Die sechs gelieferten Metadaten werden nicht nachträglich als veröffentlicht
umetikettiert; spätere Upload-/Downloadbelege werden separat geführt.

## Status dieses Vorbereitungsschritts

Die signierte Release-ID lautet
`06f8e06f923b180c0bcbb03f6f853f402cf5a8649a1e6b8172d34262aca63e3d`.
Der Einstieg unter `delivery/managed16/install.sh` hat 49.985 Bytes, SHA-256
`cf930e26fb6d45235017e0bba55bd43ef74214d06cb465719ecdbf4a1515431f`.
Große signierte Assets bleiben außerhalb Git. Öffentliche Downloadprüfung und
finaler Installationsbefehl werden erst nach tatsächlicher Veröffentlichung
separat ergänzt. Pi-Frischinstallation, APT/systemd/TLS, reale Lizenzaktivierung,
Reboot, Wiederherstellung, Updateknopf und zwei Folgeupdates bleiben OFFEN.
