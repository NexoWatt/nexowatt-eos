"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/** Instances are probed by index up to this number, inclusive. */
const MAX_INSTANCE = 100;
/**
 * Packs every `yahka.<n>.hapdata` directory it finds.
 *
 * Two things the callback version got wrong, both settled by awaiting:
 *
 * - It reported when the *loop* reached index 100, not when the archives were written, so the
 *   following steps ran while yahka was still packing.
 * - That report sat in the "index 100 does not exist" branch. Had a `yahka.100.hapdata` ever
 *   existed, nothing would have reported at all and the run would have waited forever.
 *
 * A failure of one instance still does not stop the others; the first one is what the step reports
 * once every instance has been dealt with.
 *
 * @param props the run context and the yahka slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    const yahkaInst = [];
    let firstError;
    for (let i = 0; i <= MAX_INSTANCE; i++) {
        const pth = (0, node_path_1.join)(options.path, `yahka.${i}.hapdata`);
        if (!(0, node_fs_1.existsSync)(pth)) {
            continue;
        }
        let nameSuffix;
        if (options.hostType === 'Slave') {
            nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
        }
        else {
            nameSuffix = options.nameSuffix ? options.nameSuffix : '';
        }
        const fileName = (0, node_path_1.join)(ctx.backupDir, `yahka.${i}_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
        ctx.fileNames.push(fileName);
        try {
            await (0, targz_1.compressAsync)({ src: pth, dest: fileName });
            ctx.types.push(`yahka.${i}`);
            ctx.done.push(`yahka.${i}`);
        }
        catch (err) {
            // Last failure wins in the error store, the first one is reported - as before.
            ctx.errors.yahka = err.toString();
            firstError ??= err;
        }
        yahkaInst.push(`yahka.${i}`);
    }
    if (yahkaInst.length) {
        ctx.log.debug(`found yahka database: ${yahkaInst.join(',')}`);
    }
    else {
        ctx.log.warn('no yahka database found!!');
    }
    if (firstError) {
        throw firstError;
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=44-yahka.js.map