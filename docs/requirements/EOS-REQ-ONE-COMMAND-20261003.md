# EOS-REQ-ONE-COMMAND-20261003

Nutzerergänzung vom 3. Oktober 2026: Die Installation soll künftig durch einen
kopierbaren Curlbefehl erfolgen. Anschließend wird die Geräteoberfläche geöffnet
und der Erststart-Assistent durchlaufen.

Die Forderungen nach vollständiger Installation, geschützter Ersteinrichtung,
Passwortvergabe ausschließlich im Frontend und sichtbarer/kopierbarer Geräte-UUID
vor Lizenzerstellung gelten weiter. Lizenzrechte und Grenzen bleiben wie im UI
serverseitig maßgeblich. Die eigene Software bleibt erlaubnispflichtig;
unveränderte Drittanbieterrechte bleiben erhalten.

Nutzerpräzisierung: Downloadquelle ist das private Repository
`https://github.com/NexoWatt/nexowatt-eos.git`. Ein gültiger Anmeldetoken soll
auf dem neuen Gerät genügen. Der vollständig kopierbare Curl-Installationsblock
steht direkt oben in der README. Der Token wird genau einmal verdeckt abgefragt;
Git, ein eigener öffentlicher Downloadserver und ein npm-Zugang sind nicht nötig.

Abgeleiteter Ablauf: Keine manuell erstellten Host-/Trust-JSONs auf dem Pi.
Der Hersteller bindet öffentliche Vertrauensanker
einmalig an einen festen Download. Der Installer bereitet die unterstützten
Systemvoraussetzungen vor, übernimmt das vollständige geprüfte Paket und zeigt
Browseradresse und lokalen Einrichtungscode an. Downloads werden vollständig
geprüft, bevor sie ausgeführt werden.

Nicht vorausgesetzt oder durch diese Anforderung bewiesen: Authentische Zuordnung
des vorhandenen öffentlichen NWL2-Trust-Exports zur Hersteller-Lizenzverwaltung,
öffentlich vertrauenswürdige Gerätezertifikate, ausgeführter Pi-Test oder eine
funktionsfähige Flotten-Updatekette. Diese Punkte sind gesondert offenzulegen.
Die aktuelle Implementierung und Einschränkungen stehen in der
[Betriebsanleitung](../operations/ONE_COMMAND_INSTALLATION_DE.md).
