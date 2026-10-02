# NexoWatt UI 0.8.188 RC63 – EVCS-Verfügbarkeit und Speicher-Netzlade-Gate

RC63 ist ein gezieltes Stabilitätsrelease für zwei im Feld reproduzierte Fehlerpfade. Es führt keine neue Regelungsart ein.

## Ladepunkte: Leistung und Stationszugang getrennt

Normale 0-W-Anforderungen steuern nur die Ladeleistung. Sie setzen eine OCPP21-Wallbox nicht mehr auf `Inoperative`.

Die Station bleibt `Operative` bei:

- Ladeende oder vollem Fahrzeug,
- gezogenem Stecker,
- fehlendem PV-Überschuss,
- Tarifpause,
- §14a-, Netz-, Stations- oder Safety-Begrenzung,
- ausgeschalteter EOS-Regelung bei weiterhin freigegebener Station.

Eine Stationssperre ist ausschließlich zulässig bei:

- ausdrücklichem Kundenschalter „Ladestation Aus“,
- aktiver RFID-Whitelist mit nicht autorisiertem Benutzer.

Eine durch ältere Versionen auf `Inoperative` gesetzte OCPP21-Station wird bei Kundenfreigabe und ohne RFID-Sperre wieder auf `Operative` angefordert.

Neue Diagnosewerte unter `chargingManagement.wallboxes.<Ladepunkt>`:

- `rfidAuthorized`
- `rfidEnforced`
- `rfidLockActive`
- `rfidReason`
- `availabilityOwner`
- `availabilityRequested`
- `availabilityRequestReason`

## RFID-Zuständigkeit

Die RFID-Logik verwendet in dieser Reihenfolge:

1. einen dedizierten Lock-Datenpunkt,
2. den Stationsfreigabe-/Availability-Datenpunkt,
3. nur als Legacy-Fallback den bisherigen Active-Datenpunkt.

Damit bleibt die Ladeleistungsregelung im Lademanagement, während die RFID-Whitelist die Zugangssperre besitzt.

## Speicher: Netzladen nur bei vollständiger Freigabekette

Speicher-Netzladen ist nur erlaubt, wenn gleichzeitig gilt:

- „Netzladen erlauben“ ist im AppCenter aktiv,
- dynamischer Tarif ist aktiv,
- der aktuelle Tarifpreis ist frisch,
- Tarifzustand ist ausdrücklich `guenstig`,
- zeitvariables Netzentgelt ist aktiv,
- das manuell konfigurierte NT-Fenster des aktuellen Modells/Quartals ist gerade aktiv,
- die Tarifpriorität gibt den Speicher frei,
- ein beschreibbarer Speicher- oder Farm-Ausgang ist aktiv.

NT allein, ein günstiger Preis außerhalb des NT-Fensters oder ein Negativpreis außerhalb des NT-Fensters reichen nicht aus.

Im einfachen HT/NT-Modell sowie im Quartalsmodell werden ausschließlich die manuell gepflegten Zeiten verwendet. Fehlende Start- oder Endzeiten führen in beiden Modellen fail-closed zu keiner Speicher-Netzladung.

PV-/NVP-basiertes Speicherladen bleibt von diesem Gate unberührt.

Neue Tarifdiagnose:

- `tarif.speicherNetzLadenErlaubt`
- `tarif.speicherNetzLadenSperrgrund`
- `tarif.speicherPreisGuensig`
- `tarif.speicherZeitfensterAktiv`
- `tarif.speicherZeitfensterLabel`

Neue Speicherdiagnose:

- `speicher.regelung.netzLadenErlaubt`
- `speicher.regelung.netzLadenSperrgrund`

Eine letzte Firewall unmittelbar vor dem Speicher-Writer blockiert auch Reserve-, Tarif- und Refill-Netzladequellen, falls die vollständige Freigabekette nicht vorliegt. PV-Ladequellen werden nicht blockiert.

## Feldtest

1. OCPP21-Station auf „An“, RFID aus: Ladeende und Steckerziehen dürfen nur `chargeLimit=0` auslösen; `availability` bleibt `true`.
2. Station ausdrücklich auf „Aus“: `availability=false` muss geschrieben werden.
3. RFID aktiv, unbekannter Tag: Station wird gesperrt. Whitelist-Tag: Station wird wieder freigegeben.
4. Speicher: Tarif günstig + aktuelles manuelles NT-Fenster + AppCenter-Freigabe muss Netzladen erlauben.
5. Tarif günstig außerhalb NT, Tarif neutral in NT, veralteter Preis sowie fehlende HT/NT- oder Quartalszeiten müssen Netzladen sperren.
6. Reales PV-Überschussladen des Speichers muss weiterhin funktionieren.
7. Speicherfarm und Einzelspeicher jeweils mit Neustart und Rückmeldung prüfen.
