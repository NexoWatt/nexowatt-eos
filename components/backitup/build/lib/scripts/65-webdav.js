"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_https_1 = require("node:https");
const node_path_1 = require("node:path");
/**
 * Uploads every file of this run, one after the other.
 *
 * A failed upload is logged but does not stop the remaining files, as before.
 *
 * @param client connected webdav client
 * @param dir target directory
 * @param fileNames the files to send; this list is consumed
 * @param ctx run context, for the logger
 */
async function copyFiles(client, dir, fileNames, ctx) {
    while (fileNames.length) {
        let fileName = fileNames.shift();
        fileName = fileName.replace(/\\/g, '/');
        const onlyFileName = fileName.split('/').pop();
        if (!(0, node_fs_1.existsSync)(fileName)) {
            ctx.log.error(`WebDAV: File "${fileName}" not found`);
            continue;
        }
        try {
            const webdavFilename = (0, node_path_1.join)(dir, onlyFileName);
            ctx.log.debug(`WebDAV: Copy ${onlyFileName}...`);
            const fileContent = (0, node_fs_1.readFileSync)(fileName);
            // Upload File
            await client.putFileContents(webdavFilename, fileContent, {
                format: 'binary',
                'Content-Type': 'application/octet-stream',
                contentLength: fileContent.length,
            });
        }
        catch (e) {
            ctx.log.error(`WebDAV: ${e}`);
        }
    }
}
/**
 * Deletes the given files, keeping going past any that fail.
 *
 * @param client connected webdav client
 * @param files paths to delete; this list is consumed
 * @param ctx run context, for the logger
 */
async function deleteFiles(client, files, ctx) {
    while (files.length) {
        ctx.log.debug(`WebDAV: delete ${files[0]}`);
        const file = files.shift();
        try {
            await client.deleteFile(file);
        }
        catch (err) {
            ctx.log.error(`WebDAV: ${err}`);
        }
    }
}
/**
 * Drops everything but the newest `num` backups per backup type.
 *
 * @param client connected webdav client
 * @param options script options, for the multi-instance counts
 * @param dir directory to clean
 * @param names backup types of this run
 * @param num how many to keep per type
 * @param ctx run context, for the logger
 */
async function cleanFiles(client, options, dir, names, num, ctx) {
    if (!num) {
        return;
    }
    const result = await client.getDirectoryContents(dir.replace(/^\/$/, ''));
    if (!result) {
        return;
    }
    const files = [];
    names.forEach(name => {
        const subResult = result.filter(a => a.basename.startsWith(name));
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
        if (subResult.length > numDel) {
            // delete oldest files
            subResult.sort((a, b) => {
                const at = new Date(a.lastmod).getTime();
                const bt = new Date(b.lastmod).getTime();
                if (at > bt) {
                    return -1;
                }
                if (at < bt) {
                    return 1;
                }
                return 0;
            });
            for (let i = numDel; i < subResult.length; i++) {
                files.push(subResult[i].filename);
            }
        }
    });
    await deleteFiles(client, files, ctx);
}
/**
 * Sends this run's archives to a WebDAV server and prunes the old ones.
 *
 * The callback version reported up to three times on a broken connection: a failed `createClient`
 * reported success, the dereference of the missing client then threw into the next `try`, which
 * reported success again, and the third `try` finally reported the error. It reports once now, and
 * an unusable client ends the step instead of running into the follow-up failures.
 *
 * @param props the run context and the webdav slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    if (!options.username || !options.pass || !options.url || !ctx.fileNames.length) {
        return;
    }
    const fileNames = JSON.parse(JSON.stringify(ctx.fileNames));
    ctx.log.debug('Start WebDAV Upload ...');
    let dir = (options.dir || '').replace(/\\/g, '/');
    if (!dir || dir[0] !== '/') {
        dir = `/${dir || ''}`;
    }
    const { createClient } = await import('webdav');
    const agent = new node_https_1.Agent({ rejectUnauthorized: Boolean(options.signedCertificates) });
    let client;
    try {
        client = createClient(options.url, {
            username: options.username,
            password: options.pass,
            maxBodyLength: Infinity,
            httpsAgent: agent,
        });
    }
    catch (err) {
        ctx.errors.webdav = err;
        ctx.log.error(`cannot connect to WebDAV: ${err}`);
        throw err;
    }
    try {
        if ((await client.exists(dir)) === false) {
            await client.createDirectory(dir);
        }
    }
    catch (e) {
        // Recorded and carried on with, as before - the directory may well exist already, and the
        // error store keeps the step from being counted as done further down.
        ctx.log.warn(`cannot created the backup directory: ${e}`);
        ctx.errors.webdav = e;
    }
    try {
        await client.getDirectoryContents(dir);
    }
    catch (err) {
        ctx.log.error(`cannot connect to WebDAV: ${err}`);
        ctx.errors.webdav = err;
        throw err;
    }
    await copyFiles(client, dir, fileNames, ctx);
    if (options.deleteOldBackup === true) {
        const webdavDeleteAfter = options.advancedDelete === false ? options.deleteBackupAfter : options.webdavDeleteAfter;
        try {
            await cleanFiles(client, options, dir, ctx.types, webdavDeleteAfter, ctx);
        }
        catch (cleanErr) {
            ctx.errors.webdav = ctx.errors.webdav || cleanErr;
            throw cleanErr;
        }
    }
    if (!ctx.errors.webdav) {
        ctx.done.push('webdav');
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=65-webdav.js.map