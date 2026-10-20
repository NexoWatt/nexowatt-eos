"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const tools_1 = require("../tools");
const influxDbCli_1 = require("../influxDbCli");
const targz_1 = require("../targz");
/**
 * Dumps the configured InfluxDB bucket(s)/database(s) and packs each dump.
 *
 * As in 30-mysql the callback version reported a dump failure from `startBackup` and then reported
 * success again from here, and lib/execute scheduled all remaining backup steps twice as a result.
 * Awaiting collapses that to a single report.
 *
 * @param props the run context and the influxDB slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    if (options.influxDBMulti && (!Array.isArray(options.influxDBEvents) || !options.influxDBEvents.length || options.influxDBEvents.length > 100)) {
        ctx.errors.influxDB = 'INFLUX_BACKUP_TARGETS_INVALID';
        throw new Error('INFLUX_BACKUP_TARGETS_INVALID');
    }
    const targets = options.influxDBMulti ? options.influxDBEvents.map(event => ({ ...options, ...event })) : [options];
    let firstError;
    for (const target of targets) {
        try {
            await startBackup(ctx, target);
        }
        catch (error) {
            firstError ??= error;
        }
    }
    if (firstError)
        throw firstError;
    ctx.done.push('influxDB');
    ctx.types.push('influxDB');
}
/**
 * Dumps one bucket/database and packs the result.
 *
 * @param ctx run context
 * @param options script options, already pointed at the target to dump
 */
async function startBackup(ctx, options) {
    const suffix = options.hostType === 'Slave' && !options.influxDBMulti ? options.slaveSuffix : options.nameSuffix;
    if (suffix && !/^[A-Za-z0-9._-]{1,64}$/.test(suffix)) {
        ctx.errors.influxDB = 'INFLUX_BACKUP_SUFFIX_INVALID';
        throw new Error('INFLUX_BACKUP_SUFFIX_INVALID');
    }
    const fileName = (0, node_path_1.join)(ctx.backupDir, `influxDB_${(0, tools_1.getDate)()}${suffix ? `_${suffix}` : ''}_backupiobroker.tar.gz`);
    let workingDirectory;
    try {
        // lstat catches dangling symlinks too. Atomic link below also closes the
        // race where another run creates the destination during compression.
        try {
            (0, node_fs_1.lstatSync)(fileName);
            throw new Error('INFLUX_BACKUP_TARGET_EXISTS');
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
        workingDirectory = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)(ctx.backupDir, '.influxDB-'));
        (0, node_fs_1.chmodSync)(workingDirectory, 0o700);
        const dumpDirectory = (0, node_path_1.join)(workingDirectory, 'dump');
        (0, node_fs_1.mkdirSync)(dumpDirectory, { mode: 0o700 });
        const invocation = (0, influxDbCli_1.buildInfluxBackupInvocation)(options, dumpDirectory);
        if (invocation.warning)
            ctx.log.warn((0, influxDbCli_1.maskInfluxToken)(invocation.warning, options.token));
        ctx.log.debug('Start InfluxDB Backup ...');
        await new Promise((resolve, reject) => {
            (0, node_child_process_1.execFile)(invocation.executable, invocation.args, { maxBuffer: 10 * 1024 * 1024, env: invocation.env }, (error, stdout, stderr) => {
                if (stdout?.trim())
                    ctx.log.debug((0, influxDbCli_1.maskInfluxToken)(stdout.trim(), options.token));
                if (stderr?.trim())
                    ctx.log.debug((0, influxDbCli_1.maskInfluxToken)(stderr.trim(), options.token));
                if (error) {
                    reject(new Error((0, influxDbCli_1.maskInfluxToken)((0, influxDbCli_1.formatInfluxCliError)(Object.assign(error, { stdout, stderr }), invocation.executable, options.dbversion), options.token)));
                }
                else
                    resolve();
            });
        });
        const temporaryArchive = (0, node_path_1.join)(workingDirectory, 'archive.tar.gz');
        await (0, targz_1.compressAsync)({ src: dumpDirectory, dest: temporaryArchive });
        const info = (0, node_fs_1.lstatSync)(temporaryArchive);
        if (!info.isFile() || info.size <= 0)
            throw new Error('INFLUX_BACKUP_ARCHIVE_INVALID');
        (0, node_fs_1.chmodSync)(temporaryArchive, 0o600);
        (0, node_fs_1.linkSync)(temporaryArchive, fileName);
        ctx.fileNames.push(fileName);
        ctx.log.debug(`Backup created: ${fileName}`);
    }
    catch (error) {
        const failure = new Error((0, influxDbCli_1.maskInfluxToken)(error instanceof Error ? error.message : error, options.token));
        ctx.errors.influxDB = failure.toString();
        throw failure;
    }
    finally {
        if (workingDirectory) {
            try {
                await (0, fs_extra_1.remove)(workingDirectory);
            }
            catch {
                // Never remove a shared/prior run's directory. An interrupted
                // cleanup leaves only this run's mode0700 temporary directory.
                ctx.log.warn('INFLUX_BACKUP_PRIVATE_TEMP_CLEANUP_FAILED');
            }
        }
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=12-influxDB.js.map