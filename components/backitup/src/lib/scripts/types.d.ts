import type { BackItUpExecuteContext, BackItUpProps } from '../types';

/**
 * Every step gets the config slice lib/execute picked for it. The slice differs per step, so it
 * stays open here and each script narrows it to what it actually reads.
 *
 * The run-scoped values (`context`, `backupDir`, `timestamp`, `adapter`) are no longer grafted on
 * here - they live on the {@link BackItUpContext} that is passed alongside.
 */
export type BackItUpScriptOptions = {
    [setting: string]: unknown;
};

/**
 * A failure that also carries a process exit code.
 *
 * Only 10-iobroker needs this: it reports the forked CLI's exit code even when the fork itself
 * failed. Every other step just rejects with a plain Error.
 */
export interface BackItUpStepFailure extends Error {
    exitCode?: number;
}

/** Contract every module under lib/scripts/ exports */
export interface BackItUpScript {
    /**
     * Runs the step.
     *
     * Resolving means "carry on with the next step"; a step that produces a process exit code
     * resolves with it. Rejecting aborts the run unless the step is configured to ignore errors.
     * A step must always settle - lib/execute waits for it before advancing.
     *
     * @param props the run context plus this step's config slice
     */
    run(props: BackItUpProps): Promise<number | void>;
    /** when true a failure of this step does not fail the whole backup */
    ignoreErrors: boolean;
    /** when true the step also runs in the "after backup" pass */
    afterBackup?: boolean;
}

export type { BackItUpExecuteContext };
