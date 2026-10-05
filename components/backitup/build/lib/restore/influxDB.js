"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const influxDbCli_1 = require("../influxDbCli");
const targz_1 = require("../targz");
const tools_1 = require("../tools");
/**
 * Runs the influx restore command against the unpacked dump.
 *
 * Always resolves: the command's exit status was ignored by the caller before as well.
 *
 * @param ctx run context, for the logger
 * @param options connection settings; in multi mode these are re-pointed at the matching target
 * @param tmpDir directory the backup was unpacked into
 */
async function replayInfluxDB(ctx, options, tmpDir) {
    let dbName = options.dbName;
    if (options.influxDBMulti === true && (0, node_fs_1.existsSync)(tmpDir)) {
        const files = (0, node_fs_1.readdirSync)(tmpDir);
        try {
            files.forEach(function (file) {
                const currentFiletype = file.split('.').pop();
                if (currentFiletype === 'manifest') {
                    const manifest = (0, node_fs_1.readFileSync)((0, node_path_1.join)(tmpDir, file).replace(/\\/g, '/'));
                    const json = JSON.parse(manifest.toString());
                    options.dbversion = json.files ? '1.x' : json.buckets ? '2.x' : options.dbversion;
                    dbName =
                        options.dbversion === '1.x'
                            ? json.files[0].database
                            : options.dbversion === '2.x'
                                ? json.buckets[0].bucketName
                                : options.dbName;
                }
            });
        }
        catch (err) {
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
        }
        catch (err) {
            ctx.log.error(`InfluxDB config not found: ${err}`);
        }
    }
    let invocation;
    try {
        invocation = (0, influxDbCli_1.buildInfluxRestoreInvocation)({ ...options, dbName }, tmpDir);
    }
    catch (error) {
        const message = (0, tools_1.maskSecret)(error instanceof Error ? error.message : String(error), options.token);
        ctx.log.error(message);
        return;
    }
    if (invocation.warning) {
        ctx.log.warn(invocation.warning);
    }
    /** Runs the restore command; the exit status is logged, never reported to preserve the old API. */
    const runRestore = async () => new Promise(resolve => {
        (0, node_child_process_1.execFile)(invocation.executable, invocation.args, { maxBuffer: 10 * 1024 * 1024, env: invocation.env }, (error, stdout, stderr) => {
            if (stdout?.trim()) {
                ctx.log.debug((0, tools_1.maskSecret)(stdout.trim(), options.token));
            }
            if (error) {
                const message = (0, tools_1.maskSecret)((0, influxDbCli_1.formatInfluxCliError)(Object.assign(error, { stdout, stderr }), invocation.executable, options.dbversion), options.token);
                ctx.log.error(message);
            }
            else if (stderr?.trim()) {
                ctx.log.debug((0, tools_1.maskSecret)(stderr.trim(), options.token));
            }
            resolve();
        });
    });
    try {
        if (options.deleteDatabase && options.dbType === 'local' && options.dbversion === '1.x') {
            const escapedDbName = dbName.replace(/"/g, '\\"');
            await new Promise(resolve => {
                (0, node_child_process_1.execFile)('influx', [`-execute=DROP DATABASE "${escapedDbName}"`], (error, stdout, stderr) => {
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
    }
    catch (error) {
        ctx.log.error((0, tools_1.maskSecret)(error instanceof Error ? error.message : String(error), options.token));
    }
}
/**
 * Unpacks an InfluxDB backup and hands it to the influx restore command.
 *
 * @param props the run context, the influxDB slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter;
    const tmpDir = (0, node_path_1.join)(options.backupDir, 'influxDBtmp').replace(/\\/g, '/');
    // stop influxdb-Adapter before Restore
    let startAfterRestore = false;
    const enabledInstances = [];
    // Not awaited, so the instances may still be stopping when the replay starts. Kept as found.
    void adapter.getObjectView('system', 'instance', { startkey: 'system.adapter.influxdb.', endkey: 'system.adapter.influxdb.香' }, (err, instances) => {
        const resultInstances = [];
        if (!err && instances && instances.rows) {
            instances.rows.forEach(row => resultInstances.push({
                id: row.id.replace('system.adapter.', ''),
                config: row.value.native.type,
            }));
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
        }
        else {
            ctx.log.debug('Could not retrieve influxdb instances!');
        }
    });
    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        (0, fs_extra_1.ensureDirSync)(tmpDir, desiredMode);
        ctx.log.debug('Created tmp directory');
    }
    else {
        try {
            ctx.log.debug('Try deleting the old InfluxDB tmp directory');
            (0, fs_extra_1.removeSync)(tmpDir);
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                ctx.log.debug('InfluxDB old tmp directory was successfully deleted');
            }
            (0, fs_extra_1.ensureDirSync)(tmpDir, desiredMode);
            ctx.log.debug('Created tmp directory');
        }
        catch (e) {
            ctx.log.debug(`InfluxDB old tmp directory could not be deleted: ${e}`);
        }
    }
    ctx.log.debug('Start influxDB Restore ...');
    try {
        await (0, targz_1.decompressAsync)({ src: fileName, dest: tmpDir });
    }
    catch (err) {
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
    if ((0, node_fs_1.existsSync)(tmpDir)) {
        try {
            ctx.log.debug('Try deleting the InfluxDB tmp directory');
            (0, fs_extra_1.removeSync)(tmpDir);
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                ctx.log.debug('InfluxDB tmp directory was successfully deleted');
            }
        }
        catch (e) {
            ctx.log.debug(`InfluxDB tmp directory could not be deleted: ${e}`);
        }
    }
    ctx.log.debug('influxDB Restore completed successfully');
    return 'influxDB restore done';
}
exports.isStop = false;
