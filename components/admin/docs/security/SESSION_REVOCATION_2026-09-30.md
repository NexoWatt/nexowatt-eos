# EOS-SESSION-004 – zentraler Sitzungswiderruf

Stand: 30.09.2026. Umsetzungskandidat; die Prüfung an einer laufenden ioBroker-Installation bleibt offen. Dieser Nachtrag ersetzt für EOS-SESSION-004 die Aussage des vorigen Audits, dass ausschließlich der gerade verwendete Access-Token entfernt werde. Er bescheinigt keine vollständige Behebung aller Authentifizierungsrisiken.

## Änderung und Vertrauensgrenze

`src/lib/eosSessionSecurity.js` wird vor HTTP-/Socketstart im Admin installiert. Die zentrale Grenze umfasst alle über diesen Admin gelesenen beziehungsweise ausgestellten ioBroker-Sitzungen. Sie kapselt die realen Controller-Schnittstellen `getSession(id, callback)` und `setSession(id, ttl, data, callback)` sowie die OAuth-Modellmethoden `getUser`, `getRefreshToken` und `saveToken`. Access- und Refresh-Token werden gemeinsam an eine zufällige Widerrufsgeneration und einen SHA-256-Abdruck der aktuellen Kontosicherheit gebunden. Der Abdruck berücksichtigt Benutzer-ID, Passwort-Hash, Kontosperre, Pflichtkennwortwechsel, Benutzer-ACLs sowie Gruppenmitgliedschaften und Gruppen-ACLs. Er enthält selbst keinen Passwort-Hash im Klartext.

Jeder Tokenabruf prüft seine namespaceabhängige Ablaufzeit, die Generation und einen neu aus der Objektdatenbank gelesenen Sicherheitsabdruck. Bei gesperrtem/gelöschtem Benutzer, geänderten Berechtigungen, fehlendem Kennwort, fehlender Bindung oder Datenbankfehler erfolgt keine Authentifizierung. Ein vorhandener Refresh-Token bekommt beim Speichern keine neue Vertrauensbindung: Er muss seine bereits gültige Bindung weiterführen. Die Bindung eines Passwort-Logins wird vor und nach der tatsächlichen Passwortprüfung verglichen; ein Wechsel während der Prüfung oder vor dem Speichern verweigert die Ausstellung. Ungültige oder alte Token verbleiben gegebenenfalls bis zum ursprünglichen TTL-Ablauf im Controller-Sitzungsspeicher, autorisieren aber diesen EOS-Admin nicht mehr.

Sicherheitsrelevante Benutzer-/Gruppenereignisse wechseln die Generation synchron, noch bevor das Objekt an Clients publiziert wird. Betroffen sind bewusst **alle** Sitzungen dieses Admin-Prozesses. Passwortänderungen im EOS-HTTP-Backend und berechtigte Passwort-/Benutzer-/Gruppenänderungen im Socket-Backend widerrufen vor der asynchronen Änderung. Aktive Socketverbindungen verlieren ihre Subscriptions, erhalten eine Neuanmeldeanforderung und werden geschlossen; weitere Befehle sind unabhängig von alten ACLs gesperrt. Ein nachlaufender Authentifizierungscallback kann sie nicht erneut freigeben. Zusätzlich prüft ein realer Fünf-Sekunden-Wächter verbundene Konten auf verpasste Änderungsereignisse. Der Rollen-Cache verwirft einen während einer Sicherheitsänderung gelesenen Zwischenstand.

Datenbankprüfungen haben zwei Sekunden Antwortbudget, maximal 32 noch laufende Operationen, maximal 1.024 Gruppen und maximal 1 MiB serialisierte Sicherheitsdaten. Nicht abbrechbare Controller-Abfragen behalten nach einem Timeout ihren belegten Platz bis zum tatsächlichen Abschluss; dadurch entsteht kein unbegrenzter Hintergrundstau. Maximal 256 Socketverbindungen werden verfolgt. Ein erschöpftes Limit verweigert neue Authentifizierung.

## Bewusste Betriebsänderungen

- Nach Installation dieses Stands und nach **jedem Neustart des Admin-Prozesses** müssen Benutzer sich neu anmelden. Bereits ausgestellte Token oder Token einer anderen Admin-Instanz werden nicht übernommen. Ein späteres Zurücksetzen von Kontoeigenschaften auf alte Werte belebt bei beobachteten Sicherheitsänderungen keine alte Sitzung wieder.
- Unterstützt ist der lokale Passwort-Login mit regulärem Refresh. Cloud-SSO ist im EOS-Webprofil vor den Upstream-Routen gesperrt. Direkte OAuth-Tokenprägung ohne vorher nachgewiesenen Login und `internalToken`-Nachrichten bekommen keine Sitzungsfreigabe. Ein Adapter mit einer bisherigen Abhängigkeit von impliziten Admin-Token muss ausdrücklich auf einen getrennten, minimal berechtigten Integrationsweg umgestellt werden.
- Der Einrichtungsdialog für ein Pflichtkennwort bleibt über den gültigen Login mit individuellem temporärem Kennwort erreichbar. Die Passwortänderung selbst widerruft anschließend die Sitzung und fordert Neuanmeldung.
- Dieser Widerruf ist eine Grenze des EOS-Admin. Andere ioBroker-Adapter oder fremde HTTP-Server mit eigenem, unverändertem Tokenleser werden dadurch nicht automatisch abgesichert. Prozesse mit Zugriff auf die Controller-Datenbank oder dieselben OS-Rechte bleiben Bestandteil der vertrauenswürdigen Basis; sie müssen getrennt geprüft und minimiert werden.
- Bei verlorenem Benutzer-/Gruppenereignis schließt der Socket-Wächter innerhalb seines Fünf-Sekunden-Intervalls plus höchstens zwei Sekunden Prüfbudget. Für verpasste Ereignisse besteht bis dahin ein begrenztes Fenster bei bereits gecachten Socketrechten; normale beobachtete Änderungen sperren unmittelbar. Atomare, bereits vorher gestartete Controlleroperationen lassen sich nicht zurückrollen.

## Tatsächlich ausgeführte Prüfung

`node --test --test-reporter=tap test/eos-session-security.test.cjs` besteht mit **15/15** Tests auf Node.js 24. Die Tests führen das unveränderte, versionierte `OAuth2Model` aus `@iobroker/webserver` v1.4.0 aus. TypeScript-Typen werden entfernt und ausschließlich der dadurch erhaltene leere, ursprünglich nur aus Typimporten bestehende OAuth-Import entfernt. Benutzer-/Sitzungsdatenbank und Sockettransport sind Testdoubles. Es handelt sich daher um echte Upstream-Modelllogik an einer simulierten Controllergrenze, **nicht** um einen vollständigen Express-/ioBroker-/Browser-Integrationstest.

Geprüft sind regulärer Login und Refresh; beide Tokenklassen und mehrere Geräte nach Kennwortwechsel; Benutzerlöschung/-sperre, Mitgliedschafts- und ACL-Wechsel; Sperren und Wiederfreigeben ohne Wiederbelebung; alte/externe Token und direkte Ausstellung; gefälschte und kopierte Identitätsobjekte; Passwortwechsel während Prüfung und vor Speicherung; Refresh-Rennen; Generationswechsel; erschöpfte und hängende Datenbankabfragen; aktiver Socketwiderruf; harmlose Metadatenänderung; abgelaufene Token; verspätete Socketauthentifizierung; der reale Fünf-Sekunden-Wächter nach einer absichtlich nicht gemeldeten Kennwortänderung.

Der ergänzte bestehende Backend-Grenztest prüft außerdem einen widerrufenen Socket mit alten Administratorrechten sowie die Sperre aller `chat:*`-Nachrichten vor privilegiertem MCP-Aufruf. Die abschließende Ausführung gegen die neu erzeugten Build-Dateien erfolgt im gemeinsamen Releasebericht.

Rohbelege: `reports/security/raw/session-hardening/session-tests.tap` und `results.json`. Reale Mehrfachbrowser-/Refresh-/WebSocket-Reconnect-Tests mit installiertem `@iobroker/webserver` und `@iobroker/socket-classes`, ioBroker-Controller, Objektdatenbank und State-Backend bleiben eine Freigabebedingung. Insbesondere müssen verzögerte/ausgefallene Datenbankereignisse und ein Neustart unter gleichzeitiger Anmeldung geprüft werden.

## Primärquellen und Prüfbarkeit

Abgerufen am 30.09.2026 über die öffentliche GitHub-API:

- ioBroker/webserver, Tag v1.4.0, `src/lib/oauth2-model.ts`, Git-Blob `3651fb210e04ebb92d952b2a532cebf6d5223df6`: <https://github.com/ioBroker/webserver/blob/v1.4.0/src/lib/oauth2-model.ts>. Originalfixture und MIT-Lizenz unter `test/fixtures/`.
- ioBroker/ioBroker.socket-classes, Tag v2.3.4, `src/lib/socketCommon.ts`, Git-Blob `aa10b5c081f23bd4330f717e385f887b587f4898`: <https://github.com/ioBroker/ioBroker.socket-classes/blob/v2.3.4/src/lib/socketCommon.ts>. Bestätigt: `eventHandlers.connect` wird vor `_initSocket` und dessen Authentifizierungsaufruf ausgeführt; `addEventHandler` und `__updateSession` sind vorhanden.
- ioBroker/ioBroker.js-controller, öffentliche Hauptlinie, `packages/adapter/src/lib/adapter/adapter.ts`, Git-Blob `07765e3de7c4bcf78e8ff4de07e8edbc54285471`: <https://github.com/ioBroker/ioBroker.js-controller/blob/master/packages/adapter/src/lib/adapter/adapter.ts>. Bestätigt die Controller-Session-Callbackverträge; dies ersetzt keine Prüfung der tatsächlich installierten Controller-Version.

## Zugehörige begrenzte Netzkorrektur

Die beiden aufeinanderfolgenden Newsabfragen in `main.ts` teilen jetzt ein monotones Gesamtbudget von höchstens fünf Sekunden. Sie verwenden den gemeinsamen HTTPS-Helper mit festem Host, Antwortgrößenlimit und ohne Weiterleitungen. Serverantworten und ungefilterte Fehlerbodies werden nicht mehr protokolliert. Die Prüfung des Helpers und die weiterführenden Webkorrekturen stehen im zugehörigen Web-Härtungsbericht.
