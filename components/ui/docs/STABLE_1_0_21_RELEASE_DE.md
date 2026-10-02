# NexoWatt EOS 1.0.21

Dies ist die offizielle Stable-Version 1.0.21 vom 25.09.2026. Schwerpunkt: verständliche Einrichtung der
Nulleinspeisung, verlässliche Wechselrichter-Zuordnung und SmartHome-Zugriffsrechte.

## Netzlimits und Wechselrichter

Die Nulleinspeisung nutzt die gesamte verfügbare Kartenbreite. Grundeinstellungen,
Wechselrichter und kompakter Status sind klar getrennt; Feineinstellungen,
optionale Integrationen und vollständige Diagnose sind aufklappbar. Die
Wechselrichter der Einspeisebegrenzung lassen sich direkt unter Netzlimits
hinzufügen und bearbeiten. Separate EVU-Relaisgruppen bleiben im EVU-Bereich.

Die PV-Istleistungs-Zuordnung eines Wechselrichters ging zuvor bei erneuter
Formularnormalisierung verloren. Sie bleibt nun beim Bearbeiten, Neuzeichnen und
Speichern erhalten. Dezimalkommas bei der Bezugsleistung werden berücksichtigt.
Fehlende Werte für Bezugsreserve und Totband zeigen die bestehenden Runtime-
Vorgaben 80 W und 50 W; ausdrücklich gesetzte 0-W-Werte bleiben gültig.

Die Felder unterscheiden PV-Erzeugungsgrenzen in W/Prozent von einer echten
Netzeinspeisegrenze. Der Legacy-Einzel-WR-Editor verwendet dieselben kanonischen
Konfigurationsfelder wie die Runtime. Vorhandene Zuordnungen bleiben erhalten.
Die bestehende Regelstrecke bleibt zuständig; es entsteht kein zweiter PV-Regler.

Fehlende Bezugsleistungen und mehrdeutige Schreibzuordnungen werden als Fehler
behandelt. Das betrifft auch gleichzeitig aktive EVU- und Einspeisegruppen,
wenn sie denselben Ausgang verwenden. Fehlerhafte Gruppen erhalten keine
positiven Vorgaben; nur eindeutig geeignete Ausgänge bekommen einen begrenzenden
0-W-/0-%-Befehl. Ungeprüfte Alias-Umrechnungen dürfen diesen Fehlerbefehl nicht
in eine höhere physische Leistung verwandeln. Geänderte Konfiguration und alte
Datenpunkt-Zuordnung dürfen keine vorbereiteten positiven Folgekommandos auslösen.

Eine echte Netzeinspeisegrenze wird auch beim Start innerhalb des Totbands an
die zugeordneten Geräte übergeben; das Totband ist keine Befreiung vom Exportlimit.
Die Zuordnungsprüfung ist keine Empfangs- oder Wirkungsbestätigung
eines Wechselrichters. Die reale Gerätefunktion bleibt Gegenstand der Inbetriebnahme.

Die vollständige Anleitung mit Bedeutung der Datenpunkte, Startwerten,
Ladepunkt-Netzanteil, Phasenumschaltung und Prüfablauf:
[Nulleinspeisung einrichten](NULL_EINSPEISUNG_EINRICHTUNG_DE.md).

## SmartHome

Die technische SmartHome-Einrichtung ist aus den allgemeinen Einstellungen
entfernt. Sie wird ausschließlich im SmartHome-Bereich für Admin und Installateur
angeboten. Kunden können ihre bereits eingerichteten Geräte weiter bedienen.

Die vorhandenen serverseitigen Konfigurations- und Datenpunktrechte bleiben
maßgeblich. Zusätzlich führen normalisierte/kodierte Static-HTML-Pfade durch
dieselbe Rollenprüfung. Vorher konnten bestimmte URL-Varianten noch das Editor-
HTML ausliefern, obwohl die Konfigurations-APIs den Kundenzugriff bereits sperrten.

## Prüfung und Veröffentlichung

Gezielte Regressionen prüfen Formularereignisse und Speichern, Messzuordnungen,
Wechselrichter-Schreibpfade sowie HTTP-Rollen und Browsernavigation. Der komplette
Repository- und Build-Test, Dokumentationsprüfung, unveränderliche Paketprüfung
und frische/überkopierte Publish-Prüfung bleiben erforderlich.

Die ZIP enthält Quellcode, deutsche Kommentare und fertige Laufzeitdateien.
Die schnelle npm-Veröffentlichung ohne erneuten Produkt-Build bleibt erhalten.
Es erfolgte keine externe Veröffentlichung und kein Zugriff auf Live-Geräte.
