# TypeScript Schritt 0.7.70 – Source-Integrity-Stabilisierung

## Zweck

Diese Version fügt eine zusätzliche Integritätsprüfung für den TypeScript-Quellbaum `src-ts/` hinzu.
Der Schritt ist eine Reaktion auf beschädigte oder unvollständige TS-Dateien, die durch Merge-Konflikte,
abgebrochene Kopierstände oder unsaubere ZIP-Übernahmen entstehen können.

## Was geprüft wird

Der neue Befehl

```bash
npm run check:ts-source-integrity
```

prüft:

- ob wichtige Kern-Dateien unter `src-ts/` vorhanden sind,
- ob TypeScript-Dateien leer sind,
- ob Git-Konfliktmarker wie `<<<<<<< HEAD` vorhanden sind,
- ob Dateien offensichtlich mitten in einem Kommentar, String oder Klammerblock enden.

## Warum ohne TypeScript-Compiler?

`publish:check` soll weiterhin ohne lokales `npm install` funktionieren.
Darum ist dieser Check ein reiner Node.js-Check. Der vollständige TypeScript-Compilerlauf bleibt weiterhin:

```bash
npm run typecheck
```

## Zusammenhang zur Migration

Dieser Schritt ändert keine produktive Runtime-Logik. Er schützt nur die Migrationsbasis, damit weitere
TS-Schritte nicht auf beschädigten Quellen aufbauen.

## Weiteres Vorgehen

Nach 0.7.70 können wir wieder kleinere Migrationsschritte machen. Vor jedem Commit sollten mindestens laufen:

```bash
npm run check:conflicts
npm run check:ts-source-integrity
npm run publish:check
```
