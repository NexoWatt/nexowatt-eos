# NexoWatt EOS Admin v35

## Zweck

Version 7.9.35 korrigiert zwei produktive Punkte:

1. Repository-/Update-Metadaten zeigen vollständig auf die aktuelle npm-Version.
2. Die konfigurierte Abmeldezeit wird als harte Sitzungslaufzeit erzwungen.

## Update-Fix

In vorherigen Paketen konnten `common.meta`, `common.extIcon` und `common.readme` noch auf ältere unpkg-Versionen zeigen. Das konnte dazu führen, dass das Repository zwar eine neue Version anzeigt, der Admin beim Aktualisieren aber alte Metadaten nachlädt.

v35 setzt diese Felder synchron auf `7.9.35`.

## Harte Abmeldung

Der Upstream-Admin-Client verlängert OAuth-Tokens normalerweise automatisch. Für EOS wird das deaktiviert:

- erfolgreiche OAuth-Responses enthalten keinen nutzbaren Refresh-Token mehr,
- alte Refresh-Token-Versuche werden mit `401 invalid_grant` beantwortet,
- der Client muss nach Ablauf der eingestellten Abmeldezeit neu anmelden.

