# Managed TEST 15: Veröffentlichung und öffentlicher Rücklesetest

Stand: 23.10.2026. Das signierte Linux-ARM64-Testrelease ist veröffentlicht:
https://github.com/NexoWatt/nexowatt-eos/releases/tag/managed-test-15-95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534

Release-ID bei GitHub: `422305811`; Prerelease, kein Entwurf. Das Tag zeigt auf
den qualifizierten Quellstand `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.
Die fünf Assets stimmen in Größe und SHA-256 mit dem tatsächlich erhaltenen,
signaturgeprüften Paket überein; siehe `release-metadata.json`. Die zwei von
GitHub zusätzlich erzeugten Quellarchive sind keine Installationspakete.

## Öffentlicher Download: noch laufender Nachweis

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

Aktuell bleiben öffentlicher Rücklesetest, Aktivierung/Rücklesen des signierten
leeren Feeds und Ausgabe des endgültigen Betreiberbefehls offen. Diese Datei
wird mit den tatsächlichen Ergebnissen fortgeschrieben.

## Grenzen

Node 24.22.1, js-controller 7.2.5, Testprofil und Sequenz 15 bleiben unverändert.
Pi-/ARM64-Ausführung, R8-Migration und vollständige Wiederherstellung sind nicht
durchgeführt. Vor dem Test sind aktuelle Sicherung und geprüfter R8-Rückfallstand
erforderlich; physische Steuerung bleibt aus. Den optionalen alten
PostgreSQL-Backup-/Restore-Provider nicht aktivieren oder zum Restore verwenden.
Die 26 bekannten Dependency-Audit-Knoten (20 high, 6 moderate) bleiben offen.
Keine Produktions-, Anlagen- oder CRA-Freigabe.
