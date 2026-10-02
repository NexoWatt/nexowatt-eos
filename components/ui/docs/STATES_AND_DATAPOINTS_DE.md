# NexoWatt UI – State- und Datenpunkt-Katalog

Diese Datei beschreibt wichtige States und Datenpunkte. Sie ist keine vollständige automatisch generierte Liste, sondern eine fachliche Orientierung für Wartung und TypeScript-Migration.

## 1. Grundregeln für Werte

| Regel | Bedeutung |
|---|---|
| Wattwerte | intern als `number` in W führen |
| Prozentwerte | intern als `number` von 0 bis 100 führen |
| Energiewerte | kWh klar von W trennen |
| 0-Wert | ist ein gültiger Messwert |
| fehlender Wert | `null`, `undefined`, leer oder nicht numerisch |
| stale Wert | nur bei Quellen werten, bei denen altes Alter fachlich problematisch ist |

## 2. Energiefluss-States

| State / Key | Bedeutung | Einheit | Schreibt | Liest | Kritisch |
|---|---:|---:|---|---|---|
| `productionTotal` | PV-/Erzeugerleistung gesamt | W | main.js/EMS | app.js/history/KI | positiv führen |
| `gridBuyPower` | Netzbezug | W | main.js/EMS | app.js/history/KI | positiv führen |
| `gridSellPower` | Netzeinspeisung | W | main.js/EMS | app.js/history/KI | positiv führen |
| `consumptionBuilding` | Gebäudeverbrauch ohne optionale externe Lasten | W | main.js/EMS | app.js/history/KI | nicht doppelt mit EVCS zählen |
| `consumptionTotal` | Gesamtverbrauch | W | main.js/EMS | app.js/KPI | abhängig von Konfiguration |
| `storageSoc` | Speicher-SoC | % | main.js/Mapping | app.js/KI/History | normale Anlage bevorzugt vor Farm |
| `storageChargePower` | Speicher lädt | W | Resolver/Mapping | app.js/EMS | 0 W gültig |
| `storageDischargePower` | Speicher entlädt | W | Resolver/Mapping | app.js/EMS | 0 W gültig |
| `storagePower` | signed Speicherleistung | W | Mapping/Resolver | EMS/UI | Vorzeichen dokumentieren |

## 3. Speicher-Datenquellen

### Split-DPs

```text
storageChargePower      Ladeleistung, positiv
storageDischargePower   Entladeleistung, positiv
```

### Signed-DP

```text
storagePower            Speicherleistung mit Vorzeichen
```

Die konkrete Vorzeichenrichtung muss beim Mapping normalisiert werden.

### Fallback

Nur wenn kein Speicher-DP vorhanden ist.

## 4. Heizstab-States

| State / Key | Bedeutung | Einheit | Wichtig |
|---|---:|---:|---|
| `heatingRod.*.enabled` | Heizstab aktiv | boolean | Freigabegrundlage |
| `heatingRod.*.powerW` | aktuelle Heizstableistung | W | Dashboard/History |
| `heatingRod.*.storageReserveW` | Speicher-/PV-Reserve | W | darf nicht auf Default zurückspringen |
| `heatingRod.*.allowGrid` | Netzbezug erlaubt | boolean | Regelung |
| `heatingRod.*.allowStorageDischarge` | Speicherentladung erlaubt | boolean | Regelung |

## 5. EVCS-States

| State / Key | Bedeutung | Einheit | Wichtig |
|---|---:|---:|---|
| `chargingManagement.wallboxes.*.actualPowerW` | Ladeleistung | W | nur bei echter Wallbox anzeigen |
| `chargingManagement.wallboxes.*.goalEnabled` | Zielladen aktiv | boolean | KI-Planung |
| `chargingManagement.wallboxes.*.goalTargetSocPct` | Ziel-SoC | % | KI-Planung |
| `chargingManagement.wallboxes.*.goalFinishTs` | Zielzeit | ms | KI-Planung |

Regel:

```text
EVCS im Kundenfrontend nur sichtbar, wenn echte Ladepunktkonfiguration vorhanden ist.
```

## 6. Speicherfarm-States

| State / Key | Bedeutung | Einheit | Wichtig |
|---|---:|---:|---|
| `storageFarm.totalSoc` | Farm-SoC | % | nur bei aktiver Farm nutzen |
| `storageFarm.totalChargePowerW` | Farm lädt | W | nur bei aktiver Farm |
| `storageFarm.totalDischargePowerW` | Farm entlädt | W | nur bei aktiver Farm |
| `storageFarm.storagesStatusJson` | Farm-Speicherliste | JSON | Tabelle |

Regel:

```text
Eine Einzelanlage darf nicht durch alte storageFarm.* States beeinflusst werden.
```

## 7. KI-Berater States

| State | Bedeutung | Schreibt | Liest |
|---|---|---|---|
| `aiAdvisor.enabled` | KI-App aktiv | AI/App-Center | Frontend |
| `settings.aiAdvisorEnabled` | Kunde will KI sehen | Settings | AI/App |
| `aiAdvisor.suggestionsJson` | Vorschlagsliste | ai-advisor.js | app.js |
| `aiAdvisor.topTitle` | Hauptvorschlag Titel | ai-advisor.js | app.js |
| `aiAdvisor.topText` | Hauptvorschlag Text | ai-advisor.js | app.js |
| `aiAdvisor.peakStateText` | Peakstatus | ai-advisor.js | app.js/Diagnose |
| `aiAdvisor.weatherSummary` | Wetterzusammenfassung | ai-advisor.js | app.js/Diagnose |
| `aiAdvisor.dailyPlanJson` | Tagesplan | ai-advisor.js | spätere UI |

## 8. System-States

| State | Bedeutung | Wichtig |
|---|---|---|
| `info.connection` | Adapter/Webserver erreichbar | wird von ioBroker/Admin genutzt |
| `license.*` | Lizenzstatus | keine maskierten Schlüssel speichern |

## 9. TypeScript-Ableitung

Aus dieser Datei sollen später Typen entstehen, z. B.:

```ts
interface EnergyFlowState {
  productionTotalW: number;
  gridBuyPowerW: number;
  gridSellPowerW: number;
  storageSocPct: number | null;
  storageChargePowerW: number;
  storageDischargePowerW: number;
}
```
