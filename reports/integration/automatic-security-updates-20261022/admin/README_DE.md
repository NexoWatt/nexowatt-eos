# Admin: Node.js und automatische Linux-Sicherheitswartung

Stand: 22.10.2026, Ausgangscommit `99ef5086bc5b0ee590de17e109b85e4738c973ae`.
Die genaue Dateibindung und tatsächlich ausgeführten Prüfungen stehen in
[verification.json](verification.json).

Der bestehende EOS-Update-Dialog zeigt die installierte und die angebotene
Node.js-Version. Er weist darauf hin, dass die Laufzeit zum geprüften EOS-Paket
gehört. Rollen, Same-Origin-Prüfung, Wartungsbestätigung und der getrennte
Systemdienst bleiben erhalten. Die HTTP-Schnittstelle wird um den unabhängig
geprüften Linux-Status ergänzt; ein neues privilegiertes Kommando entsteht nicht.

Ein fester, root-geschützter Statusleser gibt nur geprüfte Zeitpunkte, Zähler
und Zustandswerte zurück. Offene oder blockierte Sicherheitsupdates,
zurückgestellte Paket-Dienstaktionen, Aktivierungs-/Neustartbedarf sowie
fehlende, veraltete und fehlerhafte Daten bleiben erkennbar. Ein erfolgreicher
Paketlauf wird nicht als vollständige Aktivierung ausgegeben. Ein EOS-Erfolg
überschreibt keinen Linux-Fehler. Der Linux-Status kann bei einem vorübergehend
nicht erreichbaren EOS-Updatedienst weiterhin angezeigt werden.

## Tatsächliche Prüfungen

- Vollständiger lokaler TypeScript-Backend-Build erfolgreich; vorhandene
  JavaScript-Quellen werden durch den etablierten Build unverändert kopiert.
- 43 Status-/Dateigrenzen-/HTTP-Prüfungen erfolgreich. Sie prüfen unter anderem
  ungültige Typen/Zeitpunkte, unbekannte Zustände, defekte oder veränderliche
  Dateien, Root-/Link-/Größengrenzen, Cache-Verhalten, Rollenwiderruf,
  Same-Origin, geheimnisarme Fehler und unabhängige Wartungszustände.
- Browser-Skript und vier Chromium-Szenarien syntaktisch geprüft. Die Szenarien
  umfassen zusätzlich die bestehenden Berechtigungs-, Mobil-, Bestätigungs-
  und Dialog-Wiederöffnungsfälle sowie Node-Versionen und Linux-Neustartbedarf.
- 1498 Quell-/Laufzeitdateien erneut mit dem vorhandenen Prebuilt-Werkzeug
  versiegelt und geprüft; 31 Backend-Laufzeitdateien erfasst. Quellen und
  ausgelieferte JS-/CSS-Dateien stimmen überein.

## Offene Prüfungen

Eine tatsächliche lokale Chromium-Ausführung war nicht möglich: Es fehlt ein
Browser; der Downloadversuch des vorhandenen Playwright-Werkzeugs lieferte ein
ungültiges/unvollständiges ZIP und scheiterte. Diese Einschränkung ist kein
bestandener Browsertest. Der vorhandene Browser-CI-Job muss die erweiterten
Szenarien ausführen. Kein Browser-Screenshot und keine Sichtprüfung werden
hier als erfolgt ausgewiesen.

Es wurden keine Linux-Pakete auf einem Pi installiert, keine echte Node-/EOS-
Transaktion und keine Anlagenregelung geprüft. Der bisher qualifizierte Stand
`a2733fa5561f7327ff3689b7464f8727760fb670` wird nicht als Nachweis für diese
geänderten Quellen verwendet. Die gemeinsame neue Laufzeitqualifikation und
Pi-/systemd-/Hardwareabnahme bleiben offen.

Bedienung und Schnittstellen:
[EOS_SECURITY_UPDATES_DE.md](../../../../components/admin/docs/EOS_SECURITY_UPDATES_DE.md).
