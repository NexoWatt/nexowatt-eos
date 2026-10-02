import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps } from '../types';

interface EsphomeOptions {
    /** directory holding the `esphome.<n>` data folders */
    path: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/**
 * Packs every `esphome.<n>` data directory it finds.
 *
 * As before, a failure of one directory does not stop the others; the first one is what the step
 * reports once every directory has been dealt with.
 *
 * @param props the run context and the esphome slice of the config
 */
export async function run(props: BackItUpProps<EsphomeOptions>): Promise<void> {
    const { context: ctx, options } = props;

    const esphomeInst: string[] = [];
    let dirs: string[] = [];

    // find all esphome dirs
    if (existsSync(options.path)) {
        dirs = readdirSync(options.path).filter(name => {
            const fullPath = join(options.path, name);
            return statSync(fullPath).isDirectory() && name.startsWith('esphome.');
        });
    }

    if (dirs.length) {
        ctx.log.debug(`found esphome data: ${dirs.join(',')}`);
    } else {
        ctx.log.warn('no esphome data found!!');
        return;
    }

    // The first failure is what the step reports, while the loop keeps going over the rest.
    let firstError: Error | undefined;

    for (const dirName of dirs) {
        const pth = join(options.path, dirName);

        const nameSuffix = options.hostType === 'Slave' ? options.slaveSuffix || '' : options.nameSuffix || '';

        const fileName = join(
            ctx.backupDir,
            `${dirName}_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
        );

        // compress dir
        try {
            await compressAsync({
                src: pth,
                dest: fileName,
                tar: {
                    ignore: name => basename(name) === '.esphome' || basename(name) === '.gitignore',
                },
            });
            ctx.log.debug(`Backup created: ${fileName}`);

            ctx.fileNames.push(fileName);
            ctx.types.push(dirName);
            ctx.done.push(dirName);
            esphomeInst.push(dirName);
        } catch (err) {
            ctx.errors.esphome = (err as Error).toString();
            ctx.log.error(err);

            firstError ??= err as Error;
        }
    }

    if (firstError) {
        throw firstError;
    }
}

export const ignoreErrors = true;
