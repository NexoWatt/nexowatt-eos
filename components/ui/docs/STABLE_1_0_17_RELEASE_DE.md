# NexoWatt EOS 1.0.17

Dies ist die offizielle Stable-Version 1.0.17 vom 23.09.2026.

Die Freigabe der Nulleinspeisung unter **EMS Apps → Netzlimits** aktiviert die gemeinsame PV-Strategie. Bei abgeregelten Wechselrichtern reicht der gemessene Netzexport als Startsignal nicht aus. EOS kann deshalb eine einzelne, begrenzte Prüflast freigeben und anhand aktueller PV-, NVP- und Batteriemessungen kontrollieren, ob zusätzliche Solarleistung verfügbar wird.

Ladepunkte, Heizstäbe und direkt regelbare Speicher teilen denselben Koordinator. Unbestätigte Prüfleistung bleibt vom nachgewiesenen PV-Budget getrennt und belegt das zentrale Gesamtbudget. Es gibt keine unabhängigen Anlaufversuche mehrerer Verbraucher gleichzeitig. Die reguläre PV-Verteilung übernimmt erst die tatsächlich durch Messwerte belegte Leistung.

AC-Ladepunkte behalten ihre technischen Mindestströme und den vorhandenen sicheren Ablauf zur Phasenumschaltung, sofern die Wallbox diese unterstützt und passend konfiguriert ist. DC-Ladepunkte verwenden ihre eigenen Strom-/Leistungsgrenzen. Heizstäbe bleiben durch Temperatur, Stufenauflösung und Betriebsfreigaben begrenzt. Speicher erhalten nur mit aktueller Batterie-Istleistung, bekanntem SoC, zulässiger Ladezone und präzisem Leistungssteller einen Anlaufversuch. Herstellerseitige Reglerhoheit sowie reine Freigabe-/Limitsteuerungen werden dadurch nicht zu direkt regelbaren Lasten.

Fehlende oder veraltete Messwerte, ausbleibende Verbraucher-/PV-Reaktion und abgelaufene Freigaben beenden den Test. Ein Wiederholschutz verhindert dauernde neue Versuche. Anschluss-, Phasen-, Geräte-, Tarif- und Schutzgrenzen bleiben maßgeblich; bestehende Hardwarewriter behalten ihre abschließenden Sicherheitsprüfungen. Ein Anlauf kann kurzzeitig Netzenergie benötigen. Eine strikt ausgeschlossene Fremdenergieaufnahme ist ohne verlässlichen Nachweis freier PV-Leistung kein zulässiger Blindstart.

Die zusätzlichen Regressionen prüfen zentrale Koordination, Ladepunkte, Heizstab, Speicher und AppCenter. Automatisierte Softwaretests ersetzen keine Inbetriebnahme an der konkreten Anlage. Kommunikationsverzögerungen, Messwertvorzeichen, Wechselrichterreaktion, Wallbox-Mindestleistung/Phasenwechsel, Speicher-Reglerhoheit und der unabhängige Geräteschutz müssen vor aktiver Nutzung mit den installierten Geräten geprüft werden. Es werden keine Hardwaretests oder garantierte Transientenfreiheit behauptet.

Deutsche Quellcode-Erklärungen und Verknüpfungshinweise bleiben verbindlich. Die Dokumentation beschreibt insbesondere, welche Messwerte als Beleg gelten, welche Leistung nur befristet angefordert wird und welche Komponente den endgültigen Sollwert schreibt.

Die schnelle npm-Veröffentlichung bleibt erhalten: `npm publish` prüft fertig erzeugte Artefakte. Produktdateien und Freigabeprüfsummen werden dabei weder neu gebaut noch automatisch neu versiegelt. Echte Secret-Funde sowie veränderte aktuelle Artefakte blockieren weiterhin.

[Strategie und Inbetriebnahme](NULL_EINSPEISUNG_PV_STRATEGIE_DE.md) · [Quellcode-Wegweiser](QUELLCODE_WEGWEISER_DE.md)
