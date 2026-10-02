(() => {
    'use strict';

    const VERSION = 'v91-basic-settings';
    const existing = window.NEXOWATT_EOS_BASIC_SETTINGS;
    if (existing?.version === VERSION) return;
    existing?.destroy?.();

    const script = document.currentScript || document.querySelector('script[src*="eos-basic-settings.js"]');
    const base = new URL('../', script?.src || window.location.href);
    const endpoint = new URL('nexowatt/role-settings/basic', base).href;
    const abort = new AbortController();
    let overlay = null;
    let data = null;
    let saving = false;

    const role = () => window.NEXOWATT_EOS_POLICY_CLIENT?.getPolicy?.()?.role || window.NEXOWATT_EOS_ACCESS_ROLE || 'unknown';
    const text = {
        title: 'Basis-Einstellungen',
        subtitle: 'Installateur – Inbetriebnahme und Fehlersuche',
        note: 'Es werden nur sichere Grundeinstellungen angezeigt. Repositories, Lizenzen, Zertifikate, Zugangsdaten, Let’s Encrypt, Standard-ACL und Expertenmodus bleiben ausschließlich NexoWatt Admin/Service vorbehalten.',
        close: 'Schließen',
        save: 'Speichern',
        saving: 'Speichern …',
        loading: 'Einstellungen werden geladen …',
        saved: 'Einstellungen wurden gespeichert.',
        error: 'Einstellungen konnten nicht geladen werden.',
        siteName: 'Anlagenname',
        language: 'Systemsprache',
        tempUnit: 'Temperatureinheit',
        currency: 'Währungszeichen',
        dateFormat: 'Datumsformat',
        isFloatComma: 'Dezimaltrennzeichen Komma',
        defaultHistory: 'Standard-Historie',
        defaultLogLevel: 'Standard-Protokollstufe für neue Instanzen',
        firstDayOfWeek: 'Erster Tag der Woche',
        country: 'Land',
        city: 'Stadt',
        latitude: 'Breitengrad',
        longitude: 'Längengrad',
        yes: 'Ja',
        no: 'Nein',
        none: 'Keine',
    };

    const create = (tag, className, content) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (content !== undefined) element.textContent = content;
        return element;
    };

    const selectField = (name, label, options, value, labels = {}) => {
        const wrapper = create('label', 'eos-basic-settings-field');
        wrapper.appendChild(create('span', 'eos-basic-settings-label', label));
        const select = create('select');
        select.name = name;
        (options || []).forEach(optionValue => {
            const option = create('option');
            option.value = String(optionValue);
            option.textContent = labels[optionValue] ?? (optionValue === '' ? text.none : String(optionValue));
            option.selected = String(optionValue) === String(value ?? '');
            select.appendChild(option);
        });
        wrapper.appendChild(select);
        return wrapper;
    };

    const inputField = (name, label, value, type = 'text', attributes = {}) => {
        const wrapper = create('label', 'eos-basic-settings-field');
        wrapper.appendChild(create('span', 'eos-basic-settings-label', label));
        const input = create('input');
        input.name = name;
        input.type = type;
        input.value = value ?? '';
        Object.entries(attributes).forEach(([key, attrValue]) => input.setAttribute(key, String(attrValue)));
        wrapper.appendChild(input);
        return wrapper;
    };

    const renderForm = payload => {
        const form = overlay?.querySelector('form');
        if (!form) return;
        form.replaceChildren();
        const settings = payload.settings || {};
        const options = payload.options || {};
        form.append(
            inputField('siteName', text.siteName, settings.siteName, 'text', { maxlength: 120 }),
            selectField('language', text.language, options.languages, settings.language, { de: 'Deutsch', en: 'English', nl: 'Nederlands' }),
            selectField('tempUnit', text.tempUnit, options.tempUnits, settings.tempUnit),
            inputField('currency', text.currency, settings.currency, 'text', { maxlength: 8 }),
            selectField('dateFormat', text.dateFormat, options.dateFormats, settings.dateFormat),
            selectField('isFloatComma', text.isFloatComma, ['true', 'false'], settings.isFloatComma ? 'true' : 'false', { true: text.yes, false: text.no }),
            selectField('defaultHistory', text.defaultHistory, options.histories, settings.defaultHistory),
            selectField('defaultLogLevel', text.defaultLogLevel, options.logLevels, settings.defaultLogLevel),
            selectField('firstDayOfWeek', text.firstDayOfWeek, options.firstDaysOfWeek, settings.firstDayOfWeek, { monday: 'Montag', sunday: 'Sonntag' }),
            inputField('country', text.country, settings.country, 'text', { maxlength: 3 }),
            inputField('city', text.city, settings.city, 'text', { maxlength: 120 }),
            inputField('latitude', text.latitude, settings.latitude, 'number', { min: -90, max: 90, step: '0.000001' }),
            inputField('longitude', text.longitude, settings.longitude, 'number', { min: -180, max: 180, step: '0.000001' }),
        );
    };

    const setStatus = (message, kind = '') => {
        const status = overlay?.querySelector('.eos-basic-settings-status');
        if (!status) return;
        status.textContent = message || '';
        status.dataset.kind = kind;
    };

    const close = () => {
        overlay?.remove();
        overlay = null;
        data = null;
        saving = false;
    };

    const collect = () => {
        const form = overlay?.querySelector('form');
        if (!form) return {};
        const result = {};
        new FormData(form).forEach((value, key) => {
            if (key === 'isFloatComma') result[key] = value === 'true';
            else if (key === 'latitude' || key === 'longitude') result[key] = Number(value);
            else result[key] = String(value);
        });
        return result;
    };

    const save = async () => {
        if (saving || role() !== 'installer') return;
        saving = true;
        const button = overlay?.querySelector('[data-action="save"]');
        if (button) {
            button.disabled = true;
            button.textContent = text.saving;
        }
        setStatus('', '');
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-NexoWatt-EOS-Role-Settings': '1',
                },
                body: JSON.stringify({ settings: collect() }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.error) throw new Error(payload.error || `HTTP ${response.status}`);
            data = payload;
            renderForm(payload);
            setStatus(text.saved, 'success');
        } catch (error) {
            setStatus(`${text.error} ${error?.message || error}`, 'error');
        } finally {
            saving = false;
            if (button) {
                button.disabled = false;
                button.textContent = text.save;
            }
        }
    };

    const open = async () => {
        if (role() !== 'installer') return;
        if (overlay) return;
        overlay = create('div', 'eos-basic-settings-overlay');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', text.title);
        const dialog = create('section', 'eos-basic-settings-dialog');
        const header = create('header', 'eos-basic-settings-header');
        const titleWrap = create('div');
        titleWrap.append(create('h2', '', text.title), create('p', '', text.subtitle));
        const closeButton = create('button', 'eos-basic-settings-close', '×');
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', text.close);
        closeButton.addEventListener('click', close);
        header.append(titleWrap, closeButton);
        const note = create('div', 'eos-basic-settings-note', text.note);
        const form = create('form', 'eos-basic-settings-form');
        form.addEventListener('submit', event => { event.preventDefault(); void save(); });
        const status = create('div', 'eos-basic-settings-status');
        const actions = create('footer', 'eos-basic-settings-actions');
        const cancel = create('button', 'eos-basic-settings-secondary', text.close);
        cancel.type = 'button';
        cancel.addEventListener('click', close);
        const saveButton = create('button', 'eos-basic-settings-primary', text.save);
        saveButton.type = 'submit';
        saveButton.dataset.action = 'save';
        actions.append(cancel, saveButton);
        dialog.append(header, note, form, status, actions);
        overlay.appendChild(dialog);
        overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
        document.body.appendChild(overlay);
        setStatus(text.loading, 'loading');
        try {
            const response = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.error) throw new Error(payload.error || `HTTP ${response.status}`);
            data = payload;
            renderForm(payload);
            setStatus('', '');
            overlay.querySelector('input,select')?.focus();
        } catch (error) {
            setStatus(`${text.error} ${error?.message || error}`, 'error');
            saveButton.disabled = true;
        }
    };

    const keyHandler = event => {
        if (event.key === 'Escape' && overlay) close();
    };
    document.addEventListener('keydown', keyHandler, { signal: abort.signal });

    window.NEXOWATT_EOS_BASIC_SETTINGS = Object.freeze({
        version: VERSION,
        open,
        close,
        destroy() {
            close();
            abort.abort();
        },
    });
})();
