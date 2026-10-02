import { _, delay } from '../tools';
import { buildErrorMessage, buildStorageList, type NotificationOptions } from '../notificationText';
import type { BackItUpProps } from '../types';

interface WhatsAppOptions extends NotificationOptions {
    name: string;
    debugging?: boolean;
    adapter: ioBroker.Adapter;
    whatsapp: {
        enabled?: boolean;
        instance?: string | null;
        systemLang: string;
        time?: string;
        hostName?: string;
        onlyError?: boolean;
        NoticeType?: 'longWhatsappNotice' | 'shortWhatsappNotice';
        whatsappWaiting?: number;
    };
}

/**
 * Sends the notification for a finished run.
 *
 * @param props the run context and this step's slice of the config
 */
export async function run(props: BackItUpProps<WhatsAppOptions>): Promise<void> {
    const { context: ctx, options } = props;

    await delay(options.whatsapp.whatsappWaiting);

    if (
        options.whatsapp.enabled &&
        ctx.adapter &&
        options.whatsapp.instance !== '' &&
        options.whatsapp.instance !== null &&
        options.whatsapp.instance !== undefined
    ) {
        // Send Whatsapp Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used WhatsApp-Instance: ${options.whatsapp.instance}`);
        }

        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);

        if (!errors.length) {
            let messageText = `${_('New %e Backup created on %t', options.whatsapp.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.whatsapp.time as string)
                .replace(
                    '%e',
                    `${options.name}${options.name === 'iobroker' && options.whatsapp.hostName ? ` (${options.whatsapp.hostName})` : ''}`,
                );

            if (options.whatsapp?.NoticeType === 'longWhatsappNotice') {
                messageText += buildStorageList(options, options.whatsapp.systemLang);
            }

            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.whatsapp.onlyError === false || (options.whatsapp.onlyError as unknown) === 'false') {
                ctx.adapter.sendTo(options.whatsapp.instance, 'send', {
                    text: `*Backitup:*\n${messageText}`,
                });
            }
        } else {
            let errorMessage = buildErrorMessage(ctx, options, options.whatsapp.systemLang);

            // Unlike most channels this scrubbing step is active here (it is commented out in
            // telegram, email, pushover, signal and matrix), so it stays in this script.
            try {
                errorMessage = errorMessage.replaceAll('undefined', '');
            } catch {
                // ignore
            }

            ctx.adapter.sendTo(options.whatsapp.instance, 'send', {
                text: `Backitup:\n${errorMessage}`,
            });
        }
    }
}

export const ignoreErrors = true;
export const afterBackup = true;
