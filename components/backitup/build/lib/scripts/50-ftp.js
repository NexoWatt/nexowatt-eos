"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const ftp_1 = __importDefault(require("ftp"));
/**
 * Uploads every file of this run, one after the other.
 *
 * A failed upload is recorded and logged but does not stop the remaining files, exactly as the
 * `setImmediate` recursion did.
 *
 * @param client connected ftp client
 * @param dir target directory on the server
 * @param fileNames the files to send; this list is consumed
 * @param ctx run context, for the logger and the error store
 */
async function uploadFiles(client, dir, fileNames, ctx) {
    while (fileNames.length) {
        let fileName = fileNames.shift();
        fileName = fileName.replace(/\\/g, '/');
        const onlyFileName = fileName.split('/').pop();
        ctx.log.debug(`Send ${onlyFileName}`);
        if ((0, node_fs_1.existsSync)(fileName)) {
            await new Promise(resolve => {
                client.put(fileName, `${dir}/${onlyFileName}`, err => {
                    if (err) {
                        ctx.errors.ftp = err;
                        ctx.log.error(err);
                    }
                    resolve();
                });
            });
        }
        else {
            ctx.log.error(`File "${fileName}" not found`);
        }
    }
}
/**
 * Deletes the given files, keeping going past any that fail.
 *
 * @param client connected ftp client
 * @param files absolute paths on the server; this list is consumed
 * @param ctx run context, for the logger
 */
async function deleteFiles(client, files, ctx) {
    while (files.length) {
        ctx.log.debug(`delete ${files[0]}`);
        const file = files.shift();
        try {
            await new Promise(resolve => {
                client.delete(file, err => {
                    if (err) {
                        ctx.log.error(err);
                    }
                    resolve();
                });
            });
        }
        catch (e) {
            ctx.log.error(e);
        }
    }
}
/**
 * Drops everything but the newest `num` backups per backup type.
 *
 * @param client connected ftp client
 * @param options script options, for the multi-instance counts
 * @param dir directory to clean
 * @param names backup types of this run
 * @param num how many to keep per type
 * @param ctx run context, for the logger and the error store
 */
async function cleanFiles(client, options, dir, names, num, ctx) {
    if (!num) {
        return;
    }
    if (dir[dir.length - 1] !== '/') {
        dir += '/';
    }
    const result = await new Promise(resolve => {
        client.list(dir, (err, list) => {
            if (err) {
                ctx.errors.ftp = ctx.errors.ftp || err;
            }
            resolve(list);
        });
    });
    if (!names || !result || !result.length) {
        return;
    }
    const files = [];
    names.forEach(name => {
        if (name) {
            let subResult;
            try {
                subResult = result.filter(a => a.name.startsWith(name));
            }
            catch (e) {
                ctx.log.error(`FTP error: ${e}`);
            }
            let numDel = num;
            // Multi-instance setups produce one file per configured target per run.
            if (name === 'influxDB' && options.influxDBMulti) {
                numDel = num * options.influxDBEvents.length;
            }
            if (name === 'mysql' && options.mySqlMulti) {
                numDel = num * options.mySqlEvents.length;
            }
            if (name === 'pgsql' && options.pgSqlMulti) {
                numDel = num * options.pgSqlEvents.length;
            }
            if (name === 'homematic' && options.ccuMulti) {
                numDel = num * options.ccuEvents.length;
            }
            if (subResult && subResult.length > numDel) {
                // delete oldest files
                subResult.sort((a, b) => {
                    const at = new Date(a.date).getTime();
                    const bt = new Date(b.date).getTime();
                    if (at > bt) {
                        return -1;
                    }
                    if (at < bt) {
                        return 1;
                    }
                    return 0;
                });
                for (let i = numDel; i < subResult.length; i++) {
                    files.push(dir + subResult[i].name);
                }
            }
        }
    });
    await deleteFiles(client, files, ctx);
}
/**
 * Sends this run's archives to an FTP server and prunes the old ones.
 *
 * @param props the run context and the ftp slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    if (!options.host || !ctx.fileNames || !ctx.fileNames.length) {
        return;
    }
    const client = new ftp_1.default();
    const fileNames = JSON.parse(JSON.stringify(ctx.fileNames));
    // Note: this writes back onto the shared options object.
    if (!options.dir.startsWith('/')) {
        options.dir = `/${options.dir}`;
    }
    let dir = (options.dir || '').replace(/\\/g, '/');
    if (!dir || dir[0] !== '/') {
        dir = `/${dir || ''}`;
    }
    await new Promise((resolve, reject) => {
        client.on('ready', () => {
            void (async () => {
                ctx.log.debug('FTP connected.');
                await uploadFiles(client, dir, fileNames, ctx);
                if (options.deleteOldBackup === true) {
                    const ftpDeleteAfter = options.advancedDelete === false ? options.deleteBackupAfter : options.ftpDeleteAfter;
                    try {
                        await cleanFiles(client, options, dir, ctx.types, ftpDeleteAfter, ctx);
                    }
                    catch (err) {
                        // Only a synchronous failure of the listing call gets here, as before. Note
                        // that an upload error does not: the step is still counted as done then.
                        ctx.errors.ftp = ctx.errors.ftp || err;
                        client.end();
                        reject(err);
                        return;
                    }
                    ctx.done.push('ftp');
                    client.end();
                    resolve();
                }
                else {
                    client.end();
                    if (!ctx.errors.ftp) {
                        ctx.done.push('ftp');
                    }
                    resolve();
                }
            })();
        });
        client.on('error', err => {
            ctx.errors.ftp = err;
            reject(err);
        });
        client.connect({
            host: options.host,
            port: options.port || 21,
            secure: !!options.secure || false,
            // As in lib/list/ftp: `!!x || true` is always true, so the "allow only signed
            // certificates" setting has never had any effect here. Left as found - making the flag
            // work would silently switch off certificate checking for everyone who unticked it.
            secureOptions: { rejectUnauthorized: !!options.signedCertificates || true },
            user: options.user,
            password: options.pass,
        });
    });
}
exports.ignoreErrors = true;
//# sourceMappingURL=50-ftp.js.map