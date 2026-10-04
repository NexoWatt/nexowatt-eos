# Kontrollierte Wiederherstellung des abgebrochenen R4-Erststarts

Der öffentliche R7-Wiederherstellungsweg ist bereit. Er gilt ausschließlich
für den gespeicherten, abgebrochenen R4-Erststart. Eine vorhandene Sicherung
bereithalten. Den [vollständigen Befehl](../../delivery/public-recovery-test3-r7/RECOVERY_COMMAND.txt)
einmal im SSH-Terminal ausführen; derselbe Befehl steht oben in der README.
Er prüft feste Commit-URLs, Dateigrößen, SHA-256 und die Paketsignatur.

Die erfolgreiche Ausgabe enthält `"ok":true`, `"phase":"FIRST_START_RECOVERED"`
und `"sequence":10`. Darauf folgen gegebenenfalls
`"status":"REPAIR_NO_INCOMPLETE_TRIAL"` aus der abgeschlossenen Nachlaufprüfung
und die Meldung `EOS: Erststart-Wiederherstellung abgeschlossen. Bitte den Admin-Login pruefen.`

Danach folgende rein lesende Prüfung ausführen:

```sh
systemctl show nexowatt-eos-controller.service nexowatt-eos-postgresql.service \
  --property=Id,ActiveState,SubState,Result,ExecMainStatus,NRestarts
sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C /usr/bin/node - <<'NODE'
const fs = require('node:fs');
const base = '/etc/nexowatt-eos/';
const read = name => fs.existsSync(base + name)
  ? JSON.parse(fs.readFileSync(base + name, 'utf8')) : null;
const r = read('first-start-recovery-r7.json');
const s = read('release-state.json');
const c = read('first-start-complete.json');
console.log(JSON.stringify({
  recoveryPhase: r?.phase ?? 'NOT_PRESENT',
  currentSequence: s?.sequence ?? null,
  releaseMatches: Boolean(s?.releaseId && s.releaseId === r?.targetReleaseId
    && s.releaseId === c?.releaseId),
  activationLockPresent: fs.existsSync(base + '.activation.lock'),
  recoveryGuardPresent: fs.existsSync(base + '.first-start-recovery-r7.guard')
}, null, 2));
NODE
```

Erwartet werden zwei aktive, laufende Dienste, `recoveryPhase: "ACTIVE"`,
`currentSequence: 10`, `releaseMatches: true` und beide Sperrwerte `false`.
`ExecMainStatus=1` allein belegt keinen Startfehler: Controller 7.2.2 verwendet
diesen Exitcode auch beim normalen Stoppen. Entscheidend sind die vollständige
Erfolgsmeldung und der aktuelle Dienst-/Releasezustand. Der kurzlebige
Wiederherstellungsdienst muss nach Abschluss nicht mehr aktiv sein.

Nun über die bisherige HTTPS-Adresse mit dem bestehenden Adminpasswort
anmelden, abmelden und erneut anmelden. Danach einen normalen Neustart und
dieselbe Statusprüfung durchführen. Lizenz und UUID müssen erhalten bleiben.

Bei einem Fehler den festen `REPAIR_...`-Code und die obige Statusausgabe melden.
`RESTORED_STOPPED` bedeutet bestätigte Rücknahme mit gestopptem Controller;
`RECOVERY_REQUIRED` verlangt Prüfung und bestätigt weder Stoppen noch Rücknahme.
Den Vorgang nicht durch Löschen von Sperren, manuelles Starten oder eine
Neuinstallation übergehen. Vollständige Setup-, Lizenz- und Konfigurationsdateien
nicht in Fehlerberichte kopieren.

Veröffentlichtes Archiv: Commit `be4da7c316467e5b274b1e2f293e3dc4ef72721b`.
Öffentlicher Einstieg: Commit `8a274b113609176585d884bb6ee180cde25b1e1c`.
Befehlsveröffentlichung: Commit `02dac8d27d2981ebf9fc5882ce3315eef806f442`.
[Erfolgreicher Build-/Publikationslauf](https://github.com/NexoWatt/nexowatt-eos/actions/runs/37195008931) ·
[Öffentliche Rückleseprüfung](../../reports/integration/r7-release-20261004/PUBLICATION.json).

Stand: 04.10.2026. Der neue Helfer
`tools/system/recover-r4-first-start-to-r7.cjs` ist ausschließlich für den
signierten R4-Teststand, Sequenz 7, nach einem abgebrochenen Browser-Erststart
vorgesehen. Er erwartet einen vollständig gespeicherten, identischen
Erststart-Handoff und vollständige Enrollment-Datenbankmarker, aber noch keine
Datei `first-start-complete.json`. Der Controller muss gestoppt sein und die
geschützte Sperre zum alten Vorgang `ui-onboarding` gehören. Ein noch laufender
alter Prozess, fremde Wartung, unbekannte Zustände oder ein vorheriger
Reparaturversuch führen zum Abbruch.

Das authentifizierte R4-Paket erzeugte ausschließlich Handoff-Schema 2 mit den
damaligen acht Einstellungsfeldern. Diese Form wird unverändert geprüft; ein
Schema-3-Handoff gehört nicht zu diesem Wiederherstellungspfad. Auch die damals
zulässige ausdrückliche Auswahl „ohne Lizenz“ bleibt möglich, jedoch nur ohne
vorhandenen verschlüsselten Lizenzdatensatz oder Speicherschlüssel. Der Helfer
trägt in diesem Fall keine Lizenz nach.

Der Helfer nimmt nur ein separat authentifiziertes R7-Testpaket mit Sequenz 10
an. Der veröffentlichte Einstieg bindet vollständige Archiv-/Einstiegs-Commits,
Größe und SHA-256 sowie die neue Release-ID und den öffentlichen Schlüssel.
Die tatsächlichen Pins und öffentlichen Rückleseprüfungen stehen im
[Veröffentlichungsbericht](../../reports/integration/r7-release-20261004/README.md).

Vor dem Startversuch werden insbesondere geprüft:

- Signatur und sämtliche installierten Paketdateien des exakten R4-Standes;
  signiertes Zielpaket, unverändertes Datenbankschema und Systemd-Unit-Inventar.
- Releasezustand, Pointer, ursprüngliche Wartungssperre und Systemd-Zustände.
- Gespeicherter Handoff und Datenbankmarker einschließlich identischer
  Passwort-/Konfigurationsbindung, UUID und aktivierter Webinstanzen.
- Bereits gespeicherte verschlüsselte Lizenz: derselbe Schlüssel und derselbe
  authentifizierte Lizenzinhalt. Es werden keine neuen Zugangsdaten erzeugt.

Die Datenbank-Vorprüfung benutzt eine direkte TLS-1.3-Verbindung und eine
ausdrücklich nur lesende Transaktion mit Größen- und Zeitlimits. Ein normaler
EOS-Datenbankclient würde bereits beim Verbinden Ablaufbereinigungen ausführen
und wird daher hier nicht verwendet. Nach erfolgtem Start gelten die normalen
Laufzeitschreibvorgänge; der Lizenzdienst darf beispielsweise seinen
verschlüsselten Zeit-Höchststand fortschreiben. Bestehender Lizenzschlüssel,
Passwort, UUID, Konfiguration und Handoff werden nicht neu angelegt oder
zurückgesetzt.

Ein zusätzlicher exklusiver Wiederherstellungswächter verhindert parallele
Übernahme. Ein privates Root-Journal hält den ursprünglichen Releasezustand und
die Sperre fest. Erst danach erfolgen Paketwechsel und kontrollierter Start.
Controllerbereitschaft, beide Webadapter und ihre HTTPS-Endpunkte müssen die
Prüfung bestehen. Der Passwort-/Identitätsabgleich wird danach nochmals gelesen.
Erst dann wird der Erststartabschluss für R7 angelegt, Autostart aktiviert und
der Setup-Zugang beendet. Die vorhandenen Setup-Dateien bleiben geschützt
erhalten; sie werden nicht zum Umgehen der Diagnose gelöscht.
Das betrifft insbesondere den Handoff mit Passwort-Hash und Lizenz-Token unter
dem Setup-Konto (Verzeichnis/Dateien nur für dieses Konto lesbar), gegebenenfalls
die vorhandene Lizenz-Übergabedatei `first-start-license.json` sowie den alten
Setup-Code. Die Übergabedatei enthält den Lizenz-Token unverschlüsselt und ist
im installierten Profil auf Root und die Runtime-Gruppe begrenzt. Die gewöhnliche
Erststart-Geheimnisbereinigung ist mit diesem Wiederherstellungspfad ausdrücklich
noch nicht abgeschlossen; diese Restdateien dürfen nicht veröffentlicht werden.

Bei einem Fehler versucht der Helfer, den Controller zu stoppen. Soweit der Vorgang seine
eigenen unveränderten Zwischenstände wiedererkennt, stellt er Pointer und
Releasezustand auf R4 zurück. Fremde Änderungen werden nicht überschrieben.
Wartungssperre und Wiederherstellungswächter bleiben dann bestehen und das
Journal nennt `RESTORED_STOPPED` oder `RECOVERY_REQUIRED`. Nicht erneut durch
Löschen von Sperren, `--force`, Neuinstallation oder manuelles Starten umgehen.
Die Systemd-Nachlaufprüfung stoppt auch einen unterbrochenen eigenen Startversuch.
`RESTORED_STOPPED` verlangt eine bestätigte Stopprückmeldung.
`RECOVERY_REQUIRED` ist keine Bestätigung, dass Stoppen oder Rücknahme gelungen
sind; dann sind der tatsächliche Dienststatus und die erhaltenen Sperren zu prüfen.

Physische Adapter bleiben gesperrt. Ein erfolgreicher Reparaturbericht ist
keine Anlagen- oder Produktionsfreigabe. Tatsächliche Anmeldung, Wiederanmeldung
und Neustart auf dem Nutzer-Pi sind weiterhin zu prüfen.

Nachweise: [Wiederherstellungstests](../../reports/integration/first-start-recovery-r7-20261004/README.md).
