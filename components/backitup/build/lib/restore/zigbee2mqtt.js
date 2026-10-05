"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const targz_1 = require("../targz");
/**
 * Restores the Zigbee2MQTT data directory.
 *
 * @param props the run context, the zigbee2mqtt slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    ctx.log.debug('Start Zigbee2MQTT Restore ...');
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(options.path)) {
            ctx.log.debug('Extracting Zigbee2MQTT Backup file...');
        }
        else {
            ctx.log.debug('Something is wrong. No file found.');
        }
    }, 10000);
    const destPth = (0, node_path_1.join)(options.path).replace(/\\/g, '/');
    const tmpDir = (0, node_path_1.join)(options.backupDir, 'zigbee2mqtt_tmp').replace(/\\/g, '/');
    try {
        await (0, fs_extra_1.ensureDir)(tmpDir);
        ctx.log.debug(`Zigbee2MQTT tmp directory created: ${tmpDir}`);
    }
    catch {
        ctx.log.debug('Zigbee2MQTT tmp directory cannot created');
    }
    try {
        await (0, targz_1.decompressAsync)({ src: fileName, dest: tmpDir });
    }
    catch (err) {
        ctx.log.error(err);
        ctx.log.error('Zigbee2MQTT Restore not completed');
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    // Restore Backup-Files
    if (!(0, node_fs_1.existsSync)(tmpDir) || !(0, node_fs_1.existsSync)(destPth)) {
        ctx.log.debug('Zigbee2MQTT Restore not completed. Please check your Path Configuration.');
        return 'Zigbee2MQTT Restore not completed';
    }
    const files = (0, node_fs_1.readdirSync)(destPth);
    // NOTE: `file` is a bare name, so this deletes relative to the process working directory rather
    // than from `destPth`. Kept as found - the removals are awaited now, which the original's async
    // callback inside `forEach` never did.
    for (const file of files) {
        const stat = (0, node_fs_1.statSync)((0, node_path_1.join)(destPth, file));
        if (!stat.isDirectory()) {
            await (0, fs_extra_1.remove)(file);
        }
    }
    try {
        await (0, fs_extra_1.copy)(tmpDir, destPth, {
            filter: (path) => !path.includes('log'),
        });
    }
    catch (err) {
        ctx.log.error(err);
        return 'Zigbee2MQTT restore broken';
    }
    ctx.log.debug('Zigbee2MQTT copy finish');
    ctx.log.debug('Try deleting the Zigbee2MQTT tmp directory');
    await (0, fs_extra_1.remove)(tmpDir);
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        ctx.log.debug('Zigbee2MQTT tmp directory was successfully deleted');
    }
    ctx.log.debug('Zigbee2MQTT Restore completed successfully');
    return 'Zigbee2MQTT restore done';
}
exports.isStop = false;
//# sourceMappingURL=zigbee2mqtt.js.map