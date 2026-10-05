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
    await (0, tools_1.delay)(options.signal.signalWaiting);
    if (options.signal.enabled &&
        ctx.adapter &&
        options.signal.instance !== '' &&
        options.signal.instance !== null &&
        options.signal.instance !== undefined) {
        // Send signal Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used Signal-Instance: ${options.signal.instance}`);
        }
        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);
        if (!errors.length) {
            let messageText = `${(0, tools_1._)('New %e Backup created on %t', options.signal.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.signal.time)
                .replace('%e', `${options.name}${options.name === 'iobroker' && options.signal.hostName ? ` (${options.signal.hostName})` : ''}`);
            if (options.signal?.NoticeType === 'longSignalNotice') {
                messageText += (0, notificationText_1.buildStorageList)(options, options.signal.systemLang);
            }
            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.signal.onlyError === false || options.signal.onlyError === 'false') {
                ctx.adapter.sendTo(options.signal.instance, 'send', {
                    text: `NexoWatt EOS Backup:\n${messageText}`,
                });
            }
        }
        else {
            const errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.signal.systemLang);
            ctx.adapter.sendTo(options.signal.instance, 'send', {
                text: `NexoWatt EOS Backup:\n${errorMessage}`,
            });
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=96-signal.js.map