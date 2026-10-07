# Zentrale Lizenzfreigabe für NexoWatt EOS-Adapter

Stand: EOS Admin 7.10.11 / Client 1.0.2 · 05.10.2026 · Protokoll v1 · Clientmodul `packages/eos-license-client/`.

Diese Datei beschreibt den gemeinsamen Lizenzvertrag für eigene EOS-Adapter.
Der zentrale Admin-Dienst und der Client verwenden unverändert das lokale
Nachrichtenprotokoll v1. Die konkrete Einbindung, Zählweise und sicheren
Fehlerpfade jedes Verbraucheradapters werden in dessen eigenen Prüfbelegen
festgehalten; die Clientprüfung allein bestätigt keine Geräteintegration.

## Grundregel und Vertrauensgrenze

Der EOS Admin überprüft die vom Hersteller signierte, an die System-UUID gebundene
Lizenz. Er verwaltet auch die verschlüsselte Ablage. Ein Verbraucheradapter erhält
**keinen Lizenzschlüssel und keinen Entschlüsselungsschlüssel**, sondern eine kurze
Freigabe für seinen eigenen Adapternamen, eine konkrete Funktion und die benötigten
Mengen. Das private Signaturmaterial bleibt ausschließlich beim Hersteller/Keygen.

Ohne eine gültige aktuelle Freigabe bleiben die lizenzierten Arbeitsfunktionen
gesperrt. Diagnose, Einrichtung, Lizenzstatus und die vorher geprüfte gerätespezifische
Sicherheitsbehandlung müssen erreichbar bleiben. Der Admin selbst bleibt ohne
Lizenz für Import, Fehlerbehebung und Systemverwaltung erreichbar; sonst wäre eine
Aktivierung nach fehlendem oder abgelaufenem Schlüssel nicht möglich.

Die ioBroker-Messagebox ist eine lokale Vertrauensgrenze innerhalb des Systems.
Sie ist **keine kryptografisch geschützte Gegenstelle gegenüber einem bereits
kompromittierten Adapter, gemeinsamem Betriebssystembenutzer oder Root**.
Solche Angreifer können möglicherweise Datenbank, Code oder Prozessspeicher ändern.
Eine lokale, veränderbare JavaScript-Prüfung bietet gegen diese Angreifer keinen
absoluten Kopierschutz. Die verschlüsselte Datei allein schützt auch nicht vor einem
Angreifer, der zugleich auf den lokalen Ablageschlüssel oder den Prozess zugreifen
kann. Für diese weitergehende Grenze sind getrennte Betriebssystemidentitäten,
restriktive Schnittstellen und gegebenenfalls ein hardwaregebundener Schlüssel
gesondert umzusetzen und nachzuweisen.

## Bindung an die EOS-Installation

Vor jeder neuen Clientanfrage und bei Start, Status, Lizenzimport sowie laufender
Prüfung des Admin-Dienstes wird die lokale EOS-Installation kontrolliert. Ein
gewöhnliches ioBroker mit kopiertem Adapter oder allein umbenanntem Admin erhält
keine Freigabe, auch wenn eine formal gültige UUID-Lizenz vorhanden ist.

`assertEosPlatform(adapterName)` verlangt Linux und die geschützte aktive
`/etc/nexowatt-eos/release-state.json`. Schema, Release-ID, Node-Version und
Schlüsselfingerabdruck müssen dem installierten Profil entsprechen. Unter
`/opt/nexowatt/eos/releases/<releaseId>/app/node_modules/` müssen das
Controllerprofil `iobroker.js-controller/eos-test-profile.json`, das eigene
Paket mit seiner freigegebenen Version und der tatsächlich gestartete
`require.main.filename` zusammenpassen. Controllerpaket und Profilversion müssen
übereinstimmen. Der Root-verwaltete Symlink `/opt/nexowatt/eos/current` muss
exakt auf dasselbe aktive Release zeigen; nur dieser kontrollierte Zeiger darf
ein Symlink sein. Die Prüfung erfindet keine separate Aktivierungsdatei und
fordert keine eigene Adapterlizenz an.

Alle gelesenen Dateien und jeder Pfadvorfahr gehören Root und sind weder gruppen-
noch weltbeschreibbar. Symlinks, mehrfach verlinkte Dateien, ersetzte
Dateideskriptoren, übergroße oder ungültige Daten führen zu `EOS_PLATFORM_*` und
Sperre. Die vorhandene signierte Releaseprüfung beim Dienststart bleibt eine
getrennte Voraussetzung; diese kleine Adapterprüfung ersetzt keinen kompletten
Signatur-/Hashvergleich des Lieferbaums. Der aktuelle Installationsvertrag trägt
`profile: "test"`; andere Profile müssen vor Einführung ausdrücklich unterstützt
und geprüft werden.

Korrektur 07.10.2026: Die tatsächliche UI-`package.json` umfasst 73.193 Byte und
überschritt das bisherige 64-KiB-Limit. Paketmetadaten von Adapter und Controller
haben jetzt ein festes 128-KiB-Limit; Release-State bleibt auf 4 KiB und Profil auf
32 KiB begrenzt. Auch Wachstum nach `stat` wird durch begrenztes Lesen erkannt.
Alle sechs eigenen Adapter enthalten dieselbe korrigierte Clientdatei. Tests
verwenden die echten sechs Paketbeschreibungen sowie Grenzwert-, Übergrößen- und
Dateiwachstumsfälle. Rechte, Pfade, Version, Einstiegspunkt, Signaturen und
Lizenzbedingungen werden nicht gelockert. Der native R9-Start ist der zusätzlich
erforderliche Integrationsnachweis, nicht durch isolierte Tests ersetzt.

Es gibt keinen Umgebungs-, Konfigurations- oder Guard-Schalter zum Überspringen
der Plattformprüfung. Isolierte Tests ersetzen die Dateisystemschnittstelle oder
die Plattformabhängigkeit ausdrücklich im Testlader. Solche Tests belegen keine
native Installation. Das Admin-Verwaltungsfrontend bleibt ohne aktivierte Lizenz
zur Einrichtung erreichbar; außerhalb der bestätigten EOS-Plattform erteilt sein
Lizenzdienst dennoch keine Aktivierung oder Betriebsfreigabe.

Plattformverlust wird bei der nächsten regulären Prüfung erkannt. Bestehende
Freigaben haben weiterhin maximal 15 Sekunden Laufzeit; der Client prüft die
Plattform normalerweise alle fünf Sekunden. Root oder bereits ausgeführter
manipulierter Runtimecode kann diese lokalen Prüfungen ändern. Diese Grenze ist
kein unüberwindbarer Kopierschutz und keine Hardwareattestierung.

## Clientmodul übernehmen

Den vollständigen Ordner `packages/eos-license-client/` mit dessen Lizenzhinweisen
aus diesem Herstellerrepository in den jeweiligen Adapter übernehmen, zum Beispiel
unter `lib/eos-license-client/`. Die Dateien in den npm-Lieferumfang des Adapters
aufnehmen und den tatsächlich gepackten Inhalt prüfen. Das Modul hat keine externen
Runtime-Abhängigkeiten und unterstützt Node.js 22 und 24; in diesem Lieferlauf wurde Node.js 24
geprüft. Die für das jeweilige EOS-Produkt freigegebene Node-Version bleibt
zusätzlich maßgeblich.

CommonJS:

```javascript
const { createLicenseGuard, LicenseError } = require('./lib/eos-license-client');
```

ES-Modul:

```javascript
import licenseClient from './lib/eos-license-client/index.js';
const { createLicenseGuard, LicenseError } = licenseClient;
```

Der mitgelieferte Unterordner enthält eine eigene `package.json` mit
`"type": "commonjs"`. Diesen Modulmodus beim Kopieren erhalten.

## Lebenszyklus und sichere Gerätebefehle

Vor dem ersten Betriebsauftrag einen Guard erzeugen. `adapter.name` und
`adapter.namespace` stammen aus der eigenen ioBroker-Instanz und dürfen nicht als
frei wählbare Lizenzidentität konfigurierbar sein. Das folgende Muster gehört in
den jeweiligen Adapter; die drei fachlichen Hilfsmethoden müssen dort passend zur
Geräteanbindung implementiert und geprüft werden.

```javascript
async function initializeLicensedOperation(adapter, configuredTotals) {
    const guard = createLicenseGuard(adapter, {
        adminInstance: 'eos-admin.0',
        feature: 'energy',
        required: {
            chargePoints: configuredTotals.chargePoints,
            batteries: configuredTotals.batteries,
        },
        onLost: async ({ code }) => {
            // In-flight Requests/Queues abbrechen, soweit das Protokoll es erlaubt.
            adapter.cancelPendingOperationalJobs();
            // Nur geprüfte, begrenzte Sicherheitsaktion; keine pauschale Abschaltung.
            await adapter.enterValidatedDeviceSafeState(code);
        },
    });

    // Start ist bis zur ersten erfolgreichen Antwort gesperrt.
    await guard.start();
    return guard;
}

async function writeLicensedSetpoint(adapter, guard, requestedSetpoint) {
    guard.assertAllowed();
    const safeSetpoint = await adapter.validateAndLimitSetpoint(requestedSetpoint);
    // Nach jedem await unmittelbar vor dem nächsten Betriebsbefehl erneut prüfen.
    guard.assertAllowed();
    return adapter.writeDeviceSetpoint(safeSetpoint);
}

async function executeLicensedBilling(adapter, guard, input) {
    guard.assertFeatureAllowed('billing');
    const prepared = await adapter.prepareBilling(input);
    guard.assertFeatureAllowed('billing');
    return adapter.commitBilling(prepared);
}
```

`onLost` ist verpflichtend. Er muss laufende Befehlswarteschlangen begrenzen oder
abbrechen und das für den konkreten Hersteller/Firmwarestand geprüfte Verhalten
bei Verlust der Betriebsfreigabe auslösen. Diese Sicherheitsaktion braucht einen
eigenen, eng begrenzten Codepfad; sie darf nicht an einem bereits gesperrten
`assertAllowed()` hängenbleiben. Physische Schutzfunktionen, Netzanschlussgrenzen,
Watchdogs und unabhängige Gerätebegrenzungen gelten weiter. Beispielsweise ist ein
pauschales Abschalten aller Speicher oder der gesamten Anlage kein allgemeingültiger
sicherer Zustand.

`onLost` wird je zusammenhängender Sperrphase einmal aufgerufen. Bei einem
asynchronen Callback bleibt die Freigabe gesperrt, bis er abgeschlossen ist und
eine anschließende neue Prüfung erfolgreich war. Wirft der Callback einen Fehler,
bleibt der Guard mit `SAFE_STATE_FAILED` gesperrt. Nach Fehlerbehebung einen neuen
Guard erzeugen; ein Fehler darf nicht durch einen Neustart ohne Ursachenprüfung
als erledigt gelten. Der Client protokolliert nur eine feste Diagnose ohne
Fehlerinhalte oder Schlüssel.

Bei Adapter-Unload zuerst neue Arbeitsaufträge verhindern und anschließend
`await guard.stop()` sowie die eigene Kommunikationsbereinigung ausführen.
`stop()` sperrt sofort, verwirft verspätete Antworten und ist endgültig. Für einen
neuen Lebenszyklus einen neuen Guard anlegen. Ein hängender gerätespezifischer
Sicherheitscallback muss durch dessen eigene, endliche Kommunikationszeitlimits
begrenzt werden.

Ein Scheduler darf weiter existieren, aber bei jedem Lauf muss er vor fachlicher
Arbeit `guard.isAllowed()` prüfen. Alle tatsächlich ausführenden Pfade brauchen
zusätzlich `assertAllowed()` unmittelbar vor ihrer Aktion: Gerätekommunikation,
State-Änderungen mit Betriebswirkung, API-/WebSocket-Befehle, Messagebox-Befehle,
Zeitpläne, Wiederholungswarteschlangen und Hintergrundaufgaben. Nur im Frontend
einen Schalter auszublenden ist keine Zugriffskontrolle.

## API des Guards

| Methode | Verhalten |
| --- | --- |
| `start()` | Fragt sofort und anschließend alle 5 Sekunden; liefert zunächst `Promise<boolean>`. |
| `refresh()` | Fragt einmal; parallele Aufrufe teilen dieselbe laufende Prüfung. Jeder tatsächlich versandte Request hat eine neue zufällige Nonce. |
| `isAllowed()` | Prüft synchron die Freigabe und beide Ablauffristen; bei Ablauf sofort gesperrt. |
| `assertAllowed()` | Wirft bei Sperre einen `LicenseError` mit Diagnosecode. |
| `isFeatureAllowed(name)` | Prüft die frische gemeinsame Freigabe und das Vorhandensein der konkreten Funktion; unbekannte Namen sind gesperrt. |
| `assertFeatureAllowed(name)` | Wirft bei fehlender Funktion `FEATURE_NOT_LICENSED`, bei allgemeiner Sperre den entsprechenden Lizenzfehler. |
| `getStatus()` | Liefert eine Kopie des freigegebenen Status, niemals Schlüsselmaterial. |
| `stop()` | Sperrt sofort und wartet auf den Sicherheitscallback; keine spätere Antwort aktiviert diesen Guard wieder. |

Der Response-Timeout beträgt höchstens 2 Sekunden; `timeoutMs` kann zwischen 10
und 2.000 Millisekunden verkürzt werden. Eine technische Freigabe gilt höchstens
15 Sekunden. Der Client begrenzt sie mit monotoner Laufzeit **und** der lokalen
Uhrzeit. Zurückstellen der Uhr verlängert dadurch keine laufende Freigabe.
Fehlende Antworten, ungültige Daten, Lizenzverlust oder überschrittene Mengen
sperren beim nächsten Prüfergebnis beziehungsweise spätestens mit Ablauf der
letzten Freigabe. Das ist keine harte Echtzeitzusage für den Betrieb bei einem
blockierten Prozess/Event-Loop. Hierfür sind Gerätewatchdogs und unabhängige
Schutzfunktionen erforderlich.

## Home und Pro

Nicht nur die Edition als Boolean prüfen. Bei aktuellen NWL3-Systemlizenzen
leitet der vertrauenswürdige Admin aus der signierten Edition die Funktionen und
Mengen ab. NWL3 gilt für das System; zusätzliche Adapterkeys sind nicht nötig.
Vorhandene NWL2-Lizenzen behalten ihre engeren signierten Adapterlisten und Mengen.

| Eigenschaft | Home | Pro |
| --- | --- | --- |
| Ladepunkte (NWL3) | maximal 3 | maximal 50 |
| Batteriesysteme | maximal 2 | maximal 10 |
| Unterstützte Funktionsnamen | `energy`, `wallet`, `smartHome`, `microgridSlave` | zusätzlich `microgridMaster`, `multisite`, `billing` |
| Freigegebene Adapter (NWL3) | aktivierte lokale Instanzen; Plattformprüfung bleibt verpflichtend | ebenso |

Ein Funktionsname im Schema bedeutet nicht, dass er automatisch in jeder Lizenz
enthalten ist. Bei einer Pro-Funktion muss der Adapter diese konkrete Funktion
mit `assertFeatureAllowed()` unmittelbar vor der Aktion prüfen. Ein gültiges
`energy`-Ergebnis allein erlaubt beispielsweise keinen Microgrid-Masterbetrieb.

Pro Adapterinstanz bevorzugt **einen gemeinsamen Guard** für die benötigte
Grundfunktion verwenden. Weitere Funktionen anhand derselben frischen Freigabe
mit `isFeatureAllowed()` für die Anzeige und `assertFeatureAllowed()` im
ausführenden Backend prüfen. Der Admin liefert hierfür die gesamte verifizierte
Funktionsliste. Dafür entstehen keine weiteren Messagebox-Anfragen; die
30-Prüfungen-pro-Minute-Grenze des Dienstes wird durch den normalen 5-Sekunden-Takt
nicht überschritten. Eine fehlende optionale Pro-Funktion sperrt diese Aktion,
ohne vorhandene Home-Funktionen abzuschalten. Bei Verlust der gemeinsamen Freigabe
sind alle Funktionen dieses Guards gesperrt.

`required` muss die tatsächlichen relevanten Mengen enthalten. Die Clientangabe
ist **keine bereits implementierte systemweite Mengenaggregation**. Vor Freigabe
eines Verbraucheradapters sind seine Zählweise, Mehrfachinstanzen, weitere
Verbraucheradapter und die gemeinsame Anlagenkonfiguration abzugleichen, damit
die Aufteilung auf mehrere Instanzen die Home-Grenzen nicht umgeht. Bei einer
Konfigurationsänderung oder neuen Geräten vor der Erweiterung einen neuen Guard
mit aktualisierten Anforderungen anlegen und erfolgreich prüfen. Alte Freigaben
dürfen höhere Mengen nicht still übernehmen. Eigentlicher Anlagenumfang und
lizenzierter Umfang dürfen nicht aus frei beschreibbaren Anzeige-States abgeleitet
werden.

## Nachrichtenvertrag v1

Ziel ist eine explizite Instanz, standardmäßig `eos-admin.0`. Befehl:
`eos.license.check`. Der Client nutzt `adapter.sendTo`; der Admin prüft zusätzlich
den vom ioBroker-Nachrichtenbus gelieferten Absender `system.adapter.NAME.N`,
die aktivierte Instanz, den Instanznamen und den verifizierten Systemumfang
beziehungsweise die engere signierte NWL2-Adapterfreigabe.

```javascript
// Anfrage: nonce ist pro Request kryptografisch zufällig, 32 kleine Hex-Zeichen.
{
    v: 1,
    nonce: requestNonce,
    adapter: adapter.name,
    feature: 'energy',
    required: { chargePoints: 3, batteries: 2 }
}

// Positive Antwort: Zeitwerte sind Unix-Epochenzeit in Millisekunden.
{
    v: 1,
    nonce: requestNonce,
    valid: true,
    code: 'LICENSE_VALID',
    edition: 'home',
    features: ['energy', 'wallet', 'smartHome', 'microgridSlave'],
    limits: { chargePoints: 3, batteries: 2 },
    checkedAt: checkedAtMilliseconds,
    validUntil: maximumFifteenSecondsAfterCheck
}
```

Eine negative Antwort hat `valid: false`, einen Diagnosecode, `edition: null`,
`features: []` und `limits: {}`. Keine Freigabe aus einem Timeout oder fehlenden
Feld ableiten. Keine alten Antworten, alten Keys oder lokal gespeicherten
`licenseValid=true`-States als Ersatz verwenden. Rohkeys nicht in States,
Adapterobjekte, URLs, Browser-Speicher, Backups im Repository oder Logs kopieren.

Die Messagebox-Prüfung setzt keine Freigabe für das Lesen der verschlüsselten
Lizenzdatei voraus. Verbraucheradapter brauchen keinen Zugriff auf Admin-Vault,
Public-Key-Provisionierung oder Keygen. Ihre normalen Geräte-, State- und
Administrationsrechte müssen separat auf das notwendige Maß begrenzt werden;
eine Lizenzprüfung ersetzt keine Benutzer-/Rollenberechtigung.

## Prüfung jedes integrierten Adapters

Vor Übergabe prüfen und mit Version, Konfiguration sowie bereinigtem Rohprotokoll
belegen:

1. Ohne Lizenz/mit falscher UUID/ohne Adapterfreigabe kein Betriebsauftrag;
   Diagnose und Aktivierung bleiben erreichbar.
2. Home bis zur freigegebenen Menge erlaubt, jede Überschreitung gesperrt;
   Pro-Funktionen in Home gesperrt; Pro-Mengen ebenfalls begrenzt.
3. Admin-Neustart, gelöschte oder abgelaufene Lizenz, Timeout und Kommunikationsverlust
   führen innerhalb der dokumentierten Frist zur Sperre und zur sicheren Geräteaktion.
4. Replay, falsche Nonce, manipulierte/fehlende Felder, verspätete Antworten,
   zurückgestellte Uhr und parallele Requests erzeugen keine unberechtigte Freigabe.
5. Alle Schreibpfade einschließlich Wiederholungen und API-Befehlen prüfen die
   Freigabe unmittelbar vor der Aktion; Konfigurationsänderungen berücksichtigen neue Mengen.
6. Physisches Verhalten bei bereits laufendem Ladevorgang, Speicherregelung und
   Netzbegrenzung sowie die sichere Wiederaufnahme am konkreten Gerät testen.

Reproduzierbare Clientprüfung in diesem Repository:

```bash
node --test test/eos-license-*.test.cjs
```

Diese automatisierten Tests verwenden einen simulierten ioBroker-Transport und
eine ausdrücklich simulierte EOS-Plattform. Die gesonderten Plattformtests prüfen
positive und negative Pfad-/Rechte-/Metadatenfälle mit einem Dateisystemmodell.
Sie sind keine Geräteprüfung und kein Nachweis einer unabhängigen Zertifizierung
oder vollständigen IEC-/CRA-Konformität. Die Integration aller ausgelieferten
Adapter und systemweite Mengenkontrolle bleiben eigene Freigabeschritte.

Änderung und konkrete Rohbelege: [EOS-Plattformbindung 05.10.2026](../../reports/security/eos-platform-2026-10-05/README.md).
