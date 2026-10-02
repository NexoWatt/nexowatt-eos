import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { copySync, emptyDirSync, ensureDirSync, removeSync } from 'fs-extra';

import { delay } from '../tools';
import { decompressAsync } from '../targz';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

interface YahkaRestoreOptions extends BackItUpRestoreOptions {
    /** parent directory holding the per-instance yahka.<n>.hapdata directories */
    path: string;
}

/** How long the original waited for the stopped instance before unpacking */
const STOP_DELAY_MS = 3000;

/**
 * Restores the hapdata directory of one yahka instance.
 *
 * As in esphome.ts the callback version reported twice when copying the unpacked data into place
 * failed - its catch reported the error and did not return. Awaiting makes the failure the outcome
 * of the step.
 *
 * @param props the run context, the yahka slice of the config and the archive
 */
export async function restore(props: BackItUpRestoreProps<YahkaRestoreOptions>): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter!;

    ctx.log.debug('Start Yahka Restore ...');

    const instance = fileName.split('.');
    const num = instance[1].split('_');

    const tmpDir = join(options.backupDir, `yahka_${num[0]}.hapdata`).replace(/\\/g, '/');
    ctx.log.debug(`Filename for Restore: ${fileName}`);

    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';

    try {
        ensureDirSync(tmpDir, desiredMode as unknown as number);
        ctx.log.debug(`yahka tmp directory created: ${tmpDir}`);
    } catch {
        ctx.log.debug('yahka tmp directory cannot created');
    }

    if (existsSync(`${options.path}/yahka.${num[0]}.hapdata`)) {
        try {
            removeSync(`${options.path}/yahka.${num[0]}.hapdata`);
            if (!existsSync(`${options.path}/yahka.${num[0]}.hapdata`)) {
                ctx.log.debug('old Yahka database directory was successfully deleted');
            }
        } catch {
            ctx.log.debug('old Yahka database directory cannot deleted');
        }
    }
    // Stop yahka - not awaited, so the 3s delay below is what the unpacking relies on.
    let startAfterRestore = false;
    void adapter.getForeignObject(`system.adapter.yahka.${num[0]}`, (err, obj) => {
        if (obj?.common?.enabled) {
            void adapter.setForeignState(`system.adapter.yahka.${num[0]}.alive`, false);
            ctx.log.debug(`yahka.${num[0]} stopped`);
            startAfterRestore = true;
        }
    });

    await delay(STOP_DELAY_MS);

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error('Yahka Restore not completed');
        ctx.log.error(err);
        throw err;
    }

    const yahkaPth = join(options.path, `yahka.${num[0]}.hapdata`).replace(/\\/g, '/');

    try {
        if (existsSync(yahkaPth)) {
            emptyDirSync(yahkaPth);
            if (!readdirSync(yahkaPth).length) {
                ctx.log.debug('Old Yahka Database is successfully deleted');
            }
        }
    } catch {
        ctx.log.debug('old Yahka database cannot deleted');
    }

    copySync(tmpDir, yahkaPth);
    if (existsSync(yahkaPth)) {
        ctx.log.debug('Yahka Database is successfully restored');
    }
    ctx.log.debug('Try deleting the Yahka tmp directory');
    removeSync(tmpDir);
    if (!existsSync(tmpDir)) {
        ctx.log.debug('Yahka tmp directory was successfully deleted');
    }
    // Start yahka
    if (startAfterRestore) {
        void adapter.getForeignObject(`system.adapter.yahka.${num[0]}`, (err, obj) => {
            if (obj && !obj.common?.enabled) {
                void adapter.setForeignState(`system.adapter.yahka.${num[0]}.alive`, true);
                ctx.log.debug(`yahka.${num[0]} started`);
            }
        });
    }

    ctx.log.debug('Yahka Restore completed successfully');
    return 'yahka database restore done';
}

export const isStop = false;
