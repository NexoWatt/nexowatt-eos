import type { BackItUpProps, BackItUpStorage } from '../types';

export type BackItUpStorageEngineResultFile = {
    path: string;
    name: string;
    /**
     * Byte size. Most engines report a number straight from `fs.stat`, but the Google Drive API
     * returns it as a string and that value is passed through untouched, so both actually occur on
     * the wire. The UI only ever compares and interpolates it, which works for either.
     */
    size: number | string;
    /** set by the cloud engines that address files by id rather than by path */
    id?: string | null;
};

/**
 * Backups of one storage, grouped by backup type.
 *
 * The key is derived from the file name at runtime (`grafana_2026_01_…` -> `grafana`), so it is
 * modelled as an open index rather than a closed union. In practice it holds the members of
 * `BackItUpWhatToSave`.
 */
export interface BackItUpStorageEngineResult {
    [backupType: string]: BackItUpStorageEngineResultFile[] | undefined;
}

/**
 * Key a storage engine files its result under.
 *
 * Usually the storage name, but the CIFS engine reports `'nas / copy'` - the value the restore tab
 * and lib/restore.ts both expect for a NAS source.
 */
export type BackItUpStorageKey = BackItUpStorage | 'nas / copy';

export type BackItUpStorageFiles = Partial<Record<BackItUpStorageKey, BackItUpStorageEngineResult>>;

/** What lib/list.ts hands back: every storage that answered, plus the last error seen */
export interface BackItUpListResult {
    error: Error | string | null | undefined;
    data: BackItUpStorageFiles;
}

/**
 * @param error message, if the listing failed
 * @param result the files found, grouped by backup type
 * @param storage which storage produced the result - the caller files it under this key
 */
export type BackItUpListCallback = (
    error?: Error | string | null,
    result?: BackItUpStorageEngineResult | null,
    storage?: BackItUpStorageKey,
) => void;


export interface BackItUpListProps<TOptions = never> extends BackItUpProps<TOptions> {
    /** list only this storage; empty or undefined means "whatever this engine holds" */
    readonly restoreSource: BackItUpStorage | '' | undefined;
    /** backup types to look for */
    readonly types: string[];
}

export interface BackItUpGetFileProps<TOptions = never> extends BackItUpProps<TOptions> {
    /** the file as the storage names it */
    readonly fileName: string;
    /** where to put it locally */
    readonly toStoreName: string;
}

/** Contract every module under lib/list/ implements */
export interface BackItUpStorageEngine {
    /**
     * Lists the backups this storage holds, grouped by backup type.
     *
     * Resolving with `undefined` means "not my `restoreSource`, nothing to file" - the caller then
     * skips this engine instead of filing an empty entry for it. An empty object, by contrast, is a
     * real answer: the storage was queried and holds nothing.
     *
     * @param props the run context, the storage config and what to look for
     */
    list(props: BackItUpListProps): Promise<BackItUpStorageEngineResult | undefined>;

    /**
     * Downloads one backup into the local backup directory.
     *
     * @param props the run context, the storage config and the file to fetch
     */
    getFile(props: BackItUpGetFileProps): Promise<void>;

    /**
     * Key the result is filed under, when it differs from the module name.
     *
     * Only lib/list/cifs sets it: it reports as 'nas / copy', which is what the restore tab and
     * lib/restore address a NAS source by.
     */
    storageKey?: BackItUpStorageKey;
}
