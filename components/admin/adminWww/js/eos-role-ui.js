(() => {
    'use strict';

    const VERSION = 'v7109-clean-core-surfaces-rbac';
    window.NEXOWATT_EOS_ROLE_UI_VERSION = VERSION;

    const state = {
        policy: window.NEXOWATT_EOS_BOOTSTRAP_POLICY || null,
        role: window.NEXOWATT_EOS_ACCESS_ROLE || 'unknown',
        scheduled: false,
        redirects: 0,
        lastTarget: '',
        unsubscribePolicy: null,
        unsubscribeDom: null,
        reserveObserver: null,
        reservePaper: null,
        reserveScheduled: false,
        readonlySystemInfo: null,
        readonlySystemInfoPromise: null,
    };
    const abort = new AbortController();

    const safe = fn => { try { return fn(); } catch (_) { return undefined; } };
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match] || match));
    const normalize = value => String(value || '')
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9#/_:.-]+/g, ' ').trim();
    const currentRoute = () => {
        const hash = decodeURIComponent(window.location.hash || '').toLowerCase();
        if (/^#\/?easy(?:[/?&]|$)/.test(hash)) return 'easy';
        const direct = hash.match(/^#\/?(system|users|hosts|files|objects|instances|adapters|logs|enums)(?:[/?&]|$)/);
        if (direct) return `tab-${direct[1]}`;
        const match = hash.match(/tab-[a-z0-9_-]+(?:-\d+)?/i);
        return match ? match[0].toLowerCase() : 'tab-intro';
    };
    const tabFromHref = href => String(href || '').match(/#\/?(tab-[a-z0-9_-]+(?:-\d+)?)/i)?.[1]?.toLowerCase() || '';
    const isLoginView = () => /(?:^|[?&])login(?:[=&]|$)/i.test(window.location.search || '') || !!document.querySelector('.login-form,#login,[data-testid="login"]');
    const isHighLoadSurface = () => /tab-(objects|adapter|adapters|instances|logs|host|hosts)\b/.test(currentRoute());
    const isInsideAppPaper = node => !!node?.closest?.('#app-paper,[role="grid"],.MuiDataGrid-root,.ReactVirtualized__Grid,.eos-object-value-cell,.MuiTooltip-popper,.MuiPopover-root,.MuiPopper-root,.MuiMenu-root,[role="tooltip"]');

    const roleFromPolicy = policy => {
        const raw = normalize(policy?.role || policy?.eosRole || policy?.accessRole || '');
        if (policy?.user === 'system.user.admin' || policy?.userId === 'system.user.admin' || policy?.isAdmin || policy?.isEosAdminGroup || policy?.isAdministrator || /^(?:admin|administrator)$/.test(raw)) return 'admin';
        if (/nexowatt service|eos service|service admin|service administrator/.test(raw)) return 'admin';
        if (policy?.isInstaller || /installateur|installer|installation|inbetriebnahme|techniker|technician|integrator|partner/.test(raw)) return 'installer';
        return 'enduser';
    };
    const isGloballyHiddenTab = tab => normalize(tab) === 'tab-enums';
    const isOfficialAdminTab = tab => /^tab-admin(?:-\d+)?$/.test(normalize(tab));
    const isOfficialBackupTab = tab => /^tab-backitup(?:-\d+)?$/.test(normalize(tab));
    const isOfficialReserveTab = tab => isOfficialAdminTab(tab) || isOfficialBackupTab(tab);
    const isCustomerBackupTab = tab => /^tab-(?:nexowatt-backup|eos-backup|nexowatt-sicherung)(?:-\d+)?$/.test(normalize(tab));
    const endUserAllowedByText = value => /(eos cockpit|nexowatt ui|nexowatt cockpit|kunden cockpit|kundenbereich|endkundenbereich|visualisierung|visualisation|visu|dashboard|energie cockpit|energy cockpit|bedienung|smart home|smart-home|lovelace|jarvis|iqontrol|material)/.test(normalize(value));
    const endUserDeniedByText = value => /(module|dienste|systemlogs|logs|zugange|rechte|benutzer|users|gruppen|groups|system hosts|system-hosts|hosts|dateien|files|konsole|console|terminal|xterm|adapter|instances?|instanzen|geraetesuche|discovery|systemschutz|security)/.test(normalize(value));
    const isEndUserTab = (tab, label = '') => {
        const clean = normalize(tab); const text = `${clean} ${normalize(label)}`;
        if (clean === 'tab-intro' || clean === 'tab-objects' || isCustomerBackupTab(clean)) return true;
        if (/^tab-(nexowatt-ui|nexowatt-cockpit|eos-cockpit|eos-dashboard|kunden-cockpit|endkunden-cockpit|lovelace|jarvis|vis|iqontrol|material)(?:-|$)/.test(clean)) return true;
        return !!clean && !endUserDeniedByText(text) && endUserAllowedByText(text);
    };
    const isInstallerDenied = (tab, label = '') => {
        const clean = normalize(tab); const text = `${clean} ${normalize(label)}`;
        if (isOfficialReserveTab(clean)) return true;
        if (isCustomerBackupTab(clean)) return false;
        return /(?:tab-users|tab-hosts|tab-files|tab-xterm|tab-xtrem|tab-system|users|benutzer|gruppen|groups|system-hosts|system hosts|hosts|dateien|files|konsole|console|terminal|xterm|systemschutz|security)/.test(text);
    };
    const isRouteAllowed = (role, route, label = '') => {
        if (route === 'easy' || isGloballyHiddenTab(route)) return false;
        if (role === 'admin') return true;
        if (isOfficialReserveTab(route)) return false;
        if (role === 'installer') return route === 'tab-intro' || (route !== 'tab-users' && !isInstallerDenied(route, label));
        if (role === 'enduser') return isEndUserTab(route, label);
        return false;
    };
    const defaultTab = () => 'tab-intro';

    const setRoleClasses = role => safe(() => {
        const root = document.documentElement;
        root.classList.add('eos-role-loaded');
        ['admin','installer','installateur','enduser','unknown'].forEach(name => root.classList.remove(`eos-role-${name}`));
        root.classList.add(`eos-role-${role}`);
        if (role === 'installer') root.classList.add('eos-role-installateur');
        root.classList.toggle('eos-security-admin', role === 'admin');
        root.classList.toggle('eos-security-nonadmin', role !== 'admin');
    });

    const lockExpertMode = () => safe(() => {
        if (state.role === 'admin') return false;
        const storage = window._sessionStorage || window.sessionStorage;
        const previous = storage.getItem('App.expertMode');
        for (const target of [storage, window._localStorage || window.localStorage]) {
            target.setItem('App.expertMode', 'false');
            target.removeItem('App.doNotShowExpertDialog');
        }
        if (previous !== 'false' && document.getElementById('app-paper') && storage.getItem('eosRoleExpertReloaded') !== '1') {
            storage.setItem('eosRoleExpertReloaded', '1');
            window.location.reload();
            return true;
        }
        return false;
    });

    const textOf = el => [el?.textContent || '', ...['href','title','aria-label','data-name','data-tab','data-id','data-instance','id'].map(a => el?.getAttribute?.(a) || '')].join(' ');
    const navEntries = () => {
        const candidates = Array.from(document.querySelectorAll(
            '[data-eos-tab],a[href*="#tab-"],a[href*="#/tab-"],a[href="#easy"],a[href="/#easy"],a[href$="/#easy"]',
        ));
        const seen = new Set();
        return candidates.map(control => {
            const href = control.getAttribute?.('href') || control.href || '';
            const declared = normalize(control.getAttribute?.('data-eos-tab') || '');
            const tab = declared || (/^#\/?easy(?:[/?&]|$)/i.test(href) ? 'easy' : tabFromHref(href));
            if (!tab) return null;
            const root = control.closest?.('.MuiListItem-root,.MuiButtonBase-root,li,[role="button"],[class*="DrawerItem"],[class*="dragWrapper"]') || control;
            const key = `${tab}|${textOf(root)}`;
            if (seen.has(key)) return null;
            seen.add(key);
            return { anchor: control, root, tab, label: textOf(root) || textOf(control) };
        }).filter(Boolean);
    };
    const firstAllowedTab = role => navEntries().find(entry => entry.tab === 'tab-intro' && isRouteAllowed(role, entry.tab, entry.label))?.tab
        || navEntries().find(entry => isRouteAllowed(role, entry.tab, entry.label))?.tab || defaultTab(role);

    const applyMenuPolicy = () => safe(() => {
        navEntries().forEach(entry => {
            const hide = !isRouteAllowed(state.role, entry.tab, entry.label);
            [entry.anchor, entry.root].forEach(el => {
                if (!el) return;
                el.classList.toggle('eos-role-hidden', hide);
                if (hide) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
            });
        });
    });

    const toolbarButtonSignature = button => {
        const testIds = Array.from(button?.querySelectorAll?.('svg[data-testid]') || []).map(svg => svg.getAttribute('data-testid') || '').join(' ');
        return normalize(`${button?.getAttribute?.('aria-label') || ''} ${button?.getAttribute?.('title') || ''} ${testIds}`);
    };
    const isSystemSettingsButton = button => /buildicon|system settings|systemeinstellungen|systeeminstellingen/.test(toolbarButtonSignature(button));
    const isHeaderSystemSettingsButton = button => button?.dataset?.eosSystemSettingsControl === '1'
        && !!button.closest?.('.eos-top-toolbar,.MuiAppBar-root .MuiToolbar-root');
    const isExpertModeButton = button => button?.dataset?.eosExpertControl === '1' || /expert|experten/.test(toolbarButtonSignature(button));
    const markAdminOnlyToolbarControls = () => safe(() => {
        const toolbar = document.querySelector('.eos-top-toolbar,.MuiAppBar-root .MuiToolbar-root');
        if (!toolbar) return;
        const buttons = Array.from(toolbar.querySelectorAll('button'));
        let buildIndex = -1;
        buttons.forEach((button, index) => {
            if (button.closest('#eos-assist-root')) return;
            const label = toolbarButtonSignature(button);
            const system = isSystemSettingsButton(button);
            const expert = isExpertModeButton(button);
            if (system) { buildIndex = index; button.dataset.eosSystemSettingsControl = '1'; }
            button.dataset.eosKnownToolbar = /notifications|visibility|menu|logout|brightness|palette|darkmode|lightmode|colorlens|sync|assist/.test(label) ? '1' : '0';
            if (expert) button.dataset.eosAdminOnlyControl = '1';
        });
        if (buildIndex >= 0) {
            for (let index = buildIndex + 1; index < buttons.length; index++) {
                const button = buttons[index];
                if (button.closest('#eos-assist-root') || button.dataset.eosKnownToolbar === '1') continue;
                if (button.closest('[class*="user"],.MuiAvatar-root')) break;
                button.dataset.eosAdminOnlyControl = '1';
                break;
            }
        }
        buttons.forEach(button => {
            if (button.closest('#eos-assist-root')) return;
            if (button.dataset.eosSystemSettingsControl === '1') {
                const hideSystem = state.role === 'enduser';
                button.classList.toggle('eos-role-hidden', hideSystem);
                button.disabled = hideSystem;
                if (hideSystem) { button.tabIndex = -1; button.setAttribute('aria-hidden', 'true'); }
                else { button.removeAttribute('aria-hidden'); button.disabled = false; }
            }
            if (button.dataset.eosAdminOnlyControl !== '1') return;
            const hide = state.role !== 'admin';
            button.classList.toggle('eos-admin-only-control', hide);
            button.disabled = hide;
            if (hide) { button.tabIndex = -1; button.setAttribute('aria-hidden', 'true'); }
            else { button.removeAttribute('aria-hidden'); }
        });
    });

    const setHashTab = tab => {
        if (!tab) return;
        if (tab === 'easy') tab = 'tab-intro';
        if (state.lastTarget === tab && Date.now() - Number(sessionStorage.getItem('eosRoleLastRedirectAt') || 0) < 1000) return;
        state.lastTarget = tab; state.redirects += 1;
        sessionStorage.setItem('eosRoleLastRedirectAt', String(Date.now()));
        const targetHash = `#${tab}`;
        if (window.location.hash !== targetHash) window.location.hash = targetHash;
        window.dispatchEvent(new CustomEvent('eos-role-navigate', { detail: { tab } }));
    };
    const navigateToTab = (tab, label = '') => {
        if (!tab) return false;
        if (tab === 'basic-settings') {
            window.NEXOWATT_EOS_BASIC_SETTINGS?.open?.();
            return true;
        }
        if (!isRouteAllowed(state.role, tab, label)) return false;
        const entry = navEntries().find(candidate =>
            candidate.tab === tab
            && isRouteAllowed(state.role, candidate.tab, candidate.label)
            && !candidate.anchor.closest?.('#eos-role-safe-overview'),
        );
        if (entry?.anchor) {
            entry.anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            window.setTimeout(() => {
                if (currentRoute() !== tab) setHashTab(tab);
            }, 80);
            return true;
        }
        setHashTab(tab);
        return true;
    };
    const redirectIfNeeded = () => safe(() => {
        if (isLoginView() || state.role === 'unknown') return;
        const route = currentRoute();
        if (route === 'easy') { setHashTab('tab-intro'); return; }
        if (!isRouteAllowed(state.role, route)) setHashTab(firstAllowedTab(state.role));
    });

    const appPaper = () => document.getElementById('app-paper');
    const routeForPattern = pattern => navEntries().find(entry => pattern.test(entry.tab) && isRouteAllowed(state.role, entry.tab, entry.label))?.tab || '';
    const actionDefinitions = role => {
        const uiTab = routeForPattern(/^tab-(?:nexowatt-ui|nexowatt-eos|eos-cockpit)(?:-|$)/) || 'tab-nexowatt-ui';
        const backupTab = routeForPattern(/^tab-(?:nexowatt-backup|eos-backup|nexowatt-sicherung)(?:-|$)/);
        if (role === 'installer') {
            return [
                ['Dienste', 'Instanzen starten, stoppen und diagnostizieren', 'tab-instances', 'services'],
                ['Module', 'Module installieren, aktualisieren und konfigurieren', 'tab-adapters', 'modules'],
                ['Datenpunkte', 'Messwerte prüfen und freigegebene Werte schreiben', 'tab-objects', 'datapoints'],
                ['Geräte', 'Geräteintegration und Inbetriebnahme öffnen', 'tab-devicemanager', 'devices'],
                ['Basis-Einstellungen', 'Standort, Sprache und Anlagenparameter', 'basic-settings', 'settings'],
                ...(backupTab ? [['NexoWatt Sicherung', 'Sicherung und Wiederherstellung des EOS-Systems', backupTab, 'backup']] : []),
                ['EOS Cockpit', 'Energie-, Lade- und Gebäudesteuerung öffnen', uiTab, 'eos'],
            ];
        }
        return [
            ['EOS Cockpit', 'Energie, Laden und Gebäude bedienen', uiTab, 'eos'],
            ['Datenpunkte', 'Messwerte und Zustände ausschließlich lesen', 'tab-objects', 'datapoints'],
            ...(backupTab ? [['NexoWatt Sicherung', 'Eigene Sicherungen ausführen und wiederherstellen', backupTab, 'backup']] : []),
        ];
    };
    const iconFor = icon => ({
        services: '↻', modules: '◫', datapoints: '⌁', structure: '⌂', devices: '⌘', rights: '♙', settings: '⚙', backup: '⇩', eos: '⚡',
    }[icon] || '•');
    const removeSafeOverview = () => {
        document.getElementById('eos-role-safe-overview')?.remove();
        document.documentElement.classList.remove('eos-safe-overview-active');
    };
    const suppressPermissionErrors = () => {
        if (state.role === 'admin') return;
        document.querySelectorAll('.MuiSnackbar-root,[role="alert"],.MuiAlert-root').forEach(node => {
            if (/permissionerror|cannot get data/i.test(node.textContent || '')) node.classList.add('eos-role-hidden');
        });
    };
    const updateNativeOverviewRole = () => {
        if (isLoginView() || currentRoute() !== 'tab-intro') return;
        const config = state.role === 'admin'
            ? { label: 'Admin / Service', text: 'Systemstatus, Module, Dienste und Anlagenzugänge in einer modernen Serviceübersicht.' }
            : state.role === 'installer'
                ? { label: 'Installateur', text: 'Inbetriebnahme, Fehlersuche, Geräte- und EMS-Diagnose – mit deinen freigegebenen Installateurrechten.' }
                : { label: 'Endkunde', text: 'Energie, Laden, Gebäude und die aktuellen EMS-Entscheidungen auf einen Blick.' };
        const hero = document.getElementById('eos-native-overview-hero');
        const description = hero?.querySelector('p');
        const role = hero?.querySelector('.eos-overview-role');
        if (description) description.textContent = config.text;
        if (role) {
            role.innerHTML = '<span class="eos-overview-status-dot"></span>';
            role.append(document.createTextNode(config.label));
            role.setAttribute('data-nexowatt-overview-role', state.role);
        }
    };

    const fetchReadonlySystemInfo = () => {
        if (state.readonlySystemInfo) return Promise.resolve(state.readonlySystemInfo);
        if (state.readonlySystemInfoPromise) return state.readonlySystemInfoPromise;
        state.readonlySystemInfoPromise = fetch('/nexowatt/readonly/system-info', {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
        })
            .then(response => (response.ok ? response.json() : null))
            .then(data => {
                state.readonlySystemInfo = data && typeof data === 'object' ? data : null;
                return state.readonlySystemInfo;
            })
            .catch(() => null)
            .finally(() => {
                state.readonlySystemInfoPromise = null;
                scheduleApply();
            });
        return state.readonlySystemInfoPromise;
    };
    const applyReadonlySystemInfoCard = () => safe(() => {
        if (state.role !== 'enduser' || currentRoute() !== 'tab-intro') return;
        const paper = appPaper();
        if (!paper) return;
        const title = Array.from(paper.querySelectorAll('h1,h2,h3,h4,h5,h6')).find(node => normalize(node.textContent || '') === 'nexowatt');
        const card = title?.closest?.('.MuiCard-root');
        if (!card || !/platform|ram|node\.js|npm/i.test(String(card.textContent || ''))) return;
        Array.from(card.querySelectorAll('button')).forEach(button => {
            if (/info/i.test(textOf(button))) {
                button.classList.add('eos-role-hidden');
                button.setAttribute('aria-hidden', 'true');
                button.disabled = true;
            }
        });
        if (!state.readonlySystemInfo && !state.readonlySystemInfoPromise) {
            void fetchReadonlySystemInfo();
            return;
        }
        const data = state.readonlySystemInfo;
        const list = card.querySelector('ul');
        if (!data || !list) return;
        list.innerHTML = `
            <li><span><span style="font-weight:600">Platform: </span>${escapeHtml(data.platform || '--')}</span></li>
            <li><span><span style="font-weight:600">RAM: </span>${escapeHtml(Number.isFinite(Number(data.ramMb)) ? `${Math.round(Number(data.ramMb))} MB` : '--')}</span></li>
            <li><span><span style="font-weight:600">Node.js: </span>${escapeHtml(data.nodejs || '--')}</span></li>
            <li><span><span style="font-weight:600">NPM: </span>${escapeHtml(data.npm || '--')}</span></li>`;
    });

    const hideIntroEditControls = () => {
        const paper = appPaper();
        if (!paper) return;
        const admin = state.role === 'admin';
        paper.querySelectorAll(':scope > .MuiFab-root,:scope > button.MuiFab-root').forEach(button => {
            button.classList.toggle('eos-intro-admin-edit-hidden', !admin);
            if (!admin) button.setAttribute('aria-hidden', 'true'); else button.removeAttribute('aria-hidden');
        });
    };
    const filterNativeUsersPage = () => safe(() => {
        if (currentRoute() !== 'tab-users' || state.role === 'admin') return;
        const paper = appPaper(); if (!paper) return;
        const policyUser = String(state.policy?.user || state.policy?.userId || window.NEXOWATT_EOS_BOOTSTRAP_POLICY?.user || '').replace(/^system\.user\./, '').toLowerCase();
        const allowed = state.role === 'installer'
            ? new Set(['installer', 'user', 'guest', policyUser].filter(Boolean))
            : new Set([policyUser || (state.role === 'enduser' ? 'user' : '')].filter(Boolean));
        paper.querySelectorAll('.MuiCard-root,[role="row"],li').forEach(row => {
            const text = normalize(row.textContent || '');
            const match = text.match(/system user ([a-z0-9_.@-]+)/) || text.match(/system\.user\.([a-z0-9_.@-]+)/);
            if (!match) return;
            row.classList.toggle('eos-role-hidden', !allowed.has(match[1]));
        });
        paper.querySelectorAll('button').forEach(button => {
            const title = normalize(button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent || '');
            if (/add user|add group|delete|remove|benutzer hinzufugen|gruppe hinzufugen|loschen/.test(title)) {
                button.classList.add('eos-role-hidden'); button.disabled = true;
            }
        });
        paper.querySelectorAll('[data-eos-user-role-filter]').forEach(node => node.removeAttribute('data-eos-user-role-filter'));
        paper.setAttribute('data-eos-user-role-filter', state.role);
    });

    const ensureSafeOverview = () => safe(() => {
        // 7.9.97: never cover the real Admin Intro with a second tile surface.
        // Installer and end-user use the native card component; security remains
        // enforced by route/instance filters and backend permissions.
        removeSafeOverview();
        if (isLoginView() || state.role === 'unknown' || currentRoute() !== 'tab-intro') return;
        suppressPermissionErrors();
        updateNativeOverviewRole();
        hideIntroEditControls();
        window.NEXOWATT_NATIVE_SHELL?.refresh?.();
        window.NEXOWATT_EOS_EMS_OVERVIEW?.refresh?.();
    });

    const hideOfficialReserveSurfaces = () => safe(() => {
        const paper = appPaper();
        if (!paper) return;
        const rowSelector = [
            'tr', '.MuiTableRow-root', '.MuiAccordion-root', '.MuiCard-root', '.MuiListItem-root',
            '[role="row"]', '[data-instance-row]', '[data-testid="adapter-card"]', '[data-testid="instance-card"]',
        ].join(',');
        const reserveId = /^(?:system\.adapter\.)?(?:admin|backitup|xterm)\.\d+$/i;
        const normalizeInstance = value => String(value || '').trim().replace(/^system\.adapter\./i, '');
        const identityValues = node => {
            if (!node) return [];
            const attrs = ['data-id', 'data-instance', 'data-name', 'data-adapter', 'data-instance-id', 'id'];
            const values = attrs.map(name => node.getAttribute?.(name) || '');
            node.querySelectorAll?.('[data-id],[data-instance],[data-name],[data-adapter],[data-instance-id]').forEach(child => {
                attrs.forEach(name => values.push(child.getAttribute?.(name) || ''));
            });
            return values.map(normalizeInstance).filter(Boolean);
        };
        const rowTextContainsReserve = row => {
            const text = String(row?.textContent || '')
                .replace(/eos-admin\.\d+/gi, '')
                .replace(/nexowatt-backup\.\d+/gi, '')
                .replace(/eos-backup\.\d+/gi, '')
                .replace(/system\.adapter\.(?:eos-admin|nexowatt-backup|eos-backup)\.\d+/gi, '');
            return /(?:^|[\s|,;])(?:system\.adapter\.)?(?:admin|backitup|xterm)\.\d+(?=$|[\s|,;])/i.test(text.trim());
        };
        const rowIsReserve = row => identityValues(row).some(value => reserveId.test(value)) || rowTextContainsReserve(row);
        const setHidden = (row, hidden) => {
            if (!row || row === paper || row.id === 'app-paper' || row.classList?.contains('eos-role-safe-overview')) return;
            row.classList.toggle('eos-role-hidden', hidden);
            row.classList.toggle('eos-official-reserve-hidden', hidden);
            if (hidden) {
                row.setAttribute('aria-hidden', 'true');
                row.setAttribute('data-eos-official-reserve-hidden', '1');
            } else {
                row.removeAttribute('aria-hidden');
                row.removeAttribute('data-eos-official-reserve-hidden');
            }
        };
        const rowFor = node => node?.matches?.(rowSelector) ? node : node?.closest?.(rowSelector);

        // Reused virtual rows must be unhidden when their identity changes.
        paper.querySelectorAll('[data-eos-official-reserve-hidden="1"]').forEach(node => {
            const row = rowFor(node) || node;
            if (state.role === 'admin' || !rowIsReserve(row)) setHidden(row, false);
        });
        if (state.role === 'admin') return;

        paper.querySelectorAll(rowSelector).forEach(row => setHidden(row, rowIsReserve(row)));
        paper.querySelectorAll([
            '[data-id^="system.adapter.admin"]','[data-id^="system.adapter.backitup"]','[data-id^="system.adapter.xterm"]',
            '[data-instance^="admin."]','[data-instance^="backitup."]','[data-instance^="xterm."]',
            '[data-instance-id^="admin."]','[data-instance-id^="backitup."]','[data-instance-id^="xterm."]',
            '[data-name="admin"]','[data-name="backitup"]','[data-name="xterm"]',
            'a[href*="#tab-admin"]','a[href*="#tab-backitup"]','a[href*="#tab-xterm"]',
            'a[href*="system.adapter.admin"]','a[href*="system.adapter.backitup"]','a[href*="system.adapter.xterm"]',
        ].join(',')).forEach(node => setHidden(rowFor(node) || node, true));

        // Admin 7 table cells may have no metadata. Match only an exact visible instance ID and
        // hide the complete Accordion/Card/Table row, never the NexoWatt replacements.
        const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walker.nextNode())) {
            const value = String(textNode.textContent || '').trim();
            if (reserveId.test(value)) setHidden(rowFor(textNode.parentElement), true);
        }
    });

    const ensureReserveObserver = () => safe(() => {
        const paper = appPaper();
        if (!paper || state.role === 'admin') {
            state.reserveObserver?.disconnect?.();
            state.reserveObserver = null;
            state.reservePaper = null;
            return;
        }
        if (state.reserveObserver && state.reservePaper === paper) return;
        state.reserveObserver?.disconnect?.();
        state.reservePaper = paper;
        state.reserveObserver = new MutationObserver(mutations => {
            if (!mutations.some(mutation => mutation.addedNodes?.length)) return;
            if (state.reserveScheduled) return;
            state.reserveScheduled = true;
            const run = () => {
                state.reserveScheduled = false;
                hideOfficialReserveSurfaces();
            };
            if ('requestAnimationFrame' in window) requestAnimationFrame(run); else setTimeout(run, 16);
        });
        // This observer is deliberately scoped to #app-paper. It catches rows created or recycled
        // after the shared coordinator has already processed the high-load services view.
        state.reserveObserver.observe(paper, { childList: true, subtree: true });
    });

    const applySensitiveDialogPolicy = () => safe(() => {
        if (state.role === 'admin') return;
        const forbidden = /(repositories|repository|lizenzen|licenses|zertifikate|certificates|zugangsdaten|credentials|let'?s encrypt|standard acl|benutzer|users|gruppen|groups)/;
        for (const dialog of document.querySelectorAll('.MuiDialog-root,[role="dialog"]')) {
            if (dialog.closest('#eos-assist-root,.eos-account-management-overlay')) continue;
            const title = normalize(dialog.querySelector('h1,h2,.MuiDialogTitle-root')?.textContent || '');
            if (!/(basiseinstellungen|base settings|systemeinstellungen|system settings)/.test(title)) continue;
            if (state.role === 'enduser') {
                const close = Array.from(dialog.querySelectorAll('button')).find(button => /close|schliessen|schließen|cancel/.test(normalize(textOf(button))));
                close?.click();
                dialog.classList.add('eos-role-hidden');
                continue;
            }
            for (const control of dialog.querySelectorAll('button,[role="tab"],a')) {
                if (forbidden.test(normalize(textOf(control)))) control.classList.add('eos-role-hidden');
            }
            for (const label of dialog.querySelectorAll('label,.MuiFormControl-root,.MuiGrid-root')) {
                if (/expertenmodus|expert mode/.test(normalize(label.textContent || ''))) label.classList.add('eos-role-hidden');
            }
        }
    });


    const privilegedFrameObservers = new WeakMap();
    const privilegedActionKind = element => {
        const signature = normalize(textOf(element));
        const href = normalize(element?.getAttribute?.('href') || element?.href || element?.getAttribute?.('data-href') || '');
        if (/^(?:ems apps?(?: offnen| öffnen)?|app center|app-center|appcenter)$/.test(signature)
            || /(?:^|[\/#?&_.-])(?:appcenter|app-center)(?:$|[\/#?&=_.-])/.test(href)) return 'ems';
        if (/^(?:simulation|simulator)$/.test(signature)
            || /(?:^|[\/#?&_.-])(?:simulation|simulator)(?:$|[\/#?&=_.-])/.test(href)) return 'simulation';
        if (/^(?:lizenz|license)$/.test(signature)
            || /(?:^|[\/#?&_.-])(?:license|lizenz)(?:$|[\/#?&=_.-])/.test(href)) return 'license';
        return '';
    };
    const isPrivilegedAction = element => !!privilegedActionKind(element);
    const canUsePrivilegedAction = element => {
        const action = privilegedActionKind(element);
        if (!action) return true;
        if (action === 'ems') {
            return state.role === 'admin'
                || (state.role === 'installer' && state.policy?.capabilities?.emsAppCenter !== false);
        }
        return state.role === 'admin';
    };
    const setPrivilegedActionHidden = (element, hidden) => {
        if (!element) return;
        const target = element.closest?.('a,button,[role="button"],[role="tab"],.MuiButtonBase-root') || element;
        if (hidden) {
            target.dataset.eosPrivilegedActionHidden = '1';
            target.classList.add('eos-role-hidden');
            target.setAttribute('aria-hidden', 'true');
            if ('disabled' in target) target.disabled = true;
        } else if (target.dataset.eosPrivilegedActionHidden === '1') {
            delete target.dataset.eosPrivilegedActionHidden;
            target.classList.remove('eos-role-hidden');
            target.removeAttribute('aria-hidden');
            if ('disabled' in target) target.disabled = false;
        }
    };
    const applyPrivilegedActionsInDocument = doc => safe(() => {
        if (!doc?.documentElement) return;
        doc.querySelectorAll('[data-eos-privileged-action-hidden="1"]').forEach(element => {
            if (!isPrivilegedAction(element) || canUsePrivilegedAction(element)) setPrivilegedActionHidden(element, false);
        });
        for (const element of doc.querySelectorAll('a,button,[role="button"],[role="tab"],.MuiButtonBase-root')) {
            if (isPrivilegedAction(element)) setPrivilegedActionHidden(element, !canUsePrivilegedAction(element));
        }
        if (!doc.documentElement.dataset.eosPrivilegedClickGuard) {
            doc.documentElement.dataset.eosPrivilegedClickGuard = '1';
            doc.addEventListener('click', event => {
                if (state.role === 'unknown') return;
                const target = event.target?.closest?.('a,button,[role="button"],[role="tab"],.MuiButtonBase-root');
                if (!target || !isPrivilegedAction(target) || canUsePrivilegedAction(target)) return;
                event.preventDefault();
                event.stopImmediatePropagation();
            }, true);
        }
        if (!privilegedFrameObservers.has(doc)) {
            const observer = new MutationObserver(() => {
                window.setTimeout(() => applyPrivilegedActionsInDocument(doc), 0);
            });
            observer.observe(doc.documentElement, { childList: true, subtree: true });
            privilegedFrameObservers.set(doc, observer);
        }
    });
    const applyPrivilegedIframePolicy = () => safe(() => {
        applyPrivilegedActionsInDocument(document);
        document.querySelectorAll('iframe').forEach(frame => {
            const applyFrame = () => safe(() => applyPrivilegedActionsInDocument(frame.contentDocument));
            if (frame.dataset.eosRoleFrameGuard !== '1') {
                frame.dataset.eosRoleFrameGuard = '1';
                frame.addEventListener('load', applyFrame);
            }
            applyFrame();
        });
    });
    const scrubInheritedUiAdminSession = () => safe(() => {
        if (state.role !== 'enduser') return;
        const user = String(state.policy?.user || state.policy?.userId || '').replace(/^system\.user\./, '') || state.role;
        const key = `eosUiAdminSessionScrubbed:v7109:${user}:${state.role}`;
        if (sessionStorage.getItem(key) === '1') return;
        sessionStorage.setItem(key, '1');
        const frame = document.createElement('iframe');
        frame.hidden = true;
        frame.tabIndex = -1;
        frame.setAttribute('aria-hidden', 'true');
        frame.src = `${window.location.protocol}//${window.location.hostname}:8188/logout?source=eos-admin&role=${encodeURIComponent(state.role)}&t=${Date.now()}`;
        frame.addEventListener('load', () => window.setTimeout(() => frame.remove(), 1200), { once: true });
        document.body?.appendChild(frame);
        window.setTimeout(() => frame.remove(), 7000);
    });
    const applyEndUserDatapointPolicy = () => safe(() => {
        const paper = appPaper();
        if (!paper) return;
        const readonly = state.role === 'enduser' && currentRoute() === 'tab-objects';
        paper.toggleAttribute('data-eos-datapoints-readonly', readonly);
        const clearControl = control => {
            if (!control) return;
            control.removeAttribute('aria-disabled');
            control.removeAttribute('data-eos-enduser-write-blocked');
            control.removeAttribute('data-eos-enduser-action-hidden');
            control.classList.remove('eos-role-hidden');
            control.removeAttribute('aria-hidden');
            if ('disabled' in control) control.disabled = false;
        };
        paper.querySelectorAll('[data-eos-enduser-write-blocked="1"],[data-eos-enduser-action-hidden="1"]').forEach(clearControl);
        if (!readonly) return;
        const blockControl = control => {
            if (!control) return;
            control.setAttribute('aria-disabled', 'true');
            control.setAttribute('data-eos-enduser-write-blocked', '1');
        };
        const hideControl = control => {
            if (!control) return;
            control.setAttribute('aria-disabled', 'true');
            control.setAttribute('data-eos-enduser-action-hidden', '1');
            control.classList.add('eos-role-hidden');
            control.setAttribute('aria-hidden', 'true');
            if ('disabled' in control) control.disabled = true;
        };
        paper.querySelectorAll('[data-eos-object-writable="1"]').forEach(blockControl);
        paper.querySelectorAll([
            'button[title*="edit" i]','button[title*="delete" i]','button[title*="remove" i]','button[title*="setting" i]','button[title*="einstell" i]',
            'button[aria-label*="edit" i]','button[aria-label*="delete" i]','button[aria-label*="remove" i]','button[aria-label*="setting" i]','button[aria-label*="einstell" i]',
            '[role="button"][title*="edit" i]','[role="button"][title*="delete" i]','[role="button"][title*="setting" i]',
            '[role="button"][aria-label*="edit" i]','[role="button"][aria-label*="delete" i]','[role="button"][aria-label*="setting" i]'
        ].join(',')).forEach(hideControl);
        paper.querySelectorAll('svg[data-testid*="Edit"],svg[data-testid*="Delete"],svg[data-testid*="Settings"],svg[data-testid*="Tune"],svg[data-testid*="Build"]').forEach(icon => hideControl(icon.closest('button,[role="button"]')));
    });
    const clearLegacyHeuristicRestrictionsForAdmin = () => safe(() => {
        if (state.role !== 'admin') return;
        document.querySelectorAll('[data-eos-role-hidden]').forEach(element => {
            element.removeAttribute('data-eos-role-hidden');
            element.removeAttribute('aria-hidden');
            element.style.removeProperty('display');
        });
        document.querySelectorAll('[data-eos-readonly],[data-eos-enduser-write-blocked],[data-eos-enduser-action-hidden]').forEach(element => {
            element.removeAttribute('data-eos-readonly');
            element.removeAttribute('data-eos-enduser-write-blocked');
            element.removeAttribute('data-eos-enduser-action-hidden');
            element.removeAttribute('aria-disabled');
            element.style.removeProperty('pointer-events');
            element.style.removeProperty('opacity');
            if ('disabled' in element) element.disabled = false;
        });
    });

    const apply = () => {
        if (!state.policy || state.role === 'unknown') return;
        setRoleClasses(state.role);
        if (lockExpertMode()) return;
        applyMenuPolicy();
        markAdminOnlyToolbarControls();
        applySensitiveDialogPolicy();
        clearLegacyHeuristicRestrictionsForAdmin();
        redirectIfNeeded();
        ensureSafeOverview();
        applyReadonlySystemInfoCard();
        filterNativeUsersPage();
        hideOfficialReserveSurfaces();
        applyEndUserDatapointPolicy();
        applyPrivilegedIframePolicy();
        scrubInheritedUiAdminSession();
        ensureReserveObserver();
        suppressPermissionErrors();
        window.NEXOWATT_EOS_ACCOUNT_MANAGEMENT?.refreshEntry?.();
    };
    const scheduleApply = () => {
        if (state.scheduled) return;
        state.scheduled = true;
        const run = () => { state.scheduled = false; apply(); };
        if ('requestAnimationFrame' in window) requestAnimationFrame(run); else setTimeout(run, 16);
    };
    const applyPolicy = policy => {
        if (!policy || policy.role === 'unknown') return;
        const role = roleFromPolicy(policy);
        state.policy = { ...policy, role }; state.role = role;
        window.NEXOWATT_EOS_ROLE_POLICY = state.policy; window.NEXOWATT_EOS_ACCESS_ROLE = role;
        scheduleApply();
    };
    const connectPolicyClient = () => {
        const client = window.NEXOWATT_EOS_POLICY_CLIENT;
        if (!client) { setTimeout(connectPolicyClient, 150); return; }
        applyPolicy(client.getPolicy?.() || window.NEXOWATT_EOS_BOOTSTRAP_POLICY);
        state.unsubscribePolicy?.(); state.unsubscribePolicy = client.subscribe?.(applyPolicy);
        void client.refresh?.();
    };
    const startObserver = () => {
        const coordinator = window.NEXOWATT_EOS_DOM_COORDINATOR;
        if (!coordinator?.subscribe) { setTimeout(startObserver, 200); return; }
        if (state.unsubscribeDom) return;
        state.unsubscribeDom = coordinator.subscribe(mutations => {
            if (isHighLoadSurface() && mutations.length && mutations.every(m => isInsideAppPaper(m.target) || isInsideAppPaper(m.addedNodes?.[0]))) {
                // Keep virtualized service/adapter tables light, but still enforce the exact internal
                // reserve visibility rule whenever rows arrive after the initial render.
                hideOfficialReserveSurfaces();
                suppressPermissionErrors();
                return;
            }
            scheduleApply();
        }, { includeTableMutations: true });
    };

    document.addEventListener('click', event => {
        if (state.role === 'admin' || state.role === 'unknown') return;
        const clickedButton = event.target?.closest?.('button');
        if (clickedButton && isExpertModeButton(clickedButton)) {
            event.preventDefault(); event.stopImmediatePropagation(); lockExpertMode(); return;
        }
        if (clickedButton && isHeaderSystemSettingsButton(clickedButton)) {
            event.preventDefault(); event.stopImmediatePropagation();
            if (state.role === 'installer') window.NEXOWATT_EOS_BASIC_SETTINGS?.open?.();
            return;
        }
        if (state.role === 'enduser' && currentRoute() === 'tab-objects') {
            const writeTarget = event.target?.closest?.('[data-eos-object-writable="1"],[data-eos-enduser-write-blocked="1"],button[title*="edit" i],button[title*="delete" i],button[aria-label*="edit" i],button[aria-label*="delete" i]');
            if (writeTarget) { event.preventDefault(); event.stopImmediatePropagation(); return; }
        }
        const target = event.target?.closest?.('[data-eos-admin-only-control="1"],[data-eos-system-settings-control="1"],[data-eos-role-tab],a[href*="#tab-"],a[href*="#/tab-"]');
        if (!target) return;
        if (target.matches('[data-eos-admin-only-control="1"]')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
        if (isHeaderSystemSettingsButton(target) && state.role === 'installer') {
            event.preventDefault(); event.stopImmediatePropagation(); window.NEXOWATT_EOS_BASIC_SETTINGS?.open?.(); return;
        }
        const roleTab = target.getAttribute('data-eos-role-tab');
        if (roleTab) {
            event.preventDefault();
            event.stopImmediatePropagation();
            navigateToTab(roleTab, target.textContent || '');
            return;
        }
        const tab = tabFromHref(target.getAttribute('href') || target.href || '');
        if (tab && !isRouteAllowed(state.role, tab, textOf(target))) {
            event.preventDefault(); event.stopImmediatePropagation(); setHashTab(firstAllowedTab(state.role));
        }
    }, { capture: true, signal: abort.signal });

    window.NEXOWATT_EOS_ROLE_UI_API = Object.freeze({
        version: VERSION,
        getRole: () => state.role,
        getPolicy: () => state.policy,
        isRouteAllowed,
        isGloballyHiddenTab,
        isHeaderSystemSettingsButton,
        defaultTab,
        isOfficialReserveTab,
        isCustomerBackupTab,
        navigateToTab,
        ensureSafeOverview,
        hideOfficialReserveSurfaces,
        refresh: scheduleApply,
    });
    const start = () => {
        applyPolicy(window.NEXOWATT_EOS_BOOTSTRAP_POLICY);
        connectPolicyClient(); startObserver();
        window.addEventListener('hashchange', () => { state.redirects = 0; redirectIfNeeded(); scheduleApply(); }, { signal: abort.signal });
        window.addEventListener('storage', scheduleApply, { signal: abort.signal });
        [100, 350, 750, 1300, 2500].forEach(delay => setTimeout(scheduleApply, delay));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
