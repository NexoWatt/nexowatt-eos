'use strict';
(() => {
    const $ = id => document.getElementById(id);
    const names = { energy: 'Energiemanagement', wallet: 'Energie-Wertkonto', smartHome: 'Smart Home', microgridSlave: 'Microgrid Slave', microgridMaster: 'Microgrid Master', multisite: 'Mehrere Standorte', billing: 'Abrechnung' };
    const errors = {
        LICENSE_MISSING: 'Keine Lizenz aktiviert.', LICENSE_VALID: 'Lizenz gültig.', LICENSE_EXPIRED: 'Lizenz abgelaufen.',
        LICENSE_UUID_MISMATCH: 'Die Lizenz gehört nicht zu diesem System.', LICENSE_UUID_CHANGED: 'Die System-UUID hat sich geändert. Bitte Service kontaktieren.',
        LICENSE_SIGNATURE_INVALID: 'Die Signatur ist ungültig.', LICENSE_CLOCK_ROLLBACK: 'Die Systemzeit wurde zurückgestellt. Bitte Datum und Uhrzeit prüfen.',
        LICENSE_ADMIN_REQUIRED: 'Bitte mit einem Administrator-Konto anmelden.', LICENSE_HTTPS_REQUIRED: 'Für die Lizenzverwaltung ist HTTPS erforderlich.',
        TRUST_PERMISSIONS: 'Der öffentliche Herstellerschlüssel ist noch nicht sicher eingerichtet.', SERVICE_UNAVAILABLE: 'Die Lizenzverwaltung ist nicht bereit. Herstellerschlüssel und Einrichtung prüfen.',
    };
    let busy = false;
    async function request(route, body) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch(`/nexowatt/license/${route}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
                headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-EOS-License': '1' }, body: body === undefined ? undefined : JSON.stringify(body) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'SERVICE_UNAVAILABLE');
            return data;
        } finally { clearTimeout(timeout); }
    }
    function show(data) {
        $('status').textContent = errors[data.code] || `Nicht freigeschaltet (${data.code})`;
        $('status').className = data.valid ? 'status' : 'status error';
        $('uuid').textContent = data.uuid || 'Nicht verfügbar';
        $('edition').textContent = data.edition === 'home' ? 'EOS Home' : data.edition === 'pro' ? 'EOS Pro' : '–';
        $('expiry').textContent = !data.valid ? '–' : data.expiresAt === null ? 'Dauerhaft' : new Date(data.expiresAt).toLocaleString('de-DE');
        $('limits').textContent = data.valid ? `${data.limits.chargePoints} / ${data.limits.batteries}` : '–';
        $('features').textContent = data.features?.map(name => names[name] || name).join(', ') || '–';
    }
    async function run(action) {
        if (busy) return;
        busy = true;
        document.querySelectorAll('button').forEach(button => { button.disabled = true; });
        $('message').textContent = '';
        try { await action(); } catch (error) {
            $('status').textContent = 'Status derzeit nicht bestätigt.';
            $('status').className = 'status error';
            $('message').textContent = errors[error.message] || 'Anfrage fehlgeschlagen. Status prüfen und gegebenenfalls erneut versuchen.';
        }
        finally { busy = false; document.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
    }
    $('refresh').onclick = () => run(async () => show(await request('status')));
    $('activate').onclick = () => run(async () => {
        const token = $('token').value.trim();
        $('token').value = '';
        show(await request('activate', { token }));
        $('message').textContent = 'Lizenz geprüft und verschlüsselt gespeichert.';
    });
    $('remove').onclick = () => {
        if (confirm('Lizenz entfernen? Angebundene Adapter verlieren ihre Betriebsfreigabe. Vorher den sicheren Anlagenzustand herstellen.')) {
            void run(async () => show(await request('remove', {})));
        }
    };
    void run(async () => show(await request('status')));
})();
