"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/** How long the original waited for the stopped server before unpacking */
const STOP_DELAY_MS = 2000;
/**
 * Restores the redis dump files.
 *
 * Runs in the detached process, so `context.adapter` is null here.
 *
 * The callback version never reported when the temp directory was missing or held no files - the
 * restore then waited forever. It also copied the files all at once and gated the final report on
 * a counter; the files are copied one after the other now.
 *
 * @param props the run context, the redis slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    ctx.log.debug('Start Redis Restore ...');
    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';
    const tmpDir = (0, node_path_1.join)(options.backupDir, 'redistmp').replace(/\\/g, '/');
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        (0, fs_extra_1.ensureDirSync)(tmpDir, desiredMode);
        ctx.log.debug('Created redistmp directory');
    }
    else {
        ctx.log.debug(`Try deleting the old redis tmp directory: "${tmpDir}"`);
        (0, fs_extra_1.removeSync)(tmpDir);
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            ctx.log.debug(`old redis tmp directory "${tmpDir}" successfully deleted`);
            (0, fs_extra_1.ensureDirSync)(tmpDir, desiredMode);
            ctx.log.debug('Created redistmp directory');
        }
    }
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(options.path)) {
            ctx.log.debug('Extracting Redis Backup file...');
        }
        else {
            ctx.log.debug('Something is wrong. No file found.');
        }
    }, 10000);
    let name;
    // NOTE: `pth` stays undefined when `options.path` exists as a directory is false *and* the file
    // name starts with a dot - `indexOf('.')` is checked for truthiness, so only position 0 counts
    // as "no dot". `join(undefined, file)` then throws below. Kept as found.
    let pth;
    if (!(0, node_fs_1.existsSync)(options.path)) {
        const parts = options.path.replace(/\\/g, '/').split('/');
        name = parts.pop();
        if (name.indexOf('.')) {
            pth = parts.join('/');
        }
    }
    else {
        pth = options.path;
    }
    ctx.log.debug('decompress started ...');
    await (0, tools_1.delay)(STOP_DELAY_MS);
    try {
        await (0, targz_1.decompressAsync)({ src: fileName, dest: tmpDir });
    }
    catch (err) {
        ctx.log.error('Redis Restore not completed');
        ctx.log.error(err);
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        ctx.log.error(`Redis Restore not completed: "${tmpDir}" is missing`);
        return 'redis restore is incomplete';
    }
    const files = (0, node_fs_1.readdirSync)(tmpDir);
    if (!files.length) {
        ctx.log.error(`Redis Restore not completed: no files in "${tmpDir}"`);
        return 'redis restore is incomplete';
    }
    // A failed copy no longer stops the remaining files, as before - but the cleanup and the
    // "restart" step below stay skipped, which is what the counter gate did.
    let broken = false;
    for (const file of files) {
        try {
            await new Promise((resolve, reject) => {
                (0, tools_1.copyFile)((0, node_path_1.join)(tmpDir, file), (0, node_path_1.join)(pth, file), err => (err ? reject(err) : resolve()));
            });
        }
        catch (err) {
            ctx.log.error(err);
            broken = true;
            continue;
        }
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(`${pth}/${file}`))) {
            ctx.log.debug(`redis file ${file} successfully restored`);
        }
        ctx.log.debug('redis-cli restart, please wait ...');
    }
    if (broken) {
        return 'redis restore broken';
    }
    if (options.aof === true) {
        ctx.log.debug('redis-cli bgrewriteaof started, please wait ...');
        try {
            (0, node_child_process_1.exec)(`redis-cli bgrewriteaof`, error => {
                if (error) {
                    ctx.log.debug(`redis-cli bgrewriteaof error: "${error}"`);
                }
            });
        }
        catch (e) {
            ctx.log.debug(`redis-cli bgrewriteaof error: "${e}"`);
        }
    }
    try {
        ctx.log.debug(`Try deleting the redis tmp directory: "${tmpDir}"`);
        (0, fs_extra_1.removeSync)(tmpDir);
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            ctx.log.debug(`redis tmp directory "${tmpDir}" successfully deleted`);
        }
    }
    catch (err) {
        ctx.log.debug(`redis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
        return 'redis restore is incomplete';
    }
    ctx.log.debug('Redis Restore completed successfully');
    return 'redis restore done';
}
exports.isStop = true;
//# sourceMappingURL=redis.js.map