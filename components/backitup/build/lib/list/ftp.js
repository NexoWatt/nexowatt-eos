"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getFile = getFile;
const node_fs_1 = require("node:fs");
const ftp_1 = __importDefault(require("ftp"));
function settings(options) {
    return {
        host: options.host !== undefined
            ? options.host
            : options.ftp && options.ftp.host !== undefined
                ? options.ftp.host
                : '',
        user: options.user !== undefined
            ? options.user
            : options.ftp && options.ftp.user !== undefined
                ? options.ftp.user
                : '',
        pass: options.pass !== undefined
            ? options.pass
            : options.ftp && options.ftp.pass !== undefined
                ? options.ftp.pass
                : '',
        port: options.port !== undefined
            ? options.port
            : options.ftp && options.ftp.port !== undefined
                ? options.ftp.port
                : 21,
        secure: options.secure !== undefined
            ? options.secure
            : options.ftp && options.ftp.secure !== undefined
                ? options.ftp.secure
                : false,
        signedCertificates: options.signedCertificates !== undefined
            ? !!options.signedCertificates
            : options.ftp && options.ftp.signedCertificates !== undefined
                ? !!options.ftp.signedCertificates
                : true,
        dir: options.dir !== undefined
            ? options.dir
            : options.ftp && options.ftp.dir !== undefined
                ? options.ftp.dir
                : '/',
        ownDir: options.ownDir !== undefined
            ? options.ownDir
            : options.ftp && options.ftp.ownDir !== undefined
                ? options.ftp.ownDir
                : false,
        dirMinimal: options.dirMinimal !== undefined
            ? options.dirMinimal
            : options.ftp && options.ftp.dirMinimal !== undefined
                ? options.ftp.dirMinimal
                : '/',
    };
}
/**
 * Applies the "own directory" switch and makes sure the path is absolute
 *
 * @param dir configured target directory
 * @param ownDir whether the minimal backup uses its own directory
 * @param dirMinimal directory used when `ownDir` is set
 */
function targetDir(dir, ownDir, dirMinimal) {
    let result = (dir || '').replace(/\\/g, '/');
    if (ownDir === true) {
        result = (dirMinimal || '').replace(/\\/g, '/');
    }
    if (!result || result[0] !== '/') {
        result = `/${result || ''}`;
    }
    return result;
}
/**
 * Builds the connection options.
 *
 * Careful with `rejectUnauthorized`: `!!x || true` is `true` for every input, so the
 * "allow only signed certificates" setting has never had any effect here and the certificate is
 * always verified. Left exactly as it was - making the flag work would silently switch off
 * certificate checking for everyone who unticked it.
 *
 * @param cfg resolved storage settings
 */
function connectOptions(cfg) {
    return {
        host: cfg.host,
        port: cfg.port || 21,
        secure: cfg.secure || false,
        secureOptions: { rejectUnauthorized: !!cfg.signedCertificates || true },
        user: cfg.user,
        password: cfg.pass,
    };
}
/**
 * Lists the backups stored on the FTP server.
 *
 * @param props run context, storage config, requested source and backup types
 */
async function list(props) {
    const { context: { log }, options, restoreSource, types, } = props;
    const cfg = settings(options);
    if (!cfg.host || (restoreSource && restoreSource !== 'ftp')) {
        // Not configured, or another storage was asked for - nothing to file.
        return undefined;
    }
    const client = new ftp_1.default();
    const dir = targetDir(cfg.dir, cfg.ownDir, cfg.dirMinimal);
    // The callback version only cleared its callback in the error handler, so an error arriving
    // after a successful listing reported a second time. A promise settles once, which ends that.
    return new Promise((resolve, reject) => {
        client.on('ready', () => {
            log.debug('FTP: connected.');
            client.list(dir, (err, result) => {
                if (err) {
                    log.error(`FTP: ${err}`);
                }
                client.end();
                if (result && result.length) {
                    let entries = [];
                    try {
                        entries = result
                            .map(file => ({
                            path: file.name,
                            name: file.name.replace(/\\/g, '/').split('/').pop(),
                            size: file.size,
                        }))
                            .filter(file => (types.indexOf(file.name.split('_')[0]) !== -1 ||
                            types.indexOf(file.name.split('.')[0]) !== -1) &&
                            file.name.split('.').pop() == 'gz');
                    }
                    catch (e) {
                        log.error(`FTP: error on ftp list: ${e} please check the ftp config!!`);
                    }
                    const files = {};
                    try {
                        entries.forEach(file => {
                            const type = file.name.split('_')[0];
                            files[type] = files[type] || [];
                            files[type].push(file);
                        });
                    }
                    catch (e) {
                        log.error(`FTP: Files error: ${e} please check the ftp config and try again!!`);
                    }
                    resolve(files);
                }
                else {
                    resolve(undefined);
                }
            });
        });
        client.on('error', err => reject(err));
        client.connect(connectOptions(cfg));
    });
}
/**
 * Downloads one backup from the FTP server.
 *
 * @param props run context, storage config, the file to fetch and where to put it
 */
async function getFile(props) {
    const { context: { log }, options, fileName, toStoreName, } = props;
    const cfg = settings(options);
    if (!cfg.host) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'Not configured';
    }
    // copy file to backupDir
    const client = new ftp_1.default();
    const dir = targetDir(cfg.dir, cfg.ownDir, cfg.dirMinimal);
    return new Promise((resolve, reject) => {
        // The promise takes over the single-fire guard the old `finish` helper provided.
        const finish = (err) => (err ? reject(err) : resolve());
        client.on('ready', () => {
            log.debug('FTP: connected.');
            log.debug(`FTP: Get file: ${dir}/${fileName}`);
            client.get(`${dir}/${fileName}`, (err, stream) => {
                if (err) {
                    try {
                        client.end();
                    }
                    catch {
                        // ignore
                    }
                    log.error(`FTP: ${err}`);
                    finish(err);
                }
                else {
                    try {
                        stream.once('close', () => {
                            log.debug('FTP: Download done');
                            client.end();
                            finish();
                        });
                        const writeStream = (0, node_fs_1.createWriteStream)(toStoreName);
                        writeStream.on('error', writeErr => {
                            log.error(`FTP: ${writeErr}`);
                            // Reports success even though writing failed - kept as it was.
                            finish();
                        });
                        stream.pipe(writeStream);
                    }
                    catch (e) {
                        log.error(`FTP: ${e}`);
                        finish(e);
                    }
                }
            });
        });
        client.on('error', err => finish(err));
        client.connect(connectOptions(cfg));
    });
}
//# sourceMappingURL=ftp.js.map