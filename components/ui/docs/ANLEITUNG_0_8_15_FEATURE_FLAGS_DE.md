# Anleitung 0.8.15 – Home/EOS Feature-Kern und Energie-Wertkonto

## Zweck der Version

Version 0.8.15 härtet die Lizenz- und Feature-Grundlage. Das Energie-Wertkonto ist jetzt als Funktion für Home und EOS vorbereitet. EOS bleibt die Erweiterung für Betreiberfunktionen wie Ledger, Ladepunkt-Kiosk, Mesh und Microgrid.

## Installation

1. ZIP in ioBroker installieren.
2. Adapterinstanz starten.
3. App-Center im Admin-/Installerbereich öffnen.
4. Lizenzstatus prüfen.
5. Prüfen, dass das normale Nutzerfrontend keine Konfigurations- oder Verknüpfungsfunktionen zeigt.

## Prüfpunkte nach Update

### Home-Lizenz

- App-Center zeigt Home-Basisfunktionen.
- `Energie-Wertkonto` ist als Home/EOS-App vorbereitet.
- EOS-only Apps bleiben blockiert oder unsichtbar.
- Wallboxlimit bleibt für Home/HEMS bei 3.

### EOS-Lizenz

- EOS hat Vollzugriff auf Apps.
- Zukünftige Funktionen wie Energy Ledger, Charge Kiosk, Mesh und Microgrid bleiben als EOS-only Feature-Flags reserviert.

### Nutzerfrontend

- Normales Frontend bleibt Nutzerbereich.
- Keine Datenpunkt-Verknüpfungen im Frontend.
- Keine Preis-/Land-/Kiosk-Konfiguration im Frontend.

### Installer/App-Center

- Länderprofil bleibt im Installerbereich.
- ioBroker-Systemsprache wird übernommen.
- Energie-Wertkonto wird als App vorbereitet.

## Wichtige Entwicklungsregel

Fachliche Änderungen erfolgen ausschließlich in TypeScript unter `src-ts/**`. Runtime-JavaScript unter `main.js`, `ems/**` und `www/**` ist Build-Artefakt und wird nicht manuell bearbeitet.
