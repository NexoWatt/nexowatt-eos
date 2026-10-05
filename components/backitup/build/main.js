"use strict";
/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
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
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const adapter_core_1 = require("@iobroker/adapter-core"); // Get common adapter utils
const schedule = __importStar(require("node-schedule"));
const eos_license_client_1 = require("../packages/eos-license-client");
const tools = __importStar(require("./lib/tools"));
const execute_1 = __importDefault(require("./lib/execute"));
const systemCheck = __importStar(require("./lib/systemCheck"));
const tokenRefresher_1 = __importDefault(require("./lib/tokenRefresher"));
const sdCard_1 = require("./lib/sdCard");
const bashDir = (0, node_path_1.join)((0, adapter_core_1.getAbsoluteDefaultDataDir)(), 'nexowatt-backup').replace(/\\/g, '/');
// Lazily required node builtins, cached across calls - not per-instance state.
let http;
let https;
/**
 * Decrypt the password/value with given key
 *
 * @param key - Secret key
 * @param value - value to decrypt
 */
function decrypt(key, value) {
    let result = '';
    for (let i = 0; i < value.length; i++) {
        result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
    }
    return result;
}
/**
 * Reads the listen port of a running server; both are bound to a TCP address.
 *
 * @param server the listening http/https server
 */
function serverPort(server) {
    return server.address().port;
}
class NexoWattBackup extends adapter_core_1.Adapter {
    licenseGuard;
    operationalReady = false;
    filesystemInitialized = false;
    eventPasswordsDecrypted = false;
    initializingLicensedWork = false;
    licenseMonitor;
    timerOutput;
    timerOutput2;
    timerUmount1;
    timerUmount2;
    timerMain;
    slaveTimeOut;
    waitToSlaveBackup;
    dlServer;
    ulServer;
    /** system language */
    systemLang = 'de';
    backupConfig = {};
    /**
     * Keyed by backup type, not by index - the original initialised this as an array and only
     * ever addressed it with string keys. Kept as found.
     */
    backupTimeSchedules = [];
    taskRunning = false;
    dropBoxTokenRefresher = null;
    constructor(options = {}) {
        super({ ...options, name: 'nexowatt-backup' });
        this.licenseGuard = (0, eos_license_client_1.createLicenseGuard)(this, {
            feature: 'energy',
            onLost: () => this.stopLicensedWork(),
        });
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.on('message', this.onMessage.bind(this));
    }
    /** Stop admission of new work; an already admitted archive/restore may finish safely. */
    stopLicensedWork() {
        this.operationalReady = false;
        for (const job of Object.values(this.backupTimeSchedules))
            job?.cancel();
        clearTimeout(this.timerMain);
        clearTimeout(this.slaveTimeOut);
        clearTimeout(this.waitToSlaveBackup);
        this.dropBoxTokenRefresher?.destroy();
        for (const server of [this.dlServer, this.ulServer]) {
            server?.closeAllConnections();
            server?.close();
        }
        this.dlServer = undefined;
        this.ulServer = undefined;
    }
    /** Public only for the restore dispatcher; never grants offline adapter access. */
    assertLicensedOperation() {
        this.licenseGuard.assertAllowed();
        if (!this.operationalReady)
            throw new Error('EOS_BACKUP_NOT_READY');
    }
    async onStateChange(id, state) {
        if (!this.operationalReady || !this.licenseGuard.isAllowed())
            return;
        this.dropBoxTokenRefresher?.onStateChange(id, state);
        if (id === `${this.namespace}.info.dropboxTokens`) {
            await this.updateAccessTokens(this.backupConfig);
            this.log.debug('Config Update for Dropbox Token');
        }
        if (state && (state.val === true || state.val === 'true') && !state.ack) {
            if (id === `${this.namespace}.oneClick.iobroker` || id === `${this.namespace}.oneClick.ccu`) {
                const sysCheck = await systemCheck.storageSizeCheck(this, 'nexowatt-backup', this.log);
                const type = id.split('.').pop();
                if (sysCheck?.ready === true || this.config.cifsEnabled === true) {
                    let config;
                    try {
                        config = JSON.parse(JSON.stringify(this.backupConfig[type]));
                        config.enabled = true;
                        config.deleteBackupAfter = 0; // do not delete files by custom backup
                    }
                    catch (e) {
                        this.log.warn(`backup error: ${e.stack}`);
                        this.log.warn(`backup error: ${e} ... please check your config and try again!!`);
                    }
                    void this.startBackup(config, err => {
                        if (err) {
                            this.log.error(`[${type}] ${err}`);
                        }
                        else {
                            this.log.debug(`[${type}] exec: done`);
                        }
                        this.timerOutput = setTimeout(() => {
                            this.readRunResult(type, () => {
                                if (this.config.onedriveEnabled && this.config.hostType === 'Single') {
                                    void this.renewOnedriveToken();
                                }
                            });
                        }, 500);
                        void this.setState(`oneClick.${type}`, false, true);
                        if (this.config.slaveInstance && type === 'iobroker' && this.config.hostType === 'Master') {
                            this.log.debug('Slave backup from NexoWatt EOS Backup master is started ...');
                            void this.startSlaveBackup(this.config.slaveInstance[0], null);
                        }
                    });
                }
                else {
                    this.log.error(`A local backup is currently not possible. The storage space is currently only ${sysCheck && sysCheck.diskFree ? sysCheck.diskFree : null} MB`);
                    systemCheck.systemMessage(this, tools._('A local backup is currently not possible. Please check your System!', this.systemLang));
                    void this.setState(`oneClick.${type}`, false, true);
                    void this.setState('output.line', `[EXIT] ${tools._('A local backup is currently not possible. Please check your System!', this.systemLang)}`, true);
                }
            }
        }
    }
    async synchronizeLicensedWork() {
        if (this.initializingLicensedWork || this.operationalReady || this.taskRunning || !this.licenseGuard.isAllowed())
            return;
        this.initializingLicensedWork = true;
        try {
            await this.main();
        }
        catch {
            this.stopLicensedWork();
            this.log.error('EOS_BACKUP_START_DENIED');
        }
        finally {
            this.initializingLicensedWork = false;
        }
    }
    async onReady() {
        this.licenseMonitor = setInterval(() => { void this.synchronizeLicensedWork(); }, 5000);
        this.licenseMonitor.unref();
        if (!(await this.licenseGuard.start())) {
            this.log.warn('EOS_LICENSE_REQUIRED: waiting for Home or Pro activation in eos-admin');
            return;
        }
        await this.synchronizeLicensedWork();
    }
    // is called when adapter shuts down - callback has to be called under any circumstances!
    onUnload(callback) {
        clearInterval(this.licenseMonitor);
        void this.licenseGuard.stop();
        try {
            this.dropBoxTokenRefresher?.destroy();
            this.log.info('cleaned everything up...');
            clearTimeout(this.timerOutput2);
            clearTimeout(this.timerOutput);
            clearTimeout(this.timerUmount1);
            clearTimeout(this.timerUmount2);
            clearTimeout(this.timerMain);
            clearTimeout(this.slaveTimeOut);
            clearTimeout(this.waitToSlaveBackup);
            if (this.dlServer) {
                try {
                    this.dlServer.closeAllConnections();
                }
                catch (e) {
                    this.log.debug(`Download server Connections could not be closed: ${e}`);
                }
                try {
                    this.dlServer.close();
                }
                catch (e) {
                    this.log.debug(`Download server Connections could not be closed: ${e}`);
                }
            }
            if (this.ulServer) {
                try {
                    this.ulServer.closeAllConnections();
                }
                catch (e) {
                    this.log.debug(`Upload server connections could not be closed: ${e}`);
                }
                try {
                    this.ulServer.close();
                }
                catch (e) {
                    this.log.debug(`Upload server connections could not be closed: ${e}`);
                }
            }
        }
        catch (e) {
            console.log(`Cannot unload: ${e}`);
        }
        callback();
    }
    async onMessage(obj) {
        if (obj) {
            if (obj.command === 'eos.license.status') {
                if (obj.callback)
                    this.sendTo(obj.from, obj.command, this.licenseGuard.getStatus(), obj.callback);
                return;
            }
            if (obj.command !== 'serverClose') {
                try {
                    this.assertLicensedOperation();
                }
                catch {
                    if (obj.callback)
                        this.sendTo(obj.from, obj.command, { error: 'EOS_LICENSE_REQUIRED' }, obj.callback);
                    return;
                }
            }
            switch (obj.command) {
                case 'list':
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-require-imports
                        const list = require('./lib/list').default;
                        this.log.debug(`Reading backup list...`);
                        await this.updateAccessTokens(this.backupConfig);
                        list(obj.message, this.backupConfig, this.log, res => {
                            this.log.debug(`Backup list was read: ${JSON.stringify(res)}`);
                            if (obj.callback) {
                                this.sendTo(obj.from, obj.command, res, obj.callback);
                            }
                        });
                    }
                    catch {
                        this.log.debug('Backup list cannot be read ...');
                    }
                    break;
                case 'authGoogleDrive': {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const GoogleDrive = require('./lib/googleDriveLib').default;
                    if (obj.callback) {
                        const google = new GoogleDrive();
                        void google
                            .getAuthorizeUrl()
                            .then(url => this.sendTo(obj.from, obj.command, { url }, obj.callback));
                    }
                    break;
                }
                case 'authDropbox':
                    if (obj.callback) {
                        void tokenRefresher_1.default.getAuthUrl('https://oauth2.iobroker.in/dropbox').then(url => this.sendTo(obj.from, obj.command, { url }, obj.callback));
                    }
                    break;
                case 'authOnedrive': {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const Onedrive = require('./lib/oneDriveLib').default;
                    if (obj.message && obj.message.code) {
                        const onedrive = new Onedrive();
                        void onedrive
                            .getRefreshToken(obj.message.code, this.log)
                            .then(json => this.sendTo(obj.from, obj.command, { done: true, json }, obj.callback))
                            .catch(err => this.sendTo(obj.from, obj.command, { error: err }, obj.callback));
                    }
                    else if (obj.callback) {
                        const onedrive = new Onedrive();
                        void onedrive
                            .getAuthorizeUrl(this.log)
                            .then(url => this.sendTo(obj.from, obj.command, { url: url }, obj.callback))
                            .catch(err => this.sendTo(obj.from, obj.command, { error: err }, obj.callback));
                    }
                    break;
                }
                case 'restore':
                    if (obj.message) {
                        if (obj.message.stopIOB) {
                            await this.getCerts(obj.from);
                        }
                        this.log.info(`DATA: ${JSON.stringify(obj.message)}`);
                        await this.updateAccessTokens(this.backupConfig);
                        // eslint-disable-next-line @typescript-eslint/no-require-imports
                        const _restore = require('./lib/restore');
                        _restore.restore(this, this.backupConfig, obj.message.type, obj.message.fileName, obj.message.currentTheme, obj.message.currentProtocol, bashDir, this.log, res => obj.callback && this.sendTo(obj.from, obj.command, res, obj.callback));
                    }
                    else if (obj.callback) {
                        this.invalidParameters(obj);
                    }
                    break;
                case 'uploadFile':
                    if (obj.message && obj.message.protocol) {
                        if (this.ulServer && this.ulServer._connectionKey && this.ulServer.listening) {
                            this.log.debug(`Upload server is running on Port ${serverPort(this.ulServer)}...`);
                        }
                        else {
                            if (obj.message.protocol === 'https:') {
                                await this.getCerts(obj.from);
                            }
                            try {
                                this.ulFileServer(obj.message.protocol);
                            }
                            catch {
                                this.log.debug('Upload server cannot started');
                            }
                        }
                        try {
                            this.sendTo(obj.from, obj.command, { listenPort: serverPort(this.ulServer) }, obj.callback);
                        }
                        catch (e) {
                            this.sendTo(obj.from, obj.command, { e }, obj.callback);
                        }
                    }
                    else if (obj.callback) {
                        this.invalidParameters(obj);
                    }
                    break;
                case 'getFile':
                    if (obj.message && obj.message.type && obj.message.fileName && obj.message.protocol) {
                        if (this.dlServer && this.dlServer._connectionKey && this.dlServer.listening) {
                            this.log.debug(`Download server is running on port ${serverPort(this.dlServer)}...`);
                        }
                        else {
                            if (obj.message.protocol === 'https:') {
                                await this.getCerts(obj.from);
                            }
                            try {
                                this.dlFileServer(obj.message.protocol);
                            }
                            catch {
                                this.log.debug('Downloadserver cannot started');
                            }
                        }
                        const fileName = obj.message.fileName.split('/').pop();
                        if (obj.message.type !== 'local') {
                            const backupDir = (0, node_path_1.join)(tools.getIobDir(), 'backups');
                            const toSaveName = (0, node_path_1.join)(backupDir, fileName);
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            const _getFile = require('./lib/restore');
                            await this.updateAccessTokens(this.backupConfig);
                            _getFile.getFile(this.backupConfig, obj.message.type, obj.message.fileName, toSaveName, this.log, err => {
                                if (!err && (0, node_fs_1.existsSync)(toSaveName)) {
                                    try {
                                        this.sendTo(obj.from, obj.command, { fileName: fileName, listenPort: serverPort(this.dlServer) }, obj.callback);
                                    }
                                    catch (error) {
                                        this.sendTo(obj.from, obj.command, { error }, obj.callback);
                                    }
                                }
                                else {
                                    this.log.warn(`File ${toSaveName} not found`);
                                }
                            });
                        }
                        else if ((0, node_fs_1.existsSync)(obj.message.fileName)) {
                            try {
                                this.sendTo(obj.from, obj.command, { fileName: fileName, listenPort: serverPort(this.dlServer) }, obj.callback);
                            }
                            catch (error) {
                                this.sendTo(obj.from, obj.command, { error }, obj.callback);
                            }
                        }
                    }
                    else if (obj.callback) {
                        this.invalidParameters(obj);
                    }
                    break;
                case 'serverClose':
                    if (obj.message && obj.message.downloadFinish && !obj.message.uploadFinish) {
                        this.log.debug('Download finished...');
                        this.sendTo(obj.from, obj.command, { serverClose: true }, obj.callback);
                    }
                    else if (obj.message && obj.message.uploadFinish && !obj.message.downloadFinish) {
                        this.log.debug('Upload finished...');
                        this.sendTo(obj.from, obj.command, { serverClose: true }, obj.callback);
                    }
                    else if (obj.callback) {
                        this.invalidParameters(obj);
                    }
                    break;
                case 'getTelegramUser':
                    if (obj && obj.message) {
                        const inst = obj.message.config.instance
                            ? obj.message.config.instance
                            : this.config.telegramInstance;
                        void this.getForeignState(`${inst}.communicate.users`, (err, state) => {
                            if (err) {
                                this.log.error(err);
                            }
                            if (state && state.val) {
                                try {
                                    this.sendTo(obj.from, obj.command, state.val, obj.callback);
                                }
                                catch (err) {
                                    if (err) {
                                        this.log.error(err);
                                    }
                                    this.log.error('Cannot parse stored user IDs from Telegram!');
                                }
                            }
                        });
                    }
                    break;
                case 'getSystemInfo':
                    if (obj) {
                        let systemInfo = process.platform;
                        let dbInfo = false;
                        if ((0, node_fs_1.existsSync)('/opt/scripts/.docker_config/.thisisdocker')) {
                            // Docker Image Support >= 5.2.0
                            systemInfo = 'docker';
                            if ((0, node_fs_1.existsSync)('/opt/scripts/.docker_config/.backitup')) {
                                dbInfo = true;
                            }
                        }
                        else {
                            const isWin = process.platform.startsWith('win');
                            if (isWin) {
                                systemInfo = 'win';
                            }
                        }
                        try {
                            this.sendTo(obj.from, obj.command, {
                                systemOS: systemInfo,
                                dockerDB: dbInfo,
                                backupDir: (0, node_path_1.join)(tools.getIobDir(), 'backups'),
                            }, obj.callback);
                        }
                        catch (err) {
                            if (err) {
                                this.log.error(err);
                            }
                        }
                    }
                    break;
                case 'getFileSystemInfo':
                    if (obj) {
                        const sysCheck = await systemCheck.storageSizeCheck(this, 'nexowatt-backup', this.log);
                        if (sysCheck) {
                            try {
                                this.sendTo(obj.from, obj.command, sysCheck, obj.callback);
                            }
                            catch (err) {
                                if (err) {
                                    this.log.error(err);
                                }
                            }
                        }
                    }
                    break;
                case 'getSdCardTargets':
                    if (obj.callback) {
                        const selected = obj.message && typeof obj.message.selected === 'string'
                            ? obj.message.selected.trim()
                            : '';
                        try {
                            const targets = await (0, sdCard_1.discoverSdCardTargets)();
                            const result = targets.map(target => ({
                                label: target.label,
                                value: target.mountPoint,
                            }));
                            if (selected && !result.some(entry => entry.value === selected)) {
                                result.unshift({
                                    label: `Nicht verfügbar / nicht eingebunden: ${selected}`,
                                    value: selected,
                                });
                            }
                            this.sendTo(obj.from, obj.command, result, obj.callback);
                        }
                        catch (error) {
                            this.log.warn(`SD-Karten konnten nicht ermittelt werden: ${error.message}`);
                            const result = selected
                                ? [{ label: `Nicht verfügbar / nicht eingebunden: ${selected}`, value: selected }]
                                : [];
                            this.sendTo(obj.from, obj.command, result, obj.callback);
                        }
                    }
                    break;
                case 'testSdCardTarget':
                    if (obj.callback) {
                        const mountPath = obj.message && typeof obj.message.mountPath === 'string'
                            ? obj.message.mountPath
                            : '';
                        const subDir = obj.message && typeof obj.message.subDir === 'string'
                            ? obj.message.subDir
                            : 'nexowatt-eos-backups';
                        try {
                            const target = await (0, sdCard_1.validateSdCardTarget)(mountPath, subDir, {
                                createDirectory: true,
                                writeTest: true,
                            });
                            this.sendTo(obj.from, obj.command, `SD-Karte bereit: ${target.device} · Ziel ${target.backupDir} · frei ${(0, sdCard_1.formatSdCardFreeSpace)(target.freeBytes)}`, obj.callback);
                        }
                        catch (error) {
                            const message = error.message || String(error);
                            this.log.warn(`SD-Karten-Prüfung fehlgeschlagen: ${message}`);
                            this.sendTo(obj.from, obj.command, { error: message }, obj.callback);
                        }
                    }
                    break;
                case 'testWebDAV':
                    if (obj.message) {
                        // webdav is ESM only, so it has to be pulled in with a dynamic import
                        const { createClient } = await import('webdav');
                        // eslint-disable-next-line @typescript-eslint/no-require-imports
                        const agent = new (require('node:https').Agent)({
                            rejectUnauthorized: Boolean(obj.message.config.signedCertificates),
                        });
                        const client = createClient(obj.message.config.host, {
                            username: obj.message.config.username,
                            password: obj.message.config.password,
                            maxBodyLength: Infinity,
                            httpsAgent: agent,
                        });
                        void client
                            .getDirectoryContents('')
                            .then(contents => obj.callback && this.sendTo(obj.from, obj.command, contents, obj.callback))
                            .catch(err => this.sendTo(obj.from, obj.command, { error: JSON.stringify(err.message) }, obj.callback));
                    }
                    break;
                case 'slaveBackup':
                    if (obj?.message) {
                        if (this.config.hostType === 'Slave') {
                            this.log.debug('Slave Backup started ...');
                            const type = 'iobroker';
                            let config;
                            try {
                                config = JSON.parse(JSON.stringify(this.backupConfig[type]));
                                config.enabled = true;
                                // do delete files with specification from Master
                                config.deleteBackupAfter = obj.message.config.deleteAfter
                                    ? obj.message.config.deleteAfter
                                    : 0;
                            }
                            catch (e) {
                                this.log.warn(`backup error: ${e} ... please check your config and try again!!`);
                            }
                            void this.startBackup(config, err => {
                                if (err) {
                                    this.log.error(`[${type}] ${err}`);
                                }
                                else {
                                    this.log.debug(`[${type}] exec: done`);
                                }
                                const reply = (value) => {
                                    if (value === null) {
                                        return;
                                    }
                                    try {
                                        this.sendTo(obj.from, obj.command, value, obj.callback);
                                    }
                                    catch (err) {
                                        if (err) {
                                            this.log.error(err);
                                        }
                                        this.log.error('slave Backup not finish!');
                                    }
                                };
                                this.timerOutput = setTimeout(() => this.readRunResult(type, value => {
                                    reply(value);
                                    if (this.config.onedriveEnabled) {
                                        void this.renewOnedriveToken();
                                    }
                                }, reply), 500);
                                void this.setState(`oneClick.${type}`, false, true);
                            });
                        }
                        else {
                            this.log.warn('Your NexoWatt EOS Backup instance is not configured as a slave');
                            this.sendTo(obj.from, obj.command, 'not configured as a slave', obj.callback);
                        }
                    }
                    break;
                case 'slaveInstance':
                    if (obj && obj.command === 'slaveInstance' && obj.message && obj.message.instance) {
                        const resultInstances = [];
                        const instances = await this.getObjectViewAsync('system', 'instance', {
                            startkey: `system.adapter.${obj.message.instance}.`,
                            endkey: `system.adapter.${obj.message.instance}.\u9999`,
                        }).catch(err => this.log.error(err));
                        if (instances && instances.rows && instances.rows.length != 0) {
                            instances.rows.forEach(row => {
                                if (row.id.replace('system.adapter.', '') != this.namespace) {
                                    resultInstances.push({
                                        label: row.id.replace('system.adapter.', ''),
                                        value: row.id.replace('system.adapter.', ''),
                                    });
                                }
                            });
                        }
                        this.sendTo(obj.from, obj.command, resultInstances, obj.callback);
                    }
                    break;
                case 'getLog': {
                    const logName = (0, node_path_1.join)(bashDir, `${this.namespace}.log`).replace(/\\/g, '/');
                    if ((0, node_fs_1.existsSync)(logName) && (obj?.message.backupName || obj?.message.timestamp)) {
                        const data = (0, node_fs_1.readFileSync)(logName, 'utf8');
                        const backupLog = JSON.parse(data);
                        const backupName = obj?.message.backupName ? obj.message.backupName : null;
                        const timestamp = obj?.message.timestamp;
                        let found = false;
                        backupLog.forEach((item, index) => {
                            if (Object.prototype.hasOwnProperty.call(item, timestamp)) {
                                found = true;
                                this.log.debug(`Printing logs of previous backup`);
                                this.sendTo(obj.from, obj.command, item[timestamp], obj.callback);
                            }
                            else if (backupName !== null && Object.prototype.hasOwnProperty.call(item, backupName)) {
                                found = true;
                                this.log.debug(`Printing logs of previous backup`);
                                this.sendTo(obj.from, obj.command, item[backupName], obj.callback);
                            }
                            else if (backupLog.length - 1 == index && !found) {
                                this.log.debug(`No Backuplogs found`);
                                this.sendTo(obj.from, obj.command, tools._('No log is available for this backup', this.systemLang), obj.callback);
                            }
                        });
                    }
                    break;
                }
            }
        }
    }
    /**
     * Writes the current DropBox access token into every storage slice of the config.
     *
     * @param config the assembled backup config, mutated in place
     */
    async updateAccessTokens(config) {
        if (this.dropBoxTokenRefresher) {
            try {
                const accessToken = await this.dropBoxTokenRefresher.getAccessToken();
                Object.keys(config).forEach(key => {
                    if (config[key] && typeof config[key] === 'object') {
                        if (config[key].dropbox) {
                            config[key].dropbox.accessToken = accessToken;
                        }
                        else {
                            Object.keys(config[key]).forEach(subKey => {
                                if (config[key][subKey]?.dropbox) {
                                    config[key][subKey].dropbox.accessToken = accessToken;
                                }
                            });
                        }
                    }
                });
            }
            catch (e) {
                this.log.error(`Cannot get access tokens for DropBox: ${e}`);
            }
        }
    }
    /**
     * Runs one backup, queueing behind a run that is still in progress.
     *
     * @param config the backup type's slice of the assembled config
     * @param cb reports the outcome
     */
    async startBackup(config, cb) {
        try {
            this.assertLicensedOperation();
        }
        catch {
            cb?.('EOS_LICENSE_REQUIRED');
            return;
        }
        if (this.taskRunning) {
            setTimeout(() => void this.startBackup(config, cb), 10000);
            return;
        }
        // await this.updateAccessTokens(config);
        this.taskRunning = true;
        try {
            (0, execute_1.default)(this, config, err => {
                this.taskRunning = false;
                cb?.(err);
            });
            this.log.debug('Backup has started ...');
        }
        catch (e) {
            this.log.warn(`Backup error: ${e.stack}`);
            this.log.warn(`Backup error: ${e} ... please check your config and and try again!!`);
        }
    }
    /**
     * Writes the history states after a finished run and, for a master, kicks off the slave backups.
     *
     * @param type `'iobroker'` or `'ccu'`
     * @param onSuccess extra work once the run is confirmed successful
     * @param onFailure extra work once the run is confirmed failed
     */
    readRunResult(type, onSuccess, onFailure) {
        void this.getState('output.line', (err, state) => {
            if (state && state.val === '[EXIT] 0') {
                void this.setState(`history.${type}Success`, true, true);
                void this.setState(`history.${type}LastTime`, tools.getTimeString(this.systemLang), true);
                onSuccess?.(state.val);
            }
            else {
                void this.setState(`history.${type}LastTime`, `error: ${tools.getTimeString(this.systemLang)}`, true);
                void this.setState(`history.${type}Success`, false, true);
                onFailure?.(state?.val ? state.val : null);
            }
        });
    }
    /**
     * Rejects a message that arrived without the parameters its command needs.
     *
     * Up to and including 4.x these branches called `obj.callback({ error: 'Invalid parameters' })`.
     * `obj.callback` is the `{ message, id, ack, time }` descriptor js-controller attaches, not a
     * function, so the call threw "obj.callback is not a function" out of the async message handler
     * and the sender never got an answer. The reply now goes out the same way as in every other
     * branch of this handler.
     *
     * @param obj the incoming message
     */
    invalidParameters(obj) {
        this.sendTo(obj.from, obj.command, { error: 'Invalid parameters' }, obj.callback);
    }
    async checkStates() {
        // Fill empty data points with default values
        const historyState = await this.getStateAsync('history.html');
        if (!historyState || historyState.val === null) {
            await this.setStateAsync('history.html', {
                val: `<span class="backup-type-total">${tools._('No backups yet', this.systemLang)}</span>`,
                ack: true,
            });
        }
        const iobrokerLastTime = await this.getStateAsync('history.iobrokerLastTime');
        if (!iobrokerLastTime || iobrokerLastTime.val === null) {
            await this.setStateAsync('history.iobrokerLastTime', {
                val: tools._('No backups yet', this.systemLang),
                ack: true,
            });
        }
        const ccuLastTime = await this.getStateAsync('history.ccuLastTime');
        if (!ccuLastTime || ccuLastTime.val === null) {
            await this.setStateAsync('history.ccuLastTime', {
                val: tools._('No backups yet', this.systemLang),
                ack: true,
            });
        }
        const iobrokerState = await this.getStateAsync('oneClick.iobroker');
        if (!iobrokerState || iobrokerState.val === null || iobrokerState.val === true) {
            await this.setStateAsync('oneClick.iobroker', { val: false, ack: true });
        }
        const ccuState = await this.getStateAsync('oneClick.ccu');
        if (!ccuState || ccuState.val === null || ccuState.val === true) {
            await this.setStateAsync('oneClick.ccu', { val: false, ack: true });
        }
        const ccuSuccess = await this.getStateAsync('history.ccuSuccess');
        if (!ccuSuccess || ccuSuccess.val === null) {
            await this.setStateAsync('history.ccuSuccess', { val: false, ack: true });
        }
        const iobrokerSuccess = await this.getStateAsync('history.iobrokerSuccess');
        if (!iobrokerSuccess || iobrokerSuccess.val === null) {
            await this.setStateAsync('history.iobrokerSuccess', { val: false, ack: true });
        }
        const jsonState = await this.getStateAsync('history.json');
        if (!jsonState || jsonState.val === null) {
            await this.setStateAsync('history.json', { val: '[]', ack: true });
        }
    }
    // function to create Backup schedules (Backup time)
    createBackupSchedule() {
        this.assertLicensedOperation();
        for (const type in this.backupConfig) {
            if (!Object.prototype.hasOwnProperty.call(this.backupConfig, type)) {
                continue;
            }
            const config = this.backupConfig[type];
            if (config.enabled === true || config.enabled === 'true') {
                const time = config.ownCron ? config.cronjob : config.time.split(':');
                const backupInfo = config.ownCron
                    ? `with Cronjob "${config.cronjob}"`
                    : `at ${config.time} every ${config.everyXDays} day(s)`;
                this.log.info(`[${type}] backup will be activated ${backupInfo}`);
                if (this.backupTimeSchedules[type]) {
                    this.backupTimeSchedules[type].cancel();
                }
                const cron = config.ownCron ? time : `10 ${time[1]} ${time[0]} */${config.everyXDays} * * `;
                this.backupTimeSchedules[type] = schedule.scheduleJob(cron, async () => {
                    if (!this.operationalReady || !this.licenseGuard.isAllowed())
                        return;
                    const sysCheck = await systemCheck.storageSizeCheck(this, 'nexowatt-backup', this.log);
                    if ((sysCheck && sysCheck.ready && sysCheck.ready === true) || this.config.cifsEnabled === true) {
                        void this.setState(`oneClick.${type}`, true, true);
                        void this.startBackup(this.backupConfig[type], err => {
                            if (err) {
                                this.log.error(`[${type}] ${err}`);
                            }
                            else {
                                this.log.debug(`[${type}] exec: done`);
                            }
                            this.timerOutput2 = setTimeout(() => this.readRunResult(type, () => {
                                if (this.config.onedriveEnabled && this.config.hostType === 'Single') {
                                    void this.renewOnedriveToken();
                                }
                            }), 500);
                            void this.nextBackup(false, type);
                            void this.setState(`oneClick.${type}`, false, true);
                            if (this.config.slaveInstance && type === 'iobroker' && this.config.hostType === 'Master') {
                                this.log.debug('Slave backup from NexoWatt EOS Backup master is started ...');
                                void this.startSlaveBackup(this.config.slaveInstance[0], null);
                            }
                        });
                    }
                    else {
                        this.log.error(`A local backup is currently not possible. The storage space is currently only ${sysCheck && sysCheck.diskFree ? sysCheck.diskFree : null} MB`);
                        systemCheck.systemMessage(this, tools._('A local backup is currently not possible. Please check your System!', this.systemLang));
                    }
                });
                if (config.debugging) {
                    this.log.debug(`[${type}] ${cron}`);
                }
            }
            else if (this.backupTimeSchedules[type]) {
                this.log.info(`[${type}] backup deactivated`);
                this.backupTimeSchedules[type].cancel();
                this.backupTimeSchedules[type] = null;
            }
        }
    }
    /**
     * Builds `this.backupConfig` from the instance configuration.
     *
     * @param secret the system secret the stored passwords were encrypted with
     */
    async initConfig(secret) {
        // Snapshotted: the notification slices below use it as a property shorthand.
        const systemLang = this.systemLang;
        // compatibility
        if (this.config.cifsMount === 'CIFS') {
            this.config.cifsMount = '';
        }
        if (this.config.redisEnabled === undefined) {
            this.config.redisEnabled = this.config.backupRedis;
        }
        let ioPath;
        try {
            // ioPath = `${ioCommon.tools.getControllerDir()}/iobroker.js`; Todo: Error by iob Backup (no such file or directory, uv_cwd)
            // ioPath = require.resolve('iobroker.js-controller/iobroker.js');
            // Two levels up: this file compiles to build/main.js, so `__dirname` is
            // <adapter>/build and the sibling adapters live one directory above that.
            ioPath = (0, node_path_1.resolve)(__dirname, '../../iobroker.js-controller/iobroker.js');
        }
        catch (e) {
            this.log.error(`Unable to read iobroker path: +${e}`);
        }
        if (!this.eventPasswordsDecrypted) {
            this.decryptEvents(secret);
            this.eventPasswordsDecrypted = true;
        }
        const hostName = this.config.minimalNameSuffix ? this.config.minimalNameSuffix.replace(/[.;, ]/g, '_') : '';
        const ignoreErrors = this.config.ignoreErrors;
        const notificationsType = this.config.notificationsType;
        const notificationEnabled = this.config.notificationEnabled;
        const telegram = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.telegramInstance,
            SilentNotice: this.config.telegramSilentNotice,
            NoticeType: this.config.telegramNoticeType,
            User: this.config.telegramUser,
            onlyError: this.config.telegramOnlyError,
            telegramWaiting: this.config.telegramWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const whatsapp = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.whatsappInstance,
            NoticeType: this.config.whatsappNoticeType,
            onlyError: this.config.whatsappOnlyError,
            whatsappWaiting: this.config.whatsappWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const gotify = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.gotifyInstance,
            NoticeType: this.config.gotifyNoticeType,
            onlyError: this.config.gotifyOnlyError,
            gotifyWaiting: this.config.gotifyWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const signal = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.signalInstance,
            NoticeType: this.config.signalNoticeType,
            onlyError: this.config.signalOnlyError,
            signalWaiting: this.config.signalWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const matrix = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.matrixInstance,
            NoticeType: this.config.matrixNoticeType,
            onlyError: this.config.matrixOnlyError,
            matrixWaiting: this.config.matrixWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const discord = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.discordInstance,
            NoticeType: this.config.discordNoticeType,
            target: this.config.discordTarget,
            onlyError: this.config.discordOnlyError,
            discordWaiting: this.config.discordWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const pushover = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.pushoverInstance,
            SilentNotice: this.config.pushoverSilentNotice,
            NoticeType: this.config.pushoverNoticeType,
            deviceID: this.config.pushoverDeviceID,
            onlyError: this.config.pushoverOnlyError,
            pushoverWaiting: this.config.pushoverWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const email = {
            enabled: notificationEnabled,
            notificationsType,
            type: 'message',
            instance: this.config.emailInstance,
            NoticeType: this.config.emailNoticeType,
            emailReceiver: this.config.emailReceiver,
            emailSender: this.config.emailSender,
            onlyError: this.config.emailOnlyError,
            emailWaiting: this.config.emailWaitToSend * 1000,
            hostName,
            ignoreErrors,
            systemLang,
        };
        const notification = {
            type: 'message',
            ignoreErrors,
            bashDir: bashDir,
            entriesNumber: this.config.historyEntriesNumber,
            systemLang,
        };
        const historyHTML = {
            enabled: true,
            type: 'message',
            entriesNumber: this.config.historyEntriesNumber,
            ignoreErrors,
            systemLang,
        };
        const historyJSON = {
            enabled: true,
            type: 'message',
            entriesNumber: this.config.historyEntriesNumber,
            ignoreErrors,
            systemLang,
        };
        const ftp = {
            enabled: this.config.ftpEnabled,
            type: 'storage',
            source: this.config.restoreSource,
            host: this.config.ftpHost, // ftp-host
            debugging: this.config.debugLevel,
            deleteOldBackup: this.config.ftpDeleteOldBackup, // Delete old Backups from FTP
            ftpDeleteAfter: this.config.ftpDeleteAfter,
            advancedDelete: this.config.advancedDelete,
            ownDir: this.config.ftpOwnDir,
            bkpType: this.config.restoreType,
            dir: this.config.ftpOwnDir === true ? null : this.config.ftpDir, // directory on FTP server
            dirMinimal: this.config.ftpMinimalDir,
            user: this.config.ftpUser, // username for FTP Server
            pass: this.config.ftpPassword || '', // password for FTP Server
            port: this.config.ftpPort || 21, // FTP port
            secure: this.config.ftpSecure || false, // secure FTP connection
            signedCertificates: this.config.ftpSignedCertificates || true,
            ignoreErrors,
        };
        let accessToken = '';
        if (this.config.dropboxEnabled) {
            this.dropBoxTokenRefresher = new tokenRefresher_1.default(this, 'info.dropboxTokens', 'https://oauth2.iobroker.in/dropbox');
            try {
                accessToken = await this.dropBoxTokenRefresher.getAccessToken();
            }
            catch (e) {
                this.log.error(`No DropBox token found: ${e}`);
            }
        }
        const dropbox = {
            enabled: this.config.dropboxEnabled,
            type: 'storage',
            source: this.config.restoreSource,
            debugging: this.config.debugLevel,
            deleteOldBackup: this.config.dropboxDeleteOldBackup, // Delete old Backups from Dropbox
            dropboxDeleteAfter: this.config.dropboxDeleteAfter,
            advancedDelete: this.config.advancedDelete,
            accessToken: this.config.dropboxTokenType === 'custom' ? this.config.dropboxAccessToken : accessToken,
            dropboxAccessJson: this.config.dropboxAccessJson,
            dropboxTokenType: this.config.dropboxTokenType,
            ownDir: this.config.dropboxOwnDir,
            bkpType: this.config.restoreType,
            dir: this.config.dropboxOwnDir === true ? null : this.config.dropboxDir,
            dirMinimal: this.config.dropboxMinimalDir,
            ignoreErrors,
        };
        const onedrive = {
            enabled: this.config.onedriveEnabled,
            type: 'storage',
            source: this.config.restoreSource,
            debugging: this.config.debugLevel,
            deleteOldBackup: this.config.onedriveDeleteOldBackup, // Delete old Backups from Onedrive
            onedriveDeleteAfter: this.config.onedriveDeleteAfter,
            advancedDelete: this.config.advancedDelete,
            onedriveAccessJson: this.config.onedriveAccessJson,
            ownDir: this.config.onedriveOwnDir,
            bkpType: this.config.restoreType,
            dir: this.config.onedriveOwnDir === true ? null : this.config.onedriveDir,
            dirMinimal: this.config.onedriveMinimalDir,
            ignoreErrors,
        };
        const webdav = {
            enabled: this.config.webdavEnabled,
            type: 'storage',
            source: this.config.restoreSource,
            debugging: this.config.debugLevel,
            deleteOldBackup: this.config.webdavDeleteOldBackup, // Delete old Backups from webdav
            webdavDeleteAfter: this.config.webdavDeleteAfter,
            advancedDelete: this.config.advancedDelete,
            username: this.config.webdavUsername,
            pass: this.config.webdavPassword || '', // webdav password
            url: this.config.webdavURL,
            ownDir: this.config.webdavOwnDir,
            bkpType: this.config.restoreType,
            dir: this.config.webdavOwnDir === true ? null : this.config.webdavDir,
            dirMinimal: this.config.webdavMinimalDir,
            signedCertificates: this.config.webdavSignedCertificates,
            ignoreErrors,
        };
        const googledrive = {
            enabled: this.config.googledriveEnabled,
            type: 'storage',
            source: this.config.restoreSource,
            debugging: this.config.debugLevel,
            deleteOldBackup: this.config.googledriveDeleteOldBackup, // Delete old Backups from google drive
            googledriveDeleteAfter: this.config.googledriveDeleteAfter,
            advancedDelete: this.config.advancedDelete,
            accessJson: this.config.googledriveAccessTokens || this.config.googledriveAccessJson,
            newToken: !!this.config.googledriveAccessTokens,
            ownDir: this.config.googledriveOwnDir,
            bkpType: this.config.restoreType,
            dir: this.config.googledriveOwnDir === true ? null : this.config.googledriveDir,
            dirMinimal: this.config.googledriveMinimalDir,
            ignoreErrors,
        };
        const sdCardMode = this.config.connectType === 'SDCard';
        const sdCardBackupDir = (0, sdCard_1.resolveSdCardBackupDir)(this.config.sdCardMountPath, this.config.sdCardBackupSubDir);
        const cifs = {
            enabled: this.config.cifsEnabled,
            mountType: this.config.connectType,
            type: 'storage',
            source: this.config.restoreSource,
            mount: sdCardMode ? this.config.sdCardMountPath : this.config.cifsMount,
            debugging: this.config.debugLevel,
            fileDir: bashDir,
            wakeOnLAN: sdCardMode ? false : this.config.wakeOnLAN,
            macAd: this.config.macAd,
            wolTime: this.config.wolWait,
            wolPort: this.config.wolPort || 9,
            wolExtra: this.config.wolExtra,
            smb: this.config.smbType,
            sudo: this.config.sudoMount,
            cifsDomain: this.config.cifsDomain,
            clientInodes: this.config.noserverino,
            cacheLoose: this.config.cacheLoose,
            deleteOldBackup: this.config.cifsDeleteOldBackup, //Delete old Backups from Network Disk
            ownDir: sdCardMode ? false : this.config.cifsOwnDir,
            bkpType: this.config.restoreType,
            dir: sdCardMode
                ? sdCardBackupDir
                : this.config.cifsOwnDir === true
                    ? null
                    : this.config.cifsDir, // specify if CIFS mount should be used
            dirMinimal: sdCardMode ? sdCardBackupDir : this.config.cifsMinimalDir,
            sdCardMountPath: this.config.sdCardMountPath,
            sdCardBackupSubDir: this.config.sdCardBackupSubDir,
            sdCardInfluxRetention: Number(this.config.sdCardInfluxRetention) || 3,
            user: this.config.cifsUser, // specify if CIFS mount should be used
            pass: this.config.cifsPassword || '', // password for NAS Server
            expertMount: this.config.expertMount,
            ignoreErrors,
        };
        /**
         * Every backup slice carries its own copy of the six storage configs, with the target directory
         * swapped for the per-backup-type one when "own directory" is on. The original spelled these six
         * `Object.assign` lines out at each of the sixteen slices.
         *
         * Must be called per slice - each slice needs its own copies.
         *
         * @param variant which set of per-type directories to use
         */
        const storagesFor = (variant) => ({
            ftp: Object.assign({}, ftp, this.config.ftpOwnDir === true ? { dir: this.config[`ftp${variant}Dir`] } : {}),
            cifs: Object.assign({}, cifs, !sdCardMode && this.config.cifsOwnDir === true
                ? { dir: this.config[`cifs${variant}Dir`] }
                : {}),
            dropbox: Object.assign({}, dropbox, this.config.dropboxOwnDir === true ? { dir: this.config[`dropbox${variant}Dir`] } : {}),
            onedrive: Object.assign({}, onedrive, this.config.onedriveOwnDir === true ? { dir: this.config[`onedrive${variant}Dir`] } : {}),
            webdav: Object.assign({}, webdav, this.config.webdavOwnDir === true ? { dir: this.config[`webdav${variant}Dir`] } : {}),
            googledrive: Object.assign({}, googledrive, this.config.googledriveOwnDir === true ? { dir: this.config[`googledrive${variant}Dir`] } : {}),
        });
        // names addition, appended to the file name
        const nameSuffix = this.config.minimalNameSuffix.replace(/[.;, ]/g, '_');
        const slaveSuffix = this.config.hostType === 'Slave' ? this.config.slaveNameSuffix : '';
        const hostType = this.config.hostType;
        const iobDataDir = (0, node_path_1.join)(tools.getIobDir(), 'iobroker-data');
        // Configurations for standard-IoBroker backup
        this.backupConfig.iobroker = {
            name: 'iobroker',
            type: 'creator',
            workDir: ioPath,
            enabled: this.config.minimalEnabled,
            time: this.config.minimalTime,
            cronjob: this.config.iobrokerCronJob,
            ownCron: this.config.iobrokerCron,
            debugging: this.config.debugLevel,
            slaveBackup: this.config.hostType,
            everyXDays: this.config.minimalEveryXDays,
            nameSuffix,
            deleteBackupAfter: this.config.minimalDeleteAfter, // delete old backup files after x days
            ...storagesFor('Minimal'),
            ignoreErrors,
            nexowattEOS: {
                enabled: this.config.eosProfileEnabled,
                type: 'support',
                nameSuffix,
                includeVendorFile: this.config.eosIncludeVendorFile,
                includeVendorSecret: this.config.eosIncludeVendorSecret,
                adapterVersion: this.version,
                ignoreErrors,
            },
            mysql: {
                enabled: this.config.mySqlEnabled === undefined ? true : this.config.mySqlEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                nameSuffix,
                mysqlQuick: this.config.mysqlQuick,
                slaveSuffix,
                hostType,
                mysqlSingleTransaction: this.config.mysqlSingleTransaction,
                dbName: this.config.mySqlName, // database name
                user: this.config.mySqlUser, // database user
                pass: this.config.mySqlPassword || '', // database password
                deleteBackupAfter: this.config.mySqlDeleteAfter, // delete old backupfiles after x days
                host: this.config.mySqlHost, // database host
                port: this.config.mySqlPort, // database port
                mySqlEvents: this.config.mySqlEvents,
                mySqlMulti: this.config.mySqlMulti,
                ignoreErrors,
                skipSSL: this.config.mysqlSkipSSL,
                exe: this.config.mySqlDumpExe, // path to mysqldump
            },
            sqlite: {
                enabled: this.config.sqliteEnabled === undefined ? true : this.config.sqliteEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                nameSuffix,
                slaveSuffix,
                hostType,
                deleteBackupAfter: this.config.sqliteDeleteAfter, // delete old backupfiles after x days
                ignoreErrors,
                filePth: this.config.sqlitePath,
                exe: this.config.sqliteDumpExe, // path to sqlitedump
            },
            dir: tools.getIobDir(),
            influxDB: {
                enabled: this.config.influxDBEnabled === undefined ? true : this.config.influxDBEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                nameSuffix,
                slaveSuffix,
                hostType,
                deleteBackupAfter: this.config.influxDBDeleteAfter, // delete old backupfiles after x days
                dbName: this.config.influxDBName, // database name
                host: this.config.influxDBHost, // database host
                port: this.config.influxDBPort
                    ? this.config.influxDBPort
                    : this.config.influxDBVersion == '1.x'
                        ? 8088
                        : 8086,
                dbversion: this.config.influxDBVersion, // dbversion from Influxdb
                token: this.config.influxDBToken, // Token from Influxdb
                protocol: this.config.influxDBProtocol, // Protocol Type from Influxdb
                exe: this.config.influxDBDumpExe, // path to influxDBdump
                dbType: this.config.influxDBType, // type of influxdb Backup
                influxDBEvents: this.config.influxDBEvents,
                influxDBMulti: this.config.influxDBMulti,
                ignoreErrors,
                deleteDataBase: this.config.deleteOldDataBase, // delete old database for restore
            },
            pgsql: {
                enabled: this.config.pgSqlEnabled === undefined ? true : this.config.pgSqlEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                nameSuffix,
                slaveSuffix,
                hostType,
                dbName: this.config.pgSqlName, // database name
                user: this.config.pgSqlUser, // database user
                pass: this.config.pgSqlPassword || '', // database password
                deleteBackupAfter: this.config.pgSqlDeleteAfter, // delete old backupfiles after x days
                host: this.config.pgSqlHost, // database host
                port: this.config.pgSqlPort, // database port
                pgSqlEvents: this.config.pgSqlEvents,
                pgSqlMulti: this.config.pgSqlMulti,
                ignoreErrors,
                exe: this.config.pgSqlDumpExe, // path to mysqldump
            },
            redis: {
                enabled: this.config.redisEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                aof: this.config.redisAOFactive,
                nameSuffix,
                slaveSuffix,
                hostType,
                path: this.config.redisPath || '/var/lib/redis', // specify Redis path
                redisType: this.config.redisType, // local or Remote Backup
                host: this.config.redisHost, // Host for Remote Backup
                port: this.config.redisPort, // Port for Remote Backup
                user: this.config.redisUser, // User for Remote Backup
                pass: this.config.redisPassword || '', // Password for Remote Backup
                ignoreErrors,
            },
            historyDB: {
                enabled: this.config.historyEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                path: this.config.historyPath,
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
            },
            zigbee: {
                enabled: this.config.zigbeeEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                path: iobDataDir, // specify zigbee path
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
            },
            esphome: {
                enabled: this.config.esphomeEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                path: iobDataDir, // specify esphome path
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
            },
            zigbee2mqtt: {
                enabled: this.config.zigbee2mqttEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                path: this.config.zigbee2mqttPath, // specify zigbee2mqtt path
                z2mType: this.config.zigbee2mqttType,
                z2mUsername: this.config.zigbee2mqttUser,
                z2mPassword: this.config.zigbee2mqttPassword,
                z2mUrl: this.config.zigbee2mqttHost,
                z2mPort: this.config.zigbee2mqttPort,
                z2mBaseTopic: this.config.zigbee2mqttBaseTopic,
                z2mAuth: this.config.zigbee2mqttAuth,
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
            },
            nodered: {
                enabled: this.config.noderedEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                path: iobDataDir, // specify Node-Red path
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
            },
            yahka: {
                enabled: this.config.yahkaEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                path: iobDataDir, // specify yahka path
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
            },
            jarvis: {
                enabled: this.config.jarvisEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                path: iobDataDir, // specify jarvis backup path
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
            },
            javascripts: {
                enabled: this.config.javascriptsEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                slaveSuffix,
                hostType,
                nameSuffix,
                ignoreErrors,
            },
            grafana: {
                enabled: this.config.grafanaEnabled,
                type: 'creator',
                ...storagesFor('Minimal'),
                host: this.config.grafanaHost, // database host
                port: this.config.grafanaPort, // database port
                protocol: this.config.grafanaProtocol, // database protocol
                apiKey: this.config.grafanaApiKey,
                nameSuffix,
                slaveSuffix,
                hostType,
                ignoreErrors,
                signedCertificates: this.config.grafanaProtocol == 'https' ? this.config.grafanaSignedCertificates : true,
            },
            historyHTML,
            historyJSON,
            telegram,
            email,
            pushover,
            whatsapp,
            gotify,
            signal,
            matrix,
            discord,
            notification,
        };
        // Configurations for CCU / pivCCU / RaspberryMatic backup
        this.backupConfig.ccu = {
            name: 'ccu',
            type: 'creator',
            enabled: this.config.ccuEnabled,
            time: this.config.ccuTime,
            cronjob: this.config.ccuCronJob,
            ownCron: this.config.ccuCron,
            debugging: this.config.debugLevel,
            everyXDays: this.config.ccuEveryXDays,
            nameSuffix: this.config.ccuNameSuffix, // names addition, appended to the file name
            deleteBackupAfter: this.config.ccuDeleteAfter, // delete old backupfiles after x days
            signedCertificates: this.config.ccuSignedCertificates,
            ignoreErrors,
            ...storagesFor('Ccu'),
            historyHTML,
            historyJSON,
            telegram,
            email,
            pushover,
            whatsapp,
            gotify,
            signal,
            matrix,
            discord,
            notification,
            host: this.config.ccuHost, // IP-address CCU
            user: this.config.ccuUser, // username CCU
            usehttps: this.config.ccuUsehttps, // Use https for CCU Connect
            pass: this.config.ccuPassword || '', // password der CCU
            ccuEvents: this.config.ccuEvents,
            ccuMulti: this.config.ccuMulti,
        };
    }
    readLogFile() {
        try {
            const logName = (0, node_path_1.join)(tools.getIobDir(), 'backups', 'logs.txt').replace(/\\/g, '/');
            if ((0, node_fs_1.existsSync)(logName)) {
                this.log.debug(`Printing logs of previous backup`);
                const text = (0, node_fs_1.readFileSync)(logName).toString();
                const lines = text.split('\n');
                lines.forEach((line, i) => (lines[i] = line.replace(/\r$|^\r/, '')));
                lines.forEach(line => {
                    line = line.trim();
                    if (line) {
                        if (line.startsWith('[ERROR]')) {
                            this.log.error(line);
                        }
                        else {
                            this.log.debug(line);
                        }
                        void this.setState('output.line', line, true);
                    }
                });
                void this.setState('output.line', '[EXIT] 0', true);
                (0, node_fs_1.unlinkSync)(logName);
            }
        }
        catch (e) {
            this.log.warn(`Cannot read log file: ${e}`);
        }
    }
    createBashScripts() {
        const isWin = process.platform.startsWith('win');
        if (!(0, node_fs_1.existsSync)(bashDir)) {
            (0, node_fs_1.mkdirSync)(bashDir);
            this.log.debug('NexoWatt EOS Backup data directory created');
        }
        const logFile = (0, node_path_1.join)(bashDir, `${this.namespace}.log`);
        if (!(0, node_fs_1.existsSync)(logFile)) {
            (0, node_fs_1.writeFileSync)(logFile, '[]');
        }
        if (isWin) {
            this.log.debug(`NexoWatt EOS Backup has recognized a ${process.platform} system`);
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/stopIOB.bat`, `start "" "${(0, node_path_1.join)(bashDir, 'external.bat')}"`);
            }
            catch (e) {
                this.log.error(`cannot create stopIOB.bat: ${e}Please run "iobroker fix"`);
            }
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/external.bat`, `cd "${(0, node_path_1.join)(tools.getIobDir())}"\ncall iobroker stop\ntimeout /T 15\nif exist "${(0, node_path_1.join)(bashDir, '.redis.info')}" (\nredis-server --service-stop\n)\nif exist "${(0, node_path_1.join)(bashDir, '.redis.info')}" (\ncd "${(0, node_path_1.join)(__dirname, 'lib')}"\n) else (\ncd "${(0, node_path_1.join)(bashDir)}"\n)\nnode restore.js`);
                (0, node_fs_1.chmodSync)(`${bashDir}/external.bat`, 508);
            }
            catch (e) {
                this.log.error(`cannot create external.sh: ${e}Please run "iobroker fix"`);
            }
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/startIOB.bat`, `if exist "${(0, node_path_1.join)(bashDir, '.redis.info')}" (\nredis-server --service-start\n)\ncd "${(0, node_path_1.join)(tools.getIobDir())}"\ncall iobroker host this\ncall iobroker start\nif exist "${(0, node_path_1.join)(bashDir, '.startAll')}" (\ncd "${(0, node_path_1.join)(tools.getIobDir(), 'node_modules/iobroker.js-controller')}"\nnode iobroker.js start all\n)`);
            }
            catch (e) {
                this.log.error(`cannot create startIOB.bat: ${e}Please run "iobroker fix"`);
            }
        }
        else if ((0, node_fs_1.existsSync)('/opt/scripts/.docker_config/.thisisdocker')) {
            // Docker Image Support >= 5.2.0
            this.log.debug(`NexoWatt EOS Backup has recognized a Docker system`);
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/stopIOB.sh`, `#!/bin/bash\n# iobroker stop for restore\nbash ${bashDir}/external.sh`);
                (0, node_fs_1.chmodSync)(`${bashDir}/stopIOB.sh`, 508);
            }
            catch (e) {
                this.log.error(`cannot create stopIOB.sh: ${e}Please run "iobroker fix"`);
            }
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/startIOB.sh`, `#!/bin/bash\n# iobroker start after restore\nif [ -f ${bashDir}/.startAll ]; then\ncd "${(0, node_path_1.join)(tools.getIobDir())}"\niobroker start all;\nfi\nsleep 6\nbash /opt/scripts/maintenance.sh off -y`);
                (0, node_fs_1.chmodSync)(`${bashDir}/startIOB.sh`, 508);
            }
            catch (e) {
                this.log.error(`cannot create startIOB.sh: ${e}Please run "iobroker fix"`);
            }
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/external.sh`, `#!/bin/bash\n# restore\nbash /opt/scripts/maintenance.sh on -y -kbn\nsleep 3\nif [ -f ${bashDir}/.redis.info ]; then\ncd "${(0, node_path_1.join)(__dirname, 'lib')}"\nelse\ncd "${bashDir}"\nfi\nnode restore.js`);
                (0, node_fs_1.chmodSync)(`${bashDir}/external.sh`, 508);
            }
            catch (e) {
                this.log.error(`cannot create external.sh: ${e}Please run "iobroker fix"`);
            }
        }
        else {
            this.log.debug(`NexoWatt EOS Backup has recognized a ${process.platform} system`);
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/stopIOB.sh`, `# iobroker stop for restore\nsudo systemd-run --uid=iobroker bash ${bashDir}/external.sh`);
                (0, node_fs_1.chmodSync)(`${bashDir}/stopIOB.sh`, 508);
            }
            catch (e) {
                this.log.error(`cannot create stopIOB.sh: ${e}Please run "iobroker fix"`);
            }
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/startIOB.sh`, `# iobroker start after restore\nif [ -f ${bashDir}/.redis.info ]; then\nredis-cli shutdown nosave && echo "[DEBUG] [redis] Redis restart successfully"\nfi\nif [ -f ${bashDir}/.startAll ]; then\ncd "${(0, node_path_1.join)(tools.getIobDir())}"\nbash iobroker start all && echo "[EXIT] **** iobroker start upload all now... ****"\nfi\ncd "${(0, node_path_1.join)(tools.getIobDir())}"\nbash iobroker host this && echo "[DEBUG] [iobroker] Host this successfully"\nbash iobroker start && echo "[EXIT] **** iobroker restart now... ****"`);
                (0, node_fs_1.chmodSync)(`${bashDir}/startIOB.sh`, 508);
            }
            catch (e) {
                this.log.error(`cannot create startIOB.sh: ${e}Please run "iobroker fix"`);
            }
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/external.sh`, `# restore\ncd "${(0, node_path_1.join)(tools.getIobDir())}"\nbash iobroker stop && echo "[DEBUG] [iobroker] iobroker stop successfully"\nif [ -f ${bashDir}/.redis.info ]; then\ncd "${(0, node_path_1.join)(__dirname, 'lib')}"\nelse\ncd "${bashDir}"\nfi\nnode restore.js`);
                (0, node_fs_1.chmodSync)(`${bashDir}/external.sh`, 508);
            }
            catch (e) {
                this.log.error(`cannot create external.sh: ${e}Please run "iobroker fix"`);
            }
        }
    }
    // umount after restore
    umount() {
        const backupDir = (0, node_path_1.join)(tools.getIobDir(), 'backups');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const child_process = require('node:child_process');
        if ((0, node_fs_1.existsSync)(`${bashDir}/.mount`)) {
            child_process.exec(`mount | grep -o "${backupDir}"`, (error, stdout) => {
                if (stdout.includes(backupDir)) {
                    this.log.debug('mount activ... umount in 2 Seconds!!');
                    this.timerUmount1 = setTimeout(() => child_process.exec(`${this.config.sudoMount ? 'sudo umount' : 'umount'} ${backupDir}`, error => {
                        if (error) {
                            this.log.debug('umount: device is busy... wait 5 Minutes!!');
                            this.timerUmount2 = setTimeout(() => child_process.exec(`${this.config.sudoMount ? 'sudo umount' : 'umount'} -l ${backupDir}`, error => {
                                if (error) {
                                    this.log.error(error);
                                }
                                else {
                                    this.log.debug('umount successfully completed');
                                    this.removeMountMarker();
                                }
                            }), 300000);
                        }
                        else {
                            this.log.debug('umount successfully completed');
                            this.removeMountMarker();
                        }
                    }), 2000);
                }
                else {
                    this.log.debug('mount inactiv!!');
                }
            });
        }
    }
    /** Deletes the ".mount" marker, ignoring failures. */
    removeMountMarker() {
        try {
            if ((0, node_fs_1.existsSync)(`${bashDir}/.mount`)) {
                (0, node_fs_1.unlinkSync)(`${bashDir}/.mount`);
            }
        }
        catch {
            this.log.debug('file ".mount" not deleted ...');
        }
    }
    // Create Backupdir on first start
    createBackupDir() {
        if (!(0, node_fs_1.existsSync)((0, node_path_1.join)(tools.getIobDir(), 'backups'))) {
            try {
                (0, node_fs_1.mkdirSync)((0, node_path_1.join)(tools.getIobDir(), 'backups'));
                this.log.debug('Created BackupDir');
            }
            catch (e) {
                this.log.warn(`Backup folder not created: ${e}! Please run "iobroker fix" and try again or create the backup folder manually!!`);
            }
        }
    }
    // delete Hide Files after restore
    deleteHideFiles() {
        if ((0, node_fs_1.existsSync)(`${bashDir}/.redis.info`)) {
            (0, node_fs_1.unlinkSync)(`${bashDir}/.redis.info`);
        }
    }
    // delete temp dir after restore
    delTmp() {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(tools.getIobDir(), 'backups/tmp'))) {
            try {
                (0, node_fs_1.rmdirSync)((0, node_path_1.join)(tools.getIobDir(), 'backups/tmp'));
                this.log.debug('delete tmp files');
            }
            catch (e) {
                this.log.warn(`can not delete tmp files: ${e}Please run "iobroker fix" and try again or delete the tmp folder manually!!`);
            }
        }
    }
    // set start Options after restore
    setStartAll() {
        if (this.config.startAllRestore && !(0, node_fs_1.existsSync)(`${bashDir}/.startAll`)) {
            try {
                (0, node_fs_1.writeFileSync)(`${bashDir}/.startAll`, 'Start all Adapter after Restore');
                this.log.debug('Start all Adapter after Restore enabled');
            }
            catch (e) {
                this.log.warn(`can not create startAll files: ${e}Please run "iobroker fix" and try again`);
            }
        }
        else if (!this.config.startAllRestore && (0, node_fs_1.existsSync)(`${bashDir}/.startAll`)) {
            try {
                (0, node_fs_1.unlinkSync)(`${bashDir}/.startAll`);
                this.log.debug('Start all Adapter after Restore disabled');
            }
            catch (e) {
                this.log.warn(`can not delete startAll file: ${e}Please run "iobroker fix" and try again`);
            }
        }
    }
    /**
     * Reads the backup timestamp out of a file name.
     *
     * @param name the backup file name
     * @param filenumbers running number, only used for the log line
     * @param storage the storage the file came from
     */
    getName(name, filenumbers, storage) {
        try {
            const parts = name.split('_');
            if (parseInt(parts[0], 10).toString() !== parts[0]) {
                parts.shift();
            }
            const storageType = storage === 'cifs' ? 'NAS' : storage;
            this.log.debug(name ? `detect backup file ${filenumbers} from ${storageType}: ${name}` : 'No backup name was found');
            return new Date(parts[0], parseInt(parts[1], 10) - 1, parseInt(parts[2].split('-')[0], 10), parseInt(parts[2].split('-')[1], 10), parseInt(parts[3], 10));
        }
        catch (err) {
            if (err) {
                this.log.warn('No backup name was found');
            }
        }
    }
    /**
     * Finds the newest iobroker backup across all enabled storages and publishes it as info.latestBackup.
     *
     */
    async detectLatestBackupFile() {
        // get all 'storage' types that enabled
        try {
            let stores = Object.keys(this.backupConfig.iobroker).filter(attr => typeof this.backupConfig.iobroker[attr] === 'object' &&
                this.backupConfig.iobroker[attr].type === 'storage' &&
                this.backupConfig.iobroker[attr].enabled === true);
            await this.updateAccessTokens(this.backupConfig);
            // read one time all stores to detect if some backups detected
            let promises = null;
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const list = require('./lib/list').default;
            try {
                promises = stores.map(storage => new Promise(resolve => list(storage, this.backupConfig, this.log, result => {
                    // find the newest file
                    let file = null;
                    if (result && result.data && result.data !== 'undefined') {
                        let filenumbers = 0;
                        let data = result.data;
                        Object.keys(data).forEach(type => {
                            const entry = data[type];
                            if (entry?.iobroker) {
                                entry.iobroker
                                    .filter(f => f.size)
                                    .forEach(f => {
                                    filenumbers++;
                                    const date = this.getName(f.name, filenumbers, storage);
                                    if (!file || file.date < date) {
                                        file = f;
                                        file.date = date;
                                        file.storage = storage;
                                    }
                                });
                            }
                        });
                        result = null;
                        data = null;
                    }
                    resolve(file);
                })));
            }
            catch (e) {
                this.log.warn(`No backup file was found: ${e}`);
            }
            // find the newest file between storages
            void Promise.all(promises).then(all => {
                let results = all.filter(f => f);
                let file;
                if (results.length) {
                    results.sort((a, b) => {
                        if (a.date > b.date) {
                            return 1;
                        }
                        else if (a.date < b.date) {
                            return -1;
                        }
                        return 0;
                    });
                    file = results[0];
                    if (file.date !== undefined) {
                        try {
                            file.date = file.date.toISOString();
                        }
                        catch (e) {
                            this.log.warn(`No backup file date was found: ${e}`);
                        }
                    }
                }
                else {
                    file = null;
                }
                // this information will be used by admin at the first start if some backup was detected and we can restore from it instead of new configuration
                void this.setState('info.latestBackup', file ? JSON.stringify(file) : '', true);
                this.log.debug(file ? `detect last backup file: ${file.name}` : 'No backup file was found');
                results = null;
            });
            promises = null;
            stores = null;
        }
        catch (e) {
            this.log.warn(`No backup file was found: ${e}`);
        }
    }
    /**
     * Publishes the next scheduled run time for both backup types.
     *
     * @param setMain also refresh the type that is not `type`
     * @param type the type whose schedule just changed
     */
    async nextBackup(setMain, type) {
        const { CronExpressionParser } = await import('cron-parser');
        if ((this.config.ccuEnabled && setMain) || type === 'ccu') {
            const time = this.config.ccuCron ? this.config.ccuCronJob : this.config.ccuTime.split(':');
            const cron = this.config.ccuCron
                ? time
                : `00 ${time[1]} ${time[0]} */${this.config.ccuEveryXDays} * *`;
            try {
                const cronOptions = {
                    currentDate: new Date(),
                };
                const interval = CronExpressionParser.parse(cron, cronOptions);
                const nextScheduledDate = interval.next();
                await this.setStateAsync(`info.ccuNextTime`, tools.getNextTimeString(this.systemLang, nextScheduledDate), true);
            }
            catch (e) {
                this.log.warn(`Your configured CCU cronjob is not correct: ${e}`);
            }
        }
        else if (!this.config.ccuEnabled) {
            await this.setStateAsync(`info.ccuNextTime`, 'none', true);
        }
        if ((this.config.minimalEnabled && setMain) || type === 'iobroker') {
            const time = this.config.iobrokerCron ? this.config.iobrokerCronJob : this.config.minimalTime.split(':');
            const cron = this.config.iobrokerCron
                ? time
                : `00 ${time[1]} ${time[0]} */${this.config.minimalEveryXDays} * *`;
            try {
                const cronOptions = {
                    currentDate: new Date(),
                };
                const interval = CronExpressionParser.parse(cron, cronOptions);
                const nextScheduledDate = interval.next();
                await this.setStateAsync(`info.iobrokerNextTime`, tools.getNextTimeString(this.systemLang, nextScheduledDate), true);
            }
            catch (e) {
                this.log.warn(`Your configured iobroker cronjob is not correct: ${e}`);
            }
        }
        else if (!this.config.minimalEnabled) {
            await this.setStateAsync(`info.iobrokerNextTime`, 'none', true);
        }
    }
    /**
     * Triggers the backup on one slave instance and then walks on to the next.
     *
     * @param slaveInstance the instance to back up, e.g. `backitup.1`
     * @param num index into `this.config.slaveInstance`
     */
    async startSlaveBackup(slaveInstance, num) {
        if (!this.operationalReady || !this.licenseGuard.isAllowed())
            return;
        let waitForInstance = 1000;
        if (num === null || num === undefined) {
            num = 0;
        }
        try {
            const currentState = await this.getForeignStateAsync(`system.adapter.${slaveInstance}.alive`);
            if (!this.operationalReady || !this.licenseGuard.isAllowed())
                return;
            if (currentState && currentState.val === false) {
                waitForInstance = 10000;
                this.log.debug(`Try to start ${slaveInstance}`);
                await this.setForeignStateAsync(`system.adapter.${slaveInstance}.alive`, true);
            }
        }
        catch (err) {
            this.log.error(`error on slave State: ${err}`);
        }
        this.waitToSlaveBackup = setTimeout(async () => {
            try {
                const currentStateAfter = await this.getForeignStateAsync(`system.adapter.${slaveInstance}.alive`);
                if (!this.operationalReady || !this.licenseGuard.isAllowed())
                    return;
                /** Moves on to the next slave, or finishes the round. */
                const advance = () => {
                    num++;
                    if (this.config.slaveInstance.length > 1 && num != this.config.slaveInstance.length) {
                        const next = num;
                        this.slaveTimeOut = setTimeout(() => void this.startSlaveBackup(this.config.slaveInstance[next], next), 3000);
                    }
                    else {
                        this.log.debug('slave backups are completed');
                        if (this.config.onedriveEnabled) {
                            void this.renewOnedriveToken();
                        }
                    }
                };
                if (currentStateAfter && currentStateAfter.val && currentStateAfter.val === true) {
                    const sendToSlave = await this.sendToAsync(slaveInstance, 'slaveBackup', {
                        config: { deleteAfter: this.config.minimalDeleteAfter },
                    });
                    if (sendToSlave) {
                        this.log.debug(`Slave Backup from ${slaveInstance} is finish with result: ${sendToSlave}`);
                    }
                    else {
                        this.log.debug(`Slave Backup error from ${slaveInstance}`);
                    }
                    if (this.config.stopSlaveAfter) {
                        await this.setForeignStateAsync(`system.adapter.${slaveInstance}.alive`, false);
                        this.log.debug(`${slaveInstance} is stopped after backup`);
                    }
                    advance();
                }
                else {
                    this.log.warn(`${slaveInstance} is not running. The slave backup for this instance is not possible`);
                    advance();
                }
            }
            catch (err) {
                this.log.error(`error on slave Backup: ${err}`);
            }
        }, waitForInstance);
    }
    /**
     * Decrypts the passwords in the multi-target event lists in place.
     *
     * @param secret the system secret
     */
    decryptEvents(secret) {
        if (this.config.ccuEvents && this.config.ccuMulti) {
            for (let i = 0; i < this.config.ccuEvents.length; i++) {
                if (this.config.ccuEvents[i].pass) {
                    const val = this.config.ccuEvents[i].pass;
                    this.config.ccuEvents[i].pass = val ? decrypt(secret, val) : '';
                }
            }
        }
        if (this.config.mySqlEvents && this.config.mySqlMulti) {
            for (let i = 0; i < this.config.mySqlEvents.length; i++) {
                if (this.config.mySqlEvents[i].pass) {
                    const val = this.config.mySqlEvents[i].pass;
                    this.config.mySqlEvents[i].pass = val ? decrypt(secret, val) : '';
                }
            }
        }
        if (this.config.pgSqlEvents && this.config.pgSqlMulti) {
            for (let i = 0; i < this.config.pgSqlEvents.length; i++) {
                if (this.config.pgSqlEvents[i].pass) {
                    const val = this.config.pgSqlEvents[i].pass;
                    this.config.pgSqlEvents[i].pass = val ? decrypt(secret, val) : '';
                }
            }
        }
    }
    clearBashDir() {
        // delete restore files
        if ((0, node_fs_1.existsSync)(bashDir)) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fse = require('fs-extra');
            const restoreDir = (0, node_path_1.join)(bashDir, 'restore');
            try {
                if ((0, node_fs_1.existsSync)((0, node_path_1.join)(bashDir, 'restore.js'))) {
                    (0, node_fs_1.unlinkSync)((0, node_path_1.join)(bashDir, 'restore.js'));
                }
                if ((0, node_fs_1.existsSync)((0, node_path_1.join)(bashDir, 'restore.json'))) {
                    (0, node_fs_1.unlinkSync)((0, node_path_1.join)(bashDir, 'restore.json'));
                }
                if ((0, node_fs_1.existsSync)(restoreDir)) {
                    fse.removeSync(restoreDir);
                }
                if ((0, node_fs_1.existsSync)((0, node_path_1.join)(bashDir, 'iob.key'))) {
                    (0, node_fs_1.unlinkSync)((0, node_path_1.join)(bashDir, 'iob.key'));
                }
                if ((0, node_fs_1.existsSync)((0, node_path_1.join)(bashDir, 'iob.crt'))) {
                    (0, node_fs_1.unlinkSync)((0, node_path_1.join)(bashDir, 'iob.crt'));
                }
            }
            catch (e) {
                this.log.debug(`old restore files could not be deleted: ${e}`);
            }
        }
    }
    /**
     * Copies the admin instance's certificates into the bash directory for the restore web interface.
     *
     * @param instance the admin instance object id the request came from
     */
    async getCerts(instance) {
        const _adminCert = await this.getForeignObjectAsync(instance);
        if (_adminCert && _adminCert.native && _adminCert.native.certPrivate && _adminCert.native.certPublic) {
            const _cert = await this.getForeignObjectAsync('system.certificates');
            if (_cert && _cert.native && _cert.native.certificates) {
                try {
                    const certs = _cert.native.certificates;
                    const privateValue = certs[`${_adminCert.native.certPrivate}`];
                    const publicValue = certs[`${_adminCert.native.certPublic}`];
                    if (privateValue.startsWith('/') && (0, node_fs_1.existsSync)((0, node_path_1.join)(privateValue))) {
                        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(bashDir, 'iob.key'), (0, node_fs_1.readFileSync)((0, node_path_1.join)(privateValue), 'utf8'));
                    }
                    else {
                        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(bashDir, 'iob.key'), privateValue);
                    }
                    if (publicValue.startsWith('/') && (0, node_fs_1.existsSync)((0, node_path_1.join)(publicValue))) {
                        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(bashDir, 'iob.crt'), (0, node_fs_1.readFileSync)((0, node_path_1.join)(publicValue), 'utf8'));
                    }
                    else {
                        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(bashDir, 'iob.crt'), publicValue);
                    }
                }
                catch {
                    this.log.debug('no certificates found');
                }
            }
        }
    }
    /** Reads the certificate pair the two file servers use, if it was written before. */
    readServerCerts() {
        let key = '';
        let cert = '';
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(bashDir, 'iob.key')) && (0, node_fs_1.existsSync)((0, node_path_1.join)(bashDir, 'iob.crt'))) {
            try {
                key = (0, node_fs_1.readFileSync)((0, node_path_1.join)(bashDir, 'iob.key'), 'utf8');
                cert = (0, node_fs_1.readFileSync)((0, node_path_1.join)(bashDir, 'iob.crt'), 'utf8');
            }
            catch {
                this.log.debug('no certificates found');
            }
        }
        return { key, cert };
    }
    /**
     * Starts the static file server the admin tab downloads backups from.
     *
     * @param protocol `'https:'` serves over TLS
     */
    dlFileServer(protocol) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const express = require('express');
        const downloadServer = express();
        // Close all connections from Downloadserver
        if (this.dlServer && this.dlServer._connectionKey) {
            try {
                this.dlServer.closeAllConnections();
            }
            catch (e) {
                this.log.debug(`Download server Connections could not be closed: ${e}`);
            }
            try {
                this.dlServer.close();
            }
            catch (e) {
                this.log.debug(`Download server Connections could not be closed: ${e}`);
            }
        }
        const port = (0, node_fs_1.existsSync)('/opt/scripts/.docker_config/.thisisdocker') ? 9081 : 0;
        downloadServer.use((_req, res, next) => {
            if (!this.operationalReady || !this.licenseGuard.isAllowed()) {
                res.status(403).json({ error: 'EOS_LICENSE_REQUIRED' });
                return;
            }
            next();
        });
        downloadServer.use(express.static((0, node_path_1.join)(tools.getIobDir(), 'backups')));
        let httpServer;
        if (protocol === 'https:') {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            https = https || require('node:https');
            const { key: privateKey, cert: certificate } = this.readServerCerts();
            try {
                httpServer = https.createServer({ key: privateKey, cert: certificate }, downloadServer);
            }
            catch (e) {
                this.log.debug(`The https server cannot be created: ${e}`);
            }
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            http = http || require('node:http');
            try {
                httpServer = http.createServer(downloadServer);
            }
            catch (e) {
                this.log.debug(`The http server cannot be created: ${e}`);
            }
        }
        try {
            this.dlServer = httpServer.listen(port);
            this.log.debug(`Download ${protocol.replace(':', '')} server started on port ${serverPort(this.dlServer)}`);
        }
        catch {
            this.log.debug('Download server cannot be started');
        }
    }
    /**
     * Starts the server the admin tab uploads backups to.
     *
     * @param protocol `'https:'` serves over TLS
     */
    ulFileServer(protocol) {
        /* eslint-disable @typescript-eslint/no-require-imports */
        const express = require('express');
        const multer = require('multer');
        const cors = require('cors');
        /* eslint-enable @typescript-eslint/no-require-imports */
        // Close all Connections from upload server
        try {
            this.ulServer.closeAllConnections();
        }
        catch {
            this.log.debug('Upload server connections could not be closed');
        }
        try {
            this.ulServer.close();
        }
        catch {
            this.log.debug('Upload server connections could not be closed');
        }
        const port = (0, node_fs_1.existsSync)('/opt/scripts/.docker_config/.thisisdocker') ? 9082 : 0;
        const backupDir = (0, node_path_1.join)(tools.getIobDir(), 'backups');
        const uploadServer = express();
        uploadServer.use(cors());
        uploadServer.use((_req, res, next) => {
            if (!this.operationalReady || !this.licenseGuard.isAllowed()) {
                res.status(403).json({ error: 'EOS_LICENSE_REQUIRED' });
                return;
            }
            next();
        });
        const storage = multer.diskStorage({
            destination: (req, file, callback) => callback(null, backupDir),
            filename: (req, file, callback) => {
                this.log.debug(`Upload from ${file.originalname} started...`);
                callback(null, file.originalname);
            },
        });
        const upload = multer({ storage });
        uploadServer.post('/', upload.single('files'), (req, res) => {
            this.log.debug(req.file);
            res.json({ message: 'File(s) uploaded successfully' });
        });
        let httpServer;
        if (protocol === 'https:') {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            https = https || require('node:https');
            const { key, cert } = this.readServerCerts();
            try {
                httpServer = https.createServer({ key, cert }, uploadServer);
            }
            catch (e) {
                this.log.debug(`The https upload server cannot be created: ${e}`);
            }
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            http = http || require('node:http');
            try {
                httpServer = http.createServer(uploadServer);
            }
            catch (e) {
                this.log.debug(`The http upload server cannot be created: ${e}`);
            }
        }
        try {
            this.ulServer = httpServer.listen(port);
            this.log.debug(`Upload ${protocol.replace(':', '')} server started on port ${serverPort(this.ulServer)}`);
        }
        catch {
            this.log.debug('Upload server cannot be started');
        }
    }
    async renewOnedriveToken() {
        if (!this.operationalReady || !this.licenseGuard.isAllowed())
            return;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Onedrive = require('./lib/oneDriveLib').default;
        const onedrive = new Onedrive();
        const currentDay = new Date();
        // NaN rather than the original `undefined`: both compare false against 30, and the branch that
        // subtracts it is only reachable once it has been assigned. Keeps the reads assertion-free.
        let diffDays = NaN;
        if (this.config.onedriveLastTokenRenew != '') {
            const lastRenew = new Date(this.config.onedriveLastTokenRenew);
            diffDays = parseInt(String((currentDay.getTime() - lastRenew.getTime()) / (1000 * 60 * 60 * 24))); //day difference
        }
        if (diffDays >= 30 || !this.config.onedriveLastTokenRenew) {
            this.log.debug('Renew Onedrive Refresh-Token');
            void onedrive
                .renewToken(this.config.onedriveAccessJson, this.log)
                .then(refreshToken => {
                void this.extendForeignObject(`system.adapter.${this.namespace}`, {
                    native: {
                        onedriveAccessJson: refreshToken,
                        onedriveLastTokenRenew: `${`0${currentDay.getMonth() + 1}`.slice(-2)}/${`0${currentDay.getDate()}`.slice(-2)}/${currentDay.getFullYear()}`,
                    },
                });
            })
                .catch(err => {
                this.log.error(err
                    ? JSON.stringify(err)
                    : 'An update of the Onedrive refresh token has failed. Please check your system!');
                void this.registerNotification('nexowatt-backup', 'onedriveWarn', err
                    ? JSON.stringify(err)
                    : 'An update of the Onedrive refresh token has failed. Please check your system!');
            });
        }
        else {
            this.log.debug(`Renew Onedrive Refresh-Token in ${30 - diffDays} days`);
        }
    }
    /**
     * Adapter start-up.
     *
     */
    async main() {
        this.licenseGuard.assertAllowed();
        // Filesystem recovery cleanup runs once per process, never on a license renewal.
        if (!this.filesystemInitialized) {
            this.createBashScripts();
            this.readLogFile();
            if (!(0, node_fs_1.existsSync)((0, node_path_1.join)(tools.getIobDir(), 'backups'))) {
                this.createBackupDir();
            }
            if ((0, node_fs_1.existsSync)(`${bashDir}/.redis.info`)) {
                this.deleteHideFiles();
            }
            if ((0, node_fs_1.existsSync)((0, node_path_1.join)(tools.getIobDir(), 'backups/tmp'))) {
                this.delTmp();
            }
            this.clearBashDir();
            this.timerMain = setTimeout(() => {
                if ((0, node_fs_1.existsSync)(`${bashDir}/.mount`)) {
                    this.umount();
                }
                if (this.config.startAllRestore && !(0, node_fs_1.existsSync)(`${bashDir}/.startAll`)) {
                    this.setStartAll();
                }
            }, 10000);
            this.filesystemInitialized = true;
        }
        const obj = await this.getForeignObjectAsync('system.config');
        this.licenseGuard.assertAllowed();
        if (obj?.common?.language)
            this.systemLang = obj.common.language;
        await this.initConfig(obj?.native?.secret || 'Zgfr56gFe87jJOM');
        this.licenseGuard.assertAllowed();
        this.operationalReady = true;
        await this.checkStates();
        this.assertLicensedOperation();
        if (this.config.hostType !== 'Slave') {
            this.createBackupSchedule();
            void this.nextBackup(true, null);
            void this.detectLatestBackupFile();
        }
        // subscribe on all variables of this adapter instance with pattern "adapterName.X.memory*"
        this.subscribeStates('oneClick.*');
        this.subscribeStates('info.dropboxTokens');
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new NexoWattBackup(options);
}
else {
    // otherwise start the instance directly
    (() => new NexoWattBackup())();
}
//# sourceMappingURL=main.js.map