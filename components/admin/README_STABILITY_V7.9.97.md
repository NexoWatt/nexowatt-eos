# NexoWatt EOS Admin 7.9.97 – Stable

Diese Version behebt die sichtbaren Regressionen aus 7.9.96 und ist für den anschließenden Feldtest als Verkaufsfassung vorbereitet.

## Korrigiert

- Ordentliche NexoWatt-Anmeldekarte im bewährten Verhältnis, nur moderat größer.
- Keine innere horizontale oder vertikale Scrollleiste – auch nicht bei „Falsches Passwort“ oder der persönlichen Erstanmeldung.
- Keine doppelte Karten-Geometrie auf einem inneren Formular-/Grid-Container.
- Native Übersicht für Admin, Installateur und Endkunde.
- Read-only EMS-Live-Diagnose über die echte authentifizierte AdminConnection.
- Konkrete Hinweise bei fehlendem UI-Adapter, zu alter UI-Version, fehlendem Diagnosevertrag oder fehlender Leseberechtigung.

## Kompatibilität

Für vollständige EMS-Livedaten wird `iobroker.nexowatt-ui` ab `0.8.198` benötigt. Der Diagnosevertrag liegt unter `nexowatt-ui.*.info.adminOverview.*` und besitzt keine Schreibhoheit.

Erstkennwort `nexowatt`, verpflichtende persönliche Kennwortvergabe, Rollenmodell, geschützte EOS-Adapter, interne Notfallreserven und Standardport `8081` bleiben unverändert.
