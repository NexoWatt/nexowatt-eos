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
            if (!response.ok || data.ok !== true) throw Error(data.error || 'UPDATE_UNAVAILABLE');
            return data;
        } finally { clearTimeout(deadline); if (controller === current) controller = null; }
    }
    function close() { generation++; busy = false; clearTimeout(timer); controller?.abort(); dialog?.remove(); dialog = null; previousFocus?.focus(); }
    function render(data) {
        if (!dialog) return;
        const content = dialog.querySelector('[data-content]'); content.replaceChildren();
        content.append(el('p', `Installierter Teststand: ${data.installed?.sequence ?? '–'}`));
        const status = el('p', messages[data.phase] || 'Status nicht verfügbar.'); status.setAttribute('role', 'status'); content.append(status);
        if (data.phase === 'DOWNLOADING' && data.totalBytes) {
            const progress = el('progress'); progress.max = data.totalBytes; progress.value = data.downloadedBytes; progress.setAttribute('aria-label', 'Download'); content.append(progress);
        }
        if (data.candidate) {
            content.append(el('h3', `Neuer Teststand: ${data.candidate.sequence}`), el('p', data.candidate.notes));
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
    }
    async function act(operation, body) {
        if (!dialog || !allowed() || busy) return;
        busy = true; let pollAgain = true; const token = generation; clearTimeout(timer);
        dialog.querySelectorAll('[data-content] button').forEach(n => { n.disabled = true; });
        try { const data = await request(operation, body); pollAgain = data.busy; if (token === generation && dialog) { busy = false; render(data); } }
        catch {
            if (token === generation && dialog) {
                const content = dialog.querySelector('[data-content]');
                content.replaceChildren(el('p', 'Der Updatedienst ist momentan nicht erreichbar. Ein bereits gestartetes Update läuft unabhängig vom Browser weiter. Der Status wird erneut abgefragt.'));
            }
        } finally {
            if (token === generation) busy = false;
            if (token === generation && dialog && pollAgain) timer = setTimeout(() => void act('status'), 5000);
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
