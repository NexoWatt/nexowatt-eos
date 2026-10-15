import { fork } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

import { getDate, getSize } from '../tools';
import type { BackItUpProps } from '../types';
import type { BackItUpStepFailure } from './types';

interface IobrokerOptions {
    /** path to the iobroker CLI that performs the backup */
    workDir?: string;
    nameSuffix?: string;
}

/** Warn above this archive size, in megabytes */
const SIZE_WARNING_MB = 500;

/**
 * Builds a rejection that also reports a process exit code.
 *
 * @param cause the failure to report
 * @param exitCode the code the run should end with
 */
function failure(cause: Error | string, exitCode: number): BackItUpStepFailure {
    const error: BackItUpStepFailure = cause instanceof Error ? cause : new Error(cause);
    error.exitCode = exitCode;
    return error;
}

/**
 * Runs `iobroker backup` and resolves with the CLI's exit code.
 *
 * @param props the run context and the iobroker slice of the config
 */
export async function run(props: BackItUpProps<IobrokerOptions>): Promise<number> {
    const { context: ctx, options } = props;

    if (options.workDir == undefined) {
        ctx.errors.iobroker = 'Unable to read iobroker path';
        ctx.log.error('Unable to read iobroker path');
        // Reported as an exit code without an error, exactly as before.
        return -1;
    }

    const ioPath = options.workDir;

    return new Promise<number>((resolve, reject) => {
        try {
            const fileName = join(
                ctx.backupDir,
                `iobroker_${getDate()}${options.nameSuffix ? `_${options.nameSuffix}` : ''}_backupiobroker.tar.gz`,
            );

            // Never let a same-second retry overwrite an archive or count an old
            // file as this run's result. lstat also detects dangling symlinks.
            try {
                lstatSync(fileName);
                ctx.errors.iobroker = 'EOS_BACKUP_TARGET_EXISTS';
                resolve(1);
                return;
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }

            const cmd = fork(ioPath, ['backup', fileName], { silent: true });
            cmd.stdout!.on('data', data => ctx.log.debug(data.toString()));

            cmd.stderr!.on('data', data => ctx.log.error(data.toString()));

            cmd.on('close', code => {
                try {
                    const stat = existsSync(fileName) ? lstatSync(fileName) : null;
                    if (code !== 0 || !stat?.isFile() || stat.isSymbolicLink() || stat.size === 0) {
                        ctx.errors.iobroker = 'EOS_BACKUP_ARCHIVE_NOT_CREATED';
                        resolve(code || 1);
                        return;
                    }
                    ctx.fileNames.push(fileName);
                    ctx.done.push('iobroker');
                    ctx.types.push('iobroker');
                    if (Math.round((stat.size / (1024 * 1024)) * 10) / 10 > SIZE_WARNING_MB) {
                        ctx.log.warn(`Backup archive exceeds ${getSize(SIZE_WARNING_MB * 1024 * 1024)}.`);
                    }
                } catch {
                    ctx.errors.iobroker = 'EOS_BACKUP_ARCHIVE_NOT_CREATED';
                    resolve(1);
                    return;
                }
                // `close` and `error` can both fire; the promise settles on whichever comes first,
                // which is what the guarded callback used to achieve.
                resolve(code as number);
            });

            cmd.on('error', error => {
                ctx.errors.iobroker = error;
                console.error(`error: ${error}`);
                reject(failure(error, -1));
            });
        } catch (error) {
            ctx.errors.iobroker = error as Error;
            reject(failure(error as Error, -1));
        }
    });
}

export const ignoreErrors = false;
