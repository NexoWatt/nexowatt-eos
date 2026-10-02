import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { copySync, emptyDirSync, ensureDirSync, removeSync } from 'fs-extra';

import { delay } from '../tools';
import { decompressAsync } from '../targz';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

interface EsphomeRestoreOptions extends BackItUpRestoreOptions {
    /** parent directory holding the per-instance esphome.<n> directories */
    path: string;
}

/** How long the original waited for the stopped instance before unpacking */
const STOP_DELAY_MS = 3000;

/**
 * Restores the data directory of one esphome instance.
 *
 * The callback version reported twice when copying the unpacked data into place failed: its catch
 * reported the error and did not return, so the success report followed right behind. Awaiting
 * makes the failure the outcome of the step.
 *
 * @param props the run context, the esphome slice of the config and the archive
 */
export async function restore(props: BackItUpRestoreProps<EsphomeRestoreOptions>): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;
    const adapter = ctx.adapter!;

    ctx.log.debug('Start ESPHome Restore ...');

    // NOTE: unlike zigbee.js this splits on '.' twice, so `num[0]` keeps everything up to the next
    // dot rather than just the instance number. Kept as found.
    const instance = fileName.split('.');
    const num = instance[1].split('.');

    const tmpDir = join(options.backupDir, `esphome.${num[0]}`).replace(/\\/g, '/');
    const esphomePth = join(options.path, `esphome.${num[0]}`).replace(/\\/g, '/');

    ctx.log.debug(`Filename for Restore: ${fileName}`);

    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';

    try {
        ensureDirSync(tmpDir, desiredMode as unknown as number);
        ctx.log.debug(`esphome tmp directory created: ${tmpDir}`);
    } catch {
        ctx.log.debug('esphome tmp directory cannot created');
    }

    if (existsSync(esphomePth)) {
        try {
            emptyDirSync(esphomePth);
            if (!readdirSync(esphomePth).length) {
                ctx.log.debug('old ESPHome data was successfully deleted');
            }
        } catch {
            ctx.log.debug('old ESPHome data cannot deleted');
        }
    }
    // Stop esphome - not awaited, so the 3s delay below is what the unpacking relies on.
    let startAfterRestore = false;
    void adapter.getForeignObject(`system.adapter.esphome.${num[0]}`, (err, obj) => {
        if (obj?.common?.enabled) {
            void adapter.setForeignState(`system.adapter.esphome.${num[0]}.alive`, false);
            ctx.log.debug(`esphome.${num[0]} stopped`);
            startAfterRestore = true;
        }
    });

    await delay(STOP_DELAY_MS);

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error('ESPHome Restore not completed');
        ctx.log.error(err);
        throw err;
    }

    copySync(tmpDir, esphomePth);
    if (existsSync(esphomePth)) {
        ctx.log.debug('ESPHome data is successfully restored');
    }
    ctx.log.debug('Try deleting the esphome tmp directory');
    removeSync(tmpDir);
    if (!existsSync(tmpDir)) {
        ctx.log.debug('esphome tmp directory was successfully deleted');
    }
    // Start esphome
    if (startAfterRestore) {
        void adapter.getForeignObject(`system.adapter.esphome.${num[0]}`, (err, obj) => {
            if (obj && !obj.common?.enabled) {
                void adapter.setForeignState(`system.adapter.esphome.${num[0]}.alive`, true);
                ctx.log.debug(`esphome.${num[0]} started`);
            }
        });
    }

    ctx.log.debug('esphome Restore completed successfully');
    return 'ESPHome data restore done';
}

export const isStop = false;
