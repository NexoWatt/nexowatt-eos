# NexoWatt EOS Admin v7.9.84 – Live-Abnahme vor Marktfreigabe

## Installation und Start

- [ ] Installation über lokales ZIP läuft ohne npm-/Paketfehler durch.
- [ ] `eos-admin.0` startet und bleibt grün.
- [ ] Oberfläche lädt nach normalem Neuladen ohne leere Seite.
- [ ] Oberfläche lädt nach `Strg + F5` ebenfalls korrekt.
- [ ] Browserkonsole enthält keinen `SyntaxError`, keinen fehlenden Chunk und kein doppeltes HTML5-Backend.
- [ ] Selbstupdate des EOS Admin verbindet sich nach dem Neustart automatisch wieder.

## Navigation und Oberfläche

- [ ] Alle Hauptseiten öffnen ohne Fehler: Cockpit, Module, Dienste, Datenpunkte, Struktur, Systemlogs, Zugänge & Rechte, Skripte, EOS, Hosts, Dateien, Sicherung.
- [ ] Moderne NexoWatt-Navigationsicons sind sichtbar.
- [ ] Keine alten Ghost-Buttons oder doppelten Logos erscheinen.
- [ ] Filter-, Auswahl- und Installationsdialoge liegen im Vordergrund und bleiben klickbar.
- [ ] Oberfläche bleibt nach mindestens 60 Minuten Nutzung reaktionsfähig.

## Adapter und Instanzen

- [ ] Adapterliste lädt vollständig.
- [ ] Adapter kann gesucht und ausgewählt werden.
- [ ] Bestimmte Adapterversion kann im Expertenmodus installiert werden.
- [ ] Normales Adapterupdate läuft sauber durch.
- [ ] `eos-admin.0` ist geschützt.
- [ ] `eos-admin.1` und weitere Zusatzinstanzen sind löschbar.
- [ ] Normale Adapter und Instanzen sind löschbar.

## Datenpunkte

- [ ] Folder, Channel, Device und Meta zeigen keinen künstlichen `(null)`-Wert.
- [ ] Read-only-State mit `common.write=false` ist nicht bedienbar.
- [ ] Normaler Boolean-State lässt sich schalten.
- [ ] Button/Trigger schreibt den korrekten Triggerwert.
- [ ] Number-State öffnet den Wertdialog und übernimmt Ganzzahl sowie Kommawert.
- [ ] String-State öffnet den Textdialog.
- [ ] Enum/`common.states` schreibt den internen Schlüssel.
- [ ] JSON/Object/Array wird nur bei gültigem JSON geschrieben.
- [ ] Write-only-State ohne aktuellen Wert kann initial beschrieben werden.
- [ ] Sicherheitsrelevante Leistung/Reset/Remote-Steuerung ist außerhalb Expertenmodus gesperrt.
- [ ] Sicherheitsrelevante Steuerung funktioniert im Expertenmodus.
- [ ] Schreibfehler bleiben sichtbar und schließen den Dialog nicht still.

## Rollen und Rechte

- [ ] Admin behält Vollzugriff auch während eines Adapterneustarts.
- [ ] Installateur sieht nur vorgesehene Service-/Konfigurationsbereiche.
- [ ] Endkunde landet in der vorgesehenen EOS-Kundenoberfläche.
- [ ] Kurzzeitiger Verbindungsfehler stuft einen Admin nicht zum Endkunden zurück.

## Browser

- [ ] Chrome aktueller Stand: vollständig geprüft.
- [ ] Firefox aktueller Stand: vollständig geprüft.
- [ ] 100 %, 125 % und 150 % Browserzoom ohne blockierte Bedienelemente geprüft.
