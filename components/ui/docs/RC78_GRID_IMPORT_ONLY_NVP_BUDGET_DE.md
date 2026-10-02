# RC78 – Netzanschlussgrenze ausschließlich für Netzbezug

## Fehlerbild

Bei einem negativen NVP-Wert (Netzeinspeisung) wurde die Einspeisung im zentralen EMS-Budget nicht als lokal verfügbare Deckung berücksichtigt. Zusätzlich wurde das wirksame Gesamtbudget auf die konfigurierte Netzanschlussleistung gedeckelt. Dadurch zeigte die Diagnose bei 30,0 kW Bezugsgrenze, 10,1 kW Einspeisung, 11,0 kW EVCS-Reservierung und rund 9,3 kW Speicherziel nur etwa 9,7 kW Restbudget an.

Die konfigurierte Netzanschlussgrenze ist in diesem Betriebsfall jedoch ausschließlich eine **Bezugsgrenze**. Sie begrenzt keinen Export und darf deshalb eine vorhandene Einspeisung nicht vom Lastbudget abziehen.

## Einheitlicher Vorzeichenvertrag

Der NVP bleibt in allen sicherheitsrelevanten Pfaden signiert:

- Netzbezug: positiver NVP-Wert
- Netzeinspeisung: negativer NVP-Wert

Die noch zulässige Laständerung ergibt sich aus:

```text
Inkrement-Headroom = Bezugsgrenze − signierter NVP
```

Das zentrale Budget ist ein Gesamtziel für EMS-gesteuerte Verbraucher. Bereits real laufende, geregelte Lasten werden deshalb wieder addiert:

```text
Gesamtzielbudget = aktuelle geregelte Istlast + Bezugsgrenze − signierter NVP
```

Reservierungen und Sollwerte werden nicht als Istleistung zurückaddiert. Sie werden erst anschließend in der zentralen Budgetlaufzeit abgezogen.

## Feldfall

```text
Bezugsgrenze                       30,0 kW
NVP / Einspeisung                 −10,1 kW
Aktuelle geregelte Istlast          0,0 kW
------------------------------------------------
Zulässiges Gesamtzielbudget        40,1 kW
EVCS-Reservierung                 −11,0 kW
Speicher-Reservierung              −9,3 kW
------------------------------------------------
Korrektes Restbudget               19,8 kW
```

## Umgesetzte Pfade

### Zentrales EMS-Budget

`core-limits` verwendet den signierten NVP und addiert ausschließlich frische, tatsächlich laufende EOS-gesteuerte Lasten zurück:

- EVCS-Istleistung
- thermische Istleistung
- Heizstab-Istleistung
- Speicherladeleistung nur bei aktivem EOS-Speicherwriter

Eine fremd gesteuerte Speicherladung wird nicht als EOS-Istlast zurückaddiert.

### EVCS-Netzcap

Das direkte EVCS-Gate berechnet das zulässige EVCS-Gesamtziel aus frischer EVCS-Istleistung plus dem signierten Inkrement-Headroom. Der frühere harte Deckel auf die Netzanschlussleistung ist entfernt. Stations-, Geräte-, Leitungs-, Phasen-, §14a- und Safety-Grenzen bleiben unverändert übergeordnet.

### Finale Safety-Prüfung

Unmittelbar vor jedem Hardware-Write wird der aktuelle signierte NVP erneut geprüft. Parallel geplante positive Laständerungen werden nur einmal aus dem gemeinsamen Headroom vergeben. Bei bereits überschrittener Bezugsgrenze entsteht ein negativer Inkrementwert, der laufende flexible Lasten aktiv reduziert.

Beispiel:

```text
Bezugsgrenze                       30,0 kW
Aktueller Netzbezug                32,0 kW
Laufende geregelte Istlast         10,0 kW
------------------------------------------------
Maximales neues Gesamtziel          8,0 kW
Erforderliche Reduktion             2,0 kW
```

## Diagnose

Die Diagnose veröffentlicht zusätzlich:

- signierten Inkrement-Headroom
- aktuelle geregelte Istlast
- wirksames Gesamtzielbudget
- EVCS-Istleistung für das Netz-Gate
- ignorierte EVCS-Reservierung
- EVCS-Cap „NVP / Importgrenze“

## Regressionen

Der RC78-Verbund prüft dynamisch:

- 30-kW-/−10,1-kW-Feldfall mit 40,1 kW Gesamtbudget
- 19,8 kW Restbudget nach EVCS- und Speicherreservierung
- normalen Import mit bereits laufender EVCS-Leistung
- aktive Reduktion bei Überbezug
- externe Speicherladung ohne EOS-Writer
- zentrale typisierte Budgetruntime
- EVCS-Netzcap
- parallele finale Hardware-Writer ohne doppelte Headroom-Nutzung
- Synchronität der kanonischen TypeScript-Quellen und produktiven JavaScript-Runtimes
