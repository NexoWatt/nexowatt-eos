"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.afterBackup = exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const tools_1 = require("../tools");
const notificationText_1 = require("../notificationText");
/**
 * Size of the produced archive, in whole megabytes.
 *
 * @param fileName archive to measure, if it exists
 * @param log logger of the running step
 */
async function fileSizeCheck(fileName, log) {
    let fileSize = null;
    if (fileName && (0, node_fs_1.existsSync)(fileName)) {
        const stats = await (0, promises_1.stat)(fileName).catch(err => log.warn(`Filesize error: ${err}`));
        fileSize = stats ? `${Math.floor(stats.size / (1024 * 1024))} MB` : null;
    }
    return fileSize;
}
/**
 * Adds this run to the JSON history state.
 *
 * The callback version left the whole run hanging when the state was missing or empty, and it
 * reported twice when the stored JSON could not be parsed or the state could not be written - the
 * error went out first and the success right behind it. Both are settled here.
 *
 * @param props the run context and the historyJSON slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    // Build DP JSON
    if (options.historyJSON.enabled && ctx.adapter) {
        let fileName;
        try {
            const fileNames = JSON.parse(JSON.stringify(ctx.fileNames));
            fileName = fileNames.shift();
            if (fileName && (0, node_fs_1.existsSync)(fileName)) {
                fileName = fileName ? fileName.replace(/\\/g, '/') : undefined;
            }
        }
        catch (err) {
            ctx.log.error(`FileName error: ${err}`);
        }
        try {
            const state = await ctx.adapter.getStateAsync('history.json');
            if (!state || !state.val) {
                ctx.log.debug('no history json state yet, nothing to add');
                return;
            }
            const historyListJSON = state.val;
            let historyArrayJSON;
            if (historyListJSON !== undefined) {
                try {
                    historyArrayJSON = JSON.parse(historyListJSON);
                }
                catch (err) {
                    ctx.log.error(`history error: ${err} Please reinstall NexoWatt EOS Backup and run "iobroker fix"!!`);
                }
            }
            const errors = Object.keys(ctx.errors);
            let errorMessage = '';
            if (errors.length) {
                errorMessage = (0, notificationText_1.buildHistoryErrorLine)(ctx.errors, options.historyJSON.systemLang);
            }
            else {
                errorMessage = 'none';
            }
            const storage = [];
            const targets = [
                [options.ftp, 'FTP'],
                [options.cifs, options.cifs?.mountType === 'SDCard' ? 'SD card' : 'NAS / Copy'],
                [options.dropbox, 'Dropbox'],
                [options.webdav, 'WebDAV'],
                [options.googledrive, 'Google Drive'],
                [options.onedrive, 'OneDrive'],
            ];
            for (const [target, label] of targets) {
                if (target && target.enabled) {
                    storage.push((0, tools_1._)(label, options.historyJSON.systemLang));
                }
            }
            if (!storage.length) {
                storage.push((0, tools_1._)('Only stored locally', options.historyJSON.systemLang));
            }
            // push history to json
            try {
                // Throws when the state did not hold parsable JSON.
                historyArrayJSON.unshift({
                    date: (0, tools_1.getTimeString)(options.historyJSON.systemLang),
                    name: fileName ? fileName.split('/').pop() : undefined,
                    type: options.name,
                    storage: storage.length > 1 ? storage : storage[0],
                    filesize: await fileSizeCheck(fileName, ctx.log),
                    error: errorMessage,
                    timestamp: ctx.timestamp,
                });
            }
            catch (err) {
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw `history json could not be created: ${err}`;
            }
            if (historyArrayJSON && historyArrayJSON.length > options.historyJSON.entriesNumber) {
                historyArrayJSON.splice(options.historyJSON.entriesNumber, historyArrayJSON.length - options.historyJSON.entriesNumber);
            }
            try {
                await ctx.adapter.setStateAsync('history.json', {
                    val: JSON.stringify(historyArrayJSON),
                    ack: true,
                });
                ctx.log.debug('new history json values created');
            }
            catch (err) {
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw `history json could not be created: ${err}`;
            }
        }
        catch (err) {
            // A plain string, as before: wrapping it in an Error would prefix the reported text.
            // The two inner failures above already carry this wording and are rethrown unchanged.
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw typeof err === 'string' ? err : `history json could not be created: ${err}`;
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
