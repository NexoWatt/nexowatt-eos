import React, { type JSX, useCallback, useEffect, useMemo, useState } from 'react';

import type { AdminConnection, IobTheme, Translate } from '@iobroker/adapter-react-v5';

/** nexowatt-ems-overview-v1 */

type Severity = 'ok' | 'info' | 'warning' | 'error';

type ForeignState = {
    val?: unknown;
    ts?: number;
    lc?: number;
};

type OverviewDecision = {
    subsystem?: string;
    severity?: Severity | 'warn';
    title?: string;
    reason?: string;
    details?: string;
};

type OverviewEvent = {
    id?: string;
    ts?: number;
    severity?: Severity | 'warn';
    subsystem?: string;
    title?: string;
    message?: string;
    reason?: string;
};

type OverviewSummary = {
    schemaVersion?: number;
    generatedAt?: number;
    updatedAt?: number;
    adapterVersion?: string;
    available?: boolean;
    status?: Severity;
    headline?: string;
    reason?: string;
    binding?: string;
    details?: { port?: number; path?: string };
    ems?: Record<string, any>;
    budget?: Record<string, any>;
    charging?: Record<string, any>;
    storage?: Record<string, any>;
    para14a?: Record<string, any>;
    peakShaving?: Record<string, any>;
    tariff?: Record<string, any>;
    forecast?: Record<string, any>;
    modules?: Record<string, boolean>;
    currentDecisions?: OverviewDecision[];
};

type LoadedOverview = {
    instance: string;
    alive: boolean | null;
    summary: OverviewSummary;
    events: OverviewEvent[];
    updatedAt: number;
};

interface Props {
    socket: AdminConnection;
    t: Translate;
    lang: ioBroker.Languages;
    theme: IobTheme;
}

const STATUS_COLORS: Record<Severity, string> = {
    ok: '#01bc69',
    info: '#48b9ff',
    warning: '#ffbd59',
    error: '#ff5f72',
};

const STATUS_LABELS: Record<Severity, string> = {
    ok: 'Normal',
    info: 'Information',
    warning: 'Begrenzt',
    error: 'Störung',
};

function finite(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, fallback = ''): string {
    const normalized = String(value ?? fallback).replace(/\s+/g, ' ').trim();
    return normalized || fallback;
}

function parseJson<T>(value: unknown, fallback: T): T {
    if (value && typeof value === 'object') return value as T;
    try {
        return JSON.parse(String(value ?? '')) as T;
    } catch {
        return fallback;
    }
}

function stateValue(states: Record<string, ForeignState>, id: string): unknown {
    return states[id]?.val;
}

function formatPower(value: unknown): string {
    const watts = finite(value, 0);
    const sign = watts < 0 ? '−' : '';
    const absolute = Math.abs(watts);
    if (absolute >= 1000) {
        return `${sign}${(absolute / 1000).toLocaleString('de-DE', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 2,
        })} kW`;
    }
    return `${sign}${Math.round(absolute).toLocaleString('de-DE')} W`;
}

function formatAge(timestamp: unknown): string {
    const ts = finite(timestamp, 0);
    if (!ts) return 'noch kein Regeltick';
    const ageSeconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (ageSeconds < 2) return 'gerade eben';
    if (ageSeconds < 60) return `vor ${ageSeconds} s`;
    const ageMinutes = Math.round(ageSeconds / 60);
    return `vor ${ageMinutes} min`;
}

function formatClock(timestamp: unknown): string {
    const ts = finite(timestamp, 0);
    if (!ts) return '—';
    try {
        return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return '—';
    }
}

function severity(value: unknown): Severity {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'error') return 'error';
    if (normalized === 'warning' || normalized === 'warn') return 'warning';
    if (normalized === 'ok') return 'ok';
    return 'info';
}

function normalizeInstances(states: Record<string, ForeignState>, aliveStates: Record<string, ForeignState>): LoadedOverview[] {
    const prefixes = new Set<string>();
    for (const id of Object.keys(states || {})) {
        const match = id.match(/^(nexowatt-ui\.\d+)\.info\.adminOverview\./);
        if (match?.[1]) prefixes.add(match[1]);
    }

    const result: LoadedOverview[] = [];
    for (const instance of prefixes) {
        const summary = parseJson<OverviewSummary>(stateValue(states, `${instance}.info.adminOverview.summaryJson`), {});
        const events = parseJson<OverviewEvent[]>(stateValue(states, `${instance}.info.adminOverview.eventsJson`), []);
        const updatedAt = Math.max(
            finite(summary.updatedAt, 0),
            finite(summary.generatedAt, 0),
            finite(stateValue(states, `${instance}.info.adminOverview.updatedAt`), 0),
            finite(states[`${instance}.info.adminOverview.summaryJson`]?.ts, 0),
        );
        const aliveValue = stateValue(aliveStates, `system.adapter.${instance}.alive`);
        const alive = aliveValue === undefined || aliveValue === null
            ? null
            : (aliveValue === true || aliveValue === 1 || ['true', '1', 'online', 'active'].includes(String(aliveValue).toLowerCase()));
        result.push({
            instance,
            alive,
            summary: {
                ...summary,
                status: severity(summary.status || stateValue(states, `${instance}.info.adminOverview.status`)),
                headline: text(summary.headline || stateValue(states, `${instance}.info.adminOverview.headline`), 'EMS-Diagnose wird aufgebaut'),
                reason: text(summary.reason || stateValue(states, `${instance}.info.adminOverview.reason`), ''),
                binding: text(summary.binding || stateValue(states, `${instance}.info.adminOverview.binding`), 'none'),
            },
            events: Array.isArray(events) ? events : [],
            updatedAt,
        });
    }
    return result.sort((left, right) => {
        const aliveRank = (value: boolean | null): number => value === true ? 2 : value === null ? 1 : 0;
        const rankDiff = aliveRank(right.alive) - aliveRank(left.alive);
        return rankDiff || (right.updatedAt - left.updatedAt) || left.instance.localeCompare(right.instance);
    });
}

function decisionFallback(summary: OverviewSummary): OverviewDecision[] {
    const result: OverviewDecision[] = [];
    const charging = summary.charging || {};
    if (charging.available) {
        result.push({
            subsystem: 'charging',
            severity: finite(charging.faultCount, 0) > 0 ? 'error' : finite(charging.waitingCount, 0) > 0 ? 'info' : 'ok',
            title: `${finite(charging.activeCount, 0)} lädt · ${finite(charging.waitingCount, 0)} wartet · ${finite(charging.faultCount, 0)} gestört`,
            reason: text(charging.limiterText || charging.status, 'Lademanagement aktiv'),
            details: `Ist ${formatPower(charging.actualW)} · Soll ${formatPower(charging.targetW)}`,
        });
    }
    const storage = summary.storage || {};
    if (storage.available) {
        result.push({
            subsystem: 'storage',
            severity: storage.writeOk === false ? 'error' : 'ok',
            title: `Speicher ${text(storage.topology, 'aktiv')}${storage.socPct != null ? ` · SoC ${Math.round(finite(storage.socPct, 0))} %` : ''}`,
            reason: text(storage.reason, 'Speicherregelung aktiv'),
            details: `Ist ${formatPower(storage.actualW)} · Soll ${formatPower(storage.targetW)}`,
        });
    }
    return result;
}

export default function NexoWattEmsOverview({ socket }: Props): JSX.Element {
    const [data, setData] = useState<LoadedOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [clock, setClock] = useState(Date.now());

    const load = useCallback(async (): Promise<void> => {
        if (document.visibilityState !== 'visible') return;
        try {
            const [states, aliveStates] = await Promise.all([
                socket.getForeignStates('nexowatt-ui.*.info.adminOverview.*'),
                socket.getForeignStates('system.adapter.nexowatt-ui.*.alive'),
            ]);
            const instances = normalizeInstances(
                (states || {}) as Record<string, ForeignState>,
                (aliveStates || {}) as Record<string, ForeignState>,
            );
            setData(instances[0] || null);
            setLoadError('');
        } catch (error) {
            setLoadError(text((error as Error)?.message, 'EMS-Diagnose konnte nicht gelesen werden'));
        } finally {
            setLoading(false);
            setClock(Date.now());
        }
    }, [socket]);

    useEffect(() => {
        void load();
        const onVisibility = (): void => {
            if (document.visibilityState === 'visible') void load();
        };
        document.addEventListener('visibilitychange', onVisibility);
        const interval = window.setInterval(() => void load(), 5_000);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.clearInterval(interval);
        };
    }, [load]);

    const role = String((window as any).NEXOWATT_EOS_ACCESS_ROLE || 'admin').toLowerCase();
    const technicalView = role === 'admin' || role === 'service' || role === 'installer' || role === 'installateur';
    const summary = data?.summary || {};
    const ageMs = data?.updatedAt ? Math.max(0, clock - data.updatedAt) : Number.POSITIVE_INFINITY;
    const stale = Boolean(data && (data.alive === false || ageMs > 20_000));
    const rawStatus = severity(summary.status);
    const effectiveStatus: Severity = stale ? 'error' : rawStatus;
    const statusColor = STATUS_COLORS[effectiveStatus];
    const budget = summary.budget || {};
    const charging = summary.charging || {};
    const storage = summary.storage || {};
    const ems = summary.ems || {};
    const para14a = summary.para14a || {};
    const tariff = summary.tariff || {};
    const forecast = summary.forecast || {};
    const peak = summary.peakShaving || {};
    const totalBudget = Math.max(0, finite(budget.totalW, 0));
    const remainingBudget = Math.max(0, finite(budget.remainingW, 0));
    const budgetPercent = totalBudget > 0 ? Math.max(0, Math.min(100, remainingBudget / totalBudget * 100)) : 0;
    const decisions = useMemo(() => {
        const source = Array.isArray(summary.currentDecisions) ? summary.currentDecisions : decisionFallback(summary);
        return source.slice(0, technicalView ? 5 : 2);
    }, [summary, technicalView]);
    const events = technicalView ? (data?.events || []).slice(0, 6) : [];

    const tags: Array<{ label: string; warning?: boolean }> = [];
    if (text(summary.binding, 'none') !== 'none') tags.push({ label: `Bindend: ${text(budget.bindingText || summary.binding)}`, warning: true });
    if (para14a.communicationFallbackActive) tags.push({ label: `§14a-Fallback ${formatPower(para14a.fallbackCapW)}`, warning: true });
    else if (para14a.binding) tags.push({ label: '§14a begrenzt', warning: true });
    if (peak.active) tags.push({ label: `Peak-Shaving: ${text(peak.status, 'aktiv')}`, warning: true });
    if (tariff.available) tags.push({ label: `Tarif: ${text(tariff.state, 'aktiv')}${tariff.priceEurPerKwh != null ? ` · ${finite(tariff.priceEurPerKwh).toFixed(3)} €/kWh` : ''}` });
    if (forecast.available) tags.push({ label: `Prognose: ${text(forecast.source, 'aktiv')}${forecast.fresh === false ? ' · veraltet' : ''}`, warning: forecast.fresh === false });
    if (ems.safetyActive || ems.safetyEmergencyStop || ems.safetyValid === false) tags.push({ label: 'EOS Safety aktiv', warning: true });

    if (!data && !loading) {
        return (
            <section className="eos-ems-overview-card" data-nexowatt-contract="nexowatt-ems-overview-v1" style={{ '--eos-ems-status-color': STATUS_COLORS.info } as React.CSSProperties}>
                <header className="eos-ems-overview-header">
                    <div>
                        <span className="eos-ems-overview-eyebrow">NexoWatt EMS</span>
                        <h2>Live-Diagnose</h2>
                        <p>{loadError || 'NexoWatt UI ist nicht installiert, offline oder der Diagnosevertrag info.adminOverview.* fehlt.'}</p>
                    </div>
                    <div className="eos-ems-overview-state"><span className="eos-ems-overview-state-dot" /><strong>Nicht verfügbar</strong><small>read-only</small></div>
                </header>
                <footer className="eos-ems-overview-footer"><span>Diagnose ist rein lesend.</span><span>Keine EMS-Regelung wurde verändert.</span></footer>
            </section>
        );
    }

    return (
        <section className="eos-ems-overview-card" data-nexowatt-contract="nexowatt-ems-overview-v1" style={{ '--eos-ems-status-color': statusColor } as React.CSSProperties}>
            <header className="eos-ems-overview-header">
                <div>
                    <span className="eos-ems-overview-eyebrow">NexoWatt EMS · Live-Diagnose</span>
                    <h2>{loading ? 'EMS-Diagnose wird geladen …' : stale ? 'EMS-Diagnose ist nicht aktuell' : text(summary.headline, 'EMS arbeitet normal')}</h2>
                    <p>{stale ? 'Adapter oder Diagnosewerte sind älter als 20 Sekunden. Die dargestellten Werte dürfen nicht als aktuelle Regelentscheidung verwendet werden.' : text(summary.reason, 'EMS arbeitet innerhalb aller aktiven Grenzen.')}</p>
                </div>
                <div className="eos-ems-overview-state">
                    <span className="eos-ems-overview-state-dot" />
                    <strong>{stale ? 'Offline / veraltet' : STATUS_LABELS[effectiveStatus]}</strong>
                    <small>{data?.instance || 'nexowatt-ui'} · {formatAge(data?.updatedAt)}</small>
                </div>
            </header>

            <div className="eos-ems-overview-metrics">
                <div className="eos-ems-overview-metric"><span>EMS-Budget</span><strong>{totalBudget > 0 ? formatPower(totalBudget) : 'nicht begrenzt'}</strong><small>Rest {formatPower(remainingBudget)}</small></div>
                <div className="eos-ems-overview-metric"><span>Lademanagement</span><strong>{formatPower(charging.actualW)} / {formatPower(charging.targetW)}</strong><small>{finite(charging.activeCount)} lädt · {finite(charging.waitingCount)} wartet</small></div>
                {storage.available ? (
                    <div className="eos-ems-overview-metric"><span>Speicher {text(storage.topology, '')}</span><strong>{formatPower(storage.actualW)} / {formatPower(storage.targetW)}</strong><small>{storage.socPct != null ? `SoC ${Math.round(finite(storage.socPct))} %` : text(storage.reason, 'aktiv')}</small></div>
                ) : (
                    <div className="eos-ems-overview-metric"><span>PV-Budget</span><strong>{formatPower(budget.pvBudgetW)}</strong><small>PV-Rest {formatPower(budget.remainingPvW)}</small></div>
                )}
                <div className="eos-ems-overview-metric"><span>Letzter Regeltick</span><strong>{formatAge(ems.lastTickTs || data?.updatedAt)}</strong><small>{technicalView ? `Zyklus ${finite(ems.cycleMs)} ms` : text(ems.decision, 'EMS aktiv')}</small></div>
            </div>

            {totalBudget > 0 ? <div className="eos-ems-overview-budget" title={`${budgetPercent.toFixed(1)} % Restbudget`}><span style={{ width: `${budgetPercent}%` }} /></div> : null}
            {tags.length ? <div className="eos-ems-overview-tags">{tags.map(tag => <span className={tag.warning ? 'is-warning' : ''} key={tag.label}>{tag.label}</span>)}</div> : null}

            <div className="eos-ems-overview-columns">
                <div className="eos-ems-overview-panel">
                    <h3>Aktuelle Regelentscheidungen</h3>
                    {decisions.length ? decisions.map((decision, index) => (
                        <div className={`eos-ems-overview-decision eos-ems-overview-decision--${severity(decision.severity)}`} key={`${decision.subsystem || 'ems'}-${index}`}>
                            <strong>{text(decision.title, 'EMS-Entscheidung')}</strong>
                            <span>{text(decision.reason, 'Keine zusätzliche Begrenzung')}</span>
                            {technicalView && decision.details ? <small>{decision.details}</small> : null}
                        </div>
                    )) : <div className="eos-ems-overview-empty">Keine aktiven Regelentscheidungen. EOS arbeitet mit den aktuellen Messwerten.</div>}
                </div>

                <div className="eos-ems-overview-panel">
                    <h3>{technicalView ? 'Letzte EMS-Ereignisse' : 'Systemerklärung'}</h3>
                    {technicalView ? (
                        events.length ? events.map((event, index) => (
                            <div className={`eos-ems-overview-event eos-ems-overview-event--${severity(event.severity)}`} key={event.id || `${event.ts}-${index}`}>
                                <time>{formatClock(event.ts)}</time>
                                <div><strong>{text(event.title, 'EMS')}</strong><span>{text(event.message || event.reason, 'Zustand aktualisiert')}</span></div>
                            </div>
                        )) : <div className="eos-ems-overview-empty">Noch keine Zustandsänderung im begrenzten Ereignispuffer.</div>
                    ) : (
                        <div className="eos-ems-overview-decision eos-ems-overview-decision--info"><strong>{text(summary.headline, 'EMS aktiv')}</strong><span>{text(summary.reason, 'EOS optimiert die Anlage innerhalb aller Sicherheitsgrenzen.')}</span></div>
                    )}
                </div>
            </div>

            <footer className="eos-ems-overview-footer">
                <span>Diagnose ist rein lesend. Keine Kachel besitzt Schreibhoheit.</span>
            </footer>
        </section>
    );
}
