# NexoWatt UI 0.8.155 RC31 – §14a-Härtung

## Ziel

RC31 verbindet die bereits vorhandene zentrale §14a-Regelung zuverlässig mit den NexoWatt-Fachmodulen. Eine zweite manuelle Zuordnung derselben Anlage im §14a-Reiter ist nicht erforderlich.

## Automatische Teilnehmer

Bei aktivierter §14a-App werden folgende steuerbaren Verbraucher automatisch berücksichtigt:

- alle in der Ladepunktverwaltung zugeordneten Ladepunkte mit beschreibbarem Strom- oder Leistungssollwert;
- aktive Wärmepumpen und Klimageräte mit beschreibbarem Aktor, die über Thermik und Energiefluss-Slot angebunden sind;
- aktive Heizstäbe mit beschreibbaren Stufen beziehungsweise Schaltaktoren und passendem Energiefluss-Slot;
- die autoritative Einzel- oder Farmspeichertopologie, sofern **Netzladen erlauben** aktiviert und mindestens ein geeigneter Schreibpfad vorhanden ist.

Der Bereich **Zusätzliche / manuelle Verbraucher** ist nur noch für Geräte bestimmt, die keinem NexoWatt-Fachmodul zugeordnet sind. Alte Schnellsetup-Zeilen werden anhand ihrer Aktor-Datenpunkte dedupliziert, damit ein Upgrade keine doppelte SteuVE erzeugt.

## Speicher: „Netzladen erlauben“

Der Schalter ist in Einzel- und Farmregelung vorhanden und erhält bei bestehenden Installationen standardmäßig den bisherigen Zustand `aktiv`.

- Haken gesetzt: Tarif-, Reserve- und andere Netzladeanforderungen dürfen grundsätzlich arbeiten. Bei aktivem §14a-Signal wird nur diese Netzladung begrenzt.
- Haken entfernt: Der Speicher lädt nicht aus dem Netz. PV-/Eigenverbrauchsladen bleibt möglich.
- Entladen bleibt in beiden Fällen möglich und wird nicht durch den Netzlade-Schalter blockiert.
- Bei E3/DC muss zusätzlich die herstellerspezifische GRID_CHARGE-Unterfreigabe gesetzt sein.

Der finale Speicher-Schreibpfad enthält zusätzlich eine Schutzsperre, damit ein als Netzladung klassifizierter Sollwert bei deaktiviertem Haken auf 0 W zurückgenommen wird. PV-/NVP-Eigenverbrauchspfade bleiben davon getrennt.

## §14a-Berechnung

- Mindestbasis: mindestens 4.200 W.
- Die 40-%-Sonderberechnung wird ausschließlich auf große Wärme-/Klimagruppen angewendet.
- Speicher werden als unabhängige Einheiten gerechnet, außer sie besitzen dieselbe ausdrücklich konfigurierte `para14aGroupId` beziehungsweise `storageConstructId`.
- Ein externer EMS-Gesamtsollwert kann die Mindestleistung nach unten begrenzen oder zusätzliche Leistung nach Priorität bis zur bekannten Anschlussleistung verteilen.
- Bei unbekannter Anschlussleistung wird kein ungesichertes Zusatzbudget vergeben.

## Priorität und manuelle Betriebsarten

Eine aktive §14a-Grenze hat Vorrang vor Boost, manuell gehaltenen Sollwerten und externen Anforderungen. Thermik und Heizstab speichern den ursprünglichen Wunsch, führen während der Begrenzung nur den zulässigen Wert aus und stellen den Wunsch nach Freigabe wieder her.

RC31 enthält keine neue zentrale, zeitverzögerte Freigaberampe. Die Rückkehr erfolgt über die vorhandenen Fachregler und die Wiederherstellung gehaltener Anforderungen. Eine gemeinsame Freigaberampe sollte separat entworfen und an einer Testanlage geprüft werden, bevor sie in laufende Anlagen übernommen wird.

## PV-Wechselrichter 60/30/0

Die 60/30/0-Erzeugerregelung bleibt fachlich und technisch getrennt. Sie gehört zur Leistungsbegrenzung der PV-/Wechselrichterseite und wird nicht als §14a-Verbraucher behandelt. Bestehende Wechselrichterzuordnungen und Erzeugerpfade wurden in RC31 nicht verändert.

## Diagnose

Für Prüfung und Fehlersuche sind insbesondere relevant:

- `para14a.active`
- `para14a.totalCapW`
- `para14a.storageChargeCapW`
- `para14a.thermalCapW`
- `para14a.heatingRodCapW`
- `para14a.automaticConsumerCount`
- `para14a.manualConsumerCount`
- `para14a.automaticConsumersJson`
- `speicher.regelung.netzLadenKonfiguriert`
- `speicher.regelung.netzLadenErlaubt`

## Empfohlener Feldtest

1. RC31 zunächst auf einer ausgewählten Testanlage installieren.
2. Prüfen, ob die Anzahl automatischer Teilnehmer zur realen Anlage passt.
3. §14a-Aktivsignal setzen und Ladepunkte, Netzladung, Wärmepumpe/Klima und Heizstab einzeln testen.
4. Sicherstellen, dass PV-Laden und Speicherentladung bei aktiver Begrenzung weiter möglich bleiben.
5. Boost und manuelle Sollwerte während der Begrenzung prüfen und anschließend die Wiederherstellung nach Freigabe beobachten.
6. Erst nach erfolgreichem Test gestaffelt auf weitere Bestandsanlagen ausrollen.

## EEBUS-Abgrenzung

Der separate NexoWatt-EEBUS-Adapter ist nicht in diesem ZIP enthalten. IF_CLS_CTRL, LPC, Heartbeat, Failsafe und Quittierung wurden deshalb in RC31 nicht geändert und nicht Ende-zu-Ende verifiziert. Dieses Paket härtet den Datenpunkt-/Constraint-Fachkern der NexoWatt UI.
