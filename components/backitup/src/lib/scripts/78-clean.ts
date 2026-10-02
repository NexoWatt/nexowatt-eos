import { join } from 'node:path';
import { lstatSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { removeSync } from 'fs-extra';

import type { BackItUpContext, BackItUpProps } from '../types';

interface CleanOptions {
    /** keep this many files per backup type; 0 means "manual run, delete nothing" */
    deleteBackupAfter: number;
    name?: string;
    influxDBMulti?: boolean;
    influxDBEvents?: unknown[];
    mySqlMulti?: boolean;
    mySqlEvents?: unknown[];
    pgSqlMulti?: boolean;
    pgSqlEvents?: unknown[];
    ccuMulti?: boolean;
    ccuEvents?: unknown[];
}

/**
 * Drops everything but the newest `num` backups per backup type.
 *
 * @param dir directory to clean
 * @param options script options, for the multi-instance counts
 * @param names backup types of this run
 * @param num how many to keep per type
 * @param ctx run context, for the logger and the error store
 */
function cleanFiles(dir: string, options: CleanOptions, names: string[], num: number, ctx: BackItUpContext): void {
    if (!num) {
        return;
    }
    try {
        if (dir[dir.length - 1] !== '/') {
            dir += '/';
        }
        names.forEach(name => {
            let result = readdirSync(dir);

            if (result && result.length && num) {
                result = result.filter(a => a.startsWith(name));
                let numDel = num;

                // Multi-instance setups produce one file per configured target per run.
                if (name === 'influxDB' && options.influxDBMulti) {
                    numDel = num * (options.influxDBEvents as unknown[]).length;
                }
                if (name === 'mysql' && options.mySqlMulti) {
                    numDel = num * (options.mySqlEvents as unknown[]).length;
                }
                if (name === 'pgsql' && options.pgSqlMulti) {
                    numDel = num * (options.pgSqlEvents as unknown[]).length;
                }
                if (name === 'homematic' && options.ccuMulti) {
                    numDel = num * (options.ccuEvents as unknown[]).length;
                }

                const files: string[] = [];

                if (result.length > numDel) {
                    // delete oldies files
                    result.sort((a, b) => {
                        const at = statSync(dir + a).ctime;
                        const bt = statSync(dir + b).ctime;
                        if (at > bt) {
                            return -1;
                        }
                        if (at < bt) {
                            return 1;
                        }
                        return 0;
                    });

                    for (let i = numDel; i < result.length; i++) {
                        files.push(join(dir, result[i]));
                    }
                }
                deleteFiles(files, ctx);
            }
        });
    } catch (e) {
        ctx.errors.cifs = ctx.errors.cifs || (e as Error);
    }
}

/**
 * Deletes the given entries, stopping at the first one that fails.
 *
 * @param files absolute paths to delete
 * @param ctx run context, for the logger and the error store
 */
function deleteFiles(files: string[], ctx: BackItUpContext): boolean | undefined {
    try {
        for (let f = 0; f < files.length; f++) {
            ctx.log.debug(`delete ${files[f]}`);

            const stat = lstatSync(files[f]);
            if (stat.isDirectory()) {
                removeSync(files[f]);
            } else {
                unlinkSync(files[f]);
            }
        }
        return true;
    } catch (e) {
        ctx.errors.clean = ctx.errors.clean || (e as Error);
        ctx.log.error(e);
        return undefined;
    }
}

/**
 * Removes the oldest local backups once everything else of this run has succeeded.
 *
 * @param props the run context and the clean slice of the config
 */
export async function run(props: BackItUpProps<CleanOptions>): Promise<void> {
    const { context: ctx, options } = props;

    if (ctx.backupDir && ctx.fileNames && ctx.fileNames.length) {
        // delete files only if no errors
        const errors = Object.keys(ctx.errors);

        if (!errors.length) {
            // may be make it configurable
            let dir = ctx.backupDir.replace(/\\/g, '/');

            if (dir[0] !== '/' && !dir.match(/\w:/)) {
                dir = `/${dir || ''}`;
            }

            if (options && options.deleteBackupAfter === 0) {
                ctx.log.warn('No older backup files are deleted, because this backup was started manually');
            }

            // `cleanFiles` is synchronous and takes six parameters. A seventh argument - a
            // completion callback - used to be passed here and was silently dropped, so the error
            // handling it contained never ran. Removed rather than wired up: making it fire would
            // change when and with what this step reports back.
            cleanFiles(dir, options, ctx.types, options.deleteBackupAfter, ctx);
        } else {
            ctx.log.error(`Backup files not deleted from ${ctx.backupDir} because some errors.`);
        }
    }
}

export const ignoreErrors = true;
