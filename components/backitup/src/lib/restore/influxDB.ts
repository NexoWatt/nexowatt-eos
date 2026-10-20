import { execFile } from 'node:child_process';
import { chmodSync, lstatSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { removeSync } from 'fs-extra';

import { buildInfluxRestoreInvocation, formatInfluxCliError, maskInfluxToken } from '../influxDbCli';
import { decompressAsync } from '../targz';
import type { BackItUpContext } from '../types';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

/** Both are validated by the command builder below, so the empty string is part of the domain. */
type InfluxProtocol = 'http' | 'https' | '';
type InfluxVersion = '1.x' | '2.x' | '';

interface InfluxDbEvent {
    host: string;
    port: number | string;
    dbName: string;
    nameSuffix: string;
    token: string;
    protocol: InfluxProtocol;
    dbversion: InfluxVersion;
}

interface InfluxDbRestoreOptions extends BackItUpRestoreOptions {
    host: string;
    port: number | string;
    dbName: string;
    token: string;
    protocol: InfluxProtocol;
    dbversion: InfluxVersion;
    dbType: 'local' | 'remote';
    /** path to the influx/influxd binary; falls back to the one on PATH */
    exe?: string;
    /** drop the database before restoring - only honoured for local instances */
    deleteDatabase?: boolean;
    influxDBMulti?: boolean;
    influxDBEvents: InfluxDbEvent[];
    nameSuffix?: string;
}

/** Presence/size preflight only; this cannot guarantee that database replay will succeed. */
function requireDropArchiveFiles(manifest: { meta?: unknown; files: unknown[] }, directory: string): void {
    for (const entry of [manifest.meta, ...manifest.files]) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE');
        const file = entry as { fileName?: unknown; size?: unknown };
        if (typeof file.fileName !== 'string' || !/^[A-Za-z0-9._-]+$/.test(file.fileName) ||
            file.fileName === '.' || file.fileName === '..' || !Number.isSafeInteger(file.size) || Number(file.size) <= 0) {
            throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE');
        }
        let info;
        try { info = lstatSync(join(directory, file.fileName)); }
        catch { throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE'); }
        if (!info.isFile() || info.size !== file.size) throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE');
    }
}

/** Validate one archive target before any destructive command and select its configuration. */
function restoreTarget(options: InfluxDbRestoreOptions, directory: string): InfluxDbRestoreOptions {
    const names = new Set<string>();
    const versions = new Set<InfluxVersion>();
    for (const file of readdirSync(directory)) {
        if (!file.endsWith('.manifest')) continue;
        const path = join(directory, file);
        const info = lstatSync(path);
        if (!info.isFile() || info.size > 1024 * 1024) throw new Error('INFLUX_MANIFEST_INVALID');
        let manifest;
        try { manifest = JSON.parse(readFileSync(path, 'utf8')); }
        catch { throw new Error('INFLUX_MANIFEST_INVALID'); }
        if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('INFLUX_MANIFEST_INVALID');
        if (Boolean(manifest.files) === Boolean(manifest.buckets)) throw new Error('INFLUX_MANIFEST_INVALID');
        const rows = manifest.files || manifest.buckets;
        const key = manifest.files ? 'database' : 'bucketName';
        versions.add(manifest.files ? '1.x' : '2.x');
        if (!Array.isArray(rows) || !rows.length || rows.length > 10000) throw new Error('INFLUX_MANIFEST_INVALID');
        if (manifest.files && options.deleteDatabase && options.dbType === 'local') requireDropArchiveFiles(manifest, directory);
        for (const row of rows) {
            if (!row || typeof row[key] !== 'string' || !row[key].trim()) throw new Error('INFLUX_MANIFEST_INVALID');
            names.add(row[key]);
        }
    }
    if (names.size !== 1) throw new Error('INFLUX_MANIFEST_TARGET_AMBIGUOUS');
    const dbName = [...names][0];
    if (!options.influxDBMulti) {
        if (dbName !== String(options.dbName || '').trim()) throw new Error('INFLUX_MANIFEST_TARGET_MISMATCH');
        if (versions.size !== 1 || !versions.has(options.dbversion)) throw new Error('INFLUX_MANIFEST_VERSION_MISMATCH');
        return { ...options };
    }
    if (!Array.isArray(options.influxDBEvents)) throw new Error('INFLUX_CONFIG_TARGET_AMBIGUOUS');
    const targets = options.influxDBEvents.filter(item => item.dbName === dbName);
    if (targets.length !== 1) throw new Error('INFLUX_CONFIG_TARGET_AMBIGUOUS');
    if (versions.size !== 1 || !versions.has(targets[0].dbversion)) throw new Error('INFLUX_MANIFEST_VERSION_MISMATCH');
    return { ...options, ...targets[0], dbName };
}

async function replayInfluxDB(ctx: BackItUpContext, options: InfluxDbRestoreOptions, directory: string): Promise<void> {
    const target = restoreTarget(options, directory);
    const invocation = buildInfluxRestoreInvocation(target, directory);
    const scrub = (value: unknown): string => maskInfluxToken(maskInfluxToken(value, target.token), options.token);
    if (invocation.warning) ctx.log.warn(scrub(invocation.warning));
    const execute = (executable: string, args: string[]): Promise<void> => new Promise((resolve, reject) => {
        execFile(executable, args, { maxBuffer: 10 * 1024 * 1024, env: invocation.env }, (error, stdout, stderr) => {
            if (stdout?.trim()) ctx.log.debug(scrub(stdout.trim()));
            if (stderr?.trim()) ctx.log.debug(scrub(stderr.trim()));
            if (error) reject(new Error(scrub(formatInfluxCliError(
                Object.assign(error, { stdout, stderr }), executable, target.dbversion,
            ))));
            else resolve();
        });
    });
    if (target.deleteDatabase && target.dbType === 'local' && target.dbversion === '1.x') {
        if (/[\r\n\0]/.test(target.dbName)) throw new Error('INFLUX_DATABASE_NAME_INVALID');
        const escaped = target.dbName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        await execute('influx', [`-execute=DROP DATABASE "${escaped}"`]);
    }
    await execute(invocation.executable, invocation.args);
}

/**
 * Restore never claims to stop an adapter by writing its informational .alive
 * state. The operator must disable existing Influx adapters first; an active or
 * auto-restarting writer is refused before extraction or a destructive command.
 */
async function requireStoppedWriters(ctx: BackItUpContext): Promise<void> {
    const adapter = ctx.adapter;
    if (!adapter) throw new Error('INFLUX_RESTORE_ADAPTER_REQUIRED');
    const result = await adapter.getObjectViewAsync('system', 'instance', {
        startkey: 'system.adapter.influxdb.', endkey: 'system.adapter.influxdb.香',
    });
    if (!result || !Array.isArray(result.rows)) throw new Error('INFLUX_RESTORE_INSTANCE_QUERY_FAILED');
    for (const row of result.rows) {
        const id = row.value?._id;
        if (typeof id !== 'string' || !/^system\.adapter\.influxdb\.\d+$/.test(id)) {
            throw new Error('INFLUX_RESTORE_INSTANCE_INVALID');
        }
        const object = await adapter.getForeignObjectAsync(id);
        const state = await adapter.getForeignStateAsync(`${id}.alive`);
        if (!object || object.common?.enabled !== false || state?.val !== false || state.ack !== true) {
            throw new Error('INFLUX_RESTORE_STOP_WRITERS_REQUIRED');
        }
    }
}

export async function restore(props: BackItUpRestoreProps<InfluxDbRestoreOptions>): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    let directory: string | undefined;
    try {
        await requireStoppedWriters(ctx);
        directory = mkdtempSync(join(options.backupDir, '.influxDB-restore-'));
        chmodSync(directory, 0o700);
        await decompressAsync({ src: fileName, dest: directory, tar: {
            map: header => {
                header.mode = header.type === 'directory' ? 0o700 : 0o600;
                return header;
            },
        } });
        // Extraction can be lengthy. Recheck immediately before manifest
        // validation and CLI replay, including an optional local V1 DROP.
        await requireStoppedWriters(ctx);
        await replayInfluxDB(ctx, options, directory);
        ctx.log.debug('influxDB Restore completed successfully');
        return 'influxDB restore done';
    } catch (error) {
        let message = maskInfluxToken(error instanceof Error ? error.message : error, options.token);
        for (const event of options.influxDBEvents || []) message = maskInfluxToken(message, event.token);
        const failure = new Error(message);
        ctx.errors.influxDB = failure.toString();
        ctx.log.error(message);
        ctx.log.error('influxDB Restore not completed');
        throw failure;
    } finally {
        if (directory) {
            try { removeSync(directory); }
            catch { ctx.log.warn('INFLUX_RESTORE_PRIVATE_TEMP_CLEANUP_FAILED'); }
        }
    }
}

export const isStop = false;
