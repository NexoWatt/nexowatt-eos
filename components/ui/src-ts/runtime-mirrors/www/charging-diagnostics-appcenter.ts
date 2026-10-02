// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/charging-diagnostics-appcenter.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/charging-diagnostics-appcenter.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 4e8a3b015d47d8813fcf0273f7a2ad345824f05c0627181330a846b727ca221c
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/charging-diagnostics-appcenter.ts
 * Quell-Hash: sha256:3c8863637ce9f032276df2da9a16484df3a0eb899bc7ea19db8426f90eba565c
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/charging-diagnostics-appcenter.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Zeigt Ladeentscheidungen und Auditinformationen im Diagnosebereich des App-Centers an.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/charging-diagnostics-appcenter.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Read-only AppCenter renderer for the charging-management live diagnostic and event log.
 * The browser module reads installer diagnostics only; it never writes charging setpoints.
 */
(function () {
    'use strict';
    const LIMITER_TEXT = Object.freeze({
        none: 'Keine Begrenzung', 'eos-safety-stop': 'EOS Safety Stop',
        'stale-meter-failsafe': 'Messwert-Failsafe', 'grid-and-phase': 'Netz- und Phasengrenze',
        'grid-import': 'Netzanschluss / Importgrenze', 'grid-monitor': 'Netzschutz überwacht',
        'export-limit': 'Export-Limit', 'export-monitor': 'Export-Limit überwacht',
        phase: 'Phasengrenze', para14a: '§14a',
        station: 'Stationsgrenze', device: 'Ladepunkt-/Gerätegrenze', budget: 'Verfügbares Ladebudget',
        'peak-shaving': 'Peak-Shaving', 'pv-surplus': 'PV-Überschuss fehlt / reicht nicht',
        'no-charge-demand': 'Fahrzeug fordert keine Ladung', 'no-vehicle': 'Kein Fahrzeug',
        'no-setpoint': 'Kein schreibbarer Sollwert', 'write-error': 'Hardware-Write nicht bestätigt',
        fault: 'Gerätestörung', unavailable: 'Ladepunkt nicht verfügbar', offline: 'Ladepunkt offline',
        disabled: 'Regelung / Ladepunkt deaktiviert',
    });
    const REASON_TEXT = Object.freeze({
        OK: 'Regelung ohne Begrenzung', ALLOCATED: 'Leistung wurde zugewiesen',
        STALE_METER: 'Pflichtmesswert ist veraltet', SAFETY_OVERLOAD: 'Sicherheitsabschaltung wegen Überlast',
        LIMITED_BY_BUDGET: 'Verfügbares Gesamtbudget begrenzt',
        LIMITED_BY_GRID_IMPORT: 'Netzanschluss-/Importgrenze begrenzt',
        LIMITED_BY_PHASE_CAP: 'Eine Phasengrenze begrenzt',
        LIMIT_POWER_AND_PHASE: 'Netz- und Phasengrenze begrenzen gemeinsam',
        LIMITED_BY_STATION_CAP: 'Gemeinsame Stationsgrenze begrenzt',
        LIMITED_BY_USER_LIMIT: 'Konfigurierte Ladepunkt-/Benutzergrenze begrenzt',
        LIMITED_BY_14A: '§14a-Netzbezugsbudget begrenzt',
        NO_SETPOINT: 'Kein schreibbarer Strom-/Leistungssollwert zugeordnet',
        NO_BUDGET: 'Kein freies Ladebudget', BELOW_MIN: 'Budget liegt unter der technischen Mindestleistung',
        NO_PV_SURPLUS: 'Kein ausreichender PV-Überschuss',
        PAUSED_BY_PEAK_SHAVING: 'Lastspitzenkappung pausiert/reduziert die Ladung',
        NO_VEHICLE: 'Kein Fahrzeug verbunden', CONTROL_DISABLED: 'Lademanagement durch Benutzer deaktiviert',
        DISABLED: 'Ladepunkt oder Station deaktiviert', OFFLINE: 'Ladepunkt ist offline',
        FAULTED: 'Ladepunkt meldet eine Störung', UNAVAILABLE: 'Ladepunkt ist nicht verfügbar',
    });
    let refs = null;
    let payload = null;
    let refreshing = false;
    let timer = null;
/**
 * Code-Teil: byId
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const byId = (id) => document.getElementById(id);
/**
 * Code-Teil: getRefs
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const getRefs = () => ({
        summary: byId('chargingAuditSummary'), wallboxes: byId('chargingAuditWallboxes'),
        events: byId('chargingAuditEvents'), status: byId('chargingAuditStatus'),
        refresh: byId('refreshChargingAudit'),
        autoRefresh: byId('chargingAuditAutoRefresh'),
        onlyProblems: byId('chargingAuditOnlyProblems'),
        filter: byId('chargingAuditFilter'),
        exportJson: byId('exportChargingAuditJson'),
        exportCsv: byId('exportChargingAuditCsv'),
        clear: byId('clearChargingAudit'),
    });
/**
 * Code-Teil: fmtW
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const fmtW = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n))
            return '—';
        return Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(2)} kW` : `${Math.round(n)} W`;
    };
/**
 * Code-Teil: fmtTs
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const fmtTs = (value) => {
        const d = new Date(Number(value));
        return Number.isFinite(d.getTime()) ? d.toLocaleString() : '—';
    };
/**
 * Code-Teil: limiterText
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const limiterText = (value) => {
        const key = String(value || 'none').trim().toLowerCase();
        return LIMITER_TEXT[key] || key || LIMITER_TEXT.none;
    };
/**
 * Code-Teil: reasonText
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const reasonText = (value) => {
        const raw = String(value || '').trim();
        if (!raw)
            return '—';
        const upper = raw.toUpperCase();
        if (REASON_TEXT[upper])
            return REASON_TEXT[upper];
        if (upper.startsWith('SAFETY-CLAMPED:'))
            return `Finale Safety-Firewall: ${raw.slice(raw.indexOf(':') + 1)}`;
        if (upper.includes('WRITE_FAILED') || upper.includes('EXECUTOR_ERROR'))
            return `Hardware-Write nicht bestätigt: ${raw}`;
        return raw;
    };
/**
 * Code-Teil: kind
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const kind = (limiter, severity = '') => {
        const sev = String(severity || '').toLowerCase();
        const lim = String(limiter || 'none').toLowerCase();
        if (sev === 'error' || ['eos-safety-stop', 'stale-meter-failsafe', 'write-error', 'fault', 'offline', 'unavailable', 'no-setpoint'].includes(lim))
            return 'error';
        if (sev === 'warn' || !['none', 'no-vehicle', 'no-charge-demand', 'pv-surplus', 'grid-monitor', 'export-monitor'].includes(lim))
            return 'warn';
        return 'ok';
    };
/**
 * Code-Teil: setStatus
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const setStatus = (text, statusKind = 'idle') => {
        if (!refs?.status)
            return;
        refs.status.textContent = text || '—';
        refs.status.className = `nw-config-badge nw-config-badge--${statusKind || 'idle'}`;
    };
/**
 * Code-Teil: metric
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const metric = (label, value, metricKind = '') => {
        const node = document.createElement('div');
        node.className = `nw-charging-audit__metric${metricKind ? ` nw-charging-audit__metric--${metricKind}` : ''}`;
        const l = document.createElement('div');
        l.className = 'nw-charging-audit__metric-label';
        l.textContent = label;
        const v = document.createElement('div');
        v.className = 'nw-charging-audit__metric-value';
        v.textContent = value;
        node.append(l, v);
        return node;
    };
/**
 * Code-Teil: selectedSafe
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const selectedSafe = () => String(refs?.filter?.value || '');
/**
 * Code-Teil: onlyProblems
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const onlyProblems = () => refs?.onlyProblems?.checked === true;
/**
 * Code-Teil: fetchJson
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function fetchJson(url, options = {}) {
        const init = { cache: 'no-store', credentials: 'same-origin', ...options };
        if (init.body && !new Headers(init.headers).has('content-type'))
            init.headers = { ...(init.headers || {}), 'content-type': 'application/json' };
        const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, init);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.ok === false)
            throw new Error(String(data?.error || `${response.status} ${response.statusText}`));
        return data;
    }
/**
 * Code-Teil: updateFilter
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function updateFilter(snapshot) {
        if (!refs?.filter)
            return;
        const selected = selectedSafe();
        const rows = Array.isArray(snapshot.wallboxes) ? snapshot.wallboxes : [];
        const existing = new Map(Array.from(refs.filter.options).map((option) => [String(option.value), option]));
        for (const row of rows) {
            const safe = String(row.safe || '');
            if (!safe || existing.has(safe))
                continue;
            const option = document.createElement('option');
            option.value = safe;
            option.textContent = `${row.name || safe} (${safe})`;
            refs.filter.appendChild(option);
        }
        refs.filter.value = !selected || rows.some((row) => String(row.safe || '') === selected) ? selected : '';
    }
/**
 * Code-Teil: render
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function render(data) {
        if (!refs?.summary || !refs.wallboxes || !refs.events)
            return;
        const audit = data?.audit && typeof data.audit === 'object' ? data.audit : {};
        const snapshot = audit.snapshot && typeof audit.snapshot === 'object' ? audit.snapshot : null;
        const events = Array.isArray(audit.events) ? audit.events : [];
        payload = data;
        refs.summary.replaceChildren();
        refs.wallboxes.replaceChildren();
        refs.events.replaceChildren();
        if (!snapshot) {
            const empty = document.createElement('div');
            empty.className = 'nw-charging-audit__empty';
            empty.textContent = 'Noch kein Lademanagement-Snapshot vorhanden. Nach dem nächsten EOS-Zyklus erneut aktualisieren.';
            refs.summary.appendChild(empty);
            setStatus('Noch keine Auditdaten', 'warn');
            return;
        }
        updateFilter(snapshot);
        const limiter = String(snapshot.activeLimiter || 'none');
        const globalKind = kind(limiter, snapshot.safetyStage === 'EOS-SAFETY-STOP' ? 'error' : '');
        const stageA = data?.stageA && typeof data.stageA === 'object' ? data.stageA : null;
        const stageAStatus = stageA ? String(stageA.summary || stageA.status || 'vorhanden') : 'nicht aktiv / keine Daten';
        const stageAKind = stageA && /error|fault|conflict|block/i.test(JSON.stringify(stageA)) ? 'warn' : 'ok';
        const globalMetrics = [
            ['Aktive Begrenzung', limiterText(limiter), globalKind], ['Sicherungsstufe', String(snapshot.safetyStage || 'NORMAL'), globalKind],
            ['Verfügbares Budget', fmtW(snapshot.budgetW), ''], ['Istleistung EVCS', fmtW(snapshot.actualPowerW), ''],
            ['NexoWatt Soll gesamt', fmtW(snapshot.targetPowerW), ''], ['Reserviert', fmtW(snapshot.reservedPowerW), ''],
            ['Restbudget', fmtW(snapshot.remainingPowerW), ''],
            ['Netzanschluss-Gate', snapshot.grid?.binding ? `BEGRENZT · ${fmtW(snapshot.grid.evcsCapW)}` : `überwacht · ${fmtW(snapshot.grid?.evcsCapW)}`, snapshot.grid?.binding ? 'warn' : 'ok'],
            ['NVP-Hard-Headroom', fmtW(snapshot.grid?.hardHeadroomRawW), ''],
            ['EVCS Anforderung / zulässig', `${fmtW(snapshot.grid?.requestedW)} / ${fmtW(snapshot.grid?.allowedW)}`, snapshot.grid?.binding ? 'warn' : ''],
            ['Durch Netz-Gate reduziert', fmtW(snapshot.grid?.reductionW), snapshot.grid?.binding ? 'warn' : 'ok'],
            ['Offline-Reserve', fmtW(snapshot.grid?.offlineReserveW), Number(snapshot.grid?.offlineReserveW || 0) > 0 ? 'warn' : 'ok'],
            ['Phasen-Gate', snapshot.phase?.binding ? `AKTIV · ${fmtW(snapshot.phase.evcsCapW)}` : `frei · ${fmtW(snapshot.phase?.evcsCapW)}`, snapshot.phase?.binding ? 'warn' : 'ok'],
            ['§14a-Gate', snapshot.para14a?.active ? `${snapshot.para14a.binding ? 'bindend' : 'aktiv'} · ${fmtW(snapshot.para14a.capW)}` : 'nicht aktiv', snapshot.para14a?.binding ? 'warn' : 'ok'],
            ['Stage A / Sicherungsstufe', stageAStatus, stageAKind], ['Letzte Aktualisierung', fmtTs(snapshot.ts), ''],
        ];
        for (const [label, value, metricKind] of globalMetrics)
            refs.summary.appendChild(metric(label, value, metricKind));
        const selected = selectedSafe();
        const problemsOnly = onlyProblems();
        const rows = Array.isArray(snapshot.wallboxes) ? snapshot.wallboxes : [];
        const visibleRows = rows.filter((row) => (!selected || String(row.safe || '') === selected)
            && (!problemsOnly || !['none', 'no-vehicle', 'no-charge-demand', 'pv-surplus', 'grid-monitor', 'export-monitor'].includes(String(row.limiter || 'none'))));
        if (!visibleRows.length) {
            const empty = document.createElement('div');
            empty.className = 'nw-charging-audit__empty';
            empty.textContent = problemsOnly ? 'Aktuell keine passenden Probleme oder Begrenzungen.' : 'Keine Ladepunkte für den gewählten Filter.';
            refs.wallboxes.appendChild(empty);
        }
        for (const row of visibleRows) {
            const rowKind = kind(row.limiter);
            const card = document.createElement('article');
            card.className = `nw-charging-audit__wallbox${rowKind !== 'ok' ? ` nw-charging-audit__wallbox--${rowKind}` : ''}`;
            const head = document.createElement('div');
            head.className = 'nw-charging-audit__wallbox-head';
            const titleWrap = document.createElement('div');
            const title = document.createElement('div');
            title.className = 'nw-charging-audit__wallbox-name';
            title.textContent = `${row.name || row.safe} (${row.safe || '—'})`;
            const meta = document.createElement('div');
            meta.className = 'nw-charging-audit__muted';
            meta.style.fontSize = '.68rem';
            meta.textContent = `${row.mode || '—'} · ${row.online ? 'online' : 'offline'} · ${row.connected ? 'Fahrzeug verbunden' : 'kein Fahrzeug'} · ${row.vehicleDemandConfirmed ? 'Ladebedarf' : 'kein Ladebedarf'}`;
            titleWrap.append(title, meta);
            const pill = document.createElement('span');
            pill.className = `nw-charging-audit__pill nw-charging-audit__pill--${rowKind}`;
            pill.textContent = limiterText(row.limiter);
            head.append(titleWrap, pill);
            card.appendChild(head);
            const numbers = document.createElement('div');
            numbers.className = 'nw-charging-audit__numbers';
            const values = [
                ['Ist', fmtW(row.actualPowerW)], ['Anforderung', fmtW(row.requestedPowerW)],
                ['NexoWatt Soll', `${fmtW(row.targetPowerW)} · ${Number(row.targetCurrentA || 0).toFixed(1)} A`],
                ['Reserviert', fmtW(row.reservedPowerW)], ['PV-Anteil', fmtW(row.pvShareW)],
                ['Speicher-Anteil', fmtW(row.storageShareW)], ['Stationsrest', row.stationKey ? fmtW(row.stationRemainingW) : 'keine Station'],
                ['Write', row.applyStatus || (row.applied ? 'bestätigt' : '—')],
            ];
            for (const [label, value] of values) {
                const box = document.createElement('div');
                box.className = 'nw-charging-audit__number';
                const l = document.createElement('span');
                l.textContent = label;
                const v = document.createElement('strong');
                v.textContent = value;
                box.append(l, v);
                numbers.appendChild(box);
            }
            card.appendChild(numbers);
            const reason = document.createElement('div');
            reason.className = 'nw-charging-audit__reason';
            reason.textContent = `Warum: ${reasonText(row.safetyReason || row.reason)} · Safety: ${row.safetyBinding || 'keine'}${row.setpointKey ? ` · Sollwert-DP: ${row.setpointKey}` : ''}`;
            card.appendChild(reason);
            refs.wallboxes.appendChild(card);
        }
        const visibleEvents = events.slice().reverse().filter((event) => {
            if (selected && String(event.safe || '') !== selected)
                return false;
            return !problemsOnly || kind(event.limiter, event.severity) !== 'ok';
        });
        if (!visibleEvents.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 9;
            td.className = 'nw-charging-audit__muted';
            td.textContent = 'Noch keine passenden Ereignisse im Ringpuffer.';
            tr.appendChild(td);
            refs.events.appendChild(tr);
        }
        for (const event of visibleEvents) {
            const eventKind = kind(event.limiter, event.severity);
            const tr = document.createElement('tr');
            tr.className = `nw-charging-audit__event--${eventKind}`;
            const cells = [fmtTs(event.ts), event.safe ? `${event.name || event.safe} (${event.safe})` : (event.name || 'Lademanagement'),
                event.mode || '—', fmtW(event.actualPowerW), fmtW(event.requestedPowerW),
                `${fmtW(event.targetPowerW)} / ${Number(event.targetCurrentA || 0).toFixed(1)} A`,
                `${fmtW(event.reservedPowerW)} / PV ${fmtW(event.pvShareW)}`,
                `${limiterText(event.limiter)} · ${reasonText(event.reason)}`, event.applyStatus || (event.applied ? 'bestätigt' : '—')];
            for (const text of cells) {
                const td = document.createElement('td');
                td.textContent = String(text);
                tr.appendChild(td);
            }
            refs.events.appendChild(tr);
        }
        const problems = Number(snapshot.problemCount || 0);
        setStatus(`${rows.length} Ladepunkte · ${events.length} Logeinträge · ${problems} aktuelle Hinweise`, problems > 0 ? 'warn' : 'ok');
    }
/**
 * Code-Teil: evcsVisible
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const evcsVisible = () => {
        const panel = document.getElementById('nw-tabpanel-evcs');
        return !!panel && getComputedStyle(panel).display !== 'none';
    };
/**
 * Code-Teil: refresh
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function refresh(force = false) {
        if ((!force && !evcsVisible()) || refreshing)
            return;
        refreshing = true;
        setStatus('Aktualisiere…', 'idle');
        try {
            render(await fetchJson('/api/ems/charging/audit?limit=240'));
        }
        catch (error) {
            setStatus(`Fehler: ${error?.message || error}`, 'error');
        }
        finally {
            refreshing = false;
        }
    }
/**
 * Code-Teil: download
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const download = (filename, content, type) => {
        const url = URL.createObjectURL(new Blob([content], { type }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
/**
 * Code-Teil: exportJson
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const exportJson = () => download(`nexowatt-lademanagement-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(payload || { ok: false, audit: null }, null, 2), 'application/json');
/**
 * Code-Teil: csvValue
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
/**
 * Code-Teil: exportCsv
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const exportCsv = () => {
        const events = payload?.audit && Array.isArray(payload.audit.events) ? payload.audit.events : [];
        const header = ['Zeit', 'Typ', 'Ladepunkt', 'Name', 'Modus', 'Ist_W', 'Anforderung_W', 'NexoWatt_Soll_W', 'NexoWatt_Soll_A', 'Reserve_W', 'PV_W', 'Speicher_W', 'Limiter', 'Grund', 'Write_Status', 'Safety_Stufe', 'Sollwert_DP'];
        const rows = events.map((event) => [event.ts ? new Date(Number(event.ts)).toISOString() : '', event.type, event.safe, event.name, event.mode,
            event.actualPowerW, event.requestedPowerW, event.targetPowerW, event.targetCurrentA, event.reservedPowerW,
            event.pvShareW, event.storageShareW, event.limiter, event.reason, event.applyStatus, event.safetyStage, event.setpointKey]);
        download(`nexowatt-lademanagement-log-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`, `\uFEFF${[header, ...rows].map((row) => row.map(csvValue).join(';')).join('\r\n')}`, 'text/csv;charset=utf-8');
    };
/**
 * Code-Teil: clearEvents
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function clearEvents() {
        if (!window.confirm('Lademanagement-Ereignislog wirklich leeren? Der aktuelle Live-Snapshot und die Regelung bleiben unverändert.'))
            return;
        try {
            await fetchJson('/api/ems/charging/audit/clear', { method: 'POST', body: '{}' });
            await refresh(true);
        }
        catch (error) {
            setStatus(`Leeren fehlgeschlagen: ${error?.message || error}`, 'error');
        }
    }
/**
 * Code-Teil: setup
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function setup() {
        refs = getRefs();
        if (!refs.summary || !refs.wallboxes || !refs.events)
            return;
        refs.refresh?.addEventListener('click', () => void refresh(true));
        refs.filter?.addEventListener('change', () => payload && render(payload));
        refs.onlyProblems?.addEventListener('change', () => payload && render(payload));
        refs.exportJson?.addEventListener('click', exportJson);
        refs.exportCsv?.addEventListener('click', exportCsv);
        refs.clear?.addEventListener('click', () => void clearEvents());
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target?.closest?.('[data-tab="evcs"]'))
                window.setTimeout(() => void refresh(true), 0);
        }, true);
        if (timer !== null)
            window.clearInterval(timer);
        timer = window.setInterval(() => {
            if ((!refs?.autoRefresh || refs.autoRefresh.checked) && evcsVisible())
                void refresh(false);
        }, 2000);
    }
    const globalWindow = window;
    globalWindow.NexoWattChargingDiagnosticsAppCenter = { setup, refresh, render };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', setup, { once: true });
    else
        setup();
})();
