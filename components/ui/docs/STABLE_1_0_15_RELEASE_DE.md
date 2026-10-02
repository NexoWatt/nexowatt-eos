# NexoWatt EOS 1.0.15 – Trafo-Master, Haus-Slaves und Zählerarchiv

Die offizielle Stable-Version erweitert die Microgrid-App um eine bedarfsabhängige Trafo-Regelung und eine optionale Grundlage für die hausweise Abrechnung. Die Freigabe dieser Repository-Version ersetzt keine Inbetriebnahme oder Feldabnahme der Regelanlage.

## Regelung

Der Master misst den gemeinsamen Trafo-NVP; jeder Slave regelt am Haus-NVP weiter lokal. Im neuen Verteilmodus „Bedarfsabhängig“ erhält jedes Haus einen sicheren Leistungskorridor aus gemessener Last und konfiguriertem Spielraum. Nicht benötigte Anteile stehen anderen Häusern zur Verfügung. Hohe Trafoauslastung entfernt den Spielraum und begrenzt die Summe; eine getrennte Rückschaltschwelle verhindert Pendeln. Bezug, Einspeisung und alle drei Phasen sowie optionale Stränge werden getrennt begrenzt. Zusätzlich gemessene Grundlast verringert die verfügbare Leistung.

Wartende AC-/DC-Ladepunkte melden ihren bestätigten lokalen Ladebedarf bereits vor dem tatsächlichen Verbrauch. Ganze Mindestleistungen werden vor der weiteren Verteilung berücksichtigt; bei zu wenig Gesamtleistung wartet ein Haus, statt allen Ladern unbrauchbare Teilbudgets zuzuteilen. Bereits ladende Häuser haben beim Anlauf Vorrang, danach gelten Gewicht und Knoten-ID. Eine zeitliche Rotation wartender Häuser ist damit nicht implementiert. Für sonstige Verbraucher ohne Bedarfsmeldung den Haus-Spielraum ausreichend für deren Anlaufleistung einstellen.

Alle gleichzeitig wirksamen Freigaben bleiben reserviert. Ein noch nicht bestätigter geringerer Sollwert wird nicht bereits als freie Kapazität an ein anderes Haus vergeben. Physikalische Grundlasten, Rückfallwerte, lokale Gerätebegrenzungen und unabhängige Watchdogs müssen zur Anlage passen.

Bisherige Installationen behalten „Feste Anteile“. Neue Trafo-Projekte wählen den bedarfsabhängigen Modus. Die Betreiberansicht erlaubt auch bei aktiver Anlage einen Wechsel der reinen Verteilstrategie unter unveränderten geprüften Grenzen und Reservierungen. Aktive Topologie-/Inbetriebnahmedaten bleiben geschützt; die Gesamtfreigabe kann der Betreiber innerhalb der geprüften Grenzen ändern. Freigaben unterhalb der notwendigen Rückfallsumme werden abgewiesen.

## Kommunikation

Optionaler schneller Takt: 250 ms, Antwortlimit 200 ms, Freigabedauer 1.500 ms, Messwertalter höchstens 1.000 ms. Die Wartezeit enthält die Antwortzeit bereits. Ein Timeout blockiert nur den betroffenen Kanal. Unveränderte Vorgaben behalten ihre Befehlsnummer, während jede Antwort weiterhin an eine neue konkrete Anfrage gebunden ist. Anwendungsbestätigungen können dadurch auch bei längeren EMS-Zyklen eintreffen. Unbestätigte Vorgaben erhalten keine weiteren Erhöhungen; überschrittene Fristen führen zum Rückfall.

Das ist keine garantierte Reaktionszeit der gesamten Anlage. Zähler, Tailscale-Verbindung, EMS und Stellgeräte müssen vor Ort gemeinsam gemessen werden. Direkte Tailscale-Verbindungen bevorzugen; Relay-Verbindungen können langsamer sein. Der separate Tailscale-Server und dessen Zugriffsregeln werden nicht von EOS installiert oder verändert.

## Optionales Zählerarchiv und Abrechnung

- Master: Option aktivieren. Jeder Slave: Option aktivieren, geeichten Zweirichtungszähler am Haus-NVP zuordnen; getrennte kumulative Bezugs-/Einspeisedatenpunkte, Wh/kWh, Zählernummer, Epoche und Eichfrist hinterlegen.
- Lokale Originalarchive bleiben auch nach Übertragung erhalten. Master bestätigt erst nach dauerhaftem Schreiben. Nach Neustart oder Verbindungsunterbrechung gleichen die Systeme Sequenz und Hash ab; fehlende Daten werden in begrenzten Batches nachgeliefert.
- Die Archivübertragung verwendet eine eigene Verbindung und getrennte Timer. fsync, Berichte und Nachlieferung laufen nicht im Regelhandler.
- Betreiberansicht je Haus: aktuelle NVP-Leistung, Freigaben, Verbindungs-/Bestätigungsstatus, Zählernummer, Registerstände, Mess-/Empfangszeit und Qualität.
- Zeitraum und Preise wählen; Bezug, Einspeisung und Zeitraum-Pauschale getrennt auswerten. Export als CSV-Entwurf, JSON-Prüfbeleg, Original-JSONL und Druck/PDF.
- Fehlende Randstände ergeben einen ausdrücklich gekennzeichneten Teilzeitraum. Die Pauschale wird erst für ausdrücklich ausgewählte vollständige Randzeiten angesetzt. Keine Interpolation fehlender Werte; Zählerwechsel, Rücksprünge und nicht zuordenbare Energie sperren den Betrag.
- Ein Zählerrücksprung bleibt bis zur ausdrücklich eingerichteten neuen Epoche gesperrt, auch über Messlücken und Neustarts hinweg. Der Messwertverlauf der bisherigen Hausansicht ersetzt dieses explizite Archiv nicht; historische Werte werden nicht stillschweigend als geeichte Abrechnungsdaten importiert.
- Archive werden nicht automatisch gelöscht. Beschädigung oder volle Speichergrenze lösen eine sichtbare Störung aus. Die bestehende Benachrichtigungspolitik fasst Archivstörungen zusammen.

Zählerdeklaration und Hashkette sind kein Zertifikat für die gesamte Abrechnung. Der Betreiber muss Messgerät, Zuordnung und rechtliche Verwendbarkeit prüfen. EOS erstellt Abrechnungsentwürfe, keine rechtsverbindlichen Steuerrechnungen, und berechnet keine Umsatzsteuer. Anforderungen an nachvollziehbare Messwerte: [§ 33 MessEG](https://www.gesetze-im-internet.de/messeg/__33.html).

## Zugriff und bestehende Funktionen

Die neue Betreiberansicht ist Installer/Admin vorbehalten. Normale Kunden erhalten weder technische Zuordnungen noch Nachbarhausdaten. Beim eingerichteten Coordinator öffnet die bisherige Microgrid-App automatisch diese Betreiberansicht. AC/DC-Laderegelung, SMTP-Geheimnisse, SmartHome-Rechte und Home-/Pro-Lizenzgrenzen bleiben Bestandteil der Gesamtprüfung.

Die bereits dokumentierten aktiven Mesh-Treiberbeschränkungen bleiben bestehen: insbesondere keine aktive Freigabe von Speicherfarmen oder ungeprüften Hersteller-Sonderschnittstellen. Grundsätzliche Home-/Pro-Farmfunktionen außerhalb dieser Mesh-Einbindung bleiben erhalten.

## Veröffentlichung und Nachweise

Vollständiges Repository übernehmen, anschließend wie bisher `npm publish --tag latest`. Sämtliche bisherigen Publish-Gates bleiben erhalten; der Publish-Vorgang baut oder versiegelt keine Produktdateien neu. Die beschleunigte Syntaxprüfung aus 1.0.14 bleibt aktiv.

[Einrichtung und Sicherheitsvertrag](MICROGRID_MASTER_SLAVE_DE.md) · [Prüfbericht](reports/STABLE_1_0_15_VALIDATION_DE.md)
