# Nativer PostgreSQL-States-Client für EOS

Experimenteller Quellstand `0.1.0-dev.2`, API-Vergleich mit
`@iobroker/db-states-redis@7.2.2`. Der js-controller lädt den Export `Client`
über seinen vorhandenen Datenbank-Loader bei `states.type=postgresql`.
`Server` ist `null`: Dieses Paket startet keinen Datenbankserver und öffnet keine
Redis-Verbindung. Es verwendet ausschließlich den gemeinsamen
`@nexowatt/eos-postgresql-store` mit dem Datenbereich `states`.

## Schnittstellenvertrag

| Bereich | Erhaltenes Verhalten |
| --- | --- |
| States | `setState`, `setStateAsync`, `getState`, `getStateAsync`, `getStates`, `getKeys`, `delState` |
| Metadaten | Wert bei ausgelassenem `val` erhalten; `ack=false`, `q=0`; Sekundenzeitstempel normalisieren; `lc` bei unverändertem Wert erhalten; Kommentar auf 512 Zeichen begrenzen |
| Wiederherstellung | `setRawState` speichert JSON unverändert ohne Änderungsereignis |
| Ablauf | Sekundenangabe `expire` in Millisekunden umrechnen; der Store schließt abgelaufene Werte beim Lesen aus und liefert ein Null-Ereignis beim Aufräumen |
| Abonnements | Getrennte `change`-/`changeUser`-Callbacks; `subscribe[User]`/`unsubscribe[User]`; Redis-Globsyntax ohne frei ausgeführte reguläre Ausdrücke |
| Nachrichten | `pushMessage`, `subscribeMessage`, `unsubscribeMessage`; Kanal `messagebox.<id>`, laufende lokale `_id`; ausschließlich aktuelle Live-Ereignisse |
| Logs | `pushLog`, `subscribeLog`, `unsubscribeLog`; Kanal `log.<id>` |
| Sitzungen | `getSession`, `setSession`, `destroySession`; eigene Ablaufzeit, keine Zustandsereignisse |
| Lebenszyklus | `connectDb`, `getStatus`, `destroy`; Protokollversion 4; unerwartete Version sperrt weitere Operationen |
| Löschen | `destroyDB` und `_destroyDBHelper` betreffen ausschließlich den State-Namensraum, keine Sitzungen/Metadaten |

`getStates` erhält Reihenfolge, doppelte Schlüssel und `null` bei fehlenden Werten.
`dontModify=true` erlaubt vollständig qualifizierte State-Schlüssel; andere
Namensräume werden bewusst abgewiesen. Änderungen verwenden `Store.update`, damit
Lesen, Normalisierung, Schreiben und Ereignis innerhalb derselben Transaktion
erfolgen. Keine rohen SQL-Anweisungen liegen in diesem Client.

Der tatsächlich ausgelieferte Redis-Client 7.2.2 ruft einen erfolgreichen
`getSession`-Callback mit **einem** Argument auf (`session`), obwohl seine
Typdeklaration zwei Argumente nennt. Dieses beobachtete Verhalten bleibt erhalten.
Andere CRUD-Callbacks verwenden `(error, result)` und laufen asynchron.
JSON-Buffer bleiben beim Lesen in der JSON-Form; Ereignisse wandeln validierte
`{type:"Buffer",data:[...]}`-Werte in Buffer um, wie der verglichene Client.

## Bewusste Schutzmaßnahmen und Abweichungen

- Verbindungsverlust, ungültiges gespeichertes JSON und Protokollabweichungen
  erzeugen Fehler. Sie erscheinen nicht als erfolgreicher Schreibzugriff oder
  als fehlender, aber gültiger Wert.
- Es gibt keine Warteschlange für Schreibbefehle während einer Unterbrechung und
  keine Wiederholung alter Nachrichten beim Wiederverbinden. Bereits geplante
  Callbacks aus einer abgebrochenen Verbindung werden verworfen.
- JSON-Werte dürfen keine nichtendlichen Zahlen, Funktionen, BigInts oder Zyklen
  enthalten. UTF-8 wird strikt geprüft. Eingabeobjekte werden nicht verändert.
- Schlüssel sind auf 1024 UTF-8-Bytes begrenzt; Batch-Lesen auf 10.000 Schlüssel.
  Zustands-/Nachrichtenereignisse sind auf 1 MiB begrenzt, rohe Werte auf 16 MiB.
  Maximal 1024 Abonnements sowie 1024 ausstehende Callbacks und insgesamt 16 MiB
  ausstehende Ereignisnutzdaten werden zugelassen. Überlast trennt den Client
  sichtbar; ein erneuter Verbindungsaufbau setzt eine bewusste Wiederaufnahme
  voraus. Es wird kein unbegrenzter Befehlsrückstau erzeugt.
- Wörtliche und einfache Präfix-Abonnements verwenden direkte Vergleiche;
  komplexe Globs teilen sich ein begrenztes Arbeitsbudget pro Ereignis. Ein
  Budgetüberlauf sperrt die Verbindung sichtbar, statt die Laufzeit unbegrenzt
  durch Mustervergleiche zu blockieren.
- Namensräume dürfen keine Globzeichen enthalten oder überlappen. Keine
  frei konfigurierbaren Store-Implementierungen werden aus JSON eingelesen.
- Logs enthalten feste Diagnosekennungen, keine Werte, Sitzungsinhalte oder
  Verbindungsgeheimnisse.

## STRIDE und offene Grenzen

| Bedrohung | Maßnahme in diesem Client / Restpunkt |
| --- | --- |
| Spoofing | Verbindungsidentität und mTLS liegen im Store; hier keine Alternativverbindung oder Klartext-Rückfalloption |
| Tampering | Transaktionaler Read/Modify/Write, feste Namensräume, strikte JSON-/UTF-8-Prüfung; keine SQL-Interpolation |
| Repudiation | Feste Diagnosecodes; vollständiges Produkt-Audit und Operatorzuordnung bleiben ein separater Nachweis |
| Information Disclosure | Keine Rohwerte in Diagnosen, begrenzte Namensräume; RLS trennt Objects/States, **keine nachgewiesene Autorisierung je Adapter** |
| Denial of Service | Mengen-/Größenlimits, begrenzte Ereigniswarteschlange und Abonnements; Last-/Speicherprüfung auf dem Pi weiterhin offen |
| Elevation of Privilege | Kein DDL, kein Prozessstart, keine Hostrechte; DB-Berechtigungen und per-Adapter-Isolation müssen im Gesamtprofil geprüft werden |

Der Client weist kein industrielles Sicherheitslevel, keine CRA-Konformität und
keine Verfügbarkeit von Geräte-Failsafes nach. Insbesondere müssen Energie- und
Lastregelungen einen Kommunikationsverlust außerhalb dieser Bibliothek erkennen
und gerätespezifisch sicher behandeln.

## Prüfstatus

`node --test tests/postgresql/states.test.cjs` prüft die beschriebenen Verträge mit
einem ausdrücklich eingespeisten Fake-Store. Darin enthalten sind negative
Eingaben, TTL, Sitzungen, Buffer, Callbacks, gleichzeitige Änderungen,
Namensraumtrennung, Ereignisüberlast und Wiederverbindung. Der Fake-Store ist
kein Beleg für SQL-Transaktionen, PostgreSQL-Berechtigungen, TLS oder tatsächliche
Controller-/Adapterkompatibilität. Reale PostgreSQL-Integration, Zielhardware,
Stromausfall/Wiederanlauf, Migration und langfristige Lastprüfung bleiben offen.

Der vorhandene Installer wird durch dieses Paket nicht auf PostgreSQL umgestellt.
