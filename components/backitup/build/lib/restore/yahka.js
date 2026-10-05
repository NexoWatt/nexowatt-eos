"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/** How long the original waited for the stopped instance before unpacking */
const STOP_DELAY_MS = 3000;
/**
 * Restores the hapdata directory of one yahka instance.
 *
 * As in esphome.ts the callback version reported twice when copying the unpacked data into place
 * failed - its catch reported the error and did not return. Awaiting makes the failure the outcome
 * of the step.
 *
 * @param props the run context, the yahka slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter;
    ctx.log.debug('Start Yahka Restore ...');
    const instance = fileName.split('.');
    const num = instance[1].split('_');
    const tmpDir = (0, node_path_1.join)(options.backupDir, `yahka_${num[0]}.hapdata`).replace(/\\/g, '/');
    ctx.log.debug(`Filename for Restore: ${fileName}`);
    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';
    try {
        (0, fs_extra_1.ensureDirSync)(tmpDir, desiredMode);
        ctx.log.debug(`yahka tmp directory created: ${tmpDir}`);
    }
    catch {
        ctx.log.debug('yahka tmp directory cannot created');
    }
    if ((0, node_fs_1.existsSync)(`${options.path}/yahka.${num[0]}.hapdata`)) {
        try {
            (0, fs_extra_1.removeSync)(`${options.path}/yahka.${num[0]}.hapdata`);
            if (!(0, node_fs_1.existsSync)(`${options.path}/yahka.${num[0]}.hapdata`)) {
                ctx.log.debug('old Yahka database directory was successfully deleted');
            }
        }
        catch {
            ctx.log.debug('old Yahka database directory cannot deleted');
        }
    }
    // Stop yahka - not awaited, so the 3s delay below is what the unpacking relies on.
    let startAfterRestore = false;
    void adapter.getForeignObject(`system.adapter.yahka.${num[0]}`, (err, obj) => {
        if (obj?.common?.enabled) {
            void adapter.setForeignState(`system.adapter.yahka.${num[0]}.alive`, false);
            ctx.log.debug(`yahka.${num[0]} stopped`);
            startAfterRestore = true;
        }
    });
    await (0, tools_1.delay)(STOP_DELAY_MS);
    try {
        await (0, targz_1.decompressAsync)({ src: fileName, dest: tmpDir });
    }
    catch (err) {
        ctx.log.error('Yahka Restore not completed');
        ctx.log.error(err);
        throw err;
    }
    const yahkaPth = (0, node_path_1.join)(options.path, `yahka.${num[0]}.hapdata`).replace(/\\/g, '/');
    try {
        if ((0, node_fs_1.existsSync)(yahkaPth)) {
            (0, fs_extra_1.emptyDirSync)(yahkaPth);
            if (!(0, node_fs_1.readdirSync)(yahkaPth).length) {
                ctx.log.debug('Old Yahka Database is successfully deleted');
            }
        }
    }
    catch {
        ctx.log.debug('old Yahka database cannot deleted');
    }
    (0, fs_extra_1.copySync)(tmpDir, yahkaPth);
    if ((0, node_fs_1.existsSync)(yahkaPth)) {
        ctx.log.debug('Yahka Database is successfully restored');
    }
    ctx.log.debug('Try deleting the Yahka tmp directory');
    (0, fs_extra_1.removeSync)(tmpDir);
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        ctx.log.debug('Yahka tmp directory was successfully deleted');
    }
    // Start yahka
    if (startAfterRestore) {
        void adapter.getForeignObject(`system.adapter.yahka.${num[0]}`, (err, obj) => {
            if (obj && !obj.common?.enabled) {
                void adapter.setForeignState(`system.adapter.yahka.${num[0]}.alive`, true);
                ctx.log.debug(`yahka.${num[0]} started`);
            }
        });
    }
    ctx.log.debug('Yahka Restore completed successfully');
    return 'yahka database restore done';
}
exports.isStop = false;
//# sourceMappingURL=yahka.js.map