"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/**
 * Packs every `zigbee_<n>` database directory whose adapter instance exists.
 *
 * As before, a failure of one instance does not stop the others; the first one is what the step
 * reports once every instance has been dealt with.
 *
 * @param props the run context and the zigbee slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    const zigbeeInst = [];
    let firstError;
    try {
        for (let i = 0; i <= 10; i++) {
            // Check if zigbee adapter instance exists
            const obj = await ctx.adapter.getForeignObjectAsync(`system.adapter.zigbee.${i}`);
            if (!obj) {
                continue;
            }
            // Check if corresponding folder exists
            const pth = (0, node_path_1.join)(options.path, `zigbee_${i}`);
            if (!(0, node_fs_1.existsSync)(pth)) {
                continue;
            }
            // Determine suffix for the filename
            let nameSuffix = '';
            if (options.hostType === 'Slave') {
                nameSuffix = options.slaveSuffix || '';
            }
            else {
                nameSuffix = options.nameSuffix || '';
            }
            // Construct backup filename
            const fileName = (0, node_path_1.join)(ctx.backupDir, `zigbee.${i}_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
            ctx.fileNames.push(fileName);
            // Run compression and wait for it to finish
            try {
                await (0, targz_1.compressAsync)({
                    src: pth,
                    dest: fileName,
                    tar: {
                        ignore: name => (0, node_path_1.extname)(name) === '.gz',
                    },
                });
                ctx.types.push(`zigbee.${i}`);
                ctx.done.push(`zigbee.${i}`);
            }
            catch (err) {
                // Last failure wins in the error store, the first one is reported - as before.
                ctx.errors.zigbee = err.toString();
                firstError ??= err;
            }
            zigbeeInst.push(`zigbee.${i}`);
        }
        // Log summary
        if (zigbeeInst.length) {
            ctx.log.debug(`Found zigbee databases: ${zigbeeInst.join(', ')}`);
        }
        else {
            ctx.log.warn('No zigbee databases found!');
        }
    }
    catch (err) {
        ctx.log.error(`Error during zigbee backup: ${err.message}`);
        // A packing failure already recorded above keeps precedence, matching the guarded callback.
        throw firstError ?? err;
    }
    if (firstError) {
        throw firstError;
    }
}
exports.ignoreErrors = true;
//# sourceMappingURL=34-zigbee.js.map