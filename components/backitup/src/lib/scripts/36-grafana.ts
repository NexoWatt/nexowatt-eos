import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDir, remove } from 'fs-extra';
import { Agent } from 'node:https';
import axios from 'axios';

import { delay, getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpContext, BackItUpProps } from '../types';

interface GrafanaOptions {
    protocol: 'http' | 'https';
    host: string;
    port: string | number;
    apiKey: string;
    signedCertificates: boolean;
    hostType?: 'Single' | 'Master' | 'Slave';
    slaveSuffix?: string;
    nameSuffix?: string;
}

/** How long the original waited between collecting the data and packing it */
const COMPRESS_DELAY_MS = 5000;

let timerLog: NodeJS.Timeout | undefined;

/**
 * Text stored in `context.errors.grafana`.
 *
 * This used to be `JSON.stringify(err)`. For an axios rejection that serialises the whole request
 * config - including the `Authorization: Bearer <apiKey>` header - so the API key ended up in the
 * notification text. Only the message is kept now.
 *
 * The `String(err)` fallback matters: a thrown non-Error has no `message`, and storing `undefined`
 * would put the literal word "undefined" into the notification.
 *
 * @param err whatever was thrown
 */
function errText(err: any): string {
    return err?.message ?? String(err);
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        timerLog = setTimeout(() => resolve(), ms);
    });
}

/**
 * Collects dashboards, folders and datasources from the Grafana API into the staging directory.
 *
 * @param ctx run context
 * @param options script options
 * @param dashboardDir where the dashboards go
 * @param folderDir where the folders go
 * @param datasourceDir where the datasources go
 * @param dashboardManuallyDir where the manual-restore copies go
 * @param tmpDir the staging directory itself, removed when Grafana cannot be reached
 * @returns whether Grafana answered at all
 */
async function getData(
    ctx: BackItUpContext,
    options: GrafanaOptions,
    dashboardDir: string,
    folderDir: string,
    datasourceDir: string,
    dashboardManuallyDir: string,
    tmpDir: string,
): Promise<boolean> {
    const log = ctx.log;

    let available;
    const dashboardFolderMap: Record<string, string> = {};

    try {
        available = await axios({
            method: 'get',
            url: `${options.protocol}://${options.host}:${options.port}`,
            validateStatus: () => true,
            httpsAgent: new Agent({
                rejectUnauthorized: options.signedCertificates,
            }),
        });
    } catch (err) {
        ctx.errors.grafana = errText(err);
        log.error(`Grafana is not available: ${err}`);
    }

    if (available && available.status) {
        log.debug(`Grafana is available ... Status: ${available.status}`);

        // Load datasource
        try {
            const dataSourcesRequest = await axios({
                method: 'get',
                url: `${options.protocol}://${options.host}:${options.port}/api/datasources`,
                headers: { Authorization: `Bearer ${options.apiKey}` },
                responseType: 'json',
                httpsAgent: new Agent({
                    rejectUnauthorized: options.signedCertificates,
                }),
            });

            await Promise.all(
                dataSourcesRequest.data.map(async (dataSource: { name: string }) => {
                    await writeFile(
                        `${datasourceDir}/${dataSource.name}.json`,
                        JSON.stringify(dataSource, null, 2),
                    );
                }),
            );
        } catch (err) {
            ctx.errors.grafana = errText(err);
            log.error('Error on Grafana Datasource Request');
        }

        // Load Dashboards
        const dashBoards: string[] = [];

        try {
            const dashBoardsRequest = await axios({
                method: 'get',
                url: `${options.protocol}://${options.host}:${options.port}/api/search`,
                headers: { Authorization: `Bearer ${options.apiKey}` },
                responseType: 'json',
                httpsAgent: new Agent({
                    rejectUnauthorized: options.signedCertificates,
                }),
            });

            await Promise.all(
                dashBoardsRequest.data.map(async (item: { type: string; uri: string; uid: string }) => {
                    if (item.type === 'dash-db' && !dashBoards.includes(item.uri)) {
                        dashBoards.push(`${item.uid}:${item.uri.split('/').pop()}`);
                    }
                }),
            );
        } catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Error on Grafana Dashboard Request: ${err}`);
        }

        try {
            await Promise.all(
                dashBoards.map(async dashBoard => {
                    const dashBoardData = dashBoard.split(':');
                    let dashBoardRequest;

                    try {
                        dashBoardRequest = await axios({
                            method: 'get',
                            url: `${options.protocol}://${options.host}:${options.port}/api/dashboards/uid/${dashBoardData[0]}`,
                            headers: { Authorization: `Bearer ${options.apiKey}` },
                            responseType: 'json',
                            httpsAgent: new Agent({
                                rejectUnauthorized: options.signedCertificates,
                            }),
                        });
                    } catch (err) {
                        ctx.errors.grafana = errText(err);
                        log.error(`Error on Grafana Dashboard ${dashBoardData[0]} backup: ${err}`);
                    }

                    log.debug(`found Dashboard: ${dashBoardData[1]}`);
                    await sleep(300);

                    // Deliberately unguarded: if the request above failed this throws and is
                    // caught by the surrounding try, exactly as before. The non-null
                    // assertion is what tsc needs here; eslint's program runs without
                    // strictNullChecks and therefore considers it redundant.
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                    const changedJSON = dashBoardRequest!.data;
                    const folderUid = changedJSON.meta?.folderUid || 'general';

                    dashboardFolderMap[dashBoardData[1]] = folderUid;

                    delete changedJSON.meta;
                    changedJSON.dashboard.id = null;
                    changedJSON.overwrite = true;

                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                    const manuellJSON = dashBoardRequest!.data.dashboard;

                    manuellJSON.id = null;
                    try {
                        await writeFile(
                            join(dashboardDir, `${dashBoardData[1]}.json`).replace(/\\/g, '/'),
                            JSON.stringify(changedJSON, null, 2),
                        );
                    } catch (e) {
                        ctx.errors.grafana = errText(e);
                        log.error(`${dashBoardData[1]}.json cannot be written: ${e}`);
                    }

                    try {
                        await writeFile(
                            join(dashboardManuallyDir, `${dashBoardData[1]}.json`).replace(/\\/g, '/'),
                            JSON.stringify(manuellJSON, null, 2),
                        );
                    } catch (e) {
                        ctx.errors.grafana = errText(e);
                        log.error(`${dashBoardData[1]}.json cannot be written: ${e}`);
                    }
                }),
            );
        } catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Error on Grafana Dashboard backup: ${err}`);
        }

        // Backup Folder UID
        try {
            const mapFilePath = join(folderDir, 'dashboard_folder_map.json').replace(/\\/g, '/');
            await writeFile(mapFilePath, JSON.stringify(dashboardFolderMap, null, 2));
            log.debug('Saved dashboard-folder mapping');
        } catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Error writing dashboard-folder mapping: ${err}`);
        }

        // Backup folders
        try {
            const foldersRequest = await axios({
                method: 'get',
                url: `${options.protocol}://${options.host}:${options.port}/api/folders`,
                headers: { Authorization: `Bearer ${options.apiKey}` },
                responseType: 'json',
                httpsAgent: new Agent({
                    rejectUnauthorized: options.signedCertificates,
                }),
            });

            await Promise.all(
                foldersRequest.data.map(async (folder: { title: string; uid: string }) => {
                    const folderFilename = `${folder.title.replace(/[^a-z0-9]/gi, '_')}_${folder.uid}.json`;
                    const folderFilePath = join(folderDir, `${folderFilename}`).replace(/\\/g, '/');
                    try {
                        await writeFile(folderFilePath, JSON.stringify(folder, null, 2));
                        log.debug(`Save Folder "${folder.title}"`);
                        await sleep(300);
                    } catch (err) {
                        log.error(`Error write Folder "${folder.title}": ${err}`);
                    }
                }),
            );
        } catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Error on Grafana-Folder: ${err}`);
        }

        // request finish
        return true;
    }

    ctx.errors.grafana = 'Grafana is not available!';

    log.error('Grafana is not available!');
    log.debug(`Try deleting the Grafana tmp directory: "${tmpDir}"`);

    try {
        await delTmp(ctx, tmpDir);
    } catch (err) {
        ctx.errors.grafana = errText(err);
        log.error(
            `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
        );
    }

    log.error('Grafana Backup cannot created ...');
    clearTimeout(timerLog);
    return false;
}

/**
 * Backs up the Grafana dashboards, folders and datasources.
 *
 * The callback version reported more than once on several paths: a failed `ensureDir` reported the
 * error and then carried straight on into the request and the packing, and an unreachable Grafana
 * reported from `getData` and again from the empty-directory branch behind it. Each of those extra
 * reports made lib/execute schedule all remaining backup steps another time.
 *
 * @param props the run context and the grafana slice of the config
 */
export async function run(props: BackItUpProps<GrafanaOptions>): Promise<void> {
    const { context: ctx, options } = props;
    const log = ctx.log;

    if (!options || !options.protocol || !options.host || !options.port || !options.apiKey) {
        ctx.errors.grafana = 'Grafana Backup cannot created. Please check your Configuration';
        log.error('Grafana Backup cannot created. Please check your Configuration');
        clearTimeout(timerLog);
        return;
    }

    const tmpDir = join(ctx.backupDir, 'grafana_tmp').replace(/\\/g, '/');
    const dashboardDir = join(tmpDir, 'dashboards').replace(/\\/g, '/');
    const folderDir = join(tmpDir, 'folder').replace(/\\/g, '/');
    const datasourceDir = join(tmpDir, 'datasource').replace(/\\/g, '/');
    const dashboardManuallyDir = join(tmpDir, 'dashboards_manually_restore').replace(/\\/g, '/');

    log.debug('Start Grafana Backup ...');

    const desiredMode = {
        mode: 0o2775,
    };

    /** Removes the staging directory, turning a failed removal into a log line as the original did */
    const dropTmp = async (): Promise<void> => {
        try {
            await delTmp(ctx, tmpDir);
        } catch {
            log.error(
                `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
            );
        }
    };

    if (!existsSync(tmpDir)) {
        try {
            await ensureDir(tmpDir, desiredMode);
        } catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Grafana tmp directory "${tmpDir}" cannot created ... ${err}`);
        }
        log.debug(`Created grafana_tmp directory: "${tmpDir}"`);
    } else {
        await dropTmp();

        if (!existsSync(tmpDir)) {
            try {
                await ensureDir(tmpDir, desiredMode);
            } catch (err) {
                ctx.errors.grafana = errText(err);
                log.error(`Grafana tmp directory "${tmpDir}" cannot created ... ${err}`);
            }
            log.debug('Created grafana_tmp directory');
        }
    }

    try {
        if (!existsSync(dashboardDir)) {
            await ensureDir(dashboardDir, desiredMode);
            log.debug('Created dashboard directory');
        }
        if (!existsSync(folderDir)) {
            await ensureDir(folderDir, desiredMode);
            log.debug('Created folder directory');
        }
        if (!existsSync(dashboardManuallyDir)) {
            await ensureDir(dashboardManuallyDir, desiredMode);
            log.debug('Created dashboards_manually_restore directory');
        }
        if (!existsSync(datasourceDir)) {
            await ensureDir(datasourceDir, desiredMode);
            log.debug('Created datasource directory');
        }
    } catch (err) {
        // Reported once and the step ends here; the original reported and then went on to run the
        // whole backup against directories it had just failed to create.
        ctx.errors.grafana = errText(err);
        log.error(`Grafana Backup cannot created: ${err}`);
        clearTimeout(timerLog);
        throw err;
    }

    if (
        !existsSync(tmpDir) ||
        !existsSync(datasourceDir) ||
        !existsSync(dashboardDir) ||
        !existsSync(dashboardManuallyDir)
    ) {
        log.error('Grafana Backup cannot created ...');
        clearTimeout(timerLog);
        return;
    }

    try {
        log.debug('start Grafana request ...');
        const available = await getData(
            ctx,
            options,
            dashboardDir,
            folderDir,
            datasourceDir,
            dashboardManuallyDir,
            tmpDir,
        );

        if (!available) {
            return;
        }

        log.debug('start Grafana backup compress ...');

        // compress Backup
        const dashBoardFiles = await readdir(dashboardDir);
        const dataSourcesFiles = await readdir(datasourceDir);

        if (dataSourcesFiles.length === 0 || dashBoardFiles.length === 0) {
            await dropTmp();

            log.error('cannot found Grafana Backup files');
            clearTimeout(timerLog);
            return;
        }

        let nameSuffix;
        if (options.hostType === 'Slave') {
            nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
        } else {
            nameSuffix = options.nameSuffix ? options.nameSuffix : '';
        }

        const fileName = join(
            ctx.backupDir,
            `grafana_${getDate()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`,
        );

        ctx.fileNames.push(fileName);

        await delay(COMPRESS_DELAY_MS);

        try {
            await compressAsync({ src: tmpDir, dest: fileName });
        } catch (err) {
            ctx.errors.grafana = (err as Error).toString();
            clearTimeout(timerLog);
            throw err;
        }

        log.debug(`Backup created: ${fileName}`);
        ctx.done.push('grafana');
        ctx.types.push('grafana');
        clearTimeout(timerLog);

        await dropTmp();

        clearTimeout(timerLog);
    } catch (e) {
        // One place for every failure of the request and the packing: the callback version had two
        // nested handlers here, which is where its duplicate reports came from.
        ctx.errors.grafana = ctx.errors.grafana || errText(e);
        log.error(`Grafana Backup cannot created: ${e}`);

        await dropTmp();

        clearTimeout(timerLog);
        throw e;
    }
}

/**
 * Removes the staging directory, rejecting when it cannot be deleted.
 *
 * @param ctx run context, for the logger and the error store
 * @param tmpDir directory to remove
 */
async function delTmp(ctx: BackItUpContext, tmpDir: string): Promise<void> {
    const log = ctx.log;

    log.debug(`Try deleting the Grafana tmp directory: "${tmpDir}"`);

    return remove(tmpDir)
        .then(() => {
            if (!existsSync(tmpDir)) {
                log.debug(`Grafana tmp directory "${tmpDir}" successfully deleted`);
            }
        })
        .catch(err => {
            ctx.errors.grafana = errText(err);
            log.error(
                `The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`,
            );
            throw err;
        });
}

export const ignoreErrors = true;
