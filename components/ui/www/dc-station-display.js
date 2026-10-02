/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/dc-station-display.ts
 * Quell-Hash: sha256:45ff75619ae7a2d8e58113656a3c73869bacbb99a58028a60c520922175aa212
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/dc-station-display.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Stellt die Stationsanzeige mit mehreren Ladepunkten, Status und freigegebenen Bedienaktionen dar.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/dc-station-display.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/dc-station-display.js
 * RC66 responsive multi-LP station display; generated through the canonical
 * runtime sync and restricted to charging-management command intents.
 */
(function () {
    'use strict';
    const app = document.getElementById('stationDisplayApp');
    let token = '';
    let lastPayload = null;
    let busyKey = '';
    let toastTimer = null;
    let refreshTimer = null;
    let heartbeatTimer = null;
    let lastOkTs = 0;
    let connectionLost = false;
    let manualLanguage = '';
    const I18N = {
        de: {
            loading: 'Verbindung zur Ladestation wird aufgebaut …',
            unavailable: 'Ladestation nicht verfügbar',
            eosRequired: 'Diese Display-Funktion ist nur mit EOS-Lizenz verfügbar.',
            available: 'Bereit', plugged: 'Verbunden', charging: 'Lädt', error: 'Störung', offline: 'Offline', maintenance: 'Wartung', readonly: 'Nur Anzeige',
            solar: 'Solar laden', fast: 'Schnellladen', stop: 'Stoppen', start: 'Starten',
            power: 'Leistung', target: 'Ziel', session: 'Session', cost: 'Kosten', price: 'Preis', solarShare: 'Solaranteil',
            sessionSolar: 'Solar in Session', sessionGrid: 'Netz in Session', pvAvailable: 'PV verfügbar', connectors: 'Ladepunkte',
            commandAccepted: 'Befehl angenommen', connectionLost: 'Verbindung zum EOS-Server unterbrochen. Letzte Werte bleiben sichtbar.',
            reconnecting: 'Verbindung wird wiederhergestellt …', lastUpdate: 'Letztes Update', stationPower: 'Stationsleistung', noConnectors: 'Keine Ladepunkte zugeordnet.',
            blockedMaintenance: 'Diese Ladestation ist im Wartungsmodus.', blockedReadonly: 'Start/Stop ist für dieses Display gesperrt.', watchdog: 'Kommunikation',
            operatorToday: 'Heute', operatorSolar: 'Solar heute', operatorGrid: 'Netz heute', lastSession: 'Letzte Session', bridge: 'Steuerung',
            directHardwareWrite: 'Steuerung über NexoWatt Single Writer', manufacturerOpen: 'Herstelleroffen', regulation: 'Regelung', on: 'An', off: 'Aus',
            mode: 'Modus', auto: 'Auto', minpv: 'Min+PV', pv: 'PV', phase: 'AC-Phasenmodus', phase1p: '1p', phase3p: '3p', autoPv: 'Auto PV',
            storage: 'Speicher', protect: 'Schützen', useStorage: 'Mitnutzen', goal: 'Ziel-Laden', goalOn: 'Ziel aktiv',
            storageCentral: 'Speicherschutz wird zentral auf der EVCS-Seite für alle Ladepunkte gesteuert.',
            vehicle: 'Fahrzeug', connected: 'Verbunden', notConnected: 'Nicht verbunden', todayLoaded: 'Heute geladen', activeMode: 'Aktiver Modus',
            communication: 'Kommunikation', decisionShort: 'EOS Entscheidung', decisionTitle: 'EOS Entscheidung – warum gerade so?',
            warningsTitle: 'Warnungen & Hinweise', noWarnings: 'Keine aktiven Warnungen oder Fehler.', allOk: 'Alle Systeme laufen im normalen Bereich.',
            stationType: 'Stationstyp', lpCount: 'Ladepunkte', online: 'Online', solarAvailableYes: 'Ja', solarAvailableNo: 'Nein',
            mixed: 'Gemischt', controlDisabled: 'Regelung aus', stationLimit: 'Stationslimit', systemOk: 'Alle Systeme OK',
            goalActive: 'Ziel-Laden aktiv', noGoal: 'Kein Ziel-Laden', storageProtect: 'Speicher schützen', storageUse: 'Speicher mitnutzen',
            tariff: 'Tarif', tariffInactive: 'nicht aktiv', dataStale: 'Daten veraltet', waiting: 'Warten', inactive: 'Inaktiv', ready: 'Bereit',
            tariffCheap: 'günstig', tariffNeutral: 'neutral', tariffExpensive: 'teuer', tariffUnknown: 'unbekannt',
            stationReady: 'Station bereit', stationCharging: 'Laden freigegeben', stationWaiting: 'Warten auf Ladefreigabe', stationFault: 'Störung erkannt',
            noVehicle: 'Kein Fahrzeug verbunden.', goalOverride: 'Zielzeit wird knapp – Tarif-Override aktiv.', goalConfigured: 'Ziel-Laden ist konfiguriert.',
            pvDecisionAvailable: 'PV-Überschuss ist verfügbar und wird bevorzugt genutzt.', pvDecisionUnavailable: 'Kein nutzbarer PV-Überschuss vorhanden.',
            gridLimitActive: 'Netzanschlussbegrenzung ist aktiv.', phaseLimitActive: 'Phasenbegrenzung ist aktiv.', para14aLimitActive: '§14a-Begrenzung ist aktiv.',
            storageDecisionProtect: 'Speicherschutz ist aktiv.', storageDecisionUse: 'Speicherunterstützung ist aktiv.',
            meterDataStale: 'Leistungsmessung ist veraltet.', budgetDataStale: 'Ladebudget ist veraltet.', mappingWarning: 'Datenpunktzuordnung prüfen.',
            commandUnconfirmed: 'Gerätebefehl wurde noch nicht bestätigt.', maintenanceActive: 'Wartungsmodus ist aktiv.', locked: 'Gesperrt',
        },
        nl: {
            loading: 'Verbinding met laadstation wordt opgebouwd …', unavailable: 'Laadstation niet beschikbaar', eosRequired: 'Deze displayfunctie vereist een EOS-licentie.',
            available: 'Gereed', plugged: 'Verbonden', charging: 'Laden', error: 'Storing', offline: 'Offline', maintenance: 'Onderhoud', readonly: 'Alleen weergave',
            solar: 'Solar laden', fast: 'Snelladen', stop: 'Stoppen', start: 'Starten', power: 'Vermogen', target: 'Doel', session: 'Sessie', cost: 'Kosten', price: 'Prijs',
            solarShare: 'Zonne-aandeel', sessionSolar: 'Solar in sessie', sessionGrid: 'Net in sessie', pvAvailable: 'PV beschikbaar', connectors: 'Laadpunten',
            commandAccepted: 'Commando geaccepteerd', connectionLost: 'Verbinding met EOS-server verbroken. Laatste waarden blijven zichtbaar.', reconnecting: 'Opnieuw verbinden …',
            lastUpdate: 'Laatste update', stationPower: 'Stationvermogen', noConnectors: 'Geen laadpunten toegewezen.', blockedMaintenance: 'Deze laadstation staat in onderhoudsmodus.',
            blockedReadonly: 'Start/stop is geblokkeerd.', watchdog: 'Communicatie', operatorToday: 'Vandaag', operatorSolar: 'Solar vandaag', operatorGrid: 'Net vandaag',
            lastSession: 'Laatste sessie', bridge: 'Besturing', directHardwareWrite: 'Besturing via NexoWatt Single Writer', manufacturerOpen: 'Fabrikant-open', regulation: 'Regeling',
            on: 'Aan', off: 'Uit', mode: 'Modus', auto: 'Auto', minpv: 'Min+PV', pv: 'PV', phase: 'AC-fasemodus', phase1p: '1p', phase3p: '3p', autoPv: 'Auto PV',
            storage: 'Accu', protect: 'Beschermen', useStorage: 'Meenemen', goal: 'Doelladen', goalOn: 'Doel actief',
            storageCentral: 'Accubescherming wordt centraal voor alle laadpunten geregeld.', vehicle: 'Voertuig', connected: 'Verbonden', notConnected: 'Niet verbonden',
            todayLoaded: 'Vandaag geladen', activeMode: 'Actieve modus', communication: 'Communicatie', decisionShort: 'EOS-beslissing',
            decisionTitle: 'EOS-beslissing – waarom nu zo?', warningsTitle: 'Waarschuwingen & informatie', noWarnings: 'Geen actieve waarschuwingen of fouten.', allOk: 'Alle systemen werken normaal.',
            stationType: 'Stationstype', lpCount: 'Laadpunten', online: 'Online', solarAvailableYes: 'Ja', solarAvailableNo: 'Nee', mixed: 'Gemengd', controlDisabled: 'Regeling uit',
            stationLimit: 'Stationslimiet', systemOk: 'Alle systemen OK', goalActive: 'Doelladen actief', noGoal: 'Geen doelladen', storageProtect: 'Accu beschermen',
            storageUse: 'Accu gebruiken', tariff: 'Tarief', tariffInactive: 'niet actief', dataStale: 'Data verouderd', waiting: 'Wachten', inactive: 'Inactief', ready: 'Gereed',
            tariffCheap: 'goedkoop', tariffNeutral: 'neutraal', tariffExpensive: 'duur', tariffUnknown: 'onbekend',
            stationReady: 'Station gereed', stationCharging: 'Laden vrijgegeven', stationWaiting: 'Wachten op laadvrijgave', stationFault: 'Storing gedetecteerd',
            noVehicle: 'Geen voertuig verbonden.', goalOverride: 'Doeltijd wordt krap – tariefoverride actief.', goalConfigured: 'Doelladen is geconfigureerd.',
            pvDecisionAvailable: 'PV-overschot is beschikbaar en wordt bij voorkeur gebruikt.', pvDecisionUnavailable: 'Geen bruikbaar PV-overschot beschikbaar.',
            gridLimitActive: 'Netaansluitingslimiet is actief.', phaseLimitActive: 'Faselimit is actief.', para14aLimitActive: '§14a-limiet is actief.',
            storageDecisionProtect: 'Accubescherming is actief.', storageDecisionUse: 'Accu-ondersteuning is actief.',
            meterDataStale: 'Vermogensmeting is verouderd.', budgetDataStale: 'Laadbudget is verouderd.', mappingWarning: 'Datapuntkoppeling controleren.',
            commandUnconfirmed: 'Apparaatcommando is nog niet bevestigd.', maintenanceActive: 'Onderhoudsmodus is actief.', locked: 'Geblokkeerd',
        },
        en: {
            loading: 'Connecting to charging station …', unavailable: 'Charging station unavailable', eosRequired: 'This display requires an EOS license.',
            available: 'Ready', plugged: 'Connected', charging: 'Charging', error: 'Fault', offline: 'Offline', maintenance: 'Maintenance', readonly: 'View only',
            solar: 'Solar charge', fast: 'Fast charge', stop: 'Stop', start: 'Start', power: 'Power', target: 'Target', session: 'Session', cost: 'Cost', price: 'Price',
            solarShare: 'Solar share', sessionSolar: 'Solar in session', sessionGrid: 'Grid in session', pvAvailable: 'PV available', connectors: 'Chargepoints',
            commandAccepted: 'Command accepted', connectionLost: 'Connection to EOS server lost. Last values remain visible.', reconnecting: 'Reconnecting …',
            lastUpdate: 'Last update', stationPower: 'Station power', noConnectors: 'No chargepoints assigned.', blockedMaintenance: 'This station is in maintenance mode.',
            blockedReadonly: 'Start/stop is locked.', watchdog: 'Communication', operatorToday: 'Today', operatorSolar: 'Solar today', operatorGrid: 'Grid today',
            lastSession: 'Last session', bridge: 'Control', directHardwareWrite: 'Controlled through NexoWatt Single Writer', manufacturerOpen: 'Manufacturer-open', regulation: 'Control',
            on: 'On', off: 'Off', mode: 'Mode', auto: 'Auto', minpv: 'Min+PV', pv: 'PV', phase: 'AC phase mode', phase1p: '1p', phase3p: '3p', autoPv: 'Auto PV',
            storage: 'Storage', protect: 'Protect', useStorage: 'Use', goal: 'Target charge', goalOn: 'Target active',
            storageCentral: 'Storage protection is controlled centrally for all chargepoints.', vehicle: 'Vehicle', connected: 'Connected', notConnected: 'Not connected',
            todayLoaded: 'Charged today', activeMode: 'Active mode', communication: 'Communication', decisionShort: 'EOS decision',
            decisionTitle: 'EOS decision – why now?', warningsTitle: 'Warnings & information', noWarnings: 'No active warnings or faults.', allOk: 'All systems are operating normally.',
            stationType: 'Station type', lpCount: 'Chargepoints', online: 'Online', solarAvailableYes: 'Yes', solarAvailableNo: 'No', mixed: 'Mixed', controlDisabled: 'Control off',
            stationLimit: 'Station limit', systemOk: 'All systems OK', goalActive: 'Target charge active', noGoal: 'No target charge', storageProtect: 'Protect storage',
            storageUse: 'Use storage', tariff: 'Tariff', tariffInactive: 'inactive', dataStale: 'Data stale', waiting: 'Waiting', inactive: 'Inactive', ready: 'Ready',
            tariffCheap: 'cheap', tariffNeutral: 'neutral', tariffExpensive: 'expensive', tariffUnknown: 'unknown',
            stationReady: 'Station ready', stationCharging: 'Charging released', stationWaiting: 'Waiting for charging release', stationFault: 'Fault detected',
            noVehicle: 'No vehicle connected.', goalOverride: 'Target time is tight – tariff override active.', goalConfigured: 'Target charging is configured.',
            pvDecisionAvailable: 'PV surplus is available and is used preferentially.', pvDecisionUnavailable: 'No usable PV surplus is available.',
            gridLimitActive: 'Grid connection limit is active.', phaseLimitActive: 'Phase limit is active.', para14aLimitActive: '§14a limitation is active.',
            storageDecisionProtect: 'Storage protection is active.', storageDecisionUse: 'Storage support is active.',
            meterDataStale: 'Power measurement is stale.', budgetDataStale: 'Charging budget is stale.', mappingWarning: 'Check datapoint mapping.',
            commandUnconfirmed: 'Device command has not yet been confirmed.', maintenanceActive: 'Maintenance mode is active.', locked: 'Locked',
        },
    };
    function lang() {
        if (manualLanguage)
            return manualLanguage;
        const payloadLang = lastPayload && lastPayload.locale && (lastPayload.locale.htmlLang || lastPayload.locale.language);
        const raw = String(payloadLang || document.documentElement.lang || navigator.language || 'de').toLowerCase();
        if (raw.startsWith('nl'))
            return 'nl';
        if (raw.startsWith('en'))
            return 'en';
        return 'de';
    }
    function t(key) {
        const l = lang();
        const catalog = I18N[l] || I18N.de || {};
        const fallback = I18N.de || {};
        return catalog[key] || fallback[key] || key;
    }
    function escapeHtml(input) {
        return String(input == null ? '' : input)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function fmtKw(w) {
        const n = Number(w);
        if (!Number.isFinite(n) || Math.abs(n) < 1)
            return '0 kW';
        const digits = Math.abs(n) >= 100000 ? 0 : (Math.abs(n) >= 10000 ? 1 : 2);
        return (n / 1000).toFixed(digits).replace('.', ',') + ' kW';
    }
    function fmtKwh(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') + ' kWh' : '0,00 kWh'; }
    function fmtEur(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') + ' €' : '0,00 €'; }
    function fmtPrice(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(3).replace('.', ',') + ' €/kWh' : '—'; }
    function fmtTime(ts) {
        const n = Number(ts);
        if (!Number.isFinite(n) || n <= 0)
            return '—';
        try {
            return new Date(n).toLocaleTimeString(lang() === 'en' ? 'en-GB' : (lang() === 'nl' ? 'nl-NL' : 'de-DE'), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        catch (_e) {
            return '—';
        }
    }
    function fmtDateTime(ts) {
        const n = Number(ts);
        if (!Number.isFinite(n) || n <= 0)
            return '—';
        try {
            return new Date(n).toLocaleString(lang() === 'en' ? 'en-GB' : (lang() === 'nl' ? 'nl-NL' : 'de-DE'), { dateStyle: 'short', timeStyle: 'medium' });
        }
        catch (_e) {
            return fmtTime(n);
        }
    }
    function fmtDuration(sec) {
        const n = Math.max(0, Math.round(Number(sec) || 0));
        const h = Math.floor(n / 3600);
        const m = Math.floor((n % 3600) / 60);
        return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
    }
    function clamp(n, min, max) { const v = Number(n); return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : min; }
    function safeArray(raw) { return Array.isArray(raw) ? raw : []; }
    function getToken() { const m = location.pathname.match(/\/display\/station\/([^/?#]+)/i); const value = m?.[1]; return value ? decodeURIComponent(value) : ''; }
    function statusLabel(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'available')
            return t('available');
        if (s === 'charging')
            return t('charging');
        if (s === 'plugged')
            return t('plugged');
        if (s === 'error')
            return t('error');
        if (s === 'maintenance')
            return t('maintenance');
        if (s === 'unavailable')
            return t('inactive');
        return t('offline');
    }
    function modeLabel(mode) {
        const m = String(mode || '').toLowerCase();
        if (m === 'boost')
            return 'Boost';
        if (m === 'minpv')
            return t('minpv');
        if (m === 'pv')
            return t('pv');
        return t('auto');
    }
    function tariffStateLabel(state) {
        const raw = String(state || '').trim().toLowerCase();
        if (['cheap', 'guenstig', 'günstig'].includes(raw))
            return t('tariffCheap');
        if (['neutral', 'normal'].includes(raw))
            return t('tariffNeutral');
        if (['expensive', 'teuer'].includes(raw))
            return t('tariffExpensive');
        if (!raw || raw === 'off')
            return t('tariffInactive');
        return t('tariffUnknown');
    }
    function addUnique(list, entry, key) {
        if (!entry)
            return;
        const signature = String(key || `${entry.level || ''}|${entry.title || ''}|${entry.message || entry.text || ''}`);
        if (list.some((item) => item && item.__signature === signature))
            return;
        list.push(Object.assign({ __signature: signature }, entry));
    }
    function derivePresentationModel(payload) {
        const station = payload && payload.station || {};
        const site = payload && payload.site || {};
        const tariff = site.tariff || {};
        const control = site.control || {};
        const connectors = safeArray(payload && payload.connectors);
        const warnings = [];
        const decisionLines = [];
        const activeModes = [];
        let chargingCount = 0;
        let pluggedCount = 0;
        let goalCount = 0;
        let goalOverrideCount = 0;
        connectors.forEach((connector, index) => {
            if (!connector)
                return;
            const lpName = String(connector.name || connector.id || `LP ${index + 1}`);
            const ctl = connector.controls || {};
            const diag = connector.diagnostics || {};
            const mode = String(ctl.userMode || connector.userMode || connector.mode || '').toLowerCase();
            if (ctl.userEnabled !== false && mode && !activeModes.includes(mode))
                activeModes.push(mode);
            if (connector.charging || connector.status === 'charging' || Number(connector.powerW) > 100)
                chargingCount += 1;
            if (connector.plugged)
                pluggedCount += 1;
            if (ctl.goalEnabled)
                goalCount += 1;
            if (ctl.goalTariffOverride)
                goalOverrideCount += 1;
            if (connector.status === 'error' || connector.faultActive) {
                addUnique(warnings, { level: 'error', title: `${lpName}: ${t('error')}`, message: connector.faultReason || connector.statusDetail || connector.reason || t('stationFault') }, `lp-error-${connector.id}`);
            }
            else if (connector.status === 'offline' || connector.online === false) {
                addUnique(warnings, { level: 'error', title: `${lpName}: ${t('offline')}`, message: connector.statusDetail || connector.reason || t('connectionLost') }, `lp-offline-${connector.id}`);
            }
            else if (connector.status === 'unavailable' || connector.operationalBlocked) {
                addUnique(warnings, { level: 'warning', title: `${lpName}: ${t('inactive')}`, message: connector.unavailableReason || connector.statusDetail || connector.reason || t('locked') }, `lp-unavailable-${connector.id}`);
            }
            if (connector.meterStale)
                addUnique(warnings, { level: 'warning', title: lpName, message: t('meterDataStale') }, `lp-meter-${connector.id}`);
            safeArray(diag.mappingIssues).forEach((issue, issueIndex) => addUnique(warnings, { level: 'warning', title: `${lpName}: ${t('mappingWarning')}`, message: String(issue || '') }, `lp-map-${connector.id}-${issueIndex}`));
            if (diag.hardwareCommandConfirmed === false && !['unchanged', 'idle'].includes(String(diag.applyStatus || '').toLowerCase())) {
                addUnique(warnings, { level: 'warning', title: lpName, message: `${t('commandUnconfirmed')} ${diag.hardwareCommandState || diag.applyStatus || ''}`.trim() }, `lp-command-${connector.id}`);
            }
            if (ctl.availabilityRequested === false) {
                addUnique(warnings, { level: 'warning', title: `${lpName}: ${t('locked')}`, message: ctl.availabilityRequestReason || ctl.availabilityOwner || t('locked') }, `lp-availability-${connector.id}`);
            }
        });
        if (connectionLost || station.displayOnline === false)
            addUnique(warnings, { level: 'error', title: t('communication'), message: t('connectionLost') }, 'station-offline');
        if (station.maintenanceMode)
            addUnique(warnings, { level: 'warning', title: t('maintenance'), message: t('maintenanceActive') }, 'station-maintenance');
        if (station.displayWarning)
            addUnique(warnings, { level: 'warning', title: t('warningsTitle'), message: String(station.displayWarning) }, 'station-warning');
        if (control.staleMeter)
            addUnique(warnings, { level: 'error', title: t('communication'), message: t('meterDataStale') }, 'global-meter-stale');
        if (control.staleBudget)
            addUnique(warnings, { level: 'warning', title: t('stationLimit'), message: t('budgetDataStale') }, 'global-budget-stale');
        if (control.failsafeDetails)
            addUnique(warnings, { level: 'warning', title: 'Safety', message: String(control.failsafeDetails) }, 'global-failsafe');
        if (tariff.active && tariff.fresh === false)
            addUnique(warnings, { level: 'warning', title: t('tariff'), message: t('dataStale') }, 'tariff-stale');
        const modeText = !control.active ? t('controlDisabled') : (activeModes.length > 1 ? t('mixed') : modeLabel(activeModes[0] || control.mode || 'auto'));
        addUnique(decisionLines, { level: control.active === false ? 'warning' : 'info', text: `${t('activeMode')}: ${modeText}.` }, 'decision-mode');
        if (tariff.active) {
            const priceText = tariff.priceEurPerKwh == null ? '' : ` (${fmtPrice(tariff.priceEurPerKwh)})`;
            addUnique(decisionLines, { level: tariff.fresh === false || tariff.state === 'expensive' ? 'warning' : 'info', text: `${t('tariff')}: ${tariffStateLabel(tariff.state)}${priceText}.` }, 'decision-tariff');
        }
        addUnique(decisionLines, { level: site.pvAvailable ? 'info' : 'neutral', text: site.pvAvailable ? t('pvDecisionAvailable') : t('pvDecisionUnavailable') }, 'decision-pv');
        if (goalCount > 0)
            addUnique(decisionLines, { level: goalOverrideCount > 0 ? 'warning' : 'info', text: goalOverrideCount > 0 ? t('goalOverride') : `${t('goalConfigured')} (${goalCount})` }, 'decision-goal');
        if (control.para14aBinding || control.para14aActive)
            addUnique(decisionLines, { level: 'warning', text: t('para14aLimitActive') }, 'decision-para14a');
        else if (control.gridCapBinding)
            addUnique(decisionLines, { level: 'warning', text: t('gridLimitActive') }, 'decision-grid');
        else if (control.phaseCapBinding)
            addUnique(decisionLines, { level: 'warning', text: t('phaseLimitActive') }, 'decision-phase');
        addUnique(decisionLines, { level: 'info', text: control.storageAssistActive ? t('storageDecisionUse') : t('storageDecisionProtect') }, 'decision-storage');
        const uniqueReasons = [];
        connectors.forEach((connector) => {
            const raw = String(connector && (connector.reason || connector.statusDetail) || '').trim();
            if (raw && !uniqueReasons.includes(raw))
                uniqueReasons.push(raw);
        });
        uniqueReasons.slice(0, 2).forEach((reason, index) => addUnique(decisionLines, { level: 'info', text: reason }, `decision-reason-${index}`));
        const errorCount = warnings.filter((entry) => entry.level === 'error').length;
        const warningCount = warnings.filter((entry) => entry.level !== 'error').length;
        let shortDecision = '';
        if (errorCount > 0) {
            const firstError = warnings.find((entry) => entry.level === 'error');
            shortDecision = `${t('stationFault')}: ${firstError?.message || t('error')}`;
        }
        else if (control.para14aBinding || control.para14aActive)
            shortDecision = t('para14aLimitActive');
        else if (control.gridCapBinding)
            shortDecision = t('gridLimitActive');
        else if (control.phaseCapBinding)
            shortDecision = t('phaseLimitActive');
        else if (chargingCount > 0)
            shortDecision = `${t('stationCharging')}: ${modeText}, ${t('tariff')} ${tariffStateLabel(tariff.state)}.`;
        else if (pluggedCount > 0)
            shortDecision = `${t('stationWaiting')}: ${uniqueReasons[0] || (site.pvAvailable ? t('pvDecisionAvailable') : t('pvDecisionUnavailable'))}`;
        else
            shortDecision = `${t('stationReady')}: ${t('noVehicle')}`;
        return {
            summary: { activeModes, goalCount, goalOverrideCount, warningCount, errorCount, chargingCount, pluggedCount, shortDecision },
            warnings: warnings.map(({ __signature, ...entry }) => entry),
            decisionLines: decisionLines.map(({ __signature, ...entry }) => entry),
        };
    }
    function withPresentationModel(payload) {
        const derived = derivePresentationModel(payload || {});
        return Object.assign({}, payload || {}, {
            site: Object.assign({}, payload && payload.site || {}, derived),
        });
    }
    function showStatus(title, message, cls = '') {
        if (!app)
            return;
        app.innerHTML = `<section class="nw-display-status ${cls || ''}">
      <img class="nw-display-loading-logo" src="/static/assets/nexowatt-eos-logo-wide.png" alt="NexoWatt EOS" />
      <div class="nw-display-brand">NexoWatt Charge</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message || '')}</p>
    </section>`;
    }
    function toast(message) {
        let el = document.querySelector('.nw-display-toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'nw-display-toast';
            document.body.appendChild(el);
        }
        el.textContent = String(message == null ? '' : message);
        el.classList.add('show');
        if (toastTimer)
            clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
    }
    async function fetchJson(url, opts) {
        const res = await fetch(url, Object.assign({ cache: 'no-store' }, opts || {}));
        let data = null;
        try {
            data = await res.json();
        }
        catch (_e) {
            data = null;
        }
        if (!res.ok || !data || data.ok === false) {
            const err = new Error((data && (data.message || data.error)) || ('HTTP ' + res.status));
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }
    function refreshDelay(payload) {
        const ms = Number(payload && payload.display && payload.display.refreshIntervalMs);
        return Number.isFinite(ms) && ms >= 1000 && ms <= 30000 ? Math.round(ms) : 2500;
    }
    function scheduleRefresh(delay = 2500) { if (refreshTimer)
        clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, clamp(delay || 2500, 1000, 30000)); }
    function scheduleHeartbeat(delay = 10000) {
        if (heartbeatTimer)
            clearTimeout(heartbeatTimer);
        heartbeatTimer = setTimeout(async () => { await heartbeat(); scheduleHeartbeat(delay || 10000); }, clamp(delay || 10000, 3000, 30000));
    }
    async function refresh() {
        try {
            if (!token)
                token = getToken();
            if (!token) {
                showStatus(t('unavailable'), 'Kein Display-Token in der URL.', 'nw-display-status--error');
                return;
            }
            const data = await fetchJson('/api/display/station/' + encodeURIComponent(token));
            lastPayload = data;
            lastOkTs = Date.now();
            connectionLost = false;
            const htmlLang = data && data.locale && (data.locale.htmlLang || data.locale.language);
            if (htmlLang)
                document.documentElement.lang = String(htmlLang).slice(0, 8);
            render(data);
            scheduleRefresh(refreshDelay(data));
        }
        catch (error) {
            const e = error;
            const data = e.data;
            if (data && data.error === 'eos_required') {
                showStatus(t('eosRequired'), data.message || t('eosRequired'), 'nw-display-status--error');
                return;
            }
            connectionLost = true;
            if (lastPayload)
                render(lastPayload, { error: (e && e.message) || t('connectionLost') });
            else
                showStatus(t('unavailable'), (e && e.message) || t('loading'), 'nw-display-status--error');
            scheduleRefresh(2500);
        }
    }
    async function heartbeat() {
        try {
            if (!token)
                token = getToken();
            if (!token)
                return;
            await fetchJson('/api/display/station/' + encodeURIComponent(token) + '/heartbeat', {
                method: 'POST', body: JSON.stringify({ ts: Date.now(), width: window.innerWidth || 0, height: window.innerHeight || 0, visibility: document.visibilityState || 'visible', language: lang(), appVersion: '0.8.201' }),
                headers: { 'Content-Type': 'application/json' },
            });
        }
        catch (_e) { }
    }
    async function sendCommand(lp, action, mode, extra = {}) {
        if (!token || busyKey || !lastPayload)
            return;
        const station = lastPayload.station || {};
        if (station.maintenanceMode) {
            toast(t('blockedMaintenance'));
            return;
        }
        if (station.allowStartStop === false) {
            toast(t('blockedReadonly'));
            return;
        }
        busyKey = `${lp}:${action}:${mode || ''}`;
        render(lastPayload);
        try {
            const data = await fetchJson('/api/display/station/' + encodeURIComponent(token) + '/command', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.assign({ lp, action, mode }, (extra && typeof extra === 'object') ? extra : {})),
            });
            toast(t('commandAccepted'));
            if (data && data.payload) {
                lastPayload = data.payload;
                lastOkTs = Date.now();
                connectionLost = false;
                render(data.payload);
            }
        }
        catch (error) {
            const e = error;
            toast(e.message || 'Fehler');
        }
        finally {
            busyKey = '';
            setTimeout(refresh, 500);
        }
    }
    function languageSwitchHtml(station) {
        if (!(station && station.showLanguageSwitch))
            return '';
        return `<div class="nw-display-language" role="group" aria-label="Language">${['de', 'nl', 'en'].map((l) => `<button type="button" data-lang="${l}" class="${lang() === l ? 'active' : ''}">${l.toUpperCase()}</button>`).join('')}</div>`;
    }
    function bannerHtml(payload, opts = {}) {
        const station = payload.station || {};
        const banners = [];
        if (connectionLost)
            banners.push(`<div class="nw-display-banner nw-display-banner--error">${escapeHtml(t('connectionLost'))} ${lastOkTs ? `· ${escapeHtml(t('lastUpdate'))}: ${escapeHtml(fmtTime(lastOkTs))}` : ''}</div>`);
        if (station.maintenanceMode)
            banners.push(`<div class="nw-display-banner nw-display-banner--warn">${escapeHtml(t('blockedMaintenance'))}</div>`);
        if (station.displayWarning && !station.maintenanceMode)
            banners.push(`<div class="nw-display-banner nw-display-banner--warn">${escapeHtml(station.displayWarning)}</div>`);
        if (opts && opts.error && !connectionLost)
            banners.push(`<div class="nw-display-banner nw-display-banner--error">${escapeHtml(opts.error)}</div>`);
        return banners.join('');
    }
    function statusChip(icon, title, value, tone = 'info', detail) {
        return `<article class="nw-status-chip" data-tone="${escapeHtml(tone || 'info')}"><span class="nw-status-chip__icon">${icon}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(value || '')}${detail ? ` · ${escapeHtml(detail)}` : ''}</small></span></article>`;
    }
    function renderStatusStrip(payload) {
        const site = payload.site || {};
        const station = payload.station || {};
        const summary = site.summary || {};
        const tariff = site.tariff || {};
        const control = site.control || {};
        const activeModes = safeArray(summary.activeModes);
        const mode = !control.active ? t('controlDisabled') : (activeModes.length > 1 ? t('mixed') : modeLabel(activeModes[0] || control.mode || 'auto'));
        const goalCount = Number(summary.goalCount || 0);
        const warningCount = Number(summary.warningCount || 0);
        const errorCount = Number(summary.errorCount || 0);
        const storageUse = !!control.storageAssistActive;
        const tariffValue = tariff.active ? tariffStateLabel(tariff.state || 'neutral') : t('tariffInactive');
        const tariffDetail = tariff.active && tariff.fresh === false ? t('dataStale') : (tariff.priceEurPerKwh == null ? '' : fmtPrice(tariff.priceEurPerKwh));
        return `<section class="nw-status-strip" aria-label="Stationsstatus">
      ${statusChip('🤖', `${t('activeMode')} ${mode}`, control.active === false ? t('off') : t('on'), control.active === false ? 'muted' : 'ok')}
      ${statusChip('🎯', goalCount ? t('goalActive') : t('noGoal'), goalCount ? `${goalCount} ${t('connectors')}` : '—', goalCount ? 'ok' : 'muted')}
      ${statusChip('€', `${t('tariff')} ${tariffValue}`, tariffDetail || '—', !tariff.active ? 'muted' : (tariff.fresh === false || ['expensive', 'teuer'].includes(String(tariff.state || '').toLowerCase()) ? 'warn' : 'info'))}
      ${statusChip('☀', t('pvAvailable'), site.pvAvailable ? fmtKw(site.pvSurplusW || 0) : t('solarAvailableNo'), site.pvAvailable ? 'sun' : 'muted')}
      ${statusChip('🛡', storageUse ? t('storageUse') : t('storageProtect'), storageUse ? t('on') : t('on'), storageUse ? 'ok' : 'info')}
      ${statusChip('◴', t('stationLimit'), site.stationMaxPowerW > 0 ? fmtKw(site.stationMaxPowerW) : '—', (control.gridCapBinding || control.phaseCapBinding || control.para14aBinding) ? 'warn' : 'info')}
      ${statusChip('◉', t('communication'), connectionLost ? t('offline') : (station.displayOnline ? t('systemOk') : statusLabel(station.displayStatus)), connectionLost || !station.displayOnline ? 'error' : 'ok')}
      ${statusChip(errorCount ? '!' : (warningCount ? '△' : '✓'), errorCount ? `${errorCount} ${t('error')}` : (warningCount ? `${warningCount} ${t('warningsTitle')}` : t('noWarnings')), errorCount || warningCount ? t('warningsTitle') : t('allOk'), errorCount ? 'error' : (warningCount ? 'warn' : 'ok'))}
    </section>`;
    }
    function summaryCard(icon, title, value, detail, tone = 'info', extra = '') {
        return `<article class="nw-summary-card" data-tone="${escapeHtml(tone || 'info')}"><div class="nw-summary-card__head"><span>${icon}</span><small>${escapeHtml(title)}</small></div><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail || '')}</p>${extra || ''}</article>`;
    }
    function renderSummary(payload) {
        const site = payload.site || {};
        const operator = payload.operator || {};
        const station = payload.station || {};
        const summary = site.summary || {};
        const control = site.control || {};
        const totalToday = Number(operator.energyTodayKwh || 0);
        const solarToday = Number(operator.solarEnergyTodayKwh || 0);
        const solarShare = totalToday > 0 ? Math.round((solarToday / totalToday) * 100) : Number(operator.solarShareTodayPercent || 0);
        const activeModes = safeArray(summary.activeModes);
        const modeText = !control.active ? t('controlDisabled') : (activeModes.length > 1 ? t('mixed') : modeLabel(activeModes[0] || control.mode || 'auto'));
        const shortDecision = String(summary.shortDecision || 'EOS überwacht die Station.');
        const spark = `<span class="nw-mini-spark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>`;
        return `<section class="nw-summary-grid">
      ${summaryCard('⚡', t('stationPower'), fmtKw(site.totalAssignedPowerW || 0), site.stationMaxPowerW > 0 ? `Max ${fmtKw(site.stationMaxPowerW)}` : 'Aktuell gesamt', 'power', spark)}
      ${summaryCard('☀', t('solarShare'), `${clamp(solarShare, 0, 100)} %`, totalToday > 0 ? t('operatorToday') : 'Live / Tag', 'sun', `<span class="nw-donut" style="--pct:${clamp(solarShare, 0, 100)}"></span>`)}
      ${summaryCard('▥', t('todayLoaded'), fmtKwh(totalToday), fmtEur(operator.currentRevenueEur || operator.revenueEur || 0), 'info')}
      ${summaryCard('🤖', t('activeMode'), modeText, control.active === false ? t('controlDisabled') : 'Automatische Optimierung', control.active === false ? 'muted' : 'ok')}
      ${summaryCard('◉', t('communication'), connectionLost ? t('offline') : (station.displayOnline ? t('online') : statusLabel(station.displayStatus)), connectionLost ? t('connectionLost') : t('systemOk'), connectionLost ? 'error' : 'ok')}
      ${summaryCard('◎', t('decisionShort'), shortDecision, control.status || '', safeArray(site.warnings).some((w) => w && w.level === 'error') ? 'error' : 'decision')}
    </section>`;
    }
    function connectorLayout(connectors) {
        const count = Math.max(1, connectors.length || 1);
        let columns = count <= 4 ? count : (count <= 6 ? 3 : (count <= 8 ? 4 : 5));
        columns = Math.max(1, columns);
        const rows = Math.ceil(count / columns);
        const density = count <= 2 ? 'comfortable' : (count <= 4 ? 'compact' : 'dense');
        return { count, columns, rows, density };
    }
    function isActiveValue(current, expected) { return String(current || '').toLowerCase() === String(expected || '').toLowerCase(); }
    function controlButton(lp, action, mode, label, active, disabled, extraAttrs = '') {
        return `<button type="button" class="nw-control-btn ${active ? 'active' : ''}" data-command="1" data-lp="${escapeHtml(lp)}" data-action="${escapeHtml(action)}" data-mode="${escapeHtml(mode || '')}" ${extraAttrs || ''} ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
    }
    function renderLpControls(c, station, disabled) {
        const lp = String(c && c.id || 'lp');
        const ctl = c && c.controls && typeof c.controls === 'object' ? c.controls : {};
        const userMode = String(ctl.userMode || c.userMode || c.mode || 'auto').toLowerCase();
        const userEnabled = ctl.userEnabled !== false;
        const storageAllowed = ctl.storageAssistCustomerAllowed !== false;
        const globalStorageControl = station && station.globalStorageAssistControl === true || String(ctl.storageAssistControlScope || '').toLowerCase() === 'global';
        const storageOn = ctl.userStorageAssistEnabled === true;
        const goalOn = ctl.goalEnabled === true;
        const phaseSupported = !!(c && c.isAc && ctl.phaseSwitchSupported);
        const phaseMode = String(ctl.userPhaseMode || 'auto-pv').toLowerCase();
        return `<div class="nw-lp-controls">
      <div class="nw-control-mode"><span>${escapeHtml(t('mode'))}</span><div class="nw-control-buttons nw-control-buttons--4">
        ${controlButton(lp, 'set-mode', 'auto', t('auto'), isActiveValue(userMode, 'auto'), disabled, '')}
        ${controlButton(lp, 'set-mode', 'boost', 'Boost', isActiveValue(userMode, 'boost'), disabled, '')}
        ${controlButton(lp, 'set-mode', 'minpv', t('minpv'), isActiveValue(userMode, 'minpv'), disabled, '')}
        ${controlButton(lp, 'set-mode', 'pv', t('pv'), isActiveValue(userMode, 'pv'), disabled, '')}
      </div></div>
      <div class="nw-control-toggles">
        <div class="nw-mini-toggle"><span>${escapeHtml(t('regulation'))}</span><div class="nw-control-buttons nw-control-buttons--2">${controlButton(lp, 'set-enabled', '', t('off'), !userEnabled, disabled, 'data-value="false"')}${controlButton(lp, 'set-enabled', '', t('on'), userEnabled, disabled, 'data-value="true"')}</div></div>
        <div class="nw-mini-toggle"><span>${escapeHtml(t('goal'))}</span><div class="nw-control-buttons nw-control-buttons--2">${controlButton(lp, 'set-goal', '', t('off'), !goalOn, disabled, 'data-enabled="false"')}${controlButton(lp, 'set-goal', '', t('on'), goalOn, disabled, 'data-enabled="true"')}</div><small>${escapeHtml(t('target'))}: ${escapeHtml(String(Math.round(Number(ctl.goalTargetSocPct || 100))))} %</small></div>
      </div>
      ${globalStorageControl ? `<div class="nw-control-notice">🛡 ${escapeHtml(t('storageCentral'))}</div>` : `<div class="nw-control-storage"><span>${escapeHtml(t('storage'))}</span><div class="nw-control-buttons nw-control-buttons--2">${controlButton(lp, 'set-storage', '', t('protect'), !storageOn, disabled || !storageAllowed, 'data-value="false"')}${controlButton(lp, 'set-storage', '', t('useStorage'), storageOn, disabled || !storageAllowed, 'data-value="true"')}</div></div>`}
      ${phaseSupported ? `<div class="nw-control-phase"><span>${escapeHtml(t('phase'))}</span><div class="nw-control-buttons nw-control-buttons--3">${controlButton(lp, 'set-phase', 'fixed-1p', t('phase1p'), isActiveValue(phaseMode, 'fixed-1p'), disabled, '')}${controlButton(lp, 'set-phase', 'fixed-3p', t('phase3p'), isActiveValue(phaseMode, 'fixed-3p'), disabled, '')}${controlButton(lp, 'set-phase', 'auto-pv', t('autoPv'), isActiveValue(phaseMode, 'auto-pv'), disabled, '')}</div></div>` : ''}
    </div>`;
    }
    function renderConnector(c, station) {
        const status = String(c.status || 'unavailable');
        const lp = String(c.id || 'lp');
        const busy = !!busyKey && busyKey.startsWith(lp + ':');
        const stationBlocked = !!(station && station.maintenanceMode) || (station && station.allowStartStop === false) || connectionLost;
        const canStart = !stationBlocked && c.allowStartStop !== false && status !== 'error' && status !== 'unavailable' && status !== 'offline';
        const canStop = !stationBlocked && c.allowStartStop !== false && (status === 'charging' || c.charging || c.plugged);
        const modes = Array.isArray(c.allowedModes) ? c.allowedModes : ['solar', 'fast'];
        const solarAllowed = modes.includes('solar');
        const fastAllowed = modes.includes('fast');
        const reason = stationBlocked ? ((station && station.maintenanceMode) ? t('maintenance') : ((station && station.allowStartStop === false) ? t('readonly') : t('offline'))) : String(c.reason || c.statusDetail || '');
        const vehicleConnected = !!c.plugged;
        const diag = c.diagnostics || {};
        const ctl = c.controls || {};
        const vehicleSoc = Number(c.vehicleSocPct);
        const vehicleDetail = Number.isFinite(vehicleSoc) ? `SoC ${Math.round(vehicleSoc)} %` : (c.effectiveStatus || c.rawStatus || '');
        const cardTone = status === 'charging' ? 'charging' : (status === 'error' || status === 'offline' ? 'error' : (status === 'plugged' ? 'waiting' : 'ready'));
        return `<article class="nw-connector-card" data-status="${escapeHtml(status)}" data-tone="${escapeHtml(cardTone)}">
      <header class="nw-connector-head"><div class="nw-connector-identity"><span class="nw-lp-index">${escapeHtml(String(c.index || c.connectorNo || ''))}</span><div><strong>${escapeHtml(c.name || lp.toUpperCase())}</strong><small>${escapeHtml(c.chargerType || 'DC')} · Connector ${escapeHtml(c.connectorNo || c.index || '')}</small></div></div><span class="nw-status-badge" data-status="${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span></header>
      <div class="nw-connector-live"><div class="nw-power-main"><strong>${escapeHtml(fmtKw(c.powerW || 0))}</strong><span>${escapeHtml(t('power'))}</span></div><div class="nw-vehicle-state"><span>${escapeHtml(t('vehicle'))}</span><strong class="${vehicleConnected ? 'is-connected' : ''}">${escapeHtml(vehicleConnected ? t('connected') : t('notConnected'))}</strong><small>${escapeHtml(vehicleDetail)}</small></div></div>
      <div class="nw-metric-row"><div class="nw-metric"><strong>${escapeHtml(fmtKwh(c.sessionEnergyKwh || 0))}</strong><span>${escapeHtml(t('session'))}</span></div><div class="nw-metric"><strong>${escapeHtml(fmtEur(c.sessionCostEur || 0))}</strong><span>${escapeHtml(t('cost'))}</span></div><div class="nw-metric"><strong>${escapeHtml(fmtPrice(c.priceEurPerKwh))}</strong><span>${escapeHtml(t('price'))}</span></div></div>
      <div class="nw-energy-split"><span>☀ ${escapeHtml(t('sessionSolar'))}: <strong>${escapeHtml(fmtKwh(c.sessionSolarKwh || 0))}</strong></span><span>⌁ ${escapeHtml(t('sessionGrid'))}: <strong>${escapeHtml(fmtKwh(c.sessionGridKwh || 0))}</strong></span></div>
      <div class="nw-lp-statusline"><span>${ctl.goalEnabled ? `🎯 ${escapeHtml(t('goal'))} ${escapeHtml(String(Math.round(Number(ctl.goalTargetSocPct || 100))))}%` : `⚙ ${escapeHtml(modeLabel(ctl.userMode || c.mode))}`}</span><strong>${escapeHtml(reason || (c.charging ? t('charging') : (vehicleConnected ? t('waiting') : t('ready'))))}</strong></div>
      ${renderLpControls(c, station, stationBlocked || busy)}
      <div class="nw-connector-actions">${solarAllowed ? `<button class="nw-btn nw-btn--solar" data-command="1" data-lp="${escapeHtml(lp)}" data-action="start" data-mode="solar" ${(!canStart || busy) ? 'disabled' : ''}>${escapeHtml(t('solar'))}</button>` : ''}${fastAllowed ? `<button class="nw-btn nw-btn--secondary" data-command="1" data-lp="${escapeHtml(lp)}" data-action="start" data-mode="fast" ${(!canStart || busy) ? 'disabled' : ''}>${escapeHtml(t('fast'))}</button>` : ''}<button class="nw-btn nw-btn--danger" data-command="1" data-lp="${escapeHtml(lp)}" data-action="stop" data-mode="auto" ${(!canStop || busy) ? 'disabled' : ''}>${escapeHtml(t('stop'))}</button></div>
      ${c.lastSession && Number(c.lastSession.energyKwh) > 0 ? `<div class="nw-connector-last-session"><span>${escapeHtml(t('lastSession'))}</span><strong>${escapeHtml(fmtKwh(c.lastSession.energyKwh))} · ${escapeHtml(fmtEur(c.lastSession.costEur || 0))}</strong></div>` : ''}
    </article>`;
    }
    function renderDecisionPanel(payload) {
        const site = payload.site || {};
        const lines = safeArray(site.decisionLines).slice(0, 5);
        const body = lines.length ? lines.map((entry) => `<li data-level="${escapeHtml(entry && entry.level || 'info')}"><span>${entry && entry.level === 'warning' ? '!' : '✓'}</span>${escapeHtml(entry && entry.text || '')}</li>`).join('') : `<li data-level="info"><span>✓</span>${escapeHtml((site.summary && site.summary.shortDecision) || 'EOS überwacht die Station.')}</li>`;
        return `<article class="nw-insight-panel nw-decision-panel"><header><span class="nw-insight-icon">◎</span><div><strong>${escapeHtml(t('decisionTitle'))}</strong><small>${escapeHtml((site.summary && site.summary.shortDecision) || '')}</small></div></header><ul>${body}</ul></article>`;
    }
    function renderWarningsPanel(payload, opts = {}) {
        const site = payload.site || {};
        const warnings = safeArray(site.warnings).slice(0, 4);
        if (connectionLost)
            warnings.unshift({ level: 'error', title: t('communication'), message: (opts && opts.error) || t('connectionLost') });
        if (!warnings.length)
            return `<article class="nw-insight-panel nw-warning-panel is-ok"><header><span class="nw-insight-icon">✓</span><div><strong>${escapeHtml(t('warningsTitle'))}</strong><small>${escapeHtml(t('allOk'))}</small></div></header><div class="nw-empty-warning"><span>✓</span><div><strong>${escapeHtml(t('noWarnings'))}</strong><small>${escapeHtml(t('allOk'))}</small></div></div></article>`;
        return `<article class="nw-insight-panel nw-warning-panel"><header><span class="nw-insight-icon">!</span><div><strong>${escapeHtml(t('warningsTitle'))}</strong><small>${escapeHtml(`${warnings.length} aktive Meldung(en)`)}</small></div></header><ul>${warnings.map((entry) => `<li data-level="${escapeHtml(entry && entry.level || 'warning')}"><span>${entry && entry.level === 'error' ? '!' : '△'}</span><div><strong>${escapeHtml(entry && entry.title || t('warningsTitle'))}</strong><small>${escapeHtml(entry && entry.message || '')}</small></div></li>`).join('')}</ul></article>`;
    }
    function render(payload, opts = {}) {
        if (!app || !payload)
            return;
        const viewPayload = withPresentationModel(payload);
        const station = viewPayload.station || {};
        const site = viewPayload.site || {};
        const display = viewPayload.display || {};
        const connectors = Array.isArray(viewPayload.connectors) ? viewPayload.connectors : [];
        const layout = connectorLayout(connectors);
        const countBucket = layout.count >= 5 ? 'many' : String(layout.count);
        const countClass = 'nw-connectors--count-' + countBucket;
        const layoutClass = 'nw-connectors--layout-' + escapeHtml(site.layoutMode || station.layoutMode || (layout.count >= 5 ? 'compact' : 'auto'));
        app.dataset.density = layout.density;
        app.dataset.connectorCount = String(layout.count);
        app.style.setProperty('--lp-columns', String(layout.columns));
        app.style.setProperty('--lp-rows', String(layout.rows));
        app.innerHTML = `<header class="nw-display-header">
      <div class="nw-brand-block"><img src="/static/assets/nexowatt-eos-logo-wide.png" alt="NexoWatt EOS" class="nw-display-logo" /><div class="nw-brand-divider"></div><div class="nw-display-title"><div class="nw-display-brand">NexoWatt Charge</div><h1>${escapeHtml(station.name || station.id || 'Station')}</h1><p class="nw-display-sub">${escapeHtml((station.type || 'dc').toUpperCase())} · ${connectors.length} ${escapeHtml(t('connectors'))} <span class="nw-online-dot ${station.displayOnline && !connectionLost ? 'is-online' : ''}"></span>${escapeHtml(station.displayOnline && !connectionLost ? t('online') : t('offline'))}</p></div></div>
      <div class="nw-header-meta"><div><span>⚡ ${escapeHtml(t('stationType'))}</span><strong>${escapeHtml((station.type || 'dc').toUpperCase())}</strong></div><div><span>▣ ${escapeHtml(t('lpCount'))}</span><strong>${escapeHtml(String(connectors.length))}</strong></div><div><span>◷ ${escapeHtml(t('lastUpdate'))}</span><strong>${escapeHtml(fmtDateTime(payload.generatedAt || lastOkTs))}</strong></div>${languageSwitchHtml(station)}</div>
    </header>${bannerHtml(viewPayload, opts)}${renderStatusStrip(viewPayload)}${renderSummary(viewPayload)}
    <section class="nw-lp-section"><header><strong>${escapeHtml(t('connectors'))} (${connectors.length})</strong><div class="nw-status-legend"><span data-tone="charging">● ${escapeHtml(t('charging'))}</span><span data-tone="ready">● ${escapeHtml(t('ready'))}</span><span data-tone="inactive">● ${escapeHtml(t('inactive'))}</span><span data-tone="waiting">● ${escapeHtml(t('waiting'))}</span></div></header><div class="nw-connector-grid ${countClass} ${layoutClass}">${connectors.map((c) => renderConnector(c, station)).join('') || `<section class="nw-display-status"><h1>${escapeHtml(t('unavailable'))}</h1><p>${escapeHtml(t('noConnectors'))}</p></section>`}</div></section>
    <section class="nw-insights-grid">${renderDecisionPanel(viewPayload)}${renderWarningsPanel(viewPayload, opts)}</section>
    <footer class="nw-display-footer"><span>NexoWatt EOS · Energy Operation System</span><span>${escapeHtml(display.apiVersion || '0.8.201')}</span><span>${escapeHtml(t('directHardwareWrite'))}</span></footer>`;
        app.querySelectorAll('[data-command]').forEach((btn) => btn.addEventListener('click', () => {
            const extra = {};
            if (btn.hasAttribute('data-value'))
                extra.value = btn.getAttribute('data-value') === 'true';
            if (btn.hasAttribute('data-enabled'))
                extra.enabled = btn.getAttribute('data-enabled') === 'true';
            sendCommand(btn.getAttribute('data-lp'), btn.getAttribute('data-action'), btn.getAttribute('data-mode'), extra);
        }));
        app.querySelectorAll('[data-lang]').forEach((btn) => btn.addEventListener('click', () => { manualLanguage = String(btn.getAttribute('data-lang') || '').toLowerCase(); document.documentElement.lang = manualLanguage || 'de'; render(lastPayload || payload, opts); }));
    }
    token = getToken();
    showStatus('NexoWatt Charge', t('loading'), 'nw-display-status--loading');
    refresh();
    heartbeat();
    scheduleHeartbeat(10000);
})();
