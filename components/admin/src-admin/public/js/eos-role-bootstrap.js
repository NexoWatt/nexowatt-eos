(() => {
    'use strict';

    const VERSION = 'v20261001-scoped-role-portal';
    const script = document.currentScript || document.querySelector('script[src*="eos-role-bootstrap.js"]');
    const entry = script?.dataset?.eosEntry || '';
    let launched = false;

    const normalize = value => String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9#/_:.-]+/g, ' ')
        .trim();

    const roleFromPolicy = policy => {
        const raw = normalize(policy?.role || policy?.eosRole || policy?.accessRole || '');
        if (policy?.user === 'system.user.admin' || policy?.userId === 'system.user.admin' || policy?.isAdmin || policy?.isEosAdminGroup || policy?.isAdministrator || /^(?:admin|administrator)$/.test(raw)) return 'admin';
        if (/nexowatt service|eos service|service admin|service administrator/.test(raw)) return 'admin';
        if (policy?.isInstaller || /installateur|installer|installation|inbetriebnahme|techniker|technician|integrator|partner/.test(raw)) return 'installer';
        return 'enduser';
    };

    const isCustomerBackupTab = tab => /^(?:tab-)?(?:nexowatt-backup|eos-backup|nexowatt-sicherung)(?:-|$)/.test(normalize(tab));
    const isReleasedEndUserTab = tab => /^(?:tab-)?(?:nexowatt-ui|nexowatt-cockpit|eos-cockpit|eos-dashboard|kunden-cockpit|endkunden-cockpit|lovelace|jarvis|vis|iqontrol|material)(?:-|$)/.test(normalize(tab));
    const isOfficialReserveTab = tab => /^(?:tab-)?(?:admin|backitup)(?:-\d+)?$/.test(normalize(tab));
    const isGloballyHiddenTab = tab => normalize(tab) === 'tab-enums';
    const isInstallerDenied = tab => /(?:tab-users|tab-hosts|tab-files|tab-xterm|tab-xtrem|tab-system|users|hosts|files|console|terminal|security)/.test(normalize(tab)) || isOfficialReserveTab(tab);
    const isAllowed = (role, route) => route !== 'easy' && !isGloballyHiddenTab(route) && (role === 'admin'
        || (role === 'installer'
            ? route === 'tab-intro' || isCustomerBackupTab(route) || !isInstallerDenied(route)
            : route === 'tab-intro' || route === 'tab-objects' || isCustomerBackupTab(route) || isReleasedEndUserTab(route)));
    const defaultTab = () => 'tab-intro';
    const currentRoute = () => {
        const hash = decodeURIComponent(window.location.hash || '').toLowerCase();
        if (/^#\/?easy(?:[/?&]|$)/.test(hash)) return 'easy';
        const direct = hash.match(/^#\/?(system|users|hosts|files|objects|instances|adapters|logs|enums)(?:[/?&]|$)/);
        if (direct) return `tab-${direct[1]}`;
        const match = hash.match(/tab-[a-z0-9_-]+(?:-\d+)?/i);
        return match ? match[0].toLowerCase() : 'tab-intro';
    };
    const navigate = route => { window.location.hash = `#${route === 'easy' ? 'tab-intro' : route}`; };

    const lockExpertMode = role => {
        if (role === 'admin') return;
        for (const storage of [window._sessionStorage || window.sessionStorage, window._localStorage || window.localStorage]) {
            try {
                storage.setItem('App.expertMode', 'false');
                storage.removeItem('App.doNotShowExpertDialog');
            } catch (_) { /* storage can be disabled */ }
        }
    };

    const launch = () => {
        if (launched || !entry) return;
        launched = true;
        window.NEXOWATT_EOS_APP_BOOTSTRAPPED = true;
        const module = document.createElement('script');
        module.type = 'module';
        module.src = entry;
        module.crossOrigin = 'anonymous';
        module.onerror = () => {
            launched = false;
            console.error(`Cannot load NexoWatt EOS frontend entry: ${entry}`);
        };
        document.head.appendChild(module);
    };

    const language = () => {
        const value = String(navigator.language || 'de').toLowerCase();
        return value.startsWith('nl') ? 'nl' : value.startsWith('en') ? 'en' : 'de';
    };
    const translations = {
        de: {
            title: 'Persönliches Passwort festlegen',
            intro: 'Bei der ersten Anmeldung muss für dieses Konto ein eigenes Passwort vergeben werden. Erst danach wird NexoWatt EOS freigeschaltet.',
            account: 'Konto', password: 'Neues Passwort', repeat: 'Passwort wiederholen', show: 'Passwort anzeigen',
            submit: 'Passwort speichern', saving: 'Passwort wird gespeichert …', logout: 'Abmelden',
            rules: min => `Mindestens ${min}, höchstens 128 Zeichen. Eine lange, einzigartige Passphrase ist möglich.`,
            required: 'Bitte beide Passwortfelder ausfüllen.', mismatch: 'Die Passwörter stimmen nicht überein.',
            length: min => `Das Passwort muss mindestens ${min} Zeichen lang sein.`, complexity: 'Groß-/Kleinbuchstabe, Zahl und Sonderzeichen sind erforderlich.',
            easy: 'Das Passwort ist zu leicht oder enthält den Kontonamen.', generic: 'Das Passwort konnte nicht gespeichert werden.', success: 'Passwort gespeichert. Die Anmeldung wird neu gestartet …',
            securityTitle: 'Zugriff wird geprüft', securityIntro: 'Die sichere Anmeldung wird gerade geprüft. Die Oberfläche bleibt gesperrt, bis die Berechtigungen eindeutig geladen wurden.',
            securityRetry: 'Jetzt erneut prüfen', securityLogout: 'Zur Anmeldung', securityAuto: seconds => `Automatischer neuer Versuch in ${seconds} Sekunden …`,
            claimLauncher: 'Erstanmeldung', claimTitle: 'Konto erstmals aktivieren',
            claimIntro: 'Wähle Installateur oder Gast/Endkunde und melde dich bei der allerersten Anmeldung einmalig mit leerem Passwort an. Danach muss sofort ein persönliches Passwort vergeben werden.',
            claimAccount: 'Kontoname', claimContinue: 'Erstanmeldung starten', claimChecking: 'Konto wird geprüft …',
            claimHint: 'Bei der ersten Anmeldung das Passwortfeld leer lassen.', claimAlreadyActive: 'Für dieses Konto ist bereits ein persönliches Passwort gesetzt. Bitte Passwort eingeben.', claimStatusError: 'Der Status der Erstanmeldung konnte nicht geprüft werden.', claimUnavailable: 'Die Erstanmeldung ist für dieses Konto nicht verfügbar oder wurde bereits abgeschlossen.',
            claimPrivate: 'Die Erstanmeldung ist nur im lokalen Netzwerk möglich.', claimExpired: 'Die Aktivierung ist abgelaufen. Bitte erneut starten.',
            claimReady: 'Konto bestätigt. Lege jetzt dein persönliches Passwort fest.', claimSuccess: 'Passwort gespeichert. Du kannst dich jetzt normal anmelden.',
            claimLogin: 'Zur normalen Anmeldung', claimBack: 'Zurück',
        },
        en: {
            title: 'Create your personal password',
            intro: 'At the first sign-in, this account must choose its own password. NexoWatt EOS opens only after that step.',
            account: 'Account', password: 'New password', repeat: 'Repeat password', show: 'Show password',
            submit: 'Save password', saving: 'Saving password …', logout: 'Sign out',
            rules: min => `Between ${min} and 128 characters. A long, unique passphrase is supported.`,
            required: 'Please complete both password fields.', mismatch: 'The passwords do not match.',
            length: min => `The password must contain at least ${min} characters.`, complexity: 'Upper/lower case, a number and a special character are required.',
            easy: 'The password is too easy or contains the account name.', generic: 'The password could not be saved.', success: 'Password saved. Restarting sign-in …',
            securityTitle: 'Checking access', securityIntro: 'The secure sign-in is being verified. The interface stays locked until the permissions are loaded unambiguously.',
            securityRetry: 'Check again now', securityLogout: 'Return to sign-in', securityAuto: seconds => `Retrying automatically in ${seconds} seconds …`,
            claimLauncher: 'First sign-in', claimTitle: 'Activate account for the first time',
            claimIntro: 'Choose Installer or Guest/End User and leave the password field empty for the very first sign-in. A personal password must be created immediately afterwards.',
            claimAccount: 'Account name', claimContinue: 'Start first sign-in', claimChecking: 'Checking account …',
            claimHint: 'Leave the password field empty only for the first sign-in.', claimAlreadyActive: 'This account already has a personal password. Enter the password to sign in.', claimStatusError: 'The first-activation status could not be checked.', claimUnavailable: 'First activation is unavailable for this account or has already been completed.',
            claimPrivate: 'First activation is only available on the local network.', claimExpired: 'The activation has expired. Please start again.',
            claimReady: 'Account confirmed. Create your personal password now.', claimSuccess: 'Password saved. You can now sign in normally.',
            claimLogin: 'Return to normal sign-in', claimBack: 'Back',
        },
        nl: {
            title: 'Persoonlijk wachtwoord instellen',
            intro: 'Bij de eerste aanmelding moet voor dit account een eigen wachtwoord worden gekozen. Daarna wordt NexoWatt EOS geopend.',
            account: 'Account', password: 'Nieuw wachtwoord', repeat: 'Wachtwoord herhalen', show: 'Wachtwoord tonen',
            submit: 'Wachtwoord opslaan', saving: 'Wachtwoord wordt opgeslagen …', logout: 'Afmelden',
            rules: min => `Minimaal ${min} en maximaal 128 tekens. Een lange, unieke wachtwoordzin is mogelijk.`,
            required: 'Vul beide wachtwoordvelden in.', mismatch: 'De wachtwoorden zijn niet gelijk.',
            length: min => `Het wachtwoord moet minimaal ${min} tekens bevatten.`, complexity: 'Hoofdletter, kleine letter, cijfer en speciaal teken zijn verplicht.',
            easy: 'Het wachtwoord is te eenvoudig of bevat de accountnaam.', generic: 'Het wachtwoord kon niet worden opgeslagen.', success: 'Wachtwoord opgeslagen. De aanmelding wordt opnieuw gestart …',
            securityTitle: 'Toegang wordt gecontroleerd', securityIntro: 'De veilige aanmelding wordt gecontroleerd. De interface blijft vergrendeld totdat de rechten eenduidig zijn geladen.',
            securityRetry: 'Nu opnieuw controleren', securityLogout: 'Terug naar aanmelden', securityAuto: seconds => `Automatisch opnieuw proberen over ${seconds} seconden …`,
            claimLauncher: 'Eerste aanmelding', claimTitle: 'Account voor het eerst activeren',
            claimIntro: 'Kies Installateur of Gast/Eindgebruiker en laat bij de allereerste aanmelding het wachtwoordveld leeg. Daarna moet direct een persoonlijk wachtwoord worden ingesteld.',
            claimAccount: 'Accountnaam', claimContinue: 'Eerste aanmelding starten', claimChecking: 'Account wordt gecontroleerd …',
            claimHint: 'Laat het wachtwoordveld alleen bij de eerste aanmelding leeg.', claimAlreadyActive: 'Dit account heeft al een persoonlijk wachtwoord. Voer het wachtwoord in.', claimStatusError: 'De status van de eerste activering kon niet worden gecontroleerd.', claimUnavailable: 'Eerste activering is voor dit account niet beschikbaar of al voltooid.',
            claimPrivate: 'Eerste activering is alleen mogelijk in het lokale netwerk.', claimExpired: 'De activering is verlopen. Start opnieuw.',
            claimReady: 'Account bevestigd. Stel nu je persoonlijke wachtwoord in.', claimSuccess: 'Wachtwoord opgeslagen. Je kunt nu normaal aanmelden.',
            claimLogin: 'Naar normale aanmelding', claimBack: 'Terug',
        },
    };

    const showFirstLoginPassword = (policy, base, ownPassword = false) => {
        const t = translations[language()];
        const passwordSetup = policy?.passwordSetup || {};
        const minLength = Math.max(15, Number(passwordSetup.minLength || 15));
        const userName = String(passwordSetup.userName || policy?.user || '').replace(/^system\.user\./, '') || 'user';
        const endpoint = new URL(ownPassword ? 'nexowatt/account/password' : 'nexowatt/account/first-password', base).href;
        const logoutUrl = new URL('logout', base).href;
        window.NEXOWATT_EOS_PASSWORD_SETUP_ACTIVE = true;
        document.documentElement.classList.add('eos-first-login-active');
        document.body.replaceChildren();
        const overlay = document.createElement('main');
        overlay.className = 'eos-first-login-overlay';
        overlay.dataset.eosAuthBoundary = 'password';
        overlay.innerHTML = `
            <section class="eos-first-login-card" role="dialog" aria-modal="true" aria-labelledby="eos-first-login-title">
                <img class="eos-first-login-logo" src="./img/eos/eos-logo.svg" alt="NexoWatt EOS" />
                <div class="eos-first-login-kicker">Energy Operation System</div>
                <h1 id="eos-first-login-title"></h1>
                <p class="eos-first-login-intro"></p>
                <div class="eos-first-login-account"><span></span><strong></strong></div>
                <form novalidate>
                    <input name="username" type="text" autocomplete="username" hidden />
                    <label><span class="current-password-label"></span><input name="currentPassword" type="password" autocomplete="current-password" maxlength="256" required /></label>
                    <label><span class="password-label"></span><input name="password" type="password" autocomplete="new-password" maxlength="256" required /></label>
                    <label><span class="repeat-label"></span><input name="passwordRepeat" type="password" autocomplete="new-password" maxlength="256" required /></label>
                    <label class="eos-first-login-show"><input name="show" type="checkbox" /><span></span></label>
                    <p class="eos-first-login-rules"></p>
                    <div class="eos-first-login-status" aria-live="polite"></div>
                    <button class="eos-first-login-submit" type="submit"></button>
                    <a class="eos-first-login-logout" href="${logoutUrl}"></a>
                </form>
            </section>`;
        document.body.appendChild(overlay);
        overlay.querySelector('h1').textContent = ownPassword ? ({ de: 'Eigenes Passwort ändern', en: 'Change your own password', nl: 'Eigen wachtwoord wijzigen' })[language()] : t.title;
        overlay.querySelector('.eos-first-login-intro').textContent = ownPassword ? ({ de: 'Bestätige dein aktuelles Passwort und wähle ein neues persönliches Passwort. Danach meldest du dich erneut an.', en: 'Confirm your current password and choose a new personal password. You will then sign in again.', nl: 'Bevestig je huidige wachtwoord en kies een nieuw persoonlijk wachtwoord. Meld je daarna opnieuw aan.' })[language()] : t.intro;
        overlay.querySelector('.eos-first-login-account span').textContent = `${t.account}:`;
        overlay.querySelector('.eos-first-login-account strong').textContent = userName;
        overlay.querySelector('.current-password-label').textContent = ({ de: 'Aktuelles / temporäres Passwort', en: 'Current / temporary password', nl: 'Huidig / tijdelijk wachtwoord' })[language()];
        overlay.querySelector('.password-label').textContent = t.password;
        overlay.querySelector('.repeat-label').textContent = t.repeat;
        overlay.querySelector('.eos-first-login-show span').textContent = t.show;
        overlay.querySelector('.eos-first-login-rules').textContent = t.rules(minLength);
        overlay.querySelector('.eos-first-login-submit').textContent = t.submit;
        overlay.querySelector('.eos-first-login-logout').textContent = t.logout;
        const form = overlay.querySelector('form');
        form.elements.username.value = userName;
        const currentPassword = form.elements.currentPassword;
        const password = form.elements.password;
        const repeat = form.elements.passwordRepeat;
        const show = form.elements.show;
        const status = overlay.querySelector('.eos-first-login-status');
        const submit = overlay.querySelector('.eos-first-login-submit');
        const setStatus = (message, kind = '') => { status.textContent = message || ''; status.dataset.kind = kind; };
        show.addEventListener('change', () => {
            const type = show.checked ? 'text' : 'password';
            password.type = type; repeat.type = type;
        });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!currentPassword.value || !password.value || !repeat.value) return setStatus(t.required, 'error');
            if (password.value !== repeat.value) return setStatus(t.mismatch, 'error');
            const length = Array.from(password.value).length;
            if (length < minLength || length > 128 || new TextEncoder().encode(password.value).length > 256 || /[\u0000-\u001f\u007f]/u.test(password.value)) return setStatus(t.rules(minLength), 'error');
            if (password.value === currentPassword.value) return setStatus(({ de: 'Bitte ein neues persönliches Passwort wählen.', en: 'Choose a new personal password.', nl: 'Kies een nieuw persoonlijk wachtwoord.' })[language()], 'error');
            submit.disabled = true; submit.textContent = t.saving; setStatus('', '');
            try {
                const response = await fetch(endpoint, {
                    method: 'POST', credentials: 'include', cache: 'no-store',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', [ownPassword ? 'X-NexoWatt-EOS-Password' : 'X-NexoWatt-EOS-First-Login']: '1' },
                    body: JSON.stringify({ currentPassword: currentPassword.value, password: password.value, passwordRepeat: repeat.value }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || data.error) {
                    const messages = { currentPasswordRequired: t.required, currentPasswordInvalid: ({ de: 'Das aktuelle / temporäre Passwort ist falsch.', en: 'The current / temporary password is incorrect.', nl: 'Het huidige / tijdelijke wachtwoord is onjuist.' })[language()], passwordRequired: t.required, passwordMismatch: t.mismatch, passwordLength: t.length(minLength), passwordComplexity: t.complexity, passwordTooEasy: t.easy, passwordSetupNotAllowed: t.generic, invalidRequestOrigin: t.generic, passwordApiUnavailable: t.generic, passwordWriteFailed: t.generic, passwordVerificationFailed: t.generic, userObjectUnavailableAfterPasswordChange: t.generic };
                    throw new Error(messages[data.error] || t.generic);
                }
                setStatus(t.success, 'success');
                window.setTimeout(() => window.location.replace(logoutUrl), 650);
            } catch (error) {
                submit.disabled = false; submit.textContent = t.submit;
                setStatus(error?.message || t.generic, 'error');
            }
        });
        window.setTimeout(() => currentPassword.focus(), 0);
    };

    // The service React console needs raw controller objects to initialize. Those
    // objects may contain credentials and are intentionally unavailable to the
    // other roles. Keep their product navigation on the scoped HTTP contracts;
    // showing/hiding these controls never replaces the server's authorization.
    const showProductPortal = (policy, base) => {
        const installer = policy.role === 'installer';
        document.documentElement.classList.add('eos-product-portal-active');
        document.documentElement.classList.remove('eos-first-login-active', 'eos-login');
        document.body.replaceChildren();
        const portal = document.createElement('main');
        portal.className = 'eos-first-login-overlay eos-product-portal';
        portal.id = 'eos-product-portal';
        portal.innerHTML = `
            <section class="eos-first-login-card eos-product-portal-card" aria-labelledby="eos-portal-title">
                <img class="eos-first-login-logo" src="./img/eos/nexowatt-eos-brand-wide.png" alt="NexoWatt EOS" />
                <div class="eos-first-login-kicker">NexoWatt EOS</div>
                <h1 id="eos-portal-title"></h1>
                <p class="eos-first-login-intro">Dein persönlicher Zugang zum EOS-System. Die Service-Verwaltung ist NexoWatt vorbehalten.</p>
                <div class="eos-first-login-account"><span>Konto</span><strong id="eos-portal-account"></strong></div>
                <nav class="eos-portal-actions" aria-label="EOS Bereiche">
                    <a id="eos-portal-cockpit" class="eos-first-login-submit">EOS Cockpit öffnen</a>
                    <a id="eos-portal-password" class="eos-first-login-submit">Eigenes Passwort ändern</a>
                </nav>
                <p class="eos-first-login-rules">Im Cockpit meldest du dich mit deinem persönlichen EOS-Konto an. Dort kannst du auch dein eigenes Passwort ändern.</p>
                <div class="eos-first-login-status" id="eos-portal-status" role="status"></div>
                <a id="eos-portal-logout" class="eos-first-login-logout">Abmelden</a>
            </section>`;
        portal.querySelector('h1').textContent = installer ? 'Installateur' : 'Benutzer';
        portal.querySelector('#eos-portal-account').textContent = String(policy.user || policy.userId || '').replace(/^system\.user\./, '');
        const cockpit = new URL(window.location.href);
        cockpit.protocol = 'https:'; cockpit.port = '8188'; cockpit.pathname = '/'; cockpit.search = ''; cockpit.hash = '';
        portal.querySelector('#eos-portal-cockpit').href = cockpit.href;
        portal.querySelector('#eos-portal-password').href = new URL('index.html?eosPassword=1', base).href;
        portal.querySelector('#eos-portal-logout').href = new URL('logout', base).href;
        if (installer) {
            for (const [id, label, moduleName] of [
                ['settings', 'Basis-Einstellungen', 'NEXOWATT_EOS_BASIC_SETTINGS'],
                ['accounts', 'Benutzerzugänge verwalten', 'NEXOWATT_EOS_ACCOUNT_MANAGEMENT'],
            ]) {
                const button = document.createElement('button');
                button.type = 'button'; button.id = `eos-portal-${id}`;
                button.className = 'eos-first-login-submit'; button.textContent = label;
                button.addEventListener('click', () => {
                    const module = window[moduleName];
                    if (typeof module?.open !== 'function') {
                        portal.querySelector('#eos-portal-status').textContent = 'Der Bereich wird noch geladen. Bitte erneut versuchen.';
                        return;
                    }
                    module.open();
                });
                portal.querySelector('nav').appendChild(button);
            }
        }
        document.body.appendChild(portal);
        window.NEXOWATT_EOS_PRODUCT_PORTAL_ACTIVE = true;
    };

    const installOwnPasswordLink = base => {
        const apply = () => {
            const toolbar = document.querySelector('.MuiAppBar-root .MuiToolbar-root');
            if (!toolbar || document.getElementById('eos-service-own-password')) return;
            const link = document.createElement('a');
            link.id = 'eos-service-own-password'; link.className = 'eos-service-own-password';
            link.href = new URL('index.html?eosPassword=1', base).href;
            link.textContent = 'Eigenes Passwort';
            toolbar.appendChild(link);
        };
        const coordinator = window.NEXOWATT_EOS_DOM_COORDINATOR;
        if (coordinator?.subscribe) { coordinator.subscribe(apply); apply(); }
        else [100, 500, 1500, 4000].forEach(delay => window.setTimeout(apply, delay));
    };

    const showPasswordlessClaimPassword = (claim, base) => {
        const t = translations[language()];
        const minLength = Number(claim?.minLength || 10);
        const endpoint = new URL('nexowatt/account/passwordless-password', base).href;
        const loginUrl = new URL('index.html?login', base).href;
        document.querySelector('.eos-passwordless-claim-overlay')?.remove();
        const overlay = document.createElement('main');
        overlay.className = 'eos-first-login-overlay eos-passwordless-claim-overlay';
        overlay.innerHTML = `
            <section class="eos-first-login-card eos-passwordless-card" role="dialog" aria-modal="true" aria-labelledby="eos-passwordless-password-title">
                <img class="eos-first-login-logo" src="./img/eos/eos-logo.svg" alt="NexoWatt EOS" />
                <div class="eos-first-login-kicker">Energy Operation System</div>
                <div class="eos-activation-steps"><span class="done">1</span><i></i><span class="active">2</span><i></i><span>3</span></div>
                <h1 id="eos-passwordless-password-title"></h1>
                <p class="eos-first-login-intro"></p>
                <div class="eos-first-login-account"><span></span><strong></strong></div>
                <form novalidate>
                    <label><span class="password-label"></span><input name="password" type="password" autocomplete="new-password" maxlength="128" required /></label>
                    <label><span class="repeat-label"></span><input name="passwordRepeat" type="password" autocomplete="new-password" maxlength="128" required /></label>
                    <label class="eos-first-login-show"><input name="show" type="checkbox" /><span></span></label>
                    <p class="eos-first-login-rules"></p>
                    <div class="eos-first-login-status" data-kind="success" aria-live="polite"></div>
                    <button class="eos-first-login-submit" type="submit"></button>
                    <a class="eos-first-login-logout" href="${loginUrl}"></a>
                </form>
            </section>`;
        document.body.appendChild(overlay);
        overlay.querySelector('h1').textContent = t.title;
        overlay.querySelector('.eos-first-login-intro').textContent = t.claimReady;
        overlay.querySelector('.eos-first-login-account span').textContent = `${t.account}:`;
        overlay.querySelector('.eos-first-login-account strong').textContent = claim.userName || 'guest';
        overlay.querySelector('.password-label').textContent = t.password;
        overlay.querySelector('.repeat-label').textContent = t.repeat;
        overlay.querySelector('.eos-first-login-show span').textContent = t.show;
        overlay.querySelector('.eos-first-login-rules').textContent = t.rules(minLength);
        overlay.querySelector('.eos-first-login-submit').textContent = t.submit;
        overlay.querySelector('.eos-first-login-logout').textContent = t.claimBack;
        const form = overlay.querySelector('form');
        const password = form.elements.password;
        const repeat = form.elements.passwordRepeat;
        const show = form.elements.show;
        const status = overlay.querySelector('.eos-first-login-status');
        const submit = overlay.querySelector('.eos-first-login-submit');
        const setStatus = (message, kind = '') => { status.textContent = message || ''; status.dataset.kind = kind; };
        show.addEventListener('change', () => { const type = show.checked ? 'text' : 'password'; password.type = type; repeat.type = type; });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!password.value || !repeat.value) return setStatus(t.required, 'error');
            if (password.value !== repeat.value) return setStatus(t.mismatch, 'error');
            if (password.value.length < minLength) return setStatus(t.length(minLength), 'error');
            if (!/[a-z]/.test(password.value) || !/[A-Z]/.test(password.value) || !/\d/.test(password.value) || !/[^A-Za-z0-9]/.test(password.value)) return setStatus(t.complexity, 'error');
            submit.disabled = true; submit.textContent = t.saving; setStatus('', '');
            try {
                const response = await fetch(endpoint, {
                    method: 'POST', credentials: 'include', cache: 'no-store',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-NexoWatt-EOS-Passwordless-Password': '1' },
                    body: JSON.stringify({ password: password.value, passwordRepeat: repeat.value }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || data.error) {
                    const messages = { passwordRequired: t.required, passwordMismatch: t.mismatch, passwordLength: t.length(minLength), passwordComplexity: t.complexity, passwordTooEasy: t.easy, claimExpired: t.claimExpired };
                    throw new Error(messages[data.error] || t.generic);
                }
                overlay.querySelector('.eos-activation-steps span:nth-of-type(2)')?.classList.add('done');
                overlay.querySelector('.eos-activation-steps span:nth-of-type(3)')?.classList.add('active');
                setStatus(t.claimSuccess, 'success');
                submit.textContent = t.claimLogin;
                submit.disabled = false;
                submit.type = 'button';
                submit.onclick = () => window.location.replace(loginUrl);
            } catch (error) {
                submit.disabled = false; submit.textContent = t.submit;
                setStatus(error?.message || t.generic, 'error');
            }
        });
        window.setTimeout(() => password.focus(), 0);
    };

    const installIntegratedFirstLogin = base => {
        const t = translations[language()];
        const managedAccounts = new Set(['installer', 'guest', 'user']);
        let busy = false;
        let unsubscribeDom = null;
        let statusTimer = 0;
        let statusSequence = 0;
        let submitObserver = null;
        let observedSubmit = null;
        let loginStateMonitor = 0;
        const eligibility = { account: '', allowed: false, checking: false, loaded: false };

        document.documentElement.classList.add('eos-modern-login', 'eos-integrated-first-login');
        document.querySelectorAll('.eos-passwordless-launcher').forEach(element => element.remove());

        const accountName = input => String(input?.value || '').trim().toLowerCase().replace(/^system\.user\./, '');
        const setInputValue = (input, value) => {
            if (!input) return;
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(input, value); else input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const loginElements = () => {
            const username = document.querySelector('input#username,input[name="username"]');
            const password = document.querySelector('input#password,input[name="password"]');
            const card = username?.closest?.('.MuiPaper-root,form,main,section') || password?.closest?.('.MuiPaper-root,form,main,section');
            const submit = card?.querySelector?.('button[type="submit"]') || Array.from(card?.querySelectorAll?.('button') || []).find(button => /anmelden|login|sign in|aanmelden/.test(normalize(button.textContent || '')));
            return { username, password, card, submit };
        };
        const statusNode = card => card?.querySelector?.('.eos-login-first-status');
        const directChildWithin = (ancestor, node) => {
            let current = node;
            while (current && current.parentElement && current.parentElement !== ancestor) current = current.parentElement;
            return current?.parentElement === ancestor ? current : null;
        };
        const setStatus = (card, message, kind = '') => {
            const status = statusNode(card);
            if (!status) return;
            status.textContent = message || '';
            status.dataset.kind = kind;
        };
        const setSubmitDisabled = (submit, disabled) => {
            if (!submit) return;
            const nextDisabled = !!disabled;
            // Idempotent writes are essential here: the submit MutationObserver invokes
            // updateLoginState again. Rewriting unchanged attributes would create a feedback loop.
            if (submit.disabled !== nextDisabled) submit.disabled = nextDisabled;
            if (submit.classList.contains('Mui-disabled') !== nextDisabled) submit.classList.toggle('Mui-disabled', nextDisabled);
            const aria = nextDisabled ? 'true' : 'false';
            if (submit.getAttribute('aria-disabled') !== aria) submit.setAttribute('aria-disabled', aria);
            const tabIndex = nextDisabled ? -1 : 0;
            if (submit.tabIndex !== tabIndex) submit.tabIndex = tabIndex;
            if (nextDisabled) {
                if (!submit.hasAttribute('disabled')) submit.setAttribute('disabled', '');
                if (submit.hasAttribute('data-eos-passwordless-submit')) submit.removeAttribute('data-eos-passwordless-submit');
            } else {
                if (submit.hasAttribute('disabled')) submit.removeAttribute('disabled');
                if (submit.getAttribute('data-eos-passwordless-submit') !== '1') submit.dataset.eosPasswordlessSubmit = '1';
            }
        };
        const syncPasswordRequirement = (password, optional) => {
            if (!password) return;
            password.required = !optional;
            password.setAttribute('aria-required', optional ? 'false' : 'true');
            password.toggleAttribute('data-eos-first-login-optional', !!optional);
            password.closest?.('.MuiFormControl-root')?.classList?.toggle('eos-first-login-password-optional', !!optional);
        };
        const eligibilityMatches = account => eligibility.loaded && eligibility.account === account;
        const isEligibleBlankAccount = (account, password) => managedAccounts.has(account)
            && !password?.value
            && eligibilityMatches(account)
            && eligibility.allowed === true;
        const updateLoginState = () => {
            const { username, password, card, submit } = loginElements();
            if (!username || !password || !card || !submit) return;
            const account = accountName(username);
            const blankManaged = managedAccounts.has(account) && !password.value;
            const ready = isEligibleBlankAccount(account, password) && !busy;
            const checking = blankManaged && eligibility.account === account && eligibility.checking;
            card.classList.toggle('eos-login-first-ready', ready);
            card.classList.toggle('eos-login-first-checking', checking);
            card.classList.toggle('eos-login-first-blocked', blankManaged && eligibilityMatches(account) && !eligibility.allowed);
            syncPasswordRequirement(password, ready);
            if (blankManaged) {
                setSubmitDisabled(submit, !ready);
            } else {
                setSubmitDisabled(submit, busy || !account || !password.value);
                if (!password.value) submit.removeAttribute('data-eos-passwordless-submit');
            }
            const hint = card.querySelector('.eos-login-first-hint');
            if (hint) {
                if (checking) hint.textContent = t.claimChecking;
                else if (ready) hint.textContent = t.claimIntro;
                else if (blankManaged && eligibilityMatches(account)) hint.textContent = t.claimAlreadyActive;
                else hint.textContent = t.claimHint;
            }
        };
        const ensureSubmitObserver = submit => {
            if (!submit || observedSubmit === submit) return;
            submitObserver?.disconnect();
            observedSubmit = submit;
            submitObserver = new MutationObserver(() => queueMicrotask(updateLoginState));
            submitObserver.observe(submit, {
                attributes: true,
                attributeFilter: ['disabled', 'class', 'aria-disabled', 'tabindex'],
            });
        };
        const requestEligibility = async account => {
            const normalized = String(account || '').trim().toLowerCase().replace(/^system\.user\./, '');
            const sequence = ++statusSequence;
            eligibility.account = normalized;
            eligibility.allowed = false;
            eligibility.loaded = false;
            eligibility.checking = managedAccounts.has(normalized);
            updateLoginState();
            if (!managedAccounts.has(normalized)) {
                eligibility.checking = false;
                eligibility.loaded = true;
                updateLoginState();
                return false;
            }
            try {
                const response = await fetch(new URL('nexowatt/account/passwordless-status', base).href, {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-NexoWatt-EOS-Passwordless-Status': '1',
                    },
                    body: JSON.stringify({ user: normalized }),
                });
                const data = await response.json().catch(() => ({}));
                if (sequence !== statusSequence) return false;
                eligibility.allowed = response.ok && data?.eligible === true;
                eligibility.loaded = true;
                eligibility.checking = false;
                const { card } = loginElements();
                setStatus(card, response.ok ? '' : t.claimStatusError, response.ok ? '' : 'error');
                updateLoginState();
                return eligibility.allowed;
            } catch (_) {
                if (sequence !== statusSequence) return false;
                eligibility.allowed = false;
                eligibility.loaded = true;
                eligibility.checking = false;
                const { card } = loginElements();
                setStatus(card, t.claimStatusError, 'error');
                updateLoginState();
                return false;
            }
        };
        const scheduleEligibilityCheck = () => {
            window.clearTimeout(statusTimer);
            statusTimer = window.setTimeout(() => {
                const { username, password } = loginElements();
                const account = accountName(username);
                if (password?.value || !managedAccounts.has(account)) {
                    statusSequence += 1;
                    eligibility.account = account;
                    eligibility.allowed = false;
                    eligibility.checking = false;
                    eligibility.loaded = true;
                    updateLoginState();
                    return;
                }
                void requestEligibility(account);
            }, 120);
        };
        const startClaim = async requestedAccount => {
            const { username, password, card, submit } = loginElements();
            const account = String(requestedAccount || accountName(username)).trim().toLowerCase().replace(/^system\.user\./, '');
            if (!managedAccounts.has(account) || password?.value || busy) return false;
            if (!eligibilityMatches(account) || !eligibility.allowed) {
                const allowed = await requestEligibility(account);
                if (!allowed) return false;
            }
            busy = true;
            if (submit) setSubmitDisabled(submit, true);
            setStatus(card, t.claimChecking, '');
            try {
                const response = await fetch(new URL('nexowatt/account/passwordless-claim', base).href, {
                    method: 'POST', credentials: 'include', cache: 'no-store',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-NexoWatt-EOS-Passwordless-Claim': '1' },
                    body: JSON.stringify({ user: account }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || data.error) {
                    const message = data.error === 'privateNetworkRequired' ? t.claimPrivate : t.claimUnavailable;
                    throw new Error(message);
                }
                setStatus(card, '', '');
                showPasswordlessClaimPassword(data, base);
                return true;
            } catch (error) {
                eligibility.allowed = false;
                eligibility.loaded = true;
                setStatus(card, error?.message || t.claimUnavailable, 'error');
                return false;
            } finally {
                busy = false;
                updateLoginState();
            }
        };
        const ensureIntegratedLogin = () => {
            document.querySelectorAll('.eos-passwordless-launcher').forEach(element => element.remove());
            const { username, password, card, submit } = loginElements();
            if (!username || !password || !card) return;
            card.classList.add('eos-login-card-modern');
            // v98 compact normal-login first activation: do not add role buttons or a second panel.
            // The account is entered in the existing Loginname field; a blank password is accepted only
            // after the backend confirms that this exact managed account is eligible.
            card.querySelectorAll('.eos-login-role-selector').forEach(element => element.remove());
            card.dataset.eosCompactFirstLogin = '1';
            if (!username.dataset.eosFirstLoginBound) {
                username.dataset.eosFirstLoginBound = '1';
                username.addEventListener('input', scheduleEligibilityCheck);
                username.addEventListener('change', scheduleEligibilityCheck);
                password.addEventListener('input', scheduleEligibilityCheck);
                password.addEventListener('change', scheduleEligibilityCheck);
            }
            ensureSubmitObserver(submit);
            updateLoginState();
            scheduleEligibilityCheck();
        };
        const startLoginStateMonitor = () => {
            if (loginStateMonitor) return;
            loginStateMonitor = window.setInterval(() => {
                const { username, password, submit } = loginElements();
                if (!username || !password || !submit) {
                    ensureIntegratedLogin();
                    return;
                }
                ensureSubmitObserver(submit);
                updateLoginState();
            }, 350);
        };

        document.addEventListener('click', event => {
            const { username, password, card, submit } = loginElements();
            if (!submit || !card || !submit.contains(event.target)) return;
            const account = accountName(username);
            if (!managedAccounts.has(account) || password?.value) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (isEligibleBlankAccount(account, password)) void startClaim(account);
            else void requestEligibility(account);
        }, { capture: true });
        document.addEventListener('keydown', event => {
            if (event.key !== 'Enter') return;
            const { username, password, card } = loginElements();
            if (!card?.contains(event.target)) return;
            const account = accountName(username);
            if (!managedAccounts.has(account) || password?.value) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (isEligibleBlankAccount(account, password)) void startClaim(account);
        }, { capture: true });

        const connectCoordinator = () => {
            const coordinator = window.NEXOWATT_EOS_DOM_COORDINATOR;
            if (!coordinator?.subscribe) { window.setTimeout(connectCoordinator, 250); return; }
            unsubscribeDom?.();
            unsubscribeDom = coordinator.subscribe(ensureIntegratedLogin);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureIntegratedLogin, { once: true });
        else ensureIntegratedLogin();
        connectCoordinator();
        startLoginStateMonitor();
        window.addEventListener('focus', updateLoginState);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) updateLoginState(); });
        [100, 250, 500, 900, 1500, 2600, 5000].forEach(delay => window.setTimeout(ensureIntegratedLogin, delay));

        window.NEXOWATT_EOS_FIRST_LOGIN = Object.freeze({
            version: VERSION,
            start: account => startClaim(account),
            refresh: ensureIntegratedLogin,
            check: account => requestEligibility(account),
        });
    };

    const showSecurityRecovery = (base, error) => {
        const t = translations[language()];
        const retryKey = 'NEXOWATT_EOS_SECURITY_RETRY_COUNT';
        let count = 0;
        try {
            count = Math.min(8, Number(window.sessionStorage.getItem(retryKey) || 0) + 1);
            window.sessionStorage.setItem(retryKey, String(count));
        } catch (_) { /* storage can be disabled */ }
        const delay = Math.min(15_000, 1_500 * Math.pow(2, Math.min(count - 1, 3)));
        const logoutUrl = new URL('logout', base).href;
        window.NEXOWATT_EOS_SECURITY_CHECK_ACTIVE = true;
        document.documentElement.classList.add('eos-first-login-active');
        document.body.replaceChildren();
        const overlay = document.createElement('main');
        overlay.className = 'eos-first-login-overlay eos-security-recovery-overlay';
        overlay.dataset.eosAuthBoundary = 'security-context';
        overlay.innerHTML = `
            <section class="eos-first-login-card" role="alert" aria-live="assertive" aria-labelledby="eos-security-recovery-title">
                <img class="eos-first-login-logo" src="./img/eos/eos-logo.svg" alt="NexoWatt EOS" />
                <div class="eos-first-login-kicker">Energy Operation System</div>
                <h1 id="eos-security-recovery-title"></h1>
                <p class="eos-first-login-intro"></p>
                <div class="eos-first-login-status" data-kind="warning"></div>
                <button class="eos-first-login-submit" type="button"></button>
                <a class="eos-first-login-logout" href="${logoutUrl}"></a>
            </section>`;
        document.body.appendChild(overlay);
        overlay.querySelector('h1').textContent = t.securityTitle;
        overlay.querySelector('.eos-first-login-intro').textContent = t.securityIntro;
        overlay.querySelector('.eos-first-login-submit').textContent = t.securityRetry;
        overlay.querySelector('.eos-first-login-logout').textContent = t.securityLogout;
        const status = overlay.querySelector('.eos-first-login-status');
        const button = overlay.querySelector('.eos-first-login-submit');
        let remaining = Math.max(1, Math.ceil(delay / 1000));
        const update = () => { status.textContent = t.securityAuto(remaining); };
        update();
        const interval = window.setInterval(() => {
            remaining -= 1;
            if (remaining > 0) update();
        }, 1000);
        const retry = () => {
            window.clearInterval(interval);
            button.disabled = true;
            window.location.reload();
        };
        button.addEventListener('click', retry, { once: true });
        window.setTimeout(retry, delay);
        console.warn(`EOS access verification is unavailable; interface remains locked: ${error?.message || error}`);
    };

    const base = new URL('../', script?.src || window.location.href);
    const isLoginRequest = /(?:^|[?&])login(?:[=&]|$)/i.test(window.location.search || '');
    if (isLoginRequest) {
        launch();
        return;
    }

    const contextUrl = new URL('nexowatt/security/context', base).href;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    window.NEXOWATT_EOS_BOOTSTRAP_READY = fetch(contextUrl, {
        credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal,
    })
        .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
        .then(policy => {
            if (policy?.authenticated === false) {
                // The normal NexoWatt EOS login component must be allowed to render. No role or
                // first-login decision is made until an authenticated session exists.
                launch();
                return Object.freeze({ ...policy, role: 'unknown' });
            }
            const role = roleFromPolicy(policy);
            const resolved = Object.freeze({ ...policy, role });
            window.NEXOWATT_EOS_BOOTSTRAP_POLICY = resolved;
            window.NEXOWATT_EOS_ACCESS_ROLE = role;
            try { window.sessionStorage.removeItem('NEXOWATT_EOS_SECURITY_RETRY_COUNT'); } catch (_) { /* ignore */ }
            if (resolved.mustChangePassword === true) {
                showFirstLoginPassword(resolved, base);
                return resolved;
            }
            if (new URL(window.location.href).searchParams.get('eosPassword') === '1') {
                showFirstLoginPassword(resolved, base, true);
                return resolved;
            }
            lockExpertMode(role);
            if (role === 'installer' || role === 'enduser') {
                showProductPortal(resolved, base);
                return resolved;
            }
            const route = currentRoute();
            if (!isAllowed(role, route)) navigate(defaultTab(role));
            installOwnPasswordLink(base);
            launch();
            return resolved;
        })
        .catch(error => {
            // Fail closed: a missing/ambiguous role must never fall through to the unrestricted
            // application. A branded recovery view retries the security context instead.
            showSecurityRecovery(base, error);
            return null;
        })
        .finally(() => window.clearTimeout(timeout));

    window.NEXOWATT_EOS_STANDARD_PASSWORD_MODE = true;
    document.documentElement.classList.remove('eos-first-login-active');
    window.NEXOWATT_EOS_ROLE_BOOTSTRAP = Object.freeze({
        version: VERSION, getRole: () => window.NEXOWATT_EOS_ACCESS_ROLE || 'unknown',
        getPolicy: () => window.NEXOWATT_EOS_BOOTSTRAP_POLICY || null, isAllowed, defaultTab,
    });
})();
