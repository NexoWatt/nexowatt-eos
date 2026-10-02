# RC93 – zertifizierte Einspeisevorgabe und eindeutige Regelhoheit

## Ziel

RC93 erweitert die **Netzlimit-App** um eine belastbare Führungsquellenlogik für feste und dynamische Einspeisegrenzen am Netzanschlusspunkt (NVP/NAP). Dabei bleibt die Regelarchitektur eindeutig:

```text
Netzbetreiber / Fernwirktechnik
→ zertifizierter EZA-/Parkregler (falls projektseitig gefordert und freigegeben)
→ read-only Netzbetreiber-Schnittstelle
→ GridConstraints Export Guard als einziger Asset-Writer
→ PV-Wechselrichter / Parkregler-Sollwert sowie koordinierte Senken
```

Ist kein zertifizierter Regler aktiviert, in Betrieb genommen und durch den Installer freigegeben, regelt NexoWatt EOS selbst anhand der lokal hinterlegten Einspeisegrenze. Es gibt zu keinem Zeitpunkt zwei parallele Sollwertschreiber.

## Aktivierungsbedingungen des externen Reglers

Eine externe Einspeisevorgabe wird nur operativ berücksichtigt, wenn **alle** Bedingungen erfüllt sind:

1. App `netOperator` ist installiert und aktiviert.
2. Netzbetreiber-Schnittstelle ist aktiviert.
3. Betriebsart der Schnittstelle ist `active`.
4. Schnittstelle wurde als in Betrieb genommen markiert.
5. Installerfreigabe der Schnittstelle ist gesetzt.
6. Export Guard der Netzlimit-App ist aktiviert.
7. Installerfreigabe des Export Guard ist gesetzt.
8. Export Guard läuft im produktiven Aktivmodus.
9. Der empfangene Datensatz ist gültig, frisch, kommunikationsseitig in Ordnung und innerhalb seiner TTL.

Im Diagnose-, Test- oder Inbetriebnahmemodus bleibt die Schnittstelle read-only und kann die wirksame Einspeisegrenze nicht übernehmen.

## Eindeutige Führungsquelle

Der vorhandene `GridConstraints`-Export-Guard bleibt der **einzige Anlagen-Sollwertschreiber**. Die Netzbetreiber-Schnittstelle schreibt weder direkt auf Wechselrichter noch auf Speicher, Ladepunkte oder flexible Verbraucher. Sie erzeugt ausschließlich einen validierten Operations-Envelope.

Die wirksame Einspeisegrenze wird nach folgendem Vertrag bestimmt:

```text
wirksame Einspeisegrenze
= Minimum aus lokaler Sicherheitsobergrenze und gültiger externer Vorgabe
```

Ein externer Regler kann die lokal hinterlegte Sicherheitsobergrenze deshalb niemals anheben. Eine strengere externe Vorgabe – einschließlich `0 W` – wird übernommen. Eine externe Freigabe oder eine reine Blindleistungs-/cos-phi-Vorgabe gibt die Wirkleistungsführung an die lokale EOS-Grenze zurück.

## Standardisierter Operations-Envelope

Die Netzbetreiber-Schnittstelle stellt für den Export Guard unter anderem bereit:

```text
allowedExportPowerW
fallbackExportPowerW
validUntil
lastUpdate
source
quality
commandId
failSafePolicy
lastValidHoldSec
externalExportLimitEligible
operationEngineIntegration
soleAssetWriter = gridConstraints.exportGuard
```

Herstellerspezifische Vorgaben werden auf `allowedExportPowerW` normalisiert:

- direkte Einspeisegrenze in kW → Watt,
- positiver P-Sollwert in kW → Watt,
- prozentuale P-Vorgabe → Watt anhand der hinterlegten installierten PV-Leistung,
- Trip/Sperre → `0 W`.

`null`, `undefined`, leere Strings, ungültige oder veraltete Werte werden niemals als physikalische `0 W` interpretiert.

## TTL, Qualität und Kommunikationsausfall

Jede externe Vorgabe erhält `lastUpdate` und `validUntil`. Nach Ablauf der TTL oder bei Kommunikations-, Qualitäts- oder Validitätsfehlern greift exakt der konfigurierte Rückfall:

| Rückfallart | Verhalten |
|---|---|
| `project-specific` | auf `fallbackExportPowerW`, begrenzt durch die lokale Sicherheitsobergrenze |
| `last-valid` | letzter gültiger Wert nur innerhalb `lastValidHoldSec`, danach projektspezifischer Rückfall |
| `release` | Rückgabe an die lokale EOS-Sicherheitsobergrenze |
| `block` | harte Einspeisegrenze `0 W` |

Eine Haltezeit von `0 s` bedeutet **keine** unbegrenzte Speicherung des letzten Sollwerts, sondern sofortigen Rückfall.

## Senkenpriorität vor PV-Abregelung

RC93 setzt die festgelegte EOS-Reihenfolge durch:

```text
1. lokaler Grundverbrauch
2. freigegebene Ladepunkte
3. freigegebene flexible Verbraucher
4. zulässige Speicherladung
5. Mesh/Microgrid-Senken
6. verbleibenden Überschuss am Wechselrichter abregeln
```

Nicht verfügbare, gesperrte oder nicht quittierende Senken werden übersprungen. Die verbleibende Leistung wird an die nächste zulässige Senke weitergereicht. Erst der danach verbleibende Überschuss führt zur PV-Abregelung.

## Diagnose und Nachweis

Die Netzlimit-App veröffentlicht die wirksame Führungsquelle sowie:

- lokal konfigurierte Sicherheitsobergrenze,
- extern erlaubte Einspeiseleistung,
- wirksame Einspeisegrenze,
- Rückfallgrenze,
- Quelle und Qualität,
- letzte Aktualisierung und Gültigkeitsende,
- Aktiv-/Bindestatus,
- gewählte Fail-Safe-Regel,
- Begründung der Entscheidung,
- Kommando-ID.

Änderungen der Regelhoheit und der wirksamen Grenze werden als begrenztes, SHA-256-hashverkettetes Audit protokolliert. Dieses Audit ist **manipulationsanzeigend**; es ersetzt keine digitale Signatur, keine externe Archivierung und keinen formalen Netzbetreibernachweis.

## Projektgrenze

RC93 ersetzt keinen vom Netzbetreiber geforderten zertifizierten EZA-/Parkregler. Ist ein solcher Regler vorgeschrieben, bleibt er die netzseitig maßgebliche Instanz. EOS übernimmt dessen gültige Einspeisevorgabe als Führungsquelle und koordiniert die lokalen Senken sowie die vorhandene Export-Guard-Regelung. Die projektspezifische Anerkennung, Parametrierung und Inbetriebnahme bleiben mit Netzbetreiber, Anlagenzertifizierer und Reglerhersteller abzustimmen.
