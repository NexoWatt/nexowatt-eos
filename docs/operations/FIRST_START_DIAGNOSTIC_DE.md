# Abgebrochenen Erststart nur lesend untersuchen

Stand: 04.10.2026. Ein gestoppter Controller zusammen mit einer bestehenden
`.activation.lock` ist kein Auftrag zum Löschen der Sperre. Ein abgebrochener
Erststart erfüllt die Voraussetzungen des normalen R6-Updates nicht.

Der neue, eigenständige Helfer `tools/system/diagnose-first-start.cjs` liest
ausschließlich eine feste Liste von Zustandsdateien. Er öffnet keine Datenbank,
startet keinen Dienst, entfernt keine Sperre und ändert keine Konfiguration.
Nach Bereitstellung der geprüften Datei auf dem Testgerät wird er als OS-Admin
ohne Argumente aufgerufen:

```bash
sudo /usr/bin/node /PFAD/ZUR/GEPRUEFTEN/diagnose-first-start.cjs
```

Der Pfad ist ein Platzhalter für die separat bereitgestellte, geprüfte Datei.
Der Helfer ist in älteren signierten R4-/R5-/R6-Paketen nicht enthalten; deren
Dateien werden für diese Diagnose nicht verändert. Ein Downloadbefehl benötigt
einen separat veröffentlichten Commit und Größen-/SHA-256-Pin.

Das JSON-Ergebnis enthält die bekannte Revision (`R4`, `R5`, `R6` oder `OTHER`),
Dateizustände und boolesche Vergleiche zwischen Release, Pointer und gespeichertem
Erststart-Handoff. `passwordHashPresent` und `licenseTokenPresent` bestätigen nur
das Vorhandensein, nicht die Gültigkeit. Passwörter, Hashes, Tokens, UUIDs,
Setup-Codes, Rohpfade und vollständige Kennungen werden nicht ausgegeben.
Unbekannte Zeichenfolgen werden auch in ansonsten bekannten Feldern nicht
ungefiltert übernommen.

`present` bedeutet lesbares JSON mit Objektstruktur, **keine fachliche Freigabe**.
`absent` bezeichnet eine fehlende Datei oder einen fehlenden Elternpfad;
`unsafe`, `unreadable` und `invalid` erfordern weitere Prüfung. `ok: true`
bestätigt allein die technische Erstellung dieses begrenzten Berichts.
`recoveryAuthorized` bleibt immer `false`. Eine Signaturprüfung, Abgleich der
Datenbankmarker, Passwortbindung, Lizenzprüfung, Dienststatus und Ausschluss
eines noch laufenden Wartungskoordinators stehen unter `notChecked`.

Zusätzlich ist folgender Dienststatus ohne Konfiguration oder Loginhalt hilfreich:

```bash
systemctl show nexowatt-eos-setup-finalize.service \
  nexowatt-eos-setup-license.service nexowatt-eos-upload.service \
  --property=Id,ActiveState,SubState,Result,ExecMainStatus
```

Erst nach Bewertung der konkreten Ausgabe kann eine für diesen Zustand geprüfte
Wiederherstellung bereitgestellt werden. Sperre löschen, Ersteinrichtung
zurücksetzen oder den Neuinstaller über die bestehende Installation laufen
lassen gehört nicht zur Diagnose.

Nachweise: [Dateidiagnose](../../reports/integration/first-start-diagnostic-20261004/README.md).
