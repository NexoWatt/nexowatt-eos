# RC86 – Gate A: Hard-Limit, progressive Soft-Zone und demand-basiertes Binding

## Verbindlicher NVP-Vertrag

- Netzbezug am NVP ist positiv.
- Netzeinspeisung am NVP ist negativ.
- Die zugeordnete Netzanschlussleistung ist ausschließlich die maximale Bezugsleistung am NVP.
- Das Soft-Limit liegt automatisch bei 90 % und beeinflusst nur die Geschwindigkeit positiver Leistungsänderungen.

Die absolute EVCS-Freigabe basiert auf:

```text
Hard-Headroom = Hard-Limit − signierter NVP − Offline-Reserve − bestätigte ausstehende Erhöhungen
EVCS-Gesamtziel = aktuelle EVCS-Istleistung + progressiv freigegebener Headroom
```

Unterhalb der Soft-Schwelle beträgt der Rampenfaktor 100 %. Innerhalb der Soft-Zone fällt er linear gegen 0 %. Bei Überschreitung des Hard-Limits wird der negative Headroom zur unmittelbaren Reduktion laufender flexibler Last genutzt.

## Keine Doppelzählung lokaler Quellen

PV-Erzeugung und Speicherentladung sind bereits im signierten NVP enthalten. Sie werden nicht nochmals pauschal addiert. Nur eine bestätigte Leistungsänderung, die am trägeren NVP noch nicht sichtbar ist, darf einmalig als Feed-forward berücksichtigt werden.

## Binding

Ein konfiguriertes oder endliches Netz-Gate ist noch keine aktive Begrenzung. `gridCapBinding` wird nur gesetzt, wenn:

1. eine reale EVCS-Anforderung vorhanden ist,
2. das Netz-Gate diese Anforderung reduziert,
3. die finale Verteilung den Netz-Gate-Rand tatsächlich erreicht,
4. nicht bereits ein strengeres Phasen- oder §14a-Gate dieselbe Reduktion verursacht.

Bei 0 W Anforderung gilt:

```text
Netzschutz: überwacht
Binding: NEIN
Reduktion: 0 W
Safety-Stufe: NORMAL
```

## Offline-Isolation

- Offline ohne Fahrzeug und mit bestätigten 0 W: Reserve 0 W.
- Offline während aktiver Ladung: letzte plausible Istleistung reservieren.
- Fahrzeug verbunden, Leistung unbekannt: konservative technische Mindestleistung reservieren.

Die übrigen Ladepunkte arbeiten mit dem verbleibenden sicheren NVP-Budget weiter.
