import { exec } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { copySync, emptyDirSync, ensureDirSync, removeSync } from 'fs-extra';

import { delay } from '../tools';
import { decompressAsync } from '../targz';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

interface NoderedRestoreOptions extends BackItUpRestoreOptions {
    /** parent directory holding the node-red / node-red.<n> directories */
    path: string;
}

/** How long the original waited for the stopped instance before unpacking */
const STOP_DELAY_MS = 3000;

/**
 * Restores the data directory of one Node-RED instance and reinstalls its dependencies.
 *
 * The callback version never reported when the target directory did not exist after unpacking -
 * the `npm install` block, and with it the only remaining report, sat inside that check. The
 * restore then waited forever; it ends the step now.
 *
 * @param props the run context, the nodered slice of the config and the archive
 */
export async function restore(props: BackItUpRestoreProps<NoderedRestoreOptions>): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter!;

    ctx.log.debug('Start Node-Red Restore ...');

    const onlyFileName = fileName.split('/').pop()!;
    const instance = onlyFileName.split('.');
    const num = instance[1].split('_');
    const nrDir = num[0] === '0' ? 'node-red' : `node-red.${num[0]}`;

    const tmpDir = join(options.backupDir, `node-red.${num[0]}`).replace(/\\/g, '/');
    const noderedPth = join(options.path, nrDir).replace(/\\/g, '/');

    ctx.log.debug(`Filename for Restore: ${fileName}`);

    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';

    try {
        ensureDirSync(tmpDir, desiredMode as unknown as number);
        ctx.log.debug(`node-red tmp directory created: ${tmpDir}`);
    } catch {
        ctx.log.debug('node-red tmp directory cannot created');
    }

    if (existsSync(noderedPth)) {
        try {
            emptyDirSync(noderedPth);
            if (!readdirSync(noderedPth).length) {
                ctx.log.debug('old Node-Red database was successfully deleted');
            }
        } catch {
            ctx.log.debug('old Node-Red database cannot deleted');
        }
    }
    // Stop node-red - not awaited, so the 3s delay below is what the unpacking relies on.
    let startAfterRestore = false;
    void adapter.getForeignObject(`system.adapter.node-red.${num[0]}`, (err, obj) => {
        if (obj?.common?.enabled) {
            void adapter.setForeignState(`system.adapter.node-red.${num[0]}.alive`, false);
            ctx.log.debug(`node-red.${num[0]} stopped`);
            startAfterRestore = true;
        }
    });

    await delay(STOP_DELAY_MS);

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error('Node-Red Restore not completed');
        ctx.log.error(err);
        throw err;
    }

    copySync(tmpDir, noderedPth);
    if (existsSync(noderedPth)) {
        ctx.log.debug('Node-Red Database is successfully restored');
    }
    ctx.log.debug('Try deleting the Node-Red tmp directory');
    removeSync(tmpDir);
    if (!existsSync(tmpDir)) {
        ctx.log.debug('Node-Red tmp directory was successfully deleted');
    }

    if (!existsSync(noderedPth)) {
        ctx.log.error(`Node-Red Restore not completed: "${noderedPth}" does not exist`);
        return 'node-red restore is incomplete';
    }

    ctx.log.debug(`Try "npm install" for ${noderedPth}`);

    const install = await new Promise<{ error: Error | null; stdout: string }>(resolve => {
        exec(`npm --prefix ${noderedPth} install ${noderedPth}`, (error, stdout) => resolve({ error, stdout }));
    });

    if (install.error) {
        ctx.log.debug(`To complete the restore, please run an "npm install" manually in the path "${noderedPth}".`);
        throw install.error;
    }

    if (install.stdout) {
        ctx.log.debug(`npm install \n${install.stdout}`);
    }
    // Start node-red
    if (startAfterRestore) {
        void adapter.getForeignObject(`system.adapter.node-red.${num[0]}`, (err, obj) => {
            if (obj && !obj.common?.enabled) {
                void adapter.setForeignState(`system.adapter.node-red.${num[0]}.alive`, true);
                ctx.log.debug(`node-red.${num[0]} started`);
            }
        });
    }
    ctx.log.debug('Node-Red Restore completed successfully');
    return 'node-red restore done';
}

export const isStop = false;
