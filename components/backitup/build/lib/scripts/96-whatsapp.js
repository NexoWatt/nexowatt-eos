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
    await (0, tools_1.delay)(options.whatsapp.whatsappWaiting);
    if (options.whatsapp.enabled &&
        ctx.adapter &&
        options.whatsapp.instance !== '' &&
        options.whatsapp.instance !== null &&
        options.whatsapp.instance !== undefined) {
        // Send Whatsapp Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used WhatsApp-Instance: ${options.whatsapp.instance}`);
        }
        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);
        if (!errors.length) {
            let messageText = `${(0, tools_1._)('New %e Backup created on %t', options.whatsapp.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.whatsapp.time)
                .replace('%e', `${options.name}${options.name === 'iobroker' && options.whatsapp.hostName ? ` (${options.whatsapp.hostName})` : ''}`);
            if (options.whatsapp?.NoticeType === 'longWhatsappNotice') {
                messageText += (0, notificationText_1.buildStorageList)(options, options.whatsapp.systemLang);
            }
            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.whatsapp.onlyError === false || options.whatsapp.onlyError === 'false') {
                ctx.adapter.sendTo(options.whatsapp.instance, 'send', {
                    text: `*Backitup:*\n${messageText}`,
                });
            }
        }
        else {
            let errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.whatsapp.systemLang);
            // Unlike most channels this scrubbing step is active here (it is commented out in
            // telegram, email, pushover, signal and matrix), so it stays in this script.
            try {
                errorMessage = errorMessage.replaceAll('undefined', '');
            }
            catch {
                // ignore
            }
            ctx.adapter.sendTo(options.whatsapp.instance, 'send', {
                text: `Backitup:\n${errorMessage}`,
            });
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=96-whatsapp.js.map