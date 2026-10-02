// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/dashboard-lp-status.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/dashboard-lp-status.js
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
 * Original-Hash: d10f17203170ba9b3b95c086f199c513fd8d8ff3da6bee47acbcd35f5be7a32c
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
 * Quelle: src-ts/runtime-executables/www/dashboard-lp-status.ts
 * Quell-Hash: sha256:7888cabfbb4d5b03e395f586e1b91d6985d5c5c8d3be35df8da1de94a9853f53
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/dashboard-lp-status.js.
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
 * Aufgabe: Übersetzt Ladepunkt-Diagnosen und Betriebszustände in die Kundenanzeige des Dashboards.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/dashboard-lp-status.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
(() => {
    const dashboardWindow = window;
    const TEXT = Object.freeze({
        de: Object.freeze({
            noPoints: 'Keine aktiven Ladepunkte', ready: 'Ladepunkte bereit', systemsNormal: 'Alle Systeme normal',
            safetySummary: 'EOS Safety überwacht – Ladepunkte prüfen', errorSummary: '{count} Ladepunkt{suffix} mit Fehler',
            warningSummary: '{count} Ladepunkt{suffix} begrenzt oder wartend', chargingSummary: '{charging}/{total} Ladepunkte laden',
            waitingSummary: '{count} Ladepunkt{suffix} wartet', lpReadySummary: 'Ladepunkte bereit',
            charging: 'Lädt · {power}', chargingLimited: 'Lädt begrenzt · {power}', noVehicle: 'Kein Fahrzeug verbunden',
            offline: 'Ladepunkt offline', fault: 'Störung am Ladepunkt', unavailable: 'Ladepunkt nicht verfügbar',
            manualLock: 'Ladestation manuell gesperrt', rfidLock: 'RFID-Freigabe fehlt', controlOff: 'Regelung ausgeschaltet',
            mapping: 'Datenpunktzuordnung unvollständig', noControl: 'Keine schreibbare Leistungsvorgabe',
            safety: 'EOS Safety überwacht – Laden gestoppt', safetyPower: 'Aktuelle Leistung {power} · Stoppanforderung aktiv',
            starting: 'Ladefreigabe aktiv – Start wird erwartet', paraFallback: '§14a-Verbindung fehlt – lokaler Fallback aktiv',
            pvWait: 'Wartet auf PV-Überschuss', minPvWait: 'Min+PV wartet auf verfügbare Mindestleistung',
            goalWait: 'Zeit-Ziel aktiv – wartet auf Ladefenster', strategyWait: 'Betriebsstrategie wartet',
            noDemand: 'Fahrzeug fordert aktuell keine Ladung', noBudget: 'Aktuell nicht genügend Ladeleistung verfügbar',
            gridLimit: 'Netzanschlusslimit erreicht', phaseLimit: 'Phasenlimit erreicht', stationLimit: 'Stationslimit erreicht',
            paraLimit: 'Durch §14a begrenzt', peakLimit: 'Lastspitzenkappung aktiv', stale: 'Messwerte veraltet – sicher pausiert',
            writeError: 'Wallbox-Befehl nicht bestätigt', noSetpoint: 'Keine steuerbare Leistungsvorgabe',
            tariffWait: 'Tarifbedingungen lassen aktuell keine Ladung zu', readyNoRequest: 'Bereit – aktuell keine Ladeanforderung',
            mode: 'Modus: {mode}', targetAt: 'Ziel bis {time}', targetRisk: 'Zeit-Ziel gefährdet',
            fallbackDetail: '§14a-Kommunikationsfallback · wirksames EVCS-Limit {power}',
            safetyPara14a: '§14a-Kommunikation oder Freigabe fehlt', safetyGrid: 'Netz-/Anlagenschutz begrenzt die Ladeleistung',
            safetyGeneric: 'Zentrale EOS-Sicherheitsfreigabe ist nicht vorhanden',
        }),
        nl: Object.freeze({
            noPoints: 'Geen actieve laadpunten', ready: 'Laadpunten gereed', systemsNormal: 'Alle systemen werken normaal',
            safetySummary: 'EOS Safety actief – controleer laadpunten', errorSummary: '{count} laadpunt{suffix} met fout',
            warningSummary: '{count} laadpunt{suffix} begrensd of wachtend', chargingSummary: '{charging}/{total} laadpunten laden',
            waitingSummary: '{count} laadpunt{suffix} wacht', lpReadySummary: 'Laadpunten gereed',
            charging: 'Laadt · {power}', chargingLimited: 'Laadt begrensd · {power}', noVehicle: 'Geen voertuig aangesloten',
            offline: 'Laadpunt offline', fault: 'Storing aan laadpunt', unavailable: 'Laadpunt niet beschikbaar',
            manualLock: 'Laadstation handmatig geblokkeerd', rfidLock: 'RFID-vrijgave ontbreekt', controlOff: 'Regeling uitgeschakeld',
            mapping: 'Datapunttoewijzing onvolledig', noControl: 'Geen schrijfbaar vermogenssetpoint',
            safety: 'EOS Safety actief – laden gestopt', safetyPower: 'Actueel vermogen {power} · stopopdracht actief',
            starting: 'Laadvrijgave actief – wachten op start', paraFallback: '§14a-verbinding ontbreekt – lokale fallback actief',
            pvWait: 'Wacht op PV-overschot', minPvWait: 'Min+PV wacht op beschikbaar minimumvermogen',
            goalWait: 'Tijddoel actief – wacht op laadvenster', strategyWait: 'Bedrijfsstrategie wacht',
            noDemand: 'Voertuig vraagt momenteel geen lading', noBudget: 'Momenteel onvoldoende laadvermogen beschikbaar',
            gridLimit: 'Netaansluitingslimiet bereikt', phaseLimit: 'Faselimiet bereikt', stationLimit: 'Stationslimiet bereikt',
            paraLimit: 'Begrensd door §14a', peakLimit: 'Piekbelastingbegrenzing actief', stale: 'Meetwaarden verouderd – veilig gepauzeerd',
            writeError: 'Wallbox-opdracht niet bevestigd', noSetpoint: 'Geen regelbaar setpoint',
            tariffWait: 'Tariefvoorwaarden laten momenteel geen lading toe', readyNoRequest: 'Gereed – momenteel geen laadaanvraag',
            mode: 'Modus: {mode}', targetAt: 'Doel tot {time}', targetRisk: 'Tijddoel in gevaar',
            fallbackDetail: '§14a-communicatiefallback · effectieve EVCS-limiet {power}',
            safetyPara14a: '§14a-communicatie of vrijgave ontbreekt', safetyGrid: 'Net-/installatiebeveiliging begrenst het laadvermogen',
            safetyGeneric: 'Centrale EOS-veiligheidsvrijgave ontbreekt',
        }),
        en: Object.freeze({
            noPoints: 'No active charging points', ready: 'Charging points ready', systemsNormal: 'All systems normal',
            safetySummary: 'EOS Safety active – check charging points', errorSummary: '{count} charging point{suffix} with error',
            warningSummary: '{count} charging point{suffix} limited or waiting', chargingSummary: '{charging}/{total} charging points charging',
            waitingSummary: '{count} charging point{suffix} waiting', lpReadySummary: 'Charging points ready',
            charging: 'Charging · {power}', chargingLimited: 'Charging limited · {power}', noVehicle: 'No vehicle connected',
            offline: 'Charging point offline', fault: 'Charging point fault', unavailable: 'Charging point unavailable',
            manualLock: 'Charging station manually locked', rfidLock: 'RFID authorization missing', controlOff: 'Control disabled',
            mapping: 'Datapoint mapping incomplete', noControl: 'No writable power setpoint',
            safety: 'EOS Safety active – charging stopped', safetyPower: 'Current power {power} · stop request active',
            starting: 'Charging enabled – waiting for start', paraFallback: '§14a connection missing – local fallback active',
            pvWait: 'Waiting for PV surplus', minPvWait: 'Min+PV waiting for available minimum power',
            goalWait: 'Time target active – waiting for charging window', strategyWait: 'Operating strategy waiting',
            noDemand: 'Vehicle currently requests no charge', noBudget: 'Insufficient charging power currently available',
            gridLimit: 'Grid connection limit reached', phaseLimit: 'Phase limit reached', stationLimit: 'Station limit reached',
            paraLimit: 'Limited by §14a', peakLimit: 'Peak-shaving active', stale: 'Measurements stale – safely paused',
            writeError: 'Wallbox command not confirmed', noSetpoint: 'No controllable setpoint',
            tariffWait: 'Tariff conditions currently prevent charging', readyNoRequest: 'Ready – no current charging request',
            mode: 'Mode: {mode}', targetAt: 'Target by {time}', targetRisk: 'Time target at risk',
            fallbackDetail: '§14a communication fallback · effective EVCS limit {power}',
            safetyPara14a: '§14a communication or enable signal missing', safetyGrid: 'Grid/site protection limits charging power',
            safetyGeneric: 'Central EOS safety clearance is missing',
        }),
    });
/**
 * Code-Teil: locale
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function locale() {
        const descriptor = dashboardWindow.__nwLocale;
        const tag = String(descriptor?.localeTag || descriptor?.htmlLang || document.documentElement.lang || 'de').toLowerCase();
        return tag.startsWith('nl') ? 'nl' : (tag.startsWith('en') ? 'en' : 'de');
    }
/**
 * Code-Teil: localeTag
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function localeTag() {
        const descriptor = dashboardWindow.__nwLocale;
        return String(descriptor?.localeTag || (locale() === 'nl' ? 'nl-NL' : locale() === 'en' ? 'en-GB' : 'de-DE'));
    }
/**
 * Code-Teil: text
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function text(key, values = {}) {
        const selected = TEXT[locale()];
        let output = String(selected[key] || TEXT.de[key] || key);
        for (const [name, value] of Object.entries(values))
            output = output.replaceAll(`{${name}}`, String(value));
        return output;
    }
/**
 * Code-Teil: pluralSuffix
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function pluralSuffix(count) {
        if (count === 1)
            return '';
        return locale() === 'nl' ? 'en' : (locale() === 'en' ? 's' : 'e');
    }
/**
 * Code-Teil: record
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function record(value) {
        if (value && typeof value === 'object' && !Array.isArray(value))
            return value;
        if (typeof value !== 'string' || !value.trim())
            return null;
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        }
        catch {
            return null;
        }
    }
/**
 * Code-Teil: bool
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function bool(value, fallback = false) {
        return value === undefined || value === null ? fallback : value === true;
    }
/**
 * Code-Teil: number
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function number(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
/**
 * Code-Teil: string
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function string(value, fallback = '') {
        return value === undefined || value === null ? fallback : String(value);
    }
/**
 * Code-Teil: power
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function power(value) {
        const watts = Math.max(0, number(value));
        if (watts >= 1000)
            return `${new Intl.NumberFormat(localeTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(watts / 1000)} kW`;
        return `${Math.round(watts)} W`;
    }
/**
 * Code-Teil: mode
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function mode(value) {
        const token = string(value).trim().toLowerCase();
        if (['pv', 'pv-surplus', 'pv_surplus'].includes(token))
            return 'PV';
        if (['minpv', 'min+pv', 'min-pv'].includes(token))
            return 'Min+PV';
        if (token === 'boost')
            return 'Boost';
        if (['manual', 'manuell'].includes(token))
            return locale() === 'nl' ? 'Handmatig' : (locale() === 'en' ? 'Manual' : 'Manuell');
        return 'Auto';
    }
/**
 * Code-Teil: time
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function time(value) {
        const timestamp = number(value);
        if (timestamp <= 0)
            return '';
        try {
            return new Intl.DateTimeFormat(localeTag(), { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
        }
        catch {
            return '';
        }
    }
/**
 * Code-Teil: reasonText
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function reasonText(rawReason, fallbackKey) {
        const raw = string(rawReason).trim();
        const upper = raw.toUpperCase();
        if (!raw)
            return fallbackKey ? text(fallbackKey) : '';
        if (/14A|PARA14A|EEBUS|CLS/.test(upper))
            return text('safetyPara14a');
        if (/GRID|NETZ|IMPORT|HEADROOM/.test(upper))
            return text('safetyGrid');
        if (/PHASE|PHASEN/.test(upper))
            return text('phaseLimit');
        if (/STATION/.test(upper))
            return text('stationLimit');
        if (/NO_PV|PV_SURPLUS|PV-ÜBERSCHUSS|PV UEBERSCHUSS/.test(upper))
            return text('pvWait');
        if (/TARIFF|TARIF|PRICE|PREIS/.test(upper))
            return text('tariffWait');
        if (/STALE|VERALTET/.test(upper))
            return text('stale');
        if (/WRITE|COMMAND|APPLY|READBACK|BESTÄTIG|BESTAETIG/.test(upper))
            return text('writeError');
        if (/NO_VEHICLE|KEIN FAHRZEUG/.test(upper))
            return text('noVehicle');
        if (/NO_BUDGET|BELOW_MIN|LIMITED_BY_BUDGET|MINIMUM/.test(upper))
            return text('noBudget');
        if (/NO_SETPOINT|SETPOINT/.test(upper))
            return text('noSetpoint');
        if (/SAFETY|EMERGENCY|NOT-AUS|NOTAUS/.test(upper))
            return text('safetyGeneric');
        const readable = raw.replace(/^safety[-_:]*/i, '').replace(/[_:]+/g, ' ').replace(/-+/g, ' ').replace(/\s+/g, ' ').trim();
        if (!readable || /^(applied|unchanged|running|ok|none|normal)$/i.test(readable))
            return fallbackKey ? text(fallbackKey) : '';
        return readable.charAt(0).toUpperCase() + readable.slice(1);
    }
/**
 * Code-Teil: limiterKey
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function limiterKey(limiter, reason) {
        const token = `${string(limiter)} ${string(reason)}`.toLowerCase();
        if (token.includes('eos-safety-stop') || token.includes('safety-stop'))
            return 'safety';
        if (token.includes('fault'))
            return 'fault';
        if (token.includes('unavailable'))
            return 'unavailable';
        if (token.includes('offline'))
            return 'offline';
        if (token.includes('stale'))
            return 'stale';
        if (token.includes('write'))
            return 'writeError';
        if (token.includes('grid'))
            return 'gridLimit';
        if (token.includes('phase'))
            return 'phaseLimit';
        if (token.includes('14a') || token.includes('para'))
            return 'paraLimit';
        if (token.includes('station'))
            return 'stationLimit';
        if (token.includes('peak'))
            return 'peakLimit';
        if (token.includes('pv'))
            return 'pvWait';
        if (token.includes('budget') || token.includes('below-min') || token.includes('below_min'))
            return 'noBudget';
        if (token.includes('no-charge-demand'))
            return 'noDemand';
        if (token.includes('no-vehicle'))
            return 'noVehicle';
        if (token.includes('no-setpoint'))
            return 'noSetpoint';
        return '';
    }
/**
 * Code-Teil: rawValue
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function rawValue(row, key, fallback) {
        return Object.prototype.hasOwnProperty.call(row, key) ? row[key] : fallback;
    }
/**
 * Code-Teil: collect
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function collect(getter) {
        const audit = (record(getter('chargingManagement.audit.snapshotJson')) || {});
        const auditRows = Array.isArray(audit.wallboxes) ? audit.wallboxes : [];
        const stateSnapshot = dashboardWindow.latestState || {};
        const directSafes = new Set();
        for (const key of Object.keys(stateSnapshot)) {
            const match = /^chargingManagement\.wallboxes\.([^.]+)\./.exec(key);
            if (match?.[1])
                directSafes.add(match[1]);
        }
        const auditBySafe = new Map();
        for (const candidate of auditRows) {
            const row = record(candidate);
            const safe = string(row?.safe).trim();
            if (safe && row)
                auditBySafe.set(safe, row);
        }
        const rows = [];
        const safes = Array.from(new Set([...auditBySafe.keys(), ...directSafes]));
        for (const safe of safes) {
            const base = `chargingManagement.wallboxes.${safe}`;
            const raw = auditBySafe.get(safe) || {};
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
            const read = (key, fallback) => {
                const value = getter(`${base}.${key}`);
                return value === undefined || value === null ? fallback : value;
            };
            const cfgEnabled = read('cfgEnabled', undefined);
            const hasAuditRuntime = Object.keys(raw).length > 0;
            const hasDirectRuntime = read('name', undefined) !== undefined || read('online', undefined) !== undefined;
            if (cfgEnabled === false)
                continue;
            if (!hasAuditRuntime && (cfgEnabled !== true || !hasDirectRuntime))
                continue;
            const userMode = string(read('userMode', rawValue(raw, 'userMode', 'auto')), 'auto');
            const effectiveMode = string(read('effectiveMode', rawValue(raw, 'effectiveMode', rawValue(raw, 'mode', userMode))), userMode);
            rows.push({
                ...raw,
                safe,
                name: string(read('name', rawValue(raw, 'name', safe)), safe),
                cfgEnabled: cfgEnabled !== false,
                enabled: read('enabled', rawValue(raw, 'enabled', true)) !== false,
                userEnabled: read('userEnabled', true) !== false,
                userStationEnabled: read('userStationEnabled', true) !== false,
                stationEnabled: read('stationEnabled', true) !== false,
                stationEnableControlAvailable: bool(read('stationEnableControlAvailable', false)),
                rfidLockActive: bool(read('rfidLockActive', false)),
                rfidReason: string(read('rfidReason', '')),
                availabilityOwner: string(read('availabilityOwner', '')),
                online: read('online', rawValue(raw, 'online', true)) !== false,
                mappingOk: read('mappingOk', true) !== false,
                controlAvailable: read('hasSetpoint', rawValue(raw, 'controlAvailable', true)) !== false,
                connected: bool(read('vehiclePlugged', rawValue(raw, 'connected', false))) || bool(rawValue(raw, 'connected', false)),
                vehicleDemandConfirmed: bool(read('vehicleDemandConfirmed', rawValue(raw, 'vehicleDemandConfirmed', false))),
                vehicleStateNormalized: string(read('vehicleStateNormalized', '')),
                vehicleStartProbeActive: bool(read('vehicleStartProbeActive', false)),
                charging: bool(read('charging', rawValue(raw, 'charging', false))) || bool(rawValue(raw, 'charging', false)),
                actualPowerW: Math.max(0, number(read('actualPowerW', rawValue(raw, 'actualPowerW', 0)))),
                targetPowerW: Math.max(0, number(read('targetPowerW', rawValue(raw, 'targetPowerW', 0)))),
                meterStale: bool(read('meterStale', rawValue(raw, 'meterStale', false))),
                faultActive: bool(read('faultActive', rawValue(raw, 'faultActive', false))),
                faultReason: string(read('faultReason', rawValue(raw, 'faultReason', ''))),
                unavailableActive: bool(read('unavailableActive', rawValue(raw, 'unavailableActive', false))),
                unavailableReason: string(read('unavailableReason', rawValue(raw, 'unavailableReason', ''))),
                operationalBlocked: bool(read('operationalBlocked', false)),
                mode: userMode,
                userMode,
                effectiveMode,
                reason: string(read('reason', rawValue(raw, 'reason', ''))),
                safetyReason: string(rawValue(raw, 'safetyReason', '')),
                limiter: string(rawValue(raw, 'limiter', '')),
                applyStatus: string(read('applyStatus', rawValue(raw, 'applyStatus', ''))),
                hardwareCommandConfirmed: read('hardwareCommandConfirmed', true) !== false,
                hardwareCommandState: string(read('hardwareCommandState', '')),
                goalEnabled: bool(read('goalEnabled', false)),
                goalActive: bool(read('goalActive', false)),
                goalStatus: string(read('goalStatus', '')),
                goalFinishTs: number(read('goalFinishTs', 0)),
                goalTariffOverride: bool(read('goalTariffOverride', false)),
                strategyActive: bool(read('strategyActive', false)),
                strategyStatus: string(read('strategyStatus', '')),
                strategyReason: string(read('strategyReason', '')),
                para14aCapped: bool(read('para14aCapped', false)),
                connectorNo: number(read('connectorNo', rawValue(raw, 'connectorNo', 0))),
            });
        }
        rows.sort((a, b) => {
            const firstMatch = /\d+/.exec(a.safe);
            const secondMatch = /\d+/.exec(b.safe);
            const first = a.connectorNo || number(firstMatch?.[0], 9999);
            const second = b.connectorNo || number(secondMatch?.[0], 9999);
            return first - second || a.name.localeCompare(b.name);
        });
        return { audit, rows };
    }
/**
 * Code-Teil: build
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function build(getter) {
        const { audit, rows } = collect(getter);
        const safety = record(audit.safety);
        const safetyStage = string(audit.safetyStage || getter('chargingManagement.audit.safetyStage')).trim();
        const safetyInvalidReason = string(safety?.invalidReason || audit.safetyReason || getter('chargingManagement.control.failsafeDetails')).trim();
        const globalSafety = safetyStage === 'EOS-SAFETY-STOP' || audit.safetyStop === true || safety?.valid === false || safety?.emergencyStop === true;
        const paraFallbackActive = getter('para14a.communicationFallbackActive') === true;
        const paraFallbackReason = string(getter('para14a.communicationFallbackReason')).trim();
        const paraFallbackCapW = Math.max(0, number(getter('para14a.fallbackEvcsCapW')));
        const tariffState = string(getter('tarif.state')).trim().toLowerCase();
        const items = rows.map((row) => {
            const actualPowerW = Math.max(0, row.actualPowerW);
            const targetPowerW = Math.max(0, row.targetPowerW);
            const charging = row.charging || actualPowerW >= 150;
            const connectedStates = ['connected_startable', 'ready_to_charge', 'starting', 'charging', 'paused_by_station', 'paused_by_vehicle'];
            const connected = row.connected || connectedStates.includes(row.vehicleStateNormalized.toLowerCase());
            const rawReason = row.safetyReason || row.reason || row.applyStatus;
            const activeLimiterKey = limiterKey(row.limiter, rawReason);
            const modeLabel = mode(row.userMode || row.mode);
            const effectiveModeToken = string(row.effectiveMode || row.mode).trim().toLowerCase();
            const detailParts = [];
            let level = 'info';
            let headline = text('readyNoRequest');
            if (!row.online) {
                level = 'error';
                headline = text('offline');
                detailParts.push(reasonText(rawReason, 'offline'));
            }
            else if (row.faultActive) {
                level = 'error';
                headline = text('fault');
                detailParts.push(reasonText(row.faultReason || rawReason, 'fault'));
            }
            else if (!row.mappingOk) {
                level = 'error';
                headline = text('mapping');
            }
            else if (row.unavailableActive || row.operationalBlocked) {
                level = 'error';
                headline = text('unavailable');
                detailParts.push(reasonText(row.unavailableReason || rawReason, 'unavailable'));
            }
            else if (row.rfidLockActive) {
                level = 'warn';
                headline = text('rfidLock');
                detailParts.push(reasonText(row.rfidReason, 'rfidLock'));
            }
            else if (!row.userStationEnabled) {
                level = 'warn';
                headline = text('manualLock');
            }
            else if (!row.userEnabled || !row.enabled) {
                level = 'info';
                headline = text('controlOff');
            }
            else if (!connected) {
                level = 'info';
                headline = text('noVehicle');
            }
            else if (globalSafety) {
                level = 'error';
                headline = text('safety');
                detailParts.push(reasonText(safetyInvalidReason || rawReason, 'safetyGeneric'));
                if (charging)
                    detailParts.push(text('safetyPower', { power: power(actualPowerW) }));
            }
            else if (charging) {
                const limited = activeLimiterKey !== '' && !['noVehicle', 'noDemand', 'pvWait'].includes(activeLimiterKey) && row.limiter.toLowerCase() !== 'none';
                const limitedCharging = limited || paraFallbackActive || row.para14aCapped;
                level = limitedCharging ? 'warn' : 'ok';
                headline = text(limitedCharging ? 'chargingLimited' : 'charging', { power: power(actualPowerW) });
                if (limited && activeLimiterKey)
                    detailParts.push(text(activeLimiterKey));
            }
            else if (row.meterStale || activeLimiterKey === 'stale') {
                level = 'error';
                headline = text('stale');
            }
            else if (!row.hardwareCommandConfirmed || activeLimiterKey === 'writeError' || /write_failed|unreachable|executor_error/i.test(row.applyStatus)) {
                level = 'error';
                headline = text('writeError');
                detailParts.push(reasonText(row.applyStatus || rawReason, 'writeError'));
            }
            else if (!row.controlAvailable || activeLimiterKey === 'noSetpoint') {
                level = 'error';
                headline = text('noControl');
            }
            else if (row.vehicleStartProbeActive || targetPowerW > 0) {
                level = 'info';
                headline = text('starting');
                if (targetPowerW > 0)
                    detailParts.push(power(targetPowerW));
            }
            else if (paraFallbackActive) {
                level = 'warn';
                headline = text('paraFallback');
                detailParts.push(text('fallbackDetail', { power: power(paraFallbackCapW) }));
                const fallbackDetail = reasonText(paraFallbackReason, 'safetyPara14a');
                if (fallbackDetail)
                    detailParts.push(fallbackDetail);
            }
            else if (activeLimiterKey) {
                level = ['offline', 'fault', 'unavailable', 'stale', 'writeError', 'noSetpoint', 'safety'].includes(activeLimiterKey)
                    ? 'error' : (['noVehicle', 'noDemand', 'pvWait'].includes(activeLimiterKey) ? 'info' : 'warn');
                headline = text(activeLimiterKey);
                const detail = reasonText(rawReason);
                if (detail && detail !== headline)
                    detailParts.push(detail);
            }
            else if (row.goalEnabled && row.goalActive) {
                level = /gefährdet|gefaehrdet|risk|shortfall|unreachable/i.test(row.goalStatus) ? 'warn' : 'info';
                headline = level === 'warn' ? text('targetRisk') : text('goalWait');
                const finishTime = time(row.goalFinishTs);
                if (finishTime)
                    detailParts.push(text('targetAt', { time: finishTime }));
                const detail = reasonText(row.goalStatus);
                if (detail && detail !== headline)
                    detailParts.push(detail);
            }
            else if (row.strategyActive) {
                level = 'info';
                headline = text('strategyWait');
                const detail = reasonText(row.strategyReason || row.strategyStatus);
                if (detail)
                    detailParts.push(detail);
            }
            else if (effectiveModeToken === 'pv') {
                level = 'info';
                headline = text('pvWait');
            }
            else if (['minpv', 'min+pv', 'min-pv'].includes(effectiveModeToken)) {
                level = 'info';
                headline = text('minPvWait');
            }
            else if (!row.vehicleDemandConfirmed) {
                level = 'info';
                headline = text('noDemand');
            }
            else if (['teuer', 'expensive'].includes(tariffState)) {
                level = 'info';
                headline = text('tariffWait');
            }
            if (!detailParts.length)
                detailParts.push(text('mode', { mode: modeLabel }));
            if (paraFallbackActive && !detailParts.some((part) => part.includes('§14a')))
                detailParts.push(text('fallbackDetail', { power: power(paraFallbackCapW) }));
            return {
                safe: row.safe, name: row.name, level, headline,
                detail: Array.from(new Set(detailParts.filter(Boolean))).join(' · '),
                actualPowerW, targetPowerW, charging, connected, mode: modeLabel,
            };
        });
        const chargingCount = items.filter((item) => item.charging).length;
        const errorCount = items.filter((item) => item.level === 'error').length;
        const warningCount = items.filter((item) => item.level === 'warn').length;
        const waitingCount = items.filter((item) => item.connected && !item.charging && item.level !== 'error').length;
        let summary = text('lpReadySummary');
        let systemText = text('systemsNormal');
        let overallLevel = 'ok';
        if (globalSafety) {
            summary = text('safetySummary');
            systemText = summary;
            overallLevel = 'error';
        }
        else if (errorCount > 0) {
            summary = text('errorSummary', { count: errorCount, suffix: pluralSuffix(errorCount) });
            systemText = summary;
            overallLevel = 'error';
        }
        else if (warningCount > 0 || paraFallbackActive) {
            const count = Math.max(warningCount, paraFallbackActive ? 1 : 0);
            summary = text('warningSummary', { count, suffix: pluralSuffix(count) });
            systemText = summary;
            overallLevel = 'warn';
        }
        else if (chargingCount > 0) {
            summary = text('chargingSummary', { charging: chargingCount, total: items.length });
        }
        else if (waitingCount > 0) {
            summary = text('waitingSummary', { count: waitingCount, suffix: pluralSuffix(waitingCount) });
        }
        return { items, total: items.length, chargingCount, errorCount, warningCount, waitingCount, globalSafety, paraFallbackActive, summary, systemText, overallLevel };
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
    function render(getter, evcsAvailable) {
        const block = document.getElementById('sideEvcsStatusBlock');
        const list = document.getElementById('sideEvcsStatusList');
        const summaryElement = document.getElementById('sideEvcsStatusSummary');
        const detailsLink = document.getElementById('sideEvcsStatusDetails');
        const panel = document.querySelector('.nw-panel-status');
        if (!block || !list || !summaryElement)
            return null;
        const model = evcsAvailable ? build(getter) : {
            items: [], total: 0, chargingCount: 0, errorCount: 0, warningCount: 0, waitingCount: 0,
            globalSafety: false, paraFallbackActive: false, summary: '', systemText: '', overallLevel: 'ok',
        };
        block.classList.toggle('hidden', !evcsAvailable || model.items.length === 0);
        const detailsAvailable = evcsAvailable && model.items.length > 1;
        if (detailsLink) {
            detailsLink.hidden = !detailsAvailable;
            detailsLink.classList.toggle('hidden', !detailsAvailable);
            if (detailsAvailable) {
                detailsLink.setAttribute('href', 'evcs.html');
                detailsLink.removeAttribute('aria-hidden');
                detailsLink.removeAttribute('aria-disabled');
                detailsLink.removeAttribute('tabindex');
            }
            else {
                detailsLink.removeAttribute('href');
                detailsLink.setAttribute('aria-hidden', 'true');
                detailsLink.setAttribute('aria-disabled', 'true');
                detailsLink.tabIndex = -1;
            }
        }
        list.textContent = '';
        if (evcsAvailable && model.items.length > 0) {
            summaryElement.textContent = model.summary;
            for (const item of model.items) {
                const row = document.createElement('div');
                row.className = `nw-evcs-system-item is-${item.level}`;
                row.title = `${item.name}: ${item.headline}${item.detail ? ` – ${item.detail}` : ''}`;
                const dot = document.createElement('span');
                dot.className = 'nw-evcs-system-dot';
                dot.setAttribute('aria-hidden', 'true');
                const copy = document.createElement('span');
                copy.className = 'nw-evcs-system-copy';
                const top = document.createElement('span');
                top.className = 'nw-evcs-system-top';
                const name = document.createElement('b');
                name.textContent = item.name;
                const displayedPower = document.createElement('small');
                displayedPower.textContent = item.charging || item.targetPowerW > 0 ? power(item.charging ? item.actualPowerW : item.targetPowerW) : item.mode;
                top.append(name, displayedPower);
                const headline = document.createElement('span');
                headline.className = 'nw-evcs-system-headline';
                headline.textContent = item.headline;
                const detail = document.createElement('span');
                detail.className = 'nw-evcs-system-detail';
                detail.textContent = item.detail;
                copy.append(top, headline, detail);
                row.append(dot, copy);
                list.appendChild(row);
            }
        }
        else {
            summaryElement.textContent = text('noPoints');
        }
        panel?.classList.toggle('is-error', model.overallLevel === 'error');
        panel?.classList.toggle('is-warn', model.overallLevel === 'warn');
        if (evcsAvailable && model.items.length > 0 && model.systemText) {
            const statusText = document.getElementById('sideStatusText');
            if (statusText)
                statusText.textContent = model.systemText;
        }
        return model;
    }
    dashboardWindow.NexoWattLpStatusPresenter = Object.freeze({
        build: (values) => build((key) => values[key]),
        render,
    });
})();
