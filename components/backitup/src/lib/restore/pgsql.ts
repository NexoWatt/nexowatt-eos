import { exec } from 'node:child_process';
import { existsSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { decompressAsync } from '../targz';
import type { BackItUpContext } from '../types';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

interface PgsqlRestoreOptions extends BackItUpRestoreOptions {
    user: string;
    pass: string;
    host: string;
    port: number | string;
    dbName: string;
}

/**
 * Recreates the database and runs the restore command against it.
 *
 * Always resolves: the replay error is deliberately ignored, the step reports success either way.
 *
 * @param ctx run context, for the logger
 * @param options connection settings; note that `pass` is quoted in place
 * @param fileNamePgsql the unpacked .sql file
 */
async function replayPgSql(ctx: BackItUpContext, options: PgsqlRestoreOptions, fileNamePgsql: string): Promise<void> {
    if (
        (!options.pass.startsWith(`"`) || !options.pass.endsWith(`"`)) &&
        (!options.pass.startsWith(`'`) || !options.pass.endsWith(`'`))
    ) {
        // Written back onto `options`, so a second call quotes the already quoted value again.
        options.pass = `"${options.pass}"`;
    }

    // create DB before executing script  psql -c "create database Db name;" postgresql://iobroker:iobroker@localhost:5432/
    const cmdCreate = `psql -c "create database ${options.dbName};" postgresql://${options.user}:${options.pass}@${options.host}:${options.port}/`;

    try {
        await new Promise<void>(resolve => {
            exec(cmdCreate, () => resolve());
        });

        // NOTE: this runs `pg_dump`, not `pg_restore` - the commented-out pg_restore line the
        // original carried right here shows what was meant. As written the step writes a dump to
        // stdout and discards it, so nothing is actually restored. Kept as found.
        //const cmd = `pg_restore --dbname=postgresql://${options.user}:${options.pass}@${options.host}:${options.port}/${options.dbName} < ${fileNamePgsql}`;
        const cmd = `pg_dump --format=custom --dbname=postgresql://${options.user}:${options.pass}@${options.host}:${options.port}/${options.dbName} < ${fileNamePgsql}`;

        await new Promise<void>(resolve => {
            // The original kept the ChildProcess in an unused `child` binding.
            exec(cmd, (error, _stdout, stderr) => {
                if (error) {
                    ctx.log.error(stderr);
                }
                resolve();
            });
        });
    } catch {
        // ignore errors
    }
}

/**
 * Unpacks a PostgreSQL dump and hands it to the restore command.
 *
 * @param props the run context, the pgsql slice of the config and the archive
 */
export async function restore(props: BackItUpRestoreProps<PgsqlRestoreOptions>): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter!;

    const fileNamePgsql = join(options.backupDir, `pgsql_restore_backupiobroker.sql`);
    ctx.log.debug('Start postgresql Restore ...');

    // stop sql-Adapter before Restore
    let startAfterRestore = false;
    const enabledInstances: string[] = [];

    // Not awaited, so the instances may still be stopping when the replay starts. Kept as found.
    void adapter.getObjectView(
        'system',
        'instance',
        { startkey: 'system.adapter.sql.', endkey: 'system.adapter.sql.香' },
        (err, instances) => {
            const resultInstances: { id: string; config: unknown }[] = [];
            if (!err && instances && instances.rows) {
                instances.rows.forEach(row => {
                    resultInstances.push({
                        id: row.id.replace('system.adapter.', ''),
                        config: row.value.native.type,
                    });
                });
                for (let i = 0; i < resultInstances.length; i++) {
                    const _id = resultInstances[i].id;
                    // Stop sql Instances
                    void adapter.getForeignObject(`system.adapter.${_id}`, (err, obj) => {
                        if (obj?.common?.enabled) {
                            void adapter.setForeignState(`system.adapter.${_id}.alive`, false);
                            ctx.log.debug(`${_id} is stopped`);
                            enabledInstances.push(_id);
                            startAfterRestore = true;
                        }
                    });
                }
            } else {
                ctx.log.debug('Could not retrieve sql instances!');
            }
        },
    );

    const timer = setInterval(() => {
        if (existsSync(fileNamePgsql)) {
            const stats = statSync(fileNamePgsql);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Extract postgresql Backup file ${fileSize}MB so far...`);
        } else {
            ctx.log.debug(`Something is wrong with "${fileNamePgsql}".`);
        }
    }, 10000);

    try {
        await decompressAsync({
            src: fileName,
            dest: options.backupDir,
            tar: {
                map: header => {
                    header.name = `pgsql_restore_backupiobroker.sql`;
                    return header;
                },
            },
        });
    } catch (err) {
        ctx.log.error(err);
        ctx.log.error('postgresql Restore not completed');
        throw err;
    } finally {
        clearInterval(timer);
    }

    await replayPgSql(ctx, options, fileNamePgsql);

    // Start sql Instances
    if (startAfterRestore) {
        enabledInstances.forEach(enabledInstance => {
            void adapter.getForeignObject(`system.adapter.${enabledInstance}`, (err, obj) => {
                if (obj && !obj.common?.enabled) {
                    void adapter.setForeignState(`system.adapter.${enabledInstance}.alive`, true);
                    ctx.log.debug(`${enabledInstance} started`);
                }
            });
        });
    }
    // delete pgsql file
    // Unlike mysql/sqlite this is not guarded, so a failing unlink ends the step. Kept as found.
    if (existsSync(fileNamePgsql)) {
        unlinkSync(fileNamePgsql);
    }

    ctx.log.debug('postgresql Restore completed successfully');
    return 'postgresql restore done';
}

export const isStop = false;
