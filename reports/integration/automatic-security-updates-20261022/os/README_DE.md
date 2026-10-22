# Automatische Betriebssystemwartung – Änderung und Prüfung

Stand: 22.10.2026. Ausgangscommit:
`99ef5086bc5b0ee590de17e109b85e4738c973ae`.
Bezug: Nutzerauftrag, Linux-Sicherheitsupdates automatisch zu installieren und
Node.js mit signierten EOS-Updates zu pflegen. Dieser Teilbericht beschreibt
ausschließlich die OS-Wartung; die Node-Pakettransaktion hat getrennte Nachweise.

## Änderung und Wirkung

- Die vorhandene tägliche automatische APT-Wartung bleibt aktiv. Die neue
  Managed-Frischinstallation richtet einen einzigen automatischen Installationsweg
  ein und prüft, dass die fremde APT-Upgrade-Automation deaktiviert ist. Ein
  aktiver Fremdjob oder eine vorhandene fremde Servicepolicy wird nicht verdrängt.
- Ein fester, gegen die signierte Releasequelle geprüfter `policy-rc.d`-Helfer
  verschiebt standardkonforme Paket-Serviceaktionen. Er gilt nur innerhalb des
  festen EOS-OS-Jobs. Er startet keine Dienste, akzeptiert keine Befehle und
  speichert keine Serviceargumente. Fehler erlauben keine Serviceaktion.
- Der root-eigene gemeinsame Kernel-Lock serialisiert OS- und EOS-/Node-Jobs.
  Eine zurückgebliebene geschützte Aktivierungssperre blockiert Paketänderungen.
  Eine konkurrierende Wartung wird verschoben, nicht als Installation ausgegeben.
- Zurückgestellte Serviceaktionen bleiben als notwendige Aktivierung sichtbar.
  Die Markierung gilt bis zu einem neuen Systemstart; ein erneuter Paketlauf
  erzeugt keine falsche Erfolgsaussage zur Aktivierung. Automatische Reboots
  bleiben deaktiviert, vorhandene Konfigurationen erhalten.
- Paketursprünge, Signatur-/TLS-Prüfung, zeitliche Begrenzung und reale
  dpkg-Inventar-SBOM bleiben erhalten. Keine Erlaubnis für andere
  Distributionshauptversionen, Node-Majors oder beliebige Quellen.

## Tatsächlich geprüft

Linux-x64-Workspace, Node 24.19.0, Python 3.12.14. Die Python-Prüfabhängigkeit
`jsonschema` 4.26.0 wurde in einem isolierten temporären Testverzeichnis
bereitgestellt; sie wird nicht in das Produkt aufgenommen.

| Prüfung | Ergebnis | Tatsächlicher Umfang |
| --- | --- | --- |
| `tests/system/os-updates.test.py` | 28 bestanden | Schema, Origin-/Hold-/Pin-/Pfadgrenzen, echte lokale flock-Konkurrenz, Helfer/Markierung, kontrollierte Prozess- und APT-Fixtures |
| `tests/system/install-os-maintenance.test.cjs` | 5 bestanden | Installerdateien und feste Befehle; fremde Policy/Symlink, aktiver Fremdjob, untrusted Tool und abweichende Automation abgewiesen |
| `tests/system/os-updates-host-contract.test.cjs` | 4 bestanden | Payloadinventar und bisherige Host-/Dateigrenzen |
| `tests/system/os-updates-cross-contract.test.cjs` | 2 bestanden | Python-Status und JS-Leser bleiben kompatibel |

Ein echter `apt-config dump` liest die isolierte Testkonfiguration. Keine
Paketinstallation, kein echter systemd-Aufruf und kein Pi wurden dabei verändert.
Die neuen positiven Root-Pfadprüfungen verwenden automatisch gelöschte
temporäre Verzeichnisse unter `/root`; der Test ist wie die vorhandenen
Runner-Orchestrierungsfälle für eine isolierte Root-Testumgebung bestimmt.
Dateibindungen und ausgeführte Befehle stehen in `verification.json`.

## Verbleibende Grenzen und nächste Abnahme

- Signierte Paket-Maintainerskripte besitzen Rootrechte. Direkte `systemctl`-
  Aufrufe, erzwungene Serviceaktionen und weitere Hostautomation umgehen die
  normale Debian-Servicepolicy; dies ist keine allgemeine Ausführungssandbox.
- Der feste Nachttermin wird auf ausgeschalteten Geräten nicht nachgeholt.
  Fehlende Aktivierung, ausstehende Pakete und ein veralteter Prüferfolg müssen
  im Admin sichtbar bleiben. Null Wartungsaufwand wird nicht zugesagt.
- Debian stabile Basis-/Updates- und Pi-main-Quellen enthalten auch normale
  Fehlerkorrekturen. CVE-Abdeckung aller Firmware, Drittsoftware und manueller
  Installationen ist dadurch nicht nachgewiesen. Node/npm werden getrennt
  durch EOS gepflegt und bleiben im APT-Automaten gesperrt.
- APT/dpkg ist keine atomare rückrollbare A/B-Transaktion. Reale Debian-13-/ARM64-
  Paketupdates, Maintaineraktionen, gemeinsame Locks bei Prozessabbrüchen,
  systemd-Härtung, Ausfälle/Stromverlust, Reboot und Regelungsverhalten auf dem
  Pi sind **OFFEN**. Keine Produktions-/CRA-/IEC-Freigabe.

Primärquellen vom 22.10.2026:
[Debian unattended-upgrades](https://sources.debian.org/src/unattended-upgrades/2.12/README.md),
[invoke-rc.d](https://manpages.debian.org/trixie/init-system-helpers/invoke-rc.d.8.en.html),
[deb-systemd-invoke](https://manpages.debian.org/trixie/init-system-helpers/deb-systemd-invoke.1p.en.html).
