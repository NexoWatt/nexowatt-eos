import { _, delay } from '../tools';
import { buildErrorMessage, buildStorageList, type NotificationOptions } from '../notificationText';
import type { BackItUpProps } from '../types';

interface TelegramOptions extends NotificationOptions {
    name: string;
    debugging?: boolean;
    adapter: ioBroker.Adapter;
    telegram: {
        enabled?: boolean;
        instance?: string | null;
        systemLang: string;
        time?: string;
        hostName?: string;
        User?: string;
        SilentNotice?: boolean;
        onlyError?: boolean;
        NoticeType?: 'longTelegramNotice' | 'shortTelegramNotice';
        telegramWaiting?: number;
    };
}

/**
 * Sends the notification for a finished run.
 *
 * @param props the run context and this step's slice of the config
 */
export async function run(props: BackItUpProps<TelegramOptions>): Promise<void> {
    const { context: ctx, options } = props;

    await delay(options.telegram.telegramWaiting);

    if (
        options.telegram.enabled &&
        ctx.adapter &&
        options.telegram.instance !== '' &&
        options.telegram.instance !== null &&
        options.telegram.instance !== undefined
    ) {
        // Send Telegram Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used Telegram-Instance: ${options.telegram.instance}`);
        }

        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);

        if (!errors.length) {
            let messageText = `${_('New %e Backup created on %t', options.telegram.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.telegram.time as string)
                .replace(
                    '%e',
                    `${options.name}${options.name === 'iobroker' && options.telegram.hostName ? ` (${options.telegram.hostName})` : ''}`,
                );

            if (options.telegram?.NoticeType === 'longTelegramNotice') {
                messageText += buildStorageList(options, options.telegram.systemLang);
            }

            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.telegram.onlyError === false || (options.telegram.onlyError as unknown) === 'false') {
                if (options.telegram.User && options.telegram.User === 'allTelegramUsers') {
                    ctx.adapter.sendTo(options.telegram.instance, 'send', {
                        text: `<b>Backitup:</b>\n${messageText}`,
                        disable_notification: options.telegram.SilentNotice,
                        parse_mode: 'HTML',
                    });
                } else {
                    ctx.adapter.sendTo(options.telegram.instance, 'send', {
                        user: options.telegram.User,
                        text: `<b>Backitup:</b>\n${messageText}`,
                        disable_notification: options.telegram.SilentNotice,
                        parse_mode: 'HTML',
                    });
                }
            }
        } else {
            const errorMessage = buildErrorMessage(ctx, options, options.telegram.systemLang);

            if (options.telegram.User && options.telegram.User === 'allTelegramUsers') {
                ctx.adapter.sendTo(options.telegram.instance, 'send', {
                    text: `NexoWatt EOS Backup:\n${errorMessage}`,
                    disable_notification: options.telegram.SilentNotice,
                });
            } else {
                ctx.adapter.sendTo(options.telegram.instance, 'send', {
                    user: options.telegram.User,
                    text: `NexoWatt EOS Backup:\n${errorMessage}`,
                    disable_notification: options.telegram.SilentNotice,
                });
            }
        }
    }
}

export const ignoreErrors = true;
export const afterBackup = true;
