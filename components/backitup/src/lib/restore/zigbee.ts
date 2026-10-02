import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { copySync, emptyDirSync, ensureDirSync, removeSync } from 'fs-extra';

import { delay } from '../tools';
import { decompressAsync } from '../targz';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

interface ZigbeeRestoreOptions extends BackItUpRestoreOptions {
    /** parent directory holding the per-instance zigbee_<n> directories */
    path: string;
}

/** How long the original waited for the stopped instance before unpacking */
const STOP_DELAY_MS = 3000;

/**
 * Restores the database directory of one zigbee instance.
 *
 * As in esphome.ts the callback version reported twice when copying the unpacked data into place
 * failed - its catch reported the error and did not return. Awaiting makes the failure the outcome
 * of the step.
 *
 * @param props the run context, the zigbee slice of the config and the archive
 */
export async function restore(props: BackItUpRestoreProps<ZigbeeRestoreOptions>): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter!;

    ctx.log.debug('Start Zigbee Restore ...');

    const instance = fileName.split('.');
    const num = instance[1].split('_');

    const tmpDir = join(options.backupDir, `zigbee_${num[0]}`).replace(/\\/g, '/');
    const zigbeePth = join(options.path, `zigbee_${num[0]}`).replace(/\\/g, '/');

    ctx.log.debug(`Filename for Restore: ${fileName}`);

    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';

    try {
        ensureDirSync(tmpDir, desiredMode as unknown as number);
        ctx.log.debug(`zigbee tmp directory created: ${tmpDir}`);
    } catch {
        ctx.log.debug('zigbee tmp directory cannot created');
    }

    if (existsSync(zigbeePth)) {
        try {
            emptyDirSync(zigbeePth);
            if (!readdirSync(zigbeePth).length) {
                ctx.log.debug('old Zigbee database was successfully deleted');
            }
        } catch {
            ctx.log.debug('old Zigbee database cannot deleted');
        }
    }
    // Stop zigbee - not awaited, so the 3s delay below is what the unpacking relies on.
    let startAfterRestore = false;
    void adapter.getForeignObject(`system.adapter.zigbee.${num[0]}`, (err, obj) => {
        if (obj?.common?.enabled) {
            void adapter.setForeignState(`system.adapter.zigbee.${num[0]}.alive`, false);
            ctx.log.debug(`zigbee.${num[0]} stopped`);
            startAfterRestore = true;
        }
    });

    await delay(STOP_DELAY_MS);

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error('Zigbee Restore not completed');
        ctx.log.error(err);
        throw err;
    }

    copySync(tmpDir, zigbeePth);
    if (existsSync(zigbeePth)) {
        ctx.log.debug('Zigbee Database is successfully restored');
    }
    ctx.log.debug('Try deleting the Zigbee tmp directory');
    removeSync(tmpDir);
    if (!existsSync(tmpDir)) {
        ctx.log.debug('Zigbee tmp directory was successfully deleted');
    }
    // Start zigbee
    if (startAfterRestore) {
        void adapter.getForeignObject(`system.adapter.zigbee.${num[0]}`, (err, obj) => {
            if (obj && !obj.common?.enabled) {
                void adapter.setForeignState(`system.adapter.zigbee.${num[0]}.alive`, true);
                ctx.log.debug(`zigbee.${num[0]} started`);
            }
        });
    }

    ctx.log.debug('Zigbee Restore completed successfully');
    return 'zigbee database restore done';
}

export const isStop = false;
