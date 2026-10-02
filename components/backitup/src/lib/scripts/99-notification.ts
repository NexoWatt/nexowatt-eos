import { delay } from '../tools';
import { buildErrorMessage, type NotificationOptions } from '../notificationText';
import type { BackItUpProps } from '../types';

interface AdminNotificationOptions extends NotificationOptions {
    adapter: ioBroker.Adapter;
    notification: {
        systemLang: string;
    };
}

/**
 * Sends the notification for a finished run.
 *
 * @param props the run context and this step's slice of the config
 */
export async function run(props: BackItUpProps<AdminNotificationOptions>): Promise<void> {
    const { context: ctx, options } = props;

    await delay(1000);

    if (ctx.adapter) {
        const errors = Object.keys(ctx.errors);

        if (errors.length) {
            // Same text the notification channels send. It used to be a verbatim copy of that
            // block here, including the Grafana masking bug that let the API key through.
            const errorMessage = buildErrorMessage(ctx, options, options.notification.systemLang);

            ctx.log.debug('Admin notification will be sent');
            // Not awaited in the original either; `void` only marks that for the linter.
            void ctx.adapter.registerNotification('nexowatt-backup', 'backupError', errorMessage);
        }
    }
}

export const ignoreErrors = true;
export const afterBackup = true;
