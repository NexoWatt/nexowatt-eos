# Regression-Testplan für die TypeScript-Migration

Dieser Plan beschreibt, welche fachlichen Fälle bei jeder späteren TypeScript-Migration
geprüft werden müssen. Die Liste ist bewusst deutsch und fachlich formuliert, damit sie
auch ohne TypeScript-Vorkenntnisse verständlich bleibt.

## Speicher / Batterie

- Split-DPs: `Laden` und `Entladen` separat gemappt.
- Signed-DP: ein Speicherleistungs-DP mit Vorzeichen.
- 0 W ist ein gültiger Wert und darf nicht als fehlend/stale behandelt werden.
- Rechenfallback nur dann, wenn wirklich kein Speicher-DP konfiguriert ist.
- History darf keine rechnerischen Ersatzwerte schreiben, wenn echte DPs vorhanden sind.

## Netz

- Signed Netzanschlusspunkt muss korrekt in Bezug/Einspeisung getrennt werden.
- Separate Import-/Export-DPs bleiben gültig.
- Gleichzeitige falsche Doppelzählung muss verhindert werden.

## Heizstab

- Speicherreserve darf nach Speichern nicht zurückspringen.
- PV-Budget muss dieselbe Speicher-/Netzlogik verwenden wie LIVE und History.
- Netzbezug erlaubt/verboten muss unverändert wirken.

## Feature-Sichtbarkeit

- Keine Wallbox → keine EVCS-Kacheln, keine EVCS-History, kein EVCS-Menü.
- Keine Speicherfarm → keine Farm-Navigation und keine Farm-Ansicht.
- SmartHome nur sichtbar, wenn aktiviert.

## Lizenz

- Maskierte Werte wie `********` dürfen nie als echter Lizenzschlüssel gespeichert werden.
- Lizenzprüfung darf durch Admin-Maskierung nicht kaputtgehen.

## info.connection

- `true`, wenn Webserver/SSE sauber laufen.
- `false` bei Unload, Serverfehler oder Startfehler vor Webserverstart.
- Teilfehler nach Webserverstart dürfen Verbindung nicht fälschlich offline setzen.


## 0.7.61 – Energiefluss-Regressionsmatrix

Die Datei `src-ts/tests/energy-flow-regression-matrix.ts` legt die fachlichen Pflichtfälle für Speicher und Netz fest.

Diese Fälle müssen vor der produktiven Migration des Energiefluss-Resolvers grün bleiben:

1. Split-Speicher-DPs mit 0 W bleiben gültig.
2. Signed Speicher-DP mit positiver Entladung wird korrekt aufgeteilt.
3. Signed Speicher-DP mit negativer Ladeleistung wird korrekt aufgeteilt.
4. Bilanz-Fallback wird nur ohne echte Speicher-DPs genutzt.
5. Split-DPs schlagen Bilanz-Fallback.
6. Signed DP schlägt Bilanz-Fallback.
7. Signed Netz-DP wird korrekt in Bezug/Einspeisung aufgeteilt.
8. Split-Netz-DPs behalten 0 W als gültigen Messwert.
