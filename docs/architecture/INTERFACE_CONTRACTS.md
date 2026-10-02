> Dev8-Ergänzung vom 02.10.2026: Gehärteter PostgreSQL-Store und separater
> mTLS-Erweiterungskanal; Details, Prüfgrenzen und offene Isolation unter
> `docs/security/ADAPTER_CHANNEL_DEV8_DE.md`. Vorhandene Testinstaller sind unverändert.

# EOS-Schnittstellenverträge – Architekturstand 0.1

Stand: 30.09.2026. Umfang: Entwurf und lokale, rein lesende Prüfung von drei
Schnittstellen. **Kein laufender EOS-Dienst implementiert diese Verträge bisher.**
Die vorhandenen Adapter, Datenpunkte, Bedienoberflächen, Lizenzen und
Regelalgorithmen werden durch diese Dateien nicht verändert. Die drei Aktionen
sind ein bewusst begrenzter Anfang; sie bilden nicht den bisherigen gesamten
Funktionsumfang ab.

## Dateien und Verwendung

| Vertrag | Schema und Beispiel | Bedeutung |
| --- | --- | --- |
| Dienstauftrag | `system/contracts/service-command.schema.json`, `examples/service-command.json` | Typisierte Anforderung mit festgelegtem Absender, Empfänger, Aktion, Sequenz und Gültigkeitszeit |
| Berechtigungsantwort | `system/contracts/entitlement-response.schema.json`, `examples/entitlement-response.json` | Auf Modul, System und Anfrage begrenzte Freigaben, ohne Lizenzklartext oder Geheimnisse |
| Lieferstand | `system/contracts/update-manifest.schema.json`, `examples/update-manifest.json` | Exakte Artefaktdigests, Größen, Version, Reihenfolge und Hardwareprofil; kein Installationsprogramm |

Die Beispielpfade in der Tabelle liegen jeweils unter `system/contracts/`.
Alle Beispiele sind künstliche Testdaten. Das Updatebeispiel enthält absichtlich
Null-Digests, Größe 1 und ein nicht freigegebenes Hardwareprofil. Es beschreibt
**kein vorhandenes Image, keine gültige Signatur und keine Produktfreigabe**.
Ein Schema darf solche Formwerte akzeptieren; erst ein echter Artefakt- und
Signaturnachweis kann deren Inhalt bestätigen.

Der lokale Prüfer `tools/architecture/validate-contracts.py` liest ausschließlich
reguläre Dateien und die mitgelieferten Schemas. Er lädt keine Remote-Schemas,
installiert nichts, schreibt keine Konfiguration und stellt keine Netzwerkverbindung
her. Die Schema-IDs sind Kennungen, keine abzurufenden Adressen.

```bash
# In einer separaten Entwicklungsumgebung mit den exakt gebundenen
# Architektur-Prüfabhängigkeiten, nicht in der Produktlaufzeit:
python tools/architecture/validate-contracts.py --examples
python tools/architecture/validate-contracts.py \
  --contract service-command \
  --input system/contracts/examples/service-command.json
python tests/architecture/contracts.test.py
```

Benötigt werden Python 3.10+ und `jsonschema==4.26.0`; tatsächlich geprüft wurde
mit Python 3.12. Die exakten transitiven Pakete gehören in die vom Systemprojekt
geführte Entwicklungsabhängigkeitsdatei. Formatprüfung für Zeit und UUID erfolgt
explizit mit Python-Standardbibliothek; optionale Formatpakete sind nicht nötig.
Der Prüfer verwendet Linux-Dateiflags zur Ablehnung von Symlinks und FIFO-Dateien.
Eine Freigabe als plattformübergreifendes Produktionswerkzeug ist nicht erfolgt.

Ergebnis auf stdout ist JSON. Rückgabewert 0 bedeutet gültiger lokaler Vertrag,
1 ungültige Eingabe, 2 Abhängigkeits-/Werkzeug-/Aufruffehler. Fehlermeldungen
enthalten festgelegte Codes und Schema-Schlüsselwörter; Eingabewerte, unbekannte
Eigenschaftsnamen und Dateinamen werden nicht ausgegeben.

## Übergreifende Regeln

- JSON Schema Draft 2020-12, geschlossene Objekte (`additionalProperties: false`),
  begrenzte Zeichenketten und Arrays, konkrete Typen, Einheiten und Wertbereiche.
  Bei aktionsabhängigen Nutzdaten schließt der jeweils zutreffende `oneOf`-Zweig
  das Objekt. Neue Felder oder Aktionen erfordern eine geprüfte Vertragsänderung.
- Der Prüfer begrenzt Dateien auf 64 KiB, Baumtiefe auf 24 und Baumknoten auf 4096.
  Doppelte JSON-Schlüssel, NaN, Infinity, Zahlenüberlauf, ungültiges UTF-8 und
  isolierte Unicode-Surrogate werden abgelehnt. Ganzzahlen überschreiten nie
  `2^53 - 1`, damit Node/Python dieselbe exakte Zahl verarbeiten können.
- Keine Umdeutung von `null`, Boolean, numerischen Strings oder leeren Arrays in
  gültige Messwerte. UUIDs haben eine kanonische Kleinschreibung, keine Null-UUID.
- Zeitformat ist bewusst eingeschränkt: gültiges Kalenderdatum in UTC,
  `YYYY-MM-DDTHH:MM:SSZ`, ohne Bruchteile oder Schaltsekunden. Die Einhaltung muss
  beim Implementieren auf alle Beteiligten abgestimmt werden.
- Ein geschützter Transport muss mit dem kryptografisch bestätigten Prozesspartner
  verknüpft werden. Das JSON-Feld `source` ist **keine Identitätsbestätigung**.
  TLS/mTLS, Zertifikatsprüfung und Rollenprüfung sind hier Anforderungen,
  keine bereits implementierten Eigenschaften.

## Dienstauftrag

Erste fest definierte Routen:

| Aktion | Absender → Empfänger | Nutzdaten |
| --- | --- | --- |
| `device.setActivePower` | `eos-core` → `nexowatt-devices` | Geräte-UUID, Wirkleistung in W, Kennung einer lokal freigegebenen Regelrichtlinie |
| `backup.create` | `eos-admin` → `nexowatt-backitup` | Lokale Profilkennung und Anlass; keine frei übertragene Zieldatei oder Shellzeile |
| `license.getEntitlements` | Ein eigenes lizenziertes Modul → `identity-license` | Eigene Modulkennung und System-UUID |

Die Gültigkeitsdauer beträgt in diesem Vorschlag höchstens 30 Sekunden. Der
Offline-Prüfer kontrolliert positive Dauer und Obergrenze. **Er weiß nicht, ob
die Geräteuhr korrekt ist oder die Nachricht bereits abgelaufen/ausgeführt ist.**
Empfänger müssen die aktuelle Zeit, zulässige Abweichung, Sequenz je authentifizierter
Identität und Sitzungs-/Neustartzustand selbst prüfen und gegen Wiedereinspielung
absichern. Eine UUID allein verhindert keine doppelte Ausführung. Wiederholungen
müssen dieselbe Wirkung/Antwort erhalten oder ausdrücklich abgelehnt werden.

Die syntaktische Leistungsgrenze von ±1 GW ist nur eine Parsergrenze, kein
freigegebener Anlagenwert. Für die Integration bleiben Geräte-, Phasen-, Netz- und
Rampenlimits sowie vorhandene Prioritäten maßgeblich. Vorzeichen, Einheit,
Wirkungsrichtung, maximale Nachrichtenalter und Fehlerverhalten müssen mit dem
bisherigen Datenpunktvertrag je Gerät abgeglichen werden. Keine übergreifende
Abschaltung oder neue Sollwertlogik wurde eingebaut. Die `controlPolicyId` muss auf
eine außerhalb der Nachricht autorisierte, versionierte Anlagenregel verweisen.

## Berechtigungsantwort

`issuer` ist fest `identity-license`; Anfragekennung, System, Modul als `subject`
und `audience`, Lizenzrevision und Ablaufzeit sind enthalten. Die Antwort darf
nur Rechte des genannten Moduls enthalten. Ablehnungen enthalten keine Rechte
und keine positiven Kapazitätsfreigaben. Eine positive Antwort benötigt Rechte
und den Grund `active`. Die maximale Cache-Dauer beträgt im Entwurf 300 Sekunden.

Diese Werte sind keine signierte Lizenz und kein Bearer-Token. Der Empfänger muss
die authentifizierte Dienstidentität, passende ausstehende Anfrage, eigenes
System, eigene Modulidentität und Antwortfrist prüfen. Der Lizenzdienst darf die
Antwort erst nach Prüfung der Ausstellersignatur und geltenden Lizenzregeln
erzeugen. Widerruf, sichere Zeitbasis bei Offlinebetrieb, Schlüsselrotation,
Gerätebindung und Cache-Invalidierung sind noch zu implementieren und zu testen.
Bei Dienstausfall darf kein neues Produktrecht entstehen. Bestehende notwendige
Schutz- und Regelungsfunktionen folgen dem separat freizugebenden Betriebs- und
Wiederherstellungskonzept. Sicherheitswartung darf nicht allein durch fehlende
Produktrechte blockiert werden.

## Update-Manifest

Ein Manifest enthält genau ein Systemimage und eine SBOM, optional begrenzte
weitere Artefakte. SHA-256 ist exakt 64 kleine Hexzeichen, die Größe ist in Byte
angegeben. Der Prüfer erkennt doppelte Artefaktkennungen und ungültige
SBOM-Verweise. Referenzen sind Kennungen; beliebige URLs, Zielpfade oder
Installationsskripte sind nicht Teil dieses Formats.

`requiresVerifiedTufMetadata: true` dokumentiert die Entwurfsanforderung, ersetzt
aber **keine** Verifikation. Dieses EOS-Format ist nicht das standardisierte
TUF-Metadatenformat. Vorgesehen ist die Einbettung/Bindung des EOS-Manifests und
seiner Artefakte durch überprüfte TUF-Metadaten und einen etablierten TUF-Client.
Vertrauenswurzel, Rollen, Ablaufzeiten, Signaturschwellen, sichere Rotation,
Rollback-/Freeze-Schutz und Offline-Start sind dort umzusetzen. Eine selbst
erfundene Signaturimplementierung wird nicht geliefert.

Vor der Installation muss ein eigener, begrenzter Update-Dienst mindestens
Vertrauenskette, aktuelle Metadaten, exakte Artefaktgröße und Digest, freigegebenes
Hardware-/Kompatibilitätsprofil und Version/Reihenfolge prüfen. Platzbedarf,
Installationsfenster, Sicherung, atomarer Wechsel und Rückfall müssen auf der
Zielhardware getestet werden. Wiederherstellung auf einen älteren Stand benötigt
eine gesondert autorisierte und dokumentierte Regel; sie darf die normalen
Updateprüfungen nicht umgehen. Diese Tätigkeiten führt der lokale Prüfer nicht aus.

## Bedrohungsanalyse für diesen Änderungsumfang

| STRIDE | Bedrohung | Vorhandene Maßnahme dieses Stands | Offene Laufzeitmaßnahme |
| --- | --- | --- | --- |
| Spoofing | Gefälschter Absender oder Lizenzdienst | Namen und Routen eingeschränkt; kein Identitätsnachweis behauptet | Dienstidentität, gegenseitige Transportauthentifizierung, Bindung der JSON-Identität |
| Tampering | Unbekannte Felder, umgedeutete Typen, manipulierte Artefakte | Geschlossene Schemas, strikter Parser, Digestformat und Verweisprüfung | Signatur-/Digestprüfung echter Bytes, autorisierte Geräteprofile |
| Repudiation | Unklare Ausführung und Wiederholungen | Pflicht-Anfragekennung, Sequenz, Zeitintervall | Authentifizierte Auditereignisse, geschützte Reihenfolge und idempotente Ausführung |
| Information Disclosure | Schlüssel/Lizenzdaten in Antworten oder Fehlerlogs | Keine Geheimnisfelder im Berechtigungsvertrag; wertfreie Fehlercodes | TLS, Rechte für Socket/Dateien, Logzugriffe, reale Protokollprüfung |
| Denial of Service | Große/tiefe Eingaben, FIFO, ungültige Zahlen | Byte-/Knoten-/Tiefenlimits, endliche Zahlen, nur reguläre Dateien | Netz-Ratenlimits, Fristen, begrenzte Parallelität, Lasttests auf Zielhardware |
| Elevation of Privilege | Beliebige Wartungsbefehle, modulübergreifende Freigaben | Keine Shell-/URL-Felder; feste Aktionsrouten und modulspezifische Rechte | Serverseitige ACL je Aktion/Ressource, separate OS-Identitäten und Privilegien |

## Nachweise und Freigabegrenzen

Automatisierte Positiv-/Negativtests in `tests/architecture/contracts.test.py`
decken gültige Beispiele, Typen, Routen, Einheiten, Wertebereiche, Kalenderdaten,
Fristen, verschachtelte Zusatzfelder, Rechte, Artefaktverweise, Unicode,
Parsergrenzen, Spezialdateien und wertfreie CLI-Diagnose ab. Ein absichtlicher
Grenztest weist nach, dass ein formal gültiger alter Auftrag die Offlineprüfung
bestehen kann: Aktualität und Authentizität werden gerade nicht simuliert.

Die Testausgabe ist der Nachweis der jeweils ausgeführten Werkzeugprüfungen.
Sie ist kein Test der produktiven EOS-Komponenten, keine Penetrationsprüfung,
keine CRA-Konformitätsbestätigung und kein Nachweis funktionaler Sicherheit.
Verantwortung für folgende Schritte: EOS-Architektur/Entwicklung und
anschließende unabhängige Sicherheitsprüfung entsprechend der Risikobewertung.

Vor Integration fehlen insbesondere Quellenabgleich mit EOS Admin 7 und allen
eigenen Adaptern, Transportimplementierung, Rollen-/Anlagenpolicy, echte
Lizenzverifikation, Update-Vertrauenskette sowie Kompatibilitäts-/Geräteprüfungen.
Die bestehenden Benutzerabläufe und Funktionen müssen dafür in Regressionstests
erfasst und beim Umstieg nachgewiesen erhalten werden.

## Primärquellen

- [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)
- [python-jsonschema: Validierung und explizite Formatprüfung](https://python-jsonschema.readthedocs.io/en/stable/validate/)
- [TUF-Spezifikation](https://theupdateframework.github.io/specification/latest/)

JSON-Schema-, jsonschema- und TUF-Dokumentation am 30.09.2026 gelesen; die geöffnete
TUF-Spezifikation trägt Version 1.0.36 vom 05.08.2026. Das Datum eines
veröffentlichten Standards allein ist kein Hinweis auf eine unsichere Technik.

## Nachtrag 0.2.0-dev.5: lesbarer OS-Updatestatus

`GET /api/system/os-updates` liefert eine nicht geheime Statuszusammenfassung
für die bestehenden authentifizierten Service-, Installateur- und Benutzerrollen.
Die Displayrolle erhält keinen Zugriff. Die bestehende globale Sitzungs-/
Lizenzprüfung und die Berechtigung `frontend.open` bleiben vorgeschaltet.
Es gibt keinen zugehörigen Änderungs-, Paketinstallations- oder Neustartauftrag.

Der Hostdienst schreibt ausschließlich die feste rootgeschützte Datei
`/var/lib/nexowatt-eos-os-updates/status.json`. Die UI liest höchstens 64 KiB,
verweigert Symlinks, ungeschützte Vorfahren und nicht reguläre Dateien und
übernimmt nur ausdrücklich geprüfte Felder. Paketlisten, Pfade, freie Fehlertexte
und Rohlogs werden nicht an den Browser weitergegeben. Die Frische wird auf
dem Server geprüft; mehr als 36 Stunden alte Nachweise gelten als veraltet.
Unbekannte Angaben bleiben unbekannt und werden nicht zu null offenen Updates.

Die API unterscheidet Erreichbarkeit/Validität des Nachweises, den Laufzustand,
Zeitpunkte, tatsächlich beobachtete Timerzustände, offene/blockierte Updates,
Aktivierungsbedarf und Umfang der Paketquellen. Ihr Status ist keine Garantie
für Schwachstellenfreiheit. Vertrag und Tests gehören zum selben Quellstand;
Nachweisübersicht: `reports/integration/os-updates/verification-summary.json`.

## PostgreSQL-Entwicklungsprofil 0.2.0-dev.6

Der ergänzende Host-/Installationsvertrag dev7/test.2 steht in
[POSTGRESQL_TEST_HOST_DE.md](POSTGRESQL_TEST_HOST_DE.md). Beide Stores müssen
im Test-Hostprofil PostgreSQL mit festen lokalen Endpunkten verwenden;
Katalogmischungen und dynamische Modulnamen werden abgelehnt.

Die neue Schnittstelle verwendet den Typ `postgresql`, separate Client-Pakete
für Objects und States und `@nexowatt/eos-postgresql-store`. Der Store akzeptiert
ausschließlich explizite Verbindungskonfiguration mit geprüfter TLS-1.3-
Gegenstelle und Clientzertifikat. Operations-/Ereignis- und Mengengrenzen,
Callback-Verträge sowie beabsichtigte Ablehnungen stehen in den READMEs unter
`runtime/postgresql/`. Die bisherigen Redis-Installerverträge werden nicht
stillschweigend durch diesen experimentellen Laborpfad ersetzt.
