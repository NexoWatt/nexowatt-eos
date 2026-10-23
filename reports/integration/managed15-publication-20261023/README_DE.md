# Managed TEST 15: Veröffentlichung und öffentlicher Rücklesetest

Stand: 23.10.2026. Das signierte Linux-ARM64-Testrelease ist veröffentlicht:
https://github.com/NexoWatt/nexowatt-eos/releases/tag/managed-test-15-95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534

Release-ID bei GitHub: `422305811`; Prerelease, kein Entwurf. Das Tag zeigt auf
den qualifizierten Quellstand `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.
Die fünf Assets stimmen in Größe und SHA-256 mit dem tatsächlich erhaltenen,
signaturgeprüften Paket überein; siehe `release-metadata.json`. Die zwei von
GitHub zusätzlich erzeugten Quellarchive sind keine Installationspakete.

## Öffentlicher Download: bestanden

Der lokale Prüflauf des erhaltenen Pakets ist dokumentiert in
[`../managed15-archive-verification-20261023/README_DE.md`](../managed15-archive-verification-20261023/README_DE.md).
Ein vollständiger öffentlicher Download aus der Arbeitsumgebung gelang nicht:
der direkte HTTPS-Abruf scheiterte am Proxy-Verbindungsaufbau, der Browserdownload
an einem Downloadfehler. Dies wird nicht als erfolgreicher Download gewertet.

Der eng begrenzte Workflow `managed15-public-readback.yml` lädt deshalb die fünf
fest gebundenen Assets auf einem GitHub-Runner ohne Authentifizierungsheader und
ohne Cookies. Der Prüfer vergleicht Größe/Hash und liest das Archiv mit dem
vertrauenswürdigen Repository-Prüfer vollständig zurück; Ed25519-Signatur und
Release-/Plattform-/Node-Bindung werden geprüft. Kein Payloadprogramm wird
ausgeführt. Nur der JSON-Prüfbeleg wird als CI-Artefakt ausgegeben.

Der [CI-Lauf 40024630784](https://github.com/NexoWatt/nexowatt-eos/actions/runs/40024630784)
am Prüfcommit `eb08becf56e1e9c2b8b2a3c67cce17e1589c2a5e` ist erfolgreich.
`public-readback.json` bestätigt den unauthentifizierten Download aller fünf
Assets (133 begrenzte Rangeabrufe), Größen/Hashes, vollständigen Archivreadback,
Signatur, 22606 Payload-Dateien und die SBOM-Assetbindung am 23.10.2026 um
21:10:10 UTC. Der Runner-Prüfer nutzte Node 22.23.3; die geprüfte, nicht
ausgeführte ARM64-Laufzeit im Paket bleibt Node 24.22.1.

Der JSON-Beleg wurde unabhängig aus CI-Artefakt `12532401495` zurückgeholt:
ZIP 1120 Byte, SHA-256
`1b14e19ea32757f14dfd5eaf42586174b6e80a106ded7ae9eb39538732672e53`.
Run-/Commitbindung, Archividentität und Flags wurden geprüft.
Auch die [Workflowvalidierung](https://github.com/NexoWatt/nexowatt-eos/actions/runs/40024630710)
bestand. Der neue Prüfer bestand zuvor den lokalen Arbeitsbaumtest und wies
eine gleich große manipulierte Metadatei mit `PUBLIC_ASSET_HASH` ab.

Der unveränderte signierte leere Feed und der erzeugte R8-Befehl werden nun
bereitgestellt. Ihre öffentliche Rückprüfung bleibt bis zum nachfolgenden
Nachweis offen; der Befehl wird erst danach für den Test ausgegeben.

## Grenzen

Node 24.22.1, js-controller 7.2.5, Testprofil und Sequenz 15 bleiben unverändert.
Pi-/ARM64-Ausführung, R8-Migration und vollständige Wiederherstellung sind nicht
durchgeführt. Vor dem Test sind aktuelle Sicherung und geprüfter R8-Rückfallstand
erforderlich; physische Steuerung bleibt aus. Den optionalen alten
PostgreSQL-Backup-/Restore-Provider nicht aktivieren oder zum Restore verwenden.
Die 26 bekannten Dependency-Audit-Knoten (20 high, 6 moderate) bleiben offen.
Keine Produktions-, Anlagen- oder CRA-Freigabe.
