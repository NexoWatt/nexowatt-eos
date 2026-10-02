# NexoWatt UI 0.8.179 RC55 – Publish-Fix-Validierung

## Ursache

Das RC55-ZIP enthielt bereits `package.json`, `package-lock.json` und `io-package.json` mit Version `0.8.179`, aber `scripts/release-artifact-manifest.json` war unverändert aus RC54 übernommen worden. Es trug weiterhin Version `0.8.178` und die RC54-Dateihashes. Dadurch musste `npm publish` beim read-only Artefakt-Guard abbrechen.

## Korrekturen

- Release-Artefaktmanifest vollständig für `iobroker.nexowatt-ui@0.8.179` neu erzeugt.
- Alle 253 explizit freigegebenen Paketdateien erneut gehasht.
- `www/manifest.webmanifest` auf `0.8.179` synchronisiert.
- PWA-/Frontend-Cachekennung und Tarif-Provider-User-Agent aus den kanonischen TypeScript-Runtimequellen auf `0.8.179` aktualisiert und die JavaScript-Runtime daraus neu erzeugt.
- `scripts/ts-nocheck-budget.json`, Admin-Bundle-Cachekennung, Publish-Hinweise, Changelog und ioBroker-News auf RC55 synchronisiert.
- Keine fachliche Lade-, Speicher-, §14a-, Parkregler-, Heizstab- oder Geräte-Steuerlogik verändert.

## Bestandene Prüfungen

- `npm run publish:check`
- `node scripts/verify-publish.js`
- `node scripts/verify-ts-nocheck-budget.js`
- `node scripts/build-ts-runtime-executables.js --check`
- `node scripts/build-ts-runtime-mirrors.js --check`
- `npm run test:rc55:auto-arbitration`
- `npm pack --dry-run --ignore-scripts`

Ergebnis des Paket-Trockenlaufs:

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.179`
- npm-Dateien: 254 inklusive automatisch hinzugefügter `package.json`
- Explizit durch das Release-Artefaktmanifest geprüfte Produktdateien: 253

## Registry-Prüfung

Die Registry-Abfrage konnte in der isolierten Build-Umgebung wegen DNS `EAI_AGAIN` nicht erneut ausgeführt werden. Im vom Anwender gemeldeten Publish-Lauf war der vorherige Schritt `release:check-version-free` bereits erfolgreich abgeschlossen; der Abbruch erfolgte erst im nachfolgenden Artefakt-Guard.
