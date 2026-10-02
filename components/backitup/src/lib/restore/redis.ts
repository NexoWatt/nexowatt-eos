import { exec } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDirSync, removeSync } from 'fs-extra';

import { copyFile, delay } from '../tools';
import { decompressAsync } from '../targz';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

interface RedisRestoreOptions extends BackItUpRestoreOptions {
    /** the redis dump file or its directory */
    path: string;
    /** rewrite the append-only file after the restore */
    aof?: boolean;
}

/** How long the original waited for the stopped server before unpacking */
const STOP_DELAY_MS = 2000;

/**
 * Restores the redis dump files.
 *
 * Runs in the detached process, so `context.adapter` is null here.
 *
 * The callback version never reported when the temp directory was missing or held no files - the
 * restore then waited forever. It also copied the files all at once and gated the final report on
 * a counter; the files are copied one after the other now.
 *
 * @param props the run context, the redis slice of the config and the archive
 */
export async function restore(props: BackItUpRestoreProps<RedisRestoreOptions>): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;

    ctx.log.debug('Start Redis Restore ...');

    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';

    const tmpDir = join(options.backupDir, 'redistmp').replace(/\\/g, '/');
    if (!existsSync(tmpDir)) {
        ensureDirSync(tmpDir, desiredMode as unknown as number);
        ctx.log.debug('Created redistmp directory');
    } else {
        ctx.log.debug(`Try deleting the old redis tmp directory: "${tmpDir}"`);
        removeSync(tmpDir);
        if (!existsSync(tmpDir)) {
            ctx.log.debug(`old redis tmp directory "${tmpDir}" successfully deleted`);
            ensureDirSync(tmpDir, desiredMode as unknown as number);
            ctx.log.debug('Created redistmp directory');
        }
    }

    const timer = setInterval(() => {
        if (existsSync(options.path)) {
            ctx.log.debug('Extracting Redis Backup file...');
        } else {
            ctx.log.debug('Something is wrong. No file found.');
        }
    }, 10000);

    let name;
    // NOTE: `pth` stays undefined when `options.path` exists as a directory is false *and* the file
    // name starts with a dot - `indexOf('.')` is checked for truthiness, so only position 0 counts
    // as "no dot". `join(undefined, file)` then throws below. Kept as found.
    let pth: string | undefined;
    if (!existsSync(options.path)) {
        const parts = options.path.replace(/\\/g, '/').split('/');
        name = parts.pop()!;
        if (name.indexOf('.')) {
            pth = parts.join('/');
        }
    } else {
        pth = options.path;
    }

    ctx.log.debug('decompress started ...');

    await delay(STOP_DELAY_MS);

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error('Redis Restore not completed');
        ctx.log.error(err);
        throw err;
    } finally {
        clearInterval(timer);
    }

    if (!existsSync(tmpDir)) {
        ctx.log.error(`Redis Restore not completed: "${tmpDir}" is missing`);
        return 'redis restore is incomplete';
    }

    const files = readdirSync(tmpDir);

    if (!files.length) {
        ctx.log.error(`Redis Restore not completed: no files in "${tmpDir}"`);
        return 'redis restore is incomplete';
    }

    // A failed copy no longer stops the remaining files, as before - but the cleanup and the
    // "restart" step below stay skipped, which is what the counter gate did.
    let broken = false;

    for (const file of files) {
        try {
            await new Promise<void>((resolve, reject) => {
                copyFile(join(tmpDir, file), join(pth!, file), err => (err ? reject(err) : resolve()));
            });
        } catch (err) {
            ctx.log.error(err);
            broken = true;
            continue;
        }

        if (existsSync(join(`${pth}/${file}`))) {
            ctx.log.debug(`redis file ${file} successfully restored`);
        }

        ctx.log.debug('redis-cli restart, please wait ...');
    }

    if (broken) {
        return 'redis restore broken';
    }

    if (options.aof === true) {
        ctx.log.debug('redis-cli bgrewriteaof started, please wait ...');
        try {
            exec(`redis-cli bgrewriteaof`, error => {
                if (error) {
                    ctx.log.debug(`redis-cli bgrewriteaof error: "${error}"`);
                }
            });
        } catch (e) {
            ctx.log.debug(`redis-cli bgrewriteaof error: "${e}"`);
        }
    }

    try {
        ctx.log.debug(`Try deleting the redis tmp directory: "${tmpDir}"`);
        removeSync(tmpDir);
        if (!existsSync(tmpDir)) {
            ctx.log.debug(`redis tmp directory "${tmpDir}" successfully deleted`);
        }
    } catch (err) {
        ctx.log.debug(`redis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
        return 'redis restore is incomplete';
    }

    ctx.log.debug('Redis Restore completed successfully');
    return 'redis restore done';
}

export const isStop = true;
