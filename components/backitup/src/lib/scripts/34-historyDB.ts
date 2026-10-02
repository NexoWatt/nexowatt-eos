import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps } from '../types';

interface HistoryDbOptions {
    /** file or directory holding the history database */
    path: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/**
 * Packs the history database.
 *
 * @param props the run context and the historyDB slice of the config
 */
export async function run(props: BackItUpProps<HistoryDbOptions>): Promise<void> {
    const { context: ctx, options } = props;

    let nameSuffix;
    if (options.hostType === 'Slave') {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    } else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }

    const fileName = join(
        ctx.backupDir,
        `historyDB_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
    );
    const sourcePth = join(options.path).replace(/\\/g, '/');

    ctx.fileNames.push(fileName);

    const timer = setInterval(() => {
        if (existsSync(fileName)) {
            const stats = statSync(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);

    let name: string | undefined;
    let pth: string | undefined;

    if (existsSync(sourcePth)) {
        const stat = statSync(sourcePth);
        if (!stat.isDirectory()) {
            // A single file: pack its directory and filter down to that one entry.
            const parts = sourcePth.replace(/\\/g, '/').split('/');
            name = parts.pop();
            pth = parts.join('/');
        } else {
            pth = sourcePth;
        }
    }
    ctx.log.debug('compress from historyDB started ...');

    try {
        await compressAsync({
            src: pth,
            dest: fileName,
            tar: {
                ignore: nm => !!name && name !== nm.replace(/\\/g, '/').split('/').pop(),
            },
        });
    } catch (err) {
        ctx.errors.historyDB = (err as Error).toString();
        throw err;
    } finally {
        clearInterval(timer);
    }

    ctx.log.debug(`Backup created: ${fileName}`);
    ctx.done.push('historyDB');
    ctx.types.push('historyDB');
}

export const ignoreErrors = true;
