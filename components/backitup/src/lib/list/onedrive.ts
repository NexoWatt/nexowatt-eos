import Onedrive from '../oneDriveLib';
import type { BackItUpConfigStorageOneDrive } from '../types';
import type { BackItUpGetFileProps, BackItUpListProps, BackItUpStorageEngineResult } from './types';

/**
 * The engines are handed either the storage node itself or the enclosing creator node, which
 * carries the storage under its own key - hence the two-step lookup on every setting.
 */
type OneDriveOptions = Partial<BackItUpConfigStorageOneDrive> & {
    onedrive?: Partial<BackItUpConfigStorageOneDrive>;
};

/**
 * Lists the backups stored on OneDrive.
 *
 * @param props run context, storage config, requested source and backup types
 */
export async function list(
    props: BackItUpListProps<OneDriveOptions>,
): Promise<BackItUpStorageEngineResult | undefined> {
    const {
        context: { log },
        options,
        restoreSource,
        types,
    } = props;

    const accessJson =
        options.onedriveAccessJson !== undefined
            ? options.onedriveAccessJson
            : options.onedrive && options.onedrive.onedriveAccessJson !== undefined
              ? options.onedrive.onedriveAccessJson
              : '';
    const configuredDir =
        options.dir !== undefined
            ? (options.dir as string)
            : options.onedrive && options.onedrive.dir !== undefined
              ? (options.onedrive.dir as string)
              : '/';
    const ownDir =
        options.ownDir !== undefined
            ? options.ownDir
            : options.onedrive && options.onedrive.ownDir !== undefined
              ? options.onedrive.ownDir
              : false;
    const dirMinimal =
        options.dirMinimal !== undefined
            ? options.dirMinimal
            : options.onedrive && options.onedrive.dirMinimal !== undefined
              ? options.onedrive.dirMinimal
              : '/';

    let od_accessToken: string | undefined;

    // Refresh token if necessary
    if (restoreSource && restoreSource !== 'onedrive') {
        // Another storage was asked for - nothing to file.
        return undefined;
    }

    const onedrive = new Onedrive();
    try {
        od_accessToken = await onedrive.getToken(accessJson, log);
    } catch (err) {
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
    } catch (error) {
        log.error(`Onedrive listBackups error: ${error}`);
        throw error as Error;
    }
}

/**
 * Downloads one backup from OneDrive.
 *
 * @param props run context, storage config, the file to fetch and where to put it
 */
export async function getFile(props: BackItUpGetFileProps<OneDriveOptions>): Promise<void> {
    const {
        context: { log },
        options,
        fileName,
        toStoreName,
    } = props;

    const accessJson = options.onedriveAccessJson ?? options.onedrive?.onedriveAccessJson ?? '';
    const configuredDir = options.dir ?? options.onedrive?.dir ?? '/';
    const ownDir = options.ownDir ?? options.onedrive?.ownDir ?? false;
    const dirMinimal = options.dirMinimal ?? options.onedrive?.dirMinimal ?? '/';

    const onedrive = new Onedrive();
    const od_accessToken = await onedrive
        .getToken(accessJson, log)
        .catch(err => log.warn(`OneDrive Token: ${err}`));

    if (!od_accessToken) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'Not configured';
    }

    try {
        const dir = ownDir ? dirMinimal : configuredDir;
        const onlyFileName = fileName.split('/').pop() as string;

        await onedrive.downloadFileByName({
            accessToken: od_accessToken,
            dir,
            fileName: onlyFileName,
            targetPath: toStoreName,
            log,
        });
    } catch (err) {
        log.error(`OneDrive: ${(err as Error).message}`);
        throw err as Error;
    }
}
