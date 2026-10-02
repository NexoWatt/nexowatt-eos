/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Formuliert prüfbare Paket-/Metadatenregeln für die Veröffentlichung des Adapters.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/scripts/publish-check-rules.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/scripts/publish-check-rules.ts
 *
 * Zweck:
 * Diese Datei ist der erste kleine JavaScript-zu-TypeScript-Migrationsschritt
 * für unsere Wartungs-/Release-Skripte. Sie beschreibt und kapselt Regeln, die
 * `scripts/verify-publish.js` beim Prüfen des Pakets verwendet.
 *
 * Zusammenhang im Projekt:
 * - `scripts/verify-publish.js` ist der lokale Publish-/Paket-Checker.
 * - Die JavaScript-Laufzeitdatei `scripts/publish-check-rules.js` enthält dieselbe
 *   Logik für Node.js, damit `publish:check` weiterhin ohne TypeScript-Build läuft.
 * - Diese TypeScript-Quelle dient als verständliche, typisierte Vorlage für die
 *   spätere komplette Migration der Wartungsskripte.
 *
 * Build-/Spiegelstrategie ab 0.7.66:
 * - Diese TypeScript-Datei ist die fachliche Quelle für die Publish-Regeln.
 * - `npm run build:script-mirrors` kompiliert diese Datei und aktualisiert
 *   `scripts/publish-check-rules.js`.
 * - `publish:check` läuft weiter ohne TypeScript-Compiler, weil es die
 *   generierte JavaScript-Spiegeldatei nutzt.
 *
 * Wichtig für spätere Änderungen:
 * - Diese Datei darf keine ioBroker-Runtime laden.
 * - Diese Datei darf keine produktive EMS-/VIS-Logik verändern.
 * - Neue Regeln sollten hier zuerst typisiert beschrieben und anschließend in der
 *   JS-Runtime-Spiegeldatei nachgezogen werden, bis die Scripts vollständig aus TS
 *   gebaut werden.
 */

/** Ergebnis einer einzelnen Publish-Prüfregel. */
export interface PublishRuleResult {
  /** `true`, wenn die Regel bestanden wurde. */
  ok: boolean;

  /** Deutsche Fehlermeldung für Menschen, wenn `ok=false` ist. */
  message?: string;
}

/** Minimaler Ausschnitt aus `package.json`, den die Regeln benötigen. */
export interface PackageJsonPublishShape {
  name?: string;
  version?: string;
  engines?: {
    node?: string;
  };
  installedFrom?: string;
}

/** Minimaler Ausschnitt aus `io-package.json/common`, den die Regeln benötigen. */
export interface IoPackageCommonPublishShape {
  name?: string;
  version?: string;
  type?: string;
  connectionType?: string;
  dataSource?: string;
  authors?: unknown;
  adminUI?: {
    config?: string;
  };
  compact?: boolean;
  tier?: number;
  dependencies?: unknown;
  globalDependencies?: unknown;
  licenseInformation?: unknown;
  news?: Record<string, unknown>;
}

/** Minimaler Ausschnitt aus `io-package.json`, den die Regeln benötigen. */
export interface IoPackagePublishShape {
  common?: IoPackageCommonPublishShape;
  news?: unknown;
  version?: string;
  native?: Record<string, unknown>;
}

/**
 * Code-Teil: requirePackageName
 *
 * Zweck:
 * Prüft, ob das npm-Paket nach ioBroker-Konvention benannt ist.
 *
 * Zusammenhang:
 * Diese Regel schützt `npm publish` und den späteren ioBroker-Repository-Prozess.
 * Das Paket muss mit `iobroker.` beginnen und vollständig kleingeschrieben sein.
 *
 * TypeScript-Hinweis:
 * Der Eingabetyp ist absichtlich klein gehalten, damit diese Regel unabhängig von
 * kompletten npm-Typdefinitionen getestet werden kann.
 */
export function requirePackageName(pkg: PackageJsonPublishShape): PublishRuleResult {
  const name = String(pkg.name || '');
  if (!name.startsWith('iobroker.')) return { ok: false, message: 'package.json name muss mit "iobroker." beginnen.' };
  if (name !== name.toLowerCase()) return { ok: false, message: 'package.json name muss lowercase sein.' };
  return { ok: true };
}

/**
 * Code-Teil: requireNodeEngine22
 *
 * Zweck:
 * Prüft die Node.js-Mindestversion für die zukünftige Adapterbasis.
 *
 * Zusammenhang:
 * Unsere TypeScript-/ioBroker-Stabilitätsstrategie basiert auf Node.js 22+.
 * Diese Regel verhindert, dass versehentlich wieder `>=16` oder `>=18` gesetzt wird.
 */
export function requireNodeEngine22(pkg: PackageJsonPublishShape): PublishRuleResult {
  const enginesNode = String((pkg.engines && pkg.engines.node) || '');
  if (!enginesNode) return { ok: false, message: 'package.json engines.node fehlt.' };
  if (!/>=\s*22/.test(enginesNode)) {
    return { ok: false, message: `package.json engines.node sollte für die neue Basis >=22 sein, ist aber '${enginesNode}'.` };
  }
  return { ok: true };
}

/**
 * Code-Teil: requireNoInstalledFrom
 *
 * Zweck:
 * Stellt sicher, dass keine lokale Entwicklungs-/GitHub-Installationsspur im
 * veröffentlichbaren Paket stehen bleibt.
 */
export function requireNoInstalledFrom(pkg: PackageJsonPublishShape): PublishRuleResult {
  if (pkg.installedFrom) return { ok: false, message: 'package.json darf kein installedFrom enthalten.' };
  return { ok: true };
}

/**
 * Code-Teil: requireIoCommonBasics
 *
 * Zweck:
 * Prüft die Pflichtfelder in `io-package.json/common`, die für ioBroker Admin,
 * Adapter-Checker und Repository-Prozess wichtig sind.
 *
 * Zusammenhang:
 * Diese Regel gehört zur ioBroker-Stabilisierung. Fehlende Metadaten führen später
 * zu Checker-Fehlern oder unklaren Anzeigen im Admin.
 */
export function requireIoCommonBasics(common: IoPackageCommonPublishShape): PublishRuleResult[] {
  const results: PublishRuleResult[] = [];
  for (const field of ['name', 'version', 'type', 'connectionType', 'dataSource'] as const) {
    if (common[field] === undefined || common[field] === null || common[field] === '') {
      results.push({ ok: false, message: `io-package.json common.${field} fehlt.` });
    }
  }
  if (!Array.isArray(common.authors) || common.authors.length === 0) {
    results.push({ ok: false, message: 'io-package.json common.authors fehlt oder ist leer.' });
  }
  if (!common.adminUI || common.adminUI.config !== 'json') {
    results.push({ ok: false, message: 'io-package.json common.adminUI.config sollte "json" sein.' });
  }
  if (![1, 2, 3].includes(Number(common.tier))) {
    results.push({ ok: false, message: 'io-package.json common.tier muss 1, 2 oder 3 sein.' });
  }
  if (!Array.isArray(common.dependencies) || common.dependencies.length === 0) {
    results.push({ ok: false, message: 'io-package.json common.dependencies fehlt.' });
  }
  if (!Array.isArray(common.globalDependencies) || common.globalDependencies.length === 0) {
    results.push({ ok: false, message: 'io-package.json common.globalDependencies fehlt.' });
  }
  if (!common.licenseInformation || typeof common.licenseInformation !== 'object') {
    results.push({ ok: false, message: 'io-package.json common.licenseInformation fehlt.' });
  }
  return results.length ? results : [{ ok: true }];
}

/**
 * Code-Teil: requireNewsLimit
 *
 * Zweck:
 * Verhindert zu viele `common.news`-Einträge. Die vollständige Historie gehört in
 * `docs/CHANGELOG.md`, nicht in `io-package.json`.
 */
export function requireNewsLimit(common: IoPackageCommonPublishShape, maxEntries = 7): PublishRuleResult {
  const news = common.news || {};
  const count = news && typeof news === 'object' ? Object.keys(news).length : 0;
  if (count > maxEntries) return { ok: false, message: `io-package.json common.news enthält ${count} Einträge; erlaubt/empfohlen sind maximal ${maxEntries}.` };
  return { ok: true };
}

/**
 * Code-Teil: requireNoTopLevelIoNewsOrVersion
 *
 * Zweck:
 * ioBroker erwartet Version und News in `common`. Zusätzliche Top-Level-Felder
 * führen zu unklaren Metadaten und sollten nicht veröffentlicht werden.
 */
export function requireNoTopLevelIoNewsOrVersion(io: IoPackagePublishShape): PublishRuleResult[] {
  const results: PublishRuleResult[] = [];
  if (io.news) results.push({ ok: false, message: 'io-package.json enthält zusätzliches top-level news; bitte nur common.news verwenden.' });
  if (io.version) results.push({ ok: false, message: 'io-package.json enthält zusätzliches top-level version; bitte common.version verwenden.' });
  return results.length ? results : [{ ok: true }];
}

/**
 * Code-Teil: collectPublishRuleErrors
 *
 * Zweck:
 * Führt mehrere kleine Regeln zusammen. Dadurch kann das JavaScript-Skript später
 * Schritt für Schritt durch typisierte Regeln ersetzt werden.
 *
 * Zusammenhang:
 * `scripts/verify-publish.js` nutzt diese Logik über die JS-Spiegeldatei. Die TS-
 * Datei ist der wartbare Ursprung für die spätere vollständige Skriptmigration.
 */
export function collectPublishRuleErrors(pkg: PackageJsonPublishShape, io: IoPackagePublishShape): string[] {
  const common = io.common || {};
  const results: PublishRuleResult[] = [
    requirePackageName(pkg),
    requireNodeEngine22(pkg),
    requireNoInstalledFrom(pkg),
    ...requireIoCommonBasics(common),
    requireNewsLimit(common),
    ...requireNoTopLevelIoNewsOrVersion(io),
  ];
  return results.filter((item) => !item.ok && item.message).map((item) => String(item.message));
}
