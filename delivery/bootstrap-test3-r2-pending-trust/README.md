# Vorbereiteter privater GitHub-Einstieg – noch gesperrt

Diese Dateien bilden einen bytegenau gebundenen, prüfbaren Downloadstart.
`github-manifest.json` ist absichtlich `ready:false`: Der vorliegende öffentliche
NWL2-Export ist noch nicht der aktuellen Hersteller-Lizenzverwaltung zugeordnet.
Der Loader beendet den Ablauf vor Installation; es wird kein Test- oder
Ersatzschlüssel als Herstellertrust verwendet. Der README-Befehl ist entsprechend
als **noch nicht startbereit** gekennzeichnet.

Nach bestätigter Zuordnung erzeugt `tools/bootstrap/build-github-download.cjs`
eine neue, getrennte Lieferung mit dem öffentlichen Trust, dem Helfer-ZIP und
den festen Blob-/SHA256-Pins der bereits signierten r2- und Node-Archive.
Anschließend wird der README-Befehl auf diese neue Lieferung gebunden.
Diese historische Vorbereitung braucht nicht überschrieben zu werden.

Keine Zugangsdaten oder privaten Lizenzschlüssel enthalten. Ein gültiger
GitHub-Token ersetzt keine EOS-Lizenz. Pi-/Hardwaretests sind **OFFEN**.
