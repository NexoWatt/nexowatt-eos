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
    // A failed target no longer stops the others, as before; the first failure is reported once
    // every target has been attempted.
    let firstError;
    const attempt = async () => {
        try {
            await startBackup(ctx, options);
        }
        catch (err) {
            firstError ??= err;
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
    }
    else {
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
async function startBackup(ctx, options) {
    let nameSuffix;
    if (options.hostType === 'Slave' && !options.influxDBMulti) {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    }
    else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }
    const fileName = (0, node_path_1.join)(ctx.backupDir, `influxDB_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
    const tmpDir = (0, node_path_1.join)(ctx.backupDir, `influxDB_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker`);
    let invocation;
    try {
        invocation = (0, influxDbCli_1.buildInfluxBackupInvocation)(options, tmpDir);
    }
    catch (error) {
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
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        try {
            await (0, fs_extra_1.ensureDir)(tmpDir, desiredMode);
        }
        catch {
            ctx.log.warn('InfluxDB Backup tmp directory cannot created ');
        }
        ctx.log.debug('InfluxDB Backup tmp directory created ');
    }
    /** Removes the temp directory, turning a failed removal into a log line as the original did. */
    const dropTmp = async () => {
        try {
            await delTmp(ctx, tmpDir);
        }
        catch {
            ctx.log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
        }
    };
    let stdout = '';
    let stderr = '';
    try {
        await new Promise((resolve, reject) => {
            (0, node_child_process_1.execFile)(invocation.executable, invocation.args, { maxBuffer: 10 * 1024 * 1024, env: invocation.env }, (error, out, errOut) => {
                stdout = out;
                stderr = errOut;
                if (error) {
                    const message = (0, tools_1.maskSecret)((0, influxDbCli_1.formatInfluxCliError)(Object.assign(error, { stdout: out, stderr: errOut }), invocation.executable, options.dbversion), options.token);
                    const failure = new Error(message);
                    ctx.errors.influxDB = failure.toString();
                    reject(failure);
                }
                else {
                    resolve();
                }
            });
        });
    }
    catch (err) {
        if ((0, node_fs_1.existsSync)(tmpDir)) {
            await dropTmp();
        }
        if (stdout.trim()) {
            ctx.log.debug(stdout.trim());
        }
        if (stderr.trim()) {
            ctx.log.debug((0, tools_1.maskSecret)(stderr.trim(), options.token));
        }
        throw err;
    }
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(fileName)) {
            const stats = (0, node_fs_1.statSync)(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);
    try {
        await (0, targz_1.compressAsync)({ src: tmpDir, dest: fileName });
    }
    catch (err) {
        ctx.errors.influxDB = err.toString();
        await dropTmp();
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    ctx.log.debug(`Backup created: ${fileName}`);
    if ((0, node_fs_1.existsSync)(tmpDir)) {
        await dropTmp();
    }
}
/**
 * Removes the temporary dump directory, rejecting when it cannot be deleted.
 *
 * @param ctx run context, for the error store and the logger
 * @param tmpDir directory to remove
 */
async function delTmp(ctx, tmpDir) {
    ctx.log.debug(`Try deleting the InfluxDB tmp directory: "${tmpDir}"`);
    return (0, fs_extra_1.remove)(tmpDir)
        .then(() => {
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            ctx.log.debug(`InfluxDB tmp directory "${tmpDir}" successfully deleted`);
        }
    })
        .catch(err => {
        ctx.errors.influxDB = JSON.stringify(err);
        ctx.log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
        throw err;
    });
}
exports.ignoreErrors = true;
