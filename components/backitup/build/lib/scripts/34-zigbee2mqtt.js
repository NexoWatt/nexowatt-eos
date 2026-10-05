"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/**
 * Backs up Zigbee2MQTT, either over MQTT from a remote instance or by packing the local directory.
 *
 * Three things the callback version got wrong, all of them settled by awaiting:
 *
 * - The remote timeout reported and left its own timer in place, so a message or error arriving
 *   afterwards reported a second time.
 * - A failed `compress` reported the error and then threw a TypeError out of the step - it called
 *   `err.toString()` on a rejection that carried no reason. That skipped the cleanup and left an
 *   unhandled rejection behind.
 * - A failed copy was reported as a *successful* backup, the temp directory was removed twice and
 *   'zigbee2mqtt' was recorded as done. It is reported as a failure now.
 *
 * @param props the run context and the zigbee2mqtt slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    const nameSuffix = options.hostType === 'Slave' && options.slaveSuffix
        ? options.slaveSuffix
        : options.hostType !== 'Slave' && options.nameSuffix
            ? options.nameSuffix
            : '';
    if (options.z2mType === 'remote') {
        // Loaded on demand - hoisting this would pull the whole MQTT stack into every adapter
        // start, including the instances that only back up a local Zigbee2MQTT directory.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mqtt = require('mqtt');
        const fileName = (0, node_path_1.join)(ctx.backupDir, `zigbee2mqtt_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backup.zip`);
        ctx.fileNames.push(fileName);
        const z2mOptions = {};
        if (options.z2mUsername) {
            z2mOptions.username = options.z2mUsername;
        }
        if (options.z2mPassword) {
            z2mOptions.password = options.z2mPassword;
        }
        const client = mqtt.connect(`mqtt://${options.z2mUrl}:${options.z2mPort}`, z2mOptions);
        await new Promise((resolve, reject) => {
            let timeout;
            // Note: the timer runs for 60s while the message says 30s. Kept as found.
            const resetTimeout = () => {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(() => {
                    ctx.log.error('Timeout: No response from Zigbee2MQTT (in 30s)');
                    client.end();
                    reject(new Error('Timeout waiting for Zigbee2MQTT response'));
                }, 60000);
            };
            client.on('connect', () => {
                ctx.log.debug('Connected to MQTT broker, sending Zigbee2MQTT backup request...');
                client.subscribe(`${options.z2mBaseTopic}/bridge/response/backup`, err => {
                    if (err) {
                        ctx.log.error('Failed to subscribe to Zigbee2MQTT response topic');
                        client.end();
                        reject(err);
                        return;
                    }
                    client.publish(`${options.z2mBaseTopic}/bridge/request/backup`, '');
                    resetTimeout();
                });
            });
            client.on('message', (topic, message) => {
                if (topic !== `${options.z2mBaseTopic}/bridge/response/backup`) {
                    return;
                }
                resetTimeout();
                try {
                    const response = JSON.parse(message.toString());
                    ctx.log.debug('Received Zigbee2MQTT response');
                    const base64Data = response?.data?.zip;
                    if (!base64Data) {
                        throw new Error(`Missing "zip" field in response: ${JSON.stringify(response)}`);
                    }
                    const buffer = Buffer.from(base64Data, 'base64');
                    (0, node_fs_1.writeFileSync)(fileName, buffer);
                    ctx.log.debug(`Zigbee2MQTT backup saved to ${fileName}`);
                    ctx.done.push('zigbee2mqtt');
                    ctx.types.push('zigbee2mqtt');
                    clearTimeout(timeout);
                    client.end();
                    resolve();
                }
                catch (err) {
                    clearTimeout(timeout);
                    ctx.log.error(`Error parsing backup response: ${err.message}`);
                    ctx.errors.zigbee2mqtt = err.toString();
                    client.end();
                    reject(err);
                }
            });
            client.on('error', err => {
                clearTimeout(timeout);
                ctx.log.error(`MQTT error: ${err.message}`);
                ctx.errors.zigbee2mqtt = err.toString();
                client.end();
                reject(err);
            });
        });
        return;
    }
    const fileName = (0, node_path_1.join)(ctx.backupDir, `zigbee2mqtt_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
    const sourcePth = (0, node_path_1.join)(options.path).replace(/\\/g, '/');
    const tmpDir = (0, node_path_1.join)(ctx.backupDir, 'zigbee2mqtt_tmp').replace(/\\/g, '/');
    ctx.fileNames.push(fileName);
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(fileName)) {
            const stats = (0, node_fs_1.statSync)(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);
    // Stays undefined when the configured source does not exist; `tmpCopy` then fails and the catch
    // below turns that into the reported error. Kept as found.
    let pth;
    if ((0, node_fs_1.existsSync)(sourcePth)) {
        const stat = (0, node_fs_1.statSync)(sourcePth);
        if (!stat.isDirectory()) {
            // Splitting and re-joining on '/' yields the input again - the original intent was
            // presumably to strip the file name. Kept as found.
            const parts = sourcePth.replace(/\\/g, '/').split('/');
            pth = parts.join('/');
        }
        else {
            pth = sourcePth;
        }
    }
    const desiredMode = {
        mode: 0o2775,
    };
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        try {
            await (0, fs_extra_1.ensureDir)(tmpDir, desiredMode);
            ctx.log.debug('Created zigbee2mqtt directory');
        }
        catch {
            ctx.log.error(`zigbee2mqtt tmp directory "${tmpDir}" cannot created`);
        }
    }
    else {
        ctx.log.debug(`Try deleting the old zigbee2mqtt tmp directory: "${tmpDir}"`);
        try {
            await (0, fs_extra_1.remove)(tmpDir);
        }
        catch {
            ctx.log.error(`old zigbee2mqtt tmp directory "${tmpDir}" cannot deleted`);
        }
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            ctx.log.debug(`old zigbee2mqtt tmp directory "${tmpDir}" successfully deleted`);
            try {
                await (0, fs_extra_1.ensureDir)(tmpDir, desiredMode);
                ctx.log.debug('Created new zigbee2mqtt directory');
            }
            catch {
                ctx.log.error(`zigbee2mqtt tmp directory "${tmpDir}" cannot created`);
            }
        }
    }
    /** Removes the staging directory, turning a failed removal into a log line as the original did */
    const dropTmp = async () => {
        try {
            await delTmp(ctx, tmpDir);
        }
        catch {
            ctx.log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
        }
    };
    ctx.log.debug('compress from Zigbee2MQTT started ...');
    try {
        await tmpCopy(pth, tmpDir, ctx);
        await compressBackupFile(ctx, fileName, tmpDir);
    }
    catch (err) {
        // `compressBackupFile` has already stored its own text; a copy failure has not.
        ctx.errors.zigbee2mqtt = ctx.errors.zigbee2mqtt || `${err}`;
        ctx.log.error(err);
        await dropTmp();
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    ctx.done.push('zigbee2mqtt');
    ctx.types.push('zigbee2mqtt');
    await dropTmp();
}
/**
 * Removes the temporary copy directory, rejecting when it cannot be deleted.
 *
 * @param ctx run context, for the logger and the error store
 * @param tmpDir directory to remove
 */
async function delTmp(ctx, tmpDir) {
    ctx.log.debug(`Try deleting the old zigbee2mqtt tmp directory: "${tmpDir}"`);
    return (0, fs_extra_1.remove)(tmpDir)
        .then(() => {
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            ctx.log.debug(`zigbee2mqtt tmp directory "${tmpDir}" successfully deleted`);
        }
    })
        .catch(err => {
        ctx.errors.zigbee2mqtt = JSON.stringify(err);
        ctx.log.error(`The temporary directory "${tmpDir}" could not be deleted. Please check the directory permissions and delete the directory manually`);
        throw err;
    });
}
/**
 * Copies the Zigbee2MQTT data directory into the staging directory, skipping log files.
 *
 * @param pth source directory
 * @param tmpDir staging directory
 * @param ctx run context, for the logger
 */
async function tmpCopy(pth, tmpDir, ctx) {
    return (0, fs_extra_1.copy)(pth, tmpDir, {
        // Matches anywhere in the path, so a backup directory containing "log" excludes
        // everything. Kept as found.
        filter: (path) => !(path.indexOf('log') > -1),
    }).then(() => {
        ctx.log.debug('Zigbee2MQTT tmp copy finish');
    });
}
/**
 * Packs the staging directory.
 *
 * @param ctx run context, for the logger and the error store
 * @param fileName archive to write
 * @param tmpDir staging directory to pack
 */
async function compressBackupFile(ctx, fileName, tmpDir) {
    try {
        await (0, targz_1.compressAsync)({ src: tmpDir, dest: fileName });
    }
    catch (err) {
        ctx.errors.zigbee2mqtt = err.toString();
        throw err;
    }
    ctx.log.debug(`Backup created: ${fileName}`);
}
exports.ignoreErrors = true;
//# sourceMappingURL=34-zigbee2mqtt.js.map