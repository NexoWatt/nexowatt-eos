"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.selectInfluxBackupsToDelete = selectInfluxBackupsToDelete;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const sdCard_1 = require("../sdCard");
const tools_1 = require("../tools");
/**
 * Copies every file of this run into the selected directory, one after the other.
 *
 * A failed copy is recorded and logged. For the SD-card target the caller turns the first failure
 * into a fatal run error so the system never reports a successful external backup that only exists
 * on the SSD/eMMC.
 *
 * @param dir target directory
 * @param fileNames the files to copy; this list is consumed
 * @param ctx run context, for the logger and the error store
 */
async function copyFiles(dir, fileNames, ctx) {
    let firstError;
    while (fileNames.length) {
        let fileName = fileNames.shift();
        fileName = fileName.replace(/\\/g, '/');
        const onlyFileName = fileName.split('/').pop();
        try {
            ctx.log.debug(`Copy ${onlyFileName}...`);
            await new Promise((resolve, reject) => {
                (0, tools_1.copyFile)(fileName, (0, node_path_1.join)(dir, onlyFileName), err => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        catch (error) {
            const failure = error instanceof Error ? error : new Error(String(error));
            firstError ??= failure;
            ctx.errors.cifs = failure;
            ctx.log.error(`Kopieren von ${onlyFileName} fehlgeschlagen: ${failure.message}`);
        }
    }
    return firstError;
}
/**
 * Deletes the given files, stopping at the first one that fails.
 *
 * @param files absolute paths to delete
 * @param ctx run context, for the logger and the error store
 */
function deleteFiles(files, ctx) {
    try {
        for (let f = 0; f < files.length; f++) {
            ctx.log.debug(`delete ${files[f]}`);
            (0, node_fs_1.unlinkSync)(files[f]);
        }
        return true;
    }
    catch (e) {
        ctx.errors.cifs = ctx.errors.cifs || e;
        ctx.log.error(e);
        return undefined;
    }
}
/**
 * Drops everything but the newest `num` backups per backup type.
 *
 * @param dir directory to clean
 * @param options script options, for the multi-instance counts
 * @param names backup types of this run
 * @param num how many to keep per type
 * @param ctx run context, for the logger and the error store
 */
function cleanFiles(dir, options, names, num, ctx) {
    if (!num) {
        return;
    }
    try {
        if (dir[dir.length - 1] !== '/') {
            dir += '/';
        }
        const result = (0, node_fs_1.readdirSync)(dir);
        if (result && result.length) {
            const files = [];
            names.forEach(name => {
                const subResult = result.filter(a => a.startsWith(name));
                let numDel = num;
                // Multi-instance setups produce one file per configured target per run.
                if (name === 'influxDB' && options.influxDBMulti) {
                    numDel = num * options.influxDBEvents.length;
                }
                if (name === 'mysql' && options.mySqlMulti) {
                    numDel = num * options.mySqlEvents.length;
                }
                if (name === 'pgsql' && options.pgSqlMulti) {
                    numDel = num * options.pgSqlEvents.length;
                }
                if (name === 'homematic' && options.ccuMulti) {
                    numDel = num * options.ccuEvents.length;
                }
                if (subResult.length > numDel) {
                    // delete oldest files
                    subResult.sort((a, b) => {
                        const at = (0, node_fs_1.statSync)(dir + a).ctime;
                        const bt = (0, node_fs_1.statSync)(dir + b).ctime;
                        if (at > bt) {
                            return -1;
                        }
                        if (at < bt) {
                            return 1;
                        }
                        return 0;
                    });
                    for (let i = numDel; i < subResult.length; i++) {
                        files.push((0, node_path_1.join)(dir, subResult[i]));
                    }
                }
            });
            deleteFiles(files, ctx);
        }
    }
    catch (e) {
        ctx.errors.cifs = ctx.errors.cifs || e;
    }
}
/**
 * Returns the old InfluxDB archive names that must be removed for rolling retention.
 *
 * One series is kept per suffix. A normal single-InfluxDB installation therefore has exactly one
 * series and keeps exactly the newest three archives. Multi-InfluxDB setups retain three archives
 * for each configured suffix instead of accidentally deleting the last usable backup of a target.
 *
 * @param fileNames plain file names from the SD-card target
 * @param limit generations to keep per series
 */
function selectInfluxBackupsToDelete(fileNames, limit = 3) {
    const keep = Math.max(1, Math.trunc(Number(limit) || 3));
    const parsed = [];
    const pattern = /^influxDB_(\d{4}_\d{2}_\d{2}-\d{2}_\d{2}_\d{2})(?:_(.*?))?_backupiobroker\.tar\.gz$/i;
    for (const name of fileNames) {
        const match = pattern.exec((0, node_path_1.basename)(name));
        if (!match) {
            continue;
        }
        parsed.push({
            name: (0, node_path_1.basename)(name),
            timestamp: match[1],
            series: match[2] || '__default__',
        });
    }
    const series = new Map();
    for (const file of parsed) {
        const current = series.get(file.series) || [];
        current.push(file);
        series.set(file.series, current);
    }
    const remove = [];
    for (const files of series.values()) {
        files.sort((a, b) => {
            const byTime = b.timestamp.localeCompare(a.timestamp);
            return byTime || b.name.localeCompare(a.name);
        });
        remove.push(...files.slice(keep).map(file => file.name));
    }
    return remove.sort();
}
/**
 * Keeps only the configured number of InfluxDB generations on the SD card.
 */
function pruneSdCardInfluxBackups(dir, limit, ctx) {
    const fileNames = (0, node_fs_1.readdirSync)(dir);
    const toDelete = selectInfluxBackupsToDelete(fileNames, limit);
    for (const fileName of toDelete) {
        const absolute = (0, node_path_1.join)(dir, fileName);
        ctx.log.debug(`SD-Karten-Rotation: älteste InfluxDB-Sicherung wird gelöscht: ${fileName}`);
        (0, node_fs_1.unlinkSync)(absolute);
    }
    const remaining = fileNames.filter(name => /^influxDB_/i.test(name)).length - toDelete.length;
    ctx.log.debug(`SD-Karten-Rotation abgeschlossen: ${remaining} InfluxDB-Sicherungsdatei(en) vorhanden.`);
}
/**
 * Copies this run's archives into the mounted NAS/SD-card directory and prunes the old ones.
 *
 * @param props the run context and the cifs slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    if (!ctx.fileNames || !ctx.fileNames.length) {
        return;
    }
    let dir = String(options.dir || '').replace(/\\/g, '/');
    if (options.mountType === 'SDCard') {
        const target = await (0, sdCard_1.validateSdCardTarget)(options.sdCardMountPath || options.mount || '', options.sdCardBackupSubDir, { createDirectory: true, writeTest: true });
        dir = target.backupDir;
        options.dir = target.backupDir;
        options.mount = target.mountPoint;
    }
    if (!dir) {
        return;
    }
    const fileNames = JSON.parse(JSON.stringify(ctx.fileNames));
    const copiedInfluxDb = fileNames.some(fileName => /^influxDB_/i.test((0, node_path_1.basename)(fileName)));
    if (dir[0] !== '/' && !dir.match(/\w:/)) {
        dir = `/${dir || ''}`;
    }
    ctx.log.debug(`used copy path: ${dir}`);
    if (!(0, node_fs_1.existsSync)(dir)) {
        if (options.mountType === 'Copy' || options.mountType === 'SDCard') {
            throw new Error(options.mountType === 'SDCard'
                ? `SD-Karten-Ziel „${dir}“ ist nicht verfügbar. Die Sicherung wird abgebrochen; es gibt kein Fallback auf den Systemdatenträger.`
                : `Path "${dir}" not found`);
        }
        return;
    }
    if (dir === ctx.backupDir) {
        throw new Error(`The storage path "${dir}" for copying is not configured correctly`);
    }
    const copyError = await copyFiles(dir, fileNames, ctx);
    if (copyError && options.mountType === 'SDCard') {
        throw copyError;
    }
    if (!copyError && options.mountType === 'SDCard' && copiedInfluxDb) {
        try {
            pruneSdCardInfluxBackups(dir, Number(options.sdCardInfluxRetention) || 3, ctx);
        }
        catch (error) {
            const failure = error instanceof Error ? error : new Error(String(error));
            ctx.errors.cifs = failure;
            throw new Error(`InfluxDB-Rotation auf der SD-Karte fehlgeschlagen: ${failure.message}`);
        }
    }
    if (options.deleteOldBackup === true) {
        cleanFiles(dir, options, ctx.types, options.deleteBackupAfter, ctx);
    }
    if (!ctx.errors.cifs) {
        ctx.done.push('cifs');
    }
}
exports.ignoreErrors = true;
