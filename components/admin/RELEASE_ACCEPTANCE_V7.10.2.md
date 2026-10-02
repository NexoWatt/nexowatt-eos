# Release Acceptance – NexoWatt EOS Admin 7.10.2

Der Stable-Kandidat ist freigabefähig, wenn alle folgenden Bedingungen erfüllt sind:

- Backend-Kompilierung erfolgreich.
- Paket- und Stabilitätsprüfung vollständig erfolgreich.
- Backend-Runtime-Abhängigkeitskette vollständig und im npm-Artefakt enthalten.
- `build/lib/eosRequestSecurity.js` im gepackten Artefakt vorhanden.
- Auto-Update-Selbsttest bestätigt: kein Schreiben auf `system.adapter.eos-admin.0`.
- Wiederholter Auto-Update-Abgleich schreibt unveränderte Objektkonfigurationen nicht erneut.
- Startschutz verhindert Repository-Änderungen während des ersten Browser-Ladevorgangs.
- Installiertes System zeigt über mindestens 60 Sekunden keine Start-/Stop-Schleife.
- Browserkonsole bleibt frei von abgebrochenen Chunk-Transfers und Verbindungsverweigerungen auf Port 8081.
