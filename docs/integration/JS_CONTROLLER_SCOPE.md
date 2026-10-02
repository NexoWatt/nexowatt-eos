# JS-Controller als verpflichtender Bestandteil des EOS-Systems

Stand: 30.09.2026. Änderungskennung: `EOS-INT-CONTROLLER-20260930`.
Prüfbasis dieses Installer-Repositories: `8da1152d556625bb8173fc8b5953d0caaef992f1`.
Status: Komponentenabgrenzung und gezielte Quellprüfung; keine Runtimeänderung,
keine Installation, keine Produktfreigabe.

Der **ioBroker.js-controller gehört ausdrücklich zum EOS-Produktumfang**. Er ist
keine austauschbare, ungeprüfte Voraussetzung außerhalb der CRA-Dokumentation.
Er startet Adapter, vermittelt deren Basis-API und Hostnachrichten, verwaltet
Objekte/Zustände und wirkt bei Installation, Konfiguration, Sicherung und
Wiederherstellung mit. Fachliche Energieregeln können zusätzlich in den
NexoWatt-Adaptern liegen; die Bezeichnung EOS Core verschiebt sie nicht
automatisch in den Controller.

## Quellen und Versionen getrennt halten

| Beobachtung | Belegter Stand | Bedeutung |
| --- | --- | --- |
| Vorhandener vollständig geklonter Prüfstand | `v7.2.2`, Commit `88516d65367580088327214bd9decedca77beea7` | Bezug der nachstehenden Controller-Codeaussagen; unverändert |
| Offizielle ioBroker-Stable-Liste, erneut gelesen | js-controller `7.2.2`; Blob `225e40b43ce79b06b60690b3918028cf4fecdeee` | Repository-Kanal; kein Nachweis eines aktuellen npm-Dist-Tags |
| GitHub neuestes Release | `v7.2.3`, veröffentlicht 19.09.2026, Tagcommit `418bc1c25967cfa283532a75486f0dd9cb99854a` | Separat beobachtetes Release; nicht automatisch ausgewählt oder geprüft |
| GitHub master | `587444e1cd24858845c2a0297f76e8ba72fe8ed5` | Entwicklungsreferenz; nicht freigegebener Produktstand |
| Adapter-Core | `@iobroker/adapter-core` `3.4.3`, Commit `cc8c32f9d7b3e94bab5c07c34b14a0b36b48978f` | Eigene Komponente außerhalb des Controller-Monorepositories |
| Auf Dominiques Geräten installiert | **unbekannt** | Muss lokal ohne Ausgabe von Geheimnissen erfasst werden |

Der Installer deklariert in `installer.sh:233` weiterhin
`"iobroker.js-controller": "stable"`. Er bindet damit einen veränderlichen
npm-Dist-Tag statt einer für das EOS-Release geprüften Version. Die bestehende
[Ersteinrichtungsprüfung](../security/CONTROLLER_FIRST_RUN.md) dokumentiert einen
früheren Abruf vom selben Tag mit npm stable `7.2.2` und latest `7.2.3`.
Ein zusätzlicher Abruf der aktuellen Controller-Dist-Tags schlug in dieser
Integrationsetappe mit begrenztem Abrufzeitraum fehl. Die erneut erfolgreiche
GitHub-Stable-Abfrage ersetzt diesen npm-Nachweis nicht. Es erfolgte kein Upgrade.

Auch Releasebezeichnung und Quelldateiversion dürfen nicht gleichgesetzt werden:
am beobachteten Tagcommit `v7.2.3` enthält `packages/controller/package.json`
die Version `7.2.3-alpha.19-20260918-45e1308b9`, während `io-package.json`
`7.2.3` ausweist. Vor einer Auswahl dieses Releases sind npm-Artefakt, Quellstand,
Build und diese Metadatenabweichung abzugleichen. Daraus wird hier keine
ausnutzbare Schwachstelle oder Manipulation abgeleitet.

## Vollständiger zu prüfender Controller-Umfang

Alle folgenden 14 Workspace-Manifeste des geprüften Controller-Tags deklarieren
`7.2.2`. Ihre relativen Pfade, SHA-256-Hashes, direkten Abhängigkeitsangaben und
Node-Anforderungen stehen in
[`controller-observations.json`](../../system/integration/controller-observations.json).
Die `file:../...`-Einträge im Quellmonorepository sind keine aufgelösten
Abhängigkeiten eines ausgelieferten npm-Pakets.

| Gruppe | Komponenten | Sicherheitsgrenze |
| --- | --- | --- |
| Runtime und Adapter-Basis | `iobroker.js-controller`, `@iobroker/js-controller-adapter` | Prozessstart, Adapter-API, Hostnachrichten, Rechte |
| Einrichtung und gemeinsame Funktionen | `@iobroker/js-controller-cli`, `@iobroker/js-controller-common`, `@iobroker/js-controller-common-db` | Konfiguration, Wartung, Downloads, Kryptografie, Dateizugriffe |
| DB-Basis | `@iobroker/db-base` | Protokollverarbeitung und gemeinsame DB-Funktionen |
| Objekte | `@iobroker/db-objects-file`, `@iobroker/db-objects-jsonl`, `@iobroker/db-objects-redis` | Objekt-/Dateibestand, ACLs, TLS-Client und PubSub |
| Zustände | `@iobroker/db-states-file`, `@iobroker/db-states-jsonl`, `@iobroker/db-states-redis` | Messwerte/Sollwerte, PubSub, Wiederanlauf und Datenalter |
| Entwicklungs-/Schnittstellentypen | `@iobroker/types`, `@iobroker/types-dev` | Build und Schnittstellenkompatibilität; nicht pauschal als Runtimebestand ausgeben |
| Separate Adapter-Brücke | `@iobroker/adapter-core` | Auflösung/Laden der tatsächlichen Controller-Adapterklasse und Zugriff auf Konfiguration |

Zusätzlich gehören der tatsächlich aufgelöste npm-Baum, Node.js/OpenSSL,
Betriebssystempakete und gegebenenfalls der echte Redis-Server in das
Build-/Geräteinventar. Der Controller-Quell-Lockfile enthält `ioredis` `4.28.5`;
die beiden Redis-Pakete deklarieren `^4.28.2`. Das ist **kein Beleg**, dass diese
Version auf dem Gerät läuft. Ebenso sind enthaltene Sentry-/Plugin-Abhängigkeiten
zu inventarisieren; ihre bloße Anwesenheit beweist keine aktivierte
Cloudübertragung. Das lokale EOS-Profil benötigt eine eigene Egress-Prüfung.

Adapter-Core `3.4.3` sucht in `src/utils.ts` zunächst
`@iobroker/js-controller-adapter`, danach weitere Controller-Pfade. Deshalb
reicht die Adapter-Core-Version allein nicht als Beleg der tatsächlich geladenen
Adapterklasse. Die Auflösung und die Version pro Adapterprozess sind bei der
Integration mit zu erfassen. Seine deklarierten Peer-Abhängigkeiten sind
`@iobroker/types >=6.0.11` und `@iobroker/js-controller-common-db >=7.2.2`;
die veröffentlichte Paketmetadatenabfrage meldete ebenfalls `3.4.3` und denselben
Git-Commit. Dies ist noch keine EOS-Kompatibilitätsfreigabe.

## Verschlüsselung: belegte Fähigkeit und offene Durchsetzung

Für **js-controller 7.2.2** gilt anhand der Quellprüfung:

1. `packages/controller/conf/iobroker-dist.json` verwendet standardmäßig JSONL,
   Loopback und leere `auth_pass`-Werte. Das getrennte `multihostService.secure`
   belegt keine Verschlüsselung der Objekte-/Zustandsverbindungen.
2. Die vier File-/JSONL-Server lehnen `settings.secure` in ihrem Promise mit
   `reject(...)` ab, führen mangels anschließendem `return` aber den Code für
   `net.createServer()` und `listen()` weiter aus. Dieser Quellpfad darf daher
   **nicht als zuverlässig geschlossenes Fehlverhalten** gelten. Es wurde hier
   kein echter Listener gestartet oder der vollständige Aufruferpfad reproduziert.
   Sicher ist: Dieser Schalter implementiert keinen TLS-Server.
3. Die externen Redis-Clients reichen `connection.options` an ioredis weiter,
   einschließlich eines dort bereitgestellten `tls`-Objekts. Das Passwort wird
   aus `options.auth_pass` beziehungsweise `connection.pass` gesetzt. Haupt- und
   PubSub-Verbindungen sind gemeinsam zu prüfen. Ein vorhandener TLS-Optionspfad
   beweist keinen TLS-only-Server, keine gültige Zertifikatsprüfung und keine
   tatsächlich ausgeführte verschlüsselte Verbindung.
4. `readBaseSettings` sendet die gesamte gelesene Basiskonfiguration zurück.
   `writeBaseSettings` schreibt sie nach wenigen Strukturprüfungen. Vollständige
   Autorisierung, Redaktion, atomare Änderung und unveränderbare EOS-TLS-Vorgaben
   sind separat nachzuweisen. Private mTLS-Schlüssel gehören nicht als allgemein
   auslesbare Inline-PEM-Werte in diese Konfiguration.
5. Adapter mit derselben Betriebssystemidentität und gemeinsamen lesbaren
   Zugangsdaten bilden weiterhin eine gemeinsame Vertrauenszone. TLS plus
   gemeinsames Passwort erzeugt weder mTLS pro Adapter noch Prozessisolation.

Die vorhandene [statische TLS-Prüfung](../security/RUNTIME_TLS.md) ist ein
Diagnosewerkzeug. Sie verhindert keine unzulässige Runtimeänderung. Die bereits
isoliert reproduzierte Entfernung von TLS-Optionen in **Upstream Admin 8.0.14**
darf nicht auf den derzeit verwendeten EOS Admin 7 übertragen werden; dessen
konkreter Quellstand und dieselben Konfigurationspfade sind eigenständig zu prüfen.

## Umsetzung und Abnahme auf Raspberry Pi 5

Das Nutzerprofil umfasst RPi 5 mit 8 beziehungsweise 16 GB RAM, SSD und
„Linux 12 Lite“. Die genaue Distribution, 32-/64-Bit-Architektur, Kernel-,
Firmware-, Node- und installierten Controllerstände bleiben bis zum Geräteinventar
offen. Ein Quellcheckout auf dem Entwicklungsrechner ist kein Hardwaretest.

Für den nächsten integrierten Stand sind erforderlich:

- Exakte Controller-/Adapter-/DB-Paketversionen und Artefakthashes im EOS-Release
  festlegen; installierte Versionen getrennt erfassen. Keine stille Umschaltung
  auf latest, master, einen anderen Admin-Hauptstand oder einen leeren DB-Bestand.
- Controller, Adapter-Core und DB-Pakete mit den NexoWatt-Adaptern gemeinsam bauen
  und ihre tatsächlich geladenen Versionen/Abhängigkeiten dokumentieren.
- Daten- und Hostnachrichten samt Absenderrechten, Konfigurationsänderungen,
  Schlüsselbereitstellung und TLS-Identitäten an den Schnittstellen absichern.
- Eine JSONL-zu-Redis-Migration nur mit konsistenter Sicherung, Bestandsvergleich
  von Objekten/Zuständen/Dateien, geprüftem Rückfall und kontrolliertem Stillstand
  umsetzen. Ein gemeinsamer Redis-Account bleibt eine Übergangs-Vertrauenszone.
- Positive und negative echte Verbindungstests: CA/SAN, abgelaufene Zertifikate,
  falsche Identität/Zugangsdaten, abgewiesener Klartext, PubSub, Reconnect,
  Schlüsselrotation sowie Konfigurationserhalt nach Adminänderung/Update.
- Geräte- und Regelungstests für Kommunikationsverlust, veraltete Werte,
  Prozessneustart, Stromausfall, Speicher-/SSD-Druck und Wiederherstellung;
  beide RAM-Varianten getrennt nachweisen. Bestehendes Design, Datenpunkte,
  Einheiten und Netz-/Gerätegrenzen erhalten.

Die dazugehörigen Bedrohungen und Anforderungen bleiben mit dem bestehenden
[System-Bedrohungsmodell](../security/THREAT_MODEL_SYSTEM.md) und den
[CRA-Systemanforderungen](../cra/SYSTEM_REQUIREMENTS.md) verbunden. Diese Etappe
ergänzt den Scope und Quellnachweise; sie meldet keine neuen bestandenen
Runtime-, Penetrations-, IEC- oder CRA-Konformitätsprüfungen.

## Primärbelege

- [Controller-Prüfcommit 7.2.2](https://github.com/ioBroker/ioBroker.js-controller/tree/88516d65367580088327214bd9decedca77beea7)
- [GitHub Release v7.2.3](https://github.com/ioBroker/ioBroker.js-controller/releases/tag/v7.2.3)
- [Controller-Paket am Release-Tagcommit](https://github.com/ioBroker/ioBroker.js-controller/blob/418bc1c25967cfa283532a75486f0dd9cb99854a/packages/controller/package.json)
- [Offizielle Stable-Liste](https://github.com/ioBroker/ioBroker.repositories/blob/master/sources-dist-stable.json), beobachteter Blob oben
- [Adapter-Core-Prüfcommit 3.4.3](https://github.com/ioBroker/adapter-core/tree/cc8c32f9d7b3e94bab5c07c34b14a0b36b48978f)
- [Adapter-Core npm-Metadaten](https://registry.npmjs.org/@iobroker%2fadapter-core/latest), beobachteter Stand oben

Die maschinenlesbare Begleitdatei hält Quellen, einzelne Dateihashes,
Versionsunterschiede, offene Prüfungen und die Grenzen dieser Beobachtungen fest.
