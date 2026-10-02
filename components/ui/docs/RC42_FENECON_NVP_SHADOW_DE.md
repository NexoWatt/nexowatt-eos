# RC42 – FENECON NVP-Shadow (0.8.166)

## Ziel

RC42 ergänzt eine **vollständig schreibfreie Vergleichsdiagnose** für eine künftig vereinfachte FENECON-/FEMS-Regelung. Die in RC41 produktiv arbeitende FENECON-, Speicher-, Lade-, §14a- und Netzanschlusslogik bleibt unverändert.

Der Shadow berechnet parallel, welche FEMS-Netzpunktvorgabe sich aus dem aktuellen Anlagenzustand ergeben würde. Er schreibt weder `ctrlBalancing*/SetGridActivePower` noch einen direkten ESS-Sollwert und kann die bestehende FEMS-/EOS-Reglerhoheit nicht verändern.

## Minimale Messbasis

Die physikalische Restlast ohne Speicher wird ausschließlich aus zwei frischen Messwerten bestimmt:

```text
Restlast ohne Speicher = NVP-Istleistung + tatsächliche AC-ESS-Leistung
```

Vorzeichen in NexoWatt:

```text
NVP +W = Netzbezug
NVP -W = Einspeisung
ESS +W = Entladen
ESS -W = Laden
```

Der aktuelle finale EOS-Batteriesollwert wird für den Vergleich in ein äquivalentes FEMS-Netzziel übersetzt:

```text
FEMS-Netzziel = Restlast ohne Speicher - EOS-Batteriesollwert
```

## 0-Einspeise-Vorschlag

Für den Shadow gilt standardmäßig ein kleiner positiver Netzbezug von **+80 W**. Das verhindert ein unnötiges Pendeln um exakt 0 W.

```text
Batteriesollwert für 0-Einspeisung
= Restlast ohne Speicher - 80 W
```

Optionale aktuelle ESS-Min-/Max-Grenzen werden berücksichtigt. Kann die Batterie das Ziel nicht allein erreichen, zeigt die Diagnose getrennt:

- verbleibende zusätzliche Senke beziehungsweise notwendige PV-Abregelung;
- verbleibendes Importreduktionspotenzial;
- erwarteten NVP nach Anwendung der Batteriegrenzen;
- ob das 0-Einspeise-Ziel rechnerisch erreichbar ist.

## Neue Device-Aliase

Der `nexowatt-devices`-Adapter kann für FENECON bevorzugt folgende read-only Aliase bereitstellen:

```text
aliases.r.nvpPower
aliases.r.consumptionTotal
```

Unterstützte Fallbacks:

```text
NVP:           aliases.r.gridPower, aliases.r.napPower
Gesamtverbrauch: aliases.r.loadTotal,
                 aliases.r.consumptionPower,
                 aliases.r.loadPower
```

Bedeutung:

- `aliases.r.nvpPower`: signierte Wirkleistung am Netzanschlusspunkt, **+W Bezug / -W Einspeisung**;
- `aliases.r.consumptionTotal`: direkt gemessener Gesamt-/Hausverbrauch in W, positiv.

Der FENECON-NVP-Wert ersetzt **nicht** den zentralen Safety-NVP-Datenpunkt. Beide Werte werden unabhängig verglichen. Eine deutliche Abweichung oder ein fehlender zentraler Safety-NVP verhindert die spätere Feldtest-Bereitschaft.

Der Gesamtverbrauch wird ausschließlich zur Plausibilisierung zusammen mit der gesamten PV-Erzeugung verwendet. Er darf nicht aus NVP, PV und Speicherleistung zurückgerechnet sein, weil sonst eine zirkuläre Prüfung entstehen würde.

## Diagnose-States

Die wichtigsten States befinden sich unter:

```text
nexowatt-ui.<Instanz>.speicher.regelung.feneconNvpShadow*
```

Besonders relevant:

```text
feneconNvpShadowAktiv
feneconNvpShadowReadOnly
feneconNvpShadowSchreibversuch
feneconNvpShadowGueltig
feneconNvpShadowBereit
feneconNvpShadowGrund
feneconNvpShadowNvpW
feneconNvpShadowZentralNvpW
feneconNvpShadowNvpAbweichungW
feneconNvpShadowEssIstW
feneconNvpShadowRestlastOhneSpeicherW
feneconNvpShadowBatterieSollW
feneconNvpShadowEosUebersetzungW
feneconNvpShadowFemsSollW
feneconNvpShadowNullEinspeisungZielW
feneconNvpShadowNullEinspeisungBatterieSollW
feneconNvpShadowNullEinspeisungErwarteterNvpW
feneconNvpShadowNullEinspeisungErreichbar
feneconNvpShadowZusatzsenkeW
feneconNvpShadowImportReduktionW
feneconNvpShadowPlausibel
feneconNvpShadowJson
```

`feneconNvpShadowSchreibversuch` bleibt in RC42 immer `false`. Der vollständige Datensatz wird im JSON-State protokolliert, ohne Warn-Log-Spam zu erzeugen.

## Gültigkeits- und Sicherheitsvertrag

Der Shadow ist nur für einen **einzelnen exklusiven FENECON-DC-/Hybridspeicher** aktiv. Er wird nicht als zweite Regelinstanz in einer gemischten Speicherfarm verwendet.

Eine spätere Feldtest-Bereitschaft wird nur angezeigt, wenn mindestens gilt:

- frischer FENECON-/NVP-Wert;
- frische tatsächliche AC-ESS-Leistung;
- gültiger finaler EOS-Batteriesollwert;
- echter nativer FEMS-NVP-Zieldatenpunkt gemappt;
- zentraler Safety-NVP frisch;
- FENECON-NVP und zentraler NVP widersprechen sich nicht deutlich;
- vorhandene Last-/PV-Plausibilisierung ist schlüssig;
- erforderliche Batterie-Leistung liegt innerhalb der aktuellen Grenzen.

Fehlende optionale Last-/PV-Werte blockieren die reine Berechnung aus NVP und ESS-Ist nicht. Sie reduzieren nur die verfügbare Plausibilitätsinformation.

## Unveränderte Produktlogik

RC42 verändert nicht:

- die produktive FENECON-Umschaltung zwischen FEMS und EOS;
- direkte ESS- oder FEMS-Hardware-Writer;
- Netzanschluss- und Phasengrenzen;
- §14a-/EEBUS-Begrenzungen;
- EVCS- und Lademanagement;
- Speicherfarm-One-Writer;
- Heizstab- und Thermikregelung;
- SafetyEnvelope und finale Hardware-Write-Firewall.

Erst nach einem vollständigen Feldvergleich wird entschieden, ob die vereinfachte FEMS-NVP-Regelung in einer späteren Version als ausdrücklich aktivierbarer Feldtest eingeführt wird.
