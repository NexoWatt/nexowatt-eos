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
    await (0, tools_1.delay)(1000);
    if (ctx.adapter) {
        const errors = Object.keys(ctx.errors);
        if (errors.length) {
            // Same text the notification channels send. It used to be a verbatim copy of that
            // block here, including the Grafana masking bug that let the API key through.
            const errorMessage = (0, notificationText_1.buildErrorMessage)(ctx, options, options.notification.systemLang);
            ctx.log.debug('Admin notification will be sent');
            // Not awaited in the original either; `void` only marks that for the linter.
            void ctx.adapter.registerNotification('nexowatt-backup', 'backupError', errorMessage);
        }
    }
}
exports.ignoreErrors = true;
exports.afterBackup = true;
//# sourceMappingURL=99-notification.js.map