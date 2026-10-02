# RC74 – Validierungsbericht

## Release

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.199`
- Release Candidate: `RC74`
- Datum: 22.08.2026
- Schwerpunkt: funktionierende Open-Meteo-PV-Prognose und einfacher Endkunden-PV-Flächeneditor

## Behobene Fehler

### Forecast-Status blieb bei „Wird geladen …“

Die Kundenseite lädt die Forecast-Runtime jetzt ausschließlich über den korrekten statischen Pfad:

```text
/static/forecast-settings.js
```

Das Modul zeigt sowohl die normalisierte Quelle `forecast.pv.*` als auch die unmittelbare Open-Meteo-Diagnose `forecast.openMeteoPv.*`. Dadurch bleibt die Anzeige nicht mehr in ihrem HTML-Ausgangszustand hängen.

### Open-Meteo-Prognose wurde nicht zuverlässig gestartet

Die Open-Meteo-Laufzeit:

- startet unmittelbar nach dem Adapterstart;
- lädt nach einer Prognose-Einstellungsänderung sofort neu;
- verwendet das eingestellte Intervall erst für die folgenden zyklischen Abrufe;
- wird beim Adapter-Shutdown gestoppt;
- behält bei einem vorübergehenden Abruffehler eine vorherige gültige Prognose als veraltet markierten Fallback.

### Systemstandort wurde nicht ausreichend aufgelöst

Standortreihenfolge:

1. manuelle Koordinaten;
2. System-/Anlagenkoordinaten;
3. Ort oder Postleitzahl aus `system.config`;
4. Open-Meteo-Geocoding mit 24-h-Cache.

Verwendeter Standort und Auflösungsquelle werden als Diagnose-States veröffentlicht.

### Experten-JSON war im Endkundenbereich sichtbar

Die JSON-Eingabe wurde vollständig aus der sichtbaren Kundenoberfläche entfernt. Stattdessen steht ein responsiver Tabelleneditor zur Verfügung:

- `+ PV-Fläche hinzufügen`;
- frei verständliche Bezeichnung;
- Leistung in kWp;
- Neigung;
- Ausrichtung als Himmelsrichtung;
- Anlagenverluste;
- optionale Wechselrichtergrenze;
- einzelne Zeilen entfernen.

Der interne Vertrag `settings.pvForecastArrays` bleibt erhalten. Die erste Tabellenzeile pflegt zusätzlich die bisherigen Einzelanlagen-States, damit Bestandsinstallationen kompatibel bleiben.

## Ausrichtungen

| Auswahl | Interner Azimut |
|---|---:|
| Nord | −180° |
| Nordost | −135° |
| Ost | −90° |
| Südost | −45° |
| Süd | 0° |
| Südwest | +45° |
| West | +90° |
| Nordwest | +135° |

## Open-Meteo-Daten

Die Laufzeit verwendet Wetter- und Strahlungsvariablen:

```text
temperature_2m
shortwave_radiation
direct_normal_irradiance
diffuse_radiation
cloud_cover
```

Daraus berechnet EOS eine 15-Minuten-PV-Leistungskurve für alle konfigurierten Dachflächen. Anlagenleistung, Neigung, Ausrichtung, Verluste, Temperatur und optionale Wechselrichterbegrenzung werden einbezogen.

## AppCenter-Fallback

Die vorhandenen AppCenter-Zuordnungen für `pvForecastTodayJson` und `pvForecastTomorrowJson` bleiben erhalten. Im Modus **Automatisch** gilt:

```text
Open-Meteo frisch und gültig
→ Open-Meteo verwenden

Open-Meteo nicht verfügbar
→ AppCenter-Prognose verwenden, sofern freigegeben

Keine Quelle verfügbar
→ Forecast ungültig, EMS-Fallbacks bleiben funktionsfähig
```

## Safety- und Writer-Vertrag

RC74 erzeugt keine neue Hardware-Schreibstrecke. Prognosedaten sind ausschließlich Optimierungs- und Diagnosewerte. Unverändert stärker bleiben:

- Netzanschluss- und Phasenlimits;
- Stationslimits;
- §14a und Parkregler;
- RFID und Verfügbarkeit;
- Wallboxfehler und Kommunikation;
- Safety-Envelope;
- bestehender Single Writer.

## Automatisierte Prüfung

Der vollständige Release-Plan enthält **244 geordnete Prüfungen**.

Wegen der maximalen Ausführungszeit eines einzelnen Werkzeugs wurde er deterministisch in zwei Bereiche ausgeführt:

- Schritte 1–195: bestanden;
- Schritte 196–244: bestanden;
- fehlgeschlagene Prüfschritte: 0.

Zusätzlich erfolgreich:

```text
TypeScript-Hauptprüfung
Runtime-Mirror-Typecheck
117 produktive Runtime-Dateien synchron
479 Runtime-Spiegel synchron
RC72 Forecast-/Auto-Regressionsprüfung
RC73 EMS-Admin-Overview-Regressionsprüfung
RC74 Kunden-PV-Prognose einschließlich Chromium-Browsertest
Package-Runtime-Start-Smoke
vollständiger TypeScript-Build
publish:check
verify-publish.js
npm pack --dry-run
npm publish --dry-run --ignore-scripts
```

## npm-Artefakt

```text
Version:                    0.8.199
package.json.files:         282 Produktdateien
Release-Manifest:           282 Produktdateien
npm-Paketinhalt:            283 Dateien inklusive package.json
npm-Paketgröße:             7.575.136 Byte
Ungepackte npm-Größe:      17.022.331 Byte
```

## Bewertung

RC74 ist paket- und regressionsgeprüft und eignet sich als kontrollierter Stable-Kandidat. Vor einer endgültigen `1.0.0`-Freigabe sollte die Open-Meteo-Abfrage noch auf mindestens einer realen Kundenanlage mit Systemstandort, mehreren PV-Flächen und AppCenter-Fallback über einen Tageswechsel beobachtet werden.
