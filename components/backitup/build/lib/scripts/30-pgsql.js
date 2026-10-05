"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/**
 * Dumps the configured PostgreSQL database(s) and packs each dump.
 *
 * As in 30-mysql the callback version reported a dump failure from `startBackup` and then reported
 * success again from here, and lib/execute scheduled the remaining backup steps twice as a result.
 * Awaiting collapses that to a single report.
 *
 * @param props the run context and the pgsql slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    // A failed target no longer stops the others, as before; the first failure is reported once
    // every target has been attempted.
    let firstError;
    const attempt = async () => {
        try {
            await startBackup(ctx, options);
        }
        catch (err) {
            firstError ??= err;
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
    }
    else {
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
async function startBackup(ctx, options) {
    let nameSuffix;
    if (options.hostType === 'Slave' && !options.pgSqlMulti) {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    }
    else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }
    const fileName = (0, node_path_1.join)(ctx.backupDir, `pgsql_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
    const fileNamePgsql = (0, node_path_1.join)(ctx.backupDir, `pgsql_${(0, tools_1.getDate)()}_backupiobroker.sql`);
    ctx.fileNames.push(fileName);
    // Note the asymmetry in the second clause - as in 01-mount, `endsWith("'")` is not negated.
    if ((!options.pass.startsWith(`"`) || !options.pass.endsWith(`"`)) &&
        (!options.pass.startsWith(`'`) || options.pass.endsWith(`'`))) {
        options.pass = `"${options.pass}"`;
    }
    await new Promise((resolve, reject) => {
        (0, node_child_process_1.exec)(`${options.exe ? options.exe : 'pg_dump'}  --dbname=postgresql://${options.user}:${options.pass}@${options.host}:${options.port}/${options.dbName} > ${fileNamePgsql}`, { maxBuffer: 10 * 1024 * 1024 }, error => {
            if (error) {
                // Masked on the message itself, not just where it is stored: this error is
                // what the step reports, and lib/execute writes it to the adapter log, the
                // output.line state and the backup history file. Masking `${error}` and
                // masking `error.message` give the same text, the prefix holds no password.
                let errLog = error.message;
                try {
                    const formatPass = options.pass.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    errLog = errLog.replace(new RegExp(formatPass, 'g'), '****');
                }
                catch {
                    // ignore
                }
                error.message = errLog;
                // `ExecException` is declared as Omit<ErrnoException, 'code'>, which drops the
                // nominal Error identity; binding it back keeps the formatted text the same.
                const failure = error;
                ctx.errors.pgsql = failure.toString();
                // The `stderr` the original passed as a second callback argument is dropped -
                // the masked error says the same and cannot leak the password.
                reject(failure);
            }
            else {
                resolve();
            }
        });
    });
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(fileName)) {
            const stats = (0, node_fs_1.statSync)(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);
    try {
        await (0, targz_1.compressAsync)({
            src: fileNamePgsql,
            dest: fileName,
            tar: {
                map: header => {
                    header.name = fileNamePgsql.split('/').pop();
                    return header;
                },
            },
        });
    }
    catch (err) {
        ctx.errors.pgsql = err.toString();
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    if (fileNamePgsql) {
        // The original deleted asynchronously and rethrew inside the fs callback, where nothing
        // could catch it: an undeletable temp file took the whole adapter down, after the archive
        // had already been written. Now it warns, exactly as 30-mysql does.
        try {
            (0, node_fs_1.unlinkSync)(fileNamePgsql);
            ctx.log.debug('postgresql File deleted!');
        }
        catch (e) {
            ctx.log.warn(`postgresql File cannot deleted: ${e}`);
        }
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=30-pgsql.js.map