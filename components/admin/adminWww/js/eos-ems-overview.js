(() => {
    'use strict';
    const VERSION = 'v98-nexowatt-ems-overview-runtime';
    const CONTRACT = 'nexowatt-ems-overview-v1';
    const ROOT_ID = 'eos-ems-overview-runtime';
    const POLL_MS = 5000;
    const RETRY_MS = 650;
    const CONNECTION_WAIT_MS = 12000;
    const STALE_MS = 20000;
    const REQUIRED_UI_VERSION = '0.8.198';
    const COLORS = { ok: '#01bc69', info: '#48b9ff', warning: '#ffbd59', error: '#ff5f72' };
    let timer = 0;
    let retryTimer = 0;
    let inFlight = false;
    let destroyed = false;
    let socketCache = null;
    let startedAt = Date.now();

    const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    const text = (value, fallback = '') => String(value ?? fallback).replace(/\s+/g, ' ').trim() || fallback;
    const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const parse = (value, fallback) => { if (value && typeof value === 'object') return value; try { return JSON.parse(String(value ?? '')); } catch (_) { return fallback; } };
    const severity = value => { const normalized = String(value || '').toLowerCase(); if (normalized === 'error') return 'error'; if (normalized === 'warning' || normalized === 'warn') return 'warning'; if (normalized === 'ok') return 'ok'; return 'info'; };
    const currentTab = () => String(location.hash || '').match(/tab-[a-z0-9_-]+/i)?.[0]?.toLowerCase() || 'tab-intro';
    const currentRole = () => String(window.NEXOWATT_EOS_ACCESS_ROLE || 'admin').toLowerCase();
    const technical = () => ['admin', 'service', 'installer', 'installateur'].includes(currentRole());
    const formatPower = value => { const watts = num(value); const absolute = Math.abs(watts); const sign = watts < 0 ? '−' : ''; return absolute >= 1000 ? `${sign}${(absolute / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kW` : `${sign}${Math.round(absolute).toLocaleString('de-DE')} W`; };
    const formatAge = timestamp => { const value = num(timestamp); if (!value) return 'noch kein Regeltick'; const seconds = Math.max(0, Math.round((Date.now() - value) / 1000)); if (seconds < 2) return 'gerade eben'; if (seconds < 60) return `vor ${seconds} s`; return `vor ${Math.round(seconds / 60)} min`; };
    const formatClock = timestamp => { const value = num(timestamp); if (!value) return '—'; try { return new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (_) { return '—'; } };
    const stateVal = (states, id) => states?.[id]?.val;

    const isAdminSocket = candidate => Boolean(candidate && typeof candidate.getForeignStates === 'function');
    const rememberSocket = candidate => {
        if (!isAdminSocket(candidate)) return null;
        socketCache = candidate;
        try { window.NEXOWATT_EOS_ADMIN_SOCKET = candidate; window.NEXOWATT_EOS_SOCKET = candidate; } catch (_) { /* best effort */ }
        return candidate;
    };
    const socketFromFrames = () => {
        for (const frame of [window, window.parent, window.top]) {
            try {
                const candidate = frame?.NEXOWATT_EOS_ADMIN_SOCKET || frame?.NEXOWATT_EOS_SOCKET;
                if (isAdminSocket(candidate)) return rememberSocket(candidate);
            } catch (_) { /* cross-origin frame */ }
        }
        return null;
    };
    const socketFromReact = () => {
        const roots = [document.getElementById('app-paper'), document.getElementById('root')].filter(Boolean);
        const seen = new Set();
        const inspect = value => {
            if (!value || (typeof value !== 'object' && typeof value !== 'function') || seen.has(value)) return null;
            seen.add(value);
            if (isAdminSocket(value)) return rememberSocket(value);
            for (const key of ['socket', 'props', 'memoizedProps', 'memoizedState', 'stateNode', 'return', 'child', 'sibling']) {
                try { const found = inspect(value[key]); if (found) return found; } catch (_) { /* ignore inaccessible property */ }
            }
            return null;
        };
        for (const root of roots) {
            for (const key of Object.getOwnPropertyNames(root)) {
                if (!key.startsWith('__react')) continue;
                try { const found = inspect(root[key]); if (found) return found; } catch (_) { /* ignore */ }
            }
        }
        return null;
    };
    const getSocket = () => isAdminSocket(socketCache) ? socketCache : (socketFromFrames() || socketFromReact());

    const normalizeInstances = (states, aliveStates) => {
        const prefixes = new Set();
        Object.keys(states || {}).forEach(id => { const match = id.match(/^(nexowatt-ui\.\d+)\.info\.adminOverview\./); if (match) prefixes.add(match[1]); });
        return Array.from(prefixes).map(instance => {
            const summaryId = `${instance}.info.adminOverview.summaryJson`;
            const summary = parse(stateVal(states, summaryId), {});
            const events = parse(stateVal(states, `${instance}.info.adminOverview.eventsJson`), []);
            const updatedAt = Math.max(num(summary.updatedAt), num(summary.generatedAt), num(stateVal(states, `${instance}.info.adminOverview.updatedAt`)), num(states?.[summaryId]?.ts));
            const rawAlive = stateVal(aliveStates, `system.adapter.${instance}.alive`);
            const alive = rawAlive == null ? null : (rawAlive === true || rawAlive === 1 || ['true', '1', 'online', 'active'].includes(String(rawAlive).toLowerCase()));
            return { instance, alive, summary: { ...summary, status: severity(summary.status || stateVal(states, `${instance}.info.adminOverview.status`)), headline: text(summary.headline || stateVal(states, `${instance}.info.adminOverview.headline`), 'EMS-Diagnose wird aufgebaut'), reason: text(summary.reason || stateVal(states, `${instance}.info.adminOverview.reason`), ''), binding: text(summary.binding || stateVal(states, `${instance}.info.adminOverview.binding`), 'none') }, events: Array.isArray(events) ? events : [], updatedAt };
        }).sort((a, b) => Number(b.alive === true) - Number(a.alive === true) || b.updatedAt - a.updatedAt || a.instance.localeCompare(b.instance));
    };

    const ensureRoot = () => {
        const reactCard = document.querySelector(`[data-nexowatt-contract="${CONTRACT}"]:not(#${ROOT_ID})`);
        if (reactCard) { document.getElementById(ROOT_ID)?.remove(); return null; }
        const paper = document.getElementById('app-paper');
        if (!paper || currentTab() !== 'tab-intro') return null;
        let root = document.getElementById(ROOT_ID);
        if (!root) {
            root = document.createElement('section');
            root.id = ROOT_ID;
            root.className = 'eos-ems-overview-card is-loading';
            root.dataset.nexowattContract = CONTRACT;
        }
        const hero = document.getElementById('eos-native-overview-hero');
        if (hero?.parentElement === paper) paper.insertBefore(root, hero.nextSibling); else paper.insertBefore(root, paper.firstChild || null);
        return root;
    };
    const setMode = (root, mode) => { root.classList.remove('is-loading', 'is-unavailable', 'is-ready'); root.classList.add(`is-${mode}`); };
    const loading = message => {
        const root = ensureRoot(); if (!root) return;
        setMode(root, 'loading');
        root.style.setProperty('--eos-ems-status-color', COLORS.info);
        root.innerHTML = `<header class="eos-ems-overview-header"><div><span class="eos-ems-overview-eyebrow">NexoWatt EMS</span><h2>Live-Diagnose wird verbunden</h2><p>${esc(message)}</p></div><div class="eos-ems-overview-state"><span class="eos-ems-overview-state-dot eos-ems-overview-state-dot--pulse"></span><strong>Verbindung</strong><small>automatischer Neuversuch</small></div></header>`;
    };
    const unavailable = (message, detail = '') => {
        const root = ensureRoot(); if (!root) return;
        setMode(root, 'unavailable');
        root.style.setProperty('--eos-ems-status-color', COLORS.info);
        root.innerHTML = `<header class="eos-ems-overview-header"><div><span class="eos-ems-overview-eyebrow">NexoWatt EMS</span><h2>Live-Diagnose nicht verfügbar</h2><p>${esc(message)}</p>${detail ? `<small class="eos-ems-overview-help">${esc(detail)}</small>` : ''}</div><div class="eos-ems-overview-state"><span class="eos-ems-overview-state-dot"></span><strong>Nicht verfügbar</strong><small>read-only</small></div></header><footer class="eos-ems-overview-footer"><span>Die Kachel liest ausschließlich info.adminOverview.*.</span><span>Keine EMS-Regelung wurde verändert.</span></footer>`;
    };
    const semverAtLeast = (value, minimum) => {
        const parseVersion = input => String(input || '').split('-')[0].split('.').map(part => Number.parseInt(part, 10) || 0);
        const current = parseVersion(value); const required = parseVersion(minimum);
        for (let index = 0; index < Math.max(current.length, required.length); index++) {
            const left = current[index] || 0; const right = required[index] || 0;
            if (left !== right) return left > right;
        }
        return true;
    };
    const readUiAdapterInfo = async socket => {
        try {
            if (typeof socket.getAdapterInstances === 'function') {
                const rows = await socket.getAdapterInstances('nexowatt-ui', true);
                const instances = Array.isArray(rows) ? rows : [];
                const selected = instances.find(row => row?.common?.enabled) || instances[0];
                if (selected) return { installed: true, enabled: selected.common?.enabled !== false, version: text(selected.common?.version, ''), id: text(selected._id, '') };
            }
        } catch (_) { /* next fallback */ }
        try {
            if (typeof socket.getObjectViewSystem === 'function') {
                const rows = await socket.getObjectViewSystem('instance', 'system.adapter.nexowatt-ui.', 'system.adapter.nexowatt-ui.香');
                const values = Array.isArray(rows) ? rows : Object.values(rows || {});
                const selected = values.find(row => row?.common?.enabled) || values[0];
                if (selected) return { installed: true, enabled: selected.common?.enabled !== false, version: text(selected.common?.version, ''), id: text(selected._id, '') };
            }
        } catch (_) { /* permission or compatibility */ }
        return { installed: false, version: '', enabled: false, id: '' };
    };

    const fallbackDecisions = summary => {
        const result = []; const charging = summary.charging || {}; const storage = summary.storage || {};
        if (charging.available) result.push({ severity: num(charging.faultCount) > 0 ? 'error' : num(charging.waitingCount) > 0 ? 'info' : 'ok', title: `${num(charging.activeCount)} lädt · ${num(charging.waitingCount)} wartet · ${num(charging.faultCount)} gestört`, reason: text(charging.limiterText || charging.status, 'Lademanagement aktiv'), details: `Ist ${formatPower(charging.actualW)} · Soll ${formatPower(charging.targetW)}` });
        if (storage.available) result.push({ severity: storage.writeOk === false ? 'error' : 'ok', title: `Speicher ${text(storage.topology, 'aktiv')}${storage.socPct != null ? ` · SoC ${Math.round(num(storage.socPct))} %` : ''}`, reason: text(storage.reason, 'Speicherregelung aktiv'), details: `Ist ${formatPower(storage.actualW)} · Soll ${formatPower(storage.targetW)}` });
        return result;
    };

    const render = data => {
        const root = ensureRoot(); if (!root) return;
        setMode(root, 'ready');
        const summary = data.summary || {}; const budget = summary.budget || {}; const charging = summary.charging || {}; const storage = summary.storage || {}; const ems = summary.ems || {}; const para14a = summary.para14a || {}; const tariff = summary.tariff || {}; const forecast = summary.forecast || {}; const peak = summary.peakShaving || {};
        const stale = data.alive === false || !data.updatedAt || Date.now() - data.updatedAt > STALE_MS;
        const status = stale ? 'error' : severity(summary.status); root.style.setProperty('--eos-ems-status-color', COLORS[status]);
        const totalBudget = Math.max(0, num(budget.totalW)); const remaining = Math.max(0, num(budget.remainingW)); const percent = totalBudget > 0 ? Math.max(0, Math.min(100, remaining / totalBudget * 100)) : 0;
        const isTechnical = technical(); const decisions = (Array.isArray(summary.currentDecisions) ? summary.currentDecisions : fallbackDecisions(summary)).slice(0, isTechnical ? 5 : 2); const events = isTechnical ? data.events.slice(0, 6) : [];
        const tags = [];
        if (text(summary.binding, 'none') !== 'none') tags.push({ label: `Bindend: ${text(budget.bindingText || summary.binding)}`, warning: true });
        if (para14a.communicationFallbackActive) tags.push({ label: `§14a-Fallback ${formatPower(para14a.fallbackCapW)}`, warning: true }); else if (para14a.binding) tags.push({ label: '§14a begrenzt', warning: true });
        if (peak.active) tags.push({ label: `Peak-Shaving: ${text(peak.status, 'aktiv')}`, warning: true });
        if (tariff.available) tags.push({ label: `Tarif: ${text(tariff.state, 'aktiv')}${tariff.priceEurPerKwh != null ? ` · ${num(tariff.priceEurPerKwh).toFixed(3)} €/kWh` : ''}` });
        if (forecast.available) tags.push({ label: `Prognose: ${text(forecast.source, 'aktiv')}${forecast.fresh === false ? ' · veraltet' : ''}`, warning: forecast.fresh === false });
        if (ems.safetyActive || ems.safetyEmergencyStop || ems.safetyValid === false) tags.push({ label: 'EOS Safety aktiv', warning: true });
        const metrics = `<div class="eos-ems-overview-metric"><span>EMS-Budget</span><strong>${totalBudget > 0 ? esc(formatPower(totalBudget)) : 'nicht begrenzt'}</strong><small>Rest ${esc(formatPower(remaining))}</small></div><div class="eos-ems-overview-metric"><span>Lademanagement</span><strong>${esc(formatPower(charging.actualW))} / ${esc(formatPower(charging.targetW))}</strong><small>${num(charging.activeCount)} lädt · ${num(charging.waitingCount)} wartet</small></div>${storage.available ? `<div class="eos-ems-overview-metric"><span>Speicher ${esc(text(storage.topology))}</span><strong>${esc(formatPower(storage.actualW))} / ${esc(formatPower(storage.targetW))}</strong><small>${storage.socPct != null ? `SoC ${Math.round(num(storage.socPct))} %` : esc(text(storage.reason, 'aktiv'))}</small></div>` : `<div class="eos-ems-overview-metric"><span>PV-Budget</span><strong>${esc(formatPower(budget.pvBudgetW))}</strong><small>PV-Rest ${esc(formatPower(budget.remainingPvW))}</small></div>`}<div class="eos-ems-overview-metric"><span>Letzter Regeltick</span><strong>${esc(formatAge(ems.lastTickTs || data.updatedAt))}</strong><small>${isTechnical ? `Zyklus ${num(ems.cycleMs)} ms` : esc(text(ems.decision, 'EMS aktiv'))}</small></div>`;
        const decisionsHtml = decisions.length ? decisions.map(item => `<div class="eos-ems-overview-decision eos-ems-overview-decision--${severity(item.severity)}"><strong>${esc(text(item.title, 'EMS-Entscheidung'))}</strong><span>${esc(text(item.reason, 'Keine zusätzliche Begrenzung'))}</span>${isTechnical && item.details ? `<small>${esc(item.details)}</small>` : ''}</div>`).join('') : '<div class="eos-ems-overview-empty">Keine aktiven Regelentscheidungen. EOS arbeitet mit den aktuellen Messwerten.</div>';
        const eventsHtml = isTechnical ? (events.length ? events.map(item => `<div class="eos-ems-overview-event eos-ems-overview-event--${severity(item.severity)}"><time>${esc(formatClock(item.ts))}</time><div><strong>${esc(text(item.title, 'EMS'))}</strong><span>${esc(text(item.message || item.reason, 'Zustand aktualisiert'))}</span></div></div>`).join('') : '<div class="eos-ems-overview-empty">Noch keine Zustandsänderung im begrenzten Ereignispuffer.</div>') : `<div class="eos-ems-overview-decision eos-ems-overview-decision--info"><strong>${esc(text(summary.headline, 'EMS aktiv'))}</strong><span>${esc(text(summary.reason, 'EOS optimiert die Anlage innerhalb aller Sicherheitsgrenzen.'))}</span></div>`;
        root.innerHTML = `<header class="eos-ems-overview-header"><div><span class="eos-ems-overview-eyebrow">NexoWatt EMS · Live-Diagnose</span><h2>${esc(stale ? 'EMS-Diagnose ist nicht aktuell' : text(summary.headline, 'EMS arbeitet normal'))}</h2><p>${esc(stale ? 'Adapter oder Diagnosewerte sind älter als 20 Sekunden. Die Werte werden als veraltet markiert.' : text(summary.reason, 'EMS arbeitet innerhalb aller aktiven Grenzen.'))}</p></div><div class="eos-ems-overview-state"><span class="eos-ems-overview-state-dot"></span><strong>${stale ? 'Offline / veraltet' : ({ok:'Normal',info:'Information',warning:'Begrenzt',error:'Störung'}[status])}</strong><small>${esc(data.instance)} · ${esc(formatAge(data.updatedAt))}</small></div></header><div class="eos-ems-overview-metrics">${metrics}</div>${totalBudget > 0 ? `<div class="eos-ems-overview-budget" title="${percent.toFixed(1)} % Restbudget"><span style="width:${percent}%"></span></div>` : ''}${tags.length ? `<div class="eos-ems-overview-tags">${tags.map(tag => `<span class="${tag.warning ? 'is-warning' : ''}">${esc(tag.label)}</span>`).join('')}</div>` : ''}<div class="eos-ems-overview-columns"><div class="eos-ems-overview-panel"><h3>Aktuelle Regelentscheidungen</h3>${decisionsHtml}</div><div class="eos-ems-overview-panel"><h3>${isTechnical ? 'Letzte EMS-Ereignisse' : 'Systemerklärung'}</h3>${eventsHtml}</div></div><footer class="eos-ems-overview-footer"><span>Diagnose ist rein lesend. Keine Kachel besitzt Schreibhoheit.</span></footer>`;
    };

    const scheduleFastRetry = () => {
        if (destroyed || retryTimer) return;
        retryTimer = window.setTimeout(() => { retryTimer = 0; void load(); }, RETRY_MS);
    };
    const load = async () => {
        if (destroyed || inFlight || document.visibilityState === 'hidden' || currentTab() !== 'tab-intro') return;
        const socket = getSocket();
        if (!socket) {
            if (Date.now() - startedAt < CONNECTION_WAIT_MS) {
                loading('Die sichere Admin-Verbindung wird hergestellt. Die Kachel aktualisiert sich automatisch.');
                scheduleFastRetry();
            } else {
                unavailable('Die Admin-Verbindung konnte nicht übernommen werden.', 'Bitte die Seite einmal mit Strg + F5 neu laden. Die übrige EOS-Oberfläche bleibt unverändert nutzbar.');
            }
            return;
        }
        inFlight = true;
        try {
            const [states, alive] = await Promise.all([
                socket.getForeignStates('nexowatt-ui.*.info.adminOverview.*'),
                socket.getForeignStates('system.adapter.nexowatt-ui.*.alive'),
            ]);
            const instances = normalizeInstances(states || {}, alive || {});
            if (instances.length) {
                render(instances[0]);
            } else {
                const info = await readUiAdapterInfo(socket);
                if (!info.installed) {
                    unavailable('NexoWatt UI ist nicht installiert oder für dieses Benutzerkonto nicht sichtbar.', `Für die vollständige Kachel wird iobroker.nexowatt-ui ab ${REQUIRED_UI_VERSION} benötigt.`);
                } else if (info.version && !semverAtLeast(info.version, REQUIRED_UI_VERSION)) {
                    unavailable(`NexoWatt UI ${info.version} ist installiert, enthält den Diagnosevertrag aber noch nicht.`, `Bitte NexoWatt UI mindestens auf ${REQUIRED_UI_VERSION} aktualisieren und die Instanz danach neu starten.`);
                } else if (info.enabled === false) {
                    unavailable(`NexoWatt UI ${info.version || ''} ist installiert, aber deaktiviert.`, 'Bitte die UI-Instanz starten. Danach aktualisiert sich die Kachel automatisch.');
                } else {
                    unavailable(`NexoWatt UI ${info.version || ''} ist aktiv, veröffentlicht aber noch keine info.adminOverview.*-Werte.`, 'Bitte die NexoWatt-UI-Instanz einmal neu starten. Bleibt der Channel aus, ist der AdminOverviewPublisher der installierten UI-Version zu prüfen.');
                }
            }
        } catch (error) {
            const message = text(error?.message || error, 'unbekannter Fehler');
            const permission = /permission|access|not allowed|denied/i.test(message);
            unavailable(permission ? 'Dieses Benutzerkonto darf die EMS-Diagnosewerte derzeit nicht lesen.' : `EMS-Diagnose konnte nicht gelesen werden: ${message}`, permission ? 'Die Datenpunkte unter nexowatt-ui.*.info.adminOverview.* benötigen Leserechte für die jeweilige EOS-Rolle.' : 'Die Kachel ist rein lesend; es wurde keine EMS-Regelung verändert.');
        } finally { inFlight = false; }
    };

    const apply = () => {
        document.getElementById('eos-role-safe-overview')?.remove();
        document.documentElement.classList.remove('eos-safe-overview-active');
        if (currentTab() !== 'tab-intro') { document.getElementById(ROOT_ID)?.remove(); return; }
        ensureRoot(); void load();
    };
    const onSocketReady = event => {
        rememberSocket(event?.detail?.socket || window.NEXOWATT_EOS_ADMIN_SOCKET || window.NEXOWATT_EOS_SOCKET);
        startedAt = Date.now();
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = 0; }
        void load();
    };
    const start = () => {
        startedAt = Date.now();
        apply();
        timer = window.setInterval(apply, POLL_MS);
        window.addEventListener('hashchange', apply);
        window.addEventListener('nexowatt-eos-admin-socket-ready', onSocketReady);
        document.addEventListener('visibilitychange', apply);
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start, { once: true }) : start();
    window.NEXOWATT_EOS_EMS_OVERVIEW = Object.freeze({ version: VERSION, contract: CONTRACT, refresh: apply, destroy() { destroyed = true; if (timer) clearInterval(timer); if (retryTimer) clearTimeout(retryTimer); window.removeEventListener('nexowatt-eos-admin-socket-ready', onSocketReady); document.getElementById(ROOT_ID)?.remove(); } });
})();
