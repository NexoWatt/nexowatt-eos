"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getFile = getFile;
const oneDriveLib_1 = __importDefault(require("../oneDriveLib"));
/**
 * Lists the backups stored on OneDrive.
 *
 * @param props run context, storage config, requested source and backup types
 */
async function list(props) {
    const { context: { log }, options, restoreSource, types, } = props;
    const accessJson = options.onedriveAccessJson !== undefined
        ? options.onedriveAccessJson
        : options.onedrive && options.onedrive.onedriveAccessJson !== undefined
            ? options.onedrive.onedriveAccessJson
            : '';
    const configuredDir = options.dir !== undefined
        ? options.dir
        : options.onedrive && options.onedrive.dir !== undefined
            ? options.onedrive.dir
            : '/';
    const ownDir = options.ownDir !== undefined
        ? options.ownDir
        : options.onedrive && options.onedrive.ownDir !== undefined
            ? options.onedrive.ownDir
            : false;
    const dirMinimal = options.dirMinimal !== undefined
        ? options.dirMinimal
        : options.onedrive && options.onedrive.dirMinimal !== undefined
            ? options.onedrive.dirMinimal
            : '/';
    let od_accessToken;
    // Refresh token if necessary
    if (restoreSource && restoreSource !== 'onedrive') {
        // Another storage was asked for - nothing to file.
        return undefined;
    }
    const onedrive = new oneDriveLib_1.default();
    try {
        od_accessToken = await onedrive.getToken(accessJson, log);
    }
    catch (err) {
        log.warn(`Onedrive Token: ${err}`);
    }
    if (!od_accessToken) {
        // A plain string, as before: lib/list logs it verbatim.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'No access token available';
    }
    let dir = (configuredDir || '').replace(/\\/g, '/');
    // Use minimal path if ownDir is true
    if (ownDir === true) {
        dir = (dirMinimal || '').replace(/\\/g, '/');
    }
    // Normalize directory format
    if (!dir || dir[0] !== '/') {
        dir = `/${dir || ''}`;
    }
    // Unreachable - the step above always leaves at least '/'. Kept as found.
    if (!dir) {
        dir = 'root';
    }
    if (dir.startsWith('/')) {
        dir = dir.substring(1);
    }
    try {
        // Call internal listBackups method from class.
        // A null result used to be handed to the callback and skipped by the caller because it is
        // falsy; `undefined` is how the props contract says the same thing.
        return (await onedrive.listBackups({ accessToken: od_accessToken, dir, types, log })) ?? undefined;
    }
    catch (error) {
        log.error(`Onedrive listBackups error: ${error}`);
        throw error;
    }
}
/**
 * Downloads one backup from OneDrive.
 *
 * @param props run context, storage config, the file to fetch and where to put it
 */
async function getFile(props) {
    const { context: { log }, options, fileName, toStoreName, } = props;
    const accessJson = options.onedriveAccessJson ?? options.onedrive?.onedriveAccessJson ?? '';
    const configuredDir = options.dir ?? options.onedrive?.dir ?? '/';
    const ownDir = options.ownDir ?? options.onedrive?.ownDir ?? false;
    const dirMinimal = options.dirMinimal ?? options.onedrive?.dirMinimal ?? '/';
    const onedrive = new oneDriveLib_1.default();
    const od_accessToken = await onedrive
        .getToken(accessJson, log)
        .catch(err => log.warn(`OneDrive Token: ${err}`));
    if (!od_accessToken) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'Not configured';
    }
    try {
        const dir = ownDir ? dirMinimal : configuredDir;
        const onlyFileName = fileName.split('/').pop();
        await onedrive.downloadFileByName({
            accessToken: od_accessToken,
            dir,
            fileName: onlyFileName,
            targetPath: toStoreName,
            log,
        });
    }
    catch (err) {
        log.error(`OneDrive: ${err.message}`);
        throw err;
    }
}
//# sourceMappingURL=onedrive.js.map