/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/netoperator.ts
 * Quell-Hash: sha256:9ccfed3064aeff23d68c25cc6aaff492c7bcf9188974f9b98ddfa3d145df4c89
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/netoperator.js.
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
 * Aufgabe: Stellt Bedien- und Diagnoseinformationen der Netzbetreiber-Schnittstelle im Browser dar.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/netoperator.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const text = (id, value) => { const node = $(id); if (node)
        node.textContent = value == null || value === '' ? '--' : String(value); };
    const fmt = (value, unit = '', digits = 2) => {
        const n = Number(value);
        return Number.isFinite(n) ? `${n.toLocaleString('de-DE', { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}` : '--';
    };
    const valueOf = (snapshot, key) => {
        const entry = snapshot?.values?.[key];
        return entry && entry.valid ? entry.value : null;
    };
    const esc = (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    function render(payload) {
        const snapshot = payload?.snapshot || null;
        const command = snapshot?.command || {};
        const envelope = payload?.envelope || {};
        const integration = String(payload?.operationEngineIntegration || envelope?.operationEngineIntegration || 'grid-export-limit-standby');
        const controllerSelected = payload?.externalExportLimitEligible === true || envelope?.externalExportLimitEligible === true;
        const operationalBinding = controllerSelected && envelope?.valid === true && envelope?.fresh === true && envelope?.commOk === true && command.binding === true;
        text('netopStatus', payload?.enabled ? (integration === 'grid-export-limit-active' ? (operationalBinding ? 'Regler führt' : 'Aktiv / Rückfalllogik') : (snapshot?.valid ? 'Diagnose bereit' : (snapshot?.fresh ? 'unvollständig' : 'stale / nicht bereit'))) : 'deaktiviert');
        text('netopMode', payload?.mode || 'off');
        text('netopDriver', snapshot ? `${snapshot.driverId || '--'} · Mapping ${snapshot.mappingVersion || '--'}` : '--');
        text('netopSource', envelope?.source || snapshot?.source || '--');
        text('netopComm', snapshot?.commOk ? 'OK' : 'gestört');
        const lastReceivedAt = Number(payload?.lastReceivedAt || snapshot?.receivedAt || 0);
        const lastValidAt = Number(payload?.lastValidAt || 0);
        text('netopLastTelegram', lastReceivedAt > 0 ? new Date(lastReceivedAt).toLocaleString('de-DE') : '--');
        text('netopLastValidTelegram', lastValidAt > 0 ? new Date(lastValidAt).toLocaleString('de-DE') : '--');
        text('netopCommand', `${command.action || 'monitor'} · Priorität ${command.priority ?? '--'}`);
        text('netopBinding', operationalBinding ? 'operativ bindend' : (command.binding ? 'nur gelesen / nicht freigegeben' : 'nicht bindend'));
        text('netopEnable', valueOf(snapshot, 'grid.command.enable') === true ? 'aktiv' : valueOf(snapshot, 'grid.command.enable') === false ? 'aus' : '--');
        text('netopRelease', valueOf(snapshot, 'grid.command.release') === true ? 'freigegeben' : valueOf(snapshot, 'grid.command.release') === false ? 'gesperrt' : '--');
        text('netopTrip', valueOf(snapshot, 'grid.command.trip') === true ? 'TRIP AKTIV' : valueOf(snapshot, 'grid.command.trip') === false ? 'kein Trip' : '--');
        text('netopPLimit', fmt(valueOf(snapshot, 'grid.p.limit_kw'), 'kW'));
        text('netopPTarget', fmt(valueOf(snapshot, 'grid.p.target_kw'), 'kW'));
        text('netopPTargetPct', fmt(valueOf(snapshot, 'grid.p.target_pct'), '%'));
        text('netopQTarget', fmt(valueOf(snapshot, 'grid.q.target_kvar'), 'kvar'));
        text('netopCosPhi', fmt(valueOf(snapshot, 'grid.cosphi.target'), '', 3));
        text('netopPActual', fmt(valueOf(snapshot, 'pcc.p.actual_kw'), 'kW'));
        text('netopQActual', fmt(valueOf(snapshot, 'pcc.q.actual_kvar'), 'kvar'));
        text('netopUActual', fmt(valueOf(snapshot, 'pcc.u.actual_v'), 'V', 1));
        text('netopControllerStatus', valueOf(snapshot, 'controller.status'));
        text('netopFault', valueOf(snapshot, 'controller.fault_code'));
        text('netopControlSource', integration === 'grid-export-limit-active' ? (operationalBinding ? 'EZA-/Parkregler → EOS Export Guard' : 'EOS-Fail-Safe / lokale Grenze') : 'EOS Netzlimits lokal');
        text('netopAllowedExport', Number.isFinite(Number(envelope?.allowedExportPowerW)) ? fmt(Number(envelope.allowedExportPowerW) / 1000, 'kW') : '--');
        text('netopValidUntil', Number(envelope?.validUntil || 0) > 0 ? new Date(Number(envelope.validUntil)).toLocaleString('de-DE') : '--');
        text('netopFailSafe', envelope?.failSafePolicy || '--');
        const banner = $('netopBindingBanner');
        if (banner) {
            banner.className = `netop-banner ${operationalBinding || controllerSelected ? 'netop-banner--binding' : 'netop-banner--normal'}`;
            const allowedText = Number.isFinite(Number(envelope?.allowedExportPowerW))
                ? ` Erlaubte Einspeisung: ${fmt(Number(envelope.allowedExportPowerW) / 1000, 'kW')}.`
                : '';
            banner.textContent = operationalBinding
                ? `Zertifizierter EZA-/Parkregler ist die führende Einspeisegrenzquelle.${allowedText} EOS setzt die Vorgabe ausschließlich über den bestehenden Export Guard um.`
                : controllerSelected
                    ? `Der zertifizierte Regler ist aktiviert, liefert aktuell aber keine gültige bindende P-Vorgabe (${envelope?.quality || 'unbekannt'}). Die in Netzlimits konfigurierte Fail-Safe-Strategie ist maßgeblich.`
                    : 'Der zertifizierte Regler ist nicht operativ freigegeben. EOS regelt die Einspeisegrenze lokal über die Netzlimit-App.';
        }
        const body = $('netopAuditRows');
        const events = Array.isArray(payload?.audit) ? payload.audit.slice().reverse() : [];
        if (body)
            body.innerHTML = events.length ? events.map((event) => `<tr><td>${esc(new Date(event.timestamp || 0).toLocaleString('de-DE'))}</td><td>${esc(event.source || '')}</td><td>${esc(event.current?.action || '')}</td><td>${esc(event.current?.reason || '')}</td><td>${esc(event.result || '')}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Noch keine Sollwertänderung protokolliert.</td></tr>';
    }
    async function load() {
        try {
            const response = await fetch('/api/netoperator/status', { credentials: 'same-origin', cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
                throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
            render(payload);
        }
        catch (error) {
            text('netopStatus', `Fehler: ${error?.message || error}`);
        }
    }
    async function raw() {
        const box = $('netopRaw');
        try {
            const response = await fetch('/api/netoperator/raw', { credentials: 'same-origin', cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok)
                throw new Error(payload.message || payload.error || `HTTP ${response.status}`);
            if (box) {
                box.style.display = '';
                box.textContent = JSON.stringify(payload, null, 2);
            }
        }
        catch (error) {
            if (box) {
                box.style.display = '';
                box.textContent = `Installer-/Admin-Zugriff erforderlich oder Fehler: ${error?.message || error}`;
            }
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        $('netopRefresh')?.addEventListener('click', () => load());
        $('netopRawBtn')?.addEventListener('click', () => raw());
        load();
        window.setInterval(load, 2000);
    });
})();
