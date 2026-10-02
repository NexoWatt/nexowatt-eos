import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { authenticate } from 'dropbox-v2-api';

import Dropbox from '../dropboxLib';
import type { BackItUpContext, BackItUpProps } from '../types';

type DropboxClient = ReturnType<typeof authenticate>;

interface DropboxUploadOptions {
    accessToken?: string;
    dir: string;
    deleteOldBackup?: boolean;
    advancedDelete?: boolean;
    deleteBackupAfter?: number;
    dropboxDeleteAfter?: number;
    influxDBMulti?: boolean;
    influxDBEvents?: unknown[];
    mySqlMulti?: boolean;
    mySqlEvents?: unknown[];
    pgSqlMulti?: boolean;
    pgSqlEvents?: unknown[];
    ccuMulti?: boolean;
    ccuEvents?: unknown[];
}

/** Files above this size go through a chunked upload session */
const SINGLE_SHOT_LIMIT_MB = 100;

/**
 * Uploads every file of this run, one after the other.
 *
 * An empty file used to match neither the single-shot nor the session branch, and the walk simply
 * stopped there without ever reporting - the whole backup run hung on it. It is skipped with a
 * warning now, and the files after it are still sent.
 *
 * @param dbx authenticated dropbox client
 * @param dropbox helper holding the chunked upload
 * @param dir target directory
 * @param fileNames the files to send; this list is consumed
 * @param ctx run context, for the logger and the error store
 */
async function copyFiles(
    dbx: DropboxClient,
    dropbox: Dropbox,
    dir: string,
    fileNames: string[],
    ctx: BackItUpContext,
): Promise<void> {
    while (fileNames.length) {
        let fileName;
        try {
            fileName = fileNames.shift() as string;
            fileName = fileName.replace(/\\/g, '/');
            const onlyFileName = fileName.split('/').pop() as string;

            if (!existsSync(fileName)) {
                ctx.log.error(`Dropbox: File "${fileName}" not found`);
                continue;
            }

            ctx.log.debug(`Dropbox: Copy ${onlyFileName}...`);
            const fileSize = statSync(fileName).size;

            if (!fileSize) {
                ctx.log.warn(`Dropbox: File "${fileName}" is empty and was not sent`);
                continue;
            }

            if (Math.round((fileSize / (1024 * 1024)) * 10) / 10 <= SINGLE_SHOT_LIMIT_MB) {
                const readStream = createReadStream(fileName);
                readStream.on('error', err => {
                    ctx.log.error(`readStream Dropbox: ${err}`);
                });
                await new Promise<void>(resolve => {
                    dbx(
                        {
                            resource: 'files/upload',
                            parameters: {
                                path: join(dir, onlyFileName).replace(/\\/g, '/'),
                            },
                            readStream,
                        },
                        err => {
                            try {
                                if (err) {
                                    ctx.errors.dropbox = JSON.stringify(err);
                                    ctx.log.error(`upload Dropbox: ${JSON.stringify(err)}`);
                                }
                            } catch (e) {
                                ctx.errors.dropbox = e as Error;
                                ctx.log.error(`Dropbox callback error: ${JSON.stringify(e)}`);
                            }
                            resolve();
                        },
                    );
                });
            } else {
                try {
                    await dropbox.sessionUpload(dbx, fileName, dir, ctx.log);
                } catch (e) {
                    ctx.errors.dropbox = e as Error;
                    ctx.log.error(`Dropbox sessionUpload: ${JSON.stringify(e)}`);
                }
            }
        } catch (e) {
            ctx.errors.dropbox = e as Error;
            ctx.log.error(`Dropbox: ${JSON.stringify(e)}`);
        }
    }
}

/**
 * Deletes the given files, keeping going past any that fail.
 *
 * A client that threw synchronously used to report completion and then carry on walking the list,
 * so the step reported twice. It only logs now.
 *
 * @param dbx authenticated dropbox client
 * @param files paths to delete; this list is consumed
 * @param ctx run context, for the logger
 */
async function deleteFiles(dbx: DropboxClient, files: string[], ctx: BackItUpContext): Promise<void> {
    while (files.length) {
        ctx.log.debug(`Dropbox: delete ${files[0]}`);
        try {
            await new Promise<void>(resolve => {
                dbx(
                    {
                        resource: 'files/delete',
                        parameters: {
                            path: files.shift(),
                        },
                    },
                    err => {
                        if (err) {
                            ctx.log.error(`Dropbox: ${JSON.stringify(err)}`);
                        }
                        resolve();
                    },
                );
            });
        } catch (e) {
            ctx.log.error(`Dropbox: ${JSON.stringify(e)}`);
        }
    }
}

/**
 * Drops everything but the newest `num` backups per backup type.
 *
 * @param dbx authenticated dropbox client
 * @param options script options, for the multi-instance counts
 * @param dir directory to clean
 * @param names backup types of this run
 * @param num how many to keep per type
 * @param ctx run context, for the logger
 */
async function cleanFiles(
    dbx: DropboxClient,
    options: DropboxUploadOptions,
    dir: string,
    names: string[],
    num: number,
    ctx: BackItUpContext,
): Promise<void> {
    if (!num) {
        return;
    }

    const result = await new Promise<any>(resolve => {
        dbx(
            {
                resource: 'files/list_folder',
                parameters: {
                    path: dir.replace(/^\/$/, ''),
                },
            },
            (err, list) => {
                if (err) {
                    ctx.log.error(`Dropbox: ${JSON.stringify(err)}`);
                }
                resolve(list);
            },
        );
    });

    if (!result || !result.entries) {
        return;
    }

    const files: string[] = [];
    names.forEach(name => {
        const subResult = (result.entries as any[]).filter((a: any) => a.name.startsWith(name));
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

        if (subResult.length > numDel) {
            // delete oldest files
            subResult.sort((a: any, b: any) => {
                const at = new Date(a.client_modified).getTime();
                const bt = new Date(b.client_modified).getTime();
                if (at > bt) {
                    return -1;
                }
                if (at < bt) {
                    return 1;
                }
                return 0;
            });

            for (let i = numDel; i < subResult.length; i++) {
                files.push(subResult[i].path_display);
            }
        }
    });

    await deleteFiles(dbx, files, ctx);
}

/**
 * Sends this run's archives to Dropbox and prunes the old ones.
 *
 * @param props the run context and the dropbox slice of the config
 */
export async function run(props: BackItUpProps<DropboxUploadOptions>): Promise<void> {
    const { context: ctx, options } = props;

    const dropbox = new Dropbox();

    // Token refresh
    const db_accessToken = options.accessToken || '';

    if (!db_accessToken || !ctx.fileNames.length) {
        return;
    }

    const fileNames: string[] = JSON.parse(JSON.stringify(ctx.fileNames));
    const dbx = authenticate({ token: db_accessToken });

    let dir = (options.dir || '').replace(/\\/g, '/');

    if (!dir || dir[0] !== '/') {
        dir = `/${dir || ''}`;
    }

    await copyFiles(dbx, dropbox, dir, fileNames, ctx);

    if (options.deleteOldBackup === true) {
        const dropboxDeleteAfter =
            options.advancedDelete === false ? options.deleteBackupAfter : options.dropboxDeleteAfter;

        try {
            await cleanFiles(dbx, options, dir, ctx.types, dropboxDeleteAfter as number, ctx);
        } catch (cleanErr) {
            // Only a synchronous failure of the listing call gets here, as before.
            ctx.errors.dropbox = ctx.errors.dropbox || (cleanErr as Error);
            throw cleanErr;
        }
    }

    if (!ctx.errors.dropbox) {
        ctx.done.push('dropbox');
    }
}

export const ignoreErrors = true;
