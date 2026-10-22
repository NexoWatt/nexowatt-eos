(() => {
    'use strict';
    window.NEXOWATT_EOS_UPDATES?.destroy?.();
    const script = document.currentScript;
    const api = new URL('../nexowatt/managed-updates/', script?.src || document.baseURI);
    const lifecycle = new AbortController();
    const allowed = () => ['admin', 'installer'].includes(window.NEXOWATT_EOS_POLICY_CLIENT?.getPolicy?.()?.role || window.NEXOWATT_EOS_ACCESS_ROLE);
    let dialog, timer, controller, previousFocus, busy = false, generation = 0;
    const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
    const button = (text, action) => { const n = el('button', text); n.type = 'button'; n.addEventListener('click', action); return n; };
    const messages = { IDLE: 'Noch nicht auf Updates geprüft.', CHECKING: 'Neue Versionen werden geprüft …',
        AVAILABLE: 'Eine geprüfte Testversion ist verfügbar.', UP_TO_DATE: 'Für diesen Stand ist kein neueres Update freigegeben.',
        QUEUED: 'Update wird vorbereitet …', DOWNLOADING: 'Update wird heruntergeladen …', VERIFYING: 'Signatur und Paket werden geprüft …',
        INSTALLING: 'EOS wird aktualisiert. Die Verbindung zum Admin wird vorübergehend unterbrochen.',
        SUCCEEDED: 'Update erfolgreich installiert. Bitte den Admin neu laden.', ROLLED_BACK: 'Update fehlgeschlagen. Der vorherige Stand wurde wieder gestartet.',
        FAILED: 'Das Update konnte nicht durchgeführt werden. Bitte erneut prüfen.',
        RECOVERY_REQUIRED: 'Das Update wurde unterbrochen. Eine Prüfung durch den Service ist erforderlich.' };
    async function request(operation, body) {
        controller?.abort(); controller = new AbortController();
        const current = controller; const deadline = setTimeout(() => current.abort(), 5000);
        try {
            const response = await fetch(new URL(operation, api), { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
                headers: body ? { 'Content-Type': 'application/json', 'X-NexoWatt-Eos-Updates': '1' } : {},
                ...(body ? { body: JSON.stringify(body) } : {}), signal: current.signal });
            const data = await response.json();
            if (!response.ok || data.ok !== true) throw Object.assign(Error('UPDATE_UNAVAILABLE'), {
                code: /^(?:UPDATE|REPAIR)_[A-Z0-9_]+$/.test(data.error || '') ? data.error : 'UPDATE_UNAVAILABLE', osUpdates: data.osUpdates });
            return data;
        } finally { clearTimeout(deadline); if (controller === current) controller = null; }
    }
    function close() { generation++; busy = false; clearTimeout(timer); controller?.abort(); dialog?.remove(); dialog = null; previousFocus?.focus(); }
    const version = value => typeof value === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value) ? value : 'Unbekannt';
    const count = value => Number.isSafeInteger(value) && value >= 0 ? String(value) : 'Unbekannt';
    const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Noch nicht bestätigt';
    const requirement = value => ({ required: 'Erforderlich', 'not-required': 'Nicht erforderlich', unknown: 'Unbekannt' })[value] || 'Unbekannt';
    function renderOsStatus(content, result) {
        const section = el('section'); section.className = 'eos-os-update-status'; section.dataset.osUpdates = '';
        section.setAttribute('aria-labelledby', 'eos-os-update-heading');
        const heading = el('h3', 'Linux · automatische Sicherheitsupdates'); heading.id = 'eos-os-update-heading'; section.append(heading);
        const value = result?.summary;
        if (!value || !['available', 'stale'].includes(result.availability)) {
            section.dataset.health = 'warning'; section.append(el('p', 'Der Zustand der Linux-Sicherheitsupdates ist momentan nicht bestätigt.'));
            content.append(section); return;
        }
        section.dataset.health = result.health === 'ok' && result.availability === 'available' ? 'ok' : 'warning';
        const states = { running: 'Linux-Sicherheitswartung läuft.', ok: 'Die konfigurierten Paketquellen wurden geprüft.',
            attention: 'Offene Updates oder eine Aktivierung benötigen Aufmerksamkeit.', error: 'Die Linux-Sicherheitswartung ist fehlgeschlagen.',
            'never-run': 'Es wurde noch kein Wartungslauf bestätigt.', disabled: 'Die automatische Linux-Sicherheitswartung ist deaktiviert.' };
        const message = result.availability === 'stale' ? 'Der Linux-Updatestatus ist veraltet. Eine aktuelle Prüfung fehlt.'
            : value.coverage?.maintenanceDeferred ? 'Die Linux-Sicherheitswartung wartet auf das laufende EOS-Update.'
                : states[value.state] || 'Der Linux-Updatestatus muss geprüft werden.';
        const status = el('p', message); status.setAttribute('role', 'status'); section.append(status);
        const list = el('dl');
        const row = (name, text) => list.append(el('dt', name), el('dd', text));
        const automatic = value.policy?.automatic === true && value.timers?.enabled === true && value.timers?.active === true
            ? 'Aktiv' : value.policy?.automatic === false || value.timers?.enabled === false || value.timers?.active === false
                ? 'Nicht vollständig aktiv' : 'Nicht bestätigt';
        row('Automatische Wartung', automatic);
        row('Letzter Versuch', time(value.lastAttemptAt));
        row('Letzter erfolgreicher Durchlauf', time(value.lastSuccessAt));
        row('Offene Sicherheitsupdates', count(value.pending?.securityCount));
        row('Blockierte Sicherheitsupdates', count(value.pending?.blockedSecurityCount));
        row('Zurückgehaltene Sicherheitsupdates', count(value.pending?.heldSecurityCount));
        row('Aktivierung aktualisierter Prozesse', requirement(value.activation?.state));
        row('Dienste / Sitzungen mit Neustartbedarf', `${count(value.activation?.serviceRestartCount)} / ${count(value.activation?.sessionRestartCount)}`);
        row('Systemneustart', `${requirement(value.reboot?.state)} · automatisch: Nein`);
        row('Quellenabdeckung', value.coverage?.state === 'complete-for-configured-origins' && value.coverage.gapCount === 0
            ? 'Konfigurierte Quellen vollständig geprüft' : 'Lücken oder ungeklärter Zustand');
        section.append(list);
        if (value.activation?.state === 'required' || value.reboot?.state === 'required') section.append(el('p',
            'Installierte Pakete sind teilweise noch nicht wirksam. Erforderliche Dienste- oder Systemneustarts im Wartungsfenster durchführen.'));
        if (value.activation?.serviceActionsDeferred === true) section.append(el('p',
            'Paketbedingte Dienstaktionen stehen noch aus; ein erfolgreicher Paketdurchlauf bestätigt ihre Aktivierung nicht.'));
        if (value.policy?.serviceRestartPolicy === 'defer-package-service-actions') section.append(el('p',
            'Paketbedingte Dienstneustarts werden für die koordinierte Wartung zurückgestellt.'));
        if (value.errorCode) section.append(el('p', 'Die letzte Linux-Wartung konnte nicht vollständig abgeschlossen werden. Serviceprüfung erforderlich.'));
        content.append(section);
    }
    function render(data) {
        if (!dialog) return;
        const content = dialog.querySelector('[data-content]'); content.replaceChildren();
        content.append(el('p', `Installierter Teststand: ${data.installed?.sequence ?? '–'}`),
            el('p', `Installierte Node.js-Laufzeit: ${version(data.installed?.nodeVersion)}`));
        const status = el('p', messages[data.phase] || 'Status nicht verfügbar.'); status.setAttribute('role', 'status'); content.append(status);
        if (data.phase === 'DOWNLOADING' && data.totalBytes) {
            const progress = el('progress'); progress.max = data.totalBytes; progress.value = data.downloadedBytes; progress.setAttribute('aria-label', 'Download'); content.append(progress);
        }
        if (data.candidate) {
            content.append(el('h3', `Neuer Teststand: ${data.candidate.sequence}`), el('p', data.candidate.notes),
                el('p', `Node.js im geprüften EOS-Paket: ${version(data.candidate.nodeVersion)}`),
                el('p', 'EOS und die zugehörige Node.js-Laufzeit werden gemeinsam installiert und geprüft.'));
        }
        if (data.error && /^(?:UPDATE|REPAIR)_[A-Z0-9_]+$/.test(data.error)) content.append(el('p', `Diagnose: ${data.error}`));
        const check = button('Updates prüfen', () => void act('check', {})); check.disabled = data.busy || busy || data.phase === 'RECOVERY_REQUIRED'; content.append(check);
        if (data.candidate && data.phase === 'AVAILABLE') {
            const label = el('label'); const confirm = el('input'); confirm.type = 'checkbox';
            label.append(confirm, document.createTextNode(' Wartungsfenster vorbereitet und Sicherung vorhanden. Die Regelung wird während des Neustarts unterbrochen.'));
            const install = button('Update installieren', () => void act('install', { releaseId: data.candidate.releaseId, maintenanceConfirmed: true }));
            install.disabled = true; confirm.addEventListener('change', () => { install.disabled = !confirm.checked || busy; }); content.append(label, install);
        }
        if (data.phase === 'SUCCEEDED') content.append(button('Admin neu laden', () => location.reload()));
        renderOsStatus(content, data.osUpdates);
    }
    async function act(operation, body) {
        if (!dialog || !allowed() || busy) return;
        busy = true; let pollDelay = 5000; const token = generation; clearTimeout(timer);
        dialog.querySelectorAll('[data-content] button').forEach(n => { n.disabled = true; });
        try { const data = await request(operation, body); pollDelay = data.busy ? 5000 : 30000; if (token === generation && dialog) { busy = false; render(data); } }
        catch (error) {
            if (token === generation && dialog) {
                const content = dialog.querySelector('[data-content]');
                content.replaceChildren(el('p', error.code === 'UPDATE_MAINTENANCE_BUSY'
                    ? 'Die Linux-Sicherheitswartung läuft bereits. EOS-Updates werden nach ihrem Abschluss wieder möglich.'
                    : 'Der Updatedienst ist momentan nicht erreichbar. Ein bereits gestartetes Update läuft unabhängig vom Browser weiter. Der Status wird erneut abgefragt.'));
                renderOsStatus(content, error.osUpdates);
            }
        } finally {
            if (token === generation) busy = false;
            if (token === generation && dialog) timer = setTimeout(() => void act('status'), pollDelay);
        }
    }
    function open() {
        if (!allowed() || dialog) return;
        previousFocus = document.activeElement; dialog = el('dialog'); dialog.className = 'eos-system-updates';
        dialog.setAttribute('aria-labelledby', 'eos-update-heading'); const heading = el('h2', 'System · EOS-Updates'); heading.id = 'eos-update-heading';
        const content = el('div'); content.dataset.content = ''; content.append(el('p', 'Status wird geladen …'));
        dialog.append(heading, content, button('Schließen', close)); document.body.append(dialog);
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }); dialog.showModal(); void act('status');
    }
    const mount = () => {
        if (!allowed()) { document.querySelectorAll('.eos-updates-entry').forEach(n => n.remove()); if (dialog) close(); return; }
        for (const node of document.querySelectorAll('[role="dialog"][aria-labelledby="system-settings-dialog-title"] .MuiDialogContent-root, .eos-basic-settings-actions')) {
            if (node.querySelector('.eos-updates-entry')) continue;
            const entry = button('EOS-Updates', open); entry.className = 'eos-updates-entry'; node.prepend(entry);
        }
    };
    let unsubscribe, retry, attempts = 0;
    const connect = () => {
        if (unsubscribe || lifecycle.signal.aborted) return;
        const coordinator = window.NEXOWATT_EOS_DOM_COORDINATOR;
        if (coordinator?.subscribe) unsubscribe = coordinator.subscribe(mount);
        else if (++attempts < 30) retry = setTimeout(connect, 200);
        mount();
    };
    window.addEventListener('nexowatt-eos-admin-socket-ready', connect, { signal: lifecycle.signal }); connect();
    window.NEXOWATT_EOS_UPDATES = Object.freeze({ open, close, destroy() { close(); lifecycle.abort(); clearTimeout(retry); unsubscribe?.(); } });
})();
