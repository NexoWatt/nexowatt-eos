import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps } from '../types';

interface ZigbeeOptions {
    /** directory holding the `zigbee_<n>` data folders */
    path: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/**
 * Packs every `zigbee_<n>` database directory whose adapter instance exists.
 *
 * As before, a failure of one instance does not stop the others; the first one is what the step
 * reports once every instance has been dealt with.
 *
 * @param props the run context and the zigbee slice of the config
 */
export async function run(props: BackItUpProps<ZigbeeOptions>): Promise<void> {
    const { context: ctx, options } = props;

    const zigbeeInst: string[] = [];
    let firstError: Error | undefined;

    try {
        for (let i = 0; i <= 10; i++) {
            // Check if zigbee adapter instance exists
            const obj = await ctx.adapter!.getForeignObjectAsync(`system.adapter.zigbee.${i}`);
            if (!obj) {
                continue;
            }

            // Check if corresponding folder exists
            const pth = join(options.path, `zigbee_${i}`);
            if (!existsSync(pth)) {
                continue;
            }

            // Determine suffix for the filename
            let nameSuffix = '';
            if (options.hostType === 'Slave') {
                nameSuffix = options.slaveSuffix || '';
            } else {
                nameSuffix = options.nameSuffix || '';
            }

            // Construct backup filename
            const fileName = join(
                ctx.backupDir,
                `zigbee.${i}_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
            );

            ctx.fileNames.push(fileName);

            // Run compression and wait for it to finish
            try {
                await compressAsync({
                    src: pth,
                    dest: fileName,
                    tar: {
                        ignore: name => extname(name) === '.gz',
                    },
                });
                ctx.types.push(`zigbee.${i}`);
                ctx.done.push(`zigbee.${i}`);
            } catch (err) {
                // Last failure wins in the error store, the first one is reported - as before.
                ctx.errors.zigbee = (err as Error).toString();
                firstError ??= err as Error;
            }

            zigbeeInst.push(`zigbee.${i}`);
        }

        // Log summary
        if (zigbeeInst.length) {
            ctx.log.debug(`Found zigbee databases: ${zigbeeInst.join(', ')}`);
        } else {
            ctx.log.warn('No zigbee databases found!');
        }
    } catch (err) {
        ctx.log.error(`Error during zigbee backup: ${(err as Error).message}`);
        // A packing failure already recorded above keeps precedence, matching the guarded callback.
        throw firstError ?? (err as Error);
    }

    if (firstError) {
        throw firstError;
    }
}

export const ignoreErrors = true;
