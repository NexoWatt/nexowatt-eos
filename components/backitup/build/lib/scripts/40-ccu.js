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
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
const node_path_1 = require("node:path");
const axios_1 = __importDefault(require("axios"));
const tools_1 = require("../tools");
/**
 * Downloads a backup from every configured CCU.
 *
 * @param props the run context and the ccu slice of the config
 */
async function run(props) {
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
    }
    else {
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
async function startBackup(ctx, options) {
    return new Promise(resolve => {
        void (async () => {
            const connectType = options.usehttps ? 'https' : 'http';
            const MIN_BACKUP_SIZE = 20 * 1024; // 20 KB
            let resolved = false;
            const safeResolve = (msg) => {
                if (!resolved) {
                    resolved = true;
                    resolve(msg);
                }
            };
            try {
                const sessionAxios = axios_1.default.create({
                    httpsAgent: new https.Agent({
                        // Older instance configurations stored the flag as a string.
                        rejectUnauthorized: options.signedCertificates === true ||
                            options.signedCertificates === 'true',
                    }),
                });
                // Login
                const loginResponse = await sessionAxios.post(`${connectType}://${options.host}/api/homematic.cgi`, {
                    method: 'Session.login',
                    params: {
                        username: options.user,
                        password: options.pass,
                    },
                });
                const sid = loginResponse.data.result;
                if (!sid) {
                    const message = 'CCU: No session ID';
                    ctx.errors.ccu = message;
                    safeResolve(message);
                    return;
                }
                // Version
                const versionResponse = await sessionAxios.get(`${connectType}://${options.host}/api/backup/version.cgi`);
                const version = (versionResponse.data || '').split('\n')[0].split('=')[1] || 'Unknown';
                const fileName = (0, node_path_1.join)(ctx.backupDir, `homematic_${(0, tools_1.getDate)()}${options.nameSuffix ? `_${options.nameSuffix}` : ''}_${version}_backupiobroker.tar.sbk`);
                ctx.fileNames.push(fileName);
                ctx.log.debug('Requesting backup from CCU');
                const protocolType = connectType === 'https' ? https : http;
                const writeStream = (0, node_fs_1.createWriteStream)(fileName);
                let backupError = null;
                const request = protocolType.get(`${connectType}://${options.host}/config/cp_security.cgi?sid=@${sid}@&action=create_backup`, 
                // Note: unlike the axios instance above this passes the flag straight through,
                // so a string value would be truthy here. Kept as found.
                { rejectUnauthorized: options.signedCertificates }, res => {
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
                });
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
                    }
                    catch {
                        // ignore logout errors
                    }
                    let stats;
                    try {
                        stats = (0, node_fs_1.existsSync)(fileName) && (0, node_fs_1.statSync)(fileName);
                    }
                    catch {
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
                    safeResolve(`CCU backup successful (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                });
            }
            catch (err) {
                const message = err.message || String(err);
                ctx.errors.ccu = message;
                safeResolve(message);
            }
        })();
    });
}
exports.ignoreErrors = true;
//# sourceMappingURL=40-ccu.js.map