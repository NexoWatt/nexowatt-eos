# NexoWatt Kommentarstandard DE

Diese Datei beschreibt, wie der Code ab Version 0.7.54 dokumentiert werden soll.

## Ziel

Jeder fachlich relevante Code-Teil soll direkt im Code erklären:

1. **Zweck:** Was macht dieser Teil?
2. **Zusammenhang:** Welche UI-, API-, State- oder EMS-Bausteine hängen daran?
3. **Wartung/TypeScript:** Was muss beim späteren TypeScript-Umbau typisiert und geprüft werden?

## Kommentar-Tiefe

- Datei-Kopf: erklärt die Gesamtverantwortung der Datei.
- Funktion/Klasse/Methode: erklärt den lokalen Zweck und die wichtigsten Abhängigkeiten.
- Kritische Abschnitte: erhalten zusätzliche Hinweise, z. B. DP-Fallbacks, Lizenzschutz, History, Heizstab, Speicher und KI.

## Wichtig

Kommentare dürfen die Logik nicht ersetzen. Bei jeder späteren Code-Änderung müssen Kommentar und Code gemeinsam aktualisiert werden.

## Verbindliche Regeln für neue Änderungen

Kommentare sollen nicht jede einzelne Codezeile wiederholen. Sie dokumentieren die fachliche Absicht und die Sicherheitsinvarianten, die beim Refactoring erhalten bleiben müssen.

### Kommentieren

- Vorzeichen- und Einheitenverträge, z. B. `NVP > 0 = Netzbezug` und `NVP < 0 = Einspeisung`.
- Prioritäten, Safety-Grenzen und Gründe für `fail-closed` beziehungsweise kontrollierte Fallbacks.
- Timeouts, Hysterese, Entprellung und Quarantäne asynchroner Operationen.
- Unterschiede zwischen Überwachung, Warnung, aktiver Begrenzung und Hard-Stop.
- Abhängigkeiten zwischen kanonischer TypeScript-Quelle, generierter Runtime und Runtime-Spiegel.
- Bewusste Kompatibilitätswege für ältere EOS-/ioBroker-Versionen.

### Nicht kommentieren

- Offensichtliche Zuweisungen oder Syntax, die der Code bereits eindeutig ausdrückt.
- Historische Annahmen, die nicht mehr durch Test oder aktuellen Vertrag belegt sind.
- Kommentare, die eine andere Logik beschreiben als der tatsächlich ausgeführte Code.

### Änderungsablauf

1. Fachliche Invariante in der kanonischen TypeScript-Quelle kommentieren.
2. Passenden Regressionstest ergänzen oder aktualisieren.
3. Produktive JavaScript-Runtime und Runtime-Spiegel aus der kanonischen Quelle synchronisieren.
4. Kommentar, Code und Test gemeinsam prüfen.

Generierte Dateien werden nicht separat von Hand kommentiert. Ihre Kommentare stammen aus der synchronisierten TypeScript-Quelle, damit keine widersprüchlichen Erklärungen entstehen.
