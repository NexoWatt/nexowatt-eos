/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/forecast-settings.ts
 * Quell-Hash: sha256:45e26e3b4f679d6ac4b4ef8a1a48e18745398583dab002c1a382055b559ef109
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/forecast-settings.js.
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
 * Aufgabe: Verbindet die Kunden-Prognoseeinstellungen mit Standort, PV-Flächen und der zugehörigen Backend-Konfiguration.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/forecast-settings.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
/**
 * Kundenfreundliche Wetter-/PV-Prognoseeinstellungen.
 *
 * - zeigt den aktuellen Forecast-Status aus forecast.pv.* bzw. dem unmittelbaren
 *   Open-Meteo-Fallback forecast.openMeteoPv.*,
 * - ersetzt das frühere JSON-Eingabefeld durch einen sicheren Tabelleneditor,
 * - hält den bestehenden settings.pvForecastArrays-Vertrag für Backend und
 *   Bestandsanlagen vollständig kompatibel.
 */
(function initForecastSettings() {
    const startedAt = Date.now();
    const byId = (id) => document.getElementById(id);
    const stateEntry = (key) => {
        const state = window.latestState || {};
        const entry = state[key];
        return entry && typeof entry === 'object' ? entry : null;
    };
    const hasState = (key) => {
        const entry = stateEntry(key);
        return !!entry && Object.prototype.hasOwnProperty.call(entry, 'value');
    };
    const stateValue = (key, fallback = null) => {
        const entry = stateEntry(key);
        return entry && Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : fallback;
    };
    const firstStateValue = (keys, fallback = null) => {
        for (const key of keys)
            if (hasState(key))
                return stateValue(key, fallback);
        return fallback;
    };
    const firstNonEmptyTextState = (keys, fallback = '') => {
        for (const key of keys) {
            if (!hasState(key))
                continue;
            const value = String(stateValue(key, '') ?? '').trim();
            if (value)
                return value;
        }
        return fallback;
    };
    const firstFiniteStateValue = (keys, fallback = Number.NaN) => {
        for (const key of keys) {
            if (!hasState(key))
                continue;
            const value = Number(stateValue(key, Number.NaN));
            if (Number.isFinite(value))
                return value;
        }
        return fallback;
    };
    const asBoolean = (value, fallback = false) => {
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'number')
            return value !== 0;
        const normalized = String(value ?? '').trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled'].includes(normalized))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'aus', 'inactive', 'disabled'].includes(normalized))
            return false;
        return fallback;
    };
    const finite = (value, fallback = 0) => {
        const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
        const number = Number(normalized);
        return Number.isFinite(number) ? number : fallback;
    };
    const clamp = (value, min, max, fallback) => Math.min(max, Math.max(min, finite(value, fallback)));
    const round = (value, digits) => Number(value.toFixed(digits));
    const ORIENTATIONS = [
        { value: -180, label: 'Nord' },
        { value: -135, label: 'Nordost' },
        { value: -90, label: 'Ost' },
        { value: -45, label: 'Südost' },
        { value: 0, label: 'Süd' },
        { value: 45, label: 'Südwest' },
        { value: 90, label: 'West' },
        { value: 135, label: 'Nordwest' },
    ];
    const nearestOrientation = (value) => {
        const number = clamp(value, -180, 180, 0);
        const distance = (candidate) => Math.abs((((candidate - number) + 540) % 360) - 180);
        return ORIENTATIONS.reduce((best, item) => distance(item.value) < distance(best) ? item.value : best, ORIENTATIONS[0].value);
    };
    const normalizeRow = (value, index) => ({
        name: String(value?.name ?? `PV-Fläche ${index + 1}`).trim() || `PV-Fläche ${index + 1}`,
        kwp: round(clamp(value?.kwp, 0, 100000, 0), 3),
        tiltDeg: round(clamp(value?.tiltDeg ?? value?.tilt, 0, 90, 30), 1),
        azimuthDeg: nearestOrientation(value?.azimuthDeg ?? value?.azimuth ?? 0),
        lossPercent: round(clamp(value?.lossPercent ?? value?.lossesPercent, 0, 60, 14), 1),
        inverterLimitW: Math.round(clamp(value?.inverterLimitW, 0, 100000000, 0)),
    });
    const parseRows = (raw) => {
        let parsed = raw;
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed || '[]');
            }
            catch {
                return [];
            }
        }
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((item) => !!item && typeof item === 'object')
            .map((item, index) => normalizeRow(item, index))
            .filter((item) => item.kwp > 0 || item.name.trim() !== '');
    };
    const inputOrState = (id, key, fallback) => {
        const input = byId(id);
        if (input && String(input.value ?? '').trim() !== '')
            return input.value;
        return stateValue(`settings.${key}`, fallback);
    };
    const legacyRow = () => normalizeRow({
        name: 'PV-Fläche 1',
        kwp: inputOrState('s_pvForecastInstalledKwp', 'pvForecastInstalledKwp', 0),
        tiltDeg: inputOrState('s_pvForecastTiltDeg', 'pvForecastTiltDeg', 30),
        azimuthDeg: inputOrState('s_pvForecastAzimuthDeg', 'pvForecastAzimuthDeg', 0),
        lossPercent: inputOrState('s_pvForecastLossPercent', 'pvForecastLossPercent', 14),
        inverterLimitW: inputOrState('s_pvForecastInverterLimitW', 'pvForecastInverterLimitW', 0),
    }, 0);
    const createNumberInput = (field, value, min, max, step, label) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.dataset.field = field;
        input.min = String(min);
        input.max = String(max);
        input.step = step;
        input.value = String(value);
        input.setAttribute('aria-label', label);
        return input;
    };
    const createCell = (label, control) => {
        const cell = document.createElement('td');
        cell.dataset.label = label;
        cell.appendChild(control);
        return cell;
    };
    let persistTimer = null;
    let lastHydrationFingerprint = '';
    let editorInitialized = false;
    let editorResizeObserver = null;
    let statusTimer = null;
    const collectRows = () => {
        const body = byId('nwPvArrayRows');
        if (!body)
            return [];
        return Array.from(body.querySelectorAll('tr')).map((row, index) => {
            const field = (name) => row.querySelector(`[data-field="${name}"]`);
            return normalizeRow({
                name: field('name')?.value,
                kwp: field('kwp')?.value,
                tiltDeg: field('tiltDeg')?.value,
                azimuthDeg: field('azimuthDeg')?.value,
                lossPercent: field('lossPercent')?.value,
                inverterLimitW: finite(field('inverterLimitKw')?.value, 0) * 1000,
            }, index);
        });
    };
    const updateRemoveButtons = () => {
        const body = byId('nwPvArrayRows');
        const editor = body?.closest('.nw-pv-array-editor') || null;
        if (!body)
            return;
        const buttons = Array.from(body.querySelectorAll('.nw-pv-array-remove'));
        const removable = buttons.length > 1;
        editor?.classList.toggle('is-single-row', !removable);
        buttons.forEach((button) => {
            const cell = button.closest('.nw-pv-array-action-cell');
            button.disabled = !removable;
            button.hidden = !removable;
            button.setAttribute('aria-hidden', removable ? 'false' : 'true');
            button.tabIndex = removable ? 0 : -1;
            if (cell) {
                cell.hidden = !removable;
                cell.setAttribute('aria-hidden', removable ? 'false' : 'true');
            }
        });
    };
    const syncEditorLayout = () => {
        const editor = byId('nwPvArrayEditorTitle')?.closest('.nw-pv-array-editor') || null;
        if (!editor)
            return;
        // The settings content can be narrow even on a wide desktop because the
        // navigation column consumes space. Use the actual component width instead
        // of the browser viewport to switch safely to the card layout.
        editor.classList.toggle('is-compact', editor.clientWidth < 1080);
    };
    const setLegacyField = (id, value) => {
        const input = byId(id);
        if (input)
            input.value = String(value ?? '');
    };
    const persistRows = () => {
        persistTimer = null;
        const rows = collectRows();
        const hidden = byId('s_pvForecastArrays');
        if (!hidden)
            return;
        const serialized = JSON.stringify(rows);
        hidden.value = serialized;
        const first = rows[0] || normalizeRow(null, 0);
        setLegacyField('s_pvForecastInstalledKwp', first.kwp);
        setLegacyField('s_pvForecastTiltDeg', first.tiltDeg);
        setLegacyField('s_pvForecastAzimuthDeg', first.azimuthDeg);
        setLegacyField('s_pvForecastLossPercent', first.lossPercent);
        setLegacyField('s_pvForecastInverterLimitW', first.inverterLimitW);
        const validation = byId('nwPvArrayValidation');
        const configured = rows.filter((item) => item.kwp > 0).length;
        if (validation) {
            validation.textContent = configured > 0 ? '' : 'Bitte mindestens bei einer PV-Fläche eine installierte Leistung größer 0 kWp eintragen.';
            validation.classList.toggle('hidden', configured > 0);
        }
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
        lastHydrationFingerprint = `arrays:${serialized}`;
    };
    const markRefreshPending = () => {
        const status = byId('nwForecastStatus');
        const updated = byId('nwForecastUpdated');
        if (status) {
            status.textContent = 'Einstellungen werden übernommen …';
            status.dataset.state = 'off';
        }
        if (updated)
            updated.textContent = 'Neue Prognose wird abgefragt …';
    };
    const queuePersist = () => {
        markRefreshPending();
        if (persistTimer !== null)
            window.clearTimeout(persistTimer);
        persistTimer = window.setTimeout(persistRows, 350);
    };
    const renderRows = (rows) => {
        const body = byId('nwPvArrayRows');
        if (!body)
            return;
        const values = rows.length ? rows : [normalizeRow(null, 0)];
        body.replaceChildren();
        values.forEach((value, index) => {
            const row = document.createElement('tr');
            row.dataset.index = String(index);
            const name = document.createElement('input');
            name.type = 'text';
            name.dataset.field = 'name';
            name.maxLength = 80;
            name.value = value.name;
            name.setAttribute('aria-label', `Bezeichnung PV-Fläche ${index + 1}`);
            row.appendChild(createCell('Bezeichnung', name));
            row.appendChild(createCell('Leistung (kWp)', createNumberInput('kwp', value.kwp, 0, 100000, '0.01', `Leistung PV-Fläche ${index + 1} in kWp`)));
            row.appendChild(createCell('Neigung (°)', createNumberInput('tiltDeg', value.tiltDeg, 0, 90, '1', `Dachneigung PV-Fläche ${index + 1}`)));
            const orientation = document.createElement('select');
            orientation.dataset.field = 'azimuthDeg';
            orientation.setAttribute('aria-label', `Ausrichtung PV-Fläche ${index + 1}`);
            ORIENTATIONS.forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.value);
                option.textContent = item.label;
                orientation.appendChild(option);
            });
            orientation.value = String(nearestOrientation(value.azimuthDeg));
            row.appendChild(createCell('Ausrichtung', orientation));
            row.appendChild(createCell('Verluste (%)', createNumberInput('lossPercent', value.lossPercent, 0, 60, '0.1', `Anlagenverluste PV-Fläche ${index + 1}`)));
            row.appendChild(createCell('WR-Grenze (kW)', createNumberInput('inverterLimitKw', round(value.inverterLimitW / 1000, 3), 0, 100000, '0.1', `Wechselrichtergrenze PV-Fläche ${index + 1} in kW`)));
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'nw-pv-array-remove';
            remove.textContent = '×';
            remove.title = 'PV-Fläche entfernen';
            remove.setAttribute('aria-label', `PV-Fläche ${index + 1} entfernen`);
            remove.addEventListener('click', () => {
                const current = collectRows();
                if (current.length <= 1)
                    return;
                current.splice(index, 1);
                renderRows(current.map((item, rowIndex) => ({ ...item, name: item.name || `PV-Fläche ${rowIndex + 1}` })));
                persistRows();
            });
            const actionCell = createCell('Aktion', remove);
            actionCell.classList.add('nw-pv-array-action-cell');
            row.appendChild(actionCell);
            row.querySelectorAll('input,select').forEach((control) => {
                control.addEventListener(control instanceof HTMLSelectElement ? 'change' : 'input', queuePersist);
                if (!(control instanceof HTMLSelectElement))
                    control.addEventListener('change', queuePersist);
            });
            body.appendChild(row);
        });
        updateRemoveButtons();
        syncEditorLayout();
        editorInitialized = true;
    };
    const sourceRows = () => {
        const hidden = byId('s_pvForecastArrays');
        const hiddenRaw = String(hidden?.value || '').trim();
        const stateRaw = String(stateValue('settings.pvForecastArrays', '') || '').trim();
        const raw = hiddenRaw && hiddenRaw !== '[]' ? hiddenRaw : stateRaw;
        const rows = parseRows(raw);
        if (rows.length)
            return { rows, fingerprint: `arrays:${JSON.stringify(rows)}` };
        const legacy = legacyRow();
        return { rows: [legacy], fingerprint: `legacy:${JSON.stringify(legacy)}` };
    };
    const hydrateEditor = (force = false) => {
        const editor = byId('nwPvArrayRows');
        if (!editor)
            return;
        if (!force && editor.contains(document.activeElement))
            return;
        const next = sourceRows();
        if (!force && editorInitialized && next.fingerprint === lastHydrationFingerprint)
            return;
        renderRows(next.rows);
        lastHydrationFingerprint = next.fingerprint;
    };
    const setupArrayEditor = () => {
        const add = byId('nwPvArrayAdd');
        if (add && add.dataset.bound !== '1') {
            add.dataset.bound = '1';
            add.addEventListener('click', () => {
                const rows = collectRows();
                rows.push(normalizeRow({ name: `PV-Fläche ${rows.length + 1}`, kwp: 0, tiltDeg: 30, azimuthDeg: 0, lossPercent: 14, inverterLimitW: 0 }, rows.length));
                renderRows(rows);
                persistRows();
                const body = byId('nwPvArrayRows');
                body?.querySelector('tr:last-child [data-field="name"]')?.focus();
            });
        }
        hydrateEditor(true);
        const editor = byId('nwPvArrayEditorTitle')?.closest('.nw-pv-array-editor') || null;
        if (editor && !editorResizeObserver && typeof ResizeObserver === 'function') {
            editorResizeObserver = new ResizeObserver(syncEditorLayout);
            editorResizeObserver.observe(editor);
        }
        else if (editor && typeof ResizeObserver !== 'function' && editor.dataset.resizeFallback !== '1') {
            editor.dataset.resizeFallback = '1';
            window.addEventListener('resize', syncEditorLayout, { passive: true });
        }
        syncEditorLayout();
    };
    const formatEnergyKwh = (value) => {
        const kwh = Number(value);
        if (!Number.isFinite(kwh))
            return '—';
        const decimals = Math.abs(kwh) >= 100 ? 0 : Math.abs(kwh) >= 10 ? 1 : 2;
        return `${kwh.toFixed(decimals)} kWh`;
    };
    const formatAge = (ageValue, updatedAtValue) => {
        let ageMs = Number(ageValue);
        const updatedAt = Number(updatedAtValue);
        const ageFromTimestamp = Number.isFinite(updatedAt) && updatedAt > 0 ? Math.max(0, Date.now() - updatedAt) : Number.NaN;
        if (Number.isFinite(ageFromTimestamp))
            ageMs = Number.isFinite(ageMs) ? Math.max(ageMs, ageFromTimestamp) : ageFromTimestamp;
        if (!Number.isFinite(ageMs))
            return '—';
        const minutes = Math.max(0, Math.round(ageMs / 60000));
        if (minutes < 1)
            return 'gerade eben';
        if (minutes < 60)
            return `vor ${minutes} min`;
        const hours = Math.round(minutes / 6) / 10;
        return `vor ${String(hours).replace('.', ',')} h`;
    };
    const sourceLabel = (value) => {
        const source = String(value || '').trim().toLowerCase();
        if (source.includes('open-meteo'))
            return 'Open-Meteo';
        if (source.includes('appcenter') || source.includes('datapoint') || source.includes('mapping'))
            return 'AppCenter-Datenpunkte';
        if (source === 'disabled')
            return 'Deaktiviert';
        if (!source || source === 'none')
            return 'Nicht verfügbar';
        return String(value);
    };
    const friendlyMessage = (value) => {
        const raw = String(value || '').trim();
        const message = raw.toLowerCase();
        if (!raw)
            return '';
        if (message.includes('anlagenstandort nicht konfiguriert') || message.includes('location-not-configured')) {
            return 'Kein Anlagenstandort gefunden. Bitte im EOS-Admin einen Ort, eine Postleitzahl oder Koordinaten für den Systemstandort hinterlegen.';
        }
        if (message.includes('keine pv-fläche') || message.includes('pv-arrays-not-configured')) {
            return 'Es ist noch keine PV-Fläche mit einer installierten Leistung größer 0 kWp eingetragen.';
        }
        if (message.includes('api-key') || message.includes('apikey')) {
            return 'Für die gewerbliche Open-Meteo-Nutzung fehlt der API-Schlüssel.';
        }
        if (message.includes('http 401') || message.includes('http 403'))
            return 'Open-Meteo hat den Zugriff abgelehnt. Bitte API-Schlüssel und Nutzungsart prüfen.';
        if (message.includes('http 429'))
            return 'Open-Meteo hat zu viele Anfragen gemeldet. NexoWatt versucht es beim nächsten Aktualisierungszyklus erneut.';
        if (message.includes('timeout'))
            return 'Open-Meteo antwortet derzeit nicht rechtzeitig. NexoWatt versucht es automatisch erneut.';
        if (message.includes('keine zukünftigen einstrahlungswerte'))
            return 'Open-Meteo hat keine nutzbare Prognosekurve geliefert. EOS versucht automatisch die stündliche GTI- und anschließend die Strahlungskomponenten-Abfrage.';
        if (message.includes('keine global-tilted-irradiance'))
            return 'Open-Meteo hat für mindestens eine PV-Fläche keine geneigte Einstrahlung geliefert. Der alternative Abruf wird automatisch versucht.';
        if (message.includes('open-meteo api error') || message.includes('fallback api error'))
            return 'Open-Meteo hat den Prognoseabruf abgelehnt. Abrufmodus und technischer Fehler stehen unten in der Statusanzeige.';
        if (message.includes('nicht verfügbar und kein appcenter') || message.includes('kein pv forecast gemappt'))
            return 'Open-Meteo liefert aktuell keine Prognose und im AppCenter ist keine Ersatzquelle zugeordnet.';
        if (message.includes('deaktiviert'))
            return 'Die PV-Prognose ist deaktiviert.';
        return raw;
    };
    const normalizeSourceMode = (value) => {
        const source = String(value || 'auto').trim().toLowerCase();
        if (['open-meteo', 'openmeteo', 'weather'].includes(source))
            return 'open-meteo';
        if (['datapoint', 'mapping', 'appcenter', 'app-center'].includes(source))
            return 'datapoint';
        if (['disabled', 'off', 'aus'].includes(source))
            return 'disabled';
        return 'auto';
    };
    const updateVisibility = () => {
        const sourceInput = byId('s_forecastSourceMode');
        const source = normalizeSourceMode(stateValue('settings.forecastSourceMode', sourceInput?.value || 'auto'));
        const fields = byId('nwOpenMeteoPvFields');
        // PV-Anlagendaten müssen auch vor dem Einschalten sichtbar und editierbar
        // sein. Die zentrale Settings-Runtime hydriert Checkboxen erst nach dem
        // DOMContentLoaded-Handler und sendet dabei kein change-Event. Deshalb wird
        // die Sichtbarkeit bei jedem Statuszyklus neu synchronisiert und hängt nur
        // von der ausgewählten Quelle ab.
        if (fields) {
            fields.classList.remove('hidden');
            fields.setAttribute('aria-hidden', 'false');
            fields.classList.toggle('is-not-used', !['auto', 'open-meteo'].includes(source));
        }
        const fallback = byId('s_forecastFallbackToDatapoints')?.closest('.row');
        if (fallback)
            fallback.classList.toggle('hidden', source !== 'auto');
    };
    const updateStatus = () => {
        updateVisibility();
        const mode = normalizeSourceMode(stateValue('settings.forecastSourceMode', byId('s_forecastSourceMode')?.value || 'auto'));
        const openEnabled = asBoolean(stateValue('settings.openMeteoPvEnabled', byId('s_openMeteoPvEnabled')?.checked || false), false);
        const providerSelected = openEnabled && ['auto', 'open-meteo'].includes(mode);
        const effectiveValid = asBoolean(stateValue('forecast.pv.valid', false), false);
        const openValid = asBoolean(stateValue('forecast.openMeteoPv.valid', false), false);
        const effectiveSourceRaw = String(stateValue('forecast.pv.source', '') || '').trim().toLowerCase();
        const effectiveUsesOpenMeteo = effectiveSourceRaw.includes('open-meteo');
        const providerRequestStatus = firstNonEmptyTextState(['forecast.openMeteoPv.requestStatus'], '');
        const providerRequestMode = firstNonEmptyTextState(['forecast.openMeteoPv.requestMode'], '');
        const providerError = firstNonEmptyTextState([
            'forecast.openMeteoPv.error',
            'forecast.openMeteoPv.statusText',
        ], '');
        const providerHasDiagnostics = [
            'forecast.openMeteoPv.lastAttemptAt',
            'forecast.openMeteoPv.requestStatus',
            'forecast.openMeteoPv.statusText',
            'forecast.openMeteoPv.error',
            'forecast.openMeteoPv.points',
            'forecast.openMeteoPv.locationText',
        ].some(hasState);
        // In Open-Meteo mode provider diagnostics must remain visible even when the
        // request failed. In automatic mode a valid AppCenter fallback may replace
        // the provider values, but the provider error is still shown as a warning.
        const useOpenSnapshot = providerSelected && providerHasDiagnostics
            && (mode === 'open-meteo' || effectiveUsesOpenMeteo || !effectiveValid);
        const valid = useOpenSnapshot ? openValid : (effectiveValid || openValid);
        const hasForecastStates = hasState('forecast.pv.valid') || hasState('forecast.openMeteoPv.valid') || providerHasDiagnostics;
        const source = useOpenSnapshot
            ? stateValue('forecast.openMeteoPv.source', 'open-meteo-gti')
            : firstNonEmptyTextState(['forecast.pv.source', 'forecast.openMeteoPv.source'], 'none');
        const ageMs = useOpenSnapshot
            ? firstFiniteStateValue(['forecast.openMeteoPv.ageMs'], Number.NaN)
            : firstFiniteStateValue(['forecast.pv.ageMs', 'forecast.openMeteoPv.ageMs'], Number.NaN);
        const updatedAt = useOpenSnapshot
            ? firstFiniteStateValue([
                openValid ? 'forecast.openMeteoPv.lastSuccessAt' : 'forecast.openMeteoPv.lastAttemptAt',
                'forecast.openMeteoPv.updatedAt',
            ], Number.NaN)
            : firstFiniteStateValue(['forecast.pv.updatedAt', 'forecast.openMeteoPv.lastSuccessAt', 'forecast.openMeteoPv.updatedAt'], Number.NaN);
        const statusText = useOpenSnapshot
            ? firstNonEmptyTextState(['forecast.openMeteoPv.error', 'forecast.openMeteoPv.statusText'], '')
            : firstNonEmptyTextState(['forecast.pv.statusText', 'forecast.pv.error', 'forecast.openMeteoPv.error', 'forecast.openMeteoPv.statusText'], '');
        const selectedPrefix = useOpenSnapshot ? 'forecast.openMeteoPv.' : 'forecast.pv.';
        const pointsRaw = stateValue(`${selectedPrefix}points`, undefined);
        const pointsKnown = pointsRaw !== undefined && Number.isFinite(Number(pointsRaw));
        const pointsValue = pointsKnown ? Math.max(0, Math.round(Number(pointsRaw))) : Number.NaN;
        const status = byId('nwForecastStatus');
        const sourceNode = byId('nwForecastSource');
        const updated = byId('nwForecastUpdated');
        const error = byId('nwForecastError');
        const attempt = byId('nwForecastAttempt');
        const requestModeNode = byId('nwForecastRequestMode');
        if (status) {
            let label = 'Keine aktuelle Prognose';
            let state = 'warning';
            if (mode === 'disabled') {
                label = 'Deaktiviert';
                state = 'off';
            }
            else if (valid && pointsKnown && pointsValue > 0) {
                label = providerRequestStatus === 'ok-zero-production'
                    ? 'Prognose aktiv · aktuell 0 W erwartet'
                    : 'Prognose aktiv';
                state = 'ok';
            }
            else if (providerSelected && providerRequestStatus === 'loading') {
                label = 'Open-Meteo wird abgefragt …';
                state = 'off';
            }
            else if (providerSelected && providerRequestStatus === 'configuration-error') {
                label = 'Konfiguration unvollständig';
                state = 'warning';
            }
            else if (providerSelected && providerRequestStatus === 'disabled') {
                label = 'Open-Meteo deaktiviert';
                state = 'off';
            }
            else if (providerSelected && ['error', 'stale-error'].includes(providerRequestStatus)) {
                label = providerRequestStatus === 'stale-error'
                    ? 'Letzte Prognose wird weiterverwendet'
                    : 'Open-Meteo-Abruf fehlgeschlagen';
                state = 'warning';
            }
            else if ((effectiveValid || openValid) && pointsKnown && pointsValue === 0) {
                label = 'Prognose noch ohne Kurve';
                state = 'warning';
            }
            else if (!hasForecastStates && Date.now() - startedAt < 12000) {
                label = 'Adapterdaten werden verbunden …';
                state = 'off';
            }
            else if (!hasForecastStates) {
                label = 'Keine Prognosedaten empfangen';
                state = 'warning';
            }
            status.textContent = label;
            status.dataset.state = state;
        }
        if (sourceNode) {
            const base = sourceLabel(source);
            sourceNode.textContent = providerSelected && useOpenSnapshot && !openValid && base === 'Open-Meteo'
                ? 'Open-Meteo (Fehler)'
                : base;
        }
        if (updated)
            updated.textContent = formatAge(ageMs, updatedAt);
        if (attempt)
            attempt.textContent = formatAge(Number.NaN, firstFiniteStateValue(['forecast.openMeteoPv.lastAttemptAt'], Number.NaN));
        if (requestModeNode) {
            const labels = {
                'starting': 'Startet',
                'minutely-gti': '15-Minuten GTI',
                'hourly-gti': 'Stündliche GTI',
                'hourly-components': 'GHI/DNI/DHI-Fallback',
                'mixed-fallback': 'Gemischter GTI-/Strahlungs-Fallback',
            };
            requestModeNode.textContent = labels[providerRequestMode] || providerRequestMode || '—';
        }
        const energyValue = (suffix) => {
            const preferred = stateValue(`${selectedPrefix}${suffix}`, undefined);
            if (preferred !== undefined)
                return preferred;
            return firstStateValue([`forecast.pv.${suffix}`, `forecast.openMeteoPv.${suffix}`], Number.NaN);
        };
        const e6 = byId('nwForecast6h');
        if (e6)
            e6.textContent = valid ? formatEnergyKwh(energyValue('kwhNext6h')) : '—';
        const e12 = byId('nwForecast12h');
        if (e12)
            e12.textContent = valid ? formatEnergyKwh(energyValue('kwhNext12h')) : '—';
        const e24 = byId('nwForecast24h');
        if (e24)
            e24.textContent = valid ? formatEnergyKwh(energyValue('kwhNext24h')) : '—';
        const points = byId('nwForecastPoints');
        if (points)
            points.textContent = pointsKnown ? String(pointsValue) : '—';
        const positivePoints = byId('nwForecastPositivePoints');
        if (positivePoints) {
            const positiveRaw = stateValue(`${selectedPrefix}positivePoints`, undefined);
            const positiveKnown = positiveRaw !== undefined && Number.isFinite(Number(positiveRaw));
            positivePoints.textContent = positiveKnown ? String(Math.max(0, Math.round(Number(positiveRaw)))) : '—';
        }
        const location = byId('nwForecastLocation');
        if (location) {
            const label = firstNonEmptyTextState(['forecast.openMeteoPv.locationText', 'forecast.pv.locationText', 'weatherLocation'], '');
            const locationSource = firstNonEmptyTextState(['forecast.openMeteoPv.locationSource', 'forecast.pv.locationSource'], '').toLowerCase();
            const lat = firstFiniteStateValue(['forecast.openMeteoPv.latitude', 'forecast.pv.latitude'], Number.NaN);
            const lon = firstFiniteStateValue(['forecast.openMeteoPv.longitude', 'forecast.pv.longitude'], Number.NaN);
            const coordinates = Number.isFinite(lat) && Number.isFinite(lon) && (Math.abs(lat) > 1e-9 || Math.abs(lon) > 1e-9)
                ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '';
            const adminFallback = locationSource.startsWith('system') ? 'EOS Admin / Systemstandort' : '';
            location.textContent = label || coordinates || adminFallback || 'Standort nicht aufgelöst';
        }
        let message = friendlyMessage(statusText);
        // Automatic mode may be using a valid AppCenter fallback while Open-Meteo
        // failed. Keep the system operational but explain the active fallback.
        if (valid && mode === 'auto' && !useOpenSnapshot && providerSelected
            && ['error', 'stale-error'].includes(providerRequestStatus) && providerError) {
            message = `AppCenter-Fallback aktiv. Open-Meteo: ${friendlyMessage(providerError)}`;
        }
        if (error) {
            const show = mode !== 'disabled' && !!message && (!valid || message.startsWith('AppCenter-Fallback aktiv'));
            error.textContent = show ? message : '';
            error.classList.toggle('hidden', !show);
        }
        hydrateEditor(false);
    };
    const setup = () => {
        const source = byId('s_forecastSourceMode');
        const enabled = byId('s_openMeteoPvEnabled');
        if (source && source.dataset.nwForecastBound !== '1') {
            source.dataset.nwForecastBound = '1';
            source.addEventListener('change', () => { markRefreshPending(); updateVisibility(); updateStatus(); });
        }
        if (enabled && enabled.dataset.nwForecastBound !== '1') {
            enabled.dataset.nwForecastBound = '1';
            enabled.addEventListener('change', () => { markRefreshPending(); updateVisibility(); updateStatus(); });
        }
        setupArrayEditor();
        updateVisibility();
        updateStatus();
        if (statusTimer === null) {
            statusTimer = window.setInterval(() => {
                // Settings werden asynchron aus /api/state hydriert. Sichtbarkeit,
                // Tabelleninhalt und Status deshalb gemeinsam nachziehen.
                updateVisibility();
                updateStatus();
            }, 3000);
        }
    };
    window.addEventListener('pagehide', () => {
        if (statusTimer !== null)
            window.clearInterval(statusTimer);
        statusTimer = null;
        try {
            editorResizeObserver?.disconnect();
        }
        catch { /* optional */ }
        editorResizeObserver = null;
    }, { once: true });
    try {
        window.nwForecastSettings = { setup, updateVisibility, updateStatus, hydrateEditor };
    }
    catch { /* optional */ }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', setup, { once: true });
    else
        setup();
})();
