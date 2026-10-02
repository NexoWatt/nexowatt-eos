import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { copy, ensureDir, remove } from 'fs-extra';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpContext, BackItUpProps } from '../types';

interface JarvisOptions {
    /** directory containing the `jarvis` folder */
    path: string;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

interface JarvisState {
    id: string;
    value: ioBroker.StateValue;
}

/**
 * Packs every jarvis instance found below `<path>/jarvis`.
 *
 * Two things the callback version got wrong, both settled by awaiting:
 *
 * - An existing but empty `jarvis` directory reported nothing at all - `forEach` over an empty
 *   array runs nothing, and the empty array is truthy, so the "not installed" branch was not taken
 *   either. The backup run then waited forever.
 * - The instances were packed all at once, and the success report was tied to a counter reaching
 *   `files.length`. They are packed one after the other now, and the step reports once.
 *
 * @param props the run context and the jarvis slice of the config
 */
export async function run(props: BackItUpProps<JarvisOptions>): Promise<void> {
    const { context: ctx, options } = props;

    const jarvisDir = join(options.path, 'jarvis');

    if (!existsSync(jarvisDir)) {
        ctx.log.warn(`Jarvis Backup cannot created. Please install a Jarvis version >= 2.2.0`);
        return;
    }

    let files: string[];
    try {
        files = await readdir(jarvisDir);
    } catch (e) {
        ctx.log.warn(`Jarvis Backup cannot created: ${e}`);
        return;
    }

    if (!files.length) {
        ctx.log.warn(`Jarvis Backup cannot created. Please install a Jarvis version >= 2.2.0`);
        return;
    }

    // The first failure is reported once every instance has been dealt with.
    let firstError: Error | undefined;

    for (const file of files) {
        const tmpDir = join(ctx.backupDir, `tmpJavis${file}`).replace(/\\/g, '/');

        if (!existsSync(tmpDir)) {
            try {
                await ensureDir(tmpDir);
                ctx.log.debug(`Created jarvis_tmp directory: "${tmpDir}"`);
            } catch (err) {
                ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot created ... ${err}`);
            }
        } else {
            try {
                ctx.log.debug(`Try deleting the old jarvis_tmp directory: "${tmpDir}"`);
                await remove(tmpDir);
            } catch (err) {
                ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
            }
            if (!existsSync(tmpDir)) {
                try {
                    ctx.log.debug(`old jarvis_tmp directory "${tmpDir}" successfully deleted`);
                    await ensureDir(tmpDir);
                    ctx.log.debug('Created jarvis_tmp directory');
                } catch (err) {
                    ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot created ... ${err}`);
                }
            }
        }
        ctx.log.debug(`found Jarvis Instance: ${file}`);
        ctx.log.debug(`start Jarvis Backup for Instance ${file}...`);

        let nameSuffix;
        if (options.hostType === 'Slave') {
            nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
        } else {
            nameSuffix = options.nameSuffix ? options.nameSuffix : '';
        }

        const fileName = join(
            ctx.backupDir,
            `jarvis.${file}_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
        );
        const instanceDir = join(jarvisDir, file);

        try {
            await copy(instanceDir, tmpDir);
            ctx.log.debug(`${instanceDir} copy success!`);
        } catch (err) {
            ctx.log.error(`${instanceDir} copy error: ${err}`);
        }

        await saveState(ctx, file, tmpDir);

        ctx.fileNames.push(fileName);

        let packError: Error | undefined;
        try {
            await compressAsync({ src: tmpDir, dest: fileName });
        } catch (err) {
            packError = err as Error;
        }

        try {
            ctx.log.debug(`Try deleting the Jarvis tmp directory: "${tmpDir}"`);
            await remove(tmpDir);
            if (!existsSync(tmpDir)) {
                ctx.log.debug(`Jarvis tmp directory "${tmpDir}" successfully deleted`);
            }
        } catch (e) {
            ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot deleted ... ${e}`);
        }

        if (packError) {
            ctx.errors.jarvis = packError.toString();
            firstError ??= packError;
        } else {
            ctx.log.debug(`Backup created: ${fileName}`);
            ctx.done.push(`jarvis.${file}`);
            ctx.types.push(`jarvis.${file}`);
        }
    }

    if (firstError) {
        throw firstError;
    }
}

/**
 * Collects the jarvis settings and states into `states.json` next to the copied instance data.
 *
 * @param ctx run context, for the adapter and the logger
 * @param file instance folder name
 * @param tmpDir prepared copy of the instance
 */
async function saveState(ctx: BackItUpContext, file: string, tmpDir: string): Promise<void> {
    const stateDir = join(tmpDir, 'states').replace(/\\/g, '/');

    if (!existsSync(stateDir)) {
        try {
            await ensureDir(stateDir);
            ctx.log.debug(`Created states_tmp directory: "${stateDir}"`);
        } catch (err) {
            ctx.log.warn(`states tmp directory "${stateDir}" cannot created ... ${err}`);
        }
    }

    const _settings = await ctx.adapter!.getForeignObjectsAsync(`jarvis.${file}.settings.*`, 'state');

    const jarvisStates: JarvisState[] = [];

    if (_settings) {
        for (const i in _settings) {
            try {
                const obj = await ctx.adapter!.getForeignStateAsync(`${_settings[i]._id}`);

                if (obj) {
                    jarvisStates.push({
                        id: _settings[i]._id,
                        value: obj.val ? obj.val : null,
                    });
                } else {
                    ctx.log.warn(`settings "${_settings[i]._id}" not found`);
                }
            } catch (err) {
                ctx.log.warn(`No State found for "${_settings[i]._id}": ${err}`);
            }
        }
    } else {
        ctx.log.warn('settings not found');
    }

    const _states = ['css', 'devices', 'layout', 'notifications', 'widgets', 'scripts', 'theme'];

    // for-of over the literal array; the original used for-in, which yields the same order here.
    for (const stateName of _states) {
        try {
            const obj = await ctx.adapter!.getForeignStateAsync(`jarvis.${file}.${stateName}`);

            if (obj) {
                jarvisStates.push({
                    id: `jarvis.${file}.${stateName}`,
                    value: obj.val ? obj.val : null,
                });
            } else {
                ctx.log.warn(`settings "${stateName}" not found`);
            }
        } catch (err) {
            ctx.log.warn(`No State found for "jarvis.${file}.${stateName}": ${err}`);
        }
    }

    try {
        const _pro = await ctx.adapter!.getForeignStateAsync(`jarvis.${file}.info.pro`);

        if (_pro) {
            jarvisStates.push({
                id: `jarvis.${file}.info.pro`,
                value: _pro.val ? _pro.val : null,
            });
        } else {
            ctx.log.warn('settings "pro" not found');
        }
    } catch (err) {
        ctx.log.debug(`No State found for "jarvis.${file}.info.pro": ${err}`);
    }

    await writeFile(join(stateDir, `states.json`), JSON.stringify(jarvisStates, null, 2)).catch(err =>
        ctx.log.warn(`states.json cannot be written: ${err}`),
    );
}

export const ignoreErrors = true;
