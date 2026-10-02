# NexoWatt EOS Backup 1.0.10 Buildinformation

Basis: vollständige Publish-ZIP 1.0.9 aus dieser Unterhaltung.
Geändert: src/lib/sdCard.ts, src/lib/list/cifs.ts und die daraus erzeugten Laufzeitdateien; Metadaten, Tests und Dokumentation.
Native Admin-7/8-JSONConfig und bestehender Dashboard-Build unverändert.
InfluxDB-CLI-/Tokenlogik, SD-Kopier- und Rotationslogik unverändert.

Prüfung in dieser Umgebung: Node.js 22.16.0 auf Linux.
36 Offline-Tests bestanden, davon 20 neue SD-Rechte-Testfälle inkl. Untertests.
Rechtefehler auf einem echten temporären Linux-Verzeichnis unter UID 65534 nachgestellt:
- Einhängepunkt-Verzeichnis: nicht beschreibbar, aber durchsuchbar (0555).
- Unterordner: für den Testbenutzer beschreibbar (0700).
- Version 1.0.9: Abbruch mit Schreibrechtefehler am Einhängepunkt.
- Version 1.0.10: Leseprüfung und Schreibprüfung mit echter Probe erfolgreich.
Die Blockgeräte- und Mountausgaben in diesem Test sind simuliert; keine echte SD-Karte wird verwendet.
Zusätzlich: TypeScript-Prüfung des SD-Kartenmoduls, Syntaxprüfung der ausgelieferten Backend-Dateien, Paketprüfung und npm publish --dry-run.
Kein tatsächlicher Test auf Windows, Admin 7/8, einem Raspberry Pi oder einem laufenden InfluxDB-Server. Kein Upload auf NPM vorgenommen.
