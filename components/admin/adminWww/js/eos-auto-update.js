(() => {
    'use strict';

    const VERSION = 'v7103-system-settings-only';
    const ROOT_ID = 'eos-nexowatt-auto-update';
    const SYSTEM_DIALOG_SELECTOR = '[role="dialog"][aria-labelledby="system-settings-dialog-title"]';
    const script = document.currentScript;
    const API = new URL('../nexowatt/updates/', script?.src || document.baseURI).href;

    let busy = false;
    let lastLoad = 0;
    let latestStatus = null;
    let pollTimer = 0;

    const role = () => String(window.NEXOWATT_EOS_ACCESS_ROLE || 'admin').toLowerCase();
    const esc = value =>
        String(value ?? '').replace(/[&<>'"]/g, char =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char],
        );
    const formatTime = value =>
        value
            ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
            : '–';

    const getSystemSettingsMount = () => {
        const dialog = document.querySelector(SYSTEM_DIALOG_SELECTOR);
        if (!dialog) return null;

        const content = dialog.querySelector('.MuiDialogContent-root');
        if (!content) return null;

        const appBar = Array.from(content.children).find(element => element.classList?.contains('MuiAppBar-root')) ||
            content.querySelector('.MuiAppBar-root');

        return { dialog, content, appBar };
    };

    const systemSettingsActive = () => Boolean(getSystemSettingsMount());

    const ensureRoot = () => {
        const existing = document.getElementById(ROOT_ID);
        if (role() !== 'admin') {
            existing?.remove();
            return null;
        }

        const mount = getSystemSettingsMount();
        if (!mount) {
            existing?.remove();
            return null;
        }

        if (existing && mount.content.contains(existing)) return existing;
        existing?.remove();

        const root = document.createElement('section');
        root.id = ROOT_ID;
        root.className = 'eos-nexowatt-auto-update';
        root.dataset.context = 'system-settings';
        root.setAttribute('data-eos-system-settings-only', 'true');
        root.setAttribute('aria-label', 'NexoWatt Stable-Update-Einstellungen');

        if (mount.appBar?.parentElement === mount.content) {
            mount.content.insertBefore(root, mount.appBar.nextSibling);
        } else {
            mount.content.prepend(root);
        }
        return root;
    };

    const render = status => {
        latestStatus = { ...(latestStatus || {}), ...(status || {}) };
        const root = ensureRoot();
        if (!root) return;

        const enabled = latestStatus?.enabled === true && latestStatus?.blocked !== true;
        const blocked = latestStatus?.blocked !== false;
        const managed = Array.isArray(latestStatus?.managedAdapters) ? latestStatus.managedAdapters : [];
        const rawError = String(latestStatus?.error || '');
        const error = rawError === 'UNATTENDED_UPDATES_BLOCKED_UNVERIFIED_RELEASE'
            ? 'Automatische Installation bleibt bis zur Sicherheitsfreigabe gesperrt.'
            : rawError === 'UNATTENDED_UPDATE_MIGRATION_FAILED'
                ? 'Die bisherigen Update-Einstellungen konnten nicht sicher umgestellt werden. Bitte die Administrator-Diagnose prüfen.' : rawError;

        root.dataset.enabled = String(enabled);
        root.innerHTML = `<div class="eos-nau-copy"><span class="eos-nau-eyebrow">NexoWatt Stable</span><h2>Automatische Adapter-Updates</h2><p>${enabled ? 'Installierte NexoWatt-Adapter werden automatisch aktualisiert, sobald im erkannten Stable-Repository eine neuere stabile Version verfügbar ist.' : 'Unbeaufsichtigte Adapter-Installation ist gesperrt, bis die Herkunft und Integrität freigegebener Versionen nachgewiesen sind. Manuelle, geprüfte Updates durch den Administrator bleiben möglich.'}</p><div class="eos-nau-meta"><span>Repository: <strong>${esc(latestStatus?.repository || 'wird erkannt')}</strong></span><span>Letzter Abgleich: <strong>${esc(formatTime(latestStatus?.lastSync))}</strong></span><span>Richtlinie: <strong>manuelle geprüfte Freigabe</strong></span></div>${managed.length ? `<div class="eos-nau-adapters">${managed.map(name => `<span>${esc(name)}</span>`).join('')}</div>` : ''}${error ? `<div class="eos-nau-error">${esc(error)}</div>` : ''}</div><label class="eos-nau-switch"><input type="checkbox" ${enabled ? 'checked' : ''} ${busy || blocked ? 'disabled' : ''}><span class="eos-nau-track"><span class="eos-nau-thumb"></span></span><strong>${enabled ? 'Aktiv' : 'Deaktiviert'}</strong><small>${blocked ? 'Sicherheitsfreigabe erforderlich' : 'durch Administrator änderbar'}</small></label>`;
        root.querySelector('input')?.addEventListener('change', event => void save(Boolean(event.currentTarget.checked)));
    };

    const request = async (path, options = {}) => {
        const response = await fetch(new URL(path, API), {
            cache: 'no-store',
            credentials: 'same-origin',
            ...options,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        return data;
    };

    const load = async (force = false) => {
        if (role() !== 'admin' || !systemSettingsActive()) {
            ensureRoot();
            return;
        }
        if (!force && Date.now() - lastLoad < 5000) return;

        lastLoad = Date.now();
        try {
            render(await request('status'));
        } catch (error) {
            render({ enabled: false, blocked: true, error: error?.message || error });
        }
    };

    const save = async enabled => {
        if (busy || latestStatus?.blocked !== false) return;
        busy = true;
        render({ enabled, error: '' });

        try {
            latestStatus = await request('settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-NexoWatt-EOS-Auto-Update': '1',
                },
                body: JSON.stringify({ enabled }),
            });
        } catch (error) {
            latestStatus = { ...(latestStatus || {}), enabled: !enabled, error: error?.message || error };
        } finally {
            busy = false;
            render(latestStatus || { enabled });
        }
    };

    let scheduled = false;
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            void load();
        });
    };

    const start = () => {
        void load();
        window.addEventListener('hashchange', () => {
            lastLoad = 0;
            schedule();
        });
        window.addEventListener('nexowatt-eos-admin-socket-ready', schedule);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') schedule();
        });

        new MutationObserver(() => {
            const root = document.getElementById(ROOT_ID);
            const settingsOpen = systemSettingsActive();
            if ((settingsOpen && !root) || (!settingsOpen && root)) schedule();
        }).observe(document.documentElement, { childList: true, subtree: true });

        pollTimer = window.setInterval(() => void load(true), 30000);
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', start, { once: true })
        : start();

    window.NEXOWATT_EOS_AUTO_UPDATE_UI = Object.freeze({
        version: VERSION,
        refresh: load,
        location: 'system-settings',
    });
})();
