import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';

import { validateSdCardTarget } from '../sdCard';
import { copyFile } from '../tools';
import type { BackItUpContext, BackItUpProps } from '../types';

interface CifsCopyOptions {
    dir: string;
    mount?: string;
    mountType?: 'CIFS' | 'NFS' | 'Copy' | 'SDCard' | 'Expert';
    deleteOldBackup?: boolean;
    deleteBackupAfter?: number;
    influxDBMulti?: boolean;
    influxDBEvents?: unknown[];
    mySqlMulti?: boolean;
    mySqlEvents?: unknown[];
    pgSqlMulti?: boolean;
    pgSqlEvents?: unknown[];
    ccuMulti?: boolean;
    ccuEvents?: unknown[];
    sdCardMountPath?: string;
    sdCardBackupSubDir?: string;
    sdCardInfluxRetention?: number;
}

/**
 * Copies every file of this run into the selected directory, one after the other.
 *
 * A failed copy is recorded and logged. For the SD-card target the caller turns the first failure
 * into a fatal run error so the system never reports a successful external backup that only exists
 * on the SSD/eMMC.
 *
 * @param dir target directory
 * @param fileNames the files to copy; this list is consumed
 * @param ctx run context, for the logger and the error store
 */
async function copyFiles(dir: string, fileNames: string[], ctx: BackItUpContext): Promise<Error | undefined> {
    let firstError: Error | undefined;
    while (fileNames.length) {
        let fileName = fileNames.shift() as string;
        fileName = fileName.replace(/\\/g, '/');
        const onlyFileName = fileName.split('/').pop() as string;
        try {
            ctx.log.debug(`Copy ${onlyFileName}...`);
            await new Promise<void>((resolve, reject) => {
                copyFile(fileName, join(dir, onlyFileName), err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            const failure = error instanceof Error ? error : new Error(String(error));
            firstError ??= failure;
            ctx.errors.cifs = failure;
            ctx.log.error(`Kopieren von ${onlyFileName} fehlgeschlagen: ${failure.message}`);
        }
    }
    return firstError;
}

/**
 * Deletes the given files, stopping at the first one that fails.
 *
 * @param files absolute paths to delete
 * @param ctx run context, for the logger and the error store
 */
function deleteFiles(files: string[], ctx: BackItUpContext): boolean | undefined {
    try {
        for (let f = 0; f < files.length; f++) {
            ctx.log.debug(`delete ${files[f]}`);
            unlinkSync(files[f]);
        }
        return true;
    } catch (e) {
        ctx.errors.cifs = ctx.errors.cifs || (e as Error);
        ctx.log.error(e);
        return undefined;
    }
}

/**
 * Drops everything but the newest `num` backups per backup type.
 *
 * @param dir directory to clean
 * @param options script options, for the multi-instance counts
 * @param names backup types of this run
 * @param num how many to keep per type
 * @param ctx run context, for the logger and the error store
 */
function cleanFiles(
    dir: string,
    options: CifsCopyOptions,
    names: string[],
    num: number,
    ctx: BackItUpContext,
): void {
    if (!num) {
        return;
    }

    try {
        if (dir[dir.length - 1] !== '/') {
            dir += '/';
        }

        const result = readdirSync(dir);

        if (result && result.length) {
            const files: string[] = [];
            names.forEach(name => {
                const subResult = result.filter(a => a.startsWith(name));
                let numDel = num;

                // Multi-instance setups produce one file per configured target per run.
                if (name === 'influxDB' && options.influxDBMulti) {
                    numDel = num * (options.influxDBEvents as unknown[]).length;
                }
                if (name === 'mysql' && options.mySqlMulti) {
                    numDel = num * (options.mySqlEvents as unknown[]).length;
                }
                if (name === 'pgsql' && options.pgSqlMulti) {
                    numDel = num * (options.pgSqlEvents as unknown[]).length;
                }
                if (name === 'homematic' && options.ccuMulti) {
                    numDel = num * (options.ccuEvents as unknown[]).length;
                }

                if (subResult.length > numDel) {
                    // delete oldest files
                    subResult.sort((a, b) => {
                        const at = statSync(dir + a).ctime;
                        const bt = statSync(dir + b).ctime;
                        if (at > bt) {
                            return -1;
                        }
                        if (at < bt) {
                            return 1;
                        }
                        return 0;
                    });

                    for (let i = numDel; i < subResult.length; i++) {
                        files.push(join(dir, subResult[i]));
                    }
                }
            });
            deleteFiles(files, ctx);
        }
    } catch (e) {
        ctx.errors.cifs = ctx.errors.cifs || (e as Error);
    }
}

interface InfluxBackupName {
    name: string;
    series: string;
    timestamp: string;
}

/**
 * Returns the old InfluxDB archive names that must be removed for rolling retention.
 *
 * One series is kept per suffix. A normal single-InfluxDB installation therefore has exactly one
 * series and keeps exactly the newest three archives. Multi-InfluxDB setups retain three archives
 * for each configured suffix instead of accidentally deleting the last usable backup of a target.
 *
 * @param fileNames plain file names from the SD-card target
 * @param limit generations to keep per series
 */
export function selectInfluxBackupsToDelete(fileNames: string[], limit = 3): string[] {
    const keep = Math.max(1, Math.trunc(Number(limit) || 3));
    const parsed: InfluxBackupName[] = [];
    const pattern = /^influxDB_(\d{4}_\d{2}_\d{2}-\d{2}_\d{2}_\d{2})(?:_(.*?))?_backupiobroker\.tar\.gz$/i;

    for (const name of fileNames) {
        const match = pattern.exec(basename(name));
        if (!match) {
            continue;
        }
        parsed.push({
            name: basename(name),
            timestamp: match[1],
            series: match[2] || '__default__',
        });
    }

    const series = new Map<string, InfluxBackupName[]>();
    for (const file of parsed) {
        const current = series.get(file.series) || [];
        current.push(file);
        series.set(file.series, current);
    }

    const remove: string[] = [];
    for (const files of series.values()) {
        files.sort((a, b) => {
            const byTime = b.timestamp.localeCompare(a.timestamp);
            return byTime || b.name.localeCompare(a.name);
        });
        remove.push(...files.slice(keep).map(file => file.name));
    }
    return remove.sort();
}

/**
 * Keeps only the configured number of InfluxDB generations on the SD card.
 */
function pruneSdCardInfluxBackups(dir: string, limit: number, ctx: BackItUpContext): void {
    const fileNames = readdirSync(dir);
    const toDelete = selectInfluxBackupsToDelete(fileNames, limit);

    for (const fileName of toDelete) {
        const absolute = join(dir, fileName);
        ctx.log.debug(`SD-Karten-Rotation: älteste InfluxDB-Sicherung wird gelöscht: ${fileName}`);
        unlinkSync(absolute);
    }

    const remaining = fileNames.filter(name => /^influxDB_/i.test(name)).length - toDelete.length;
    ctx.log.debug(`SD-Karten-Rotation abgeschlossen: ${remaining} InfluxDB-Sicherungsdatei(en) vorhanden.`);
}

/**
 * Copies this run's archives into the mounted NAS/SD-card directory and prunes the old ones.
 *
 * @param props the run context and the cifs slice of the config
 */
export async function run(props: BackItUpProps<CifsCopyOptions>): Promise<void> {
    const { context: ctx, options } = props;

    if (!ctx.fileNames || !ctx.fileNames.length) {
        return;
    }

    let dir = String(options.dir || '').replace(/\\/g, '/');

    if (options.mountType === 'SDCard') {
        const target = await validateSdCardTarget(
            options.sdCardMountPath || options.mount || '',
            options.sdCardBackupSubDir,
            { createDirectory: true, writeTest: true },
        );
        dir = target.backupDir;
        options.dir = target.backupDir;
        options.mount = target.mountPoint;
    }

    if (!dir) {
        return;
    }

    const fileNames: string[] = JSON.parse(JSON.stringify(ctx.fileNames));
    const copiedInfluxDb = fileNames.some(fileName => /^influxDB_/i.test(basename(fileName)));

    if (dir[0] !== '/' && !dir.match(/\w:/)) {
        dir = `/${dir || ''}`;
    }
    ctx.log.debug(`used copy path: ${dir}`);

    if (!existsSync(dir)) {
        if (options.mountType === 'Copy' || options.mountType === 'SDCard') {
            throw new Error(
                options.mountType === 'SDCard'
                    ? `SD-Karten-Ziel „${dir}“ ist nicht verfügbar. Die Sicherung wird abgebrochen; es gibt kein Fallback auf den Systemdatenträger.`
                    : `Path "${dir}" not found`,
            );
        }
        return;
    }

    if (dir === ctx.backupDir) {
        throw new Error(`The storage path "${dir}" for copying is not configured correctly`);
    }

    const copyError = await copyFiles(dir, fileNames, ctx);
    if (copyError && options.mountType === 'SDCard') {
        throw copyError;
    }

    if (!copyError && options.mountType === 'SDCard' && copiedInfluxDb) {
        try {
            pruneSdCardInfluxBackups(dir, Number(options.sdCardInfluxRetention) || 3, ctx);
        } catch (error) {
            const failure = error instanceof Error ? error : new Error(String(error));
            ctx.errors.cifs = failure;
            throw new Error(`InfluxDB-Rotation auf der SD-Karte fehlgeschlagen: ${failure.message}`);
        }
    }

    if (options.deleteOldBackup === true) {
        cleanFiles(dir, options, ctx.types, options.deleteBackupAfter as number, ctx);
    }

    if (!ctx.errors.cifs) {
        ctx.done.push('cifs');
    }
}

export const ignoreErrors = true;
