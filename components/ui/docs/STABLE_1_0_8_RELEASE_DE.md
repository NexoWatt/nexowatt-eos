# NexoWatt EOS 1.0.8

Diese offizielle Stable-Version basiert auf dem vollständigen Repository 1.0.7 und erweitert die Home-Lizenz um die Speicherfarm.

| Lizenz | Speicherfarm | Maximale Speichersysteme |
| --- | --- | --- |
| Home (technisch HEMS) | Enthalten | 2 |
| Pro (technisch EOS) | Enthalten | 10 |

Jede konfigurierte Speicherzeile zählt als ein System, auch wenn sie deaktiviert ist. Pool und Gruppen verwenden dieselbe Grenze. Die bestehenden Home-Leistungsgrenzen von insgesamt 50 kW bleiben bestehen; die Stückzahl erhöht diese Leistungsgrenze nicht. Die Farm bleibt ab zwei real zugeordneten Speichern aktiv und behält ihre ausschließliche Steuerhoheit gegenüber dem Einzelspeicherpfad.

## Einrichtung und Bestandsanlagen

Die App „Speicherfarm“ lässt sich jetzt auch mit Home installieren. Im App-Center erscheint die Anzahl der konfigurierten Systeme samt Lizenzgrenze. Nach Erreichen der Grenze ist „Speicher hinzufügen“ gesperrt; das Entfernen eines Systems gibt einen Platz frei. Speichern und Backup-Import prüfen die Grenze zusätzlich auf dem Server, auch bei direkten API-Aufrufen.

Beim Update, bei älteren Konfigurationen oder beim Wechsel von Pro auf Home werden vorhandene Zuordnungen nicht stillschweigend gelöscht. Alle Zeilen bleiben sichtbar. Die ersten zwei (Home) bzw. zehn (Pro) konfigurierten Zeilen sind lizenzseitig freigegeben; weitere aktivierte Zeilen erhalten keine Lade-/Entladezuteilung. Der vorhandene Schreibpfad nimmt deren direkte Sollwerte auf null zurück und prüft die Rückmeldung. Bei FEMS-NVP-Regelung wird der zur Batteriesollleistung null passende Netzarbeitspunkt berechnet. Messwerte bleiben für Anzeige und Energiebilanz erhalten.

Überzählige Zeilen sind im App-Center und im Farmstatus als Lizenzsperre erkennbar. Vor erneutem Speichern muss der Installateur die Zuordnung innerhalb der Lizenzgrenze bereinigen. Nicht erreichbare Geräte können eine Sollwertrücknahme nicht bestätigen; die bestehende Schreib-/Kommunikationsdiagnose bleibt dafür maßgeblich. Die Lizenzbegrenzung ersetzt keine geräteseitigen Sicherheitsfunktionen.

## Prüfung

Neue Regressionen prüfen Home 2/Pro 10, Speichern und Import, Pool und Gruppen, Signed- und Split-Sollwerte, veraltete Statusdaten, Lizenzwechsel, fehlende Lizenz, Bestandsmigration und FEMS-NVP-Umrechnung. Der Browsertest prüft die tatsächliche App-Center-Oberfläche einschließlich Hinzufügen, Entfernen und zu großer Bestandskonfigurationen.

Die vollständige Release-Prüfung umfasst `npm run test:all`, `npm run build:ts`, `npm run publish:check` und `npm pack --dry-run --json --ignore-scripts`. Die bisherigen AC/DC-Regressionsfälle und die E-Mail-Intervalle (harte Fehler bei Erkennung, normale Fehler alle 30 Minuten, übrige Meldungen täglich) bleiben Bestandteil der Tests.

Nach dem Update Adapter neu starten und Browser neu laden. Vor Aktivierung an einer realen Anlage im Diagnosebetrieb die Speicherzuordnungen, Sollwertrichtung und Rückmeldungen prüfen. Es wurden keine Befehle an Kundenanlagen gesendet; Softwaretests ersetzen diese Inbetriebnahme nicht. Diese ZIP veröffentlicht das Paket nicht automatisch auf npm.
