# NexoWatt UI 0.8.162 RC38 – Stabilitäts- und FENECON-Regelvertrag

Stand: 8. August 2026

## Ziel dieses Releases

RC38 stabilisiert die gemeinsame EMS-Regelbasis und beseitigt insbesondere die Ursachen, durch die FENECON-Sollwerte auf 0 W geklemmt, fehlende Messwerte als reale Nullwerte behandelt oder alte Lade-/Entladebefehle nach einem Messwertausfall weitergehalten werden konnten.

Der Release verändert keine fachlich unabhängigen Herstellerprofile ohne Not. Sungrow, E3/DC, generische Signed-/Split-Speicher, EVCS, §14a, Tarif-, Heizstab-, Thermal- und NexoLogic-Pfade bleiben in ihren bestehenden Regelverträgen; sie profitieren jedoch von der zentralen strengeren Messwertvalidierung.

## 1. Verbindlicher FENECON-Automatikvertrag

Die PV-abhängige Umschaltung gilt ausschließlich für einen einzelnen, exklusiven FENECON/OpenEMS-DC-/Hybridspeicher im Modus `auto`.

| Zustand | Standardbedingung | Verhalten |
|---|---|---|
| FEMS-Eigenregelung | frische PV > 500 W für 10 s | EOS sendet keinen zyklischen Leistungs- oder 0-W-Keepalive. FEMS regelt Eigenverbrauch, Laden und Entladen selbst. |
| EOS-Regelung | frische PV < 500 W für 120 s | EOS übernimmt den Speicher über den eindeutig aufgelösten direkten ESS- oder nativen FEMS-Netzzielpfad. |
| Umschaltband | PV exakt 500 W oder zwischen getrennt konfigurierten Ein-/Ausschaltschwellen | Die bisherige Reglerhoheit bleibt bestehen; kein Flattern. |
| PV fehlt/veraltet | kein belastbarer frischer PV-Wert | Fail-safe FEMS-Eigenregelung; EOS erzeugt keinen neuen Nicht-Null-Befehl. |
| Expliziter 0-W-Stopp | Sicherheit, §14a, SoC, Policy, manuell oder ungültige Konfiguration | EOS darf unabhängig von PV und Reglerhoheit sofort 0 W schreiben. |

Die Standardwerte sind im AppCenter editierbar:

- FEMS-Übernahmeschwelle: 500 W
- EOS-Übernahmeschwelle: 500 W
- Verzögerung EOS → FEMS: 10 s
- Verzögerung FEMS → EOS: 120 s
- FEMS-API-Watchdog: 60 s

## 2. Sichere Reglerübergabe und One-Writer-Prinzip

Beim Wechsel EOS → FEMS wird ein noch aktiver EOS-Sollwert nicht einfach stehen gelassen. RC38 schreibt zunächst einen expliziten 0-W-Übergabestopp. Erst nach erfolgreichem Schreiben wird der zyklische Refresh beendet. Der FEMS-API-Watchdog kann anschließend vollständig auslaufen und FEMS übernimmt ohne parallelen EOS-Writer.

Beim Wechsel eines technischen Kommandopfads – direkte ESS-Leistung versus `ctrlBalancing*/SetGridActivePower` – bleibt die vorhandene Watchdog-Übergabe aktiv. Während des Übergabefensters ist immer nur die zuletzt wirksame Kommandofamilie autoritativ.

Ein 0-W-Stop ist von einem Leerlauf-Keepalive getrennt:

- **Expliziter 0-W-Stopp:** wird tatsächlich geschrieben und bei weiter bestehendem Stopgrund erneuert.
- **FEMS-Eigenregelung ohne Stopgrund:** kein 0-W-Keepalive und kein Nicht-Null-Sollwert aus EOS.
- **EOS-Regelung im Leerlauf:** 0-W-Keepalive bleibt zulässig, damit der externe API-Watchdog nicht unbeabsichtigt die Reglerhoheit zurückgibt.

## 3. Pflicht- und optionale FENECON-Datenpunkte

### Pflicht für den nativen FEMS-Netzzielpfad

- echter beschreibbarer `ctrlBalancing*/SetGridActivePower`-Datenpunkt;
- frischer NVP-Messwert;
- ausdrücklich zugeordnete AC-seitige ESS-Aktorleistung, typischerweise `ess*/ActivePower`;
- eindeutige Einzel-/Farm-Schreibtopologie.

Ohne NVP oder ESS-Aktorfeedback wird keine Netzzielformel ausgeführt und kein neuer Netzsollwert geschrieben. Allgemeine Batterie-, Hybrid-, PowerBalance- oder PV-Werte ersetzen die ESS-Aktorleistung nicht.

### Optional

- FENECON-Mindestleistung;
- FENECON-Maximalleistung;
- Sollwert-Readback;
- getrennte DC-, AC- oder Gesamt-PV-Leistung.

Fehlt ein optionaler Min-/Max-Datenpunkt oder enthält er `null`, einen leeren String oder einen nicht numerischen Wert, wird **keine** Grenze angewendet. Sind beide Grenzen vorhanden, aber `min > max`, blockiert der Befehl mit Diagnose `fenecon-power-limits-invalid` beziehungsweise `grid-target-limits-invalid`.

## 4. Strenger gemeinsamer Zahlenvertrag

Folgende Rohwerte sind keine Messzahl und dürfen nicht in 0 umgewandelt werden:

- `null` und `undefined`;
- `""` und reine Leerzeichen;
- Booleans;
- Objekte und Arrays;
- `NaN` und unendliche Werte.

Zulässig sind endliche Zahlen und nicht leere numerische Strings. Übliche deutsche und englische Darstellungen werden unterstützt:

- `31,5` → 31,5
- `1.234,56` → 1234,56
- `1,234.56` → 1234,56

Dieser Vertrag gilt zentral für NVP, PV, SoC, Speicherleistung, EVCS-Leistung, Grenzwerte und alle Nutzer der gemeinsamen Datenpunktabstraktion.

## 5. 0-W-Firewall bei Messwertausfall

Während einer kurzen konfigurierten Messlücke darf ein letzter wirksamer Sollwert vorübergehend gehalten werden. Nach Ablauf der Grace-Zeit gilt jedoch zwingend:

1. Messung unbrauchbar oder weiterhin fehlend;
2. alter Cachewert darf nicht mehr als gültiges NVP-Zielband zählen;
3. aktiver Nicht-Null-Sollwert wird sicher auf 0 W beendet;
4. Diagnose: `write-stop-measurement-timeout`.

Damit kann ein alter Lade- oder Entladebefehl nicht unbegrenzt weiterlaufen, nur weil ein intern vorhandener Cachewert zufällig im Zielband liegt.

## 6. Speicherfarm

Die PV-abhängige FEMS-/EOS-Automatik gilt nicht für gemischte Speicherfarmen. Dort bleibt der zentrale EOS-Dispatcher autoritativ.

- Eine Farm wird erst ab zwei konfigurierten Speicherzeilen aktiv.
- Höchstens ein nativer FEMS-NVP-Schreibmaster ist zulässig.
- Zusätzliche reine Monitor-Speicher sind möglich.
- Mehrere schreibbare Speicher verwenden die direkte zentrale EOS-Verteilung.
- Farm- und Einzelwriter dürfen niemals gleichzeitig aktiv sein.

## 7. Weitere Stabilitätskorrekturen

- Unvollständige Schwellwertregeln ohne gültige Schwelle erzeugen keinen Aktorbefehl.
- Messwerttimeout wird in der 0-W-Firewall vor dem NVP-Zielband-Hold ausgewertet.
- AppCenter, Runtime, Farmnormalisierung und Diagnose verwenden dieselben FENECON-Defaults.
- Der veraltete Multi-Use-Test erwartet nicht mehr fälschlich einen Writer ohne aktive Speichertopologie.
- Der npm-Doppelversionsschutz läuft wieder als erster Schritt von `prepublishOnly` und blockiert bei bestehender Version, Timeout oder unklarer Registry-Antwort.

## 8. Neue und erweiterte Regressionstests

RC38 prüft unter anderem:

- reale `SpeicherRegelungModule.tick()`-Zyklen bei hoher und niedriger PV;
- 10-s-FEMS- und 120-s-EOS-Entprellung;
- exakt 500 W und konfiguriertes Umschaltband;
- fehlende/veraltete PV;
- einmalige EOS→FEMS-0-W-Neutralisierung;
- Sicherheits-0-W unter FEMS-Reglerhoheit;
- fehlende NVP-/ESS-Pflichtwerte;
- fehlende und widersprüchliche optionale FENECON-Grenzen;
- native/direct Kommandofamilien und Readback;
- gemischte Farm und exklusiven nativen Master;
- Messwerttimeout der gemeinsamen 0-W-Firewall;
- unvollständige Schwellwertregel;
- Multi-Use, Speicherfarm, NVP, EVCS-Speicherschutz, Sungrow und E3/DC;
- statischen und lokalen HTTP-Laufzeittest des npm-Doppelversionsschutzes.

## 9. Inbetriebnahmeprüfung an einer realen FENECON-Anlage

Vor der Feldfreigabe sind folgende Punkte im Live-System zu kontrollieren:

1. PV-Gesamtwert zeigt bei Erzeugung einen frischen, plausiblen Wert.
2. Bei dauerhaft >500 W wechselt `speicher.regelung.feneconHybridRegelhoheit` nach etwa 10 s auf `fems`.
3. `feneconHybridNoWrite` ist dann `true`; der zugeordnete Sollwert-DP erhält keinen zyklischen Refresh.
4. Bei dauerhaft <500 W wechselt die Reglerhoheit nach etwa 120 s auf `nexowatt`.
5. NVP und ESS-Aktorleistung sind frisch; EOS schreibt anschließend den erwarteten Sollwert.
6. §14a-, SoC- oder manueller Stopp schreibt auch bei hoher PV sofort 0 W.
7. Nach Aufhebung des Stopps bei hoher PV endet der Refresh und FEMS übernimmt nach seinem API-Watchdog wieder selbst.
8. Optional nicht zugeordnete Min-/Max-DPs erscheinen als `null` und verändern den Sollwert nicht.
9. Diagnose- und Readbackstatus zeigen keine parallele zweite Kommandofamilie.

## 10. Abgrenzung

Die Softwaretests bilden den Regelvertrag und die ioBroker-Schreibpfade umfangreich nach. Sie ersetzen keinen Hardware-in-the-Loop-Test mit dem konkreten FEMS-/Modbus-Gateway, dessen real eingestellter API-Watchdog und dessen Firmware. Deshalb muss die erste Installation mit Logaufzeichnung und kontrollierten Lade-/Entladeszenarien geprüft werden.

Der bestehende TypeScript-Migrationsbestand wurde nicht vollständig neu typisiert. RC38 fügt keine weitere `@ts-nocheck`-Datei hinzu; die 60 vorhandenen Migrationsdateien bleiben transparent im Budget erfasst.
