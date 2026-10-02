# NexoWatt UI 0.8.34 – Installer-Rücksprung korrigiert

## Ziel

Version 0.8.34 korrigiert den Button **„Zurück zum Installer“** im EMS App-Center.

Der Button darf nicht auf `tab.html` des Adapter-Webservers zeigen, weil das App-Center auf dem Adapter-Port läuft, z. B. `8188`. Die zentrale Installer-Seite liegt im ioBroker-/NexoWatt-EOS-Admin unter dem Admin-Port, typischerweise `8081`, und dort im Hash-Tab:

```text
/#tab-nexowatt-ui-0
```

## Neue Ziel-URL

Der Button erzeugt jetzt standardmäßig:

```text
http://<aktuelle-ip>:8081/#tab-nexowatt-ui-0
```

Beispiel:

```text
http://192.168.10.192:8081/#tab-nexowatt-ui-0
```

## Sonderfälle

Wenn der Admin-Port nicht `8081` ist, kann der Port über die URL übergeben werden:

```text
ems-apps.html?nwAdmin=1&adminPort=8082
```

Alternativ werden auch diese Parameter akzeptiert:

```text
ioBrokerAdminPort
port
```

## Prüfung nach Update

1. Adapter auf 0.8.34 aktualisieren.
2. Browser-Cache hart neu laden.
3. App-Center öffnen.
4. Oben **„Zurück zum Installer“** anklicken.
5. Erwartet wird die Admin-Seite:

```text
http://<ip>:8081/#tab-nexowatt-ui-0
```

## Wichtige Entwicklerregel

Fachliche Änderung liegt in:

```text
src-ts/runtime-executables/www/ems-apps.ts
```

Die Datei:

```text
www/ems-apps.js
```

ist nur das generierte Runtime-Artefakt.
