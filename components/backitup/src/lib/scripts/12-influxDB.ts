import { execFile } from 'node:child_process';
import { chmodSync, linkSync, lstatSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { remove } from 'fs-extra';

import { getDate } from '../tools';
import { buildInfluxBackupInvocation, formatInfluxCliError, maskInfluxToken } from '../influxDbCli';
import { compressAsync } from '../targz';
import type { BackItUpContext, BackItUpProps } from '../types';

/** Both are validated below, so the empty string is part of the domain. */
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

interface InfluxDbOptions {
    host: string;
    port: number | string;
    dbName: string;
    token: string;
    protocol: InfluxProtocol;
    dbversion: InfluxVersion;
    dbType: 'local' | 'remote';
    /** path to the influx/influxd binary; falls back to the one on PATH */
    exe?: string;
    influxDBMulti?: boolean;
    influxDBEvents: InfluxDbEvent[];
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/**
 * Dumps the configured InfluxDB bucket(s)/database(s) and packs each dump.
 *
 * As in 30-mysql the callback version reported a dump failure from `startBackup` and then reported
 * success again from here, and lib/execute scheduled all remaining backup steps twice as a result.
 * Awaiting collapses that to a single report.
 *
 * @param props the run context and the influxDB slice of the config
 */
export async function run(props: BackItUpProps<InfluxDbOptions>): Promise<void> {
    const { context: ctx, options } = props;
    if (options.influxDBMulti && (!Array.isArray(options.influxDBEvents) || !options.influxDBEvents.length || options.influxDBEvents.length > 100)) {
        ctx.errors.influxDB = 'INFLUX_BACKUP_TARGETS_INVALID';
        throw new Error('INFLUX_BACKUP_TARGETS_INVALID');
    }
    const targets = options.influxDBMulti ? options.influxDBEvents.map(event => ({ ...options, ...event })) : [options];
    let firstError: Error | undefined;
    for (const target of targets) {
        try {
            await startBackup(ctx, target);
        } catch (error) {
            firstError ??= error as Error;
        }
    }
    if (firstError) throw firstError;
    ctx.done.push('influxDB');
    ctx.types.push('influxDB');
}

/**
 * Dumps one bucket/database and packs the result.
 *
 * @param ctx run context
 * @param options script options, already pointed at the target to dump
 */
async function startBackup(ctx: BackItUpContext, options: InfluxDbOptions): Promise<void> {
    const suffix = options.hostType === 'Slave' && !options.influxDBMulti ? options.slaveSuffix : options.nameSuffix;
    if (suffix && !/^[A-Za-z0-9._-]{1,64}$/.test(suffix)) {
        ctx.errors.influxDB = 'INFLUX_BACKUP_SUFFIX_INVALID';
        throw new Error('INFLUX_BACKUP_SUFFIX_INVALID');
    }
    const fileName = join(ctx.backupDir, `influxDB_${getDate()}${suffix ? `_${suffix}` : ''}_backupiobroker.tar.gz`);
    let workingDirectory: string | undefined;
    try {
        // lstat catches dangling symlinks too. Atomic link below also closes the
        // race where another run creates the destination during compression.
        try {
            lstatSync(fileName);
            throw new Error('INFLUX_BACKUP_TARGET_EXISTS');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        workingDirectory = mkdtempSync(join(ctx.backupDir, '.influxDB-'));
        chmodSync(workingDirectory, 0o700);
        const dumpDirectory = join(workingDirectory, 'dump');
        mkdirSync(dumpDirectory, { mode: 0o700 });
        const invocation = buildInfluxBackupInvocation(options, dumpDirectory);
        if (invocation.warning) ctx.log.warn(maskInfluxToken(invocation.warning, options.token));
        ctx.log.debug('Start InfluxDB Backup ...');
        await new Promise<void>((resolve, reject) => {
            execFile(invocation.executable, invocation.args,
                { maxBuffer: 10 * 1024 * 1024, env: invocation.env },
                (error, stdout, stderr) => {
                    if (stdout?.trim()) ctx.log.debug(maskInfluxToken(stdout.trim(), options.token));
                    if (stderr?.trim()) ctx.log.debug(maskInfluxToken(stderr.trim(), options.token));
                    if (error) {
                        reject(new Error(maskInfluxToken(formatInfluxCliError(
                            Object.assign(error, { stdout, stderr }), invocation.executable, options.dbversion,
                        ), options.token)));
                    } else resolve();
                });
        });
        const temporaryArchive = join(workingDirectory, 'archive.tar.gz');
        await compressAsync({ src: dumpDirectory, dest: temporaryArchive });
        const info = lstatSync(temporaryArchive);
        if (!info.isFile() || info.size <= 0) throw new Error('INFLUX_BACKUP_ARCHIVE_INVALID');
        chmodSync(temporaryArchive, 0o600);
        linkSync(temporaryArchive, fileName);
        ctx.fileNames.push(fileName);
        ctx.log.debug(`Backup created: ${fileName}`);
    } catch (error) {
        const failure = new Error(maskInfluxToken(error instanceof Error ? error.message : error, options.token));
        ctx.errors.influxDB = failure.toString();
        throw failure;
    } finally {
        if (workingDirectory) {
            try {
                await remove(workingDirectory);
            } catch {
                // Never remove a shared/prior run's directory. An interrupted
                // cleanup leaves only this run's mode0700 temporary directory.
                ctx.log.warn('INFLUX_BACKUP_PRIVATE_TEMP_CLEANUP_FAILED');
            }
        }
    }
}

export const ignoreErrors = true;
