"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageKey = void 0;
exports.list = list;
exports.getFile = getFile;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_1 = require("../tools");
const sdCard_1 = require("../sdCard");
const backupDir = (0, node_path_1.join)((0, tools_1.getIobDir)(), 'backups').replace(/\\/g, '/');
/** Not the module name: the restore tab and lib/restore address a NAS source by this key. */
exports.storageKey = 'nas / copy';
/**
 * Lists the backups on the NAS share, mounting it first when the configuration says so.
 *
 * @param props run context, storage config, requested source and backup types
 */
async function list(props) {
    const { context: { log }, options, restoreSource, types, } = props;
    if (!options.enabled || (restoreSource && restoreSource !== 'cifs')) {
        // Switched off, or another storage was asked for - nothing to file.
        return undefined;
    }
    if (options.mountType === 'SDCard') {
        try {
            const target = await (0, sdCard_1.validateSdCardTarget)(options.sdCardMountPath || options.mount, options.sdCardBackupSubDir, { createDirectory: false, writeTest: false, accessMode: 'read' });
            options.dir = target.backupDir;
            options.dirMinimal = target.backupDir;
            options.ownDir = false;
        }
        catch (error) {
            // An empty/new card has no backup folder yet. Listing it is empty,
            // not a permission failure, and must not create files on the card.
            if (error.code === 'SD_BACKUP_DIR_MISSING') {
                return {};
            }
            log.error(`SD-Karte ist nicht verfügbar: ${error.message}`);
            return {};
        }
    }
    if (options.mountType === 'CIFS' || options.mountType === 'NFS' || options.mountType === 'Expert') {
        await new Promise(resolve => mount(options, log, error => {
            if (error) {
                log.error(String(error));
            }
            resolve();
        }));
    }
    return nasList(restoreSource, options, types, log);
}
/**
 * Reads the mounted (or plainly copied) directory.
 *
 * @param restoreSource the storage that was asked for
 * @param options resolved storage settings
 * @param types backup types to look for
 * @param log adapter logger
 */
function nasList(restoreSource, options, types, log) {
    if (options.enabled && (!restoreSource || restoreSource === 'cifs')) {
        let dir = backupDir.replace(/\\/g, '/');
        if (options.mountType === 'Copy' || options.mountType === 'SDCard') {
            if (options.ownDir === true) {
                dir = options.dirMinimal.replace(/\\/g, '/');
            }
            else if (options.ownDir === false) {
                dir = options.dir.replace(/\\/g, '/');
            }
        }
        if (dir[0] !== '/' && !dir.match(/\w:/)) {
            dir = `/${dir || ''}`;
        }
        const files = {};
        if ((0, node_fs_1.existsSync)(dir)) {
            try {
                const paths = (0, node_fs_1.readdirSync)(dir)
                    .sort()
                    .map(file => (0, node_path_1.join)(dir, file).replace(/\\/g, '/'));
                if (paths && paths.length) {
                    const result = paths
                        .map(file => {
                        const stat = (0, node_fs_1.statSync)(file);
                        return { path: file, name: file.split('/').pop(), size: stat.size };
                    })
                        .filter(file => (types.indexOf(file.name.split('_')[0]) !== -1 ||
                        types.indexOf(file.name.split('.')[0]) !== -1) &&
                        file.name.split('.').pop() == 'gz');
                    result.forEach(file => {
                        const type = file.name.split('_')[0];
                        files[type] = files[type] || [];
                        files[type].push(file);
                    });
                }
            }
            catch (e) {
                log.warn(`Source cannot be reached: ${e}`);
            }
        }
        // The caller files this under the engine's own key. Note that key is 'nas / copy', not
        // 'cifs' - that is what the restore tab and lib/restore address a NAS source by.
        return files;
    }
    return undefined;
}
/**
 * Copies one backup off the share, or does nothing when it is mounted onto the backup directory.
 *
 * @param options resolved storage settings
 * @param fileName the file as the storage names it
 * @param toStoreName where to put it locally
 * @param log adapter logger
 */
async function copyFileCifs(options, fileName, toStoreName, log) {
    return new Promise((resolve, reject) => {
        const callback = (err) => (err ? reject(err) : resolve());
        try {
            log.debug(`Get file ${fileName}`);
            log.debug(`Mount type: ${options.mountType != undefined ? options.mountType : 'Copy'}`);
            if (options.mountType === 'CIFS' || options.mountType === 'NFS' || options.mountType === 'Expert') {
                callback(null);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const fse = require('fs-extra');
                fse.copy(fileName, toStoreName, (err) => {
                    if (err) {
                        log.error(String(err));
                    }
                    callback(null);
                });
            }
        }
        catch (e) {
            log.error(String(e));
            if (options.mountType === 'CIFS' || options.mountType === 'NFS' || options.mountType === 'Expert') {
                umount(options, log, error => callback(error));
            }
            else {
                callback(e);
            }
        }
    });
}
/**
 * Fetches one backup from the NAS share.
 *
 * @param props run context, storage config, the file to fetch and where to put it
 */
async function getFile(props) {
    const { context: { log }, options, fileName, toStoreName, } = props;
    if (!options || !options.enabled) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'Not configured';
    }
    if (options.mountType === 'CIFS' || options.mountType === 'NFS' || options.mountType === 'Expert') {
        // Nothing to fetch - the share is mounted onto the backup directory itself.
        return;
    }
    if (options.mountType === 'SDCard') {
        const target = await (0, sdCard_1.validateSdCardTarget)(options.sdCardMountPath || options.mount, options.sdCardBackupSubDir, { createDirectory: false, writeTest: false, accessMode: 'read' });
        options.dir = target.backupDir;
    }
    return copyFileCifs(options, fileName, toStoreName, log);
}
/**
 * Removes the marker file that records an active mount
 *
 * @param options resolved storage settings
 * @param log adapter logger
 * @param markerPath file to unlink
 */
function dropMountMarker(options, log, markerPath) {
    try {
        if ((0, node_fs_1.existsSync)(`${options.fileDir}/.mount`)) {
            (0, node_fs_1.unlinkSync)(markerPath);
        }
    }
    catch (e) {
        log.debug(`file ".mount" cannot deleted: ${e}`);
    }
}
/**
 * Writes the marker file that records an active mount
 *
 * @param options resolved storage settings
 * @param log adapter logger
 */
function writeMountMarker(options, log) {
    try {
        (0, node_fs_1.writeFileSync)(`${options.fileDir}/.mount`, options.mountType);
    }
    catch (e) {
        log.debug(`file ".mount" cannot created: ${e}`);
    }
}
function mount(options, log, callback) {
    let dir = options.dir;
    if (options.ownDir === true) {
        dir = options.dirMinimal;
    }
    if ((0, node_fs_1.existsSync)(`${options.fileDir}/.mount`)) {
        (0, node_child_process_1.exec)(`mount | grep -o "${backupDir}"`, (_error, stdout) => {
            if (stdout.includes(backupDir)) {
                (0, node_child_process_1.exec)(`${options.sudo ? 'sudo umount' : 'umount'} ${backupDir}`, error => {
                    if (error) {
                        log.debug('device is busy... wait 2 Minutes!!');
                        setTimeout(() => {
                            (0, node_child_process_1.exec)(`${options.sudo ? 'sudo umount' : 'umount'} -l ${backupDir}`, (lazyError, _lazyStdout, lazyStderr) => {
                                if (lazyError) {
                                    log.error(lazyStderr);
                                }
                                else {
                                    // Note the missing slash: this deletes `<fileDir>.mount`,
                                    // not `<fileDir>/.mount`, so the marker survives here.
                                    // Preserved - the marker drives the mount bookkeeping.
                                    dropMountMarker(options, log, `${options.fileDir}.mount`);
                                }
                            });
                        }, 120000);
                    }
                    else {
                        dropMountMarker(options, log, `${options.fileDir}/.mount`);
                    }
                });
            }
        });
    }
    if (options.mountType === 'CIFS') {
        if (!options.mount.startsWith('//')) {
            options.mount = `//${options.mount}`;
        }
        if (!dir.startsWith('/')) {
            dir = `/${dir}`;
        }
        if ((!options.pass.startsWith(`"`) || !options.pass.endsWith(`"`)) &&
            (!options.pass.startsWith(`'`) || !options.pass.endsWith(`'`))) {
            options.pass = `"${options.pass}"`;
        }
        const common = `${options.cifsDomain ? `,domain=${options.cifsDomain}` : ''}` +
            `${options.clientInodes ? ',noserverino' : ''}` +
            `${options.cacheLoose ? ',cache=loose' : ''}` +
            `,rw,forceuid,uid=iobroker,forcegid,gid=iobroker,file_mode=0777,dir_mode=0777`;
        const credentials = options.user ? `username=${options.user},password=${options.pass}` : '';
        const masked = options.user ? `username=${options.user},password=****` : '';
        const mountCmd = `${options.sudo ? 'sudo mount' : 'mount'} -t cifs -o `;
        const target = ` ${options.mount}${dir} ${backupDir}`;
        log.debug(`cifs-mount command: "${mountCmd}${masked}${common},${options.smb}${target}"`);
        (0, node_child_process_1.exec)(`${mountCmd}${credentials}${common},${options.smb}${target}`, (error, stdout) => {
            if (error) {
                log.debug('first mount attempt with smb option failed. try next mount attempt without smb option ...');
                log.debug(`cifs-mount command: "${mountCmd}${masked}${common}${target}"`);
                (0, node_child_process_1.exec)(`${mountCmd}${credentials}${common}${target}`, (retryError, retryStdout) => {
                    if (retryError) {
                        // `ExecException` is declared as Omit<ErrnoException, 'code'>, which drops the
                        // nominal Error identity. The value really is an Error, so binding it as one
                        // keeps the formatted output identical to the previous `${error}`.
                        const failure = retryError;
                        let errLog = String(failure);
                        try {
                            const formatPass = options.pass.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            errLog = errLog.replace(new RegExp(formatPass, 'g'), '****');
                        }
                        catch {
                            // ignore
                        }
                        callback?.(errLog);
                    }
                    else {
                        log.debug('mount successfully completed');
                        writeMountMarker(options, log);
                        callback?.(null, retryStdout);
                    }
                });
            }
            else {
                log.debug('mount successfully completed');
                writeMountMarker(options, log);
                callback?.(null, stdout);
            }
        });
    }
    else if (options.mountType === 'NFS') {
        if (!dir.startsWith('/')) {
            dir = `/${dir}`;
        }
        log.debug(`nfs-mount command: "${options.sudo ? 'sudo mount' : 'mount'} ${options.mount}:${dir} ${backupDir}"`);
        (0, node_child_process_1.exec)(`${options.sudo ? 'sudo mount' : 'mount'} ${options.mount}:${dir} ${backupDir}`, (error, stdout) => {
            if (error) {
                callback?.(error);
            }
            else {
                log.debug('mount successfully completed');
                writeMountMarker(options, log);
                callback?.(null, stdout);
            }
        });
    }
    else if (options.mountType === 'Expert') {
        log.debug(`expert-mount command: "${options.expertMount}"`);
        (0, node_child_process_1.exec)(options.expertMount, (error, stdout) => {
            if (error) {
                callback?.(error);
            }
            else {
                log.debug('expert-mount successfully completed');
                writeMountMarker(options, log);
                callback?.(null, stdout);
            }
        });
    }
    else {
        // Closed hang: for any other mount type none of the branches above ran and the callback
        // was never invoked, so the listing waited forever. Nothing was mounted, so this reports
        // success and the caller carries straight on to reading the directory.
        log.debug(`No mount needed for mount type "${String(options.mountType)}"`);
        callback?.(null);
    }
}
function umount(options, log, callback) {
    if (!options.mount) {
        callback?.('NO mount path specified!');
        return;
    }
    if (!(0, node_fs_1.existsSync)(`${options.fileDir}/.mount`)) {
        // Closed hang: without the marker there is nothing mounted, and the callback used to be
        // dropped here, so the caller waited forever.
        log.debug('no mount marker present, umount not needed');
        callback?.(null);
        return;
    }
    (0, node_child_process_1.exec)(`mount | grep -o "${backupDir}"`, (_error, stdout) => {
        if (stdout.includes(backupDir)) {
            (0, node_child_process_1.exec)(`${options.sudo ? 'sudo umount' : 'umount'} ${backupDir}`, (error, umountStdout) => {
                if (error) {
                    log.debug('device is busy... wait 2 Minutes!!');
                    setTimeout(() => {
                        (0, node_child_process_1.exec)(`${options.sudo ? 'sudo umount' : 'umount'} -l ${backupDir}`, (lazyError, lazyStdout, lazyStderr) => {
                            if (lazyError) {
                                log.error(lazyStderr);
                                callback?.(lazyError);
                            }
                            else {
                                log.debug('umount successfully completed');
                                dropMountMarker(options, log, `${options.fileDir}/.mount`);
                                callback?.(null, lazyStdout);
                            }
                        });
                    }, 120000);
                }
                else {
                    log.debug('umount successfully completed');
                    dropMountMarker(options, log, `${options.fileDir}/.mount`);
                    callback?.(null, umountStdout);
                }
            });
        }
        else {
            log.debug('mount inactive, umount not started ...');
            dropMountMarker(options, log, `${options.fileDir}/.mount`);
            callback?.(null);
        }
    });
}
