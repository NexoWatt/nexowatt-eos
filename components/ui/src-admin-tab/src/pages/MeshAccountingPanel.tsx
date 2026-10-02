/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Betreiberansicht für optionale Zählerarchive und Abrechnungsentwürfe.
 * Daten und Wirkung: Geschützte API, lokale Dateiexporte und Druck; kein automatischer
 * Rechnungsversand. Fehlende Randstände und Zählerfehler bleiben sichtbar.
 * Bei Änderungen: Rollen, Zählerqualität, echte Randzeitpunkte und CSV-/Druckausgabe gemeinsam prüfen.
 * Verknüpfungen: MeshCoordinatorPage; mesh-energy-service; mesh.configure-Rollenprüfung.
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import React, { useEffect, useState } from 'react';
import { meshCoordinatorRequest } from '../lib/adminConnection';
const stamp = value => value ? new Date(value).toLocaleString('de-DE') : '—';
const localStamp = value => { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 23); };
const money = cents => (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
function download(name, text, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// CSV-Zellen werden nicht als Tabellenformeln interpretiert, auch bei frei benannten Häusern.
const csvCell = v => `"${(typeof v === 'number' && Number.isFinite(v) ? String(v) : String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&")).replace(/"/g, '""')}"`;
export default function MeshAccountingPanel({ meshConfig, status }) {
  const [config, setConfig] = useState(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [nodeId, setNodeId] = useState(''); const [from, setFrom] = useState(localStamp(Date.now() - 30 * 86400000)); const [to, setTo] = useState(localStamp(Date.now()));
  const [report, setReport] = useState(null); const [limits, setLimits] = useState(null);
  useEffect(() => { let mounted = true; meshCoordinatorRequest('/accounting').then(data => { if (mounted) setConfig(data.config); }).catch(e => { if (mounted) setMessage(e.message); }); return () => { mounted = false; }; }, []);
  useEffect(() => { if (!limits && meshConfig?.role === 'master') setLimits(status?.master?.operatorLimits || { importW: meshConfig.site.limit.importW, exportW: meshConfig.site.limit.exportW }); }, [meshConfig, status, limits]);
  const master = meshConfig.role === 'master'; const local = meshConfig.role === 'slave' || meshConfig.localParticipates;
  const nodes = [...meshConfig.nodes, ...(master && local ? [meshConfig.local] : [])];
  const change = (key, value) => setConfig(p => ({ ...p, [key]: value }));
  const run = async fn => { setBusy(true); setMessage(''); try { await fn(); } catch (e) { setMessage(e.message); } finally { setBusy(false); } };
  const save = e => { e.preventDefault(); run(async () => { const data = await meshCoordinatorRequest('/accounting', config); setConfig(data.config); setReport(null); setMessage('Zählerarchiv und Tarife gespeichert.'); }); };
  const calculate = e => { e.preventDefault(); run(async () => { setReport(null); setReport(await meshCoordinatorRequest('/accounting/report', { nodeId, from: new Date(from).toISOString(), to: new Date(to).toISOString(), tariff: config.tariff })); }); };
  const exportRecords = () => run(async () => {
    const rows = []; let after = 0; let end = null;
    do {
      const page = await meshCoordinatorRequest('/accounting/records', { nodeId, after }); if (end === null) end = page.lastSequence;
      if (!page.records.length) break;
      for (const r of page.records) if (r.seq <= end && Date.parse(r.at) >= Date.parse(from) && Date.parse(r.at) <= Date.parse(to)) rows.push(r);
      after = page.records.at(-1).seq;
      if (rows.length > 100000) throw new Error('Mehr als 100.000 Datensätze: Exportzeitraum verkleinern.');
      setMessage(`${after} von ${end} Archivpositionen geprüft…`);
    } while (after < end);
    download(`NexoWatt_Zaehler_${nodeId}.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'application/x-ndjson'); setMessage(`${rows.length} Originaldatensätze exportiert.`);
  });
  return <>
    {master && limits && <section className="nw-card"><h2>Betreiber · Trafo-Freigabe</h2><p>Die gemeinsame Leistung wird auf die Haus-NVPs verteilt. Absenkungen wirken mit der nächsten Antwort; zusätzliche Freigaben erst nach bestätigter Begrenzung. Technische Anschlussgrenzen und Rückfallreserven bleiben verbindlich.</p>
      <form onSubmit={e => { e.preventDefault(); run(async () => { setLimits(await meshCoordinatorRequest('/operating', limits)); setMessage('Trafo-Freigabe gespeichert. Umsetzung in der Teilnehmerübersicht kontrollieren.'); }); }} style={{ display: 'grid', gap: 12 }}>
        <label className="nw-field-label">Verteilung im Betrieb<select className="nw-input" value={limits.strategy || meshConfig.allocation?.strategy || 'fixed'} onChange={e => setLimits({ ...limits, strategy: e.target.value })}><option value="fixed">Feste Anteile</option><option value="transformer">Bedarfsabhängig · Trafo / Häuser</option></select></label>
        {['importW','exportW'].map(k => <label className="nw-field-label" key={k}>{k === 'importW' ? 'Gesamter Bezug maximal W' : 'Gesamte Einspeisung maximal W'}<input className="nw-input" type="number" min="0" max={meshConfig.site.limit[k]} value={limits[k]} onChange={e => setLimits({ ...limits, [k]: e.target.value === '' ? '' : Number(e.target.value) })} required /></label>)}
        <button className="nw-button nw-button--primary" disabled={busy}>Gesamtfreigabe übernehmen</button>
      </form></section>}
    <section className="nw-card"><h2>{master ? 'Betreiber · Zähler und Abrechnung' : 'Haus-NVP · Lokales Zählerarchiv'}</h2><p role="status">{message}</p>
      <p>Optionales Archiv mit kumulativem Bezug und Einspeisung. Originalstände bleiben am Haus gespeichert und werden nach einer Verbindungsunterbrechung nachgeliefert. Master und Slave benötigen jeweils ein aktiviertes Archiv.</p>
      {status?.accounting?.error && <p role="alert">Archivstörung: {status.accounting.error}. Die Regelung läuft über einen getrennten Kanal.</p>}
      {local && <p>Lokale Datensätze: {status?.accounting?.local?.sequence || 0} · Noch nicht am Master bestätigt: {master ? 'lokal am Master' : status?.accounting?.pending || 0} · Letzter Abgleich: {stamp(status?.accounting?.lastSync)} · Zählerqualität: {status?.accounting?.meterQuality || 'missing'}</p>}
      {master && <div style={{ overflowX: 'auto', maxHeight: 360 }}><table style={{ width: '100%' }}><thead><tr><th>Haus</th><th>Zähler / Epoche</th><th>Bezug kWh</th><th>Einspeisung kWh</th><th>Messzeit / Empfang</th><th>Qualität / Datensätze</th></tr></thead><tbody>{status?.accounting?.nodes?.map(n => <tr key={n.id}><td>{n.name || n.id}</td><td>{n.last?.meter?.id || 'Nicht eingerichtet'} / {n.last?.meter?.epoch || '—'}</td><td>{n.last?.importMilliWh == null ? '—' : (n.last.importMilliWh / 1e6).toLocaleString('de-DE')}</td><td>{n.last?.exportMilliWh == null ? '—' : (n.last.exportMilliWh / 1e6).toLocaleString('de-DE')}</td><td>{stamp(n.last?.at)}<br />{stamp(n.receivedAt)}</td><td>{n.failure || n.last?.quality || 'Fehlt'} / {n.sequence || 0}</td></tr>)}</tbody></table></div>}
      {config && <form onSubmit={save}><fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0, display: 'grid', gap: 12 }}>
        <label><input type="checkbox" checked={config.enabled} onChange={e => change('enabled', e.target.checked)} /> {master ? 'Abrechnung und Zählerarchiv im Master aktivieren' : 'Lokales Zählerarchiv und Nachlieferung aktivieren'}</label>
        {local && <details open={!config.meter.id}><summary>Geeichten Haus-NVP-Zähler zuordnen</summary><p>Bei Zählerwechsel oder Rücksetzung eine neue Epoche vergeben. Eine neue Epoche darf keine fehlende Zählerdifferenz überbrücken. Der eingebaute Verbrauchsverlauf ersetzt diese ausdrückliche Zählerzuordnung nicht.</p>
          {[['id','Zählernummer'],['epoch','Zählerepoche (z. B. Einbaudatum)'],['importDp','Kumulativer Bezugszähler – Datenpunkt'],['exportDp','Kumulativer Einspeisezähler – Datenpunkt']].map(([k,label]) => <label className="nw-field-label" key={k}>{label}<input className="nw-input" value={config.meter[k]} onChange={e => change('meter', { ...config.meter, [k]: e.target.value })} /></label>)}
          <label className="nw-field-label">Einheit der beiden Datenpunkte<select className="nw-input" value={config.meter.unit} onChange={e => change('meter', { ...config.meter, unit: e.target.value })}><option>kWh</option><option>Wh</option></select></label>
          <label><input type="checkbox" checked={config.meter.calibrated} onChange={e => change('meter', { ...config.meter, calibrated: e.target.checked })} /> Geeichter Zweirichtungszähler am Haus-NVP und Zuordnung vor Ort geprüft</label>
          <label className="nw-field-label">Eichfrist gültig bis<input className="nw-input" type="date" value={config.meter.calibrationUntil} onChange={e => change('meter', { ...config.meter, calibrationUntil: e.target.value })} /></label>
        </details>}
        <details><summary>Archivintervalle und Speichergrenze</summary>{[['intervalMs','Messintervall ms (mindestens 60.000)'],['maxAgeMs','Zählerstand maximal alt ms'],['maxSkewMs','Beide Zählerstände maximal versetzt ms'],['maxArchiveMB','Archivgrenze MiB je Haus']].map(([k,label]) => <label className="nw-field-label" key={k}>{label}<input className="nw-input" type="number" min="0" value={config[k]} onChange={e => change(k, e.target.value === '' ? '' : Number(e.target.value))} required /></label>)}<p>Archive werden nicht automatisch gelöscht. Bei voller Grenze wird die Erfassung mit einer sichtbaren Störung angehalten; bestätigte Originale bleiben erhalten.</p></details>
        {master && <><label className="nw-field-label">Betreibername<input className="nw-input" value={config.operatorName} onChange={e => change('operatorName', e.target.value)} /></label><h3>Tarif für den ausgewählten Abrechnungsentwurf</h3><p>Preise für den gesamten ausgewerteten Zeitraum eingeben. Bei Tarifwechsel getrennte Zeiträume auswerten. Die Pauschale gilt einmal je Haus und ausgewähltem Zeitraum. Keine automatische Umsatzsteuerberechnung.</p>
          {[['importEuroKwh','Bezug EUR/kWh'],['exportEuroKwh','Einspeisegutschrift EUR/kWh'],['periodFeeEuro','Pauschale EUR je ausgewertetem Zeitraum']].map(([k,label]) => <label className="nw-field-label" key={k}>{label}<input className="nw-input" type="number" min="0" step="0.000001" value={config.tariff[k]} onChange={e => { change('tariff', { ...config.tariff, [k]: e.target.value === '' ? '' : Number(e.target.value) }); setReport(null); }} required /></label>)}</>}
        <button className="nw-button nw-button--primary">Archiv-Einstellungen speichern</button>
      </fieldset></form>}
      {master && config && <form onSubmit={calculate} style={{ display: 'grid', gap: 12, marginTop: 24 }}><h3>Zeitraum auswerten</h3><label className="nw-field-label">Haus<select className="nw-input" value={nodeId} onChange={e => { setNodeId(e.target.value); setReport(null); }} required><option value="">Haus wählen</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.name || n.id}</option>)}</select></label>
        <label className="nw-field-label">Von (Ortszeit)<input className="nw-input" type="datetime-local" step="0.001" value={from} onChange={e => { setFrom(e.target.value); setReport(null); }} required /></label><label className="nw-field-label">Bis (Ortszeit)<input className="nw-input" type="datetime-local" step="0.001" value={to} onChange={e => { setTo(e.target.value); setReport(null); }} required /></label>
        <button className="nw-button nw-button--primary" disabled={busy}>Abrechnungsentwurf berechnen</button><button className="nw-button" type="button" disabled={busy || !nodeId} onClick={exportRecords}>Originalzählerstände für Zeitraum exportieren (JSONL)</button>
      </form>}
    </section>
    {report && <section className="nw-card nw-mesh-report"><h2>Abrechnungsentwurf · {report.name || report.nodeId}</h2><p>{report.operatorName}</p><p><strong>{report.status === 'BLOCKED' ? 'Gesperrt – Zählerdaten nicht durchgehend zuordenbar' : report.status === 'PARTIAL_PERIOD' ? 'Teilzeitraum – angeforderte Randstände fehlen' : 'Entwurf aus Originalzählerständen'}</strong></p><p>Gewünscht: {stamp(report.requested.from)} bis {stamp(report.requested.to)}<br />Gemessen: {stamp(report.measured.from)} bis {stamp(report.measured.to)}</p>
      <p>{report.count} Datensätze · {report.invalid} Qualitätsfehler · {report.gaps} Intervalllücken · Zähler {report.first?.meter?.id || '—'}</p>
      <table style={{ width: '100%' }}><thead><tr><th>Position</th><th>Anfang kWh</th><th>Ende kWh</th><th>Differenz kWh</th><th>Betrag</th></tr></thead><tbody>{[['import','Bezug'],['export','Einspeisung']].map(([key,label]) => <tr key={key}><th>{label}</th><td>{report.first?.[`${key}MilliWh`] == null ? '—' : report.first[`${key}MilliWh`] / 1e6}<br /><small>{stamp(report.first?.sourceAt?.[key === 'import' ? 0 : 1])}</small></td><td>{report.last?.[`${key}MilliWh`] == null ? '—' : report.last[`${key}MilliWh`] / 1e6}<br /><small>{stamp(report.last?.sourceAt?.[key === 'import' ? 0 : 1])}</small></td><td>{report[`${key}Kwh`] ?? '—'}</td><td>{report.amounts ? money(report.amounts[`${key}Cents`]) : '—'}</td></tr>)}</tbody></table>
      {report.amounts && <p>Pauschale: {money(report.amounts.periodFeeCents)} · Saldo Bezug + Pauschale − Einspeisung: <strong>{money(report.amounts.balanceCents)}</strong></p>}
      <p>{report.note}</p>{report.periodFeePending && <p>Die Pauschale ist für diesen Teilzeitraum noch nicht angesetzt. Randzeiten prüfen und ausdrücklich übernehmen.</p>}<p>Originalreferenzen: {report.first?.stream || '—'} · Sequenz {report.first?.seq || '—'} bis {report.last?.seq || '—'}. Erstellt {stamp(report.generatedAt)}.</p>
      <div className="nw-mesh-no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {report.usable && !report.boundaryComplete && <button className="nw-button" onClick={() => { setFrom(localStamp(report.measured.from)); setTo(localStamp(report.measured.to)); setMessage('Gemessene Randzeiten übernommen. Erneut berechnen.'); }}>Gemessene Randzeiten übernehmen</button>}
        <button className="nw-button" onClick={() => download(`NexoWatt_Entwurf_${report.nodeId}.json`, JSON.stringify(report, null, 2))}>Prüfbeleg JSON</button>
        <button className="nw-button" disabled={!report.usable} onClick={() => { const lines = [['Status','Haus','Von gemessen','Bis gemessen','Bezug kWh','Einspeisung kWh','Bezug Cent','Einspeisung Cent','Pauschale Cent','Saldo Cent'],[report.status,report.name || report.nodeId,report.measured.from,report.measured.to,report.importKwh,report.exportKwh,report.amounts.importCents,report.amounts.exportCents,report.amounts.periodFeeCents,report.amounts.balanceCents]]; download(`NexoWatt_Entwurf_${report.nodeId}.csv`, '\uFEFF' + lines.map(r => r.map(csvCell).join(';')).join('\r\n'), 'text/csv'); }}>Abrechnungsentwurf CSV</button>
        <button className="nw-button" disabled={!report.usable} onClick={() => window.print()}>Drucken / PDF</button>
      </div><style>{'@media print { body * { visibility: hidden; } .nw-mesh-report, .nw-mesh-report * { visibility: visible; color: #111 !important; background: white !important; } .nw-mesh-report { position: absolute; left: 0; top: 0; width: 100%; } .nw-mesh-no-print, .nw-mesh-no-print * { display: none !important; } }'}</style>
    </section>}
  </>;
}
