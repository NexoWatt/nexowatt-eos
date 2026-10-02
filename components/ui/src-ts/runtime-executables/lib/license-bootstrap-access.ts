// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Begrenzt den Zugang einer noch nicht lizenzierten Anlage auf die autorisierte Lizenz-Einrichtung.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/license-bootstrap-access.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Minimaler Bootstrap-Vertrag für die EOS-Lizenzaktivierung.
 *
 * Die allgemeine EOS-Lizenzsperre darf ausschließlich die hier aufgeführten
 * Seiten, statischen Hilfsdateien und streng geschützten Auth-/Lizenz-Endpunkte
 * passieren lassen. Die Lizenzdaten bleiben weiterhin durch `license.manage`
 * geschützt; freigegeben wird nur der technische Weg zur Anmeldung und
 * Aktivierung eines neuen Systems.
 */

interface LicenseBootstrapRequestLike {
  method?: unknown;
  path?: unknown;
  originalUrl?: unknown;
  url?: unknown;
}

const LICENSE_BOOTSTRAP_GET_PATHS = new Set<string>([
  '/license',
  '/license.html',
  '/static/license.html',
  '/static/styles.css',
  '/static/auth.js',
  '/static/nw-i18n.js',
  '/static/license.js',
  '/static/nexowatt-logo.png',
  '/static/i18n/de.json',
  '/static/i18n/nl.json',
  '/static/i18n/en.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
]);

const LICENSE_BOOTSTRAP_API_METHODS = new Map<string, ReadonlySet<string>>([
  ['/api/strict-auth/status', new Set(['GET', 'HEAD', 'OPTIONS'])],
  ['/api/strict-auth/login', new Set(['POST', 'OPTIONS'])],
  ['/api/strict-auth/logout', new Set(['POST', 'OPTIONS'])],
  ['/api/locale', new Set(['GET', 'HEAD', 'OPTIONS'])],
  ['/api/license/info', new Set(['GET', 'HEAD', 'OPTIONS'])],
  ['/api/license/save', new Set(['POST', 'OPTIONS'])],
]);

function normalizeLicenseBootstrapPath(req: LicenseBootstrapRequestLike | null | undefined): string {
  const raw = String(req?.path || req?.originalUrl || req?.url || '').trim();
  const separatorIndex = raw.search(/[?#]/);
  let pathname = (separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw) || '/';
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  return pathname;
}

/**
 * Liefert nur für den eng begrenzten Lizenz-Bootstrap `true`.
 * Andere EOS-Seiten, APIs und Konfigurationsdaten bleiben ohne gültige Lizenz
 * unverändert gesperrt.
 */
export function isUnlicensedLicenseBootstrapRequest(
  req: LicenseBootstrapRequestLike | null | undefined,
): boolean {
  const pathname = normalizeLicenseBootstrapPath(req);
  const method = String(req?.method || 'GET').trim().toUpperCase() || 'GET';

  if ((method === 'GET' || method === 'HEAD') && LICENSE_BOOTSTRAP_GET_PATHS.has(pathname)) return true;
  const apiMethods = LICENSE_BOOTSTRAP_API_METHODS.get(pathname);
  return !!apiMethods && apiMethods.has(method);
}

export const LICENSE_BOOTSTRAP_CONTRACT = Object.freeze({
  getPaths: Object.freeze(Array.from(LICENSE_BOOTSTRAP_GET_PATHS)),
  apiPaths: Object.freeze(Array.from(LICENSE_BOOTSTRAP_API_METHODS.keys())),
});
