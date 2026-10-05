"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/**
 * Packs every `esphome.<n>` data directory it finds.
 *
 * As before, a failure of one directory does not stop the others; the first one is what the step
 * reports once every directory has been dealt with.
 *
 * @param props the run context and the esphome slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    const esphomeInst = [];
    let dirs = [];
    // find all esphome dirs
    if ((0, node_fs_1.existsSync)(options.path)) {
        dirs = (0, node_fs_1.readdirSync)(options.path).filter(name => {
            const fullPath = (0, node_path_1.join)(options.path, name);
            return (0, node_fs_1.statSync)(fullPath).isDirectory() && name.startsWith('esphome.');
        });
    }
    if (dirs.length) {
        ctx.log.debug(`found esphome data: ${dirs.join(',')}`);
    }
    else {
        ctx.log.warn('no esphome data found!!');
        return;
    }
    // The first failure is what the step reports, while the loop keeps going over the rest.
    let firstError;
    for (const dirName of dirs) {
        const pth = (0, node_path_1.join)(options.path, dirName);
        const nameSuffix = options.hostType === 'Slave' ? options.slaveSuffix || '' : options.nameSuffix || '';
        const fileName = (0, node_path_1.join)(ctx.backupDir, `${dirName}_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
        // compress dir
        try {
            await (0, targz_1.compressAsync)({
                src: pth,
                dest: fileName,
                tar: {
                    ignore: name => (0, node_path_1.basename)(name) === '.esphome' || (0, node_path_1.basename)(name) === '.gitignore',
                },
            });
            ctx.log.debug(`Backup created: ${fileName}`);
            ctx.fileNames.push(fileName);
            ctx.types.push(dirName);
            ctx.done.push(dirName);
            esphomeInst.push(dirName);
        }
        catch (err) {
            ctx.errors.esphome = err.toString();
            ctx.log.error(err);
            firstError ??= err;
        }
    }
    if (firstError) {
        throw firstError;
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=48-esphome.js.map