# NexoWatt EOS 1.0.6

Diese offizielle Stable-Version korrigiert den AC/DC-Ladepunktvertrag im UI-/EMS-Adapter.

## Grenzwerte je Ladepunkt

- Im AppCenter unter Ladepunkte → Erweitert sind Min. und Max. Strom (A) oder Min. und Max. Leistung (W) einzutragen. Mindestwerte müssen positiv sein; Maximalwerte dürfen nicht kleiner sein.
- Bei DC mit Leistungssollwert sind Min. und Max. Leistung in W verpflichtend. Beispiel: 4.200 W Mindestleistung und 20.000 W Maximum, **nur wenn diese Werte zum konkreten Gerät passen**.
- Bei AC können Strom- und Leistungsgrenzen ineinander umgerechnet werden. Wenn beide vorliegen, gelten die strengeren kombinierten Grenzen. Die bestehenden technischen AC-Mindestwerte und Phasenfreigaben bleiben wirksam.
- Bei DC-Stromsteuerung sind Min./Max. Strom sowie der Bezug des Strom-Datenpunkts verpflichtend: AC-Netzeingang oder DC-Ladeausgang. DC-Ladeausgang benötigt einen plausiblen, höchstens zehn Sekunden alten Spannungsmesswert in V, auch vor einer positiven Startvorgabe. Ohne diese Information erfolgt keine Stromfreigabe. Ein Watt-Sollwert bleibt bei Auto die bevorzugte DC-Schnittstelle.
- Unvollständige bestehende Ladepunkte starten nach dem Update nicht automatisch mit erfundenen Grenzen. Sie bleiben bei 0 und melden `electricalLimitsValid=false` sowie eine Erklärung in `electricalLimitsError`.
- Mindestwerte werden auf die nächste ausführbare Gerätestufe angehoben; Maximalwerte und Budgets werden abgerundet. Passt keine positive Stufe zwischen alle wirksamen Grenzen, wird 0 geschrieben.

## Regelung und Zuordnung

Min+PV hält die konfigurierte technische Mindestleistung auch ohne PV, soweit Netz-, Stations- und weitere harte Grenzen dies zulassen. PV-Zusatzleistung bleibt dem zentralen Budget untergeordnet. Für Netzphasenbegrenzungen zählt der konfigurierte AC-Netzanschluss der DC-Station; die DC-Ausgangsspannung wird ausschließlich für den DC-Ladestrom verwendet. Umrechnende ioBroker-Aliase erhalten Sollwerte in der Einheit des Aliasobjekts.

## Prüfung und Inbetriebnahme

Der neue Regressionstest `npm run test:stable-1.0.6-dc` prüft die Konfigurationskette, Null-PV-Min+PV, Grenzen, AC-Vergleich, DC-Strombezüge, Spannungsfrische, finale Phasengrenzen und ausgehende Aliaswerte. Er ist Teil von `test:all`.

Gemäß den Repository-Richtlinien ist vor Aktivierung eine projektbezogene Inbetriebnahme im Diagnosemodus erforderlich: echte Register/Aliase, Strombezug, Gerätemindestleistung, Geräte-Maximum, Start/Stop und reale Reaktion auf Sollwertsenkungen prüfen. Eine erfolgreiche Übergabe an einen ioBroker-Datenpunkt ersetzt keine Rückmeldung der Station. Der Geräteadapter und die Herstellerregister sind nicht Teil dieses UI-Repositorys; ein Live-Hardwaretest wurde bei dieser Bearbeitung nicht ausgeführt.

### Ergebnisse dieser Bearbeitung

- `npm run build:ts`, `npm run test:all`, `npm run publish:check` und `npm pack --dry-run --json --ignore-scripts`: erfolgreich.
- Paket-Startprüfung: 189 JS/MJS-Dateien syntaktisch geprüft; relative Abhängigkeiten und Adapter-/EMS-Startkette vollständig.
- Chromium: Pflichtgrenzen, Speichersperre, Übernahme von AC/DC-Min-/Max-Leistung sowie DC-Strombezug und Spannungszuordnung geprüft. Bestehende Ladepunktdiagnose, OCPP-Zuordnung und Stationsanzeige ebenfalls erfolgreich.
- Zwei zusätzliche historische Betriebsstrategie-Browsertests (RC53/RC54, außerhalb von `test:all`) erreichen in dieser Umgebung ihr Render-Ziel nicht. Derselbe Timeout wurde mit der unveränderten gelieferten Version 1.0.5 reproduziert. Diese Tests werden daher ausdrücklich nicht als bestanden gewertet.
- Ein Test an der realen Projekt-Ladestation steht aus.
