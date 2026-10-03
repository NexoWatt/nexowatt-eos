'use strict';
(() => {
    const $ = id => document.getElementById(id);
    let csrf = null, templates = [], sequence = 0, deviceUuid = '';
    const deviceRows = new Map();
    const message = text => { $('message').textContent = text; };
    const show = state => {
        $('claim').hidden = state !== 'claim'; $('setup-form').hidden = state !== 'setup'; $('finished').hidden = state !== 'finished';
    };
    async function request(url, data) {
        const response = await fetch(url, { method: data ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
            headers: data ? { 'content-type': 'application/json', 'x-eos-setup': '1', ...(csrf ? { 'x-eos-csrf': csrf } : {}) } : {},
            ...(data ? { body: JSON.stringify(data) } : {}) });
        const result = await response.json();
        if (!response.ok) throw Object.assign(new Error('request'), { status: response.status, code: result.code });
        return result;
    }
    function failure(error) {
        const messages = {
            SETUP_CODE_REJECTED: 'Der Code ist ungültig, abgelaufen oder bereits verwendet. Ein neuer Code muss am lokalen Gerätezugang ausgestellt werden.',
            SETUP_SESSION: 'Diese Einrichtungssitzung ist abgelaufen. Der lokale Gerätezugang ist für einen neuen Versuch erforderlich.',
            SETUP_INPUT_REJECTED: 'Die Angaben sind unvollständig oder ungültig. Prüfen Sie Lizenz, Anschlusswerte, Messpunkte, Gerätevorgaben und übereinstimmende Passwörter.',
            SETUP_RATE_LIMIT: 'Zu viele Anfragen. Bitte warten Sie eine Minute.',
        };
        message(messages[error.code] || 'Die Einrichtung ist derzeit gesperrt oder das Gerät nicht erreichbar. Prüfen Sie den lokalen Gerätestatus.');
    }
    function toggle(id, enabled) { $(id).hidden = !enabled; $(id).disabled = !enabled; }
    function updateFields() {
        toggle('license-fields', $('license-mode').value === 'activate');
        toggle('plant-fields', $('plant-mode').value === 'configured');
        toggle('deferred-fields', $('plant-mode').value === 'deferred');
        toggle('signed-fields', $('measurement-mode').value === 'signed');
        toggle('split-fields', $('measurement-mode').value === 'split');
        toggle('device-fields', $('device-status').value === 'configured');
        const phases = Number($('phase-count').value);
        for (const i of [2, 3]) { $('phase' + i + '-label').hidden = phases < i; $('phase' + i).disabled = phases < i; }
        const para = $('para-mode').value;
        toggle('para-fields', ['ems', 'direct'].includes(para));
        $('para-setpoint-label').hidden = para !== 'ems'; $('para-setpoint').disabled = para !== 'ems';
    }
    for (const id of ['license-mode', 'plant-mode', 'measurement-mode', 'device-status', 'phase-count', 'para-mode']) $(id).addEventListener('change', updateFields);
    $('setup-form').addEventListener('input', event => {
        $('review-status').textContent = 'Angaben geändert. Vor dem Speichern werden sie erneut geprüft.';
        if (['licenseToken', 'licenseMode'].includes(event.target?.name)) $('license-status').textContent = 'Lizenzangabe geändert. Bitte erneut prüfen.';
    });
    async function loadCatalog() {
        deviceUuid = ''; $('license-uuid').value = ''; $('copy-uuid').disabled = true;
        const result = await request('/api/catalog'); templates = result.templates || [];
        if (typeof result.uuid === 'string' && /^(?:[a-z]{2})?[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(result.uuid)) deviceUuid = result.uuid;
        $('license-uuid').value = deviceUuid; $('license-uuid').placeholder = 'nicht verfügbar';
        $('copy-uuid').disabled = !deviceUuid;
        $('uuid-copy-status').textContent = deviceUuid ? 'Die Geräte-UUID ist für die Lizenzerstellung verfügbar.' :
            'Keine gültige Geräte-UUID verfügbar. Prüfen Sie den lokalen Gerätestatus.';
    }
    $('license-uuid').addEventListener('focus', () => { if (deviceUuid) $('license-uuid').select(); });
    $('copy-uuid').addEventListener('click', async () => {
        if (!deviceUuid) return;
        const button = $('copy-uuid'); button.disabled = true;
        try {
            if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') throw new Error('clipboard-unavailable');
            await navigator.clipboard.writeText(deviceUuid);
            $('uuid-copy-status').textContent = 'Geräte-UUID in die Zwischenablage kopiert.';
        } catch {
            const input = $('license-uuid'); input.value = deviceUuid; input.focus(); input.select();
            $('uuid-copy-status').textContent = 'Automatisches Kopieren ist nicht möglich. Die vollständige UUID ist markiert. Kopieren Sie sie manuell über das Kontextmenü oder Strg+C / ⌘C.';
        } finally { button.disabled = !deviceUuid; }
    });
    function roleOf(id) {
        const family = id.split('.')[0];
        return family === 'meter' ? 'meter' : ['ess', 'battery', 'battery_inverter'].includes(family) ? 'storage' :
            ['evcs', 'evse'].includes(family) ? 'charger' : 'other';
    }
    function field(parent, label, type, options) {
        const wrap = document.createElement('label'); wrap.textContent = label;
        const input = document.createElement(options ? 'select' : 'input');
        if (options) for (const [value, caption] of options) { const option = document.createElement('option'); option.value = value; option.textContent = caption; input.append(option); }
        else { input.type = type || 'text'; input.maxLength = 253; if (type === 'number') input.step = 'any'; }
        input.required = true; input.autocomplete = 'off'; wrap.append(input); parent.append(wrap); return input;
    }
    function addDevice() {
        if (deviceRows.size >= 16) { message('Höchstens 16 unabhängige Gerätepositionen können hier erfasst werden.'); return; }
        const key = ++sequence, card = document.createElement('fieldset'), title = document.createElement('legend');
        title.textContent = 'Gerät ' + key; card.append(title);
        const id = field(card, 'Eindeutige Kennung · 3–32 Kleinbuchstaben/Ziffern/_/-', 'text');
        const name = field(card, 'Gerätename', 'text');
        const protocol = field(card, 'Anschlussart', null, [['modbusTcp', 'Modbus TCP'], ['modbusRtu', 'Modbus RTU'], ['modbusAscii', 'Modbus ASCII'], ['eebus', 'EEBUS'], ['ocpp21', 'OCPP']]);
        protocol.value = 'modbusTcp';
        const content = document.createElement('div'); card.append(content);
        let inputs, template, role;
        function render() {
            content.replaceChildren(); inputs = {};
            const p = protocol.value;
            if (p.startsWith('modbus')) {
                const choices = templates.filter(t => t.protocols.includes(p)).map(t => [t.id, t.name]);
                template = field(content, 'Hersteller-/Modellvorlage · genaue Übereinstimmung prüfen', null, [['', 'Bitte auswählen'], ...choices]);
                role = null;
                if (p === 'modbusTcp') { inputs.host = field(content, 'Geräteadresse · IP oder Hostname'); inputs.port = field(content, 'TCP-Port · 1–65535', 'number'); }
                else {
                    inputs.path = field(content, 'Serieller Gerätepfad · /dev/tty… oder /dev/serial/by-id/…');
                    inputs.baudRate = field(content, 'Baudrate aus Geräteunterlagen', null, [['', 'Bitte auswählen'], ['9600', '9600'], ['38400', '38400']]);
                    inputs.parity = field(content, 'Parität', null, [['none', 'Keine'], ['even', 'Gerade'], ['odd', 'Ungerade']]);
                    inputs.dataBits = field(content, 'Datenbits · 5–8', 'number'); inputs.stopBits = field(content, 'Stoppbits · 1 oder 2', 'number');
                }
                inputs.unitId = field(content, 'Unit-ID · 1–255 (DEYE höchstens 247)', 'number');
                inputs.pollIntervalMs = field(content, 'Abfrageintervall · 250–600000 ms; VARTA mindestens 1000 ms / Link 5000 ms', 'number');
                inputs.timeoutMs = field(content, 'Antwortzeitgrenze · 100–60000 ms', 'number');
                inputs.addressOffset = field(content, 'Registeroffset · −100000…100000; DEYE/VARTA 0', 'number');
                inputs.wordOrder = field(content, 'Wortreihenfolge', null, [['be', 'Big endian'], ['le', 'Little endian']]);
                inputs.byteOrder = field(content, 'Bytereihenfolge', null, [['be', 'Big endian'], ['le', 'Little endian']]);
            } else if (p === 'eebus') {
                template = null; role = field(content, 'Unabhängige Geräteeinheit', null, [['meter', 'Zähler'], ['storage', 'Speicher'], ['charger', 'Ladepunkt'], ['other', 'Sonstiges']]);
                inputs.ski = field(content, 'Vom Gerät geprüfte EEBUS-SKI · 40 Hex-Zeichen');
                inputs.host = field(content, 'EEBUS-Geräteadresse'); inputs.port = field(content, 'EEBUS-Port · 1–65535', 'number');
            } else {
                template = null; role = null;
                inputs.chargePointId = field(content, 'OCPP-Ladepunktkennung');
                inputs.connectorId = field(content, 'Smart-Charging-Anschluss · 0–64', 'number');
                inputs.minimumChargingCurrentA = field(content, 'Mindestladestrom aus Geräteunterlagen · 1–32 A', 'number');
            }
        }
        protocol.addEventListener('change', render); render();
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Gerät entfernen';
        remove.addEventListener('click', () => { card.remove(); deviceRows.delete(key); }); card.append(remove); $('devices').append(card);
        deviceRows.set(key, () => {
            const connection = {}, numeric = ['port', 'baudRate', 'dataBits', 'stopBits', 'unitId', 'pollIntervalMs', 'timeoutMs', 'addressOffset', 'connectorId', 'minimumChargingCurrentA'];
            for (const [name, input] of Object.entries(inputs)) connection[name] = numeric.includes(name) ? (input.value === '' ? null : Number(input.value)) : input.value.trim();
            return { id: id.value.trim(), name: name.value.trim(), protocol: protocol.value, templateId: template ? template.value : '',
                role: template ? roleOf(template.value) : role ? role.value : 'charger', connection };
        });
    }
    $('add-device').addEventListener('click', addDevice);
    function collect(form) {
        const data = new FormData(form), get = name => String(data.get(name) || '').trim(), num = name => get(name) === '' ? null : Number(get(name));
        const mode = get('licenseMode'), license = { mode, token: mode === 'activate' ? get('licenseToken') : '' };
        let plant;
        if (get('plantMode') === 'deferred') plant = { mode: 'deferred', reason: get('deferredReason') };
        else {
            const measurement = get('measurementMode'), para = get('paraMode');
            plant = { mode: get('plantMode'), gridConnectionPowerW: num('gridConnectionPowerW'), gridPhaseCount: num('gridPhaseCount'),
                nominalVoltageV: num('nominalVoltageV'), maxPhaseCurrentA: num('maxPhaseCurrentA'), safetyMarginW: num('safetyMarginW'),
                safetyMeterTimeoutSec: num('safetyMeterTimeoutSec'), safetyEnvelopeMaxAgeSec: num('safetyEnvelopeMaxAgeSec'),
                measurements: { mode: measurement, gridPointPower: measurement === 'signed' ? get('gridPointPower') : '',
                    gridBuyPower: measurement === 'split' ? get('gridBuyPower') : '', gridSellPower: measurement === 'split' ? get('gridSellPower') : '',
                    phaseCurrents: [get('phase1'), get('phase2'), get('phase3')].slice(0, num('gridPhaseCount')) },
                para14a: { enabled: para !== 'disabled', mode: para, signalStateId: para !== 'disabled' ? get('paraSignal') : '',
                    emsSetpointStateId: para === 'ems' ? get('paraSetpoint') : '' }, valuesConfirmed: get('valuesConfirmed') === 'on' };
        }
        return { license, settings: { siteName: get('siteName'), language: get('language'), timeZone: get('timeZone'),
            licenseMode: mode === 'activate' ? 'verified' : 'unlicensed', deviceMode: 'disabled-pending-acceptance',
            safetyAcknowledged: get('safetyAcknowledged') === 'on', plant, devicePlan: { status: get('deviceStatus'),
                devices: get('deviceStatus') === 'configured' ? [...deviceRows.values()].map(read => read()) : [], confirmed: get('devicesConfirmed') === 'on' } } };
    }
    function summary(result) {
        return 'Anschlussdaten: ' + (result.plantConfigurationComplete ? 'erfasst' : 'OFFEN') +
            '. Geräteangaben: ' + (result.devicesConfigurationComplete ? 'erfasst (' + result.deviceCount + ')' : 'OFFEN') +
            '. Lizenzierung: ' + (result.licenseConfigured ? 'Signatur geprüft' : 'OFFEN') +
            '. Messwert-, Anschluss- und Hardwareabnahme: OFFEN. Anlagensteuerung bleibt gesperrt.';
    }
    $('verify-license').addEventListener('click', async () => {
        try { const result = await request('/api/license/verify', { token: $('license-token').value.trim() });
            $('license-status').textContent = 'Gültige ' + result.edition.toUpperCase() + '-Lizenz · bis ' + new Date(result.expiresAt).toLocaleDateString('de-DE') +
                ' · Ladepunkte: ' + result.limits.chargePoints + ' · Speicher: ' + result.limits.batteries + '. Freigegebene Adapter: ' + result.adapters.join(', '); }
        catch (error) { $('license-status').textContent = 'Lizenzprüfung fehlgeschlagen. Keine Lizenz übernommen.'; failure(error); }
    });
    $('check-configuration').addEventListener('click', async () => {
        try { const result = await request('/api/configuration/check', collect($('setup-form'))); $('review-status').textContent = summary(result); }
        catch (error) { $('review-status').textContent = 'Konfiguration nicht bestätigt. Bitte Angaben korrigieren.'; failure(error); }
    });
    function loginLink(text) {
        const login = new URL(location.origin); login.port = '8081'; login.pathname = '/';
        $('login').href = login.href; $('login').textContent = text; $('login').hidden = false;
    }
    function completed() {
        show('finished'); $('finished').querySelector('h2').textContent = 'Geschützter Zugang eingerichtet';
        $('finished').querySelector('p').textContent = 'Melden Sie sich mit Ihrem neuen Servicepasswort an. Den gespeicherten Konfigurations- und Lizenzstatus prüfen Sie dort. Die Anlagenabnahme bleibt offen; Gerätebefehle bleiben gesperrt.';
        loginLink('Zur NexoWatt-Anmeldung');
    }
    let polls = 0;
    async function poll() {
        if (++polls > 90) { $('finish-status').textContent = 'Der Abschluss dauert länger. Prüfen Sie den lokalen Gerätestatus; ein Verbindungsabbruch bestätigt keinen erfolgreichen Start.'; return; }
        try { await request('/api/session'); }
        catch (error) { if (error.code === 'SETUP_CLOSED') { completed(); return; } }
        setTimeout(poll, 2000);
    }
    $('claim-form').addEventListener('submit', async event => {
        event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
        try { const result = await request('/api/claim', { code: $('code').value }); csrf = result.csrf; $('code').value = '';
            await loadCatalog(); show('setup'); message('Gerät übernommen. Diese Sitzung läuft nach 15 Minuten ab.'); }
        catch (error) { failure(error); } finally { button.disabled = false; }
    });
    $('setup-form').addEventListener('submit', async event => {
        event.preventDefault(); const form = event.target, button = $('finish-button'); button.disabled = true;
        try {
            const data = new FormData(form);
            const result = await request('/api/finish', { ...collect(form), password: data.get('password'), passwordRepeat: data.get('passwordRepeat') });
            form.elements.password.value = ''; form.elements.passwordRepeat.value = ''; $('license-token').value = ''; csrf = null;
            show('finished'); message('Übergabe gespeichert. Ein Verbindungsabbruch bestätigt keinen erfolgreichen Start.');
            $('finish-status').textContent = summary(result); loginLink('Anmeldeseite zur Statusprüfung öffnen'); poll();
        } catch (error) { failure(error); } finally { button.disabled = false; }
    });
    updateFields();
    request('/api/session').then(async result => {
        if (result.authenticated) { csrf = result.csrf; await loadCatalog(); show('setup'); }
        else if (result.state === 'committing') { show('finished'); loginLink('Anmeldeseite zur Statusprüfung öffnen'); poll(); }
        else if (result.state !== 'awaiting-code') { show('claim'); message('Die begonnene Einrichtung benötigt einen neuen Code vom lokalen Gerätezugang.'); }
    }).catch(error => { if (error.code === 'SETUP_CLOSED') completed(); else failure(error); });
})();
