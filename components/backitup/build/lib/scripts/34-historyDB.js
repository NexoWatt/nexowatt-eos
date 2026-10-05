"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/**
 * Packs the history database.
 *
 * @param props the run context and the historyDB slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    let nameSuffix;
    if (options.hostType === 'Slave') {
        nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
    }
    else {
        nameSuffix = options.nameSuffix ? options.nameSuffix : '';
    }
    const fileName = (0, node_path_1.join)(ctx.backupDir, `historyDB_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
    const sourcePth = (0, node_path_1.join)(options.path).replace(/\\/g, '/');
    ctx.fileNames.push(fileName);
    const timer = setInterval(() => {
        if ((0, node_fs_1.existsSync)(fileName)) {
            const stats = (0, node_fs_1.statSync)(fileName);
            const fileSize = Math.floor(stats.size / (1024 * 1024));
            ctx.log.debug(`Packed ${fileSize}MB so far...`);
        }
    }, 10000);
    let name;
    let pth;
    if ((0, node_fs_1.existsSync)(sourcePth)) {
        const stat = (0, node_fs_1.statSync)(sourcePth);
        if (!stat.isDirectory()) {
            // A single file: pack its directory and filter down to that one entry.
            const parts = sourcePth.replace(/\\/g, '/').split('/');
            name = parts.pop();
            pth = parts.join('/');
        }
        else {
            pth = sourcePth;
        }
    }
    ctx.log.debug('compress from historyDB started ...');
    try {
        await (0, targz_1.compressAsync)({
            src: pth,
            dest: fileName,
            tar: {
                ignore: nm => !!name && name !== nm.replace(/\\/g, '/').split('/').pop(),
            },
        });
    }
    catch (err) {
        ctx.errors.historyDB = err.toString();
        throw err;
    }
    finally {
        clearInterval(timer);
    }
    ctx.log.debug(`Backup created: ${fileName}`);
    ctx.done.push('historyDB');
    ctx.types.push('historyDB');
}
exports.ignoreErrors = true;
//# sourceMappingURL=34-historyDB.js.map