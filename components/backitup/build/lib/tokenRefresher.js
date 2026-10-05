"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class TokenRefresher {
    destroyed = false;
    abortRefresh = new AbortController();
    adapter;
    stateName;
    refreshTokenTimeout;
    accessToken;
    refreshToken;
    url;
    readyPromise;
    name;
    constructor(adapter, stateName, oauthURL) {
        this.adapter = adapter;
        this.stateName = stateName;
        this.url = oauthURL;
        this.name = stateName.replace('info.', '').replace('Tokens', '').replace('tokens', '');
        this.readyPromise = this.adapter.getStateAsync(this.stateName).then(async (state) => {
            if (this.destroyed)
                return;
            await this.adapter
                .subscribeStatesAsync(this.stateName)
                .catch(error => this.adapter.log.error(`Cannot read tokens: ${error}`));
            if (this.destroyed)
                return;
            if (state?.val) {
                this.accessToken = JSON.parse(state.val);
                this.refreshToken = this.accessToken?.refresh_token;
                if (this.accessToken?.access_token_expires_on &&
                    new Date(this.accessToken.access_token_expires_on).getTime() < Date.now()) {
                    this.adapter.log.error('Access token is expired. Please make a authorization again');
                }
                else {
                    this.adapter.log.debug(`Access token for ${this.name} found`);
                }
            }
            else if (adapter.config.dropboxAccessJson) {
                adapter.log.warn('Your token will be updated');
                const response = await axios_1.default.post(this.url, { refresh_token: adapter.config.dropboxAccessJson }, {
                    timeout: 5000, signal: AbortSignal.any([this.abortRefresh.signal, AbortSignal.timeout(5000)]),
                    maxRedirects: 0, maxContentLength: 65536, maxBodyLength: 65536,
                });
                if (this.destroyed)
                    return;
                if (response.status !== 200) {
                    this.adapter.log.error(`Cannot refresh tokens: ${response.statusText}`);
                    return;
                }
                // save new tokens
                this.accessToken = response.data;
                if (this.accessToken) {
                    this.accessToken.access_token_expires_on = new Date(Date.now() + this.accessToken.expires_in * 1_000).toISOString();
                    await this.adapter.setState(this.stateName, JSON.stringify(this.accessToken), true);
                    this.adapter.log.debug(`accessToken for ${this.name} updated`);
                }
                else {
                    this.adapter.log.error(`No accessToken for ${this.name} could be refreshed`);
                }
                // clear old tokens
                const obj = await adapter.getForeignObjectAsync(`system.adapter.${adapter.namespace}`);
                if (obj) {
                    obj.native.dropboxAccessJson = '';
                    await adapter.setForeignObjectAsync(`system.adapter.${adapter.namespace}`, obj);
                }
            }
            else {
                this.adapter.log.error(`No accessToken for ${this.name} found`);
            }
            return this.refreshTokens().catch(error => this.adapter.log.error(`Cannot refresh tokens: ${error}`));
        });
    }
    destroy() {
        this.destroyed = true;
        this.abortRefresh.abort();
        if (this.refreshTokenTimeout) {
            this.adapter.clearTimeout(this.refreshTokenTimeout);
            this.refreshTokenTimeout = undefined;
        }
    }
    onStateChange(id, state) {
        if (this.destroyed)
            return;
        if (state?.ack && id.endsWith(`.${this.stateName}`)) {
            if (JSON.stringify(this.accessToken) !== state.val) {
                try {
                    this.accessToken = JSON.parse(state.val);
                    this.refreshTokens().catch(error => this.adapter.log.error(`Cannot refresh tokens: ${error}`));
                }
                catch (error) {
                    this.adapter.log.error(`Cannot parse tokens: ${error}`);
                    this.accessToken = undefined;
                }
            }
        }
    }
    async getAccessToken() {
        await this.readyPromise;
        if (this.destroyed)
            return undefined;
        if (!this.accessToken?.access_token) {
            this.adapter.log.error(`No accessToken for ${this.name} found`);
            return undefined;
        }
        if (!this.accessToken.access_token_expires_on ||
            new Date(this.accessToken.access_token_expires_on).getTime() < Date.now()) {
            this.adapter.log.error('Access token is expired. Please make a authorization again');
            return undefined;
        }
        return this.accessToken.access_token;
    }
    async refreshTokens(retriesLeft = 5) {
        if (this.destroyed)
            return;
        if (this.refreshTokenTimeout) {
            this.adapter.clearTimeout(this.refreshTokenTimeout);
            this.refreshTokenTimeout = undefined;
        }
        if (!this.accessToken?.refresh_token) {
            this.adapter.log.error(`No refreshTokens for ${this.name} found`);
            return;
        }
        if (!this.accessToken.access_token_expires_on ||
            new Date(this.accessToken.access_token_expires_on).getTime() < Date.now()) {
            this.adapter.log.error('Access token is expired. Please make an authorization again');
            return;
        }
        let expiresIn = new Date(this.accessToken.access_token_expires_on).getTime() - Date.now() - 300_000;
        if (expiresIn <= 0) {
            try {
                const response = await axios_1.default.post(this.url, this.accessToken, {
                    timeout: 5000, signal: AbortSignal.any([this.abortRefresh.signal, AbortSignal.timeout(5000)]),
                    maxRedirects: 0, maxContentLength: 65536, maxBodyLength: 65536,
                });
                if (this.destroyed)
                    return;
                if (response.status !== 200) {
                    throw new Error(`Status ${response.status}: ${response.statusText}`);
                }
                this.accessToken = response.data;
                this.accessToken.refresh_token = this.refreshToken;
                if (this.accessToken) {
                    this.accessToken.access_token_expires_on = new Date(Date.now() + this.accessToken.expires_in * 1000).toISOString();
                    expiresIn = new Date(this.accessToken.access_token_expires_on).getTime() - Date.now() - 300_000;
                    await this.adapter.setState(this.stateName, JSON.stringify(this.accessToken), true);
                    this.adapter.log.debug(`Tokens for ${this.name} updated`);
                }
                else {
                    throw new Error('Response did not include accessToken');
                }
            }
            catch (error) {
                if (this.destroyed)
                    return;
                this.adapter.log.warn(`Token refresh failed: ${error.message}`);
                if (retriesLeft > 0) {
                    const retryDelay = 30_000; // 30 Seconds
                    this.adapter.log.info(`Retrying token refresh in ${retryDelay / 1000} seconds... (${retriesLeft} retries left)`);
                    this.refreshTokenTimeout = this.adapter.setTimeout(() => {
                        this.refreshTokens(retriesLeft - 1).catch(err => this.adapter.log.error(`Retry error: ${err.message}`));
                    }, retryDelay);
                    return;
                }
                this.adapter.log.error(`All ${5} token refresh attempts failed for ${this.name}.`);
                return;
            }
        }
        if (this.destroyed)
            return;
        if (expiresIn > 600_000) {
            expiresIn = 600_000;
        }
        this.refreshTokenTimeout = this.adapter.setTimeout(() => {
            this.refreshTokenTimeout = undefined;
            this.refreshTokens(5).catch(error => this.adapter.log.error(`Cannot refresh tokens: ${error}`));
        }, expiresIn);
    }
    /**
     * Not referenced anywhere - main.js uses the static overload below. It was missing the `await`
     * on the axios call, so reading `.data` off the pending promise threw every time; added here
     * because the method cannot be typed otherwise, and it is unreachable either way.
     */
    async getAuthUrl() {
        if (!this.url) {
            throw new Error('No OAuth URL provided');
        }
        try {
            const response = await (0, axios_1.default)(this.url);
            return response.data.authUrl;
        }
        catch (error) {
            throw new Error(`Cannot get authorize URL: ${error}`);
        }
    }
    static async getAuthUrl(url) {
        if (!url) {
            throw new Error('No OAuth URL provided');
        }
        try {
            const response = await (0, axios_1.default)(url);
            return response.data.authUrl;
        }
        catch (error) {
            throw new Error(`Cannot get authorize URL: ${error}`);
        }
    }
}
exports.default = TokenRefresher;
//# sourceMappingURL=tokenRefresher.js.map