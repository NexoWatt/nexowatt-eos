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
    await (0, tools_1.delay)(options.email.emailWaiting);
    if (options.email.enabled &&
        ctx.adapter &&
        options.email.instance !== '' &&
        options.email.instance !== null &&
        options.email.instance !== undefined) {
        // Send E-Mail Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used E-Mail-Instance: ${options.email.instance}`);
        }
        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);
        if (!errors.length) {
            let messageText = `${(0, tools_1._)('New %e Backup created on %t', options.email.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.email.time)
                .replace('%e', `${options.name}${options.name === 'iobroker' && options.email.hostName ? ` (${options.email.hostName})` : ''}`);
            if (options.email?.NoticeType === 'longEmailNotice') {
                messageText += (0, notificationText_1.buildStorageList)(options, options.email.systemLang);
            }
            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.email.onlyError === false || options.email.onlyError === 'false') {
                ctx.adapter.sendTo(options.email.instance, 'send', {
                    text: `NexoWatt EOS Backup:\n${messageText}`,
                    to: options.email.emailReceiver,
                    subject: 'NexoWatt EOS Backup',
                    from: options.email.emailSender,
                });
            }
        }
        else {
            const errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.email.systemLang);
            ctx.adapter.sendTo(options.email.instance, 'send', {
                text: `NexoWatt EOS Backup:\n${errorMessage}`,
                to: options.email.emailReceiver,
                subject: 'NexoWatt EOS Backup – Error',
                from: options.email.emailSender,
            });
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=96-email.js.map