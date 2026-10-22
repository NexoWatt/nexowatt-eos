# Direkter R8-Übergang zur verwalteten Basis

Prüfdatum: 22.10.2026. Ausgangscommit:
`02257b74c9124f504979d9bc012af27451719aca`.
Die tatsächlichen geänderten Quell- und Testbytes sind in
[`coordinator/verification.json`](coordinator/verification.json) gehasht.
Das ist keine Signatur oder Freigabe eines neuen Lieferpakets.

Der neue Koordinator wechselt ein authentifiziertes, gesundes R8 direkt von
Sequenz 11 auf Sequenz 15. R9/R10/R11 werden nicht installiert. Node 24.22.1,
js-controller 7.2.5 und der dauerhafte Hersteller-Prüfschlüssel gehören zum
separat signierten Ziel. Das vorhandene Lizenzvertrauen bleibt erhalten.
Die [Betriebsanleitung](../../../docs/operations/R8_DIREKT_MANAGED_UPDATE_DE.md)
beschreibt Voraussetzungen, einen späteren gepinnten Betreiberbefehl und
Rückfallverhalten.

## Ausgeführt

**50 von 50 fokussierten Vertrags- und Fehlertests bestanden, keine übersprungen.**
Node im lokalen Prüfsystem: 24.19.0, Linux x64. Dies ist keine Ausführung des
ARM64-Node 24.22.1. Ungekürzte Ausgabe:
[`coordinator/contracts.tap`](coordinator/contracts.tap).

| Bereich | Tests | Tatsächlicher Umfang |
|---|---:|---|
| Koordinator | 11 | R8-/Zielidentität, direkte Sequenz, echte temporäre Dateien, atomare Zeiger/Zustände, Sperren, Fehler/Rückfall jeder Mutationsphase, fremde Pläne, umask 0077 |
| Hostumstellung | 14 | Feste Unit-/Schlüsselbindungen, schrittweise Unitfehler, Aktivierung erst bei passendem Zustand, fremde Änderungen, Timerpause/-wiederherstellung, umask 0077 |
| Linux-Wartung | 8 | Authentifizierte alte Policy, Timer-/Dienstzustände, fremde Dateien, Rennen, partielle Änderung/Rückfall, stabiler Lock-Inode |
| Datenbankplan | 17 | Bestehende Konten/Managementdaten unverändert, nur Controller-Marker und vier passive Instanzen, Abbruch nach jedem Schreib-/Löschschritt, fremde Änderungen, Admin-Rechteprojektion |

Die systemd-/APT-Aufrufe, PostgreSQL-Objekte, Dienstbereitschaft, native
ARM64-Probe und Releaseinventarprüfungen innerhalb der Fehler-Simulationen sind
Testdoubles. Die Sicherheitswirkung dieser Tests liegt im überprüften
Kontrollfluss und den tatsächlichen Dateisystemoperationen, nicht in einer
vorgeblich ausgeführten Pi-Migration.

## Tatsächliche historische R8-Dateien geprüft

Das unveränderte Archiv aus
`delivery/test-pi-0.2.0-test.3-r8/eos-0.2.0-test.3-linux-arm64.tar.gz` wurde aus dem
Git-Bestand gelesen, mit dem gehärteten Extraktor gegen Größe/SHA-256 geprüft
und ausgepackt. Danach wurden der authentische öffentliche Schlüssel,
Ed25519-Signatur, Manifest und alle 22.842 signierten Nutzdateien mit dem aktuellen
Bundle-/Payloadprüfer kontrolliert. SBOM-Bindung und statische ARM64-Architektur
bestanden; kein gelieferter ARM64-Prozess wurde ausgeführt.

- Archiv: 97.504.932 Bytes; SHA-256
  `b7c38754cd572cb42462d525337a417d436f31dbf4d149bb9708187881e6c5d3`.
- Release-ID:
  `eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7`.
- Öffentlicher Schlüsselhash:
  `bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5`.
- Alle 14 von der Hostmigration erwarteten alten Units sind vorhanden.
- PostgreSQL-Schema, alte OS-Updatepolicy und die Admin-Methode zur
  Rechteprojektion stimmen bytegenau mit den relevanten aktuellen Quellen
  überein. Die neuen Datenbankpläne verlangen zusätzlich den abgeschlossenen
  Zustand dieser Projektion vor der ersten Mutation.

Rohzusammenfassungen:
[`r8-static-verification.json`](coordinator/r8-static-verification.json) und
[`r8-compatibility-static.json`](coordinator/r8-compatibility-static.json).
Sie prüfen die historische Basis, nicht das noch nicht signierte Zielpaket.

## Grenzen und offene Abnahme

Noch offen sind der echte native R8-PostgreSQL-Wechsel auf 7.2.5 samt
Wiederherstellung, systemd-/APT-Integration auf dem Pi, Prozessabbruch/Reboot,
Signierung des neuen vollständigen Zielpakets, öffentlicher Readback und der
ausgeführte Betreiberbefehl. Der frühere native Test einer frischen Basis ist
kein Nachweis dieses Migrationspfades. Fehlende `nft`-/`dnsmasq`-Werkzeuge werden
vor Änderungen abgewiesen; sie sind auf R8 nicht pauschal vorhanden.

Bereits begonnene Fehlversuche behalten Pläne und Diagnosebelege. Ein unbekannter
oder unvollständig wiederhergestellter Zustand bleibt gestoppt und gesperrt.
Es gibt keine Produktions-, Anlagen-, CRA- oder IEC-Freigabe. Bestehende
Abhängigkeitssicherheitsbefunde werden durch diesen Migrationspfad nicht als
behoben erklärt.
