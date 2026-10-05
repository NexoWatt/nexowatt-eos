"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/**
 * Mode for the temporary directory.
 *
 * As in 42-javascripts this is a string, and fs-extra's `getMode` spreads a non-number into its
 * defaults, so the value is discarded and the directory ends up with the default 0o777. Passing
 * `{ mode: 0o2775 }` would actually apply it. Left as found.
 */
const desiredMode = '0o2775';
/**
 * Copies the redis dump into a temporary directory and packs it.
 *
 * The callback version could leave the whole backup run hanging in four different ways, all of them
 * closed here:
 *
 * - a failed `redis-cli save` reported the error but never settled its promise, so the `await` in
 *   the caller never returned;
 * - no `.rdb` file in the configured directory meant nothing ran and nothing reported;
 * - a `redisType` other than local or remote fell through the whole function without reporting;
 * - and a failing `readdirSync` reported and then fell into the same empty-directory hang.
 *
 * In the opposite direction, several `.rdb` files packed the same archive once per file and
 * reported once per file, which made lib/execute schedule all remaining steps that many times. The
 * files are now copied first and the archive is written once.
 *
 * @param props the run context and the redis slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    ctx.log.debug('Start Redis Backup ...');
    let nameSuffix;
    if (options.hostType === 'Slave') {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    }
    else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }
    const fileName = (0, node_path_1.join)(ctx.backupDir, `${options.redisType === 'remote' ? 'redis-remote' : 'redis'}_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
    const tmpDir = (0, node_path_1.join)(ctx.backupDir, 'redistmp').replace(/\\/g, '/');
    // The cast only silences the type; the value handed over is unchanged (see desiredMode).
    const modeArg = desiredMode;
    if (!(0, node_fs_1.existsSync)(tmpDir)) {
        try {
            (0, fs_extra_1.ensureDirSync)(tmpDir, modeArg);
            ctx.log.debug('Created redistmp directory');
        }
        catch {
            ctx.log.warn(`redis tmp directory "${tmpDir}" cannot created`);
        }
    }
    else {
        ctx.log.debug(`Try deleting the old redis tmp directory: "${tmpDir}"`);
        try {
            (0, fs_extra_1.removeSync)(tmpDir);
        }
        catch {
            ctx.log.warn(`old redis tmp directory "${tmpDir}" cannot deleted`);
        }
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            ctx.log.debug(`old redis tmp directory "${tmpDir}" successfully deleted`);
            try {
                (0, fs_extra_1.ensureDirSync)(tmpDir, modeArg);
                ctx.log.debug('Created new redistmp directory');
            }
            catch {
                ctx.log.warn(`redis tmp directory "${tmpDir}" cannot created`);
            }
        }
    }
    ctx.fileNames.push(fileName);
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(fileName)) {
            const stats = (0, node_fs_1.statSync)(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);
    /**
     * Removes the temporary directory after a successful pack.
     *
     * A directory that could not be removed used to be reported as a step failure on top of the
     * success that followed it. The archive is written by then, so it only warns now.
     */
    const dropTmp = () => {
        try {
            ctx.log.debug(`Try deleting the redis tmp directory: "${tmpDir}"`);
            (0, fs_extra_1.removeSync)(tmpDir);
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                ctx.log.debug(`redis tmp directory "${tmpDir}" successfully deleted`);
            }
        }
        catch (err) {
            ctx.log.warn(`redis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
        }
    };
    try {
        if (options.redisType === 'local') {
            let name;
            let pth;
            let data = [];
            if ((0, node_fs_1.existsSync)(options.path)) {
                const stat = (0, node_fs_1.statSync)(options.path);
                if (!stat.isDirectory()) {
                    const parts = options.path.replace(/\\/g, '/').split('/');
                    name = parts.pop();
                    pth = parts.join('/');
                    data.push(name);
                }
                else {
                    pth = options.path;
                    data = (0, node_fs_1.readdirSync)(pth);
                }
            }
            // save aof
            if (options.aof) {
                await bgSave(ctx, tmpDir);
            }
            const dumps = data.filter(file => file.split('.').pop() === 'rdb' && !file.startsWith('temp'));
            if (!dumps.length) {
                ctx.log.warn('no redis database found!!');
                return;
            }
            for (const file of dumps) {
                ctx.log.debug(`detected redis file: ${file} | file type: rdb`);
                await new Promise((resolve, reject) => {
                    (0, tools_1.copyFile)((0, node_path_1.join)(pth, file), (0, node_path_1.join)(tmpDir, file), err => {
                        if (err) {
                            ctx.errors.redis = err.toString();
                            ctx.log.error(err);
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                });
            }
            try {
                await (0, targz_1.compressAsync)({
                    src: tmpDir,
                    dest: fileName,
                    tar: {
                        ignore: nm => !!name && name !== nm.replace(/\\/g, '/').split('/').pop(),
                    },
                });
            }
            catch (err) {
                ctx.errors.redis = err.toString();
                throw err;
            }
        }
        else if (options.redisType === 'remote') {
            await new Promise((resolve, reject) => {
                (0, node_child_process_1.exec)(`redis-cli -u 'redis://${options.user && options.pass ? `${options.user}:${options.pass}@` : ''}${options.host}:${options.port}' --rdb ${(0, node_path_1.join)(tmpDir, 'dump.rdb').replace(/\\/g, '/')}`, error => {
                    if (error) {
                        // `ExecException` is declared as Omit<ErrnoException, 'code'>, which
                        // drops the nominal Error identity; binding it back keeps toString()
                        // identical.
                        const failure = error;
                        ctx.errors.redis = failure.toString();
                        ctx.log.error(failure);
                        reject(failure);
                    }
                    else {
                        resolve();
                    }
                });
            });
            try {
                await (0, targz_1.compressAsync)({ src: tmpDir, dest: fileName });
            }
            catch (err) {
                ctx.errors.redis = err.toString();
                throw err;
            }
        }
        else {
            // Neither local nor remote: the original left the run without any report at all.
            ctx.log.warn(`unknown redis backup type "${options.redisType}"`);
            return;
        }
    }
    finally {
        clearInterval(timer);
    }
    ctx.log.debug(`Backup created: ${fileName}`);
    ctx.done.push('redis');
    ctx.types.push('redis');
    dropTmp();
}
/**
 * Asks redis to write its dump before the files are copied.
 *
 * @param ctx run context, for the error store and the logger
 * @param tmpDir temporary directory that is removed on failure
 */
async function bgSave(ctx, tmpDir) {
    return new Promise((resolve, reject) => {
        ctx.log.debug('redis-cli save started, please wait ...');
        (0, node_child_process_1.exec)(`redis-cli save`, error => {
            if (error) {
                const failure = error;
                ctx.errors.redis = failure.toString();
                try {
                    ctx.log.debug(`Try deleting the redis tmp directory: "${tmpDir}"`);
                    (0, fs_extra_1.removeSync)(tmpDir);
                    if (!(0, node_fs_1.existsSync)(tmpDir)) {
                        ctx.log.debug(`redis tmp directory "${tmpDir}" successfully deleted`);
                    }
                }
                catch (err) {
                    // A warning now: the save error below is the one that matters, and the original
                    // could report both.
                    ctx.log.warn(`redis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
                }
                reject(failure);
            }
            else {
                ctx.log.debug('redis-cli save finish');
                resolve();
            }
        });
    });
}
exports.ignoreErrors = true;
//# sourceMappingURL=32-redis.js.map