# NexoWatt EOS Admin 7.9.70 – Stabilitätskonsolidierung

## Ziel

Diese Version friert den Funktionsausbau ein und konsolidiert die Oberfläche auf einen einzigen Frontend-Runtime-Stand. Grundlage ist der bewährte v7.9.57/v7.9.58-Datenpunkt- und Header-Stand. Die späteren v62–v69 DOM-/Toolbar-Hotfix-Skripte werden nicht geladen.

## Enthalten

- ein v70 Module-Federation-/React-DnD-Runtime-Graph
- native ioBroker-Datenpunktlogik (`common.write`)
- `eos-admin.0` geschützt; zusätzliche Instanzen löschbar
- bestimmte Adapterversion im Expertenmodus
- klickbare Modulaktionen und Dialog-Auswahllisten
- nur ein gemeinsam getakteter DOM-Observer für Branding, Rollen und Security
- Rollen Admin / Installateur / Endkunde
- Rollenabfrage mit Retry ohne falschen Endkunden-Fallback
- reversible, von EOS gesetzte Legacy-Admin-ACL ohne Überschreiben späterer Fremdänderungen
- reduzierte Security-Guard-Frequenz und engeres Objekt-Abonnement
- unverfälschte Browser-Konsole für Diagnose

## Prüfungen

- `npm run check:eos-package`
- `npm run check:eos-stability` (Runtime-Graph, Policy-Selbsttest und Observer-Prüfung)
- JavaScript-Syntaxprüfung aller ausgelieferten Dateien
- TypeScript-/TSX-Transpile-Parserprüfung
- statische Import-/Dateireferenzprüfung
- ZIP-Integritätsprüfung

## Hinweis

Ein vollständiger Vite-Neubau war in der isolierten Prüfungsumgebung wegen fehlendem npm-Registry-Zugriff nicht möglich. Deshalb wurde bewusst der letzte zusammenhängende, bereits gebaute Frontend-Stand verwendet und als einheitlicher v70-Graph neu verpackt. Das vermeidet den bisherigen Mix aus v57/v61/v67/v69-Artefakten. Vor Produktivfreigabe ist der beigefügte On-Host-Smoke-Test durchzuführen.
