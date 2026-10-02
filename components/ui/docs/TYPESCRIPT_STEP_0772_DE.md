# 0.7.72 - TypeScript NodeNext-Umstellung

## Ziel

Diese Version stellt die TypeScript-Konfigurationen von `Node16/node16` auf den moderneren NodeNext-Modus um.

## Warum

Wir zielen mit dem Adapter auf Node.js 22/24. In TypeScript gibt es kein `node22` oder `node24` als `moduleResolution`. Der zukunftsfähige Modus für direkt in Node laufende TypeScript-Projekte ist `module: NodeNext` zusammen mit `moduleResolution: nodenext`.

## Wichtig

- Das ändert keine produktive Adapter-Runtime.
- `main.js`, Energiefluss, Heizstab, KI, History und SmartHome bleiben unverändert.
- Frontend-MJS-Spiegel behalten `moduleResolution: Bundler`, weil sie browsernahe ESM-Ausgabe vorbereiten.
- `ignoreDeprecations` bleibt verboten, damit wir Probleme nicht verstecken.

## Pflege-Regel

Neue Node-nahe `tsconfig*.json` Dateien müssen verwenden:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "nodenext"
  }
}
```

Browser-/Bundler-nahe Frontend-Mirror-Configs dürfen verwenden:

```json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "Bundler"
  }
}
```
