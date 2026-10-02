// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Zeigt NVP-bezogene Messwerte, Netzgrenzen und Regelungsdiagnosen im App-Center an.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/ems-apps-nvp-diagnostics.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Ausführliche NVP-/Speicher-/PV-Diagnose für AppCenter → Status.
 * Diese Datei ist bewusst vom produktiven LIVE-Energiefluss getrennt.
 */

type AnyRecord = Record<string, any>;

declare const document: {
  createElement(tagName: string): AnyRecord;
  getElementById(id: string): AnyRecord | null;
};
declare const window: AnyRecord;

type DiagnosticApi = {
  render(payload: AnyRecord): void;
};

const finiteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const fmtW = (value: unknown): string => {
  const n = finiteNumber(value);
  if (n === null) return '—';
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)} kW`;
  return `${Math.round(n)} W`;
};

const fmtTs = (value: unknown): string => {
  const n = finiteNumber(value);
  if (n === null) return '';
  try {
    const date = new Date(n);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : '';
  } catch {
    return '';
  }
};

const fmtAge = (value: unknown): string => {
  const n = finiteNumber(value);
  if (n === null) return '—';
  if (n < 1000) return `${Math.max(0, Math.round(n))} ms`;
  return `${(Math.max(0, n) / 1000).toFixed(1)} s`;
};

const fmtBool = (value: unknown): string => value === true ? 'Ja' : (value === false ? 'Nein' : '—');

const text = (value: unknown, fallback = '—'): string => {
  const normalized = value === undefined || value === null ? '' : String(value).trim();
  return normalized || fallback;
};

const makeCard = (
  titleText: string,
  rows: Array<{ label: string; value: string; kind?: 'ok' | 'warn' | 'error' | '' }>,
  kind: 'ok' | 'warn' | 'error' | '' = '',
): AnyRecord => {
  const card = document.createElement('div');
  card.className = 'nw-config-card';

  const header = document.createElement('div');
  header.className = 'nw-config-card__header';
  const title = document.createElement('div');
  title.className = 'nw-config-card__title';
  title.textContent = titleText;
  header.appendChild(title);
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'nw-config-card__body';
  for (const rowDef of rows) {
    const row = document.createElement('div');
    row.className = 'nw-config-row';
    const left = document.createElement('div');
    left.className = 'nw-config-row__primary';
    left.textContent = rowDef.label;
    const right = document.createElement('div');
    right.className = 'nw-config-row__status';
    right.style.textAlign = 'right';
    right.textContent = rowDef.value;
    if (rowDef.kind === 'ok') right.style.color = '#6ee7b7';
    if (rowDef.kind === 'warn') right.style.color = '#fde68a';
    if (rowDef.kind === 'error') right.style.color = '#fca5a5';
    row.appendChild(left);
    row.appendChild(right);
    body.appendChild(row);
  }
  if (kind === 'error') card.style.borderColor = 'rgba(252,165,165,.65)';
  if (kind === 'ok') card.style.borderColor = 'rgba(110,231,183,.45)';
  card.appendChild(body);
  return card;
};

function renderNvpCoordinator(payload: AnyRecord = {}): void {
  const mount = document.getElementById('nvpCoordinatorStatus');
  const logMount = document.getElementById('nvpCoordinatorLog');
  if (!mount && !logMount) return;

  if (mount) mount.replaceChildren();
  if (logMount) logMount.replaceChildren();

  const snap = payload.nvpCoordinator && typeof payload.nvpCoordinator === 'object'
    ? payload.nvpCoordinator as AnyRecord
    : null;
  const tariff = payload.tariffStatus && typeof payload.tariffStatus === 'object'
    ? payload.tariffStatus as AnyRecord
    : null;

  if (!snap) {
    if (mount) mount.appendChild(makeCard('NVP-Koordinator', [
      { label: 'Status', value: 'Noch keine Diagnosedaten verfügbar', kind: 'warn' },
    ]));
    if (logMount) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-row';
      empty.textContent = 'Noch keine Logeinträge verfügbar.';
      logMount.appendChild(empty);
    }
    return;
  }

  const statusKind: 'ok' | 'warn' | 'error' = snap.stable === true
    ? 'ok'
    : (/stale|failed|blocked|timeout|error/.test(String(snap.status || '').toLowerCase()) ? 'error' : 'warn');
  const pv: AnyRecord = snap.pv && typeof snap.pv === 'object' ? snap.pv : {};
  const effective: AnyRecord = tariff && tariff.effective && typeof tariff.effective === 'object' ? tariff.effective : {};

  if (mount) {
    mount.appendChild(makeCard('Regelstatus', [
      { label: 'Status', value: text(snap.status), kind: statusKind },
      { label: 'Grund', value: text(snap.reason), kind: statusKind },
      { label: 'Letzte Aktualisierung', value: fmtTs(snap.ts) || '—' },
      { label: 'Stabil im Zielband', value: fmtBool(snap.stable), kind: snap.stable ? 'ok' : 'warn' },
    ], statusKind));

    mount.appendChild(makeCard('Netzverknüpfungspunkt (NVP)', [
      { label: 'Istwert', value: fmtW(snap.rawNvpW), kind: snap.nvpUsable ? '' : 'error' },
      { label: 'Ziel / Toleranz', value: `${fmtW(snap.nvpTargetW)} ± ${fmtW(snap.deadbandW)}` },
      { label: 'Regelfehler', value: fmtW(snap.nvpErrorW), kind: snap.withinBand ? 'ok' : 'warn' },
      { label: 'Prognose nach Speicher', value: fmtW(snap.projectedNvpW), kind: snap.projectedWithinBand ? 'ok' : '' },
      { label: 'Quelle / Alter', value: `${text(snap.nvpSource)} · ${fmtAge(snap.nvpMeasurementAgeMs)}`, kind: snap.nvpUsable ? '' : 'error' },
    ], snap.nvpUsable ? '' : 'error'));

    mount.appendChild(makeCard('Speicher / Speicherfarm', [
      { label: 'Topologie', value: text(snap.topology), kind: snap.topology === 'none' ? 'warn' : 'ok' },
      { label: 'Istleistung', value: fmtW(snap.storageActualW), kind: snap.storageActualFresh ? '' : 'warn' },
      { label: 'Sollleistung', value: fmtW(snap.storageTargetW) },
      { label: 'Ausstehende Änderung', value: fmtW(snap.storagePendingDeltaW), kind: snap.storageResponsePending ? 'warn' : 'ok' },
      { label: 'Write', value: `${snap.storageWriteOk ? 'OK' : 'nicht bestätigt'} · ${text(snap.storageWriteStatus)}`, kind: snap.storageWriteAccepted ? 'ok' : (snap.storageBlocked || snap.storageWriteFailed ? 'error' : 'warn') },
      { label: 'Vorweggenommen / Reaktionsalter', value: `${fmtBool(snap.storageCommandCredited)} · ${fmtAge(snap.storageResponseAgeMs)}`, kind: snap.storageCommandCredited ? 'warn' : '' },
    ], snap.storageBlocked || snap.storageWriteFailed ? 'error' : ''));

    const setpointW = finiteNumber(pv.setpointW);
    const setpointPct = finiteNumber(pv.setpointPct);
    const pvSetpoint = setpointW !== null && setpointW !== 0
      ? fmtW(setpointW)
      : (setpointPct !== null ? `${setpointPct.toFixed(1)} %` : '—');
    mount.appendChild(makeCard('PV-/WR-Restregelung', [
      { label: 'NVP für PV-Regler', value: fmtW(snap.pvControlNvpW) },
      { label: 'Aktion / Modus', value: `${text(pv.action)} · ${text(pv.mode)}`, kind: pv.error ? 'error' : '' },
      { label: 'Sollwert', value: pvSetpoint },
      { label: 'Write ausgeführt', value: fmtBool(pv.applied), kind: pv.error ? 'error' : '' },
      { label: 'Fehler', value: text(pv.error, 'Keiner'), kind: pv.error ? 'error' : 'ok' },
    ], pv.error ? 'error' : ''));

    mount.appendChild(makeCard('Dynamischer Tarif', [
      { label: 'Kompakte LIVE-Zeile', value: text(effective.statusText, 'Tarif nicht aktiv') },
      { label: 'Ausführliche Kette', value: text(effective.detailStatusText, 'Keine Detaildaten') },
    ]));
  }

  const log = Array.isArray(snap.log) ? snap.log.slice(-30).reverse() : [];
  if (!logMount) return;
  if (!log.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-config-row';
    empty.textContent = 'Noch keine Logeinträge verfügbar.';
    logMount.appendChild(empty);
    return;
  }

  for (const rawEntry of log) {
    const entry: AnyRecord = rawEntry && typeof rawEntry === 'object' ? rawEntry : {};
    const row = document.createElement('div');
    row.className = 'nw-config-row';
    const left = document.createElement('div');
    left.className = 'nw-config-row__primary';
    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.textContent = `${fmtTs(entry.ts)} · ${text(entry.status)}`;
    const sub = document.createElement('div');
    sub.style.fontSize = '0.75rem';
    sub.style.opacity = '0.85';
    sub.textContent = text(entry.reason);
    left.appendChild(title);
    left.appendChild(sub);

    const right = document.createElement('div');
    right.className = 'nw-config-row__status';
    right.style.textAlign = 'right';
    right.textContent = `NVP ${fmtW(entry.nvpW)} → Prognose ${fmtW(entry.projectedNvpW)} · Speicher ${fmtW(entry.storageActualW)} / ${fmtW(entry.storageTargetW)} · PV ${text(entry.pvAction)}`;
    row.appendChild(left);
    row.appendChild(right);
    logMount.appendChild(row);
  }
}

const api: DiagnosticApi = { render: renderNvpCoordinator };
(window as AnyRecord).NexoWattNvpDiagnostics = api;
