// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: packages/eos-license-client/eos-platform.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * packages/eos-license-client/eos-platform.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 570c35a28648d4448c6111450b74687633f11f4b33f971bb4f45156469e1ef5a
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

// Local installation admission, not DRM or a sandbox against root/runtime code
// changes. The installed release is separately signature-checked before startup.
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const STATE = '/etc/nexowatt-eos/release-state.json';
const RELEASES = '/opt/nexowatt/eos/releases';
const CURRENT = '/opt/nexowatt/eos/current';
/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const fail = code => { throw Object.assign(new Error(code), { code }); };
/**
 * Code-Teil: record
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/**
 * Code-Teil: exact
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const exact = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
/**
 * Code-Teil: version
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const version = value => typeof value === 'string' && value.length <= 80 && /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/.test(value);
/**
 * Code-Teil: relative
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const relative = value => typeof value === 'string' && value.length < 512 && !/[\\\x00-\x1f\x7f]/.test(value)
    && !path.isAbsolute(value) && value.split('/').every(part => part && part !== '.' && part !== '..') && /\.(?:cjs|mjs|js)$/.test(value);

/**
 * Code-Teil: rootOwned
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function rootOwned(file, directory = false) {
    let cursor = path.parse(file).root;
    for (const part of ['', ...file.slice(cursor.length).split(path.sep).filter(Boolean)]) {
        if (part) cursor = path.join(cursor, part);
        const stat = fs.lstatSync(cursor);
        const isDirectory = cursor !== file || directory;
        if (stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o022)
            || (isDirectory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1)) fail('EOS_PLATFORM_PERMISSIONS');
    }
}

/**
 * Code-Teil: load
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function load(file, maximum = 32768) {
    rootOwned(file);
    const before = fs.lstatSync(file);
    const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.uid !== 0 || (stat.mode & 0o022) || stat.nlink !== 1
            || stat.ino !== before.ino || stat.dev !== before.dev) fail('EOS_PLATFORM_PERMISSIONS');
        if (stat.size < 2 || stat.size > maximum) fail('EOS_PLATFORM_FORMAT');
        const bytes = Buffer.alloc(maximum + 1);
        let used = 0;
        while (used < bytes.length) {
            const count = fs.readSync(fd, bytes, used, bytes.length - used, null);
            if (!count) break;
            used += count;
        }
        if (used > maximum) fail('EOS_PLATFORM_FORMAT');
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, used)));
    } finally { fs.closeSync(fd); }
}

/** Verify the current process is an admitted adapter in the active root-managed EOS release. */
function assertEosPlatform(adapterName) {
    try {
        if (process.platform !== 'linux') fail('EOS_PLATFORM_UNSUPPORTED');
        if (typeof adapterName !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(adapterName)) fail('EOS_PLATFORM_ADAPTER');
        const state = load(STATE, 4096);
        if (!exact(state, ['schemaVersion', 'releaseId', 'sequence', 'nodeVersion', 'publicKeySha256', 'profile'])
            || state.schemaVersion !== 1 || state.profile !== 'test' || !/^[a-f0-9]{64}$/.test(state.releaseId)
            || !Number.isSafeInteger(state.sequence) || state.sequence < 1
            || state.nodeVersion !== process.versions.node || !/^[a-f0-9]{64}$/.test(state.publicKeySha256)) fail('EOS_PLATFORM_STATE');
        const release = path.join(RELEASES, state.releaseId);
        rootOwned(path.dirname(CURRENT), true);
        const current = fs.lstatSync(CURRENT);
        // Only this installer-managed pointer may be a symlink; its protected
        // parent, owner and exact target bind metadata to the active release.
        if (!current.isSymbolicLink() || current.uid !== 0 || current.nlink !== 1
            || fs.readlinkSync(CURRENT) !== release) fail('EOS_PLATFORM_CURRENT');
        const modules = path.join(release, 'app/node_modules');
        const profile = load(path.join(modules, 'iobroker.js-controller/eos-test-profile.json'));
        if (!exact(profile, ['schemaVersion', 'kind', 'controllerVersion', 'adapters']) || profile.schemaVersion !== 1
            || profile.kind !== 'eos-controller-test-profile' || !version(profile.controllerVersion)
            || !Array.isArray(profile.adapters) || profile.adapters.length > 128) fail('EOS_PLATFORM_PROFILE');
        const seen = new Set();
        for (const entry of profile.adapters) {
            if (!exact(entry, ['package', 'version', 'main']) || typeof entry.package !== 'string'
                || !/^iobroker\.[a-z][a-z0-9_-]{0,63}$/.test(entry.package)
                || ['iobroker.javascript', 'iobroker.js-controller'].includes(entry.package)
                || !version(entry.version) || !relative(entry.main) || seen.has(entry.package)) fail('EOS_PLATFORM_PROFILE');
            seen.add(entry.package);
        }
        const entry = profile.adapters.find(item => item.package === `iobroker.${adapterName}`);
        if (!entry) fail('EOS_PLATFORM_NOT_ADMITTED');
        const directory = path.join(modules, entry.package);
        const main = path.join(directory, entry.main);
        // A copied package or a spoofed bus sender outside this release cannot
        // pass merely because a genuine EOS installation exists on the host.
        if (!require.main || require.main.filename !== main) fail('EOS_PLATFORM_ENTRY');
        rootOwned(main);
        const manifest = load(path.join(directory, 'package.json'), 65536);
        if (manifest.name !== entry.package || manifest.version !== entry.version || manifest.main !== entry.main) fail('EOS_PLATFORM_PACKAGE');
        const controller = load(path.join(modules, 'iobroker.js-controller/package.json'), 65536);
        if (controller.name !== 'iobroker.js-controller' || controller.version !== profile.controllerVersion) fail('EOS_PLATFORM_CONTROLLER');
        return true;
    } catch (error) {
        if (/^EOS_PLATFORM_[A-Z_]+$/.test(error?.code || '')) throw error;
        fail('EOS_PLATFORM_UNAVAILABLE');
    }
}

module.exports = Object.freeze({ assertEosPlatform });
