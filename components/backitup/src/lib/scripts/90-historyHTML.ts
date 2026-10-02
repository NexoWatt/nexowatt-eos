import { _, getTimeString } from '../tools';
import { buildHistoryErrorLine } from '../notificationText';
import type { BackItUpProps } from '../types';

interface HistoryTarget {
    enabled?: boolean;
}

interface HistoryHtmlOptions {
    name: string;
    ftp?: HistoryTarget;
    cifs?: HistoryTarget;
    dropbox?: HistoryTarget;
    webdav?: HistoryTarget;
    googledrive?: HistoryTarget;
    onedrive?: HistoryTarget;
    historyHTML: {
        enabled?: boolean;
        systemLang: string;
        entriesNumber: number;
    };
}

/**
 * Adds this run to the HTML history state.
 *
 * @param props the run context and the historyHTML slice of the config
 */
export async function run(props: BackItUpProps<HistoryHtmlOptions>): Promise<void> {
    const { context: ctx, options } = props;

    if (options.historyHTML.enabled && ctx.adapter) {
        let historyArray: string[] = [];
        try {
            // function for entering the backup execution in the history-log
            let historyList: string | undefined;
            const state = await ctx.adapter.getStateAsync('history.html');

            if (state && state.val) {
                historyList = state.val as string;
                if (
                    historyList ===
                    `<span class="backup-type-total">${_('No backups yet', options.historyHTML.systemLang)}</span>`
                ) {
                    historyList = '';
                }
            }

            // analyse here the info from context.errors and context.done
            if (historyList !== undefined) {
                try {
                    historyArray = historyList.split('&nbsp;');
                } catch (err) {
                    ctx.log.error(`history error: ${err} Please reinstall NexoWatt EOS Backup and run "iobroker fix"!!`);
                }
            }
            const timeStamp = getTimeString(options.historyHTML.systemLang);
            let doneSomething = false;

            const errors = Object.keys(ctx.errors);

            const entry = (text: string): string =>
                `<span class="backup-type-${options.name}">${timeStamp} - ${_('Type', options.historyHTML.systemLang)}: ${options.name} - ${text}</span>`;

            if (!errors.length) {
                const targets: [HistoryTarget | undefined, string][] = [
                    [options.ftp, 'FTP-Backup: Yes'],
                    [options.cifs, 'NAS: Yes'],
                    [options.dropbox, 'Dropbox: Yes'],
                    [options.webdav, 'WebDAV: Yes'],
                    [options.googledrive, 'Google Drive: Yes'],
                    [options.onedrive, 'Onedrive: Yes'],
                ];

                for (const [target, label] of targets) {
                    if (target && target.enabled) {
                        historyArray.unshift(entry(_(label, options.historyHTML.systemLang)));
                        doneSomething = true;
                    }
                }

                if (!doneSomething) {
                    historyArray.unshift(entry(_('Only stored locally', options.historyHTML.systemLang)));
                }
            } else {
                historyArray.unshift(
                    entry(buildHistoryErrorLine(ctx.errors, options.historyHTML.systemLang)),
                );
            }

            if (historyArray.length > options.historyHTML.entriesNumber) {
                historyArray.splice(
                    options.historyHTML.entriesNumber,
                    historyArray.length - options.historyHTML.entriesNumber,
                );
            }
            ctx.log.debug('new history html values created');
            await ctx.adapter.setStateAsync('history.html', { val: historyArray.join('&nbsp;'), ack: true });

        } catch (err) {
            // A plain string, as before: wrapping it in an Error would prefix the reported text.
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw `history html could not be created: ${err}`;
        }
    }
}

export const ignoreErrors = true;
export const afterBackup = true;
