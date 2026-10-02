import { createWriteStream, existsSync, statSync, type Stats } from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import { join } from 'node:path';
import axios from 'axios';

import { getDate } from '../tools';
import type { BackItUpContext, BackItUpProps } from '../types';

interface CcuEvent {
    host: string;
    user: string;
    pass: string;
    nameSuffix: string;
    usehttps: boolean;
    signedCertificates: boolean;
}

interface CcuOptions {
    host: string;
    user: string;
    pass: string;
    usehttps?: boolean;
    signedCertificates?: boolean;
    nameSuffix?: string;
    ccuMulti?: boolean;
    ccuEvents: CcuEvent[];
}

/**
 * Downloads a backup from every configured CCU.
 *
 * @param props the run context and the ccu slice of the config
 */
export async function run(props: BackItUpProps<CcuOptions>): Promise<void> {
    const { context: ctx, options } = props;

    if (options.ccuMulti) {
        // The per-event settings are written onto `options` itself, one CCU after another.
        for (let i = 0; i < options.ccuEvents.length; i++) {
            options.usehttps = options.ccuEvents[i].usehttps;
            options.host = options.ccuEvents[i].host;
            options.user = options.ccuEvents[i].user;
            options.pass = options.ccuEvents[i].pass;
            options.nameSuffix = options.ccuEvents[i].nameSuffix;
            options.signedCertificates = options.ccuEvents[i].signedCertificates;

            ctx.log.debug(`CCU-Backup for ${options.nameSuffix} is started ...`);
            // `startBackup` takes two parameters; the callback the original passed as a third was
            // silently dropped. Removed rather than wired up.
            await startBackup(ctx, options);
            ctx.log.debug(`CCU-Backup for ${options.nameSuffix} is finish`);
        }
        // Reported as done even when a CCU failed - kept as found.
        ctx.done.push('ccu');
        ctx.types.push('homematic');
    } else {
        ctx.log.debug('CCU-Backup started ...');
        const ccuBackup = await startBackup(ctx, options);
        ctx.log.debug(ccuBackup);
        ctx.done.push('ccu');
        ctx.types.push('homematic');
    }
}

/**
 * Logs into one CCU, downloads its backup and reports the outcome as a message.
 *
 * Always resolves - failures are recorded in `context.errors.ccu` and returned as text.
 *
 * @param ctx run context
 * @param options script options, already pointed at the CCU to back up
 */
async function startBackup(ctx: BackItUpContext, options: CcuOptions): Promise<string> {
    return new Promise(resolve => {
        void (async (): Promise<void> => {
            const connectType = options.usehttps ? 'https' : 'http';
            const MIN_BACKUP_SIZE = 20 * 1024; // 20 KB
            let resolved = false;

            const safeResolve = (msg: string): void => {
                if (!resolved) {
                    resolved = true;
                    resolve(msg);
                }
            };

            try {
                const sessionAxios = axios.create({
                    httpsAgent: new https.Agent({
                        // Older instance configurations stored the flag as a string.
                        rejectUnauthorized:
                            options.signedCertificates === true ||
                            (options.signedCertificates as unknown) === 'true',
                    }),
                });

                // Login
                const loginResponse = await sessionAxios.post(
                    `${connectType}://${options.host}/api/homematic.cgi`,
                    {
                        method: 'Session.login',
                        params: {
                            username: options.user,
                            password: options.pass,
                        },
                    },
                );

                const sid = loginResponse.data.result;
                if (!sid) {
                    const message = 'CCU: No session ID';
                    ctx.errors.ccu = message;
                    safeResolve(message);
                    return;
                }

                // Version
                const versionResponse = await sessionAxios.get(
                    `${connectType}://${options.host}/api/backup/version.cgi`,
                );

                const version = (versionResponse.data || '').split('\n')[0].split('=')[1] || 'Unknown';

                const fileName = join(
                    ctx.backupDir,
                    `homematic_${getDate()}${options.nameSuffix ? `_${options.nameSuffix}` : ''}_${version}_backupiobroker.tar.sbk`,
                );

                ctx.fileNames.push(fileName);

                ctx.log.debug('Requesting backup from CCU');

                const protocolType = connectType === 'https' ? https : http;
                const writeStream = createWriteStream(fileName);
                let backupError: string | null = null;

                const request = protocolType.get(
                    `${connectType}://${options.host}/config/cp_security.cgi?sid=@${sid}@&action=create_backup`,
                    // Note: unlike the axios instance above this passes the flag straight through,
                    // so a string value would be truthy here. Kept as found.
                    { rejectUnauthorized: options.signedCertificates } as https.RequestOptions,
                    res => {
                        if (res.statusCode !== 200) {
                            backupError = `CCU: HTTP ${res.statusCode}`;
                            res.resume();
                            writeStream.destroy();
                            return;
                        }

                        res.on('aborted', () => {
                            backupError = 'CCU: Download aborted';
                            writeStream.destroy();
                        });

                        res.pipe(writeStream);
                    },
                );

                request.setTimeout(300000, () => {
                    backupError = 'CCU: Backup request timeout';
                    request.destroy();
                    writeStream.destroy();
                });

                request.on('error', err => {
                    backupError = `CCU: Request error: ${err.message}`;
                    writeStream.destroy();
                });

                writeStream.on('error', err => {
                    backupError = `CCU: Write error: ${err.message}`;
                    safeResolve(backupError);
                });

                writeStream.on('close', async () => {
                    try {
                        await sessionAxios.post(`${connectType}://${options.host}/api/homematic.cgi`, {
                            method: 'Session.logout',
                            params: { _session_id_: sid },
                        });
                    } catch {
                        // ignore logout errors
                    }

                    let stats: Stats | false | undefined;
                    try {
                        stats = existsSync(fileName) && statSync(fileName);
                    } catch {
                        /* empty */
                    }

                    if (!backupError) {
                        if (!stats || stats.size < MIN_BACKUP_SIZE) {
                            backupError = `CCU: Backup invalid (${stats ? stats.size : 0} bytes)`;
                        }
                    }

                    if (backupError) {
                        ctx.errors.ccu = backupError;
                        safeResolve(backupError);
                        return;
                    }

                    safeResolve(`CCU backup successful (${((stats as Stats).size / 1024 / 1024).toFixed(2)} MB)`);
                });
            } catch (err) {
                const message = (err as Error).message || String(err);
                ctx.errors.ccu = message;
                safeResolve(message);
            }
        })();
    });
}

export const ignoreErrors = true;
