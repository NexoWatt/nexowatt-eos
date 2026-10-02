import { fork, type ChildProcess } from 'node:child_process';
import { tools } from '@iobroker/js-controller-common';

import type { BackItUpRestoreFailure, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

/**
 * Marks a failure with the exit code the step wants reported.
 *
 * @param error what went wrong
 */
function failure(error: unknown): BackItUpRestoreFailure {
    const err: BackItUpRestoreFailure = error instanceof Error ? error : new Error(String(error));
    err.exitCode = -1;
    return err;
}

/**
 * Hands the archive to `iobroker restore`.
 *
 * Runs in the detached process, so `context.adapter` is null here.
 *
 * @param props the run context and the archive; this step reads no config of its own
 */
export async function restore(props: BackItUpRestoreProps): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, fileName } = props;
    const ioPath = `${tools.getControllerDir()}/iobroker.js`;

    let cmd: ChildProcess;
    try {
        ctx.log.debug(`Start ioBroker Restore from "${fileName}"...`);
        ctx.log.debug(ioPath);
        cmd = fork(ioPath, ['restore', fileName, '--force'], { silent: true });
    } catch (error) {
        ctx.log.error('ioBroker Restore not completed');
        ctx.log.error(error);
        throw failure(error);
    }

    return new Promise<BackItUpRestoreResultCode>((resolve, reject) => {
        cmd.stdout!.on('data', data => ctx.log.debug(data.toString()));

        cmd.stderr!.on('data', data => ctx.log.error(data.toString()));

        cmd.on('close', code => {
            // Logged as a success regardless of the exit code; the code itself is passed on.
            ctx.log.debug('ioBroker Restore completed successfully');
            resolve(code);
        });

        cmd.on('error', error => {
            ctx.log.error(error);
            reject(failure(error));
        });
    });
}

export const isStop = true;
