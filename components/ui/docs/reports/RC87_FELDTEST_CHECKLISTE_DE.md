# RC87 Feldtest-Checkliste

1. Adapter aktualisieren und vollständig neu starten.
2. Browser einmal mit `Strg + F5` neu laden.
3. NVP unterhalb des Soft-Limits, EVCS-Anforderung `0 W`:
   - Status grün;
   - keine aktive Begrenzung;
   - NVP-Bezug wird weiterhin überwacht.
4. Fahrzeug verbunden, aber kein Ladebedarf:
   - neutraler Wartezustand;
   - keine gelbe Begrenzungsmeldung.
5. Netzbezug in der Soft-Zone:
   - gelbe Soft-Limit-Anzeige.
6. Hard-Limit/Safety-Test nur unter kontrollierten Bedingungen:
   - rote Hard-/Safety-Anzeige und unveränderte Schutzreaktion.
7. Negative NVP-Leistung ohne Export-Limit:
   - keine Import- oder Exportbegrenzung.
8. Export-Limit im Diagnosemodus überschritten:
   - gelber Diagnosehinweis, aber keine Meldung „begrenzt aktuell“.
9. Aktiviertes Export-Limit im Aktivbetrieb überschritten:
   - separate bindende Export-Limit-Anzeige.
10. Ereignisliste beobachten:
   - keine wiederholten identischen Meldungen durch kleine Speicher-/Budgetänderungen.
