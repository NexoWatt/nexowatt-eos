import { exec } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps } from '../types';

interface SqliteOptions {
    /** path to the sqlite database file */
    filePth: string;
    /** path to the sqlite3 binary; falls back to `sqlite3` from PATH */
    exe?: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/**
 * Dumps the sqlite database of the sql adapter and packs the dump.
 *
 * Three things the callback version got wrong, all of them settled by awaiting:
 *
 * - It stopped every running sql instance and only restarted them in the success branch. A failed
 *   dump or a failed `compress` left the sql adapter stopped until someone noticed - the restart
 *   now happens whatever the outcome.
 * - A temp file that could not be deleted reported the (falsy) compress error and then reported
 *   success right after, so lib/execute scheduled the remaining backup steps twice.
 * - `exec` was wrapped in a try/catch that can only see a synchronous throw, and that catch would
 *   have reported a second time as well.
 *
 * @param props the run context and the sqlite slice of the config
 */
export async function run(props: BackItUpProps<SqliteOptions>): Promise<void> {
    const { context: ctx, options } = props;
    const adapter = ctx.adapter!;

    ctx.log.debug('Start SQLite3 Backup ...');

    // stop sql-Adapter before Backup
    let startAfterBackup = false;
    const enabledInstances: string[] = [];
    const resultInstances: { id: string; config: string }[] = [];

    const instances = await adapter
        .getObjectViewAsync('system', 'instance', {
            startkey: 'system.adapter.sql.',
            // U+9999 is the sentinel upper bound the ioBroker object views use, not a real character
            endkey: 'system.adapter.sql.香',
        })
        .catch(err => ctx.log.error(err));

    if (instances && instances.rows) {
        instances.rows.forEach(row =>
            resultInstances.push({
                id: row.id.replace('system.adapter.', ''),
                config: row.value.native.type,
            }),
        );

        for (let i = 0; i < resultInstances.length; i++) {
            const _id = resultInstances[i].id;
            const obj = await adapter.getForeignObjectAsync(`system.adapter.${_id}`).catch(err => ctx.log.error(err));

            if (obj?.common?.enabled) {
                await adapter
                    .setForeignStateAsync(`system.adapter.${_id}.alive`, false)
                    .then(() => ctx.log.debug(`${_id} is stopped`))
                    .catch(err => ctx.log.error(err));

                enabledInstances.push(_id);
                startAfterBackup = true;
            }
        }
    } else {
        ctx.log.warn('Could not retrieve sql instances!');
    }

    /** Restarts whatever was stopped above - on the failure paths as well. */
    const startInstances = async (): Promise<void> => {
        if (!startAfterBackup) {
            return;
        }
        for (let i = 0; i < enabledInstances.length; i++) {
            await adapter
                .setForeignStateAsync(`system.adapter.${enabledInstances[i]}.alive`, true)
                .then(() => ctx.log.debug(`${enabledInstances[i]} started`))
                .catch(e => ctx.log.error(`${enabledInstances[i]} not started: ${e}`));
        }
    };

    const nameSuffix =
        options.hostType === 'Slave' && options.slaveSuffix
            ? options.slaveSuffix
            : options.hostType !== 'Slave' && options.nameSuffix
              ? options.nameSuffix
              : '';
    const fileName = join(
        ctx.backupDir,
        `sqlite_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
    );
    const fileNameSQlite = join(ctx.backupDir, `sqlite_${getDate()}_backupiobroker.sql`);

    ctx.fileNames.push(fileName);

    const timer = setInterval(() => {
        if (existsSync(fileName)) {
            const stats = statSync(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);

    try {
        await new Promise<void>((resolve, reject) => {
            exec(`${options.exe ? options.exe : 'sqlite3'} ${options.filePth} .dump > ${fileNameSQlite}`, error => {
                if (error) {
                    // `ExecException` is declared as Omit<ErrnoException, 'code'>, which drops the
                    // nominal Error identity; binding it back keeps toString() and the log identical.
                    const failure: Error = error;
                    ctx.errors.sqlite = failure.toString();
                    ctx.log.error(failure);
                    reject(failure);
                } else {
                    resolve();
                }
            });
        });

        try {
            await compressAsync({
                src: fileNameSQlite,
                dest: fileName,
                tar: {
                    map: header => {
                        header.name = fileNameSQlite.split('/').pop() as string;
                        return header;
                    },
                },
            });
        } catch (err) {
            ctx.errors.sqlite = (err as Error).toString();
            throw err;
        }
    } finally {
        clearInterval(timer);
        // Start sql Instances
        await startInstances();
    }

    ctx.log.debug(`Backup created: ${fileName}`);
    ctx.done.push('sqlite');
    ctx.types.push('sqlite');

    if (existsSync(fileNameSQlite)) {
        try {
            await unlink(fileNameSQlite);
            ctx.log.debug('sqlite File deleted!');
        } catch (e) {
            ctx.log.warn(`sqlite File cannot deleted: ${e}`);
        }
    }
}

export const ignoreErrors = true;
