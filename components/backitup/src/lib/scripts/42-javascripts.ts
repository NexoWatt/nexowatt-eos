import { existsSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { ensureDirSync, removeSync } from 'fs-extra';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps } from '../types';

interface JavascriptsOptions {
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

let timerLog: NodeJS.Timeout | undefined;

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        timerLog = setTimeout(() => resolve(), ms);
    });
}

/**
 * Mode for the temporary script directory.
 *
 * Note: this is a string, and fs-extra's `getMode` spreads a non-number into its defaults, so the
 * value is discarded and the directory ends up with the default 0o777. Passing `{ mode: 0o2775 }`
 * - the form 36-grafana uses - would actually apply it. Left as found; changing directory
 * permissions is not something to slip into a type migration.
 */
const desiredMode = '0o2775';

/**
 * Packs all javascript adapter scripts.
 *
 * @param props the run context and the javascripts slice of the config
 */
export async function run(props: BackItUpProps<JavascriptsOptions>): Promise<void> {
    const { context: ctx, options } = props;

    let nameSuffix;
    if (options.hostType === 'Slave') {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    } else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }
    const fileName = join(
        ctx.backupDir,
        `javascripts_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
    );

    ctx.fileNames.push(fileName);

    const timer = setInterval(() => {
        if (existsSync(fileName)) {
            const stats = statSync(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 5000);

    const tmpDir = join(ctx.backupDir, 'tmpScripts').replace(/\\/g, '/');
    // The cast only silences the type; the value handed over is unchanged (see desiredMode).
    const modeArg = desiredMode as unknown as number;

    if (!existsSync(tmpDir)) {
        try {
            ensureDirSync(tmpDir, modeArg);
            ctx.log.debug(`Created javascript_tmp directory: "${tmpDir}"`);
        } catch (err) {
            ctx.log.warn(`Javascript tmp directory "${tmpDir}" cannot created ... ${err}`);
        }
    } else {
        try {
            ctx.log.debug(`Try deleting the old javascript_tmp directory: "${tmpDir}"`);
            removeSync(tmpDir);
        } catch (err) {
            ctx.log.warn(`Javascript tmp directory "${tmpDir}" cannot deleted ... ${err}`);
        }
        if (!existsSync(tmpDir)) {
            try {
                ctx.log.debug(`old javascript_tmp directory "${tmpDir}" successfully deleted`);
                ensureDirSync(tmpDir, modeArg);
                ctx.log.debug('Created javascript_tmp directory');
            } catch (err) {
                ctx.log.warn(`Javascript tmp directory "${tmpDir}" cannot created ... ${err}`);
            }
        }
    }

    const obj = await ctx.adapter!.getForeignObjectsAsync('script.*', 'script');

    if (obj) {
        try {
            await writeFile(join(tmpDir, 'script.json'), JSON.stringify(obj, null, 2));
        } catch (e) {
            ctx.log.error(`script.json cannot be written: ${e}`);
        }

        for (const i in obj) {
            ctx.log.debug(`found Script: ${obj[i]._id.split('.').pop()}`);
            await sleep(150);
        }
    } else {
        ctx.log.warn('Scripts not found');
    }

    if (!existsSync(tmpDir) || !obj) {
        ctx.log.warn('javascript Backup not created');
        clearTimeout(timerLog);
        // The interval above was left running on this path, once per manual or scheduled backup.
        clearInterval(timer);
        return;
    }

    let packError: Error | undefined;
    try {
        await compressAsync({
            src: tmpDir,
            dest: fileName,
            tar: {
                // ignore .tar.gz and tar.sbk files when packing
                ignore: name => extname(name) === '.gz' || extname(name) === '.sbk',
            },
        });
    } catch (err) {
        packError = err as Error;
    } finally {
        clearInterval(timer);
    }

    try {
        ctx.log.debug(`Try deleting the Javascript tmp directory: "${tmpDir}"`);
        removeSync(tmpDir);
        if (!existsSync(tmpDir)) {
            ctx.log.debug(`Javascript tmp directory "${tmpDir}" successfully deleted`);
        }
    } catch (e) {
        ctx.log.warn(`Javascript tmp directory "${tmpDir}" cannot deleted ... ${e}`);
    }

    clearTimeout(timerLog);

    if (packError) {
        ctx.errors.javascripts = packError.toString();
        throw packError;
    }

    ctx.log.debug(`Backup created: ${fileName}`);
    ctx.done.push('javascripts');
    ctx.types.push('javascripts');
}

export const ignoreErrors = true;
