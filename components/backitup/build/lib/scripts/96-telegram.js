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
    await (0, tools_1.delay)(options.telegram.telegramWaiting);
    if (options.telegram.enabled &&
        ctx.adapter &&
        options.telegram.instance !== '' &&
        options.telegram.instance !== null &&
        options.telegram.instance !== undefined) {
        // Send Telegram Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used Telegram-Instance: ${options.telegram.instance}`);
        }
        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);
        if (!errors.length) {
            let messageText = `${(0, tools_1._)('New %e Backup created on %t', options.telegram.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.telegram.time)
                .replace('%e', `${options.name}${options.name === 'iobroker' && options.telegram.hostName ? ` (${options.telegram.hostName})` : ''}`);
            if (options.telegram?.NoticeType === 'longTelegramNotice') {
                messageText += (0, notificationText_1.buildStorageList)(options, options.telegram.systemLang);
            }
            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.telegram.onlyError === false || options.telegram.onlyError === 'false') {
                if (options.telegram.User && options.telegram.User === 'allTelegramUsers') {
                    ctx.adapter.sendTo(options.telegram.instance, 'send', {
                        text: `<b>Backitup:</b>\n${messageText}`,
                        disable_notification: options.telegram.SilentNotice,
                        parse_mode: 'HTML',
                    });
                }
                else {
                    ctx.adapter.sendTo(options.telegram.instance, 'send', {
                        user: options.telegram.User,
                        text: `<b>Backitup:</b>\n${messageText}`,
                        disable_notification: options.telegram.SilentNotice,
                        parse_mode: 'HTML',
                    });
                }
            }
        }
        else {
            const errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.telegram.systemLang);
            if (options.telegram.User && options.telegram.User === 'allTelegramUsers') {
                ctx.adapter.sendTo(options.telegram.instance, 'send', {
                    text: `NexoWatt EOS Backup:\n${errorMessage}`,
                    disable_notification: options.telegram.SilentNotice,
                });
            }
            else {
                ctx.adapter.sendTo(options.telegram.instance, 'send', {
                    user: options.telegram.User,
                    text: `NexoWatt EOS Backup:\n${errorMessage}`,
                    disable_notification: options.telegram.SilentNotice,
                });
            }
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=96-telegram.js.map