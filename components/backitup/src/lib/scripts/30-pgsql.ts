import { exec } from 'node:child_process';
import { existsSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps, BackItUpContext } from '../types';

interface PgSqlEvent {
    host: string;
    port: number | string;
    user: string;
    pass: string;
    dbName: string;
    nameSuffix: string;
    exe: string;
}

interface PgSqlOptions {
    host: string;
    port: number | string;
    user: string;
    pass: string;
    dbName: string;
    /** path to pg_dump; falls back to `pg_dump` from PATH */
    exe?: string;
    pgSqlMulti?: boolean;
    pgSqlEvents: PgSqlEvent[];
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/**
 * Dumps the configured PostgreSQL database(s) and packs each dump.
 *
 * As in 30-mysql the callback version reported a dump failure from `startBackup` and then reported
 * success again from here, and lib/execute scheduled the remaining backup steps twice as a result.
 * Awaiting collapses that to a single report.
 *
 * @param props the run context and the pgsql slice of the config
 */
export async function run(props: BackItUpProps<PgSqlOptions>): Promise<void> {
    const { context: ctx, options } = props;

    // A failed target no longer stops the others, as before; the first failure is reported once
    // every target has been attempted.
    let firstError: Error | undefined;
    const attempt = async (): Promise<void> => {
        try {
            await startBackup(ctx, options);
        } catch (err) {
            firstError ??= err as Error;
        }
    };

    if (options.pgSqlMulti) {
        // The per-event settings are written onto `options` itself, one target after another.
        for (let i = 0; i < options.pgSqlEvents.length; i++) {
            options.port = options.pgSqlEvents[i].port ? options.pgSqlEvents[i].port : '';
            options.host = options.pgSqlEvents[i].host ? options.pgSqlEvents[i].host : '';
            options.user = options.pgSqlEvents[i].user ? options.pgSqlEvents[i].user : '';
            options.pass = options.pgSqlEvents[i].pass ? options.pgSqlEvents[i].pass : '';
            options.exe = options.pgSqlEvents[i].exe ? options.pgSqlEvents[i].exe : '';
            options.dbName = options.pgSqlEvents[i].dbName ? options.pgSqlEvents[i].dbName : '';
            options.nameSuffix = options.pgSqlEvents[i].nameSuffix ? options.pgSqlEvents[i].nameSuffix : '';

            ctx.log.debug(`PgSql-Backup for ${options.nameSuffix} is started ...`);
            await attempt();
            ctx.log.debug(`PgSql-Backup for ${options.nameSuffix} is finish`);
        }
        // Reported as done even when a target failed - kept as found.
        ctx.done.push('pgsql');
        ctx.types.push('pgsql');
    } else {
        ctx.log.debug('PgSql-Backup started ...');
        await attempt();
        ctx.log.debug('PgSql-Backup for is finish');
        ctx.done.push('pgsql');
        ctx.types.push('pgsql');
    }

    if (firstError) {
        throw firstError;
    }
}

/**
 * Dumps one database and packs the dump.
 *
 * @param ctx run context
 * @param options script options, already pointed at the target to dump
 */
async function startBackup(ctx: BackItUpContext, options: PgSqlOptions): Promise<void> {
    let nameSuffix;
    if (options.hostType === 'Slave' && !options.pgSqlMulti) {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    } else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }
    const fileName = join(
        ctx.backupDir,
        `pgsql_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
    );
    const fileNamePgsql = join(ctx.backupDir, `pgsql_${getDate()}_backupiobroker.sql`);

    ctx.fileNames.push(fileName);

    // Note the asymmetry in the second clause - as in 01-mount, `endsWith("'")` is not negated.
    if (
        (!options.pass.startsWith(`"`) || !options.pass.endsWith(`"`)) &&
        (!options.pass.startsWith(`'`) || options.pass.endsWith(`'`))
    ) {
        options.pass = `"${options.pass}"`;
    }

    await new Promise<void>((resolve, reject) => {
        exec(
            `${options.exe ? options.exe : 'pg_dump'}  --dbname=postgresql://${options.user}:${options.pass}@${options.host}:${options.port}/${options.dbName} > ${fileNamePgsql}`,
            { maxBuffer: 10 * 1024 * 1024 },
            error => {
                if (error) {
                    // Masked on the message itself, not just where it is stored: this error is
                    // what the step reports, and lib/execute writes it to the adapter log, the
                    // output.line state and the backup history file. Masking `${error}` and
                    // masking `error.message` give the same text, the prefix holds no password.
                    let errLog = error.message;
                    try {
                        const formatPass = options.pass.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                        errLog = errLog.replace(new RegExp(formatPass, 'g'), '****');
                    } catch {
                        // ignore
                    }
                    error.message = errLog;
                    // `ExecException` is declared as Omit<ErrnoException, 'code'>, which drops the
                    // nominal Error identity; binding it back keeps the formatted text the same.
                    const failure: Error = error;
                    ctx.errors.pgsql = failure.toString();
                    // The `stderr` the original passed as a second callback argument is dropped -
                    // the masked error says the same and cannot leak the password.
                    reject(failure);
                } else {
                    resolve();
                }
            },
        );
    });

    const timer = setInterval(() => {
        if (existsSync(fileName)) {
            const stats = statSync(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);

    try {
        await compressAsync({
            src: fileNamePgsql,
            dest: fileName,
            tar: {
                map: header => {
                    header.name = fileNamePgsql.split('/').pop() as string;
                    return header;
                },
            },
        });
    } catch (err) {
        ctx.errors.pgsql = (err as Error).toString();
        throw err;
    } finally {
        clearInterval(timer);
    }

    if (fileNamePgsql) {
        // The original deleted asynchronously and rethrew inside the fs callback, where nothing
        // could catch it: an undeletable temp file took the whole adapter down, after the archive
        // had already been written. Now it warns, exactly as 30-mysql does.
        try {
            unlinkSync(fileNamePgsql);
            ctx.log.debug('postgresql File deleted!');
        } catch (e) {
            ctx.log.warn(`postgresql File cannot deleted: ${e}`);
        }
    }
}

export const ignoreErrors = true;
