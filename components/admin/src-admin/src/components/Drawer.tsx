import React, { Component, type RefObject, type JSX } from 'react';

import { Avatar, Drawer as MaterialDrawer, IconButton, List, Typography, SwipeableDrawer, Box } from '@mui/material';

import { ChevronLeft as ChevronLeftIcon } from '@mui/icons-material';

import {
    Utils,
    I18n,
    Icon,
    withWidth,
    IconLogout as LogoutIcon,
    type AdminConnection,
    type IobTheme,
    type ThemeType,
    type Translate,
} from '@iobroker/adapter-react-v5';

import AdminUtils from '@/helpers/AdminUtils';
import type { InstancesWorker } from '@/Workers/InstancesWorker';
import type { HostsWorker, NotificationAnswer } from '@/Workers/HostsWorker';
import type { LogsWorker } from '@/Workers/LogsWorker';
import type { AdminGuiConfig, NotificationsCount } from '@/types';
import DragWrapper from './DragWrapper';
import CustomDragLayer from './CustomDragLayer';
import { ContextWrapper } from './ContextWrapper';
import CustomPopper from './CustomPopper';
import DrawerItem from './DrawerItem';
import NexoWattNavIcon, { type NexoWattNavIconName } from './NexoWattNavIcon';

export const DRAWER_FULL_WIDTH = 180;
export const DRAWER_COMPACT_WIDTH = 50;
export const DRAWER_EDIT_WIDTH = 250;

function ucFirst(str: string): string {
    return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
}

const styles: Record<string, any> = {
    root: (theme: IobTheme) => ({
        flexShrink: 0,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        display: 'flex',
        flexDirection: 'column',
    }),
    rootFullWidth: {
        width: DRAWER_FULL_WIDTH,
    },
    rootEditWidth: {
        width: DRAWER_EDIT_WIDTH,
    },
    rootCompactWidth: {
        width: DRAWER_COMPACT_WIDTH,
    },
    paper: {
        width: 'inherit',
        overflowX: 'hidden',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
    },
    header: (theme: IobTheme) => ({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 8px 0 8px',
        ...theme.mixins.toolbar,
        justifyContent: 'flex-end',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        background: theme.palette.background.default,
    }),
    headerCompact: {
        padding: 0,
    },
    headerLogout: {
        justifyContent: 'space-between',
    },
    list: {
        paddingTop: 0,
        flex: '1 0 auto',
    },
    icon: {
        width: 20,
        height: 20,
    },
    logoSize: {
        width: 50,
        height: 50,
    },
    brandFrame: {
        minHeight: 52,
        minWidth: 138,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 10px',
        borderRadius: 14,
        border: '1px solid rgba(0,255,136,0.22)',
        background: 'linear-gradient(180deg, rgba(4,14,22,0.96), rgba(3,10,18,0.98))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 18px rgba(0,0,0,0.24)',
    },
    brandImageWrap: {
        height: 50,
        width: 138,
        lineHeight: '50px',
        display: 'flex',
        alignItems: 'center',
    },
    avatarBlock: {
        width: '100%',
        display: 'flex',
        // justifyContent: 'center',
        // marginLeft: 48,
        marginTop: 5,
        marginBottom: 5,
    },
    avatarNotVisible: {
        opacity: 0,
        transition: 'opacity 0.3s',
    },
    avatarVisible: {
        opacity: 1,
    },
    styleVersion: (theme: IobTheme) => ({
        fontSize: 10,
        color: theme.palette.mode === 'dark' ? '#ffffff5e' : '#0000005e',
        alignSelf: 'center',
        ml: '5px',
    }),
    editButton: {
        position: 'sticky',
        bottom: 0,
        right: 0,
        width: 'fit-content',
        marginLeft: 'auto',
        marginTop: 'auto',
        transition: 'opacity 0.5s',
    },
};

export const STATES = {
    opened: 0,
    closed: 1,
    compact: 2,
};

const NEXOWATT_CORE_TAB_TITLES: Record<string, string> = {
    'tab-intro': 'Übersicht',
    'tab-adapters': 'Module',
    'tab-instances': 'Dienste',
    'tab-objects': 'Datenpunkte',
    'tab-enums': 'Struktur',
    'tab-logs': 'Systemlogs',
    'tab-users': 'Zugänge & Rechte',
    'tab-javascript': 'Skripte',
    'tab-hosts': 'System-Hosts',
    'tab-files': 'Dateien',
    'tab-devicemanager': 'Geräte',
};

const NEXOWATT_CORE_TAB_ICONS: Record<string, NexoWattNavIconName> = {
    'tab-intro': 'cockpit',
    'tab-adapters': 'modules',
    'tab-instances': 'services',
    'tab-objects': 'datapoints',
    'tab-enums': 'structure',
    'tab-logs': 'logs',
    'tab-users': 'rights',
    'tab-javascript': 'scripts',
    'tab-hosts': 'hosts',
    'tab-files': 'files',
    'tab-devicemanager': 'devices',
};

function getNexoWattDynamicTabMeta(tab: string): { title?: string; icon?: NexoWattNavIconName } {
    const normalized = tab.toLowerCase();
    if (/^tab-(?:nexowatt-ui|nexowatt-eos|eos-cockpit)(?:-|$)/.test(normalized)) {
        return { title: 'NexoWatt EOS', icon: 'eos' };
    }
    if (/^tab-backitup(?:-|$)/.test(normalized)) {
        return { title: 'System-Notfallsicherung', icon: 'backup' };
    }
    if (/^tab-(?:nexowatt-backup|eos-backup|nexowatt-sicherung)(?:-|$)/.test(normalized)) {
        return { title: 'NexoWatt Sicherung', icon: 'backup' };
    }
    if (/^tab-backup(?:-|$)/.test(normalized)) {
        return { title: 'Sicherung', icon: 'backup' };
    }
    if (/^tab-(?:javascript)(?:-|$)/.test(normalized)) {
        return { title: 'Skripte', icon: 'scripts' };
    }
    if (/^tab-(?:files)(?:-|$)/.test(normalized)) {
        return { title: 'Dateien', icon: 'files' };
    }
    return {};
}

function getNexoWattTabTitle(tab: string, fallback: string): string {
    return NEXOWATT_CORE_TAB_TITLES[tab] || getNexoWattDynamicTabMeta(tab).title || fallback;
}

function getNexoWattTabIcon(tab: string): JSX.Element | undefined {
    const iconName = NEXOWATT_CORE_TAB_ICONS[tab] || getNexoWattDynamicTabMeta(tab).icon;
    return iconName ? <NexoWattNavIcon name={iconName} /> : undefined;
}

const tabsInfo: Record<string, { order: number; icon?: JSX.Element; host?: boolean; instance?: number }> = {
    'tab-intro': { order: 1, icon: getNexoWattTabIcon('tab-intro') },
    'tab-info': { order: 5, host: true },
    'tab-adapters': { order: 10, icon: getNexoWattTabIcon('tab-adapters'), host: true },
    'tab-instances': { order: 15, icon: getNexoWattTabIcon('tab-instances'), host: true },
    'tab-objects': { order: 20, icon: getNexoWattTabIcon('tab-objects') },
    'tab-enums': { order: 25, icon: getNexoWattTabIcon('tab-enums') },
    'tab-devices': { order: 27, host: true },
    'tab-logs': { order: 30, icon: getNexoWattTabIcon('tab-logs'), host: true },
    'tab-scenes': { order: 35 },
    'tab-events': { order: 40 },
    'tab-users': { order: 45, icon: getNexoWattTabIcon('tab-users') },
    'tab-javascript': { order: 50, icon: getNexoWattTabIcon('tab-javascript') },
    'tab-text2command-0': { order: 55, instance: 0 },
    'tab-text2command-1': { order: 56, instance: 1 },
    'tab-text2command-2': { order: 57, instance: 2 },
    'tab-node-red-0': { order: 60, instance: 0 },
    'tab-node-red-1': { order: 61, instance: 1 },
    'tab-node-red-2': { order: 62, instance: 2 },
    'tab-fullcalendar-0': { order: 65, instance: 0 },
    'tab-fullcalendar-1': { order: 66, instance: 1 },
    'tab-fullcalendar-2': { order: 67, instance: 2 },
    'tab-echarts': { order: 70, instance: 2 },
    'tab-eventlist-0': { order: 80, instance: 0 },
    'tab-eventlist-1': { order: 81, instance: 1 },
    'tab-eventlist-2': { order: 82, instance: 2 },
    'tab-hosts': { order: 100, icon: getNexoWattTabIcon('tab-hosts') },
    'tab-files': { order: 110, icon: getNexoWattTabIcon('tab-files') },
    'tab-devicemanager': { order: 120, icon: getNexoWattTabIcon('tab-devicemanager') },
};

export interface AdminTab {
    name: string;
    order: number;
    icon?: string | JSX.Element;
    title?: string;
    visible?: boolean;
    color?: string;
    supportsLoadingMessage?: boolean;
}

interface DrawerProps {
    t: Translate;
    lang: ioBroker.Languages;
    state: 0 | 1 | 2;
    adminGuiConfig: AdminGuiConfig;
    onStateChange: (state: 0 | 1 | 2) => void;
    onLogout: () => void;
    isSecure: boolean;
    currentTab: string;
    themeType: ThemeType;
    socket: AdminConnection;
    versionAdmin: string;
    handleNavigation: (tab: string) => void;
    editMenuList: boolean;
    setEditMenuList: (editMenuList: boolean) => void;

    instancesWorker: InstancesWorker;
    hostsWorker: HostsWorker;
    logsWorker: LogsWorker;

    hostname: string;
    adminInstance: string;
    installed: Record<string, { version: string; ignoreVersion?: string }>;
    hosts: ioBroker.HostObject[];
    repository: Record<string, { icon: string; version: string }>;
    width: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    theme: IobTheme;
    provideTabsInfo: (tabs: AdminTab[]) => void;
}

interface DrawerState {
    tabs: AdminTab[];
    logErrors: number;
    logWarnings: number;
    hostNotifications: NotificationsCount;
    hostsUpdate: number;
    adaptersUpdate: number;
    deviceManagerVisible: boolean;
}

class Drawer extends Component<DrawerProps, DrawerState> {
    private logsHandlerRegistered: boolean;

    private readonly refEditButton: RefObject<HTMLDivElement>;

    private tabsRetryTimer: ReturnType<typeof setTimeout> | null = null;
    private tabsRetryAttempt = 0;
    private drawerUnmounted = false;

    private static isTransientConnectionError(error: unknown): boolean {
        return /notconnected|not connected|connectionerror|close_abnormal|closed_no_status|websocket|timeout|networkerror/i.test(
            String(error || ''),
        );
    }

    private scheduleTabsRetry(update = true): void {
        if (this.drawerUnmounted || this.tabsRetryAttempt >= 6) {
            return;
        }
        const delays = [500, 1_000, 2_000, 4_000, 8_000, 12_000];
        const delay = delays[Math.min(this.tabsRetryAttempt, delays.length - 1)];
        this.tabsRetryAttempt++;
        if (this.tabsRetryTimer) {
            clearTimeout(this.tabsRetryTimer);
        }
        this.tabsRetryTimer = setTimeout(() => {
            this.tabsRetryTimer = null;
            void this.getTabs(update);
        }, delay);
    }

    constructor(props: DrawerProps) {
        super(props);

        this.state = {
            tabs: [],
            logErrors: 0,
            logWarnings: 0,
            hostNotifications: { other: 0, warning: 0 },
            hostsUpdate: Drawer.calculateHostUpdates(this.props.hosts, this.props.repository),
            adaptersUpdate: Drawer.calculateAdapterUpdates(this.props.installed, this.props.repository),
            deviceManagerVisible: false,
        };

        this.refEditButton = React.createRef();
    }

    static getDerivedStateFromProps(props: DrawerProps, state: DrawerState): Partial<DrawerState> | null {
        const hostsUpdate = Drawer.calculateHostUpdates(props.hosts, props.repository);
        const adaptersUpdate = Drawer.calculateAdapterUpdates(props.installed, props.repository);
        if (hostsUpdate !== state.hostsUpdate || adaptersUpdate !== state.adaptersUpdate) {
            return { hostsUpdate, adaptersUpdate };
        }
        return null;
    }

    static calculateHostUpdates(
        hosts: ioBroker.HostObject[],
        repository: Record<string, { icon: string; version: string }>,
    ): number {
        if (hosts && repository) {
            const jsControllerVersion = repository['js-controller']?.version || '';
            let count = 0;
            hosts.forEach(element => {
                if (AdminUtils.updateAvailable(element.common.installedVersion, jsControllerVersion)) {
                    count++;
                }
            });
            return count;
        }
        return 0;
    }

    static calculateAdapterUpdates(
        installed: Record<string, { version: string; ignoreVersion?: string }>,
        repository: Record<string, { icon: string; version: string }>,
    ): number {
        if (installed) {
            let count = 0;

            Object.keys(installed)
                .sort()
                .forEach(element => {
                    const _installed = installed[element];
                    const adapter = repository && repository[element];
                    if (
                        element !== 'js-controller' &&
                        element !== 'hosts' &&
                        _installed?.version &&
                        adapter?.version &&
                        _installed.ignoreVersion !== adapter.version &&
                        AdminUtils.updateAvailable(_installed.version, adapter.version)
                    ) {
                        count++;
                    }
                });

            return count;
        }
        return 0;
    }

    instanceChangedHandler = (): Promise<void> => this.getTabs(true);

    async isDeviceManagerVisible(): Promise<boolean> {
        const instances: Record<string, ioBroker.InstanceObject> = await this.props.instancesWorker.getObjects();
        const result = Object.values(instances).find(it => it?.common?.supportedMessages?.deviceManager);
        return !!result;
    }

    componentDidMount(): void {
        this.props.instancesWorker.registerHandler(this.instanceChangedHandler, true);
        void this.getTabs();

        void this.onNotificationsHandler().then((): void => {
            this.props.hostsWorker.registerNotificationHandler(this.onNotificationsHandler);

            if (!this.logsHandlerRegistered) {
                this.logsHandlerRegistered = true;
                this.props.logsWorker.registerErrorCountHandler(this.onErrorsUpdates);
                this.props.logsWorker.registerWarningCountHandler(this.onWarningsUpdates);
            }
        });
    }

    onNotificationsHandler = (): Promise<void> =>
        this.props.hostsWorker
            .getNotifications()
            .then(notifications => this.calculateWarning(notifications))
            .catch(error => {
                if (!Drawer.isTransientConnectionError(error)) {
                    window.alert(`Cannot get notifications: ${error}`);
                }
            });

    onErrorsUpdates = (logErrors: number): void => {
        this.setState({ logErrors });
    };

    onWarningsUpdates = (logWarnings: number): void => {
        this.setState({ logWarnings });
    };

    calculateWarning = (notifications: Record<string, NotificationAnswer | null>): void => {
        if (!notifications) {
            return;
        }

        const count: NotificationsCount = { warning: 0, other: 0 };

        Object.keys(notifications).forEach(host => {
            if (!notifications[host]?.result?.system) {
                return;
            }

            if (Object.keys(notifications[host].result.system.categories).length) {
                const obj = notifications[host].result.system.categories;

                for (const category of Object.values(obj)) {
                    Object.keys(category.instances).forEach(() =>
                        category.severity === 'alert' ? count.warning++ : count.other++,
                    );
                }
            }
        });

        this.setState({ hostNotifications: count });
    };

    componentWillUnmount(): void {
        this.drawerUnmounted = true;
        if (this.tabsRetryTimer) {
            clearTimeout(this.tabsRetryTimer);
            this.tabsRetryTimer = null;
        }
        this.props.instancesWorker.unregisterHandler(this.instanceChangedHandler);
        this.props.hostsWorker.unregisterNotificationHandler(this.onNotificationsHandler);

        if (this.logsHandlerRegistered) {
            this.logsHandlerRegistered = false;
            this.props.logsWorker.unregisterErrorCountHandler(this.onErrorsUpdates);
            this.props.logsWorker.unregisterWarningCountHandler(this.onWarningsUpdates);
        }
    }

    componentDidUpdate(): void {
        if (!this.isSwipeable() && this.props.state !== STATES.opened && this.props.editMenuList) {
            setTimeout(() => this.props.setEditMenuList(false));
        }
    }

    private getTabsLayoutStateId(): string {
        return `${this.props.adminInstance}.info.uiTabsVisible`;
    }

    private static parseTabsLayout(value: unknown): { name: string; visible: boolean; color?: string }[] | null {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(parsed)) {
                return null;
            }
            const unique = new Set<string>();
            return parsed
                .filter(item => item && typeof item === 'object' && typeof item.name === 'string')
                .map(item => ({
                    name: String(item.name),
                    visible: item.visible !== false,
                    ...(typeof item.color === 'string' ? { color: item.color } : {}),
                }))
                .filter(item => {
                    if (unique.has(item.name)) {
                        return false;
                    }
                    unique.add(item.name);
                    return true;
                });
        } catch {
            return null;
        }
    }

    async getTabs(update?: boolean): Promise<void> {
        try {
            const _instances = await this.props.socket.getCompactInstances(update);
            this.tabsRetryAttempt = 0;
            const instances = _instances as any as Record<string, ioBroker.AdapterCommon>;
            const dynamicTabs: AdminTab[] = [];
            const backupAdapters = new Set(['backitup', 'backup', 'nexowatt-backup', 'eos-backup']);

            if (instances) {
                Object.keys(instances).forEach(id => {
                    const instance = instances[id] as ioBroker.AdapterCommon & { enabled?: boolean };
                    const adapterName = id.replace(/^system\.adapter\./, '').replace(/\.\d+$/, '').toLowerCase();

                    // A backup entry without a running/enabled instance is a dead navigation target.
                    if (backupAdapters.has(adapterName) && instance.enabled !== true) {
                        return;
                    }
                    if (!instance?.adminTab) {
                        return;
                    }

                    let tab = `tab-${id.replace('system.adapter.', '').replace(/\.\d+$/, '')}`;
                    const singleton = instance.adminTab.singleton;
                    let instNum: number | undefined;
                    if (!singleton) {
                        const match = id.match(/\.(\d+)$/);
                        if (match) {
                            instNum = parseInt(match[1], 10);
                            tab += `-${instNum}`;
                        }
                    }
                    if (dynamicTabs.find(item => item.name === tab)) {
                        return;
                    }

                    let title: string;
                    if (instance.adminTab.name) {
                        if (typeof instance.adminTab.name === 'object') {
                            if (instance.adminTab.name[this.props.lang]) {
                                title = instance.adminTab.name[this.props.lang];
                            } else if (instance.adminTab.name.en) {
                                title = this.props.t(instance.adminTab.name.en);
                            } else {
                                title = this.props.t(instance.name);
                            }
                        } else {
                            title = this.props.t(instance.adminTab.name);
                        }
                    } else {
                        title = this.props.t(instance.name);
                    }

                    let obj: AdminTab;
                    if (tabsInfo[tab]) {
                        obj = { name: tab, ...tabsInfo[tab] };
                    } else {
                        obj = {
                            name: tab,
                            order: instance.adminTab.order !== undefined ? instance.adminTab.order : 200,
                            icon: instance.adminTab.icon,
                            supportsLoadingMessage: (instance.adminTab as any).supportsLoadingMessage,
                        };
                    }
                    if (!obj.icon) {
                        obj.icon = `adapter/${instance.name}/${instance.icon}`;
                    } else if (typeof obj.icon !== 'object' && !obj.icon.startsWith('data:image') && !obj.icon.includes('/')) {
                        obj.icon = `adapter/${instance.name}/${obj.icon}`;
                    }
                    obj.title = getNexoWattTabTitle(tab, title);
                    obj.icon = getNexoWattTabIcon(tab) || obj.icon;
                    if (!singleton && instNum) {
                        obj.title += ` ${instNum}`;
                    }
                    dynamicTabs.push(obj);
                });
            }

            const readyToUse = [
                'tab-intro',
                'tab-adapters',
                'tab-instances',
                'tab-logs',
                'tab-files',
                'tab-objects',
                'tab-hosts',
                'tab-users',
            ];
            if (await this.isDeviceManagerVisible()) {
                readyToUse.push('tab-devicemanager');
            }

            const tabNames = Object.keys(tabsInfo).filter(name => readyToUse.includes(name));
            let tabs: AdminTab[] = tabNames.map(name => {
                const obj: AdminTab = { name, ...tabsInfo[name] };
                const defaultTitle = I18n.t(
                    ucFirst(name.replace('tab-', '').replace('-0', '').replace(/-(\d+)$/, ' $1')),
                );
                obj.title = getNexoWattTabTitle(name, defaultTitle);
                obj.icon = getNexoWattTabIcon(name) || obj.icon;
                obj.visible = true;
                return obj;
            });
            tabs = tabs.concat(dynamicTabs).filter(tab => Boolean(tab) && tab.name !== 'tab-enums');
            tabs.forEach(obj => (obj.visible = true));
            tabs.sort((a, b) => {
                if (a.order && b.order) return a.order - b.order;
                if (a.order) return -1;
                if (b.order) return 1;
                return a.name.localeCompare(b.name);
            });

            let tabsVisible: { name: string; visible: boolean; color?: string }[] | null = null;
            try {
                const stored = await this.props.socket.getState(this.getTabsLayoutStateId());
                tabsVisible = Drawer.parseTabsLayout(stored?.val);
            } catch {
                // Missing state on an upgraded installation: read the legacy layout once.
            }
            if (!tabsVisible) {
                try {
                    const systemConfig = await this.props.socket.getCompactSystemConfig();
                    tabsVisible = Drawer.parseTabsLayout(systemConfig.common.tabsVisible) || [];
                } catch {
                    tabsVisible = [];
                }
            }

            tabs.forEach(tab => {
                const stored = tabsVisible?.find(item => item.name === tab.name);
                if (stored) {
                    tab.visible = stored.visible;
                    tab.color = stored.color;
                }
            });
            const order = new Map((tabsVisible || []).map((item, index) => [item.name, index]));
            tabs.sort((a, b) => {
                const aa = order.get(a.name);
                const bb = order.get(b.name);
                if (aa !== undefined && bb !== undefined) return aa - bb;
                if (aa !== undefined) return -1;
                if (bb !== undefined) return 1;
                return 0;
            });

            this.setState({ tabs }, () => this.props.provideTabsInfo(this.state.tabs));
        } catch (error) {
            if (Drawer.isTransientConnectionError(error)) {
                this.scheduleTabsRetry(true);
                return;
            }
            this.tabsRetryAttempt = 0;
            window.alert(`Cannot get instances: ${error}`);
        }
    }

    getHeader(): JSX.Element {
        const { state, handleNavigation } = this.props;

        return (
            <Box
                component="div"
                sx={Utils.getStyle(
                    this.props.theme,
                    styles.header,
                    this.props.state === STATES.opened && this.props.isSecure && styles.headerLogout,
                    !this.isSwipeable() && this.props.state !== STATES.opened && styles.headerCompact,
                )}
            >
                <div
                    style={{
                        ...styles.avatarBlock,
                        ...styles.avatarNotVisible,
                        ...(state === 0 ? styles.avatarVisible : { display: 'none' }),
                    }}
                >
                    <a
                        href="/#tab-intro"
                        onClick={event => { event.preventDefault(); handleNavigation('tab-intro'); }}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                        {this.props.adminGuiConfig.icon ? (
                            <div style={styles.brandFrame}>
                                <div style={styles.brandImageWrap}>
                                    <img
                                        src={this.props.adminGuiConfig.icon}
                                        alt="NexoWatt EOS"
                                        style={{ maxWidth: '100%', maxHeight: '100%', verticalAlign: 'middle' }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={styles.brandFrame}>
                                <Avatar
                                    onClick={() => handleNavigation('tab-intro')}
                                    style={styles.logoSize}
                                    alt="NexoWatt EOS"
                                    src="img/eos/eos-logo.svg"
                                />
                            </div>
                        )}
                    </a>
                    {!this.props.adminGuiConfig.icon && this.props.versionAdmin && (
                        <Typography sx={styles.styleVersion}>v{this.props.versionAdmin}</Typography>
                    )}
                </div>
                <IconButton
                    size="large"
                    onClick={() => {
                        if (this.isSwipeable() || this.props.state === STATES.compact) {
                            this.props.onStateChange(STATES.closed as 1);
                        } else {
                            this.props.onStateChange(STATES.compact as 2);
                        }
                    }}
                >
                    <ChevronLeftIcon />
                </IconButton>
            </Box>
        );
    }

    isSwipeable(): boolean {
        return this.props.width === 'xs' || this.props.width === 'sm';
    }

    tabsEditSystemConfig = async (idx?: number, isVisibility?: boolean, newColor?: string): Promise<void> => {
        const newTabs: AdminTab[] = JSON.parse(JSON.stringify(this.state.tabs)) as AdminTab[];
        if (idx !== undefined && isVisibility) {
            newTabs[idx].visible = !newTabs[idx].visible;
        }
        if (idx !== undefined && newColor !== undefined) {
            if (newColor === null) {
                delete newTabs[idx].color;
            } else {
                newTabs[idx].color = newColor;
            }
        }

        const serialized = JSON.stringify(newTabs.map(({ name, visible, color }) => ({ name, visible, color })));
        if (idx !== undefined && (isVisibility || newColor !== undefined)) {
            this.setState({ tabs: newTabs });
        }
        try {
            // Never write menu preferences to system.config. Changing system.config restarts the
            // running Admin adapter and used to tear down the browser while the pencil dialog saved.
            await this.props.socket.setState(this.getTabsLayoutStateId(), serialized);
        } catch (error) {
            window.alert(`Cannot save navigation layout: ${error}`);
            if (idx !== undefined && (isVisibility || newColor !== undefined)) {
                void this.getTabs(true);
            }
        }
    };


    getNavigationItems(): JSX.Element[] {
        const { tabs, logErrors, logWarnings } = this.state;
        const { currentTab, state, handleNavigation } = this.props;

        const hosts: Record<string, ioBroker.HostObject> = {};
        this.props.hosts.forEach(host => (hosts[host._id] = host));

        return tabs.map((tab, idx) => {
            if (!this.props.editMenuList && !tab.visible) {
                return null;
            }

            if (this.props.adminGuiConfig.admin.menu && this.props.adminGuiConfig.admin.menu[tab.name] === false) {
                return null;
            }

            return (
                <DragWrapper
                    key={tab.name}
                    canDrag={this.props.editMenuList}
                    name={tab.name}
                    iconJSX={
                        tabsInfo[tab.name]?.icon ? (
                            tabsInfo[tab.name].icon
                        ) : (
                            <Icon
                                style={styles.icon}
                                src={tab.icon}
                            />
                        )
                    }
                    _id={tab.name}
                    selected={currentTab === tab.name}
                    tab={tab}
                    compact={!this.isSwipeable() && state !== STATES.opened}
                    badgeContent={logErrors || logWarnings || 0}
                    badgeColor={logErrors ? 'error' : logWarnings ? 'warn' : ''}
                    tabs={tabs}
                    setEndDrag={() => this.tabsEditSystemConfig()}
                    setTabs={(newObj: AdminTab[]) => this.setState({ tabs: newObj })}
                >
                    <DrawerItem
                        key={tab.name}
                        tabName={tab.name}
                        editMenuList={this.props.editMenuList}
                        visible={tab.visible}
                        color={tab.color}
                        editListFunc={(isVisibility, color) => this.tabsEditSystemConfig(idx, isVisibility, color)}
                        compact={!this.isSwipeable() && state !== STATES.opened}
                        onClick={e => {
                            if (e.ctrlKey || e.shiftKey) {
                                void AdminUtils.getHref(
                                    this.props.instancesWorker,
                                    tab.name,
                                    this.props.hostname,
                                    hosts,
                                    this.props.adminInstance,
                                    this.props.themeType,
                                ).then(result => {
                                    if (result.href) {
                                        console.log(result.href);
                                        // Open in new tab
                                        window
                                            .open(
                                                `${window.location.protocol}//${window.location.host}/${result.href}`,
                                                tab.name,
                                            )
                                            .focus();
                                    } else {
                                        handleNavigation(tab.name);
                                    }
                                });
                            } else {
                                handleNavigation(tab.name);
                            }
                        }}
                        icon={
                            tabsInfo[tab.name]?.icon ? (
                                tabsInfo[tab.name].icon
                            ) : (
                                <Icon
                                    src={tab.icon}
                                    style={styles.icon}
                                />
                            )
                        }
                        text={tab.title}
                        selected={currentTab === tab.name}
                        badgeContent={this.badge(tab).content}
                        badgeColor={this.badge(tab).color}
                        badgeAdditionalContent={this.badge(tab)?.additionalContent}
                        badgeAdditionalColor={this.badge(tab)?.additionalColor}
                        theme={this.props.theme}
                    />
                </DragWrapper>
            );
        });
    }

    badge = (
        tab: AdminTab,
    ): {
        content: number;
        color: 'error' | 'warn' | 'primary' | '';
        additionalContent?: number;
        additionalColor?: 'error' | 'secondary' | '';
    } => {
        switch (tab.name) {
            case 'tab-logs': {
                const { logErrors, logWarnings } = this.state;
                return { content: logErrors || logWarnings || 0, color: logErrors ? 'error' : 'warn' };
            }

            case 'tab-adapters':
                return { content: this.state.adaptersUpdate || 0, color: 'primary' };

            case 'tab-hosts':
                return {
                    content: this.state.hostsUpdate || 0,
                    color: 'primary',
                    additionalContent: this.state.hostNotifications.warning + this.state.hostNotifications.other,
                    additionalColor: this.state.hostNotifications.warning > 0 ? 'error' : 'secondary',
                };

            default:
                return {
                    content: 0,
                    color: '',
                    additionalContent: 0,
                    additionalColor: '',
                };
        }
    };

    render(): JSX.Element {
        if (this.isSwipeable()) {
            return (
                <SwipeableDrawer
                    sx={Utils.getStyle(this.props.theme, styles.root, { '&.MuiSwipeableDrawer-paper': styles.paper })}
                    anchor="left"
                    open={this.props.state !== STATES.closed}
                    onClose={() => this.props.onStateChange(STATES.closed as 1)}
                    onOpen={() => this.props.onStateChange(STATES.opened as 0)}
                >
                    <CustomDragLayer theme={this.props.theme} />

                    {this.getHeader()}

                    <List>{this.getNavigationItems()}</List>
                    {this.props.isSecure && (
                        <DrawerItem
                            theme={this.props.theme}
                            compact={!this.isSwipeable() && this.props.state !== STATES.opened}
                            onClick={this.props.onLogout}
                            text={this.props.t('Logout')}
                            icon={<LogoutIcon />}
                        />
                    )}
                    {this.props.adminGuiConfig.admin.menu.editable !== false && this.props.state === STATES.opened && (
                        <div style={styles.editButton}>
                            <CustomPopper
                                editMenuList={this.props.editMenuList}
                                onClick={() => this.props.setEditMenuList(!this.props.editMenuList)}
                            />
                        </div>
                    )}
                </SwipeableDrawer>
            );
        }

        return (
            <MaterialDrawer
                sx={Utils.getStyle(
                    this.props.theme,
                    styles.root,
                    this.props.state !== STATES.opened
                        ? styles.rootCompactWidth
                        : this.props.editMenuList
                          ? styles.rootEditWidth
                          : styles.rootFullWidth,
                    {
                        '& .MuiDrawer-paper': styles.paper,
                    },
                )}
                variant="persistent"
                anchor="left"
                open={this.props.state !== STATES.closed}
                onMouseEnter={() => this.refEditButton.current && (this.refEditButton.current.style.opacity = '1')}
                onMouseLeave={() => this.refEditButton.current && (this.refEditButton.current.style.opacity = '0')}
            >
                <CustomDragLayer theme={this.props.theme} />
                {this.getHeader()}
                <List style={styles.list}>{this.getNavigationItems()}</List>
                {this.props.isSecure && (
                    <DrawerItem
                        theme={this.props.theme}
                        style={{ flexShrink: 0 }}
                        compact={!this.isSwipeable() && this.props.state !== STATES.opened}
                        onClick={this.props.onLogout}
                        text={this.props.t('Logout')}
                        icon={<LogoutIcon />}
                    />
                )}
                {this.props.adminGuiConfig.admin.menu.editable !== false && this.props.state === STATES.opened && (
                    <div
                        style={{ ...styles.editButton, opacity: 0 }}
                        ref={this.refEditButton}
                    >
                        <CustomPopper
                            size="small"
                            editMenuList={this.props.editMenuList}
                            onClick={() => this.props.setEditMenuList(!this.props.editMenuList)}
                        />
                    </div>
                )}
            </MaterialDrawer>
        );
    }
}

Drawer.contextType = ContextWrapper;
export default withWidth()(Drawer);
