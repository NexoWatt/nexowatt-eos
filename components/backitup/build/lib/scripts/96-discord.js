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
    await (0, tools_1.delay)(options.discord.discordWaiting);
    if (options.discord.enabled &&
        options.discord.target &&
        ctx.adapter &&
        options.discord.instance !== '' &&
        options.discord.instance !== null &&
        options.discord.instance !== undefined) {
        // Send Discord Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used Discord-Instance: ${options.discord.instance}`);
        }
        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);
        if (!errors.length) {
            let messageText = `${(0, tools_1._)('New %e Backup created on %t', options.discord.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.discord.time)
                .replace('%e', `${options.name}${options.name === 'iobroker' && options.discord.hostName ? ` (${options.discord.hostName})` : ''}`);
            if (options.discord?.NoticeType === 'longDiscordNotice') {
                messageText += (0, notificationText_1.buildStorageList)(options, options.discord.systemLang, true);
            }
            // Note: unlike the other channels this one has no `onlyError` check and always sends.
            sendMessage(options, ctx.log, messageText);
        }
        else {
            let errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.discord.systemLang);
            // Active here, unlike in most channels.
            try {
                errorMessage = errorMessage.replaceAll('undefined', '');
            }
            catch {
                // ignore
            }
            sendMessage(options, ctx.log, errorMessage);
        }
    }
}
/**
 * Delivers to a single user or to a server channel, depending on how `target` is written.
 *
 * @param options script options
 * @param log adapter logger
 * @param message text to deliver
 */
function sendMessage(options, log, message) {
    const target = options.discord.target;
    if (target.match(/^\d+$/)) {
        // send to a single user
        options.adapter.sendTo(options.discord.instance, 'sendMessage', {
            userId: target,
            content: `**Backitup**:\n${message}`,
        }, (ret) => {
            if (ret.err) {
                log.warn(`Error sending Discord message: ${ret.err}`);
            }
        });
    }
    else if (target.match(/^\d+\/\d+$/)) {
        // send to a server channel
        const [serverId, channelId] = target.split('/');
        options.adapter.sendTo(options.discord.instance, 'sendMessage', {
            serverId,
            channelId,
            content: `**Backitup**:\n${message}`,
        }, (ret) => {
            if (ret.err) {
                log.warn(`Error sending Discord message: ${ret.err}`);
            }
        });
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=96-discord.js.map