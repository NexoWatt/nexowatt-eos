import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, remove } from 'fs-extra';

import { getDate, maskSecret } from '../tools';
import { buildInfluxBackupInvocation, formatInfluxCliError } from '../influxDbCli';
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

    // A failed target no longer stops the others, as before; the first failure is reported once
    // every target has been attempted.
    let firstError: Error | undefined;
    const attempt = async (): Promise<void> => {
        try {
            await startBackup(ctx, options);
        } catch (err) {
            firstError ??= err as Error;
        }
    };

    if (options.influxDBMulti) {
        // The per-event settings are written onto `options` itself, one target after another.
        for (let i = 0; i < options.influxDBEvents.length; i++) {
            options.port = options.influxDBEvents[i].port ? options.influxDBEvents[i].port : '';
            options.host = options.influxDBEvents[i].host ? options.influxDBEvents[i].host : '';
            options.dbName = options.influxDBEvents[i].dbName ? options.influxDBEvents[i].dbName : '';
            options.nameSuffix = options.influxDBEvents[i].nameSuffix ? options.influxDBEvents[i].nameSuffix : '';
            options.token = options.influxDBEvents[i].token ? options.influxDBEvents[i].token : '';
            options.dbversion = options.influxDBEvents[i].dbversion ? options.influxDBEvents[i].dbversion : '';
            options.protocol = options.influxDBEvents[i].protocol ? options.influxDBEvents[i].protocol : '';

            ctx.log.debug(`InfluxDB-Backup for ${options.nameSuffix} is started ...`);
            await attempt();
            ctx.log.debug(`InfluxDB-Backup for ${options.nameSuffix} is finish`);
        }

        // Reported as done even when a target failed - kept as found.
        ctx.done.push('influxDB');
        ctx.types.push('influxDB');
    } else {
        ctx.log.debug('InfluxDB-Backup started ...');
        await attempt();
        ctx.log.debug('InfluxDB-Backup for is finish');

        ctx.done.push('influxDB');
        ctx.types.push('influxDB');
    }

    if (firstError) {
        throw firstError;
    }
}

/**
 * Dumps one bucket/database and packs the result.
 *
 * @param ctx run context
 * @param options script options, already pointed at the target to dump
 */
async function startBackup(ctx: BackItUpContext, options: InfluxDbOptions): Promise<void> {
    let nameSuffix;
    if (options.hostType === 'Slave' && !options.influxDBMulti) {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    } else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }
    const fileName = join(
        ctx.backupDir,
        `influxDB_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
    );
    const tmpDir = join(ctx.backupDir, `influxDB_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker`);

    let invocation;
    try {
        invocation = buildInfluxBackupInvocation(options, tmpDir);
    } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        ctx.errors.influxDB = failure.toString();
        throw failure;
    }

    if (invocation.warning) {
        ctx.log.warn(invocation.warning);
    }

    ctx.fileNames.push(fileName);
    ctx.log.debug('Start InfluxDB Backup ...');

    const desiredMode = {
        mode: 0o2775,
    };

    if (!existsSync(tmpDir)) {
        try {
            await ensureDir(tmpDir, desiredMode);
        } catch {
            ctx.log.warn('InfluxDB Backup tmp directory cannot created ');
        }
        ctx.log.debug('InfluxDB Backup tmp directory created ');
    }

    /** Removes the temp directory, turning a failed removal into a log line as the original did. */
    const dropTmp = async (): Promise<void> => {
        try {
            await delTmp(ctx, tmpDir);
        } catch {
            ctx.log.error(
                `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
            );
        }
    };

    let stdout = '';
    let stderr = '';
    try {
        await new Promise<void>((resolve, reject) => {
            execFile(
                invocation.executable,
                invocation.args,
                { maxBuffer: 10 * 1024 * 1024, env: invocation.env },
                (error, out, errOut) => {
                    stdout = out;
                    stderr = errOut;
                    if (error) {
                        const message = maskSecret(
                            formatInfluxCliError(
                                Object.assign(error, { stdout: out, stderr: errOut }),
                                invocation.executable,
                                options.dbversion,
                            ),
                            options.token,
                        );
                        const failure = new Error(message);
                        ctx.errors.influxDB = failure.toString();
                        reject(failure);
                    } else {
                        resolve();
                    }
                },
            );
        });
    } catch (err) {
        if (existsSync(tmpDir)) {
            await dropTmp();
        }
        if (stdout.trim()) {
            ctx.log.debug(stdout.trim());
        }
        if (stderr.trim()) {
            ctx.log.debug(maskSecret(stderr.trim(), options.token));
        }
        throw err;
    }

    const timer = setInterval(() => {
        if (existsSync(fileName)) {
            const stats = statSync(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);

    try {
        await compressAsync({ src: tmpDir, dest: fileName });
    } catch (err) {
        ctx.errors.influxDB = (err as Error).toString();
        await dropTmp();
        throw err;
    } finally {
        clearInterval(timer);
    }

    ctx.log.debug(`Backup created: ${fileName}`);

    if (existsSync(tmpDir)) {
        await dropTmp();
    }
}

/**
 * Removes the temporary dump directory, rejecting when it cannot be deleted.
 *
 * @param ctx run context, for the error store and the logger
 * @param tmpDir directory to remove
 */
async function delTmp(ctx: BackItUpContext, tmpDir: string): Promise<void> {
    ctx.log.debug(`Try deleting the InfluxDB tmp directory: "${tmpDir}"`);

    return remove(tmpDir)
        .then(() => {
            if (!existsSync(tmpDir)) {
                ctx.log.debug(`InfluxDB tmp directory "${tmpDir}" successfully deleted`);
            }
        })
        .catch(err => {
            ctx.errors.influxDB = JSON.stringify(err);
            ctx.log.error(
                `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
            );
            throw err;
        });
}

export const ignoreErrors = true;
