import { _, delay } from '../tools';
import { buildErrorMessage, buildStorageList, type NotificationOptions } from '../notificationText';
import type { BackItUpProps } from '../types';

interface MatrixOptions extends NotificationOptions {
    name: string;
    debugging?: boolean;
    adapter: ioBroker.Adapter;
    matrix: {
        enabled?: boolean;
        instance?: string | null;
        systemLang: string;
        time?: string;
        hostName?: string;
        onlyError?: boolean;
        NoticeType?: 'longMatrixNotice' | 'shortMatrixNotice';
        matrixWaiting?: number;
    };
}

/**
 * Sends the notification for a finished run.
 *
 * @param props the run context and this step's slice of the config
 */
export async function run(props: BackItUpProps<MatrixOptions>): Promise<void> {
    const { context: ctx, options } = props;

    await delay(options.matrix.matrixWaiting);

    if (
        options.matrix.enabled &&
        ctx.adapter &&
        options.matrix.instance !== '' &&
        options.matrix.instance !== null &&
        options.matrix.instance !== undefined
    ) {
        // Send matrix Message
        if (options.debugging) {
            ctx.log.debug(`[${options.name}] used Matrix-Instance: ${options.matrix.instance}`);
        }

        // analyse here the info from ctx.errors and ctx.done
        const errors = Object.keys(ctx.errors);

        if (!errors.length) {
            let messageText = `${_('New %e Backup created on %t', options.matrix.systemLang)}.`;
            messageText = messageText
                .replace('%t', options.matrix.time as string)
                .replace(
                    '%e',
                    `${options.name}${options.name === 'iobroker' && options.matrix.hostName ? ` (${options.matrix.hostName})` : ''}`,
                );

            if (options.matrix?.NoticeType === 'longMatrixNotice') {
                messageText += buildStorageList(options, options.matrix.systemLang);
            }

            // The `=== 'false'` arm covers instance configurations that stored the flag as a string.
            if (options.matrix.onlyError === false || (options.matrix.onlyError as unknown) === 'false') {
                // Note the stray apostrophe after the newline and the two-argument sendTo -
                // both as in the original.
                ctx.adapter.sendTo(options.matrix.instance, {
                    html: `Backitup:\n'${messageText}`,
                    text: `Backitup:\n'${messageText}`,
                });
            }
        } else {
            const errorMessage = buildErrorMessage(ctx, options, options.matrix.systemLang);

            // "BackItUp" is spelled differently here than in the success case - kept as found.
            ctx.adapter.sendTo(options.matrix.instance, {
                html: `BackItUp:\n'${errorMessage}`,
                text: `BackItUp:\n'${errorMessage}`,
            });
        }
    }
}

export const ignoreErrors = true;
export const afterBackup = true;
