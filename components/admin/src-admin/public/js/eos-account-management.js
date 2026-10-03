(() => {
    'use strict';

    const VERSION = 'v98-account-management-real-password-write';
    const script = document.currentScript || document.querySelector('script[src*="eos-account-management.js"]');
    const base = new URL('../', script?.src || window.location.href);
    const abort = new AbortController();
    const state = { role: 'unknown', policy: null, overlay: null, entry: null, unsubscribe: null, observer: null };

    const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
    const language = () => {
        const value = String(navigator.language || 'de').toLowerCase();
        return value.startsWith('nl') ? 'nl' : value.startsWith('en') ? 'en' : 'de';
    };
    const i18n = {
        de: {
            launcher: 'Zugänge', titleAdmin: 'Zugänge & Rollen', titleInstaller: 'Endkunden-Zugänge',
            introAdmin: 'Setze Installateur- oder Endkundenzugänge sicher auf die einmalige Erstanmeldung zurück.',
            introInstaller: 'Du kannst Endkundenzugänge zurücksetzen. Admin- und Installateurzugänge bleiben NexoWatt Service vorbehalten.',
            loading: 'Zugänge werden geladen …', empty: 'Keine passenden Konten gefunden.', close: 'Schließen', refresh: 'Aktualisieren',
            installer: 'Installateur', enduser: 'Endkunde / Gast', active: 'Passwort aktiv', first: 'Erstanmeldung offen', disabled: 'Deaktiviert',
            reset: 'Passwort zurücksetzen', resetting: 'Wird zurückgesetzt …', resetConfirm: name => `Soll der Zugang „${name}“ wirklich zurückgesetzt werden? Das bisherige Passwort wird ungültig. Es wird ein neues zufälliges Startpasswort erzeugt und einmalig angezeigt. Beim nächsten Login muss ein persönliches Passwort vergeben werden.`,
            resetDone: name => `Der Zugang „${name}“ ist zurückgesetzt. Dieses zufällige Startpasswort sicher weitergeben; beim nächsten Login muss ein persönliches Passwort festgelegt werden:`,
            resetFailed: 'Der Zugang konnte nicht zurückgesetzt werden.', permissionError: 'Für dieses Konto ist das Zurücksetzen nicht erlaubt.', originError: 'Die Sicherheitsprüfung der Anfrage ist fehlgeschlagen. Seite mit Strg+F5 neu laden.', disabledError: 'Das Konto ist deaktiviert und kann nicht zurückgesetzt werden.', notFoundError: 'Das Konto wurde nicht gefunden.', writeError: 'Das neue Startpasswort konnte nicht in das Benutzerkonto geschrieben werden.', lastSet: 'Letzte Passwortvergabe', lastReset: 'Letzter Reset', by: 'durch',
            security: 'Admin/Service darf Installateur und Endkunde zurücksetzen. Installateure dürfen ausschließlich Endkunden zurücksetzen.',
        },
        en: {
            launcher: 'Accounts', titleAdmin: 'Accounts & roles', titleInstaller: 'End-user accounts',
            introAdmin: 'Securely reopen one-time first activation for installer or end-user accounts.',
            introInstaller: 'You may reset end-user accounts. Admin and installer accounts remain reserved for NexoWatt Service.',
            loading: 'Loading accounts …', empty: 'No matching accounts found.', close: 'Close', refresh: 'Refresh',
            installer: 'Installer', enduser: 'End user / Guest', active: 'Password active', first: 'First activation open', disabled: 'Disabled',
            reset: 'Reset password', resetting: 'Resetting …', resetConfirm: name => `Reset account “${name}”? The current password becomes invalid. A random temporary password will be shown once. A personal password is required at the next login.`,
            resetDone: name => `Account “${name}” was reset. Share this temporary password securely; a personal password is required at the next login:`,
            resetFailed: 'The account could not be reset.', permissionError: 'Reset is not permitted for this account.', originError: 'The request security check failed. Reload the page with Ctrl+F5.', disabledError: 'The account is disabled and cannot be reset.', notFoundError: 'The account was not found.', writeError: 'The initial password could not be written to the user account.', lastSet: 'Last password setup', lastReset: 'Last reset', by: 'by',
            security: 'Admin/Service may reset installer and end-user accounts. Installers may reset end-user accounts only.',
        },
        nl: {
            launcher: 'Toegangen', titleAdmin: 'Toegangen & rollen', titleInstaller: 'Eindgebruikerstoegangen',
            introAdmin: 'Open de eenmalige eerste activering veilig opnieuw voor installateur- of eindgebruikersaccounts.',
            introInstaller: 'Je kunt eindgebruikersaccounts resetten. Admin- en installateurstoegang blijft voor NexoWatt Service.',
            loading: 'Toegangen worden geladen …', empty: 'Geen passende accounts gevonden.', close: 'Sluiten', refresh: 'Vernieuwen',
            installer: 'Installateur', enduser: 'Eindgebruiker / Guest', active: 'Wachtwoord actief', first: 'Eerste activering open', disabled: 'Uitgeschakeld',
            reset: 'Wachtwoord resetten', resetting: 'Wordt gereset …', resetConfirm: name => `Account „${name}“ resetten? Het huidige wachtwoord wordt ongeldig. Een willekeurig tijdelijk wachtwoord wordt eenmaal getoond. Stel bij de volgende aanmelding een persoonlijk wachtwoord in.`,
            resetDone: name => `Account „${name}“ is gereset. Deel dit tijdelijke wachtwoord veilig; stel bij de volgende aanmelding een persoonlijk wachtwoord in:`,
            resetFailed: 'Het account kon niet worden gereset.', permissionError: 'Resetten is voor dit account niet toegestaan.', originError: 'De veiligheidscontrole van het verzoek is mislukt. Herlaad de pagina met Ctrl+F5.', disabledError: 'Het account is uitgeschakeld en kan niet worden gereset.', notFoundError: 'Het account werd niet gevonden.', writeError: 'Het startwachtwoord kon niet naar het gebruikersaccount worden geschreven.', lastSet: 'Laatste wachtwoordinstelling', lastReset: 'Laatste reset', by: 'door',
            security: 'Admin/service mag installateur- en eindgebruikersaccounts resetten. Installateurs alleen eindgebruikers.',
        },
    };
    const t = () => i18n[language()];
    const accountErrorText = code => {
        const text = t();
        return ({
            permissionError: text.permissionError,
            invalidRequestOrigin: text.originError,
            accountDisabled: text.disabledError,
            accountNotFound: text.notFoundError,
            passwordApiUnavailable: text.writeError,
            passwordWriteFailed: text.writeError,
            passwordVerificationFailed: text.writeError,
            userObjectUnavailableAfterPasswordChange: text.writeError,
        })[String(code || '')] || text.resetFailed;
    };
    const roleFromPolicy = policy => {
        const raw = normalize(policy?.role || '');
        if (policy?.isAdmin || policy?.isEosAdminGroup || /admin|service/.test(raw)) return 'admin';
        if (policy?.isInstaller || /installateur|installer|techniker|inbetriebnahme/.test(raw)) return 'installer';
        return 'enduser';
    };
    const isLogin = () => /(?:^|[?&])login(?:[=&]|$)/i.test(window.location.search || '');
    const formatDate = value => {
        if (!value) return '';
        try { return new Intl.DateTimeFormat(language() === 'de' ? 'de-DE' : language() === 'nl' ? 'nl-NL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
        catch (_) { return String(value); }
    };

    const currentRoute = () => String(window.location.hash || '').match(/tab-[a-z0-9_-]+(?:-\d+)?/i)?.[0]?.toLowerCase() || 'tab-intro';
    const removeEntry = () => {
        state.entry?.remove();
        state.entry = null;
        document.documentElement.classList.remove('eos-account-page-active', 'eos-account-page-installer');
    };
    const ensureEntrySurface = () => {
        if (isLogin() || !['admin', 'installer'].includes(state.role) || currentRoute() !== 'tab-users') {
            removeEntry();
            return;
        }
        const paper = document.getElementById('app-paper');
        if (!paper) return;
        document.documentElement.classList.add('eos-account-page-active');
        document.documentElement.classList.toggle('eos-account-page-installer', state.role === 'installer');
        if (state.entry?.isConnected && paper.contains(state.entry)) return;
        const text = t();
        const entry = document.createElement('section');
        entry.className = 'eos-account-management-entry';
        entry.innerHTML = `
            <div class="eos-account-management-entry-copy">
                <div class="eos-account-management-kicker">NexoWatt EOS</div>
                <h1>${state.role === 'admin' ? text.titleAdmin : text.titleInstaller}</h1>
                <p>${state.role === 'admin' ? text.introAdmin : text.introInstaller}</p>
                <div class="eos-account-management-entry-security">${text.security}</div>
            </div>
            <button type="button" class="eos-account-management-entry-button">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0v1H5v-1Zm14.5-8.5h-2v-2h-2v2h-2v2h2v2h2v-2h2v-2Z"/></svg>
                <span>${state.role === 'admin' ? text.titleAdmin : text.titleInstaller}</span>
            </button>`;
        entry.querySelector('button').addEventListener('click', open);
        paper.appendChild(entry);
        state.entry = entry;
    };

    const close = () => { state.overlay?.remove(); state.overlay = null; };
    const setStatus = (message, kind = '') => {
        const status = state.overlay?.querySelector('.eos-account-management-status');
        if (!status) return;
        status.textContent = message || '';
        status.dataset.kind = kind;
    };

    const createAccountRow = (account, data) => {
        const tr = document.createElement('article');
        tr.className = 'eos-account-row';
        const head = document.createElement('div');
        head.className = 'eos-account-row-main';
        const avatar = document.createElement('div');
        avatar.className = `eos-account-avatar eos-account-avatar-${account.role}`;
        avatar.textContent = String(account.displayName || account.userName || '?').trim().slice(0, 1).toUpperCase();
        const meta = document.createElement('div');
        meta.className = 'eos-account-meta';
        const name = document.createElement('strong');
        name.textContent = account.displayName || account.userName;
        const sub = document.createElement('span');
        sub.textContent = `${account.userName} · ${account.role === 'installer' ? t().installer : t().enduser}`;
        meta.append(name, sub);
        const badge = document.createElement('span');
        badge.className = `eos-account-status-badge ${account.enabled === false ? 'disabled' : account.firstLoginRequired ? 'pending' : 'active'}`;
        badge.textContent = account.enabled === false ? t().disabled : account.firstLoginRequired ? t().first : t().active;
        head.append(avatar, meta, badge);

        const details = document.createElement('div');
        details.className = 'eos-account-details';
        if (account.passwordSetAt) {
            const item = document.createElement('span'); item.textContent = `${t().lastSet}: ${formatDate(account.passwordSetAt)}`; details.appendChild(item);
        }
        if (account.passwordResetAt) {
            const item = document.createElement('span'); item.textContent = `${t().lastReset}: ${formatDate(account.passwordResetAt)}${account.passwordResetBy ? ` ${t().by} ${String(account.passwordResetBy).replace(/^system\.user\./, '')}` : ''}`; details.appendChild(item);
        }
        const actions = document.createElement('div');
        actions.className = 'eos-account-actions';
        const reset = document.createElement('button');
        reset.type = 'button'; reset.className = 'eos-account-reset'; reset.textContent = t().reset;
        const mayReset = account.role === 'enduser' || data.canResetInstaller === true;
        reset.disabled = !mayReset || (account.enabled === false && !(account.migrationDisabled && state.role === 'admin'));
        reset.addEventListener('click', async () => {
            const label = account.displayName || account.userName;
            if (!window.confirm(t().resetConfirm(label))) return;
            reset.disabled = true; reset.textContent = t().resetting; setStatus('', '');
            try {
                const response = await fetch(new URL('nexowatt/account/reset', base).href, {
                    method: 'POST', credentials: 'include', cache: 'no-store',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-NexoWatt-EOS-Account-Reset': '1' },
                    body: JSON.stringify({ user: account.id }),
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || payload.error) throw new Error(accountErrorText(payload.error));
                await loadAccounts();
                setStatus(`${t().resetDone(label)} ${payload.temporaryPassword || ''}`, 'success');
            } catch (error) {
                reset.disabled = false; reset.textContent = t().reset;
                setStatus(error?.message || t().resetFailed, 'error');
            }
        });
        actions.appendChild(reset);
        tr.append(head, details, actions);
        return tr;
    };

    const renderAccounts = data => {
        if (!state.overlay) return;
        const list = state.overlay.querySelector('.eos-account-list');
        list.replaceChildren();
        if (!Array.isArray(data.accounts) || !data.accounts.length) {
            const empty = document.createElement('div'); empty.className = 'eos-account-empty'; empty.textContent = t().empty; list.appendChild(empty); return;
        }
        data.accounts.forEach(account => list.appendChild(createAccountRow(account, data)));
    };

    const loadAccounts = async () => {
        if (!state.overlay) return;
        setStatus(t().loading, '');
        try {
            const response = await fetch(new URL('nexowatt/account/manage', base).href, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.error) throw new Error(data.error || t().resetFailed);
            renderAccounts(data); setStatus('', '');
        } catch (error) {
            setStatus(error?.message || t().resetFailed, 'error');
        }
    };

    const open = () => {
        if (!['admin', 'installer'].includes(state.role) || state.overlay) return;
        const text = t();
        const overlay = document.createElement('main');
        overlay.className = 'eos-account-management-overlay';
        overlay.innerHTML = `
            <section class="eos-account-management-dialog" role="dialog" aria-modal="true" aria-labelledby="eos-account-management-title">
                <header><div><div class="eos-account-management-kicker">NexoWatt EOS</div><h2 id="eos-account-management-title"></h2><p></p></div><button class="eos-account-management-close" type="button" aria-label="${text.close}">×</button></header>
                <div class="eos-account-management-security"></div>
                <div class="eos-account-management-status" aria-live="polite"></div>
                <div class="eos-account-list"></div>
                <footer><button class="eos-account-refresh" type="button"></button><button class="eos-account-close-secondary" type="button"></button></footer>
            </section>`;
        document.body.appendChild(overlay); state.overlay = overlay;
        overlay.querySelector('h2').textContent = state.role === 'admin' ? text.titleAdmin : text.titleInstaller;
        overlay.querySelector('header p').textContent = state.role === 'admin' ? text.introAdmin : text.introInstaller;
        overlay.querySelector('.eos-account-management-security').textContent = text.security;
        if (state.role === 'admin') {
            const invite = document.createElement('form');
            invite.className = 'eos-account-invitation';
            invite.innerHTML = '<h3>Persönliches Konto einladen</h3><p>Der Empfänger vergibt sein Passwort selbst. Der einmalige Einladungscode gilt 30 Minuten.</p><label>Benutzername <input name="username" required pattern="[a-z][a-z0-9_-]{2,31}" maxlength="32" autocomplete="off"></label> <label>Rolle <select name="role"><option value="enduser">Benutzer</option><option value="installer">Installateur</option></select></label> <button type="submit">Einladung erstellen</button>';
            invite.addEventListener('submit', async event => {
                event.preventDefault();
                const button = invite.querySelector('button');
                button.disabled = true;
                try {
                    const response = await fetch(new URL('nexowatt/account/invite', base).href, {
                        method: 'POST', credentials: 'include', cache: 'no-store',
                        headers: { 'Content-Type': 'application/json', 'X-NexoWatt-EOS-Invitation': '1' },
                        body: JSON.stringify(Object.fromEntries(new FormData(invite))),
                    });
                    const payload = await response.json();
                    if (!response.ok || !payload.code) throw new Error('Einladung konnte nicht erstellt werden. Benutzername, abgeschlossene Einrichtung und Berechtigung prüfen.');
                    await loadAccounts();
                    // Nur Textausgabe; weder Passwort noch Code in URL oder Browserstorage.
                    setStatus(`Einladung für ${payload.username}: ${payload.code}. Sicher an den Empfänger übergeben. Persönliches Passwort unter ${new URL(payload.acceptancePath, base).href} setzen. Gültig bis ${formatDate(payload.expiresAt)}.`, 'success');
                    invite.reset();
                } catch (error) { setStatus(error.message || 'Einladung fehlgeschlagen.', 'error'); }
                finally { button.disabled = false; }
            });
            overlay.querySelector('.eos-account-management-security').after(invite);
        }
        overlay.querySelector('.eos-account-refresh').textContent = text.refresh;
        overlay.querySelector('.eos-account-close-secondary').textContent = text.close;
        overlay.querySelector('.eos-account-management-close').onclick = close;
        overlay.querySelector('.eos-account-close-secondary').onclick = close;
        overlay.querySelector('.eos-account-refresh').onclick = loadAccounts;
        overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
        window.addEventListener('keydown', event => { if (event.key === 'Escape') close(); }, { once: true });
        void loadAccounts();
    };

    const applyPolicy = policy => {
        if (!policy || policy.authenticated === false) return;
        state.policy = policy; state.role = roleFromPolicy(policy);
        ensureEntrySurface();
    };
    const connect = () => {
        const client = window.NEXOWATT_EOS_POLICY_CLIENT;
        if (!client) { setTimeout(connect, 180); return; }
        applyPolicy(client.getPolicy?.() || window.NEXOWATT_EOS_BOOTSTRAP_POLICY);
        state.unsubscribe?.(); state.unsubscribe = client.subscribe?.(applyPolicy);
    };
    const observe = () => {
        const coordinator = window.NEXOWATT_EOS_DOM_COORDINATOR;
        if (coordinator?.subscribe) {
            state.observer = coordinator.subscribe(() => ensureEntrySurface());
            return;
        }
        // The native shell owns the only broad DOM observer. Until it is ready, bounded retries keep
        // this optional launcher current without adding a second full-document MutationObserver.
        [400, 1200, 2600, 5000].forEach(delay => window.setTimeout(ensureEntrySurface, delay));
    };
    const start = () => { connect(); observe(); window.addEventListener('hashchange', ensureEntrySurface, { signal: abort.signal }); [250, 900, 1800].forEach(delay => setTimeout(ensureEntrySurface, delay)); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();

    window.NEXOWATT_EOS_ACCOUNT_MANAGEMENT = Object.freeze({ version: VERSION, open, close, refresh: loadAccounts, refreshEntry: ensureEntrySurface });
})();
