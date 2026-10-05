"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const tools_1 = require("../tools");
/** How long to wait before the umount attempt */
const SETTLE_MS = 5000;
/** How long to wait after "device is busy" before the lazy umount */
const BUSY_RETRY_MS = 120000;
/**
 * Drops the marker file that records an active mount
 *
 * @param options resolved storage settings
 * @param ctx run context, for the logger
 */
function dropMountMarker(options, ctx) {
    try {
        if ((0, node_fs_1.existsSync)(`${options.fileDir}/.mount`)) {
            (0, node_fs_1.unlinkSync)(`${options.fileDir}/.mount`);
        }
    }
    catch (e) {
        ctx.log.warn(`file ".mount" cannot deleted: ${e}`);
    }
}
/**
 * Runs a command and hands back everything `exec` reported.
 *
 * It never rejects: the first call below is expected to fail whenever `grep` finds nothing, and
 * that case is decided on the output rather than on the exit code - as it was before.
 *
 * @param cmd the command line to run
 */
async function execAsync(cmd) {
    return new Promise(resolve => {
        (0, node_child_process_1.exec)(cmd, (error, stdout, stderr) => resolve({ error, stdout, stderr }));
    });
}
/**
 * Unmounts the backup directory again.
 *
 * The callback version never reported when the `.mount` marker file was missing - the backup run
 * then waited for a step that had already returned. That case now logs and ends the step.
 *
 * @param props the run context and the storage slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    if (!options.mount) {
        // A plain string, as before: wrapping it in an Error would prefix the reported text.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'NO mount path specified!';
    }
    if (options.mountType !== 'CIFS' && options.mountType !== 'NFS' && options.mountType !== 'Expert') {
        return;
    }
    if (!(0, node_fs_1.existsSync)(`${options.fileDir}/.mount`)) {
        ctx.log.debug('no mount marker found, umount not started ...');
        return;
    }
    const mounted = await execAsync(`mount | grep -o "${ctx.backupDir}"`);
    if (!mounted.stdout.includes(ctx.backupDir)) {
        ctx.done.push('umount');
        ctx.log.debug('mount inactive, umount not started ...');
        dropMountMarker(options, ctx);
        return;
    }
    ctx.log.debug('mount active, umount is started ...');
    await (0, tools_1.delay)(SETTLE_MS);
    const umounted = await execAsync(`${options.sudo ? 'sudo umount' : 'umount'} ${ctx.backupDir}`);
    if (umounted.error) {
        ctx.log.debug('device is busy... wait 2 Minutes!!');
        await (0, tools_1.delay)(BUSY_RETRY_MS);
        const lazy = await execAsync(`${options.sudo ? 'sudo umount' : 'umount'} -l ${ctx.backupDir}`);
        if (lazy.error) {
            ctx.errors.umount = lazy.error;
            ctx.log.error(lazy.stderr);
            throw lazy.error;
        }
    }
    ctx.done.push('umount');
    ctx.log.debug('umount successfully completed');
    dropMountMarker(options, ctx);
}
exports.ignoreErrors = true;
