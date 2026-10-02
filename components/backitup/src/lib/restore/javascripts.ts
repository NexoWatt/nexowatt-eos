import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDirSync, removeSync } from 'fs-extra';

import { delay } from '../tools';
import { decompressAsync } from '../targz';
import type { BackItUpContext } from '../types';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

/** How long the original waited before unpacking, and again before reporting */
const WAIT_MS = 2000;

/**
 * Restores the javascript adapter's scripts.
 *
 * The callback version reported twice on success - once with the "done" marker and once bare - so
 * lib/restore ran its handler two times. It reports once now.
 *
 * @param props the run context, the javascripts slice of the config and the archive
 */
export async function restore(
    props: BackItUpRestoreProps<BackItUpRestoreOptions>,
): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter!;

    ctx.log.debug('Start Javascript Restore ...');

    // stop Javascript-Adapter before Restore
    let startAfterRestore = false;
    const enabledInstances: string[] = [];

    // Not awaited, so the instances may still be stopping when the unpacking starts. Kept as found.
    void adapter.getObjectView(
        'system',
        'instance',
        { startkey: 'system.adapter.javascript.', endkey: 'system.adapter.javascript.香' },
        (err, instances) => {
            const resultInstances: { id: string; config: unknown }[] = [];
            if (!err && instances && instances.rows) {
                instances.rows.forEach(row => {
                    resultInstances.push({
                        id: row.id.replace('system.adapter.', ''),
                        config: row.value.native.type,
                    });
                });
                for (let i = 0; i < resultInstances.length; i++) {
                    const _id = resultInstances[i].id;
                    // Stop Javascript Instances
                    void adapter.getForeignObject(`system.adapter.${_id}`, (err, obj) => {
                        if (obj?.common?.enabled) {
                            void adapter.setForeignState(`system.adapter.${_id}.alive`, false);
                            ctx.log.debug(`${_id} is stopped`);
                            enabledInstances.push(_id);
                            // Spelled out; the original interpolated the array, which is the same
                            // comma-joined string.
                            ctx.log.debug(`enabled Instances: ${enabledInstances.join(',')}`);
                            startAfterRestore = true;
                        }
                    });
                }
            } else {
                ctx.log.debug('Could not retrieve javascript instances!');
            }
        },
    );
    const tmpDir = join(options.backupDir, 'tmpScripts').replace(/\\/g, '/');
    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';
    if (!existsSync(tmpDir)) {
        try {
            ensureDirSync(tmpDir, desiredMode as unknown as number);
            ctx.log.debug(`Created javascript_tmp directory: "${tmpDir}"`);
        } catch (err) {
            ctx.log.debug(`Javascript tmp directory "${tmpDir}" cannot created ... ${err}`);
        }
    } else {
        try {
            ctx.log.debug(`Try deleting the old javascript_tmp directory: "${tmpDir}"`);
            removeSync(tmpDir);
        } catch (err) {
            ctx.log.debug(`Javascript tmp directory "${tmpDir}" cannot deleted ... ${err}`);
        }
        if (!existsSync(tmpDir)) {
            try {
                ctx.log.debug(`old javascript_tmp directory "${tmpDir}" successfully deleted`);
                ensureDirSync(tmpDir, desiredMode as unknown as number);
                ctx.log.debug('Created javascript_tmp directory');
            } catch (err) {
                ctx.log.debug(`Javascript tmp directory "${tmpDir}" cannot created ... ${err}`);
            }
        }
    }

    ctx.log.debug('decompress started ...');

    await delay(WAIT_MS);

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error(err);
        ctx.log.error('Javascript Restore not completed');
        throw err;
    }

    await restoreJavascriptObjects(ctx, tmpDir);

    try {
        ctx.log.debug(`Try deleting the Javascript tmp directory: "${tmpDir}"`);
        removeSync(tmpDir);
        if (!existsSync(tmpDir)) {
            ctx.log.debug(`Javascript tmp directory "${tmpDir}" successfully deleted`);
        }
    } catch (err) {
        ctx.log.debug(`Javascript tmp directory "${tmpDir}" cannot deleted ... ${err}`);
    }

    // Start javascript Instances
    if (startAfterRestore) {
        enabledInstances.forEach(enabledInstance => {
            void adapter.getForeignObject(`system.adapter.${enabledInstance}`, (err, obj) => {
                if (obj && !obj.common?.enabled) {
                    void adapter.setForeignState(`system.adapter.${enabledInstance}.alive`, true);
                    ctx.log.debug(`${enabledInstance} started`);
                }
            });
        });
    }

    await delay(WAIT_MS);

    ctx.log.debug('Javascript Restore completed successfully');
    return 'javascript restore done';
}

/**
 * Writes the script objects from the unpacked script.json back into the object database.
 *
 * Always resolves - every failure is only logged.
 *
 * @param ctx run context, for the adapter and the logger
 * @param tmpDir directory the backup was unpacked into
 */
async function restoreJavascriptObjects(ctx: BackItUpContext, tmpDir: string): Promise<void> {
    const adapter = ctx.adapter!;

    try {
        const object = await readFile(join(tmpDir, 'script.json'));

        if (object) {
            const jsObjects: ioBroker.ScriptObject[] = JSON.parse(object.toString());

            // for-in, not for-of: it also visits whatever a non-array script.json deserialises to.
            // Kept as found.
            // eslint-disable-next-line @typescript-eslint/no-for-in-array
            for (const i in jsObjects) {
                let _object;
                try {
                    _object = await adapter.getForeignObjectAsync(jsObjects[i]._id);
                } catch (err) {
                    ctx.log.debug(err);
                }
                if (_object) {
                    try {
                        await adapter.setForeignObjectAsync(jsObjects[i]._id, jsObjects[i]);
                        const scriptCheck = await adapter.getForeignObjectAsync(jsObjects[i]._id);

                        if (scriptCheck) {
                            ctx.log.debug(`Restore Script: ${jsObjects[i]._id.split('.').pop()}`);
                        }
                    } catch (err) {
                        ctx.log.debug(`Error on set Object: ${err}`);
                    }
                } else {
                    try {
                        await adapter.setForeignObjectNotExistsAsync(jsObjects[i]._id, jsObjects[i]);
                        const scriptCheck = await adapter.getForeignObjectAsync(jsObjects[i]._id);

                        if (scriptCheck) {
                            ctx.log.debug(`Added Script: ${jsObjects[i]._id.split('.').pop()}`);
                        }
                    } catch (err) {
                        ctx.log.debug(`Error on create Object: ${err}`);
                    }
                }
            }
        }
    } catch (err) {
        ctx.log.debug(`Error on Javascript-Restore: ${err}`);
    }
}

export const isStop = false;
