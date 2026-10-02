# NexoWatt EOS 1.0.3 – offizielle Stable-Version

**Veröffentlichungsdatum:** 2026-09-09  
**Status:** Official Stable Patch / produktiver Verkaufsstand

## Zweck des Patches

NexoWatt EOS 1.0.3 behebt einen Lizenz-/Authentifizierungsfehler im geschützten AppCenter. Mit einer gültigen Home-Lizenz konnte sich ein Administrator korrekt anmelden und den AppCenter zunächst öffnen. Kurz danach wurde die Seite jedoch erneut gesperrt und der Login-Dialog erschien wieder.

Die Admin-Sitzung war dabei weiterhin gültig. Ursache war ein erwartbarer HTTP-403-Status eines nicht in Home enthaltenen Pro-Moduls. Der globale Frontend-Fetch-Handler behandelte bisher jeden 401- oder 403-Status pauschal als Authentifizierungsverlust. Dadurch konnte eine fachliche Lizenzantwort wie `eos_required` die gesamte geschützte Seite verriegeln.

## Korrigierter Authentifizierungsvertrag

Nach einer 401-/403-Antwort wird der Auth-Status erneut beim Adapter geprüft. Die Seite wird nur noch gesperrt, wenn mindestens einer dieser Zustände bestätigt wird:

- die Sitzung ist tatsächlich nicht mehr angemeldet;
- die für die aktuelle Seite erforderliche Capability fehlt;
- der Auth-Status ist nicht erreichbar und kann deshalb nicht sicher bestätigt werden.

Ist der Benutzer weiterhin als Admin oder Installer angemeldet und besitzt `appcenter.open`, bleibt der AppCenter geöffnet. Die fachliche API-Antwort wird unverändert an das jeweilige Modul weitergereicht.

Damit werden unter anderem folgende fachliche Antworten nicht mehr mit einem Loginverlust verwechselt:

- `eos_required`;
- `license_required`;
- `readOnly`;
- `customer_control_disabled`;
- geräte- oder funktionsbezogene 403-Antworten.

## Home-Lizenz und alte Pro-Konfiguration

Beim Wechsel von Pro auf Home können im gespeicherten Projektstand weiterhin Konfigurationen von Pro-Apps vorhanden sein. Diese Daten werden nicht ungefragt gelöscht. Für die an die Home-Oberfläche gelieferte Konfigurationskopie werden Pro-only Apps jedoch mit der bestehenden Lizenznormalisierung auf `installed=false`, `enabled=false` und `licenseBlocked=true` gesetzt.

Zusätzlich gelten im Frontend drei Schutzebenen:

1. Mesh/Microgrid, Netzbetreiber-Schnittstelle und Betriebsstrategien werden nur bei gültiger App-Lizenz als installiert bewertet.
2. Pro-only Komponenten werden unter Home nicht initialisiert.
3. Die Netzbetreiber-Komponente prüft die Edition vor dem Laden des Pro-Treiberverzeichnisses.

Dadurch kann ein alter `installed=true`-Wert keine versteckten Pro-API-Aufrufe und keine erneute Login-Sperre mehr auslösen.

## Sicherheitsverhalten bleibt fail-closed

Der Patch setzt den AppCenter nicht pauschal auf „frei“. Folgende Fälle sperren weiterhin zuverlässig:

- bestätigtes `authed=false`;
- fehlende Capability `appcenter.open`;
- nicht erreichbare Auth-Statusprüfung;
- echter Logout oder abgelaufene Session.

Der Hintergrund wird dabei wie bisher inert geschaltet, der Pflichtdialog kann nicht durch Außenklick oder Escape umgangen werden, und die serverseitigen Rollenprüfungen bleiben unverändert.

## Regressionstest

Der neue Stable-Test startet den realen AppCenter in Chromium mit:

- gültiger Home-Lizenz;
- angemeldetem Admin und Capability `*`;
- absichtlich verbliebenen Pro-Flags für Netzbetreiber, Mesh/Microgrid und Betriebsstrategien;
- einer simulierten fachlichen Antwort `403 eos_required`.

Geprüft wird:

- Home-Lizenz wird im AppCenter angezeigt;
- Login-Overlay bleibt geschlossen;
- Seite und Hintergrund bleiben entsperrt;
- AppCenter-DOM bleibt vollständig vorhanden;
- `/api/netoperator/drivers` wird unter Home nicht aufgerufen;
- eine manuell ausgelöste fachliche 403-Antwort verriegelt die Seite nicht;
- ein anschließend simulierter echter Sessionverlust mit 401 sperrt die Seite wieder fail-closed;
- keine Browser-Ausnahmen treten auf.

## Unveränderte Regelungsfunktionen

Der Patch betrifft ausschließlich Auth-Fehlerklassifizierung, Lizenzsichtbarkeit und Initialisierung von AppCenter-Komponenten. Unverändert bleiben insbesondere:

- NVP- und Netzanschlussregelung;
- Lade- und Lastmanagement;
- Speicher- und Speicherfarmregelung;
- Netzlimit, feste Einspeisebegrenzung und Nulleinspeisung;
- §14a, Tarife und Prognosen;
- Export Guard und Single-Writer-Struktur;
- EZA-/Parkregler-Priorität;
- sämtliche produktiven Hardware-Writer.

## Aktualisierung

Die Version aus einem neuen, leeren Ordner installieren, den Adapter vollständig neu starten und den Browser einmal mit `Strg+F5` neu laden. Der Service-Worker-Cache wurde auf `nexowatt-cache-v503` angehoben. Danach die Home-Lizenz aktivieren, als Admin anmelden und den AppCenter mehrfach öffnen. Er muss nach erfolgreicher Anmeldung dauerhaft geöffnet bleiben. Ein echter Logout muss die Seite anschließend wieder sperren.
