# NexoWatt EOS Admin v7.9.49 – DP Write & Performance Fix

## Ziel

Dieser Patch stabilisiert das manuelle Beschreiben von Datenpunkten in der Datenpunkte-/ObjectBrowser-Oberfläche und reduziert unnötige Frontend-Arbeit auf großen Objektlisten.

## Behobene DP-Write-Probleme

- Direkte Switch-/Button-Schreibvorgänge schreiben jetzt immer mit `ack: false` und `q: 0`.
- Boolean-Werte werden nicht mehr per JavaScript-Truthiness ausgewertet.
  - Vorher konnte der String `"false"` als truthy gelten und dadurch wieder `false` geschrieben werden.
  - Jetzt werden `true`, `1`, `"1"`, `"true"`, `"on"`, `"yes"` sauber als TRUE erkannt; alles andere bleibt FALSE.
- Wenn ein State beim ersten Klick noch nicht im lokalen Cache liegt oder `(null)` ist, wird vor dem Toggle nach Möglichkeit `getState()` verwendet; Unknown/Null toggelt kontrolliert auf `true`.
- Die lokale State-Anzeige wird nach erfolgreichem Direkt-Write sofort aktualisiert, damit der Benutzer direkt Feedback bekommt.
- Der Wertdialog schreibt direkt über `socket.setState(id, { val, ack, q, expire })` und schließt erst nach erfolgreichem Write.
- Der Wertdialog blockiert doppelte Schreibvorgänge, solange ein Write läuft.
- Der Boolean-Switch im Wertdialog ist jetzt controlled und behandelt Strings wie `"false"` oder `"0"` korrekt.
- Der JSON/Object-Typ im Wertdialog verwendet wieder den korrekten internen Typ `json`.

## Performance-Fixes

- Der ObjectWorker sendet keine Change-Events mehr für unveränderte Objekte.
- Die EOS Object-State-Hilfsschicht scannt die gesamte Seite nicht mehr alle 2,5 Sekunden.
- Value-Cell-Titles werden nur noch aktualisiert, wenn ID, Schreibstatus oder sichtbarer Wert wirklich geändert wurden.
- Die Role-UI beobachtet keine `title`-Änderungen mehr, damit die ObjectBrowser-Hover-/Title-Helfer keine Apply-Schleifen erzeugen.

## Beibehalten aus den vorherigen Fixes

- Delete-Service-Hardfix
- Delete-Logquiet-Fix
- 3-Rollen-Guard: Admin, Installateur, Endkunde

## Version

- `package.json`: 7.9.49
- `io-package.json`: 7.9.49
- `src-admin/src/version.json`: 7.9.49
- Cache-Buster: `v=49`
