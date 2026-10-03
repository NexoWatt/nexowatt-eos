# UUID für die Lizenzerstellung im Erststart-Assistenten

Nutzerergänzung vom 3. Oktober 2026 zu `EOS-REQ-ONBOARD-20261002`:
Die UUID muss während der Ersteinrichtung sichtbar sein, damit NexoWatt die
zugehörige Gerätelizenz erzeugen kann.

Der Lizenzschritt zeigt nach dem geschützten Besitznachweis durch den
Einrichtungscode die **Geräte-UUID für die Lizenzerstellung**. Sie ist bereits
vor dem Speichern des Servicepassworts, ohne Lizenzschlüssel und unabhängig
von der Auswahl einer sofortigen Lizenzaktivierung sichtbar.

- Quelle ist die vorhandene `system.meta.uuid.native.uuid`, normalisiert durch
  den bestehenden Lizenzkern. Es wird keine zweite oder zufällige UUID erzeugt.
- Ein schreibgeschütztes Feld zeigt die vollständige UUID einschließlich eines
  gegebenenfalls vorhandenen zweistelligen Präfixes. Das Feld ist auswählbar;
  „UUID kopieren“ übernimmt die UUID in die Zwischenablage.
- Verweigert der Browser die Zwischenablage oder fehlt deren Schnittstelle,
  wird das Feld zur manuellen Kopie markiert und ein Hinweis angezeigt.
  Eine fehlgeschlagene Kopie wird nicht als Erfolg ausgegeben.
- Solange keine gültige UUID vorliegt, bleibt der Kopierknopf gesperrt. Es gibt
  keinen Beispielwert, der versehentlich als Gerätekennung kopiert werden könnte.
- Die Oberfläche übermittelt keine veränderbare UUID als Einrichtungsparameter.
  Der Server prüft eine erzeugte Lizenz gegen dieselbe installierte Kennung.
- Ohne gültige Setup-Sitzung liefert die API keine Geräte-UUID. HTTPS,
  Einrichtungscode, Sitzungsablauf und Lizenzsignaturprüfung bleiben verbindlich.

Die konkrete lokale Prüfung steht unter
`reports/integration/uuid-first-start-20261003/verification.json`.
Grafische Browserabnahme, vollständige Installation und Hardwaretests bleiben
offen, soweit sie dort nicht ausdrücklich als ausgeführt belegt sind.
