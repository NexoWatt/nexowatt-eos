# Zentrale Lizenzrechte und bestehende Home/Pro-Matrix

Stand: 03.10.2026. Diese Änderung verbindet die bestehende UI-Produktmatrix mit
den signierten NWL2-Berechtigungen des EOS Admin. Sie führt keine neue Edition
und keine Freigabe zur Anlagensteuerung ein.

## Verbindliche Produktgrenzen

Die ausführbare Matrix stammt aus
`src-ts/runtime-executables/ems/services/feature-flags.ts`. Der NWL2-Vertrag steht
in `components/admin/src/lib/eosLicenseCore.js` des Gesamt-Repositories.

| Grenze | Home | Pro |
|---|---|---|
| Interner UI-Name | `hems` | `eos` |
| Signierte NWL2-Edition | `home` | `pro` |
| Ladepunkte laut NWL2 | 1–3 | 1–1000 |
| Bearbeitbare Ladepunkte in dieser UI | kleineres Limit aus Lizenz und 3 | kleineres Limit aus Lizenz und technischer UI-Grenze 50 |
| Speicherplätze | kleineres Limit aus Lizenz und 2, auch 0 zulässig | kleineres Limit aus Lizenz und 10, auch 0 zulässig |
| Finaler Speicherbefehl | maximal ±50.000 W | kein zusätzlicher Lizenz-Leistungsdeckel |

Geräte-, Messwert-, SoC-, Netzanschluss- und Sicherheitsgrenzen wirken zusätzlich.
Die Pro-Anzeige „frei skalierbar“ bezieht sich ausschließlich auf die Leistung;
Stückzahlen bleiben begrenzt. Null Speicherplätze sperren auch den einzelnen
Speicher, nicht nur zusätzliche Farmzeilen. Farmzeilen belegen auch deaktiviert
einen Platz; überzählige bestehende Zuordnungen werden nicht still gelöscht.

Die vorhandenen Home-Apps sind Lademanagement, Speicher, Speicherfarm, thermische
Steuerung, Heizstab, Schwellwert, Relais, Netzgrenzen, KI-Berater, Tarife, §14a,
Energiewertkonto, Energiebuch und NL-P1. Weitere Home-Funktionen der Matrix sind
unter anderem Dashboard, Historie, SmartHome, PV-Prognose, Länderprofil und
Herkunftsnachweise. Pro ergänzt unter anderem Peak-Shaving, Multi-Use, Generator,
BHKW, Ladeparkdiagnose, Abrechnung/Kiosk, Mesh/Microgrid, Netzbetreiberschnittstelle,
Betriebsstrategien, standortübergreifendes Wertkonto und KI-Autopilot. Die
automatisierte Prüfung vergleicht sämtliche Einträge der ausführbaren Matrix,
nicht nur diese Beispiele.

`farm` und `business` kommen in Typgerüsten vor, sind aber keine implementierten
NWL2-Editionen. Sie werden abgewiesen. Historische NW1-/NW1T-Schlüssel und
Editionslabels sind keine Freischaltung.

## Vertrauenskette und Lebenszyklus

1. Die Herstellerlizenz wird an die vorhandene Geräte-UUID gebunden und nur mit
   dem installierten authentischen öffentlichen Herstellerschlüssel geprüft.
2. Erststart und spätere Aktivierung verwenden denselben Admin-Core. Der
   Erststart übergibt den Token separat und geschützt; der feste Runtime-Helfer
   speichert ihn verschlüsselt im bestehenden Admin-Lizenzspeicher. Token und
   Hersteller-Schlüssel werden nicht zu Browserkonfiguration oder Anlagenrechten.
3. Der Admin prüft UUID, Signatur, Zeit, Adapterliste und Kontingente. Die UI
   erhält über den vorhandenen Client eine Nonce-gebundene Lease von höchstens
   15 Sekunden; sie erneuert diese regelmäßig. Das ist kein Offline-Grant.
4. Backend, ModuleManager und App-Center verwenden die aktuelle zentrale
   Freigabe und die bestehende Produktmatrix. Engere signierte Stückzahlen
   gewinnen. Fehlende Prüfer, Ablehnung, Ablauf und Kommunikationsfehler sperren.
5. Der Browser liest Rechte über den geschützten Endpunkt
   `/api/license/features`. Alte Config-/State-Daten, ein erfolgreicher anderer
   HTTP-Aufruf oder ein Pro-Label dürfen keine Rechte ergänzen. Die Aktualisierung
   läuft auch bei bereits aktiver Lizenz. Eine bloße Lease-Verlängerung baut
   Eingabefelder nicht neu auf; eine Änderung der Rechte aktualisiert die Anzeige.

`validUntil` bezeichnet die kurze Lease-Gültigkeit in Unix-Millisekunden.
Sie ist **nicht** das Vertragsende der Herstellerlizenz. Der UI-Snapshot gibt
deshalb `expiresAt: 0` und `expiryManagedBy: 'eos-admin.0'` zurück. Das echte
Lizenzende bleibt im Admin verwaltet und wird dort geprüft. Entfernen, ungültiger
verschlüsselter Speicher oder eine andere Geräte-UUID entziehen die Freigabe bei
der nächsten Prüfung; eine bereits erteilte Lease endet spätestens nach 15 Sekunden.
Es gibt in diesem Offline-Vertrag keine erfundene Online-Widerrufsliste.

## Sicherheitsgrenze

Die integrierte UI startet weiterhin keine EMS-Regelzyklen und erlaubt keine
fremden Gerätebefehle. Eine gültige Lizenz hebt diese Inbetriebnahmesperre nicht
auf. Die Lizenzprüfung ersetzt weder Gerätekompatibilität noch Messpunktprüfung,
fachliche Anlagenabnahme oder Hardwareversuche. Auch ein in einem isolierten
Modultest auf null begrenzter Sollwert ist keine Aussage über ein sicheres
Abschaltverhalten einer realen Anlage.

## Nachweise und angepasste Regressionen

`test/eos-license-entitlements.test.cjs` verwendet echte temporäre Ed25519-
Signaturen, den verschlüsselten Store, Admin-Service und den ausgelieferten
Lease-Client. Es führt unveränderte produktive Backend-/Frontend-Funktionskörper
und die Speicher-Profilbegrenzung aus; ioBroker, Transport und Browser-DOM werden
gezielt ersetzt. Dies ist kein Browser- oder Hardwaretest.

Die bisherigen Textprüfungen `verify-license-editions.js` und
`verify-storage-license-power-profiles.js` erwarteten teilweise lokale NW1-
Freischaltung, alte State-Schreibweisen oder einen Grant aus bloßem HTTP-Erfolg.
Diese Erwartungen widersprachen dem zentralen EOS-Vertrag. Sie prüfen jetzt die
zentrale Lease, fehlende lokale Ersatzfreigaben, konkrete Kontingente und die
weiter unveränderte Leistungsgrenze. Der Leistungsregressionstest simuliert nur
die zentrale Autorisierungsgrenze; Berechnung und finale Schreibentscheidung
bleiben die ausgelieferten Funktionen. Der Home-App-Center-Browsertest liefert
nun ausdrücklich zeitlich gültige Feature-Leases als Fixture.

Rohprotokolle, Quellhashes und genaue Prüfgrenzen stehen im Gesamt-Repository
unter `reports/integration/installable-test3-20261003/licensing/`.
