"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const node_https_1 = require("node:https");
const axios_1 = __importDefault(require("axios"));
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/** How long the original waited between collecting the data and packing it */
const COMPRESS_DELAY_MS = 5000;
let timerLog;
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
function errText(err) {
    return err?.message ?? String(err);
}
async function sleep(ms) {
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
async function getData(ctx, options, dashboardDir, folderDir, datasourceDir, dashboardManuallyDir, tmpDir) {
    const log = ctx.log;
    let available;
    const dashboardFolderMap = {};
    try {
        available = await (0, axios_1.default)({
            method: 'get',
            url: `${options.protocol}://${options.host}:${options.port}`,
            validateStatus: () => true,
            httpsAgent: new node_https_1.Agent({
                rejectUnauthorized: options.signedCertificates,
            }),
        });
    }
    catch (err) {
        ctx.errors.grafana = errText(err);
        log.error(`Grafana is not available: ${err}`);
    }
    if (available && available.status) {
        log.debug(`Grafana is available ... Status: ${available.status}`);
        // Load datasource
        try {
            const dataSourcesRequest = await (0, axios_1.default)({
                method: 'get',
                url: `${options.protocol}://${options.host}:${options.port}/api/datasources`,
                headers: { Authorization: `Bearer ${options.apiKey}` },
                responseType: 'json',
                httpsAgent: new node_https_1.Agent({
                    rejectUnauthorized: options.signedCertificates,
                }),
            });
            await Promise.all(dataSourcesRequest.data.map(async (dataSource) => {
                await (0, promises_1.writeFile)(`${datasourceDir}/${dataSource.name}.json`, JSON.stringify(dataSource, null, 2));
            }));
        }
        catch (err) {
            ctx.errors.grafana = errText(err);
            log.error('Error on Grafana Datasource Request');
        }
        // Load Dashboards
        const dashBoards = [];
        try {
            const dashBoardsRequest = await (0, axios_1.default)({
                method: 'get',
                url: `${options.protocol}://${options.host}:${options.port}/api/search`,
                headers: { Authorization: `Bearer ${options.apiKey}` },
                responseType: 'json',
                httpsAgent: new node_https_1.Agent({
                    rejectUnauthorized: options.signedCertificates,
                }),
            });
            await Promise.all(dashBoardsRequest.data.map(async (item) => {
                if (item.type === 'dash-db' && !dashBoards.includes(item.uri)) {
                    dashBoards.push(`${item.uid}:${item.uri.split('/').pop()}`);
                }
            }));
        }
        catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Error on Grafana Dashboard Request: ${err}`);
        }
        try {
            await Promise.all(dashBoards.map(async (dashBoard) => {
                const dashBoardData = dashBoard.split(':');
                let dashBoardRequest;
                try {
                    dashBoardRequest = await (0, axios_1.default)({
                        method: 'get',
                        url: `${options.protocol}://${options.host}:${options.port}/api/dashboards/uid/${dashBoardData[0]}`,
                        headers: { Authorization: `Bearer ${options.apiKey}` },
                        responseType: 'json',
                        httpsAgent: new node_https_1.Agent({
                            rejectUnauthorized: options.signedCertificates,
                        }),
                    });
                }
                catch (err) {
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
                const changedJSON = dashBoardRequest.data;
                const folderUid = changedJSON.meta?.folderUid || 'general';
                dashboardFolderMap[dashBoardData[1]] = folderUid;
                delete changedJSON.meta;
                changedJSON.dashboard.id = null;
                changedJSON.overwrite = true;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                const manuellJSON = dashBoardRequest.data.dashboard;
                manuellJSON.id = null;
                try {
                    await (0, promises_1.writeFile)((0, node_path_1.join)(dashboardDir, `${dashBoardData[1]}.json`).replace(/\\/g, '/'), JSON.stringify(changedJSON, null, 2));
                }
                catch (e) {
                    ctx.errors.grafana = errText(e);
                    log.error(`${dashBoardData[1]}.json cannot be written: ${e}`);
                }
                try {
                    await (0, promises_1.writeFile)((0, node_path_1.join)(dashboardManuallyDir, `${dashBoardData[1]}.json`).replace(/\\/g, '/'), JSON.stringify(manuellJSON, null, 2));
                }
                catch (e) {
                    ctx.errors.grafana = errText(e);
                    log.error(`${dashBoardData[1]}.json cannot be written: ${e}`);
                }
            }));
        }
        catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Error on Grafana Dashboard backup: ${err}`);
        }
        // Backup Folder UID
        try {
            const mapFilePath = (0, node_path_1.join)(folderDir, 'dashboard_folder_map.json').replace(/\\/g, '/');
            await (0, promises_1.writeFile)(mapFilePath, JSON.stringify(dashboardFolderMap, null, 2));
            log.debug('Saved dashboard-folder mapping');
        }
        catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Error writing dashboard-folder mapping: ${err}`);
        }
        // Backup folders
        try {
            const foldersRequest = await (0, axios_1.default)({
                method: 'get',
                url: `${options.protocol}://${options.host}:${options.port}/api/folders`,
                headers: { Authorization: `Bearer ${options.apiKey}` },
                responseType: 'json',
                httpsAgent: new node_https_1.Agent({
                    rejectUnauthorized: options.signedCertificates,
                }),
            });
            await Promise.all(foldersRequest.data.map(async (folder) => {
                const folderFilename = `${folder.title.replace(/[^a-z0-9]/gi, '_')}_${folder.uid}.json`;
                const folderFilePath = (0, node_path_1.join)(folderDir, `${folderFilename}`).replace(/\\/g, '/');
                try {
                    await (0, promises_1.writeFile)(folderFilePath, JSON.stringify(folder, null, 2));
                    log.debug(`Save Folder "${folder.title}"`);
                    await sleep(300);
                }
                catch (err) {
                    log.error(`Error write Folder "${folder.title}": ${err}`);
                }
            }));
        }
        catch (err) {
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
    }
    catch (err) {
        ctx.errors.grafana = errText(err);
        log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
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
async function run(props) {
    const { context: ctx, options } = props;
    const log = ctx.log;
    if (!options || !options.protocol || !options.host || !options.port || !options.apiKey) {
        ctx.errors.grafana = 'Grafana Backup cannot created. Please check your Configuration';
        log.error('Grafana Backup cannot created. Please check your Configuration');
        clearTimeout(timerLog);
        return;
    }
    const tmpDir = (0, node_path_1.join)(ctx.backupDir, 'grafana_tmp').replace(/\\/g, '/');
    const dashboardDir = (0, node_path_1.join)(tmpDir, 'dashboards').replace(/\\/g, '/');
    const folderDir = (0, node_path_1.join)(tmpDir, 'folder').replace(/\\/g, '/');
    const datasourceDir = (0, node_path_1.join)(tmpDir, 'datasource').replace(/\\/g, '/');
    const dashboardManuallyDir = (0, node_path_1.join)(tmpDir, 'dashboards_manually_restore').replace(/\\/g, '/');
    log.debug('Start Grafana Backup ...');
    const desiredMode = {
        mode: 0o2775,
    };
    /** Removes the staging directory, turning a failed removal into a log line as the original did */
    const dropTmp = async () => {
        try {
            await delTmp(ctx, tmpDir);
        }
        catch {
            log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
        }
    };
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        try {
            await (0, fs_extra_1.ensureDir)(tmpDir, desiredMode);
        }
        catch (err) {
            ctx.errors.grafana = errText(err);
            log.error(`Grafana tmp directory "${tmpDir}" cannot created ... ${err}`);
        }
        log.debug(`Created grafana_tmp directory: "${tmpDir}"`);
    }
    else {
        await dropTmp();
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            try {
                await (0, fs_extra_1.ensureDir)(tmpDir, desiredMode);
            }
            catch (err) {
                ctx.errors.grafana = errText(err);
                log.error(`Grafana tmp directory "${tmpDir}" cannot created ... ${err}`);
            }
            log.debug('Created grafana_tmp directory');
        }
    }
    try {
        if (!(0, node_fs_1.existsSync)(dashboardDir)) {
            await (0, fs_extra_1.ensureDir)(dashboardDir, desiredMode);
            log.debug('Created dashboard directory');
        }
        if (!(0, node_fs_1.existsSync)(folderDir)) {
            await (0, fs_extra_1.ensureDir)(folderDir, desiredMode);
            log.debug('Created folder directory');
        }
        if (!(0, node_fs_1.existsSync)(dashboardManuallyDir)) {
            await (0, fs_extra_1.ensureDir)(dashboardManuallyDir, desiredMode);
            log.debug('Created dashboards_manually_restore directory');
        }
        if (!(0, node_fs_1.existsSync)(datasourceDir)) {
            await (0, fs_extra_1.ensureDir)(datasourceDir, desiredMode);
            log.debug('Created datasource directory');
        }
    }
    catch (err) {
        // Reported once and the step ends here; the original reported and then went on to run the
        // whole backup against directories it had just failed to create.
        ctx.errors.grafana = errText(err);
        log.error(`Grafana Backup cannot created: ${err}`);
        clearTimeout(timerLog);
        throw err;
    }
    if (!(0, node_fs_1.existsSync)(tmpDir) ||
        !(0, node_fs_1.existsSync)(datasourceDir) ||
        !(0, node_fs_1.existsSync)(dashboardDir) ||
        !(0, node_fs_1.existsSync)(dashboardManuallyDir)) {
        log.error('Grafana Backup cannot created ...');
        clearTimeout(timerLog);
        return;
    }
    try {
        log.debug('start Grafana request ...');
        const available = await getData(ctx, options, dashboardDir, folderDir, datasourceDir, dashboardManuallyDir, tmpDir);
        if (!available) {
            return;
        }
        log.debug('start Grafana backup compress ...');
        // compress Backup
        const dashBoardFiles = await (0, promises_1.readdir)(dashboardDir);
        const dataSourcesFiles = await (0, promises_1.readdir)(datasourceDir);
        if (dataSourcesFiles.length === 0 || dashBoardFiles.length === 0) {
            await dropTmp();
            log.error('cannot found Grafana Backup files');
            clearTimeout(timerLog);
            return;
        }
        let nameSuffix;
        if (options.hostType === 'Slave') {
            nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
        }
        else {
            nameSuffix = options.nameSuffix ? options.nameSuffix : '';
        }
        const fileName = (0, node_path_1.join)(ctx.backupDir, `grafana_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
        ctx.fileNames.push(fileName);
        await (0, tools_1.delay)(COMPRESS_DELAY_MS);
        try {
            await (0, targz_1.compressAsync)({ src: tmpDir, dest: fileName });
        }
        catch (err) {
            ctx.errors.grafana = err.toString();
            clearTimeout(timerLog);
            throw err;
        }
        log.debug(`Backup created: ${fileName}`);
        ctx.done.push('grafana');
        ctx.types.push('grafana');
        clearTimeout(timerLog);
        await dropTmp();
        clearTimeout(timerLog);
    }
    catch (e) {
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
async function delTmp(ctx, tmpDir) {
    const log = ctx.log;
    log.debug(`Try deleting the Grafana tmp directory: "${tmpDir}"`);
    return (0, fs_extra_1.remove)(tmpDir)
        .then(() => {
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            log.debug(`Grafana tmp directory "${tmpDir}" successfully deleted`);
        }
    })
        .catch(err => {
        ctx.errors.grafana = errText(err);
        log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
        throw err;
    });
}
exports.ignoreErrors = true;
//# sourceMappingURL=36-grafana.js.map