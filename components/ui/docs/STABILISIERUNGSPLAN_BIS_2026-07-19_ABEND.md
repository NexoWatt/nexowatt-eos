# NexoWatt EMS – Stabilisierungsplan bis Sonntagabend, 19.07.2026

## Verbindliche Regeln

1. **Manuelle AppCenter-Zuordnung bleibt autoritativ.** Jeder beschreibbare Datenpunkt wird exakt über die vom Installer eingetragene ioBroker-Objekt-ID geführt. Hersteller-, Adapter- oder Pfadnamen dürfen keinen Schreibzugriff sperren.
2. **0 W ist ein fachlicher Zustand, kein Umschaltmechanismus.** `0 W` wird nur bei echtem Stoppen, Warten oder einer Sicherheits-/Freigabesperre geschrieben. Ein Wechsel von Laden zu Entladen oder von Entladen zu Laden wird direkt mit dem neuen Sollwert ausgeführt.
3. **Ein finaler Sollwert, ein Hardware-Schreiber.** Strategie-Apps dürfen Wünsche, Grenzen und Freigaben liefern. Nur der zentrale Resolver bildet den finalen Speicher-Sollwert; anschließend schreibt entweder der Einzel-Speicherpfad oder der Farm-Dispatcher.
4. **Safety-Gates bleiben nachgelagert verbindlich.** SoC-, Reserve-, §14a-, Netz-, Geräte-, Verfügbarkeits-, Authority- und Mapping-Gates dürfen den finalen Wunsch begrenzen oder stoppen. Ein Gate darf aber keine frei gewählte AppCenter-Objekt-ID wegen ihres Namens ablehnen.
5. **Status folgt dem tatsächlichen Ergebnis.** Dashboard, Tarifstatus und AppCenter-Diagnose dürfen nicht nur eine Strategieabsicht anzeigen. Sie müssen finalen Sollwert, Gate-Ergebnis, Hardware-Write und – sofern vorhanden – Readback unterscheiden.
6. **Keine weitere fachliche Änderung ohne vorherigen Vorschlag und Freigabe.** Jeder folgende Baustein wird mit betroffenen Dateien, Verhalten, Risiken, Tests und Rollback beschrieben, bevor Code geändert wird.

---

## Baustein 1 – Akuter Richtungswechsel-Fix

**Status: umgesetzt in 0.8.125 RC1**

### Umfang

- Einzel-Speicher und Speicherfarm wechseln direkt zwischen positiven und negativen Sollwerten.
- Die bisherige `zero-before-reverse`-Entscheidung ist entfernt.
- Die zeitbasierte Vorzeichensperre ist entfernt.
- Auch die allgemeine Sollwert-Rampe darf beim Vorzeichenwechsel weder `0 W` noch noch einmal die alte Richtung ausgeben.
- Für Signed-DPs wird unmittelbar der neue signed Sollwert geschrieben.
- Bei getrennten Lade-/Entlade-DPs wird im **selben Regelzyklus** die inaktive Richtung auf `0` und die aktive Richtung auf den neuen positiven Absolutwert gesetzt. Das ist keine separate 0-W-Regelrunde.
- E3/DC erhält den neuen Mode-/Value-Satz direkt; die Reihenfolge Mode vor Value bleibt erhalten.
- Die Farm verteilt den neuen Gesamt-Sollwert im selben Dispatcher-Aufruf auf alle verwendbaren Speicher.

### 0-W-Zustände, die bewusst erhalten bleiben

- App/Regelung bewusst gestoppt oder auf Warten gesetzt
- Tarif- oder MultiUse-Policy fordert ausdrücklich Pause
- SoC-Minimum/Maximum oder Notstromreserve erreicht
- Lade-/Entladefreigabe gesperrt
- §14a-, Netz-, Leistungs- oder Gerätegate begrenzt auf `0 W`
- NVP-/Messwert-Sicherheitsstopp nach abgelaufener Grace-Zeit
- bestätigtes verfügbares Lade-/Entladebudget `0 W`
- bewusstes Kleinsignal-Deadband als dokumentierter Wartezustand

### Zwingende Regressionen

- Feldfall: Batterie-Ist `-35 W`, NVP `+1092 W`, Ziel `+50 W` → unmittelbar `+1007 W`, niemals `0 W`
- Entladen → Laden mit Istfeedback → unmittelbar negativer Sollwert
- Laden → Entladen mit Istfeedback → unmittelbar positiver Sollwert
- Tarifwechsel von `+3000 W` Entladen auf `-4000 W` Netzladen → unmittelbar `-4000 W`, keine Rampe in alter Richtung
- Einzel-Speicher Signed + Split → neuer Zielwert im selben Tick
- Speicherfarm → negativer auf positiver Gesamt-Sollwert ohne 0-W-Dispatcher-Runde
- SoC-Stopps schreiben weiterhin ausdrücklich `0 W`

### Feldabnahme

- FENECON-DP muss beim Wechsel sofort das neue Vorzeichen erhalten.
- `storageFarm.lastDispatchJson.targetW` und `deliveredW` müssen im selben Zyklus das neue Vorzeichen zeigen.
- `speicher.regelung.zeroWriteFirewallAction` darf beim reinen Richtungswechsel keinen `write-stop` melden.
- Bei echtem Tarif-Warten oder Safety-Stop muss `0 W` dagegen weiterhin sichtbar und begründet sein.

---

## Baustein 2 – Steuerhoheit und App-Abhängigkeiten

**Status: umgesetzt in 0.8.126 RC2; Feldabnahme offen**

### Umgesetzte Steuerhoheit

- Pro Regelzyklus wird genau eine Topologie `farm`, `single` oder `none` ausgewählt.
- Eine aktive Farm übernimmt nur dann, wenn sie mindestens einen beschreibbaren Sollwert-DP besitzt.
- Eine read-only Farm blockiert die Einzel-Speicherregelung nicht.
- Ein Farmfehler führt nicht zu einem versteckten Wechsel auf den Einzelwriter.
- MultiUse liefert Policy/SoC-Zonen, aktiviert aber keine andere App und schreibt keine Hardware.
- Core-Budget, Tarif-SoC, Charging, Thermik/Heizstab, BHKW/Generator, AI, Energiefluss und Mapping verwenden dieselbe Topologie.
- Die vollständige Tarif-Statuswahrheit bleibt Baustein 3 und ist in RC2 noch nicht abgeschlossen.

### Zielarchitektur

```text
Messwerte + Freshness
        ↓
Policy-Wünsche
MultiUse | Tarif | Eigenverbrauch | Peak-Shaving | Reserve
        ↓
zentraler Prioritäts-/Konfliktresolver
        ↓
Safety- und Budget-Gates
        ↓
ein finaler Speicher-Sollwert
        ↓
Topologie: Einzel-Speicher ODER Speicherfarm
        ↓
manuell zugeordnete AppCenter-DPs
        ↓
Write-Ergebnis / Readback / Status
```

### Zu prüfende Fehlerbilder

- MultiUse aktiviert derzeit indirekt die Speicherregelung, obwohl die App im AppCenter als nicht installiert/aus angezeigt wird.
- Speicherfarm und Einzel-Speicherregelung dürfen niemals parallel denselben finalen Sollwert schreiben.
- MultiUse muss dieselbe Policy sowohl an einen Einzel-Speicher als auch an eine Farm liefern können, ohne versteckte App-Aktivierung.
- Tarif-, Peak- und Eigenverbrauchslogik dürfen nicht jeweils unabhängig einen konkurrierenden finalen Speicherwert bilden.
- AppCenter-Anzeige, gespeicherte Konfiguration und effektive Runtime-Aktivierung müssen dieselbe Wahrheit zeigen.

### Abnahmetests

- MultiUse + Einzel-Speicher
- MultiUse + Speicherfarm
- Speicherregelung im AppCenter aus, Farm an
- Farm aus, Einzel-Speicher an
- beide installiert, aber genau eine Ausgangstopologie aktiv
- dynamischer Wechsel einer App ohne Adapterneustart
- Authority-Konflikt: kein doppelter Hardware-Write

---

## Baustein 3 – Tariflogik und Statuswahrheit

**Vorgeschlagener Umfang – vor Umsetzung freigabepflichtig**

### Fachliche Trennung

- Tarifmodul liefert Preiszustand, Lade-/Entladepräferenz, Freigaben und gegebenenfalls einen begrenzten Leistungswunsch.
- Der zentrale Speicherresolver entscheidet unter Berücksichtigung von NVP, SoC, MultiUse, Peak-Shaving, §14a und Budgets über den finalen Sollwert.
- `tarif-vis` darf nicht unabhängig behaupten „Speicher entlädt“, wenn final `0 W`, ein Gate-Block oder ein fehlgeschlagener Write vorliegt.

### Statusmodell

```text
Tarifabsicht
→ Resolver-Ergebnis
→ finaler Sollwert
→ Gate-Entscheidung
→ Hardware-Write akzeptiert/abgelehnt
→ optionaler Readback
```

Jede Stufe erhält einen eigenen Diagnosewert. Die sichtbare Betriebsanzeige verwendet den finalen Dispatch-/Write-Status, nicht nur die Tarifabsicht.

### Abnahmetests

- teuer + Netzbezug → Entladen
- günstig + erlaubtes Netzbudget → Laden
- günstig + PV-Reserve wartet → `0 W` mit eindeutigem Wartegrund
- SoC-Grenze → `0 W` mit Sicherheitsgrund
- Gate blockiert → Status „blockiert“, nicht „lädt/entlädt“
- Farm verteilt finalen Tarifwert vollständig
- Tarifpreis stale → keine neue Tarifaktion; Eigenverbrauch bleibt definiert

---

## Baustein 4 – AppCenter-Ausgangsmatrix für alle Geräte

**Vorgeschlagener Umfang – zunächst Audit, danach einzelne freigabepflichtige Patches**

Für jedes beschreibbare Feld wird diese Kette dokumentiert und automatisiert geprüft:

```text
AppCenter-Feld
→ normalisierte Konfiguration
→ zuständige App/Policy
→ Owner/Authority
→ Safety-/Budget-Gates
→ Hardware-Executor
→ Write-Ergebnis
→ Readback
→ Diagnose-State
→ Regressionstest
```

### Geräteklassen

- Einzel-Speicher und Speicherfarm
- Wallboxen einschließlich Sollstrom, Sollleistung, Enable, Lock und Phasenumschaltung
- Heizstäbe und Stufen-/Relaisausgänge
- Wärmepumpen, Klima, Sollwerte und SG-Ready
- Schwellwert- und Relaislogiken
- BHKW und Generatoren
- §14a- und Netzvorgaben
- Mesh/Microgrid
- NexoLogic-Ausgänge

### Unveränderliche Mapping-Regel

Eine frei benannte Objekt-ID ist gültig. Blockiert wird nur bei:

- exakter Mehrfachbelegung desselben physischen Ausgangs mit widersprüchlichen Funktionen,
- aktivem höher priorisierten Safety-/Authority-Owner,
- ungültigem Datentyp oder nicht endlichem Wert,
- bewusstem Geräte-/Richtungs-/Leistungsgate.

---

## Baustein 5 – Systemweite Zeitreihen- und Release-Prüfung

### Deterministische Szenarien

- 60–300 Regelzyklen je Szenario, nicht nur ein Einzelaufruf
- verzögerte Batterie-Istleistung
- frischer und stale NVP
- Laden ↔ Entladen in beiden Richtungen
- Tarif-Warten und Tarif-Wechsel
- MultiUse-Zonenwechsel
- Peak-Shaving-Eingriff und Rückgabe
- §14a-Aktivierung und Neutralisierung
- Farm-Speicher online/offline, SoC-Grenze, Teilverfügbarkeit
- FENECON-Keepalive bei konstantem Sollwert einschließlich `0 W`
- blockierter und fehlgeschlagener Hardware-Write
- Adapterneustart mit vorhandenen AppCenter-Mappings

### Release-Gate

Ein Kandidat wird erst als stabil bezeichnet, wenn:

1. alle fokussierten Regeltests bestehen,
2. der vollständige `publish:check` besteht,
3. TS-Quelle, produktive JS-Runtime und Mirrors identisch sind,
4. ZIP aus einem sauberen Verzeichnis erstellt und wieder entpackt geprüft wurde,
5. ein kurzer Feldtest mit echten Datenpunkten keine widersprüchlichen Statuswerte zeigt.

---

## Arbeitsreihenfolge bis Sonntagabend

### Samstagabend, 18.07.2026

- Baustein 1 fertigstellen und als begrenzten RC ausliefern.
- Vollständige fokussierte Speicher-/Farm-Regression ausführen.
- Rollback-Paket und Konfigurationssicherung bereithalten.
- Vorschlag für Baustein 2 mit konkreter Dateiliste und erwarteten Verhaltensänderungen vorlegen.

### Sonntagvormittag, 19.07.2026

- Nach Freigabe: Steuerhoheit von MultiUse, Einzel-Speicher und Farm bereinigen.
- Zeitreihentests für beide Topologien ausführen.
- Keine Tarif- oder Geräte-App-Änderung in denselben Patch mischen.

### Sonntagnachmittag, 19.07.2026

- Nach separater Freigabe: Tarifabsicht, finalen Resolverwert und tatsächlichen Write-Status zusammenführen.
- Farm-/Einzelbetrieb sowie günstige, teure, wartende und gesperrte Tarifszenarien prüfen.
- AppCenter-Ausgangsmatrix als Auditbericht erzeugen; Gerätefixes einzeln priorisieren.

### Sonntagabend, 19.07.2026

- Vollständiges Release-Gate ausführen.
- Feldabnahme anhand einer festen Checkliste.
- Nur einen nachweislich bestandenen Kandidaten als stabil markieren; andernfalls beim letzten bestandenen RC bleiben und den offenen Punkt eindeutig benennen.

---

## Rollback- und Feldtestverfahren

1. Aktuelle ioBroker-/Adapterkonfiguration exportieren.
2. Vor Installation das zuletzt bekannte Paket lokal sichern.
3. Kandidat installieren und Adapter vollständig neu starten.
4. Zunächst nur Speicher-/Farm-Diagnose beobachten; keine AppCenter-DPs neu zuordnen.
5. Richtungswechsel mit kleiner, kontrollierter Leistung prüfen.
6. Danach Tarif-/MultiUse-Szenarien schrittweise aktivieren.
7. Bei widersprüchlichem finalem Sollwert, wiederholtem unbegründetem `0 W` oder Gate-/Write-Fehler sofort auf den letzten bestandenen Kandidaten zurückgehen.

## Relevante Diagnosewerte

- `speicher.regelung.requestW`
- `speicher.regelung.requestQuelle`
- `speicher.regelung.requestGrund`
- `speicher.regelung.dispatcherJson`
- `speicher.regelung.schreibStatus`
- `speicher.regelung.schreibOk`
- `speicher.regelung.zeroWriteFirewallAction`
- `speicher.regelung.zeroWriteFirewallReason`
- `storageFarm.lastDispatchJson`
- `storageFarm.storagesStatusJson`

