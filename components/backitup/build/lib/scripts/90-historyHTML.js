"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.afterBackup = exports.ignoreErrors = void 0;
exports.run = run;
const tools_1 = require("../tools");
const notificationText_1 = require("../notificationText");
/**
 * Adds this run to the HTML history state.
 *
 * @param props the run context and the historyHTML slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    if (options.historyHTML.enabled && ctx.adapter) {
        let historyArray = [];
        try {
            // function for entering the backup execution in the history-log
            let historyList;
            const state = await ctx.adapter.getStateAsync('history.html');
            if (state && state.val) {
                historyList = state.val;
                if (historyList ===
                    `<span class="backup-type-total">${(0, tools_1._)('No backups yet', options.historyHTML.systemLang)}</span>`) {
                    historyList = '';
                }
            }
            // analyse here the info from context.errors and context.done
            if (historyList !== undefined) {
                try {
                    historyArray = historyList.split('&nbsp;');
                }
                catch (err) {
                    ctx.log.error(`history error: ${err} Please reinstall NexoWatt EOS Backup and run "iobroker fix"!!`);
                }
            }
            const timeStamp = (0, tools_1.getTimeString)(options.historyHTML.systemLang);
            let doneSomething = false;
            const errors = Object.keys(ctx.errors);
            const entry = (text) => `<span class="backup-type-${options.name}">${timeStamp} - ${(0, tools_1._)('Type', options.historyHTML.systemLang)}: ${options.name} - ${text}</span>`;
            if (!errors.length) {
                const targets = [
                    [options.ftp, 'FTP-Backup: Yes'],
                    [options.cifs, 'NAS: Yes'],
                    [options.dropbox, 'Dropbox: Yes'],
                    [options.webdav, 'WebDAV: Yes'],
                    [options.googledrive, 'Google Drive: Yes'],
                    [options.onedrive, 'Onedrive: Yes'],
                ];
                for (const [target, label] of targets) {
                    if (target && target.enabled) {
                        historyArray.unshift(entry((0, tools_1._)(label, options.historyHTML.systemLang)));
                        doneSomething = true;
                    }
                }
                if (!doneSomething) {
                    historyArray.unshift(entry((0, tools_1._)('Only stored locally', options.historyHTML.systemLang)));
                }
            }
            else {
                historyArray.unshift(entry((0, notificationText_1.buildHistoryErrorLine)(ctx.errors, options.historyHTML.systemLang)));
            }
            if (historyArray.length > options.historyHTML.entriesNumber) {
                historyArray.splice(options.historyHTML.entriesNumber, historyArray.length - options.historyHTML.entriesNumber);
            }
            ctx.log.debug('new history html values created');
            await ctx.adapter.setStateAsync('history.html', { val: historyArray.join('&nbsp;'), ack: true });
        }
        catch (err) {
            // A plain string, as before: wrapping it in an Error would prefix the reported text.
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw `history html could not be created: ${err}`;
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=90-historyHTML.js.map