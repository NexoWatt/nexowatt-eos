import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps } from '../types';

interface YahkaOptions {
    /** directory holding the `yahka.<n>.hapdata` folders */
    path: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/** Instances are probed by index up to this number, inclusive. */
const MAX_INSTANCE = 100;

/**
 * Packs every `yahka.<n>.hapdata` directory it finds.
 *
 * Two things the callback version got wrong, both settled by awaiting:
 *
 * - It reported when the *loop* reached index 100, not when the archives were written, so the
 *   following steps ran while yahka was still packing.
 * - That report sat in the "index 100 does not exist" branch. Had a `yahka.100.hapdata` ever
 *   existed, nothing would have reported at all and the run would have waited forever.
 *
 * A failure of one instance still does not stop the others; the first one is what the step reports
 * once every instance has been dealt with.
 *
 * @param props the run context and the yahka slice of the config
 */
export async function run(props: BackItUpProps<YahkaOptions>): Promise<void> {
    const { context: ctx, options } = props;

    const yahkaInst: string[] = [];
    let firstError: Error | undefined;

    for (let i = 0; i <= MAX_INSTANCE; i++) {
        const pth = join(options.path, `yahka.${i}.hapdata`);

        if (!existsSync(pth)) {
            continue;
        }

        let nameSuffix;
        if (options.hostType === 'Slave') {
            nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
        } else {
            nameSuffix = options.nameSuffix ? options.nameSuffix : '';
        }

        const fileName = join(
            ctx.backupDir,
            `yahka.${i}_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
        );

        ctx.fileNames.push(fileName);

        try {
            await compressAsync({ src: pth, dest: fileName });
            ctx.types.push(`yahka.${i}`);
            ctx.done.push(`yahka.${i}`);
        } catch (err) {
            // Last failure wins in the error store, the first one is reported - as before.
            ctx.errors.yahka = (err as Error).toString();
            firstError ??= err as Error;
        }

        yahkaInst.push(`yahka.${i}`);
    }

    if (yahkaInst.length) {
        ctx.log.debug(`found yahka database: ${yahkaInst.join(',')}`);
    } else {
        ctx.log.warn('no yahka database found!!');
    }

    if (firstError) {
        throw firstError;
    }
}

export const ignoreErrors = true;
