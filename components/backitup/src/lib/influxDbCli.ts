import { isAbsolute } from 'node:path';

export type InfluxVersion = '1.x' | '2.x' | '';
export type InfluxProtocol = 'http' | 'https' | '';

export interface InfluxCliOptions {
    host: string;
    port: number | string;
    dbName: string;
    token: string;
    protocol: InfluxProtocol;
    dbversion: InfluxVersion;
    dbType: 'local' | 'remote';
    exe?: string;
}

export interface InfluxCliInvocation {
    executable: string;
    args: string[];
    env: NodeJS.ProcessEnv;
    warning?: string;
}

function trimQuotes(value: string): string {
    const trimmed = value.trim();
    if (
        trimmed.length >= 2 &&
        ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'")))
    ) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

export function defaultInfluxExecutable(version: InfluxVersion): 'influx' | 'influxd' {
    return version === '1.x' ? 'influxd' : 'influx';
}

/**
 * Accepts the normal binary name or an absolute executable path. Values such as a bucket name or
 * backup directory are ignored and fall back to the default binary instead of being executed.
 */
export function resolveInfluxExecutable(
    configured: string | undefined,
    version: InfluxVersion,
): { executable: string; warning?: string } {
    const fallback = defaultInfluxExecutable(version);
    const value = trimQuotes(configured || '');

    if (!value || value === fallback || isAbsolute(value)) {
        return { executable: value || fallback };
    }

    return {
        executable: fallback,
        warning:
            `Der konfigurierte InfluxDB-CLI-Pfad „${value}“ ist weder ein absoluter Dateipfad noch „${fallback}“. ` +
            `Der Wert wird ignoriert; verwendet wird „${fallback}“. Das Feld ist kein Sicherungsverzeichnis.`,
    };
}

export function validateInfluxCliOptions(options: InfluxCliOptions): void {
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

function remoteHost(options: InfluxCliOptions): string {
    return `${options.protocol}://${options.host}:${options.port}`;
}

export function buildInfluxBackupInvocation(options: InfluxCliOptions, targetDirectory: string): InfluxCliInvocation {
    validateInfluxCliOptions(options);
    const resolved = resolveInfluxExecutable(options.exe, options.dbversion);
    const args: string[] = [];
    const env: NodeJS.ProcessEnv = { ...process.env };

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
    } else {
        args.push('backup', '-portable', '-database', String(options.dbName).trim());
        if (options.dbType === 'remote') {
            args.push('-host', `${options.host}:${options.port}`);
        }
        args.push(targetDirectory);
    }

    return { executable: resolved.executable, args, env, warning: resolved.warning };
}

export function buildInfluxRestoreInvocation(options: InfluxCliOptions, sourceDirectory: string): InfluxCliInvocation {
    validateInfluxCliOptions(options);
    const resolved = resolveInfluxExecutable(options.exe, options.dbversion);
    const args: string[] = [];
    const env: NodeJS.ProcessEnv = { ...process.env };

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
    } else {
        args.push('restore', '-portable', '-db', String(options.dbName).trim());
        if (options.dbType === 'remote') {
            args.push('-host', `${options.host}:${options.port}`);
        }
        args.push(sourceDirectory);
    }

    return { executable: resolved.executable, args, env, warning: resolved.warning };
}

export function formatInfluxCliError(error: unknown, executable: string, version: InfluxVersion): string {
    const failure = error as NodeJS.ErrnoException & { stderr?: string | Buffer; stdout?: string | Buffer };
    if (failure?.code === 'ENOENT') {
        const expected = defaultInfluxExecutable(version);
        return (
            `Die InfluxDB-CLI „${executable}“ wurde nicht gefunden. ` +
            `Installieren Sie die zu InfluxDB passende CLI oder tragen Sie den absoluten Pfad zur Datei „${expected}“ ein.`
        );
    }

    const stderr = failure?.stderr ? String(failure.stderr).trim() : '';
    const message = stderr || failure?.message || String(error);
    return `InfluxDB-CLI „${executable}“ meldet einen Fehler: ${message}`;
}
