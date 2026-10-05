# EOS-Plattformbindung des zentralen Lizenzvertrags

Datum: 05.10.2026. Basiscommit: `4e171e42a290119f285714beb86b669c71db7171`.
Geprüfte Quell-/Builddateien sind zusätzlich durch `source-hashes.json` gebunden.
Umgebung: Linux x64, Node.js 24.19.0. Admin 7.10.11, Client 1.0.2.

## Änderung und Sicherheitswirkung

`EOS-LICENSE-PLATFORM-01`: Der gemeinsame Client und die zentrale Admin-Autorität
verlangten zuvor nur einen passenden lokalen Lizenzdialog; der Admin konnte auch
außerhalb einer installierten EOS-Plattform antworten. Beide kontrollieren jetzt
die aktive Root-verwaltete Release-Metadatei, das freigegebene Controllerprofil und
den Root-verwalteten `current`-Zeiger auf dasselbe Release und
den eigenen tatsächlichen Prozessstartpfad mit Paketname/Version/Main. Linux,
exakte geschützte Pfade, sichere Eigentümer/Rechte, keine Symlinks/Mehrfachlinks,
begrenzte Datei-/JSON-Längen und Dateideskriptoridentität sind Pflicht. Fehler
liefern ausschließlich feste `EOS_PLATFORM_*`-Codes.

Der Client prüft vor jeder neuen Anfrage. Der Admin prüft vor Initialisierung,
Lizenzimport und jeder Bewertung. Außerhalb EOS gibt es keine Aktivierung oder
Betriebsfreigabe. In EOS bleibt die Verwaltung auch ohne Lizenz erreichbar.
NWL2/NWL3-Verifikation, UUID-Bindung, verschlüsselte Ablage, Nonce, monotone
15-Sekunden-Lease, Home/Pro-Rechte und `onLost`-Lebenszyklus bleiben erhalten.
Die unveränderte Guard-API erhält TypeScript-Deklarationen; das komplette
Clientpaket einschließlich `eos-platform.js` muss mitgeliefert werden.

## Tatsächlich ausgeführte Prüfungen

Befehl vom Repositorywurzelverzeichnis:

```bash
node --test --test-reporter=tap components/admin/test/eos-license-*.test.cjs
```

Ergebnis: **96 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen**. Vollständiges
bereinigtes Protokoll: `licensing.tap`. Darin enthalten:

- Positives EOS-Dateisystemmodell einschließlich aktiver `current`-Bindung und Ablehnung gewöhnlicher Startpfade,
  fehlender/falscher Metadaten, anderer Node-/Controller-/Adapterversionen,
  nicht zugelassener Pakete und manipulierter Main-Pfade.
- Root-/Schreibrechte, Pfadsymlinks, Hardlinks, ersetzte Dateideskriptoren,
  Größen-/JSON-/UTF-8-Grenzen und Descriptorfreigabe bei Fehlern.
- Client startet gesperrt und kontaktiert außerhalb EOS keine Autorität;
  Plattformverlust verwirft bestehende Leases und ruft `onLost` auf.
- Autorität lehnt Start/Import/Anfragen außerhalb EOS ab, erzeugt dabei keine
  Lizenzdatei und widerruft vorherige Entscheidungen bei Plattformverlust.
- Bestehende Kryptografie-, UUID-, Home/Pro-, Speicher-, HTTP-, Replay-,
  Clock-Rollback-, Timeout-, Safe-State- und Source/Build-Paritätsregressionen.
- Alle vier Clientpaketdateien im UI-Spiegel sind byteidentisch.

Zusätzlich bestanden: `node --check` für Plattformhelfer und Dienst,
`git diff --check` für die betroffenen Dateien und
`npm pack --dry-run --ignore-scripts --json` im Admin-Verzeichnis. Der
Pack-Inhalt enthält alle vier Clientdateien und den geänderten gebauten Dienst;
`pack-content.json` hält diese Auswahl fest. Pack-Lifecycle-/Release-Skripte
wurden bei dieser Dateiauswahlprüfung ausdrücklich nicht ausgeführt.

Die Plattformtests verwenden ein ausdrückliches Dateisystemmodell, die übrigen
Client-/Diensttests eine Testsubstitution der Plattformabhängigkeit mit echtem
Lizenzverifizierer/verschlüsselter Testablage. Im Produkt gibt es keinen
Umgebungs-/Konfigurationsschalter dafür. Diese Prüfungen simulieren den lokalen
Bus; sie bestätigen weder native EOS-Installation noch reale Gerätekommunikation.

## Offene Prüfungen und Grenzen

**OFFEN:** Pi/systemd-Installation, echtes ioBroker-Messagebox-Verhalten mit allen
Verbrauchern, Browseraktivierung und betrieblich sichere Geräte-/Anlagentests.
Jeder Verbraucher dokumentiert seine Integration und Mengenzählung separat;
der gemeinsame Client implementiert keine globale Inventaraggregation.

Die kontrollierten Pfade gehören zum aktuellen EOS-TEST-Installationsvertrag.
Ein neues Produktionsprofil benötigt eine überprüfte Erweiterung. Die bestehende
signierte Lieferbaumprüfung vor Dienststart bleibt unabhängig erforderlich.
Root, veränderter Quellcode und bereits kompromittierte Runtimeprozesse sind
keine durch diese lokale Prüfung beherrschte Angreifergrenze. Maximal laufende
Leases und der 5-Sekunden-Prüftakt ersetzen keine unabhängigen Gerätewatchdogs.

Für den Pi-Test vorher Sicherung und Rückfall auf den bisherigen signierten
Lieferstand vorsehen. Auf EOS zuerst ohne Lizenz fehlende Betriebsfreigabe bei
erreichbarer Verwaltung prüfen, anschließend Home und Pro ausschließlich im
Admin aktivieren und dieselben Verbraucher ohne eigenen Key prüfen. Entfernung,
Admin-Neustart und Kommunikationsverlust müssen die dokumentierten sicheren
Fehlerpfade auslösen. Auf gewöhnlichem ioBroker darf derselbe unveränderte Adapter
keinen Betriebsauftrag ausführen. Solche Versuche nur in einer dafür vorgesehenen
Testumgebung durchführen; keine Pfad-/Rechteänderungen an der laufenden Hausanlage
als Negativtest verwenden.

Kein npm-/Produktrelease, keine Anlagenfreigabe und keine Konformitätsaussage
werden durch diesen Quell-/Mockprüfstand erteilt.
