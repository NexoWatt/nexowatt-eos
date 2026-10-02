# RC83 – Speicher-Netzladen nur bei günstigem Tarif und Log-Spam-Fix

## Ziel

RC83 schließt zwei im Feld sichtbare Fehler:

1. Der Speicher konnte nach einem Tarifwechsel auf **neutral** weiterhin mit hoher Leistung laden und dadurch unnötigen Netzbezug erzeugen.
2. Der State `gridConstraints.exportLimit.sinkFieldProtocolJson` wurde im schnellen 0-Einspeise-Pfad zyklisch geschrieben, ohne dass zuvor das zugehörige ioBroker-Objekt angelegt worden war. Dadurch entstand alle wenigen Sekunden dieselbe Warnung.

## Verbindlicher Speichervertrag

Speicher-Netzladen ist nur zulässig, wenn alle folgenden Bedingungen gleichzeitig erfüllt sind:

- Netzladen ist in der Speicher-/Speicherfarm-Konfiguration freigegeben.
- Ein beschreibbarer Speicher-Ausgang besitzt die Regelhoheit.
- Der dynamische Tarif ist aktiv.
- Der aktuelle Preis ist frisch.
- Der Tarifzustand ist exakt `günstig`.
- Die Tarifpriorität gibt den Speicher frei.
- Bei aktiviertem variablem Netzentgelt ist zusätzlich das konfigurierte NT-/Quartalsfenster aktiv.

Damit gilt:

```text
Tarif günstig + Preis frisch + Netzentgelt aus
→ Speicher-Netzladen möglich

Tarif günstig + Preis frisch + variables Netzentgelt an + NT/Quartalsfenster aktiv
→ Speicher-Netzladen möglich

Tarif neutral / teuer / unbekannt / aus / Preis stale
→ Speicher-Netzladen sofort gesperrt
→ normale Eigenverbrauchsoptimierung übernimmt
```

## Physikalische PV-only-Sicherheitsgrenze

Außerhalb der vollständigen günstigen Tarif-Freigabe darf **jeder negative Speicher-Sollwert** nur so groß sein wie der nachweisbar lokal vorhandene PV-Überschuss. Das gilt auch dann, wenn der Sollwert aus einem Herstellerprofil, Hold-/Rampenpfad oder einem alten Eigenverbrauchsbefehl stammt.

Vorzeichenvertrag:

```text
NVP positiv  = Netzbezug
NVP negativ  = Netzeinspeisung
Batterie positiv = Entladung
Batterie negativ = Beladung
```

Die lokale Leistungsbilanz ohne Speicher lautet:

```text
NVP ohne Batterie = signierter NVP + Batterie-Istleistung
zulässige PV-Ladung = max(0, NVP-Ziel − NVP ohne Batterie)
```

Feldbeispiel aus dem Dashboard:

```text
NVP:                    +3,8 kW Netzbezug
Batterie-Ist:           −9,5 kW Ladung
NVP ohne Batterie:      −5,7 kW lokaler Überschuss
NVP-Ziel:               +0,1 kW Sicherheitsbezug
zulässige PV-Ladung:     5,8 kW
```

Ein alter Ladebefehl von `−9,5 kW` wird deshalb auf ungefähr `−5,8 kW` reduziert. Damit endet der durch den Speicher verursachte Netzbezug, während der echte PV-Überschuss weiterhin genutzt wird.

### Validierter PV-/Last-Feed-forward

Einige Hybridspeicher melden ihre Batterie-Istleistung verzögert oder kurzzeitig mit `0 W`. Damit eine eindeutig vorhandene PV-Überschussladung in diesem Moment nicht fälschlich gestoppt wird, darf zusätzlich ein bereits vom gemeinsamen NVP-Regler validierter PV-/Last-Feed-forward als Obergrenze dienen.

Dieser Feed-forward wird nur akzeptiert, wenn:

- PV- und Verbrauchsleistung direkt gemappt sind,
- PV, Last und NVP frisch sind,
- die Messzeitpunkte ausreichend nah beieinanderliegen,
- der gemeinsame NVP-Regler den Feed-forward tatsächlich als plausibel verwendet hat.

Ein beliebiger PV-Wert, ein Sollwert oder ein alter Snapshot kann diese Sicherheitsgrenze nicht öffnen. Fehlt ein gültiger NVP, wird die Ladefreigabe fail-closed auf `0 W` gesetzt.

## Defense in Depth vor dem Hardware-Write

RC83 prüft die wirtschaftliche Freigabe nicht nur im Tarifmodul, sondern erneut in der Speicherregelung und unmittelbar vor dem Hardware-Writer.

Ein einzelner persistierter Boolean-State kann keine Freigabe mehr erteilen. Der vollständige Tarif-Snapshot muss frisch und in sich konsistent sein. Sperren wirken sofort; nur eine neue Freigabe darf weiterhin über die vorhandene Stabilisierung verzögert werden.

Zusätzlich wird die Quelle eines negativen Speicher-Sollwerts nach Herstellerprofil und 0-W-Firewall erneut aufgelöst. Dadurch kann ein alter, gehaltener Tarif-, Reserve- oder Lastspitzen-Nachladebefehl nicht weiterlaufen, wenn der Tarif inzwischen neutral, teuer oder veraltet ist.

## Log-Spam-Fix

Beim Initialisieren des Grid-Constraints-Moduls wird jetzt vor dem ersten zyklischen Write folgender State angelegt:

```text
gridConstraints.exportLimit.sinkFieldProtocolJson
Typ: string
Rolle: json
Lesbar: ja
Schreibbar: nein
```

Nach einem vollständigen Adapterneustart dürfen keine neuen Meldungen dieser Form entstehen:

```text
State "nexowatt-ui.0.gridConstraints.exportLimit.sinkFieldProtocolJson" has no existing object
```

Bereits vorhandene Einträge bleiben in der alten ioBroker-Loghistorie sichtbar.
