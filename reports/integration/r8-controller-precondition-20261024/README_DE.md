# R8-Testmeldung: Controller beim Vorabcheck nicht aktiv

Stand: 24.10.2026. Befund `EOS-R8-PREFLIGHT-20261024-01`, offen.
Quelle ist eine Betreiber-Rückmeldung vom Test-Pi, keine eigene SSH-Messung.
Einstieg: `fce5e279ddd2483e62c6c4ed2078e14855b1cb9c`;
signierter Laufzeit-/Koordinatorstand: `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`;
Erster Prüfstand: `8fdfbfedf3312133f8f8c33db3e54bf8df38a059`;
Folgediagnose auf Basis `709fe163f2cc1d4bb2603079189bbe116d3d5304`.

## Gemeldetes Ergebnis

- Download meldet `archiveHashVerified:true`, `hostChanged:false`.
- Extraktion meldet 22608 Dateien, 441863617 Byte, `codeExecuted:false`.
- Koordinator: `REPAIR_CONTROLLER_BUSY`, `failureStage:SOURCE_VERIFY`,
  `manualRecoveryRequired:true`, `restoredPreviousActive:false`.
- Nachlauf: `REPAIR_NO_INCOMPLETE_TRIAL`; systemd-Ergebnis exit-code, Status 1.
  Gemeldete Laufzeit 35.279 Sekunden. Kein erfolgreicher R8-Umstieg.

## Durch Quellprüfung erklärt

In `tools/system/update-r8-to-managed.cjs` wird in diesem Abschnitt zuerst
PostgreSQL mit `is-active` geprüft, danach der `ActiveState` des Controllers.
Jeder Wert außer exakt `active` führt hier zu `REPAIR_CONTROLLER_BUSY`.
Der Name bedeutet an dieser Stelle also nicht, dass ein laufender Controller
beendet werden soll. Ob er inaktiv, fehlgeschlagen oder im Zustandswechsel war,
geht aus der Rückmeldung nicht hervor.

Dieser Abbruch liegt vor dem Erzeugen von Aktivierungssperre und Guard, vor
Release-Installation/ARM64-Probe, Host-/OS-Umstellung und Datenbankmigration.
Der gepinnte Einstieg stoppt den Controller davor nicht. Der gemeldete Nachlauf
gibt `REPAIR_NO_INCOMPLETE_TRIAL` nur bei fehlender `.activation.lock` zurück
und stoppt in diesem Zweig ebenfalls keinen Dienst.

`manualRecoveryRequired` wird pauschal aus dem fehlenden Nachweis einer aktiv
wiederhergestellten Vorgängerversion abgeleitet. Dieser Wert allein belegt hier
keine beschädigte oder begonnene Migration. Die früheren Transport- und
Extraktionsmeldungen mit `signatureVerified:false` sind keine fehlgeschlagene
Signaturprüfung: Das Erreichen der genannten Controllerprüfung setzt im
unveränderten Code die spätere Bundle-Signatur-/Payloadprüfung voraus.

## Maßnahme und Prüfgrenze

### Weitere Betreiberbeobachtungen am 24.10.2026

- Controller und PostgreSQL aktuell `active/running`, jeweils `Result=success`.
  Controller `NRestarts=3`, PostgreSQL `NRestarts=0`.
- Upload-Oneshot `inactive/dead`, Exitstatus 0 und `Result=success`;
  die mit `--collect` gestartete temporäre Update-Unit `not-found`.
  Beides ist für sich kein zusätzlicher Fehlernachweis.
- Controller-Journal, nur systemd/PID 1: Exitcode 6 am 22.10.2026 um 13:33:12,
  am 24.10. um 07:28:23 sowie 07:29:50, jeweils CEST. Automatische Neustarts
  anschließend; letzter Prozessstart 07:30:14, aktiv seit 07:30:15 CEST.
  Keine Aussage, dass seitdem dauerhaft Betriebsbereitschaft besteht.
- Der offizielle js-controller-7.2.2-Enum ordnet 6 `UNCAUGHT_EXCEPTION`,
  40 `MISSING_CONFIG_JSON` und 4 `INVALID_CONFIG_OBJECT` zu:
  [Upstream-Quelle](https://github.com/ioBroker/ioBroker.js-controller/blob/v7.2.2/packages/common-db/src/lib/common/exitCodes.ts),
  Git-Blob `4d7d887edc54a3cc213f4d78c6017db2ae94f3c2`, am 24.10.2026 über
  GitHub gelesen. systemds `NOTCONFIGURED` darf hier nicht als Beleg einer
  fehlenden EOS-Konfiguration interpretiert werden.
- Die vorhandene authentische 7.2.2-Fixture
  `tests/system/controller-profile-fixtures/esm-main.original.txt` behandelt
  `uncaughtException` und `unhandledRejection` im selben Handler. Bei weiterer
  Ausnahme während der Behandlung beendet sie den Controller mit Code 6.
  Die konkrete Ausnahme und die zeitliche Zuordnung zum Updatecheck fehlen.
  Ein Code-6-Abbruch bestand bereits vor dem heutigen Updateversuch; gleiche
  Grundursache aller Abbrüche ist damit noch nicht bewiesen.

Dienstzustände und anschließend begrenzte Fehlerindikatoren lesen; siehe
[R8-Betriebsanleitung](../../../docs/operations/R8_DIREKT_MANAGED_UPDATE_DE.md).
Keine ungefilterten Journale, Umgebungsvariablen, Schlüssel oder vollständigen
Konfigurationen veröffentlichen. Bis zur Diagnose kein erneuter Updateversuch,
kein `reset-failed`, kein Neustart und kein Entfernen von Wartungsmarkern.

Die Quellpfade und ihre Reihenfolge wurden zweimal getrennt geprüft; die
Dokumentationsänderung bestand `git diff --check` und die Syntaxprüfung des
angegebenen lesenden Shell-Blocks. Der zusätzliche Journalfilter bestand lokal
Python-/Bash-Syntaxprüfung und synthetische Fälle für UTC-Zeit, Fehlerklasse,
Fehlercode, Stack-Dateizeilen, ungültige/binäre Nachrichten, leeres Journal,
Abfragefehler und Zeitlimit. Test-Zugangsdaten, vollständige private Pfade und
Rohmeldungen erschienen dabei nicht in der Ausgabe. Dies ist
keine Pi-Journalabfrage; der Filter exportiert keine ursprünglichen Nachrichten
und kann unbekannte Fehler übersehen. Keine neue Laufzeit, kein signiertes Archiv
und kein Einstieg wurden geändert. Ein erneuter Vollarchiv-/Hardwaretest wurde
nicht ausgeführt. Ursache, stabile Betriebsbereitschaft und erfolgreiche Migration
bleiben offen. Keine Produktions-/Anlagenfreigabe.
