# EOS-System: Design und Funktionen erhalten

Stand: 30.09.2026. Ziel ist ein gemeinsames wartbares System bei erhaltenem Design und Fachverhalten. **EOS Admin 7 bleibt Ausgangsbasis**; Admin 8 wird nicht stillschweigend eingesetzt. Die eigene genaue Version und Quellen müssen übernommen und geprüft werden. Die Modulnamen sind Architekturzuordnungen, keine Behauptung über bereits integrierte Pakete.

## Vor jeder Migration erfassen

1. Tatsächliche Quellstände, Paketversionen, Konfiguration, Hardware, Betriebssystem, Controller und Drittadapter inventarisieren; Sicherung und Wiederherstellbarkeit prüfen.
2. UI-Referenz nach Rolle und Bildschirmgröße festhalten: Screenshots, DOM-Struktur, Navigation, Eingabefelder, Rechte und Fehlermeldungen. Geheimnisse und Kundendaten entfernen.
3. Datenpunkte einschließlich Namen, Typen, Einheiten, Bereiche, Aktualität, Schreibrechte und Konfigurationsmigration maschinenlesbar sichern.
4. Regeln und Prioritäten mit Referenzfällen dokumentieren: Netzlimits, §14a-Ansteuerung soweit vorhanden, Speicher-/Ladeverhalten, Zeit-/Tariflogik, Offlineverhalten und Wiederanlauf. Bestehendes Verhalten muss erst gemessen werden.
5. Externe API-/Protokollabläufe als bereinigte Referenzdatensätze sichern: Anfrage, Antwort, Einheit, Reihenfolge, Frist und Fehlerfall. Gerätehersteller/Firmware zuordnen.

Diese vollständigen Funktions-/UI-Referenzen sind noch nicht erstellt. Beobachtete externe Adapterquellen einschließlich des aktuellen Nutzer-UI-Archivs sind in `system/components/source-inventory.json` erfasst; der installierte Stand bleibt offen. Erste Quell-/Fixture-Inventur: `docs/integration/UI_COMPATIBILITY_BASELINE.md`. Fehlende Nachweise werden nicht durch angenommene Funktionen ersetzt.

## In Schritten umstellen

Zuerst Lieferumfang und bestehende Komponenten unverändert zusammenführen. Danach Authentisierung, Verträge und Kommunikationsgrenzen einzeln integrieren. Die bestehende gemeinsame ioBroker-Laufzeit darf währenddessen nur als ein gemeinsamer Vertrauensbereich beschrieben werden. Getrennte Benutzer/Prozesse benötigen nachgewiesene Controller-/Adapterkompatibilität; ein neuer Diagrammrahmen bewirkt keine Isolation.

Neue interne TLS-Verbindungen und Datenrechte werden zunächst in einer isolierten Testumgebung geprüft. Geräte mit Legacy-Protokollen bleiben ausdrücklich dokumentierte Ausnahmen hinter begrenzten Verbindungen. Jede Änderung muss dieselben fachlichen Referenzfälle sowie unzulässige Eingaben, Replays und Kommunikationsausfall bestehen. Ein sichtbarer Sicherheitsablauf wie Aktivierung darf ergänzt werden; bestehende Bedien- und Regelungsfunktionen dürfen nicht unbemerkt verschwinden.

## Update und Rückfall

Vor Aktivierung: versionierte Sicherung, Schema-/Vorgängerkompatibilität, signierter Lieferstand und Wiederherstellungsweg prüfen. Updatefehler oder Stromverlust dürfen keinen gemischten Software-/Datenstand aktivieren. Ein alter Programmstand ist nur rückfallfähig, wenn er das wiederhergestellte Datenschema unterstützt. Der Schutz vor verwundbaren Downgrades und der autorisierte Notfallweg sind getrennt zu testen.

Lizenzänderung, Abbruch der Einrichtung und Wiederherstellung dürfen keine Netz-/Anlagenschutzfunktionen unkontrolliert abschalten. Der sichere Zustand ist je realer Anlage festzulegen; weder pauschales Abschalten noch Einfrieren eines Sollwerts ist automatisch sicher.

Abnahme benötigt Quell-/Buildbezug, Referenzvergleich, Zielgeräte-/Ausfalltests und eine echte Freigabeentscheidung. Bis dahin bleiben Migration, aktuelle Adapterkompatibilität und Erhalt aller Fachfunktionen **ungeprüft**. Es erfolgt aus diesem Plan keine Änderung an einer laufenden Anlage.
