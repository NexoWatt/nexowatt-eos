# RC93 Feldtest-Checkliste – Einspeisebegrenzung und zertifizierte Reglerführung

## Installation und Ausgangszustand

- [ ] Version `0.8.218` aus einem frisch entpackten vollständigen Repository-ZIP installieren.
- [ ] Adapterinstanz vollständig neu starten und Browser mit `Strg + F5` neu laden.
- [ ] Signierten NVP-Datenpunkt prüfen: **Bezug positiv, Einspeisung negativ**.
- [ ] Installierte PV-Leistung und verfügbare WR-/Parkregler-Schreibdatenpunkte prüfen.
- [ ] Lokale Sicherheitsobergrenze und projektspezifische Rückfallgrenze dokumentieren.
- [ ] Vor produktiver Aktivierung Diagnose-/Inbetriebnahmemodus verwenden.

## EOS ohne externen Regler

- [ ] Netzbetreiber-App deaktiviert: Führungsquelle zeigt `NexoWatt EOS Netzlimits`.
- [ ] Feste Einspeisegrenze wird am NVP eingehalten.
- [ ] `0 W` führt zu Nulleinspeisung, ohne lokale Verbraucher künstlich zu begrenzen.
- [ ] Eine größere lokal mögliche PV-Leistung bleibt zulässig, solange der Überschuss lokal genutzt wird.
- [ ] Kein zweiter Writer schreibt parallel auf den WR-/Parkregler-Datenpunkt.

## Senkenpriorität

- [ ] Lokaler Verbrauch wird zuerst versorgt.
- [ ] Freigegebene Ladepunkte nehmen verfügbaren Überschuss vor dem Speicher auf.
- [ ] Freigegebene flexible Verbraucher nehmen verfügbaren Überschuss vor dem Speicher auf.
- [ ] Danach wird der Speicher nur innerhalb seiner zulässigen Ladeleistung geladen.
- [ ] Erst der verbleibende Überschuss wird am Wechselrichter abgeregelt.
- [ ] Gesperrte/offline Senke wird übersprungen; Restleistung erreicht die nächste verfügbare Senke.
- [ ] Fehlende ACK-/Readback-Bestätigung blockiert keine Endlosschleife und erzeugt keinen Log-Spam.

## Zertifizierter EZA-/Parkregler

- [ ] App installiert und aktiv, Schnittstelle `active`, Inbetriebnahme und Installerfreigabe gesetzt.
- [ ] Export Guard aktiv, Installerfreigabe gesetzt und produktiver Aktivmodus gewählt.
- [ ] Betreiberansicht zeigt `grid-export-limit-active` nur bei vollständig erfüllten Freigaben.
- [ ] Externe Grenze unterhalb der lokalen Obergrenze wird als wirksame Grenze übernommen.
- [ ] Externe Grenze oberhalb der lokalen Obergrenze kann diese nicht anheben.
- [ ] Externe `0-W`-Vorgabe wird als echte Nulleinspeisung umgesetzt.
- [ ] Prozentvorgabe wird anhand der installierten PV-Leistung korrekt in Watt angezeigt.
- [ ] Externe Freigabe gibt die Wirkleistungsführung an EOS zurück.
- [ ] Reine Q-/cos-phi-Vorgabe wird nicht fälschlich als aktive Einspeisegrenze angezeigt.
- [ ] Netzbetreiber-Schnittstelle führt keine direkten Fremd-State-/Asset-Schreibvorgänge aus.

## TTL und Rückfälle

- [ ] `validUntil`, `lastUpdate`, Quelle und Qualität sind plausibel.
- [ ] Veraltete Vorgabe wird nach TTL-Ablauf nicht weiter als frisch verwendet.
- [ ] Leerer/fehlender Wert wird nicht als `0 W` interpretiert.
- [ ] `project-specific`: projektspezifische Rückfallgrenze greift.
- [ ] `last-valid`: letzter gültiger Wert gilt nur innerhalb der eingestellten Haltezeit.
- [ ] `lastValidHoldSec = 0`: sofortiger Rückfall, kein unbegrenztes Halten.
- [ ] `release`: lokale EOS-Sicherheitsobergrenze greift.
- [ ] `block`: Einspeisegrenze wird auf `0 W` gesetzt.
- [ ] Nach Kommunikationswiederkehr erfolgt kontrollierte Übernahme des neuen gültigen Sollwerts.

## Diagnose, Audit und Dauerlauf

- [ ] Führungsquelle, konfigurierte, externe und wirksame Grenze stimmen überein.
- [ ] Entscheidungsgrund und Kommando-ID sind nachvollziehbar.
- [ ] Audit-Hashkette bleibt nach Adapterneustart verifizierbar.
- [ ] Manipulierter/ungültiger Audit-Eintrag wird nicht als verifizierter Head übernommen.
- [ ] Keine wiederkehrenden Warnungen wegen fehlender RC93-States/Objekte.
- [ ] Kein Anwachsen von Heap, Timern, Listenern oder Audit-Historien über die vorgesehenen Grenzen.
- [ ] Mindestens 24–48 Stunden Dauerlauf auf zwei unterschiedlichen Anlagen ohne neue Regelabweichung.

## Abnahmeprotokoll

| Feld | Eintrag |
|---|---|
| Anlage / Standort | |
| Netzbetreiber | |
| Reglerhersteller / Modell | |
| Mapping-Version | |
| lokale Sicherheitsobergrenze | |
| Rückfallgrenze / Fail-Safe | |
| NVP-Datenpunkt / Vorzeichen geprüft | |
| WR-/Parkregler-Schreibpfad / ACK geprüft | |
| Testdatum | |
| Installer / Unterschrift | |
