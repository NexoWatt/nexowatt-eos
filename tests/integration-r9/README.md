# Native R9-Prüfung des tatsächlichen Kandidaten

Diese separate Fixture prüft die **aktuelle unsigned R9-App vor Signierung**.
`prepare-app.cjs` ruft den Hersteller-Builder `prepareApp()` auf: vollständig
signaturgeprüfte R8-Basis mit den sechs aktuellen eigenen Paketüberlagerungen.
Historische R7-Managementtests und deren Belege bleiben unverändert erhalten.
Ein Erfolg gegen die unveränderte R7-App ersetzt diesen R9-Test nicht.

Die Prüfung verwendet echte PostgreSQL-17.11-Prozesse, getrennte mTLS-Identitäten,
den Controller, Admin, UI und deren tatsächliche Lizenzprüfung. Keine Runtime-,
Lizenz-, HTTP-, Datenbank- oder Plattformimplementierung wird gemockt. Das Profil
startet weiterhin ausschließlich Admin 7.10.11 und UI 1.0.21. Vier weitere eigene
Adapter sind im Kandidaten enthalten, werden jedoch nicht als Geräteprozesse
aktiviert.

## Nur im frischen, disponiblen GitHub-Linux-Runner

Node **24.21.0**, Linux x64, normaler Runner-UID für Vorbereitung und Betrieb.
Der bestehende PostgreSQL-Vorbereiter benötigt Compilerwerkzeuge und lädt die
bereits fest gepinnte PostgreSQL-17.11-Quelle. Die R8-Eingabe enthält die vier
fest gepinnten Lieferdateien des bestehenden R8-Standes; kein beliebiges Archiv.

```bash
set -euo pipefail
umask 077
lab_root=$(mktemp -d "$RUNNER_TEMP/eos-r9.XXXXXXXX")
bash tests/integration-controller/prepare-native.sh "$lab_root"
npm --prefix components/ui ci --ignore-scripts --no-audit --no-fund
node tests/integration-r9/prepare-app.cjs "$lab_root" "$R8_DIR"
export EOS_DISPOSABLE_MANAGEMENT_LAB=1 EOS_DISPOSABLE_R9_LAB=1
sudo --preserve-env=GITHUB_ACTIONS,EOS_DISPOSABLE_MANAGEMENT_LAB,EOS_DISPOSABLE_R9_LAB \
  "$(command -v node)" tests/integration-r9/prepare-fixed-root.cjs \
  "$lab_root" "$(id -u)" "$(id -g)"
node tests/integration-r9/run-native.cjs "$lab_root" | tee "$lab_root/r9-native.tap"
```

`prepare-fixed-root.cjs` verweigert jeden Aufruf ohne beide ausdrücklichen
Disposable-Marker, `GITHUB_ACTIONS=true`, richtige Nodeversion und UID-0-Ausführung.
`/opt/nexowatt`, `/etc/nexowatt-eos` und `/var/lib/nexowatt-eos` müssen vollständig
fehlen. Der Helfer richtet keine Dienste und keine sudoers-Regeln ein und darf
niemals auf einem bestehenden EOS-Host laufen. Er kopiert den inventargeprüften
Kandidaten nach `/opt/nexowatt/eos/releases/<zufällige-fixture-id>/app`, setzt
root-eigene schreibgeschützte Dateien, den exakten `current`-Symlink und das
Plattform-Release-State-Format. Die zufällige ID ist ausdrücklich **keine
signierte Releaseidentität**. Root-Marker und Ergebnis führen `signed:false`
und `unsignedFixture:true`; keine Testausnahme gelangt in Produktcode.

Der normale Testprozess kann die App und das Release-State nicht ändern.
Admin und UI laufen mit ihrem echten Einstieg innerhalb des festen Releasepfads;
damit werden `require.main`, Plattformprofil, Paketidentität und Eigentümer
wirklich geprüft. Ein weiterer normaler Nodeprozess ruft den mitgelieferten
Plattformprüfer außerhalb des zugelassenen Einstiegspunkts auf und muss mit
`EOS_PLATFORM_ENTRY` abgewiesen werden.

## Tatsächlicher Integrationsablauf

1. Frische native PostgreSQL-Datenbank, TLS 1.3 und getrennte Rollen ohne
   Superuser-/Bypassrechte; echte Setup-, Bootstrap- und Enrollmentabläufe.
2. Read-only-App, private PID-Schreibung, genau zwei Managementinstanzen und
   Produktions-HTTPS-Readiness aus `tools/system/onboard-ui.cjs`.
3. Unlizenzierter Start: EOS-Admin bleibt nach echter OAuth-Anmeldung erreichbar,
   UI sperrt Bedienung und zeigt zentrale Verwaltung nach strikter Anmeldung.
4. Über die echte zentrale Aktivierungsroute signierte **NWL3-Home-Lizenz** aktivieren:
   UI übernimmt drei Ladepunkte und zwei Speicher ohne Neustart.
5. Über die zentrale Löschroute entziehen: tatsächliche UI-Lease und
   Kontingentstates werden gesperrt, während Managementprozesse weiterlaufen.
6. Signierte **NWL3-Pro-Lizenz** aktivieren: UI übernimmt 50 Ladepunkte, zehn
   Speicher und Pro-Merkmale ohne Neustart, gemäß aktueller zentraler Produktpolicy.
7. Controller samt Admin/UI sauber neu starten; gültiger zentraler Pro-Status,
   HTTPS, Enrollment, PIDs und unveränderte App-Bytes bleiben erhalten.

Beide NWL3-Schlüssel enthalten `v:3`, `scope:'system'`, identische
`issuedAt`/`notBefore` und `expiresAt:null`. Sie enthalten keine `adapters`,
`limits` oder `features`: Diese Berechtigungen leitet der tatsächliche Admin-Core
aus seiner Home-/Pro-Policy ab. Die Fixture prüft jede selbst signierte Lizenz
vor der echten HTTPS-Aktivierung zusätzlich mit dem Core aus der vorbereiteten
App. Die dauerhaft gültige Lizenz ist ausschließlich an die zufällige Labor-UUID
und den ephemeren Labor-Vertrauensanker gebunden. Admin meldet `expiresAt:null`;
die UI meldet weiterhin `expiresAt:0` und eine begrenzte, erneuerbare `validUntil`-Lease.

Die automatischen Zustandsprüfungen beobachten die echten PostgreSQL-States,
bevor die nächste UI-HTTP-Abfrage eine zusätzliche Refreshanforderung auslösen
könnte. Damit wird der periodische Adapterpfad für Freischaltung/Widerruf
geprüft. HTTPS-Anmeldung und jeweilige Folgeabfrage teilen ein hartes monotones
Fünfsekundenbudget mit Abbruch, Antwortlimit, TLS-1.3-/CA-/Hostnameprüfung,
keinen Redirects, Wiederholungen oder Protokollfallbacks. Testpasswort,
Lizenzsignierschlüssel, Lizenzinhalt, Sitzungscookies und UUID erscheinen weder
in TAP noch im Ergebnis. Der Testissuer existiert nur im disponiblen Testbaum
und wird nach dem Lauf entfernt.

## Artefaktbindung

Veröffentlichbare bereinigte Ergebnisse sind genau:

- `r9-native.tap`
- `r9-native-evidence.json`
- `r9-native-prepared.json`

Evidence: `schemaVersion:1`, `kind:eos-r9-native-management`, `sourceCommit`,
`sequence:12`, `nodeVersion:24.21.0`, `licenseFormat:NWL3`, `appContentSha256`, `passed`, `signed:false`,
`unsignedFixture:true`, `hardwareTested:false`, `productionReleaseApproved:false`.
`checks` enthält nur tatsächlich nach bestandenen Stufen gesetzte Booleans:
`postgresqlMtls`, `platformDeniesUnadmittedProcess`, `initiallyUnlicensed`,
`adminHttpsLogin`, `uiHttpsLogin`, `homeActivation`, `homeQuotas`,
`rootOwnedEosAdmission`, `centralRevocation`, `proReactivation`, `proQuotas`,
`restart`, `unchangedApp`, `noPhysicalAdapters`.

Die Hashbindung lautet SHA-256 über JSON der ASCII-pfadsortierten Dateiliste
`[{path,size,sha256}, ...]` der tatsächlichen App. Im signierten Manifest wird
`app/` von den Pfaden entfernt. Nur Dateimodi werden für diesen Contenthash
weggelassen, weil der Roothelfer sie auf 0444/0555 verschärft; Inhalte, Pfade,
Dateimenge und Größen müssen exakt übereinstimmen. Der Veröffentlichungsprüfer
muss dieses Ergebnis und denselben Quellcommit gegen die tatsächlich signierte
R9-App binden. Ein alter R7-/R8-Bericht, ein anderes Appinventar oder ein
fehlgeschlagener Teiltest genügt nicht.

Der Harness hat 530 Sekunden Testbudget, der Supervisor beendet ihn nach
540/550 Sekunden. Er beendet nur eigene Prozessgruppen und den eigenen
PostgreSQL-Laborcluster. Root-Testpfade gehören zum danach verworfenen Runner;
es gibt keinen allgemeinen Lösch-/Reparaturbefehl für Produktivhosts.

## Lokale Prüfungen und Grenzen

Diagnosenachtrag 07.10.2026: Der Root-Vorbereiter meldet bei einer Ablehnung
zusätzlich einen festen, erlaubten Grund wie `OPT_MODE`, `LAB_OWNER` oder
`NODE_VERSION`. Alle bisherigen Ablehnungsbedingungen bleiben unverändert.
Unbekannte Fehler erscheinen nur als `UNEXPECTED`; Dateipfade, Ausnahmeinhalte,
Schlüssel und Umgebungsvariablen werden nicht ausgegeben. Dies grenzt den am
07.10.2026 vor dem nativen Test aufgetretenen CI-Abbruch ein, behebt ihn aber
nicht durch Lockerung einer Schutzprüfung.
Lokaler Diagnoselauf (Linux x64, Node 24.19.0): 13/13 Vertragsprüfungen bestanden,
keine übersprungen; [Rohbeleg](evidence/root-guard-diagnostics-20261007.tap).
Der tatsächliche Root-Aufbau und der native R9-Lauf sind damit nicht bestanden.

Fehlerkorrektur 07.10.2026: Lauf `37657806247`, Job `112917291785`, bestätigte
`OPT_MODE`: Das root-eigene `/opt` des disponiblen Runners war für Gruppe oder
Andere schreibbar. Nach erfolgreicher Kontext-, Pfad- und Kandidatenprüfung
öffnet die Fixture ausschließlich `/opt` mit `O_DIRECTORY|O_NOFOLLOW`, prüft
UID, Gerät und Inode und entfernt gegebenenfalls die Schreibbits `0022` per
Dateideskriptor. Eigentümer, übrige Rechte und sämtliche Unterverzeichnisse
bleiben unverändert. Anschließend werden Pfadidentität und Rechte erneut
geprüft. Es gibt keine rekursive Rechtekorrektur und keine Änderung einer
Produkt-Zulassungsprüfung. Fremdes Eigentum, Symlinks, ausgetauschte Inodes,
bestehende EOS-Pfade oder fehlende CI-Zustimmung bleiben harte Ablehnungen.
Die neuen Syscall-Simulationen prüfen diese Grenzen ohne lokale Rootpfade zu
ändern. Der echte native CI-Lauf bleibt der separate Erfolgsnachweis.

`node --test tests/integration-r9/fixture.test.cjs tests/integration-r9/license-session.test.cjs`
prüft Metadaten, Ablehnung des Roothelfers außerhalb des expliziten Kontexts,
Hashprojektion, echte NWL3-Signatur-/Policyprüfung und geheimnisfreie
Resultatvalidierung. Signierte NWL3-Claims mit zusätzlichen Kontingenten,
Adapterlisten, Features oder abweichenden Zeitregeln müssen abgewiesen werden.
Ein separater lokaler NWL2-Kompatibilitätstest behält die engen 7/4-Kontingente;
NWL2 ist nicht das Lizenzformat des nativen Integrationsablaufs.
Diese Contracttests sind **kein nativer Lauf**. Lokaler Stand siehe
`LOCAL_EVIDENCE.md`. Ein x64-Nativerfolg ist kein ARM64-/Pi-, systemd-Service-,
Browser- oder Anlagenbeleg und keine Produktionsfreigabe.
