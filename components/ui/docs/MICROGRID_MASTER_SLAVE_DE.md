# Microgrid: EOS-Master und bis zu 99 Slaves

Stand: 1.0.15, 19.09.2026. Grundlage ist das Entwicklungskonzept „NexoWatt EOS Mesh / Microgrid“ vom selben Tag. Diese Ausbaustufe liefert Kommunikation, bedarfsabhängige Trafo-/Haus-Budgetierung, lokale Begrenzung, Diagnose und optionale Zählerarchive mit Abrechnungsentwürfen. Sie ersetzt keine Inbetriebnahme der beteiligten Geräte.

**Integriertes EOS-Testprofil, 01.10.2026:** Die nachstehende historische Funktionsbeschreibung ist keine Aktivierungsfreigabe. Physische Steuerung und unbeaufsichtigte Mesh-Anfragen bleiben gesperrt. Vor den bisherigen Austausch-/Archivendpunkten liegt die verpflichtende Benutzeranmeldung; ein eigenes geprüftes Maschinenidentitätsprofil steht noch aus. Ein Browserkonto ist kein vorgesehenes Betriebsverfahren für Gerätekommunikation. Die Stabilisierung `UI-MESH-PERF-20261001` ändert diese Grenzen nicht.

## Aufbau und Zugriff

Ein fest zugeordneter EOS-Master verwaltet maximal 99 weitere EOS-Geräte. Der Master kann zusätzlich sein eigenes Haus regeln; dafür braucht er eine getrennte Messung des gesamten Standorts. Es gibt keine automatische Master-Wahl. Ein Master-Neustart erzeugt eine neue Sitzung und verlangt erneute Synchronisation.

Tailscale wird weiterhin separat betrieben. Jedes EOS-Gerät muss darüber die EOS-Adresse und den Web-Port des Masters erreichen. Ein zentraler Tailscale-Knoten allein erzeugt noch keine Verbindung zu allen Slaves: Routing und Zugriffsregeln müssen diese Verbindungen tatsächlich erlauben. Die Anwendung verändert weder Tailscale noch dessen Server. Sie setzt keine konkrete Tarif-/Gerätezahl des Tailscale-Kontos voraus.

Nach der [offiziellen Tailscale-Dokumentation](https://tailscale.com/docs/reference/connection-types) sind direkte Verbindungen in der Regel schneller als Relay-Verbindungen. Vor Ort mit `tailscale status` bzw. `tailscale ping` prüfen. Die EOS-Ansicht zeigt gemessene Antwortzeiten und deren P95, behauptet jedoch keine direkte Verbindung, wenn dies nicht nachgewiesen ist. Ein VPN liefert keine garantierte Echtzeit.

Ab 1.0.16: **EMS Apps → Apps → EOS Mesh/Microgrid → Installiert: Ja → Speichern → Mesh/Microgrid konfigurieren**. Im zugehörigen EMS-Reiter liegen Einrichtung, Regelung, Teilnehmerübersicht und Abrechnung zusammen. Der Installer enthält keinen separaten Microgrid-Einstieg. `/ems/microgrid/#/mesh-coordinator` ist der geschützte Direktlink derselben App; alte Links leiten dorthin weiter, wenn die App installiert ist. Nur Installer und Admin dürfen Konfiguration, Nachbarhaus-Diagnosen und Paarung abrufen. Alte Kunden-Sessions mit Wildcard-Rechten bleiben ausgeschlossen; deaktivierte normale Kundenanmeldung öffnet diese APIs nicht.

## Master am Trafo und lokale Hausregelung

„Bedarfsabhängig“ bei der Einrichtung oder später unter „Trafo-Freigabe“ wählen. Beim Wechsel im Betrieb bleiben Teilnehmer, Grenzen, Rückfälle, Sitzung und reservierte Altfreigaben erhalten. Gemessene Hauslast plus Spielraum bestimmt den gewünschten NVP-Korridor. Freie Kapazität wird gewichteten Anfragen anderer Häuser zugeteilt. Lokal bleiben PV, Speicher, Ladepunkte und Komfortsteuerung innerhalb des Korridors zuständig; Geräte-Kategoriebudgets werden im gesunden Betrieb nicht pauschal proportional zum Trafoanteil reduziert.

Ab der Eingriffsschwelle (Startwert 90 %) entfällt zusätzlicher Spielraum; nach Unterschreiten der Rückschaltschwelle (80 %) wird er wieder aufgebaut. Erhöhungen sind begrenzt; Absenkungen werden sofort geplant. Unter „Trafo-Freigabe“ kann Installer/Admin das Gesamtbudget in W innerhalb der geprüften Grenzen einstellen. Der Master verteilt es automatisch, die Slaves berücksichtigen es zusätzlich zu strengeren Hausgrenzen.

Eine unbegrenzte Freigabe aller Häuser ist bei einem kleineren gemeinsamen Trafo auch bei aktuell geringer Last nicht sicher. Deshalb gelten stets gleichzeitig zulässige Korridore und Reservierungen. Fehlende oder unbestätigte Teilnehmer führen weiterhin zum gemeinsamen Rückfall, nicht zur Weiterverteilung ihrer möglicherweise noch aktiven Freigabe.

## Austausch ohne serielle Warteschlange

Jeder Slave initiiert seinen eigenen signierten HTTP-Austausch über Tailscale. Bestehende Verbindungen werden wiederverwendet; ein ausgefallener Slave hält keine anderen Verbindungen auf. Der Master wartet im Kommunikationshandler weder auf andere Geräte noch auf Datenträger oder Archivierung. Es gibt kein zyklisches Abarbeiten von 99 URL-Timeouts im EMS-Regeltakt.

| Größe | Startwert | Bedeutung |
| --- | ---: | --- |
| Periode zwischen Anfragestarts | 1.000 ms; schnell 250 ms | Keine überlappenden Requests; Antwortzeit wird auf die Periode angerechnet |
| Gesamter Anfrage-Timeout | 800 ms | Einschließlich Verbindungsaufbau und Antwort |
| Maximale Freigabedauer | 3.000 ms | Ab Erstellung der Slave-Anfrage, monoton gemessen |
| Maximales Messwertalter | 2.000 ms | Echte Messwertfrische, nicht nur Empfang einer Nachricht |
| Lokale Ablaufüberwachung | 100 ms | Während der EOS-Prozess läuft |
| Stabile Zyklen vor Erhöhung | 10 | Rückfall und frische Messungen zuvor bestätigen |
| Wiederanlauframpe | 1.000 W/s | Standardwert; Phasenanteile werden konservativ mitgeführt |
| Maschinen-Nachricht | höchstens 64 KiB | Keine unbegrenzten Bodies oder Redirects |

Die Werte sind Startwerte für die Inbetriebnahme. Sensor-Updatezeit, lokale Regellaufzeit, Geräte-Reaktionszeit und VPN-Latenz müssen dazu passen. Bei zu langsamen Messungen bleibt die Regelung im Rückfall. Lokale Deadline-/Messausfälle lösen einen unmittelbaren EMS-Tick aus; ein bereits laufender Tick wird nicht parallel gestartet.

## Diagnose und Stabilisierung vom 01.10.2026

`timing.lastRttMs` und `timing.p95RttMs` bleiben Zeiten erfolgreich angenommener Antworten. Sie sind kein Zeitnachweis für einen nachfolgenden Fehler. Das neue, konstant große `timing.lastAttempt` enthält `kind`, `durationMs`, `timeoutMs`, `outcome` und `phase` für den aktuellen beziehungsweise zuletzt abgeschlossenen Versuch. `phase` unterscheidet Transport, Signaturprüfung und Lease-Annahme; die Diagnose enthält weder Paketinhalt noch Paarungsschlüssel. Ein neuer Protokollzustand verwirft diesen Nachweis. Verspätete Antworten bleiben abgewiesen; im 200-ms-Test wird 200 ms akzeptiert und 201 ms verworfen. Die Lease läuft unverändert ab Anfrageerstellung.

Der Master merkt intern, wenn sämtliche Zielwerte bereits höchstens den Rückfallwerten entsprechen. Weitere degradierte Nachrichten müssen diese 99 Zielvektoren nicht erneut absenken. Die Prüfung von Messwerten, Teilnehmern, Bestätigungen, Altreservierungen und Fristen bleibt bestehen. Eine tatsächlich neue NORMAL-Planung verwirft den Merker vor jeder Zieländerung; ein neuer Handshake verwirft ihn nicht. Bei erneutem Rückfall werden erhöhte Ziele sofort abgesenkt. Niedrigere, etwa durch Rundung entstandene Werte steigen dabei nicht. Der Zeitpunkt des letzten degradierten Aufrufs wird unmittelbar vor der nächsten tatsächlichen Planung in beide Wiederanlauframpen übernommen; die Wartephase erzeugt kein zusätzliches Rampenbudget.

| STRIDE-Bezug | Sicherheitsgrenze und Prüfung |
| --- | --- |
| Manipulation / Rechteausweitung | Differentialtest gegen den Planer aus `c211f1a`: unveränderte Ziele, Altreservierungen, Bestätigungen, Sequenzen und Rampen für feste und Transformator-Verteilung |
| Verfügbarkeit | Deterministisch begrenzte wiederholte Zielzugriffe; CPU-Vergleich separat von HTTP-/Datenträgerlaufzeiten; Deadline nicht verlängert |
| Offenlegung / Nachvollziehbarkeit | Nur eine begrenzte numerische Versuchszusammenfassung, ohne Geheimnisse; historische Fehlbelege bleiben erhalten |
| Identität / Wiedereinspielung | Bestehende HMAC-, Boot-, Sequenz-, Konfigurations- und Lease-Prüfungen unverändert; spätes Paket erteilt keine Freigabe |

`npm run test:mesh-coordinator` enthält jetzt auch `test:mesh-timing-contract`. Der bisherige Lastfall mit 99 Verbindungen, 250-ms-Takt, 200-ms-Anfragebudget und 32 parallelen Archivschreibvorgängen pro Runde bleibt einschließlich der Gültigkeitsprüfung **nach** dem Archivabschluss erhalten. Netzabschluss und Archivabschluss werden getrennt gemessen. Dieser bisherige Abschnitt prüft den gemeinsamen Rückfallzustand. Ein zusätzlicher Abschnitt prüft den NORMAL-Zustand mit ausdrücklich simuliertem EMS-Vollzug; er belegt keine physische Gerätewirkung.

Der zusätzliche NORMAL-Abschnitt läuft ohne parallele Archivlast; nur Runden mit sämtlichen Teilnehmern in NORMAL gehen in seine Antwortstatistik ein. Die historischen sporadischen Zeitüberschreitungen sind durch erfolgreiche Wiederholungen nicht als ursächlich behoben nachgewiesen. Der reproduzierte Diagnosefehler und die redundante Planerarbeit sind getrennte Befunde. Rohdaten, CPU-Vergleich, Differentialtests und jeweiliges Volltestergebnis liegen unter `reports/security/stabilization-20261001/`. Zielhardware, reales Netz, unabhängige Sicherheitsprüfung und Maschinenidentitäten bleiben gesonderte Nachweise; dies ist keine Produktions- oder CRA-/IEC-Freigabe.

## Prioritäten und sichere Grenzen

Technische Geräte-, Anschluss- und externe Netzvorgaben bleiben wirksam. Innerhalb dieser Grenzen gelten die Master-Budgets vor Boost, Zeitplan, Tarif- und Komfortwünschen.

Ein Budget beschreibt den gesamten Hausanschluss, keine zusätzliche Ladeleistung. Positiver NVP bedeutet Bezug, negativer NVP Einspeisung. Alle Leistungen werden als positive W-Beträge und alle Phasengrenzen als positive A-Beträge konfiguriert. **0 ist eine Grenze, kein Platzhalter für unbegrenzt.**

Jeder Teilnehmer erhält Maximum und Rückfall für Hausbezug, Einspeisung, L1/L2/L3, Ladepunkte gesamt, Speicherladung, Speicherentladung, PV-Erzeugung und weitere flexible Lasten. Rückfall darf das Maximum nicht überschreiten. Nicht vorhandene Kategorien auf 0 setzen; vorhandene Geräte und Messungen bei der Inbetriebnahme vollständig erfassen.

Für Hauptanschluss und jeden optionalen Strang prüft EOS alle fünf Netzdimensionen getrennt:

`nicht erfasste Last + Rückfallsummen + Reserve ≤ Anschlussgrenze`

Erhöhungen berücksichtigen zusätzlich die noch reservierten Altfreigaben. Ein nicht erreichbares Gerät gibt keine Kapazität frei. Nach Master-Neustart bleibt zunächst das konfigurierte Maximum jedes Teilnehmers reserviert. Eine bestätigte geringere Begrenzung kann diese Reservierung abbauen. Erzeugung eines Nachbarhauses wird nicht als garantierte Zusatzkapazität vorausgesetzt.

Die Rückfallphase gilt für den gesamten Standort. Jeder erreichbare Slave erhält Rückfallwerte; ein nicht erreichbarer Slave begrenzt sich lokal nach Ablauf seiner Freigabe. Ungültige Messungen, fehlende Phasen, andere Standort-/Knoten-IDs, andere Konfigurationsversionen, manipulierte Pakete, alte Boots, alte Sequenzen und verspätete Antworten erteilen keine neue Freigabe.

`RECEIVED` bestätigt Empfang, `APPLIED` einen vollständig verarbeiteten lokalen EMS-Zyklus. `VERIFIED` verlangt darüber hinaus frische Messungen nach diesem Zyklus, passende Netz-/Kategoriegrenzen und keine gelatchten kritischen Modulfehler. Das ist eine Software-/Messwertbestätigung, kein unabhängiger Nachweis der physikalischen Abschaltwirkung jedes Herstellers.

## Lokale Regelung und derzeit unterstützte Schnittstellen

Die gemeinsame SafetyEnvelope prüft Hausbezug, alle drei Phasen und summierte Verbraucherkategorien. Die finale Prüfung liest den aktuellen Lease-Zustand erneut. Ein zwischen Planung und Ausgabe abgelaufenes Budget bleibt dadurch nicht als alte Freigabe bestehen. Die bestehenden AC-/DC- und Geräte-Minimumprüfungen bleiben bestehen.

Generische Speicher mit signiertem W-Sollwert getrennten Lade-/Entlade-W-Sollwerten oder numerischen Lade-/Entlade-W-Limits werden zusätzlich direkt vor dem DP-Schreibzugriff begrenzt. Aktive Mesh-Regelung wird für Speicherfarmen, FENECON-NVP-Sonderschnittstellen, E3/DC-Sondermodi und reine Enable-Schnittstellen in dieser Ausbaustufe nicht freigegeben. Die vorhandene eigenständige Speicherregelung bleibt unverändert nutzbar. Solche Häuser zunächst in Diagnose betreiben; weitere Treiber benötigen eigene Wirksamkeits- und Ausfalltests.

PV benötigt den eingerichteten lokalen Export Guard und eine numerische Erzeugungsgrenze W/% pro Wechselrichter. Eine reine Einspeisegrenze reicht nicht für ein zusätzliches PV-Erzeugungsbudget. Finale DP-Schreibzugriffe begrenzen auch EVU-/Gruppenpfade. Gruppen-W-Budgets werden konservativ gleich verteilt, Prozentbudgets auf die hinterlegte Nennleistung bezogen; doppelte Zuordnungen können die nutzbare Leistung weiter reduzieren. BHKW-/Generator-Sonderregler sind nicht als aktive Mesh-Erzeuger freigegeben und müssen separat begrenzt/in Betrieb genommen werden.

Für die freigegebenen lokalen Kategorien sind tatsächliche Summenleistungs-DPs in W nötig, jeweils positive Beträge. Hauptzähler, Phasen und Feedback müssen im eingestellten Zeitfenster neue Messwerte liefern. Ein Master mit eigenem Haus benötigt separate Hauptzähler-DPs für den gesamten Verbund; die normale lokale Netzmessung beschreibt nur sein eigenes Haus.

Ein unabhängiger Geräte-/Hardware-Watchdog bleibt erforderlich: Ein JavaScript-Timer kann bei abgestürztem EOS, unterbrochener Geräteverbindung oder hängendem Prozess keine Abschaltung garantieren. Rückfallwerte einschließlich Grundlasten sowie Reserven müssen vor Ort nachgewiesen werden. Softwaretests sind keine Abnahme einer realen 100-Geräte-Anlage.

## Einrichtung in der richtigen Reihenfolge

1. Tailscale-Verbindungen und Zugriffsregeln einrichten; den EOS-Port des Masters nur den vorgesehenen Teilnehmern zugänglich machen. HTTP wird nur für Tailnet-/Loopback-Ziele akzeptiert; sonst HTTPS. Keine Zugangsdaten in URLs.
2. Master im Diagnosebetrieb speichern: Standort-/Master-ID, Teilnehmerliste, Maxima/Rückfall, Hauptanschluss, Reserven und gegebenenfalls Stränge. Jede Slave-ID muss eindeutig sein.
3. Pro gespeichertem Slave eigene Paarungsdaten erzeugen. Die Daten einmalig vertraulich auf den zugehörigen Slave übertragen. Neu erzeugte Paarung ersetzt die vorherige dieses Slaves.
4. Am Slave Paarung importieren, Tailscale-Masteradresse inklusive EOS-Port und lokale Messwert-DPs ergänzen. Gemeinsame Konfigurationsversion, IDs und Hausgrenzen müssen auf beiden Seiten übereinstimmen. Im Diagnosebetrieb speichern.
5. Messung, Vorzeichen, Grenzen, Geräte-Rückfall und unabhängige Watchdogs prüfen. Bei PV bzw. Speicher die genannten Schnittstellenbedingungen erfüllen. Hauptzähler und Stränge einschließlich nicht regelbarer Grundlast nachweisen.
6. Slaves und Master in den aktiven Betrieb übernehmen. Unterschiedliche Betriebsarten führen während der Umstellung zum Rückfall. Erst nach erfolgreicher Synchronisation und stabilen Rückmeldungen wird langsam erhöht. EOS Pro ist für Aktivierung erforderlich.
7. Verbindungsverlust, Master-Neustart, Slave-Neustart, Geräte-Kommunikationsverlust, fehlende/alte Messwerte, Maximallast, Phasenüberlast und Wiederanlauf vor Ort testen. Antwortzeiten und tatsächliche Rückfallzeiten protokollieren.

Aktive Konfigurationen sind gegen nachträgliches Speichern, Deaktivieren oder neue Paarung verriegelt. Eine einfache Umschaltung auf Diagnose darf laufende Master-Grenzen nicht entfernen. Änderungen der aktiven Topologie benötigen eine geplante physische Stillsetzung und separate Service-Neuinbetriebnahme; eine automatische sichere Außerbetriebnahme oder Live-Migration ist in 1.0.15 noch nicht enthalten. Die verschlüsselte Konfiguration nicht im laufenden Betrieb löschen.

Konfiguration und individuelle Schlüssel liegen ausschließlich verschlüsselt im ioBroker-Instanzdatenverzeichnis (`mesh-coordinator.enc`), gebunden an Systemschlüssel und Instanz. GET-Antworten und Status enthalten keine Schlüssel. Beschädigte vorhandene Konfiguration verriegelt lokal auf 0; ein dauerhaft gespeicherter Aktivierungsmarker erkennt auch eine später fehlende Konfigurationsdatei; fehlende Erstkonfiguration bedeutet ausgeschaltetes Mesh. Apps-/Lizenzschalter entfernen gespeicherte Schutzgrenzen nicht.

## Abgrenzung zum weiteren Entwicklungskonzept

Diese Version implementiert HTTP/HMAC-Austausch über Tailscale, keinen MQTT-Broker. Sie übernimmt das Master-/Slave-Sicherheitsmodell des Konzepts. Die frühere Mesh-Feldtest-Broadcaststeuerung ist bei eingerichtetem Coordinator ausgeschlossen.

Dauerhafte hausweise Energiearchive, Offline-Zählerpuffer und Abrechnungsentwürfe stehen seit 1.0.15 optional zur Verfügung. Siehe [Einrichtung, Umfang und Grenzen](STABLE_1_0_15_RELEASE_DE.md). Kundeneigene Hausansichten und weitergehende Hersteller-Adapter bleiben weitere Ausbauschritte. Eine rechtlich zertifizierte Gesamtabrechnung und eine Feldabnahme sind damit nicht behauptet. Microgrid-Störungen werden als ein gemeinsames Systemereignis in die bestehende Benachrichtigung eingebunden. Ein Ausfall nach bereits laufender Regelung oder eine verriegelte Konfiguration ist kritisch; noch nicht abgeschlossene Erst-Synchronisation erzeugt eine normale Warnung. Versand benötigt die aktivierte Kundenbenachrichtigung und eingerichtetes SMTP. Die vorhandene Sofort-/30-Minuten-/Tagespolitik sowie Wiederholschutz bleiben maßgeblich; es entstehen keine 99 Einzelmails.

## Quellcode und Tests

- `src-ts/runtime-executables/lib/mesh-coordinator-contract.ts`: Konfigurations-, Einheiten- und Summenprüfung, HMAC.
- `mesh-coordinator-protocol.ts` im selben Verzeichnis: Masterreservierungen, Sitzungen, Wiederanlauf und monotone Slave-Leases.
- `mesh-coordinator.ts`: verschlüsselte Konfiguration, eigene Kommunikationstimer, Messungen und Diagnose.
- `mesh-coordinator-writer.ts`: zusätzliche finale numerische PV-/Speichergrenzen.
- `ems/services/safety-envelope.ts`, `ems/modules/core-limits.ts`, `storage-control.ts`, `grid-constraints.ts`, `ems/datapoints.ts` unter den Runtime-Quellen: lokale Einbindung.
- `src-admin-tab/src/pages/MeshCoordinatorPage.tsx`: geschützte Einrichtung; `main.ts` bindet Lifecycle und API ein.
- `npm run test:mesh-coordinator`: 99-Knoten-Protokoll, echte parallele Loopback-HTTP-Kanäle, Ausfall/Replays/Neustart, SafetyEnvelope, Writer, verschlüsselte Ablage, Rollen und HTTP-Bodygrenze. Optionaler Browserlauf prüft den ausgelieferten React-Build.

## Archivablage und Abgleich seit 1.0.15

Einstellungen liegen zusammen mit der Mesh-Konfiguration verschlüsselt im Instanzverzeichnis. Originalstände liegen mit Dateirechten 0600 unter `mesh-energy/<Standort>/local/<Knoten>/` bzw. `mesh-energy/<Standort>/master/<Knoten>/`. Das ist lokale Klartextablage für geschützte Sicherungen; Zugang zum ioBroker-Rechner und Backups entsprechend beschränken. Segmentgröße: 1.000 Datensätze. Eine laufende Sequenz, Archiv-Stream-ID und SHA-256-Kette erkennen Abweichungen beim Abgleich. Sie schützen nicht vor einem Administrator, der alle Dateien und Hashes gemeinsam manipuliert.

Originalstände enthalten mWh als sichere Ganzzahlen, getrennte Bezugs-/Einspeiseregister, Quellenzeitstempel (ioBroker-State `ts`, kein signierter Zähler-Zeitnachweis), gesonderte Erfassungszeit UTC, Zählerkennung/Epoche, DP-Zuordnung und Qualitätsflag. Bei gültigen Registern ist der Archivzeitpunkt der spätere der beiden Quellenzeitstempel. Beide Registerzeiten bleiben einzeln erhalten und werden im Entwurf angezeigt; kleine zulässige Zeitversätze sind keine behauptete Gleichzeitigkeit. Der Master speichert seine Empfangszeit zusätzlich. Eine Bestätigung erfolgt erst nach Datei-fsync und, soweit unterstützt, Verzeichnis-fsync. Fehlende Sequenzen, veränderte Dubletten und beschädigte Dateien werden nicht automatisch repariert oder quittiert. Eine Wiederherstellung aus einer älteren Master-Sicherung kann aus dem lokalen Slave-Originalarchiv nachgeliefert werden. Ein neues leeres Slave-Archiv kann die alte Stream-ID nicht stillschweigend ersetzen; Originalarchiv aus Sicherung wiederherstellen und Zählerwechsel ausdrücklich zuordnen.

Einstellungen im Master UND je Haus aktivieren. Fehler der Archivierung setzen keine Leistungsgrenzen herauf. Speichergrenze gilt je Haus (Startwert 1.024 MiB); SSD-Gesamtkapazität und Backups separat überwachen. Ein Archiv wird niemals durch automatische Rotation gelöscht. Bei voller Grenze endet die Erfassung mit sichtbarer Störung; dabei entstandene Datenlücken bleiben Lücken.

Der Periodenbericht verwendet echte vorhandene Randstände. Fehlen die gewählten Randzeitpunkte, werden die tatsächlichen Zeiten deutlich ausgewiesen. Der Betreiber kann diese Zeiten ausdrücklich übernehmen und neu berechnen. Bei Tarifwechsel getrennte Zeiträume wählen; fehlende Tarifgrenzstände werden nicht interpoliert. Zwischenlücken werden angezeigt: ein intakter kumulativer Zähler enthält deren Energie trotzdem in der Differenz zweier verlässlicher Randstände. Zählerwechsel, Reset oder ungültige Eichdeklaration sperren eine zusammenhängende Abrechnung.

Regelkanal: 64 KiB, HMAC, eigener Keep-alive-Agent. Archivkanal: 160 KiB, maximal 32 Datensätze je Batch, eigene Verbindung mit 5 Sekunden Timeout. UI-Originalexport liest begrenzte Seiten, maximal 100.000 passende Datensätze je Export. Große Berichte geben zwischen Segmenten den Eventloop frei.


## Gemeinsamer App-Lebenszyklus ab 1.0.16

- Nicht installiert: kein Microgrid-Konfigurationsreiter, keine Einrichtung/API, keine neuen Regel- oder Archivdienste. Die Katalogkarte bleibt zum Installieren vorhanden.
- Installiert, inaktiv: Einrichtung und vorhandene Daten sind zugänglich; Netzwerkregelung und laufende Zähleraufzeichnung bleiben aus. Aktivierung einer technischen Regelkonfiguration wird abgewiesen.
- Installiert, aktiv: Diagnosekommunikation beziehungsweise in Betrieb genommene Regelung und das optional freigegebene Archiv laufen. Der technische Diagnose-/Aktivmodus bleibt die separate Inbetriebnahmefreigabe innerhalb dieser App.
- Aktive oder verriegelte Schutzkonfiguration: Aus/Deinstallieren wird im UI sowie serverseitig bei Speichern und Backup-Import gesperrt. Die bestehende Anforderung einer geplanten physischen Stillsetzung und erneuten Inbetriebnahme bleibt bestehen; diese Version führt keine automatisierte Stillsetzung ein.
- Extern manipulierte Flags oder Lizenzverlust heben bestehende Grenzen nicht auf: Slaves bleiben im geprüften Rückfall, neue Kommunikation/Archivzyklen bleiben gesperrt und eine kritische Störung wird gemeldet.
- Beim Upgrade werden tatsächlich bereits eingerichtete 1.0.14/15-Verbünde einmalig in der App-Verwaltung als installiert/aktiv geführt. Paarungen, technische Grenzwerte, Zählerdateien und Betriebsmodus bleiben erhalten. Eine unkonfigurierte Anlage bleibt nicht installiert.
- Bestehende neutrale Bridge-Zuordnungen bleiben im EMS-Reiter erreichbar, solange kein Master/Slave-Koordinator eingerichtet ist. Sie werden beim Speichern anderer Reiter nicht geleert; ein eingerichteter Koordinator sperrt den alten konkurrierenden Regelpfad weiterhin.
