# Sudo-Abbruch beim Erststart: Korrektur und neuer Testkandidat

Stand: 03.10.2026. Ausgangscommit auf `main`:
`680c1e32066ed63723abb6fcca2dbfcd443acae9`.

## Tatsächlich vom Pi gemeldet

Der [Auszug aus dem Nutzerprotokoll](user-pi-installation-excerpt.txt) zeigt,
dass der aktualisierte `.pgp`-Bootstrap die Downloads und Paketquellenprüfung
bestanden hat. `apt-get update` und beide Paketvorbereitungen wurden beendet;
die aufgeführten Pakete waren bereits installiert. Anschließend brach der
Hostinstaller mit `PG_SUDO_POLICY_REJECTED` ab. Der äußere Fehler
`BOOTSTRAP_FIRST_START_FAILED` ist dessen Folge.

[Herkunft, Originaldateihash, Auszugsbildung und Grenzen](user-pi-observation.json).
Der Agent hat diese Pi-Befehle nicht selbst ausgeführt. Das Protokoll ist kein
Nachweis einer vollständigen Installation. Die genaue Sudo-Ausgabe, Version
und der aktuelle Restzustand des Pi sind noch zu erheben.

## Bestätigter Quellfehler

Die Installer verlangten für `sudo -n -l -U <Dienstkonto>` den Exitcode `1`
zusammen mit einem Teilstring einer Ablehnungsmeldung. Die erfolgreiche
Root-Abfrage ohne Rechte des Zielkontos liefert bei sudo 1.9.16p2 dagegen
Exitcode `0` und eine vollständige Meldung über die fehlenden Rechte.
Das ergibt sich unmittelbar aus den offiziellen Quellen:

- [sudoers_list](https://github.com/sudo-project/sudo/blob/SUDO_1_9_16p2/plugins/sudoers/sudoers.c#L864)
  löst den mit `-U` angegebenen Benutzer auf und ruft nach erfolgreicher
  Autorisierung der Abfrage `display_privs` auf.
- [display_privs](https://github.com/sudo-project/sudo/blob/SUDO_1_9_16p2/plugins/sudoers/display.c#L479)
  gibt auch bei null Rechten eine erfolgreiche Antwort zurück und druckt die
  einzelne Ablehnungszeile.
- [policy_list](https://github.com/sudo-project/sudo/blob/SUDO_1_9_16p2/src/sudo.c#L1219)
  setzt diese erfolgreiche Antwort in Exitcode `0` um.

Die gemeinsame Prüfung in `install-host.cjs` wird jetzt auch vom PostgreSQL-
Installer verwendet. Akzeptiert werden nur Exitcode `0`, keine Prozessfehler,
exakt leeres stderr und genau eine vollständige C-Ausgabe für das erwartete
Dienstkonto. Jede Befehlsfreigabe, falsche Kontoangabe, zusätzliche Ausgabe,
Warnung, Zeitüberschreitung oder fehlgeschlagene Abfrage bleibt gesperrt.
Es werden keine sudoers-Regeln geändert und keine Rechte erteilt.

## Prüfungen und Lieferkette

Die neue Suite `tests/system/sudo-policy.test.cjs` prüft 53 Fälle. Ihre
Installer-Fixtures enthalten ausdrücklich `/usr/bin/sudo` und durchlaufen die
echten Accountzweige beider Installer. Gültige Antworten für alle drei
Erststartkonten erreichen die nächste Phase; ungültige Antworten stoppen vor
Verzeichnis- und Dienstbereitstellung. Die Fixture bildet die notwendigen
POSIX-Dateimetadaten unter Windows ausdrücklich nach und führt keine echten
Konten-, Sudo- oder Dienstbefehle aus.

Der [Revision-3-Baulauf](../installable-test3-r3-20261003/) zeichnet die neue
Suite gemeinsam mit den Archiv-/Quellbindungsregressionen auf. Das neue
Runtime-Paket verwendet weiterhin Version `0.2.0-test.3`, nun **Lieferrevision
3, Sequenz 6**. Die bereits gebaute App und ihre gebundenen Lock-/SBOM-Belege
werden bytegleich übernommen; die Hostquellen werden neu paketiert und mit
einem ausschließlich im Speicher gehaltenen Testschlüssel signiert. Es ist
keine neue npm-Auflösung oder erneute SBOM-Erzeugung der unveränderten App.

[Bootstrap-/Sicherheitstests und Quell-/Rohloghashes](verification-summary.json),
[Artefaktprüfung](artifact-verification.json),
[Herstellertrust-Zuordnung](../github-bootstrap-ready-20261003/license-trust-provenance.json).
Die bisherigen Lieferungen bleiben unverändert erhalten.

Der [aktuelle zusammengeführte Prüfstand](acceptance-summary.json) weist
**189 bestandene ausgewählte lokale Prüfungen** aus: 73 Sudo-/Revisionsfälle,
75 Bootstrapfälle sowie 27 SFTP- und 14 TLS-Konfigurationsfälle. Die erste
TLS-Ausführung scheiterte bereits im Testaufbau an `openssl ENOENT`; dieser
Fehllauf bleibt unverändert protokolliert. Beim
[gezielten Nachlauf](security-recheck.json) wurde ausschließlich das schon
installierte Git-OpenSSL dem Suchpfad des Testprozesses hinzugefügt. Keine
Testquelle, Prüfbedingung oder globale Umgebungsvariable wurde verändert.
Dieser Nachlauf besteht alle 14 Fälle und ersetzt keinen nativen Linux-TLS-Test.

Eine vor der Änderung versuchte Windows-Ausführung der bestehenden
`tests/postgresql/host-install.test.cjs` ergab 13 bestandene, vier fehlgeschlagene
und einen übersprungenen Test. Die vier Fehler liegen in bestehenden POSIX-
Metadaten-/`toolTrust`-Fixtures; dieser Lauf ist ausdrücklich **nicht bestanden**.
Die Beobachtung liegt als Toolausgabe vor, nicht als gespeichertes Rohprotokoll.
Die Linux-Shell-Policytests verlangen `/bin/bash` und POSIX-Verhalten; WSL ist
auf diesem Prüfhost nicht installiert. Diese Tests sind hier nicht ausgeführt
und werden nicht durch die neuen Command-Fixtures als bestanden ersetzt.

## Wiederanlauf des betroffenen Pi

Bei diesem Abbruch kann bereits `eos-runtime` mit gleichnamiger Gruppe angelegt
sein. Vorher wurden die signierte Runtime und ihre Prüfbelege unter
`/opt/nexowatt/eos` bereitgestellt. Diese Spuren bleiben absichtlich erhalten;
der Neuinstaller verweigert ihre ungeprüfte Übernahme. Ein neuer Kopierbefehl
allein beseitigt den Restzustand nicht.

Vor einem erneuten Versuch sind Konten, Prozesse, Datenpfade, Units und die
Identität der gestagten Runtime zu prüfen. Keine pauschale Kontolöschung,
kein Löschen der EOS-Verzeichnisse, kein Zurücksetzen von PostgreSQL und keine
Abschaltung der Sudo-Prüfung. Für eine gezielte Wiederherstellung fehlen noch
die angefragten Pi-Befunde. **Reparatur/Wiederanlauf: OFFEN, nicht ausgeführt.**

## Offene Abnahme

**Vollständige Pi-Installation, native Sudo-/POSIX-/Systemd-/PostgreSQL-/TLS-
Abnahme, Browser-Ersteinrichtung, echte Lizenzannahme und Passwortvergabe,
Reboot, Wiederherstellung und alle Hardware-/Anlagentests: OFFEN.**
Die historische `test.2`-Paketprüfung bestätigt keine vollständige Installation.
Keine Produktionsfreigabe; Anlagensteuerung bleibt gesperrt. Der private
Download-Einstieg ist kein Flotten-Updater.
