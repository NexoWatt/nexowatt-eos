/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/energy-origin-ledger-view.ts
 * Quell-Hash: sha256:4476a78b30f8c2a1d4280d8c2b5892ca50fd72a90c2cf53df5055e2ef7cf9942
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/energy-origin-ledger-view.js.
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
 * Aufgabe: Stellt die Herkunftsbilanz und ihre Ledger-Einträge im Browser dar.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/energy-origin-ledger-view.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/energy-origin-ledger-view.js
 *
 * Read-only Betreiberansicht für „Energieherkunft & Ladebilanz“. Die Seite
 * rechnet keine Herkunft neu, sondern visualisiert exakt die vom EMS-Modul
 * publizierten 15-Minuten-Journale und Exporte.
 */
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    let activePeriod = 'recent';
    const locale = () => {
        const lang = document.documentElement.lang || navigator.language || 'de';
        return String(lang).toLowerCase().startsWith('nl') ? 'nl-NL' : 'de-DE';
    };
    const fmtKwh = (v, digits = 3) => Number.isFinite(Number(v)) ? `${Number(v).toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })} kWh` : '--';
    const fmtPct = (v) => Number.isFinite(Number(v)) ? `${Number(v).toLocaleString(locale(), { maximumFractionDigits: 1 })} %` : '--';
    const fmtTs = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0)
            return '--';
        try {
            return new Date(n).toLocaleString(locale());
        }
        catch (_e) {
            return String(n);
        }
    };
    function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function setText(id, value) { const el = $(id); if (el)
        el.textContent = value; }
    function redirectToLive() {
        try {
            window.location.replace('/');
        }
        catch (_e) {
            window.location.href = '/';
        }
    }
    async function ensureFeatureAccess() {
        try {
            const res = await fetch(`/config?t=${Date.now()}`, { cache: 'no-store' });
            const cfg = await res.json();
            const allowed = !!(res.ok && cfg && cfg.featureVisibility && cfg.featureVisibility.hasEnergyLedger === true);
            if (!allowed) {
                redirectToLive();
                return false;
            }
            if (document.body)
                document.body.classList.add('nw-feature-authorized');
            return true;
        }
        catch (_e) {
            // Bei unbekanntem App-Zustand niemals die optionale Betreiberseite zeigen.
            redirectToLive();
            return false;
        }
    }
    function get(obj, path, fallback = 0) {
        let cur = obj;
        for (const key of path)
            cur = cur && typeof cur === 'object' ? cur[key] : undefined;
        return cur === undefined || cur === null ? fallback : cur;
    }
    function unknownFor(row) {
        const total = Number(get(row, ['evcs', 'totalKwh'], 0));
        const s = get(row, ['evcs', 'sourceBreakdown'], {});
        const known = ['pvDirectKwh', 'otherRenewableDirectKwh', 'storedPvKwh', 'storedOtherRenewableKwh', 'gridDirectKwh', 'storedGridKwh'].reduce((a, k) => a + Number(s[k] || 0), 0);
        return Math.max(0, total - known);
    }
    function renderMeterStatus(payload) {
        const rows = payload && payload.meterStatus && Array.isArray(payload.meterStatus.rows) ? payload.meterStatus.rows : [];
        if (!rows.length) {
            setText('meterStatus', 'Keine Zähler zugeordnet.');
            return;
        }
        const valid = rows.filter((r) => r.valid && r.fresh).length;
        const html = `<div class="kv"><span>Frisch/gültig</span><span>${valid} / ${rows.length}</span><span>Stale-Grenze</span><span>${esc(payload.meterStatus.staleSeconds || '--')} s</span></div>` +
            rows.map((r) => `<span class="tag ${r.valid && r.fresh ? 'ok' : 'warn'}" title="${esc(r.dpId)}">${esc(r.role)}: ${r.valid && r.fresh ? 'OK' : (r.valid ? 'veraltet' : 'ungültig')}</span>`).join('');
        const el = $('meterStatus');
        if (el)
            el.innerHTML = html;
    }
    function renderInventory(payload) {
        const i = payload && payload.storageInventory ? payload.storageInventory : {};
        const html = `<div class="kv"><span>Gesamt</span><span>${fmtKwh(i.totalKwh || 0)}</span><span>PV</span><span>${fmtKwh(i.pvKwh || 0)}</span><span>Weitere EE</span><span>${fmtKwh(i.otherRenewableKwh || 0)}</span><span>Netz</span><span>${fmtKwh(i.gridKwh || 0)}</span><span>Unbekannt</span><span>${fmtKwh(i.unknownKwh || 0)}</span></div>`;
        const el = $('storageInventory');
        if (el)
            el.innerHTML = html;
    }
    function renderLast(payload) {
        const row = payload && payload.lastInterval ? payload.lastInterval : {};
        if (!row || !row.startTs) {
            setText('lastInterval', 'Noch kein Intervall abgeschlossen.');
            return;
        }
        const html = `<div class="kv"><span>Zeitraum</span><span>${fmtTs(row.startTs)} – ${fmtTs(row.endTs)}</span><span>Qualität</span><span>${esc(get(row, ['quality', 'status'], '--'))}</span><span>Bilanzabweichung</span><span>${fmtKwh(get(row, ['balance', 'imbalanceKwh'], 0))}</span><span>Config-Hash</span><span class="code">${esc(row.configHash || '')}</span><span>Journal-Hash</span><span class="code">${esc(row.hash || '')}</span></div>`;
        const el = $('lastInterval');
        if (el)
            el.innerHTML = html;
    }
    function renderEvidence(payload) {
        const row = payload && payload.lastInterval ? payload.lastInterval : {};
        const de = get(row, ['evidence', 'de'], {});
        const nl = get(row, ['evidence', 'nl'], {});
        const reason = (x) => Array.isArray(x.reasonCodes) && x.reasonCodes.length ? x.reasonCodes.join(', ') : 'keine offenen technischen Gründe';
        const html = `<div class="kv"><span>Deutschland</span><span class="${de.ready ? 'ok' : 'warn'}">${de.ready ? 'Nachweiskandidat bereit' : 'nicht bereit'} · ${fmtKwh(de.eligibleRenewableKwh || 0)}</span><span>DE Gründe</span><span>${esc(reason(de))}</span><span>Nederland</span><span class="${nl.ready ? 'ok' : 'warn'}">${nl.ready ? 'ERE-kandidaat gereed' : 'niet gereed'} · ${fmtKwh(nl.eligibleRenewableKwh || 0)}</span><span>NL Gründe</span><span>${esc(reason(nl))}</span></div>`;
        const el = $('evidenceStatus');
        if (el)
            el.innerHTML = html;
    }
    function renderRows(rows) {
        const body = $('ledgerRows');
        if (!body)
            return;
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
            body.innerHTML = '<tr><td colspan="13" class="muted">Noch keine abgeschlossenen Intervalle.</td></tr>';
            return;
        }
        body.innerHTML = list.slice(0, 2000).map((row) => {
            const s = get(row, ['evcs', 'sourceBreakdown'], {});
            const quality = get(row, ['quality', 'status'], '--');
            return `<tr><td>${fmtTs(row.startTs)}<br><span class="muted">bis ${fmtTs(row.endTs)}</span></td><td class="${quality === 'complete' ? 'ok' : 'warn'}">${esc(quality)}</td><td>${fmtKwh(get(row, ['evcs', 'totalKwh'], 0))}</td><td>${fmtKwh(s.pvDirectKwh || 0)}</td><td>${fmtKwh(s.otherRenewableDirectKwh || 0)}</td><td>${fmtKwh(s.storedPvKwh || 0)}</td><td>${fmtKwh(s.storedOtherRenewableKwh || 0)}</td><td>${fmtKwh(s.gridDirectKwh || 0)}</td><td>${fmtKwh(s.storedGridKwh || 0)}</td><td>${fmtKwh(unknownFor(row))}</td><td>${get(row, ['evidence', 'de', 'ready'], false) ? '✓' : '–'}</td><td>${get(row, ['evidence', 'nl', 'ready'], false) ? '✓' : '–'}</td><td class="code">${esc(String(row.hash || '').slice(0, 16))}…</td></tr>`;
        }).join('');
    }
    function render(payload) {
        const s = payload.summary || {};
        const renewable = Number(s.operationalRenewableKwh || 0);
        const total = Number(s.evcsTotalKwh || 0);
        const share = total > 0 ? renewable / total * 100 : 0;
        setText('ledgerStatus', `${payload.status || 'init'} · ${payload.edition || 'none'} · ${s.intervalCount || 0} Intervalle`);
        setText('evcsTotal', fmtKwh(total));
        setText('renewableTotal', `${fmtKwh(renewable)} · ${fmtPct(share)}`);
        setText('gridTotal', fmtKwh(Number(s.gridDirectKwh || 0) + Number(s.storedGridKwh || 0)));
        setText('unknownTotal', fmtKwh(s.unknownKwh || 0));
        setText('pvDirect', fmtKwh(s.pvDirectKwh || 0));
        setText('storedPv', fmtKwh(s.storedPvKwh || 0));
        setText('deCandidate', fmtKwh(s.deCandidateRenewableKwh || 0));
        setText('nlCandidate', fmtKwh(s.nlCandidateRenewableKwh || 0));
        const bar = $('renewableBar');
        if (bar)
            bar.style.width = `${Math.max(0, Math.min(100, share))}%`;
        setText('legalNote', payload.legalNote || 'Nachweiskandidat; keine automatische behördliche Anerkennung oder Vergütungszusage.');
        renderMeterStatus(payload);
        renderInventory(payload);
        renderLast(payload);
        renderEvidence(payload);
        renderRows(payload.intervals);
        const json = $('jsonExport');
        if (json)
            json.href = `/api/ledger/energy-origin.json?period=${encodeURIComponent(activePeriod)}`;
        const csv = $('csvExport');
        if (csv)
            csv.href = `/api/ledger/energy-origin.csv?period=${encodeURIComponent(activePeriod)}`;
    }
    async function load() {
        setText('ledgerStatus', 'lade…');
        try {
            const res = await fetch(`/api/ledger/energy-origin?period=${encodeURIComponent(activePeriod)}&t=${Date.now()}`, { cache: 'no-store' });
            const payload = await res.json();
            if (!res.ok || !payload.ok) {
                if (payload && (payload.error === 'app_not_active' || payload.error === 'license_required')) {
                    redirectToLive();
                    return;
                }
                throw new Error((payload && payload.message) || 'Bilanz-API nicht verfügbar');
            }
            render(payload);
        }
        catch (e) {
            setText('ledgerStatus', 'Fehler');
            const body = $('ledgerRows');
            const message = e instanceof Error ? e.message : String(e);
            if (body)
                body.innerHTML = `<tr><td colspan="13" class="error">${esc(message)}</td></tr>`;
        }
    }
    document.addEventListener('DOMContentLoaded', async () => {
        if (!(await ensureFeatureAccess()))
            return;
        const btn = $('refreshLedger');
        if (btn)
            btn.addEventListener('click', load);
        document.querySelectorAll('[data-period]').forEach((button) => button.addEventListener('click', () => {
            activePeriod = String(button.getAttribute('data-period') || 'recent');
            document.querySelectorAll('[data-period]').forEach((b) => b.classList.toggle('active', b === button));
            load();
        }));
        load();
        window.setInterval(load, 30000);
    });
})();
