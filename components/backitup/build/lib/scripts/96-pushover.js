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
    await (0, tools_1.delay)(options.pushover.pushoverWaiting);
    if (options.pushover.enabled &&
        ctx.adapter &&
        options.pushover.instance !== '' &&
        options.pushover.instance !== null &&
        options.pushover.instance !== undefined) {
        // Send pushover Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used pushover-Instance: ${options.pushover.instance}`);
        }
        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);
        // Older instance configurations stored these flags as strings.
        const silent = options.pushover.SilentNotice === 'true' || options.pushover.SilentNotice === true;
        if (!errors.length) {
            let messageText = `${(0, tools_1._)('New %e Backup created on %t', options.pushover.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.pushover.time)
                .replace('%e', `${options.name}${options.name === 'iobroker' && options.pushover.hostName ? ` (${options.pushover.hostName})` : ''}`);
            if (options.pushover?.NoticeType === 'longPushoverNotice') {
                messageText += (0, notificationText_1.buildStorageList)(options, options.pushover.systemLang);
            }
            if (options.pushover.onlyError === false || options.pushover.onlyError === 'false') {
                if (silent) {
                    ctx.adapter.sendTo(options.pushover.instance, 'send', {
                        message: `<b>Backitup:</b>\n${messageText}`,
                        sound: '',
                        priority: -1,
                        title: 'Backitup',
                        device: options.pushover.deviceID,
                        html: 1,
                    });
                }
                else {
                    ctx.adapter.sendTo(options.pushover.instance, 'send', {
                        message: `<b>Backitup:</b>\n${messageText}`,
                        sound: '',
                        title: 'Backitup',
                        device: options.pushover.deviceID,
                        html: 1,
                    });
                }
            }
        }
        else {
            const errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.pushover.systemLang);
            if (silent) {
                ctx.adapter.sendTo(options.pushover.instance, 'send', {
                    message: `Backitup:\n${errorMessage}`,
                    sound: '',
                    priority: -1,
                    title: 'Backitup',
                    device: options.pushover.deviceID,
                });
            }
            else {
                ctx.adapter.sendTo(options.pushover.instance, 'send', {
                    message: `Backitup:\n${errorMessage}`,
                    sound: '',
                    title: 'Backitup',
                    device: options.pushover.deviceID,
                });
            }
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=96-pushover.js.map