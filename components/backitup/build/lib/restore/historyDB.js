"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_fs_1 = require("node:fs");
const targz_1 = require("../targz");
/**
 * Unpacks a history database backup.
 *
 * @param props the run context, the history slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter;
    ctx.log.debug('Start History Restore ...');
    // stop history-Adapter before Restore
    let startAfterRestore = false;
    const enabledInstances = [];
    try {
        // Not awaited anywhere, so the instances may still be stopping when the unpacking starts.
        // Kept as found.
        adapter.getObjectView('system', 'instance', { startkey: 'system.adapter.history.', endkey: 'system.adapter.history.香' }, (err, instances) => {
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
                    // Stop history Instances
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
                ctx.log.debug('Could not retrieve history instances!');
            }
        });
    }
    catch {
        ctx.log.debug('Could not retrieve history instances!');
    }
    // Created through the adapter but cleared with the global clearInterval below. Kept as found.
    const timer = adapter.setInterval(() => {
        if ((0, node_fs_1.existsSync)(options.path)) {
            ctx.log.debug('Extracting History Backup file...');
        }
        else {
            ctx.log.debug('Something is wrong. No file found.');
        }
    }, 10000);
    try {
        await (0, targz_1.decompressAsync)({ src: fileName, dest: options.path });
    }
    catch (err) {
        ctx.log.error(err);
        ctx.log.error('History Restore not completed');
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    // Start history Instances
    if (startAfterRestore) {
        try {
            enabledInstances.forEach(enabledInstance => {
                void adapter.getForeignObject(`system.adapter.${enabledInstance}`, (err, obj) => {
                    if (obj && !obj.common?.enabled) {
                        void adapter.setForeignState(`system.adapter.${enabledInstance}.alive`, true);
                        ctx.log.debug(`${enabledInstance} started`);
                    }
                });
            });
        }
        catch {
            ctx.log.debug(`History instance cannot be started`);
        }
    }
    ctx.log.debug('History Restore completed successfully');
    return 'historyDB restore done';
}
exports.isStop = false;
//# sourceMappingURL=historyDB.js.map