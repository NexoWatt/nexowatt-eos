# NexoWatt EOS – Betriebsstrategien RC56

## Zweck

Die App **Betriebsstrategien** koordiniert Speicher, Ladepunkte, thermische Verbraucher und Heizstäbe über gemeinsame Ziele und Prioritäten. Sie ersetzt die vorhandenen Fachregelungen nicht. Die Strategy Engine plant, während die vorhandenen EOS-Module weiterhin als einzige Geräte-Writer arbeiten.

```text
Betriebsstrategie → kurzlebige Anforderung → vorhandenes Fachmodul
                  → §14a / Parkregler / Netz- und Geräteschutz → Gerät
```

Dadurch können mehrere Regeln nicht gleichzeitig gegeneinander auf denselben Geräte-Datenpunkt schreiben.

## Welche Geräte angezeigt werden

In der Ressourcenliste erscheinen nur Geräte, für die alle erforderlichen Voraussetzungen erfüllt sind:

- die zugehörige EOS-App ist installiert und aktiviert,
- die jeweilige Fachregelung ist aktiviert,
- das einzelne Gerät ist aktiviert,
- mindestens eine sinnvolle Mess- oder Stellzuordnung ist vorhanden.

Leere Platzhalter, deaktivierte Ladepunkte, nicht aktivierte thermische Geräte und nicht aktivierte Heizstäbe werden ausgeblendet. Die Ressourcenkarten starten kompakt und eingeklappt. Details werden über den Pfeil der jeweiligen Zeile geöffnet.

## Unterstützte produktive Ressourcen in RC56

### Ladepunkte

- produktive Teilnahme ausschließlich im Ladebetriebsmodus **Auto**,
- zusätzlich muss am Ladepunkt **Auto-Quelle: EOS Betriebsstrategie** gewählt werden,
- Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel bleiben unverändert,
- Stationsverteilung, Mindestleistung, Phasengrenzen, OCPP-/Modbus-Ansteuerung, §14a und Netzanschlussgrenzen bleiben Aufgabe des vorhandenen Lademanagements,
- die Strategie kann das vorhandene Auto-Ergebnis begrenzen oder pausieren, aber keine Sicherheits- oder Anlagenbegrenzung überschreiben.

### Speicher

- die Strategie kann die vorhandene SoC-Untergrenze beziehungsweise Nachtenergie-Reserve erhöhen,
- sie kann keine bereits höhere Schutzgrenze absenken,
- während der Nacht darf die zurückgehaltene Energie bis zur absoluten Speicheruntergrenze für den Nachtverbrauch genutzt werden,
- RC56 erzwingt keine direkte Netzladung des Speichers. Das Erreichen des Nachtziels erfolgt im Rahmen der vorhandenen Speicher- und PV-Regelung.

### Thermische Geräte

- produktive Teilnahme ausschließlich im vorhandenen Modus **PV-Auto**,
- Manuell und Aus bleiben unangetastet,
- maximale Abschaltdauer, Temperaturgrenzen, Hysterese, minimale Laufzeit, minimale Stillstandszeit, Online-Status, Alarm und Messwertalter bleiben verbindlich,
- bei veralteter oder fehlender sicherheitsrelevanter Temperatur wird eine sichere Freigabe bevorzugt.

### Heizstäbe

- produktive Teilnahme ausschließlich im vorhandenen Modus **PV-Auto**,
- die Strategie kann die zulässige Leistung begrenzen oder pausieren,
- sie kann keinen Heizstab über das durch PV-, Nulleinspeise-, §14a-, Netz- und Gerätegrenzen verfügbare Budget hinaus einschalten,
- Manuell, Boost und Aus bleiben unangetastet.

### Benutzerdefinierte Ressourcen

Benutzerdefinierte Ressourcen mit frei eingetragenen Schreibdatenpunkten bleiben in RC56 bewusst im **Beobachtungsbetrieb**. Sie können gemessen, simuliert und für Bedingungen verwendet werden, erhalten aber noch keinen generischen Hardware-Schreibpfad. Produktive Befehle laufen nur über bereits vorhandene EOS-Fachmodule.

## Sichere Inbetriebnahme

### 1. App installieren und aktivieren

1. Im AppCenter **Betriebsstrategien** installieren.
2. Die App aktivieren.
3. Die Seite **Betriebsstrategien** öffnen.
4. Prüfen, ob nur die tatsächlich aktiven und zugeordneten Geräte erscheinen.

### 2. Beobachtungsbetrieb verwenden

Zu Beginn bleiben:

- globaler Modus: **Beobachtung**,
- Auto-Stufe: **Shadow/Beobachtung**,
- einzelne Ressourcen: **Beobachtung**.

In diesem Zustand berechnet das EOS Entscheidungen, gibt aber keine Strategy-Anforderung an die Fachmodule weiter.

### 3. Ressourcen prüfen

Für jede Ressource:

1. Ressource öffnen.
2. Rolle und Priorität prüfen.
3. optionale Strategiemesswerte ergänzen, etwa SoC, Fahrzeug-SoC, Temperatur, Leistung, Online- oder Alarmstatus.
4. maximale Alterung der Messwerte passend zum Protokoll festlegen.
5. Rückfallverhalten wählen.

Die vorhandenen Stellpfade des jeweiligen EOS-Fachmoduls bleiben maßgeblich. In der Betriebsstrategien-App werden keine parallelen Stellpfade benötigt.

### 4. Profile und Nachtenergie-Reserve

Ein Profil enthält unter anderem:

- Winter- oder Sommerbetrieb,
- Ziel-SoC zum Nachtbeginn,
- absolute Speicheruntergrenze,
- Nachtbeginn und Nachtende,
- zugeordneten Speicher.

Beispiel Winter:

```text
SoC-Ziel zum Nachtbeginn: 40 %
Absolute Untergrenze:     10 %
Nachtbeginn:              18:00 Uhr
Nachtende:                07:00 Uhr
```

Vor dem Nachtbeginn wird der Bereich bis 40 % für die Nacht geschützt. Während der Nacht darf der normale Gebäudeverbrauch diese Energie bis zur absoluten Untergrenze nutzen.

**Hinweis:** Die Auswahl „Sonnenuntergang/Sonnenaufgang“ verwendet in RC56 die im Profil hinterlegten Ersatzzeiten. Eine astronomische Standortberechnung ist noch nicht Bestandteil dieser Feldteststufe.

### 5. Regeln konfigurieren

Jede Regel erhält:

- Klasse: MUSS, SOLL oder KANN,
- Priorität,
- Zielressource,
- Regeltyp,
- Zeitplan oder Prüfzeitpunkt,
- Bedingungen,
- Zielwert,
- Sicherheitsparameter.

Konflikte für dieselbe Ressource werden deterministisch gelöst:

1. MUSS vor SOLL vor KANN,
2. höhere Priorität,
3. neuere gültige Anforderung.

Übergeordnete Geräte-, Netz- und Sicherheitsgrenzen stehen immer darüber.

### 6. Simulation kontrollieren

Vor der Live-Freigabe:

1. alle Regeln im Trockenlauf auswerten,
2. fehlende oder veraltete Messwerte prüfen,
3. Zielerreichung und Blockierungsgründe kontrollieren,
4. die Kundenkaskade mit realistischen Testwerten simulieren,
5. sicherstellen, dass keine Ressource unerwartet ausgewählt wird.

### 7. Einzelne Ressource freigeben

Eine native Ressource wird erst live berücksichtigt, wenn in ihrer Karte:

- Teilnahme aktiviert,
- Steuerungsmodus **Aktiv**,
- Inbetriebnahme bestätigt,
- produktive Übergabe freigegeben

gesetzt wurden.

Bei Ladepunkten muss zusätzlich am jeweiligen Ladepunkt gelten:

```text
Betriebsmodus = Auto
Auto-Quelle   = EOS Betriebsstrategie
```

### 8. Globale Live-Freigabe

Erst nach der Einzelprüfung:

- globaler Modus: **Aktiv**,
- Auto-Stufe: **Aktiv**,
- Inbetriebnahme bestätigt,
- Steuerübernahme aktiviert,
- Ausführung aktiviert.

Alle Freigaben müssen gemeinsam vorliegen. Fehlt eine davon, bleibt die Strategy Engine fail-closed im Beobachtungsbetrieb.

## Ablaufzeit und Rückfall

Jede Strategy-Anforderung ist kurzlebig. Standardmäßig muss sie innerhalb von 15 Sekunden erneuert werden. Bei Ablauf, Ausfall der Strategy Engine oder ungültigen Messwerten gilt das pro Ressource konfigurierte Rückfallverhalten.

Für Ladepunkte stehen insbesondere zur Verfügung:

- **Standard-Automatik:** das bisherige Auto-Verhalten übernimmt wieder,
- **Pause:** der Ladepunkt wird innerhalb des vorhandenen Lademanagements sicher pausiert.

Ein alter Sollwert bleibt nicht unbegrenzt aktiv.

## Kundenbeispiel

Eine mögliche Kaskade lautet:

1. **MUSS:** Fahrzeug bis zum Folgetag 12:00 Uhr auf 70 % bringen.
2. **SOLL:** Nachtenergie-Reserve des Speichers sicherstellen.
3. **SOLL:** Kühlhaus unter Temperatur-, Abschaltdauer- und Prognosebedingungen zeitweise pausieren.
4. **SOLL:** Speicher tagsüber bis 80 % laden.
5. **KANN:** Fahrzeug bei ausreichendem Überschuss am Wochenende auf 100 % laden.
6. **KANN:** Heizstäbe erst nach erfüllten höher priorisierten Zielen freigeben.

Die eigentliche momentane Leistungsverteilung erfolgt weiterhin durch die vorhandenen EOS-Regler und deren gemeinsame Budgets.

## Live-Diagnose

Wichtige Diagnosezustände befinden sich unter:

```text
operatingStrategies.summary.*
chargingManagement.wallboxes.<Ladepunkt>.strategy*
storageControl.strategy*
thermalControl.devices.<Gerät>.strategy*
heatingRodControl.devices.<Gerät>.strategy*
```

Besonders relevant sind:

- aktive Ressource und aktives Profil,
- ausgewählte Anforderung,
- angeforderte Leistung beziehungsweise SoC-Grenze,
- Ablaufzeit,
- Sperr- oder Begrenzungsgrund,
- Rückfallzustand,
- Messwertaktualität.

## Sicheres Zurückschalten

Bei Auffälligkeiten:

1. beim betroffenen Ladepunkt die Auto-Quelle auf **Standard-Automatik** zurückstellen oder einen anderen vorhandenen Modus wählen,
2. die einzelne Ressource in der App auf **Beobachtung** setzen,
3. bei Bedarf den globalen Modus auf **Beobachtung** setzen,
4. Entscheidungs- und Lademanagementprotokoll sichern,
5. erst nach Prüfung erneut freigeben.

Das Deaktivieren der Betriebsstrategien-App entfernt ihre Anforderungen; die vorhandenen Fachregelungen bleiben aktiv.

## Feldtest-Checkliste

- [ ] Nur aktive und zugeordnete Geräte werden angezeigt.
- [ ] Alle Ressourcenkarten sind zunächst eingeklappt.
- [ ] Simulation zeigt plausible Entscheidungen und keine unerwartete Ressource.
- [ ] Ladepunkt bleibt in Manuell, Boost, PV, Min+PV und Zeit-Ziel unbeeinflusst.
- [ ] Ladepunkt reagiert nur bei Auto → EOS Betriebsstrategie.
- [ ] Standard-Auto-Rückfall funktioniert bei abgelaufener Anforderung.
- [ ] Stationsgrenze und §14a begrenzen weiterhin den endgültigen Ladebefehl.
- [ ] Speicherreserve senkt keine bereits höhere Schutzgrenze.
- [ ] Thermische Sicherheitsfreigabe greift bei Temperaturgrenze, Alarm oder veraltetem Messwert.
- [ ] Heizstab überschreitet kein vorhandenes PV-/Netzbudget.
- [ ] Adapterneustart hinterlässt keinen dauerhaft alten Strategy-Sollwert.
- [ ] Entscheidungsprotokoll erklärt jede Freigabe, Pause und Begrenzung.

## Geltungsbereich von RC56

RC56 ist für einen kontrollierten Feldtest mit **nativen, bereits über die EOS-Fachmodule angebundenen Ressourcen** vorgesehen. Unterschiedliche Hersteller, Kommunikationsintervalle und Gerätefehler müssen weiterhin im realen Objekt erprobt werden. Die Architektur ist fail-closed und Single-Writer-basiert; eine absolute Fehlerfreiheit jeder externen Hardware oder Kommunikationsstrecke kann dadurch nicht versprochen werden.
