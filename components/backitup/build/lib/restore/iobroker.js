"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStop = void 0;
exports.restore = restore;
const node_child_process_1 = require("node:child_process");
const js_controller_common_1 = require("@iobroker/js-controller-common");
/**
 * Marks a failure with the exit code the step wants reported.
 *
 * @param error what went wrong
 */
function failure(error) {
    const err = error instanceof Error ? error : new Error(String(error));
    err.exitCode = -1;
    return err;
}
/**
 * Hands the archive to `iobroker restore`.
 *
 * Runs in the detached process, so `context.adapter` is null here.
 *
 * @param props the run context and the archive; this step reads no config of its own
 */
async function restore(props) {
    const { context: ctx, fileName } = props;
    const ioPath = `${js_controller_common_1.tools.getControllerDir()}/iobroker.js`;
    let cmd;
    try {
        ctx.log.debug(`Start ioBroker Restore from "${fileName}"...`);
        ctx.log.debug(ioPath);
        cmd = (0, node_child_process_1.fork)(ioPath, ['restore', fileName, '--force'], { silent: true });
    }
    catch (error) {
        ctx.log.error('ioBroker Restore not completed');
        ctx.log.error(error);
        throw failure(error);
    }
    return new Promise((resolve, reject) => {
        cmd.stdout.on('data', data => ctx.log.debug(data.toString()));
        cmd.stderr.on('data', data => ctx.log.error(data.toString()));
        cmd.on('close', code => {
            // Logged as a success regardless of the exit code; the code itself is passed on.
            ctx.log.debug('ioBroker Restore completed successfully');
            resolve(code);
        });
        cmd.on('error', error => {
            ctx.log.error(error);
            reject(failure(error));
        });
    });
}
exports.isStop = true;
//# sourceMappingURL=iobroker.js.map