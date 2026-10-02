/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt optionale Vergleiche erzeugter Browser-Helfer mit dem bisherigen Laufzeitverhalten.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/runtime-shadow.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/frontend/runtime-shadow.ts
 *
 * Zweck:
 * Bereitet eine optionale Laufzeit-Schattenprüfung der browsernahen TypeScript-Spiegel vor.
 * Diese Datei ist ein sicherer Zwischenschritt der Migration: Sie kann die erzeugten MJS-
 * Spiegel im Browser oder in Node importieren, verändert aber keine UI-Werte und keine
 * produktive Adapterlogik.
 *
 * Zusammenhang:
 * - Quelle liegt in `src-ts/frontend/runtime-shadow.ts`.
 * - Spiegel liegt später in `www/static/ts-mirrors/frontend/runtime-shadow.mjs`.
 * - Der Check nutzt die bereits erzeugten MJS-Spiegel wie `display-format.mjs`,
 *   `customer-feature-visibility.mjs` und `history-controls.mjs`.
 *
 * Wichtig für spätere Änderungen:
 * Diese Datei darf keine DOM-Pflichtabhängigkeit bekommen. Sie muss mit Node importierbar
 * bleiben, damit unsere Mirror-Runtime-Checks auch ohne Browser laufen.
 */

/** Ergebnis eines einzelnen Shadow-Checks. */
export interface FrontendTsShadowDetail {
  /** Technischer Name des geprüften Teilbereichs. */
  readonly key: string;
  /** Ob dieser Teilbereich erwartungsgemäß funktioniert hat. */
  readonly ok: boolean;
  /** Kurzer deutscher Hinweis für Log/Diagnose. */
  readonly messageDe: string;
}

/** Gesamtergebnis der optionalen Frontend-Shadow-Prüfung. */
export interface FrontendTsShadowReport {
  /** True, wenn alle Einzelprüfungen erfolgreich waren. */
  readonly ok: boolean;
  /** Kurzer Berichtstext für Entwicklerkonsole oder Diagnose. */
  readonly summaryDe: string;
  /** Einzelprüfungen, damit man Abweichungen später schnell findet. */
  readonly details: ReadonlyArray<FrontendTsShadowDetail>;
}

/**
 * Code-Teil: normalizeMirrorBaseUrl
 *
 * Zweck:
 * Normalisiert die Basis-URL für dynamische MJS-Imports.
 *
 * Zusammenhang:
 * Im Browser wird später z. B. `/static/ts-mirrors/frontend/` genutzt. In Node-Tests
 * wird dagegen eine `file://.../frontend/`-URL übergeben. Beide Varianten müssen am
 * Ende mit `/` enden, damit `base + "display-format.mjs"` gültig ist.
 */
export function normalizeMirrorBaseUrl(baseUrl: string): string {
  const raw = String(baseUrl || '').trim();
  const fallback = '/static/ts-mirrors/frontend/';
  const value = raw || fallback;
  return value.endsWith('/') ? value : `${value}/`;
}

/**
 * Code-Teil: shouldRunFrontendTsMirrorShadow
 *
 * Zweck:
 * Entscheidet, ob die optionale Shadow-Prüfung aktiv werden soll.
 *
 * Zusammenhang:
 * Produktiv soll diese Prüfung nicht automatisch laufen. Sie ist nur ein Diagnosewerkzeug
 * für Entwickler, z. B. über `?tsMirror=1` oder `?tsShadow=1`.
 */
export function shouldRunFrontendTsMirrorShadow(queryString: string | undefined): boolean {
  const query = String(queryString || '').replace(/^\?/, '').toLowerCase();
  if (!query) return false;
  return query.split('&').some((part) => {
    const [key, value = ''] = part.split('=').map((x) => decodeURIComponent(x || '').trim().toLowerCase());
    return (key === 'tsmirror' || key === 'tsshadow' || key === 'ts-mirror-shadow')
      && (value === '1' || value === 'true' || value === 'on' || value === 'yes');
  });
}

/**
 * Code-Teil: makeDetail
 * Zweck: Baut ein einheitliches Einzelprüfungsobjekt für den Shadow-Bericht.
 */
function makeDetail(key: string, ok: boolean, messageDe: string): FrontendTsShadowDetail {
  return { key, ok, messageDe };
}

/**
 * Code-Teil: runFrontendTsMirrorShadowCheck
 *
 * Zweck:
 * Importiert die erzeugten Frontend-MJS-Spiegel und prüft wenige kritische, bekannte
 * Fehlerfälle aus unserem Projekt.
 *
 * Geprüft wird bewusst nur read-only:
 * - `0 W` muss gültig formatiert werden.
 * - EVCS bleibt ohne echte Wallbox unsichtbar.
 * - History blendet EVCS PDF ohne Wallbox aus.
 *
 * Zusammenhang:
 * Das ist die erste sichere Brücke zwischen TypeScript-Spiegel und späterer Frontend-
 * Runtime. Der Check verändert kein DOM und schreibt keine States.
 */
export async function runFrontendTsMirrorShadowCheck(baseUrl = '/static/ts-mirrors/frontend/'): Promise<FrontendTsShadowReport> {
  const base = normalizeMirrorBaseUrl(baseUrl);
  const details: FrontendTsShadowDetail[] = [];

  const display = await import(`${base}display-format.mjs`);
  const visibility = await import(`${base}customer-feature-visibility.mjs`);
  const history = await import(`${base}history-controls.mjs`);

  const zeroPower = display.formatPowerValue(0);
  details.push(makeDetail(
    'display-zero-power',
    !!zeroPower && zeroPower.text === '0 W',
    '0 W bleibt ein gültiger Anzeigewert.'
  ));

  const features = visibility.buildCustomerFeatureVisibility({
    evcsProofs: [],
    storageFarmEnabled: true,
    storageFarmProofs: [],
    smartHomeEnabled: false,
    weatherEnabled: false,
    aiAdvisorInstalled: true,
    aiAdvisorCustomerEnabled: false,
  });
  details.push(makeDetail(
    'feature-visibility-no-evcs',
    !!features && features.hasEvcs === false,
    'EVCS bleibt ohne echte Wallbox unsichtbar.'
  ));
  details.push(makeDetail(
    'feature-visibility-ai-customer-off',
    !!features && features.hasAiAdvisor === false,
    'KI-Berater respektiert den Kundenschalter Aus.'
  ));

  const toolbar = history.buildHistoryToolbarState({ mode: 'day', hasEvcs: false, hasTariff: true, canLoad: true });
  const evcsPdf = toolbar.actions.find((action: { key: string }) => action.key === 'evcsPdf');
  details.push(makeDetail(
    'history-no-evcs-pdf',
    !!evcsPdf && evcsPdf.visible === false,
    'History blendet EVCS PDF ohne Wallbox aus.'
  ));

  const ok = details.every((detail) => detail.ok);
  return {
    ok,
    summaryDe: ok
      ? 'Frontend-TypeScript-Spiegel liefern erwartete Shadow-Ergebnisse.'
      : 'Mindestens ein Frontend-TypeScript-Spiegel weicht im Shadow-Check ab.',
    details,
  };
}
