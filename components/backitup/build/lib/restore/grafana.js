"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const https = __importStar(require("node:https"));
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const axios_1 = __importDefault(require("axios"));
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/** How long the original waited before unpacking */
const WAIT_MS = 1000;
/** ...and again before reporting */
const DONE_DELAY_MS = 2000;
/**
 * Pushes the unpacked datasources, folders and dashboards back into Grafana.
 *
 * Always resolves - every failure is only logged.
 *
 * @param ctx run context, for the logger
 * @param options connection settings, flat or under `grafana`
 * @param tmpDir directory the backup was unpacked into
 */
async function postData(ctx, options, tmpDir) {
    const dashboardDir = (0, node_path_1.join)(tmpDir, 'dashboards').replace(/\\/g, '/');
    const datasourceDir = (0, node_path_1.join)(tmpDir, 'datasource').replace(/\\/g, '/');
    const folderDir = (0, node_path_1.join)(tmpDir, 'folder').replace(/\\/g, '/');
    const dashBoards = await (0, promises_1.readdir)(dashboardDir);
    const dataSources = await (0, promises_1.readdir)(datasourceDir);
    const folders = await (0, promises_1.readdir)(folderDir);
    const host = options.host ? options.host : options.grafana.host;
    const port = options.port ? options.port : options.grafana.port;
    const apiKey = options.apiKey ? options.apiKey : options.grafana.apiKey;
    const protocol = options.protocol ? options.protocol : options.grafana.protocol;
    // NOTE: the final `: true` makes this truthy even when both flags are false, so certificate
    // verification cannot be switched off here. Kept as found - see also lib/scripts/70-ftp. When
    // the flag is falsy and no `grafana` slice exists this throws instead.
    const signedCertificates = options.signedCertificates
        ? options.signedCertificates
        : options.grafana.signedCertificates
            ? options.grafana.signedCertificates
            : true;
    // Check available
    let available;
    try {
        available = await (0, axios_1.default)({
            method: 'get',
            url: `${protocol}://${host}:${port}`,
            validateStatus: () => true,
            httpsAgent: new https.Agent({
                rejectUnauthorized: signedCertificates,
            }),
        });
    }
    catch (err) {
        ctx.log.debug(`Grafana is not available: ${err}`);
    }
    if (available?.status) {
        ctx.log.debug(`Grafana is available ... Status: ${available.status}`);
        // post datasource
        try {
            await Promise.all(dataSources.map(async (dataSource) => {
                const dataSourcePth = (0, node_path_1.join)(datasourceDir, dataSource).replace(/\\/g, '/');
                const dataSourceFile = await (0, promises_1.readFile)(dataSourcePth);
                const dataSourceName = dataSource.split('.').shift();
                ctx.log.debug(`Try to Restore: ${dataSourcePth}`);
                await (0, axios_1.default)({
                    method: 'POST',
                    baseURL: `${protocol}://${host}:${port}`,
                    url: '/api/datasources',
                    data: dataSourceFile,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: signedCertificates,
                    }),
                })
                    .then(result => {
                    ctx.log.debug(`datasoure restore "${dataSourceName}" finish: ${JSON.stringify(result.data)}`);
                })
                    .catch(err => {
                    // Reaches into `err.response` unguarded, so a network-level failure
                    // throws here and is reported by the outer catch instead.
                    ctx.log.debug(`cannot restore datasource "${dataSourceName}": ${JSON.stringify(err.response.data.message)}`);
                });
            }));
        }
        catch (err) {
            ctx.log.debug(`Grafana datasource restore not possible: ${err}`);
        }
        // restore folders
        try {
            await Promise.all(folders.map(async (folderFile) => {
                const folderPath = (0, node_path_1.join)(folderDir, folderFile).replace(/\\/g, '/');
                const folderJson = JSON.parse(await (0, promises_1.readFile)(folderPath, 'utf8'));
                const folderTitle = folderJson.title;
                const folderUid = folderJson.uid;
                if (folderUid) {
                    ctx.log.debug(`Try to restore folder: ${folderTitle} (${folderUid})`);
                    await (0, axios_1.default)({
                        method: 'POST',
                        baseURL: `${protocol}://${host}:${port}`,
                        url: '/api/folders',
                        data: folderJson,
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${apiKey}`,
                        },
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: signedCertificates,
                        }),
                    })
                        .then(() => {
                        ctx.log.debug(`Folder "${folderTitle}" restored`);
                    })
                        .catch(err => {
                        const message = err.response?.data?.message || err.message;
                        ctx.log.debug(`Cannot restore folder "${folderTitle}": ${message}`);
                    });
                }
            }));
        }
        catch (err) {
            ctx.log.debug(`Grafana folder restore not possible: ${err}`);
        }
        const folderMapPath = (0, node_path_1.join)(folderDir, 'dashboard_folder_map.json').replace(/\\/g, '/');
        let dashboardFolderMap = {};
        try {
            const mapData = await (0, promises_1.readFile)(folderMapPath, 'utf8');
            dashboardFolderMap = JSON.parse(mapData);
            ctx.log.debug(`Loaded dashboard-folder mapping with ${Object.keys(dashboardFolderMap).length} entries`);
        }
        catch (err) {
            ctx.log.debug(`No dashboard-folder mapping found or invalid: ${err}`);
        }
        // post Dashboards
        try {
            await Promise.all(dashBoards.map(async (dashBoard) => {
                const dashBoardPth = (0, node_path_1.join)(dashboardDir, dashBoard).replace(/\\/g, '/');
                const dashBoardFile = await (0, promises_1.readFile)(dashBoardPth);
                const dashBoardName = dashBoard.split('.').shift();
                ctx.log.debug(`Try to Restore: ${dashBoardPth}`);
                const apiOptions = {
                    baseURL: `${protocol}://${host}:${port}`,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: signedCertificates,
                    }),
                };
                const dashJson = JSON.parse(dashBoardFile.toString());
                const folderUid = dashboardFolderMap[dashBoardName];
                if (folderUid && folderUid !== 'general') {
                    dashJson.folderUid = folderUid;
                }
                await axios_1.default
                    .post('/api/dashboards/db', dashJson, apiOptions)
                    .then(result => ctx.log.debug(`dashboard restore for "${dashBoardName}" finish: ${JSON.stringify(result.data)}`))
                    .catch(err => 
                // Same unguarded `err.response` access as above.
                ctx.log.debug(`cannot restore dashboard "${dashBoardName}": ${JSON.stringify(err.response.data)}`));
            }));
        }
        catch (err) {
            ctx.log.debug(`Grafana dashboard restore not possible: ${err}`);
        }
        // request finish
    }
    else {
        ctx.log.debug('Grafana is not available!');
        // request finish
    }
}
/**
 * Unpacks a Grafana backup and pushes it back through the API.
 *
 * The callback version armed its "done" timer even after the push had failed - the catch cleared
 * the callback but did not return, so the timer only logged "completed successfully" into the void.
 * The step reports once now.
 *
 * @param props the run context, the grafana slice of the config and the archive
 */
async function restore(props) {
    const { context: ctx, options, fileName } = props;
    if (!((options && options.host && options.port && options.apiKey && options.protocol) ||
        (options &&
            options.grafana &&
            options.grafana.host &&
            options.grafana.port &&
            options.grafana.apiKey &&
            options.grafana.protocol))) {
        ctx.log.debug('Grafana restore not completed. Please check your Configuration');
        return 'Grafana restore not completed. Please check your Configuration';
    }
    ctx.log.debug('Start Grafana Restore ...');
    const tmpDir = (0, node_path_1.join)(options.backupDir, 'grafana_tmp').replace(/\\/g, '/');
    ctx.log.debug(`filename for restore: ${fileName}`);
    if ((0, node_fs_1.existsSync)(tmpDir)) {
        try {
            (0, fs_extra_1.removeSync)(tmpDir);
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                ctx.log.debug('old Grafana tmp directory was successfully deleted');
            }
        }
        catch {
            ctx.log.debug('old Grafana tmp directory cannot deleted');
        }
    }
    // A string, so fs-extra reads no mode from it and falls back to the default. Kept as found.
    const desiredMode = '0o2775';
    try {
        (0, fs_extra_1.ensureDirSync)(tmpDir, desiredMode);
        ctx.log.debug(`Grafana tmp directory created: ${tmpDir}`);
    }
    catch (e) {
        ctx.log.debug(`Grafana tmp directory cannot created: ${e}`);
    }
    ctx.log.debug('start decompress');
    await (0, tools_1.delay)(WAIT_MS);
    try {
        await (0, targz_1.decompressAsync)({ src: fileName, dest: tmpDir });
    }
    catch (err) {
        ctx.log.error('Grafana restore not completed');
        ctx.log.error(err);
        throw err;
    }
    ctx.log.debug('Grafana request started');
    await postData(ctx, options, tmpDir);
    ctx.log.debug('Grafana request ended');
    ctx.log.debug('Try deleting the Grafana tmp directory');
    (0, fs_extra_1.removeSync)(tmpDir);
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        ctx.log.debug('Grafana tmp directory was successfully deleted');
    }
    await (0, tools_1.delay)(DONE_DELAY_MS);
    ctx.log.debug('Grafana Restore completed successfully');
    return 'Grafana restore done';
}
exports.isStop = false;
//# sourceMappingURL=grafana.js.map