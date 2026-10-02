# Admin-Ersteinrichtung: Sicherheitswirkung und Grenzen

Stand: 30.09.2026. Ergebnis einer begrenzten Quellcode-Nachprüfung: **Die Ersteinrichtung im offiziellen ioBroker Admin kann Passwort, Anmeldung und HTTPS für den Admin-Webzugang konfigurieren. Sie härtet nicht automatisch die interne Datenbankkommunikation oder die Hostrechte.**

## Verifizierter Quellstand

- Offizielles Stable-Verzeichnis und npm-Tag `stable`: **ioBroker.admin 8.0.14**. npm `latest` war beim Abruf **8.0.21** und wurde nicht mit Stable gleichgesetzt.
- Git-Tag `v8.0.14`, Commit **`e4b39b810f5f12cd6e969e25a39ff6f3188a6608`**; npm `gitHead` stimmt damit überein.
- Ergänzend gelesen: Lockfile-Pakete **`@iobroker/socket-classes@2.4.4`** und **`@iobroker/webserver@3.0.2`**. Registry-Tarballs wurden gegen ihre SHA-512-Einträge im gepinnten Lockfile geprüft. Dies ist keine vollständige Signatur- oder Lieferkettenprüfung.
- **Upstream blieb unverändert.** Die Tests verwenden Quellkopien und Stubs. Keine Installation, kein echter Admin-Server, kein Gerätezugriff und keine Änderung einer laufenden Anlage.
- **Der eigene EOS-Admin-Quellcode liegt in diesem Installer-Repository nicht vor.** Sein Verhalten und die tatsächlich installierten Versionen sind mit diesem Dokument nicht nachgewiesen.

## Tatsächliche Wirkung des Wizards

Die Dateinamen in dieser Tabelle beziehen sich auf den gepinnten Admin-Commit. `WizardDialog.tsx` liegt unter `src-admin/src/dialogs/`; Unterseiten unter `src-admin/src/components/Wizard/`.

| Bereich | Nachgewiesenes Verhalten | Fundstelle |
|---|---|---|
| Lizenz / Sprache | Schreibt `system.config.common.licenseConfirmed=true`, `diag='extended'` und ggf. Sprache. | `WizardDialog.tsx:247–267` |
| Passwort | Ruft `socket.changePassword('admin', pass)` auf. Aktiviert dadurch noch keine Anmeldung. Backend delegiert nach Berechtigungsprüfung an `adapter.setPassword`. | `WizardDialog.tsx:274–296`; Socket-Paket `build/lib/socketCommandsAdmin.js:691–700` |
| Admin-Anmeldung / HTTPS | Auswahl zunächst nur im Frontend-State. Abschluss schreibt `native.auth`, `native.secure` und ggf. Zertifikatnamen in die aktuelle Admin-Instanz. | `WizardDialog.tsx:327–335,384–451` |
| Voreinstellung | `auth=false`, `secure=false`, `bind='0.0.0.0'`; Wizard übernimmt vorhandene Instanzwerte. Anmeldung und HTTPS sind optional. | `io-package.json:224–245`; `WizardDialog.tsx:129–147`; `WizardAuthSSLTab.tsx:40–106` |
| Andere Schritte | Systemformate/Standort, Raum-Enums und bei Auswahl Controller-Befehl `add <adapter>`. Portweiterleitung wird erklärt, nicht automatisch abgesichert. | `WizardDialog.tsx:309–315`; `WizardRoomsTab.tsx:165–202`; `WizardAdaptersTab.tsx:87–97`; `WizardPortForwarding.tsx:20–87` |
| Interner Transport | Kein Schreiben von Objects-/States-TLS-Optionen in `iobroker.json`, keine Redis-TLS-/Benutzer-/ACL-Provisionierung in dieser vollständigen Seiteneffektkette. | Vollständige Wizard-Seiteneffekte oben; `src/lib/web.ts:1385–1397` belegt den Admin-Webserver-Bezug von `secure`. |
| Hostrechte | Kein Entfernen von sudo-Regeln und keine Konfiguration eingeschränkter Capabilities oder systemd-Rechte durch den Wizard. | Vollständige Wizard-Seiteneffekte oben. |

## Abschluss und Unterbrechung sind kein Sicherheitsnachweis

Die Anzeige hängt an `!system.config.common.licenseConfirmed` (`src-admin/src/App.tsx:1179–1184`). Dieser Wert wird bereits **vor Passwort und HTTPS** gespeichert. Wird die Seite danach neu geladen, erzwingt diese Bedingung die restlichen Schritte nicht erneut. Der Dialog selbst ignoriert generisches Schließen (`WizardDialog.tsx:645–652`). Die Schaltfläche zur Backup-Wiederherstellung navigiert ohne Passwortänderung weiter und lädt neu (`WizardDialog.tsx:281–285`; `App.tsx:2623–2627`). Die Sicherheit einer späteren Wiederherstellung wurde nicht geprüft.

Das Passwort wird im Ablauf vor der Aktivierung von HTTPS übertragen. Bei einer anfänglich direkten HTTP-Verbindung ohne separat schützenden TLS-Proxy/Tunnel ist deshalb auch dieser Aufruf unverschlüsselt; spätere HTTPS-Aktivierung schützt die frühere Übertragung nicht. Dies ist eine Codeflussanalyse, kein Mitschnitt.

### HTTPS-Fehlerpfade

1. `WizardDialog.tsx:413–431` liest Zertifikatnamen. Sind keine vorhanden, setzt es `secure=false` und zeigt einen Fehler. Ein zweiter Abschluss kann dann Auth mit HTTP speichern.
2. Ein zusätzlicher Fehler in 8.0.14: Sind beide Zertifikatnamen bereits gesetzt und eine Einstellungsänderung mit `secure=true` erforderlich, bleiben die lokalen Zertifikatvariablen leer. Die nachfolgende Prüfung setzt ebenfalls `secure=false`. Unveränderte Auth-/HTTPS-Einstellungen verlassen die Routine vorher und sind von diesem konkreten Zweig nicht betroffen.
3. Das geprüfte Lockfile-Paket `@iobroker/webserver@3.0.2`, `build/lib/webServer.js:171–184`, kann bei `secure=true`, `leCollection=false` und fehlenden nutzbaren Custom-/Self-signed-Zertifikaten `http.createServer` aufrufen. Ein vergleichbarer Zweig liegt bei `154–168`. Ein geworfener Fehler aus dem Zertifikatsprovider kann dagegen zum Beenden des Admin-Adapters führen (`src/lib/web.ts:1394–1397`). **Nicht jeder Zertifikatfehler führt zu HTTP.**

Diese Zweige wurden mit Originalquellcode und Stubs nachvollzogen. Keine tatsächliche TLS-Aushandlung oder Browserintegration wurde ausgeführt. Der Wizard legt keine TLS-Mindestversion fest; daraus lässt sich ohne konkrete Node-Konfiguration und Handshake-Prüfung weder ein modernes noch ein veraltetes tatsächlich verwendetes TLS-Profil ableiten.

## Bereits vorhandene Host-Sicherheitsfunktion

Außerhalb des Wizards prüft Admin auf Linux bekannte Standardzugangsdaten (`src/main.ts:2393–2419`; `src/lib/checkLinuxPass.ts:17–144`). Eine GUI-Reaktion kann eine Passwortänderung per `su` und `passwd` anstoßen (`main.ts:829–850`; `checkLinuxPass.ts:194–259`). Dieser Code wurde nur gelesen. Es wurden **keine Passwortversuche ausgeführt**. Diese Funktion verändert keine `NOPASSWD`-Regeln und ersetzt keine Host-Härtung.

## Folgerung für EOS und bisherigen Bericht

Die Befunde des Installer-Berichts zu Hostrechten und dem Redis-Installationspfad werden durch den Admin-Wizard nicht automatisch behoben. Gleichzeitig wäre die pauschale Behauptung, ioBroker besitze keine HTTPS-/Authentifizierungsfunktionen, falsch. Der Browserzugang und die interne Adapter-/Datenbankkommunikation sind getrennt zu bewerten.

Für den EOS-Lieferstand sind ein überprüfbar abgeschlossener Provisionierungszustand, verpflichtende Authentifizierung, HTTPS ohne Klartext-Rückfall, passende Vertrauensstellung der Gegenstelle, minimale Hostrechte und separat geprüfter interner Transport notwendig. Das Verwaltungs-Fehlerverhalten darf keine unkontrollierte Abschaltung der Energie-/Schutzregelung verursachen. Dieses Dokument ist **kein CRA-/IEC-Konformitätsnachweis und keine Produktfreigabe**.

## Reproduzierbare, begrenzte Belege

Unter `evidence/admin-first-run/` liegen Quellprovenienz, ein exakter Wizard-Methodenausschnitt, ein einzelnes unverändertes Webserver-Modul mit Lizenzhinweisen sowie zwei Probeprogramme. Es wurde kein komplettes Upstream-Repository eingebettet.

Mit Node **24.19.0** ausgeführt:

```bash
node docs/security/evidence/admin-first-run/test_wizard_finish.cjs
node docs/security/evidence/admin-first-run/test_webserver_fallback.cjs
```

- **5 Wizard-Fälle:** unveränderte unsichere Defaults; bewusst gewähltes HTTPS/Auth mit vorhandenen Zertifikaten; erster und zweiter Abschluss ohne Zertifikate; bereits konfigurierte Zertifikatnamen.
- **3 Webserver-Fälle:** fehlende Zertifikatsantwort; ungelöste PEM-Dateipfade; Optionen mit Zertifikaten. HTTP-/HTTPS-Erstellung ist gestubbt, ohne Listener und ohne echte Zertifikate.
- Beobachtungen in `wizard_finish_results.json` und `webserver_fallback_results.json`; Dateihashes und Paketinformationen in `provenance.json`.

Die erfolgreichen Assertions bestätigen die beschriebenen Verzweigungen, **keine bestandene Sicherheitsabnahme**. Der TypeScript-Stripper von Node gibt eine Experimental-Warnung aus; er ist ausschließlich ein Hilfsmittel dieses Quellcode-Probetests.

## Primärquellen

- [Offizielles Stable-Verzeichnis](https://github.com/ioBroker/ioBroker.repositories/blob/master/sources-dist-stable.json) — bewegliche Quelle, Abruf 30.09.2026; Snapshot-Hash in Provenienz.
- [npm-Metadaten](https://registry.npmjs.org/iobroker.admin) — Abruf 30.09.2026.
- [Wizard am geprüften Commit](https://github.com/ioBroker/ioBroker.admin/blob/e4b39b810f5f12cd6e969e25a39ff6f3188a6608/src-admin/src/dialogs/WizardDialog.tsx).
- [App / Wizard-Startbedingung](https://github.com/ioBroker/ioBroker.admin/blob/e4b39b810f5f12cd6e969e25a39ff6f3188a6608/src-admin/src/App.tsx).
- [Admin-Defaults](https://github.com/ioBroker/ioBroker.admin/blob/e4b39b810f5f12cd6e969e25a39ff6f3188a6608/io-package.json).
- [Admin-Webserver](https://github.com/ioBroker/ioBroker.admin/blob/e4b39b810f5f12cd6e969e25a39ff6f3188a6608/src/lib/web.ts).
- [Linux-Passwortprüfung](https://github.com/ioBroker/ioBroker.admin/blob/e4b39b810f5f12cd6e969e25a39ff6f3188a6608/src/lib/checkLinuxPass.ts).
- [Gepinntes Lockfile](https://github.com/ioBroker/ioBroker.admin/blob/e4b39b810f5f12cd6e969e25a39ff6f3188a6608/package-lock.json).
- [Socket-Dependency-Tarball 2.4.4](https://registry.npmjs.org/@iobroker/socket-classes/-/socket-classes-2.4.4.tgz).
- [Webserver-Dependency-Tarball 3.0.2](https://registry.npmjs.org/@iobroker/webserver/-/webserver-3.0.2.tgz).
