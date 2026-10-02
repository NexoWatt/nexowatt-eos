/* global $, M, translateAll, instance */
/**
 * nexowatt-devices - admin (materialize) UI
 * This UI is intentionally robust: it works even if Materialize-JS plugins are not available.
 */

'use strict';

let templatesData = null;
let templatesById = {};
let categories = [];
let manufacturersByCategory = {}; // cat -> [manu]
let templatesByCatManu = {}; // cat -> manu -> [template]
let devices = [];
let editIndex = -1;
let onChangeGlobal = null;
let uiInitialized = false;
let lastSuggestedId = '';
let lastSuggestedName = '';
let lastSuggestedMqttClientId = '';

// Serial port discovery (Admin UI)
let serialPortsCache = [];
let serialPortsLastFetchMs = 0;
let serialPortsTimer = null;
let serialPortsFetchInFlight = false;

function normalizeSerialPortsResponse(res) {
  // Accept both: ["/dev/ttyUSB0", ...] and [{value:"/dev/ttyUSB0"}, ...]
  const out = [];
  if (Array.isArray(res)) {
    for (const x of res) {
      if (!x) continue;
      if (typeof x === 'string') out.push(x);
      else if (typeof x === 'object') {
        const v = (x.value || x.path || x.comName || '').toString();
        if (v) out.push(v);
      }
    }
  }
  // Deduplicate
  return Array.from(new Set(out.filter(Boolean)));
}

function setSerialPortsDatalist(paths) {
  // NOTE: historic name kept. We now populate real <select> dropdowns (like ioBroker modbus adapter),
  // not a HTML5 datalist, because users expect a selectable list.

  const curMb = ($('#mb_path').val() || '').trim();
  const curMbus = ($('#mbus_path').val() || '').trim();

  // Always include current values so they remain selectable
  const all = new Set(paths || []);
  if (curMb) all.add(curMb);
  if (curMbus) all.add(curMbus);

  // Add common fallbacks
  ['/dev/serial/by-id/', '/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyACM0', '/dev/ttyAMA0', '/dev/ttyAMA10', '/dev/com2', 'COM3', 'COM4'].forEach(p => all.add(p));

  const arr = Array.from(all).filter(Boolean);
  // Prefer /dev/serial/by-id first
  arr.sort((a, b) => {
    const ka = a.startsWith('/dev/serial/by-id/') ? '0_' + a : a.startsWith('/dev/tty') ? '1_' + a : a.startsWith('/dev/com') ? '2_' + a : '9_' + a;
    const kb = b.startsWith('/dev/serial/by-id/') ? '0_' + b : b.startsWith('/dev/tty') ? '1_' + b : b.startsWith('/dev/com') ? '2_' + b : '9_' + b;
    return ka.localeCompare(kb);
  });

  function fillSelect(id, current) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const prev = (current || '').trim() || (sel.value || '').trim();
    // Clear options
    while (sel.firstChild) sel.removeChild(sel.firstChild);

    for (const p of arr) {
      // Skip the placeholder marker "/dev/serial/by-id/" we added above
      if (p === '/dev/serial/by-id/') continue;
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    }

    // Manual entry option
    const manual = document.createElement('option');
    manual.value = '__manual__';
    manual.textContent = 'Manuell eingeben…';
    sel.appendChild(manual);

    // Restore selection
    if (prev) {
      // If prev is not in list (e.g. custom), add it and select it
      if (![...sel.options].some(o => o.value === prev)) {
        const opt = document.createElement('option');
        opt.value = prev;
        opt.textContent = prev;
        sel.insertBefore(opt, sel.firstChild);
      }
      sel.value = prev;
    } else {
      // Select first real port if available
      const first = [...sel.options].find(o => o.value && o.value !== '__manual__');
      if (first) sel.value = first.value;
    }
  }

  fillSelect('mb_path', curMb);
  fillSelect('mbus_path', curMbus);
}

function updateSerialPortsStatus(count, ok) {
  const txt = (typeof count === 'number' && count >= 0)
    ? `(${count} Ports gefunden)`
    : (ok ? '(Ports geladen)' : '(Ports nicht verfügbar)');

  $('.serialPortsStatus').text(' ' + txt);
}

function refreshSerialPorts(force) {
  const now = Date.now();
  if (!force && (now - serialPortsLastFetchMs) < 2500) {
    // Just re-apply cached list
    setSerialPortsDatalist(serialPortsCache);
    updateSerialPortsStatus(serialPortsCache.length, true);
    return;
  }
  if (serialPortsFetchInFlight) return;
  serialPortsFetchInFlight = true;

  // If adapter instance is not running, sendTo may fail -> we keep fallback list.
  try {
    if (typeof sendTo !== 'function') {
      serialPortsFetchInFlight = false;
      setSerialPortsDatalist(serialPortsCache);
      updateSerialPortsStatus(null, false);
      return;
    }

    sendTo(null, 'listSerialPorts', {}, (res) => {
      serialPortsFetchInFlight = false;
      const ports = normalizeSerialPortsResponse(res);
      serialPortsCache = ports;
      serialPortsLastFetchMs = Date.now();

      setSerialPortsDatalist(ports);
      updateSerialPortsStatus(ports.length, true);

      // Auto-select a sensible default for new devices only when the field is truly empty.
      // Important: do NOT override '/dev/com2' here - on ED-IPC / embedded hosts this is often
      // the intended internal RS485 port and users reported that hot-plugging an USB dongle could
      // otherwise silently switch the selection away from the internal bus.
      const cur = ($('#mb_path').val() || '').trim();
      if (editIndex < 0 && !cur) {
        const preferred = ports.find(p => p.startsWith('/dev/serial/by-id/'))
          || ports.find(p => p === '/dev/ttyUSB0')
          || ports.find(p => p.startsWith('/dev/ttyUSB'))
          || ports.find(p => p.startsWith('/dev/'))
          || ports[0];
        if (preferred) $('#mb_path').val(preferred);
      }

      const curMbus = ($('#mbus_path').val() || '').trim();
      if (editIndex < 0 && !curMbus) {
        const preferredMbus = ports.find(p => p.startsWith('/dev/serial/by-id/'))
          || ports.find(p => p === '/dev/ttyUSB0')
          || ports.find(p => p.startsWith('/dev/ttyUSB'))
          || ports.find(p => p.startsWith('/dev/'))
          || ports[0];
        if (preferredMbus) $('#mbus_path').val(preferredMbus);
      }

      updateTextFields();
    });
  } catch (e) {
    serialPortsFetchInFlight = false;
    setSerialPortsDatalist(serialPortsCache);
    updateSerialPortsStatus(null, false);
  }
}

function startSerialPortsAutoRefresh() {
  stopSerialPortsAutoRefresh();
  // Pull-based hotplug detection: refresh list regularly while modal is open.
  serialPortsTimer = setInterval(() => refreshSerialPorts(false), 5000);
}

function stopSerialPortsAutoRefresh() {
  if (serialPortsTimer) {
    clearInterval(serialPortsTimer);
    serialPortsTimer = null;
  }
}

function isSerialLikeProtocol(protocol) {
  return ['modbusRtu', 'modbusAscii', 'kostalRs485', 'mbus'].includes((protocol || '').toString());
}

function normalizeSerialPath(v) {
  return (v || '').toString().trim();
}

function normalizeSerialConnection(conn, protocol) {
  const c = conn || {};
  const proto = (protocol || '').toString();
  return {
    path: normalizeSerialPath(c.path),
    baudRate: Number(c.baudRate || (proto === 'kostalRs485' ? 19200 : (proto === 'mbus' ? 2400 : 9600))),
    parity: (c.parity || (proto === 'mbus' ? 'even' : 'none')).toString(),
    dataBits: Number(c.dataBits || 8),
    stopBits: Number(c.stopBits || 1),
  };
}


function getTemplateModbusSerialDefaults(tpl, protocol) {
  const proto = (protocol || '').toString();
  if (!(proto === 'modbusRtu' || proto === 'modbusAscii')) return null;
  const hints = tpl && tpl.driverHints && tpl.driverHints.modbus ? tpl.driverHints.modbus : null;
  if (!hints) return null;
  const defs = (hints.serialDefaults && typeof hints.serialDefaults === 'object') ? hints.serialDefaults : {};
  return {
    enforce: !!defs.enforce,
    baudRate: defs.baudRate,
    parity: defs.parity,
    dataBits: defs.dataBits,
    stopBits: defs.stopBits,
    unitIdDefault: hints.unitIdDefault,
    timeoutMs: hints.timeoutMs,
    forceAddressOffset: hints.forceAddressOffset,
    wordOrderDefault: hints.wordOrderDefault,
    byteOrderDefault: hints.byteOrderDefault,
  };
}

function applyTemplateModbusSerialDefaultsToForm(tpl, protocol, conn) {
  const defs = getTemplateModbusSerialDefaults(tpl, protocol);
  if (!defs) return;
  const c = conn || {};
  const shouldSet = (v) => defs.enforce || v === undefined || v === null || v === '';

  if (defs.baudRate !== undefined && shouldSet(c.baudRate)) $('#mb_baud').val(defs.baudRate);
  if (defs.parity !== undefined && shouldSet(c.parity)) $('#mb_parity').val(defs.parity);
  if (defs.dataBits !== undefined && shouldSet(c.dataBits)) $('#mb_databits').val(defs.dataBits);
  if (defs.stopBits !== undefined && shouldSet(c.stopBits)) $('#mb_stopbits').val(defs.stopBits);
  if (defs.unitIdDefault !== undefined && shouldSet(c.unitId)) $('#mb_unitId_rtu').val(defs.unitIdDefault);
  if (defs.timeoutMs !== undefined && shouldSet(c.timeoutMs)) $('#mb_timeout_rtu').val(defs.timeoutMs);
  if (defs.forceAddressOffset !== undefined) $('#mb_addrOffset_rtu').val(defs.forceAddressOffset);
  if (defs.wordOrderDefault !== undefined && shouldSet(c.wordOrder)) $('#mb_wordOrder_rtu').val(defs.wordOrderDefault);
  if (defs.byteOrderDefault !== undefined && shouldSet(c.byteOrder)) $('#mb_byteOrder_rtu').val(defs.byteOrderDefault);
  refreshSelect($('#mb_parity'));
  refreshSelect($('#mb_wordOrder_rtu'));
  refreshSelect($('#mb_byteOrder_rtu'));
}

function applyTemplateModbusTcpDefaultsToForm(tpl, protocol, conn) {
  if ((protocol || '').toString() !== 'modbusTcp') return;
  const hints = tpl && tpl.driverHints && tpl.driverHints.modbus ? tpl.driverHints.modbus : null;
  if (!hints) return;
  const c = conn || {};
  const shouldSet = (v) => v === undefined || v === null || v === '';
  const enforceUnitIdDefault = hints.enforceUnitIdDefault === true || String(hints.enforceUnitIdDefault).toLowerCase() === 'true';
  const shouldSetUnitId = (v) => enforceUnitIdDefault || shouldSet(v) || Number(v) <= 0;

  if (hints.unitIdDefault !== undefined && shouldSetUnitId(c.unitId)) $('#mb_unitId').val(hints.unitIdDefault);
  if (hints.forceAddressOffset !== undefined && hints.forceAddressOffset !== null && hints.forceAddressOffset !== '') $('#mb_addrOffset').val(hints.forceAddressOffset);
  if (hints.timeoutMs !== undefined && shouldSet(c.timeoutMs)) $('#mb_timeout').val(hints.timeoutMs);
  if (hints.wordOrderDefault !== undefined && shouldSet(c.wordOrder)) $('#mb_wordOrder').val(hints.wordOrderDefault);
  if (hints.byteOrderDefault !== undefined && shouldSet(c.byteOrder)) $('#mb_byteOrder').val(hints.byteOrderDefault);
  refreshSelect($('#mb_wordOrder'));
  refreshSelect($('#mb_byteOrder'));
}

function normalizeMqttTransport(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase().replace(/:$/, '');
  if (['mqtt', 'mqtts', 'ws', 'wss'].includes(normalized)) return normalized;
  return fallback || 'mqtt';
}

function defaultMqttPort(transport) {
  const normalized = normalizeMqttTransport(transport, 'mqtt');
  if (normalized === 'mqtts') return 8883;
  if (normalized === 'wss') return 443;
  if (normalized === 'ws') return 80;
  return 1883;
}

function getTemplateMqttDefaults(tpl) {
  const hints = tpl && tpl.driverHints && tpl.driverHints.mqtt ? tpl.driverHints.mqtt : {};
  const defaultUrl = String(hints.defaultUrl || '').trim();
  const schemeMatch = defaultUrl.match(/^([A-Za-z][A-Za-z0-9+.-]*):\/\//);
  const portMatch = defaultUrl.match(/:(\d+)(?:\/|$)/);
  const transport = normalizeMqttTransport(
    hints.defaultTransport || (schemeMatch ? schemeMatch[1] : ''),
    tpl && tpl.id === 'ess.tesvolt.iotGateway.mqttV2' ? 'mqtt' : 'mqtt',
  );
  const port = Number(hints.defaultPort || (portMatch ? portMatch[1] : 0)) ||
    (tpl && tpl.id === 'ess.tesvolt.iotGateway.mqttV2' ? 1884 : defaultMqttPort(transport));
  return {
    transport,
    port,
    clientId: String(hints.defaultClientId || '').trim(),
    connectTimeoutMs: Number(hints.connectTimeoutMs) || 10000,
    reconnectPeriodMs: Number(hints.reconnectPeriodMs) || 5000,
    keepaliveSeconds: Number(hints.keepaliveSeconds) || 30,
    cleanSession: hints.cleanSession !== false,
    tesvoltSetpointIntervalMs: 5000,
    tesvoltCommandSourceTimeoutMs: 20000,
    tesvoltTelemetryStaleMs: 5000,
    tesvoltTrackingDelayMs: 3000,
  };
}

function mqttClientIdFromTemplate(value, deviceId) {
  const id = String(deviceId || 'device').trim().replace(/[^A-Za-z0-9_-]+/g, '-') || 'device';
  const instanceId = typeof instance !== 'undefined' && /^\d+$/.test(String(instance)) ? String(instance) : '0';
  const template = String(value || '').trim();
  if (!template) return `nexowatt-${instanceId}-${id}`;
  return template
    .replace(/\{\{?deviceId\}?\}/g, id)
    .replace(/\{\{?instance\}?\}/g, instanceId)
    .replace(/\{\{?namespace\}?\}/g, `nexowatt-devices-${instanceId}`);
}

function parseMqttUrlForForm(raw, fallbackTransport, fallbackPort) {
  const original = String(raw || '').trim();
  const fallbackScheme = normalizeMqttTransport(fallbackTransport, 'mqtt');
  const fallback = Number(fallbackPort) || defaultMqttPort(fallbackScheme);
  if (!original) return { url: '', transport: fallbackScheme, port: fallback };

  const candidate = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(original)
    ? original
    : `${fallbackScheme}://${original}`;
  try {
    const parsed = new URL(candidate);
    const transport = normalizeMqttTransport(parsed.protocol, fallbackScheme);
    const port = Number(parsed.port) || (transport === fallbackScheme ? fallback : defaultMqttPort(transport));
    // Never retain credentials inside the URL; the dialog has dedicated fields.
    parsed.username = '';
    parsed.password = '';
    return {
      url: parsed.toString().replace(/\/$/, parsed.pathname && parsed.pathname !== '/' ? '/' : ''),
      transport,
      port,
    };
  } catch (_) {
    return { url: original, transport: fallbackScheme, port: fallback };
  }
}

function buildMqttUrlFromForm(raw, transport, port) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const scheme = normalizeMqttTransport(transport, 'mqtt');
  const selectedPort = Number(port) || defaultMqttPort(scheme);
  const candidate = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(text) ? text : `${scheme}://${text}`;
  try {
    const parsed = new URL(candidate);
    parsed.protocol = `${scheme}:`;
    parsed.port = String(selectedPort);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString().replace(/\/$/, parsed.pathname && parsed.pathname !== '/' ? '/' : '');
  } catch (_) {
    // Keep a clear validation error for the user instead of silently saving a
    // malformed URL that later only appears as a CONNACK timeout.
    throw new Error('MQTT Broker-Adresse ist ungültig. Beispiel: 192.168.1.50 oder mqtt://192.168.1.50:1884');
  }
}

function updateMqttFieldVisibility(tpl) {
  const transport = normalizeMqttTransport($('#mqtt_transport').val(), 'mqtt');
  const secure = transport === 'mqtts' || transport === 'wss';
  $('#mqtt_tls_fields').toggle(secure);
  $('#mqtt_tesvolt_settings').toggle(!!tpl && tpl.id === 'ess.tesvolt.iotGateway.mqttV2');
}

function applyTemplateMqttDefaultsToForm(tpl, protocol, conn) {
  if ((protocol || '').toString() !== 'mqtt') return;
  const c = conn || {};
  const defaults = getTemplateMqttDefaults(tpl);
  const parsed = parseMqttUrlForForm(c.url, defaults.transport, defaults.port);
  const shouldSet = (value) => value === undefined || value === null || value === '';

  $('#mqtt_transport').val(parsed.transport || defaults.transport);
  $('#mqtt_port').val(parsed.port || defaults.port);
  if (c.url) $('#mqtt_url').val(parsed.url || c.url);
  else if (!($('#mqtt_url').val() || '').trim()) $('#mqtt_url').val('');

  const currentDeviceId = ($('#dev_id').val() || '').trim();
  const clientIdDefault = mqttClientIdFromTemplate(defaults.clientId, currentDeviceId);
  const currentClientId = ($('#mqtt_clientId').val() || '').trim();
  if (shouldSet(c.clientId) && (!currentClientId || currentClientId === lastSuggestedMqttClientId)) {
    $('#mqtt_clientId').val(clientIdDefault);
    lastSuggestedMqttClientId = clientIdDefault;
  } else if (currentClientId) {
    lastSuggestedMqttClientId = currentClientId;
  }

  $('#mqtt_verifyTls').prop('checked', c.rejectUnauthorized !== false);
  $('#mqtt_servername').val(c.servername || '');
  $('#mqtt_caFile').val(c.caFile || '');
  $('#mqtt_connectTimeout').val(shouldSet(c.connectTimeoutMs) ? defaults.connectTimeoutMs : c.connectTimeoutMs);
  $('#mqtt_reconnectPeriod').val(shouldSet(c.reconnectPeriodMs) ? defaults.reconnectPeriodMs : c.reconnectPeriodMs);
  $('#mqtt_keepalive').val(shouldSet(c.keepaliveSeconds) ? defaults.keepaliveSeconds : c.keepaliveSeconds);
  $('#mqtt_cleanSession').prop('checked', c.cleanSession !== false && defaults.cleanSession !== false);
  $('#mqtt_tesvoltTopicMode').val(c.tesvoltTopicMode || 'auto');
  $('#mqtt_tesvoltControlEnabled').prop('checked', c.tesvoltControlEnabled === true);
  refreshSelect($('#mqtt_tesvoltTopicMode'));

  $('#mqtt_tesvoltSetpointInterval').val(
    shouldSet(c.tesvoltSetpointIntervalMs) ? defaults.tesvoltSetpointIntervalMs : c.tesvoltSetpointIntervalMs,
  );
  $('#mqtt_tesvoltCommandTimeout').val(
    shouldSet(c.tesvoltCommandSourceTimeoutMs) ? defaults.tesvoltCommandSourceTimeoutMs : c.tesvoltCommandSourceTimeoutMs,
  );
  $('#mqtt_tesvoltTelemetryStale').val(
    shouldSet(c.tesvoltTelemetryStaleMs) ? defaults.tesvoltTelemetryStaleMs : c.tesvoltTelemetryStaleMs,
  );
  $('#mqtt_tesvoltTrackingDelay').val(
    shouldSet(c.tesvoltTrackingDelayMs) ? defaults.tesvoltTrackingDelayMs : c.tesvoltTrackingDelayMs,
  );

  refreshSelect($('#mqtt_transport'));
  updateMqttFieldVisibility(tpl);
}

function getCurrentMqttFormValues() {
  return {
    url: ($('#mqtt_url').val() || '').trim(),
    clientId: ($('#mqtt_clientId').val() || '').trim(),
    username: $('#mqtt_user').val(),
    password: $('#mqtt_pass').val(),
    rejectUnauthorized: $('#mqtt_verifyTls').is(':checked'),
    caFile: ($('#mqtt_caFile').val() || '').trim(),
    servername: ($('#mqtt_servername').val() || '').trim(),
    connectTimeoutMs: $('#mqtt_connectTimeout').val(),
    reconnectPeriodMs: $('#mqtt_reconnectPeriod').val(),
    keepaliveSeconds: $('#mqtt_keepalive').val(),
    cleanSession: $('#mqtt_cleanSession').is(':checked'),
    tesvoltSetpointIntervalMs: $('#mqtt_tesvoltSetpointInterval').val(),
    tesvoltCommandSourceTimeoutMs: $('#mqtt_tesvoltCommandTimeout').val(),
    tesvoltTelemetryStaleMs: $('#mqtt_tesvoltTelemetryStale').val(),
    tesvoltTrackingDelayMs: $('#mqtt_tesvoltTrackingDelay').val(),
    tesvoltTopicMode: $('#mqtt_tesvoltTopicMode').val() || 'auto',
    tesvoltControlEnabled: $('#mqtt_tesvoltControlEnabled').is(':checked'),
  };
}

function getCurrentConnectionFormValues(protocol) {
  const proto = String(protocol || '');
  if (proto === 'modbusTcp') return getCurrentTcpFormValues();
  if (proto === 'mqtt') return getCurrentMqttFormValues();
  if (proto === 'modbusRtu' || proto === 'modbusAscii' || proto === 'kostalRs485' || proto === 'mbus') {
    return getCurrentSerialFormValues();
  }
  return {};
}

function currentMqttTemplate() {
  return templatesById[$('#dev_template').val()] || null;
}

function syncMqttUrlFromControls() {
  const raw = ($('#mqtt_url').val() || '').trim();
  if (!raw) {
    updateMqttFieldVisibility(currentMqttTemplate());
    return;
  }
  try {
    const transport = normalizeMqttTransport($('#mqtt_transport').val(), 'mqtt');
    const port = parseInt($('#mqtt_port').val(), 10) || defaultMqttPort(transport);
    $('#mqtt_url').val(buildMqttUrlFromForm(raw, transport, port));
  } catch (_) {
    // Keep the incomplete user input while typing. collectDeviceFromModal()
    // performs the strict validation on Save.
  }
  updateMqttFieldVisibility(currentMqttTemplate());
  updateTextFields();
}

function syncMqttControlsFromUrl() {
  const tpl = currentMqttTemplate();
  const defaults = getTemplateMqttDefaults(tpl);
  const parsed = parseMqttUrlForForm($('#mqtt_url').val(), defaults.transport, defaults.port);
  $('#mqtt_transport').val(parsed.transport);
  $('#mqtt_port').val(parsed.port);
  refreshSelect($('#mqtt_transport'));
  updateMqttFieldVisibility(tpl);
  updateTextFields();
}

function getCurrentTcpFormValues() {
  return {
    unitId: $('#mb_unitId').val(),
    timeoutMs: $('#mb_timeout').val(),
    wordOrder: $('#mb_wordOrder').val(),
    byteOrder: $('#mb_byteOrder').val(),
  };
}

function getCurrentSerialFormValues() {
  return {
    path: $('#mb_path').val(),
    baudRate: $('#mb_baud').val(),
    parity: $('#mb_parity').val(),
    dataBits: $('#mb_databits').val(),
    stopBits: $('#mb_stopbits').val(),
    unitId: $('#mb_unitId_rtu').val(),
    timeoutMs: $('#mb_timeout_rtu').val(),
  };
}

function detectSerialPortConflict(device, excludeIndex) {
  if (!device || !isSerialLikeProtocol(device.protocol)) return null;

  const own = normalizeSerialConnection(device.connection, device.protocol);
  if (!own.path) return null;

  for (let i = 0; i < (devices || []).length; i++) {
    if (i === excludeIndex) continue;
    const other = devices[i];
    if (!other || !isSerialLikeProtocol(other.protocol)) continue;

    const otherConn = normalizeSerialConnection(other.connection, other.protocol);
    if (!otherConn.path) continue;
    if (otherConn.path !== own.path) continue;

    const sameProtocol = (other.protocol || '') === (device.protocol || '');
    const sameSerialSettings =
      otherConn.baudRate === own.baudRate &&
      otherConn.parity === own.parity &&
      otherConn.dataBits === own.dataBits &&
      otherConn.stopBits === own.stopBits;

    // Same physical serial port may only be shared when protocol and line settings match exactly.
    // Otherwise the second device will usually fail with errors like "Cannot lock port".
    if (!(sameProtocol && sameSerialSettings)) {
      return {
        otherId: other.id || '',
        path: own.path,
        otherProtocol: other.protocol || '',
        ownProtocol: device.protocol || '',
        otherConn,
        ownConn,
      };
    }
  }

  return null;
}

function categoryLabel(cat) {
  const c = (cat || '').toString();
  switch (c) {
    case 'EVCS': return 'Wallbox / Ladestation (EVCS)';
    case 'METER': return 'Zähler / Meter (METER)';
    case 'ESS': return 'Energiespeicher (ESS)';
    case 'PV_INVERTER': return 'PV-Wechselrichter (PV_INVERTER)';
    case 'BATTERY': return 'Batterie (BATTERY)';
    case 'BATTERY_INVERTER': return 'Batteriewechselrichter (BATTERY_INVERTER)';
    case 'HEAT': return 'Heizung / Heizstab (HEAT)';
    case 'EVSE': return 'EVSE / EVSE Controller (EVSE)';
    case 'IO': return 'I/O (IO)';
    case 'GENERIC': return 'Allgemein (GENERIC)';
    default: return c;
  }
}

function idPrefixForCategory(cat) {
  switch ((cat || '').toString()) {
    case 'EVCS': return 'evcs';
    case 'METER': return 'meter';
    case 'ESS': return 'ess';
    case 'PV_INVERTER': return 'pv';
    case 'BATTERY': return 'battery';
    case 'BATTERY_INVERTER': return 'batinv';
    case 'HEAT': return 'heat';
    case 'EVSE': return 'evse';
    case 'IO': return 'io';
    default:
      return (cat || 'dev').toString().toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 6) || 'dev';
  }
}

function suggestDeviceId(cat) {
  const prefix = idPrefixForCategory(cat);
  const used = new Set((devices || []).map(d => (d && d.id ? String(d.id) : '')));
  for (let i = 1; i < 1000; i++) {
    const id = `${prefix}${i}`;
    if (!used.has(id)) return id;
  }
  return `${prefix}${Date.now()}`;
}

function suggestDeviceName(templateId) {
  const tpl = templatesById[templateId];
  if (!tpl) return '';
  const parts = [tpl.manufacturer, tpl.model, tpl.name].filter(Boolean);
  return parts.join(' ').trim() || tpl.id || '';
}

function hasMaterialize() {
  return typeof M !== 'undefined' && M && typeof M.Modal !== 'undefined';
}

function hasFormSelect() {
  return !!($.fn && $.fn.formSelect);
}

function updateTextFields() {
  if (hasMaterialize() && typeof M.updateTextFields === 'function') {
    try { M.updateTextFields(); } catch (e) { /* ignore */ }
  }
}

function toast(msg) {
  const safe = (msg || '').toString();
  if (hasMaterialize() && typeof M.toast === 'function') {
    try { M.toast({ html: escapeHtml(safe) }); return; } catch (e) { /* ignore */ }
  }
  // fallback
  try { alert(safe); } catch (e) { /* ignore */ }
}

function escapeHtml(str) {
  return (str || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try { document.body.removeChild(a); } catch (e) { /* ignore */ }
    try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
  }, 0);
}

function exportDevicesJsonToFile() {
  const text = JSON.stringify(devices || [], null, 2);
  downloadTextFile('nexowatt-devices.devices.json', text, 'application/json');
}

function importDevicesJsonFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const txt = (reader.result || '').toString();
    const parsed = safeJsonParse(txt, null);
    if (!Array.isArray(parsed)) {
      toast('Ungültige JSON-Datei: erwartet wird ein Array von Geräten.');
      return;
    }
    devices = parsed;
    renderDevicesTable();
    updateJsonPreview();
    setChanged(true);
    toast(`Import ok: ${devices.length} Geräte übernommen.`);
  };
  reader.onerror = () => toast('Fehler beim Lesen der JSON-Datei.');
  reader.readAsText(file);
}

function setChanged(changed) {
  if (typeof onChangeGlobal === 'function') {
    onChangeGlobal(changed);
  }
}

function refreshSelect($sel) {
  if (!$sel || !$sel.length) return;
  // We use native selects (browser-default) for maximum compatibility.
  // Never initialize Materialize formSelect on those, otherwise it hides the element.
  if ($sel.hasClass('browser-default')) return;
  if (hasFormSelect()) {
    try { $sel.formSelect(); } catch (e) { /* ignore */ }
  }
}

function openModal() {
  const el = document.getElementById('modalDevice');
  if (hasMaterialize()) {
    try {
      const inst = M.Modal.getInstance(el) || M.Modal.init(el, { dismissible: false });
      inst.open();
      startSerialPortsAutoRefresh();
      return;
    } catch (e) {
      console.warn('Materialize modal open failed, falling back:', e);
    }
  }

  // fallback
  $('#modalDevice').addClass('nexo-fallback nexo-open');
  $('#nexoBackdrop').addClass('nexo-open').show();
  startSerialPortsAutoRefresh();
}

function closeModal() {
  const el = document.getElementById('modalDevice');
  if (hasMaterialize()) {
    try {
      const inst = M.Modal.getInstance(el);
      if (inst) inst.close();
      stopSerialPortsAutoRefresh();
      return;
    } catch (e) {
      // ignore and fall back
    }
  }
  $('#modalDevice').removeClass('nexo-open');
  $('#nexoBackdrop').removeClass('nexo-open').hide();
  stopSerialPortsAutoRefresh();
}

function loadTemplates() {
  return new Promise((resolve, reject) => {
    if (templatesData) return resolve(templatesData);

    // Cache-busting is important because Admin often keeps old adapter assets in browser cache.
    $.getJSON(`templates.json?_=${Date.now()}`)
      .done((data) => {
        templatesData = data || {};
        templatesById = {};
        manufacturersByCategory = {};
        templatesByCatManu = {};

        const tpls = Array.isArray(templatesData.templates) ? templatesData.templates : [];
        tpls.forEach((t) => {
          if (!t || !t.id) return;
          templatesById[t.id] = t;
          const cat = t.category || 'OTHER';
          const manu = t.manufacturer || 'Unknown';

          manufacturersByCategory[cat] = manufacturersByCategory[cat] || new Set();
          manufacturersByCategory[cat].add(manu);

          templatesByCatManu[cat] = templatesByCatManu[cat] || {};
          templatesByCatManu[cat][manu] = templatesByCatManu[cat][manu] || [];
          templatesByCatManu[cat][manu].push(t);
        });

        // Prefer the most common categories first for usability.
        const preferredOrder = ['EVCS', 'METER', 'ESS', 'PV_INVERTER', 'BATTERY', 'BATTERY_INVERTER', 'HEAT', 'IO', 'EVSE', 'GENERIC'];
        categories = Object.keys(manufacturersByCategory).sort((a, b) => {
          const ia = preferredOrder.indexOf(a);
          const ib = preferredOrder.indexOf(b);
          const wa = ia >= 0 ? ia : 999;
          const wb = ib >= 0 ? ib : 999;
          if (wa !== wb) return wa - wb;
          return (a || '').localeCompare(b || '');
        });

        // Convert Sets to arrays
        Object.keys(manufacturersByCategory).forEach((cat) => {
          manufacturersByCategory[cat] = Array.from(manufacturersByCategory[cat]).sort((a, b) => (a || '').localeCompare(b || ''));
        });

        // UI hint: show how many driver templates were loaded.
        try { $('#tplCount').text(String(tpls.length)); } catch (e) { /* ignore */ }

        resolve(templatesData);
      })
      .fail((xhr, status, err) => {
        console.error('Failed to load templates.json', status, err);
        try { $('#tplCount').text('0'); } catch (e) { /* ignore */ }
        reject(err || new Error('Failed to load templates.json'));
      });
  });
}

function summarizeConnection(d) {
  const c = d.connection || {};
  const hb = (d && d.heartbeatTimeoutMs !== undefined && d.heartbeatTimeoutMs !== null) ? Number(d.heartbeatTimeoutMs) : NaN;
  const hbTxt = (Number.isFinite(hb) && hb > 0) ? `, hb ${Math.trunc(hb)}ms` : '';
  if (d.protocol === 'modbusTcp') {
    return `${c.host || ''}:${c.port || 502} (unit ${c.unitId ?? 1}${hbTxt})`;
  }
  if (d.protocol === 'kostalTcp') {
    return `${c.host || ''}:${c.port || 81} (unit ${c.unitId ?? 1}${hbTxt})`;
  }
  if (d.protocol === 'kostalRs485') {
    return `${c.path || ''} @${c.baudRate || 19200} (addr ${c.unitId ?? 255}${hbTxt})`;
  }
  if (d.protocol === 'modbusRtu' || d.protocol === 'modbusAscii') {
    return `${c.path || ''} @${c.baudRate || 9600} (unit ${c.unitId ?? 1}${hbTxt})`;
  }
  if (d.protocol === 'mbus') {
    return `${c.path || ''} @${c.baudRate || 2400} (addr ${c.unitId ?? 1}${hbTxt})`;
  }
  if (d.protocol === 'mqtt') {
    return `${c.url || ''}${hbTxt ? (' (' + hbTxt.slice(2) + ')') : ''}`;
  }
  if (d.protocol === 'canbus') {
    return `${c.interface || c.iface || c.canInterface || 'can0'}${hbTxt ? (' (' + hbTxt.slice(2) + ')') : ''}`;
  }
  if (d.protocol === 'http') {
    return `${c.baseUrl || ''}${hbTxt ? (' (' + hbTxt.slice(2) + ')') : ''}`;
  }
  if (d.protocol === 'taCmi') {
    const bridge = c.bridgeEnabled === false ? 'bridge off' : `bridge :${c.bridgePort || 1502}/u${c.bridgeUnitId || 1}`;
    return `${c.baseUrl || ''} (${c.nodes || '1-62'}, ${bridge}${hbTxt})`;
  }
  if (d.protocol === 'udp') {
    return `${c.host || ''}:${c.port || 7090}${hbTxt ? (' (' + hbTxt.slice(2) + ')') : ''}`;
  }
  return '';
}

function renderDevicesTable() {
  const tbody = $('#devicesTable tbody');
  tbody.empty();

  if (!devices || !devices.length) {
    $('#noDevicesHint').show();
    return;
  }
  $('#noDevicesHint').hide();

  devices.forEach((d, idx) => {
    const tpl = templatesById[d.templateId];
    const manufacturer = tpl ? (tpl.manufacturer || '') : '';
    const tplName = tpl ? (tpl.name || tpl.id) : (d.templateId || '');

    const row = $(`
      <tr>
        <td>${d.enabled ? '✓' : ''}</td>
        <td><code>${escapeHtml(d.id)}</code></td>
        <td>${escapeHtml(d.name || '')}</td>
        <td>${escapeHtml(d.category || '')}</td>
        <td>${escapeHtml(manufacturer)}</td>
        <td>${escapeHtml(tplName)}</td>
        <td>${escapeHtml(d.protocol || '')}</td>
        <td class="actions">
          <a href="#!" class="btn-small waves-effect" data-action="edit" data-idx="${idx}">${escapeHtml('Gerät bearbeiten')}</a>
          <a href="#!" class="btn-small red waves-effect" data-action="delete" data-idx="${idx}">${escapeHtml('Löschen')}</a>
        </td>
      </tr>
    `);

    tbody.append(row);
  });
}

function fillCategorySelect() {
  const sel = $('#dev_category');
  sel.empty();
  categories.forEach((cat) => sel.append(`<option value="${escapeHtml(cat)}">${escapeHtml(categoryLabel(cat))}</option>`));
  refreshSelect(sel);
}

function fillManufacturerSelect(cat) {
  const sel = $('#dev_manufacturer');
  sel.empty();
  const manus = manufacturersByCategory[cat] || [];
  manus.forEach((m) => sel.append(`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`));
  refreshSelect(sel);
}

function fillTemplateSelect(cat, manu) {
  const sel = $('#dev_template');
  sel.empty();
  const tpls = (templatesByCatManu[cat] && templatesByCatManu[cat][manu]) ? templatesByCatManu[cat][manu] : [];
  tpls
    .slice()
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
    .forEach((t) => sel.append(`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name || t.id)}</option>`));
  refreshSelect(sel);
}

function fillProtocolSelect(templateId, currentProtocol) {
  const sel = $('#dev_protocol');
  sel.empty();

  const tpl = templatesById[templateId];
  const protos = (tpl && Array.isArray(tpl.protocols)) ? tpl.protocols : [];

  protos.forEach((p) => sel.append(`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`));
  refreshSelect(sel);

  if (currentProtocol && protos.includes(currentProtocol)) {
    sel.val(currentProtocol);
  } else if (protos.length) {
    sel.val(protos[0]);
  }
  refreshSelect(sel);
}

function showConnBlock(protocol) {
  $('.nexo-conn-block').hide();
  if (protocol === 'modbusTcp') $('#conn_modbusTcp').show();
  if (protocol === 'kostalTcp') $('#conn_kostalTcp').show();
  if (protocol === 'modbusRtu' || protocol === 'modbusAscii' || protocol === 'kostalRs485') $('#conn_modbusRtu').show();
  if (protocol === 'mbus') $('#conn_mbus').show();
  if (protocol === 'mqtt') $('#conn_mqtt').show();
  if (protocol === 'canbus') $('#conn_canbus').show();
  if (protocol === 'onewire') $('#conn_onewire').show();
  if (protocol === 'http') $('#conn_http').show();
  if (protocol === 'taCmi') $('#conn_taCmi').show();
  if (protocol === 'udp') $('#conn_udp').show();
  if (protocol === 'speedwire') $('#conn_speedwire').show();

  // Refresh serial ports list whenever a serial-based protocol is selected.
  if (protocol === 'modbusRtu' || protocol === 'modbusAscii' || protocol === 'kostalRs485' || protocol === 'mbus') {
    refreshSerialPorts(false);
  }
}

function summarizeDatapoint(dp) {
  const src = dp.source || {};
  const kind = src.kind || '';
  if (kind === 'deyeModbus') {
    const r = src.read || {};
    const w = src.write;
    const addresses = Array.isArray(r.addresses) ? r.addresses.join(', ') : r.address;
    return `R:FC3@${addresses}${w ? ` W:FC16@${w.address}` : ''} ${r.dataType || ''} ×10^${src.engineeringExponent || 0}`;
  }
  if (kind === 'modbus') {
    const r = src.read || {};
    const w = src.write || {};
    const dt = (r.dataType || w.dataType || src.dataType || dp.type || '').toString();
    const sf = (src.scaleFactor !== undefined && src.scaleFactor !== null) ? ` sf=${src.scaleFactor}` : '';
    const rTxt = (r.fc != null && r.address != null) ? `R:FC${r.fc}@${r.address}(${r.length || 1})` : '';
    const wTxt = (w.fc != null && w.address != null) ? ` W:FC${w.fc}@${w.address}(${w.length || 1})` : '';
    return `${rTxt}${wTxt} ${dt}${sf}`.trim();
  }
  if (kind === 'mqtt') {
    return `topic: ${src.topic || ''}`.trim();
  }
  if (kind === 'canbus') {
    if (src.computed) return `computed: ${src.computed}`;
    const id = (src.canId !== undefined && src.canId !== null) ? src.canId : '';
    const off = (src.byteOffset !== undefined && src.byteOffset !== null) ? ` off=${src.byteOffset}` : '';
    const len = (src.byteLength !== undefined && src.byteLength !== null) ? ` len=${src.byteLength}` : '';
    const dt = (src.dataType || '').toString();
    return `id: ${id}${off}${len} ${dt}`.trim();
  }
  if (kind === 'onewire') {
    const sid = src.sensorId || '';
    const f = src.file || 'w1_slave';
    const p = src.parser || 'ds18b20';
    return `sensor: ${sid || '(cfg)'} file: ${f} parser: ${p}`.trim();
  }
  if (kind === 'mbus') {
    return `field: ${src.field || ''}`.trim();
  }
  if (kind === 'http') {
    return `${(src.method || 'GET').toUpperCase()} ${src.path || ''} ${src.jsonPath ? ('-> ' + src.jsonPath) : ''}`.trim();
  }
  if (kind === 'taCmiStatus') return 'CMI runtime status';
  if (kind === 'taCmiBridge') return `${src.direction || ''} ${src.valueType || ''} ch${src.channel || ''}`.trim();
  if (kind === 'taCmiJson') return `node ${src.node || ''} ${src.group || ''} #${src.number || ''}`.trim();
  if (kind === 'udp') {
    const r = src.read || {};
    const w = src.write || {};
    const rTxt = r.cmd ? `cmd: ${r.cmd}${r.jsonPath ? (' -> ' + r.jsonPath) : ''}` : '';
    const wTxt = w.cmdTemplate ? ` set: ${w.cmdTemplate}` : (w.cmd ? ` set: ${w.cmd}` : '');
    return `${rTxt}${wTxt}`.trim();
  }
  if (kind === 'speedwire') {
    if (src.field) return `field: ${src.field}`;
    if (src.computed) return `computed: ${src.computed}`;
    const o = src.obis || {};
    const parts = [];
    if (o.b !== undefined && o.b !== null) parts.push(`b=${o.b}`);
    if (o.c !== undefined && o.c !== null) parts.push(`c=${o.c}`);
    if (o.d !== undefined && o.d !== null) parts.push(`d=${o.d}`);
    if (o.e !== undefined && o.e !== null) parts.push(`e=${o.e}`);
    return parts.length ? `OBIS ${parts.join(', ')}` : 'speedwire';
  }
  return kind;
}

// Keep the write opt-in tied to the selected VARTA product. Switching a
// template must not silently carry a previous expert permission to another unit.
function renderVartaOptions(tpl) {
  const profile = tpl && tpl.driverHints && tpl.driverHints.vartaModbus;
  const isVarta = !!profile;
  const supportsSf = isVarta && ['pulseNeo', 'flexStorage'].includes(profile.product);
  const previous = $('#varta_settings').data('templateId');
  if (previous !== (tpl && tpl.id)) {
    $('#varta_extended_enabled').prop('checked', true);
    $('#varta_allow_control_writes, #varta_legacy_token, #varta_frequency_enabled').prop('checked', false);
    $('#varta_limit_class').val('');
  }
  if (previous !== (tpl && tpl.id) || !supportsSf) $('#varta_allow_sf_writes').prop('checked', false);
  $('#varta_settings').data('templateId', tpl && tpl.id).toggle(isVarta);
  $('#varta_sf_option').toggle(supportsSf);
  $('#varta_allow_sf_writes').prop('disabled', !supportsSf);
  $('#varta_frequency_option').toggle(supportsSf);
  $('#varta_frequency_enabled').prop('disabled', !supportsSf);
  if (!supportsSf) $('#varta_frequency_enabled').prop('checked', false);
  $('#varta_token_option').toggle(isVarta && profile.product !== 'link');
  $('#varta_legacy_token').prop('disabled', !isVarta || profile.product === 'link');
  $('#varta_pacing_note').text(isVarta && profile.product === 'link'
    ? 'VARTA link: höchstens eine Modbus-Anfrage je 5 Sekunden. Ein kompletter Messwertsatz benötigt mehrere Anfragen.'
    : 'Höchstens eine Modbus-Anfrage pro Sekunde, einschließlich Schreiben und Rücklesen. Ein kompletter Messwertsatz dauert länger als eine Sekunde.');
}

function renderDeyeOptions(tpl) {
  const profile = tpl && tpl.driverHints && tpl.driverHints.deyeModbus;
  const previous = $('#deye_settings').data('templateId');
  if (previous !== (tpl && tpl.id) || !profile) {
    $('#deye_allow_config_writes, #deye_read_remote').prop('checked', false);
    $('#deye_battery_sign, #deye_battery_scale, #deye_grid_sign').val('unconfirmed');
  }
  $('#deye_settings').data('templateId', tpl && tpl.id).toggle(!!profile);
  $('.deye_three_phase').toggle(!!profile && profile.profile !== 'singlePhase');
}

function renderDatapoints(templateId) {
  const tpl = templatesById[templateId];
  renderVartaOptions(tpl);
  renderDeyeOptions(tpl);
  $('#depower_settings').toggle(!!(tpl && tpl.driverHints && tpl.driverHints.oemModbusV1003));
  const tbody = $('#dpBody');
  tbody.empty();

  if (!tpl || !Array.isArray(tpl.datapoints)) return;

  tpl.datapoints.forEach((dp) => {
    const row = $(`
      <tr>
        <td><code>${escapeHtml(dp.id)}</code></td>
        <td>${escapeHtml(dp.name || '')}</td>
        <td>${escapeHtml(dp.type || '')}</td>
        <td>${escapeHtml(dp.rw || 'ro')}</td>
        <td>${escapeHtml(summarizeDatapoint(dp))}</td>
      </tr>
    `);
    tbody.append(row);
  });
}

function openDeviceModal(device, idx) {
  editIndex = (typeof idx === 'number') ? idx : -1;
  $('#modalTitle').text(editIndex >= 0 ? 'Gerät bearbeiten' : 'Gerät hinzufügen');

  $('#dev_id').val(device.id || '');
  $('#dev_name').val(device.name || '');
  $('#dev_enabled').prop('checked', device.enabled !== false);
  $('#dev_poll').val(device.pollIntervalMs || '');
  $('#dev_hbTimeout').val(device.heartbeatTimeoutMs || '');

  // category/manufacturer/template
  const cat = device.category || categories[0] || 'GENERIC';
  $('#dev_category').val(cat);
  refreshSelect($('#dev_category'));

  fillManufacturerSelect(cat);
  const manuList = manufacturersByCategory[cat] || [];
  const manu = device.manufacturer || (manuList[0] || '');
  $('#dev_manufacturer').val(manu);
  refreshSelect($('#dev_manufacturer'));

  fillTemplateSelect(cat, manu);
  const tplId = device.templateId || ($('#dev_template option:first').val() || '');
  const tpl = templatesById[tplId] || null;
  $('#dev_template').val(tplId);
  refreshSelect($('#dev_template'));

  fillProtocolSelect(tplId, device.protocol);

  const proto = $('#dev_protocol').val();
  showConnBlock(proto);
  renderDatapoints(tplId);

  // Auto-fill convenience for new devices: ID + default name
  if (editIndex < 0) {
    const curId = ($('#dev_id').val() || '').trim();
    if (!curId) {
      lastSuggestedId = suggestDeviceId(cat);
      $('#dev_id').val(lastSuggestedId);
    } else {
      lastSuggestedId = curId;
    }
    const curName = ($('#dev_name').val() || '').trim();
    if (!curName) {
      const suggested = suggestDeviceName(tplId);
      if (suggested) {
        lastSuggestedName = suggested;
        $('#dev_name').val(suggested);
      }
    } else {
      lastSuggestedName = curName;
    }
  } else {
    lastSuggestedId = ($('#dev_id').val() || '').trim();
    lastSuggestedName = ($('#dev_name').val() || '').trim();
  }

  // connection defaults
  const c = device.connection || {};

  // TCP
  $('#mb_host').val(c.host || '');
  $('#mb_port').val(c.port ?? 502);
  $('#mb_unitId').val(c.unitId ?? 1);
  $('#mb_timeout').val(c.timeoutMs ?? '');
  $('#mb_addrOffset').val(c.addressOffset ?? 0);
  $('#mb_wordOrder').val(c.wordOrder || 'be');

  // Kostal (RJ45/TCP)
  $('#ko_host').val(c.host || '');
  $('#ko_port').val(c.port ?? 81);
  $('#ko_unitId').val(c.unitId ?? 1);
  $('#ko_timeout').val(c.timeoutMs ?? '');
  $('#mb_byteOrder').val(c.byteOrder || 'be');
  $('#mb_writePass').val(c.writePassword || '');
  refreshSelect($('#mb_wordOrder'));
  refreshSelect($('#mb_byteOrder'));
  applyTemplateModbusTcpDefaultsToForm(tpl, proto, c);
  renderVartaOptions(tpl);
  $('#varta_allow_sf_writes').prop('checked', device.vartaAllowScaleFactorWrites === true && !!(tpl && tpl.driverHints && tpl.driverHints.vartaModbus && ['pulseNeo', 'flexStorage'].includes(tpl.driverHints.vartaModbus.product)));
  $('#varta_extended_enabled').prop('checked', device.vartaExtendedEnabled !== false);
  $('#varta_allow_control_writes').prop('checked', device.vartaAllowControlWrites === true);
  $('#varta_limit_class').val(device.vartaLimitClass || '');
  $('#varta_legacy_token').prop('checked', device.vartaLegacyUnpaddedToken === true);
  $('#varta_frequency_enabled').prop('checked', device.vartaFrequencyControlEnabled === true && !!(tpl && tpl.driverHints && tpl.driverHints.vartaModbus && ['pulseNeo', 'flexStorage'].includes(tpl.driverHints.vartaModbus.product)));
  renderDeyeOptions(tpl);
  $('#deye_allow_config_writes').prop('checked', device.deyeAllowConfigurationWrites === true);
  $('#deye_read_remote').prop('checked', device.deyeReadRemoteRegisters === true);
  $('#deye_battery_sign').val(device.deyeBatteryPowerSign || 'unconfirmed');
  $('#deye_battery_scale').val(String(device.deyeBatteryPowerScale || 'unconfirmed'));
  $('#deye_grid_sign').val(device.deyeGridPowerSign || 'unconfirmed');
  $('#depower_settings').toggle(!!(tpl && tpl.driverHints && tpl.driverHints.oemModbusV1003));
  $('#depower_session_wh').val(c.depowerSessionEnergyWhPerTick ?? 100);
  $('#depower_total_wh').val(c.depowerTotalEnergyWhPerTick ?? 100);

  // RTU
  // Leave empty for new devices; we auto-suggest a real detected port via refreshSerialPorts().
  $('#mb_path').val(c.path || '');
  $('#mb_baud').val(c.baudRate ?? 9600);
  $('#mb_parity').val(c.parity || 'none');
  $('#mb_databits').val(c.dataBits ?? 8);
  $('#mb_stopbits').val(c.stopBits ?? 1);
  $('#mb_unitId_rtu').val(c.unitId ?? 1);
  $('#mb_timeout_rtu').val(c.timeoutMs ?? '');
  $('#mb_addrOffset_rtu').val(c.addressOffset ?? 0);
  $('#mb_wordOrder_rtu').val(c.wordOrder || 'be');
  $('#mb_byteOrder_rtu').val(c.byteOrder || 'be');
  $('#mb_writePass_rtu').val(c.writePassword || '');
  refreshSelect($('#mb_parity'));
  refreshSelect($('#mb_wordOrder_rtu'));
  refreshSelect($('#mb_byteOrder_rtu'));

  // Kostal RS485 defaults (PIKO): 19200 8N1, default address 255
  if (proto === 'kostalRs485') {
    if (c.baudRate === undefined || c.baudRate === null || c.baudRate === '') $('#mb_baud').val(19200);
    if (c.parity === undefined || c.parity === null || c.parity === '') $('#mb_parity').val('none');
    if (c.dataBits === undefined || c.dataBits === null || c.dataBits === '') $('#mb_databits').val(8);
    if (c.stopBits === undefined || c.stopBits === null || c.stopBits === '') $('#mb_stopbits').val(1);
    if (c.unitId === undefined || c.unitId === null || c.unitId === '') $('#mb_unitId_rtu').val(255);
    if (c.timeoutMs === undefined || c.timeoutMs === null || c.timeoutMs === '') $('#mb_timeout_rtu').val(2000);
    refreshSelect($('#mb_parity'));
  }

  applyTemplateModbusSerialDefaultsToForm(tpl, proto, c);

  // M-Bus (wired)
  $('#mbus_path').val(c.path || '/dev/ttyUSB0');
  $('#mbus_baud').val(c.baudRate ?? 2400);
  $('#mbus_parity').val(c.parity || 'even');
  $('#mbus_databits').val(c.dataBits ?? 8);
  $('#mbus_stopbits').val(c.stopBits ?? 1);
  $('#mbus_unitId').val(c.unitId ?? 1);
  $('#mbus_timeout').val(c.timeoutMs ?? '');
  $('#mbus_sendNke').prop('checked', c.sendNke !== false);
  refreshSelect($('#mbus_parity'));

  // MQTT
  $('#mqtt_url').val(c.url || '');
  $('#mqtt_transport').val('mqtt');
  $('#mqtt_port').val('');
  $('#mqtt_clientId').val(c.clientId || '');
  $('#mqtt_user').val(c.username || '');
  $('#mqtt_pass').val(c.password || '');
  $('#mqtt_verifyTls').prop('checked', c.rejectUnauthorized !== false);
  $('#mqtt_servername').val(c.servername || '');
  $('#mqtt_caFile').val(c.caFile || '');
  $('#mqtt_connectTimeout').val(c.connectTimeoutMs ?? '');
  $('#mqtt_reconnectPeriod').val(c.reconnectPeriodMs ?? '');
  $('#mqtt_keepalive').val(c.keepaliveSeconds ?? '');
  $('#mqtt_cleanSession').prop('checked', c.cleanSession !== false);
  $('#mqtt_tesvoltSetpointInterval').val(c.tesvoltSetpointIntervalMs ?? '');
  $('#mqtt_tesvoltCommandTimeout').val(c.tesvoltCommandSourceTimeoutMs ?? '');
  $('#mqtt_tesvoltTelemetryStale').val(c.tesvoltTelemetryStaleMs ?? '');
  $('#mqtt_tesvoltTrackingDelay').val(c.tesvoltTrackingDelayMs ?? '');
  $('#mqtt_tesvoltTopicMode').val(c.tesvoltTopicMode || 'auto');
  $('#mqtt_tesvoltControlEnabled').prop('checked', c.tesvoltControlEnabled === true);
  applyTemplateMqttDefaultsToForm(tpl, proto, c);

  // CANbus
  $('#can_iface').val(c.interface || c.iface || c.canInterface || 'can0');
  $('#can_candumpArgs').val(c.candumpArgs || '');
  $('#can_candumpPath').val(c.candumpPath || 'candump');
  $('#can_cansendPath').val(c.cansendPath || 'cansend');

  // 1-Wire
  $('#ow_basePath').val(c.basePath || '/sys/bus/w1/devices');
  $('#ow_sensorId').val(c.sensorId || '');
  $('#ow_file').val(c.file || 'w1_slave');
  $('#ow_parser').val(c.parser || 'ds18b20');

  // HTTP
  $('#http_baseUrl').val(c.baseUrl || '');
  $('#http_user').val(c.username || '');
  $('#http_pass').val(c.password || '');
  $('#http_meterId').val(c.meterId || '');
  $('#http_insecureTls').prop('checked', !!c.insecureTls);

  // TA CMI
  $('#cmi_baseUrl').val(c.baseUrl || 'http://192.168.1.50');
  $('#cmi_user').val(c.username || '');
  $('#cmi_pass').val(c.password || '');
  $('#cmi_nodes').val(c.nodes || c.nodeList || c.nodeRange || '1-62');
  $('#cmi_groups').val(Array.isArray(c.groups) ? c.groups.join(',') : (c.groups || c.jsonParams || ''));
  $('#cmi_timeout').val(c.timeoutMs ?? 10000);
  $('#cmi_includeDesignations').prop('checked', c.includeDesignations !== false);
  $('#cmi_insecureTls').prop('checked', !!c.insecureTls);
  $('#cmi_bridgeEnabled').prop('checked', c.bridgeEnabled !== false);
  $('#cmi_bridgeHost').val(c.bridgeHost || c.bindAddress || '0.0.0.0');
  $('#cmi_bridgePort').val(c.bridgePort ?? c.serverPort ?? 1502);
  $('#cmi_bridgeUnitId').val(c.bridgeUnitId ?? c.serverUnitId ?? 1);
  $('#cmi_bridgeMapJson').val(typeof c.bridgeMapJson === 'string' ? c.bridgeMapJson : (Array.isArray(c.bridgeMap) ? JSON.stringify(c.bridgeMap, null, 2) : ''));

  // UDP
  $('#udp_host').val(c.host || '');
  $('#udp_port').val(c.port ?? 7090);
  $('#udp_timeout').val(c.timeoutMs ?? '');
  $('#udp_pause').val(c.commandPauseMs ?? 0);

  // Speedwire (UDP multicast)
  $('#sw_filterHost').val(c.filterHost || c.host || '');
  $('#sw_multicastGroup').val(c.multicastGroup || '239.12.255.254');
  $('#sw_port').val(c.port ?? 9522);
  $('#sw_interface').val(c.interfaceAddress || '');
  // Default increased to 30000ms to reduce false positives on networks where multicast
  // forwarding can be bursty (IGMP snooping/querier, WiFi multicast filtering, VMs).
  $('#sw_stale').val(c.staleTimeoutMs ?? 30000);

  // Populate serial port datalist from the host (supports hotplug).
  refreshSerialPorts(true);

  updateTextFields();
  openModal();
}

function collectDeviceFromModal() {
  const tplId = $('#dev_template').val();
  const tpl = templatesById[tplId];

  const d = {
    id: ($('#dev_id').val() || '').trim(),
    name: ($('#dev_name').val() || '').trim(),
    enabled: $('#dev_enabled').is(':checked'),
    category: $('#dev_category').val(),
    manufacturer: $('#dev_manufacturer').val(),
    templateId: tplId,
    protocol: $('#dev_protocol').val(),
    pollIntervalMs: ($('#dev_poll').val() || '').trim() ? parseInt($('#dev_poll').val(), 10) : undefined,
    heartbeatTimeoutMs: ($('#dev_hbTimeout').val() || '').trim() ? parseInt($('#dev_hbTimeout').val(), 10) : undefined,
    connection: {}
  };

  if (tpl && tpl.driverHints && tpl.driverHints.vartaModbus) {
    const sfProduct = ['pulseNeo', 'flexStorage'].includes(tpl.driverHints.vartaModbus.product);
    d.vartaAllowScaleFactorWrites = sfProduct && $('#varta_allow_sf_writes').is(':checked');
    d.vartaExtendedEnabled = $('#varta_extended_enabled').is(':checked');
    d.vartaAllowControlWrites = $('#varta_allow_control_writes').is(':checked');
    d.vartaLimitClass = $('#varta_limit_class').val() || '';
    d.vartaLegacyUnpaddedToken = tpl.driverHints.vartaModbus.product !== 'link' && $('#varta_legacy_token').is(':checked');
    d.vartaFrequencyControlEnabled = sfProduct && $('#varta_frequency_enabled').is(':checked');
  }
  if (tpl && tpl.driverHints && tpl.driverHints.deyeModbus) {
    d.deyeAllowConfigurationWrites = $('#deye_allow_config_writes').is(':checked');
    d.deyeReadRemoteRegisters = $('#deye_read_remote').is(':checked');
    d.deyeBatteryPowerSign = $('#deye_battery_sign').val() || 'unconfirmed';
    d.deyeBatteryPowerScale = $('#deye_battery_scale').val() || 'unconfirmed';
    d.deyeGridPowerSign = $('#deye_grid_sign').val() || 'unconfirmed';
  }

  // Normalize heartbeat timeout (optional)
  if (!Number.isFinite(Number(d.heartbeatTimeoutMs)) || Number(d.heartbeatTimeoutMs) <= 0) {
    delete d.heartbeatTimeoutMs;
  } else {
    d.heartbeatTimeoutMs = Math.trunc(Number(d.heartbeatTimeoutMs));
  }

  if (tpl && Array.isArray(tpl.protocols) && d.protocol && !tpl.protocols.includes(d.protocol)) {
    throw new Error('Protokoll wird vom Template nicht unterstützt');
  }

  // Connection fields
  if (d.protocol === 'modbusTcp') {
    d.connection.host = ($('#mb_host').val() || '').trim();
    d.connection.port = parseInt($('#mb_port').val(), 10) || 502;
    d.connection.unitId = parseInt($('#mb_unitId').val(), 10) || 1;

    const t = parseInt($('#mb_timeout').val(), 10);
    if (!isNaN(t)) d.connection.timeoutMs = t;

    const o = parseInt($('#mb_addrOffset').val(), 10);
    if (!isNaN(o)) d.connection.addressOffset = o;

    d.connection.wordOrder = $('#mb_wordOrder').val() || 'be';
    d.connection.byteOrder = $('#mb_byteOrder').val() || 'be';
    d.connection.writePassword = ($('#mb_writePass').val() || '').trim() || undefined;
    if (tpl && tpl.driverHints && tpl.driverHints.oemModbusV1003) {
      for (const [key, selector] of [
        ['depowerSessionEnergyWhPerTick', '#depower_session_wh'],
        ['depowerTotalEnergyWhPerTick', '#depower_total_wh'],
      ]) {
        const resolution = Number($(selector).val());
        if (![0.1, 1, 10, 100, 1000].includes(resolution)) throw new Error('Ungültige DEPower-Zählerauflösung');
        d.connection[key] = resolution;
      }
    }
  } else if (d.protocol === 'kostalTcp') {
    d.connection.host = ($('#ko_host').val() || '').trim();
    d.connection.port = parseInt($('#ko_port').val(), 10) || 81;
    d.connection.unitId = parseInt($('#ko_unitId').val(), 10) || 1;
    d.connection.timeoutMs = parseInt($('#ko_timeout').val(), 10) || 2000;
  } else if (d.protocol === 'modbusRtu' || d.protocol === 'modbusAscii' || d.protocol === 'kostalRs485') {
    d.connection.path = ($('#mb_path').val() || '').trim();
    const br = parseInt($('#mb_baud').val(), 10);
    d.connection.baudRate = (!isNaN(br) ? br : (d.protocol === 'kostalRs485' ? 19200 : 9600));
    d.connection.parity = $('#mb_parity').val() || 'none';
    d.connection.dataBits = parseInt($('#mb_databits').val(), 10) || 8;
    d.connection.stopBits = parseInt($('#mb_stopbits').val(), 10) || 1;

    const uid = parseInt($('#mb_unitId_rtu').val(), 10);
    d.connection.unitId = (!isNaN(uid) ? uid : (d.protocol === 'kostalRs485' ? 255 : 1));

    const t = parseInt($('#mb_timeout_rtu').val(), 10);
    if (!isNaN(t)) d.connection.timeoutMs = t;

    const o = parseInt($('#mb_addrOffset_rtu').val(), 10);
    if (!isNaN(o)) d.connection.addressOffset = o;

    // These Modbus-specific fields are ignored by non-Modbus serial protocols.
    d.connection.wordOrder = $('#mb_wordOrder_rtu').val() || 'be';
    d.connection.byteOrder = $('#mb_byteOrder_rtu').val() || 'be';
    d.connection.writePassword = ($('#mb_writePass_rtu').val() || '').trim() || undefined;
  } else if (d.protocol === 'mbus') {
    d.connection.path = ($('#mbus_path').val() || '').trim();
    d.connection.baudRate = parseInt($('#mbus_baud').val(), 10) || 2400;
    d.connection.parity = $('#mbus_parity').val() || 'even';
    d.connection.dataBits = parseInt($('#mbus_databits').val(), 10) || 8;
    d.connection.stopBits = parseInt($('#mbus_stopbits').val(), 10) || 1;

    const a = parseInt($('#mbus_unitId').val(), 10);
    d.connection.unitId = isNaN(a) ? 1 : a;

    const t = parseInt($('#mbus_timeout').val(), 10);
    if (!isNaN(t)) d.connection.timeoutMs = t;

    d.connection.sendNke = $('#mbus_sendNke').is(':checked');
  } else if (d.protocol === 'mqtt') {
    const transport = normalizeMqttTransport($('#mqtt_transport').val(), 'mqtt');
    const port = parseInt($('#mqtt_port').val(), 10) || defaultMqttPort(transport);
    d.connection.url = buildMqttUrlFromForm($('#mqtt_url').val(), transport, port);

    const username = String($('#mqtt_user').val() ?? '');
    const password = String($('#mqtt_pass').val() ?? '');
    d.connection.username = username.length ? username : undefined;
    d.connection.password = password.length ? password : undefined;
    d.connection.clientId = ($('#mqtt_clientId').val() || '').trim() || undefined;
    d.connection.rejectUnauthorized = $('#mqtt_verifyTls').is(':checked');
    d.connection.servername = ($('#mqtt_servername').val() || '').trim() || undefined;
    d.connection.caFile = ($('#mqtt_caFile').val() || '').trim() || undefined;

    const connectTimeoutMs = parseInt($('#mqtt_connectTimeout').val(), 10);
    if (Number.isFinite(connectTimeoutMs) && connectTimeoutMs > 0) d.connection.connectTimeoutMs = connectTimeoutMs;
    const reconnectPeriodMs = parseInt($('#mqtt_reconnectPeriod').val(), 10);
    if (Number.isFinite(reconnectPeriodMs) && reconnectPeriodMs >= 0) d.connection.reconnectPeriodMs = reconnectPeriodMs;
    const keepaliveSeconds = parseInt($('#mqtt_keepalive').val(), 10);
    if (Number.isFinite(keepaliveSeconds) && keepaliveSeconds > 0) d.connection.keepaliveSeconds = keepaliveSeconds;
    d.connection.cleanSession = $('#mqtt_cleanSession').is(':checked');

    if (d.templateId === 'ess.tesvolt.iotGateway.mqttV2') {
      d.connection.tesvoltTopicMode = $('#mqtt_tesvoltTopicMode').val() || 'auto';
      d.connection.tesvoltControlEnabled = $('#mqtt_tesvoltControlEnabled').is(':checked');
      if (!['auto', 'ems', 'v2'].includes(d.connection.tesvoltTopicMode)) {
        throw new Error('TESVOLT: Ungültiges Topic-Format');
      }
      if (d.connection.tesvoltControlEnabled && d.connection.tesvoltTopicMode === 'auto') {
        throw new Error('TESVOLT: Für die Leistungssteuerung EMS/... oder EMS/V2/... fest auswählen');
      }
      const setpointInterval = parseInt($('#mqtt_tesvoltSetpointInterval').val(), 10);
      const commandTimeout = parseInt($('#mqtt_tesvoltCommandTimeout').val(), 10);
      const telemetryStale = parseInt($('#mqtt_tesvoltTelemetryStale').val(), 10);
      const trackingDelay = parseInt($('#mqtt_tesvoltTrackingDelay').val(), 10);
      d.connection.tesvoltSetpointIntervalMs = Number.isFinite(setpointInterval) ? setpointInterval : 5000;
      d.connection.tesvoltCommandSourceTimeoutMs = Number.isFinite(commandTimeout) ? commandTimeout : 20000;
      d.connection.tesvoltTelemetryStaleMs = Number.isFinite(telemetryStale) ? telemetryStale : 5000;
      d.connection.tesvoltTrackingDelayMs = Number.isFinite(trackingDelay) ? trackingDelay : 3000;
    }
  } else if (d.protocol === 'canbus') {
    d.connection.interface = ($('#can_iface').val() || '').trim() || 'can0';
    d.connection.candumpArgs = ($('#can_candumpArgs').val() || '').trim() || undefined;
    d.connection.candumpPath = ($('#can_candumpPath').val() || '').trim() || 'candump';
    d.connection.cansendPath = ($('#can_cansendPath').val() || '').trim() || 'cansend';
  } else if (d.protocol === 'onewire') {
    d.connection.basePath = ($('#ow_basePath').val() || '').trim() || '/sys/bus/w1/devices';
    d.connection.sensorId = ($('#ow_sensorId').val() || '').trim();
    d.connection.file = ($('#ow_file').val() || '').trim() || 'w1_slave';
    d.connection.parser = ($('#ow_parser').val() || 'ds18b20').trim() || 'ds18b20';
  } else if (d.protocol === 'http') {
    d.connection.baseUrl = ($('#http_baseUrl').val() || '').trim();
    d.connection.username = ($('#http_user').val() || '').trim() || undefined;
    d.connection.password = ($('#http_pass').val() || '').trim() || undefined;
    d.connection.meterId = ($('#http_meterId').val() || '').trim() || undefined;
    if ($('#http_insecureTls').is(':checked')) d.connection.insecureTls = true;
  } else if (d.protocol === 'taCmi') {
    d.connection.baseUrl = ($('#cmi_baseUrl').val() || '').trim();
    d.connection.username = ($('#cmi_user').val() || '').trim() || undefined;
    d.connection.password = ($('#cmi_pass').val() || '').trim() || undefined;
    d.connection.nodes = ($('#cmi_nodes').val() || '').trim() || '1-62';
    const groups = ($('#cmi_groups').val() || '').trim();
    if (groups) d.connection.groups = groups;
    d.connection.timeoutMs = parseInt($('#cmi_timeout').val(), 10) || 10000;
    d.connection.includeDesignations = $('#cmi_includeDesignations').is(':checked');
    if ($('#cmi_insecureTls').is(':checked')) d.connection.insecureTls = true;
    d.connection.bridgeEnabled = $('#cmi_bridgeEnabled').is(':checked');
    d.connection.bridgeHost = ($('#cmi_bridgeHost').val() || '').trim() || '0.0.0.0';
    d.connection.bridgePort = parseInt($('#cmi_bridgePort').val(), 10) || 1502;
    d.connection.bridgeUnitId = parseInt($('#cmi_bridgeUnitId').val(), 10) || 1;
    const mapRaw = ($('#cmi_bridgeMapJson').val() || '').trim();
    if (mapRaw) {
      let parsed;
      try { parsed = JSON.parse(mapRaw); } catch (e) { throw new Error('CMI Bridge-Kanaldefinitionen sind kein gültiges JSON'); }
      if (!Array.isArray(parsed)) throw new Error('CMI Bridge-Kanaldefinitionen müssen ein JSON-Array sein');
      d.connection.bridgeMap = parsed;
    }
    if (!d.pollIntervalMs || d.pollIntervalMs < 60000) d.pollIntervalMs = 60000;
  } else if (d.protocol === 'udp') {
    d.connection.host = ($('#udp_host').val() || '').trim();
    d.connection.port = parseInt($('#udp_port').val(), 10) || 7090;
    const t = parseInt($('#udp_timeout').val(), 10);
    if (!isNaN(t)) d.connection.timeoutMs = t;
    const p = parseInt($('#udp_pause').val(), 10);
    if (!isNaN(p)) d.connection.commandPauseMs = p;
  } else if (d.protocol === 'speedwire') {
    const filterHost = ($('#sw_filterHost').val() || '').trim();
    if (filterHost) {
      d.connection.filterHost = filterHost;
      // Backwards/compat: also expose under host, as many UIs use this field.
      d.connection.host = filterHost;
    }

    d.connection.multicastGroup = ($('#sw_multicastGroup').val() || '').trim() || '239.12.255.254';
    d.connection.port = parseInt($('#sw_port').val(), 10) || 9522;
    const iface = ($('#sw_interface').val() || '').trim();
    if (iface) d.connection.interfaceAddress = iface;

    const st = parseInt($('#sw_stale').val(), 10);
    if (!isNaN(st)) d.connection.staleTimeoutMs = st;
  }

  // minimal validation
  if (!d.id) throw new Error('Geräte-ID fehlt');
  if (!/^[a-zA-Z0-9_\-]+$/.test(d.id)) throw new Error('Ungültige Geräte-ID. Erlaubt: Buchstaben, Zahlen, _ und -');
  if (!d.templateId) throw new Error('Template fehlt');
  if (!d.protocol) throw new Error('Protokoll fehlt');

  if (d.protocol === 'modbusTcp' && !d.connection.host) throw new Error('Modbus TCP Host/IP fehlt');
  if ((d.protocol === 'modbusRtu' || d.protocol === 'modbusAscii') && !d.connection.path) throw new Error('Modbus Serial-Port fehlt');
  if (d.protocol === 'kostalRs485' && !d.connection.path) throw new Error('RS485 Serial-Port fehlt');
  if (d.protocol === 'mbus' && !d.connection.path) throw new Error('M-Bus Serial-Port fehlt');
  if (d.protocol === 'mqtt' && !d.connection.url) throw new Error('MQTT Broker-URL fehlt');
  if (d.protocol === 'mqtt' && !/^mqtts?:\/\//i.test(d.connection.url) && !/^wss?:\/\//i.test(d.connection.url)) {
    throw new Error('MQTT Broker-URL muss mqtt://, mqtts://, ws:// oder wss:// verwenden');
  }
  if (d.protocol === 'mqtt' && d.connection.clientId && d.connection.clientId.length > 128) {
    throw new Error('MQTT Client-ID ist zu lang (maximal 128 Zeichen)');
  }
  if (d.templateId === 'ess.tesvolt.iotGateway.mqttV2' && !d.connection.clientId) {
    throw new Error('Für das TESVOLT IoT Gateway ist eine feste MQTT Client-ID erforderlich');
  }
  if (d.templateId === 'ess.tesvolt.iotGateway.mqttV2' && d.connection.tesvoltSetpointIntervalMs >= d.connection.tesvoltCommandSourceTimeoutMs) {
    throw new Error('TESVOLT: Die Sollwert-Wiederholung muss kürzer als das EOS-Sollwert-Timeout sein');
  }
  if (d.protocol === 'canbus' && !d.connection.interface) throw new Error('CAN Interface fehlt (z.B. can0)');
  if (d.protocol === 'onewire' && !d.connection.sensorId) throw new Error('1-Wire Sensor-ID fehlt');
  if (d.protocol === 'http' && !d.connection.baseUrl) throw new Error('HTTP Base-URL fehlt');
  if (d.protocol === 'taCmi' && !d.connection.baseUrl) throw new Error('TA CMI Base-URL fehlt');
  if (d.protocol === 'taCmi' && !d.connection.username) throw new Error('TA CMI Experten-Benutzer fehlt');

  if (d.protocol === 'udp' && !d.connection.host) throw new Error('UDP Host/IP fehlt');

  // Speedwire has sensible defaults; filterHost is optional.

  return d;
}

function updateJsonPreview() {
  const jsonStr = JSON.stringify(devices || [], null, 2);
  $('#devicesJson').val(jsonStr);
  $('#jsonPreview').text(jsonStr);
}

function initEventHandlers() {
  // Serial port refresh (hotplug)
  $(document).on('click', '.btnRefreshSerialPorts', () => refreshSerialPorts(true));

  // MQTT transport helpers. The full connection URL remains the persisted
  // value for backward compatibility, while transport and port are explicit
  // controls in the dialog so TESVOLT port 1884/TLS cannot be confused with
  // the generic MQTT 1883 default.
  $('#mqtt_transport').on('change', () => syncMqttUrlFromControls());
  $('#mqtt_port').on('change', () => syncMqttUrlFromControls());
  $('#mqtt_url').on('change blur', () => syncMqttControlsFromUrl());

  $('#dev_id').on('input', () => {
    if ($('#dev_protocol').val() !== 'mqtt') return;
    const tpl = currentMqttTemplate();
    const defaults = getTemplateMqttDefaults(tpl);
    const current = ($('#mqtt_clientId').val() || '').trim();
    if (current && current !== lastSuggestedMqttClientId) return;
    const suggested = mqttClientIdFromTemplate(defaults.clientId, ($('#dev_id').val() || '').trim());
    $('#mqtt_clientId').val(suggested);
    lastSuggestedMqttClientId = suggested;
    updateTextFields();
  });

  // Remember previous selection (for cancel on manual entry)
  $(document).on('focus', '#mb_path, #mbus_path', function () {
    try { this.dataset.prev = this.value; } catch (e) { /* ignore */ }
  });

  // Manual entry option for serial ports
  $(document).on('change', '#mb_path, #mbus_path', function () {
    if (this.value !== '__manual__') return;
    const prev = (this.dataset && this.dataset.prev) ? this.dataset.prev : '';
    const hint = (this.id === 'mbus_path')
      ? 'Serial Port Pfad für M-Bus (z.B. /dev/ttyUSB0 oder /dev/serial/by-id/...)'
      : 'Serial Port Pfad für Modbus/RS485 (z.B. /dev/ttyUSB0 oder /dev/com2 oder /dev/serial/by-id/...)';

    const entered = (window.prompt(hint, prev && prev !== '__manual__' ? prev : '') || '').trim();
    if (!entered) {
      // Cancel -> restore previous
      this.value = prev && prev !== '__manual__' ? prev : (this.options[0] ? this.options[0].value : '');
      return;
    }

    // Add as option if not present
    const exists = [...this.options].some(o => o.value === entered);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = entered;
      opt.textContent = entered;
      // Insert before manual option
      const manualOpt = [...this.options].find(o => o.value === '__manual__');
      if (manualOpt) this.insertBefore(opt, manualOpt);
      else this.appendChild(opt);
    }
    this.value = entered;
  });

  // JSON preview toggle
  $('#btnShowJson').on('click', () => {
    const shown = $('#jsonPreview').is(':visible');
    if (shown) {
      $('#jsonPreview').hide();
    } else {
      updateJsonPreview();
      $('#jsonPreview').show();
    }
  });

  // Add
  $('#btnAddDevice').on('click', () => {
    openDeviceModal({ enabled: true }, -1);
  });

  // JSON import/export (devices)
  $('#btnExportDevices').on('click', () => exportDevicesJsonToFile());
  $('#btnImportDevices').on('click', () => {
    try { $('#importJsonFile').val(''); } catch (e) { /* ignore */ }
    $('#importJsonFile').trigger('click');
  });
  $('#importJsonFile').on('change', (ev) => {
    const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
    importDevicesJsonFromFile(file);
  });

  // Table actions
  $('#devicesTable').on('click', 'a[data-action]', (ev) => {
    const action = $(ev.currentTarget).data('action');
    const idx = parseInt($(ev.currentTarget).data('idx'), 10);

    if (action === 'edit') {
      openDeviceModal(devices[idx], idx);
    } else if (action === 'delete') {
      const d = devices[idx];
      if (confirm(`Gerät löschen: ${d.id}?`)) {
        devices.splice(idx, 1);
        renderDevicesTable();
        updateJsonPreview();
        setChanged(true);
      }
    }
  });

  // Cancel
  $('#btnCancelDevice').on('click', () => closeModal());

  // Backdrop click (fallback)
  $('#nexoBackdrop').on('click', () => closeModal());

  // Modal dependent selects
  $('#dev_category').on('change', () => {
    const cat = $('#dev_category').val();
    fillManufacturerSelect(cat);

    const manu = $('#dev_manufacturer').val();
    fillTemplateSelect(cat, manu);

    const tplId = $('#dev_template').val();
    fillProtocolSelect(tplId);

    const proto = $('#dev_protocol').val();
    const tpl = templatesById[tplId] || null;
    showConnBlock(proto);
    renderDatapoints(tplId);
    const currentConn = (editIndex >= 0) ? getCurrentConnectionFormValues(proto) : {};
    applyTemplateModbusTcpDefaultsToForm(tpl, proto, currentConn);
    applyTemplateModbusSerialDefaultsToForm(tpl, proto, currentConn);
    applyTemplateMqttDefaultsToForm(tpl, proto, currentConn);
    if (proto === 'modbusRtu' || proto === 'modbusAscii' || proto === 'kostalRs485' || proto === 'mbus') {
      refreshSerialPorts(true);
      startSerialPortsAutoRefresh();
    } else {
      stopSerialPortsAutoRefresh();
    }

    // Keep ID/Name suggestions in sync for new devices
    if (editIndex < 0) {
      const curId = ($('#dev_id').val() || '').trim();
      if (!curId || curId === lastSuggestedId) {
        lastSuggestedId = suggestDeviceId(cat);
        $('#dev_id').val(lastSuggestedId);
      }
      const curName = ($('#dev_name').val() || '').trim();
      if (!curName || curName === lastSuggestedName) {
        lastSuggestedName = suggestDeviceName(tplId);
        if (lastSuggestedName) $('#dev_name').val(lastSuggestedName);
      }
    }

    updateTextFields();
  });

  $('#dev_manufacturer').on('change', () => {
    const cat = $('#dev_category').val();
    const manu = $('#dev_manufacturer').val();
    fillTemplateSelect(cat, manu);

    const tplId = $('#dev_template').val();
    fillProtocolSelect(tplId);

    const proto = $('#dev_protocol').val();
    const tpl = templatesById[tplId] || null;
    showConnBlock(proto);
    renderDatapoints(tplId);
    const currentConn = (editIndex >= 0) ? getCurrentConnectionFormValues(proto) : {};
    applyTemplateModbusTcpDefaultsToForm(tpl, proto, currentConn);
    applyTemplateModbusSerialDefaultsToForm(tpl, proto, currentConn);
    applyTemplateMqttDefaultsToForm(tpl, proto, currentConn);
    if (proto === 'modbusRtu' || proto === 'modbusAscii' || proto === 'kostalRs485' || proto === 'mbus') {
      refreshSerialPorts(true);
      startSerialPortsAutoRefresh();
    } else {
      stopSerialPortsAutoRefresh();
    }

    if (editIndex < 0) {
      const curName = ($('#dev_name').val() || '').trim();
      if (!curName || curName === lastSuggestedName) {
        lastSuggestedName = suggestDeviceName(tplId);
        if (lastSuggestedName) $('#dev_name').val(lastSuggestedName);
      }
    }

    updateTextFields();
  });

  $('#dev_template').on('change', () => {
    const tplId = $('#dev_template').val();
    fillProtocolSelect(tplId);

    const proto = $('#dev_protocol').val();
    const tpl = templatesById[tplId] || null;
    showConnBlock(proto);
    renderDatapoints(tplId);
    const currentConn = (editIndex >= 0) ? getCurrentConnectionFormValues(proto) : {};
    applyTemplateModbusTcpDefaultsToForm(tpl, proto, currentConn);
    applyTemplateModbusSerialDefaultsToForm(tpl, proto, currentConn);
    applyTemplateMqttDefaultsToForm(tpl, proto, currentConn);

    if (editIndex < 0) {
      const curName = ($('#dev_name').val() || '').trim();
      if (!curName || curName === lastSuggestedName) {
        lastSuggestedName = suggestDeviceName(tplId);
        if (lastSuggestedName) $('#dev_name').val(lastSuggestedName);
      }
    }

    updateTextFields();
  });

  $('#dev_protocol').on('change', () => {
    const proto = $('#dev_protocol').val();
    showConnBlock(proto);
    const tpl = templatesById[$('#dev_template').val()] || null;
    const currentConn = (editIndex >= 0) ? getCurrentConnectionFormValues(proto) : {};
    applyTemplateModbusTcpDefaultsToForm(tpl, proto, currentConn);
    applyTemplateModbusSerialDefaultsToForm(tpl, proto, currentConn);
    applyTemplateMqttDefaultsToForm(tpl, proto, currentConn);

    if (proto === 'modbusRtu' || proto === 'modbusAscii' || proto === 'kostalRs485' || proto === 'mbus') {
      refreshSerialPorts(true);
      startSerialPortsAutoRefresh();
    } else {
      stopSerialPortsAutoRefresh();
    }
  });

  // Save device
  $('#btnSaveDevice').on('click', () => {
    try {
      const d = collectDeviceFromModal();

      // uniqueness check
      const existsIdx = devices.findIndex((x, i) => x.id === d.id && i !== editIndex);
      if (existsIdx >= 0) {
        throw new Error('Geräte-ID existiert bereits');
      }

      const serialConflict = detectSerialPortConflict(d, editIndex);
      if (serialConflict) {
        const o = serialConflict.otherConn || {};
        throw new Error(
          `Serieller Port bereits belegt: ${serialConflict.path} wird schon von ${serialConflict.otherId} ` +
          `(${serialConflict.otherProtocol} @${o.baudRate} ${o.parity} ${o.dataBits}${o.stopBits}) genutzt. ` +
          `Ein gemeinsamer Port ist nur mit identischem Protokoll und identischen seriellen Parametern möglich.`
        );
      }

      if (editIndex >= 0) {
        devices[editIndex] = d;
      } else {
        devices.push(d);
      }

      devices.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

      renderDevicesTable();
      updateJsonPreview();
      setChanged(true);

      closeModal();
    } catch (e) {
      toast('Fehler: ' + (e.message || e.toString()));
    }
  });
}

function initUIOnce() {
  if (uiInitialized) return;
  uiInitialized = true;

  // Init modals/selects if available, but never block UI if not.
  if (hasMaterialize()) {
    try {
      const elems = document.querySelectorAll('.modal');
      M.Modal.init(elems, { dismissible: false });
      try {
        const tabs = document.querySelectorAll('.tabs');
        if (tabs && tabs.length) M.Tabs.init(tabs, {});
      } catch (e2) {
        console.warn('Materialize tabs init failed:', e2);
      }
    } catch (e) {
      console.warn('Materialize modal init failed:', e);
      $('#modalDevice').addClass('nexo-fallback');
    }
  } else {
    $('#modalDevice').addClass('nexo-fallback');
  }

  // We intentionally do NOT initialize Materialize "formSelect" for browser-default selects.
  // This avoids invisible/empty selects in some Admin setups.
  if (hasFormSelect()) {
    try { $('select').not('.browser-default').formSelect(); } catch (e) { /* ignore */ }
  }

  initEventHandlers();
}

function applySettingsToUI(settings) {
  $('#pollIntervalMs').val(settings.pollIntervalMs ?? 5000);
  $('#modbusTimeoutMs').val(settings.modbusTimeoutMs ?? 2000);
  $('#registerAddressOffset').val(settings.registerAddressOffset ?? 0);

  const parsed = Array.isArray(settings.devices) ? settings.devices : safeJsonParse(settings.devicesJson || '[]', []);
  devices = Array.isArray(parsed) ? parsed : [];

  updateJsonPreview();
  renderDevicesTable();
  updateTextFields();
}

/* ioBroker admin hooks */
function load(settings, onChange) {
  onChangeGlobal = onChange;
  if (!settings) settings = {};

  loadTemplates()
    .then(() => {
      initUIOnce();
      fillCategorySelect();
      applySettingsToUI(settings);
      translateAll();
      onChange(false);
    })
    .catch((e) => {
      console.error(e);
      initUIOnce();
      applySettingsToUI(settings);
      toast('Warnung: Templates konnten nicht geladen werden. Bitte Browser-Cache leeren und erneut öffnen.');
      onChange(false);
    });
}

function save(callback) {
  const obj = {};
  obj.pollIntervalMs = parseInt($('#pollIntervalMs').val(), 10) || 5000;
  obj.modbusTimeoutMs = parseInt($('#modbusTimeoutMs').val(), 10) || 2000;
  obj.registerAddressOffset = parseInt($('#registerAddressOffset').val(), 10) || 0;
  obj.devices = devices || [];
  obj.devicesJson = JSON.stringify(devices || [], null, 2);

  callback(obj);
}
