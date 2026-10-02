export interface StorageSizeCheck {
    diskState: 'ok' | 'warn' | 'error';
    diskFree: number;
    storage: 'nas' | 'local';
    ready: boolean;
}

export async function storageSizeCheck(
    options: ioBroker.Adapter,
    adapterName: string,
    log: ioBroker.Logger,
): Promise<StorageSizeCheck | null> {
    const storageSizeErr = options.config.fileSizeError || 512;
    const storageSizeWarn = options.config.fileSizeWarning || 1024;

    const adapterConf = await options
        .getForeignObjectAsync(`system.adapter.${adapterName}.${options.instance}`)
        .catch(err => log.error(err));

    // The id is always an instance, but its template-literal type also matches `system.adapter.<name>`,
    // so the result is `AdapterObject | InstanceObject` - only the latter carries `host`.
    if (adapterConf && adapterConf.common && 'host' in adapterConf.common && adapterConf.common.host) {
        const host = adapterConf.common.host;

        const _diskFree = await options.getForeignStateAsync(`system.host.${host}.diskFree`).catch(err => log.error(err));

        if (_diskFree && _diskFree.val) {
            // The state is declared as free megabytes; compared as-is, exactly as before.
            const diskFree = _diskFree.val as number;

            const sysCheck: StorageSizeCheck = {
                diskState: diskFree > storageSizeWarn ? 'ok' : diskFree > storageSizeErr ? 'warn' : 'error',
                diskFree,
                storage: options.config.cifsEnabled ? 'nas' : 'local',
                ready: !!(options.config.cifsEnabled || diskFree > storageSizeErr),
            };

            switch (sysCheck.diskState) {
                case 'warn':
                    log.warn(
                        `On the host "${host}" only ${diskFree} MB free space is available! Please check your system!`,
                    );
                    break;
                case 'error':
                    log.error(
                        `On the host "${host}" only ${diskFree} MB free space is available! Local backups are currently not possible. Please check your system!`,
                    );
                    break;
            }

            return sysCheck;
        }
        return null;
    }
    return null;
}

export function systemMessage(options: ioBroker.Adapter, sysMessage: string): void {
    if (options.config.notificationEnabled) {
        switch (options.config.notificationsType) {
            case 'Telegram':
                if (
                    options.config.telegramUser &&
                    options.config.telegramUser === 'allTelegramUsers' &&
                    options.config.telegramInstance
                ) {
                    try {
                        options.sendTo(options.config.telegramInstance, 'send', {
                            text: `NexoWatt EOS Backup:\n${sysMessage}`,
                            disable_notification: options.config.telegramSilentNotice,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Telegram message: ${err}`);
                    }
                } else if (options.config.telegramInstance) {
                    try {
                        options.sendTo(options.config.telegramInstance, 'send', {
                            user: options.config.telegramUser,
                            text: `NexoWatt EOS Backup:\n${sysMessage}`,
                            disable_notification: options.config.telegramSilentNotice,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Telegram message: ${err}`);
                    }
                }
                break;
            case 'E-Mail':
                if (options.config.emailInstance && options.config.emailReceiver && options.config.emailSender) {
                    try {
                        options.sendTo(options.config.emailInstance, 'send', {
                            text: `NexoWatt EOS Backup:\n${sysMessage}`,
                            to: options.config.emailReceiver,
                            subject: 'NexoWatt EOS Backup',
                            from: options.config.emailSender,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending E-Mail message: ${err}`);
                    }
                }
                break;
            case 'Pushover':
                // The `=== 'true'` arm looks redundant against the declared boolean type, but
                // instance configurations written by older versions really do carry the string.
                // Kept as-is so those keep behaving the same.
                if (
                    ((options.config.pushoverSilentNotice as unknown) === 'true' ||
                        options.config.pushoverSilentNotice === true) &&
                    options.config.pushoverInstance &&
                    options.config.pushoverDeviceID
                ) {
                    try {
                        options.sendTo(options.config.pushoverInstance, 'send', {
                            message: `NexoWatt EOS Backup:\n${sysMessage}`,
                            sound: '',
                            priority: -1,
                            title: 'NexoWatt EOS Backup',
                            device: options.config.pushoverDeviceID,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Pushover message: ${err}`);
                    }
                } else if (options.config.pushoverInstance && options.config.pushoverDeviceID) {
                    try {
                        options.sendTo(options.config.pushoverInstance, 'send', {
                            message: `NexoWatt EOS Backup:\n${sysMessage}`,
                            sound: '',
                            title: 'NexoWatt EOS Backup',
                            device: options.config.pushoverDeviceID,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Pushover message: ${err}`);
                    }
                }
                break;
            case 'WhatsApp':
                if (options.config.whatsappInstance) {
                    try {
                        options.sendTo(options.config.whatsappInstance, 'send', {
                            text: `NexoWatt EOS Backup:\n${sysMessage}`,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending WhatsApp message: ${err}`);
                    }
                }
                break;
            case 'Signal':
                if (options.config.signalInstance) {
                    try {
                        options.sendTo(options.config.signalInstance, 'send', {
                            text: `NexoWatt EOS Backup:\n${sysMessage}`,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Signal message: ${err}`);
                    }
                }
                break;
            case 'Matrix':
                if (options.config.matrixInstance) {
                    try {
                        options.sendTo(options.config.matrixInstance, {
                            text: `NexoWatt EOS Backup:\n${sysMessage}`,
                        });
                    } catch (err) {
                        options.log.warn(`Error sending Matrix message: ${err}`);
                    }
                }
                break;
            case 'Discord':
                if (options.config.discordInstance && options.config.discordTarget) {
                    if (options.config.discordTarget.match(/^\d+$/)) {
                        // send to a single user
                        try {
                            options.sendTo(options.config.discordInstance, 'sendMessage', {
                                userId: options.config.discordTarget,
                                content: `NexoWatt EOS Backup:\n${sysMessage}`,
                            });
                        } catch (err) {
                            options.log.warn(`Error sending Discord message: ${err}`);
                        }
                    } else if (options.config.discordTarget.match(/^\d+\/\d+$/)) {
                        // send to a server channel
                        const [serverId, channelId] = options.config.discordTarget.split('/');
                        try {
                            options.sendTo(options.config.discordInstance, 'sendMessage', {
                                serverId,
                                channelId,
                                content: `NexoWatt EOS Backup:\n${sysMessage}`,
                            });
                        } catch (err) {
                            options.log.warn(`Error sending Discord message: ${err}`);
                        }
                    }
                }
                break;
        }
    }
}
