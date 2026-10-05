"use strict";
/**
 *      Admin backend
 *
 *      Controls Adapter-Processes
 *
 *      Copyright 2014-2025 Denis Haev <dogafox@gmail.com>,
 *      MIT License
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const semver = require("semver");
const axios_1 = require("axios");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const adapter_core_1 = require("@iobroker/adapter-core");
const socket_classes_1 = require("@iobroker/socket-classes");
const ws_server_1 = require("@iobroker/ws-server");
const translations_1 = require("./lib/translations");
const web_1 = require("./lib/web");
const checkLinuxPass_1 = require("./lib/checkLinuxPass");
const objectFixes_1 = require("./lib/objectFixes");
const mcpClientManager_1 = require("./lib/chat/mcpClientManager");
const chatOrchestrator_1 = require("./lib/chat/chatOrchestrator");
const credentials_1 = require("./lib/chat/credentials");
const llmProvider_1 = require("./lib/chat/llmProvider");
const eosLicenseService_1 = require("./lib/eosLicenseService");
const eosSessionSecurity_1 = require("./lib/eosSessionSecurity");
const eosHttpsClient_1 = require("./lib/eosHttpsClient");
const eosApplianceProfile_1 = require("./lib/eosApplianceProfile");
const adapterName = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, '..', 'package.json'), { encoding: 'utf-8' }))
    .name.split('.')
    .pop();
const { getInstalledInfo } = adapter_core_1.commonTools;
const ONE_HOUR_MS = 3_600_000;
const ERROR_PERMISSION = 'permissionError';
const CURRENT_MAX_MAJOR_NODEJS = 22;
const CURRENT_MAX_MAJOR_NPM = 10;
function normalizeLoginTimeout(value, fallback = 3_600) {
    const ttl = Math.round(Number(value));
    if (!Number.isFinite(ttl) || ttl < 120) {
        return fallback;
    }
    return Math.min(ttl, 31_536_000); // 1 year hard limit
}
const EOS_ADMIN_ADAPTER_NAME = 'eos-admin';
const LEGACY_ADMIN_ADAPTER_NAME = 'admin';
const CORE_PROTECTED_ADAPTER_NAMES = [
    EOS_ADMIN_ADAPTER_NAME,
    'backitup',
    'nexowatt-backup',
    'eos-backup',
    'nexowatt-devices',
    'nexowatt-device',
    'nexowatt-dev',
    'nexowatt-ui',
];
const LEGACY_ADMIN_INSTANCE_ID = 'system.adapter.admin.0';
const LEGACY_BACKUP_ADAPTER_NAME = 'backitup';
const CUSTOMER_BACKUP_ADAPTER_NAMES = ['nexowatt-backup', 'eos-backup'];
const DEFAULT_LEGACY_ADMIN_LOCK_PORT = 18_081;
const DEFAULT_LEGACY_ADMIN_LOCK_BIND = '127.0.0.1';
const DEFAULT_EOS_ADMIN_GROUPS = ['system.group.administrator'];
const DEFAULT_ADMIN_ONLY_GROUP = DEFAULT_EOS_ADMIN_GROUPS[0];
const ADMIN_OWNER_USER = 'system.user.admin';
const ADMIN_ONLY_OBJECT_ACL = 0x660;
const EOS_ROLE_READABLE_OBJECT_ACL = 0x664;
const EOS_SERVICE_GROUP = 'system.group.nexowatt-service';
const EOS_INSTALLER_GROUP = 'system.group.installateur';
const EOS_ENDUSER_GROUP = 'system.group.endkunde';
const EOS_ROLE_GROUP_IDS = [EOS_SERVICE_GROUP, EOS_INSTALLER_GROUP, EOS_ENDUSER_GROUP];
// The EOS shell must be able to read the system configuration and repository metadata for
// installer/end-user sessions. Write access remains administrator-only through the object ACL.
const EOS_ROLE_READABLE_SYSTEM_OBJECT_IDS = ['system.config', 'system.repositories'];
// Secrets, certificates and platform license data remain visible only to NexoWatt Admin / Service.
const EOS_ADMIN_ONLY_SYSTEM_OBJECT_IDS = ['system.certificates', 'system.licenses'];
const EOS_SECURITY_OBJECT_IDS = [
    ...EOS_ROLE_READABLE_SYSTEM_OBJECT_IDS,
    ...EOS_ADMIN_ONLY_SYSTEM_OBJECT_IDS,
];
function normalizeAdapterName(value) {
    if (typeof value !== 'string') {
        return null;
    }
    let adapter = value.trim();
    if (!adapter) {
        return null;
    }
    adapter = adapter.replace(/^iobroker\./i, '').replace(/^system\.adapter\./, '');
    adapter = adapter.replace(/\.\d+$/, '');
    return /^[a-z0-9_-]+$/i.test(adapter) ? adapter : null;
}
function normalizeProtectedAdapters(value) {
    const result = new Set();
    const add = (entry) => {
        if (typeof entry === 'string') {
            const normalized = normalizeAdapterName(entry);
            if (normalized) {
                result.add(normalized);
            }
            return;
        }
        if (entry && typeof entry === 'object') {
            const config = entry;
            if (config.enabled === false) {
                return;
            }
            const normalized = normalizeAdapterName(config.adapter || config.name);
            if (normalized) {
                result.add(normalized);
            }
        }
    };
    if (Array.isArray(value)) {
        value.forEach(add);
    }
    return [...result].sort();
}
function normalizeGroupId(value) {
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
function normalizeAdminOnlyGroups(value) {
    const result = new Set();
    const add = (entry) => {
        if (typeof entry === 'string') {
            const normalized = normalizeGroupId(entry);
            if (normalized) {
                result.add(normalized);
            }
            return;
        }
        if (entry && typeof entry === 'object') {
            const row = entry;
            if (row.enabled === false) {
                return;
            }
            const normalized = normalizeGroupId(row.group || row.id || row.name);
            if (normalized) {
                result.add(normalized);
            }
        }
    };
    if (Array.isArray(value)) {
        value.forEach(add);
    }
    if (!result.size) {
        DEFAULT_EOS_ADMIN_GROUPS.forEach(group => result.add(group));
    }
    return [...result].sort();
}
let socket;
let webServer;
let lastRepoUpdate;
// Cache of objects
let objects = {};
let systemLanguage = 'en';
const EOS_STABLE_INITIAL_PASSWORD = 'nexowatt';
const EOS_STABLE_ACCOUNTS = [
    { user: 'installer', role: 'installer' },
    { user: 'guest', role: 'customer' },
    { user: 'user', role: 'customer' },
];
async function ensureEosStableGroupMembership(adapter, user, role) {
    const candidateGroups = role === 'installer'
        ? ['system.group.installer', 'system.group.installateur', 'system.group.installers']
        : ['system.group.endkunde', 'system.group.endkunden'];
    const userId = `system.user.${user}`;
    for (const groupId of candidateGroups) {
        const group = (await adapter.getForeignObjectAsync(groupId));
        if (!group) {
            continue;
        }
        const members = Array.isArray(group.common?.members) ? [...group.common.members] : [];
        if (!members.includes(userId)) {
            members.push(userId);
            await adapter.extendForeignObjectAsync(groupId, { common: { members } }, { user: 'system.user.admin' });
        }
    }
}
async function ensureEosStableInitialAccounts(adapter) {
    for (const account of EOS_STABLE_ACCOUNTS) {
        const id = `system.user.${account.user}`;
        let object = await adapter.getForeignObjectAsync(id);
        const created = !object;
        if (!object) {
            await adapter.setForeignObjectAsync(id, {
                type: 'user', common: { name: account.user, enabled: false, password: '' }, native: {},
            }, { user: 'system.user.admin' });
            object = await adapter.getForeignObjectAsync(id);
        }
        if (!object)
            throw new Error('eosAccountProvisioningFailed');
        let insecure = created || !String(object.common?.password || '').trim();
        if (!insecure) {
            // This legacy value is checked solely to retire previously shipped shared credentials.
            // It must never be assigned to a new or reset account.
            const result = await adapter.checkPasswordAsync(account.user, EOS_STABLE_INITIAL_PASSWORD, { user: 'system.user.admin' });
            insecure = Array.isArray(result) ? result[0] === true : result === true;
        }
        if (insecure) {
            // Disable before replacing the password: any write failure remains fail-closed.
            await adapter.extendForeignObjectAsync(id, { common: { enabled: false } }, { user: 'system.user.admin' });
            await adapter.setPasswordAsync(account.user, `${(0, node_crypto_1.randomBytes)(32).toString('base64url')}!aA1`, { user: 'system.user.admin' });
            await adapter.extendForeignObjectAsync(id, { native: {
                    nexowattManaged: true,
                    nexowattRole: account.role,
                    nexowattPasswordChangeRequired: true,
                    eosPasswordChangeRequired: true,
                    nexowattEosAccount: {
                        passwordInitialized: false,
                        passwordSetupVersion: 0,
                        forcePasswordChange: true,
                        passwordlessFirstLoginAllowed: false,
                        standardPasswordMode: false,
                        disabledForCredentialMigration: true,
                        credentialMigrationAt: new Date().toISOString(),
                    },
                } }, { user: 'system.user.admin' });
            adapter.log.warn(`EOS account ${account.user} disabled: unique credential provisioning by Admin required`);
        }
        // Existing individual passwords and their pending-reset metadata are deliberately retained.
        await ensureEosStableGroupMembership(adapter, account.user, account.role);
    }
}
class Admin extends adapter_core_1.Adapter {
    /** Local license authority; management/recovery is never license-gated. */
    eosLicenseService;
    /** secret used for the socket connection */
    secret;
    /** Central EOS-only capability revocation, installed before HTTP/socket startup. */
    eosSessionSecurity;
    /** Timer to update the repository */
    timerRepo;
    updaterTimeout;
    ratingTimeout;
    timerNews;
    _tasks;
    changedPasswords = [];
    /** In-process ioBroker.mcp connection backing the chat helper. Created on first chat message. */
    mcpChat = null;
    /** Periodic guard that keeps EOS safety policy applied even if object events are missed. */
    eosSecurityTimer = null;
    /** Debounce timer for object-change triggered safety checks. */
    eosSecurityDebounce = null;
    /** Avoid concurrent policy writes while the guard corrects objects. */
    eosSecurityRunning = false;
    /** Synchronous role cache used by the server-side socket command guard. */
    eosRoleCache = new Map();
    /** Non-admin accounts that must complete password setup before any socket command is accepted. */
    eosPasswordSetupRequired = new Set();
    eosDisabledUsers = new Set();
    eosRoleCacheHealthy = false;
    /** v47: stale delete-lock cleanup is a one-shot migration, not a repeating guard. */
    eosDeleteLockRepairFinished = false;
    constructor(options = {}) {
        options = {
            ...options,
            name: adapterName, // adapter name
            logTransporter: true, // receive the logs
            systemConfig: true,
            install: () => void null,
        };
        super(options);
        this.on('objectChange', this.onObjectChange);
        this.on('stateChange', this.onStateChange);
        this.on('ready', this.onReady);
        this.on('message', this.onMessage);
        this.on('unload', this.onUnload);
        this.on('fileChange', this.onFileChange);
        this.on('log', this.onLog);
    }
    /**
     * Is called if a subscribed object changes
     *
     * @param id object ID that changed
     * @param obj the changed object value
     */
    onObjectChange = (id, obj) => {
        // Invalidate before forwarding changes or waiting for the debounced role cache.
        this.eosSessionSecurity?.handleObjectChange(id, obj, objects[id]);
        if (/^system\.(?:user|group)\./.test(id))
            this.eosRoleCacheHealthy = false;
        if (obj) {
            objects[id] = obj;
            if (id === 'system.config' && !this.config.language) {
                if (obj.common?.language) {
                    systemLanguage = obj.common.language;
                    if (webServer) {
                        webServer.setLanguage(systemLanguage);
                    }
                }
            }
            if (id === 'system.repositories' || id.match(/^system\.adapter\.[^.]+$/)) {
                if (this.updaterTimeout) {
                    clearTimeout(this.updaterTimeout);
                }
                this.updaterTimeout = setTimeout(() => {
                    this.updaterTimeout = null;
                    void this.writeUpdateInfo();
                }, 5_000);
            }
        }
        else {
            // console.log('objectDeleted: ' + id);
            if (objects[id]) {
                delete objects[id];
            }
        }
        if (id.startsWith('system.adapter.')) {
            const { adapter } = this.parseAdapterObjectId(id);
            if (this.getProtectedAdapterNames().includes(adapter)) {
                this.scheduleEosSecurityGuard(`protected object change: ${id}`);
            }
        }
        else if (id.startsWith('system.group.')
            || id.startsWith('system.user.')
            || id.startsWith('system.credentials.')
            || EOS_SECURITY_OBJECT_IDS.includes(id)) {
            this.scheduleEosSecurityGuard(`role/security object change: ${id}`);
        }
        // TODO Build in some threshold of messages
        socket?.objectChange(id, obj);
    };
    /**
     * Is called if a subscribed state was changed
     *
     * @param id state ID that changed
     * @param state the changed state value
     */
    onStateChange = (id, state) => {
        if (id === `system.adapter.${this.namespace}.plugins.sentry.enabled`) {
            webServer.resetIndexHtml();
        }
        socket?.stateChange(id, state);
    };
    onFileChange = (id, fileName, size) => {
        socket?.fileChange(id, fileName, size);
    };
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady = async () => {
        // Management stays reachable without a license on EOS so the operator
        // can activate it. A standalone upstream installation is unsupported.
        try {
            require('../packages/eos-license-client').assertEosPlatform('eos-admin');
        }
        catch {
            this.log.error('EOS_PLATFORM_REQUIRED');
            return;
        }
        (0, eosApplianceProfile_1.assertOauthDependency)();
        if (this.config.auth !== true)
            this.log.warn('EOS security profile requires login; legacy auth=false is overridden at runtime.');
        this.config = (0, eosApplianceProfile_1.applyProfile)(this.config);
        (0, eosApplianceProfile_1.installPasswordPolicy)(this);
        const systemConfig = await this.getForeignObjectAsync('system.config');
        if (systemConfig) {
            systemConfig.native = systemConfig.native || {};
            if (this.config.language) {
                systemLanguage = this.config.language;
            }
            else if (systemConfig.common?.language) {
                systemLanguage = systemConfig.common.language;
            }
            adapter_core_1.I18n.init(__dirname, systemLanguage).catch(e => this.log.error(`Cannot init i18n: ${e}`));
            // Integrated appliance users are provisioned explicitly by the OS setup.
            // No default account or credential is created during Admin startup.
            this.eosSessionSecurity = new eosSessionSecurity_1.EosSessionSecurity(this);
            this.eosLicenseService = new eosLicenseService_1.EosLicenseService(this, {
                resolveDirectory: () => (0, node_path_1.join)((0, adapter_core_1.getAbsoluteInstanceDataDir)(this), 'licensing'),
                trustFile: eosApplianceProfile_1.PROFILE.licenseTrust,
            });
            await this.eosLicenseService.start();
            if (!systemConfig.native.secret) {
                try {
                    this.secret = (0, node_crypto_1.randomBytes)(32).toString('hex');
                    await this.extendForeignObjectAsync('system.config', { native: { secret: this.secret } });
                    this.init();
                }
                catch {
                    this.log.error('EOS session secret initialization failed; web startup denied');
                }
            }
            else if (typeof systemConfig.native.secret === 'string' && systemConfig.native.secret.length >= 16) {
                this.secret = systemConfig.native.secret;
                this.init();
            }
            else {
                this.log.error('EOS session secret is invalid; web startup denied');
            }
        }
        else {
            this.log.error('Cannot find object system.config');
        }
    };
    /**
     * Lazily create the in-process MCP connection backing the chat helper.
     *
     * `allowSetState` is enabled so the `set_state`/`set_states` tools exist; the orchestrator only
     * offers them in "act" mode and only runs them after explicit per-action confirmation. Raw
     * object/file changes stay disabled — state creation goes through the namespace-guarded
     * admin-local `create_user_state` tool instead.
     */
    getMcpChat() {
        this.mcpChat ||= new mcpClientManager_1.McpClientManager(this, {
            defaultUser: 'system.user.admin',
            language: systemLanguage,
            allowSetState: true,
            allowObjectChange: false,
        });
        return this.mcpChat;
    }
    /**
     * Some message was sent to this instance over the message box. Used by email, pushover, text2speech, ...
     * Using this method requires the "common.messagebox" property to be set to true in io-package.json
     *
     * @param obj the message object
     */
    onMessage = (obj) => {
        if (!obj) {
            return;
        }
        if (obj.command === 'admin:setPassword' || obj.command === 'checkDocker' || obj.command.startsWith('chat:')) {
            if (obj.callback)
                this.sendTo(obj.from, obj.command, { error: 'EOS_SIGNED_MAINTENANCE_REQUIRED' }, obj.callback);
            return;
        }
        if (obj.command === 'eos.license.check') {
            if (obj.callback && this.eosLicenseService) {
                void this.eosLicenseService.check(obj.from, obj.message).then(result => {
                    if (obj.callback)
                        this.sendTo(obj.from, obj.command, result, obj.callback);
                }).catch(() => {
                    if (obj.callback)
                        this.sendTo(obj.from, obj.command, { v: 1, valid: false, code: 'SERVICE_UNAVAILABLE' }, obj.callback);
                });
            }
            return;
        }
        if (obj.command === 'im') {
            // if not instance message
            socket.publishInstanceMessageAll(obj.from, obj.message.m, obj.message.s, obj.message.d);
        }
        else if (obj.command === 'checkFiles') {
            if (typeof obj.message === 'string') {
                if (obj.callback) {
                    try {
                        this.sendTo(obj.from, obj.command, { result: (0, node_fs_1.existsSync)(obj.message) }, obj.callback);
                    }
                    catch (e) {
                        this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
                    }
                }
                return;
            }
            else if (Array.isArray(obj.message)) {
                const result = {};
                for (let f = 0; f < obj.message.length; f++) {
                    try {
                        result[obj.message[f]] = (0, node_fs_1.existsSync)(obj.message[f]);
                    }
                    catch (e) {
                        result[obj.message[f]] = e.message;
                    }
                }
                return obj.callback && this.sendTo(obj.from, obj.command, result, obj.callback);
            }
        }
        else if (obj.command === 'autocomplete') {
            // just for test
            return (obj.callback &&
                this.sendTo(obj.from, obj.command, [
                    { value: 1, label: 'first' },
                    { value: 2, label: 'second' },
                ], obj.callback));
        }
        else if (obj.command === 'selectSendTo') {
            this.log.info(`SelectSendTo: ${JSON.stringify(obj.message)}`);
            // just for test
            return (obj.callback &&
                this.sendTo(obj.from, obj.command, [
                    { label: 'Afghanistan', value: 'AF' },
                    { label: 'Åland Islands', value: 'AX' },
                    { label: 'Albania', value: 'AL' },
                ], obj.callback));
        }
        else if (obj.command === 'url') {
            this.log.info(`url: ${JSON.stringify(obj.message)}`);
            // just for test
            if (obj.callback) {
                this.sendTo(obj.from, obj.command, { openUrl: obj.message._origin, saveConfig: true }, obj.callback);
            }
            return;
        }
        else if (obj.command.startsWith('admin:')) {
            return this.processNotificationsGui(obj);
        }
        else if (obj.command.startsWith('test:')) {
            // just for test
            this.log.info(`test: ${JSON.stringify(obj.message)}`);
            return;
        }
        else if (obj.command.startsWith('chat:')) {
            if (obj.callback) {
                this.sendTo(obj.from, obj.command, { error: 'EOS Assist ist in dieser Stable-Version vorübergehend deaktiviert.' }, obj.callback);
            }
            return;
        }
        else if (webServer?.processMessage(obj)) {
            return;
        }
        socket?.sendCommand(obj);
    };
    getName(name) {
        if (!name) {
            return undefined;
        }
        if (typeof name === 'string') {
            return name;
        }
        if (typeof name === 'object') {
            return name[this.language] || name.en;
        }
        return null;
    }
    /**
     * Handle `chat:*` messages from the admin GUI chat helper.
     *
     * - `chat:getProviders` — list the AI credentials the user can pick (id + name, no secrets).
     * - `chat:testConnection` — validate a provider/key by listing its models.
     * - `chat:send` — run one chat turn: the backend drives the LLM ↔ MCP tool loop and returns the
     *   final answer, the new messages and the executed tool steps.
     * - `chat:getTools` / `chat:callTool` — low-level access to the in-process MCP tool layer (A1).
     *
     * @param obj the message object
     */
    async processChatMessage(obj) {
        const respond = (response) => {
            if (obj.callback) {
                this.sendTo(obj.from, obj.command, response, obj.callback);
            }
        };
        const fail = (error) => respond({ error: error instanceof Error ? error.message : String(error) });
        if (obj.command === 'chat:getTools') {
            try {
                const tools = await this.getMcpChat().getTools();
                respond({ tools });
            }
            catch (e) {
                fail(e);
            }
            return;
        }
        if (obj.command === 'chat:callTool') {
            const message = (obj.message || {});
            if (!message.name) {
                fail('Tool name is required');
                return;
            }
            try {
                const result = await this.getMcpChat().callTool(message.name, message.args);
                respond({ ...result });
            }
            catch (e) {
                fail(e);
            }
            return;
        }
        if (obj.command === 'chat:getProviders') {
            // List the configured AI credentials (id + name, no secrets) the user can pick from.
            try {
                const credentials = await this.getObjectViewAsync('system', 'config', {
                    startkey: 'system.credentials.',
                    endkey: 'system.credentials.\u9999',
                });
                const providers = [];
                credentials.rows.forEach(row => {
                    if (row.value.native.type === 'ai') {
                        providers.push({
                            name: this.getName(row.value.common.name),
                            id: row.value._id,
                            icon: row.value.common.icon,
                        });
                    }
                });
                respond({ providers });
            }
            catch (e) {
                fail(e);
            }
            return;
        }
        if (obj.command === 'chat:testConnection') {
            const message = (obj.message || {});
            try {
                const provider = message.provider || 'openai';
                // Prefer an explicit key from the settings form; otherwise resolve from the store.
                let apiKey = (message.apiKey || '').trim();
                if (!apiKey && message.credentialId) {
                    apiKey = await (0, credentials_1.resolveAiKey)(this, message.credentialId);
                }
                const models = await (0, llmProvider_1.listModels)({
                    provider,
                    apiKey,
                    baseUrl: message.baseUrl,
                    allowSelfSignedCerts: message.allowSelfSignedCerts,
                });
                respond({ success: true, models, count: models.length });
            }
            catch (e) {
                fail(e);
            }
            return;
        }
        if (obj.command === 'chat:send') {
            const message = (obj.message || {});
            try {
                if (!Array.isArray(message.messages) || !message.messages.length) {
                    fail('messages are required');
                    return;
                }
                const provider = message.provider || 'openai';
                const model = (message.model || '').trim();
                if (!model) {
                    fail('model is required');
                    return;
                }
                const apiKey = message.credentialId ? await (0, credentials_1.resolveAiKey)(this, message.credentialId) : '';
                // OpenAI-compatible/custom endpoints (e.g. local Ollama) may run without a key.
                if (!apiKey && provider !== 'custom' && !message.baseUrl) {
                    fail('No API key configured for the selected provider');
                    return;
                }
                const orchestrator = new chatOrchestrator_1.ChatOrchestrator(this.getMcpChat(), this);
                const result = await orchestrator.run({
                    provider,
                    model,
                    apiKey,
                    baseUrl: message.baseUrl,
                    messages: message.messages,
                    language: systemLanguage,
                    allowSelfSignedCerts: message.allowSelfSignedCerts,
                    maxToolRounds: message.maxToolRounds,
                    mode: message.mode,
                    approvals: message.approvals,
                    autoApprove: message.autoApprove,
                    uiContext: message.uiContext,
                });
                respond({ success: true, ...result });
            }
            catch (e) {
                fail(e);
            }
            return;
        }
        fail(`Unknown chat command: ${obj.command}`);
    }
    processNotificationsGui(obj) {
        if (obj.command === 'admin:getNotificationSchema') {
            const guiMessage = obj.message;
            const alreadyDone = this.changedPasswords.find(item => item.login === guiMessage.login && item.password === guiMessage.password);
            let schema;
            if (alreadyDone?.result === true) {
                schema = {
                    type: 'panel',
                    items: {
                        _info: {
                            type: 'staticText',
                            text: adapter_core_1.I18n.getTranslatedObject('The password for user "%s" was successfully changed', guiMessage.login),
                            style: { color: 'green' },
                            sm: 12,
                        },
                    },
                };
            }
            else if (alreadyDone?.result === false) {
                schema = {
                    type: 'panel',
                    items: {
                        _info: {
                            type: 'staticText',
                            text: adapter_core_1.I18n.getTranslatedObject('Cannot change password for %s:', guiMessage.login),
                            style: { color: 'orange' },
                            sm: 12,
                        },
                        _info1: {
                            newLine: true,
                            type: 'staticText',
                            text: `sudo passwd ${guiMessage.login}`,
                            style: { fontFamilies: 'monospace', color: 'green', backgroundColor: 'black' },
                            sm: 12,
                        },
                        _info3: {
                            newLine: true,
                            type: 'staticText',
                            text: adapter_core_1.I18n.getTranslatedObject('Enter your new password by prompt.'),
                            style: { fontFamilies: 'monospace', color: 'green', backgroundColor: 'black' },
                            sm: 12,
                        },
                    },
                };
            }
            else if (alreadyDone) {
                // Ask user for new password and for password repeat
                schema = {
                    type: 'panel',
                    items: {
                        _info: {
                            type: 'header',
                            size: 5,
                            text: adapter_core_1.I18n.getTranslatedObject(`User "%s" has well known password. We suggest to change it.`, guiMessage.login),
                            style: { color: 'orange' },
                            sm: 12,
                        },
                        password: {
                            newLine: true,
                            label: adapter_core_1.I18n.getTranslatedObject('New password'),
                            type: 'password',
                            help: adapter_core_1.I18n.getTranslatedObject('Minimal length is 6 chars'),
                            visible: true,
                            sm: 12,
                            md: 6,
                        },
                        passwordRepeat: {
                            label: adapter_core_1.I18n.getTranslatedObject('Password repeat'),
                            type: 'password',
                            visible: true,
                            sm: 12,
                            md: 6,
                        },
                        _send: {
                            newLine: true,
                            type: 'sendto',
                            command: 'admin:setPassword',
                            jsonData: `{ "oldPassword": "${guiMessage.password}", "login": "${guiMessage.login}", "password": "$\{data.password}", "passwordRepeat": "$\{data.passwordRepeat}" }`,
                            label: adapter_core_1.I18n.getTranslatedObject('Set password'),
                            disabled: '!data.password || !data.passwordRepeat || data.password.length < 6 || data.password !== data.passwordRepeat',
                            sm: 6,
                            md: 3,
                            variant: 'contained',
                        },
                    },
                };
            }
            else {
                schema = {
                    type: 'panel',
                    items: {
                        _info: {
                            type: 'staticText',
                            text: adapter_core_1.I18n.getTranslatedObject('This message is no more actual and was generated by other instance start'),
                            style: { color: 'grey' },
                            sm: 12,
                        },
                    },
                };
            }
            this.sendTo(obj.from, obj.command, { schema }, obj.callback);
        }
        else if (obj.command === 'admin:setPassword') {
            // compare password and passwordRepeat
            const guiMessage = obj.message;
            // empty password isn't allowed
            if (!guiMessage.password) {
                this.sendTo(obj.from, obj.command, {
                    command: {
                        command: 'message',
                        message: adapter_core_1.I18n.getTranslatedObject("Empty password isn't allowed"),
                        refresh: true,
                    },
                }, obj.callback);
            }
            else if (guiMessage.password !== guiMessage.passwordRepeat) {
                this.sendTo(obj.from, obj.command, {
                    command: {
                        command: 'message',
                        message: adapter_core_1.I18n.getTranslatedObject('Password and password repeat are not equal'),
                        refresh: true,
                    },
                }, obj.callback);
            }
            else if (guiMessage.password.length < 6) {
                this.sendTo(obj.from, obj.command, {
                    command: {
                        command: 'message',
                        message: adapter_core_1.I18n.getTranslatedObject('Password is too short (min 6 chars)'),
                        refresh: true,
                    },
                }, obj.callback);
            }
            else {
                void (0, checkLinuxPass_1.setLinuxPassword)(guiMessage.login, guiMessage.oldPassword, guiMessage.password).then(result => {
                    this.changedPasswords = this.changedPasswords.filter(item => item.password !== guiMessage.login && item.login !== guiMessage.oldPassword);
                    this.changedPasswords.push({
                        login: guiMessage.login,
                        password: guiMessage.oldPassword,
                        result: result === true,
                    });
                    if (result === true) {
                        this.sendTo(obj.from, obj.command, {
                            command: {
                                command: 'message',
                                message: adapter_core_1.I18n.getTranslatedObject('Password successfully changed for "%s"', guiMessage.login),
                                refresh: true,
                            },
                        }, obj.callback);
                    }
                    else {
                        this.sendTo(obj.from, obj.command, {
                            command: {
                                command: 'message',
                                message: adapter_core_1.I18n.getTranslatedObject(`Cannot change password for "%s": %s`, guiMessage.login, result),
                                style: { color: 'red' },
                                refresh: true,
                            },
                        }, obj.callback);
                    }
                });
            }
        }
    }
    /**
     * Is called when the adapter shuts down - callback has to be called under any circumstances!
     *
     * @param callback Callback after unloading
     */
    onUnload = (callback) => {
        this.eosLicenseService?.stop();
        this.eosSessionSecurity?.stop();
        if (this.timerRepo) {
            clearTimeout(this.timerRepo);
            this.timerRepo = null;
        }
        if (this.timerNews) {
            clearTimeout(this.timerNews);
            this.timerNews = null;
        }
        if (this.ratingTimeout) {
            clearTimeout(this.ratingTimeout);
            this.ratingTimeout = null;
        }
        if (this.updaterTimeout) {
            clearTimeout(this.updaterTimeout);
            this.updaterTimeout = null;
        }
        if (this.eosSecurityDebounce) {
            clearTimeout(this.eosSecurityDebounce);
            this.eosSecurityDebounce = null;
        }
        if (this.eosSecurityTimer) {
            clearInterval(this.eosSecurityTimer);
            this.eosSecurityTimer = null;
        }
        if (this.mcpChat) {
            void this.mcpChat.close();
            this.mcpChat = null;
        }
        try {
            this.log.info(`terminating http${this.config.secure ? 's' : ''} server on port ${this.config.port}`);
            socket?.close();
            webServer.close();
            callback();
        }
        catch {
            callback();
        }
    };
    onLog = (obj) => socket?.sendLog(obj);
    isLegacyAdminLockEnabled() {
        return this.config.eosLockLegacyAdmin !== false;
    }
    shouldHideLegacyAdminFromNonAdmins() {
        const config = this.config;
        return this.config.eosHideLegacyAdminFromNonAdmins !== false
            && config.eosHideLegacyAdminForNonAdmins !== false
            && config.nexowattHideLegacyAdminForNonAdmins !== false;
    }
    shouldHideLegacyBackupFromNonAdmins() {
        const config = this.config;
        return config.eosHideLegacyBackupFromNonAdmins !== false
            && config.nexowattHideLegacyBackupFromNonAdmins !== false;
    }
    shouldApplyAdminOnlyAclToProtectedAdapters() {
        // v37: Do not apply hard object ACLs to runtime/business adapters by default.
        // BackItUp and adapter-specific configuration pages can break when their adapter/instance
        // objects are restricted too aggressively. Delete/stop protection is enforced by EOS UI
        // policy and backend guards, while hard ACLs remain reserved for the legacy admin and
        // eos-admin itself.
        const config = this.config;
        return config.eosStrictProtectedAdapterAcl === true && this.config.eosApplyAdminOnlyAclToProtectedAdapters === true;
    }
    getAdminOnlyGroup() {
        const config = this.config;
        const configuredGroups = normalizeAdminOnlyGroups([
            ...(config.eosAdminOnlyGroups || config.eosSecurityAdminGroups || []),
            ...(config.eosServiceGroups || []),
        ]);
        if (configuredGroups.length) {
            return configuredGroups[0];
        }
        return normalizeGroupId(this.config.eosAdminOnlyGroup) || DEFAULT_ADMIN_ONLY_GROUP;
    }
    getAdminOnlyAcl() {
        return {
            object: ADMIN_ONLY_OBJECT_ACL,
            owner: ADMIN_OWNER_USER,
            ownerGroup: this.getAdminOnlyGroup(),
        };
    }
    getEosConfiguredGroupIds(value, fallback) {
        const configured = normalizeAdminOnlyGroups(Array.isArray(value) ? value : []);
        return configured.length ? configured : fallback;
    }
    getEosRoleGroupIds(role) {
        return [eosApplianceProfile_1.ROLE_GROUPS[role]];
    }
    getEosRoleGroupAcl(role) {
        const full = { list: true, read: true, write: true, create: true, delete: true };
        const none = { list: false, read: false, write: false, create: false, delete: false };
        if (role === 'service') {
            return {
                object: { ...full },
                state: { ...full },
                file: { ...full },
                users: { ...full },
                other: { execute: true, http: true, sendto: true },
            };
        }
        if (role === 'installer') {
            return {
                object: { ...full },
                state: { ...full },
                file: { ...full },
                users: { list: true, read: true, write: false, create: false, delete: false },
                other: { execute: false, http: true, sendto: true },
            };
        }
        return {
            object: { list: true, read: true, write: true, create: true, delete: true },
            state: { list: true, read: true, write: true, create: false, delete: false },
            file: { list: true, read: true, write: false, create: false, delete: false },
            users: { list: true, read: true, write: false, create: false, delete: false },
            other: { execute: false, http: true, sendto: true },
        };
    }
    getEosRoleGroupName(role) {
        if (role === 'service') {
            return { en: 'NexoWatt Admin / Service', de: 'NexoWatt Admin / Service', nl: 'NexoWatt Admin / Service' };
        }
        if (role === 'installer') {
            return { en: 'Installer / Commissioning', de: 'Installateur / Inbetriebnahme', nl: 'Installateur / inbedrijfstelling' };
        }
        return { en: 'End user / Smart Home', de: 'Endkunde / Smart Home', nl: 'Eindgebruiker / Smart Home' };
    }
    async ensureEosRoleGroup(id, role) {
        const existing = (await this.getForeignObjectAsync(id));
        const acl = this.getEosRoleGroupAcl(role);
        let group = existing;
        let changed = false;
        if (!group) {
            group = {
                _id: id,
                type: 'group',
                common: {
                    name: this.getEosRoleGroupName(role),
                    desc: this.getEosRoleGroupName(role),
                    members: [],
                    acl,
                },
                native: {},
            };
            changed = true;
        }
        group.common ||= {};
        group.common.members ||= [];
        if (!group.common.name) {
            group.common.name = this.getEosRoleGroupName(role);
            changed = true;
        }
        if (!group.common.desc) {
            group.common.desc = this.getEosRoleGroupName(role);
            changed = true;
        }
        if (JSON.stringify(group.common.acl || {}) !== JSON.stringify(acl)) {
            group.common.acl = acl;
            changed = true;
        }
        const native = (group.native ||= {});
        if (native.nexowattEosRole !== role || native.nexowattManagedRole !== true) {
            native.nexowattEosRole = role;
            native.nexowattManagedRole = true;
            changed = true;
        }
        if (changed) {
            await this.setForeignObjectAsync(id, group);
        }
        return changed;
    }
    async addUserToEosGroup(userId, groupId) {
        const user = await this.getForeignObjectAsync(userId);
        if (!user || user.type !== 'user') {
            return false;
        }
        const group = (await this.getForeignObjectAsync(groupId));
        if (!group?.common) {
            return false;
        }
        group.common.members ||= [];
        if (group.common.members.includes(userId)) {
            return false;
        }
        group.common.members.push(userId);
        group.common.members.sort();
        await this.setForeignObjectAsync(groupId, group);
        return true;
    }
    async ensureEosInstallerSmartHomeMembership() {
        // Installer is a strict superset of the end-user Smart Home role. Keeping installer users
        // in the end-user group lets ioBroker's single-ownerGroup ACL model grant room/function
        // writes without opening those objects for every authenticated account.
        const endUserGroup = this.getEosRoleGroupIds('enduser')[0] || EOS_ENDUSER_GROUP;
        for (const installerGroupId of this.getEosRoleGroupIds('installer')) {
            const installerGroup = (await this.getForeignObjectAsync(installerGroupId));
            for (const member of installerGroup?.common?.members || []) {
                await this.addUserToEosGroup(member, endUserGroup);
            }
        }
    }
    async ensureEosServiceAdministratorMembership() {
        const administrator = (await this.getForeignObjectAsync('system.group.administrator'));
        if (!administrator?.common) {
            return;
        }
        administrator.common.members ||= [];
        const native = (administrator.native ||= {});
        const previousManaged = new Set(Array.isArray(native.nexowattEosServiceMirroredMembers)
            ? native.nexowattEosServiceMirroredMembers.filter((entry) => typeof entry === 'string')
            : []);
        const currentManaged = new Set();
        for (const groupId of this.getEosRoleGroupIds('service')) {
            const group = (await this.getForeignObjectAsync(groupId));
            for (const member of group?.common?.members || []) {
                if (member !== 'system.user.admin') {
                    currentManaged.add(member);
                }
            }
        }
        let changed = false;
        for (const oldMember of previousManaged) {
            if (!currentManaged.has(oldMember)) {
                const index = administrator.common.members.indexOf(oldMember);
                if (index !== -1) {
                    administrator.common.members.splice(index, 1);
                    changed = true;
                }
            }
        }
        for (const member of currentManaged) {
            if (!administrator.common.members.includes(member)) {
                administrator.common.members.push(member);
                changed = true;
            }
        }
        const managedList = [...currentManaged].sort();
        if (JSON.stringify(native.nexowattEosServiceMirroredMembers || []) !== JSON.stringify(managedList)) {
            native.nexowattEosServiceMirroredMembers = managedList;
            changed = true;
        }
        if (changed) {
            administrator.common.members.sort();
            await this.setForeignObjectAsync('system.group.administrator', administrator);
        }
    }
    async ensureEosDefaultUser(userId, displayName) {
        let user = (await this.getForeignObjectAsync(userId));
        if (user) {
            return user;
        }
        user = {
            _id: userId,
            type: 'user',
            common: {
                name: displayName,
                enabled: false,
                password: '',
            },
            native: {
                nexowattEosAccount: {
                    passwordInitialized: true,
                    passwordSetupVersion: 1,
                    forcePasswordChange: false,
                    passwordlessFirstLoginAllowed: false,
                    provisionedBy: 'NexoWatt EOS',
                    provisionedAt: new Date().toISOString(),
                },
            },
        };
        await this.setForeignObjectAsync(userId, user);
        return user;
    }
    async prepareEosPasswordlessFirstLogin(userId) {
        if (this.config.eosRequireFirstLoginPassword === false || this.config.eosPasswordlessFirstLogin === false) {
            return;
        }
        let user = (await this.getForeignObjectAsync(userId));
        if (!user?.common || userId === 'system.user.admin') {
            return;
        }
        const native = (user.native ||= {});
        const account = (native.nexowattEosAccount ||= {});
        const initialized = account.passwordInitialized === true
            || Number(account.passwordSetupVersion || account.passwordInitializationVersion || 0) >= 1;
        if (initialized && account.forcePasswordChange !== true) {
            return;
        }
        // Only a truly uninitialized account is auto-opened for passwordless first activation.
        // Existing accounts with a password require an explicit reset by Service/Installer.
        if (String(user.common.password || '') !== '' && account.passwordlessFirstLoginAllowed !== true) {
            return;
        }
        if (String(user.common.password || '') === '') {
            const bootstrapSecret = `${(0, node_crypto_1.randomBytes)(48).toString('base64url')}!aA1`;
            await this.setPasswordAsync(userId.replace(/^system\.user\./, ''), bootstrapSecret, { user: ADMIN_OWNER_USER });
            user = (await this.getForeignObjectAsync(userId));
            if (!user) {
                return;
            }
        }
        const updatedNative = (user.native ||= {});
        const updatedAccount = (updatedNative.nexowattEosAccount ||= {});
        let changed = false;
        for (const [key, value] of Object.entries({
            passwordInitialized: false,
            passwordSetupVersion: 0,
            passwordInitializationVersion: 0,
            forcePasswordChange: true,
            passwordlessFirstLoginAllowed: true,
        })) {
            if (updatedAccount[key] !== value) {
                updatedAccount[key] = value;
                changed = true;
            }
        }
        // Set the audit timestamp only once. Rewriting it on every security-guard pass would trigger
        // another objectChange and create an endless role/security reconciliation loop.
        if (!updatedAccount.passwordlessPreparedAt) {
            updatedAccount.passwordlessPreparedAt = new Date().toISOString();
            changed = true;
        }
        if (changed) {
            await this.setForeignObjectAsync(userId, user);
        }
    }
    async ensureEosDefaultRoleUsers() {
        if (this.config.eosAutoAssignDefaultRoleUsers === false) {
            return;
        }
        // Role accounts remain disabled until an authorized administrator provisions a unique password.
        await this.ensureEosDefaultUser('system.user.installer', 'Installer');
        await this.ensureEosDefaultUser('system.user.guest', 'Gast / Endkunde');
        const installerGroup = this.getEosRoleGroupIds('installer')[0] || EOS_INSTALLER_GROUP;
        const endUserGroup = this.getEosRoleGroupIds('enduser')[0] || EOS_ENDUSER_GROUP;
        const installerUsers = ['system.user.installer', 'system.user.installateur'];
        const endUsers = ['system.user.guest', 'system.user.user', 'system.user.endkunde', 'system.user.kunde'];
        for (const userId of installerUsers) {
            await this.addUserToEosGroup(userId, installerGroup);
        }
        for (const userId of endUsers) {
            await this.addUserToEosGroup(userId, endUserGroup);
        }
    }
    async refreshEosRoleCache() {
        this.eosRoleCacheHealthy = false;
        const sessionEpoch = this.eosSessionSecurity?.epoch;
        const nextDisabled = new Set();
        const nextPending = new Set();
        const next = new Map();
        const memberships = new Map();
        const priorities = { enduser: 1, installer: 2, admin: 3 };
        const assign = (userId, role) => {
            memberships.set(userId, (memberships.get(userId) || 0) + 1);
            const current = next.get(userId);
            if (!current || priorities[role] > priorities[current])
                next.set(userId, role);
        };
        for (const [roleName, groupIds] of [
            ['admin', this.getEosRoleGroupIds('service')],
            ['installer', this.getEosRoleGroupIds('installer')],
            ['enduser', this.getEosRoleGroupIds('enduser')],
        ]) {
            for (const groupId of groupIds) {
                const group = (await this.getForeignObjectAsync(groupId));
                if (group?.type !== 'group' || group.common?.enabled === false)
                    continue;
                for (const member of group.common?.members || [])
                    assign(member, roleName);
            }
        }
        for (const userId of next.keys()) {
            const user = await this.getForeignObjectAsync(userId);
            if (!user || user.type !== 'user' || user.common?.enabled !== true || memberships.get(userId) !== 1)
                nextDisabled.add(userId);
            const native = (user?.native || {});
            const account = native.nexowattEosAccount || {};
            const initialized = account.passwordInitialized === true
                || Number(account.passwordSetupVersion || account.passwordInitializationVersion || 0) >= 1;
            if (next.get(userId) !== 'admin' && (!initialized || account.forcePasswordChange === true
                || native.nexowattPasswordChangeRequired === true || native.eosPasswordChangeRequired === true
                || native.nexowattFirstLoginPending === true || native.eosFirstLoginRequired === true)) {
                nextPending.add(userId);
            }
        }
        // A concurrent security event invalidates the entire in-flight authorization snapshot.
        if (sessionEpoch !== this.eosSessionSecurity?.epoch)
            return;
        // Commit only after every async read succeeded; no partial authorization snapshot.
        this.eosRoleCache.clear();
        this.eosDisabledUsers.clear();
        this.eosPasswordSetupRequired.clear();
        for (const [userId, role] of next.entries())
            this.eosRoleCache.set(userId, role);
        for (const userId of nextDisabled)
            this.eosDisabledUsers.add(userId);
        for (const userId of nextPending)
            this.eosPasswordSetupRequired.add(userId);
        this.eosRoleCacheHealthy = true;
    }
    getEosCachedRole(userId) {
        // Missing or not-yet-resolved identities always fall back to the least privileged role.
        // The underlying socket ACL check still applies afterwards, but this prevents a transient
        // authentication gap from ever selecting the unrestricted EOS policy branch.
        if (!userId) {
            return 'enduser';
        }
        return this.eosRoleCache.get(userId) || 'enduser';
    }
    installEosSocketCommandGuard(socketAdmin) {
        const commands = socketAdmin.commands;
        if (!commands?._checkPermissions || commands._nexowattEosGuardInstalled) {
            return;
        }
        const original = commands._checkPermissions.bind(commands);
        const deny = (socketClient, command, callback, reason) => {
            this.log.warn(`EOS role guard denied ${command} for ${socketClient?._acl?.user || 'unknown'} (${reason})`);
            if (typeof callback === 'function') {
                callback(ERROR_PERMISSION);
            }
            else {
                socketClient?.emit?.(ERROR_PERMISSION, { command, reason: 'eosRolePolicy' });
            }
            return false;
        };
        commands._checkPermissions = (socketClient, command, callback, ...args) => {
            const userId = socketClient?._acl?.user;
            const role = this.getEosCachedRole(userId);
            if (!this.eosSessionSecurity?.isSocketAllowed(socketClient) || !this.eosRoleCacheHealthy || !userId || this.eosDisabledUsers.has(userId) || this.eosPasswordSetupRequired.has(userId)) {
                return deny(socketClient, command, callback, 'account disabled or password change required');
            }
            if (role === 'admin') {
                const allowed = original(socketClient, command, callback, ...args);
                const target = typeof args[0] === 'string' ? args[0] : '';
                if (allowed && (['changePassword', 'addUser', 'delUser', 'addGroup', 'delGroup'].includes(command)
                    || (['setObject', 'extendObject', 'delObject'].includes(command) && /^system\.(?:user|group)\./.test(target)))) {
                    // Close cached socket ACLs before the authorized asynchronous credential write.
                    this.eosSessionSecurity.revoke();
                }
                return allowed;
            }
            if (command === 'cmdExec' || command === 'sendToHost') {
                return deny(socketClient, command, callback, 'raw command execution is Service-only');
            }
            if (role === 'installer' && command === 'readLogs') {
                return true;
            }
            if (role === 'enduser' && ['readLogs', 'sendToHost'].includes(command)) {
                return deny(socketClient, command, callback, 'technical diagnostics are installer/service-only');
            }
            if (command === 'changePassword') {
                // Initial password activation has a separate, tightly scoped backend endpoint.
                // The normal Admin socket password editor remains Service/Admin-only.
                return deny(socketClient, command, callback, 'password administration is Service-only');
            }
            if (['addUser', 'delUser', 'addGroup', 'delGroup'].includes(command)) {
                return deny(socketClient, command, callback, 'account administration is Service-only');
            }
            const objectId = typeof args[0] === 'string' ? args[0] : '';
            if (['setObject', 'extendObject', 'delObject'].includes(command)) {
                if (/^system\.(?:config|repositories|certificates|licenses|credentials\.|user\.|group\.|host\.)/.test(objectId)) {
                    return deny(socketClient, command, callback, 'sensitive system objects are Service-only');
                }
                if (/^system\.adapter\.(?:admin|eos-admin|backitup|xterm)(?:\.|$)/.test(objectId)) {
                    return deny(socketClient, command, callback, 'internal Service reserve is Admin/Service-only');
                }
                const adapterObject = objectId.match(/^system\.adapter\.([^.]+)/)?.[1];
                if (command === 'delObject' && adapterObject && this.getProtectedAdapterNames().includes(adapterObject)) {
                    return deny(socketClient, command, callback, 'protected EOS system module');
                }
                if (role === 'enduser' && !/^enum\.(?:rooms|functions)(?:\.|$)/.test(objectId)) {
                    return deny(socketClient, command, callback, 'end users may only maintain Smart Home assignments');
                }
            }
            if (['setState', 'delState', 'createState'].includes(command)) {
                if (role === 'enduser') {
                    return deny(socketClient, command, callback, 'end-user datapoints are read-only in EOS Admin');
                }
                if (objectId === `${this.namespace}.info.uiTabsVisible`) {
                    return deny(socketClient, command, callback, 'navigation layout is Service-only');
                }
                if (/^(?:admin|backitup|xterm)\.\d+(?:\.|$)/.test(objectId)) {
                    return deny(socketClient, command, callback, 'internal Service reserve is Admin/Service-only');
                }
            }
            return original(socketClient, command, callback, ...args);
        };
        (0, eosApplianceProfile_1.installSocketBoundary)(commands, (socketClient, command, args) => {
            const userId = socketClient?._acl?.user;
            if (!this.eosSessionSecurity?.isSocketAllowed(socketClient) || !this.eosRoleCacheHealthy || !userId
                || !this.eosRoleCache.has(userId) || this.eosDisabledUsers.has(userId) || this.eosPasswordSetupRequired.has(userId))
                return false;
            // Upstream skips its permission check for self-password changes; the
            // appliance still requires the current role and session here.
            return (0, eosApplianceProfile_1.roleSocketCommandAllowed)(this.getEosCachedRole(userId), command, args);
        }, () => objects);
        commands._nexowattEosGuardInstalled = true;
    }
    async ensureEosRoleModel() {
        // Root enrollment owns user/group membership and least-privilege ACLs.
        // Runtime Admin must never recreate, repair, inherit or mirror authority.
        for (const role of ['service', 'installer', 'enduser']) {
            const group = await this.getForeignObjectAsync(eosApplianceProfile_1.ROLE_GROUPS[role]);
            if (group?.type !== 'group' || !Array.isArray(group.common?.members)
                || group.common?.enabled === false) {
                throw new Error('EOS_ROLE_PROVISIONING_REQUIRED');
            }
        }
        await this.refreshEosRoleCache();
    }
    async ensureEosRoleReadableAcl(id) {
        const obj = (await this.getForeignObjectAsync(id));
        if (!obj) {
            return false;
        }
        const native = (obj.native ||= {});
        let changed = false;
        if (native._nexowattEosRoleReadableAclManaged !== true) {
            native._nexowattEosRoleReadableAclManaged = true;
            changed = true;
        }
        const acl = (obj.acl ||= {});
        if (acl.owner !== ADMIN_OWNER_USER) {
            acl.owner = ADMIN_OWNER_USER;
            changed = true;
        }
        if (acl.ownerGroup !== 'system.group.administrator') {
            acl.ownerGroup = 'system.group.administrator';
            changed = true;
        }
        if (acl.object !== EOS_ROLE_READABLE_OBJECT_ACL) {
            acl.object = EOS_ROLE_READABLE_OBJECT_ACL;
            changed = true;
        }
        if (changed) {
            await this.setForeignObjectAsync(id, obj);
        }
        return changed;
    }
    async ensureEosSystemObjectAccess() {
        // Read access is required by the EOS shell and by the adapter/instance views. Installer
        // changes to the safe subset are performed by the guarded backend endpoint, never by
        // granting direct write access to system.config.
        for (const id of EOS_ROLE_READABLE_SYSTEM_OBJECT_IDS) {
            await this.ensureEosRoleReadableAcl(id);
        }
        for (const id of EOS_ADMIN_ONLY_SYSTEM_OBJECT_IDS) {
            await this.ensureObjectAdminOnlyAcl(id);
        }
        try {
            const credentials = await this.getObjectListAsync({
                startkey: 'system.credentials.',
                endkey: 'system.credentials.\u9999',
            });
            for (const row of credentials.rows || []) {
                if (row.id?.startsWith('system.credentials.')) {
                    await this.ensureObjectAdminOnlyAcl(row.id);
                }
            }
        }
        catch (e) {
            this.log.debug(`Cannot scan credential objects for EOS ACL guard: ${e instanceof Error ? e.message : e}`);
        }
    }
    async ensureEosSmartHomeEnumAccess() {
        try {
            const enums = await this.getObjectListAsync({ startkey: 'enum.', endkey: 'enum.\u9999' });
            for (const row of enums.rows || []) {
                const smartHomeEnum = row.id === 'enum.rooms'
                    || row.id === 'enum.functions'
                    || row.id?.startsWith('enum.rooms.')
                    || row.id?.startsWith('enum.functions.');
                if (!smartHomeEnum) {
                    continue;
                }
                const obj = (await this.getForeignObjectAsync(row.id));
                if (!obj) {
                    continue;
                }
                const acl = (obj.acl ||= {});
                let changed = false;
                if (acl.owner !== ADMIN_OWNER_USER) {
                    acl.owner = ADMIN_OWNER_USER;
                    changed = true;
                }
                if (acl.ownerGroup !== this.getEosRoleGroupIds('enduser')[0]) {
                    acl.ownerGroup = this.getEosRoleGroupIds('enduser')[0] || EOS_ENDUSER_GROUP;
                    changed = true;
                }
                // Rooms/functions are an explicitly shared Smart Home surface: administrators,
                // installers and EOS end users may read/write them, while command-level group ACLs
                // still prevent unrelated accounts from using write operations.
                if (acl.object !== 0x666) {
                    acl.object = 0x666;
                    changed = true;
                }
                if (changed) {
                    await this.setForeignObjectAsync(row.id, obj);
                }
            }
        }
        catch (e) {
            this.log.debug(`Cannot prepare Smart Home enum ACLs: ${e instanceof Error ? e.message : e}`);
        }
    }
    async ensureObjectAdminOnlyAcl(id) {
        const obj = (await this.getForeignObjectAsync(id));
        if (!obj) {
            return false;
        }
        const native = (obj.native ||= {});
        let changed = false;
        if (native._nexowattEosAclManaged !== true) {
            native._nexowattEosAclManaged = true;
            native._nexowattEosAclPrevious = obj.acl ? JSON.stringify(obj.acl) : null;
            changed = true;
        }
        const targetAcl = this.getAdminOnlyAcl();
        const acl = (obj.acl ||= {});
        if (acl.owner !== targetAcl.owner) {
            acl.owner = targetAcl.owner;
            changed = true;
        }
        if (acl.ownerGroup !== targetAcl.ownerGroup) {
            acl.ownerGroup = targetAcl.ownerGroup;
            changed = true;
        }
        if (acl.object !== targetAcl.object) {
            acl.object = targetAcl.object;
            changed = true;
        }
        if (changed) {
            await this.setForeignObjectAsync(id, obj);
        }
        return changed;
    }
    async restoreObjectAclManagedByEos(id) {
        const obj = (await this.getForeignObjectAsync(id));
        const native = obj?.native;
        if (!obj || !native || native._nexowattEosAclManaged !== true) {
            return false;
        }
        const targetAcl = this.getAdminOnlyAcl();
        const currentAcl = obj.acl;
        const stillManaged = !!currentAcl
            && currentAcl.owner === targetAcl.owner
            && currentAcl.ownerGroup === targetAcl.ownerGroup
            && currentAcl.object === targetAcl.object;
        const previous = native._nexowattEosAclPrevious;
        if (stillManaged) {
            if (typeof previous === 'string' && previous) {
                try {
                    obj.acl = JSON.parse(previous);
                }
                catch {
                    delete obj.acl;
                }
            }
            else {
                delete obj.acl;
            }
        }
        delete native._nexowattEosAclManaged;
        delete native._nexowattEosAclPrevious;
        await this.setForeignObjectAsync(id, obj);
        return true;
    }
    getLegacyAdminAclObjectIds() {
        return ['system.adapter.admin', LEGACY_ADMIN_INSTANCE_ID];
    }
    async ensureLegacyAdminVisibleOnlyToAdmins() {
        let changed = false;
        if (!this.shouldHideLegacyAdminFromNonAdmins()) {
            for (const id of this.getLegacyAdminAclObjectIds()) {
                changed = (await this.restoreObjectAclManagedByEos(id)) || changed;
            }
            if (changed) {
                this.log.info('EOS ACL guard restored legacy admin visibility because the restriction is disabled');
            }
            return;
        }
        for (const id of this.getLegacyAdminAclObjectIds()) {
            changed = (await this.ensureObjectAdminOnlyAcl(id)) || changed;
        }
        if (changed) {
            this.log.info(`EOS ACL guard restricted legacy admin visibility to ${this.getAdminOnlyGroup()}`);
        }
    }
    async getLegacyBackupAclObjectIds() {
        const ids = new Set([`system.adapter.${LEGACY_BACKUP_ADAPTER_NAME}`]);
        try {
            const rows = await this.getObjectListAsync({
                startkey: `system.adapter.${LEGACY_BACKUP_ADAPTER_NAME}.`,
                endkey: `system.adapter.${LEGACY_BACKUP_ADAPTER_NAME}.\u9999`,
            });
            for (const row of rows.rows || []) {
                if (new RegExp(`^system\\.adapter\\.${LEGACY_BACKUP_ADAPTER_NAME}\\.\\d+$`).test(row.id || '')) {
                    ids.add(row.id);
                }
            }
        }
        catch (e) {
            this.log.debug(`Cannot scan internal backup instances for EOS visibility guard: ${e instanceof Error ? e.message : e}`);
        }
        return [...ids];
    }
    async ensureLegacyBackupVisibleOnlyToAdmins() {
        let changed = false;
        const ids = await this.getLegacyBackupAclObjectIds();
        if (!this.shouldHideLegacyBackupFromNonAdmins()) {
            for (const id of ids) {
                changed = (await this.restoreObjectAclManagedByEos(id)) || changed;
            }
            if (changed) {
                this.log.info('EOS ACL guard restored internal backup visibility because the restriction is disabled');
            }
            return;
        }
        for (const id of ids) {
            changed = (await this.ensureObjectAdminOnlyAcl(id)) || changed;
        }
        if (changed) {
            this.log.info(`EOS ACL guard restricted internal ${LEGACY_BACKUP_ADAPTER_NAME} reserve to ${this.getAdminOnlyGroup()}`);
        }
    }
    getLegacyAdminLockPort() {
        const configured = Number(this.config.eosLegacyAdminLockPort);
        if (!Number.isInteger(configured) || configured < 1 || configured > 65_535) {
            return DEFAULT_LEGACY_ADMIN_LOCK_PORT;
        }
        return configured;
    }
    getLegacyAdminLockBind() {
        const configured = typeof this.config.eosLegacyAdminLockBind === 'string'
            ? this.config.eosLegacyAdminLockBind.trim()
            : '';
        return configured || DEFAULT_LEGACY_ADMIN_LOCK_BIND;
    }
    getProtectedAdapterNames() {
        // v47: delete protection is intentionally limited to the fixed EOS core list.
        // Older installations may have stored additional entries in eosProtectedAdapters;
        // those must not make ordinary runtime adapters undeletable in Dienste/Module.
        const result = new Set([LEGACY_ADMIN_ADAPTER_NAME, ...CORE_PROTECTED_ADAPTER_NAMES]);
        return [...result].sort();
    }
    parseAdapterObjectId(id) {
        const raw = String(id || '')
            .replace(/^system\.adapter\./, '')
            .trim()
            .toLowerCase();
        const match = raw.match(/^([a-z0-9_-]+)(?:\.(\d+))?$/i);
        if (!match) {
            return { adapter: raw.replace(/\.\d+$/, '') };
        }
        return { adapter: match[1], instance: match[2] };
    }
    isProtectedDeleteObjectId(id, protectedAdapters = new Set(this.getProtectedAdapterNames())) {
        const { adapter, instance } = this.parseAdapterObjectId(id);
        if (!adapter || !protectedAdapters.has(adapter)) {
            return false;
        }
        // v58: Only the primary Admin/EOS Admin instance is locked. Additional
        // eos-admin/admin test instances such as eos-admin.1 must remain deletable.
        // The package adapter object itself (without instance number) stays protected.
        if (adapter === EOS_ADMIN_ADAPTER_NAME || adapter === LEGACY_ADMIN_ADAPTER_NAME) {
            return instance === undefined || instance === '0';
        }
        return true;
    }
    scheduleEosSecurityGuard(reason) {
        if (this.eosSecurityDebounce) {
            clearTimeout(this.eosSecurityDebounce);
        }
        this.eosSecurityDebounce = setTimeout(() => {
            this.eosSecurityDebounce = null;
            void this.enforceEosSecurity(reason);
        }, 750);
    }
    async ensureObjectProtectionPolicy(id, options) {
        const obj = (await this.getForeignObjectAsync(id));
        if (!obj?.common) {
            return false;
        }
        let changed = false;
        obj.common = obj.common || {};
        // v29: keep adapters updateable. Do not set common.dontDelete here.
        // Protected business adapters are protected by administrator-only ACLs and EOS UI policy.
        // Older builds set dontDelete on eos-admin; remove the stale flag so upgrades can run.
        if (obj.common.dontDelete === true) {
            delete obj.common.dontDelete;
            changed = true;
        }
        // Keep updates possible. nondeletable=true blocks adapter updates in ioBroker.
        if (obj.common.nondeletable === true) {
            obj.common.nondeletable = false;
            changed = true;
        }
        const targetAcl = this.getAdminOnlyAcl();
        if (options.adminOnlyAcl) {
            const acl = (obj.acl ||= {});
            if (acl.owner !== targetAcl.owner) {
                acl.owner = targetAcl.owner;
                changed = true;
            }
            if (acl.ownerGroup !== targetAcl.ownerGroup) {
                acl.ownerGroup = targetAcl.ownerGroup;
                changed = true;
            }
            if (acl.object !== targetAcl.object) {
                acl.object = targetAcl.object;
                changed = true;
            }
        }
        else if (obj.acl
            && obj.acl.owner === targetAcl.owner
            && obj.acl.ownerGroup === targetAcl.ownerGroup
            && obj.acl.object === targetAcl.object) {
            // v37 repair: remove stale EOS admin-only ACLs from runtime adapters such as
            // BackItUp. Those ACLs can disturb adapter internals and adapter-owned config UIs.
            delete obj.acl;
            changed = true;
        }
        if (changed) {
            await this.setForeignObjectAsync(id, obj);
        }
        return changed;
    }
    async clearStaleAdapterDeleteLocks(id, protectedAdapters) {
        const obj = (await this.getForeignObjectAsync(id));
        if (!obj?.common) {
            return false;
        }
        const isProtected = this.isProtectedDeleteObjectId(id, protectedAdapters);
        // v47/v58: never "repair" fixed protected core adapter objects here. On some systems
        // ioBroker or another guard restores their delete flags immediately, which created
        // a repair/reapply loop and filled the log every debounce cycle. Additional EOS Admin
        // instances such as eos-admin.1 are not protected and are cleaned below.
        if (isProtected) {
            return false;
        }
        let changed = false;
        obj.common = obj.common || {};
        // v45/v47: old builds could leave common.dontDelete/common.nondeletable on normal
        // adapter or instance objects. Those flags block ioBroker del even if the UI allows it.
        if (obj.common.dontDelete === true) {
            delete obj.common.dontDelete;
            changed = true;
        }
        if (obj.common.nondeletable === true) {
            obj.common.nondeletable = false;
            changed = true;
        }
        // Also undo stale admin-only ACLs for adapters that are no longer protected by the
        // hard core list. UI protection remains for real core modules.
        if (!isProtected && obj.acl) {
            const targetAcl = this.getAdminOnlyAcl();
            const acl = obj.acl;
            if (acl.owner === targetAcl.owner && acl.ownerGroup === targetAcl.ownerGroup && acl.object === targetAcl.object) {
                delete obj.acl;
                changed = true;
            }
        }
        if (changed) {
            await this.setForeignObjectAsync(id, obj);
        }
        return changed;
    }
    async repairStaleAdapterDeleteLocks() {
        const protectedAdapters = new Set(this.getProtectedAdapterNames());
        const ids = new Set();
        const collect = async (type) => {
            try {
                const view = await this.getObjectViewAsync('system', type, {
                    startkey: 'system.adapter.',
                    endkey: 'system.adapter.香',
                });
                for (const row of view.rows || []) {
                    if (row.id) {
                        ids.add(row.id);
                    }
                }
            }
            catch (e) {
                this.log.warn(`Cannot scan ${type} objects for stale delete locks: ${e instanceof Error ? e.message : e}`);
            }
        };
        await collect('adapter');
        await collect('instance');
        let changed = 0;
        for (const id of ids) {
            if (await this.clearStaleAdapterDeleteLocks(id, protectedAdapters)) {
                changed++;
            }
        }
        if (changed) {
            this.log.debug(`EOS delete guard repaired stale delete locks on ${changed} adapter/instance object(s)`);
        }
    }
    async ensureProtectedAdapter(adapter) {
        if (!adapter || adapter === LEGACY_ADMIN_ADAPTER_NAME) {
            return;
        }
        const isEosAdmin = adapter === EOS_ADMIN_ADAPTER_NAME;
        // v87 role access: EOS Admin itself must stay readable for authenticated installer and
        // end-user sessions. Deletion is still blocked by EOS policy, but an administrator-only
        // object ACL prevents the socket from reading its own instance and causes permissionError.
        const adminOnlyAcl = !isEosAdmin
            && this.shouldApplyAdminOnlyAclToProtectedAdapters()
            && adapter !== 'backitup';
        // v37 BackItUp/runtime-adapter compatibility:
        // default EOS protection is UI/role based. Do not rewrite common/ACL of runtime adapters
        // such as backitup unless the admin explicitly enables ACL protection for protected adapters.
        // EOS Admin is reconciled even without strict ACL mode so stale v86 admin-only ACLs are restored.
        if (!isEosAdmin && !adminOnlyAcl) {
            return;
        }
        const reconcileObject = async (id, protectWithAdminAcl) => {
            let objectChanged = false;
            if (isEosAdmin) {
                objectChanged = await this.restoreObjectAclManagedByEos(id);
                objectChanged = (await this.ensureEosRoleReadableAcl(id)) || objectChanged;
            }
            objectChanged = (await this.ensureObjectProtectionPolicy(id, {
                keepDontDelete: false,
                adminOnlyAcl: protectWithAdminAcl,
            })) || objectChanged;
            return objectChanged;
        };
        let changed = await reconcileObject(`system.adapter.${adapter}`, adminOnlyAcl);
        try {
            const instances = await this.getObjectViewAsync('system', 'instance', {
                startkey: `system.adapter.${adapter}.`,
                endkey: `system.adapter.${adapter}.香`,
            });
            for (const row of instances.rows) {
                const protectThisInstance = this.isProtectedDeleteObjectId(row.id, new Set(this.getProtectedAdapterNames()));
                changed = (await reconcileObject(row.id, protectThisInstance && adminOnlyAcl)) || changed;
            }
        }
        catch (e) {
            this.log.warn(`Cannot protect instances of adapter "${adapter}": ${e instanceof Error ? e.message : e}`);
        }
        if (changed) {
            this.log.debug(`EOS ACL/UI delete guard applied to adapter "${adapter}"`);
        }
    }
    async ensureLegacyAdminLocked() {
        if (!this.isLegacyAdminLockEnabled()) {
            return;
        }
        const obj = (await this.getForeignObjectAsync(LEGACY_ADMIN_INSTANCE_ID));
        if (!obj?.common) {
            return;
        }
        const targetPort = this.getLegacyAdminLockPort();
        const targetBind = this.getLegacyAdminLockBind();
        let changed = false;
        const native = (obj.native ||= {});
        if (obj.common.enabled !== false) {
            obj.common.enabled = false;
            changed = true;
        }
        if (native.port !== targetPort) {
            native.port = targetPort;
            changed = true;
        }
        if (native.bind !== targetBind) {
            native.bind = targetBind;
            changed = true;
        }
        if (obj.common.nondeletable === true) {
            obj.common.nondeletable = false;
            changed = true;
        }
        if (changed) {
            await this.setForeignObjectAsync(LEGACY_ADMIN_INSTANCE_ID, obj);
            this.log.warn(`EOS security guard disabled legacy admin.0 and moved it to ${targetBind}:${targetPort}. Disable "Legacy Admin lock" in EOS Admin settings before intentionally starting the old admin.`);
        }
    }
    async enforceEosSecurity(reason = 'periodic') {
        if (this.eosSecurityRunning) {
            return;
        }
        this.eosSecurityRunning = true;
        try {
            await this.ensureEosRoleModel();
            await this.ensureEosSystemObjectAccess();
            await this.ensureEosSmartHomeEnumAccess();
            await this.ensureLegacyAdminLocked();
            await this.ensureLegacyAdminVisibleOnlyToAdmins();
            await this.ensureLegacyBackupVisibleOnlyToAdmins();
            if (!this.eosDeleteLockRepairFinished) {
                await this.repairStaleAdapterDeleteLocks();
                this.eosDeleteLockRepairFinished = true;
            }
            if (this.config.eosProtectAdapterDeletion !== false) {
                for (const adapter of this.getProtectedAdapterNames()) {
                    await this.ensureProtectedAdapter(adapter);
                }
            }
        }
        catch (e) {
            this.log.warn(`Cannot apply EOS security guard (${reason}): ${e instanceof Error ? e.message : e}`);
        }
        finally {
            this.eosSecurityRunning = false;
        }
    }
    startEosSecurityGuard() {
        for (const adapter of this.getProtectedAdapterNames()) {
            this.subscribeForeignObjects(`system.adapter.${adapter}`);
            this.subscribeForeignObjects(`system.adapter.${adapter}.*`);
        }
        this.subscribeForeignObjects('system.group.*');
        this.subscribeForeignObjects('system.user.*');
        this.subscribeForeignObjects('system.credentials.*');
        this.subscribeForeignObjects('system.config');
        this.subscribeForeignObjects('system.repositories');
        this.subscribeForeignObjects('system.certificates');
        this.subscribeForeignObjects('system.licenses');
        this.subscribeForeignObjects('enum.rooms.*');
        this.subscribeForeignObjects('enum.functions.*');
        void this.enforceEosSecurity('startup');
        if (!this.eosSecurityTimer) {
            this.eosSecurityTimer = setInterval(() => {
                void this.enforceEosSecurity('periodic');
            }, 300_000);
        }
    }
    async createUpdateInfo() {
        const promises = [];
        // create a connected object and state
        const updatesNumberObj = objects[`${this.namespace}.info.updatesNumber`];
        if (!updatesNumberObj || !updatesNumberObj.common || updatesNumberObj.common.type !== 'number') {
            const obj = {
                _id: 'info.updatesNumber',
                type: 'state',
                common: {
                    role: 'indicator.updates',
                    name: {
                        en: 'Number of adapters to update',
                        de: 'Anzahl der zu aktualisierenden Adapter',
                        ru: 'Количество адаптеров для обновления',
                        pt: 'Número de adaptadores para atualizar',
                        nl: 'Aantal adapters om te updaten',
                        fr: "Nombre d'adaptateurs à mettre à jour",
                        it: 'Numero di adattatori da aggiornare',
                        es: 'Número de adaptadores para actualizar',
                        pl: 'Liczba adapterów do aktualizacji',
                        uk: 'Кількість адаптерів для оновлення',
                        'zh-cn': '要更新的适配器数量',
                    },
                    type: 'number',
                    read: true,
                    write: false,
                    def: 0,
                },
                native: {},
            };
            await this.setObject(obj._id, obj);
        }
        const updatesListObj = objects[`${this.namespace}.info.updatesList`];
        if (!updatesListObj || !updatesListObj.common || updatesListObj.common.type !== 'string') {
            const obj = {
                _id: 'info.updatesList',
                type: 'state',
                common: {
                    role: 'indicator.updates',
                    name: {
                        en: 'List of adapters to update',
                        de: 'Liste der zu aktualisierenden Adapter',
                        ru: 'Список адаптеров для обновления',
                        pt: 'Lista de adaptadores para atualizar',
                        nl: 'Lijst met adapters die moeten worden bijgewerkt',
                        fr: 'Liste des adaptateurs à mettre à jour',
                        it: 'Elenco degli adattatori da aggiornare',
                        es: 'Lista de adaptadores para actualizar',
                        pl: 'Lista adapterów do aktualizacji',
                        uk: 'Список адаптерів для оновлення',
                        'zh-cn': '要更新的适配器列表',
                    },
                    type: 'string',
                    read: true,
                    write: false,
                    def: '',
                },
                native: {},
            };
            await this.setObject(obj._id, obj);
        }
        const newUpdatesObj = objects[`${this.namespace}.info.newUpdates`];
        if (!newUpdatesObj || !newUpdatesObj.common || newUpdatesObj.common.type !== 'boolean') {
            const obj = {
                _id: 'info.newUpdates',
                type: 'state',
                common: {
                    role: 'indicator.updates',
                    name: {
                        en: 'Indicator if new adapter updates are available',
                        de: 'Anzeige, ob neue Adapter-Updates verfügbar sind',
                        ru: 'Индикатор наличия новых обновлений адаптера',
                        pt: 'Indicador se novas atualizações do adaptador estão disponíveis',
                        nl: 'Indicator of er nieuwe adapter-updates beschikbaar zijn',
                        fr: "Indicateur si de nouvelles mises à jour de l'adaptateur sont disponibles",
                        it: "Indicatore se sono disponibili nuovi aggiornamenti dell'adattatore",
                        es: 'Indicador si hay nuevas actualizaciones de adaptadores disponibles',
                        pl: 'Wskaźnik, czy dostępne są nowe aktualizacje adaptera',
                        uk: 'Індикатор наявності нових оновлень адаптера',
                        'zh-cn': '指示是否有新的适配器更新可用',
                    },
                    type: 'boolean',
                    read: true,
                    write: false,
                    def: false,
                },
                native: {},
            };
            promises.push(this.setObjectAsync(obj._id, obj));
        }
        const updatesJsonObj = objects[`${this.namespace}.info.updatesJson`];
        if (!updatesJsonObj || !updatesJsonObj.common || updatesJsonObj.common.type !== 'string') {
            const obj = {
                _id: 'info.updatesJson',
                type: 'state',
                common: {
                    role: 'indicator.updates',
                    name: {
                        en: 'JSON string with adapter update information',
                        de: 'JSON-String mit Adapteraktualisierungsinformationen',
                        ru: 'Строка JSON с информацией об обновлении адаптера',
                        pt: 'String JSON com informações de atualização do adaptador',
                        nl: 'JSON-tekenreeks met adapter-update-informatie',
                        fr: "Chaîne JSON avec les informations de mise à jour de l'adaptateur",
                        it: "Stringa JSON con informazioni sull'aggiornamento dell'adattatore",
                        es: 'Cadena JSON con información de actualización del adaptador',
                        pl: 'Ciąg JSON z informacjami o aktualizacji adaptera',
                        uk: 'Рядок JSON з інформацією про оновлення адаптера',
                        'zh-cn': '带有适配器更新信息的 JSON 字符串',
                    },
                    type: 'string',
                    read: true,
                    write: false,
                    def: '{}',
                },
                native: {},
            };
            promises.push(this.setObjectAsync(obj._id, obj));
        }
        const lastUpdateCheckObj = objects[`${this.namespace}.info.lastUpdateCheck`];
        if (!lastUpdateCheckObj || !lastUpdateCheckObj.common || lastUpdateCheckObj.common.type !== 'number') {
            const obj = {
                _id: 'info.lastUpdateCheck',
                type: 'state',
                common: {
                    role: 'value.time',
                    name: {
                        en: 'Timestamp of last update check',
                        de: 'Zeitstempel der letzten UpdatePrüfung',
                        ru: 'Отметка времени последней проверки обнвлений',
                        pt: 'Timestamp da última verificação de atualizaçã',
                        nl: 'Tijdstempel van laatste updatecontrole',
                        fr: 'Horodatage de la dernière vérificationde mise à jour',
                        it: "Timestamp dell'ultimo controllo di aggiornamento",
                        es: 'Marca de tiempo de la última verificación de actalización',
                        pl: 'Znacznik czasu ostatniego sprawdzenia aktualizacji',
                        uk: 'Відмітка часу останньої перевірки оновлень',
                        'zh-cn': '上次更新检查的时间戳',
                    },
                    type: 'number',
                    read: true,
                    write: false,
                    def: 0,
                },
                native: {},
            };
            promises.push(this.setObjectAsync(obj._id, obj));
        }
        await Promise.all(promises);
    }
    upToDate(v1, v2) {
        return semver.gt(v2, v1);
    }
    /**
     * Write the update information to the states
     */
    async writeUpdateInfo(
    /** current sources, if given */
    sources) {
        if (!objects['system.config'] || !objects['system.config'].common) {
            return this.log.warn('Repository cannot be read. Invalid "system.config" object.');
        }
        const activeRepo = objects['system.config']
            .common?.activeRepo;
        const systemRepos = objects['system.repositories'];
        if (!sources) {
            sources = {};
            // If a multi-repo case. Actual case
            if (Array.isArray(activeRepo)) {
                if (systemRepos?.native?.repositories) {
                    for (const repo of activeRepo) {
                        if (systemRepos.native.repositories[repo]?.json) {
                            Object.assign(sources, systemRepos.native.repositories[repo].json);
                        }
                        else {
                            await this.setState('info.updatesNumber', 0, true);
                            await this.setState('info.updatesList', '', true);
                            await this.setState('info.newUpdates', false, true);
                            await this.setState('info.updatesJson', '{}', true);
                            await this.setState('info.lastUpdateCheck', Date.now(), true);
                            if (systemRepos.native.repositories[repo]) {
                                this.log.warn(`Repository cannot be read: Active repo - ${repo}`);
                            }
                            else {
                                this.log.warn('No repository source configured');
                            }
                        }
                    }
                }
            }
            else if (activeRepo && systemRepos?.native?.repositories?.[activeRepo]?.json) {
                // This is deprecated and must be deleted after a couple of years: BF 2025.02.07
                sources = systemRepos.native.repositories[activeRepo].json;
            }
        }
        if (!Object.keys(sources).length) {
            await this.setState('info.updatesNumber', 0, true);
            await this.setState('info.updatesList', '', true);
            await this.setState('info.newUpdates', false, true);
            await this.setState('info.updatesJson', '{}', true);
            await this.setState('info.lastUpdateCheck', Date.now(), true);
            if (Array.isArray(activeRepo)) {
                let found = false;
                if (systemRepos?.native?.repositories) {
                    activeRepo.forEach(repo => {
                        if (systemRepos.native.repositories[repo]) {
                            this.log.warn(`Active repository "${repo}" cannot be read`);
                            found = true;
                        }
                    });
                }
                if (!found) {
                    this.log.warn(`No repository source configured. Possible values: ${systemRepos?.native?.repositories
                        ? Object.keys(systemRepos.native.repositories).join(', ')
                        : 'none'}. Active repo(s): "${activeRepo.join('", "')}"`);
                }
            }
            else if (activeRepo && systemRepos?.native?.repositories?.[activeRepo]) {
                this.log.warn(`Repository cannot be read. Active repo: ${JSON.stringify(activeRepo)}`);
            }
            else {
                this.log.warn(`No repository source configured. Possible values: ${systemRepos?.native?.repositories
                    ? Object.keys(systemRepos.native.repositories).join(', ')
                    : 'none'}. Active repo: ${JSON.stringify(activeRepo)}`);
            }
            return;
        }
        const installed = getInstalledInfo();
        const list = [];
        const updatesJson = {};
        let newUpdateIndicator = false;
        const state = await this.getStateAsync('info.updatesJson');
        let oldUpdates;
        if (typeof state?.val === 'string') {
            try {
                oldUpdates = JSON.parse(state.val) || {};
            }
            catch (e) {
                oldUpdates = {};
                this.log.warn(`Cannot parse info.updatesJson: ${e}`);
            }
        }
        else {
            oldUpdates = {};
        }
        Object.keys(sources).forEach(name => {
            try {
                if (installed[name]?.version && sources[name].version) {
                    if (sources[name].version !== installed[name].version &&
                        !this.upToDate(sources[name].version, installed[name].version)) {
                        // Check if updates are new or already known to user
                        if (!oldUpdates ||
                            !oldUpdates[name] ||
                            oldUpdates[name].availableVersion !== sources[name].version) {
                            newUpdateIndicator = true;
                        } // endIf
                        updatesJson[name] = {
                            availableVersion: sources[name].version,
                            installedVersion: installed[name].version,
                        };
                        // remove the first part of the name
                        const n = name.indexOf('.');
                        list.push(n === -1 ? name : name.substring(n + 1));
                    }
                }
            }
            catch (err) {
                this.log.warn(`Error on version check for ${name}: ${err}`);
            }
        });
        await this.setState('info.updatesNumber', list.length, true);
        await this.setState('info.updatesList', list.join(', '), true);
        await this.setState('info.newUpdates', newUpdateIndicator, true);
        await this.setState('info.updatesJson', JSON.stringify(updatesJson), true);
        await this.setState('info.lastUpdateCheck', Date.now(), true);
        if (!newUpdateIndicator) {
            return;
        }
        const textArr = [];
        for (const [adapter, updateInfo] of Object.entries(updatesJson)) {
            const text = (0, translations_1.getAdapterUpdateText)({
                adapter,
                installedVersion: updateInfo.installedVersion,
                newVersion: updateInfo.availableVersion,
                lang: systemLanguage,
            });
            textArr.push(text);
        }
        await this.registerNotification('admin', 'adapterUpdates', textArr.join('\n'));
    }
    async initSocket(server, store) {
        const settings = {
            language: this.config.language,
            defaultUser: this.config.defaultUser,
            ttl: normalizeLoginTimeout(this.config.ttl),
            secure: this.config.secure,
            auth: true,
            port: this.config.port,
            secret: this.secret,
        };
        // Build the synchronous socket-role cache before accepting the first client. Without
        // this barrier an installer could briefly be treated as an end user during a fresh start.
        try {
            await this.ensureEosRoleModel();
        }
        catch (e) {
            this.log.warn(`Cannot prepare EOS role cache before socket start: ${e instanceof Error ? e.message : e}`);
        }
        socket = new socket_classes_1.SocketAdmin(settings, this, objects);
        this.eosSessionSecurity.bindSockets(socket);
        this.installEosSocketCommandGuard(socket);
        socket.start(server, ws_server_1.SocketIO, { store, oauth2Only: true, noBasicAuth: this.config.noBasicAuth });
        // subscribe to all object changes
        socket.subscribe('objectChange', '*');
        // Ratings are external metadata and do not belong to the offline appliance.
    }
    async applyRightsToObjects(pattern, types) {
        let len = 0;
        if (typeof types === 'object') {
            for (const type of types) {
                len += await this.applyRightsToObjects(pattern, type);
            }
        }
        else {
            try {
                const doc = await this.getObjectViewAsync('system', types, {
                    startkey: `${pattern}.`,
                    endkey: `${pattern}.\u9999`,
                });
                this._tasks = this._tasks || [];
                for (const row of doc.rows) {
                    const obj = row.value;
                    if (!obj.acl || obj.acl.owner !== this.config.defaultUser) {
                        obj.acl.owner = this.config.defaultUser;
                        await this.setForeignObjectAsync(obj._id, obj);
                        len++;
                    }
                }
            }
            catch (e) {
                this.log.error(`Error applying rights to objects: ${e.message}`);
            }
        }
        return len;
    }
    async applyRights() {
        this.config.accessAllowedConfigs = this.config.accessAllowedConfigs || [];
        this.config.accessAllowedTabs = this.config.accessAllowedTabs || [];
        let len = 0;
        for (const id of this.config.accessAllowedConfigs) {
            const obj = await this.getForeignObjectAsync(`system.adapter.${id}`);
            if (obj?.acl && obj.acl.owner !== this.config.defaultUser) {
                obj.acl.owner = this.config.defaultUser;
                await this.setForeignObjectAsync(`system.adapter.${id}`, obj);
                len++;
            }
        }
        for (const id of this.config.accessAllowedTabs) {
            if (id.startsWith('devices.')) {
                // change rights of all `alias.*`
                len += await this.applyRightsToObjects('alias', ['state', 'channel']);
            }
            else if (id.startsWith('javascript.')) {
                // change rights of all script.js.*
                len += await this.applyRightsToObjects('javascript', ['script', 'channel']);
            }
            else if (id.startsWith('fullcalendar.')) {
                // change rights of all fullcalendar.*
                len += await this.applyRightsToObjects('fullcalendar', ['schedule']);
            }
            else if (id.startsWith('scenes.')) {
                // change rights of all scenes.*
                len += await this.applyRightsToObjects('scenes', ['state', 'channel']);
            }
        }
        if (len) {
            this.log.info(`Updated ${len} objects`);
        }
    }
    /**
     * Read news from the server and register them as notifications
     */
    async updateNews() {
        if (this.timerNews) {
            clearTimeout(this.timerNews);
            this.timerNews = null;
        }
        this.checkNodeJsVersion().catch(e => this.log.warn(`Cannot check node.js versions: ${e}`));
        let oldNews;
        let newEtag;
        const oldEtag = (await this.getStateAsync('info.newsETag'))?.val;
        let etag;
        // Both sequential news requests share one monotonic five-second network budget.
        const newsRequestStarted = performance.now();
        const newsRemainingBudget = () => {
            const remaining = Math.floor(5000 - (performance.now() - newsRequestStarted));
            if (remaining <= 0)
                throw new Error('EOS_NEWS_REQUEST_DEADLINE');
            return remaining;
        };
        try {
            etag = await (0, eosHttpsClient_1.requestHttpsJson)('https://iobroker.live/repo/news-hash.json', {
                allowedHosts: ['iobroker.live'], maxBytes: 16_384, budgetMs: newsRemainingBudget(),
            });
        }
        catch (e) {
            this.log.warn('Cannot update news; bounded request or local update failed');
        }
        let _newNews;
        if (etag && etag.hash !== oldEtag) {
            newEtag = etag.hash;
            try {
                _newNews = await (0, eosHttpsClient_1.requestHttpsJson)('https://iobroker.live/repo/news.json', {
                    allowedHosts: ['iobroker.live'], maxBytes: 1_048_576, budgetMs: newsRemainingBudget(),
                });
            }
            catch (e) {
                this.log.warn('Cannot fetch news feed; bounded HTTPS request failed');
            }
        }
        else {
            newEtag = oldEtag;
            _newNews = [];
        }
        const newNews = Array.isArray(_newNews) ? _newNews : [];
        const newsState = await this.getStateAsync('info.newsFeed');
        try {
            oldNews = newsState?.val ? JSON.parse(newsState.val) : [];
        }
        catch {
            oldNews = [];
        }
        const originalOldNews = JSON.stringify(oldNews);
        const lastState = await this.getStateAsync('info.newsLastId');
        // find time of last ID
        let time = '';
        if (lastState?.val) {
            const item = oldNews.find(item => item.id === lastState.val);
            if (item) {
                time = item.created;
            }
        }
        try {
            // add all IDs newer than last seen
            newNews.forEach(item => {
                if (!lastState || !time || item.created > time) {
                    if (!oldNews.find(it => it.created === item.created)) {
                        oldNews.push(item);
                    }
                }
            });
            oldNews.sort((a, b) => (a.created > b.created ? -1 : a.created < b.created ? 1 : 0));
            // delete news older than 3 months
            let i;
            for (i = oldNews.length - 1; i >= 0; i--) {
                if (Date.now() - new Date(oldNews[i].created).getTime() > 180 * 24 * 3_600_000) {
                    oldNews.splice(i, 1);
                }
            }
            if (originalOldNews !== JSON.stringify(oldNews)) {
                await this.registerNewsNotifications(oldNews, lastState?.val);
                await this.setStateAsync('info.newsFeed', JSON.stringify(oldNews), true);
            }
            if (newEtag !== oldEtag) {
                await this.setStateAsync('info.newsETag', newEtag, true);
            }
        }
        catch (e) {
            this.log.warn('Cannot update news; bounded request or local update failed');
        }
        this.timerNews = setTimeout(() => this.updateNews(), 24 * ONE_HOUR_MS + 1);
    }
    /**
     * Add the news to the notification system
     *
     * @param messages sorted news
     * @param lastMessageId lastMessageId, all after this has already been seen
     */
    async registerNewsNotifications(messages, lastMessageId) {
        const adapters = await this.getObjectViewAsync('system', 'adapter', {
            startkey: 'system.adapter.\u0000',
            endkey: 'system.adapter.\u9999',
        });
        const operatingSystem = (0, node_os_1.platform)();
        const instances = await this.getObjectViewAsync('system', 'instance', {
            startkey: 'system.adapter.\u0000',
            endkey: 'system.adapter.\u9999',
        });
        const activeRepo = (await this.getForeignObjectAsync('system.config'))?.common.activeRepo;
        const uuid = (await this.getForeignObjectAsync('system.meta.uuid'))?.native.uuid;
        const nodeVersion = process.version;
        const npmVersion = await this.getNpmVersion();
        const today = Date.now();
        for (const message of messages) {
            if (!message) {
                continue;
            }
            if (message.id === lastMessageId) {
                break;
            }
            let showIt = true;
            if (showIt && message['date-start'] && new Date(message['date-start']).getTime() > today) {
                showIt = false;
            }
            else if (showIt && message['date-end'] && new Date(message['date-end']).getTime() < today) {
                showIt = false;
            }
            else if (showIt && message.conditions && Object.keys(message.conditions).length > 0) {
                Object.keys(message.conditions).forEach(key => {
                    if (showIt) {
                        const adapter = adapters.rows.find(adapter => adapter.id === `system.adapter.${key}`);
                        const condition = message.conditions[key];
                        if (!adapter && condition !== '!installed') {
                            showIt = false;
                        }
                        else if (adapter && condition === '!installed') {
                            showIt = false;
                        }
                        else if (adapter && condition === 'active') {
                            showIt = this.checkActive(key, instances);
                        }
                        else if (adapter && condition === '!active') {
                            showIt = !this.checkActive(key, instances);
                        }
                        else if (adapter?.value) {
                            showIt = this.checkConditions(condition, adapter.value.common.version);
                        }
                    }
                });
            }
            if (showIt && message['node-version']) {
                showIt = this.checkConditions(message['node-version'], nodeVersion);
            }
            if (showIt && message['npm-version']) {
                showIt = this.checkConditions(message['npm-version'], npmVersion);
            }
            if (showIt && message.os) {
                showIt = operatingSystem === message.os;
            }
            if (showIt && message.repo) {
                // If multi-repo
                if (Array.isArray(activeRepo)) {
                    showIt = activeRepo.includes(message.repo);
                }
                else {
                    showIt = activeRepo === message.repo;
                }
            }
            if (showIt && message.uuid) {
                if (Array.isArray(message.uuid)) {
                    showIt = uuid && message.uuid.find(msgUuid => uuid === msgUuid);
                }
                else {
                    showIt = !!(uuid && uuid === message.uuid);
                }
            }
            if (showIt && message['number-of-objects']) {
                const res = await this.getObjectListAsync({ include_docs: true });
                const noObjects = res.rows.length;
                showIt = eval(`${noObjects} ${message['number-of-objects']}`);
            }
            if (showIt && message['objects-db-type']) {
                const objectsDbType = await this.getObjectsDbType();
                if (!message['objects-db-type'].includes(objectsDbType)) {
                    showIt = false;
                }
            }
            if (showIt) {
                this.log.info(`register notification ${message.class}`);
                await this.registerNotification('admin', `${message.class}News`, `${message.title.en}\n${message.content.en}`);
            }
        }
    }
    /**
     * Check if the adapter is active
     *
     * @param adapterName name of the adapter
     * @param instances list of instances
     */
    checkActive(adapterName, instances) {
        return !!Object.keys(instances)
            .filter(id => id.startsWith(`adapter.system.${adapterName}.`))
            .find(id => instances.rows.find(row => id === row.id)?.value?.common.enabled);
    }
    /**
     * Check if conditions met
     *
     * @param condition condition to check
     * @param installedVersion installed version
     */
    checkConditions(condition, installedVersion) {
        if (condition.startsWith('equals')) {
            const vers = condition.substring(7, condition.length - 1).trim();
            return installedVersion === vers;
        }
        if (condition.startsWith('bigger') || condition.startsWith('greater')) {
            const vers = condition.substring(7, condition.length - 1).trim();
            try {
                return semver.gt(vers, installedVersion);
            }
            catch {
                return false;
            }
        }
        else if (condition.startsWith('smaller')) {
            const vers = condition.substring(8, condition.length - 1).trim();
            try {
                return semver.lt(installedVersion, vers);
            }
            catch {
                return false;
            }
        }
        else if (condition.startsWith('between')) {
            const vers1 = condition.substring(8, condition.indexOf(',')).trim();
            const vers2 = condition.substring(condition.indexOf(',') + 1, condition.length - 1).trim();
            try {
                return semver.gte(installedVersion, vers1) && semver.lte(installedVersion, vers2);
            }
            catch {
                return false;
            }
        }
        else {
            return true;
        }
    }
    /**
     * Get the objects db type
     */
    async getObjectsDbType() {
        const hostAlive = await this.getForeignStateAsync(`system.host.${this.host}.alive`);
        if (!hostAlive?.val) {
            return 'jsonl';
        }
        const diagData = await this.sendToHostAsync(this.host, 'getDiagData', 'normal');
        // @ts-expect-error messages are special and cannot be typed easily
        return diagData.objectsType;
    }
    /**
     * Get the current npm version from the controller
     */
    async getNpmVersion() {
        const hostAlive = await this.getForeignStateAsync(`system.host.${this.host}.alive`);
        if (!hostAlive?.val) {
            throw new Error('Host is offline');
        }
        const hostInfo = await this.sendToHostAsync(this.host, 'getHostInfo', {});
        // @ts-expect-error messages are special and cannot be typed easily
        return hostInfo.NPM;
    }
    async checkNodeJsVersion() {
        // allow only one admin instance to check the versions for every host
        if (this.instance !== 0) {
            const objs = await this.getObjectViewAsync('system', 'instance', {
                startkey: 'system.adapter.eos-admin.',
                endkey: 'system.adapter.eos-admin.\u9999',
            });
            let min = null;
            // find the lowest active instance on the same host
            for (const row of objs.rows) {
                const obj = row.value;
                if (obj?.common.enabled && obj.common.host === this.host) {
                    const instance = parseInt(row.id.split('.').pop());
                    if (min === null || min < instance) {
                        min = instance;
                    }
                }
            }
            if (this.instance !== min) {
                return;
            }
        }
        const response = await (0, axios_1.default)('https://nodejs.org/download/release/index.json');
        const result = {
            nodeNewest: '',
            nodeNewestNext: '',
            npmNewest: '',
            npmNewestNext: '',
            npmCurrent: '',
            nodeCurrent: process.version,
        };
        try {
            result.npmCurrent = await this.getNpmVersion();
        }
        catch (error) {
            this.log.warn(`Cannot get current npm version: ${error}`);
        }
        // https://nodejs.org/download/release/index.json
        // detect a new version of the same major version and new major version (that is allowed by ioBroker)
        try {
            const recommendedVersions = await this.getRecommendedVersions();
            // find newest suggested version
            const nodeNewestNext = response.data.find(item => item.version.startsWith(`v${recommendedVersions.node}.`));
            const nodeCurrentMajor = process.version.split('.')[0];
            const nodeNewest = response.data.find(item => item.version.startsWith(`${nodeCurrentMajor}.`));
            if (nodeNewestNext) {
                result.nodeNewestNext = nodeNewestNext.version;
            }
            if (nodeNewest) {
                result.nodeNewest = nodeNewest.version;
            }
            // find newest suggested version
            const npmNewestNext = nodeNewestNext || response.data.find(item => item.npm.startsWith(`${recommendedVersions.npm}.`));
            const npmNewest = response.data.find(item => item.version === process.version);
            if (npmNewestNext) {
                result.npmNewestNext = npmNewestNext.npm;
            }
            if (npmNewest) {
                result.npmNewest = npmNewest.npm;
            }
            const prefix = `system.host.${this.host}.versions`;
            await this.setForeignObjectNotExistsAsync(prefix, {
                type: 'channel',
                common: {
                    name: {
                        en: 'Node.js/Npm versions',
                        de: 'Node.js/Npm Versionen',
                        ru: 'Node.js/Npm версии',
                        pt: 'Versões Node.js/Npm',
                        nl: 'Node.js/Npm versions',
                        fr: 'Node.js/Npm versions',
                        it: 'Node.js/Npm versioni',
                        es: 'Node.js/Npm versiones',
                        pl: 'Wersja node.js/Npm',
                        uk: 'Версії Node.js/Npm',
                        'zh-cn': '页: 1',
                    },
                },
                native: {},
            });
            const states = [
                {
                    _id: 'nodeCurrent',
                    type: 'state',
                    common: {
                        role: 'state',
                        name: {
                            en: 'Current node.js version',
                            de: 'Aktuelle node.js Version',
                            ru: 'Текущая версия node.js',
                            pt: 'Versão atual do node.js',
                            nl: 'Current Node',
                            fr: 'Version actuelle node.js',
                            it: 'Versione attuale node.js',
                            es: 'Versión actual node.js',
                            pl: 'Aktualna wersja.js',
                            uk: 'Поточна версія вузла',
                            'zh-cn': '目前没有。',
                        },
                        type: 'string',
                        read: true,
                        write: false,
                        def: '',
                    },
                    native: {},
                },
                {
                    _id: 'nodeNewest',
                    type: 'state',
                    common: {
                        role: 'state',
                        name: {
                            en: 'Newest node.js version',
                            de: 'Neueste node.js Version',
                            ru: 'Новейшая версия node.js',
                            pt: 'Mais recente versão node.js',
                            nl: 'Nieuwste node',
                            fr: 'Nouvelle version node.js',
                            it: 'Nuova versione node.js',
                            es: 'Versión más reciente node.js',
                            pl: 'Najnowsza wersja węzła.js',
                            uk: 'Остання версія вузла',
                            'zh-cn': '最新版本',
                        },
                        type: 'string',
                        read: true,
                        write: false,
                        def: '',
                    },
                    native: {},
                },
                {
                    _id: 'nodeNewestNext',
                    type: 'state',
                    common: {
                        role: 'state',
                        name: {
                            en: 'Newest next major node.js version',
                            de: 'Neueste nächste große node.js Version',
                            ru: 'Новейшая следующая версия node.js',
                            pt: 'Mais nova versão principal node.js',
                            nl: 'Nieuwste volgende grote node',
                            fr: 'Nouvelle prochaine version node.js',
                            it: 'Nuova versione principale node.js',
                            es: 'Versión más reciente node.js',
                            pl: 'Najnowsza wersja węzła.js',
                            uk: 'Новейшая наступна версія вузла',
                            'zh-cn': '今后最新的重要内容。',
                        },
                        type: 'string',
                        read: true,
                        write: false,
                        def: '',
                    },
                    native: {},
                },
                {
                    _id: 'npmCurrent',
                    type: 'state',
                    common: {
                        role: 'state',
                        name: {
                            en: 'Current npm version',
                            de: 'Aktuelle Version',
                            ru: 'Текущая версия npm',
                            pt: 'Versão actual npm',
                            nl: 'Current Npm versie',
                            fr: 'Version actuelle npm',
                            it: 'Versione npm attuale',
                            es: 'Versión actual npm',
                            pl: 'Aktualna wersja',
                            uk: 'Поточна версія npm',
                            'zh-cn': '目前的印本',
                        },
                        type: 'string',
                        read: true,
                        write: false,
                        def: '',
                    },
                    native: {},
                },
                {
                    _id: 'npmNewest',
                    type: 'state',
                    common: {
                        role: 'state',
                        name: {
                            en: 'Newest npm version',
                            de: 'Neueste Version',
                            ru: 'Новейшая версия npm',
                            pt: 'Versão mais recente npm',
                            nl: 'Newest Npm versie',
                            fr: 'Nouvelle version npm',
                            it: 'Nuova versione npm',
                            es: 'Versión más reciente npm',
                            pl: 'Wersja nowa',
                            uk: 'Остання версія npm',
                            'zh-cn': '最新版本',
                        },
                        type: 'string',
                        read: true,
                        write: false,
                        def: '',
                    },
                    native: {},
                },
                {
                    _id: 'npmNewestNext',
                    type: 'state',
                    common: {
                        role: 'state',
                        name: {
                            en: 'Newest next major NPM version',
                            de: 'Neueste nächste große NPM-Version',
                            ru: 'Новейшая следующая крупная версия NPM',
                            pt: 'Mais nova versão principal do NPM',
                            nl: 'NPM',
                            fr: 'La version la plus récente',
                            it: 'Nuova versione NPM',
                            es: 'Versión NPM más reciente',
                            pl: 'Nowa wersja NPM',
                            uk: 'Новейша наступна велика версія NPM',
                            'zh-cn': '下一次主要国家预防计划',
                        },
                        type: 'string',
                        read: true,
                        write: false,
                        def: '',
                    },
                    native: {},
                },
            ];
            for (const state of states) {
                await this.setForeignObjectNotExistsAsync(`${prefix}.${state._id}`, state);
            }
            for (const [key, value] of Object.entries(result)) {
                await this.setForeignStateAsync(`${prefix}.${key}`, value.replace(/^v/, ''), true);
            }
        }
        catch {
            this.log.warn('Cannot check node.js/npm version');
        }
    }
    getData(callback) {
        this.log.info('requesting all objects');
        this.getObjectList({ include_docs: true }, (_err, res) => {
            this.log.info('received all objects');
            if (res) {
                objects = {};
                let tmpPath = '';
                for (const row of res.rows) {
                    objects[row.doc._id] = row.doc;
                    if (row.doc.type === 'instance' && row.doc.common?.tmpPath) {
                        if (tmpPath) {
                            this.log.warn('tmpPath has multiple definitions!!');
                        }
                        tmpPath = row.doc.common.tmpPath;
                    }
                }
                // Some adapters want access on specified tmp directory
                if (tmpPath) {
                    this.config.tmpPath = tmpPath;
                    this.config.tmpPathAllow = true;
                }
                void this.createUpdateInfo().then(() => this.writeUpdateInfo());
            }
            if (callback) {
                callback(this);
            }
        });
    }
    /**
     * Add the repository read timestamp to the repository data structure
     */
    async addRepositoryReadTimestamp(repository, activeRepo) {
        try {
            const readTime = new Date().toISOString();
            // Add read timestamp to the repository info structure
            if (repository._repoInfo) {
                repository._repoInfo.repoReadTime = readTime;
            }
            // Update the system.repositories object to store the read timestamp
            const repos = await this.getForeignObjectAsync('system.repositories');
            if (repos?.native?.repositories) {
                if (Array.isArray(activeRepo)) {
                    // Handle multiple repositories
                    for (const repo of activeRepo) {
                        if (repos.native.repositories[repo]?.json?._repoInfo) {
                            repos.native.repositories[repo].json._repoInfo.repoReadTime = readTime;
                        }
                    }
                }
                else {
                    // Handle single repository
                    if (repos.native.repositories[activeRepo]?.json?._repoInfo) {
                        repos.native.repositories[activeRepo].json._repoInfo.repoReadTime = readTime;
                    }
                }
                // Save the updated repositories object
                await this.setForeignObjectAsync('system.repositories', repos);
                this.log.debug(`Repository read timestamp updated: ${readTime}`);
            }
        }
        catch (err) {
            this.log.error(`Cannot add repository read timestamp: ${err}`);
        }
    }
    async checkRevokedVersions(repository) {
        try {
            const adapters = Object.keys(repository);
            const instances = await this.getObjectViewAsync('system', 'instance', {
                startkey: 'system.adapter.',
                endkey: 'system.adapter.\u9999',
            });
            for (const _adapter of adapters) {
                if (repository[_adapter].blockedVersions) {
                    // read the current version
                    if (Array.isArray(repository[_adapter].blockedVersions)) {
                        const instance = instances.rows.find(item => item.value?.common.name === _adapter && item.value.common.enabled);
                        if (instance?.value?.common?.version) {
                            for (let i = 0; i < repository[_adapter].blockedVersions.length; i++) {
                                try {
                                    if (semver.satisfies(instance.value.common.version, repository[_adapter].blockedVersions[i])) {
                                        // stop all instances
                                        for (let k = 0; k < instances.rows.length; k++) {
                                            const obj = instances.rows[k].value;
                                            if (obj?.common.enabled && obj.common.name === _adapter) {
                                                obj.common.enabled = false;
                                                await this.setForeignObjectAsync(obj._id, obj);
                                                this.log.warn(`Instance ${obj._id.replace('system.adapter.', '')} was disabled because blocked. Please update ${_adapter} to newer or available version`);
                                                const hostAlive = await this.getForeignStateAsync(`system.host.${obj.common.host}.alive`);
                                                if (hostAlive?.val) {
                                                    this.sendToHost(obj.common.host, 'addNotification', {
                                                        scope: 'system',
                                                        category: 'accessErrors', // change to 'blocked' when js-controller 4.1. released
                                                        instance: obj._id,
                                                        message: `Instance version was blocked. Please check for updates and update before restarting the instance`,
                                                    });
                                                }
                                                else {
                                                    this.log.warn(`Cannot add notification to ${obj.common.host} as it is offline`);
                                                }
                                            }
                                        }
                                    }
                                }
                                catch {
                                    this.log.error(`Cannot check revoked versions: ${repository[_adapter].blockedVersions[i]}`);
                                    // ignore
                                }
                            }
                        }
                    }
                    else {
                        this.log.error(`Invalid blockedVersions for ${_adapter}: ${JSON.stringify(repository[_adapter].blockedVersions)}. Expected array like ["<= 3.17.4"] or also ["~3.14.0", "~3.15.0", "~3.16.0"]`);
                    }
                }
            }
        }
        catch (e) {
            this.log.error(`Cannot check revoked versions: ${e}`);
        }
    }
    restartRepoUpdate() {
        // start the next cycle
        if (this.config.autoUpdate) {
            if (this.timerRepo) {
                clearTimeout(this.timerRepo);
                this.timerRepo = null;
            }
            this.log.debug(`Next repo update on ${new Date(Date.now() + this.config.autoUpdate * ONE_HOUR_MS + 1).toLocaleString()}`);
            this.timerRepo = setTimeout(async () => {
                this.timerRepo = null;
                await this.updateRegister();
            }, this.config.autoUpdate * ONE_HOUR_MS + 1);
        }
    }
    async getRecommendedVersions() {
        // Check if the host running
        const hostAlive = await this.getForeignStateAsync(`system.host.${this.host}.alive`);
        if (!hostAlive?.val) {
            return {
                node: CURRENT_MAX_MAJOR_NODEJS,
                npm: CURRENT_MAX_MAJOR_NPM,
            };
        }
        const repository = (await this.sendToHostAsync(this.host, 'getRepository', {}));
        const repoInfo = repository?._repoInfo;
        if (repoInfo?.recommendedVersions) {
            return {
                node: repoInfo.recommendedVersions?.nodeJsRecommended,
                npm: repoInfo.recommendedVersions?.npmRecommended,
            };
        }
        return {
            node: CURRENT_MAX_MAJOR_NODEJS,
            npm: CURRENT_MAX_MAJOR_NPM,
        };
    }
    /**
     * Read repository information from the active repository
     */
    async updateRegister() {
        if (lastRepoUpdate && Date.now() - lastRepoUpdate < 3600000) {
            this.log.error('Automatic repository update is not allowed more than once an hour');
            this.restartRepoUpdate();
            return;
        }
        lastRepoUpdate = Date.now();
        try {
            const systemConfig = await this.getForeignObjectAsync('system.config');
            if (systemConfig?.common) {
                try {
                    const repos = await this.getForeignObjectAsync('system.repositories');
                    if (!repos || repos.ts === undefined) {
                        // start the next cycle
                        this.restartRepoUpdate();
                        return;
                    }
                    // Check if repositories exist
                    let exists = false;
                    const active = systemConfig.common.activeRepo;
                    // if repo is valid and actual
                    if (Array.isArray(active)) {
                        if (Date.now() < repos.ts + this.config.autoUpdate * ONE_HOUR_MS &&
                            !active.find(repo => !repos?.native?.repositories?.[repo]?.json)) {
                            exists = true;
                        }
                    }
                    else if (repos?.native?.repositories?.[active]?.json &&
                        Date.now() < repos.ts + this.config.autoUpdate * ONE_HOUR_MS) {
                        exists = true;
                    }
                    if (!exists) {
                        this.log.info('Request actual repository...');
                        // first check if the host is running
                        const aliveState = await this.getForeignStateAsync(`system.host.${this.host}.alive`);
                        if (!aliveState?.val) {
                            this.log.error('Host is not alive');
                            // start the next cycle
                            this.restartRepoUpdate();
                            return;
                        }
                        // request repo from host
                        this.sendToHost(this.host, 'getRepository', {
                            repo: active,
                            update: true,
                        }, async (_repository) => {
                            if ((typeof _repository === 'string' || _repository instanceof Error) &&
                                _repository.toString().includes(ERROR_PERMISSION)) {
                                this.log.error('May not read "getRepository"');
                            }
                            else {
                                this.log.info('Repository received successfully.');
                                // Add repository read timestamp to the repository data
                                await this.addRepositoryReadTimestamp(_repository, active);
                                socket?.repoUpdated();
                                this.checkRevokedVersions(_repository).catch(e => this.log.error(`Cannot check revoked versions: ${e}`));
                            }
                            // start the next cycle
                            this.restartRepoUpdate();
                        });
                    }
                    else if (this.config.autoUpdate) {
                        let interval = repos.ts + this.config.autoUpdate * ONE_HOUR_MS - Date.now() + 1;
                        if (interval > 0x7fffffff) {
                            interval = 0x7fffffff;
                        }
                        this.log.debug(`Next repo update on ${new Date(Date.now() + interval).toLocaleString()}`);
                        if (this.timerRepo) {
                            clearTimeout(this.timerRepo);
                        }
                        this.timerRepo = setTimeout(async () => {
                            this.timerRepo = null;
                            await this.updateRegister();
                        }, interval);
                    }
                }
                catch (err) {
                    this.log.error(`May not read "system.repositories": ${err}`);
                }
            }
        }
        catch {
            this.log.error('May not read "system.config"');
        }
    }
    /**
     * Initialize the adapter
     */
    init() {
        this.config.defaultUser = this.config.defaultUser || 'admin';
        if (!this.config.defaultUser.match(/^system\.user\./)) {
            this.config.defaultUser = `system.user.${this.config.defaultUser}`;
        }
        this.startEosSecurityGuard();
        (0, objectFixes_1.checkCommonObjects)(this).catch((e) => this.log.warn(`Cannot check common objects: ${e?.message}`));
        this.getData(adapter => (webServer = new web_1.default(adapter.config, adapter, this.initSocket.bind(this), { systemLanguage })));
        if (this.config.accessApplyRights &&
            this.config.accessLimit &&
            !this.config.auth &&
            this.config.defaultUser !== 'system.user.admin') {
            this.applyRights().catch((e) => this.log.warn(`Cannot apply rights: ${e?.message}`));
        }
        // By default, update repository every 24 hours
        if (this.config.autoUpdate === undefined || this.config.autoUpdate === null) {
            this.config.autoUpdate = 24;
        }
        // interval in hours
        this.config.autoUpdate = Number(this.config.autoUpdate) || 0;
        if (this.config.autoUpdate && this.config.autoUpdate < 4) {
            this.config.autoUpdate = 4; // only every 4 hours - it is a minimal update interval
        }
        else if (this.config.autoUpdate > 590) {
            // 0x7FFFFFFF / ONE_HOUR_MS = 596
            this.config.autoUpdate = 590; // max interval is 2147483647 milliseconds
        }
        // check info.connected
        void this.getObjectAsync('info.connected').then(obj => {
            if (!obj) {
                const packageJson = JSON.parse((0, node_fs_1.readFileSync)(`${__dirname}/../io-package.json`).toString('utf8'));
                const obj = packageJson.instanceObjects.find((o) => o._id === 'info.connected');
                if (obj) {
                    return this.setObjectAsync(obj._id, obj);
                }
            }
        });
        if (this.config.autoUpdate) {
            void this.updateRegister().catch(e => this.log.error(`Cannot update repository: ${e}`));
        }
        // External news polling is not required for local appliance operation.
        (0, objectFixes_1.updateIcons)(this);
        void (0, objectFixes_1.validateUserData0)(this).catch(e => this.log.error(`Cannot validate 0_userdata: ${e}`));
        void (0, objectFixes_1.updateDevicesObject)(this).catch(e => this.log.error(`Cannot update devices objects: ${e}`));
        // OS account audits and changes belong to the privileged installer/service workflow.
        this.subscribeForeignObjects(`system.adapter.${this.namespace}.plugins.sentry.enabled`);
    }
    async checkWellKnownPasswords() {
        if (process.platform !== 'linux') {
            return;
        }
        const found = await (0, checkLinuxPass_1.checkWellKnownPasswords)();
        if (found) {
            this.changedPasswords = this.changedPasswords.filter(item => item.login !== found.login && item.password !== found.password);
            this.changedPasswords.push(found);
            await this.registerNotification('admin', 'wellKnownPassword', adapter_core_1.I18n.translate('User: %s', found.login), {
                contextData: {
                    admin: {
                        notification: {
                            login: found.login,
                            password: found.password,
                            offlineMessage: adapter_core_1.I18n.getTranslatedObject('Offline message', found.login),
                        },
                    },
                },
            });
        }
    }
}
if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options) => new Admin(options);
}
else {
    // otherwise start the instance directly
    (() => new Admin())();
}
//# sourceMappingURL=main.js.map
