# RC56 Validierungsbericht

## Artefakt

- Paket: `iobroker.nexowatt-ui`
- Version: `0.8.180`
- Release: `RC56`
- Zweck: kontrollierter Feldtest der Betriebsstrategien über vorhandene EOS-Single-Writer-Fachmodule

## Wesentliche Sicherheitsinvarianten

- Die Strategy Engine besitzt keinen direkten Hardware-Writer.
- Produktive Anforderungen sind kurzlebig und verfallen nach der konfigurierten TTL.
- Ladepunkte nehmen ausschließlich bei `Auto → EOS Betriebsstrategie` teil.
- Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel bleiben eigenständige Betriebsarten.
- Speicherstrategien können vorhandene Schutz-/SoC-Untergrenzen nur erhöhen.
- Thermik und Heizstab werden nur im vorhandenen PV-Auto-Modus beeinflusst.
- §14a, Parkregler, Stations-, Netz-, Phasen- und Gerätebegrenzungen bleiben übergeordnet.
- Benutzerdefinierte Schreibdatenpunkte bleiben im Beobachtungsbetrieb.
- Nur aktive, einzeln aktivierte und sinnvoll zugeordnete EOS-Geräte werden angezeigt.

## Erfolgreiche Prüfungen

- `npm run test:types`
- `npm run check:ts-runtime-executables`
- `npm run check:ts-runtime-mirrors`
- `npm run test:rc56:operating-strategies-fieldtest`
- `npm run test:rc56:operating-strategies-browser`
- `npm run test:rc55:auto-arbitration`
- `npm run test:rc55:fail-closed`
- `npm run test:charging-productive-hardening`
- `npm run test:actuator-c3-thermal-heating`
- `npm run test:heating-rod-productive`
- `npm run test:heating-rod-runtime-evaluation`
- `npm run test:storage-control-functional-safety`
- `npm run test:storage-control-runtime-scenarios`
- `npm run test:ems-shadow-runtime`
- `npm run publish:check`
- `node scripts/verify-publish.js`
- `npm pack --dry-run --ignore-scripts`

## Browserprüfung

Ein echter Chromium-Test bestätigte:

- deaktivierte oder leere Thermik-, Heizstab-, Ladepunkt- und Speicherplätze werden nicht angezeigt,
- nur fünf tatsächlich aktive Testressourcen erscheinen,
- Ressourcenkarten starten kompakt und eingeklappt,
- Live-Freigaben werden nur für native, bestätigte Ressourcen übernommen,
- veraltete Ressourcenlinks werden automatisch auf Beobachtung zurückgesetzt,
- benutzerdefinierte Schreibressourcen bleiben fail-closed im Beobachtungsmodus,
- keine Browser-Ausnahme und kein horizontaler Überlauf.

## Publish-Artefakt

Das Release-Artefaktmanifest enthält `256` freigegebene Paketdateien. Die beiden neuen produktiven Runtime-Dateien sind ausdrücklich Bestandteil des npm-Pakets:

- `ems/modules/operating-strategies.js`
- `ems/services/operating-strategy-runtime.js`

`npm pack --dry-run` bestätigte:

- Paketversion `0.8.180`
- 257 npm-Dateien einschließlich `package.json`
- Paketgröße ungefähr 7,3 MB
- entpackte Größe ungefähr 16,4 MB

## Externe npm-Registry-Prüfung

Die lokale Release-Prüfung der Versionsfreiheit konnte in der isolierten Containerumgebung wegen `EAI_AGAIN registry.npmjs.org` nicht abgeschlossen werden. Der vorhandene `prepublishOnly`-Guard arbeitet fail-closed und prüft die Versionsfreiheit beim späteren `npm publish` erneut. Alle lokalen Versions- und Artefaktprüfungen für `0.8.180` sind bestanden.

## Bewusster Feldtestumfang

RC56 ist für native EOS-Ressourcen vorgesehen, die bereits über Lade-, Speicher-, Thermik- oder Heizstab-Fachmodule angebunden sind. Die Strategy Engine kann in diesem Umfang nach vollständiger Inbetriebnahmefreigabe aktiv berücksichtigt werden. Frei zugeordnete generische Schreibdatenpunkte sind noch nicht produktiv freigegeben.
