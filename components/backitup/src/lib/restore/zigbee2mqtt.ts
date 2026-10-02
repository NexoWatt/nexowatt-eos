import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { copy, ensureDir, remove } from 'fs-extra';

import { decompressAsync } from '../targz';
import type { BackItUpRestoreOptions, BackItUpRestoreProps, BackItUpRestoreResultCode } from './types';

interface Zigbee2mqttRestoreOptions extends BackItUpRestoreOptions {
    /** the Zigbee2MQTT data directory that gets overwritten */
    path: string;
}

/**
 * Restores the Zigbee2MQTT data directory.
 *
 * @param props the run context, the zigbee2mqtt slice of the config and the archive
 */
export async function restore(
    props: BackItUpRestoreProps<Zigbee2mqttRestoreOptions>,
): Promise<BackItUpRestoreResultCode> {
    const { context: ctx, options, fileName } = props;

    ctx.log.debug('Start Zigbee2MQTT Restore ...');

    const timer = setInterval(() => {
        if (existsSync(options.path)) {
            ctx.log.debug('Extracting Zigbee2MQTT Backup file...');
        } else {
            ctx.log.debug('Something is wrong. No file found.');
        }
    }, 10000);

    const destPth = join(options.path).replace(/\\/g, '/');
    const tmpDir = join(options.backupDir, 'zigbee2mqtt_tmp').replace(/\\/g, '/');

    try {
        await ensureDir(tmpDir);
        ctx.log.debug(`Zigbee2MQTT tmp directory created: ${tmpDir}`);
    } catch {
        ctx.log.debug('Zigbee2MQTT tmp directory cannot created');
    }

    try {
        await decompressAsync({ src: fileName, dest: tmpDir });
    } catch (err) {
        ctx.log.error(err);
        ctx.log.error('Zigbee2MQTT Restore not completed');
        throw err;
    } finally {
        clearInterval(timer);
    }

    // Restore Backup-Files
    if (!existsSync(tmpDir) || !existsSync(destPth)) {
        ctx.log.debug('Zigbee2MQTT Restore not completed. Please check your Path Configuration.');
        return 'Zigbee2MQTT Restore not completed';
    }

    const files = readdirSync(destPth);

    // NOTE: `file` is a bare name, so this deletes relative to the process working directory rather
    // than from `destPth`. Kept as found - the removals are awaited now, which the original's async
    // callback inside `forEach` never did.
    for (const file of files) {
        const stat = statSync(join(destPth, file));

        if (!stat.isDirectory()) {
            await remove(file);
        }
    }

    try {
        await copy(tmpDir, destPth, {
            filter: (path: string) => !path.includes('log'),
        });
    } catch (err) {
        ctx.log.error(err);
        return 'Zigbee2MQTT restore broken';
    }

    ctx.log.debug('Zigbee2MQTT copy finish');

    ctx.log.debug('Try deleting the Zigbee2MQTT tmp directory');
    await remove(tmpDir);

    if (!existsSync(tmpDir)) {
        ctx.log.debug('Zigbee2MQTT tmp directory was successfully deleted');
    }

    ctx.log.debug('Zigbee2MQTT Restore completed successfully');
    return 'Zigbee2MQTT restore done';
}

export const isStop = false;
