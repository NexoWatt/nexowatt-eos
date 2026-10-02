/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/mesh-microgrid.ts
 * Quell-Hash: sha256:498951a2b3f59c12f5282b8295e5d2ae752b47ea7bcc95f38a8f8ec9de1f8f62
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/mesh-microgrid.js.
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
 * Aufgabe: Zeigt die Kopplungs- und Austauschinformationen der Mesh-/Microgrid-Funktion im Browser.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/mesh-microgrid.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/mesh-microgrid.js
 *
 * Zweck:
 * EOS-Betreiberansicht für die separate Mesh/Microgrid-App. Die Seite liest nur
 * die Snapshot-API `/api/mesh/microgrid` und zeigt Cluster-/Knotenwerte. Sie
 * erzeugt keine eigene Mesh-Logik, schreibt keine Konfiguration und schaltet keine
 * Hardware. Installer-Einstellungen bleiben im App-Center.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fmtW = (v) => Number.isFinite(Number(v)) ? (Math.abs(Number(v)) >= 1000 ? (Number(v) / 1000).toFixed(2) + ' kW' : Math.round(Number(v)) + ' W') : '--';
  const fmtPct = (v) => Number.isFinite(Number(v)) ? Math.round(Number(v)) + ' %' : '--';
  function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'surplus') return 'status-surplus';
    if (s === 'demand') return 'status-demand';
    if (s === 'disabled') return 'status-disabled';
    return 'status-balanced';
  }
  function renderNodes(nodes) {
    const body = $('meshRows');
    if (!body) return;
    const list = Array.isArray(nodes) ? nodes : [];
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="12" class="muted">Noch keine Mesh-/Microgrid-Knoten mit Messwerten vorhanden.</td></tr>';
      return;
    }
    body.innerHTML = list.map((n) => {
      const intent = n.intent || {};
      const intentText = `${intent.status || n.status || 'balanced'} · ${fmtW(intent.availablePowerW || 0)} verfügbar · ${fmtW(intent.neededPowerW || 0)} Bedarf`;
      return `<tr>` +
        `<td>${esc(n.name || n.id || '')}<br><span class="muted">${esc(n.id || '')}</span></td>` +
        `<td>${esc(n.type || '')}</td>` +
        `<td>${esc(n.role || '')}</td>` +
        `<td class="${statusClass(n.status)}">${esc(n.status || '')}</td>` +
        `<td>${esc(n.priority || '')}</td>` +
        `<td>${n.powerW === null || n.powerW === undefined ? '--' : fmtW(n.powerW)}</td>` +
        `<td>${fmtW(n.generationW || 0)}</td>` +
        `<td>${fmtW(n.loadW || 0)}</td>` +
        `<td>${fmtW(n.surplusW || 0)}</td>` +
        `<td>${fmtW(n.demandW || 0)}</td>` +
        `<td>${n.socPercent === null || n.socPercent === undefined ? '--' : fmtPct(n.socPercent)}</td>` +
        `<td>${esc(intentText)}</td>` +
      `</tr>`;
    }).join('');
  }

  function severityClass(severity) {
    const s = String(severity || '').toLowerCase();
    if (s === 'critical') return 'severity-critical';
    if (s === 'warn') return 'severity-warn';
    return 'severity-info';
  }
  function renderPlanning(payload) {
    const planning = payload && payload.planning ? payload.planning : {};
    const actions = Array.isArray(planning.actions) ? planning.actions : [];
    const grid = planning.gridLimit || {};
    setText('meshReadiness', planning.readinessScorePercent == null ? '--' : fmtPct(planning.readinessScorePercent));
    setText('meshGridLimitDiag', grid.message || 'Keine Netzlimit-Diagnose vorhanden.');
    setText('meshPlanSummary', actions.length
      ? `${actions.length} geplante Diagnose-Entscheidung(en), davon ${planning.criticalActionCount || 0} kritisch. Read-only: keine Hardware-Schreibbefehle.`
      : 'Keine geplanten Aktionen. Read-only: keine Hardware-Schreibbefehle.');

    const rows = $('meshPlanRows');
    if (rows) {
      if (!actions.length) {
        rows.innerHTML = '<tr><td colspan="9" class="muted">Keine geplanten Entscheidungen vorhanden.</td></tr>';
      } else {
        rows.innerHTML = actions.map(a => `<tr>` +
          `<td>${esc(a.rank || '')}</td>` +
          `<td class="${severityClass(a.severity)}">${esc(a.category || '')}</td>` +
          `<td>${esc(a.trigger || '')}</td>` +
          `<td>${esc(a.nodeName || a.nodeId || '')}<br><span class="muted">${esc(a.nodeId || '')}</span></td>` +
          `<td>${esc(a.targetNodeName || a.targetNodeId || '--')}</td>` +
          `<td>${esc(a.priority || '')}</td>` +
          `<td>${fmtW(a.plannedPowerW || 0)}</td>` +
          `<td>${esc(a.direction || '')}</td>` +
          `<td>${esc(a.reason || '')}<br><span class="muted">read-only · kein Hardware-Write</span></td>` +
        `</tr>`).join('');
      }
    }
    const order = Array.isArray(planning.priorityOrder) ? planning.priorityOrder : [];
    setText('meshPriorityOrder', order.length
      ? order.map(o => `${o.rank}. ${o.name || o.id} (${o.type}/${o.role}, Priorität ${o.priority})`).join(' · ')
      : 'Keine Prioritätsreihenfolge vorhanden.');
  }


  function renderTargetGroups(payload) {
    const tg = payload && payload.targetGroups ? payload.targetGroups : {};
    const groups = Array.isArray(tg.groups) ? tg.groups : [];
    const fairness = tg.fairness && typeof tg.fairness === 'object' ? tg.fairness : {};
    setText('meshTargetGroupsStatus', `${tg.groupCount || groups.length || 0} Zielgruppe(n) · ${tg.activeGroupCount || 0} aktiv · Fairness: ${fairness.limitedCount || 0} gekürzt / ${fairness.blockedCount || 0} blockiert`);
    setText('meshTargetGroupsReason', (fairness.summary ? fairness.summary + ' · ' : '') + (tg.summary || tg.lastReason || 'Keine Zielgruppen konfiguriert. Knotenprioritäten werden direkt genutzt.'));
    const rows = $('meshTargetGroupRows');
    if (rows) {
      if (!groups.length) rows.innerHTML = '<tr><td colspan="9" class="muted">Keine Zielgruppen konfiguriert.</td></tr>';
      else rows.innerHTML = groups.map(g => `<tr>` +
        `<td>${esc(g.name || g.id || '')}<br><span class="muted">${esc(g.id || '')}</span></td>` +
        `<td>${esc(g.type || '')}</td>` +
        `<td>${esc(g.priority || '')}</td>` +
        `<td>${esc(g.strategy || '')}</td>` +
        `<td>${esc(g.memberCount || 0)}</td>` +
        `<td>${fmtW(g.requestedPowerW || 0)}</td>` +
        `<td>${fmtW(g.allowedPowerW || 0)}</td>` +
        `<td>${fmtW(g.maxPowerW || 0)}</td>` +
        `<td>${fmtW((fairness.groups || []).find(x => x.groupId === g.id)?.budgetW || 0)} / ${fmtW((fairness.groups || []).find(x => x.groupId === g.id)?.remainingW || 0)}<br><span class="muted">Fairness Budget / Rest</span></td>` +
      `</tr>`).join('');
    }
    const prio = Array.isArray(tg.priorityOrder) ? tg.priorityOrder : [];
    setText('meshTargetGroupPriority', prio.length ? prio.map(g => `${g.rank}. ${g.name || g.id} (${g.type}, Prio ${g.priority}, ${g.memberCount || 0} Knoten)`).join(' · ') : 'Keine Zielgruppen-Priorität vorhanden.');
  }

  function renderLimits(payload) {
    const limits = payload && payload.limits ? payload.limits : {};
    const limited = Array.isArray(limits.limitedCommands) ? limits.limitedCommands : [];
    const blocked = Array.isArray(limits.blockedCommands) ? limits.blockedCommands : [];
    setText('meshLimitsStatus', `${limits.activeLimitCount || 0} aktive Limit(s) · ${limits.limitedCount || limited.length || 0} gekürzt · ${limits.blockedCount || blocked.length || 0} blockiert`);
    setText('meshLimitsReason', limits.lastReason || 'Keine Leistungsgrenze hat den aktuellen Command-Plan begrenzt.');
    const rows = $('meshLimitRows');
    if (rows) {
      const all = limited.concat(blocked);
      if (!all.length) rows.innerHTML = '<tr><td colspan="8" class="muted">Keine aktuell gekürzten oder blockierten Commands.</td></tr>';
      else rows.innerHTML = all.map(row => {
        const reasons = Array.isArray(row.reasons) ? row.reasons : [];
        const reasonLimits = reasons.map(r => Number(r && r.limitW)).filter(v => Number.isFinite(v) && v > 0);
        const effectiveMin = reasons.find(r => String(r && r.id || '') === 'effectiveMinPowerW');
        const boundaryW = Number(row.allowedPowerW) > 0
          ? Number(row.allowedPowerW)
          : (effectiveMin && Number(effectiveMin.limitW) > 0
            ? Number(effectiveMin.limitW)
            : (reasonLimits.length ? Math.min(...reasonLimits) : 0));
        return `<tr>` +
          `<td>${esc(row.commandId || '')}</td>` +
          `<td>${esc(row.nodeId || row.targetNodeId || '')}</td>` +
          `<td>${fmtW(row.requestedPowerW || 0)}</td>` +
          `<td>${fmtW(row.allowedPowerW || 0)}</td>` +
          `<td class="${row.allowedPowerW > 0 ? 'severity-warn' : 'severity-critical'}">${row.allowedPowerW > 0 ? 'gekürzt' : 'blockiert'}</td>` +
          `<td>${esc(reasons.map(r => `${r.id}:${r.limitW}W`).join(' · '))}</td>` +
          `<td>${esc(row.reason || '')}</td>` +
          `<td>${boundaryW > 0 ? fmtW(boundaryW) : '--'}</td>` +
        `</tr>`;
      }).join('');
    }
  }


  function renderCommandGuard(payload) {
    const guard = payload && payload.commandGuard ? payload.commandGuard : {};
    const commands = Array.isArray(guard.plannedCommands) ? guard.plannedCommands : [];
    const checks = Array.isArray(guard.safetyChecks) ? guard.safetyChecks : [];
    setText('meshCommandGuardStatus', `${guard.status || 'blocked'} · Command-Ausgabe: ${guard.commandOutputAllowed ? 'freigegeben' : 'blockiert'} · direkter Hardware-Write: ${guard.hardwareWrite ? 'ja' : 'nein'}`);
    setText('meshCommandGuardReason', guard.reason || 'CommandGuard wartet auf Feldtest-Freigabe oder Command-State.');
    setText('meshCommandGuardCounts', `${commands.length} Command-Intent(s), ${guard.blockerCount || 0} Blocker, ${guard.warnCount || 0} Warnung(en)`);
    const checkBox = $('meshCommandGuardChecks');
    if (checkBox) {
      checkBox.innerHTML = checks.length
        ? checks.map(c => `<div><b>${esc(c.id || '')}</b>: ${esc(c.severity || '')} · ${esc(c.message || '')}</div>`).join('')
        : '<span class="muted">Keine Safety-Checks vorhanden.</span>';
    }
    const rows = $('meshCommandRows');
    if (rows) {
      if (!commands.length) rows.innerHTML = '<tr><td colspan="8" class="muted">Keine Command-Intents vorhanden.</td></tr>';
      else rows.innerHTML = commands.map(cmd => `<tr>` +
        `<td>${esc(cmd.commandId || '')}</td>` +
        `<td>${esc(cmd.category || '')}</td>` +
        `<td>${esc(cmd.nodeName || cmd.nodeId || '')}<br><span class="muted">${esc(cmd.nodeId || '')}</span></td>` +
        `<td>${esc(cmd.targetNodeName || cmd.targetNodeId || '--')}</td>` +
        `<td>${fmtW(cmd.plannedPowerW || 0)}</td>` +
        `<td>${esc(cmd.direction || '')}</td>` +
        `<td class="${cmd.allowed ? 'severity-info' : 'severity-critical'}">${cmd.allowed ? 'freigegeben' : 'blockiert'}</td>` +
        `<td>${esc(cmd.reason || '')}</td>` +
      `</tr>`).join('');
    }
  }


  function renderLocalBridge(payload) {
    const lb = payload && payload.localBridge ? payload.localBridge : {};
    const mapped = Array.isArray(lb.mappedCommands) ? lb.mappedCommands : [];
    const unmapped = Array.isArray(lb.unmappedCommands) ? lb.unmappedCommands : [];
    const writes = Array.isArray(lb.lastWrites) ? lb.lastWrites : [];
    const ackSummary = lb.ackSummary && typeof lb.ackSummary === 'object'
      ? lb.ackSummary
      : (lb.ack && typeof lb.ack === 'object' ? lb.ack : {});
    const targetStatus = Array.isArray(lb.targetStatus) ? lb.targetStatus : (Array.isArray(ackSummary.targets) ? ackSummary.targets : []);

    setText('meshLocalBridgeStatus', `${lb.enabled ? 'aktiv' : 'aus'} · Modus: ${lb.outputMode || 'global'} · Route: ${lb.routeReady ? 'bereit' : 'nicht bereit'}`);
    setText('meshLocalBridgeDetails', `Zuordnungen: ${lb.mappingCount || 0} · gemappt: ${lb.mappedCommandCount || mapped.length || 0} · ungemappt: ${lb.unmappedCommandCount || unmapped.length || 0} · Default-State: ${lb.defaultCommandStateDp || '--'}`);
    setText('meshLocalBridgeWrites', writes.length ? writes.map(w => `${w.commandStateDp || '--'}: ${w.status || '--'} (${w.commandCount || 0})`).join(' · ') : 'Noch keine lokalen Bridge-Writes.');
    setText('meshLocalBridgeAck', `ACK: ${ackSummary.status || lb.ackStatus || 'not-configured'} · Ziele ${ackSummary.configuredTargetCount || 0}/${ackSummary.expectedCount || targetStatus.length || 0} · OK ${ackSummary.okCount || ackSummary.ackOkCount || 0} · Warnung ${ackSummary.warnCount || 0} · Fehler/Timeout ${(ackSummary.errorCount || 0) + (ackSummary.timeoutCount || 0)}`);
    const ackGate = lb.ackGate && typeof lb.ackGate === 'object' ? lb.ackGate : {};
    const manualRelease = lb.manualRelease && typeof lb.manualRelease === 'object' ? lb.manualRelease : {};
    const targetHistory = lb.targetCommandHistory && typeof lb.targetCommandHistory === 'object' ? lb.targetCommandHistory : {};
    setText('meshLocalBridgeAckGate', `ACK-Gate: ${ackGate.status || 'disabled'} · erforderlich: ${(ackGate.required || ackGate.ackRequired) ? 'ja' : 'nein'} · blockiert: ${ackGate.blockedCount || ackGate.blockedCommandCount || 0} · ${ackGate.reason || ''}`);
    setText('meshLocalBridgeRelease', `Wiederfreigabe: aktive manuelle Freigaben ${manualRelease.activeCount || 0} · ACK-Auto-Release: ${(ackGate.autoRelease === false) ? 'aus' : 'an'} · Verlauf-Ziele ${targetHistory.targetCount || 0}`);

    const rows = $('meshLocalBridgeRows');
    if (rows) {
      if (!mapped.length && !unmapped.length) rows.innerHTML = '<tr><td colspan="8" class="muted">Noch keine lokalen Bridge-Commands vorhanden.</td></tr>';
      else rows.innerHTML = mapped.map(cmd => `<tr>` +
        `<td>${esc(cmd.commandId || '')}</td>` +
        `<td>${esc(cmd.mappingId || '')}</td>` +
        `<td>${esc(cmd.commandStateDp || '')}</td>` +
        `<td>${esc(cmd.nodeId || '')}</td>` +
        `<td>${esc(cmd.targetNodeId || '--')}</td>` +
        `<td>${fmtW(cmd.plannedPowerW || 0)}</td>` +
        `<td>${esc(cmd.direction || '')}</td>` +
        `<td class="severity-info">${esc((targetStatus.find(t => t.mappingId === cmd.mappingId) || {}).status || 'gemappt')}</td>` +
      `</tr>`).concat(unmapped.map(cmd => `<tr>` +
        `<td>${esc(cmd.commandId || '')}</td>` +
        `<td>--</td>` +
        `<td>--</td>` +
        `<td>${esc(cmd.nodeId || '')}</td>` +
        `<td>${esc(cmd.targetNodeId || '--')}</td>` +
        `<td>--</td>` +
        `<td>--</td>` +
        `<td class="severity-warn">${esc(cmd.reason || 'ungemappt')}</td>` +
      `</tr>`)).join('');
    }

    const ackRows = $('meshLocalBridgeAckRows');
    if (ackRows) {
      if (!targetStatus.length) ackRows.innerHTML = '<tr><td colspan="9" class="muted">Noch keine ACK-/Zielstatusdaten vorhanden.</td></tr>';
      else ackRows.innerHTML = targetStatus.map(t => `<tr>` +
        `<td>${esc(t.mappingId || '')}</td>` +
        `<td>${esc(t.commandStateDp || '')}</td>` +
        `<td>${esc(t.ackStateDp || '--')}</td>` +
        `<td>${esc(t.statusStateDp || '--')}</td>` +
        `<td class="${t.severity === 'critical' ? 'severity-critical' : (t.severity === 'warn' ? 'severity-warn' : 'severity-info')}">${esc(t.status || '')}</td>` +
        `<td>${esc(t.ok === true ? 'ja' : 'nein')}</td>` +
        `<td>${esc(Math.round(Number(t.ageMs || 0) / 1000))} s</td>` +
        `<td>${esc(t.message || '')}</td>` +
        `<td><button class="meshReleaseTarget" data-mapping="${esc(t.mappingId || '')}" data-command-state="${esc(t.commandStateDp || '')}" type="button">Freigeben</button></td>` +
      `</tr>`).join('');
      ackRows.querySelectorAll('button.meshReleaseTarget').forEach((btn) => {
        btn.addEventListener('click', () => releaseBridgeTarget(btn.getAttribute('data-mapping') || '', btn.getAttribute('data-command-state') || ''));
      });
    }

    const histRows = $('meshLocalBridgeHistoryRows');
    if (histRows) {
      const targets = Array.isArray(targetHistory.targets) ? targetHistory.targets : [];
      if (!targets.length) histRows.innerHTML = '<tr><td colspan="7" class="muted">Noch kein zielweiser Bridge-Command-Verlauf vorhanden.</td></tr>';
      else histRows.innerHTML = targets.slice(0, 30).map(t => {
        const h = Array.isArray(t.history) && t.history.length ? t.history[0] : {};
        return `<tr>` +
          `<td>${esc(t.mappingId || '')}</td>` +
          `<td>${h.ts ? new Date(Number(h.ts)).toLocaleString() : '--'}</td>` +
          `<td>${esc(t.lastStatus || h.status || '')}</td>` +
          `<td>${esc(h.commandCount || 0)}</td>` +
          `<td>${esc(Array.isArray(h.commandIds) ? h.commandIds.join(', ') : '')}</td>` +
          `<td>${esc(h.commandStateDp || '')}</td>` +
          `<td>${esc(h.reason || '')}</td>` +
        `</tr>`;
      }).join('');
    }
  }


  /**
   * 0.8.47 Manuelle Ziel-Wiederfreigabe.
   *
   * Der Button gibt ausschließlich das neutrale Bridge-Ziel zeitlich begrenzt
   * wieder frei. Er schreibt keine Gerätewerte und ändert keine Bridge-ACKs.
   * Die lokale Bridge/Herstellerintegration bleibt weiterhin die einzige Stelle,
   * die einen neutralen Command in ein reales Geräteprotokoll übersetzen darf.
   */
  async function releaseBridgeTarget(mappingId, commandStateDp) {
    const ok = window.confirm('Bridge-Ziel für Folge-Commands zeitlich begrenzt freigeben? Es wird keine Hardware direkt geschrieben.');
    if (!ok) return;
    try {
      const res = await fetch('/api/mesh/local-bridge/release', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mappingId, commandStateDp, ttlSec: 300, reason: 'operator-ui' }) });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload || payload.ok === false) throw new Error((payload && (payload.message || payload.error)) || `HTTP ${res.status}`);
      setText('meshLocalBridgeRelease', 'Manuelle Freigabe gesetzt: ' + (payload.release && (payload.release.mappingId || payload.release.commandStateDp) || mappingId || commandStateDp || 'Ziel'));
      await load();
    } catch (e) {
      setText('meshLocalBridgeRelease', 'Manuelle Freigabe fehlgeschlagen: ' + (e && e.message ? e.message : e));
    }
  }

  function renderFieldControl(payload) {
    const fc = payload && payload.fieldControl ? payload.fieldControl : {};
    const ts = payload && payload.tailscale ? payload.tailscale : {};
    setText('meshFieldStatus', `${fc.mode || 'diagnostic'} · ${fc.enabled ? 'aktiv' : 'aus'}`);
    setText('meshFieldDetails', `Freigabe: ${fc.installerApproved ? 'ja' : 'nein'} · Command-State: ${fc.commandStateDp || '--'} · letzter Status: ${fc.lastWriteStatus || 'idle'} · Ausgabe: ${fc.outputCount || 0}`);
    setText('meshTailscaleStatus', `${ts.enabled ? 'aktiv' : 'aus'} · ${ts.profile || 'mesh-microgrid'}`);
    const peerInfo = Array.isArray(ts.peers) ? ts.peers.map(p => `${p.id || p.url}: ${p.ok ? 'ok' : 'Fehler'}`).join(' · ') : '';
    setText('meshTailscaleDetails', `lokale Node: ${ts.localNodeId || '--'} · Peers: ${ts.peerCount || 0} · Remote-Knoten: ${ts.remoteNodeCount || 0} · Poll: ${ts.lastPollStatus || 'idle'}${peerInfo ? ' · ' + peerInfo : ''}`);
  }

  function renderReceiver(payload) {
    const rx = payload && payload.receiver ? payload.receiver : {};
    setText('meshReceiverStatus', `${rx.status || 'disabled'} · Receiver: ${rx.enabled ? 'aktiv' : 'aus'} · akzeptiert: ${rx.acceptRemoteCommands ? 'ja' : 'nein'}`);
    setText('meshReceiverDetails', `Command-State: ${rx.localCommandStateDp || '--'} · Token: ${rx.peerTokenSet ? 'gesetzt' : 'nicht gesetzt'} · Clusterprüfung: ${rx.requireClusterMatch === false ? 'aus' : 'an'}`);
    setText('meshReceiverCounts', `empfangen: ${rx.receivedCount || 0} · akzeptiert: ${rx.acceptedCount || 0} · abgelehnt: ${rx.rejectedCount || 0} · Replay blockiert: ${rx.replayBlockedCount || 0}`);
    const ackBox = $('meshReceiverAck');
    if (ackBox) {
      const ack = rx.lastAck || {};
      ackBox.textContent = ack && Object.keys(ack).length ? JSON.stringify(ack, null, 2) : 'Noch kein ACK vorhanden.';
    }
  }


  /**
   * 0.8.43 Feldtest-/Peer-Härtungsanzeige für zwei Instanzen.
   *
   * Diese Ansicht nutzt ausschließlich die Mesh/Microgrid-API und den manuellen
   * Feldtest-Endpunkt. Sie schreibt keine Gerätesollwerte und ändert keine
   * Konfiguration. Der Button löst nur einen neutralen Probe-Command gegen die
   * konfigurierten Peer-Receiver aus, damit Token, Cluster-ID, TTL und Replay-
   * Schutz im separaten Mesh-Tailscale geprüft werden können.
   */
  function renderFieldTest(payload) {
    const ft = payload && payload.fieldTest ? payload.fieldTest : {};
    const summary = ft.summary && typeof ft.summary === 'object' ? ft.summary : {};
    const matrix = Array.isArray(ft.peerMatrix) ? ft.peerMatrix : (Array.isArray(summary.peerMatrix) ? summary.peerMatrix : []);
    const history = Array.isArray(ft.commandHistory) ? ft.commandHistory : (Array.isArray(summary.commandHistory) ? summary.commandHistory : []);
    setText('meshFieldTestStatus', `${ft.status || summary.status || 'not-ready'} · bereit: ${ft.twoInstanceReady || summary.twoInstanceReady ? 'ja' : 'nein'} · Command: ${ft.fieldCommandReady || summary.fieldCommandReady ? 'ja' : 'nein'}`);
    const errorClasses = ft.errorClasses || summary.errorClasses || {};
    const roundtripStatus = ft.roundtripStatus || summary.roundtripStatus || 'unknown';
    const remoteNodeMatrix = Array.isArray(ft.remoteNodeMatrix) ? ft.remoteNodeMatrix : (Array.isArray(summary.remoteNodeMatrix) ? summary.remoteNodeMatrix : []);
    setText('meshFieldTestDetails', `Peers online: ${ft.peerOnlineCount || summary.peerOnlineCount || 0} · Command-ACK: ${ft.peerCommandOkCount || summary.peerCommandOkCount || 0} · Remote-Knoten: ${ft.remoteNodeCount || summary.remoteNodeCount || remoteNodeMatrix.length || 0} · Roundtrip: ${ft.lastRoundtripMs || summary.lastRoundtripMs || 0} ms · Ampel: ${roundtripStatus}`);
    setText('meshFieldTestHardening', `Fehlerklassen: Token ${errorClasses.token || 0} · Cluster ${errorClasses.cluster || 0} · Receiver ${errorClasses.receiver || 0} · Timeout ${errorClasses.timeout || 0} · Remote-Matrix ${remoteNodeMatrix.length}`);
    setText('meshFieldTestWarning', ft.warning || summary.warning || summary.reason || 'Keine Feldtest-Warnung.');
    const peerRows = $('meshFieldTestPeerRows');
    if (peerRows) {
      if (!matrix.length) peerRows.innerHTML = '<tr><td colspan="10" class="muted">Noch keine Peer-Feldtestdaten vorhanden.</td></tr>';
      else peerRows.innerHTML = matrix.map(p => `<tr>` +
        `<td>${esc(p.url || p.id || '')}</td>` +
        `<td class="${p.ok || p.pollOk || p.handshakeOk ? 'severity-info' : 'severity-critical'}">${p.ok || p.pollOk || p.handshakeOk ? 'ok' : 'fehlt'}</td>` +
        `<td>${esc(p.handshakeOk === false ? 'Fehler' : (p.handshakeStatus || (p.handshakeOk ? 'ok' : '--')))}</td>` +
        `<td>${esc(p.remoteNodeId || p.nodeId || '--')}</td>` +
        `<td>${esc(p.remoteClusterId || '--')}</td>` +
        `<td>${esc(p.commandAckOk || p.commandOk || p.lastCommandOk ? 'ok' : (p.commandStatus || p.lastCommandStatus || '--'))}</td>` +
        `<td class="${p.roundtripStatus === 'red' ? 'severity-critical' : (p.roundtripStatus === 'yellow' ? 'severity-warn' : 'severity-info')}">${esc(p.roundtripStatus || '--')}</td>` +
        `<td>${esc(p.errorClass || p.lastCommandErrorClass || '--')}</td>` +
        `<td>${esc((p.errors && p.errors.join(', ')) || p.lastError || p.errorLabel || '')}</td>` +
        `<td>${esc(p.ms || p.pollMs || p.commandMs || 0)} ms</td>` +
      `</tr>`).join('');
    }
    const remoteRows = $('meshRemoteNodeMatrixRows');
    if (remoteRows) {
      if (!remoteNodeMatrix.length) remoteRows.innerHTML = '<tr><td colspan="8" class="muted">Noch keine Remote-Knoten-Matrix vorhanden.</td></tr>';
      else remoteRows.innerHTML = remoteNodeMatrix.slice(0, 50).map(r => `<tr>` +
        `<td>${esc(r.peerId || r.peerNodeId || r.peerUrl || '')}</td>` +
        `<td>${esc(r.nodeName || r.nodeId || '')}<br><span class="muted">${esc(r.nodeId || '')}</span></td>` +
        `<td>${esc(r.type || '')}</td>` +
        `<td>${esc(r.role || '')}</td>` +
        `<td>${esc(r.status || '')}</td>` +
        `<td>${fmtW(r.surplusW || 0)}</td>` +
        `<td>${fmtW(r.demandW || 0)}</td>` +
        `<td>${esc(r.errorClass || 'ok')} · ${esc(r.roundtripStatus || 'unknown')}</td>` +
      `</tr>`).join('');
    }
    const histRows = $('meshFieldTestHistoryRows');
    if (histRows) {
      if (!history.length) histRows.innerHTML = '<tr><td colspan="5" class="muted">Noch kein Command-/ACK-Verlauf vorhanden.</td></tr>';
      else histRows.innerHTML = history.slice(0, 12).map(h => `<tr>` +
        `<td>${h.ts ? new Date(Number(h.ts)).toLocaleString() : '--'}</td>` +
        `<td>${esc(h.status || '')}</td>` +
        `<td>${esc(h.commandCount || 0)}</td>` +
        `<td>${esc(Array.isArray(h.commandIds) ? h.commandIds.join(', ') : '')}</td>` +
        `<td>${esc(Array.isArray(h.peers) ? h.peers.map(p => `${p.url || ''}: ${p.status || ''}`).join(' | ') : '')}</td>` +
      `</tr>`).join('');
    }
  }

  async function runFieldTest() {
    const btn = $('runMeshFieldTest');
    if (btn) btn.disabled = true;
    setText('meshFieldTestWarning', 'Feldtest läuft…');
    try {
      const res = await fetch('/api/mesh/peer/fieldtest', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ probe: true }) });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload) throw new Error((payload && (payload.message || payload.error)) || `HTTP ${res.status}`);
      setText('meshFieldTestWarning', payload.ok ? 'Feldtest erfolgreich abgeschlossen.' : (payload.message || 'Feldtest mit Warnung abgeschlossen.'));
      await load();
    } catch (e) {
      setText('meshFieldTestWarning', 'Feldtest fehlgeschlagen: ' + esc(e && e.message ? e.message : e));
    } finally {
      if (btn) btn.disabled = false;
    }
  }


  function renderDiagnosis(payload) {
    const clusterIntent = payload && payload.clusterIntent ? payload.clusterIntent : {};
    const decision = payload && payload.decision ? payload.decision : {};
    const parts = [];
    if (clusterIntent.localFirstDiagnosis) parts.push(clusterIntent.localFirstDiagnosis);
    if (clusterIntent.gridLastDiagnosis) parts.push(clusterIntent.gridLastDiagnosis);
    if (decision.nextStep) parts.push(decision.nextStep);
    parts.push('Read-only: keine automatische Steuerung aktiv.');
    setText('meshDiagnosis', parts.join(' '));
    const missing = payload && Array.isArray(payload.missingMappings) ? payload.missingMappings : [];
    const warning = payload && payload.warning ? String(payload.warning) : '';
    const msg = missing.length
      ? `${warning || 'Fehlende Zuordnungen'}: ` + missing.map(m => `${m.name || m.id}: ${m.warning || 'Mapping fehlt'}`).join(' · ')
      : (warning || 'Keine akuten Mapping-Warnungen.');
    setText('meshWarnings', msg);
  }
  async function load() {
    setText('meshStatus', 'lade…');
    try {
      const res = await fetch('/api/mesh/microgrid', { cache: 'no-store' });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error((payload && payload.message) || 'Mesh/Microgrid API nicht verfügbar');
      const cluster = payload.cluster || {};
      const totals = payload.totals || {};
      setText('meshStatus', `${payload.status || 'ok'} · ${payload.enabled ? 'aktiv' : 'aus'}`);
      setText('clusterName', cluster.name || cluster.id || '--');
      setText('clusterMode', cluster.mode || '--');
      setText('nodeCount', String((payload.nodes || []).length));
      setText('gridLimit', fmtW(cluster.gridLimitW || 0));
      setText('generationW', fmtW(totals.generationW || 0));
      setText('loadW', fmtW(totals.loadW || 0));
      setText('surplusW', fmtW(totals.surplusW || 0));
      setText('demandW', fmtW(totals.demandW || 0));
      setText('gridImportW', fmtW(totals.gridImportW || 0));
      setText('gridExportW', fmtW(totals.gridExportW || 0));
      setText('localUseW', fmtW(totals.localUsePotentialW || 0));
      setText('gridUsage', fmtPct(totals.gridLimitUsagePercent || 0));
      renderDiagnosis(payload);
      renderPlanning(payload);
      renderTargetGroups(payload);
      renderLimits(payload);
      renderCommandGuard(payload);
      renderLocalBridge(payload);
      renderFieldControl(payload);
      renderReceiver(payload);
      renderFieldTest(payload);
      renderNodes(payload.nodes || []);
    } catch (e) {
      setText('meshStatus', 'Fehler');
      const body = $('meshRows');
      if (body) body.innerHTML = `<tr><td colspan="12" class="warn">${esc(e && e.message ? e.message : e)}</td></tr>`;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('refreshMesh');
    if (btn) btn.addEventListener('click', load);
    const testBtn = $('runMeshFieldTest');
    if (testBtn) testBtn.addEventListener('click', runFieldTest);
    load();
    window.setInterval(load, 30000);
  });
})();
