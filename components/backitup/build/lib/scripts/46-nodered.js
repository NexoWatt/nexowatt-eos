"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/** Instances are probed by index up to this number, inclusive. */
const MAX_INSTANCE = 100;
/**
 * Packs every `node-red` / `node-red.<n>` data directory it finds.
 *
 * Three things the callback version got wrong, all of them settled by awaiting:
 *
 * - Only index 10 ever reported back, and only when *no* `node-red.10` directory existed. With one
 *   present the step never reported and the whole backup run stopped there.
 * - A failed `compress` reported the error and then reported success again from the outer catch,
 *   so lib/execute scheduled the remaining steps twice.
 * - That outer catch stored `JSON.stringify(err)` of a rejection that carried no reason, i.e. the
 *   JavaScript value `undefined`: `context.errors.nodered` existed but was falsy, which hid the
 *   failure from every notification while still blocking 78-clean.
 *
 * The summary line now comes after the loop instead of at index 10, so instances above 10 make it
 * into the list as well.
 *
 * @param props the run context and the nodered slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    const noderedInst = [];
    try {
        for (let i = 0; i <= MAX_INSTANCE; i++) {
            const nrDir = i === 0 ? 'node-red' : `node-red.${i}`;
            const pth = (0, node_path_1.join)(options.path, nrDir).replace(/\\/g, '/');
            if (!(0, node_fs_1.existsSync)(pth)) {
                continue;
            }
            noderedInst.push(`node-red.${i}`);
            const nameSuffix = options.hostType === 'Slave' && options.slaveSuffix
                ? options.slaveSuffix
                : options.hostType !== 'Slave' && options.nameSuffix
                    ? options.nameSuffix
                    : '';
            const fileName = (0, node_path_1.join)(ctx.backupDir, `nodered.${i}_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
            const tmpDir = (0, node_path_1.join)(ctx.backupDir, `noderedtmp${i}`).replace(/\\/g, '/');
            const desiredMode = {
                mode: 0o2775,
            };
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                ctx.log.debug('Created nodered tmp directory');
                try {
                    await (0, fs_extra_1.ensureDir)(tmpDir, desiredMode);
                }
                catch {
                    ctx.log.error(`Node-Red tmp directory "${tmpDir}" cannot created`);
                }
            }
            else {
                try {
                    await delTmp(ctx, tmpDir);
                }
                catch {
                    ctx.log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
                }
                if (!(0, node_fs_1.existsSync)(tmpDir)) {
                    ctx.log.debug('Created new nodered tmp directory');
                    try {
                        await (0, fs_extra_1.ensureDir)(tmpDir, desiredMode);
                    }
                    catch {
                        ctx.log.error(`Node-Red tmp directory "${tmpDir}" cannot created`);
                    }
                }
            }
            await tmpCopy(pth, tmpDir, ctx);
            await compressBackupFile(fileName, tmpDir, ctx);
            try {
                await delTmp(ctx, tmpDir);
            }
            catch {
                ctx.log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
            }
            ctx.fileNames.push(fileName);
            ctx.types.push(`nodered.${i}`);
            ctx.done.push(`nodered.${i}`);
        }
    }
    catch (err) {
        // A failure still ends the step and leaves the remaining instances alone, as before. The
        // text `compressBackupFile` already stored is kept rather than overwritten.
        ctx.errors.nodered = ctx.errors.nodered || `${err}`;
        ctx.log.error(`Error on node-red Backup: ${err}`);
        throw err;
    }
    if (noderedInst.length) {
        ctx.log.debug(`found node-red database: ${noderedInst.join(',')}`);
    }
    else {
        ctx.log.warn('no node-red database found!!');
    }
}
/**
 * Removes a temporary directory, rejecting when it cannot be deleted.
 *
 * @param ctx run context, for the logger and the error store
 * @param tmpDir directory to remove
 */
async function delTmp(ctx, tmpDir) {
    ctx.log.debug(`Try deleting the old node-red tmp directory: "${tmpDir}"`);
    return (0, fs_extra_1.remove)(tmpDir)
        .then(() => {
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            ctx.log.debug(`node-red tmp directory "${tmpDir}" successfully deleted`);
        }
    })
        .catch(err => {
        ctx.errors.nodered = JSON.stringify(err);
        ctx.log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
        throw err;
    });
}
/**
 * Copies the Node-RED data aside, leaving node_modules out.
 *
 * @param pth source directory
 * @param tmpDir destination directory
 * @param ctx run context, for the logger
 */
async function tmpCopy(pth, tmpDir, ctx) {
    return (0, fs_extra_1.copy)(pth, tmpDir, { filter: entry => !entry.includes('node_modules') }).then(() => {
        ctx.log.debug('Node-Red tmp copy finish');
    });
}
/**
 * Packs the prepared copy.
 *
 * @param fileName archive to write
 * @param tmpDir prepared copy to pack
 * @param ctx run context, for the logger and the error store
 */
async function compressBackupFile(fileName, tmpDir, ctx) {
    try {
        await (0, targz_1.compressAsync)({ src: tmpDir, dest: fileName });
    }
    catch (err) {
        ctx.errors.nodered = err.toString();
        throw err;
    }
    ctx.log.debug(`Backup created: ${fileName}`);
}
exports.ignoreErrors = true;
//# sourceMappingURL=46-nodered.js.map