# 0.7.71 – TypeScript-7-kompatible tsconfig-Struktur

## Zweck

Diese Version repariert die VS-Code-/TypeScript-Warnung zur veralteten Modulauflösung.

VS Code meldete sinngemäß:

```text
Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0.
```

Ursache war nicht, dass wir bewusst TypeScript 6 oder 7 falsch nutzen, sondern dass
`moduleResolution: "Node"` in TypeScript als alter Alias für `node10` gilt.

## Änderung

Die Basiskonfiguration wurde modernisiert:

```json
{
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16"
  }
}
```

Für Browser-/MJS-Spiegel bleibt bewusst eine eigene Konfiguration erhalten:

```json
{
  "module": "ES2022",
  "moduleResolution": "Bundler"
}
```

## Warum nicht `ignoreDeprecations`?

Wir unterdrücken die Warnung nicht mit:

```json
"ignoreDeprecations": "6.0"
```

Stattdessen wurde die Ursache behoben. So bleiben die TypeScript-Konfigurationen für
zukünftige Compiler-Versionen besser wartbar.

## Neuer Check

Neu:

```bash
npm run check:tsconfig-modern
```

Der Check prüft alle `tsconfig*.json`-Dateien und verhindert:

- `moduleResolution: "Node"`
- `moduleResolution: "node10"`
- falsche Kombinationen wie `moduleResolution: "Node16"` mit `module: "CommonJS"`

## Keine Runtime-Änderung

Diese Version ändert keine produktive Adapterlogik.

Nicht geändert:

- Energiefluss
- Speicher-DP-Resolver
- Heizstab
- KI-Berater
- History
- SmartHome
- Lizenz
- info.connection
- Frontend-Design


## Aktualisierung ab 0.7.72

Die vorherige Zwischenlösung `Node16/node16` wurde durch `NodeNext/nodenext` ersetzt. Hintergrund: Für unser Ziel Node.js 22/24 gibt es in TypeScript kein `node22` oder `node24`; der moderne Node-Modus ist `nodenext`.
