# RC79-Validierungsbericht – NexoWatt UI 0.8.204

**Stand:** 24.08.2026  
**Release-Kandidat:** RC79  
**Paket:** `iobroker.nexowatt-ui@0.8.204`  
**Node.js:** `v22.16.0`  
**npm:** `10.9.2`  
**Browser-Cache:** `nexowatt-cache-v485`

## 1. Umgesetzter Umfang

RC79 erweitert die aus RC78 übernommene signed-NVP-Budgetierung um eine zweistufige Netzbezugsbegrenzung und eine verbrauchsgeführte 0-Einspeiseregelung.

### Import-Soft-/Hard-Limit

- NVP positiv: Netzbezug.
- NVP negativ: Netzeinspeisung.
- Das Hard-Limit bleibt die absolute Bezugs- und Safety-Grenze.
- Das Soft-Limit dient der vorausschauenden Planung flexibler Lasten.
- Die automatische Soft-Reserve beträgt 10 % des Hard-Limits, mindestens 1 kW und höchstens 3 kW.
- Hysterese und verzögerte Wiederfreigabe verhindern Flattern.
- Zentrales EMS-Budget und EVCS-Planung verwenden das Soft-Limit; der finale Hardware-Writer prüft weiterhin das Hard-Limit.

### Dynamische 0-Einspeisung

Die Einstellung befindet sich im AppCenter unter **Netzlimits**. Die PV-Vorgabe folgt der real lokal nutzbaren Leistung:

```text
PV-Soll = PV-Ist + projizierter NVP − NVP-Ziel
```

Berücksichtigt werden reale lokale Last, bestätigte Speicherladung sowie im selben EMS-Zyklus akzeptierte flexible Laständerungen. Erst der verbleibende, lokal nicht nutzbare PV-Überschuss wird abgeregelt. Eine gleichzeitige PV-Abregelung und Speicherentladung wird erkannt; in diesem Konfliktfall wird die PV-Begrenzung unmittelbar aufgehoben.

### Cold-Start-Warnungen

Deaktivierte sicherheitsrelevante Aktormodule initialisieren nun ihre Objektstruktur vor dem bestätigten Safe-Stop. Zusätzlich besitzt der variable Threshold-Ausgang einen stabilen `mixed`-State. Damit werden insbesondere die zuvor gemeldeten fehlenden Objekte unter `thermal.summary.*` und `threshold.rules.r1.*` vor dem ersten State-Write angelegt.

## 2. Release-Gate

Der finale Quellstand wurde mit dem geordneten Release-Plan vollständig geprüft. Wegen der Ausführungslänge wurde der Runner in lückenlosen Diagnosebereichen gestartet; zusammen decken diese **alle 249 von 249 Schritten** ab:

```text
1–80       bestanden
81–126     bestanden
127–160    bestanden
161–200    bestanden
201–237    bestanden
238–249    bestanden
```

Enthalten sind unter anderem:

- vollständiger TypeScript-Typecheck;
- Safety-Envelope und letzter Hardware-Write;
- Speicher, Speicherfarm, EVCS, OCPP/OCPP21, Thermik und Heizstab;
- §14a, Tarif-, NT- und Netzentgeltlogik;
- RC77-PV-Prognose und RC78-Import-only-Budget;
- neuer RC79-Regressionsverbund;
- AppCenter- und Chromium-Regressionen;
- Paket-/Startketten-Smoke-Test.

## 3. TypeScript- und Runtime-Prüfung

```text
TypeScript-Quelldateien:          734 syntaktisch gültig
Produktive Runtimequellen:       118 synchron
Runtime-Parallelspiegel:         480 synchron
Unchecked-Runtime-Zeilen:        160.387 / maximal 160.472
TypeScript-Typecheck:             bestanden
EMS-CJS-Spiegel:                  synchron
```

## 4. RC79-Fachtests

Der RC79-Testverbund prüft unter anderem:

- 30 kW Hard-Limit, 27 kW Soft-Limit und −10,1 kW NVP ergeben 40,1 kW Hard- und 37,1 kW Soft-Headroom;
- Soft-, Hard-, Stale- und Normalstufe;
- automatische Reserve;
- Hysterese und zeitverzögerte Wiederfreigabe;
- Feed-forward-PV-Ziel bei realer lokaler Aufnahme;
- Speicherentladekonflikt bei gleichzeitig abgeregelter PV;
- Mehrwechselrichter-Gruppenpfad;
- Platzierung der 0-Einspeisung unter Netzlimits;
- Cold-Start-Objektinitialisierung vor `deactivate()`;
- Trennung zwischen Soft-Planung und Hard-Safety.

Alle RC79-Fachtests wurden erfolgreich abgeschlossen.

## 5. Paket- und Artefaktprüfung

```text
Release-Artefaktmanifest:         288 explizite Paketdateien geprüft
npm-Tarball:                      289 Dateien einschließlich package.json
Paketgröße:                       7.597.713 Byte
Entpackte Größe:                  17.101.064 Byte
npm shasum (SHA-1):               b08f1ff1623bc17201f09387b9a6dd6a1b10bfe1
npm integrity:                    sha512-JaWsOCNyoLWVWKupkkDLw3mq93z9Ow0V0Q/94FfNV9wo5sEce6TwJOjIV5UO7aw5p5Qh6lOelpitgRbQX5bggA==
TGZ SHA-256:                      61cb565a8b1c58cebfec11c2d234cadd62dd7a50d1ffa10483c474b1844fbedb
```

Das finale TGZ wurde in einen leeren Ordner entpackt und erneut geprüft:

- Syntax von 170 ausgelieferten JS-/MJS-Dateien;
- vollständige Auflösung statischer relativer `require()`-Pfade;
- Konstruktion der `main.js`-/EMS-/§14a-Startkette;
- Versionen in `package.json` und `io-package.json`;
- produktive Soft-/Hard-Limit-Berechnung;
- produktive 0-Einspeise-Feed-forward-Berechnung;
- Speicher-Konfliktschutz;
- AppCenter-Platzierung unter Netzlimits;
- Vorhandensein der Thermal-/Threshold-Objektdefinitionen.

Der Paket-Smoke wurde zusätzlich gehärtet: Eine relative Runtime-Abhängigkeit gilt nur noch dann als vorhanden, wenn sie tatsächlich im npm-Paket enthalten ist. Dadurch wurde die neue RC79-Policy-Datei vor der finalen Ausgabe explizit in die Paketliste aufgenommen und das frisch entpackte TGZ danach erneut erfolgreich geprüft.

### Frisch entpacktes Repository-ZIP

Das vollständige Repository-ZIP wurde ebenfalls in einen leeren Ordner entpackt. Darin wurden erneut erfolgreich ausgeführt:

- Release-Artefaktprüfung mit 288 expliziten Paketdateien;
- Synchronitätsprüfung aller 118 produktiven Runtimequellen;
- Synchronitätsprüfung aller 480 Runtime-Parallelspiegel;
- Paket-/Startketten-Smoke mit 170 JS-/MJS-Dateien;
- vollständiger RC79-Testverbund;
- RC78-Import-only-Regressionsverbund;
- RC77-PV-Prognose-Statecache-Regressionsverbund.

Das Repository-ZIP enthält 1.690 Projektdateien und weder `node_modules` noch `build-ts`.

## 6. npm-Publish-Prüfung

`npm publish --dry-run --ignore-scripts` wurde erfolgreich abgeschlossen und bestätigt Paketname, Version, Dateiliste, Größe und Tarball-Metadaten.

Der vollständige `npm publish --dry-run` mit aktivem `prepublishOnly` wurde in der Build-Umgebung korrekt **fail-closed** blockiert, weil `registry.npmjs.org` wegen `getaddrinfo EAI_AGAIN` nicht erreichbar war. Daher konnte hier nicht verbindlich bestätigt werden, ob Version `0.8.204` im npm-Registry noch frei ist. Auf dem Veröffentlichungsrechner prüft der vorhandene Guard dies unmittelbar vor dem echten Publish erneut.

## 7. Feldabnahme

Die Software- und Paketprüfungen sind abgeschlossen. Die Inbetriebnahme an der realen Anlage muss zusätzlich bestätigen:

- korrektes NVP-Vorzeichen und korrekte Einheit;
- reale WR-Schreibrichtung und Readback;
- tatsächliche Speicher-Vorzeichenkonvention;
- Einhaltung von Soft-/Hard-Limit bei trägen OCPP- und Modbus-Aktoren;
- keine Warnungen zu den genannten Thermal-/Threshold-States nach einem vollständigen Adapterneustart;
- stabile 0-Einspeisung über einen vollständigen PV-Tag.

Diese Feldprüfung ist notwendig, weil Kommunikationslatenzen, Hersteller-Firmware und reale Messwertqualität nicht vollständig in einem lokalen Softwaretest simuliert werden können.
