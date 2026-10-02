# 0.7.91 – KI-Berater-Runtime gezielt typisieren

## Ziel

Diese Version typisiert den TypeScript-Parallelspiegel des KI-Energieberaters:

```text
src-ts/runtime-mirrors/ems/modules/ai-advisor.ts
```

Die produktive Runtime bleibt weiterhin:

```text
ems/modules/ai-advisor.js
```

## Was wurde typisiert?

- Adapter-Zugriff und StateCache-Formen
- Datenpunkt-Registry-Vertrag
- KI-Konfiguration und Kategorien
- Vorschlagsobjekte (`AiAdvisorSuggestion`)
- Tagesplan- und Lernzustände
- Snapshot-/Speicher-SoC-Hilfsformen
- zentrale Klassenfelder von `AiAdvisorModule`

## Warum bleibt `@ts-nocheck` noch in der Datei?

Die Datei ist groß und historisch dynamisch gewachsen. Für den normalen Projekt-Typecheck bleibt sie vorerst geschützt.
Der neue Check nimmt aber eine temporäre Kopie, entfernt `@ts-nocheck` und kompiliert diese im gelockerten Migrationsmodus.

## Wichtige Regel

Der KI-Berater bleibt rein beratend und darf keine Geräte schalten. Diese Regel gilt auch für die spätere TypeScript-Runtime.
