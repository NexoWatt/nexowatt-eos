"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const targz_1 = require("../targz");
/**
 * Deletes the old database file and feeds the dump into a fresh one.
 *
 * Always resolves: the sqlite3 exit status was ignored by the caller before as well. A failing
 * delete of the old database used to report through the callback *and* carry on, which ran the
 * caller's success path a second time - it only logs now.
 *
 * @param ctx run context, for the logger
 * @param options sqlite settings
 * @param fileNameSQlite the unpacked .sql file
 */
async function replaySqlite(ctx, options, fileNameSQlite) {
    if (options?.filePth && (0, node_fs_1.existsSync)(options.filePth)) {
        try {
            (0, node_fs_1.unlinkSync)(options.filePth);
            ctx.log.debug('old sqlite db deleted!');
        }
        catch (e) {
            ctx.log.debug(`sqlite db cannot deleted: ${e}`);
        }
    }
    const cmdRestore = `${options.exe ? options.exe : 'sqlite3'} ${options.filePth} < ${fileNameSQlite}`;
    try {
        await new Promise(resolve => {
            (0, node_child_process_1.exec)(cmdRestore, (error, _stdout, stderr) => {
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
 * Unpacks a sqlite dump and feeds it into a fresh database.
 *
 * @param props the run context, the sqlite slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter;
    const fileNameSQlite = (0, node_path_1.join)(options.backupDir, `sqlite_restore_backupiobroker.sql`);
    ctx.log.debug('Start sqlite Restore ...');
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
        if ((0, node_fs_1.existsSync)(fileNameSQlite)) {
            const stats = (0, node_fs_1.statSync)(fileNameSQlite);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Extract sqlite Backup file ${fileSize}MB so far...`);
        }
        else {
            ctx.log.debug(`Something is wrong with "${fileNameSQlite}".`);
        }
    }, 10000);
    try {
        await (0, targz_1.decompressAsync)({
            src: fileName,
            dest: options.backupDir,
            tar: {
                map: header => {
                    header.name = `sqlite_restore_backupiobroker.sql`;
                    return header;
                },
            },
        });
    }
    catch (err) {
        ctx.log.error(err);
        ctx.log.error('sqlite Restore not completed');
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    await replaySqlite(ctx, options, fileNameSQlite);
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
    // delete sqlite file
    if ((0, node_fs_1.existsSync)(fileNameSQlite)) {
        try {
            (0, node_fs_1.unlinkSync)(fileNameSQlite);
        }
        catch {
            ctx.log.debug(`${fileNameSQlite} cannot deleted ...`);
        }
    }
    ctx.log.debug('sqlite Restore completed successfully');
    return 'sqlite restore done';
}
exports.isStop = false;
//# sourceMappingURL=sqlite.js.map