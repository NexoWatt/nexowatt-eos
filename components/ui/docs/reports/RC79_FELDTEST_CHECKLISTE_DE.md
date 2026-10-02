# RC79-Feldtest-Checkliste – Soft/Hard und 0-Einspeisung

## Installation

- [ ] RC79 in einen frischen Projektordner entpacken und veröffentlichen.
- [ ] NexoWatt UI auf `0.8.204` aktualisieren und die Adapterinstanz vollständig neu starten.
- [ ] Browser einmal mit `Strg + F5` neu laden.
- [ ] Prognose aus RC77 und signed-NVP-Budget aus RC78 bleiben sichtbar und plausibel.

## AppCenter / Netzlimits

- [ ] AppCenter → **Netzlimits** öffnen.
- [ ] 0-Einspeisung befindet sich in diesem Bereich und nicht nur unter EVU/PV.
- [ ] Hard-Limit, Soft-Limit beziehungsweise automatische Reserve, Hysterese und Wiederfreigabeverzögerung sind sichtbar.
- [ ] EVU-Relaisstufen bleiben separat konfigurierbar.
- [ ] Einstellungen speichern, Seite neu laden und Persistenz kontrollieren.

## Import-Soft-/Hard-Limit

- [ ] Beispielsweise Hard-Limit `30.000 W` und Soft-Limit `27.000 W` konfigurieren.
- [ ] Bei NVP `−10.100 W` zeigt die Diagnose ungefähr `37.100 W` Soft- und `40.100 W` Hard-Headroom.
- [ ] Unterhalb des Soft-Limits ist die Stufe `normal`.
- [ ] Oberhalb des Soft-Limits werden neue Leistungssteigerungen eingefroren beziehungsweise flexible Lasten kontrolliert reduziert.
- [ ] Am Hard-Limit erfolgt der unmittelbare Safety-Eingriff.
- [ ] Nach Unterschreiten von Soft-Limit minus Hysterese erfolgt die Wiederfreigabe erst nach der eingestellten Verzögerung.
- [ ] §14a, Parkregler, Phasen-, Stations- und Gerätegrenzen bleiben vorrangig.

## 0-Einspeisung mit Speicher

- [ ] NVP-Vorzeichen prüfen: Bezug positiv, Einspeisung negativ.
- [ ] Zunächst Diagnosemodus verwenden und PV-Ist, lokalen Aufnahmebedarf, Feed-forward-Ziel und NVP-Ziel vergleichen.
- [ ] Bei PV-Überschuss und aufnahmefähigem Speicher wird zuerst Speicherladung angefordert beziehungsweise berücksichtigt.
- [ ] Nur der danach verbleibende Überschuss wird an den PV-Wechselrichtern abgeregelt.
- [ ] Bei vollem oder gesperrtem Speicher folgt die PV-Vorgabe dem realen Gebäudeverbrauch und den akzeptierten flexiblen Lasten.
- [ ] Bei steigendem Verbrauch wird die PV-Begrenzung schnell in der benötigten Höhe freigegeben.
- [ ] Bei sinkendem Verbrauch wird die PV-Leistung ohne bleibende Einspeisespitze reduziert.
- [ ] PV wird nicht gleichzeitig abgeregelt, während der Speicher entlädt; die Diagnose zeigt gegebenenfalls `storageDischargeConflict` und löst die PV-Begrenzung.
- [ ] Mehrere Wechselrichter erhalten eine proportionale Gesamtvorgabe.

## Messwert- und Hardware-Sicherheit

- [ ] NVP-Datenpunkt kurz unterbrechen beziehungsweise veralten lassen.
- [ ] Stufe wechselt auf `stale`; keine neue positive Last wird freigegeben.
- [ ] Aktive 0-Einspeisung fällt gemäß Konfiguration fail-closed zurück.
- [ ] Nach Rückkehr eines frischen NVP-Werts erfolgt eine kontrollierte Wiederfreigabe.
- [ ] WR-/Speicher-Readback und tatsächlicher NVP folgen der Vorgabe ohne Vorzeichenumkehr.

## Cold-Start-Warnungen

- [ ] Thermik und Threshold-Regeln im AppCenter deaktivieren.
- [ ] Adapter vollständig neu starten.
- [ ] Im Log erscheinen keine Warnungen mehr zu fehlenden Objekten unter `thermal.summary.*`.
- [ ] Im Log erscheinen keine Warnungen mehr zu fehlenden Objekten unter `threshold.rules.r1.*`.
- [ ] Insbesondere `output`, `status`, `active`, `effectiveEnabled`, `lastWriteOk`, `readbackOk` und `lastChange` existieren vor dem Safe-Stop.
- [ ] Deaktivierte Aktoren bleiben physisch auf sicherem Sollwert.

## Dauer- und Regressionstest

- [ ] Mindestens ein kompletter PV-Tag mit wechselnder Bewölkung und Laständerungen.
- [ ] Speicher-, Speicherfarm-, EVCS-, Thermik-, Heizstab- und Tariflogik zeigen keine Regression.
- [ ] OCPP/OCPP21 und langsame Aktoren überschreiten das Hard-Limit nicht.
- [ ] Prognosewerte, LIVE-Dashboard, History und AppCenter bleiben erreichbar.
- [ ] EMS-Diagnose protokolliert den bindenden Grund ohne Log-Spam.
