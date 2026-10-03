# UUID im Erststart: gezielter HTTPS-Nachweis

`tests/onboarding/server.test.cjs` wurde mit dem tatsächlichen lokalen HTTPS-Setupserver und verifizierter Test-CA ausgeführt: **15 Tests erfolgreich, 0 Fehler, 0 übersprungen**. Der neue Test verwendet eine UUID mit zweistelligem Herstellerpräfix.

Nach erfolgreichem Einrichtungscode liest der Test die UUID aus `/api/catalog` und signiert erst danach eine Testlizenz für genau diese zurückgegebene Kennung. `/api/license/verify` akzeptiert diese Lizenz. Eine vom selben Testaussteller signierte Lizenz für eine andere Gerätekennung wird abgewiesen. Anonyme und abgelaufene Sitzungen erhalten `403` ohne UUID. Der zusätzliche Test benötigt keine Passwortableitung, keinen Abschlussaufruf und erzeugt weder Übergabedatei noch Commit-Sperre.

Die gelesene Implementierung bindet die Kennung an die vorhandene `system.meta.uuid.native.uuid`: Der Root-Kontexthelfer übernimmt sie normalisiert in Setup-Konfiguration und Geräteidentitätsdatei. Anzeige und Lizenzprüfung nutzen denselben Kontext; Finalizer und Import vergleichen die tatsächliche beziehungsweise rootgeschützte Kennung erneut. Die überprüften Setup-Pfade erzeugen keine Ersatz-UUID.

[uuid-api.tap](uuid-api.tap) enthält den vollständigen lokalen Testlauf. [uuid-api.json](uuid-api.json) hält Befehl, Umgebung, Ergebnis, TAP-Hash und SHA-256-Hashes der Testquellen sowie der separat gelesenen Herkunftspfade fest. Die gebundenen Dateien waren vor und nach dem Testlauf identisch. Testaussteller und Geräteidentität sind explizite Fixtures; die Herkunft aus einer tatsächlich installierten Datenbank wurde nur anhand des Codes geprüft.

**Offen:** native PostgreSQL-zu-Frontend-Integration, Linux/systemd und reale Dateieigentümer, grafischer Browser einschließlich Zwischenablage sowie Pi- und Hardwaretests. Dieser Nachweis bestätigt keine vollständige Installation oder Anlagenfreigabe. Laufzeitcode und technische Lizenzgates wurden für diese Ergänzung nicht verändert.
