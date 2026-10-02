"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_core_1 = require("@iobroker/adapter-core");
const webserver_1 = require("@iobroker/webserver");
const express = require("express");
const node_fs_1 = require("node:fs");
const node_util_1 = require("node:util");
const node_path_1 = require("node:path");
const node_stream_1 = require("node:stream");
const compression = require("compression");
const mime_1 = require("mime");
const node_crypto_1 = require("node:crypto");
const archiver = require("archiver");
const ajv_1 = require("ajv");
const json5_1 = require("json5");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const eosRequestSecurity_1 = require("./eosRequestSecurity");
const eosAutoUpdate_1 = require("./eosAutoUpdate");
const eosLicenseHttp_1 = require("./eosLicenseHttp");
const eosHttpsClient_1 = require("./eosHttpsClient");
const eosWebResources_1 = require("./eosWebResources");
const eosApplianceProfile_1 = require("./eosApplianceProfile");
const eosSessionSecurity_1 = require("./eosSessionSecurity");
const eosUploadGuard_1 = require("./eosUploadGuard");
let AdapterStore;
/** Content of a socket-io file */
let socketIoFile;
/** UUID of the installation */
let uuid;
const page404 = (0, node_fs_1.readFileSync)(`${__dirname}/../../public/404.html`).toString('utf8');
const logTemplate = (0, node_fs_1.readFileSync)(`${__dirname}/../../public/logTemplate.html`).toString('utf8');
const EOS_UPLOAD_MAX_BYTES = 200 * 1024 * 1024;
const EOS_PASSWORD_SERVICE_USER = 'system.user.admin';
const LEGACY_BACKUP_ADAPTER_NAME = 'backitup';
const CUSTOMER_BACKUP_ADAPTER_NAMES = ['nexowatt-backup', 'eos-backup'];
const CORE_PROTECTED_ADAPTER_NAMES = [
    'admin',
    'eos-admin',
    'backitup',
    'nexowatt-backup',
    'eos-backup',
    'nexowatt-devices',
    'nexowatt-device',
    'nexowatt-dev',
    'nexowatt-ui',
];
// const FORBIDDEN_CHARS = /[\]\[*,;'"`<>\\\s?]/g; // with space
// copied from here: https://github.com/component/escape-html/blob/master/index.js
const matchHtmlRegExp = /["'&<>]/;
function escapeHtml(string) {
    const str = `${string}`;
    const match = matchHtmlRegExp.exec(str);
    if (!match) {
        return str;
    }
    let escape;
    let html = '';
    let index;
    let lastIndex = 0;
    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: // "
                escape = '&quot;';
                break;
            case 38: // &
                escape = '&amp;';
                break;
            case 39: // '
                escape = '&#39;';
                break;
            case 60: // <
                escape = '&lt;';
                break;
            case 62: // >
                escape = '&gt;';
                break;
            default:
                continue;
        }
        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }
        lastIndex = index + 1;
        html += escape;
    }
    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}
function get404Page(customText) {
    if (customText) {
        return page404.replace('<div class="custom-message"></div>', `<div class="custom-message">${customText}</div>`);
    }
    return page404;
}
/**
 * Read folder recursive
 *
 * @param adapter the adapter instance
 * @param adapterName name of the adapter or dir
 * @param url url of the specific file or directory
 */
async function readFolderRecursive(adapter, adapterName, url) {
    const filesOfDir = [];
    const fileMetas = await adapter.readDirAsync(adapterName, url);
    for (const fileMeta of fileMetas) {
        if (!fileMeta.isDir) {
            const file = await adapter.readFileAsync(adapterName, `${url}/${fileMeta.file}`);
            if (file.file instanceof Buffer) {
                filesOfDir.push({ name: url ? `${url}/${fileMeta.file}` : fileMeta.file, file: file.file });
            }
            else {
                filesOfDir.push({
                    name: url ? `${url}/${fileMeta.file}` : fileMeta.file,
                    file: Buffer.from(file.file.toString(), 'utf-8'),
                });
            }
        }
        else {
            filesOfDir.push(...(await readFolderRecursive(adapter, adapterName, `${url}/${fileMeta.file}`)));
        }
    }
    return filesOfDir;
}
function MemoryWriteStream() {
    node_stream_1.Transform.call(this);
    this._chunks = [];
    this._transform = (chunk, _enc, cb) => {
        this._chunks.push(chunk);
        cb();
    };
    this.collect = () => {
        const result = Buffer.concat(this._chunks);
        this._chunks = [];
        return result;
    };
}
(0, node_util_1.inherits)(MemoryWriteStream, node_stream_1.Transform);
/** Webserver class */
class Web {
    nexowattStableUpdateManager;
    server = {
        app: null,
        server: null,
    };
    LOGIN_PAGE = '/index.html?login';
    /** URL to the JSON config schema */
    JSON_CONFIG_SCHEMA_URL = 
    // 'https://raw.githubusercontent.com/ioBroker/NexoWatt EOS Admin/master/packages/jsonConfig/schemas/jsonConfig.json';
    'https://raw.githubusercontent.com/ioBroker/json-config/main/schemas/jsonConfig.json';
    store = null;
    indexHTML;
    baseDir = (0, node_path_1.join)(__dirname, '..', '..');
    dirName = (0, node_path_1.normalize)(`${this.baseDir}/admin/`.replace(/\\/g, '/')).replace(/\\/g, '/');
    unprotectedFiles;
    systemConfig;
    // todo delete after React will be main
    wwwDir = (0, node_path_1.join)(this.baseDir, 'adminWww');
    settings;
    adapter;
    options;
    onReady;
    systemLanguage;
    checkTimeout;
    oauth2Model;
    /** Short-lived passwordless first-activation claims. Keys are SHA-256 hashes of HttpOnly cookie tokens. */
    eosPasswordClaims = new Map();
    /** Small in-memory rate limiter for unauthenticated first-activation requests. */
    eosPasswordClaimRates = new Map();
    /** Bound password proof work and serialize mutations of one account. */
    eosAccountWrites = new Set();
    eosPasswordWriteRates = new Map();
    /**
     * Create a new instance of Web
     *
     * @param settings settings of the adapter
     * @param adapter instance of the adapter
     * @param onReady callback when the server is ready
     * @param options options for the webserver
     */
    constructor(settings, adapter, onReady, options) {
        this.settings = settings;
        this.adapter = adapter;
        this.onReady = onReady;
        this.options = options;
        this.systemLanguage = this.options?.systemLanguage || 'en';
        void this.#init();
    }
    decorateLogFile(fileName, text) {
        const log = text || (0, node_fs_1.readFileSync)(fileName).toString();
        return logTemplate.replace('@@title@@', (0, node_path_1.parse)(fileName).name).replace('@@body@@', escapeHtml(log));
    }
    setLanguage(lang) {
        this.systemLanguage = lang;
    }
    close() {
        if (this.checkTimeout) {
            this.adapter.clearTimeout(this.checkTimeout);
            this.checkTimeout = null;
        }
        this.nexowattStableUpdateManager?.stop();
        void this.adapter.setState('info.connection', false, true);
        this.server.server?.close();
    }
    processMessage(msg) {
        return this.oauth2Model?.processMessage(msg);
    }
    async prepareIndex(index) {
        let template = (0, node_fs_1.readFileSync)((0, node_path_1.join)(this.wwwDir, index)).toString('utf8');
        const m = template.match(/(["']?@@\w+@@["']?)/g);
        for (let pattern of m) {
            pattern = pattern.replace(/@/g, '').replace(/'/g, '').replace(/"/g, '');
            if (pattern === 'disableDataReporting') {
                // read sentry state
                const state = await this.adapter.getStateAsync(`system.adapter.${this.adapter.namespace}.plugins.sentry.enabled`);
                template = template.replace(/['"]@@disableDataReporting@@["']/g, state?.val ? 'true' : 'false');
            }
            else if (pattern === 'loginBackgroundImage') {
                if (this.adapter.config.loginBackgroundImage) {
                    template = template.replace('@@loginBackgroundImage@@', `files/${this.adapter.namespace}/login-bg.png`);
                }
                else {
                    template = template.replace('@@loginBackgroundImage@@', '');
                }
            }
            else if (pattern === 'loginBackgroundColor') {
                template = template.replace('@@loginBackgroundColor@@', this.adapter.config.loginBackgroundColor || 'inherit');
            }
            else if (pattern === 'loadingBackgroundImage') {
                if (this.adapter.config.loadingBackgroundImage) {
                    template = template.replace('@@loadingBackgroundImage@@', `files/${this.adapter.namespace}/loading-bg.png`);
                }
                else {
                    template = template.replace('@@loadingBackgroundImage@@', '');
                }
            }
            else if (pattern === 'loadingBackgroundColor') {
                template = template.replace('@@loadingBackgroundColor@@', this.adapter.config.loadingBackgroundColor || '');
            }
            else if (pattern === 'vendorPrefix') {
                template = template.replace(`@@vendorPrefix@@`, this.systemConfig.native.vendor.uuidPrefix || (uuid.length > 36 ? uuid.substring(0, 2) : ''));
            }
            else if (pattern === 'loginMotto') {
                template = template.replace(`@@loginMotto@@`, this.systemConfig.native.vendor.admin.login.motto || this.adapter.config.loginMotto || '');
            }
            else if (pattern === 'loginLogo') {
                template = template.replace(`@@loginLogo@@`, this.systemConfig.native.vendor.icon || '');
            }
            else if (pattern === 'loginLink') {
                template = template.replace(`@@loginLink@@`, this.systemConfig.native.vendor.admin.login.link || '');
            }
            else if (pattern === 'loginTitle') {
                template = template.replace(`@@loginTitle@@`, this.systemConfig.native.vendor.admin.login.title || '');
            }
            else {
                template = template.replace(`@@${pattern}@@`, this.adapter.config[pattern] !== undefined
                    ? this.adapter.config[pattern]
                    : '');
            }
        }
        return template;
    }
    getInfoJs() {
        const result = [`window.sysLang = "${this.systemLanguage}";`];
        if (uuid?.length === 38) {
            result.push(`window.vendorPrefix = "${uuid.substring(0, 2)}";`);
        }
        if (this.adapter.config.loadingBackgroundColor) {
            result.push(`window.loadingBackgroundColor = "${this.adapter.config.loadingBackgroundColor}";`);
        }
        if (this.adapter.config.loadingBackgroundImage) {
            result.push(`window.loadingBackgroundImage = "${this.adapter.config.loadingBackgroundImage}";`);
        }
        return result.join('\n');
    }
    getErrorRedirect(origin) {
        // LOGIN_PAGE /index.html?login
        // origin can be "?login&href=" -
        // or "/?login&href=" -
        //
        if (origin) {
            const parts = origin.split('&');
            if (!parts.includes('error')) {
                parts.splice(1, 0, 'error');
                origin = parts.join('&');
            }
            if (origin.startsWith('?login')) {
                return this.LOGIN_PAGE + origin.substring(6);
            }
            if (origin.startsWith('/?login')) {
                return this.LOGIN_PAGE + origin.substring(7);
            }
            if (origin.startsWith(this.LOGIN_PAGE)) {
                return origin;
            }
            return this.LOGIN_PAGE + origin;
        }
        return `${this.LOGIN_PAGE}?error`;
    }
    /**
     * Validate, al JSON configs from alla adapters against the current schema
     *
     * @param adapterName name of the adapter
     */
    async validateJsonConfig(adapterName) {
        let schema = null;
        try {
            this.adapter.log.debug(`retrieving json schema from ${this.JSON_CONFIG_SCHEMA_URL}`);
            schema = await (0, eosHttpsClient_1.requestHttpsJson)(this.JSON_CONFIG_SCHEMA_URL, {
                allowedHosts: ['raw.githubusercontent.com'], maxBytes: 1024 * 1024, budgetMs: 5000,
            });
        }
        catch (e) {
            this.adapter.log.debug(`Could not get jsonConfig schema: ${e.message}`);
            return;
        }
        const res = await this.adapter.getForeignObjectAsync(`system.adapter.${adapterName}`);
        if (res?.common.adminUI?.config === 'json') {
            try {
                const ajv = new ajv_1.Ajv({
                    allErrors: false,
                    strict: 'log',
                });
                const adapterPath = (0, node_path_1.dirname)(require.resolve(`iobroker.${adapterName}/package.json`));
                const jsonConfPath = (0, node_path_1.join)(adapterPath, 'admin', 'jsonConfig.json');
                const json5ConfPath = (0, node_path_1.join)(adapterPath, 'admin', 'jsonConfig.json5');
                let jsonConf;
                if ((0, node_fs_1.existsSync)(jsonConfPath)) {
                    jsonConf = (0, node_fs_1.readFileSync)(jsonConfPath, {
                        encoding: 'utf-8',
                    });
                }
                else {
                    jsonConf = (0, node_fs_1.readFileSync)(json5ConfPath, {
                        encoding: 'utf-8',
                    });
                }
                const validate = ajv.compile(schema);
                const valid = validate((0, json5_1.parse)(jsonConf));
                if (!valid) {
                    this.adapter.log.warn(`${adapterName} has an invalid jsonConfig: ${JSON.stringify(validate.errors)}`);
                }
            }
            catch (e) {
                this.adapter.log.debug(`Error validating schema of ${adapterName}: ${e.message}`);
            }
        }
    }
    async unzipFile(fileName, data, res) {
        // extract the file
        try {
            const text = await (0, eosWebResources_1.inflateLog)(data);
            if (text.length > 2 * 1024 * 1024) {
                res.header('Content-Type', 'text/plain');
                res.send(text);
            }
            else {
                res.header('Content-Type', 'text/html');
                res.send(this.decorateLogFile(fileName, text));
            }
        }
        catch (e) {
            res.header('Content-Type', 'application/gzip');
            res.send(data);
            this.adapter.log.warn('Compressed log preview unavailable; original gzip returned.');
        }
    }
    normalizeEosGroupId(value) {
        if (typeof value !== 'string') {
            return null;
        }
        let group = value.trim();
        if (!group) {
            return null;
        }
        if (!group.startsWith('system.group.')) {
            group = `system.group.${group.replace(/^group\./, '')}`;
        }
        return /^system\.group\.[a-z0-9_.-]+$/i.test(group) ? group : null;
    }
    normalizeEosUserId(value) {
        if (!value) {
            return null;
        }
        let user = typeof value === 'string' ? value : String(value.id || value._id || value.user || value.name || '');
        user = user.trim();
        if (!user) {
            return null;
        }
        if (!user.startsWith('system.user.')) {
            user = `system.user.${user.replace(/^user\./, '')}`;
        }
        return /^system\.user\.[a-z0-9_.-]+$/i.test(user) ? user : null;
    }
    normalizeEosAdapterName(value) {
        if (typeof value !== 'string') {
            return null;
        }
        let adapter = value.trim().toLowerCase();
        if (!adapter) {
            return null;
        }
        adapter = adapter.replace(/^system\.adapter\./, '').replace(/^iobroker\./, '').replace(/^@nexowatt\/iobroker\./, '').replace(/^@nexowatt\//, '');
        adapter = adapter.replace(/\.\d+$/, '');
        return /^[a-z0-9_-]+$/.test(adapter) ? adapter : null;
    }
    getEosSecurityAdminGroups() {
        return [eosApplianceProfile_1.ROLE_GROUPS.service];
    }
    getEosProtectedAdapterNames() {
        // v47: frontend delete protection is core-only. Ignore old eosProtectedAdapters
        // settings so normal installed adapters/instances remain deletable.
        return [...new Set(CORE_PROTECTED_ADAPTER_NAMES)].sort();
    }
    readAccessTokenFromRequest(req) {
        const cookieHeader = req.headers.cookie || '';
        const accessCookie = cookieHeader
            .split(';')
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith('access_token='));
        let token = accessCookie ? accessCookie.split('=').slice(1).join('=') : '';
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.substring('Bearer '.length);
        }
        if (!token && req.query?.token) {
            token = req.query.token;
        }
        if (!token) {
            return null;
        }
        try {
            token = decodeURIComponent(token);
        }
        catch {
            // keep raw token
        }
        token = token.trim();
        if (token.startsWith('Bearer ')) {
            token = token.substring('Bearer '.length).trim();
        }
        if (token.startsWith('s:')) {
            token = token.substring(2);
        }
        // Express signed cookies are encoded as s:<token>.<signature>. ioBroker tokens are not JWTs.
        if (token.includes('.') && !token.startsWith('eyJ')) {
            token = token.substring(0, token.indexOf('.'));
        }
        return token || null;
    }
    readSession(id) {
        return new Promise(resolve => this.adapter.getSession(id, token => resolve(token)));
    }
    async readEosCurrentUser(req) {
        if (this.settings.auth !== true)
            return null;
        const enabledUser = async (candidate) => {
            const userId = this.normalizeEosUserId(candidate);
            if (!userId)
                return null;
            const user = await this.adapter.getForeignObjectAsync(userId).catch(() => null);
            return user?.type === 'user' && user.common?.enabled === true ? userId : null;
        };
        // req.user is set only by the upstream authenticated middleware, never by body/query input.
        if (req.user) {
            return enabledUser(req.user);
        }
        const token = this.readAccessTokenFromRequest(req);
        if (!token || token.length < 16 || token.length > 4096)
            return null;
        // Only the actual access-token namespace is accepted. Refresh sessions and shortened
        // candidate tokens must never authenticate a protected EOS endpoint.
        const id = token.startsWith('a:') ? token : `a:${token}`;
        const session = await this.readSession(id).catch(() => null);
        if (!session || typeof session.aExp !== 'number' || !Number.isFinite(session.aExp)
            || session.aExp <= Date.now())
            return null;
        return enabledUser(session.user);
    }
    getEosConfiguredRoleGroups(...keys) {
        const groups = new Set();
        const add = (value) => {
            if (!value) {
                return;
            }
            if (Array.isArray(value)) {
                value.forEach(add);
                return;
            }
            if (typeof value === 'object') {
                const row = value;
                if (row.enabled === false) {
                    return;
                }
                add(row.group || row.id || row.name);
                return;
            }
            const group = this.normalizeEosGroupId(String(value));
            if (group) {
                groups.add(group);
            }
        };
        const settings = this.settings;
        keys.forEach(key => add(settings[key]));
        return [...groups].sort();
    }
    getEosInstallerGroups() {
        return [eosApplianceProfile_1.ROLE_GROUPS.installer];
    }
    getEosEndUserGroups() {
        return [eosApplianceProfile_1.ROLE_GROUPS.enduser];
    }
    getTranslatedName(value) {
        if (!value) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        return String(value.de || value.en || Object.values(value)[0] || '');
    }
    async getEosGroupDetailsForUser(userId) {
        const groups = [];
        try {
            const result = await this.adapter.getObjectViewAsync('system', 'group', {
                startkey: 'system.group.',
                endkey: 'system.group.香',
                include_docs: true,
            });
            for (const group of (0, eosSessionSecurity_1.readGroupRows)(result)) {
                if (group.common?.enabled === false)
                    continue;
                const members = Array.isArray(group?.common?.members) ? group.common.members : [];
                if (members.includes(userId)) {
                    groups.push({
                        id: group._id,
                        name: this.getTranslatedName(group?.common?.name),
                        desc: this.getTranslatedName(group?.common?.desc),
                    });
                }
            }
        }
        catch (e) {
            this.adapter.log.debug('Cannot resolve EOS security groups');
            throw new Error('securityContextUnavailable');
        }
        return groups.sort((a, b) => a.id.localeCompare(b.id));
    }
    async getEosGroupsForUser(userId) {
        return (await this.getEosGroupDetailsForUser(userId)).map(group => group.id);
    }
    normalizeEosRoleText(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/^system\.group\./, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    resolveEosRole(userId, groups, groupNames, adminGroups) {
        if (groups.includes(eosApplianceProfile_1.ROLE_GROUPS.service)) {
            return 'admin';
        }
        const installerGroups = this.getEosInstallerGroups();
        if (groups.some(group => installerGroups.includes(group))) {
            return 'installer';
        }
        const endUserGroups = this.getEosEndUserGroups();
        if (groups.some(group => endUserGroups.includes(group))) {
            return 'enduser';
        }
        // Display names and descriptions are presentation data, never role credentials.
        // Secure default: a normal authenticated, non-admin ioBroker user is an EOS end user.
        return 'enduser';
    }
    async getEosAccessForUserId(userId) {
        const groupDetails = userId ? await this.getEosGroupDetailsForUser(userId) : [];
        const groups = groupDetails.map(group => group.id);
        const groupNames = groupDetails.flatMap(group => [group.name, group.desc]).filter(Boolean);
        const adminGroups = this.getEosSecurityAdminGroups();
        // Exactly one canonical role is required. Alias-only, unknown and conflicting
        // memberships fail closed, including an 'admin' username outside its group.
        const matchedRoles = Object.values(eosApplianceProfile_1.ROLE_GROUPS).filter(group => groups.includes(group));
        if (matchedRoles.length !== 1)
            userId = null;
        const role = userId ? this.resolveEosRole(userId, groups, groupNames, adminGroups) : 'enduser';
        return { userId, groupDetails, groups, groupNames, adminGroups, role };
    }
    async getEosRequestAccess(req) {
        return this.getEosAccessForUserId(await this.readEosCurrentUser(req));
    }
    getEosRoleCapabilities(role) {
        const technical = role === 'admin' || role === 'installer';
        return {
            smartHome: true,
            commissioning: technical,
            troubleshooting: technical,
            adapterManagement: role === 'admin',
            instanceManagement: role === 'admin',
            objectDiagnostics: role === 'admin',
            logDiagnostics: role === 'admin',
            basicSystemSettings: technical,
            emsAppCenter: technical,
            simulation: role === 'admin',
            licenseAdministration: role === 'admin',
            fullSystemSettings: role === 'admin',
            expertMode: role === 'admin',
            userManagement: role === 'admin',
            accountPasswordReset: role === 'admin' || role === 'installer',
            nexowattBackup: true,
            internalBackupReserve: role === 'admin',
            securityAdministration: role === 'admin',
        };
    }
    getEosFirstLoginPasswordMinLength() {
        const configured = Number(this.settings.eosFirstLoginPasswordMinLength);
        if (!Number.isInteger(configured) || configured < 8 || configured > 64) {
            return 15;
        }
        return Math.max(15, configured);
    }
    async getEosFirstLoginPasswordState(userId, role) {
        const minLength = this.getEosFirstLoginPasswordMinLength();
        if (!this.settings.auth
            || !userId
            || role === 'admin') {
            return { required: false, initialized: true, minLength, version: 1 };
        }
        try {
            const userObject = (await this.adapter.getForeignObjectAsync(userId));
            const native = (userObject?.native || {});
            const account = (native.nexowattEosAccount || {});
            const initialized = account.passwordInitialized === true
                || Number(account.passwordSetupVersion || account.passwordInitializationVersion || 0) >= 1;
            const stableForced = native.nexowattPasswordChangeRequired === true
                || native.eosPasswordChangeRequired === true
                || native.nexowattFirstLoginPending === true
                || native.eosFirstLoginRequired === true;
            const forced = account.forcePasswordChange === true || stableForced;
            return { required: forced || !initialized, initialized: initialized && !forced, minLength, version: 1 };
        }
        catch (e) {
            this.adapter.log.warn(`Cannot read EOS first-login state for ${userId}: ${e instanceof Error ? e.message : e}`);
            // Fail closed for non-admin accounts: do not grant the full UI while the account
            // initialization state cannot be verified.
            return { required: true, initialized: false, minLength, version: 1 };
        }
    }
    validateEosFirstLoginPassword(password, passwordRepeat, userId) {
        const value = typeof password === 'string' ? password : '';
        const repeat = typeof passwordRepeat === 'string' ? passwordRepeat : '';
        const minLength = this.getEosFirstLoginPasswordMinLength();
        if (!value || !repeat) {
            return { valid: false, error: 'passwordRequired' };
        }
        if (value !== repeat) {
            return { valid: false, error: 'passwordMismatch' };
        }
        if (Array.from(value).length < minLength || Array.from(value).length > 128 || Buffer.byteLength(value, 'utf8') > 256
            || /[\u0000-\u001f\u007f]/.test(value)) {
            return { valid: false, error: 'passwordLength' };
        }
        // Long passphrases are accepted without obsolete character-composition rules.
        const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
        const userName = userId.replace(/^system\.user\./, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (['password', 'passwort', 'nexowatt', 'installer', 'installateur', 'endkunde', 'administrator', '12345678', '1234567890'].includes(normalized)
            || (userName.length >= 4 && normalized.includes(userName))) {
            return { valid: false, error: 'passwordTooEasy' };
        }
        return { valid: true, password: value };
    }
    getEosPasswordUserName(userId) {
        const userName = String(userId || '').trim().replace(/^system\.user\./, '');
        if (!/^[A-Za-z0-9_.@-]+$/.test(userName)) {
            throw new Error('invalidPasswordTarget');
        }
        return userName;
    }
    async setEosUserPassword(userId, password, proof) {
        // ioBroker's password API expects the account name (for example "user"), not the
        // object id ("system.user.user"). Supplying the object id can return without changing
        // the password on some controller versions. Always normalize to the real account name.
        const userName = this.getEosPasswordUserName(userId);
        // The server-side Admin/Service context performs the controller password write, so managed
        // Installer and End User accounts do not need global users.write rights in the browser.
        const options = { user: EOS_PASSWORD_SERVICE_USER, ...(proof ? { eosExpectedAccountRevision: proof.revision, eosAuthorizePasswordWrite: proof.authorize } : {}) };
        if (typeof this.adapter.setPasswordAsync === 'function') {
            await this.adapter.setPasswordAsync(userName, password, options);
        }
        else if (typeof this.adapter.setPassword === 'function') {
            await new Promise((resolve, reject) => {
                this.adapter.setPassword?.(userName, password, options, error => (error ? reject(error) : resolve()));
            });
        }
        else {
            throw new Error('passwordApiUnavailable');
        }
        this.adapter.eosSessionSecurity.revoke();
        // Verify the write with the controller API whenever it is exposed. This prevents the
        // UI from reporting success while the object database still contains the old hash.
        if (typeof this.adapter.checkPasswordAsync === 'function') {
            const result = await this.adapter.checkPasswordAsync(userName, password, options);
            const valid = Array.isArray(result) ? result[0] === true : result === true;
            if (!valid) {
                throw new Error('passwordVerificationFailed');
            }
            return;
        }
        // Compatibility fallback for older controllers: require a non-empty stored password hash.
        const userObject = (await this.adapter.getForeignObjectAsync(userId));
        if (!String(userObject?.common?.password || '').trim()) {
            throw new Error('passwordWriteFailed');
        }
    }
    async updateEosAccountMetadata(userId, updater) {
        const userObject = (await this.adapter.getForeignObjectAsync(userId));
        if (!userObject) {
            throw new Error('userObjectUnavailableAfterPasswordChange');
        }
        const native = { ...(userObject.native || {}) };
        const account = { ...(native.nexowattEosAccount || {}) };
        native.nexowattEosAccount = account;
        updater(native, account);
        // Extend only the EOS metadata. Replacing the complete user object here could overwrite the
        // password hash which was just written by setPasswordAsync/changePassword.
        await this.adapter.extendForeignObjectAsync(userId, { native }, { user: EOS_PASSWORD_SERVICE_USER });
    }
    async destroyEosRequestSessions(req) {
        const token = this.readAccessTokenFromRequest(req);
        if (!token || typeof this.adapter.destroySession !== 'function') {
            return;
        }
        // Depending on the authentication path, the same session can be addressed by the raw
        // token or by the adapter-session prefix. Remove every supported representation so a
        // password change cannot leave the old authenticated browser session active.
        const sessionIds = new Set([token, token.startsWith('a:') ? token : `a:${token}`]);
        await Promise.all([...sessionIds].map(async (id) => {
            try {
                await this.adapter.destroySession(id);
            }
            catch (e) {
                this.adapter.log.debug('Cannot destroy EOS first-login session');
            }
        }));
    }
    async saveEosFirstLoginPassword(req, res) {
        await this.saveEosOwnPassword(req, res, true);
    }
    async saveEosOwnPassword(req, res, firstLogin = false) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const access = await this.getEosRequestAccess(req);
        if (!access.userId || (firstLogin && access.role === 'admin')) {
            res.status(403).json({ error: 'passwordSetupNotAllowed' });
            return;
        }
        const header = firstLogin ? 'x-nexowatt-eos-first-login' : 'x-nexowatt-eos-password';
        if (!this.isEosSameOriginWrite(req) || req.headers[header] !== '1') {
            res.status(403).json({ error: 'invalidRequestOrigin' });
            return;
        }
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)
            || Object.keys(body).some(key => !['password', 'passwordRepeat', 'currentPassword'].includes(key))) {
            res.status(400).json({ error: 'invalidPasswordRequest' });
            return;
        }
        if (typeof body.currentPassword !== 'string' || !body.currentPassword || Array.from(body.currentPassword).length > 128
            || Buffer.byteLength(body.currentPassword, 'utf8') > 256) {
            res.status(400).json({ error: 'currentPasswordRequired' });
            return;
        }
        const validation = this.validateEosFirstLoginPassword(body.password, body.passwordRepeat, access.userId);
        if (validation.valid === false) {
            res.status(400).json({ error: validation.error, minLength: this.getEosFirstLoginPasswordMinLength() });
            return;
        }
        if (validation.password === body.currentPassword) {
            res.status(400).json({ error: 'passwordUnchanged' });
            return;
        }
        const passwordState = await this.getEosFirstLoginPasswordState(access.userId, access.role);
        if (firstLogin && !passwordState.required) {
            res.status(409).json({ error: 'passwordAlreadyInitialized' });
            return;
        }
        if (!firstLogin && passwordState.required) {
            res.status(403).json({ error: 'passwordChangeRequired' });
            return;
        }
        if (typeof this.adapter.checkPasswordAsync !== 'function') {
            res.status(503).json({ error: 'passwordVerificationUnavailable' });
            return;
        }
        const nowMs = Date.now();
        for (const [key, rate] of this.eosPasswordWriteRates) {
            if (nowMs - rate.windowStartedAt >= 60_000)
                this.eosPasswordWriteRates.delete(key);
        }
        const rate = this.eosPasswordWriteRates.get(access.userId);
        if ((rate && rate.count >= 5) || (!rate && this.eosPasswordWriteRates.size >= 256)
            || this.eosAccountWrites.size >= 2 || this.eosAccountWrites.has(access.userId)) {
            res.status(429).json({ error: 'passwordChangeRateLimit' });
            return;
        }
        this.eosPasswordWriteRates.set(access.userId, rate
            ? { ...rate, count: rate.count + 1 } : { count: 1, windowStartedAt: nowMs });
        this.eosAccountWrites.add(access.userId);
        try {
            // Target is solely the authenticated identity. Requiring the current
            // credential prevents a stolen old session claiming a reset account.
            const before = await this.adapter.getForeignObjectAsync(access.userId);
            const revision = JSON.stringify((0, eosSessionSecurity_1.securityProjection)(access.userId, before));
            const check = await this.adapter.checkPasswordAsync(this.getEosPasswordUserName(access.userId), body.currentPassword, { user: EOS_PASSWORD_SERVICE_USER });
            if (!(Array.isArray(check) ? check[0] === true : check === true)) {
                res.status(403).json({ error: 'currentPasswordInvalid' });
                return;
            }
            const authorize = async () => {
                const current = await this.getEosRequestAccess(req);
                return current.userId === access.userId && current.role === access.role;
            };
            if (!await authorize() || revision !== JSON.stringify((0, eosSessionSecurity_1.securityProjection)(access.userId, await this.adapter.getForeignObjectAsync(access.userId)))) {
                res.status(409).json({ error: 'accountChanged' });
                return;
            }
            await this.setEosUserPassword(access.userId, validation.password, { revision, authorize });
            const now = new Date().toISOString();
            await this.updateEosAccountMetadata(access.userId, (native, account) => {
                account.passwordInitialized = true;
                account.passwordInitializedAt = Date.now();
                account.passwordInitializationVersion = 1;
                account.passwordInitializedBy = 'self';
                account.passwordSetupVersion = 1;
                account.passwordSetAt = now;
                account.firstLoginCompletedAt = now;
                account.forcePasswordChange = false;
                account.passwordlessFirstLoginAllowed = false;
                native.nexowattPasswordChangeRequired = false;
                native.eosPasswordChangeRequired = false;
                native.nexowattFirstLoginPending = false;
                native.eosFirstLoginRequired = false;
                native.nexowattInitialPasswordApplied = false;
                native.nexowattPasswordChangedAt = now;
            });
            await this.destroyEosRequestSessions(req);
            for (const cookie of ['access_token', 'refresh_token', 'connect.sid']) {
                res.clearCookie(cookie);
            }
            this.adapter.log.info(`EOS own password changed for ${access.userId}`);
            res.status(200).json({ success: true, role: access.role, logoutRequired: true, sessionInvalidated: true });
        }
        finally {
            this.eosAccountWrites.delete(access.userId);
        }
    }
    isEosPasswordlessFirstLoginEnabled() {
        return false; // Immutable integrated product profile: no network passwordless claim.
    }
    getEosPasswordClaimTtlMs() {
        const configured = Number(this.settings.eosPasswordClaimTtlMinutes);
        const minutes = Number.isFinite(configured) ? Math.min(30, Math.max(3, Math.round(configured))) : 10;
        return minutes * 60_000;
    }
    getEosRemoteAddress(req) {
        // Do not read X-Forwarded-For directly: an untrusted client could forge that header. Express
        // already resolves req.ip according to the configured trust-proxy policy, so it is the only
        // proxy-aware value accepted here. Fall back to the actual socket peer.
        const raw = req.ip || req.socket.remoteAddress || '';
        return String(raw).replace(/^::ffff:/i, '').split('%')[0].trim().toLowerCase();
    }
    isEosPrivateAddress(address) {
        if (!address) {
            return false;
        }
        if (address === '::1' || address === 'localhost') {
            return true;
        }
        if (/^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(address)) {
            return true;
        }
        const v4 = address.match(/^172\.(\d{1,3})\./);
        if (v4 && Number(v4[1]) >= 16 && Number(v4[1]) <= 31) {
            return true;
        }
        return /^(?:fc|fd)[0-9a-f]{2}:|^fe80:/i.test(address);
    }
    isEosPasswordlessRequestNetworkAllowed(req) {
        const privateOnly = this.settings.eosPasswordlessFirstLoginPrivateNetworkOnly !== false;
        return !privateOnly || this.isEosPrivateAddress(this.getEosRemoteAddress(req));
    }
    hashEosPasswordClaim(token) {
        return (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    readEosCookie(req, name) {
        const row = String(req.headers.cookie || '')
            .split(';')
            .map(value => value.trim())
            .find(value => value.startsWith(`${name}=`));
        if (!row) {
            return '';
        }
        try {
            return decodeURIComponent(row.substring(name.length + 1));
        }
        catch {
            return row.substring(name.length + 1);
        }
    }
    cleanEosPasswordClaims() {
        const now = Date.now();
        for (const [key, claim] of this.eosPasswordClaims.entries()) {
            if (claim.expiresAt <= now) {
                this.eosPasswordClaims.delete(key);
            }
        }
        for (const [key, rate] of this.eosPasswordClaimRates.entries()) {
            if (now - rate.windowStartedAt > 10 * 60_000) {
                this.eosPasswordClaimRates.delete(key);
            }
        }
    }
    acceptEosPasswordClaimAttempt(req, userId) {
        this.cleanEosPasswordClaims();
        const address = this.getEosRemoteAddress(req) || 'unknown';
        const now = Date.now();
        const increment = (key, limit) => {
            const existing = this.eosPasswordClaimRates.get(key);
            if (!existing || now - existing.windowStartedAt > 10 * 60_000) {
                this.eosPasswordClaimRates.set(key, { count: 1, windowStartedAt: now });
                return true;
            }
            existing.count += 1;
            return existing.count <= limit;
        };
        // Limit both individual-account guessing and username rotation from one client.
        const globalAllowed = increment(`${address}|*`, 20);
        const accountAllowed = increment(`${address}|${userId}`, 8);
        return globalAllowed && accountAllowed;
    }
    async getEosPasswordlessClaimEligibility(userId) {
        const access = await this.getEosAccessForUserId(userId);
        const user = (await this.adapter.getForeignObjectAsync(userId));
        const setup = await this.getEosFirstLoginPasswordState(userId, access.role);
        const account = (user?.native || {}).nexowattEosAccount;
        const eligible = !!user
            && user.common?.enabled !== false
            && access.role !== 'admin'
            && setup.required
            && account?.passwordlessFirstLoginAllowed === true;
        return { eligible, role: access.role, user, minLength: setup.minLength };
    }
    async getEosPasswordlessFirstLoginStatus(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        if (!this.settings.auth
            || !this.isEosPasswordlessFirstLoginEnabled()
            || !this.isEosSameOriginWrite(req)
            || req.headers['x-nexowatt-eos-passwordless-status'] !== '1') {
            res.status(403).json({ error: 'statusUnavailable' });
            return;
        }
        if (!this.isEosPasswordlessRequestNetworkAllowed(req)) {
            res.status(403).json({ error: 'privateNetworkRequired' });
            return;
        }
        const requested = String(req.body?.user || '')
            .trim()
            .toLowerCase()
            .replace(/^system\.user\./, '');
        const managed = requested === 'installer' || requested === 'guest' || requested === 'user';
        const userId = managed ? this.normalizeEosUserId(requested) : '';
        if (!userId) {
            res.status(200).json({ success: true, eligible: false, userName: requested });
            return;
        }
        const eligibility = await this.getEosPasswordlessClaimEligibility(userId);
        const eligible = eligibility.eligible && (eligibility.role === 'installer' || eligibility.role === 'enduser');
        res.status(200).json({
            success: true,
            eligible,
            role: eligibility.role,
            userName: requested,
            minLength: eligibility.minLength,
        });
    }
    invalidateEosPasswordClaimsForUser(userId) {
        for (const [key, claim] of this.eosPasswordClaims.entries()) {
            if (claim.userId === userId) {
                this.eosPasswordClaims.delete(key);
            }
        }
    }
    async startEosPasswordlessFirstLogin(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        if (!this.settings.auth
            || !this.isEosPasswordlessFirstLoginEnabled()
            || !this.isEosSameOriginWrite(req)
            || req.headers['x-nexowatt-eos-passwordless-claim'] !== '1') {
            res.status(403).json({ error: 'claimUnavailable' });
            return;
        }
        if (!this.isEosPasswordlessRequestNetworkAllowed(req)) {
            res.status(403).json({ error: 'privateNetworkRequired' });
            return;
        }
        const userId = this.normalizeEosUserId(req.body?.user);
        if (!userId) {
            res.status(403).json({ error: 'claimUnavailable' });
            return;
        }
        if (!this.acceptEosPasswordClaimAttempt(req, userId)) {
            res.status(429).json({ error: 'claimUnavailable' });
            return;
        }
        const eligibility = await this.getEosPasswordlessClaimEligibility(userId);
        if (!eligibility.eligible || (eligibility.role !== 'installer' && eligibility.role !== 'enduser')) {
            // Deliberately do not reveal whether an account exists or which state it is in.
            res.status(403).json({ error: 'claimUnavailable' });
            return;
        }
        this.invalidateEosPasswordClaimsForUser(userId);
        const token = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        const ttl = this.getEosPasswordClaimTtlMs();
        this.eosPasswordClaims.set(this.hashEosPasswordClaim(token), {
            userId,
            role: eligibility.role,
            expiresAt: Date.now() + ttl,
            remoteAddress: this.getEosRemoteAddress(req),
        });
        res.cookie('nexowatt_eos_first_login', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: !!this.settings.secure,
            path: '/nexowatt/account',
            maxAge: ttl,
        });
        res.status(200).json({
            success: true,
            role: eligibility.role,
            userName: userId.replace(/^system\.user\./, ''),
            minLength: eligibility.minLength,
            expiresInSeconds: Math.round(ttl / 1000),
        });
    }
    async saveEosPasswordlessFirstLogin(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        if (!this.isEosSameOriginWrite(req)
            || req.headers['x-nexowatt-eos-passwordless-password'] !== '1'
            || !this.isEosPasswordlessRequestNetworkAllowed(req)) {
            res.status(403).json({ error: 'claimUnavailable' });
            return;
        }
        this.cleanEosPasswordClaims();
        const token = this.readEosCookie(req, 'nexowatt_eos_first_login');
        const claim = token ? this.eosPasswordClaims.get(this.hashEosPasswordClaim(token)) : undefined;
        if (!claim || claim.expiresAt <= Date.now() || claim.remoteAddress !== this.getEosRemoteAddress(req)) {
            res.status(403).json({ error: 'claimExpired' });
            return;
        }
        const eligibility = await this.getEosPasswordlessClaimEligibility(claim.userId);
        if (!eligibility.eligible || eligibility.role !== claim.role) {
            this.invalidateEosPasswordClaimsForUser(claim.userId);
            res.status(403).json({ error: 'claimUnavailable' });
            return;
        }
        const body = (req.body || {});
        const validation = this.validateEosFirstLoginPassword(body.password, body.passwordRepeat, claim.userId);
        if (validation.valid === false) {
            res.status(400).json({ error: validation.error, minLength: eligibility.minLength });
            return;
        }
        await this.setEosUserPassword(claim.userId, validation.password);
        const now = new Date().toISOString();
        await this.updateEosAccountMetadata(claim.userId, (native, account) => {
            account.passwordInitialized = true;
            account.passwordInitializedAt = Date.now();
            account.passwordInitializationVersion = 1;
            account.passwordInitializedBy = 'passwordless-first-activation';
            account.passwordSetupVersion = 1;
            account.passwordSetAt = now;
            account.firstLoginCompletedAt = now;
            account.forcePasswordChange = false;
            account.passwordlessFirstLoginAllowed = false;
            account.passwordlessClaimCompletedAt = now;
            native.nexowattPasswordChangeRequired = false;
            native.eosPasswordChangeRequired = false;
            native.nexowattFirstLoginPending = false;
            native.eosFirstLoginRequired = false;
            native.nexowattInitialPasswordApplied = false;
            native.nexowattPasswordChangedAt = now;
        });
        this.invalidateEosPasswordClaimsForUser(claim.userId);
        res.clearCookie('nexowatt_eos_first_login', { path: '/nexowatt/account' });
        this.adapter.log.info(`EOS passwordless first activation completed for ${claim.userId}`);
        res.status(200).json({ success: true, role: claim.role, userName: claim.userId.replace(/^system\.user\./, '') });
    }
    async getEosManagedAccounts(requesterRole) {
        const users = new Map();
        const collect = async (role, groupIds) => {
            for (const groupId of groupIds) {
                const group = (await this.adapter.getForeignObjectAsync(groupId));
                for (const userId of group?.common?.members || []) {
                    const current = users.get(userId);
                    if (!current || role === 'installer') {
                        users.set(userId, role);
                    }
                }
            }
        };
        await collect('enduser', this.getEosEndUserGroups());
        await collect('installer', this.getEosInstallerGroups());
        const result = [];
        for (const [userId, role] of [...users.entries()].sort(([a], [b]) => a.localeCompare(b))) {
            if (requesterRole === 'installer' && role !== 'enduser') {
                continue;
            }
            const user = (await this.adapter.getForeignObjectAsync(userId));
            if (!user || userId === 'system.user.admin') {
                continue;
            }
            const native = (user.native || {});
            const account = (native.nexowattEosAccount || {});
            const setup = await this.getEosFirstLoginPasswordState(userId, role);
            result.push({
                id: userId,
                userName: userId.replace(/^system\.user\./, ''),
                displayName: this.getTranslatedName(user.common?.name),
                role,
                enabled: user.common?.enabled !== false,
                migrationDisabled: account.disabledForCredentialMigration === true,
                firstLoginRequired: setup.required,
                passwordInitialized: setup.initialized,
                passwordlessFirstLoginAllowed: account.passwordlessFirstLoginAllowed === true,
                passwordSetAt: account.passwordSetAt || account.firstLoginCompletedAt || null,
                passwordResetAt: account.passwordResetAt || null,
                passwordResetBy: account.passwordResetBy || null,
            });
        }
        return result;
    }
    async sendEosAccountManagement(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const access = await this.getEosRequestAccess(req);
        if (!access.userId || (access.role !== 'admin' && access.role !== 'installer')) {
            res.status(403).json({ error: 'permissionError' });
            return;
        }
        res.status(200).json({
            role: access.role,
            canResetInstaller: access.role === 'admin',
            canResetEndUser: true,
            accounts: await this.getEosManagedAccounts(access.role),
        });
    }
    async resetEosAccountPassword(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const access = await this.getEosRequestAccess(req);
        if (!access.userId || (access.role !== 'admin' && access.role !== 'installer')) {
            res.status(403).json({ error: 'permissionError' });
            return;
        }
        if (!this.isEosSameOriginWrite(req) || req.headers['x-nexowatt-eos-account-reset'] !== '1') {
            res.status(403).json({ error: 'invalidRequestOrigin' });
            return;
        }
        const targetUserId = this.normalizeEosUserId(req.body?.user);
        if (!targetUserId || targetUserId === 'system.user.admin' || targetUserId === access.userId) {
            res.status(400).json({ error: 'invalidTarget' });
            return;
        }
        const targetAccess = await this.getEosAccessForUserId(targetUserId);
        const explicitInstaller = targetAccess.groups.some(group => this.getEosInstallerGroups().includes(group));
        const explicitEndUser = targetAccess.groups.some(group => this.getEosEndUserGroups().includes(group));
        const explicitlyManagedRole = explicitInstaller
            ? 'installer'
            : explicitEndUser
                ? 'enduser'
                : null;
        if (targetAccess.role === 'admin'
            || !explicitlyManagedRole
            || (access.role === 'installer' && explicitlyManagedRole !== 'enduser')) {
            // Never rely on the secure-default "enduser" classification for a password reset. The
            // target must be an explicit member of a managed EOS installer/end-user group.
            res.status(403).json({ error: 'permissionError' });
            return;
        }
        const currentUser = (await this.adapter.getForeignObjectAsync(targetUserId));
        if (!currentUser) {
            res.status(404).json({ error: 'accountNotFound' });
            return;
        }
        const migrationDisabled = currentUser.native?.nexowattEosAccount?.disabledForCredentialMigration === true;
        if (currentUser.common?.enabled === false && (!migrationDisabled || access.role !== 'admin')) {
            res.status(409).json({ error: 'accountDisabled' });
            return;
        }
        const temporaryPassword = `${(0, node_crypto_1.randomBytes)(24).toString('base64url')}!aA1`;
        await this.setEosUserPassword(targetUserId, temporaryPassword);
        const now = new Date().toISOString();
        await this.updateEosAccountMetadata(targetUserId, (native, account) => {
            account.passwordInitialized = false;
            account.passwordSetupVersion = 0;
            account.passwordInitializationVersion = 0;
            account.forcePasswordChange = true;
            account.passwordlessFirstLoginAllowed = false;
            account.passwordResetAt = now;
            account.passwordResetBy = access.userId;
            account.passwordResetMode = 'unique-temporary-password';
            account.disabledForCredentialMigration = false;
            account.passwordSetAt = null;
            account.firstLoginCompletedAt = null;
            native.nexowattPasswordChangeRequired = true;
            native.eosPasswordChangeRequired = true;
            native.nexowattFirstLoginPending = true;
            native.eosFirstLoginRequired = true;
            native.nexowattInitialPasswordApplied = true;
            native.nexowattInitialPasswordVersion = 1;
            native.nexowattStableInitialCredentialVersion = 1;
        });
        if (migrationDisabled) {
            await this.adapter.extendForeignObjectAsync(targetUserId, { common: { enabled: true } }, { user: EOS_PASSWORD_SERVICE_USER });
        }
        this.invalidateEosPasswordClaimsForUser(targetUserId);
        this.adapter.log.warn(`EOS account ${targetUserId} was reset to the mandatory initial-password flow by ${access.userId}`);
        res.status(200).json({
            success: true,
            user: targetUserId,
            role: explicitlyManagedRole,
            firstLoginRequired: true,
            passwordlessFirstLoginAllowed: false,
            initialPasswordRequired: true,
            temporaryPassword,
        });
    }
    async getEosHistoryInstances() {
        try {
            const instances = await this.adapter.getObjectViewAsync('system', 'instance', {
                startkey: 'system.adapter.',
                endkey: 'system.adapter.香',
            });
            return (instances.rows || [])
                .map(row => row.value)
                .filter(instance => !!instance?.common?.getHistory)
                .map(instance => instance._id.replace(/^system\.adapter\./, ''))
                .sort();
        }
        catch (e) {
            this.adapter.log.debug(`Cannot read history instances for EOS basic settings: ${e instanceof Error ? e.message : e}`);
            return [];
        }
    }
    async sendEosBasicSettings(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const access = await this.getEosRequestAccess(req);
        if (access.role !== 'installer' && access.role !== 'admin') {
            res.status(403).json({ error: 'permissionError', role: access.role });
            return;
        }
        const systemConfig = (await this.adapter.getForeignObjectAsync('system.config'));
        const common = systemConfig?.common || {};
        const histories = await this.getEosHistoryInstances();
        res.status(200).json({
            role: access.role,
            editable: access.role === 'installer' || access.role === 'admin',
            settings: {
                siteName: common.siteName || '',
                language: common.language || 'de',
                tempUnit: common.tempUnit || '°C',
                currency: common.currency || '€',
                dateFormat: common.dateFormat || 'DD.MM.YYYY',
                isFloatComma: common.isFloatComma !== false,
                defaultHistory: common.defaultHistory || '',
                defaultLogLevel: common.defaultLogLevel || 'info',
                firstDayOfWeek: common.firstDayOfWeek || 'monday',
                country: common.country || '',
                city: common.city || '',
                latitude: Number(common.latitude || 0),
                longitude: Number(common.longitude || 0),
            },
            options: {
                languages: ['de', 'en', 'nl', 'fr', 'it', 'es', 'pl', 'pt', 'ru', 'uk', 'zh-cn'],
                tempUnits: ['°C', '°F'],
                dateFormats: ['DD.MM.YYYY', 'YYYY.MM.DD', 'MM/DD/YYYY'],
                firstDaysOfWeek: ['monday', 'sunday'],
                logLevels: ['debug', 'info', 'warn', 'error'],
                histories: ['', ...histories],
            },
            hiddenAdminAreas: [
                'repositories',
                'licenses',
                'certificates',
                'credentials',
                'letsEncrypt',
                'defaultAcl',
                'expertMode',
            ],
        });
    }
    getNexoWattStableUpdateManager() {
        this.nexowattStableUpdateManager ||= new eosAutoUpdate_1.NexoWattStableUpdateManager(this.adapter);
        return this.nexowattStableUpdateManager;
    }
    async sendNexoWattStableUpdateStatus(req, res) {
        const access = await this.getEosRequestAccess(req);
        if (access.role !== 'admin') {
            res.status(403).json({ error: 'permissionError' });
            return;
        }
        res.status(200).json(await this.getNexoWattStableUpdateManager().getStatus(false));
    }
    async saveNexoWattStableUpdateSettings(req, res) {
        const access = await this.getEosRequestAccess(req);
        if (access.role !== 'admin') {
            res.status(403).json({ error: 'permissionError' });
            return;
        }
        if (req.headers['x-nexowatt-eos-auto-update'] !== '1' || !this.isEosSameOriginWrite(req)) {
            res.status(403).json({ error: 'invalidRequest' });
            return;
        }
        if (typeof req.body?.enabled !== 'boolean') {
            res.status(400).json({ error: 'invalidEnabledValue' });
            return;
        }
        res.status(200).json(await this.getNexoWattStableUpdateManager().setEnabled(req.body.enabled));
    }
    isEosSameOriginWrite(req) {
        return (0, eosRequestSecurity_1.isEosSameOriginRequest)(req.headers, 'https:');
    }
    async saveEosBasicSettings(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const access = await this.getEosRequestAccess(req);
        if (access.role !== 'installer' && access.role !== 'admin') {
            res.status(403).json({ error: 'permissionError', role: access.role });
            return;
        }
        if (!this.isEosSameOriginWrite(req) || req.headers['x-nexowatt-eos-role-settings'] !== '1') {
            res.status(403).json({ error: 'invalidRequestOrigin' });
            return;
        }
        const input = (req.body?.settings || req.body || {});
        const systemConfig = (await this.adapter.getForeignObjectAsync('system.config'));
        if (!systemConfig?.common) {
            res.status(503).json({ error: 'systemConfigUnavailable' });
            return;
        }
        const next = { ...systemConfig, common: { ...systemConfig.common } };
        const common = next.common;
        const setString = (key, maxLength, allowed) => {
            if (!(key in input)) {
                return;
            }
            const value = String(input[key] ?? '').trim().slice(0, maxLength);
            if (!allowed || allowed.includes(value)) {
                common[key] = value;
            }
        };
        const setCoordinate = (key, min, max) => {
            if (!(key in input)) {
                return;
            }
            const value = Number(input[key]);
            if (Number.isFinite(value) && value >= min && value <= max) {
                common[key] = value;
            }
        };
        setString('siteName', 120);
        setString('language', 8, ['de', 'en', 'nl', 'fr', 'it', 'es', 'pl', 'pt', 'ru', 'uk', 'zh-cn']);
        setString('tempUnit', 3, ['°C', '°F']);
        setString('currency', 8);
        setString('dateFormat', 16, ['DD.MM.YYYY', 'YYYY.MM.DD', 'MM/DD/YYYY']);
        if ('isFloatComma' in input) {
            common.isFloatComma = input.isFloatComma === true || input.isFloatComma === 'true' || input.isFloatComma === 1;
        }
        const histories = await this.getEosHistoryInstances();
        setString('defaultHistory', 100, ['', ...histories]);
        setString('defaultLogLevel', 8, ['debug', 'info', 'warn', 'error']);
        setString('firstDayOfWeek', 8, ['monday', 'sunday']);
        setString('country', 3);
        setString('city', 120);
        setCoordinate('latitude', -90, 90);
        setCoordinate('longitude', -180, 180);
        // Explicitly ignore every privilege/security field even if a manipulated browser submits it.
        delete common.expertMode;
        common.expertMode = systemConfig.common.expertMode === true;
        common.activeRepo = systemConfig.common.activeRepo;
        common.defaultNewAcl = systemConfig.common.defaultNewAcl;
        await this.adapter.setForeignObjectAsync('system.config', next);
        this.adapter.log.info(`EOS installer basic settings updated by ${access.userId || 'unknown user'}`);
        await this.sendEosBasicSettings(req, res);
    }
    async getEosReadonlySystemInfo() {
        return (0, eosWebResources_1.readSystemInfo)();
    }
    async sendEosReadonlySystemInfo(req, res) {
        const access = await this.getEosRequestAccess(req);
        const authenticated = !this.settings.auth || !!access.userId;
        if (!authenticated) {
            res.status(401).json({ error: 'authenticationRequired' });
            return;
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json(await this.getEosReadonlySystemInfo());
    }
    async sendEosSecuritySession(req, res) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        const { userId, groups, groupNames, adminGroups, role } = await this.getEosRequestAccess(req);
        const passwordSetup = await this.getEosFirstLoginPasswordState(userId, role);
        const isAdministrator = role === 'admin' && (userId === 'system.user.admin' || groups.includes('system.group.administrator'));
        const isEosAdminGroup = role === 'admin';
        const isInstaller = role === 'installer';
        const isEndUser = role === 'enduser';
        const authenticated = !!userId;
        res.status(200).json({
            authenticated,
            user: userId,
            groups,
            groupNames,
            adminGroups,
            installerGroups: this.getEosInstallerGroups(),
            endUserGroups: this.getEosEndUserGroups(),
            role,
            isAdministrator,
            isEosAdminGroup,
            isInstaller,
            isEndUser,
            isAdmin: isEosAdminGroup,
            mustChangePassword: passwordSetup.required,
            passwordSetup: { ...passwordSetup, userName: userId?.replace(/^system\.user\./, '') || '' },
            capabilities: authenticated && !passwordSetup.required ? this.getEosRoleCapabilities(role) : {},
            hideLegacyAdminForNonAdmins: this.settings.eosHideLegacyAdminForNonAdmins !== false && this.settings.eosHideLegacyAdminFromNonAdmins !== false,
            hideLegacyAdminFromNonAdmins: this.settings.eosHideLegacyAdminForNonAdmins !== false && this.settings.eosHideLegacyAdminFromNonAdmins !== false,
            hideLegacyBackupFromNonAdmins: this.settings.eosHideLegacyBackupFromNonAdmins !== false,
            restrictProtectedAdapterControls: this.settings.eosRestrictProtectedAdapterControls !== false,
            legacyAdminAdapter: 'admin',
            legacyAdminInstance: 'admin.0',
            legacyBackupAdapter: LEGACY_BACKUP_ADAPTER_NAME,
            customerBackupAdapters: [...CUSTOMER_BACKUP_ADAPTER_NAMES],
            protectedAdapters: this.getEosProtectedAdapterNames(),
        });
    }
    resetIndexHtml() {
        this.indexHTML = '';
    }
    extractAccessToken(req) {
        const cookies = req.headers.cookie?.split(';').find(c => c.trim().startsWith('access_token='));
        let tokenCookie = cookies?.split('=')[1] || null;
        if (!tokenCookie && req.headers.authorization?.startsWith('Bearer ')) {
            tokenCookie = req.headers.authorization.split(' ')[1];
        }
        else if (!tokenCookie && req.query?.token) {
            tokenCookie = req.query.token;
        }
        return tokenCookie || null;
    }
    async getSessionUser(req) {
        return this.readEosCurrentUser(req);
    }
    async getGroupsForUser(userId) {
        if (!userId) {
            return [];
        }
        try {
            const groups = await this.adapter.getForeignObjectsAsync('system.group.*', 'group');
            return Object.values(groups || {})
                .filter(group => Array.isArray(group?.common?.members) && group.common.members.includes(userId))
                .map(group => group._id)
                .filter((id) => !!id);
        }
        catch (e) {
            this.adapter.log.debug(`Cannot read groups for NexoWatt security context: ${e.message}`);
            return [];
        }
    }
    async getNexowattSecurityContext(req) {
        const access = await this.getEosRequestAccess(req);
        const user = access.userId;
        const groups = access.groups;
        const adminOnlyGroups = this.getEosSecurityAdminGroups();
        const isAdminGroup = !!user && access.role === 'admin';
        const hideLegacyAdmin = !isAdminGroup;
        return {
            user,
            groups,
            adminOnlyGroups,
            isAdminGroup,
            hideLegacyAdmin,
            hideLegacyBackup: !isAdminGroup,
            legacyBackupAdapter: LEGACY_BACKUP_ADAPTER_NAME,
            customerBackupAdapters: [...CUSTOMER_BACKUP_ADAPTER_NAMES],
            protectedAdapters: this.getEosProtectedAdapterNames(),
        };
    }
    eosTechnicalRouteGuard(adminOnly, write = false) {
        return (req, res, next) => {
            void (async () => {
                const access = await this.getEosRequestAccess(req);
                if (!access.userId || (access.role !== 'admin' && (adminOnly || access.role !== 'installer'))) {
                    res.status(403).json({ error: 'permissionError' });
                    return;
                }
                if ((await this.getEosFirstLoginPasswordState(access.userId, access.role)).required) {
                    res.status(403).json({ error: 'passwordChangeRequired' });
                    return;
                }
                if (write && !this.isEosSameOriginWrite(req)) {
                    res.status(403).json({ error: 'invalidRequestOrigin' });
                    return;
                }
                next();
            })().catch(() => res.status(503).json({ error: 'securityContextUnavailable' }));
        };
    }
    getSafeLoginOrigin(req) {
        let origin = '';
        try {
            const url = new URL(req.url, 'http://127.0.0.1');
            origin = url.searchParams.get('origin') || '';
        }
        catch {
            const match = req.url.match(/[?&]origin=([^&]*)/);
            origin = match?.[1] || '';
        }
        if (!origin) {
            return null;
        }
        try {
            origin = decodeURIComponent(origin);
        }
        catch {
            // keep raw value and validate below
        }
        origin = String(origin || '').trim();
        // Reject encoded hashes/login/logout/404 and hard-timeout parameters. The old logic
        // generated paths such as /%2F%23tab-adapters&hard=1/index.html?login.
        if (!origin || /(?:%2f|%23|#|login|logout|404|hard=|undefined|null)/i.test(origin)) {
            return null;
        }
        origin = origin.split('?')[0];
        const pos = origin.lastIndexOf('/');
        if (pos > 0) {
            origin = origin.substring(0, pos);
        }
        else if (pos === 0) {
            origin = '';
        }
        if (!origin || origin === '.') {
            return null;
        }
        if (/^https?:\/\//i.test(origin)) {
            try {
                const parsed = new URL(origin);
                return parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') : null;
            }
            catch {
                return null;
            }
        }
        if (!origin.startsWith('/')) {
            return null;
        }
        return origin.replace(/\/+$/, '') || null;
    }
    /**
     * Initialize the server
     */
    async #init() {
        this.settings = (0, eosApplianceProfile_1.applyProfile)(this.settings);
        const bind = (0, eosWebResources_1.safeWebBind)(this.settings);
        if (bind !== this.settings.bind && !this.settings.secure) {
            this.adapter.log.warn('Plain HTTP is restricted to loopback. Configure TLS before network access; use a local console or SSH tunnel for setup.');
        }
        this.settings = { ...this.settings, bind, auth: true };
        if (this.settings.port) {
            this.server.app = express();
            this.server.app.use((0, eosWebResources_1.loopbackHttpGuard)(this.settings.secure));
            this.server.app.use(compression());
            this.settings.ttl = Math.round(Number(this.settings.ttl)) || 3_600;
            this.settings.accessAllowedConfigs ||= [];
            this.settings.accessAllowedTabs ||= [];
            this.server.app.disable('x-powered-by');
            // enable use of i-frames together with HTTPS
            this.server.app.get('/*any', (_req, res, next) => {
                res.header('X-Frame-Options', 'SAMEORIGIN');
                next(); // http://expressjs.com/guide.html#passing-route control
            });
            // ONLY for DEBUG
            /*server.app.use((req: Request, res: Response, next: NextFunction): void => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                next();
            });*/
            void this.getNexoWattStableUpdateManager().start().catch(error => this.adapter.log.warn(`[NexoWatt stable updates] Startup reconciliation failed: ${error instanceof Error ? error.message : error}`));
            this.server.app.get('/version', (_req, res) => {
                res.status(200).send(this.adapter.version);
            });
            // v36: Repair stale/broken URLs generated by older EOS hard-logout builds.
            this.server.app.use((req, res, next) => {
                const requested = String(req.originalUrl || req.url || '');
                if (/(?:%2f|%252f)(?:%23|%2523)|\/login\/|\/logout\/|hard=1/i.test(requested)
                    && /index\.html|login|hard=1|origin=|%23|%2523/i.test(requested)) {
                    res.redirect(this.LOGIN_PAGE);
                    return;
                }
                next();
            });
            // replace socket.io
            this.server.app.use((req, res, next) => {
                const url = req.url.split('?')[0];
                // return favicon always
                if (url === '/auth') {
                    // User can ask server if authentication enabled
                    res.setHeader('Content-Type', 'application/json');
                    res.json({ auth: this.settings.auth });
                }
                else if (url === '/favicon.ico') {
                    res.set('Content-Type', 'image/x-icon');
                    if (this.systemConfig.native.vendor.ico) {
                        // convert base64 to ico
                        const text = this.systemConfig.native.vendor.ico.split(',')[1];
                        res.send(Buffer.from(text, 'base64'));
                        return;
                    }
                    res.send((0, node_fs_1.readFileSync)((0, node_path_1.join)(this.wwwDir, 'favicon.ico')));
                    return;
                }
                else if (socketIoFile !== false && url.includes('socket.io.js')) {
                    if (socketIoFile) {
                        res.contentType('text/javascript');
                        res.status(200).send(socketIoFile);
                        return;
                    }
                    socketIoFile = (0, node_fs_1.readFileSync)((0, node_path_1.join)(this.wwwDir, 'lib', 'js', 'socket.io.js'), {
                        encoding: 'utf-8',
                    });
                    if (socketIoFile) {
                        res.contentType('text/javascript');
                        res.status(200).send(socketIoFile);
                        return;
                    }
                    socketIoFile = false;
                    res.status(404).send(get404Page());
                    return;
                }
                next();
            });
            this.server.app.get(/.*\/_socket\/info\.js/, (_req, res) => {
                res.set('Content-Type', 'application/javascript');
                res.status(200).send(this.getInfoJs());
            });
            if (this.settings.auth) {
                AdapterStore = adapter_core_1.commonTools.session(session, this.settings.ttl);
                this.store = new AdapterStore({ adapter: this.adapter });
                this.server.app.use(cookieParser());
                // License imports must pass authentication, Origin and rate limits
                // before their small dedicated JSON parser consumes any body.
                const genericUrlencoded = bodyParser.urlencoded({ extended: true });
                const genericJson = bodyParser.json();
                const isLicensePath = (req) => /^\/nexowatt\/license(?:\/|$)/i.test(req.path);
                this.server.app.use((req, res, next) => {
                    if (isLicensePath(req)) {
                        next();
                        return;
                    }
                    genericUrlencoded(req, res, next);
                });
                this.server.app.use((req, res, next) => {
                    if (isLicensePath(req)) {
                        next();
                        return;
                    }
                    genericJson(req, res, next);
                });
                // Hardened local profile: do not allow SSO to perform remote account side effects.
                this.server.app.all(['/sso', '/sso-callback'], (_req, res) => {
                    res.status(403).json({ error: 'ssoUnavailableInLocalSecurityProfile' });
                });
                // Bind upstream OAuth issuance and reads to the revocable EOS credential snapshot.
                this.oauth2Model = (0, webserver_1.createOAuth2Server)(this.adapter, {
                    app: this.server.app,
                    secure: this.settings.secure,
                    accessLifetime: this.settings.ttl,
                    refreshLifetime: 60 * 60 * 24 * 7, // 1 week, same as upstream admin
                    noBasicAuth: this.settings.noBasicAuth,
                    loginPage: (req) => {
                        const isDev = req.url.includes('?dev');
                        const origin = this.getSafeLoginOrigin(req);
                        if (isDev) {
                            return 'http://127.0.0.1:3000/index.html?login';
                        }
                        return origin ? origin + this.LOGIN_PAGE : this.LOGIN_PAGE;
                    },
                });
                this.adapter.eosSessionSecurity.bindOAuthModel(this.oauth2Model);
                this.server.app.get('/session', (req, res) => {
                    // v36: Follow upstream admin semantics again. Do not run a second
                    // EOS hard-logout timer here; the official OAuth/session handling
                    // already uses the configured access lifetime.
                    if (req.headers.cookie) {
                        const cookies = req.headers.cookie.split(';').find(c => c.trim().startsWith('access_token='));
                        let tokenCookie = cookies?.split('=')[1];
                        if (!tokenCookie && req.headers.authorization?.startsWith('Bearer ')) {
                            tokenCookie = req.headers.authorization.split(' ')[1];
                        }
                        else if (!tokenCookie && req.query?.token) {
                            tokenCookie = req.query.token;
                        }
                        if (tokenCookie) {
                            const candidates = new Set();
                            candidates.add(tokenCookie.startsWith('a:') ? tokenCookie : `a:${tokenCookie}`);
                            const ids = Array.from(candidates);
                            const readNext = (index) => {
                                const id = ids[index];
                                if (!id) {
                                    res.json({ expireInSec: 0 });
                                    return;
                                }
                                void this.adapter.getSession(id, (token) => {
                                    if (!token?.user || typeof token.aExp !== 'number' || token.aExp <= Date.now()) {
                                        readNext(index + 1);
                                    }
                                    else {
                                        res.json({ expireInSec: Math.round((token.aExp - Date.now()) / 1000) });
                                    }
                                });
                            };
                            readNext(0);
                            return;
                        }
                    }
                    res.json({ error: 'Cannot find session' });
                });
                this.server.app.get(/.*\/nexowatt\/security\/(?:context|session)$/, (req, res) => {
                    void this.sendEosSecuritySession(req, res).catch(e => {
                        this.adapter.log.warn(`Cannot create NexoWatt security context: ${e instanceof Error ? e.message : e}`);
                        res.status(503).json({
                            error: 'EOS security context temporarily unavailable',
                            transient: true,
                            authenticated: false,
                            user: null,
                            groups: [],
                            groupNames: [],
                            adminGroups: ['system.group.administrator'],
                            installerGroups: this.getEosInstallerGroups(),
                            endUserGroups: this.getEosEndUserGroups(),
                            role: 'unknown',
                            isAdministrator: false,
                            isEosAdminGroup: false,
                            isInstaller: false,
                            isEndUser: false,
                            isAdmin: false,
                            mustChangePassword: false,
                            passwordSetup: {
                                required: false,
                                initialized: false,
                                minLength: this.getEosFirstLoginPasswordMinLength(),
                                version: 1,
                                userName: '',
                            },
                            capabilities: {},
                            hideLegacyAdminForNonAdmins: true,
                            hideLegacyAdminFromNonAdmins: true,
                            restrictProtectedAdapterControls: true,
                            protectedAdapters: this.getEosProtectedAdapterNames(),
                        });
                    });
                });
                this.server.app.get('/logout', (req, res) => {
                    const isDev = req.url.includes('?dev');
                    const origin = this.getSafeLoginOrigin(req);
                    // v36: normal logout; remove known auth cookies before redirecting.
                    for (const cookieName of ['access_token', 'refresh_token', 'connect.sid', 'io', 'ioBroker.sid', 'eos-admin.sid']) {
                        res.clearCookie(cookieName, { path: '/' });
                    }
                    const sessionReq = req;
                    sessionReq.session?.destroy?.(() => undefined);
                    if (isDev) {
                        res.redirect('http://127.0.0.1:3000/index.html?login');
                    }
                    else {
                        res.redirect(origin ? origin + this.LOGIN_PAGE : this.LOGIN_PAGE);
                    }
                });
                // Passwordless first activation is not a normal authenticated session. The two
                // narrow routes below only issue/consume a short-lived HttpOnly claim and are registered
                // before the general login middleware. They never expose the EOS application itself.
                this.server.app.post('/nexowatt/account/passwordless-status', (req, res) => {
                    void this.getEosPasswordlessFirstLoginStatus(req, res).catch(e => {
                        this.adapter.log.debug(`Cannot read EOS passwordless activation status: ${e instanceof Error ? e.message : e}`);
                        res.status(200).json({ success: true, eligible: false });
                    });
                });
                this.server.app.post('/nexowatt/account/passwordless-claim', (req, res) => {
                    void this.startEosPasswordlessFirstLogin(req, res).catch(e => {
                        this.adapter.log.warn(`Cannot start EOS passwordless activation: ${e instanceof Error ? e.message : e}`);
                        res.status(500).json({ error: 'claimUnavailable' });
                    });
                });
                this.server.app.post('/nexowatt/account/passwordless-password', (req, res) => {
                    void this.saveEosPasswordlessFirstLogin(req, res).catch(e => {
                        this.adapter.log.warn(`Cannot complete EOS passwordless activation: ${e instanceof Error ? e.message : e}`);
                        res.status(500).json({ error: 'passwordSetupFailed' });
                    });
                });
                // route middleware to make sure a user is logged in
                this.server.app.use((req, res, next) => {
                    // return favicon always
                    if (req.url === '/favicon.ico') {
                        res.set('Content-Type', 'image/x-icon');
                        if (this.systemConfig.native.vendor.ico) {
                            // convert base64 to ico
                            const text = this.systemConfig.native.vendor.ico.split(',')[1];
                            res.send(Buffer.from(text, 'base64'));
                            return;
                        }
                        res.send((0, node_fs_1.readFileSync)((0, node_path_1.join)(this.wwwDir, 'favicon.ico')));
                        return;
                    }
                    if (/admin\.\d+\/login-bg\.png(\?.*)?$/.test(req.originalUrl)) {
                        // Read the names of files for gong
                        this.adapter.readFile(this.adapter.namespace, 'login-bg.png', null, (err, file) => {
                            if (!err && file) {
                                res.set('Content-Type', 'image/png');
                                res.status(200).send(file);
                            }
                            else {
                                res.status(404).send(get404Page());
                            }
                        });
                        return;
                    }
                    if ((req.isAuthenticated && !req.isAuthenticated()) || (!req.isAuthenticated && !req.user)) {
                        const pathName = req.url.split('?')[0];
                        if (pathName.startsWith('/login/') ||
                            pathName.endsWith('.ico') ||
                            pathName.endsWith('manifest.json')) {
                            return next();
                        }
                        // protect all paths except
                        this.unprotectedFiles ||= (0, node_fs_1.readdirSync)(this.wwwDir).map(file => {
                            const stat = (0, node_fs_1.lstatSync)((0, node_path_1.join)(this.wwwDir, file));
                            return { name: file, isDir: stat.isDirectory() };
                        });
                        if (pathName &&
                            pathName !== '/' &&
                            !this.unprotectedFiles.find(file => file.isDir ? pathName.startsWith(`/${file.name}/`) : `/${file.name}` === pathName)) {
                            res.redirect(`${this.LOGIN_PAGE}&href=${encodeURIComponent(req.originalUrl)}`);
                        }
                        else {
                            next();
                            return;
                        }
                    }
                    else {
                        next();
                        return;
                    }
                });
            }
            else {
                this.server.app.get('/logout', (_req, res) => res.redirect('/'));
            }
            this.server.app.get('/nexowatt/updates/status', this.eosTechnicalRouteGuard(true), (req, res) => { void this.sendNexoWattStableUpdateStatus(req, res).catch(() => res.status(500).json({ error: 'updateStatusFailed' })); });
            this.server.app.post('/nexowatt/updates/settings', this.eosTechnicalRouteGuard(true, true), (req, res) => { void this.saveNexoWattStableUpdateSettings(req, res).catch(() => res.status(500).json({ error: 'updateSettingsFailed' })); });
            (0, eosLicenseHttp_1.registerLicenseRoutes)(this.server.app, {
                service: this.adapter.eosLicenseService,
                secure: this.settings.secure === true,
                authorize: async (req) => {
                    if (!this.settings.auth)
                        return false;
                    const access = await this.getEosRequestAccess(req);
                    return !!access.userId && access.role === 'admin'
                        && !(await this.getEosFirstLoginPasswordState(access.userId, access.role)).required;
                },
                jsonParser: bodyParser.json({ limit: '20kb', strict: true }),
                pagePath: (0, node_path_1.join)(__dirname, '../../public/nexowatt-license.html'),
                scriptPath: (0, node_path_1.join)(__dirname, '../../public/nexowatt-license.js'),
            });
            const sendSecuritySession = (req, res) => {
                void this.sendEosSecuritySession(req, res).catch(e => {
                    this.adapter.log.warn(`Cannot read EOS security session: ${e instanceof Error ? e.message : e}`);
                    res.status(503).json({
                        error: 'EOS security context temporarily unavailable',
                        transient: true,
                        authenticated: false,
                        user: null,
                        role: 'unknown',
                        mustChangePassword: false,
                    });
                });
            };
            this.server.app.get('/eos/security/status', sendSecuritySession);
            this.server.app.get('/nexowatt/security/session', sendSecuritySession);
            this.server.app.get('/nexowatt/security/context', sendSecuritySession);
            this.server.app.get('/nexowatt/readonly/system-info', this.eosTechnicalRouteGuard(false), (req, res) => {
                void this.sendEosReadonlySystemInfo(req, res).catch(e => {
                    this.adapter.log.warn(`Cannot read EOS readonly system info: ${e instanceof Error ? e.message : e}`);
                    res.status(500).json({ error: 'readonlySystemInfoFailed' });
                });
            });
            this.server.app.get('/nexowatt/role-settings/basic', this.eosTechnicalRouteGuard(false), (req, res) => {
                void this.sendEosBasicSettings(req, res).catch(e => {
                    this.adapter.log.warn(`Cannot read EOS basic settings: ${e instanceof Error ? e.message : e}`);
                    res.status(500).json({ error: 'basicSettingsReadFailed' });
                });
            });
            this.server.app.post('/nexowatt/role-settings/basic', this.eosTechnicalRouteGuard(false, true), (req, res) => {
                void this.saveEosBasicSettings(req, res).catch(e => {
                    this.adapter.log.warn(`Cannot save EOS basic settings: ${e instanceof Error ? e.message : e}`);
                    res.status(500).json({ error: 'basicSettingsSaveFailed' });
                });
            });
            this.server.app.post('/nexowatt/account/first-password', (req, res) => {
                void this.saveEosFirstLoginPassword(req, res).catch(() => {
                    this.adapter.log.warn('Cannot initialize EOS first-login password');
                    res.status(500).json({ error: 'passwordSetupFailed' });
                });
            });
            this.server.app.post('/nexowatt/account/password', (req, res) => {
                void this.saveEosOwnPassword(req, res).catch(() => {
                    this.adapter.log.warn('EOS own password change failed');
                    res.status(500).json({ error: 'passwordChangeFailed' });
                });
            });
            this.server.app.get('/nexowatt/account/manage', this.eosTechnicalRouteGuard(false), (req, res) => {
                void this.sendEosAccountManagement(req, res).catch(e => {
                    this.adapter.log.warn(`Cannot read EOS account management: ${e instanceof Error ? e.message : e}`);
                    res.status(500).json({ error: 'accountManagementFailed' });
                });
            });
            this.server.app.post('/nexowatt/account/reset', this.eosTechnicalRouteGuard(false, true), (req, res) => {
                void this.resetEosAccountPassword(req, res).catch(() => {
                    this.adapter.log.warn('Cannot reset EOS account');
                    res.status(500).json({ error: 'accountResetFailed' });
                });
            });
            this.server.app.get('/iobroker_check.html', (_req, res) => {
                res.status(200).send('ioBroker');
            });
            this.server.app.get('/validate_config/*any', this.eosTechnicalRouteGuard(true), async (req, res) => {
                const adapterName = req.url.split('/').pop();
                await this.validateJsonConfig(adapterName.toLowerCase());
                res.status(200).send('validated');
            });
            // send log files
            this.server.app.get('/log/*any', this.eosTechnicalRouteGuard(true), (req, res) => {
                let parts = decodeURIComponent(req.url).split('/');
                if (parts.length === 5) {
                    // remove first "/"
                    parts.shift();
                    // remove "log"
                    parts.shift();
                    const [host, transport] = parts;
                    parts = parts.splice(2);
                    const fileName = parts.join('/');
                    if (fileName.includes('..')) {
                        res.status(404).send(get404Page(`File ${escapeHtml(fileName)} not found. Do not use relative paths!`));
                        return;
                    }
                    this.adapter.sendToHost(`system.host.${host}`, 'getLogFile', { filename: fileName, transport }, result => {
                        const _result = result;
                        if (!_result || _result.error) {
                            if (_result?.error) {
                                this.adapter.log.warn(`Cannot read log file ${fileName}: ${_result.error}`);
                            }
                            res.status(404).send(get404Page(`File ${escapeHtml(fileName)} not found`));
                        }
                        else {
                            if (_result.gz) {
                                if (_result.size > 1024 * 1024) {
                                    res.header('Content-Type', 'application/gzip');
                                    res.send(_result.data);
                                }
                                else {
                                    try {
                                        this.unzipFile(fileName, _result.data, res);
                                    }
                                    catch (e) {
                                        res.header('Content-Type', 'application/gzip');
                                        res.send(_result.data);
                                        this.adapter.log.warn('Compressed log preview unavailable; original gzip returned.');
                                    }
                                }
                            }
                            else if (_result.data === undefined || _result.data === null) {
                                res.status(404).send(get404Page(`File ${escapeHtml(fileName)} not found`));
                            }
                            else if (_result.size > 2 * 1024 * 1024) {
                                res.header('Content-Type', 'text/plain');
                                res.send(_result.data);
                            }
                            else {
                                res.header('Content-Type', 'text/html');
                                res.send(this.decorateLogFile(fileName, _result.data));
                            }
                        }
                    });
                }
                else {
                    parts = parts.splice(2);
                    const transport = parts.shift();
                    let fileName = parts.join('/');
                    const config = this.adapter.systemConfig;
                    // detect file log
                    if (transport && config?.log?.transport) {
                        if (transport in config.log.transport && config.log.transport[transport].type === 'file') {
                            let logFolder;
                            if (config.log.transport[transport].filename) {
                                parts = config.log.transport[transport].filename.replace(/\\/g, '/').split('/');
                                parts.pop();
                                logFolder = (0, node_path_1.normalize)(parts.join('/'));
                            }
                            else {
                                logFolder = (0, node_path_1.join)(process.cwd(), 'log');
                            }
                            if (logFolder[0] !== '/' && logFolder[0] !== '\\' && !logFolder.match(/^[a-zA-Z]:/)) {
                                const _logFolder = (0, node_path_1.normalize)((0, node_path_1.join)(`${this.baseDir}/../../`, logFolder).replace(/\\/g, '/')).replace(/\\/g, '/');
                                if (!(0, node_fs_1.existsSync)(_logFolder)) {
                                    logFolder = (0, node_path_1.normalize)((0, node_path_1.join)(`${this.baseDir}/../`, logFolder).replace(/\\/g, '/')).replace(/\\/g, '/');
                                }
                                else {
                                    logFolder = _logFolder;
                                }
                            }
                            fileName = (0, node_path_1.normalize)((0, node_path_1.join)(logFolder, fileName).replace(/\\/g, '/')).replace(/\\/g, '/');
                            if ((0, node_fs_1.existsSync)(fileName) && (() => {
                                const rel = (0, node_path_1.relative)((0, node_fs_1.realpathSync)(logFolder), (0, node_fs_1.realpathSync)(fileName));
                                return !!rel && rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !(0, node_path_1.isAbsolute)(rel);
                            })()) {
                                const stat = (0, node_fs_1.lstatSync)(fileName);
                                // if a file is an archive
                                if (fileName.toLowerCase().endsWith('.gz')) {
                                    // try to not process to big files
                                    if (stat.size > 1024 * 1024 /* || !existsSync('/dev/null')*/) {
                                        res.header('Content-Type', 'application/gzip');
                                        res.sendFile(fileName);
                                    }
                                    else {
                                        try {
                                            this.unzipFile(fileName, (0, node_fs_1.readFileSync)(fileName), res);
                                        }
                                        catch (e) {
                                            res.header('Content-Type', 'application/gzip');
                                            res.sendFile(fileName);
                                            this.adapter.log.warn('Compressed log preview unavailable; original gzip returned.');
                                        }
                                    }
                                }
                                else if (stat.size > 2 * 1024 * 1024) {
                                    res.header('Content-Type', 'text/plain');
                                    res.sendFile(fileName);
                                }
                                else {
                                    res.header('Content-Type', 'text/html');
                                    res.send(this.decorateLogFile(fileName));
                                }
                                return;
                            }
                        }
                    }
                    res.status(404).send(get404Page(`File ${escapeHtml(fileName)} not found`));
                }
            });
            const appOptions = {};
            if (this.settings.cache) {
                appOptions.maxAge = 30_758_400_000;
            }
            if (this.settings.tmpPathAllow && this.settings.tmpPath) {
                this.server.app.use('/tmp/', this.eosTechnicalRouteGuard(true), express.static(this.settings.tmpPath, { maxAge: 0 }));
                this.server.app.post('/upload', this.eosTechnicalRouteGuard(true, true), (0, eosUploadGuard_1.createUploadMiddleware)(fileUpload, this.adapter.log), (req, res) => {
                    if (!req.files) {
                        res.status(400).send('No files were uploaded.');
                        return;
                    }
                    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
                    let myFile;
                    // take the first non-empty file
                    for (const file of Object.values(req.files)) {
                        if (file) {
                            myFile = file;
                            break;
                        }
                    }
                    if (myFile) {
                        if (myFile.truncated || myFile.size > EOS_UPLOAD_MAX_BYTES) {
                            res.header('Content-Type', 'text/plain');
                            res.status(413).send('File is too big. (Max 200MB)');
                            return;
                        }
                        void (0, eosUploadGuard_1.storeRestoreUpload)(req, myFile.tempFilePath, (0, node_path_1.join)(this.settings.tmpPath, 'restore.iob')).then(() => {
                            if (req.aborted || res.destroyed || res.writableEnded) {
                                return;
                            }
                            res.header('Content-Type', 'text/plain');
                            res.status(200).send('File uploaded!');
                        }).catch(() => {
                            if (!req.aborted && !res.destroyed && !res.writableEnded)
                                res.status(500).json({ error: 'uploadStoreFailed' });
                        });
                    }
                    else {
                        res.header('Content-Type', 'text/plain');
                        res.status(500).send('File not uploaded');
                    }
                });
            }
            // Endpoint to upload adapter .tgz files for installation
            this.server.app.post('/upload-adapter', this.eosTechnicalRouteGuard(true, true), eosApplianceProfile_1.blockUnsignedUpload, (0, eosUploadGuard_1.createUploadMiddleware)(fileUpload, this.adapter.log), (req, res) => {
                if (!req.files) {
                    res.status(400).json({ error: 'No files were uploaded.' });
                    return;
                }
                let myFile;
                for (const file of Object.values(req.files)) {
                    if (file) {
                        myFile = file;
                        break;
                    }
                }
                if (!myFile) {
                    res.status(400).json({ error: 'File not uploaded' });
                    return;
                }
                if (myFile.truncated || myFile.size > EOS_UPLOAD_MAX_BYTES) {
                    res.status(413).json({ error: 'File is too big. (Max 200MB)' });
                    return;
                }
                const originalName = myFile.name || 'adapter.tgz';
                if (!originalName.toLowerCase().endsWith('.tgz')) {
                    res.status(400).json({ error: 'Only .tgz files are allowed' });
                    return;
                }
                // Sanitize filename to prevent path traversal
                const sanitizedName = `eos-${(0, node_crypto_1.randomBytes)(16).toString('hex')}.tgz`;
                const targetPath = (0, node_path_1.join)((0, eosUploadGuard_1.getUploadDirectory)(req), sanitizedName);
                myFile.mv(targetPath, err => {
                    if (req.aborted || res.destroyed || res.writableEnded) {
                        return;
                    }
                    if (err) {
                        res.status(500).json({
                            error: 'uploadStoreFailed',
                        });
                    }
                    else {
                        try {
                            (0, node_fs_1.chmodSync)(targetPath, 0o600);
                        }
                        catch {
                            res.status(500).json({ error: 'uploadPermissionsFailed' });
                            return;
                        }
                        (0, eosUploadGuard_1.retainUpload)(req);
                        res.json({ filePath: targetPath, fileName: sanitizedName });
                    }
                });
            });
            if (!(0, node_fs_1.existsSync)(this.wwwDir)) {
                this.server.app.use('/', (_req, res) => {
                    res.header('Content-Type', 'text/plain');
                    res.status(404).send('This adapter cannot be installed directly from GitHub.<br>You must install it from npm.<br>Write for that <i>"npm install iobroker.eos-admin"</i> in according directory.');
                });
            }
            else {
                this.server.app.get('/empty.html', (_req, res) => {
                    res.status(200).send('');
                });
                // Stability release: entrypoints and module-federation manifests must always
                // revalidate. Hashed leaf assets remain cacheable through express.static.
                this.server.app.use((req, res, next) => {
                    const pathName = req.path || req.url.split('?')[0];
                    if (pathName === '/'
                        || pathName === '/index.html'
                        || pathName === '/mf-manifest.json'
                        || /^\/remoteEntry(?:-v\d+)?\.js$/.test(pathName)
                        || /^\/assets\/(?:hostInit|index-CQZugZ1z)-[^/]+\.js$/.test(pathName)) {
                        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                        res.setHeader('Pragma', 'no-cache');
                        res.setHeader('Expires', '0');
                    }
                    next();
                });
                this.server.app.get('/index.html', async (_req, res) => {
                    this.indexHTML ||= await this.prepareIndex('/index.html');
                    res.header('Content-Type', 'text/html');
                    res.header('Cache-Control', 'no-cache');
                    res.status(200).send(this.indexHTML);
                });
                this.server.app.get('/', async (_req, res) => {
                    this.indexHTML ||= await this.prepareIndex('/index.html');
                    res.header('Content-Type', 'text/html');
                    res.header('Cache-Control', 'no-cache');
                    res.status(200).send(this.indexHTML);
                });
                this.server.app.use('/', express.static(this.wwwDir, appOptions));
            }
            // reverse proxy with url rewrite for couchdb attachments in <adapter-name>.admin
            this.server.app.use('/adapter/', (req, res) => {
                // Example: /example/?0&attr=1
                let url;
                try {
                    url = decodeURIComponent(req.url);
                }
                catch {
                    // ignore
                    url = req.url;
                }
                // sanitize url
                // add index.html
                url = url.replace(/\/($|\?|#)/, '/index.html$1');
                // Read config files for admin from /adapters/admin/admin/...
                if (url.startsWith(`/${this.adapter.name}/`)) {
                    url = url.replace(`/${this.adapter.name}/`, this.dirName);
                    // important: Linux does not normalize "\" but readFile accepts it as '/'
                    url = (0, node_path_1.normalize)(url.replace(/\?.*/, '').replace(/\\/g, '/')).replace(/\\/g, '/');
                    if (url.startsWith(this.dirName)) {
                        try {
                            if ((0, node_fs_1.existsSync)(url)) {
                                res.contentType((0, mime_1.getType)(url) || 'text/javascript');
                                (0, node_fs_1.createReadStream)(url).pipe(res);
                            }
                            else {
                                res.status(404).send(get404Page(`File not found`));
                            }
                        }
                        catch (e) {
                            res.status(404).send(get404Page(`File not found: ${escapeHtml(JSON.stringify(e))}`));
                        }
                    }
                    else {
                        res.status(404).send(get404Page(`File ${escapeHtml(url)} not found`));
                    }
                    return;
                }
                const parts = url.split('/');
                // Skip first /
                parts.shift();
                // Get ID
                const adapterName = parts.shift();
                const id = `${adapterName}.admin`;
                url = parts.join('/');
                const pos = url.indexOf('?');
                let _instance = 0;
                if (pos !== -1) {
                    _instance = parseInt(url.substring(pos + 1), 10) || 0;
                    url = url.substring(0, pos);
                }
                if (this.settings.accessLimit) {
                    if (url === 'index.html' || url === 'index_m.html') {
                        const anyConfig = this.settings.accessAllowedConfigs.includes(`${adapterName}.${_instance}`);
                        if (!anyConfig) {
                            res.contentType('text/html');
                            res.status(403).send('You are not allowed to access this page');
                            return;
                        }
                    }
                    if (url === 'tab.html' || url === 'tab_m.html') {
                        const anyTabs = this.settings.accessAllowedTabs.includes(`${adapterName}.${_instance}`);
                        if (!anyTabs) {
                            res.contentType('text/html');
                            res.status(403).send('You are not allowed to access this page');
                            return;
                        }
                    }
                }
                // this.adapter.readFile is sanitized
                this.adapter.readFile(id, url, null, (err, buffer, mimeType) => {
                    if (!buffer || err) {
                        res.contentType('text/html');
                        res.status(404).send(get404Page(`File ${escapeHtml(url)} not found`));
                    }
                    else {
                        if (mimeType) {
                            res.contentType(mimeType);
                        }
                        else {
                            try {
                                const _mimeType = (0, mime_1.getType)(url);
                                res.contentType(_mimeType || 'text/javascript');
                            }
                            catch {
                                res.contentType('text/javascript');
                            }
                        }
                        res.send(buffer);
                    }
                });
            });
            // reverse proxy with url rewrite for couchdb attachments in <adapter-name>
            this.server.app.use('/files/', async (req, res) => {
                // Example: /vis.0/main/img/image.png
                let url;
                try {
                    url = decodeURIComponent(req.url);
                }
                catch {
                    // ignore
                    url = req.url;
                }
                // add index.html
                url = url.replace(/\/($|\?|#)/, '/index.html$1');
                const parts = url.split('/');
                // Skip first /files
                parts.shift();
                // Get ID
                const adapterName = parts.shift();
                url = parts.join('/');
                const pos = url.indexOf('?');
                let _instance = 0;
                if (pos !== -1) {
                    _instance = parseInt(url.substring(pos + 1), 10) || 0;
                    url = url.substring(0, pos);
                }
                if (this.settings.accessLimit) {
                    if (url === 'index.html' || url === 'index_m.html') {
                        const anyConfig = this.settings.accessAllowedConfigs.includes(`${adapterName}.${_instance}`);
                        if (!anyConfig) {
                            res.contentType('text/html');
                            res.status(403).send('You are not allowed to access this page');
                            return;
                        }
                    }
                    if (url === 'tab.html' || url === 'tab_m.html') {
                        const anyTabs = this.settings.accessAllowedTabs.includes(`${adapterName}.${_instance}`);
                        if (!anyTabs) {
                            res.contentType('text/html');
                            res.status(403).send('You are not allowed to access this page');
                            return;
                        }
                    }
                }
                try {
                    if (await this.adapter.fileExists(adapterName, url)) {
                        const { mimeType, file } = await this.adapter.readFileAsync(adapterName, url);
                        // special case for svg stored into logo.png
                        if (url.endsWith('.png') && file.length < 30000) {
                            const str = file.toString('utf8');
                            if (str.startsWith('<svg') || str.startsWith('<xml') || str.startsWith('<?xml')) {
                                // it is svg
                                res.contentType('image/svg+xml');
                                res.send(str);
                                return;
                            }
                            res.contentType('image/png');
                        }
                        else {
                            res.contentType(mimeType || 'text/javascript');
                        }
                        if (adapterName === this.adapter.namespace && url.startsWith('zip/')) {
                            // special files, that can be read-only one time
                            this.adapter.unlink(adapterName, url, () => { });
                        }
                        res.send(file);
                    }
                    else {
                        const filesOfDir = await readFolderRecursive(this.adapter, adapterName, url);
                        const archive = archiver('zip', {
                            zlib: { level: 9 },
                        });
                        for (const file of filesOfDir) {
                            archive.append(file.file, { name: file.name });
                        }
                        const zip = [];
                        archive.on('data', chunk => zip.push(chunk));
                        await archive.finalize();
                        res.contentType('application/zip');
                        res.send(Buffer.concat(zip));
                    }
                }
                catch (e) {
                    this.adapter.log.warn(`Cannot read file ("${adapterName}"/"${url}"): ${e.message}`);
                    res.contentType('text/html');
                    res.status(404).send(get404Page(`File ${escapeHtml(url)} not found`));
                }
            });
            // handler for oauth2 redirects
            this.server.app.use('/oauth2_callbacks/', (req, res) => {
                // extract instance from "http://localhost:8081/oauth2_callbacks/netatmo.0/?state=ABC&code=CDE"
                const [_instance, params] = req.url.split('?');
                const instance = _instance.replace(/^\//, '').replace(/\/$/, ''); // remove last and first "/" in "/netatmo.0/"
                const query = {};
                params.split('&').forEach(param => {
                    const [key, value] = param.split('=');
                    query[key] = value === undefined ? true : value;
                    if (Number.isFinite(query[key])) {
                        query[key] = parseFloat(query[key]);
                    }
                    else if (query[key] === 'true') {
                        query[key] = true;
                    }
                    else if (query[key] === 'false') {
                        query[key] = false;
                    }
                });
                if (query.timeout > 30_000) {
                    query.timeout = 30_000;
                }
                let timeout = setTimeout(() => {
                    if (timeout) {
                        timeout = null;
                        let text = (0, node_fs_1.readFileSync)(`${this.baseDir}/public/oauthError.html`).toString('utf8');
                        text = text.replace('%LANGUAGE%', this.systemLanguage);
                        text = text.replace('%ERROR%', 'TIMEOUT');
                        res.setHeader('Content-Type', 'text/html');
                        res.status(408).send(text);
                    }
                }, query.timeout || 5_000);
                this.adapter.sendTo(instance, 'oauth2Callback', query, result => {
                    const _result = result;
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                        if (_result?.error) {
                            let text = (0, node_fs_1.readFileSync)(`${this.baseDir}/public/oauthError.html`).toString('utf8');
                            text = text.replace('%LANGUAGE%', this.systemLanguage);
                            text = text.replace('%ERROR%', _result.error);
                            res.setHeader('Content-Type', 'text/html');
                            res.status(500).send(text);
                        }
                        else {
                            let text = (0, node_fs_1.readFileSync)(`${this.baseDir}/public/oauthSuccess.html`).toString('utf8');
                            text = text.replace('%LANGUAGE%', this.systemLanguage);
                            text = text.replace('%MESSAGE%', _result?.result || '');
                            res.setHeader('Content-Type', 'text/html');
                            res.status(200).send(text);
                        }
                    }
                });
            });
            // 404 handler
            this.server.app.use((req, res) => {
                res.status(404).send(get404Page(`File ${escapeHtml(req.url)} not found`));
            });
            try {
                // Certificate keys never enter writable ioBroker objects. Root provisions
                // the fixed files; the signed profile permits TLS1.3 only.
                this.server.server = Object.assign((0, eosApplianceProfile_1.createApplianceHttpsServer)(this.server.app), { __server: this.server });
            }
            catch (err) {
                this.adapter.log.error(`Cannot create web-server: ${err}`);
                this.adapter.terminate(adapter_core_1.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                return;
            }
            if (!this.server.server) {
                this.adapter.log.error(`Cannot create web-server`);
                this.adapter.terminate(adapter_core_1.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                return;
            }
            // Node's deadline protects incomplete headers/body in addition to the per-upload deadline.
            this.server.server.headersTimeout = 15000;
            this.server.server.requestTimeout = 60000;
            this.server.server.maxHeadersCount = 100;
            this.server.server.__server = this.server;
        }
        else {
            this.adapter.log.error('port missing');
            this.adapter.terminate('port missing', adapter_core_1.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
            return;
        }
        const systemConfig = await this.adapter.getForeignObjectAsync('system.config');
        this.systemConfig = systemConfig || {};
        this.systemConfig.native ||= {};
        this.systemConfig.native.vendor ||= {};
        this.systemConfig.native.vendor.admin ||= {};
        this.systemConfig.native.vendor.admin.login ||= {};
        const uuidObj = await this.adapter.getForeignObjectAsync('system.meta.uuid');
        if (uuidObj?.native) {
            uuid = uuidObj.native.uuid;
        }
        if (this.server.server) {
            let serverListening = false;
            let serverPort;
            this.server.server.on('error', e => {
                if (e.toString().includes('EACCES') && serverPort <= 1024) {
                    this.adapter.log.error(`node.js process has no rights to start server on the port ${serverPort}.\n` +
                        `Do you know that on linux you need special permissions for ports under 1024?\n` +
                        `You can call in shell following scrip to allow it for node.js: "iobroker fix"`);
                }
                else {
                    this.adapter.log.error(`Cannot start server on ${this.settings.bind || '0.0.0.0'}:${serverPort}: ${e.toString()}`);
                }
                if (!serverListening) {
                    if (this.adapter.terminate) {
                        this.adapter.terminate(adapter_core_1.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                    }
                    else {
                        process.exit(adapter_core_1.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                    }
                }
            });
            this.settings.port = parseInt(this.settings.port, 10) || 8081;
            serverPort = this.settings.port;
            if (!this.settings.disableMcp) {
                this.adapter.log.warn('External MCP is disabled by the EOS security profile until its authentication and authorization boundary is verified.');
            }
            this.adapter.getPort(this.settings.port, !this.settings.bind || this.settings.bind === '0.0.0.0' ? undefined : this.settings.bind || undefined, port => {
                serverPort = port;
                // Start the web server
                this.server.server.listen(port, !this.settings.bind || this.settings.bind === '0.0.0.0'
                    ? undefined
                    : this.settings.bind || undefined, () => {
                    void this.adapter.setState('info.connection', true, true);
                    serverListening = true;
                    this.adapter.log.info(`http${this.settings.secure ? 's' : ''} server listening on port ${port}`);
                    this.adapter.log.info(`Use link "http${this.settings.secure ? 's' : ''}://127.0.0.1:${port}" to configure.`);
                    if (!this.adapter.config.doNotCheckPublicIP && !this.adapter.config.auth) {
                        this.checkTimeout = this.adapter.setTimeout(async () => {
                            this.checkTimeout = null;
                            try {
                                await (0, webserver_1.checkPublicIP)(this.settings.port, 'ioBroker', '/iobroker_check.html');
                            }
                            catch (e) {
                                // this supported first from js-controller 5.0.
                                this.adapter.sendToHost(`system.host.${this.adapter.host}`, 'addNotification', {
                                    scope: 'system',
                                    category: 'securityIssues',
                                    message: 'Your admin instance is accessible from the internet without any protection. ' +
                                        'Please enable authentication or disable the access from the internet.',
                                    instance: `system.adapter.${this.adapter.namespace}`,
                                }, ( /* result */) => {
                                    /* ignore */
                                });
                                this.adapter.log.error(e.toString());
                            }
                        }, 1000);
                    }
                });
                if (typeof this.onReady === 'function') {
                    void Promise.resolve(this.onReady(this.server.server, this.store, this.adapter)).catch(e => this.adapter.log.error(`Cannot finish EOS webserver startup: ${e instanceof Error ? e.message : e}`));
                }
            });
        }
    }
}
exports.default = Web;
//# sourceMappingURL=web.js.map