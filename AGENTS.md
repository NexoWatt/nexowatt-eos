# NexoWatt EOS: verbindlicher Arbeitsablauf

Nutzerentscheidung vom 03.10.2026: Autorisierte Änderungen werden in diesem
Repository direkt auf **`main`** bearbeitet, committet und veröffentlicht.
Keine neuen Feature-, Test- oder Arbeitszweige ohne ausdrücklichen Nutzerauftrag
anlegen. Bestehende historische Zweige sind keine Vorgabe für neue Arbeiten.

Vor Änderungen den aktuellen Zweig, Arbeitsbaum und Remote-Stand prüfen.
`main` bei sauberem Arbeitsbaum zunächst mit `origin/main` abgleichen; fremde
Änderungen erhalten. Keine erzwungenen Pushes oder Umschreibung veröffentlichter
Historie. Uncommittete Nutzeränderungen nicht verwerfen. Diese Vorgabe ersetzt
ältere Aufforderungen in Projektdokumenten, grundsätzlich Arbeitszweige anzulegen.

Die aktuelle Installationsanleitung ist die README auf `main`:
https://github.com/NexoWatt/nexowatt-eos/blob/main/README.md
Aktive Anleitungen verweisen auf `main`. Historische Commit-/Zweigangaben in
Prüfbelegen bleiben als Herkunftsnachweis erhalten. Bereits gebundene oder
signierte Lieferdateien und die Hash-Pins des Installationsbefehls nicht allein
wegen eines Zweigwechsels verändern.

Die Sicherheitsvorgaben in `CLAUDE.md`, `docs/security/ACCEPTANCE.md` und
`PARAMETERS.md` gelten weiter. Komponentenspezifische Vorgaben zusätzlich lesen,
insbesondere vor UI-Arbeiten `components/ui/docs/AGENTS.md`. Passende Prüfungen
ausführen und deren tatsächlichen Umfang dokumentieren. Nicht ausgeführte
Pi-, Installations- und Hardwaretests ausdrücklich als **OFFEN** kennzeichnen.
Ein Commit auf `main` bedeutet keine Produktions- oder Anlagenfreigabe.
