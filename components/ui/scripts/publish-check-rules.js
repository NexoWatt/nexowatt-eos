'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/scripts/publish-check-rules.ts
 * Quell-Hash: sha256:9e4e4a5b11293149f8f3034de29380b32d1a9390bf8d2ad1bcdbf30a26fd8004
 * Erzeugung: npm run sync:ts-scripts
 *
 * Zweck:
 * Diese JavaScript-Datei ist der Runtime-Spiegel der TypeScript-Quelle.
 * scripts/verify-publish.js lädt diese Datei direkt, damit npm run
 * publish:check weiterhin ohne vorherigen TypeScript-Build läuft.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in der TypeScript-Datei vornehmen.
 * 2. npm run sync:ts-scripts ausführen.
 * 3. npm run test:ts-script-mirrors prüfen.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePackageName = requirePackageName;
exports.requireNodeEngine22 = requireNodeEngine22;
exports.requireNoInstalledFrom = requireNoInstalledFrom;
exports.requireIoCommonBasics = requireIoCommonBasics;
exports.requireNewsLimit = requireNewsLimit;
exports.requireNoTopLevelIoNewsOrVersion = requireNoTopLevelIoNewsOrVersion;
exports.collectPublishRuleErrors = collectPublishRuleErrors;
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
function requirePackageName(pkg) {
    const name = String(pkg.name || '');
    if (!name.startsWith('iobroker.'))
        return { ok: false, message: 'package.json name muss mit "iobroker." beginnen.' };
    if (name !== name.toLowerCase())
        return { ok: false, message: 'package.json name muss lowercase sein.' };
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
function requireNodeEngine22(pkg) {
    const enginesNode = String((pkg.engines && pkg.engines.node) || '');
    if (!enginesNode)
        return { ok: false, message: 'package.json engines.node fehlt.' };
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
function requireNoInstalledFrom(pkg) {
    if (pkg.installedFrom)
        return { ok: false, message: 'package.json darf kein installedFrom enthalten.' };
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
function requireIoCommonBasics(common) {
    const results = [];
    for (const field of ['name', 'version', 'type', 'connectionType', 'dataSource']) {
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
function requireNewsLimit(common, maxEntries = 7) {
    const news = common.news || {};
    const count = news && typeof news === 'object' ? Object.keys(news).length : 0;
    if (count > maxEntries)
        return { ok: false, message: `io-package.json common.news enthält ${count} Einträge; erlaubt/empfohlen sind maximal ${maxEntries}.` };
    return { ok: true };
}
/**
 * Code-Teil: requireNoTopLevelIoNewsOrVersion
 *
 * Zweck:
 * ioBroker erwartet Version und News in `common`. Zusätzliche Top-Level-Felder
 * führen zu unklaren Metadaten und sollten nicht veröffentlicht werden.
 */
function requireNoTopLevelIoNewsOrVersion(io) {
    const results = [];
    if (io.news)
        results.push({ ok: false, message: 'io-package.json enthält zusätzliches top-level news; bitte nur common.news verwenden.' });
    if (io.version)
        results.push({ ok: false, message: 'io-package.json enthält zusätzliches top-level version; bitte common.version verwenden.' });
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
function collectPublishRuleErrors(pkg, io) {
    const common = io.common || {};
    const results = [
        requirePackageName(pkg),
        requireNodeEngine22(pkg),
        requireNoInstalledFrom(pkg),
        ...requireIoCommonBasics(common),
        requireNewsLimit(common),
        ...requireNoTopLevelIoNewsOrVersion(io),
    ];
    return results.filter((item) => !item.ok && item.message).map((item) => String(item.message));
}
