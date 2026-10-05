"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const googleDriveLib_1 = __importDefault(require("../googleDriveLib"));
/**
 * Uploads every file of this run, one after the other.
 *
 * A failed write used to schedule the next file from its own `catch` while the `.then` behind it
 * scheduled the next file as well: the walk advanced twice, skipped a file and carried on as two
 * parallel walks that each reported when they reached the end. Awaiting each upload settles all of
 * that - no file is skipped and the step reports once.
 *
 * @param gDrive client instance
 * @param dir target directory
 * @param fileNames the files to send; this list is consumed
 * @param ctx run context, for the logger
 */
async function copyFiles(gDrive, dir, fileNames, ctx) {
    while (fileNames.length) {
        let fileName = fileNames.shift();
        fileName = fileName.replace(/\\/g, '/');
        const onlyFileName = fileName.split('/').pop();
        if (!(0, node_fs_1.existsSync)(fileName)) {
            ctx.log.error(`Google Drive: File "${fileName}" not found`);
            // The original waited 150ms before the next file here too; the API is rate limited.
            await new Promise(resolve => setTimeout(resolve, 150));
            continue;
        }
        try {
            const folderId = await gDrive.createFolder(dir, ctx.log);
            const readStream = (0, node_fs_1.createReadStream)(fileName);
            readStream.on('error', err => {
                if (err) {
                    ctx.log.error(`Google Drive: ${err}`);
                }
            });
            ctx.log.debug(`Google Drive: Copy ${onlyFileName}...`);
            try {
                await gDrive.writeFile(folderId, onlyFileName, readStream, ctx.log);
            }
            catch (err) {
                ctx.log.error(`Google Drive writeFile failed: ${err}`);
            }
        }
        catch (err) {
            ctx.log.error(`Google Drive writeFile Error: ${err}`);
        }
        await new Promise(resolve => setTimeout(resolve, 150));
    }
}
/**
 * Deletes the given files, keeping going past any that fail.
 *
 * @param gDrive client instance
 * @param fileIds file ids to delete; this list is consumed
 * @param fileNames matching names, for the log; this list is consumed
 * @param ctx run context, for the logger
 */
async function deleteFiles(gDrive, fileIds, fileNames, ctx) {
    while (fileIds.length || fileNames.length) {
        const fileId = fileIds.shift();
        const fileName = fileNames.shift();
        ctx.log.debug(`Google Drive: delete ${fileName}`);
        try {
            await gDrive.deleteFile(fileId);
        }
        catch (err) {
            if (err) {
                ctx.log.error(`Google Drive: ${err}`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 150));
    }
}
/**
 * Drops everything but the newest `num` backups per backup type.
 *
 * @param gDrive client instance
 * @param options script options, for the multi-instance counts
 * @param dir directory to clean
 * @param names backup types of this run
 * @param num how many to keep per type
 * @param ctx run context, for the logger
 */
async function cleanFiles(gDrive, options, dir, names, num, ctx) {
    if (!num) {
        return;
    }
    let result;
    try {
        const folderId = await gDrive.getFileOrFolderId(dir);
        result = await gDrive.listFilesInFolder(folderId);
    }
    catch (err) {
        ctx.log.error(`Google Drive: ${err}`);
        throw err;
    }
    if (!result || !result.length) {
        return;
    }
    const fileIds = [];
    const fileNames = [];
    names.forEach(name => {
        const subResult = result.filter(a => a.name.startsWith(name));
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
        // sort files
        if (subResult.length > numDel) {
            // delete oldest files
            subResult.sort((a, b) => {
                const at = new Date(a.modifiedTime).getTime();
                const bt = new Date(b.modifiedTime).getTime();
                if (at > bt) {
                    return -1;
                }
                if (at < bt) {
                    return 1;
                }
                return 0;
            });
            for (let i = numDel; i < subResult.length; i++) {
                fileIds.push(subResult[i].id);
                fileNames.push(subResult[i].name);
            }
        }
    });
    await deleteFiles(gDrive, fileIds, fileNames, ctx);
}
/**
 * Sends this run's archives to Google Drive and prunes the old ones.
 *
 * @param props the run context and the googledrive slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    if (!options.accessJson || !ctx.fileNames.length) {
        return;
    }
    const fileNames = JSON.parse(JSON.stringify(ctx.fileNames));
    const gDrive = new googleDriveLib_1.default(options.accessJson, options.newToken);
    if (!gDrive) {
        // A plain string, as before: wrapping it in an Error would prefix the reported text.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'No or invalid access key';
    }
    let dir = (options.dir || '').replace(/\\/g, '/');
    if (!dir || dir[0] !== '/') {
        dir = `/${dir || ''}`;
    }
    await copyFiles(gDrive, dir, fileNames, ctx);
    if (options.deleteOldBackup === true) {
        const googledriveDeleteAfter = options.advancedDelete === false ? options.deleteBackupAfter : options.googledriveDeleteAfter;
        try {
            await cleanFiles(gDrive, options, dir, ctx.types, googledriveDeleteAfter, ctx);
        }
        catch (cleanErr) {
            ctx.errors.googledrive = ctx.errors.googledrive || cleanErr;
            throw cleanErr;
        }
    }
    if (!ctx.errors.googledrive) {
        ctx.done.push('googledrive');
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=75-googledrive.js.map