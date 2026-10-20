(() => {
    'use strict';
    const VERSION = '20261020-network-v1';
    if (window.NEXOWATT_EOS_NETWORK?.version === VERSION) return;
    window.NEXOWATT_EOS_NETWORK?.destroy?.();
    const script = document.currentScript || document.querySelector('script[src*="eos-network.js"]');
    const api = new URL('../nexowatt/network/', script?.src || document.baseURI);
    const lifecycle = new AbortController();
    const role = () => window.NEXOWATT_EOS_POLICY_CLIENT?.getPolicy?.()?.role || window.NEXOWATT_EOS_ACCESS_ROLE || 'unknown';
    const allowed = () => ['admin', 'installer'].includes(role());
    let overlay = null;
    let status = null;
    let busy = false;
    let poll = null;
    let preview = null;
    let openedBy = null;
    let generation = 0;
    let activeRequest = null;
    const nodes = {};
    const LISTENERS = [
        ['tcp', 8883, 'MQTT mit TLS · TCP 8883'],
        ['tcp', 1883, 'MQTT ohne TLS · TCP 1883 (nur Gerätenetz)'],
        ['tcp', 4712, 'EEBUS SHIP · TCP 4712'],
        ['tcp', 9220, 'OCPP · TCP 9220'],
        ['udp', 5353, 'Geräteerkennung (mDNS) · UDP 5353'],
    ];

    const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };
    const button = (label, action, secondary = false) => {
        const node = element('button', secondary ? 'eos-network-secondary' : 'eos-network-primary', label);
        node.type = 'button';
        node.addEventListener('click', action);
        return node;
    };
    const time = value => {
        const date = new Date(typeof value === 'number' && value < 100000000000 ? value * 1000 : value);
        return Number.isFinite(date.valueOf()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '–';
    };
    const errorText = error => {
        const code = String(error?.message || error || 'NETWORK_UNAVAILABLE');
        const messages = {
            NETWORK_UNAVAILABLE: 'Der EOS-Netzwerkdienst ist noch nicht verfügbar. Bitte den geprüften Netzwerk-Teststand installieren.',
            NETWORK_TIMEOUT: 'Der Netzwerkdienst antwortet nicht rechtzeitig. Bitte den Status aktualisieren, bevor Sie erneut speichern.',
            NETWORK_PERMISSION: 'Für diese Funktion ist eine aktuelle Anmeldung als Installateur oder Service erforderlich.',
            NETWORK_AUTH_UNAVAILABLE: 'Die Anmeldung konnte nicht geprüft werden. Bitte erneut anmelden.',
            NETWORK_ORIGIN: 'Die Anfrage wurde abgewiesen. Bitte diese Seite direkt über HTTPS neu öffnen.',
            NETWORK_BUSY: 'Eine Netzwerkänderung läuft bereits. Bitte warten und den Status aktualisieren.',
            NETWORK_RATE_LIMIT: 'Zu viele Anfragen. Bitte kurz warten.',
            NETWORK_RESPONSE: 'Der Netzwerkdienst hat keine gültige Antwort geliefert.',
            NETWORK_REQUEST: 'Bitte Netzwerkadresse, DHCP-Bereich und Auswahl kontrollieren.',
        };
        return messages[code] || (/^NETWORK_[A-Z0-9_]{1,72}$/.test(code)
            ? `Die Änderung wurde sicher abgewiesen (${code}). Bitte Konfiguration und Dienststatus prüfen.`
            : 'Die Anfrage konnte nicht abgeschlossen werden. Bitte den Status aktualisieren.');
    };
    const message = (text, kind = '') => {
        if (!nodes.message) return;
        nodes.message.textContent = text;
        nodes.message.dataset.kind = kind;
    };

    const request = async (operation, payload) => {
        const controller = new AbortController();
        activeRequest = controller;
        const timer = setTimeout(() => controller.abort(), 6500);
        try {
            const response = await fetch(new URL(operation, api), {
                method: payload === undefined ? 'GET' : 'POST',
                credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
                headers: payload === undefined ? { Accept: 'application/json' } : {
                    Accept: 'application/json', 'Content-Type': 'application/json', 'X-NexoWatt-EOS-Network': '1',
                },
                ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
            });
            const text = await response.text();
            if (text.length > 65536) throw new Error('NETWORK_RESPONSE');
            let result;
            try { result = JSON.parse(text); } catch { throw new Error('NETWORK_RESPONSE'); }
            if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'NETWORK_UNAVAILABLE');
            return result;
        } catch (error) {
            if (controller.signal.aborted) throw new Error('NETWORK_TIMEOUT');
            throw error;
        } finally {
            clearTimeout(timer);
            if (activeRequest === controller) activeRequest = null;
        }
    };

    const field = (name, title, value, attributes = {}) => {
        const label = element('label', 'eos-network-field');
        label.append(element('span', '', title));
        const input = element('input');
        input.name = name; input.value = value;
        input.type = 'text';
        for (const [key, entry] of Object.entries(attributes)) input.setAttribute(key, String(entry));
        label.append(input);
        return label;
    };
    const invalidatePreview = () => { preview = null; if (nodes.preview) nodes.preview.textContent = ''; updateButtons(); };
    const collect = () => {
        // Disabled fields are still the reviewed configuration while a request runs.
        const values = { get: name => nodes.form.elements.namedItem(name)?.value };
        const name = String(values.get('interface') || '');
        const nic = (status?.interfaces || []).find(row => row.name === name);
        return {
            interface: name, mac: nic?.permanentMac || nic?.mac || '',
            address: String(values.get('address') || '').trim(), prefixLength: 24,
            dhcpStart: String(values.get('dhcpStart') || '').trim(), dhcpEnd: String(values.get('dhcpEnd') || '').trim(),
            dnsServers: String(values.get('dnsServers') || '').split(',').map(value => value.trim()).filter(Boolean),
            reservations: status?.config?.reservations || [],
            listeners: [...nodes.form.querySelectorAll('input[data-listener]:checked')].map(input => ({ protocol: input.dataset.protocol, port: Number(input.dataset.port) })),
        };
    };
    const updateButtons = () => {
        if (!overlay) return;
        const pending = !!status?.pending;
        const blocked = busy || !status || !allowed() || status?.capabilities?.available === false;
        nodes.check.disabled = blocked || pending || status?.capabilities?.canApply === false;
        nodes.apply.disabled = blocked || pending || status?.capabilities?.canApply === false || !preview || JSON.stringify(collect()) !== preview;
        nodes.refresh.disabled = busy;
        for (const input of nodes.form.querySelectorAll('input,select')) input.disabled = blocked || pending;
        for (const input of nodes.devices.querySelectorAll('input,select,button')) input.disabled = blocked || pending
            || input.dataset.blocked === '1' || input.dataset.grant === '1' && status?.capabilities?.canGrant === false;
        if (nodes.confirm) nodes.confirm.disabled = blocked;
    };

    const renderForm = config => {
        nodes.form.replaceChildren();
        const label = element('label', 'eos-network-field eos-network-wide');
        label.append(element('span', '', 'Technischer LAN-Port / USB-LAN'));
        const select = element('select'); select.name = 'interface'; select.required = true;
        const empty = element('option', '', 'Bitte den separaten Geräteanschluss wählen'); empty.value = ''; select.append(empty);
        for (const nic of status.interfaces || []) {
            const unavailable = nic.defaultRoute || nic.master || nic.kind && nic.kind !== 'ether'
                || nic.managed && nic.managed !== 'eos' || nic.eligible === false;
            const suffix = nic.defaultRoute ? 'Kundennetz / Standardroute' : unavailable ? 'nicht freigegeben' : nic.managed === 'eos' ? 'EOS-Gerätenetz' : 'verfügbar';
            const option = element('option', '', `${nic.name} · ${nic.permanentMac || nic.mac || 'MAC unbekannt'} · ${suffix}`);
            option.value = nic.name; option.disabled = !!unavailable;
            option.selected = nic.name === config?.interface; select.append(option);
        }
        label.append(select);
        nodes.form.append(label,
            field('address', 'EOS-Adresse im Gerätenetz (/24)', config?.address || '192.168.250.1', { maxlength: 15, required: true, inputmode: 'decimal' }),
            field('dhcpStart', 'DHCP-Bereich von', config?.dhcpStart || '192.168.250.100', { maxlength: 15, required: true, inputmode: 'decimal' }),
            field('dhcpEnd', 'DHCP-Bereich bis', config?.dhcpEnd || '192.168.250.199', { maxlength: 15, required: true, inputmode: 'decimal' }),
            field('dnsServers', 'DNS für Internet-Wartung (öffentliche IPv4, mit Komma getrennt)', (config?.dnsServers || []).join(', '), { maxlength: 64, required: true, placeholder: 'z. B. 9.9.9.9' }),
        );
        const protocols = element('fieldset', 'eos-network-protocols eos-network-wide');
        protocols.append(element('legend', '', 'Geräte dürfen diese EOS-Dienste erreichen'));
        for (const [protocol, port, title] of LISTENERS) {
            const line = element('label', 'eos-network-check');
            const check = element('input'); check.type = 'checkbox';
            check.dataset.listener = '1'; check.dataset.protocol = protocol; check.dataset.port = String(port);
            check.checked = (config?.listeners || []).some(item => item.protocol === protocol && item.port === port);
            line.append(check, element('span', '', title)); protocols.append(line);
        }
        protocols.append(element('small', '', 'Nur benötigte Dienste freigeben. Die Auswahl öffnet die Firewall, startet aber keinen Adapter.'));
        nodes.form.append(protocols);
        nodes.form.addEventListener('input', invalidatePreview);
        nodes.form.addEventListener('change', invalidatePreview);
    };

    const deviceAction = async (operation, payload, success) => {
        if (busy) return;
        busy = true; updateButtons();
        const current = generation;
        try {
            await request(operation, payload);
            if (current !== generation || !overlay) return;
            preview = null; nodes.preview.textContent = '';
            const refreshed = await load(false);
            if (refreshed && current === generation && overlay) message(success, 'success');
        } catch (error) { if (current === generation && overlay) { message(errorText(error), 'error'); renderDevices(); } }
        finally { if (current === generation) { busy = false; updateButtons(); } }
    };

    const renderDevices = () => {
        nodes.devices.replaceChildren();
        nodes.devices.append(element('h3', '', 'Gemeldete Geräte'));
        nodes.devices.append(element('p', 'eos-network-note', 'Die Liste zeigt DHCP-Meldungen. Eine gültige Vergabe allein bestätigt keine aktuelle Erreichbarkeit. Die feste Zuordnung erfolgt über die gemeldete MAC-Adresse.'));
        const leases = status?.leases || [];
        if (!leases.length) {
            nodes.devices.append(element('p', 'eos-network-empty', status?.configured
                ? 'Noch keine DHCP-Meldungen. Gerät an den technischen LAN-Port anschließen und DHCP aktivieren.'
                : 'Nach Einrichtung des technischen Netzes erscheinen hier die DHCP-Meldungen.'));
            return;
        }
        const table = element('table', 'eos-network-table');
        const thead = element('thead'); const row = element('tr');
        for (const text of ['Gerät', 'IP-Adresse', 'IP immer zuordnen', 'Internet-Wartung']) row.append(element('th', '', text));
        thead.append(row); table.append(thead);
        const body = element('tbody');
        for (const lease of leases) {
            const tr = element('tr');
            const identity = element('td');
            identity.append(element('strong', '', lease.hostname || 'Unbenanntes Gerät'), element('small', '', lease.mac));
            const address = element('td', '', lease.ip);
            if (lease.active === false) address.append(element('small', '', 'DHCP-Vergabe abgelaufen'));
            else if (lease.expiresAt) address.append(element('small', '', `DHCP bis ${time(lease.expiresAt)}`));
            const reservation = element('td');
            const label = element('label', 'eos-network-check');
            const check = element('input'); check.type = 'checkbox';
            check.checked = lease.reserved === true || (status.config?.reservations || []).some(item => item.mac.toLowerCase() === lease.mac.toLowerCase() && item.ip === lease.ip);
            check.dataset.blocked = lease.active === false ? '1' : '0';
            check.setAttribute('aria-label', `IP ${lease.ip} immer ${lease.mac} zuordnen`);
            check.addEventListener('change', () => void deviceAction('reservation', { mac: lease.mac, ip: lease.ip, reserved: check.checked }, 'Die feste IP-Zuordnung wurde aktualisiert.'));
            label.append(check, element('span', '', 'Reservieren')); reservation.append(label);
            const internet = element('td');
            const grant = (status.grants || []).find(item => item.mac.toLowerCase() === lease.mac.toLowerCase() && item.ip === lease.ip);
            if (grant) {
                internet.append(element('span', 'eos-network-granted', `Freigegeben bis ${time(grant.expiresAt)}`));
                internet.append(button('Jetzt sperren', () => void deviceAction('revoke', { mac: lease.mac, ip: lease.ip }, 'Die Internetfreigabe wurde beendet.'), true));
            } else {
                const duration = element('select'); duration.setAttribute('aria-label', `Wartungsdauer für ${lease.ip}`);
                for (const minutes of [1, 5, 15, 30, 60]) {
                    const option = element('option', '', `${minutes} Minuten`); option.value = String(minutes * 60); option.selected = minutes === 15; duration.append(option);
                }
                const grantButton = button('Freigeben', () => void deviceAction('grant', { mac: lease.mac, ip: lease.ip, durationSeconds: Number(duration.value) }, 'Die zeitlich begrenzte Internetfreigabe ist aktiv.'));
                for (const control of [duration, grantButton]) { control.dataset.grant = '1'; control.dataset.blocked = lease.active === false ? '1' : '0'; }
                internet.append(duration, grantButton);
            }
            tr.append(identity, address, reservation, internet); body.append(tr);
        }
        table.append(body);
        const scroll = element('div', 'eos-network-table-scroll'); scroll.append(table); nodes.devices.append(scroll);
    };

    const renderStatus = () => {
        nodes.state.dataset.kind = status.fault ? 'error' : status.configured ? 'ready' : 'unknown';
        nodes.state.textContent = status.fault ? 'Netzwerkprüfung meldet einen Fehler · Zustand prüfen'
            : status.configured ? 'Gerätenetz eingerichtet · Internet standardmäßig gesperrt' : 'Gerätenetz noch nicht eingerichtet';
        if (status.fault) message(errorText(status.fault), 'error');
        nodes.pending.replaceChildren(); nodes.confirm = null;
        if (status.pending) {
            nodes.pending.append(element('strong', '', 'Netzwerkänderung wartet auf Bestätigung'), element('p', '', `Prüfen Sie die Verbindung. Ohne Bestätigung wird die Änderung zurückgenommen${status.pending.expiresAt ? ` (bis ${time(status.pending.expiresAt)})` : ''}.`));
            nodes.confirm = button('Verbindung funktioniert – bestätigen', () => void deviceAction('confirm', { transactionId: status.pending.transactionId }, 'Die Netzwerkkonfiguration wurde bestätigt.'));
            nodes.pending.append(nodes.confirm);
        }
        renderDevices(); updateButtons();
    };

    const load = async (initial = false) => {
        const current = generation;
        const wasBusy = busy;
        busy = true; updateButtons();
        try {
            const next = await request('status');
            if (current !== generation || !overlay) return;
            const recovered = !status;
            status = next;
            if (recovered) message('');
            if (initial || recovered) renderForm(status.config);
            renderStatus();
            return true;
        } catch (error) {
            if (current !== generation || !overlay) return;
            status = null;
            nodes.state.dataset.kind = 'unknown';
            nodes.state.textContent = 'Netzwerkstatus unbekannt · Verbindung zum Netzwerkdienst prüfen';
            nodes.pending.replaceChildren(); nodes.confirm = null;
            nodes.devices.replaceChildren(element('h3', '', 'Gerätestatus nicht aktuell'),
                element('p', 'eos-network-note', 'Es liegen keine aktuellen DHCP- oder Firewalldaten vor. Bitte den Status erneut abrufen.'));
            invalidatePreview();
            message(errorText(error), 'error'); updateButtons();
            return false;
        } finally { if (current === generation) { busy = wasBusy; updateButtons(); } }
    };

    const checkConfig = async () => {
        if (busy || !nodes.form.reportValidity()) return;
        busy = true; updateButtons();
        const current = generation;
        try {
            const config = collect();
            await request('preview', { config });
            if (current !== generation || !overlay) return;
            preview = JSON.stringify(config);
            nodes.preview.textContent = `Prüfung erfolgreich: ${config.interface} (${config.mac}), EOS ${config.address}/24, DHCP ${config.dhcpStart} bis ${config.dhcpEnd}. Internetzugriff bleibt gesperrt, bis Sie ihn für ein Gerät befristet freigeben.`;
            message('Konfiguration geprüft. Sie können sie jetzt übernehmen.', 'success');
        } catch (error) { if (current === generation) { preview = null; message(errorText(error), 'error'); } }
        finally { if (current === generation) { busy = false; updateButtons(); } }
    };
    const applyConfig = async () => {
        if (!preview || JSON.stringify(collect()) !== preview) { invalidatePreview(); return; }
        await deviceAction('apply', { config: JSON.parse(preview) }, 'Die Änderung wurde gestartet. Bitte Verbindung prüfen und anschließend bestätigen.');
    };

    const close = () => {
        generation++;
        activeRequest?.abort(); activeRequest = null;
        clearInterval(poll); poll = null;
        overlay?.remove(); overlay = null; status = null; busy = false; preview = null;
        if (openedBy?.isConnected) openedBy.focus();
        openedBy = null;
    };
    const open = async () => {
        if (!allowed() || overlay) return;
        const current = generation;
        openedBy = document.activeElement;
        overlay = element('div', 'eos-network-overlay');
        overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'eos-network-title');
        const dialog = element('section', 'eos-network-dialog');
        const header = element('header', 'eos-network-header');
        const heading = element('h2', '', 'System · Netzwerk'); heading.id = 'eos-network-title';
        const closeButton = button('Schließen', close, true); header.append(heading, closeButton);
        const note = element('p', 'eos-network-note', 'Der separate LAN- oder USB-LAN-Anschluss versorgt das technische Gerätenetz per DHCP. Netzänderungen werden vorab geprüft und müssen danach bestätigt werden. Eine Internetfreigabe gilt nur für das ausgewählte Gerät und endet automatisch.');
        nodes.state = element('p', 'eos-network-state', 'Status wird geladen …');
        nodes.pending = element('div', 'eos-network-pending');
        nodes.form = element('form', 'eos-network-form');
        nodes.form.addEventListener('submit', event => { event.preventDefault(); void checkConfig(); });
        nodes.preview = element('p', 'eos-network-preview');
        const actions = element('div', 'eos-network-actions');
        nodes.check = button('Konfiguration prüfen', () => void checkConfig(), true);
        nodes.apply = button('Übernehmen und prüfen', () => void applyConfig());
        nodes.refresh = button('Status aktualisieren', async () => { if (busy) return; busy = true; updateButtons(); await load(!nodes.form.childElementCount); busy = false; updateButtons(); }, true);
        actions.append(nodes.check, nodes.apply, nodes.refresh);
        nodes.message = element('div', 'eos-network-message'); nodes.message.setAttribute('role', 'status'); nodes.message.setAttribute('aria-live', 'polite');
        nodes.devices = element('section', 'eos-network-devices');
        dialog.append(header, note, nodes.state, nodes.pending, nodes.form, nodes.preview, actions, nodes.message, nodes.devices); overlay.append(dialog); document.body.append(overlay);
        closeButton.focus(); updateButtons(); await load(true);
        if (overlay && current === generation) poll = setInterval(() => { if (!allowed()) { close(); return; } if (!busy && document.visibilityState === 'visible') void load(!nodes.form.childElementCount); }, 5000);
    };
    const keyboard = event => {
        if (!overlay) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const focusable = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard, { signal: lifecycle.signal });

    let scheduled = false;
    const mountLinks = () => {
        if (!allowed()) { document.querySelectorAll('.eos-network-entry').forEach(node => node.remove()); if (overlay) close(); return; }
        const mounts = [
            document.querySelector('[role="dialog"][aria-labelledby="system-settings-dialog-title"] .MuiDialogContent-root'),
            document.querySelector('.eos-basic-settings-actions'),
        ].filter(Boolean);
        for (const mount of mounts) {
            if (mount.querySelector('.eos-network-entry')) continue;
            const entry = button('Netzwerk · Gerätenetz und DHCP', () => void open(), true); entry.classList.add('eos-network-entry'); mount.prepend(entry);
        }
    };
    const scheduleMount = () => {
        if (scheduled) return; scheduled = true;
        requestAnimationFrame(() => { scheduled = false; mountLinks(); });
    };
    // Reuse the Admin DOM coordinator; live datapoint updates must not create
    // another broad MutationObserver or any background network polling here.
    let unsubscribeDom = null;
    let retryTimer = null;
    let attempts = 0;
    const connectCoordinator = () => {
        if (unsubscribeDom || lifecycle.signal.aborted) return;
        const coordinator = window.NEXOWATT_EOS_DOM_COORDINATOR;
        if (coordinator?.subscribe) unsubscribeDom = coordinator.subscribe(scheduleMount);
        else if (++attempts < 30) retryTimer = setTimeout(connectCoordinator, 200);
        scheduleMount();
    };
    window.addEventListener('nexowatt-eos-admin-socket-ready', connectCoordinator, { signal: lifecycle.signal });
    connectCoordinator();
    window.NEXOWATT_EOS_NETWORK = Object.freeze({ version: VERSION, open, close, destroy() { close(); lifecycle.abort(); clearTimeout(retryTimer); unsubscribeDom?.(); } });
})();
