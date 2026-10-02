# NexoWatt UI 0.8.164 RC40 – TypeScript- und Release-Stabilisierung

## Ziel

RC40 verändert bewusst keine fachlichen EMS-Grenzwerte oder Prioritäten. Der Stand macht die in RC39 eingeführte fail-closed Sicherheitsarchitektur dauerhaft wartbar: Schnittstellenbrüche sollen bereits beim Kompilieren blockieren und nicht erst in einem Feldtest sichtbar werden.

## Verbindlicher Qualitätsvertrag

Der vollständige Projekt-Typecheck muss ohne Diagnose enden. `npm run publish:check` startet deshalb mit der Compiler-/DevDependency-Vorprüfung und unmittelbar danach mit `npm run typecheck` und führt danach die vorhandenen Laufzeit-, Safety-, Lade-, Speicher-, §14a-, Runtime-Mirror-, UI- und Packaging-Regressionen aus. `prepublishOnly` behält die Prüfung auf eine freie npm-Version als ersten Schritt und ruft anschließend dasselbe vollständige Gate auf.

Unter Windows wird dieses Gate nicht mehr als eine einzige lange `cmd.exe`-Kette ausgeführt. `scripts/publish-check-runner.js` liest die unverändert geordnete Liste aus `scripts/publish-check-plan.json`, validiert alle 202 Schritte und startet jeden Prozess einzeln ohne Shell-Gesamtkette. Damit bleiben sämtliche Prüfungen verpflichtend, während die Windows-Grenze für Befehlszeilen nicht mehr erreicht wird.

## Typisierte sicherheitskritische Grenzen

Explizit gehärtet wurden insbesondere:

- SafetyEnvelope und finale Hardware-Write-Freigabe;
- §14a-/EEBUS-Direkt-API und Heartbeat-/Gültigkeitszustände;
- FENECON-Reglerhoheit und Sollwertberechnung;
- Ladebudget- und EVCS-Einheitenhelfer;
- Modulmanager, NexoLogic-Budget und Schwellwertsteuerung;
- Speicher-Datenpunktkonfiguration;
- Energieherkunft, Ledger-Runtime und API-Brücken;
- Sprach-, Browser- und Frontend-Runtime-Grenzen.

## Behobener Bestandsfehler

Beim Erzeugen neuer Schwellwertregeln wurden `minOnSec` und `minOffSec` mit einem überzähligen Argument angelegt. JavaScript ignorierte dadurch den vorgesehenen Wert `0`; an der tatsächlichen Default-Position landete `true`. RC40 korrigiert die Aufrufe und prüft im Laufzeittest, dass beide Datenpunkte mit dem numerischen Standardwert `0` Sekunden entstehen.

## Verbleibende Migrationsschuld

Der Gesamt-Typecheck ist grün. 58 größere Alt-Runtime-Dateien tragen weiterhin bewusst `@ts-nocheck`; ihr Bestand und ihre gesamte Zeilenzahl dürfen durch das No-Growth-Gate nicht wachsen. Diese Dateien werden in späteren, kleinen Funktionspaketen schrittweise typisiert, ohne funktionierende Feldlogik gleichzeitig umzubauen.

## Feldtest

RC40 sollte unverändert über denselben Anlagenablauf wie RC39 getestet werden. Besonders zu beobachten sind FENECON/FEMS-Übergaben, §14a-Stopps, NVP-/Phasenausfall, Mehrfachladung, Speicher-Netzladung und Schwellwertaktoren. Eine Abweichung lässt sich dadurch klar RC40 zuordnen.
