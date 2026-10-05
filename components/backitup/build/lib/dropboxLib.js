"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
class DropBox {
    sessionUpload(dropbox, fileName, dir, log) {
        return new Promise(async (resolve, reject) => {
            try {
                const chunkLength = 1000000;
                const fileSize = (0, node_fs_1.statSync)(fileName).size;
                if (fileSize) {
                    const onlyFileName = fileName.split('/').pop();
                    const dbxPth = (0, node_path_1.join)(dir, onlyFileName).replace(/\\/g, '/');
                    const getNextChunkStream = (start, end) => (0, node_fs_1.createReadStream)(fileName, { start, end });
                    const append = async (sessionId, start, end) => {
                        if (start === fileSize) {
                            log.debug(`${Math.round((end / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                            resolve('done');
                            return await this.sessionFinish(sessionId, dropbox, log, dbxPth, fileSize);
                        }
                        if (end > fileSize) {
                            end = fileSize - 1;
                            log.debug(`${Math.round((start / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                            return await this.sessionAppend(sessionId, dropbox, getNextChunkStream, log, start, fileSize - 1).then(async () => {
                                log.debug(`${Math.round((end / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                                resolve('done');
                                return await this.sessionFinish(sessionId, dropbox, log, dbxPth, fileSize);
                            });
                        }
                        log.debug(`${Math.round((start / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                        await this.sessionAppend(sessionId, dropbox, getNextChunkStream, log, start, end).then(async () => {
                            await append(sessionId, end + 1, end + chunkLength);
                        });
                    };
                    const sessionId = await this.sessionStart(dropbox, log);
                    if (sessionId) {
                        void append(sessionId, 0, chunkLength - 1);
                    }
                }
                else {
                    reject('Error Session Upload');
                }
            }
            catch (err) {
                reject(`Error Session Upload: ${JSON.stringify(err)}`);
            }
        });
    }
    sessionStart(dropbox, log) {
        return new Promise((resolve, reject) => {
            dropbox({
                resource: 'files/upload_session/start',
                parameters: {
                    close: false,
                },
            }, (err, result) => {
                if (err) {
                    log.error(`sessionStart error: ${JSON.stringify(err)}`);
                    reject(err);
                }
                if (result && result.session_id) {
                    resolve(result.session_id);
                }
                else {
                    reject(new Error('No session id'));
                }
            });
        });
    }
    sessionAppend(sessionId, dropbox, getNextChunkStream, log, start, end) {
        return new Promise((resolve, reject) => {
            dropbox({
                resource: 'files/upload_session/append_v2',
                parameters: {
                    cursor: {
                        session_id: sessionId,
                        offset: start,
                    },
                    close: false,
                },
                readStream: getNextChunkStream(start, end),
            }, err => {
                if (err) {
                    // Was `log.error(); (\`sessionAppend error: …\`);` - a stray semicolon meant
                    // the message was built and thrown away while an empty error was logged.
                    log.error(`sessionAppend error: ${JSON.stringify(err)}`);
                    reject(err);
                }
                resolve();
            });
        });
    }
    sessionFinish(sessionId, dropbox, log, dbxPth, fileSize) {
        return new Promise((resolve, reject) => {
            dropbox({
                resource: 'files/upload_session/finish',
                parameters: {
                    cursor: {
                        session_id: sessionId,
                        offset: fileSize,
                    },
                    commit: {
                        path: dbxPth,
                        mode: 'add',
                        autorename: true,
                        mute: false,
                    },
                },
            }, err => {
                if (err) {
                    log.error(`sessionFinish error: ${JSON.stringify(err)}`);
                    reject(err);
                }
            });
            // Note: resolves as soon as the request has been dispatched, not when Dropbox has
            // committed the upload. Left as-is - changing it would alter when a backup counts as
            // finished.
            resolve();
        });
    }
}
exports.default = DropBox;
//# sourceMappingURL=dropboxLib.js.map