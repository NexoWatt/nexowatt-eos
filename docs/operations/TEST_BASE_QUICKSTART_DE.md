# EOS-Grundsystem 0.1.0-test.1: Aufbau und Abnahme

Dieser Stand enthält den geschlossenen **Controllerkern** mit TLS-Datenbanken,
Startprüfung, Paketprüfung und gesperrten gewöhnlichen Installationswegen.
Die bestehenden NexoWatt-Oberflächen und Fachadapter bleiben separate
Entwicklungsstände. Sie werden hier noch nicht aktiviert. Das ist eine
Testbasis, kein vollständiges Anlagenprodukt und keine fertige Ersteinrichtungs-UI.

## Geeignete Testumgebung

- Frisches Debian/Raspberry Pi OS Bookworm **12**, 64 Bit, systemd;
  `arm64` für den Raspberry Pi 5 oder `x64` für eine separate VM.
- Node **24.19.0** unter `/usr/bin/node`, Redis mit TLS-Unterstützung unter
  `/usr/bin/redis-server`, OpenSSL, systemd, `getcap`, `ss` sowie die üblichen
  Benutzerverwaltungswerkzeuge. Pakete aus gepflegten, authentifizierten
  Distributions-/Herstellerquellen vorbereiten und den Patchstand erfassen.
  Das verwendete Redis-Testwerkzeug 7.2.10 ist **keine Empfehlung für das Produkt**.
- Keine bestehende ioBroker-Installation, keine EOS-Konten/Datenverzeichnisse.
  Vor dem Versuch einen VM-/SSD-Snapshot erstellen. Diese Etappe migriert keine
  vorhandenen JSONL-Daten und überschreibt keine Anlage.

Für erste Versuche ist eine getrennte VM übersichtlicher. RPi 5 mit 8 und 16 GB,
SSD, Stromausfallverhalten und reale Geräte müssen anschließend separat geprüft
werden. Die hier ausgeführten Tests auf Ubuntu x86_64 ersetzen das nicht.

## Vorbereitete Lieferung prüfen und installieren

Das vollständige Liefer-ZIP enthält das Repository und zusätzlich unter
`delivery/` ein vorbereitetes signiertes Offline-Testpaket samt öffentlichem
**Testschlüssel**. Der private Signierschlüssel ist nicht enthalten. Der öffentliche
Schlüssel ist ausschließlich der Vertrauensanker dieses Teststands; seine
Übernahme ist kein eingerichtetes Hersteller-Schlüsselmanagement.

Im entpackten Repository zunächst ohne Änderungen prüfen:

```bash
node tools/system/eos-base.cjs verify \
  --bundle delivery/test-bundle \
  --public-key delivery/test-release-public.pem
```

Die Prüfung verlangt die exakte Node-Version und eine im Testmanifest genannte
Architektur. Ein erfolgreiches Ergebnis ist eine Integritäts-/Profilprüfung,
kein Nachweis für das Zielgerät.

Auf der **frischen Testmaschine** die signierten Dateien in einen geschützten
Importbereich kopieren. Den folgenden Namen nur verwenden, wenn er noch nicht
vorhanden ist; bestehende Importe nicht überschreiben:

```bash
sudo install -d -m 0700 /root/eos-test-import-01
sudo cp -R delivery/test-bundle /root/eos-test-import-01/test-bundle
sudo cp delivery/test-release-public.pem /root/eos-test-import-01/release-public.pem
sudo chmod -R go-w /root/eos-test-import-01

sudo /usr/bin/node tools/system/eos-base.cjs preflight --node-version 24.19.0
sudo /usr/bin/node tools/system/eos-base.cjs install \
  --bundle /root/eos-test-import-01/test-bundle \
  --public-key /root/eos-test-import-01/release-public.pem \
  --start yes
```

Den Repository-Einstieg ebenfalls aus einer geprüften, währenddessen nicht
fremdbeschreibbaren Kopie ausführen. Kein `curl | bash` verwenden; für einen
späteren Online-Installer ist eine zusätzliche überprüfbare Bootstrap- und
Signaturkette nötig.

Der Installer legt drei unprivilegierte Dienstkonten an, erzeugt individuelle
TLS-Identitäten und Datenbankkennwörter, installiert die systemd-Units und startet
erst nach den Prüfschritten. Bei einer fehlgeschlagenen Initialisierung bleibt
die Anlage gesperrt. Ein abgebrochener Installationsversuch wird nicht durch
blindes erneutes Ausführen oder Löschen von Prüfmarkern repariert: Fehlerbeleg
sichern und den frischen Testsnapshot wiederherstellen.

## Was nach dem Start vorhanden ist

```bash
sudo systemctl status nexowatt-eos-controller.service \
  nexowatt-eos-redis@objects.service nexowatt-eos-redis@states.service
sudo journalctl -u nexowatt-eos-controller.service -b --no-pager
sudo /usr/bin/node /opt/nexowatt/eos/current/runtime/release/installed-check.cjs
sudo /usr/bin/node /opt/nexowatt/eos/current/runtime/transport/redis-tls.cjs \
  probe --config /etc/nexowatt-eos/iobroker.json
```

Soll: Controller meldet Bereitschaft, beide Stores sind authentifiziert über
TLS erreichbar, kein zusätzlicher Adapter läuft. Standard-Adminanmeldung,
Repository-Nachladen, automatische Updates und Shell-/Installationsnachrichten
sind gesperrt. Im Kernpaket gibt es noch keinen freigeschalteten Browserzugang.

Die internen Datenbanken lauschen TLS-only auf `127.0.0.1:16379/16380`.
Es wird keine globale Firewall verändert. Ethernet, WLAN, VLANs und Tailscale
werden nicht durch eine neue LAN-Liste eingeschränkt. Erreichbarkeit und
Serviceberechtigungen hängen weiterhin von Routing, bestehender Firewall und
Tailscale-Regeln ab. Tailscale selbst wird nicht automatisch angemeldet; keine
VPN-Schlüssel werden mitgeliefert. Die gesonderte UI behält ihre Netzbindung.

## Reproduzierbare Entwicklung

Auf einem unprivilegierten Buildrechner einen **neuen** App-Baum mit den Dateien
aus `system/test-base/app/` anlegen. Darin `npm ci --ignore-scripts --no-audit
--no-fund` ausführen. Das erzeugt den exakt gesperrten Abhängigkeitsbaum, aber
keine Hostdienste. Anschließend den versions-/hashgebundenen Controllertransform
`runtime/controller-profile/transform.cjs` anwenden. Dafür `applyToBuild(appPath, [])`
verwenden; `[]` bedeutet zunächst keine freigegebenen Adapter. Details stehen in
[`CONTROLLER_TEST_PROFILE.md`](../security/CONTROLLER_TEST_PROFILE.md).

Der Build-Ablauf besteht aus separaten, überprüfbaren Schritten:

1. Originalpakete gemäß Lockfile herstellen; Controllerprofil anwenden.
2. Komponenten mit `prepare-catalog.cjs --app ... --output ...` inventarisieren.
   Es entstehen ausschließlich `pending`-Einträge.
3. Quellen, Abhängigkeiten, benötigte Rechte, Geräteprotokolle und Fehlerverhalten
   prüfen; positive/negative Tests ausführen. Erst danach Katalogstatus und
   konkrete Belegkennung für genau diese Dateihashes setzen.
4. CycloneDX aus dem tatsächlichen Baum erzeugen (`npm sbom --omit=dev
   --sbom-format=cyclonedx`) und mit `tools/sbom/test_base.py` binden/prüfen.
5. Manifest/Testprofil prüfen, mit geschütztem Testschlüssel signieren:
   `tools/system/build-bundle.cjs` verlangt `--app`, `--catalog`, `--sbom`,
   `--metadata`, `--private-key` und `--output`.
6. Das fertige Bundle separat verifizieren; Tests gegen den ausgelieferten
   Baum wiederholen. Private Schlüssel und Gerätedaten gehören nie ins ZIP.

## Zusätzliche Adapter

Zusätzliche Adapter benötigen ein neues geprüftes, signiertes Systempaket mit
exakten Versionen und aktualisierter Stückliste. Gewöhnliches `iob install`,
`iob url`, Admin-URL-Installation und dynamische npm-Erweiterungen sind in diesem
Profil gesperrt. Das Controllerprofil lässt ausschließlich ausdrücklich
freigegebene Paketnamen, Versionen und feste JS-Einstiegspunkte zu.

Eine additive Paketinstallation schaltet noch keine Geräteinstanz frei.
Nach Prüfung eines neuen Bundles wird der entsprechende Teststand über
`eos-base.cjs extend --bundle <geschuetzter-import> --public-key <bisheriger-pruefkey>`
installiert. Diese Operation ist auf zusätzliche freigegebene Pakete begrenzt;
bisheriger Controllercode, bestehende Adapter und ihre Abhängigkeiten bleiben
unverändert. Ein fehlgeschlagener Controllerstart löst den Rückfall auf den
bisherigen Paketstand aus. Die Grenzen nach Stromausfall und die ausgeführten
Tests stehen in [`ADDITIVE_RELEASE_ACTIVATION.md`](ADDITIVE_RELEASE_ACTIVATION.md).
Anschließend müssen ihre Rechte, Ersteinrichtung, Gerätekommunikation,
Ausfallstrategie und TLS-Nutzung separat abgenommen werden. Der vorliegende
Bootstrap erwartet weiterhin einen Controllerkern ohne Adapterinstanzen.
Admin/UI-Lizenzfreigabe und die spätere kontrollierte Instanz-Ersteinrichtung
sind weitere Integrationsschritte. Bestehende Design- und Regelfunktionen werden
dadurch nicht umgestaltet.

## Abnahmeprotokoll auf dem Zielgerät

| Test | Erwartung | Hier bereits auf Zielhardware belegt? |
| --- | --- | --- |
| Erststart / Neustart | gültige Signatur, TLS-Probe und frischer Controller-Heartbeat | Nein |
| veränderte Programmdatei | Start wird abgewiesen | Nein; Dateiprüfung automatisiert getestet |
| falsches Zertifikat / Passwort | keine Verbindung, kein Klartext-Fallback | Nein; echte TLS-/Redis-Prüfung im Labor bestanden |
| Dienstkonto | keine sudo-/Dockerrechte, Code/Config nicht beschreibbar | Nein; Hostbefehle simuliert |
| Stromausfall / SSD voll | nachvollziehbare Wiederherstellung ohne unbemerkte Teilmigration | Nein |
| Tailscale | berechtigter Servicezugriff, andere Zugriffe nach Regelwerk abgewiesen | Nein |
| Zertifikatserneuerung | rechtzeitige Erneuerung ohne Kommunikationsverlust | Noch zu implementieren; Testzertifikate 90 Tage |

Ein abgelaufenes Zertifikat führt zum sicheren Verbindungsabbruch. Vor einem
langfristigen Anlagenbetrieb fehlen automatische Erneuerung, Alarmierung und
Geräte-Failsafe-Abnahmen. Die Testbasis darf diese offenen Lebenszykluspunkte
nicht als bereits erfüllte CRA-/IEC-Nachweise ausgeben.
