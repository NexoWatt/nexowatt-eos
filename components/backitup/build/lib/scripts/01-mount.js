"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_wol_1 = require("node-wol");
const tools_1 = require("../tools");
const sdCard_1 = require("../sdCard");
/** How long to wait after "device is busy" before the second umount attempt */
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
 * Writes the marker file that records an active mount
 *
 * @param options resolved storage settings
 * @param ctx run context, for the logger
 */
function writeMountMarker(options, ctx) {
    try {
        (0, node_fs_1.writeFileSync)(`${options.fileDir}/.mount`, options.mountType);
    }
    catch (e) {
        ctx.log.warn(`file ".mount" cannot created: ${e}`);
    }
}
/**
 * Runs a command and hands back everything `exec` reported.
 *
 * It never rejects: the `mount | grep` call below is expected to fail whenever nothing matches, and
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
 * Unmounts a directory that is still mounted from an earlier run.
 *
 * @param ctx run context
 * @param options resolved storage settings
 */
async function umountBefore(ctx, options) {
    if (!(0, node_fs_1.existsSync)(`${options.fileDir}/.mount`)) {
        return;
    }
    const mounted = await execAsync(`mount | grep -o "${ctx.backupDir}"`);
    if (!mounted.stdout.includes(ctx.backupDir)) {
        return;
    }
    ctx.log.debug('mount activ... umount is started before mount!!');
    const first = await execAsync(`${options.sudo ? 'sudo umount' : 'umount'} ${ctx.backupDir}`);
    if (!first.error) {
        ctx.done.push('umount');
        ctx.log.debug('umount successfully completed');
        dropMountMarker(options, ctx);
        return;
    }
    ctx.log.debug('device is busy... wait 2 Minutes!!');
    await (0, tools_1.delay)(BUSY_RETRY_MS);
    const retry = await execAsync(`${options.sudo ? 'sudo umount' : 'umount'} ${ctx.backupDir}`);
    if (retry.error) {
        ctx.errors.umount = retry.error;
        ctx.log.error(retry.stderr);
    }
    else {
        ctx.done.push('umount');
        ctx.log.debug('umount successfully completed');
        dropMountMarker(options, ctx);
    }
}
/**
 * Mounts the configured NAS share into the backup directory.
 *
 * Two races the callback version had, both settled by awaiting:
 *
 * - The leftover mount from an earlier run was unmounted *next to* the new mount, not before it:
 *   the mount was scheduled by a timer at the same moment. On the "device is busy" path the retry
 *   waits two minutes, so the new mount went onto a directory that was still mounted.
 * - A failing Wake-on-LAN reported "NO Wake on LAN specified!" from its callback while the mount
 *   was already on its way, and the mount reported a second time when it finished.
 *
 * A failed mount keeps being reported as a *successful* step with the error only in
 * `context.errors.mount` - that is how the following steps and the notifications see it, and it is
 * left that way.
 *
 * @param props the run context and the storage slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    let waitTime = 10000;
    if (options.mountType === 'SDCard') {
        try {
            const target = await (0, sdCard_1.validateSdCardTarget)(options.sdCardMountPath || options.mount, options.sdCardBackupSubDir, { createDirectory: true, writeTest: true });
            // `options` is the run's live storage object. Keeping the validated path here means
            // the later copy step uses exactly the mount point that passed the preflight check.
            options.mount = target.mountPoint;
            options.dir = target.backupDir;
            ctx.log.debug(`SD-Karte geprüft: ${target.device}; Backupziel: ${target.backupDir}; frei: ${(0, sdCard_1.formatSdCardFreeSpace)(target.freeBytes)}`);
            ctx.done.push('mount');
            return;
        }
        catch (error) {
            const failure = error instanceof Error ? error : new Error(String(error));
            ctx.errors.mount = failure;
            ctx.log.error(`SD-Karten-Prüfung fehlgeschlagen: ${failure.message}`);
            throw failure;
        }
    }
    // The `=== 'true'` arms look redundant against the declared boolean types, but instance
    // configurations written by older versions really do carry the strings.
    const wakeOnLan = options.wakeOnLAN === 'true' || options.wakeOnLAN === true;
    const wolExtra = options.wolExtra === 'true' || options.wolExtra === true;
    if (wakeOnLan) {
        // Started before the two log lines below, so their order is the one the original produced.
        const woken = new Promise(resolve => {
            (0, node_wol_1.wake)(options.macAd, {
                address: wolExtra ? options.mount : '255.255.255.255',
                port: wolExtra ? options.wolPort : 9,
            }, error => resolve(error || null));
        });
        waitTime = options.wolTime * 1000;
        ctx.log.debug(`Wake on LAN wait ${options.wolTime} Seconds for NAS!`);
        const wakeError = await woken;
        if (wakeError) {
            ctx.log.error(wakeError);
            // A plain string, as before: wrapping it in an Error would prefix the reported text.
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw 'NO Wake on LAN specified!';
        }
        ctx.log.debug(`Wake on LAN MAC-Address: ${options.macAd}`);
    }
    if (options.mountType === 'CIFS' && options.mount && !options.mount.startsWith('//')) {
        options.mount = `//${options.mount}`;
    }
    if ((options.mountType === 'CIFS' && options.mount && !options.dir.startsWith('/')) ||
        (options.mountType === 'NFS' && options.mount && !options.dir.startsWith('/'))) {
        options.dir = `/${options.dir}`;
    }
    // Note the asymmetry in the second clause - unlike lib/list/cifs this one tests
    // `options.pass.endsWith("'")` without negating it. Kept as found.
    if ((!options.pass.startsWith(`"`) || !options.pass.endsWith(`"`)) &&
        (!options.pass.startsWith(`'`) || options.pass.endsWith(`'`))) {
        options.pass = `"${options.pass}"`;
    }
    if (!options.mount) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'NO mount path specified!';
    }
    if (options.mountType === 'Copy') {
        return;
    }
    if (options.mountType === 'CIFS' || options.mountType === 'NFS' || options.mountType === 'Expert') {
        await umountBefore(ctx, options);
    }
    if (options.mountType === 'CIFS') {
        const common = `${options.cifsDomain ? `,domain=${options.cifsDomain}` : ''}` +
            `${options.clientInodes ? ',noserverino' : ''}` +
            `${options.cacheLoose ? ',cache=loose' : ''}` +
            `,rw,forceuid,uid=iobroker,forcegid,gid=iobroker,file_mode=0777,dir_mode=0777`;
        const credentials = options.user ? `username=${options.user},password=${options.pass}` : '';
        const masked = options.user ? `username=${options.user},password=****` : '';
        const mountCmd = `${options.sudo ? 'sudo mount' : 'mount'} -t cifs -o `;
        const target = ` ${options.mount}${options.dir} ${ctx.backupDir}`;
        await (0, tools_1.delay)(waitTime);
        ctx.log.debug(`cifs-mount command: "${mountCmd}${masked}${common},${options.smb}${target}"`);
        const first = await execAsync(`${mountCmd}${credentials}${common},${options.smb}${target}`);
        if (!first.error) {
            ctx.log.debug('mount successfully completed');
            ctx.done.push('mount');
            // Unlike every other branch this write is not guarded by a try/catch.
            (0, node_fs_1.writeFileSync)(`${options.fileDir}/.mount`, options.mountType);
            return;
        }
        ctx.log.debug('first mount attempt with smb option failed. try next mount attempt without smb option ...');
        ctx.log.debug(`cifs-mount command: "${mountCmd}${masked}${common}${target}"`);
        const retry = await execAsync(`${mountCmd}${credentials}${common}${target}`);
        if (retry.error) {
            // `ExecException` is declared as Omit<ErrnoException, 'code'>, which drops the nominal
            // Error identity; binding it back keeps the formatting equal.
            const failure = retry.error;
            let errLog = String(failure);
            try {
                const formatPass = options.pass.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                errLog = errLog.replace(new RegExp(formatPass, 'g'), '****');
            }
            catch {
                // ignore
            }
            ctx.errors.mount = retry.error;
            ctx.log.error(`[${options.name} ${errLog}`);
        }
        else {
            ctx.log.debug('mount successfully completed');
            ctx.done.push('mount');
            writeMountMarker(options, ctx);
        }
        return;
    }
    if (options.mountType === 'NFS') {
        await (0, tools_1.delay)(waitTime);
        ctx.log.debug(`nfs-mount command: "${options.sudo ? 'sudo mount' : 'mount'} ${options.mount}:${options.dir} ${ctx.backupDir}"`);
        const mounted = await execAsync(`${options.sudo ? 'sudo mount' : 'mount'} ${options.mount}:${options.dir} ${ctx.backupDir}`);
        if (mounted.error) {
            ctx.errors.mount = mounted.error;
            ctx.log.error(`[${options.name} ${mounted.stderr}`);
        }
        else {
            ctx.log.debug('mount successfully completed');
            ctx.done.push('mount');
            writeMountMarker(options, ctx);
        }
        return;
    }
    if (options.mountType === 'Expert') {
        await (0, tools_1.delay)(waitTime);
        ctx.log.debug(`expert-mount command: "${options.expertMount}"`);
        const mounted = await execAsync(options.expertMount);
        if (mounted.error) {
            ctx.errors.mount = mounted.error;
            ctx.log.error(`[${options.name} ${mounted.stderr}`);
        }
        else {
            ctx.log.debug('expert-mount successfully completed');
            ctx.done.push('mount');
            writeMountMarker(options, ctx);
        }
    }
}
exports.ignoreErrors = true;
