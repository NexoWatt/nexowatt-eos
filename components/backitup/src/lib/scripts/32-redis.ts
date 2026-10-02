import { exec } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDirSync, removeSync } from 'fs-extra';

import { copyFile, getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpContext, BackItUpProps } from '../types';

interface RedisOptions {
    redisType?: 'local' | 'remote';
    /** dump file or directory for a local backup */
    path: string;
    /** run `redis-cli save` before copying */
    aof?: boolean;
    host?: string;
    port?: number | string;
    user?: string;
    pass?: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/**
 * Mode for the temporary directory.
 *
 * As in 42-javascripts this is a string, and fs-extra's `getMode` spreads a non-number into its
 * defaults, so the value is discarded and the directory ends up with the default 0o777. Passing
 * `{ mode: 0o2775 }` would actually apply it. Left as found.
 */
const desiredMode = '0o2775';

/**
 * Copies the redis dump into a temporary directory and packs it.
 *
 * The callback version could leave the whole backup run hanging in four different ways, all of them
 * closed here:
 *
 * - a failed `redis-cli save` reported the error but never settled its promise, so the `await` in
 *   the caller never returned;
 * - no `.rdb` file in the configured directory meant nothing ran and nothing reported;
 * - a `redisType` other than local or remote fell through the whole function without reporting;
 * - and a failing `readdirSync` reported and then fell into the same empty-directory hang.
 *
 * In the opposite direction, several `.rdb` files packed the same archive once per file and
 * reported once per file, which made lib/execute schedule all remaining steps that many times. The
 * files are now copied first and the archive is written once.
 *
 * @param props the run context and the redis slice of the config
 */
export async function run(props: BackItUpProps<RedisOptions>): Promise<void> {
    const { context: ctx, options } = props;

    ctx.log.debug('Start Redis Backup ...');

    let nameSuffix;
    if (options.hostType === 'Slave') {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    } else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }

    const fileName = join(
        ctx.backupDir,
        `${options.redisType === 'remote' ? 'redis-remote' : 'redis'}_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
    );
    const tmpDir = join(ctx.backupDir, 'redistmp').replace(/\\/g, '/');

    // The cast only silences the type; the value handed over is unchanged (see desiredMode).
    const modeArg = desiredMode as unknown as number;

    if (!existsSync(tmpDir)) {
        try {
            ensureDirSync(tmpDir, modeArg);
            ctx.log.debug('Created redistmp directory');
        } catch {
            ctx.log.warn(`redis tmp directory "${tmpDir}" cannot created`);
        }
    } else {
        ctx.log.debug(`Try deleting the old redis tmp directory: "${tmpDir}"`);
        try {
            removeSync(tmpDir);
        } catch {
            ctx.log.warn(`old redis tmp directory "${tmpDir}" cannot deleted`);
        }
        if (!existsSync(tmpDir)) {
            ctx.log.debug(`old redis tmp directory "${tmpDir}" successfully deleted`);
            try {
                ensureDirSync(tmpDir, modeArg);
                ctx.log.debug('Created new redistmp directory');
            } catch {
                ctx.log.warn(`redis tmp directory "${tmpDir}" cannot created`);
            }
        }
    }

    ctx.fileNames.push(fileName);

    const timer = setInterval(() => {
        if (existsSync(fileName)) {
            const stats = statSync(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);

    /**
     * Removes the temporary directory after a successful pack.
     *
     * A directory that could not be removed used to be reported as a step failure on top of the
     * success that followed it. The archive is written by then, so it only warns now.
     */
    const dropTmp = (): void => {
        try {
            ctx.log.debug(`Try deleting the redis tmp directory: "${tmpDir}"`);
            removeSync(tmpDir);
            if (!existsSync(tmpDir)) {
                ctx.log.debug(`redis tmp directory "${tmpDir}" successfully deleted`);
            }
        } catch (err) {
            ctx.log.warn(`redis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
        }
    };

    try {
        if (options.redisType === 'local') {
            let name: string | undefined;
            let pth: string | undefined;
            let data: string[] = [];

            if (existsSync(options.path)) {
                const stat = statSync(options.path);
                if (!stat.isDirectory()) {
                    const parts = options.path.replace(/\\/g, '/').split('/');
                    name = parts.pop();
                    pth = parts.join('/');
                    data.push(name as string);
                } else {
                    pth = options.path;
                    data = readdirSync(pth);
                }
            }

            // save aof
            if (options.aof) {
                await bgSave(ctx, tmpDir);
            }

            const dumps = data.filter(file => file.split('.').pop() === 'rdb' && !file.startsWith('temp'));

            if (!dumps.length) {
                ctx.log.warn('no redis database found!!');
                return;
            }

            for (const file of dumps) {
                ctx.log.debug(`detected redis file: ${file} | file type: rdb`);
                await new Promise<void>((resolve, reject) => {
                    copyFile(join(pth as string, file), join(tmpDir, file), err => {
                        if (err) {
                            ctx.errors.redis = err.toString();
                            ctx.log.error(err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            }

            try {
                await compressAsync({
                    src: tmpDir,
                    dest: fileName,
                    tar: {
                        ignore: nm => !!name && name !== nm.replace(/\\/g, '/').split('/').pop(),
                    },
                });
            } catch (err) {
                ctx.errors.redis = (err as Error).toString();
                throw err;
            }
        } else if (options.redisType === 'remote') {
            await new Promise<void>((resolve, reject) => {
                exec(
                    `redis-cli -u 'redis://${options.user && options.pass ? `${options.user}:${options.pass}@` : ''}${options.host}:${options.port}' --rdb ${join(tmpDir, 'dump.rdb').replace(/\\/g, '/')}`,
                    error => {
                        if (error) {
                            // `ExecException` is declared as Omit<ErrnoException, 'code'>, which
                            // drops the nominal Error identity; binding it back keeps toString()
                            // identical.
                            const failure: Error = error;
                            ctx.errors.redis = failure.toString();
                            ctx.log.error(failure);
                            reject(failure);
                        } else {
                            resolve();
                        }
                    },
                );
            });

            try {
                await compressAsync({ src: tmpDir, dest: fileName });
            } catch (err) {
                ctx.errors.redis = (err as Error).toString();
                throw err;
            }
        } else {
            // Neither local nor remote: the original left the run without any report at all.
            ctx.log.warn(`unknown redis backup type "${options.redisType}"`);
            return;
        }
    } finally {
        clearInterval(timer);
    }

    ctx.log.debug(`Backup created: ${fileName}`);
    ctx.done.push('redis');
    ctx.types.push('redis');
    dropTmp();
}

/**
 * Asks redis to write its dump before the files are copied.
 *
 * @param ctx run context, for the error store and the logger
 * @param tmpDir temporary directory that is removed on failure
 */
async function bgSave(ctx: BackItUpContext, tmpDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ctx.log.debug('redis-cli save started, please wait ...');

        exec(`redis-cli save`, error => {
            if (error) {
                const failure: Error = error;
                ctx.errors.redis = failure.toString();
                try {
                    ctx.log.debug(`Try deleting the redis tmp directory: "${tmpDir}"`);
                    removeSync(tmpDir);
                    if (!existsSync(tmpDir)) {
                        ctx.log.debug(`redis tmp directory "${tmpDir}" successfully deleted`);
                    }
                } catch (err) {
                    // A warning now: the save error below is the one that matters, and the original
                    // could report both.
                    ctx.log.warn(`redis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
                }
                reject(failure);
            } else {
                ctx.log.debug('redis-cli save finish');
                resolve();
            }
        });
    });
}

export const ignoreErrors = true;
