import { _, delay } from '../tools';
import { buildErrorMessage, buildStorageList, type NotificationOptions } from '../notificationText';
import type { BackItUpProps } from '../types';

interface EmailOptions extends NotificationOptions {
    name: string;
    debugging?: boolean;
    adapter: ioBroker.Adapter;
    email: {
        enabled?: boolean;
        instance?: string | null;
        systemLang: string;
        time?: string;
        hostName?: string;
        emailReceiver?: string;
        emailSender?: string;
        onlyError?: boolean;
        NoticeType?: 'longEmailNotice' | 'shortEmailNotice';
        emailWaiting?: number;
    };
}

/**
 * Sends the notification for a finished run.
 *
 * @param props the run context and this step's slice of the config
 */
export async function run(props: BackItUpProps<EmailOptions>): Promise<void> {
    const { context: ctx, options } = props;

    await delay(options.email.emailWaiting);

    if (
        options.email.enabled &&
        ctx.adapter &&
        options.email.instance !== '' &&
        options.email.instance !== null &&
        options.email.instance !== undefined
    ) {
        // Send E-Mail Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used E-Mail-Instance: ${options.email.instance}`);
        }

        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);

        if (!errors.length) {
            let messageText = `${_('New %e Backup created on %t', options.email.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.email.time as string)
                .replace(
                    '%e',
                    `${options.name}${options.name === 'iobroker' && options.email.hostName ? ` (${options.email.hostName})` : ''}`,
                );

            if (options.email?.NoticeType === 'longEmailNotice') {
                messageText += buildStorageList(options, options.email.systemLang);
            }

            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.email.onlyError === false || (options.email.onlyError as unknown) === 'false') {
                ctx.adapter.sendTo(options.email.instance, 'send', {
                    text: `NexoWatt EOS Backup:\n${messageText}`,
                    to: options.email.emailReceiver,
                    subject: 'NexoWatt EOS Backup',
                    from: options.email.emailSender,
                });
            }
        } else {
            const errorMessage = buildErrorMessage(ctx, options, options.email.systemLang);

            ctx.adapter.sendTo(options.email.instance, 'send', {
                text: `NexoWatt EOS Backup:\n${errorMessage}`,
                to: options.email.emailReceiver,
                subject: 'NexoWatt EOS Backup – Error',
                from: options.email.emailSender,
            });
        }
    }
}

export const ignoreErrors = true;
export const afterBackup = true;
