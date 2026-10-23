NexoWatt EOS Managed TEST 15 – direkter R8-Umstieg

Dieses signierte Testpaket bereitet den direkten Übergang vom abgeschlossenen
R8-Ausgangsstand (Sequenz 11) auf die verwaltete Basis (Sequenz 15,
Auslieferungsrevision 12) vor. Zwischenrevisionen sind nicht erforderlich.

- Node.js 24.22.1; js-controller bleibt bei 7.2.5.
- Sechs eigene Adapter, PostgreSQL-Profil und EOS-Updateverwaltung.
- Automatische freigegebene Node-24-Patchupdates über den signierten
  Herstellerkanal; Linux-Sicherheitsupdates innerhalb der vorhandenen
  Debian-Version. Hauptversionswechsel bleiben gesperrt.
- Quelldaten: `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`.

Archiv: `eos-linux-arm64.tar.gz`, 134278673 Byte.
SHA-256: `dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44`.
Ed25519-Prüfschlüssel-SHA-256:
`518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40`.

Signatur, sämtliche 22606 Payload-Dateien, SBOM mit 646 Komponenten,
Quell-/Buildbindungen und historische native Linux-x64-Nachweise wurden am
tatsächlich erhaltenen Paket geprüft. Das Archiv wurde nicht verändert oder
neu signiert. Öffentlicher Download-Readback und Betreiberbefehl werden nach
Veröffentlichung gesondert bestätigt; diese Releasebeschreibung ist kein
Installationsbefehl.

Teststatus: Pi-/ARM64-Ausführung, R8-Migration, vollständige Wiederherstellung
und Anlagenabnahme stehen aus. Physische Steuerung bleibt deaktiviert.
Die bestehenden 26 Dependency-Audit-Knoten (20 high, 6 moderate) bleiben offen;
keine Aussage über 26 verschiedene CVEs oder vollständige Erreichbarkeit.
Den optionalen alten PostgreSQL-Backup-/Restore-Provider bis zur gesonderten
Korrektur nicht aktivieren; der native logische EOS-Backupweg ist davon getrennt.
Keine Produktions- oder CRA-Freigabe.

Prüfbericht:
https://github.com/NexoWatt/nexowatt-eos/blob/main/reports/integration/managed15-archive-verification-20261023/README_DE.md

R8-Anleitung:
https://github.com/NexoWatt/nexowatt-eos/blob/main/docs/operations/R8_DIREKT_MANAGED_UPDATE_DE.md
