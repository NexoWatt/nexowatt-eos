"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const targz_1 = require("../targz");
/**
 * Recreates the database and replays the dump into it.
 *
 * Always resolves: the replay error is deliberately ignored, the step reports success either way.
 *
 * @param ctx run context, for the logger
 * @param options connection settings; note that `pass` is quoted in place
 * @param fileNameMysql the unpacked .sql file
 */
async function replayMySql(ctx, options, fileNameMysql) {
    // NOTE: the second clause is missing the negation the pgsql version has, so a password already
    // wrapped in single quotes gets wrapped again. Kept as found - see also lib/scripts/30-mysql.
    if ((!options.pass.startsWith(`"`) || !options.pass.endsWith(`"`)) &&
        (!options.pass.startsWith(`'`) || options.pass.endsWith(`'`))) {
        // Written back onto `options`, so a second call quotes the already quoted value again.
        options.pass = `"${options.pass}"`;
    }
    // create DB before executing script
    const cmdCreate = `mysql -u ${options.user} -p${options.pass} -h ${options.host} -P ${options.port} --execute='CREATE DATABASE IF NOT EXISTS ${options.dbName};'`;
    try {
        await new Promise(resolve => {
            (0, node_child_process_1.exec)(cmdCreate, () => resolve());
        });
        const cmd = `mysql -u ${options.user} -p${options.pass} -h ${options.host} -P ${options.port} ${options.dbName} < ${fileNameMysql}`;
        await new Promise(resolve => {
            // The original kept the ChildProcess in an unused `child` binding.
            (0, node_child_process_1.exec)(cmd, (error, _stdout, stderr) => {
                if (error) {
                    ctx.log.error(stderr);
                }
                resolve();
            });
        });
    }
    catch {
        // ignore errors
    }
}
/**
 * Unpacks a MySQL dump and replays it.
 *
 * @param props the run context, the mysql slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter;
    const fileNameMysql = (0, node_path_1.join)(options.backupDir, `mysql_restore_backupiobroker.sql`);
    ctx.log.debug('Start mysql Restore ...');
    // stop sql-Adapter before Restore
    let startAfterRestore = false;
    const enabledInstances = [];
    // Not awaited, so the instances may still be stopping when the replay starts. Kept as found.
    void adapter.getObjectView('system', 'instance', { startkey: 'system.adapter.sql.', endkey: 'system.adapter.sql.香' }, (err, instances) => {
        const resultInstances = [];
        if (!err && instances && instances.rows) {
            instances.rows.forEach(row => {
                resultInstances.push({
                    id: row.id.replace('system.adapter.', ''),
                    config: row.value.native.type,
                });
            });
            for (let i = 0; i < resultInstances.length; i++) {
                const _id = resultInstances[i].id;
                // Stop sql Instances
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
            ctx.log.debug('Could not retrieve sql instances!');
        }
    });
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(fileNameMysql)) {
            const stats = (0, node_fs_1.statSync)(fileNameMysql);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Extract mysql Backupfile ${fileSize}MB so far...`);
        }
        else {
            ctx.log.debug(`Something is wrong with "${fileNameMysql}".`);
        }
    }, 10000);
    try {
        await (0, targz_1.decompressAsync)({
            src: fileName,
            dest: options.backupDir,
            tar: {
                map: header => {
                    header.name = `mysql_restore_backupiobroker.sql`;
                    return header;
                },
            },
        });
    }
    catch (err) {
        ctx.log.error(err);
        ctx.log.error('mysql Restore not completed');
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    await replayMySql(ctx, options, fileNameMysql);
    // Start sql Instances
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
    // delete mysql file
    if ((0, node_fs_1.existsSync)(fileNameMysql)) {
        try {
            (0, node_fs_1.unlinkSync)(fileNameMysql);
        }
        catch {
            ctx.log.debug(`${fileNameMysql} cannot deleted ...`);
        }
    }
    ctx.log.debug('mySql Restore completed successfully');
    return 'mysql restore done';
}
exports.isStop = false;
//# sourceMappingURL=mysql.js.map