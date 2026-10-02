# NexoWatt UI 0.8.190 RC65 – NT-, Tarif- und Zeit-Ziel-Absicherung

## Zweck

RC65 korrigiert die wirtschaftliche Freigabe für Speicher- und Fahrzeug-Netzladen im Zusammenspiel aus variablem Netzentgelt, dynamischem Stromtarif und Zeit-Ziel-Laden. Die Änderung ist bewusst eng begrenzt: Netz-, Stations-, Phasen-, §14a-, Parkregler-, Speicher- und Safety-Grenzen bleiben unverändert übergeordnet.

## Speicher-Netzladen

### Variables Netzentgelt aktiviert

Das manuell konfigurierte NT-/Quartalsfenster ist zwingend. Zusätzlich gilt:

- Ist der dynamische Tarif deaktiviert, darf das aktive NT-Fenster allein freigeben.
- Ist der dynamische Tarif aktiviert, müssen Preis und Tarifzustand frisch sein.
- `günstig` und `neutral` dürfen innerhalb NT freigeben.
- `teuer`, veraltet, fehlend oder unbekannt sperren auch innerhalb NT.
- Außerhalb des eingestellten NT-Fensters bleibt Speicher-Netzladen gesperrt.

### Variables Netzentgelt deaktiviert

Dann ist Speicher-Netzladen ausschließlich bei einem frischen, als `günstig` klassifizierten dynamischen Tarif möglich.

### Gemeinsame Pflichtbedingungen

Unabhängig vom wirtschaftlichen Pfad bleiben erforderlich:

- AppCenter-Freigabe für Speicher-Netzladen,
- Speicherpriorität,
- beschreibbarer Einzel- oder Farm-Writer,
- konfigurierte Netzladeleistung,
- gültige SoC-, Netz- und Safety-Grenzen.

PV-/NVP-basiertes Laden bleibt von dieser Netzladefreigabe getrennt.

## Fahrzeugladen und Zeit-Ziel-Override

Für Ladepunkte gilt dieselbe wirtschaftliche Sperre:

- Ein aktives NT-Fenster darf einen teuren, veralteten oder unbekannten aktiven Dynamiktarif nicht pauschal überstimmen.
- Ist der Dynamiktarif deaktiviert, darf NT normales Netzladen erlauben.
- Ein konfiguriertes Zeit-Ziel im Modus `Auto` darf die wirtschaftliche Sperre erst dann übersteuern, wenn der errechnete späteste Start erreicht beziehungsweise die Zielerreichung sonst gefährdet ist.
- Der Override hebt ausschließlich die Tarif-/Zeitfenstersperre auf. Hauptsicherung, Stationslimit, Phasenlimit, §14a, Parkregler, Geräteschutz und Safety bleiben vollständig wirksam.
- Expliziter PV-Modus bleibt ein ausdrücklicher Nutzerwunsch und wird nicht durch das Zeit-Ziel in Netzladen umgewandelt.

## Freigabematrix Speicher

| Variables Netzentgelt | NT-Fenster | Dynamischer Tarif | Preis frisch | Speicher-Netzladen |
|---|---|---|---:|---:|
| An | aktiv | aus | – | erlaubt |
| An | aktiv | günstig | ja | erlaubt |
| An | aktiv | neutral | ja | erlaubt |
| An | aktiv | teuer | ja | gesperrt |
| An | aktiv | beliebig | nein | gesperrt |
| An | nicht aktiv | günstig | ja | gesperrt |
| Aus | – | günstig | ja | erlaubt |
| Aus | – | neutral/teuer/unbekannt | ja | gesperrt |
| Aus | – | beliebig | nein | gesperrt |

## Diagnose

Die vorhandenen Diagnosewerte bleiben maßgeblich:

- `tarif.speicherNetzLadenErlaubt`
- `tarif.speicherNetzLadenSperrgrund`
- `tarif.speicherZeitfensterAktiv`
- `tarif.speicherZeitfensterLabel`
- `chargingManagement.control.gridChargeAllowed`
- `chargingManagement.wallboxes.<Ladepunkt>.goalTariffOverrideReason`
- `chargingManagement.wallboxes.<Ladepunkt>.goalStatus`

Typische Override-Gründe sind `latest_start`, `forecast_insufficient`, `legacy_urgency` oder `overdue`.

## Regressionen

RC65 prüft insbesondere:

- NT mit deaktiviertem Dynamiktarif,
- NT mit frischem günstigem und neutralem Tarif,
- NT mit teurem Tarif,
- NT mit veraltetem Preis,
- NT außerhalb des manuell eingestellten Zeitfensters,
- günstigen Dynamiktarif bei ausgeschaltetem variablem Netzentgelt,
- Fahrzeug-Zeit-Ziel bei teurem beziehungsweise veraltetem Tarif,
- Warten bei ausreichender Restzeit,
- Tarif-Override ab Latest-Start,
- Erhalt aller harten Anlagen- und Safety-Grenzen.
