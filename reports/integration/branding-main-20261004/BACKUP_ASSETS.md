# Backup- und Installer-Logos – Integration in aktuelles main

Basis: `4ac429e1f4f06a249053487f719f670a8d03472b`, 04.10.2026.

30 konkret zugeordnete Brandingdateien wurden aus dem vorbereiteten Quellstand übernommen. Jede Datei wurde vorher gegen die Dreiwege-Liste geprüft: 25 vorhandene Dateien waren ausschließlich lokal geändert, fünf Dateien waren neu. Der vorhandene main-Dateiinhalt entsprach jeweils exakt dem dort festgehaltenen Remote-Blob. Keine neuere Änderung wurde überschrieben. Es erfolgte keine vollständige ZIP-Übernahme.

Die Backup-Seiten laden eine lokale NexoWatt-Ladeanzeige, besitzen passende eigene Favicons und Produkticons und laden das angepasste Bundle mit einer neuen Cachekennung. Das JavaScript-Bundle unterscheidet sich von der main-Basis ausschließlich durch die Bytes des bekannten eingebetteten alten Logos. Kompatibilitätsnamen unter `img/logos` bleiben erhalten; ihr Inhalt verwendet die vorhandenen eigenen Produktassets.

Sechs frisch ausgeführte Prüfungen bestanden, ebenso die JavaScript-Syntaxprüfung und `git diff --check` für diesen Teil. Der erste Prüflauf traf beim Lesen des großen Bundles auf die Ausgabepuffergrenze des Prüfskripts. Nach deren Anpassung bestand der vollständige Lauf; beide Rohbelege sind erhalten. Vorherige Testergebnisse wurden nicht als neue Prüfung ausgegeben.

Der vorhandene Inhalt unter `delivery` blieb unverändert. Die signierte R5-Auslieferung wurde nicht neu gebaut, signiert oder ersetzt. Dieser Quellstand enthält daher keine neue Pi-Auslieferung. Browserdarstellung, Installation, Pi- und Hardwarebetrieb sind **OFFEN**. Kein Commit, Push oder Zweig wurde durch diesen Teilauftrag erzeugt.

Reproduzierbare Prüfung: `node --test reports/integration/branding-main-20261004/backup-assets.test.cjs`. Zugeordnete Dateien und Hashes: `backup-assets-merge.json`; aktuelle Ergebnis- und Rohbelegshashes: `backup-assets-verification.json`.
