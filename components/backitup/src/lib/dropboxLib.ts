import type { BackItUpLogger } from './types';
import { createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import type { authenticate } from 'dropbox-v2-api';

type DropboxClient = ReturnType<typeof authenticate>;
type ChunkStreamFactory = (start: number, end: number) => Readable;

export default class DropBox {
    sessionUpload(dropbox: DropboxClient, fileName: string, dir: string, log: BackItUpLogger): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            try {
                const chunkLength = 1000000;
                const fileSize = statSync(fileName).size;

                if (fileSize) {
                    const onlyFileName = fileName.split('/').pop() as string;
                    const dbxPth = join(dir, onlyFileName).replace(/\\/g, '/');

                    const getNextChunkStream: ChunkStreamFactory = (start, end) =>
                        createReadStream(fileName, { start, end });

                    const append = async (sessionId: string, start: number, end: number): Promise<void> => {
                        if (start === fileSize) {
                            log.debug(`${Math.round((end / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                            resolve('done');
                            return await this.sessionFinish(sessionId, dropbox, log, dbxPth, fileSize);
                        }

                        if (end > fileSize) {
                            end = fileSize - 1;
                            log.debug(`${Math.round((start / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                            return await this.sessionAppend(
                                sessionId,
                                dropbox,
                                getNextChunkStream,
                                log,
                                start,
                                fileSize - 1,
                            ).then(async () => {
                                log.debug(`${Math.round((end / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                                resolve('done');
                                return await this.sessionFinish(sessionId, dropbox, log, dbxPth, fileSize);
                            });
                        }

                        log.debug(`${Math.round((start / fileSize) * 100)}% uploaded from ${onlyFileName}...`);
                        await this.sessionAppend(sessionId, dropbox, getNextChunkStream, log, start, end).then(
                            async () => {
                                await append(sessionId, end + 1, end + chunkLength);
                            },
                        );
                    };

                    const sessionId = await this.sessionStart(dropbox, log);
                    if (sessionId) {
                        void append(sessionId, 0, chunkLength - 1);
                    }
                } else {
                    reject('Error Session Upload');
                }
            } catch (err) {
                reject(`Error Session Upload: ${JSON.stringify(err)}`);
            }
        });
    }

    sessionStart(dropbox: DropboxClient, log: BackItUpLogger): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            dropbox(
                {
                    resource: 'files/upload_session/start',
                    parameters: {
                        close: false,
                    },
                },
                (err, result) => {
                    if (err) {
                        log.error(`sessionStart error: ${JSON.stringify(err)}`);
                        reject(err);
                    }
                    if (result && result.session_id) {
                        resolve(result.session_id);
                    } else {
                        reject(new Error('No session id'));
                    }
                },
            );
        });
    }

    sessionAppend(
        sessionId: string,
        dropbox: DropboxClient,
        getNextChunkStream: ChunkStreamFactory,
        log: BackItUpLogger,
        start: number,
        end: number,
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            dropbox(
                {
                    resource: 'files/upload_session/append_v2',
                    parameters: {
                        cursor: {
                            session_id: sessionId,
                            offset: start,
                        },
                        close: false,
                    },
                    readStream: getNextChunkStream(start, end),
                },
                err => {
                    if (err) {
                        // Was `log.error(); (\`sessionAppend error: …\`);` - a stray semicolon meant
                        // the message was built and thrown away while an empty error was logged.
                        log.error(`sessionAppend error: ${JSON.stringify(err)}`);
                        reject(err);
                    }
                    resolve();
                },
            );
        });
    }

    sessionFinish(
        sessionId: string,
        dropbox: DropboxClient,
        log: BackItUpLogger,
        dbxPth: string,
        fileSize: number,
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            dropbox(
                {
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
                },
                err => {
                    if (err) {
                        log.error(`sessionFinish error: ${JSON.stringify(err)}`);
                        reject(err);
                    }
                },
            );
            // Note: resolves as soon as the request has been dispatched, not when Dropbox has
            // committed the upload. Left as-is - changing it would alter when a backup counts as
            // finished.
            resolve();
        });
    }
}
