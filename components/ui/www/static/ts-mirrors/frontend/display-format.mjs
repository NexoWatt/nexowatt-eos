/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/frontend/display-format.ts
 * Quell-Hash: sha256:085d757f788f52c460062c7da2bec3efad7b35344f013161443c1581db8692ce
 * Erzeugung: npm run sync:ts-frontend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein browsernaher JavaScript-Modulspiegel der TypeScript-Quelle.
 * Diese Datei kann produktiv importiert werden, wenn der zugehörige Browsercode
 * bereits auf den jeweiligen TS-Helfer umgestellt wurde.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/frontend/*.ts vornehmen.
 * 2. npm run sync:ts-frontend-mirrors ausführen.
 * 3. npm run test:ts-frontend-mirrors prüfen.
 */
/**
 * Code-Teil: toFiniteNumber
 *
 * Zweck:
 * Normalisiert unbekannte Eingaben aus States/API-Antworten auf `number | null`.
 *
 * Zusammenhang:
 * Frontend-Werte kommen oft als Zahl, String oder leerer Wert aus `/api/state`.
 * Diese Funktion ist der erste kleine Baustein, damit spätere UI-Formatter nicht
 * überall selbst `Number(...)` und `isFinite(...)` schreiben müssen.
 */
export function toFiniteNumber(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
/**
 * Code-Teil: choosePowerDisplayUnit
 *
 * Zweck:
 * Entscheidet anhand eines Wattwertes, ob die Anzeige in W, kW oder MW erfolgen soll.
 *
 * Zusammenhang:
 * Diese Regel wird später in LIVE, History und App-Center gleich genutzt. Dadurch
 * vermeiden wir Abweichungen wie einmal "1400 W" und einmal "1.4 kW" für dieselbe Größe.
 */
export function choosePowerDisplayUnit(watt) {
    const abs = Math.abs(Number(watt) || 0);
    if (abs >= 1_000_000)
        return 'MW';
    if (abs >= 1_000)
        return 'kW';
    return 'W';
}
/**
 * Code-Teil: formatPowerValue
 *
 * Zweck:
 * Formatiert eine Leistung in Watt für das Frontend.
 *
 * Wichtig:
 * `0 W` ist ein gültiger Wert und darf nicht als fehlend angezeigt werden. Genau diese
 * Regel war bei Speicher-/EVCS-Werten mehrfach kritisch.
 */
export function formatPowerValue(value, options = {}) {
    const n = toFiniteNumber(value);
    const tone = options.tone ?? 'neutral';
    if (n === null)
        return { text: '—', value: null, unit: 'W', tone };
    const sign = options.signed && n > 0 ? '+' : '';
    const unit = choosePowerDisplayUnit(n);
    const decimals = Math.max(0, Math.min(3, Math.round(options.decimals ?? 1)));
    if (unit === 'MW')
        return { text: `${sign}${(n / 1_000_000).toFixed(decimals)} MW`, value: n, unit, tone };
    if (unit === 'kW')
        return { text: `${sign}${(n / 1_000).toFixed(decimals)} kW`, value: n, unit, tone };
    return { text: `${sign}${Math.round(n)} W`, value: n, unit, tone };
}
/**
 * Code-Teil: formatEnergyValue
 *
 * Zweck:
 * Formatiert Energie in kWh/MWh für History und KPI-Kacheln.
 *
 * Zusammenhang:
 * Die History und die KPI-Kacheln zeigen Tages-, Jahres- und Gesamtwerte. Diese Funktion
 * hält fest, wann wir kWh oder MWh anzeigen, ohne die Rohwerte zu verändern.
 */
export function formatEnergyValue(value, tone = 'neutral') {
    const n = toFiniteNumber(value);
    if (n === null)
        return { text: '—', value: null, unit: 'kWh', tone };
    if (Math.abs(n) >= 1_000)
        return { text: `${(n / 1_000).toFixed(2)} MWh`, value: n, unit: 'MWh', tone };
    return { text: `${n.toFixed(1)} kWh`, value: n, unit: 'kWh', tone };
}
/**
 * Code-Teil: formatPercentValue
 *
 * Zweck:
 * Formatiert Prozentwerte für SoC, Autarkie, Eigenverbrauch und Prognosequalität.
 *
 * Wichtig:
 * Der Formatter begrenzt Werte standardmäßig auf 0–100 %, weil viele UI-Elemente damit
 * Fortschrittsbalken steuern. Rohdaten bleiben davon unberührt.
 */
export function formatPercentValue(value, tone = 'neutral', clamp = true) {
    const n = toFiniteNumber(value);
    if (n === null)
        return { text: '—', value: null, unit: '%', tone };
    const pct = clamp ? Math.max(0, Math.min(100, n)) : n;
    return { text: `${Math.round(pct)} %`, value: pct, unit: '%', tone };
}
/**
 * Code-Teil: toneForGridImportExport
 *
 * Zweck:
 * Liefert eine UI-Tonalität für Netzwerte.
 *
 * Zusammenhang:
 * Netzbezug ist in der VIS meistens kritisch/rot, Einspeisung meistens positiv/grün.
 * Diese Zuordnung ist reine Darstellung und ändert keine Energieflusswerte.
 */
export function toneForGridImportExport(kind, watt) {
    const n = Math.max(0, toFiniteNumber(watt) ?? 0);
    if (n <= 0)
        return 'neutral';
    return kind === 'import' ? 'bad' : 'good';
}
/**
 * Code-Teil: formatPowerW
 *
 * Zweck:
 * Kompatibler Text-Formatter für ältere TypeScript-Vorbereitungsdateien.
 *
 * Zusammenhang:
 * Frühere TS-Scaffold-Dateien importieren bereits `formatPowerW`. Damit der neue
 * 0.7.65-Formatter keinen alten TS-Vorbereitungsstand bricht, bleibt dieser Alias
 * erhalten und delegiert auf `formatPowerValue`.
 */
export function formatPowerW(value, options = {}) {
    const formatOptions = options.digits === undefined
        ? { signed: options.showPositiveSign === true }
        : { signed: options.showPositiveSign === true, decimals: options.digits };
    return formatPowerValue(value, formatOptions).text;
}
/**
 * Code-Teil: clampPercent
 *
 * Zweck:
 * Begrenzung eines Prozentwerts auf 0–100 für Fortschrittsbalken.
 *
 * Wichtig:
 * `null` bedeutet bewusst „kein Prozentwert vorhanden“. `0` bleibt gültig.
 */
export function clampPercent(value) {
    const n = toFiniteNumber(value);
    if (n === null)
        return null;
    return Math.max(0, Math.min(100, n));
}
/**
 * Code-Teil: formatPercent
 *
 * Zweck:
 * Kompatibler String-Formatter für ältere TS-Anzeigevorbereitungen.
 */
export function formatPercent(value) {
    return formatPercentValue(value).text;
}
/**
 * Code-Teil: formatEnergyKwh
 *
 * Zweck:
 * Kompatibler String-Formatter für kWh-Werte in History-/KPI-Vorbereitungen.
 */
export function formatEnergyKwh(value) {
    return formatEnergyValue(value).text;
}
