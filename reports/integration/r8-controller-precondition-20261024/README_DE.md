# R8-Testmeldung: Controller beim Vorabcheck nicht aktiv

Stand: 24.10.2026. Befund `EOS-R8-PREFLIGHT-20261024-01`, offen.
Quelle ist eine Betreiber-Rückmeldung vom Test-Pi, keine eigene SSH-Messung.
Einstieg: `fce5e279ddd2483e62c6c4ed2078e14855b1cb9c`;
signierter Laufzeit-/Koordinatorstand: `f353dd08bf8ac5897e9b1c357994d4047a82ed6d`;
Prüfstand dieses Vermerks: `8fdfbfedf3312133f8f8c33db3e54bf8df38a059`.

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

Zunächst ausschließlich Dienstzustände lesen; siehe
[R8-Betriebsanleitung](../../../docs/operations/R8_DIREKT_MANAGED_UPDATE_DE.md).
Keine ungefilterten Journale, Umgebungsvariablen, Schlüssel oder vollständigen
Konfigurationen veröffentlichen. Bis zur Diagnose kein erneuter Updateversuch,
kein `reset-failed`, kein Neustart und kein Entfernen von Wartungsmarkern.

Die Quellpfade und ihre Reihenfolge wurden zweimal getrennt geprüft; die
Dokumentationsänderung bestand `git diff --check` und die Syntaxprüfung des
angegebenen lesenden Shell-Blocks. Keine neue Laufzeit, kein signiertes Archiv
und kein Einstieg wurden geändert. Ein erneuter Vollarchiv-/Hardwaretest wurde
nicht ausgeführt. Tatsächlicher Dienstzustand, Ursache, Wiederanlauf und
erfolgreiche Migration bleiben offen. Keine Produktions-/Anlagenfreigabe.
