# NexoWatt UI 0.8.34 – Installer-Rücksprung im App-Center

## Zweck

Version 0.8.34 korrigiert den Button **„Zurück zum Installer“** im EMS App-Center.

Vorher konnte der Button auf dem Adapter-Port landen, zum Beispiel:

```text
http://<host>:8188/tab.html?nwAdmin=1
```

Das ist falsch, weil die zentrale Installer-Seite im ioBroker-/NexoWatt-EOS-Admin läuft, typischerweise:

```text
http://<host>:8081/#tab-nexowatt-ui-0
```

## Neue Logik

Der Button ermittelt jetzt die Rücksprung-URL in dieser Reihenfolge:

1. explizite URL aus `adminUrl` oder `nwAdminUrl`,
2. expliziter Admin-Port aus `adminPort` oder `nwAdminPort`,
3. Referrer aus dem Admin-Tab,
4. Fallback: gleicher Host mit Admin-Port `8081` und `#tab-nexowatt-ui-0`.

Damit bleibt der Rücksprung aus dem Adapter-Port zuverlässig möglich.

## Beispiel

App-Center läuft auf:

```text
http://192.168.10.192:8188/ems-apps.html?nwAdmin=1
```

Der Button führt jetzt zu:

```text
http://192.168.10.192:8081/#tab-nexowatt-ui-0
```

## Sonderfall anderer Admin-Port

Wenn der Admin nicht auf `8081` läuft, kann der Link optional so geöffnet werden:

```text
http://<host>:8188/ems-apps.html?nwAdmin=1&adminPort=<ADMIN_PORT>
```

oder mit expliziter Admin-URL:

```text
http://<host>:8188/ems-apps.html?nwAdmin=1&adminUrl=http%3A%2F%2F<host>%3A<port>%2F%23tab-nexowatt-ui-0
```

## Hinweis nach Update

Nach dem Update bitte im Browser einen Hard Reload ausführen, da der Service-Worker-Cache auf `nexowatt-cache-v334` erhöht wurde.
