"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.afterBackup = exports.ignoreErrors = void 0;
exports.run = run;
const tools_1 = require("../tools");
const notificationText_1 = require("../notificationText");
/**
 * Sends the notification for a finished run.
 *
 * @param props the run context and this step's slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    await (0, tools_1.delay)(options.matrix.matrixWaiting);
    if (options.matrix.enabled &&
        ctx.adapter &&
        options.matrix.instance !== '' &&
        options.matrix.instance !== null &&
        options.matrix.instance !== undefined) {
        // Send matrix Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used Matrix-Instance: ${options.matrix.instance}`);
        }
        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);
        if (!errors.length) {
            let messageText = `${(0, tools_1._)('New %e Backup created on %t', options.matrix.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.matrix.time)
                .replace('%e', `${options.name}${options.name === 'iobroker' && options.matrix.hostName ? ` (${options.matrix.hostName})` : ''}`);
            if (options.matrix?.NoticeType === 'longMatrixNotice') {
                messageText += (0, notificationText_1.buildStorageList)(options, options.matrix.systemLang);
            }
            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.matrix.onlyError === false || options.matrix.onlyError === 'false') {
                // Note the stray apostrophe after the newline and the two-argument sendTo -
                // both as in the original.
                ctx.adapter.sendTo(options.matrix.instance, {
                    html: `Backitup:\n'${messageText}`,
                    text: `Backitup:\n'${messageText}`,
                });
            }
        }
        else {
            const errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.matrix.systemLang);
            // "BackItUp" is spelled differently here than in the success case - kept as found.
            ctx.adapter.sendTo(options.matrix.instance, {
                html: `BackItUp:\n'${errorMessage}`,
                text: `BackItUp:\n'${errorMessage}`,
            });
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=96-matrix.js.map