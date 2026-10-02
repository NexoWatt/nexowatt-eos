# NexoWatt EOS 0.8.177 RC53 – Betriebsstrategien-Grundlage

## Ziel

RC53 legt im `nexowatt-ui`-Adapter die sichere Grundlage für eine installierbare und aktivierbare App **Betriebsstrategien** an. Die App verwaltet erstmals ein modulares Ressourcenmodell für bereits im EOS konfigurierte sowie zusätzliche, manuell zugeordnete Geräte.

Die Ausbaustufe ist absichtlich **rein konfigurierend und beobachtend**. Sie erzeugt keine Sollwerte, schaltet keine Verbraucher und übernimmt keinen vorhandenen Regler. Damit bleiben die produktiven Lade-, Speicher-, Heizstab-, Thermik-, §14a-, Netzanschluss- und Safety-Abläufe unverändert.

## AppCenter und eigener Reiter

Die neue EOS-Pro-App kann unter **Apps** installiert und aktiviert werden. Nach der Installation erscheint der eigene Reiter **Betriebsstrategien**.

Die Aktivierung der App bedeutet in RC53 nur:

- Ressourcen und Datenpunktzuordnungen können vorbereitet werden,
- Winter-, Sommer- und eigene Profile können angelegt werden,
- bestehende EOS-Geräte können für eine spätere Strategie vorgemerkt werden,
- es findet keine Steuerübernahme statt.

## Vorhandene EOS-Ressourcen wiederverwenden

Die App liest vorhandene Zuordnungen aus den zentralen Konfigurationsbereichen und legt keine zweite konkurrierende Gerätekonfiguration an. Berücksichtigt werden:

- Einzel-Speicher beziehungsweise vorhandene Speicherfarm-Speicher,
- Ladepunkte und Stationszuordnungen,
- Verbraucher aus dem Energiefluss,
- Thermik-Geräte,
- Heizstäbe.

Je Ressource werden vorhandene Lese- und Stellpfade diagnostisch angezeigt. Ein erkannter Stellpfad bleibt in RC53 ausdrücklich gesperrt; die bisherige Fachregelung bleibt zuständig.

## Benutzerdefinierte Ressourcen und DP-Zuordnung

Noch nicht im EOS angelegte Geräte können als benutzerdefinierte Ressourcen ergänzt und wieder entfernt werden. Unterstützte Ressourcen- und Fähigkeitsprofile sind unter anderem:

- allgemeiner Verbraucher,
- thermisch flexibler Verbraucher,
- Ladepunkt,
- Speicher,
- Erzeuger,
- virtuelle Gruppe,
- nur messen,
- Ein/Aus,
- stufenloser Sollwert,
- stufige Steuerung,
- temperaturgeführt,
- Energie- oder SoC-Ziel.

Zuordnungsfelder stehen für Leistung, Energie, Betriebszustand, SoC, Temperatur, Alarm, Online-Status sowie vorbereitete Schalt-/Sollwert- und Rückmeldepunkte zur Verfügung. Schreibdatenpunkte werden gespeichert, aber nicht ausgeführt.

## Nachtenergie-Reserve

RC53 enthält Winter- und Sommerprofile mit folgenden Startwerten:

- Winter: **40 % SoC-Ziel zum Nachtbeginn**,
- Sommer: **60 % SoC-Ziel zum Nachtbeginn**,
- absolute Speicheruntergrenze: standardmäßig 10 %,
- Nachtbeginn: Sonnenuntergang mit fester Rückfallzeit,
- Nachtende: Sonnenaufgang mit fester Rückfallzeit.

Die Bedeutung ist bewusst getrennt:

- Der Ziel-SoC wird bis zum Nachtbeginn für den erwarteten Nachtverbrauch zurückgehalten.
- Während der Nacht darf diese Energie den allgemeinen Verbrauch decken.
- Nur die absolute Speicheruntergrenze bleibt geschützt.

RC53 führt diese Reserve noch nicht aus; sie wird als normierte, spätere Strategy-Engine-Konfiguration gespeichert.

## Ladepunkte und bestehende Betriebsmodi

Der verbindliche Steuervertrag ist bereits in Frontend und Backend hinterlegt:

- Eine spätere Strategiesteuerung ist nur innerhalb von **Auto → Betriebsstrategie** zulässig.
- Jeder Ladepunkt benötigt eine ausdrückliche Teilnahmefreigabe.
- Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel bleiben eigenständig.
- Die Strategie darf später nur ein Ziel anfordern; das vorhandene Lademanagement bleibt Echtzeitregler und Hardwareausführer.
- Bei Ausfall ist die vorhandene Standard-Automatik als Rückfall vorgesehen.
- Ein zentraler Single-Writer-Pfad bleibt Voraussetzung für jede spätere Steuerfreigabe.

RC53 verändert weder die Modusauswahl noch die Berechnung oder Ausgabe bestehender Ladebefehle.

## Fail-closed-Sicherheitsvertrag

Frontend und Backend erzwingen unabhängig von manipulierten Konfigurationswerten:

```text
mode = observe
controlTakeoverEnabled = false
writeExecutionEnabled = false
resource.writeEnabled = false
chargingScope = auto-only
existingChargingModesUntouched = true
singleWriterRequired = true
fallbackAutoSource = standard-auto
rules = []
```

Nicht implementierte Regeldefinitionen werden in RC53 nicht übernommen. Dadurch kann eine vorbereitete oder manipulierte Regel noch nicht versehentlich in einer späteren Laufzeit ausgewertet werden.

## Noch nicht Bestandteil von RC53

Noch nicht aktiv sind:

- die eigentliche Strategy Engine,
- Muss-/Soll-/Kann-Ziele,
- Temperatur- und maximale Abschaltdauerbedingungen,
- Fahrzeug-Ziel-SoC bis zu einer Zielzeit,
- Prioritätskaskaden zwischen Auto, Speicher und Heizstab,
- Simulations- und Entscheidungsprotokoll,
- automatische Geräteerkennung,
- Übergabe an einen zentralen Stellwertverteiler.

Diese Funktionen werden auf der jetzt vorhandenen, rückwärtskompatiblen Ressourcen- und Profilgrundlage schrittweise ergänzt.
