# RC73 – EOS Admin EMS-Live-Diagnose: Merge-Validierung

## Zweck

Dieses Merge-Paket integriert die responsive **NexoWatt EMS – Live-Diagnose** in die Cockpit-Übersicht des jeweils aktuellen `ioBroker.eos.admin`-Quellrepositorys.

Es ist bewusst kein eigenständiges npm-Paket. Der Patch wird in den aktuellen EOS-Admin-Quellstand kopiert, dort gebaut, vollständig geprüft, auf eine freie Version gesetzt und anschließend über den bestehenden Admin-Releaseprozess veröffentlicht.

## Geprüfte Quellanker

Der Patch verwendet stabile, im aktuellen EOS-Admin-Master vorhandene Anker:

```text
src-admin/src/tabs/Intro.tsx
import IntroCardCamera from '@/components/Intro/IntroCardCamera';

{this.getInstancesCards()}
{this.getLinkCards()}
```

Die Komponente wird unmittelbar nach den regulären Cockpitkarten eingebunden und nutzt damit die freie, responsive Cockpitfläche.

## Komponente

Datei:

```text
src-admin/src/components/Intro/NexoWattEmsOverview.tsx
```

Geprüfte Eigenschaften:

- typisierte React-/TypeScript-Komponente;
- liest `nexowatt-ui.*.info.adminOverview.*`;
- berücksichtigt `system.adapter.nexowatt-ui.*.alive`;
- wählt bei mehreren Instanzen die aktuelle, aktive Instanz;
- Polling maximal alle fünf Sekunden;
- Polling pausiert bei unsichtbarem Browserreiter;
- Offline-/Stale-Erkennung nach 20 Sekunden;
- rollenabhängige technische beziehungsweise reduzierte Darstellung;
- fehlende Module werden automatisch ausgeblendet;
- maximal sechs sichtbare Ereignisse;
- Link zur vollständigen NexoWatt-UI-Diagnose;
- keine `setState`, `setForeignState`, `sendToHost` oder andere ioBroker-Schreiboperation.

## Merge-Sicherheit

`tools/nexowatt-apply-ems-overview.cjs`:

- bricht bei unbekanntem/inkompatiblem Admin-Quellstand fail-closed ab;
- fügt Import und Komponente idempotent ein;
- ergänzt responsive CSS nur einmal;
- ergänzt den Selftest nur einmal in `package.json.files` und `check:eos-stability`;
- verändert keine Rollen-, Login-, Datenpunkt-, Update- oder Backendlogik.

Der Patch wurde in einer frischen Quellfixture zweimal nacheinander ausgeführt. Import, Komponente und Stabilitätsprüfung blieben jeweils einmalig vorhanden.

## Prüfungen im Merge-Paket

- Merge-Patcher: bestanden;
- idempotenter zweiter Patchlauf: bestanden;
- statischer Read-only-Selftest: bestanden;
- isolierter strikter TypeScript-Test der Komponente: bestanden;
- responsive CSS-Marker: bestanden;
- keine ioBroker-Schreiboperation in der Komponente: bestanden.

## Prüfung im echten EOS-Admin-Repository

`MERGE_UPDATE.cmd` beziehungsweise `MERGE_UPDATE.sh` führt im Zielrepository aus:

```text
node tools/nexowatt-apply-ems-overview.cjs
npm run build
npm run check:eos-package
npm run check:eos-stability
```

Damit wird die tatsächliche Admin-Version erst dann zur Veröffentlichung freigegeben, wenn der vollständige vorhandene EOS-Admin-Build und alle dort registrierten Stabilitätsprüfungen einschließlich des neuen EMS-Overview-Selftests bestehen.
