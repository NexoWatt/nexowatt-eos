# NexoWatt EOS Admin v37

## Fokus

Diese Version stabilisiert drei produktive Bereiche:

- Benachrichtigungsdialoge bleiben vollständig klickbar und können sauber geschlossen bzw. bestätigt werden.
- BackItUp und andere Runtime-Adapter werden vom EOS-Sicherheitswächter standardmäßig nicht mehr über Objekt-/ACL-Umschreibungen verändert. Der Schutz läuft über EOS Rollen/UI.
- EOS-Sicherheitstexte werden auch auf Adapter-Konfigurationsseiten gegen UTF-8/Latin1-Mojibake repariert.

## Hinweise

BackItUp-Fehler wie `cannot found source "undefined" for compress` kommen typischerweise aus der BackItUp-Quell-/Zielkonfiguration. v37 sorgt dafür, dass EOS Admin BackItUp nicht durch ACL/common-Änderungen beeinflusst. Die BackItUp-Konfiguration selbst muss weiterhin im BackItUp-Adapter geprüft werden.
