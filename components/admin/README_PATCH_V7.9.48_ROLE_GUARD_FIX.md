# NexoWatt EOS Admin v7.9.48 – Role Guard Fix

Dieser Patch ergänzt die EOS-Rollenlogik für drei feste Bedienebenen:

- **Admin**: vollständiger Systemzugriff für NexoWatt/Administratoren.
- **Installateur**: Service- und Einrichtungsrolle ohne Admin-Systembereiche.
- **Endkunde**: Bedien-/Kundenrolle mit Weiterleitung in das EOS/NexoWatt Cockpit.

## Änderungen

- Backend-Sicherheitskontext liefert jetzt `role`, `isInstaller`, `isEndUser`, `installerGroups`, `endUserGroups` und Gruppenanzeigenamen.
- Neue Standardgruppen: `system.group.installateur`, `system.group.endkunde`, `system.group.endkunden`.
- Endkunden werden nicht mehr auf der leeren `tab-intro`-Seite stehen gelassen.
- Frontend-Rollenschutz filtert die Navigation je Rolle.
- Fallback-Kundenkarte erscheint, falls kein Cockpit-Tab sichtbar/geladen ist.
- Rechte-Schnellprofile wurden auf **Endkunde**, **Installateur**, **Admin** reduziert.
- Delete- und Logquiet-Fixes aus v7.9.47 bleiben enthalten.
