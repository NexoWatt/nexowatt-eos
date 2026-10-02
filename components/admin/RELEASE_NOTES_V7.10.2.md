# Release Notes – NexoWatt EOS Admin 7.10.2

## Kritischer Stabilitätsfix

Der in 7.10.1 neu eingeführte Stable-Update-Manager speicherte bei jedem Start einen neuen Zeitstempel in der Native-Konfiguration der laufenden `eos-admin.0`-Instanz. ioBroker behandelt eine Änderung dieser Instanzkonfiguration als Neustartgrund. Dadurch entstand eine permanente Start-/Stop-Schleife. Während dieser Schleife wurden Browser-Bundles nur teilweise übertragen; daraus entstanden `ERR_INCOMPLETE_CHUNKED_ENCODING`, fehlgeschlagene dynamische Imports und `ERR_CONNECTION_REFUSED` für CSS-Dateien.

7.10.2 speichert Einstellung und Laufzeitstatus ausschließlich in quittierten Adapter-States. Der Update-Abgleich startet verzögert und schreibt unveränderte Adapter-/Repository-Richtlinien nicht erneut.

## Paketvollständigkeit

Das Backend und das Frontend sind in der Repository-ZIP bereits vollständig kompiliert. Die Release-Lifecycle-Skripte führen vor `npm pack` und `npm publish` ausschließlich dependency-freie Node.js-Prüfungen aus; `tsc`, `tsx`, `npm install` und `npm ci` werden nicht benötigt. Ein SHA-256-Manifest versiegelt den geprüften Quell- und Buildstand. Zusätzlich verfolgt der Backend-Runtime-Test die lokale Modulabhängigkeitskette ab `build/main.js`, führt einen Syntaxcheck aus und verifiziert die Abdeckung jeder Runtime-Datei durch die explizite npm-Dateiliste. Der Test startet innerhalb von `prepublishOnly` keinen verschachtelten `npm pack`-/`npm.cmd`-Prozess mehr; der endgültige Paketinhalt wird separat durch `npm publish --dry-run` geprüft. Damit wird insbesondere ein fehlendes `build/lib/eosRequestSecurity.js` vor einer Veröffentlichung erkannt.
