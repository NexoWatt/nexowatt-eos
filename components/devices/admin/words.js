/*global systemDictionary:true */
'use strict';

systemDictionary = systemDictionary || {};

systemDictionary['Nexowatt Devices'] = {
  'en': 'Nexowatt Devices',
  'de': 'Nexowatt Geräte',
  'ru': 'Nexowatt Devices',
  'pt': 'Nexowatt Devices',
  'nl': 'Nexowatt Devices',
  'fr': 'Nexowatt Devices',
  'it': 'Nexowatt Devices',
  'es': 'Nexowatt Devices',
  'pl': 'Nexowatt Devices',
  'uk': 'Nexowatt Devices',
  'zh-cn': 'Nexowatt Devices',
};

systemDictionary['Standalone multi-protocol device adapter with categories and driver templates (Modbus TCP/RTU, MQTT, HTTP).'] = {
  'en': 'Standalone multi-protocol device adapter with categories and driver templates (Modbus TCP/RTU, MQTT, HTTP).',
  'de': 'Eigenständiger Multi-Protokoll-Geräteadapter mit Kategorien und Treiber-Templates (Modbus TCP/RTU, MQTT, HTTP).',
};

// minimal placeholders for UI strings
systemDictionary['Globale Einstellungen'] = { 'en': 'Global settings', 'de': 'Globale Einstellungen' };
systemDictionary['Geräte'] = { 'en': 'Devices', 'de': 'Geräte' };
systemDictionary['Gerät hinzufügen'] = { 'en': 'Add device', 'de': 'Gerät hinzufügen' };
systemDictionary['Gerät bearbeiten'] = { 'en': 'Edit device', 'de': 'Gerät bearbeiten' };
systemDictionary['Speichern'] = { 'en': 'Save', 'de': 'Speichern' };
systemDictionary['Abbrechen'] = { 'en': 'Cancel', 'de': 'Abbrechen' };

systemDictionary['Ports aktualisieren'] = {
  'en': 'Refresh ports',
  'de': 'Ports aktualisieren',
};

systemDictionary['Heartbeat Timeout (ms, optional)'] = {
  'en': 'Heartbeat timeout (ms, optional)',
  'de': 'Heartbeat Timeout (ms, optional)',
};

systemDictionary['Wenn innerhalb dieses Zeitfensters keine neuen Daten empfangen werden, wird aliases.r.online automatisch auf false gesetzt (Sicherheits-Logik).'] = {
  'en': 'If no new data is received within this window, aliases.r.online is automatically set to false (safety logic).',
  'de': 'Wenn innerhalb dieses Zeitfensters keine neuen Daten empfangen werden, wird aliases.r.online automatisch auf false gesetzt (Sicherheits-Logik).',
};

systemDictionary['http_meterId'] = { 
  'en': 'Meter-ID (optional)',
  'de': 'Meter-ID (optional)',
};

systemDictionary['http_insecureTls'] = { 
  'en': 'Allow insecure TLS (self-signed certificates)',
  'de': 'Unsicheres TLS erlauben (self-signed Zertifikate)',
};

systemDictionary['MQTT Verbindung'] = { 'en': 'MQTT connection', 'de': 'MQTT Verbindung' };
systemDictionary['MQTT Transport'] = { 'en': 'MQTT transport', 'de': 'MQTT Transport' };
systemDictionary['Broker URL oder Host/IP'] = { 'en': 'Broker URL or host/IP', 'de': 'Broker URL oder Host/IP' };
systemDictionary['MQTT Port'] = { 'en': 'MQTT port', 'de': 'MQTT Port' };
systemDictionary['Feste MQTT Client-ID'] = { 'en': 'Fixed MQTT Client ID', 'de': 'Feste MQTT Client-ID' };
systemDictionary['TLS-Zertifikat prüfen'] = { 'en': 'Verify TLS certificate', 'de': 'TLS-Zertifikat prüfen' };
systemDictionary['TLS Servername / SNI (optional)'] = { 'en': 'TLS server name / SNI (optional)', 'de': 'TLS Servername / SNI (optional)' };
systemDictionary['TLS CA-Datei auf dem Controller (optional)'] = { 'en': 'TLS CA file on the controller (optional)', 'de': 'TLS CA-Datei auf dem Controller (optional)' };
systemDictionary['CONNACK Timeout (ms)'] = { 'en': 'CONNACK timeout (ms)', 'de': 'CONNACK Timeout (ms)' };
systemDictionary['Reconnect Intervall (ms)'] = { 'en': 'Reconnect interval (ms)', 'de': 'Reconnect Intervall (ms)' };
systemDictionary['MQTT Keepalive (s)'] = { 'en': 'MQTT keepalive (s)', 'de': 'MQTT Keepalive (s)' };
systemDictionary['Clean Session'] = { 'en': 'Clean session', 'de': 'Clean Session' };
systemDictionary['TESVOLT IoT Gateway Regelung'] = { 'en': 'TESVOLT IoT Gateway control', 'de': 'TESVOLT IoT Gateway Regelung' };
systemDictionary['Sollwert-Wiederholung (ms)'] = { 'en': 'Setpoint refresh (ms)', 'de': 'Sollwert-Wiederholung (ms)' };
systemDictionary['EOS-Sollwert Timeout (ms)'] = { 'en': 'EOS setpoint timeout (ms)', 'de': 'EOS-Sollwert Timeout (ms)' };
systemDictionary['Telemetrie veraltet nach (ms)'] = { 'en': 'Telemetry stale after (ms)', 'de': 'Telemetrie veraltet nach (ms)' };
systemDictionary['Sollwert-Tracking Verzögerung (ms)'] = { 'en': 'Setpoint tracking delay (ms)', 'de': 'Sollwert-Tracking Verzögerung (ms)' };
systemDictionary['TESVOLT Hinweis'] = { 'en': 'TESVOLT note', 'de': 'TESVOLT Hinweis' };
systemDictionary['Port 1884 und eine feste, im Gateway freigegebene Client-ID verwenden. Die MQTT-ACL des Gateways kann auf Wendeware vorkonfiguriert sein.'] = {
  'en': 'Use port 1884 and a fixed Client ID that is allowed by the gateway. The gateway MQTT ACL may be preconfigured for Wendeware.',
  'de': 'Port 1884 und eine feste, im Gateway freigegebene Client-ID verwenden. Die MQTT-ACL des Gateways kann auf Wendeware vorkonfiguriert sein.',
};
systemDictionary['Benutzername und Passwort authentifizieren den Client; nur mqtts:// oder wss:// verschlüsseln den Transport.'] = {
  'en': 'Username and password authenticate the client; only mqtts:// or wss:// encrypt the transport.',
  'de': 'Benutzername und Passwort authentifizieren den Client; nur mqtts:// oder wss:// verschlüsseln den Transport.',
};

systemDictionary["Automatisch erkennen (nur Lesen)"] = {"en": "Detect automatically (read only)", "de": "Automatisch erkennen (nur Lesen)"};

systemDictionary["TESVOLT Topic-Format"] = {"en": "TESVOLT topic format", "de": "TESVOLT Topic-Format"};

systemDictionary["Leistungssteuerung durch NexoWatt EOS aktivieren"] = {"en": "Enable power control by NexoWatt EOS", "de": "Leistungssteuerung durch NexoWatt EOS aktivieren"};

systemDictionary["Port 1884 ohne TLS (mqtt://), Zugangsdaten und eine eigene eindeutige Client-ID verwenden. Für paralleles Lesen mit TEM bleibt die Leistungssteuerung aus. Lesen benötigt EMS/# oder die passenden Einzel-Topics. Steuerung benötigt ein festes Topic-Format, Schreibrechte und eine abgestimmte Übergabe vom TEM; Batterie- und Gerätefreigaben bleiben erforderlich."] = {"en": "Use port 1884 without TLS (mqtt://), credentials and a unique Client-ID. Leave power control disabled for parallel TEM monitoring. Reading requires EMS/# or the matching exact topics. Control requires a fixed topic format, write permission and a coordinated handover from TEM; battery and device readiness checks still apply.", "de": "Port 1884 ohne TLS (mqtt://), Zugangsdaten und eine eigene eindeutige Client-ID verwenden. Für paralleles Lesen mit TEM bleibt die Leistungssteuerung aus. Lesen benötigt EMS/# oder die passenden Einzel-Topics. Steuerung benötigt ein festes Topic-Format, Schreibrechte und eine abgestimmte Übergabe vom TEM; Batterie- und Gerätefreigaben bleiben erforderlich."};
