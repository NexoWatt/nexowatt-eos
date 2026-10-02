import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDirSync, removeSync } from 'fs-extra';

import { buildInfluxRestoreInvocation, formatInfluxCliError } from '../influxDbCli';
import { decompressAsync } from '../targz';
import { maskSecret } from '../tools';
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

/** The parts of an influx backup manifest this module reads */
interface InfluxManifest {
    files?: { database: string }[];
    buckets?: { bucketName: string }[];
}

/**
 * Runs the influx restore command against the unpacked dump.
 *
 * Always resolves: the command's exit status was ignored by the caller before as well.
 *
 * @param ctx run context, for the logger
 * @param options connection settings; in multi mode these are re-pointed at the matching target
 * @param tmpDir directory the backup was unpacked into
 */
async function replayInfluxDB(
    ctx: BackItUpContext,
    options: InfluxDbRestoreOptions,
    tmpDir: string,
): Promise<void> {
    let dbName = options.dbName;

    if (options.influxDBMulti === true && existsSync(tmpDir)) {
        const files = readdirSync(tmpDir);

        try {
            files.forEach(function (file) {
                const currentFiletype = file.split('.').pop();

                if (currentFiletype === 'manifest') {
                    const manifest = readFileSync(join(tmpDir, file).replace(/\\/g, '/'));
                    const json: InfluxManifest = JSON.parse(manifest.toString());

                    options.dbversion = json.files ? '1.x' : json.buckets ? '2.x' : options.dbversion;
                    dbName =
                        options.dbversion === '1.x'
                            ? json.files![0].database
                            : options.dbversion === '2.x'
                              ? json.buckets![0].bucketName
                              : options.dbName;
                }
            });
        } catch (err) {
            ctx.log.error(`manifest is broken: ${err}`);
        }

        try {
            for (let i = 0; i < options.influxDBEvents.length; i++) {
                if (options.influxDBEvents[i].dbName === dbName) {
                    options.port = options.influxDBEvents[i].port ? options.influxDBEvents[i].port : '';
                    options.host = options.influxDBEvents[i].host ? options.influxDBEvents[i].host : '';
                    options.dbName = options.influxDBEvents[i].dbName ? options.influxDBEvents[i].dbName : '';
                    options.nameSuffix = options.influxDBEvents[i].nameSuffix
                        ? options.influxDBEvents[i].nameSuffix
                        : '';
                    options.token = options.influxDBEvents[i].token ? options.influxDBEvents[i].token : '';
                    options.dbversion = options.influxDBEvents[i].dbversion
                        ? options.influxDBEvents[i].dbversion
                        : '';
                    options.protocol = options.influxDBEvents[i].protocol
                        ? options.influxDBEvents[i].protocol
                        : '';
                }
            }
        } catch (err) {
            ctx.log.error(`InfluxDB config not found: ${err}`);
        }
    }

    let invocation;
    try {
        invocation = buildInfluxRestoreInvocation({ ...options, dbName }, tmpDir);
    } catch (error) {
        const message = maskSecret(error instanceof Error ? error.message : String(error), options.token);
        ctx.log.error(message);
        return;
    }

    if (invocation.warning) {
        ctx.log.warn(invocation.warning);
    }

    /** Runs the restore command; the exit status is logged, never reported to preserve the old API. */
    const runRestore = async (): Promise<void> =>
        new Promise(resolve => {
            execFile(
                invocation.executable,
                invocation.args,
                { maxBuffer: 10 * 1024 * 1024, env: invocation.env },
                (error, stdout, stderr) => {
                    if (stdout?.trim()) {
                        ctx.log.debug(maskSecret(stdout.trim(), options.token));
                    }
                    if (error) {
                        const message = maskSecret(
                            formatInfluxCliError(
                                Object.assign(error, { stdout, stderr }),
                                invocation.executable,
                                options.dbversion,
                            ),
                            options.token,
                        );
                        ctx.log.error(message);
                    } else if (stderr?.trim()) {
                        ctx.log.debug(maskSecret(stderr.trim(), options.token));
                    }
                    resolve();
                },
            );
        });

    try {
        if (options.deleteDatabase && options.dbType === 'local' && options.dbversion === '1.x') {
            const escapedDbName = dbName.replace(/"/g, '\\"');
            await new Promise<void>(resolve => {
                execFile('influx', [`-execute=DROP DATABASE "${escapedDbName}"`], (error, stdout, stderr) => {
                    if (stdout?.trim()) {
                        ctx.log.debug(stdout.trim());
                    }
                    if (error) {
                        ctx.log.warn(`Die bestehende InfluxDB-1.x-Datenbank konnte nicht automatisch gelöscht werden: ${stderr || error.message}`);
                    }
                    resolve();
                });
            });
        }
        await runRestore();
    } catch (error) {
        ctx.log.error(maskSecret(error instanceof Error ? error.message : String(error), options.token));
    }
}

/**
 * Unpacks an InfluxDB backup and hands it to the influx restore command.
 *
 * @param props the run context, the influxDB slice of the config and the archive
 */
export async function restore(
    props: BackItUpRestoreProps<InfluxDbRestoreOptions>,
): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter!;

    const tmpDir = join(options.backupDir, 'influxDBtmp').replace(/\\/g, '/');

    // stop influxdb-Adapter before Restore
    let startAfterRestore = false;
    const enabledInstances: string[] = [];

    // Not awaited, so the instances may still be stopping when the replay starts. Kept as found.
    void adapter.getObjectView(
        'system',
        'instance',
        { startkey: 'system.adapter.influxdb.', endkey: 'system.adapter.influxdb.香' },
        (err, instances) => {
            const resultInstances: { id: string; config: unknown }[] = [];
            if (!err && instances && instances.rows) {
                instances.rows.forEach(row =>
                    resultInstances.push({
                        id: row.id.replace('system.adapter.', ''),
                        config: row.value.native.type,
                    }),
                );
                for (let i = 0; i < resultInstances.length; i++) {
                    const _id = resultInstances[i].id;
                    // Stop influxdb Instances
                    void adapter.getForeignObject(`system.adapter.${_id}`, (err, obj) => {
                        if (obj?.common?.enabled) {
                            void adapter.setForeignState(`system.adapter.${_id}.alive`, false);
                            ctx.log.debug(`${_id} is stopped`);
                            enabledInstances.push(_id);
                            startAfterRestore = true;
                        }
                    });
                }
            } else {
                ctx.log.debug('Could not retrieve influxdb instances!');
            }
        },
    );

    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';

    if (!existsSync(tmpDir)) {
        ensureDirSync(tmpDir, desiredMode as unknown as number);
        ctx.log.debug('Created tmp directory');
    } else {
        try {
            ctx.log.debug('Try deleting the old InfluxDB tmp directory');
            removeSync(tmpDir);
            if (!existsSync(tmpDir)) {
                ctx.log.debug('InfluxDB old tmp directory was successfully deleted');
            }
            ensureDirSync(tmpDir, desiredMode as unknown as number);
            ctx.log.debug('Created tmp directory');
        } catch (e) {
            ctx.log.debug(`InfluxDB old tmp directory could not be deleted: ${e}`);
        }
    }
    ctx.log.debug('Start influxDB Restore ...');

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error(err);
        ctx.log.error('influxDB Restore not completed');
        throw err;
    }

    // The replay error is deliberately ignored - the step always reports success.
    await replayInfluxDB(ctx, options, tmpDir);

    // Start influxDB Instances
    if (startAfterRestore) {
        enabledInstances.forEach(enabledInstance => {
            void adapter.getForeignObject(`system.adapter.${enabledInstance}`, (err, obj) => {
                if (obj && !obj.common?.enabled) {
                    void adapter.setForeignState(`system.adapter.${enabledInstance}.alive`, true);
                    ctx.log.debug(`${enabledInstance} started`);
                }
            });
        });
    }
    // delete influxDB tmpDir
    if (existsSync(tmpDir)) {
        try {
            ctx.log.debug('Try deleting the InfluxDB tmp directory');
            removeSync(tmpDir);
            if (!existsSync(tmpDir)) {
                ctx.log.debug('InfluxDB tmp directory was successfully deleted');
            }
        } catch (e) {
            ctx.log.debug(`InfluxDB tmp directory could not be deleted: ${e}`);
        }
    }
    ctx.log.debug('influxDB Restore completed successfully');
    return 'influxDB restore done';
}

export const isStop = false;
