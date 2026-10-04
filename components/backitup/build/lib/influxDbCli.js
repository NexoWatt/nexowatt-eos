"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultInfluxExecutable = defaultInfluxExecutable;
exports.resolveInfluxExecutable = resolveInfluxExecutable;
exports.validateInfluxCliOptions = validateInfluxCliOptions;
exports.buildInfluxBackupInvocation = buildInfluxBackupInvocation;
exports.buildInfluxRestoreInvocation = buildInfluxRestoreInvocation;
exports.formatInfluxCliError = formatInfluxCliError;
const node_path_1 = require("node:path");
function trimQuotes(value) {
    const trimmed = value.trim();
    if (trimmed.length >= 2 &&
        ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}
function defaultInfluxExecutable(version) {
    return version === '1.x' ? 'influxd' : 'influx';
}
/**
 * Accepts the normal binary name or an absolute executable path. Values such as a bucket name or
 * backup directory are ignored and fall back to the default binary instead of being executed.
 */
function resolveInfluxExecutable(configured, version) {
    const fallback = defaultInfluxExecutable(version);
    const value = trimQuotes(configured || '');
    if (!value || value === fallback || (0, node_path_1.isAbsolute)(value)) {
        return { executable: value || fallback };
    }
    return {
        executable: fallback,
        warning: `Der konfigurierte InfluxDB-CLI-Pfad „${value}“ ist weder ein absoluter Dateipfad noch „${fallback}“. ` +
            `Der Wert wird ignoriert; verwendet wird „${fallback}“. Das Feld ist kein Sicherungsverzeichnis.`,
    };
}
function validateInfluxCliOptions(options) {
    if (options.dbversion !== '1.x' && options.dbversion !== '2.x') {
        throw new Error('InfluxDB-Version fehlt oder ist ungültig. Erlaubt sind 1.x und 2.x.');
    }
    if (!String(options.dbName || '').trim()) {
        throw new Error(options.dbversion === '2.x' ? 'Der InfluxDB-Bucketname fehlt.' : 'Der InfluxDB-Datenbankname fehlt.');
    }
    if (options.dbversion === '2.x' && !String(options.token || '').trim()) {
        throw new Error('Der InfluxDB-2.x-Token fehlt. Bitte den Root-/Operator-Token in den Instanzeinstellungen eintragen.');
    }
    if (options.dbType !== 'local' && options.dbType !== 'remote') {
        throw new Error('Der InfluxDB-Quelltyp muss „Lokal“ oder „Remote“ sein.');
    }
    if (options.dbType === 'remote') {
        if (!String(options.host || '').trim()) {
            throw new Error('Der Host der entfernten InfluxDB fehlt.');
        }
        if (options.dbversion === '2.x' && options.protocol !== 'http' && options.protocol !== 'https') {
            throw new Error('Für eine entfernte InfluxDB 2.x muss HTTP oder HTTPS ausgewählt sein.');
        }
    }
}
function remoteHost(options) {
    return `${options.protocol}://${options.host}:${options.port}`;
}
function buildInfluxBackupInvocation(options, targetDirectory) {
    validateInfluxCliOptions(options);
    const resolved = resolveInfluxExecutable(options.exe, options.dbversion);
    const args = [];
    const env = { ...process.env };
    if (options.dbversion === '2.x') {
        args.push('backup', '--bucket', String(options.dbName).trim());
        if (options.dbType === 'remote') {
            args.push('--host', remoteHost(options));
            if (options.protocol === 'https') {
                args.push('--skip-verify');
            }
        }
        args.push(targetDirectory);
        env.INFLUX_TOKEN = String(options.token).trim();
    }
    else {
        args.push('backup', '-portable', '-database', String(options.dbName).trim());
        if (options.dbType === 'remote') {
            args.push('-host', `${options.host}:${options.port}`);
        }
        args.push(targetDirectory);
    }
    return { executable: resolved.executable, args, env, warning: resolved.warning };
}
function buildInfluxRestoreInvocation(options, sourceDirectory) {
    validateInfluxCliOptions(options);
    const resolved = resolveInfluxExecutable(options.exe, options.dbversion);
    const args = [];
    const env = { ...process.env };
    if (options.dbversion === '2.x') {
        args.push('restore', '--bucket', String(options.dbName).trim());
        if (options.dbType === 'remote') {
            args.push('--host', remoteHost(options));
            if (options.protocol === 'https') {
                args.push('--skip-verify');
            }
        }
        args.push(sourceDirectory);
        env.INFLUX_TOKEN = String(options.token).trim();
    }
    else {
        args.push('restore', '-portable', '-db', String(options.dbName).trim());
        if (options.dbType === 'remote') {
            args.push('-host', `${options.host}:${options.port}`);
        }
        args.push(sourceDirectory);
    }
    return { executable: resolved.executable, args, env, warning: resolved.warning };
}
function formatInfluxCliError(error, executable, version) {
    const failure = error;
    if (failure?.code === 'ENOENT') {
        const expected = defaultInfluxExecutable(version);
        return (`Die InfluxDB-CLI „${executable}“ wurde nicht gefunden. ` +
            `Installieren Sie die zu InfluxDB passende CLI oder tragen Sie den absoluten Pfad zur Datei „${expected}“ ein.`);
    }
    const stderr = failure?.stderr ? String(failure.stderr).trim() : '';
    const message = stderr || failure?.message || String(error);
    return `InfluxDB-CLI „${executable}“ meldet einen Fehler: ${message}`;
}
