import type { BackItUpProps } from '../types';

/**
 * The config slice lib/restore hands to a step, plus the fields it fills in itself before the
 * call. The slice differs per step, so it stays open here and each module narrows it.
 */
export interface BackItUpRestoreOptions {
    /** ioBroker backup directory; filled in by lib/restore when absent */
    backupDir: string;
    /** the step's own name, e.g. "mysql"; filled in by lib/restore when absent */
    backupType: string;
    /** used for the log prefix; filled in by lib/restore when absent */
    name: string;
    /** only set for the detached restore - the archive to restore from */
    fileName?: string;
    /** only set for the detached restore */
    theme?: string;
    /** only set for the detached restore */
    currentProtocol?: string;
    /** only set for the detached restore */
    bashDir?: string;
    [setting: string]: unknown;
}

/**
 * What a finished restore step reports: either a process exit code or one of the
 * "<x> restore done" strings that lib/restore checks against to decide whether the run succeeded.
 */
export type BackItUpRestoreResultCode = number | string | null | undefined;

export interface BackItUpRestoreProps<TOptions = never> extends BackItUpProps<TOptions> {
    /** the archive to restore from, already fetched into the local backup directory */
    readonly fileName: string;
}

/**
 * A failure that also carries the exit code to report.
 *
 * Only restore/iobroker needs this: it reports -1 when the forked CLI could not be started at all.
 * Every other step just rejects with a plain Error.
 */
export interface BackItUpRestoreFailure extends Error {
    exitCode?: BackItUpRestoreResultCode;
}

/**
 * Contract every module under lib/restore/ exports.
 *
 * One signature for all of them now: the steps that stop ioBroker first used to take a shorter
 * argument list because the detached process has no adapter, but the adapter lives on the context
 * and is simply null there.
 */
export interface BackItUpRestoreModule {
    /**
     * Restores one backup and resolves with the exit code to report.
     *
     * Rejecting means the restore failed; the caller turns that into the reported error. A step
     * must always settle - lib/restore waits for it.
     *
     * @param props the run context, this step's config slice and the archive
     */
    restore(props: BackItUpRestoreProps): Promise<BackItUpRestoreResultCode>;
    /** when true ioBroker is stopped first and the step is re-run by the detached lib/restore copy */
    isStop: boolean;
}

/**
 * Logger the detached run and the adapter run both provide.
 *
 * `exit` is the caller's business; the steps themselves see the {@link BackItUpLogger} on the
 * context.
 */
export interface BackItUpRestoreLogger {
    debug: (text: unknown) => void;
    error: (text: unknown) => void;
    exit: (exitCode?: BackItUpRestoreResultCode) => void;
}

