"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
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
async function run(props) {
    const { context: ctx, options } = props;
    const adapter = ctx.adapter;
    ctx.log.debug('Start SQLite3 Backup ...');
    // stop sql-Adapter before Backup
    let startAfterBackup = false;
    const enabledInstances = [];
    const resultInstances = [];
    const instances = await adapter
        .getObjectViewAsync('system', 'instance', {
        startkey: 'system.adapter.sql.',
        // U+9999 is the sentinel upper bound the ioBroker object views use, not a real character
        endkey: 'system.adapter.sql.香',
    })
        .catch(err => ctx.log.error(err));
    if (instances && instances.rows) {
        instances.rows.forEach(row => resultInstances.push({
            id: row.id.replace('system.adapter.', ''),
            config: row.value.native.type,
        }));
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
    }
    else {
        ctx.log.warn('Could not retrieve sql instances!');
    }
    /** Restarts whatever was stopped above - on the failure paths as well. */
    const startInstances = async () => {
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
    const nameSuffix = options.hostType === 'Slave' && options.slaveSuffix
        ? options.slaveSuffix
        : options.hostType !== 'Slave' && options.nameSuffix
            ? options.nameSuffix
            : '';
    const fileName = (0, node_path_1.join)(ctx.backupDir, `sqlite_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
    const fileNameSQlite = (0, node_path_1.join)(ctx.backupDir, `sqlite_${(0, tools_1.getDate)()}_backupiobroker.sql`);
    ctx.fileNames.push(fileName);
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(fileName)) {
            const stats = (0, node_fs_1.statSync)(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);
    try {
        await new Promise((resolve, reject) => {
            (0, node_child_process_1.exec)(`${options.exe ? options.exe : 'sqlite3'} ${options.filePth} .dump > ${fileNameSQlite}`, error => {
                if (error) {
                    // `ExecException` is declared as Omit<ErrnoException, 'code'>, which drops the
                    // nominal Error identity; binding it back keeps toString() and the log identical.
                    const failure = error;
                    ctx.errors.sqlite = failure.toString();
                    ctx.log.error(failure);
                    reject(failure);
                }
                else {
                    resolve();
                }
            });
        });
        try {
            await (0, targz_1.compressAsync)({
                src: fileNameSQlite,
                dest: fileName,
                tar: {
                    map: header => {
                        header.name = fileNameSQlite.split('/').pop();
                        return header;
                    },
                },
            });
        }
        catch (err) {
            ctx.errors.sqlite = err.toString();
            throw err;
        }
    }
    finally {
        clearInterval(timer);
        // Start sql Instances
        await startInstances();
    }
    ctx.log.debug(`Backup created: ${fileName}`);
    ctx.done.push('sqlite');
    ctx.types.push('sqlite');
    if ((0, node_fs_1.existsSync)(fileNameSQlite)) {
        try {
            await (0, promises_1.unlink)(fileNameSQlite);
            ctx.log.debug('sqlite File deleted!');
        }
        catch (e) {
            ctx.log.warn(`sqlite File cannot deleted: ${e}`);
        }
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=30-sqlite.js.map