# NexoWatt EOS 0.8.178 RC54 – modularer Regelbaukasten und Trockenlauf

## Ziel der Ausbaustufe

RC54 erweitert die in RC53 angelegte EOS-Pro-App **Betriebsstrategien** um einen modularen Regelbaukasten. Installateur und Betreiber können damit flexible Verbraucher, Ladepunkte, Speicher und andere EOS-Ressourcen in **MUSS-, SOLL- und KANN-Ziele** einordnen, Zeitfenster und Bedingungen definieren sowie die daraus entstehende Prioritätskaskade in einem vollständig schreibfreien Trockenlauf prüfen.

Die Ausbaustufe bleibt absichtlich von der produktiven Anlagensteuerung getrennt. Sie berechnet nur Anforderungen, führt jedoch weder Datenpunkt-Schreibvorgänge noch Hardwarebefehle aus. Bestehende Lade-, Speicher-, Heizstab-, Thermik-, §14a-, Parkregler-, Netzanschluss- und Safety-Regelungen werden nicht übernommen oder ersetzt.

## Regelklassen

Jeder Regelbaustein besitzt eine fachliche Klasse und eine Priorität innerhalb dieser Klasse:

- **MUSS**: Schutzbedingungen und verbindliche Pflichtziele, beispielsweise ein Fahrzeug-SoC bis zur Abfahrtszeit.
- **SOLL**: betriebliche Optimierungsziele, beispielsweise Speicher-Tagesziel oder flexible Kühlhauspause.
- **KANN**: optionale Überschuss- und Komfortnutzung, beispielsweise Fahrzeugladung bis 100 % oder Heizstabfreigabe.

Die simulierte Kaskade bewertet zuerst Sicherheitsreaktionen, danach MUSS, SOLL und KANN. Treffen mehrere aktive Regeln auf dieselbe Ressource, wird nur die höher priorisierte Anforderung ausgewählt; niedrigere Anforderungen werden transparent als zurückgestellt angezeigt.

## Modulare Regelbausteine

RC54 stellt folgende Grundtypen bereit:

- **Thermische Pause** für Kühlanlagen, Wärmepumpen und andere thermisch verschiebbare Verbraucher,
- **SoC-Ziel** für Speicher und Ladepunkte mit verfügbarem Ladezustand,
- **Energieziel** für Verbraucher oder Ladevorgänge mit Energiezähler,
- **Ein-/Aus-Anforderung** für schaltbare Verbraucher,
- **Leistungsziel** für stufenlos oder extern begrenzbare Ressourcen.

Jede Regel kann aktiviert oder deaktiviert, einem Profil und einer Zielressource zugeordnet sowie mit einer Priorität versehen werden. Regel- und Ressourcenkennungen bleiben stabil, damit spätere Zuordnungen und automatische Geräteerkennung darauf aufbauen können.

## Zeit- und Kalenderbedingungen

Für jeden Baustein können folgende Zeitmodelle gewählt werden:

- kontinuierliche Bewertung,
- täglicher Prüfzeitpunkt mit frei einstellbarem Prüffenster,
- frei definierbares Zeitfenster, auch über Mitternacht,
- Auswahl der gültigen Wochentage.

So kann beispielsweise die Kühlhausentscheidung täglich um 19:00 Uhr geprüft werden, während eine optionale Fahrzeugladung nur am Wochenende freigegeben wird.

## Frei kombinierbare Bedingungen

Regeln können mehrere Bedingungen aus System- und Ressourcenwerten enthalten. Unterstützt werden unter anderem:

- Außentemperatur,
- PV-Prognose,
- aktueller PV-Überschuss,
- Netzleistung,
- Strompreis,
- Wochenende und günstiger Tarif,
- SoC, Temperatur, Leistung und Energie einer Ressource,
- Online-, Alarm-, Aktiv- und Aktualitätsstatus,
- aktuelle Abschalt- und Laufdauer,
- Gerätezustand.

Vergleiche stehen als kleiner, kleiner/gleich, größer, größer/gleich, gleich und ungleich zur Verfügung. Fehlt ein benötigter Messwert, wird die Regel im Trockenlauf blockiert statt mit einem erfundenen Ersatzwert weitergerechnet.

## Thermische Sicherheitsgrenzen

Thermische Pausen besitzen einen eigenen Sicherheitsrahmen:

- maximale Abschaltdauer,
- minimale Laufzeit,
- minimale Stillstandszeit,
- obere und untere Temperaturgrenze,
- Temperaturhysterese,
- verpflichtende aktuelle Messwerte,
- verpflichtende Online-Verbindung,
- Sperre bei Alarm.

Wird im Trockenlauf die maximale Temperatur erreicht, die Abschaltdauer überschritten, ein Alarm gemeldet oder ein erforderlicher Messwert ungültig, erzeugt die Simulation eine vorrangige Sicherheitsentscheidung. Für ein später produktiv angebundenes Kühlhaus ist damit bereits der fachliche Rückfall auf Freigabe beziehungsweise Wiederanlauf vorbereitet.

## Ziel-SoC, Zielenergie und Zielzeit

Bei SoC- und Energiezielen werden Zielwert, Zielzeit, heutiger oder nächster Tag sowie die gewünschte Energiequellenstrategie gespeichert. Die Simulation kann anhand von:

- aktuellem SoC beziehungsweise Energiezähler,
- nutzbarer Kapazität,
- Wirkungsgrad,
- verbleibender Zeit,
- minimaler und maximaler Geräteleistung

den verbleibenden Energiebedarf und eine erforderliche mittlere Leistung berechnen. Diese Leistung ist ausschließlich eine simulierte Planungsanforderung und noch kein Wallbox- oder Speicherbefehl.

## Nachtenergie-Reserve

Die in RC53 vorbereitete Nachtenergie-Reserve wird im Trockenlauf als eigener SOLL-Plan bewertet:

- aktives Winter-, Sommer- oder benutzerdefiniertes Profil,
- Speicherzuordnung pro Profil,
- Ziel-SoC zum Nachtbeginn,
- absolute Speicheruntergrenze,
- Sonnenuntergang beziehungsweise feste Rückfallzeit,
- Sonnenaufgang beziehungsweise feste Rückfallzeit.

Vor dem Nachtbeginn zeigt der Trockenlauf, ob das gewünschte Reserveziel erreicht ist und welche ungefähre mittlere Ladeleistung bis zum Nachtbeginn benötigt würde. Die reservierte Energie bleibt fachlich für den Nachtverbrauch vorgesehen; sie wird nicht als permanente nächtliche Mindestgrenze missverstanden.

## Vorbereitete Kundenkaskade

Über **„Kundenbeispiel vorbereiten“** werden fünf editierbare Regeln angelegt:

1. Fahrzeug als MUSS-Ziel auf 70 % bis 12:00 Uhr,
2. Kühlhaus als sichere SOLL-Nachtpause bei definierten Bedingungen,
3. Speicher als SOLL-Tagesziel auf 80 %,
4. Fahrzeug als KANN-Ziel am Wochenende auf 100 %, wenn der Speicher mindestens 95 % erreicht,
5. Heizstab als KANN-Verbraucher bei Fahrzeug 100 %, Speicher mindestens 95 % und ausreichendem PV-Überschuss.

Vorhandene Speicher, Ladepunkte, Kühlanlagen und Heizstäbe werden nach ihren EOS-Ressourcenrollen vorgeschlagen. Fehlt eine Zuordnung, bleibt sie sichtbar als unvollständig markiert und muss vom Installateur bestätigt werden; sie wird nicht stillschweigend auf ein anderes Gerät umgebogen.

## Explizite Teilnahmefreigabe

Eine bereits im EOS vorhandene Ressource nimmt nur dann am Regelbaukasten teil, wenn sie im Ressourcenbereich ausdrücklich für Betriebsstrategien vorgemerkt wurde. Das reine Installieren oder Aktivieren der App verändert keine Anlage.

Für Ladepunkte bleibt der verbindliche Vertrag bestehen:

- spätere Steuerteilnahme nur über **Auto → Betriebsstrategie**,
- ausdrückliche Freigabe pro Ladepunkt,
- Standard-Automatik als vorgesehener Rückfall,
- Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel bleiben eigenständig,
- das bestehende Lademanagement bleibt Echtzeitregler, Stationsverteiler und Hardwareausführer.

RC54 fügt noch keine neue Modusauswahl in den produktiven Ladepfad ein und übernimmt keinen Ladepunkt.

## Trockenlauf und Diagnose

Die Simulation besitzt eigene Testwerte für System und Ressourcen. Sie zeigt je Regel:

- aktiv, inaktiv, blockiert, erfüllt, angefordert oder sicherheitsbedingt übersteuert,
- Zielressource und Regelklasse,
- Priorität und ausgewählte Anforderung,
- Gründe für erfüllte oder nicht erfüllte Bedingungen,
- berechneten Energiebedarf und Leistungsbedarf,
- zurückgestellte konkurrierende Regeln.

Jedes Simulationsergebnis enthält verbindlich:

```text
simulationOnly = true
hardwareWrites = 0
```

Das Modul enthält keinen API-Aufruf zum Schreiben von Datenpunkten. Backend und Frontend normalisieren zusätzlich alle Regeln mit `executionEnabled = false`, deaktivieren Steuerübernahme und Hardwareausführung und begrenzen die gespeicherten Konfigurationsmengen.

## Bewusst noch nicht produktiv angebunden

Nicht Bestandteil von RC54 sind:

- zentrale Stellwertarbitrierung zwischen allen produktiven Reglern,
- tatsächliche Steuerfreigabe über Auto → Betriebsstrategie,
- Live-Ausführung von Kühlhaus-, Lade-, Speicher- oder Heizstabbefehlen,
- automatische Übernahme realer Messwerte in die Simulation,
- automatische Geräteerkennung,
- historische Mehrtages-Simulation und Prognoseoptimierung.

Diese Trennung ist beabsichtigt. Erst nach verifiziertem Regelbaukasten und nachvollziehbarer Simulation wird die spätere zentrale Single-Writer-Anbindung schrittweise und pro Ressource freigegeben.
