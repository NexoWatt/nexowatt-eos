import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { copy, ensureDir, remove } from 'fs-extra';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpContext, BackItUpProps } from '../types';

interface NoderedOptions {
    /** directory holding the `node-red` / `node-red.<n>` data folders */
    path: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/** Instances are probed by index up to this number, inclusive. */
const MAX_INSTANCE = 100;

/**
 * Packs every `node-red` / `node-red.<n>` data directory it finds.
 *
 * Three things the callback version got wrong, all of them settled by awaiting:
 *
 * - Only index 10 ever reported back, and only when *no* `node-red.10` directory existed. With one
 *   present the step never reported and the whole backup run stopped there.
 * - A failed `compress` reported the error and then reported success again from the outer catch,
 *   so lib/execute scheduled the remaining steps twice.
 * - That outer catch stored `JSON.stringify(err)` of a rejection that carried no reason, i.e. the
 *   JavaScript value `undefined`: `context.errors.nodered` existed but was falsy, which hid the
 *   failure from every notification while still blocking 78-clean.
 *
 * The summary line now comes after the loop instead of at index 10, so instances above 10 make it
 * into the list as well.
 *
 * @param props the run context and the nodered slice of the config
 */
export async function run(props: BackItUpProps<NoderedOptions>): Promise<void> {
    const { context: ctx, options } = props;

    const noderedInst: string[] = [];

    try {
        for (let i = 0; i <= MAX_INSTANCE; i++) {
            const nrDir = i === 0 ? 'node-red' : `node-red.${i}`;
            const pth = join(options.path, nrDir).replace(/\\/g, '/');

            if (!existsSync(pth)) {
                continue;
            }

            noderedInst.push(`node-red.${i}`);

            const nameSuffix =
                options.hostType === 'Slave' && options.slaveSuffix
                    ? options.slaveSuffix
                    : options.hostType !== 'Slave' && options.nameSuffix
                      ? options.nameSuffix
                      : '';
            const fileName = join(
                ctx.backupDir,
                `nodered.${i}_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
            );
            const tmpDir = join(ctx.backupDir, `noderedtmp${i}`).replace(/\\/g, '/');

            const desiredMode = {
                mode: 0o2775,
            };

            if (!existsSync(tmpDir)) {
                ctx.log.debug('Created nodered tmp directory');
                try {
                    await ensureDir(tmpDir, desiredMode);
                } catch {
                    ctx.log.error(`Node-Red tmp directory "${tmpDir}" cannot created`);
                }
            } else {
                try {
                    await delTmp(ctx, tmpDir);
                } catch {
                    ctx.log.error(
                        `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
                    );
                }

                if (!existsSync(tmpDir)) {
                    ctx.log.debug('Created new nodered tmp directory');
                    try {
                        await ensureDir(tmpDir, desiredMode);
                    } catch {
                        ctx.log.error(`Node-Red tmp directory "${tmpDir}" cannot created`);
                    }
                }
            }

            await tmpCopy(pth, tmpDir, ctx);
            await compressBackupFile(fileName, tmpDir, ctx);

            try {
                await delTmp(ctx, tmpDir);
            } catch {
                ctx.log.error(
                    `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
                );
            }

            ctx.fileNames.push(fileName);
            ctx.types.push(`nodered.${i}`);
            ctx.done.push(`nodered.${i}`);
        }
    } catch (err) {
        // A failure still ends the step and leaves the remaining instances alone, as before. The
        // text `compressBackupFile` already stored is kept rather than overwritten.
        ctx.errors.nodered = ctx.errors.nodered || `${err}`;
        ctx.log.error(`Error on node-red Backup: ${err}`);
        throw err;
    }

    if (noderedInst.length) {
        ctx.log.debug(`found node-red database: ${noderedInst.join(',')}`);
    } else {
        ctx.log.warn('no node-red database found!!');
    }
}

/**
 * Removes a temporary directory, rejecting when it cannot be deleted.
 *
 * @param ctx run context, for the logger and the error store
 * @param tmpDir directory to remove
 */
async function delTmp(ctx: BackItUpContext, tmpDir: string): Promise<void> {
    ctx.log.debug(`Try deleting the old node-red tmp directory: "${tmpDir}"`);

    return remove(tmpDir)
        .then(() => {
            if (!existsSync(tmpDir)) {
                ctx.log.debug(`node-red tmp directory "${tmpDir}" successfully deleted`);
            }
        })
        .catch(err => {
            ctx.errors.nodered = JSON.stringify(err);
            ctx.log.error(
                `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
            );
            throw err;
        });
}

/**
 * Copies the Node-RED data aside, leaving node_modules out.
 *
 * @param pth source directory
 * @param tmpDir destination directory
 * @param ctx run context, for the logger
 */
async function tmpCopy(pth: string, tmpDir: string, ctx: BackItUpContext): Promise<void> {
    return copy(pth, tmpDir, { filter: entry => !entry.includes('node_modules') }).then(() => {
        ctx.log.debug('Node-Red tmp copy finish');
    });
}

/**
 * Packs the prepared copy.
 *
 * @param fileName archive to write
 * @param tmpDir prepared copy to pack
 * @param ctx run context, for the logger and the error store
 */
async function compressBackupFile(fileName: string, tmpDir: string, ctx: BackItUpContext): Promise<void> {
    try {
        await compressAsync({ src: tmpDir, dest: fileName });
    } catch (err) {
        ctx.errors.nodered = (err as Error).toString();
        throw err;
    }
    ctx.log.debug(`Backup created: ${fileName}`);
}

export const ignoreErrors = true;
