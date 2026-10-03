'use strict';
(() => {
    const $ = id => document.getElementById(id);
    let csrf = null, deviceUuid = '';
    const message = text => { $('message').textContent = text; };
    const show = state => {
        $('claim').hidden = state !== 'claim'; $('setup-form').hidden = state !== 'setup'; $('finished').hidden = state !== 'finished';
    };
    const REQUEST_BUDGET_MS = 5000, POLL_BUDGET_MS = 180000;
    // One monotonic budget covers both response headers and the complete JSON body.
    // The race also settles the UI when an interrupted transport fails to settle.
    async function request(url, data, budgetMs = REQUEST_BUDGET_MS) {
        const controller = new AbortController(), deadline = performance.now() + budgetMs;
        const timeoutError = Object.assign(new Error('request-timeout'), { code: 'SETUP_TIMEOUT' });
        let timer, timedOut = false;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => { timedOut = true; controller.abort(); reject(timeoutError); }, budgetMs);
        });
        try {
            return await Promise.race([(async () => {
                const response = await fetch(url, { method: data ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
                    signal: controller.signal,
                    headers: data ? { 'content-type': 'application/json', 'x-eos-setup': '1', ...(csrf ? { 'x-eos-csrf': csrf } : {}) } : {},
                    ...(data ? { body: JSON.stringify(data) } : {}) });
                const result = await response.json();
                if (performance.now() >= deadline) { timedOut = true; controller.abort(); throw timeoutError; }
                if (!response.ok) throw Object.assign(new Error('request'), { status: response.status, code: result.code });
                return result;
            })(), timeout]);
        } catch (error) { throw timedOut ? timeoutError : error; }
        finally { clearTimeout(timer); }
    }
    function failure(error) {
        const messages = {
            SETUP_CODE_REJECTED: 'Der Code ist ungültig, abgelaufen oder bereits verwendet. Ein neuer Code muss am lokalen Gerätezugang ausgestellt werden.',
            SETUP_SESSION: 'Diese Einrichtungssitzung ist abgelaufen. Der lokale Gerätezugang ist für einen neuen Versuch erforderlich.',
            SETUP_INPUT_REJECTED: 'Die Angaben sind unvollständig oder ungültig. Prüfen Sie Ihre Home-/Pro-Lizenz und die übereinstimmenden Admin-Passwörter.',
            SETUP_RATE_LIMIT: 'Zu viele Anfragen. Bitte warten Sie eine Minute.',
            SETUP_TIMEOUT: 'Das Gerät antwortet nicht rechtzeitig. Es ist noch kein erfolgreicher Abschluss bestätigt. Prüfen Sie die Verbindung und den Gerätestatus.',
        };
        message(messages[error.code] || 'Die Einrichtung ist derzeit gesperrt oder das Gerät nicht erreichbar. Prüfen Sie den lokalen Gerätestatus.');
    }
    $('setup-form').addEventListener('input', event => {
        $('review-status').textContent = 'Angaben geändert. Vor dem Speichern werden sie erneut geprüft.';
        if (event.target?.name === 'licenseToken') $('license-status').textContent = 'Lizenzangabe geändert. Bitte erneut prüfen.';
    });
    async function loadCatalog() {
        deviceUuid = ''; $('license-uuid').value = ''; $('copy-uuid').disabled = true;
        const result = await request('/api/catalog');
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
    // Commissioning is not a browser-supplied setting. The server records it as
    // deferred for this schema, without inventing site, grid or device values.
    function collect(form) {
        const data = new FormData(form);
        return { schemaVersion: 3, license: { mode: 'activate', token: String(data.get('licenseToken') || '').trim() } };
    }
    function summary(result) {
        return 'Lizenzierung: ' + (result.licenseConfigured ? 'Signatur geprüft' : 'noch nicht bestätigt') +
            '. Die Kundenanlage wird später eingerichtet. Anlagen- und Hardwareabnahme: OFFEN.';
    }
    $('verify-license').addEventListener('click', async () => {
        try { const result = await request('/api/license/verify', { token: $('license-token').value.trim() });
            $('license-status').textContent = 'Gültige ' + result.edition.toUpperCase() + '-Lizenz · ' + (result.expiresAt === null ? 'unbefristet' : 'bis ' + new Date(result.expiresAt).toLocaleDateString('de-DE')) +
                '. Die Kundenanlage wird später eingerichtet.'; }
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
        $('finished').querySelector('p').textContent = 'Melden Sie sich als admin mit dem gerade vergebenen Admin-Passwort an. Die Kundenanlage wird später eingerichtet. Die Anlagenabnahme bleibt offen; Gerätebefehle bleiben gesperrt.';
        loginLink('Zur NexoWatt-Anmeldung');
    }
    let polls = 0, pollDeadline = 0, pollTimer = null, polling = false, finishSubmitted = false;
    function stopPolling() {
        polling = false; clearTimeout(pollTimer); pollTimer = null;
        $('finish-status').textContent = 'Der Abschluss dauert länger. Prüfen Sie den lokalen Gerätestatus; ein Verbindungsabbruch bestätigt keinen erfolgreichen Start.';
    }
    async function poll() {
        const remaining = pollDeadline - performance.now();
        if (!polling || ++polls > 90 || remaining <= 0) { stopPolling(); return; }
        try { await request('/api/session', undefined, Math.min(REQUEST_BUDGET_MS, remaining)); }
        catch (error) { if (error.code === 'SETUP_CLOSED') { polling = false; completed(); return; } }
        if (performance.now() >= pollDeadline) { stopPolling(); return; }
        pollTimer = setTimeout(poll, Math.min(2000, pollDeadline - performance.now()));
    }
    function startPolling() {
        if (polling) return;
        polls = 0; pollDeadline = performance.now() + POLL_BUDGET_MS; polling = true; poll();
    }
    function clearFinishSecrets(form) {
        form.elements.password.value = ''; form.elements.passwordRepeat.value = ''; $('license-token').value = '';
    }
    // A lost finish response is ambiguous: the server may already be committing.
    // Only a fresh authenticated, uncommitted server state permits a manual retry.
    // Never resend passwords or a finish request automatically.
    async function reconcileFinish(error) {
        csrf = null; show('finished'); loginLink('Anmeldeseite zur Statusprüfung öffnen');
        message('Abschlussstatus wird geprüft. Die Einrichtung wird nicht automatisch erneut abgesendet.');
        try {
            const state = await request('/api/session');
            if (state.state === 'claimed' && state.authenticated === true && typeof state.csrf === 'string' && state.csrf) {
                csrf = state.csrf; finishSubmitted = false; show('setup'); failure(error);
                $('review-status').textContent = 'Das Gerät bestätigt eine noch nicht abgeschlossene Einrichtung. Prüfen Sie die Angaben und geben Sie Passwort und gegebenenfalls Lizenz erneut ein, bevor Sie bewusst absenden.';
                return;
            }
        } catch (statusError) {
            if (statusError.code === 'SETUP_CLOSED') { completed(); return; }
        }
        message('Der Abschluss ist noch nicht bestätigt. Es wird ausschließlich der Gerätestatus abgefragt; prüfen Sie bei anhaltendem Fehler den lokalen Gerätezugang.');
        startPolling();
    }
    $('claim-form').addEventListener('submit', async event => {
        event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
        try { const result = await request('/api/claim', { code: $('code').value }); csrf = result.csrf; $('code').value = '';
            await loadCatalog(); show('setup'); message('Gerät übernommen. Diese Sitzung läuft nach 15 Minuten ab.'); }
        catch (error) { failure(error); } finally { button.disabled = false; }
    });
    $('setup-form').addEventListener('submit', async event => {
        event.preventDefault(); if (finishSubmitted) return;
        const form = event.target, button = $('finish-button'); finishSubmitted = true; button.disabled = true;
        try {
            const data = new FormData(form);
            const result = await request('/api/finish', { ...collect(form), password: data.get('password'), passwordRepeat: data.get('passwordRepeat') });
            clearFinishSecrets(form); csrf = null;
            show('finished'); message('Übergabe gespeichert. Ein Verbindungsabbruch bestätigt keinen erfolgreichen Start.');
            $('finish-status').textContent = summary(result); loginLink('Anmeldeseite zur Statusprüfung öffnen'); startPolling();
        } catch (error) { clearFinishSecrets(form); await reconcileFinish(error); }
        finally { button.disabled = finishSubmitted; }
    });
    request('/api/session').then(async result => {
        if (result.authenticated) { csrf = result.csrf; await loadCatalog(); show('setup'); }
        else if (result.state === 'committing') { finishSubmitted = true; show('finished'); loginLink('Anmeldeseite zur Statusprüfung öffnen'); startPolling(); }
        else if (result.state !== 'awaiting-code') { show('claim'); message('Die begonnene Einrichtung benötigt einen neuen Code vom lokalen Gerätezugang.'); }
    }).catch(error => { if (error.code === 'SETUP_CLOSED') completed(); else failure(error); });
})();
