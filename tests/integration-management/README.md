# Native Management-Integration (Entwicklungslabor)

Dieser neue Test schließt die bisherige Lücke des Core-only-Labors: Er startet
den tatsächlichen js-controller 7.2.2 mit EOS Admin 7.10.11 und NexoWatt UI 1.0.21
aus dem vollständig authentifizierten R7-Payload. Die vollständige R7-App wird
bytegleich kopiert; kein npm-Update, Native-Neubau oder Adapter-Mock findet statt.
Die zwei vorhandenen ARM64-Serialport-Binaries bleiben unverändert und werden
von den nicht gestarteten physischen Adaptern nicht benötigt. Das ist keine
allgemeine x64-Freigabe dieses ARM64-Pakets.

## Isolierter CI-Aufruf

Ein eigener frischer Ubuntu-24.04-Runner mit Node **24.21.0**, unprivilegierter
Runner-UID und mindestens 20 Minuten Joblimit ist erforderlich. Nie auf einem
EOS-Gerät oder einem Runner mit vorhandenen EOS-Verzeichnissen ausführen.
Das Root-Fixture verweigert vorhandene `/etc/nexowatt-eos` und
`/var/lib/nexowatt-eos` einschließlich symbolischer Links.

```bash
set -euo pipefail
umask 077
lab_root=$(mktemp -d "$RUNNER_TEMP/eos-management.XXXXXXXX")
bash tests/integration-controller/prepare-native.sh "$lab_root"
node tests/integration-management/prepare-bundle.cjs "$lab_root" \
  "$PWD/delivery/test-pi-0.2.0-test.3-r7/eos-0.2.0-test.3-linux-arm64.tar.gz" \
  "$PWD/delivery/test-pi-0.2.0-test.3-r7/release-public.pem"
export EOS_DISPOSABLE_MANAGEMENT_LAB=1
sudo --preserve-env=GITHUB_ACTIONS,EOS_DISPOSABLE_MANAGEMENT_LAB \
  "$(command -v node)" tests/integration-management/prepare-fixed-root.cjs \
  "$lab_root" "$(id -u)" "$(id -g)"
node tests/integration-management/run-native.cjs "$lab_root" | tee "$lab_root/management.tap"
```

Nur `management.tap` und `management-evidence.json` als Artefakte übernehmen.
Keine kompletten Lab-Verzeichnisse, PostgreSQL-Metadaten, Konfigurationen,
Schlüssel, Lizenzen oder Adapterlogs veröffentlichen. Der Test gibt ausschließlich
feste Fehlerindikatoren und relative Zeitabstände aus; rohe Prozessausgaben
bleiben begrenzt im Speicher. Ein Fehler enthält daher eventuell nur den
gescheiterten Prüfschritt. Bootstrap/Enrollment erfasst acht feste Teilschritte
und eine begrenzte Instanzzahl. Eine literale Fehlercode-Liste erhält bekannte
Bootstrap-, Lizenz- und Dateizugriffsfehler ohne Rohtexte. Prozessindikatoren
unterscheiden erwartbare CLI-Setup-Schreibfehler von Controllerfehlern.
Die ephemere Lizenz ist korrekt signiert, gerätegebunden
und über den echten R7-Lizenzspeicher verschlüsselt; sie ist kein Lizenz-Bypass.

## Verbindliches Gate und Diagnose

Der native Test verwendet PostgreSQL **17.11**, getrennte `eos_objects`/
`eos_states`-Rollen ohne Superuser/BypassRLS und gegenseitiges TLS 1.3. Die
Labor-Fixture wird ausdrücklich mit `profile: 'management'` auf dem festen
Produkt-Endpunkt `127.0.0.1:15432`, Datenbank `eos`, gestartet. Ein belegter
Port führt zum Fehler; vorhandene Server werden weder verwendet noch gestoppt.
Der bisherige Core-only-Test behält seinen dynamischen Port und `eos_lab`.
Die unveränderte Produktions-Konfigurationsprüfung bleibt verbindlich.
Die Produktionserzeuger erstellen echte HTTPS-Zertifikate an den fest vorgeschriebenen
Pfaden. Produktions-Bootstrap, Erstregistrierung, Upload-CLI, Adapter-PID-Datei,
Enrollment-Verifikation und Neustart laufen gegen die echten Module.
CLI und Controller erhalten eine feste Environment-Auswahl mit `CI=false`.
Dadurch erzeugt upstream eine normale UUID; `CI=true` würde seinen ungültigen
CI-Sentinel erzeugen, den der Lizenzvalidator korrekt ablehnt. Die Harness
ersetzt keine UUID und lockert weder Signaturprüfung noch Lizenzbindung.

Das verbindliche Readiness-Gate ruft in dieser Reihenfolge den aktuellen
Produktionscode auf: `waitController`, `waitAdapters`, parallel `probeWeb(8081)`
und `probeWeb(8188)`. Das Budget und sämtliche TLS/Auth-Prädikate stammen aus
diesem Produktionscode. Der historische R7-Einmalprobe läuft parallel nur als
Diagnose. Wenn das verbindliche Gate scheitert, beobachtet der Test die identischen
strengen HTTPS-Antworten noch höchstens 90 Sekunden, meldet aber weiterhin
**FAIL**. Späte Bereitschaft kann einen Produktionsfehler nicht grün machen.

Admin muss den genauen lokalen Login-Redirect liefern; UI muss unangemeldete
strikte Authentifizierung und Schreibschutz melden. Zusätzlich muss der echte
Admin-Lizenzdienst `LICENSE_VALID` erreichen. Genau zwei zugelassene Instanzen,
ausbleibende erkannte Laufzeitfehler, reale private PID-Schreibvorgänge und ein
zweiter erfolgreicher Start werden geprüft. App-Bytes und Konfiguration dürfen
sich nicht ändern; nur Unix-Dateirechte bilden das schreibgeschützte Release ab.

Das Gate verwendet die R7-App mit aktuellen Host-/Readiness-Helfern aus dem
geprüften Quellstand. Ein R8-Builder muss die vollständige App-Bytegleichheit
nachweisen und den finalen Kandidaten samt Helfern zusätzlich authentifizieren;
dieser Test behauptet keine noch nicht durchgeführte R8-Kandidatenprüfung.

## Lokaler Prüfstand

```bash
EOS_MANAGEMENT_R7_BUNDLE=/absolut/authentifiziert/bundle \
EOS_MANAGEMENT_R7_KEY=/absolut/release-public.pem \
node --test tests/integration-management/contracts.cjs
```

Die expliziten Vorprüfungen authentifizieren sämtliche 22.841 R7-Dateien und
prüfen mit dem echten Lizenzkern die ephemere Lizenz einschließlich falscher UUID
und verschlüsseltem Speicher. Zusätzliche Konfigurationsverträge prüfen mit dem
echten Produktionsvalidator die Zulassung des festen Managementprofils sowie
die Ablehnung abweichender Hosts, Ports und Datenbanknamen. Diese Prüfungen
simulieren keine erfolgreiche TLS-Verbindung. Syntax und diese Vorprüfungen sind lokal ausführbar.
Die aktuelle Arbeitsumgebung hat nur UID 0 in ihrer UID-Map und keinen nativen
PostgreSQL-Server. **Native Fullmanagement-Ausführung ist bis zum tatsächlichen
CI-Ergebnis OFFEN.** Pi/ARM64, systemd-Mount-Policies, Browser-Login, Reboot,
physische Adapter und Anlagenbetrieb bleiben eigenständige offene Abnahmen.
