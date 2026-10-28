# R8-Testinstallation entfernen und Linux behalten

Stand: 28.10.2026. Der Nutzer hat die gezielte Ablösung der R8-Testinstallation
beauftragt. Debian 13/ARM64 passt zur Managed16-Basis. **Ein vollständiger
geprüfter Deinstallationsweg ist noch nicht vorhanden.** Der erste Schritt
sammelt die tatsächlichen Hostdaten ausschließlich lesend.

## Bestandsaufnahme

[Den vollständigen Prüfaufruf in PuTTY auf dem Test-Pi ausführen](R8_INSPECTION_COMMAND.txt).
Der Aufruf lädt den unveränderlichen Helfer von Commit
`dc1b3792cb983a0694dd5a9e137798dc9ddaaf69` vollständig in eine root-private Arbeitsablage.
Vor der Ausführung prüft er SHA-256
`e51b4fe27a43ad0763a3ffa499df4a077082548d31fe0e7b60cad3c56cc4ff4b`; bei Download-/Hashfehler wird nicht ausgeführt.
Der Helfer wurde nach Veröffentlichung bytegleich zurückgelesen.

`tools/system/inspect-r8-removal.py` darf als vollständig geladene, hashgeprüfte
Datei mit `/usr/bin/python3 -I -B` unter root auf dem Test-Pi aufgerufen werden.
Kein Code aus dem installierten EOS wird ausgeführt. Die Ausgabe enthält feste
Pfadmetadaten, Hashes, Zustandsklassen und Anzahlen, keine Rohkonfiguration,
Kennwörter, Lizenz-/Geräteschlüssel oder Prozessargumente. Der Download legt
lediglich den geprüften Helfer in einer neuen root-privaten Arbeitsablage ab.

[Prüfung und Grenzen des Helfers](../../reports/integration/r8-retirement-preparation-20261028/README_DE.md).
Die Rückmeldung wird vor der Erstellung eines konkreten Stilllegungsschritts
benötigt: Node könnte fremd verwaltet sein; der abgebrochene Updateversuch könnte
Host-Wartungsdateien zurückgelassen haben. Die Versions- und Unitliste allein
klärt diese beiden Fälle nicht.

## Geplanter Stilllegungsumfang, noch nicht ausführbar freigegeben

1. R8-Testidentität, deaktivierte physische Steuerung, tatsächliche Unitquellen,
   Prozess-/Mountgrenzen, NSS-Konten und Wartungs-/Pakettransaktionen prüfen.
   Unbekannte oder gemeinsame Ressourcen führen zur gesonderten Klärung.
2. EOS-Dienste kontrolliert stoppen und das vollständige Prozessende prüfen.
   Eine laufende APT-/dpkg-Transaktion wird nicht abgebrochen; Sperrdateien werden
   nicht einfach gelöscht. SSH und die bestehende Netzwerkkonfiguration bleiben
   außerhalb des gezielten Stilllegungsumfangs.
3. Nur nachgewiesen zugehörige EOS-Units, Konfiguration und Daten in einem
   root-privaten Rückfallverzeichnis sichern. Beim Verschieben sind Dateisystem-
   grenzen und Teilfehler zu behandeln. Keine pauschale Löschung von
   `/etc/postgresql`, `/var/lib/postgresql` oder `/opt`.
4. Ein nachgewiesener EOS-eigener, nicht paketverwalteter Node-24.21-Symlink kann
   gesondert stillgelegt werden; fremdes oder anderweitig verwendetes Node bleibt
   unangetastet. Der alte Node-Versionsordner muss nicht entfernt werden, damit
   Managed16 seinen neuen gepinnten Interpreter installieren kann.
5. Dienstkonten nur nach Prüfung geteilter IDs, Gruppen und Prozesse behandeln.
   Private Sicherungen bleiben durch root-geschützte Elternverzeichnisse auch
   bei später wiederverwendeten UID/GID unzugänglich.
6. Nur exakt zugeordnete EOS-Wartungsdateien bereinigen. Einen
   `create_main_cluster=false`-Eintrag nicht pauschal zurücksetzen: Managed16
   kann ihn erneut prüfen; `true` könnte einen unerwünschten Distributionscluster
   erzeugen. Distributions-Timer nicht blind aktivieren oder entmaskieren.
7. Den tatsächlichen bereinigten Zustand gegen die unveränderten Managed16-
   Voraussetzungen prüfen; erst dann den veröffentlichten
   [Neuinstallationsweg](MANAGED_NEUINSTALLATION_DE.md) ausführen.

Dieser Ablauf ist ein Plan, kein bereits getestetes Löschskript. Erfolgreiche
Bestandsaufnahme ist keine automatische Bereinigungsfreigabe. Ein kontrollierter
Neustart, Geräte-CA/Lizenz, Backup/Wiederherstellung und Folgeupdates bleiben
Bestandteil des anschließenden realen Pi-Tests.
