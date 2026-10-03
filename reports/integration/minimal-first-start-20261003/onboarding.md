# EOS-MINIMAL-FIRST-START-01 · Ersteinrichtung ohne Anlagenplanung

Stand: 03.10.2026. Grundlage: `6ee690e7503f7f609de1f7c1db1689a6ca39aec3`.
Dateibindung und ausgeführte Prüfungen: [onboarding-verification.json](onboarding-verification.json),
Rohbeleg: [onboarding-tests.tap](onboarding-tests.tap).

## Anforderung und Änderung

Der Nutzer verlangt im Einrichtungsassistenten ausschließlich Geräte-UUID,
Home-/Pro-Lizenz und Admin-Passwort. Standort, Anschlusswerte, Messpunkte,
§14a-Zuordnung und Geräteanschlüsse gehören zur späteren Inbetriebnahme der
Kundenanlage. Der bisherige Assistent verlangte diese Entscheidungen bereits
bei der Gerätebereitstellung.

Nach Eingabe des lokalen Besitzcodes zeigt der neue Assistent die schreibgeschützte
Geräte-UUID mit Kopierfunktion, ein Lizenzfeld und zwei Admin-Passwortfelder.
Die Lizenzprüfung zeigt die Edition und Gültigkeit; keine Adapterauswahl,
Adapterliste oder Gerätelimits. Das Login nennt ausdrücklich den Benutzernamen
`admin`. Die Anlagenabnahme bleibt offen. Der Besitzcode und die zertifikatsgeprüfte
HTTPS-Verbindung bleiben Voraussetzungen vor jeder Passworteingabe.

## Schnittstelle und Kompatibilität

Die neue Anfrage verwendet `schemaVersion: 3`. `/api/configuration/check`
erhält nur Schema-Version und Lizenz; `/api/finish` zusätzlich Passwort und
Wiederholung. Der Browser sendet weder UUID noch Standort-, Anlagen- oder
Gerätewerte. Die UUID kommt unverändert aus dem authentifizierten Gerät und
bleibt Grundlage der serverseitigen Signatur-/Lizenzprüfung.

Die vertrauenswürdige Verarbeitung erzeugt folgende Einstellungen selbst:

```json
{
  "schemaVersion": 3,
  "licenseMode": "verified",
  "deviceMode": "disabled-pending-acceptance",
  "commissioning": {
    "status": "deferred",
    "reason": "customer-plant-not-connected"
  }
}
```

Das ist ein ausdrücklicher Status für eine noch nicht angeschlossene Kundenanlage,
keine erfundene Messung und keine versteckte Bestätigung durch den Benutzer.
`siteName`, Sprache, Zeitzone, Anlagenwerte und Geräteplan fehlen bewusst.
Vorhandene Systemvorgaben werden deshalb bei der minimalen Einrichtung erhalten.
Die Prüfroutinen für historische vollständige Einstellungen sowie die Übergabe
mit Schema 2 bleiben erhalten. Ein alter Übergabestand wird nicht still auf ein
neues Schema umgeschrieben; Schema und Einstellungen müssen zusammenpassen.

Die neue Oberfläche verlangt eine signierte Gerätelizenz. Historische
Schema-2-Daten mit ausdrücklich offener Lizenzierung bleiben lesbar. Die
Syntaxprüfung eines Lizenzfelds allein gilt nicht als Signaturprüfung; diese
führt weiterhin der Server gegen die installierten Vertrauensanker und die
Geräte-UUID aus. Sicherheitsfreigabe einzelner ausführbarer Adapter und
Lizenzedition sind getrennte Entscheidungen; diese Änderung aktiviert keine
Geräteadapter.

## Vertrauensgrenzen und Tests

26 Prüfungen bestanden unter Node v24.19.0 / Linux x64, keine übersprungenen
Prüfungen. 17 Frontendtests führen den tatsächlichen ausgelieferten JavaScript-Code
gegen ein deterministisches Modell des HTML-/FormData-Verhaltens aus. Neun
Konfigurations-/Policytests prüfen historische technische Eingaben und den neuen
minimalen Vertrag.

Geprüft wurden insbesondere die exakten drei Formularwerte, UUID-Anzeige und
Kopierfehler, fehlende UUID, keine Übertragung einer frei gewählten Geräteidentität,
kein HTML-Einfügen fremder Antwortwerte, Ablehnung eingeschleuster Anlagenwerte
und Freigaben, strenge Schema-2/3-Übergaben, Passwortanforderungen, keine Speicherung
von Geheimnissen im Browser, fünf Sekunden Gesamtbudget für Header und Antwort,
Abbruchsignal, Löschen der Passwort-/Lizenzfelder und kein automatisches erneutes
Absenden bei unklarem Abschluss. Die Anlagensteuerung bleibt im Statusnachweis
auch nach bestandener Ersteinrichtung gesperrt.

Die Prüfungen der realen TLS-/Sitzungs-/CSRF-/Signaturverarbeitung und der
Datenbankübernahme sind getrennte Integrationsnachweise im übergeordneten
Änderungsbericht. Die vorliegenden 26 Tests allein behaupten keinen erfolgreichen
Admin-Login.

## Auslieferung und offene Abnahme

Die unveränderlichen R4-Lieferdateien wurden nicht verändert. Diese Dateien sind
Quelländerungen und müssen vor einer neuen Geräteauslieferung in einen neuen
signierten Build mit passender Datei-/SBOM-Bindung aufgenommen werden. Es wurden
keine neuen Laufzeit-Abhängigkeiten hinzugefügt. Die R4-SBOM ist kein Nachweis für
ein noch nicht erstelltes Folgeartefakt.

Ein bestehendes eingerichtetes Gerät wird durch den Quellcommit nicht erneut
initialisiert. Kein Löschen von Konten, keine automatische Passwortänderung und
kein Ersetzen vorhandener Anlagenkonfiguration sind Bestandteil dieser Änderung.
Der nächste Test auf dem Pi soll die minimale Oberfläche, eine gültige Home- und
Pro-Lizenz, das gesetzte Admin-Passwort, Anmeldung nach Neustart und erhaltene
Inbetriebnahmesperre prüfen. Reale Browserdarstellung, Pi-Test und Hardwareabnahme
sind für diese Änderung **OFFEN**. Dies ist keine Produktionsfreigabe und keine
CRA-/IEC-Konformitätserklärung.
