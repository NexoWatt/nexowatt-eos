# EOS Erweiterungskanal

Quellprofil `eos-channel-mtls13-v1`, EOS `0.2.0-dev.8`.
Ausführbarer Laborstand, kein automatisch installierter Dienst.

`server.cjs` implementiert einen lokalen HTTPS-Server mit verpflichtendem mTLS
und TLS 1.3. `client.cjs` ist der zugehörige Client ohne zusätzliche npm-Module.
`postgresql-backend.cjs` ist der noch nativ zu prüfende Wrapper zum bestehenden
States-Backend. `main.cjs` startet den gesondert provisionierten Gateway unter
einem unprivilegierten Konto. Der Zugang zu PostgreSQL gehört ausschließlich
in diesen vertrauenswürdigen Dienst, niemals in die Clientkonfiguration.

Der neutrale Startvertrag `system/adapter-channel/policy.example.json` erlaubt
keine Peers. Echte Zertifikatfingerprints und exakte Rechte müssen von der
Hostadministration eingetragen werden. Beispiele mit vollständig synthetischen
Identitäten und kurzlebigen Testzertifikaten stehen in `tests/adapter-channel/`.
Die Testschlüssel werden außerhalb des Repositorys erzeugt und wieder entfernt.

## API

```javascript
const { ChannelClient } = require('./client.cjs');
// PEM-Werte ausschließlich aus den eigenen, geschützten Dienst-Credentials.
const channel = new ChannelClient({ host: '127.0.0.1', port: 19443, tls: { ca, cert, key } });
const state = await channel.readState('sensor.0.power');
await channel.writeState('eos.requests.javascript.0.setpoint', 2000);
// Fehler abfangen; Schreibaufträge niemals blind wiederholen.
channel.close();
```

Der API-Transport ist keine ioBroker-adapter-core-Fassade. Insbesondere fehlen
Objects/Dateien, Aliasauflösung, Push-Abonnements und der ioBroker-sendTo-
Callbackvertrag. Der Server ersetzt keine technische Schutz- oder Regelinstanz.
Lese-/Schreibrechte werden am Server anhand des Clientzertifikats geprüft.
Nachrichten laufen über flüchtige, begrenzte Mailboxen im Gateway und können bei
Ausfall verloren gehen. Beim Empfänger erneut Ablaufzeit und Fachwerte prüfen.

Vollständiger Befund, Grenzen, Umbauanleitung, Rollout und Prüfbelege:
`docs/security/ADAPTER_CHANNEL_DEV8_DE.md`.

## Reproduzieren

Die Laufzeitabhängigkeiten sind separat aus dem geprüften test.2-Laufzeitbaum
bereitzustellen. Die drei PostgreSQL-Quellpakete werden dort als dev8-Overlays
eingesetzt; originale signierte Lieferarchive niemals verändern. Danach:

```bash
python3 tools/integration/qualify-adapter-channel.py \
  --node /absoluter/pfad/zu/node-24.21.0 \
  --modules /absoluter/pfad/zum/labor/app/node_modules
```

Das Werkzeug startet keine echte PostgreSQL-Datenbank und installiert keine
Dienste. Es benötigt Loopback-Sockets und OpenSSL für temporäre Zertifikate.
Der native Gesamtpfad, Systemd und Raspberry Pi sind weiterhin gesondert zu prüfen.
