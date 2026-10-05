"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getFile = getFile;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const dropbox_v2_api_1 = require("dropbox-v2-api");
/** Kept at module scope, as before */
let db_accessToken;
function settings(options) {
    return {
        dir: options.dir !== undefined
            ? options.dir
            : options.dropbox && options.dropbox.dir !== undefined
                ? options.dropbox.dir
                : '/',
        ownDir: options.ownDir !== undefined
            ? options.ownDir
            : options.dropbox && options.dropbox.ownDir !== undefined
                ? options.dropbox.ownDir
                : false,
        dirMinimal: options.dirMinimal !== undefined
            ? options.dirMinimal
            : options.dropbox && options.dropbox.dirMinimal !== undefined
                ? options.dropbox.dirMinimal
                : '/',
    };
}
/**
 * Applies the "own directory" switch and makes sure the path is absolute
 *
 * @param dir configured target directory
 * @param ownDir whether the minimal backup uses its own directory
 * @param dirMinimal directory used when `ownDir` is set
 */
function targetDir(dir, ownDir, dirMinimal) {
    let result = (dir || '').replace(/\\/g, '/');
    if (ownDir === true) {
        result = (dirMinimal || '').replace(/\\/g, '/');
    }
    if (!result || result[0] !== '/') {
        result = `/${result || ''}`;
    }
    return result;
}
/**
 * Lists the backups stored on Dropbox.
 *
 * @param props run context, storage config, requested source and backup types
 */
async function list(props) {
    const { context: { log }, options, restoreSource, types, } = props;
    const { dir: dbDir, ownDir, dirMinimal } = settings(options);
    // Token refresh
    if (!restoreSource || restoreSource === 'dropbox') {
        db_accessToken = options.accessToken || '';
    }
    if (!db_accessToken || (restoreSource && restoreSource !== 'dropbox')) {
        // Not configured, or another storage was asked for - nothing to file.
        return undefined;
    }
    const dbx = (0, dropbox_v2_api_1.authenticate)({ token: db_accessToken });
    const dir = targetDir(dbDir, ownDir, dirMinimal);
    return new Promise((resolve, reject) => {
        dbx({
            resource: 'files/list_folder',
            parameters: {
                path: dir.replace(/^\/$/, ''),
            },
        }, (err, result) => {
            if (err && err.error_summary) {
                log.error(`Dropbox: ${JSON.stringify(err.error_summary)}`);
            }
            if (result && result.entries) {
                const entries = result.entries
                    .map((file) => ({
                    path: file.path_display,
                    name: file.path_display.replace(/\\/g, '/').split('/').pop(),
                    size: file.size,
                }))
                    .filter(file => (types.indexOf(file.name.split('_')[0]) !== -1 ||
                    types.indexOf(file.name.split('.')[0]) !== -1) &&
                    file.name.split('.').pop() == 'gz');
                const files = {};
                entries.forEach(file => {
                    const type = file.name.split('_')[0];
                    files[type] = files[type] || [];
                    files[type].push(file);
                });
                resolve(files);
            }
            else {
                reject(`Dropbox: ${err?.error_summary ? JSON.stringify(err.error_summary) : 'Error on Dropbox list'}`);
            }
        });
    });
}
/**
 * Downloads one backup from Dropbox.
 *
 * @param props run context, storage config, the file to fetch and where to put it
 */
async function getFile(props) {
    const { context: { log }, options, fileName, toStoreName, } = props;
    const { dir: dbDir, ownDir, dirMinimal } = settings(options);
    // Token refresh
    const accessToken = options.accessToken || '';
    if (!accessToken) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'Not configured';
    }
    // copy file to backupDir
    const dbx = (0, dropbox_v2_api_1.authenticate)({ token: accessToken });
    const onlyFileName = fileName.split('/').pop();
    const dir = targetDir(dbDir, ownDir, dirMinimal);
    return new Promise((resolve, reject) => {
        // Settles at most once, whichever of the write stream and the request reports first -
        // the promise takes over the guard the old `finish` helper provided.
        const finish = (err) => (err ? reject(err) : resolve());
        log.debug(`Dropbox: Download of "${fileName}" started`);
        const writeStream = (0, node_fs_1.createWriteStream)(toStoreName);
        writeStream.on('error', err => {
            if (err) {
                log.error(`Dropbox: ${err}`);
            }
            finish(err);
        });
        dbx({
            resource: 'files/download',
            parameters: {
                path: (0, node_path_1.join)(dir.replace(/^\/$/, ''), onlyFileName).replace(/\\/g, '/'),
            },
        }, err => {
            if (err) {
                log.error(`Dropbox: ${err}`);
            }
            else {
                log.debug(`Dropbox: Download of "${fileName}" done`);
            }
            finish(err);
        }).pipe(writeStream);
    });
}
//# sourceMappingURL=dropbox.js.map