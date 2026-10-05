"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const targz_1 = require("../targz");
/**
 * Restores the data directory and the states of one jarvis instance.
 *
 * The callback version logged "jarvis Restore completed successfully" even when the restore had
 * just failed - the catch cleared the callback but did not return. The line only appears on the
 * success path now.
 *
 * @param props the run context, the jarvis slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter;
    ctx.log.debug('Start Jarvis Restore ...');
    const instance = fileName.split('.');
    const num = instance[1].split('_');
    const tmpDir = (0, node_path_1.join)(options.backupDir, `jarvis_${num[0]}`).replace(/\\/g, '/');
    const stateDir = (0, node_path_1.join)(tmpDir, 'states').replace(/\\/g, '/');
    ctx.log.debug(`filename for restore: ${fileName}`);
    // Stop jarvis
    let startAfterRestore = false;
    const obj = await adapter.getForeignObjectAsync(`system.adapter.jarvis.${num[0]}`);
    if (obj?.common?.enabled) {
        await adapter.setForeignStateAsync(`system.adapter.jarvis.${num[0]}.alive`, false);
        ctx.log.debug(`jarvis.${num[0]} stopped`);
        startAfterRestore = true;
    }
    try {
        await (0, fs_extra_1.ensureDir)(tmpDir);
        ctx.log.debug(`jarvis tmp directory created: ${tmpDir}`);
    }
    catch {
        ctx.log.debug('jarvis tmp directory cannot created');
    }
    const pthJarvis = (0, node_path_1.join)(options.path, 'jarvis');
    const pth = (0, node_path_1.join)(pthJarvis, num[0]);
    if ((0, node_fs_1.existsSync)(pth)) {
        try {
            await (0, fs_extra_1.remove)(pth);
            if (!(0, node_fs_1.existsSync)(pth)) {
                ctx.log.debug('old jarvis database directory was successfully deleted');
            }
        }
        catch {
            ctx.log.debug('old jarvis database directory cannot deleted');
        }
    }
    try {
        await (0, targz_1.decompressAsync)({ src: fileName, dest: tmpDir });
    }
    catch (err) {
        ctx.log.error('jarvis restore not completed');
        ctx.log.error(err);
        throw err;
    }
    // Restore States
    const object = await (0, promises_1.readFile)((0, node_path_1.join)(stateDir, 'states.json'));
    if (object) {
        const jarvisObjects = JSON.parse(object.toString());
        // for-in, not for-of: it also visits whatever a non-array states.json deserialises to.
        // Kept as found.
        // eslint-disable-next-line @typescript-eslint/no-for-in-array
        for (const i in jarvisObjects) {
            let _object;
            try {
                _object = await adapter.getForeignObjectAsync(jarvisObjects[i].id);
            }
            catch (err) {
                ctx.log.debug(err);
            }
            if (_object) {
                try {
                    if (jarvisObjects[i].value !== null) {
                        await adapter.setForeignStateAsync(jarvisObjects[i].id, jarvisObjects[i].value, true);
                    }
                }
                catch (err) {
                    ctx.log.debug(`Error on set Object: ${err}`);
                }
            }
        }
    }
    ctx.log.debug('Try deleting the states tmp directory');
    await (0, fs_extra_1.remove)(stateDir);
    if (!(0, node_fs_1.existsSync)(stateDir)) {
        ctx.log.debug('states tmp directory was successfully deleted');
    }
    // Restore Backup-Files
    await (0, fs_extra_1.copy)(tmpDir, pth);
    if ((0, node_fs_1.existsSync)(pth)) {
        ctx.log.debug('jarvis database is successfully restored');
    }
    // Start jarvis
    if (startAfterRestore) {
        const startObj = await adapter.getForeignObjectAsync(`system.adapter.jarvis.${num[0]}`);
        if (startObj && !startObj.common?.enabled) {
            await adapter.setForeignStateAsync(`system.adapter.jarvis.${num[0]}.alive`, true);
            ctx.log.debug(`jarvis.${num[0]} started`);
        }
    }
    ctx.log.debug('Try deleting the jarvis tmp directory');
    await (0, fs_extra_1.remove)(tmpDir);
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        ctx.log.debug('jarvis tmp directory was successfully deleted');
    }
    ctx.log.debug('jarvis Restore completed successfully');
    return 'jarvis database restore done';
}
exports.isStop = false;
//# sourceMappingURL=jarvis.js.map