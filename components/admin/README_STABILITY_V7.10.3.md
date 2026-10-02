# NexoWatt EOS Admin 7.10.4 – Stabilitätsstand

Version 7.10.4 übernimmt die validierten Backend-, Paket- und Restart-Schutzmaßnahmen aus 7.10.2 unverändert. Die sichtbare Karte **Automatische Adapter-Updates** wird ausschließlich im Dialog **Systemeinstellungen** hinter dem Schraubenschlüssel eingebunden. Sie darf weder in der Übersicht noch in Module, Dienste, Datenpunkte oder anderen Hauptseiten erscheinen.

Die Browserdateien `src-admin/public/js/eos-auto-update.js` und `adminWww/js/eos-auto-update.js` sowie die zugehörigen CSS-Dateien müssen identisch sein. Der Cache-Schlüssel `7103` erzwingt nach dem Update das Laden der neuen Platzierungslogik.
