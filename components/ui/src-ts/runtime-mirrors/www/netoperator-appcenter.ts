// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/netoperator-appcenter.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/netoperator-appcenter.js
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
 * Original-Hash: d3b481d6de94595f2707394d011cb830fcf7cbfe26ffde76a80f1a3f766f1b44
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
 * Quelle: src-ts/runtime-executables/www/netoperator-appcenter.ts
 * Quell-Hash: sha256:fb7dd5be59079b40418d91aa7dc41d5274c4431eca3570fed80bb45ff9324eca
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/netoperator-appcenter.js.
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
 * Aufgabe: Bindet die Netzbetreiber-Schnittstelle und ihre Einrichtung an das App-Center an.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/netoperator-appcenter.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * NexoWatt EOS Netzbetreiber-Schnittstelle – AppCenter-Konfiguration.
 *
 * Diese Browserkomponente sammelt ausschließlich Treiber-/Transportparameter.
 * Sie führt weder Modbus-Zugriffe noch Hardware-Schreibbefehle im Browser aus.
 */
(function () {
    'use strict';
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
    let setStatus = () => { };
/**
 * Code-Teil: getEdition
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    let getEdition = () => 'none';
    let driverRows = [];
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
 * Code-Teil: esc
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const esc = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/**
 * Code-Teil: value
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const value = (id, fallback = '') => {
        const node = byId(id);
        return node ? String(node.value == null ? '' : node.value).trim() : fallback;
    };
/**
 * Code-Teil: checked
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const checked = (id) => !!(byId(id)?.checked);
/**
 * Code-Teil: num
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const num = (id, fallback, min, max) => {
        const parsed = Number(value(id));
        return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
    };
/**
 * Code-Teil: loadDrivers
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    async function loadDrivers() {
        try {
            const response = await fetch('/api/netoperator/drivers', { credentials: 'same-origin', cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.ok)
                throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
            driverRows = Array.isArray(payload.drivers) ? payload.drivers : [];
            return driverRows;
        }
        catch (error) {
            driverRows = [];
            setStatus(`Netzbetreiber-Treiber konnten nicht geladen werden: ${error?.message || error}`, 'warn');
            return [];
        }
    }
/**
 * Code-Teil: driverOptions
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function driverOptions(selected) {
        const rows = driverRows.slice();
        if (!rows.some((row) => String(row.id || '') === selected) && selected) {
            rows.unshift({ id: selected, label: selected, status: 'unbekannt', ready: false });
        }
        const options = rows.map((row) => {
            const id = String(row.id || '');
            const label = String(row.label || `${row.manufacturer || ''} ${row.model || ''}` || id);
            const state = row.ready ? 'bereit' : 'Register fehlen';
            return `<option value="${esc(id)}"${id === selected ? ' selected' : ''}>${esc(label)} · ${esc(state)}</option>`;
        });
        if (!options.length)
            options.push('<option value="">Keine Treiberprofile verfügbar</option>');
        return options.join('');
    }
/**
 * Code-Teil: defaultConfig
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function defaultConfig() {
        return {
            enabled: false,
            mode: 'diagnostic',
            profileSource: 'builtin',
            driverId: 'generic-modbus-tcp-template',
            customProfileJson: '',
            commissioned: false,
            installerApproved: false,
            writebackEnabled: false,
            signalMaxAgeSec: 5,
            lastValidHoldSec: 60,
            auditLimit: 500,
            failSafePolicy: 'project-specific',
            transport: { type: 'modbus-tcp', host: '', port: 502, unitId: 1, timeoutMs: 2000, pollIntervalMs: 1000 },
        };
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
    async function render(mount, config = {}, appEnabled = false) {
        if (!mount)
            return;
        const cfg = { ...defaultConfig(), ...(config || {}) };
        cfg.transport = { ...defaultConfig().transport, ...(config?.transport || {}) };
        const eos = String(getEdition() || '').toLowerCase() === 'eos';
        // 1.0.3: Das Treiberverzeichnis ist Pro-only. Bei Home darf diese Komponente
        // auch dann keinen API-Aufruf starten, wenn ein alter Pro-Konfigurationsstand
        // `installed=true` enthält. So entsteht weder ein erwartbarer 403 noch ein
        // irreführender Auth-Dialog im bereits autorisierten App-Center.
        if (!eos) {
            mount.innerHTML = `
        <div class="nw-card">
          <div class="nw-card__title">Netzbetreiber-Schnittstelle</div>
          <div class="nw-card__subtitle">Diese Funktion ist in NexoWatt EOS Pro verfügbar. Die lokale Netzlimit- und Einspeisebegrenzung der Home-Version bleibt davon unabhängig aktiv.</div>
        </div>`;
            return;
        }
        if (!driverRows.length)
            await loadDrivers();
        mount.innerHTML = `
      <div class="nw-card">
        <div class="nw-card__title">Netzbetreiber-Schnittstelle</div>
        <div class="nw-card__subtitle">Anbindung eines zertifizierten EZA-/Parkreglers. Bei aktivem, in Betrieb genommenem und freigegebenem Modul hat dessen gültige Einspeisevorgabe Vorrang. EOS übernimmt die Grenze in den vorhandenen Export Guard; es entsteht kein zweiter Asset-Writer.</div>
        <div class="nw-config-grid" style="margin-top:16px">
          <label class="nw-field nw-field--switch"><span>Modul aktiv</span><input id="netopEnabled" type="checkbox" ${appEnabled && cfg.enabled !== false ? 'checked' : ''}></label>
          <label class="nw-field"><span>Betriebsmodus</span><select id="netopMode"><option value="diagnostic"${cfg.mode === 'diagnostic' ? ' selected' : ''}>Diagnose / read-only</option><option value="commissioning"${cfg.mode === 'commissioning' ? ' selected' : ''}>Inbetriebnahme / read-only</option><option value="active"${cfg.mode === 'active' ? ' selected' : ''}>Aktiv – zertifizierter Regler führt die Einspeisegrenze</option><option value="off"${cfg.mode === 'off' ? ' selected' : ''}>Aus</option></select></label>
          <label class="nw-field"><span>Profilquelle</span><select id="netopProfileSource"><option value="builtin"${cfg.profileSource !== 'custom' ? ' selected' : ''}>Integriertes Herstellerprofil</option><option value="custom"${cfg.profileSource === 'custom' ? ' selected' : ''}>Eigenes JSON-Profil</option></select></label>
          <label class="nw-field"><span>Hersteller / Treiber</span><select id="netopDriverId">${driverOptions(String(cfg.driverId || 'generic-modbus-tcp-template'))}</select></label>
          <label class="nw-field"><span>Transport</span><select id="netopTransportType"><option value="modbus-tcp"${cfg.transport.type !== 'state-map' ? ' selected' : ''}>Modbus TCP</option><option value="state-map"${cfg.transport.type === 'state-map' ? ' selected' : ''}>EOS-Datenpunkt-Mapping</option></select></label>
          <label class="nw-field"><span>Host / IP</span><input id="netopHost" type="text" value="${esc(cfg.transport.host || '')}" placeholder="192.168.1.100"></label>
          <label class="nw-field"><span>Port</span><input id="netopPort" type="number" min="1" max="65535" value="${esc(cfg.transport.port ?? 502)}"></label>
          <label class="nw-field"><span>Unit-ID</span><input id="netopUnitId" type="number" min="0" max="255" value="${esc(cfg.transport.unitId ?? 1)}"></label>
          <label class="nw-field"><span>Kommunikations-Timeout</span><input id="netopTimeoutMs" type="number" min="250" max="30000" step="250" value="${esc(cfg.transport.timeoutMs ?? 2000)}"><small>ms</small></label>
          <label class="nw-field"><span>Abfrageintervall</span><input id="netopPollIntervalMs" type="number" min="250" max="60000" step="250" value="${esc(cfg.transport.pollIntervalMs ?? 1000)}"><small>ms</small></label>
          <label class="nw-field"><span>Maximales Signalalter</span><input id="netopSignalMaxAgeSec" type="number" min="1" max="3600" value="${esc(cfg.signalMaxAgeSec ?? 5)}"><small>s · danach Fail-Safe</small></label>
          <label class="nw-field"><span>Letzten gültigen Wert halten</span><input id="netopLastValidHoldSec" type="number" min="0" max="3600" value="${esc(cfg.lastValidHoldSec ?? 60)}"><small>s · nur bei Fail-Safe „letzter Wert“</small></label>
          <label class="nw-field"><span>Audit-Einträge</span><input id="netopAuditLimit" type="number" min="20" max="2000" value="${esc(cfg.auditLimit ?? 500)}"></label>
          <label class="nw-field"><span>Fail-Safe-Vertrag</span><select id="netopFailSafePolicy"><option value="project-specific"${cfg.failSafePolicy === 'project-specific' ? ' selected' : ''}>Rückfallgrenze aus Netzlimits</option><option value="last-valid"${cfg.failSafePolicy === 'last-valid' ? ' selected' : ''}>Letzten gültigen Wert zeitbegrenzt halten</option><option value="release"${cfg.failSafePolicy === 'release' ? ' selected' : ''}>Auf lokale EOS-Sicherheitsobergrenze zurückfallen</option><option value="block"${cfg.failSafePolicy === 'block' ? ' selected' : ''}>Harte 0-W-Einspeisegrenze</option></select></label>
          <label class="nw-field nw-field--switch"><span>Inbetriebnahme dokumentiert</span><input id="netopCommissioned" type="checkbox" ${cfg.commissioned === true ? 'checked' : ''}></label>
          <label class="nw-field nw-field--switch"><span>Installerfreigabe</span><input id="netopInstallerApproved" type="checkbox" ${cfg.installerApproved === true ? 'checked' : ''}></label>
        </div>
        <div id="netopCustomProfileWrap" style="margin-top:16px;${cfg.profileSource === 'custom' ? '' : 'display:none'}">
          <label class="nw-field"><span>Eigenes Treiberprofil (JSON)</span><textarea id="netopCustomProfileJson" rows="16" spellcheck="false" style="width:100%;font-family:ui-monospace,monospace">${esc(cfg.customProfileJson || '')}</textarea></label>
        </div>
        <div class="nw-config-card nw-config-card--subtle" style="margin-top:16px">
          <div class="nw-config-card__title">Sicherheits- und Führungslogik</div>
          <div class="nw-config-card__subtitle">Die Regler-Schnittstelle ist read-only und schreibt niemals direkt auf Wechselrichter, Speicher oder Ladepunkte. Im Aktivmodus wird ausschließlich die validierte Einspeisegrenze an die Netzlimit-App übergeben; der vorhandene Export Guard bleibt alleiniger Asset-Writer. Ohne Aktivmodus, Inbetriebnahme und Installerfreigabe regelt EOS lokal. Modbus RTU, OPC UA, IEC 60870-5-104 und IEC 61850 bleiben vorbereitete Treiberslots.</div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <button id="netopReloadDrivers" class="nw-btn" type="button">Treiber neu laden</button>
          <button id="netopTestConnection" class="nw-btn nw-btn--primary" type="button">Treiber / Verbindung prüfen</button>
          <a class="nw-btn" href="/netoperator" target="_blank" rel="noopener">Betreiberansicht öffnen</a>
        </div>
        <pre id="netopTestResult" class="nw-config-card nw-config-card--subtle" style="display:none;white-space:pre-wrap;margin-top:14px"></pre>
        ${eos ? '' : '<div class="nw-notice nw-notice--warn" style="margin-top:14px">Diese App ist ausschließlich in EOS Pro verfügbar.</div>'}
      </div>`;
        const source = byId('netopProfileSource');
        if (source)
            source.addEventListener('change', () => {
                const wrap = document.getElementById('netopCustomProfileWrap');
                if (wrap)
                    wrap.style.display = value('netopProfileSource') === 'custom' ? '' : 'none';
            });
        const reload = byId('netopReloadDrivers');
        if (reload)
            reload.addEventListener('click', async () => {
                const selected = value('netopDriverId');
                await loadDrivers();
                const select = byId('netopDriverId');
                if (select)
                    select.innerHTML = driverOptions(selected);
                setStatus(`${driverRows.length} Netzbetreiber-Treiberprofile geladen.`, 'ok');
            });
        const test = byId('netopTestConnection');
        if (test)
            test.addEventListener('click', async () => {
                const resultNode = document.getElementById('netopTestResult');
                if (resultNode) {
                    resultNode.style.display = '';
                    resultNode.textContent = 'Prüfung läuft …';
                }
                try {
                    const response = await fetch('/api/netoperator/test', {
                        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ config: collect(cfg, true, getEdition()) }),
                    });
                    const payload = await response.json().catch(() => ({}));
                    if (resultNode)
                        resultNode.textContent = JSON.stringify(payload, null, 2);
                    setStatus(response.ok && payload.ok ? 'Netzbetreiber-Treiberprüfung erfolgreich.' : `Prüfung nicht bestanden: ${payload.message || payload.error || response.status}`, response.ok && payload.ok ? 'ok' : 'warn');
                }
                catch (error) {
                    if (resultNode)
                        resultNode.textContent = String(error?.message || error);
                    setStatus(`Treiberprüfung fehlgeschlagen: ${error?.message || error}`, 'warn');
                }
            });
    }
/**
 * Code-Teil: apply
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    function apply(config = {}, edition) {
        const mount = document.getElementById('netOperatorConfigSlot');
        const app = config?.emsApps?.apps?.netOperator || {};
        getEdition = () => edition || 'none';
        render(mount, config?.netOperatorInterface || {}, !!(app.installed && app.enabled)).catch(() => undefined);
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
    function collect(existing = {}, appEnabled = false, edition) {
        const ed = String(edition || getEdition() || '').toLowerCase();
        const transportType = value('netopTransportType', existing?.transport?.type || 'modbus-tcp');
        return {
            ...defaultConfig(),
            ...(existing || {}),
            enabled: ed === 'eos' && appEnabled && checked('netopEnabled'),
            mode: ['off', 'diagnostic', 'commissioning', 'active'].includes(value('netopMode')) ? value('netopMode') : 'diagnostic',
            profileSource: value('netopProfileSource') === 'custom' ? 'custom' : 'builtin',
            driverId: value('netopDriverId', 'generic-modbus-tcp-template'),
            customProfileJson: value('netopCustomProfileJson'),
            commissioned: checked('netopCommissioned'),
            installerApproved: checked('netopInstallerApproved'),
            writebackEnabled: false,
            signalMaxAgeSec: Math.round(num('netopSignalMaxAgeSec', 5, 1, 3600)),
            lastValidHoldSec: Math.round(num('netopLastValidHoldSec', 60, 0, 3600)),
            auditLimit: Math.round(num('netopAuditLimit', 500, 20, 2000)),
            failSafePolicy: ['project-specific', 'last-valid', 'release', 'block'].includes(value('netopFailSafePolicy')) ? value('netopFailSafePolicy') : 'project-specific',
            transport: {
                type: transportType === 'state-map' ? 'state-map' : 'modbus-tcp',
                host: value('netopHost'),
                port: Math.round(num('netopPort', 502, 1, 65535)),
                unitId: Math.round(num('netopUnitId', 1, 0, 255)),
                timeoutMs: Math.round(num('netopTimeoutMs', 2000, 250, 30000)),
                pollIntervalMs: Math.round(num('netopPollIntervalMs', 1000, 250, 60000)),
            },
        };
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
    function setup(options = {}) {
        if (typeof options.setStatus === 'function')
            setStatus = options.setStatus;
        if (typeof options.getEdition === 'function')
            getEdition = options.getEdition;
    }
    window.NexoWattNetOperatorAppCenter = { setup, render, apply, collect, loadDrivers };
})();
