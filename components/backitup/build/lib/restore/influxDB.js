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
/** Presence/size preflight only; this cannot guarantee that database replay will succeed. */
function requireDropArchiveFiles(manifest, directory) {
    for (const entry of [manifest.meta, ...manifest.files]) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
            throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE');
        const file = entry;
        if (typeof file.fileName !== 'string' || !/^[A-Za-z0-9._-]+$/.test(file.fileName) ||
            file.fileName === '.' || file.fileName === '..' || !Number.isSafeInteger(file.size) || Number(file.size) <= 0) {
            throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE');
        }
        let info;
        try {
            info = (0, node_fs_1.lstatSync)((0, node_path_1.join)(directory, file.fileName));
        }
        catch {
            throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE');
        }
        if (!info.isFile() || info.size !== file.size)
            throw new Error('INFLUX_DROP_ARCHIVE_INCOMPLETE');
    }
}
/** Validate one archive target before any destructive command and select its configuration. */
function restoreTarget(options, directory) {
    const names = new Set();
    const versions = new Set();
    for (const file of (0, node_fs_1.readdirSync)(directory)) {
        if (!file.endsWith('.manifest'))
            continue;
        const path = (0, node_path_1.join)(directory, file);
        const info = (0, node_fs_1.lstatSync)(path);
        if (!info.isFile() || info.size > 1024 * 1024)
            throw new Error('INFLUX_MANIFEST_INVALID');
        let manifest;
        try {
            manifest = JSON.parse((0, node_fs_1.readFileSync)(path, 'utf8'));
        }
        catch {
            throw new Error('INFLUX_MANIFEST_INVALID');
        }
        if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
            throw new Error('INFLUX_MANIFEST_INVALID');
        if (Boolean(manifest.files) === Boolean(manifest.buckets))
            throw new Error('INFLUX_MANIFEST_INVALID');
        const rows = manifest.files || manifest.buckets;
        const key = manifest.files ? 'database' : 'bucketName';
        versions.add(manifest.files ? '1.x' : '2.x');
        if (!Array.isArray(rows) || !rows.length || rows.length > 10000)
            throw new Error('INFLUX_MANIFEST_INVALID');
        if (manifest.files && options.deleteDatabase && options.dbType === 'local')
            requireDropArchiveFiles(manifest, directory);
        for (const row of rows) {
            if (!row || typeof row[key] !== 'string' || !row[key].trim())
                throw new Error('INFLUX_MANIFEST_INVALID');
            names.add(row[key]);
        }
    }
    if (names.size !== 1)
        throw new Error('INFLUX_MANIFEST_TARGET_AMBIGUOUS');
    const dbName = [...names][0];
    if (!options.influxDBMulti) {
        if (dbName !== String(options.dbName || '').trim())
            throw new Error('INFLUX_MANIFEST_TARGET_MISMATCH');
        if (versions.size !== 1 || !versions.has(options.dbversion))
            throw new Error('INFLUX_MANIFEST_VERSION_MISMATCH');
        return { ...options };
    }
    if (!Array.isArray(options.influxDBEvents))
        throw new Error('INFLUX_CONFIG_TARGET_AMBIGUOUS');
    const targets = options.influxDBEvents.filter(item => item.dbName === dbName);
    if (targets.length !== 1)
        throw new Error('INFLUX_CONFIG_TARGET_AMBIGUOUS');
    if (versions.size !== 1 || !versions.has(targets[0].dbversion))
        throw new Error('INFLUX_MANIFEST_VERSION_MISMATCH');
    return { ...options, ...targets[0], dbName };
}
async function replayInfluxDB(ctx, options, directory) {
    const target = restoreTarget(options, directory);
    const invocation = (0, influxDbCli_1.buildInfluxRestoreInvocation)(target, directory);
    const scrub = (value) => (0, influxDbCli_1.maskInfluxToken)((0, influxDbCli_1.maskInfluxToken)(value, target.token), options.token);
    if (invocation.warning)
        ctx.log.warn(scrub(invocation.warning));
    const execute = (executable, args) => new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)(executable, args, { maxBuffer: 10 * 1024 * 1024, env: invocation.env }, (error, stdout, stderr) => {
            if (stdout?.trim())
                ctx.log.debug(scrub(stdout.trim()));
            if (stderr?.trim())
                ctx.log.debug(scrub(stderr.trim()));
            if (error)
                reject(new Error(scrub((0, influxDbCli_1.formatInfluxCliError)(Object.assign(error, { stdout, stderr }), executable, target.dbversion))));
            else
                resolve();
        });
    });
    if (target.deleteDatabase && target.dbType === 'local' && target.dbversion === '1.x') {
        if (/[\r\n\0]/.test(target.dbName))
            throw new Error('INFLUX_DATABASE_NAME_INVALID');
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
async function requireStoppedWriters(ctx) {
    const adapter = ctx.adapter;
    if (!adapter)
        throw new Error('INFLUX_RESTORE_ADAPTER_REQUIRED');
    const result = await adapter.getObjectViewAsync('system', 'instance', {
        startkey: 'system.adapter.influxdb.', endkey: 'system.adapter.influxdb.香',
    });
    if (!result || !Array.isArray(result.rows))
        throw new Error('INFLUX_RESTORE_INSTANCE_QUERY_FAILED');
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
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    let directory;
    try {
        await requireStoppedWriters(ctx);
        directory = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)(options.backupDir, '.influxDB-restore-'));
        (0, node_fs_1.chmodSync)(directory, 0o700);
        await (0, targz_1.decompressAsync)({ src: fileName, dest: directory, tar: {
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
    }
    catch (error) {
        let message = (0, influxDbCli_1.maskInfluxToken)(error instanceof Error ? error.message : error, options.token);
        for (const event of options.influxDBEvents || [])
            message = (0, influxDbCli_1.maskInfluxToken)(message, event.token);
        const failure = new Error(message);
        ctx.errors.influxDB = failure.toString();
        ctx.log.error(message);
        ctx.log.error('influxDB Restore not completed');
        throw failure;
    }
    finally {
        if (directory) {
            try {
                (0, fs_extra_1.removeSync)(directory);
            }
            catch {
                ctx.log.warn('INFLUX_RESTORE_PRIVATE_TEMP_CLEANUP_FAILED');
            }
        }
    }
}
exports.isStop = false;
//# sourceMappingURL=influxDB.js.map