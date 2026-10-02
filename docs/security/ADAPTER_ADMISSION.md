# Kontrollierte Adaptererweiterung – EOS-Testbasis

Stand: 02.10.2026. Änderungskennung: `EOS-BASE-ADMISSION-001`.
Umfang: ausführbare lokale Entscheidungsbibliothek, geschlossener JSON-Vertrag,
rein lesende CLI und automatisierte Positiv-/Negativtests. **Der Katalog ist
keine Sandbox und keine Produktionsfreigabe.** Die tatsächliche Installations-
und Startgrenze muss der geschützte Host-/Controllerpfad durchsetzen.

## Zweck und Lieferumfang

EOS soll aus einem gemeinsam geprüften Grundsystem und nachträglich ergänzbaren,
geprüften Adaptern bestehen. Eine Ergänzung ist eine Änderung des freigegebenen
Lieferstands. Sie darf keine ungeprüfte npm-/Git-/URL-Installation auslösen.

| Datei | Aufgabe |
| --- | --- |
| `runtime/policy/admission.cjs` | Begrenztes JSON-Einlesen, Katalogvalidierung, Profilauswahl, Vergleich von Auswahl/Installation/Aktivität, Baumdigest |
| `runtime/policy/cli.cjs` | Lokaler lesender Prüflauf mit JSON-Ergebnis und wertfreien Fehlercodes |
| `system/contracts/adapter-admission.schema.json` | JSON Schema Draft 2020-12 für den Katalog |
| `tests/system/policy-admission.test.cjs` | Automatisierte Prüfungen der Entscheidungs- und Parsergrenzen |

Die Bibliothek benötigt nur Node.js-Bordmittel. Sie installiert keine Pakete,
startet keine Adapter, öffnet keine Netzwerkverbindungen und ändert keine
Dateirechte. Der Betrieb benötigt keine neue Cloud-Verbindung.

## Vertrag und Status

Ein Katalog besitzt `schemaVersion: 1`, `kind: "eos-adapter-admission"`, eine
positive ganzzahlige `catalogRevision` und höchstens 128 Einträge. Jeder Eintrag
hat exakt diese Felder:

| Feld | Bedeutung |
| --- | --- |
| `id`, `package` | Eindeutige Dienst-/Modulkennung und konkreter npm-Paketname; keine URL und kein Dateipfad |
| `version` | Exakte dreiteilige Version, optional geprüfte Vorabkennung; keine Tags, Bereiche oder Build-Aliase |
| `sha256`, `digestKind` | Hash des Komponenten-Dateibaums gemäß `tree-sha256-v1` |
| `kind`, `required` | `core` oder `adapter`; Bestandteil der erforderlichen Basis oder optionale Erweiterung |
| `review.status` | `pending`, `approved-test`, `approved-production` oder `rejected` |
| `review.evidenceId` | Kennung des zugehörigen realen Prüfbelegs; bei Freigaben verpflichtend |
| `permissions` | Deklarierte Fähigkeiten, Protokolle, Netzbedarf und verbotene Ausführungs-/Nachinstallationswege |
| `communication` | `eos-postgresql-mtls13-v1`, historischer Redis-Pfad oder offener Erweiterungspfad |

Eine syntaktisch gültige Belegkennung beweist keine Prüfung. Die Hersteller-
Freigabe muss auf tatsächlichen Belegen beruhen. Katalog und Komponentendateien
müssen durch das verifizierte Lieferartefakt gebunden sein. Ein vom Dienstkonto
beschreibbarer oder unsigniert aus einer Admin-Anfrage übernommener Katalog darf
keine Berechtigungen schaffen. Eine monoton steigende Revision ist hier nur ein
Formatfeld; Signaturprüfung, Rollbackschutz und persistente Revisionsprüfung
gehören in den geschützten Installationspfad.

`validateCatalog(object)` und `parseCatalog(jsonText)` geben eine tief eingefrorene
Kopie zurück. `planAdmission(catalog, request)` erwartet genau:

```json
{
  "profile": "test",
  "requested": [],
  "installed": [],
  "active": []
}
```

`requested` und `active` enthalten `{ "id": "…", "version": "…" }`;
`installed` zusätzlich `sha256`. Die Beobachtungen über installierte und aktive
Module müssen aus dem vertrauenswürdigen Hostagenten kommen, nicht aus vom
Adapter selbst behaupteten Zuständen. Die Bibliothek führt keinen Prozessscan
und keinen Dateiscan aus.

- Erforderliche Komponenten werden immer ausgewählt. Eine nicht freigegebene
  erforderliche Komponente blockiert den gesamten Plan.
- Optionale Module benötigen eine ausdrückliche Auswahl der exakten Version.
- Das Profil `test` akzeptiert `approved-test` und `approved-production`.
  `production` akzeptiert nur `approved-production`. Auch dann bleibt im Ergebnis
  `productionReleaseApproved: false`: eine Katalogentscheidung erteilt keine
  Systemfreigabe und ersetzt keine weiteren Releasegates.
- `pending` und `rejected` dürfen als bekannte Einträge geführt werden, werden
  niemals ausgewählt oder als aktiv akzeptiert.
- Installation gilt nur bei übereinstimmender Kennung, Version und Digest.
  Aktivität setzt zusätzlich die Auswahl und Freigabe im aktuellen Profil voraus.
- Nicht ausgewählte oder abweichende installierte Komponenten erscheinen als
  `quarantine`. Das ist ein erforderlicher Hostauftrag, **keine bereits ausgeführte
  Verschiebung oder Abschaltung**. Ein solcher Baum darf nicht Bestandteil des
  aktiven ausführbaren Suchpfads bleiben.
- `nextAction` ist `install`, `activate` oder `none`. Es beschreibt einen Plan,
  keine ausgeführte Aktion und keine Vollmacht des Aufrufers.

Die unterstützten Fähigkeiten sind bewusst begrenzt. Neue Protokolle oder Rechte
benötigen eine geprüfte Vertragserweiterung. Bestehende LAN-/Geräteanbindung und
Discovery bleiben deklarierbar; diese Bibliothek installiert keine Netzsperre.
Tailscale-Erreichbarkeit hängt weiterhin von Routing, Firewall und Benutzerrechten
ab. Ein Deklarationsfeld setzt weder eine Firewall noch eine Ressourcen-ACL durch.

## Verschlüsselung und gemeinsame Vertrauenszone

Freigegebene Einträge müssen den tatsächlich vorgesehenen Kanal deklarieren.
Für PostgreSQL ist dies `eos-postgresql-mtls13-v1`; das historische
`eos-redis-tls13-v1` bleibt aus Kompatibilitätsgründen darstellbar.
Der neue `eos-channel-mtls13-v1` darf bis zur Hostabnahme nur als offener
Eintrag geführt werden. Bericht: `docs/security/ADAPTER_CHANNEL_DEV8_DE.md`.
Die folgende Beschreibung des Redis-Profils ist historisch. Das bezeichnet TLS 1.3 mit Serverprüfung und
individuellen Installationszugangsdaten für die internen Redis-Verbindungen.
**Es bedeutet keine getrennte mTLS-Identität je Adapter.** Die vorhandenen
ioBroker-Prozesse bleiben vorerst in einer gemeinsamen Vertrauenszone.

`legacy-unintegrated` kann als offener Zustand aufgenommen werden, aber keine
Freigabe erhalten. Die Bibliothek prüft die Erklärung; erst reale Transporttests,
Konfiguration und Startgates können deren Umsetzung beweisen. Eine erfolgreiche
Katalogprüfung allein beweist keine verschlüsselte Verbindung.

Feldprotokolle sind getrennt deklariert. Beispielsweise wird Modbus TCP durch
die interne Redis-Verschlüsselung nicht verschlüsselt. Solche Geräteverbindungen
benötigen jeweils ihre Anlagen-/Netzbewertung. Die Protokolleinträge erlauben es,
Altprotokolle sichtbar zu führen; sie sind kein automatischer Sicherheitsnachweis.

## Verbotene Installations- und Ausführungspfade

Freigegebene Einträge können weder `shellExec: true` noch `arbitraryCode: true`
enthalten. Zusätzliche npm-Module sind im gesamten Vertrag leer. Der Adapter
`iobroker.javascript` erhält in dieser Testbasis keine Freigabe, da er unabhängig
vom optionalen Shellschalter bestimmungsgemäß beliebigen JavaScript-Code
ausführt. Ein künftiger kontrollierter Automatisierungsdienst benötigt ein
eigenes Isolations- und Betriebsmodell.

`process.fixed` bezeichnet ausschließlich fachlich geprüfte feste Unterprozesse.
Das Feld implementiert keine Systemaufruf- oder Kommando-Whitelist. Der
freigegebene Code muss die konkrete Ausführung einschränken; eine falsche
Deklaration wird durch Formatvalidierung nicht erkannt.

Die bisherige Quellprüfung belegt konkrete Umgehungswege:

| Pfad | Quellenbeleg / verbleibende Anforderung |
| --- | --- |
| EOS Admin 7 `cmdExec` mit `url` | `EOS-ADM7-004`, `docs/integration/ADMIN7_REVIEW.md`; bisheriger Installateurwächter lässt URL-Aufträge durch. Serverseitig auf feste Hersteller-Bundleaktionen umstellen. Ausblenden eines Buttons genügt nicht. |
| js-controller `cmdExec` | Beobachteter Controllerquellstand `packages/controller/src/main.ts`, Zweig `case 'cmdExec'`: reicht CLI-Argumente an einen Unterprozess durch. Adapter-/Hostnachrichten müssen dieselbe Installationsgrenze passieren. |
| CLI `installAdapterFromUrl` | `packages/cli/src/lib/setup/setupInstall.ts`: reicht URL-/npm-Auswahl in die Paketinstallation. Diesen Pfad darf das Laufzeitkonto nicht als alternatives Updateverfahren nutzen. |
| Adapter-Startoptionen | Controller `startInstance` übernimmt `instance.common.nodeProcessParams` in `execArgv`. `--require`, `--import` oder andere Startinjektionen können Code aus beschreibbaren Orten laden. Leere/fest geprüfte Startoptionen müssen am tatsächlichen Startpfad gelten. |
| Host-Shell | Controllerzweig `shell` prüft `config.system.allowShellCommands`. Dieser Wert muss aus geschützter Konfiguration `false` sein; eine vom Dienstkonto ersetzbare Konfiguration ist keine Grenze. |
| Auto-Updates / Rebuilds | `EOS-ADM7-005`; einzelne automatische Updates und Laufzeit-Rebuilds würden den gemeinsam geprüften Stand verändern. Nur neu gebaute und geprüfte vollständige Lieferstände aktivieren. |

Die Entscheidungsbibliothek allein patcht jene Quellen nicht. Der zusätzlich
implementierte [Controller-Testprofil-Baustein](CONTROLLER_TEST_PROFILE.md)
sperrt die genannten Installations-, Node-Startargument- und Konfigurationswege
im exakt gebundenen Testbuild 7.2.2. Die historischen Upstream-/Admin-Befunde
werden dadurch nicht allgemein geschlossen. Das Hostprofil muss außerdem
mindestens Folgendes tatsächlich durchsetzen
und mit dem Dienstkonto nachprüfen:

1. Controller, Adapter, transitive Abhängigkeiten, Node-Laufzeit, Startskripte,
   Paketmanifeste und sämtliche übergeordneten Codeverzeichnisse gehören einem
   getrennten privilegierten Installationskonto/root und sind für die Laufzeit
   nicht beschreibbar. Auch ein beschreibbarer Elternordner oder austauschbarer
   Symlink unterläuft diese Grenze.
2. Daten, Logs und Backup-Ziele sind getrennt beschreibbar. Sie dürfen keine
   zulässigen Modul-, Plugin- oder Node-Preloadquellen sein. `noexec` allein stoppt
   das Einlesen von JavaScript durch einen erlaubten Node-Interpreter nicht.
3. Der Startpfad und alle späteren Neustarts prüfen den ausgewählten Lieferstand,
   den Paketbaum, Startdateien, Node-Startargumente und relevante Umgebungsvariablen
   wie `NODE_OPTIONS`/`NODE_PATH`. Eine einmalige Prüfung beim Boot deckt spätere
   Objektänderungen nicht ab.
4. Admin-, CLI-, Controller-, Restore- und Updatepfade können weder unkontrollierte
   Pakete noch Startkonfiguration in den aktiven Lieferstand einschleusen.
   Kein npm-Daemon, Docker-Socket, generisches sudo oder allgemeiner Rootbefehl
   ist für Adapter erreichbar. Ein Runtime-npm-Verbot ersetzt die Codegrenze
   nicht; Node-Code könnte selbst Dateien schreiben oder Code herunterladen.
5. Ein separater Installer prüft Signatur, Zielplattform, Version, Katalog,
   vollständigen Baum und Abhängigkeiten vor dem Wechsel. Die Laufzeit kann
   weder Prüfschlüssel noch Freigabekatalog oder Startgate überschreiben.

Auch diese Maßnahmen isolieren bereits laufenden kompromittierten Adaptercode
nicht von allen anderen Prozessen derselben Identität. Granulare Rechte je
Adapter, getrennte Datenbankidentitäten und belastbare Prozessisolation bleiben
ein gesondertes Integrationsziel. Ein Betreiber mit Rootzugriff ist ebenfalls
keine durch diesen Katalog ausgeschlossene Partei.

## Komponenten-Hash

`componentTreeDigest(rows)` berechnet SHA-256 über die UTF-8-Darstellung von
`JSON.stringify(rows)`, nachdem die Zeilen aufsteigend nach den UTF-8-Bytes ihrer
relativen POSIX-Dateipfade sortiert wurden. Die Eigenschaften jeder Zeile stehen
in exakt dieser Reihenfolge: `path`, `size`, `sha256`. Alle regulären Dateien des
Komponentenbaums sind enthalten; der Digest enthält keinen umgebenden Katalog
und keine eigene Digestdatei. Zeilenreihenfolge der Eingabe spielt keine Rolle.

Pfadtraversal, absolute Pfade, Backslashes, Kontrollzeichen, doppelte Pfade,
negative/unsichere Größen und ungültige Hashes werden abgelehnt. Der vertrauens-
würdige Dateisammler muss zusätzlich Symlinks/Spezialdateien abweisen, alle
Dateien erfassen, reale Bytes hashen und Austauschrennen verhindern. Der
Metadaten-Hasher übernimmt keinen Dateiintegritätsnachweis. Besitz, Modus und
Startberechtigungen werden vom Hostprofil separat gesetzt/geprüft.

## STRIDE und Prüfgrenzen

| Kategorie | Bedrohung | Implementierte Maßnahme | Grenze / Restarbeit |
| --- | --- | --- | --- |
| Spoofing | Adapter erklärt sich selbst als freigegeben/aktiv | Getrennte Zustände, exakte Kennungen und Freigabestufen | Signierte Herkunft und vertrauenswürdige Inventarerhebung außerhalb der Bibliothek |
| Tampering | Versionsbereich, unbekanntes Feld, manipulierte JSON-Schlüssel oder Paketbaum | Geschlossene Felder, exakte Version, Duplicate-Key-/Prototypabwehr, Digestvergleich | Reale Dateisammlung, Signatur und unveränderbarer Codebaum im Hostpfad |
| Repudiation | Unklare Freigabe oder unbemerkte Erweiterung | Katalogrevision und Belegkennung; maschinenlesbarer Plan | Geschütztes Installations-/Betriebsaudit und echte Freigabeentscheidung erforderlich |
| Information Disclosure | Eingaben/Geheimnisse in Fehlermeldungen | Feste Diagnosecodes, keine Rohwerte in CLI-Fehlern | Dokumentierter TLS-Kanal ist erst mit realen Verbindungsprüfungen belegt |
| Denial of Service | Große/tiefe JSON-Eingabe, Zyklen, Spezialdatei | 1 MiB, Tiefe 20, 65.536 Knoten, 128 Komponenten; reguläre Datei, begrenztes Lesen | Gleichzeitige Netzwerk-/Prozesslast und Hardwaremessungen nicht Teil dieser Bibliothek |
| Elevation of Privilege | URL/npm/JavaScript umgeht kontrollierte Ergänzung | Solche Eingaben erhalten keine Katalogentscheidung; Aktivität ohne geprüfte Installation abgelehnt | Controller-/Admin-Start- und Installationspfade müssen tatsächlich durchgesetzt werden |

Die Objekt-API nimmt normale lokale Datenobjekte entgegen. Sie weist Accessors,
veränderte Prototypen, Symbole, versteckte Eigenschaften und Zyklen zurück.
Ein bereits im selben Node-Prozess laufender Angreifer mit Proxy-/Codeausführung
ist keine durch einen JavaScript-Validator isolierbare Partei. Netzwerk-/Datei-
Eingaben verwenden deshalb den begrenzten Textparser.

## Ausgeführte Prüfung und Betrieb

```bash
node --test tests/system/policy-admission.test.cjs
node runtime/policy/cli.cjs --catalog /pfad/katalog.json --request /pfad/anfrage.json
```

Die CLI unterstützt in diesem Stand Linux-Dateiflags. Sie liest ausschließlich
reguläre Dateien, lehnt Symlink-Eingaben ab und schreibt ein einzelnes JSON-
Ergebnis auf stdout. Erfolgreich: Exit 0. Ungültige Eingabe/Dateizugriff: Exit 1
mit `ok: false` und Diagnosecode; keine Pfade oder Eingabewerte im Fehlertext.

Am 01.10.2026 wurden die **26 Tests** der oben genannten Node-Testdatei lokal
ausgeführt: 26 bestanden, keine übersprungen. Geprüft wurden Zustandsübergänge,
Profiltrennung, ausstehende/abgelehnte Freigaben, Versionen, Zusatzfelder,
Duplikate, Prototype-Angriffe, Accessors, Parsergrenzen, Baumdigest und CLI-
Dateifehler. Die Daten sind künstliche Fixtures, keine Adapterfreigaben.
Die zusammengeführte Systemprüfung führt Umgebung, Quellhashes und Rohbelege.

Nicht durch diese Tests belegt: reale ioBroker-Installation, realer Adapterstart,
Hostrechte, verschlüsselte Verbindung, Fernwartung, Gerätefunktionen, komplette
Lieferkette oder CRA-/IEC-Konformität. Bestehende Datenpunkte, UI und Regelungs-
algorithmen wurden in diesem Änderungsumfang nicht verändert.

Verantwortlich für die offenen Durchsetzungs- und Integrationspunkte:
EOS-Entwicklung/Hersteller. Freigabestatus dieses Moduls: getesteter
Entwicklungsbaustein; keine eigenständige Produkt- oder Serienfreigabe.
