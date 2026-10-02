import { _, delay } from '../tools';
import { buildErrorMessage, buildStorageList, type NotificationOptions } from '../notificationText';
import type { BackItUpProps } from '../types';

interface SignalOptions extends NotificationOptions {
    name: string;
    debugging?: boolean;
    adapter: ioBroker.Adapter;
    signal: {
        enabled?: boolean;
        instance?: string | null;
        systemLang: string;
        time?: string;
        hostName?: string;
        onlyError?: boolean;
        NoticeType?: 'longSignalNotice' | 'shortSignalNotice';
        signalWaiting?: number;
    };
}

/**
 * Sends the notification for a finished run.
 *
 * @param props the run context and this step's slice of the config
 */
export async function run(props: BackItUpProps<SignalOptions>): Promise<void> {
    const { context: ctx, options } = props;

    await delay(options.signal.signalWaiting);

    if (
        options.signal.enabled &&
        ctx.adapter &&
        options.signal.instance !== '' &&
        options.signal.instance !== null &&
        options.signal.instance !== undefined
    ) {
        // Send signal Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used Signal-Instance: ${options.signal.instance}`);
        }

        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);

        if (!errors.length) {
            let messageText = `${_('New %e Backup created on %t', options.signal.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.signal.time as string)
                .replace(
                    '%e',
                    `${options.name}${options.name === 'iobroker' && options.signal.hostName ? ` (${options.signal.hostName})` : ''}`,
                );

            if (options.signal?.NoticeType === 'longSignalNotice') {
                messageText += buildStorageList(options, options.signal.systemLang);
            }

            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.signal.onlyError === false || (options.signal.onlyError as unknown) === 'false') {
                ctx.adapter.sendTo(options.signal.instance, 'send', {
                    text: `NexoWatt EOS Backup:\n${messageText}`,
                });
            }
        } else {
            const errorMessage = buildErrorMessage(ctx, options, options.signal.systemLang);

            ctx.adapter.sendTo(options.signal.instance, 'send', {
                text: `NexoWatt EOS Backup:\n${errorMessage}`,
            });
        }
    }
}

export const ignoreErrors = true;
export const afterBackup = true;
