# RC82 Validierungsbericht – NexoWatt UI 0.8.207

## Freigabestand

**Release-Kandidat:** `0.8.207 / RC82`  
**Ziel:** dauerhaft aktiver Netzanschlussschutz und Bereinigung des wiederkehrenden Core-Limits-Shadow-Warnlogs.

RC82 macht **Netzlimits** zu einem nicht abschaltbaren Sicherheitskern. Die statische Netzanschlussleistung und der signierte NVP werden weiterhin ausschließlich unter **AppCenter → Zuordnung → Allgemein** vorgegeben. Daraus gelten verbindlich:

```text
Hard-Limit = 100 % der wirksamen NVP-/Anschlussvorgabe
Soft-Limit =  90 %
Reserve    =  10 %
```

Die **0-Einspeisung bleibt separat optional** und nach einem Upgrade standardmäßig ausgeschaltet.

## Umgesetzte Korrekturen

### Dauerhafter Netzschutz

- Netzlimits ist in Home und Pro immer installiert und aktiv.
- Installiert-/Aktiv-Schalter werden für Netzlimits nicht mehr angeboten.
- Alte AppCenter-, Backup- oder Legacy-Werte wie `enableGridConstraints=false` können den Schutz nicht deaktivieren.
- Der Modulmanager startet Grid-Constraints und den finalen NVP-/PV-Koordinator unabhängig von optionalen Apps.
- Der physische Netzschutz bleibt auch bei fehlender, abgelaufener oder vorübergehend nicht lesbarer Lizenz aktiv.
- RLM darf das wirksame Hard-Limit nur absenken.
- Soft-Planung und finale Hard-Safety bleiben getrennt.
- NVP-Ausfall wird fail-closed behandelt: keine neue positive Laststeigerung ohne frische Messung.

### Bereinigung des Log-Spams

Der wiederkehrende Eintrag

```text
[core-limits-ts-shadow] JS/TS budget mismatch: total.effectiveW
```

wurde durch einen überholten Teil-Shadow der JavaScript→TypeScript-Migration verursacht. Der alte Vergleich bildet den seit RC78 produktiven signed-NVP-Vertrag mit bereits laufender geregelter Istlast nicht vollständig ab.

RC82 verwendet für die produktive Entscheidung weiterhin den vollständigen `core-runtime-v2`-Vertrag. Erwartete Abweichungen des alten Teil-Shadows werden:

- als interne Diagnose in `ems.budget.tsShadowJson` erhalten,
- als vom produktiven Runtime-v2-Vertrag überlagert gekennzeichnet,
- nicht mehr als Betriebswarnung ausgegeben,
- nicht mehr als fehlerhafter Gesamtstatus gewertet.

Unerwartete neue Shadow-Signaturen bleiben sichtbar, werden jedoch je Signatur höchstens einmal pro Adapterlauf protokolliert. Bei einem Ausfall des modernen Runtime-v2-Vertrags bleibt der alte Vergleich fail-closed und darf eine abweichende Budgetberechnung nicht produktiv übernehmen.

## Automatisierte Prüfung

Die monolithische Testkette wurde wegen des festen Ausführungslimits in reproduzierbare Abschnitte geteilt. Alle enthaltenen Abschnitte wurden ausgeführt und bestanden.

### Quell- und Typprüfung

- `733` TypeScript-Quelldateien syntaktisch geprüft.
- Vollständiger Projekt-Typecheck bestanden.
- Runtime-Mirror-Typecheck bestanden.
- `118` produktive Runtime-Executables synchron.
- `480` TypeScript-Runtime-Parallelspiegel synchron.
- Core-Limits-, Main-, AppCenter-, LIVE-, History-, SmartHome- und Heizstab-Runtime-Typprüfungen bestanden.
- Shadow-, Adapter-, Backend-, Frontend-, Energiefluss- und EMS-Spiegelprüfungen bestanden.

### Fach- und Regressionstests

Bestanden wurden unter anderem:

- RC57–RC61: OCPP/OCPP21, universeller Auto-Modus, Heizstab-Nachtsperre und EVCS-Härtung.
- RC63–RC65: Verfügbarkeit, Speicher-Netzladung, Tarif-/NT- und Zeit-Ziel-Regeln.
- RC66: DC-Stationsanzeige einschließlich Chromium-Layoutprüfung.
- RC67–RC70: Lizenz-Bootstrap, §14a-Fallback und Ladepunktstatus.
- RC72–RC77: PV-Prognose, Open-Meteo, Admin-/Kundenanzeige, Neustart- und State-Cache-Verhalten.
- RC78: signed-NVP-Importbudget und finaler Hardware-Write.
- RC79: Soft-/Hard-Limit, 0-Einspeise-Feed-forward und Speicher-/PV-Konfliktschutz.
- RC80: feste 10-%-Reserve.
- RC81: Zuordnung als alleinige Quelle für Anschlussleistung und NVP.
- RC82: dauerhaft aktiver, lizenzunabhängiger Netzschutz und Log-Spam-Regression.

### Paketprüfung

- ioBroker-/npm-Metadaten geprüft.
- `common.news` auf die zulässigen letzten sieben Versionen begrenzt.
- Konfliktmarkerprüfung bestanden.
- `172` ausgelieferte JS-/MJS-Dateien syntaktisch geprüft.
- Relative Runtime-Imports vollständig auflösbar.
- `main.js`-, EMS- und §14a-Startkette konstruierbar.
- Release-Artefaktdateiliste geprüft.
- `npm pack --dry-run` bestanden.

## Feldabnahme

Softwareseitig bestehen keine bekannten offenen Fehler im RC82-Umfang. Vor der Umbenennung auf Stable sind an einer realen Anlage noch folgende Punkte zu bestätigen:

1. NVP-Vorzeichen: Bezug positiv, Einspeisung negativ.
2. Hard/Soft/Reserve bei 30 kW: 30/27/3 kW.
3. Sanfter Eingriff ab Soft-Limit und sichere Begrenzung am Hard-Limit.
4. Fail-closed-Verhalten bei veraltetem NVP.
5. 0-Einspeisung nur bei bewusster Aktivierung.
6. Nach Adapterneustart keine neuen minütlichen `core-limits-ts-shadow ... total.effectiveW`-Warnungen.

Nach bestandener Feldabnahme soll derselbe Quellstand ohne weitere Funktionsänderung als Stable übernommen werden.
