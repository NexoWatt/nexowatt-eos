"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const node_fs_1 = require("node:fs");
const got_1 = __importDefault(require("@esm2cjs/got"));
const node_path_1 = require("node:path");
const OAUTH_URL = 'https://onedriveauth.simateccloud.de/v2.0';
const redirect_uri = 'https://onedriveauth.simateccloud.de/v2.0/nativeclient';
const url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
class onedrive {
    getAuthorizeUrl(log) {
        return new Promise(async (resolve, reject) => {
            try {
                const urlRequest = await (0, axios_1.default)({
                    method: 'get',
                    url: OAUTH_URL,
                    headers: {
                        'User-Agent': 'axios/1.6.2',
                    },
                    responseType: 'json',
                });
                if (urlRequest && urlRequest.data) {
                    const authUrl = `${urlRequest.data.authURL}&client_id=${urlRequest.data.client_id}`;
                    resolve(authUrl);
                }
                else {
                    reject();
                }
            }
            catch (e) {
                log.warn(`getAuthorizeUrl Onedrive: ${e}`);
                reject();
            }
        });
    }
    getClientID(log) {
        return new Promise(async (resolve, reject) => {
            try {
                const urlRequest = await (0, axios_1.default)({
                    method: 'get',
                    url: OAUTH_URL,
                    headers: {
                        'User-Agent': 'axios/1.6.2',
                    },
                    responseType: 'json',
                });
                if (urlRequest && urlRequest.data && urlRequest.data.client_id) {
                    resolve(urlRequest.data.client_id);
                }
                else {
                    reject();
                }
            }
            catch (e) {
                log.warn(`getClientID Onedrive: ${e}`);
                reject();
            }
        });
    }
    getRefreshToken(code, log) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = `redirect_uri=${redirect_uri}&code=${code}&grant_type=authorization_code&client_id=${await this.getClientID(log)}`;
                const refreshToken = await (0, axios_1.default)(url, {
                    method: 'post',
                    data,
                });
                if (refreshToken && refreshToken.data && refreshToken.data.refresh_token) {
                    resolve(refreshToken.data.refresh_token);
                }
                else {
                    reject();
                }
            }
            catch (e) {
                log.warn(`getRefreshToken Onedrive: ${e}`);
                reject();
            }
        });
    }
    getToken(refreshToken, log) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = `refresh_token=${refreshToken}&grant_type=refresh_token&client_id=${await this.getClientID(log)}`;
                const accessToken = await (0, axios_1.default)(url, {
                    method: 'post',
                    data,
                });
                if (accessToken && accessToken.data && accessToken.data.access_token) {
                    resolve(accessToken.data.access_token);
                }
                else {
                    reject();
                }
            }
            catch (e) {
                log.warn(`getToken Onedrive: ${e}`);
                reject();
            }
        });
    }
    renewToken(refreshToken, log) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = `refresh_token=${refreshToken}&grant_type=refresh_token&client_id=${await this.getClientID(log)}`;
                const accessToken = await (0, axios_1.default)(url, {
                    method: 'post',
                    data,
                });
                if (accessToken && accessToken.data && accessToken.data.refresh_token) {
                    resolve(accessToken.data.refresh_token);
                }
                else {
                    reject();
                }
            }
            catch (e) {
                log.warn(`refresh_token Onedrive: ${e}`);
                reject();
            }
        });
    }
    async fileUpload({ accessToken, parentPath, filePath, log, onProgress = () => { }, }) {
        const fileSize = (0, node_fs_1.statSync)(filePath).size;
        const fileName = (0, node_path_1.basename)(filePath);
        const sessionUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${parentPath ? `${parentPath}/` : ''}${fileName}:/createUploadSession`;
        log.debug(`Starting upload session for file: ${fileName}`);
        const sessionRes = await got_1.default.post(sessionUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            json: {
                item: {
                    '@microsoft.graph.conflictBehavior': 'replace',
                    name: fileName,
                },
            },
            responseType: 'json',
        });
        const uploadUrl = sessionRes.body.uploadUrl;
        if (!uploadUrl) {
            throw new Error('Upload URL could not be created');
        }
        const chunkSize = 4 * 1024 * 1024; // 4MB
        const fileStream = (0, node_fs_1.createReadStream)(filePath, { highWaterMark: chunkSize });
        let position = 0;
        let chunkIndex = 0;
        for await (const chunk of fileStream) {
            const start = position;
            const end = position + chunk.length - 1;
            const contentRange = `bytes ${start}-${end}/${fileSize}`;
            const formattedStart = start === 0 ? '0' : (start / (1024 * 1024)).toFixed(2);
            const formattedEnd = (end / (1024 * 1024)).toFixed(2);
            log.debug(`Uploading chunk ${chunkIndex + 1}: ${formattedStart}-${formattedEnd} MB`);
            const res = await got_1.default.put(uploadUrl, {
                headers: {
                    'Content-Length': chunk.length,
                    'Content-Range': contentRange,
                },
                body: chunk,
                responseType: 'json',
                throwHttpErrors: false,
            });
            const body = res.body;
            if (res.statusCode >= 200 && res.statusCode < 300 && body?.id) {
                onProgress(fileSize); // 100%
                log.debug(`Upload completed: ${body.name}`);
                return body;
            }
            if (res.statusCode === 202 || (res.statusCode >= 200 && res.statusCode < 300)) {
                chunkIndex++;
                onProgress(end + 1);
                const percent = Math.round(((end + 1) / fileSize) * 100);
                log.debug(`Chunk ${chunkIndex} uploaded: ${percent}%`);
            }
            else {
                log.error(`Error during chunk upload [${res.statusCode}]: ${JSON.stringify(res.body)}`);
                throw new Error(`Chunk upload failed with status ${res.statusCode}`);
            }
            position += chunk.length;
        }
        throw new Error('Upload did not complete properly');
    }
    async deleteFileById({ accessToken, itemId }) {
        const itemUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`;
        await got_1.default.delete(itemUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    }
    async getMetadata({ accessToken, itemPath, }) {
        const targetPath = itemPath === 'root' ? 'root' : `root:/${itemPath}`;
        const itemUrl = `https://graph.microsoft.com/v1.0/me/drive/${targetPath}`;
        const response = await got_1.default.get(itemUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'json',
        });
        return response.body;
    }
    async listChildren({ accessToken, itemId, }) {
        const childrenUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/children`;
        const response = await got_1.default.get(childrenUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'json',
        });
        return response.body;
    }
    async listBackups({ accessToken, dir, types, log, }) {
        try {
            // Normalize path
            let normalizedDir = (dir || '').replace(/\\/g, '/');
            if (!normalizedDir || normalizedDir === '/') {
                normalizedDir = 'root';
            }
            else if (normalizedDir.startsWith('/')) {
                normalizedDir = normalizedDir.slice(1);
            }
            const metadata = await this.getMetadata({ accessToken, itemPath: normalizedDir });
            if (!metadata?.id) {
                throw new Error('Could not retrieve metadata');
            }
            const childrenRes = await this.listChildren({ accessToken, itemId: metadata.id });
            const children = childrenRes?.value;
            if (!children) {
                return null;
            }
            // Filter and transform children
            const entries = children
                .map(file => ({
                path: file.name,
                name: file.name,
                size: file.size,
                id: file.id,
            }))
                .filter(file => (types.includes(file.name.split('_')[0]) || types.includes(file.name.split('.')[0])) &&
                file.name.endsWith('.gz'));
            // Group by type
            const files = {};
            for (const file of entries) {
                const type = file.name.split('_')[0];
                if (!files[type]) {
                    files[type] = [];
                }
                files[type].push(file);
            }
            return files;
        }
        catch (error) {
            log.error(`listBackups error: ${error.message}`);
            throw error;
        }
    }
    async downloadFileByName({ accessToken, dir, fileName, targetPath, log, }) {
        try {
            // Normalize directory path
            let normalizedDir = (dir || '').replace(/\\/g, '/');
            if (!normalizedDir || normalizedDir === '/') {
                normalizedDir = 'root';
            }
            else if (normalizedDir.startsWith('/')) {
                normalizedDir = normalizedDir.slice(1);
            }
            // Get metadata of the directory to find its ID
            const metadata = await this.getMetadata({
                accessToken,
                itemPath: normalizedDir,
            });
            if (!metadata?.id) {
                throw new Error(`Could not retrieve metadata for path "${normalizedDir}"`);
            }
            // List all files inside the directory
            const childrenRes = await this.listChildren({
                accessToken,
                itemId: metadata.id,
            });
            const children = childrenRes?.value || [];
            const file = children.find(f => f.name === fileName);
            if (!file) {
                throw new Error(`File "${fileName}" not found in OneDrive`);
            }
            const downloadUrl = file['@microsoft.graph.downloadUrl'];
            if (!downloadUrl) {
                throw new Error(`Download URL missing for "${fileName}"`);
            }
            log.debug(`OneDrive: Download of "${fileName}" started`);
            // Stream download to local file
            await new Promise((resolve, reject) => {
                const writeStream = (0, node_fs_1.createWriteStream)(targetPath);
                writeStream.on('finish', () => {
                    log.debug(`OneDrive: Download of "${fileName}" finished`);
                    resolve();
                });
                writeStream.on('error', reject);
                got_1.default.stream(downloadUrl).on('error', reject).pipe(writeStream);
            });
        }
        catch (err) {
            log.error(`downloadFileByName error: ${err.message}`);
            throw err;
        }
    }
    async getFolderChildrenByPath({ accessToken, dir, }) {
        // Normalize path
        let itemPath = (dir || '').replace(/\\/g, '/');
        itemPath = !itemPath || itemPath === '/' ? 'root' : itemPath.startsWith('/') ? itemPath.slice(1) : itemPath;
        // Get metadata
        const metadata = await this.getMetadata({ accessToken, itemPath });
        if (!metadata?.id) {
            throw new Error(`Could not resolve metadata for path: ${dir}`);
        }
        // List children
        const children = await this.listChildren({ accessToken, itemId: metadata.id });
        return children?.value || [];
    }
}
exports.default = onedrive;
//# sourceMappingURL=oneDriveLib.js.map