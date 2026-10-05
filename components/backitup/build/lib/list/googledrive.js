"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getFile = getFile;
const googleDriveLib_1 = __importDefault(require("../googleDriveLib"));
function settings(options) {
    return {
        accessJson: options.accessJson !== undefined
            ? options.accessJson
            : options.googledrive && options.googledrive.accessJson !== undefined
                ? options.googledrive.accessJson
                : '',
        dir: options.dir !== undefined
            ? options.dir
            : options.googledrive && options.googledrive.dir !== undefined
                ? options.googledrive.dir
                : '/',
        ownDir: options.ownDir !== undefined
            ? options.ownDir
            : options.googledrive && options.googledrive.ownDir !== undefined
                ? options.googledrive.ownDir
                : false,
        dirMinimal: options.dirMinimal !== undefined
            ? options.dirMinimal
            : options.googledrive && options.googledrive.dirMinimal !== undefined
                ? options.googledrive.dirMinimal
                : '/',
        newToken: options.newToken !== undefined
            ? options.newToken
            : options.googledrive && options.googledrive.newToken !== undefined
                ? options.googledrive.newToken
                : '',
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
 * Lists the backups stored on Google Drive.
 *
 * @param props run context, storage config, requested source and backup types
 */
async function list(props) {
    const { options, restoreSource, types } = props;
    const { accessJson, dir: gdDir, ownDir, dirMinimal, newToken } = settings(options);
    if (!accessJson || (restoreSource && restoreSource !== 'googledrive')) {
        // Not configured, or another storage was asked for - nothing to file.
        return undefined;
    }
    let gDrive;
    try {
        gDrive = new googleDriveLib_1.default(accessJson, newToken);
        if (!gDrive) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw 'No or invalid access key';
        }
    }
    catch {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'No or invalid access key';
    }
    const dir = targetDir(gdDir, ownDir, dirMinimal);
    const id = await gDrive.getFileOrFolderId(dir);
    if (!id) {
        // Reported an empty array here before; an empty object is what every other engine returns
        // and what the result type describes. Both are read with `Object.keys()` / property access
        // downstream, so this reads the same.
        return {};
    }
    const entries = await gDrive.listFilesInFolder(id);
    const result = entries
        .map((file) => ({
        path: file.name,
        name: file.name,
        size: file.size,
        id,
    }))
        .filter(file => (types.includes(file.name.split('_')[0]) || types.includes(file.name.split('.')[0])) &&
        file.name.split('.').pop() === 'gz');
    const files = {};
    result.forEach(file => {
        const type = file.name.split('_')[0];
        files[type] = files[type] || [];
        files[type].push(file);
    });
    return files;
}
/**
 * Downloads one backup from Google Drive.
 *
 * NOTE: the promise chain this replaces did not stop at the first miss. A missing folder reported
 * 'Folder not found', then handed `undefined` on so the next link reported 'File not found', and
 * the last link reported success on top - three callbacks for one failure. Awaiting stops at the
 * first one, which is the only report the caller ever wanted.
 *
 * @param props run context, storage config, the file to fetch and where to put it
 */
async function getFile(props) {
    const { context: { log }, options, fileName, toStoreName, } = props;
    const { accessJson, dir: gdDir, ownDir, dirMinimal, newToken } = settings(options);
    if (!accessJson) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'Not configured';
    }
    const gDrive = new googleDriveLib_1.default(accessJson, newToken);
    if (!gDrive) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'No or invalid access key';
    }
    const dir = targetDir(gdDir, ownDir, dirMinimal);
    /**
     * Logs a genuine API failure the way the old `.catch()` on the chain did, then re-throws.
     *
     * The two "not found" markers below deliberately do not go through here: they were handed
     * straight to the callback before and never produced a log line.
     *
     * @param err whatever the Drive client rejected with
     */
    const reportApiFailure = (err) => {
        if (err) {
            log.error(err);
        }
        throw err;
    };
    log.debug(`Download of "${fileName}" started`);
    const folderId = await gDrive.getFileOrFolderId(dir).catch(reportApiFailure);
    if (!folderId) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'Folder not found';
    }
    const fileId = await gDrive.getFileOrFolderId(fileName, folderId).catch(reportApiFailure);
    if (!fileId) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'File not found';
    }
    await gDrive.readFile(fileId, toStoreName).catch(reportApiFailure);
    log.debug(`Download of "${fileName}" done`);
}
//# sourceMappingURL=googledrive.js.map