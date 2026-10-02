# Prüfung 1.0.12 – Publish nach ZIP-Update

Geprüft am 18.09.2026 auf Linux mit Node.js 24.19.0. Dateien und npm-Aufrufe sind plattformneutral ausgeführt; die Tests verwenden auch Projektpfade mit Leerzeichen und Umlaut. Ein nativer Windows-Test wurde hier nicht durchgeführt.

## Reproduktion

Aktuellen Admin-Build aus 1.0.11 um ein nicht referenziertes altes Entry-Bundle ergänzt. Der bisherige Guard brach mit `obsolete-admin-entry-bundle` und „value redacted“ ab, obwohl kein Passwortfund vorlag. Ursache war die fehlende Vorbereitung eines überkopierten Release-Verzeichnisses und eine missverständliche Diagnose.

## Ergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| 15 gezielte Upgrade-/Fehlerfälle | Erfolgreich: frischer Stand, alte JS/CSS, verifizierte Sicherungen, wiederholte Vorbereitung, indirekte und deklarierte Chunks, geänderte/fehlende aktuelle Dateien, kaputte Metadaten, Geheimnisse an drei Stellen, Installationsdaten, Verzeichnisverknüpfung, Sicherungsfehler, unzulässiger Sicherungsort und rein lesender Artefakt-Guard |
| Vollständige `prepublishOnly`-Kette | Frische Repository-Kopie und überkopierter Stand erfolgreich, jeweils ohne Entwicklungsabhängigkeiten; Secret-Testfund blockiert weiterhin |
| Historische Original-Bundles | `index-BDfvN-Y6.js` aus 1.0.7 und `index-9CRyBUwD.js` aus 1.0.9 gesichert/entfernt; komplette Publish-Prüfkette anschließend erfolgreich; aktuelle Assets bytegleich |
| npm-Versionsguard | Lokale Test-Registry: 404 freigegeben, vorhandene Version und mehrdeutiger Serverfehler blockiert |
| Bestehende Sicherheitsregression | SMTP-Muster, private Schlüssel, Installationsdaten, tatsächlicher Git-Index, Pre-Commit-Hook und unterdrückte Geheimniswerte erfolgreich geprüft |
| `npm run test:all` | Erfolgreich, einschließlich Typ-, EMS-, AC/DC-, Speicher-, Rollen-, Mail-, Dokumentations- und neuer Publish-Regressionen |
| `npm run build:ts` | Erfolgreich; Laufzeit-/Typ-Spiegel synchron |
| Produktvergleich zu 1.0.11 | 223 Originalquellen, 167 Produkt-/Admin-JavaScript-Dateien und Admin-HTML/CSS bytegleich |
| Paket-/Startkette | 203 JS/MJS-Dateien syntaktisch geprüft; relative Abhängigkeiten vollständig; Adapter-/EMS-/§14a-Startkette konstruierbar |
| `npm pack --dry-run --json --ignore-scripts` | Erfolgreich; 351 explizite Manifest-Dateien plus package.json |

Die kompletten Publish-Prüfketten wurden mit einer lokalen Test-Registry ausgeführt. Es wurde kein Paket extern veröffentlicht, keine reale Versionsverfügbarkeit zugesichert, kein Git-Index verändert und keine Anlage angesteuert. Die Vorbereitung umgeht weder Geheimnisfunde noch abweichende aktuelle Artefakte. Künftige Release-Prüfungen müssen den Überkopierfall weiterhin einschließen.
