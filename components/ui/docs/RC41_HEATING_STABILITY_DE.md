# NexoWatt UI 0.8.165 RC41 – Heizstab- und Diagnose-Stabilisierung

## Ziel

RC41 ist ein eng begrenztes Stabilisierungspaket. Es verändert keine Netzanschluss-, Phasen-, §14a-, EVCS-, Speicher-, FENECON- oder SafetyEnvelope-Grenzwerte aus 0.8.164. Im Mittelpunkt steht die im Feld sichtbare Meldung `heating-rod-ts-shadow ... targetPowerW` sowie ein plattformabhängiger Entwicklungstest der Energieherkunft.

## Einheitliches Heizstab-Leistungsmodell

Die produktive Heizstabregelung verwendet ein aus der real gemessenen Leistung angelerntes Stufenmodell. RC41 übergibt dieselbe kumulierte Stufenleistung und denselben `stagePowerScale` an den TypeScript-Entscheidungspfad. Mehrere gleich große Einzelstufen werden dadurch korrekt als kumulierte Gesamtleistung bewertet.

## Diagnose ohne Warnspam

Eine reine Abweichung des modellierten `targetPowerW` bei identischer Zielstufe ist keine Schaltabweichung. Sie bleibt in der Shadow-Diagnose sichtbar, erzeugt jedoch keine zyklische Warnmeldung und blockiert die produktive Entscheidung nicht.

Eine abweichende `targetStage` bleibt dagegen sicherheitsrelevant. Auch wenn der TypeScript-Normalpfad aktiv ist, wird eine solche Entscheidung nicht an die Hardware übergeben; die bewährte JavaScript-Sicherheitsreferenz gewinnt fail-closed.

## Saubere Vergleichsgrenzen

Der Heizstab-Shadowvergleich läuft nur für den tatsächlich erreichten produktiven PV-Auto-Pfad. Manuelle oder externe Vorgaben, deaktivierte Geräte, §14a-Begrenzungen, Schutzabschaltungen sowie 0-Einspeise- und Forecast-Sonderpfade werden nicht mit einem fachlich unpassenden Standardmodell verglichen.

## Windows-/Linux-Testparität

Der Energieherkunft-/Ledger-Routentest normalisiert Pfadtrenner. Windows-Pfade mit Backslashes und Linux-Pfade mit Schrägstrichen werden identisch bewertet. Dadurch kann der interne Entwicklungstest nicht mehr allein wegen des Betriebssystems fehlschlagen.

## Release- und Feldtestvertrag

Der Anwender-Publishweg bleibt bewusst einfach und unverändert: NPM-READY-ZIP einspielen und `npm publish` ausführen. Dabei laufen nur die freie npm-Versionsprüfung und die read-only Artefaktprüfung. Es werden keine Runtime-Dateien gebaut oder synchronisiert und weder `npm ci` noch ein bestimmter lokaler TypeScript-Compiler benötigt.

Für den Feldtest sind insbesondere zu beobachten:

- keine wiederkehrende `targetPowerW`-Warnung bei identischer Heizstufe;
- plausible Werte für Zielstufe, Ziel- und Istleistung;
- unveränderte Reaktion auf §14a-, Netzanschluss- und SafetyEnvelope-Stopps;
- keine unerwartete Schaltung in manuellen oder extern übernommenen Betriebsarten.
