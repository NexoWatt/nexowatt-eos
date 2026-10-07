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
        LICENSE_KEY_UNKNOWN: 'Der Herausgeberschlüssel dieser Lizenz ist auf dem EOS-Gerät nicht hinterlegt. Bestehenden Herstellertresor und Geräteeinrichtung prüfen; keinen neuen Tresor erzeugen.',
        LICENSE_FORMAT_INVALID: 'Der Lizenzcode ist unvollständig oder hat ein falsches Format. Den vollständigen NWL3-Code aus dem Keygen einfügen.',
        LICENSE_FORMAT: 'Bitte genau einen vollständigen Lizenzcode einfügen.',
        LICENSE_CLAIMS_INVALID: 'Die Lizenz enthält ungültige Angaben. Eine passende Home- oder Pro-Lizenz für dieses EOS ausstellen.',
        LICENSE_NOT_YET_VALID: 'Die Lizenz ist noch nicht gültig. Datum und Uhrzeit von EOS und Keygen-Rechner prüfen.',
        LICENSE_UUID_INVALID: 'Die System-UUID ist ungültig oder noch nicht eingerichtet.',
        LICENSE_ORIGIN: 'Die Sicherheitsprüfung der Anfrage ist fehlgeschlagen. Lizenzverwaltung direkt im angemeldeten EOS-Admin öffnen.',
        LICENSE_RATE_LIMIT: 'Zu viele Anfragen. Eine Minute warten und den Status erneut prüfen.',
        LICENSE_REQUEST: 'Die Lizenzanfrage konnte nicht gelesen werden. Den vollständigen Code erneut prüfen.',
        STORAGE_IO_ERROR: 'Die Lizenz konnte nicht sicher gelesen oder gespeichert werden. Gerätespeicher und Dienstprotokoll prüfen.',
        STORAGE_UNSAFE_PATH: 'Die geschützte Lizenzablage hat ungültige Zugriffsrechte. Bitte Service kontaktieren.',
        SERVICE_TIMEOUT: 'Die Lizenzverwaltung antwortet nicht rechtzeitig. Den aktuellen Status erneut prüfen.',
        UI_EMPTY_TOKEN: 'Bitte zuerst den vollständigen Lizenzcode aus dem Keygen einfügen.',
        UI_RESPONSE_INVALID: 'EOS hat keinen eindeutig prüfbaren Lizenzstatus geliefert. Aktivierung nicht bestätigt. Status aktualisieren.',
        UI_TIMEOUT: 'Keine Bestätigung innerhalb von fünf Sekunden. Die Anfrage könnte bereits gespeichert sein. Zuerst „Status aktualisieren“, nicht sofort erneut aktivieren.',
        UI_CONNECTION: 'Keine bestätigte Antwort von EOS. Verbindung und Anmeldung prüfen, dann „Status aktualisieren“.',
    };
    let busy = false;
    const errorText = code => Object.hasOwn(errors, code) ? `${errors[code]} (${code})` : errors.UI_CONNECTION;
    const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const uuidValid = value => typeof value === 'string' && /^(?:[a-z]{2})?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
    function validateStatus(data) {
        if (!plain(data) || data.v !== 1 || typeof data.valid !== 'boolean' || typeof data.code !== 'string'
            || (data.uuid !== null && !uuidValid(data.uuid)) || (!data.valid && data.code === 'LICENSE_VALID')) throw new Error('UI_RESPONSE_INVALID');
        if (data.valid && (data.code !== 'LICENSE_VALID' || !uuidValid(data.uuid) || !['home', 'pro'].includes(data.edition)
            || !(data.expiresAt === null || (Number.isSafeInteger(data.expiresAt) && data.expiresAt >= 0 && data.expiresAt <= 8640000000000000))
            || !plain(data.limits) || !Number.isSafeInteger(data.limits.chargePoints) || data.limits.chargePoints < 1 || data.limits.chargePoints > 1000
            || !Number.isSafeInteger(data.limits.batteries) || data.limits.batteries < 0 || data.limits.batteries > 10
            || !Array.isArray(data.features) || data.features.length > 7 || !data.features.every(name => Object.hasOwn(names, name)))) throw new Error('UI_RESPONSE_INVALID');
        return data;
    }
    async function readJson(response, controller) {
        if (!(response.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json') || !response.body) {
            controller.abort(); throw new Error([401, 403].includes(response.status) ? 'LICENSE_ADMIN_REQUIRED' : 'UI_RESPONSE_INVALID');
        }
        const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
        let size = 0, text = '';
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                size += value.byteLength;
                if (size > 32768) { controller.abort(); throw new Error('UI_RESPONSE_INVALID'); }
                text += decoder.decode(value, { stream: true });
            }
            return JSON.parse(text + decoder.decode());
        } catch (error) {
            void reader.cancel().catch(() => undefined);
            throw error.name === 'AbortError' || error.message === 'UI_RESPONSE_INVALID' ? error : new Error('UI_RESPONSE_INVALID');
        } finally { reader.releaseLock(); }
    }
    async function request(route, body) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch(`/nexowatt/license/${route}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
                headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-EOS-License': '1' }, body: body === undefined ? undefined : JSON.stringify(body) });
            const data = await readJson(response, controller);
            if (!response.ok) throw new Error(plain(data) && Object.hasOwn(errors, data.error) ? data.error : 'UI_CONNECTION');
            return validateStatus(data);
        } finally { clearTimeout(timeout); }
    }
    function show(data) {
        $('status').textContent = data.valid ? `${data.edition === 'home' ? 'EOS Home' : 'EOS Pro'} aktiviert · Lizenz gültig.` : errorText(data.code);
        $('status').className = data.valid ? 'status' : 'status error';
        $('uuid').textContent = data.uuid || 'Nicht verfügbar';
        $('edition').textContent = data.edition === 'home' ? 'EOS Home' : data.edition === 'pro' ? 'EOS Pro' : '–';
        $('expiry').textContent = !data.valid ? '–' : data.expiresAt === null ? 'Dauerhaft' : new Date(data.expiresAt).toLocaleString('de-DE');
        $('limits').textContent = data.valid ? `${data.limits.chargePoints} / ${data.limits.batteries}` : '–';
        $('features').textContent = data.valid ? data.features.map(name => names[name]).join(', ') || '–' : '–';
        $('checked').textContent = new Date().toLocaleString('de-DE');
    }
    function unconfirmed() {
        $('status').textContent = 'Status derzeit nicht bestätigt.';
        $('status').className = 'status error';
        for (const id of ['uuid', 'edition', 'expiry', 'limits', 'features', 'checked']) $(id).textContent = '–';
    }
    async function run(action, progress = 'Lizenzstatus wird geprüft …') {
        if (busy) return;
        busy = true;
        document.querySelectorAll('button').forEach(button => { button.disabled = true; });
        $('token').disabled = true;
        $('message').textContent = progress;
        $('message').className = '';
        try { await action(); } catch (error) {
            unconfirmed();
            $('message').textContent = errorText(error.name === 'AbortError' ? 'UI_TIMEOUT' : error.message);
            $('message').className = 'error';
        }
        finally { busy = false; $('token').disabled = false; document.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
    }
    const refresh = () => run(async () => {
        const data = await request('status'); show(data);
        $('message').textContent = data.valid ? 'Gespeicherte Lizenz vom EOS bestätigt. Das leere Eingabefeld bedeutet nicht, dass die Lizenz fehlt.' : 'Lizenzstatus vom EOS aktualisiert.';
    });
    $('refresh').onclick = refresh;
    $('activate').onclick = () => run(async () => {
        const token = $('token').value.trim();
        if (!token) throw new Error('UI_EMPTY_TOKEN');
        const data = await request('activate', { token });
        if (!data.valid) throw new Error('UI_RESPONSE_INVALID');
        show(data);
        // Clear only after the server confirms successful validation, encrypted
        // storage and readback. Never put the saved key in status/browser storage.
        $('token').value = '';
        $('message').textContent = `${data.edition === 'home' ? 'EOS Home' : 'EOS Pro'} erfolgreich aktiviert und verschlüsselt gespeichert. Das Eingabefeld wurde zum Schutz des Lizenzcodes geleert. Der Aktivierungsstatus bleibt oben sichtbar.`;
    }, 'Lizenz wird geprüft und gespeichert …');
    $('remove').onclick = () => {
        if (confirm('Lizenz entfernen? Angebundene Adapter verlieren ihre Betriebsfreigabe. Vorher den sicheren Anlagenzustand herstellen.')) {
            return run(async () => {
                const data = await request('remove', {});
                if (data.valid || data.code !== 'LICENSE_MISSING') throw new Error('UI_RESPONSE_INVALID');
                show(data); $('token').value = '';
                $('message').textContent = 'Lizenz entfernt. EOS meldet keine aktive Lizenz mehr.';
            }, 'Lizenzentfernung wird geprüft …');
        }
    };
    void refresh();
})();
