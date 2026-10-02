import React from 'react';
import { saveAs } from 'file-saver';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import { Card, CardContent, Button, AppBar, Toolbar, Tooltip, Fab, Box, CssBaseline } from '@mui/material';

import {
    CloudUploadOutlined,
    FormatListBulleted,
    InfoOutlined,
    Search,
    SettingsBackupRestore,
    UploadOutlined,
    StorageOutlined,
    Help,
    School,
    History,
    Alarm,
} from '@mui/icons-material';

import {
    GenericApp,
    I18n,
    AdminConnection,
    ScrollbarStyles,
    type IobTheme,
    type GenericAppProps,
    type GenericAppState,
} from '@iobroker/gui-components';

import logo from './assets/nexowatt-backup.png';
import eosLogo from './assets/nexowatt-eos-logo.png';

import BackupHistory from './Components/BackupHistory';
import GetBackups from './Components/GetBackups';
import GetLogs from './Components/GetLogs';
import UploadBackup from './Components/UploadBackup';
import UploadSettings from './Components/UploadSettings';
import BackupNow from './Components/BackupNow';
import SourceSelector from './Components/SourceSelector';
import Restore from './Components/Restore';

import enLang from './i18n/en.json';
import deLang from './i18n/de.json';
import ruLang from './i18n/ru.json';
import ptLang from './i18n/pt.json';
import nlLang from './i18n/nl.json';
import frLang from './i18n/fr.json';
import itLang from './i18n/it.json';
import esLang from './i18n/es.json';
import plLang from './i18n/pl.json';
import ukLang from './i18n/uk.json';
import zhCnLang from './i18n/zh-cn.json';

declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        grey: true;
    }
}

const styles: Record<string, any> = {
    root: {},
    tabContent: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px)',
        overflow: 'auto',
    },
    tabContentIFrame: {
        padding: 10,
        height: 'calc(100% - 64px - 48px - 20px - 38px)',
        overflow: 'auto',
    },
    headerArea: {
        backgroundImage: 'linear-gradient(120deg, #03111C 0%, #06322F 58%, #075A48 100%)',
        boxShadow: '0 6px 22px rgba(0,0,0,0.36), 0 0 24px rgba(1,188,105,0.10)',
        borderBottom: '2px solid #01BC69',
    },
    header: {
        fontSize: '0.95rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        lineHeight: '110%',
        display: 'flex',
        alignItems: 'center',
        p: '0.7rem 1rem',
        borderRadius: '10px',
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
    },
    headerColored: {
        color: '#FFFFFF',
        backgroundImage: 'linear-gradient(120deg, #06322F 0%, #008C56 100%)',
    },
    headerDark: {
        color: '#FFFFFF',
        backgroundImage: 'none',
        backgroundColor: 'rgba(1,188,105,0.075)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(1,188,105,0.22)',
    },
    headerLight: {
        color: '#000',
        backgroundImage: 'none',
        backgroundColor: '#F3F8F6',
        border: '1px solid rgba(0,140,86,0.16)',
    },
    subHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#FFF',
    },
    cardHeader: {
        fontSize: '1.2rem',
        lineHeight: '46px',
        fontWeight: '600',
        letterSpacing: '-0.01em',
        marginBottom: 8,
    },
    headerIcon: {
        height: 24,
        width: 24,
        fontSize: 24,
        float: 'left',
        margin: '0 10px 0 5px',
    },
    historyIcon: {
        height: 20,
        width: 20,
        fontSize: 20,
        marginTop: 2,
        flexShrink: 0,
        opacity: 0.75,
    },
    icon: {
        color: '#fff',
        height: 46,
        width: 46,
        fontSize: 24,
        padding: 12,
        borderRadius: '50%',
        boxSizing: 'content-box',
        filter: 'none',
    },
    iconDiv: {
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-start',
    },
    iconDivLight: {},
    iconDivDark: {},
    textDiv: {
        flex: 1,
        minWidth: 0,
    },
    cardInner: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 48,
        padding: '22px 24px',
        height: '100%',
        boxSizing: 'border-box',
    },
    cardContent: (theme: IobTheme): React.CSSProperties => ({
        padding: 0,
        height: '100%',
        borderRadius: '14px',
        boxShadow:
            theme.palette.mode === 'dark'
                ? '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)'
                : '0 1px 2px rgba(0,70,50,0.06), 0 6px 16px rgba(0,70,50,0.10)',
        backgroundImage: 'none',
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(3,17,28,0.88)' : '#FFFFFF',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(1,188,105,0.20)' : '1px solid rgba(0,140,86,0.12)',
    }),
    card: {
        borderRadius: '14px',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 26px rgba(0,0,0,0.34), 0 0 22px rgba(1,188,105,0.08)',
        },
    },
    label: {
        fontWeight: 600,
        fontSize: '0.78em',
        opacity: 0.65,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        marginBottom: 1,
    },
    value: {
        fontSize: 'clamp(0.8em, 0.55em + 0.6vw, 0.95em)',
        fontWeight: 500,
    },
    footer: {
        fontSize: '0.9rem',
        fontWeight: 400,
        lineHeight: '110%',
        textAlign: 'center',
        marginTop: 8,
        position: 'fixed',
        bottom: 0,
        width: '100%',
        overflow: 'overlay',
        zIndex: 997,
        padding: '5px 0 5px 0',
        margin: '0 0 0 -8px',
        cursor: 'pointer',
        boxShadow: '0 -2px 10px 0 rgba(0,0,0,0.08)',
        textDecoration: 'none',
        opacity: 0.85,
        transition: 'opacity 0.15s ease',
    },
    footerColored: {
        color: '#FFF',
        backgroundImage: 'linear-gradient(90deg, #06322F 0%, #008C56 100%)',
    },
    footerDark: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(6px)',
        color: '#FFF',
    },
    footerLight: {
        backgroundColor: '#F3F8F6',
        color: '#008C56',
    },
    buttonWidth: {
        width: '100%',
    },
    helpButton: {
        width: 38,
        height: 38,
        marginLeft: 8,
        backgroundColor: 'rgba(1,188,105,0.13)',
        color: '#fff',
        boxShadow: 'none',
    },
    button: {
        borderRadius: '10px',
        textTransform: 'none',
        fontWeight: 600,
    },
    list: {
        listStyleType: 'disc',
        padding: '0 0 0 18px',
        margin: 0,
        overflow: 'visible',
    },
    listItem: {
        marginBottom: 8,
        lineHeight: 1.4,
    },
    infoListItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
};

interface AppState extends GenericAppState {
    showBackupHistory: boolean;
    showGetBackups: boolean;
    showRestore: any;
    showUploadBackup: boolean;
    backupSource: string;
    connectType: string;
    myAlive: boolean;
    restoreIfWait: number;
    iobrokerLastTime: string;
    iobrokerNextTime: string;
    ccuLastTime: string;
    ccuNextTime: string;
    systemInfo: { systemOS: string } | null;
    showUploadSettings: boolean;
    showLogs: null | { fileName: string; timestamp: number; index: number };
}

export default class App extends GenericApp<GenericAppProps, AppState> {
    constructor(props: GenericAppProps) {
        const extendedProps = { ...props };
        extendedProps.encryptedFields = ['pass'];
        // @ts-expect-error fix later
        extendedProps.Connection = AdminConnection;
        extendedProps.translations = {
            en: enLang,
            de: deLang,
            ru: ruLang,
            pt: ptLang,
            nl: nlLang,
            fr: frLang,
            it: itLang,
            es: esLang,
            pl: plLang,
            uk: ukLang,
            'zh-cn': zhCnLang,
        };

        extendedProps.sentryDSN = window.sentryDSN;
        // extendedProps.socket = {
        //     protocol: 'http:',
        //     host: '192.168.178.45',
        //     port: 8081,
        // };

        super(props, extendedProps);

        this.state = {
            ...this.state,
            showBackupHistory: false,
            showGetBackups: false,
            showRestore: null,
            showUploadBackup: false,
            backupSource: window.localStorage.getItem('NexoWattEOSBackup.backupSource') || 'local',
            connectType: this.state.native.connectType,
            myAlive: false,
            restoreIfWait: 5000,
        };
    }

    static translateTime(time: string | undefined): string {
        if (time === 'none') {
            return '--';
        }
        if (time === 'No backups yet') {
            return I18n.t('No backups yet');
        }
        if (typeof time === 'string' && time.startsWith('error')) {
            return time.replace('error', I18n.t('Error'));
        }
        return time || '';
    }

    async onConnectionReady(): Promise<void> {
        const myAlive = await this.socket.getState(`system.adapter.${this.adapterName}.${this.instance}.alive`);
        const newState: Partial<AppState> = { myAlive: !!myAlive?.val };

        if (this.state.native.minimalEnabled) {
            const iobrokerLastTime = await this.socket.getState(
                `${this.adapterName}.${this.instance}.history.iobrokerLastTime`,
            );
            const iobrokerNextTime: ioBroker.State | null | undefined = await this.socket.getState(
                `${this.adapterName}.${this.instance}.info.iobrokerNextTime`,
            );
            newState.iobrokerNextTime = App.translateTime(iobrokerNextTime?.val as string | undefined);
            newState.iobrokerLastTime = App.translateTime(iobrokerLastTime?.val as string | undefined);
        }

        if (this.state.native.ccuEnabled) {
            const ccuLastTime = await this.socket.getState(`${this.adapterName}.${this.instance}.history.ccuLastTime`);
            const ccuNextTime = await this.socket.getState(`${this.adapterName}.${this.instance}.info.ccuNextTime`);
            newState.ccuLastTime = App.translateTime(ccuLastTime?.val as string | undefined);
            newState.ccuNextTime = App.translateTime(ccuNextTime?.val as string | undefined);
        }

        await this.socket.subscribeState(`system.adapter.${this.adapterName}.${this.instance}.alive`, this.onAlive);
        await this.socket.subscribeObject(`system.adapter.${this.adapterName}.${this.instance}`, this.onSettings);
        await this.socket.subscribeState(
            `${this.adapterName}.${this.instance}.history.iobrokerLastTime`,
            this.onHistory,
        );
        await this.socket.subscribeState(`${this.adapterName}.${this.instance}.info.iobrokerNextTime`, this.onHistory);
        await this.socket.subscribeState(`${this.adapterName}.${this.instance}.history.ccuLastTime`, this.onHistory);
        await this.socket.subscribeState(`${this.adapterName}.${this.instance}.info.ccuNextTime`, this.onHistory);

        if (myAlive) {
            newState.systemInfo = await this.socket.sendTo(
                `${this.adapterName}.${this.instance}`,
                'getSystemInfo',
                null,
            );
            newState.restoreIfWait =
                newState.systemInfo?.systemOS === 'docker'
                    ? 10000
                    : newState.systemInfo?.systemOS === 'win'
                      ? 18000
                      : 5000;
        }

        this.setState(newState as AppState);
    }

    onSettings = (id: string, obj: ioBroker.Object | null | undefined): void => {
        if (obj && id === `system.adapter.${this.adapterName}.${this.instance}`) {
            this.setState({ native: (obj as ioBroker.InstanceObject).native });
        }
    };

    onHistory = (id: string, state: ioBroker.State | null | undefined): void => {
        if (!state) {
            return;
        }
        if (
            id === `${this.adapterName}.${this.instance}.history.iobrokerLastTime` &&
            state.val !== this.state.iobrokerLastTime
        ) {
            this.setState({ iobrokerLastTime: App.translateTime(state.val as string) });
        } else if (
            id === `${this.adapterName}.${this.instance}.history.iobrokerNextTime` &&
            state.val !== this.state.iobrokerNextTime
        ) {
            this.setState({ iobrokerNextTime: App.translateTime(state.val as string) });
        } else if (
            id === `${this.adapterName}.${this.instance}.history.ccuLastTime` &&
            state.val !== this.state.ccuLastTime
        ) {
            this.setState({ ccuLastTime: App.translateTime(state.val as string) });
        } else if (
            id === `${this.adapterName}.${this.instance}.history.ccuNextTime` &&
            state.val !== this.state.ccuNextTime
        ) {
            this.setState({ ccuNextTime: App.translateTime(state.val as string) });
        }
    };

    async componentWillUnmount(): Promise<void> {
        super.componentWillUnmount();
        this.socket.unsubscribeState(`system.adapter.${this.adapterName}.${this.instance}.alive`, this.onAlive);
        await this.socket.unsubscribeObject(`system.adapter.${this.adapterName}.${this.instance}`, this.onSettings);
        this.socket.unsubscribeState(`${this.adapterName}.${this.instance}.history.iobrokerLastTime`, this.onHistory);
        this.socket.unsubscribeState(`${this.adapterName}.${this.instance}.info.iobrokerNextTime`, this.onHistory);
        this.socket.unsubscribeState(`${this.adapterName}.${this.instance}.history.ccuLastTime`, this.onHistory);
        this.socket.unsubscribeState(`${this.adapterName}.${this.instance}.info.ccuNextTime`, this.onHistory);
    }

    onAlive = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `system.adapter.${this.adapterName}.${this.instance}.alive`) {
            if (!!state?.val !== this.state.myAlive) {
                this.setState({ myAlive: !!state?.val });
            }
        }
    };

    renderBackupInformation(): React.JSX.Element {
        return (
            <Card sx={styles.card}>
                <CardContent sx={styles.cardContent}>
                    <div style={styles.cardInner}>
                        <div
                            style={{
                                ...styles.iconDiv,
                                ...(this.state.themeType === 'dark' ? styles.iconDivDark : styles.iconDivLight),
                            }}
                        >
                            <InfoOutlined
                                style={styles.icon}
                                sx={{ backgroundColor: 'rgba(0,175,120,0.92)' }}
                            />
                        </div>
                        <div style={styles.textDiv}>
                            <div style={styles.cardHeader}>{I18n.t('Backup Information')}</div>
                            <ul style={{ ...styles.list, listStyleType: 'none', padding: 0 }}>
                                {this.state.native.minimalEnabled && (
                                    <li style={styles.infoListItem}>
                                        <History style={styles.historyIcon} />
                                        <div>
                                            <div style={styles.label}>{I18n.t('Last NexoWatt EOS backup:')}</div>
                                            <div style={styles.value}>{this.state.iobrokerLastTime}</div>
                                        </div>
                                    </li>
                                )}
                                {this.state.native.minimalEnabled && (
                                    <li style={styles.infoListItem}>
                                        <Alarm style={styles.historyIcon} />
                                        <div>
                                            <div style={styles.label}>{I18n.t('Next NexoWatt EOS backup:')}</div>
                                            <div style={styles.value}>{this.state.iobrokerNextTime}</div>
                                        </div>
                                    </li>
                                )}
                                {this.state.native.ccuEnabled && (
                                    <li style={styles.infoListItem}>
                                        <History style={styles.historyIcon} />
                                        <div>
                                            <div style={styles.label}>{I18n.t('Last CCU backup:')}</div>
                                            <div style={styles.value}>{this.state.ccuLastTime}</div>
                                        </div>
                                    </li>
                                )}
                                {this.state.native.ccuEnabled && (
                                    <li style={styles.infoListItem}>
                                        <Alarm style={styles.historyIcon} />
                                        <div>
                                            <div style={styles.label}>{I18n.t('Next CCU backup:')}</div>
                                            <div style={styles.value}>{this.state.ccuNextTime}</div>
                                        </div>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    renderActivatedStorageOptions(): React.JSX.Element {
        const options = [
            {
                name: 'cifsEnabled',
                label: this.state.native.connectType === 'SDCard' ? 'SD card' : `NAS (${this.state.native.connectType})`,
            },
            { name: 'ftpEnabled', label: 'FTP' },
            { name: 'dropboxEnabled', label: 'Dropbox' },
            { name: 'onedriveEnabled', label: 'OneDrive' },
            { name: 'googledriveEnabled', label: 'Google Drive' },
            { name: 'webdavEnabled', label: 'WebDAV' },
        ];
        return (
            <Card sx={styles.card}>
                <CardContent sx={styles.cardContent}>
                    <div style={styles.cardInner}>
                        <div
                            style={{
                                ...styles.iconDiv,
                                ...(this.state.themeType === 'dark' ? styles.iconDivDark : styles.iconDivLight),
                            }}
                        >
                            <StorageOutlined
                                style={styles.icon}
                                sx={{ backgroundColor: 'rgba(1,188,105,0.92)' }}
                            />
                        </div>
                        <div style={styles.textDiv}>
                            <div style={styles.cardHeader}>{I18n.t('Activated storage options')}</div>
                            <ul style={styles.list}>
                                {options.map(
                                    option =>
                                        this.state.native[option.name] && (
                                            <li
                                                key={option.name}
                                                style={{ ...styles.listItem, fontSize: '0.95em' }}
                                            >
                                                {I18n.t(option.label)}
                                            </li>
                                        ),
                                )}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    renderActivatedBackupOptions(): React.JSX.Element {
        const options = [
            { name: 'jarvisEnabled', label: 'Jarvis backup' },
            { name: 'minimalEnabled', label: 'NexoWatt EOS' },
            { name: 'ccuEnabled', label: 'Homematic CCU backup' },
            { name: 'redisEnabled', label: 'Save Redis state' },
            { name: 'javascriptsEnabled', label: 'Javascripts backup' },
            { name: 'zigbeeEnabled', label: 'Zigbee Backup' },
            { name: 'esphomeEnabled', label: 'ESPHome' },
            { name: 'zigbee2mqttEnabled', label: 'Zigbee2MQTT' },
            { name: 'noderedEnabled', label: 'Node-Red backup' },
            { name: 'yahkaEnabled', label: 'Yahka (Homekit) backup' },
            { name: 'historyEnabled', label: 'History Backup' },
            { name: 'influxDBEnabled', label: 'InfluxDB backup' },
            { name: 'mySqlEnabled', label: 'MySql backup' },
            { name: 'sqliteEnabled', label: 'SQLite backup' },
            { name: 'grafanaEnabled', label: 'Grafana backup' },
            { name: 'pgSqlEnabled', label: 'PostgreSQL Backup' },
        ];
        return (
            <Card sx={styles.card}>
                <CardContent sx={styles.cardContent}>
                    <div style={styles.cardInner}>
                        <div
                            style={{
                                ...styles.iconDiv,
                                ...(this.state.themeType === 'dark' ? styles.iconDivDark : styles.iconDivLight),
                            }}
                        >
                            <CloudUploadOutlined
                                style={styles.icon}
                                sx={{ backgroundColor: 'rgba(2,76,54,0.96)' }}
                            />
                        </div>
                        <div style={styles.textDiv}>
                            <div style={styles.cardHeader}>{I18n.t('Activated backup options')}</div>
                            <ul style={styles.list}>
                                {options.map(
                                    option =>
                                        this.state.native[option.name] && (
                                            <li
                                                key={option.name}
                                                style={{ ...styles.listItem, fontSize: '0.95em' }}
                                            >
                                                {I18n.t(option.label)}
                                            </li>
                                        ),
                                )}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    renderUploadSettingsDialog(): React.JSX.Element | null {
        if (!this.state.showUploadSettings) {
            return null;
        }
        return (
            <UploadSettings
                onClose={() => this.setState({ showUploadSettings: false })}
                socket={this.socket}
                themeType={this.state.themeType}
                adapterName={this.adapterName}
                instance={this.instance}
            />
        );
    }

    render(): React.JSX.Element {
        if (!this.state.loaded) {
            return (
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={this.state.theme}>
                        <div
                            aria-label="NexoWatt EOS wird geladen"
                            style={{
                                minHeight: '100vh',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 24,
                                background: 'radial-gradient(circle at 50% 40%, #0c3040 0%, #061725 55%, #020b12 100%)',
                            }}
                        >
                            <img src={eosLogo} alt="NexoWatt EOS" style={{ width: 'min(720px, 82vw)', height: 'auto' }} />
                            <div style={{ color: '#5ee0c2', fontWeight: 600, letterSpacing: '0.12em' }}>
                                SYSTEM WIRD GELADEN
                            </div>
                        </div>
                    </ThemeProvider>
                </StyledEngineProvider>
            );
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <CssBaseline />
                    <ScrollbarStyles theme={this.state.theme} />
                    <div
                        className="App"
                        style={{
                            background: this.state.theme.palette.background.default,
                            color: this.state.theme.palette.text.primary,
                        }}
                    >
                        <AppBar
                            style={styles.headerArea}
                            position="static"
                            enableColorOnDark
                        >
                            <Toolbar>
                                <img
                                    src={logo}
                                    alt="logo"
                                    style={{ height: 48, marginRight: 16 }}
                                />
                                <div>
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 20,
                                            color: '#fff',
                                            letterSpacing: '-0.01em',
                                        }}
                                    >
                                        NexoWatt EOS Backup
                                    </div>
                                    <div
                                        style={{
                                            color: 'rgba(255,255,255,0.85)',
                                            fontStyle: 'normal',
                                            fontSize: 'clamp(0.7em, 0.7em + 0.6vw, 1em)',
                                        }}
                                    >
                                        {I18n.t('Backup your System …')}
                                    </div>
                                </div>
                            </Toolbar>
                            <div
                                style={{
                                    display: 'inline-block',
                                    position: 'absolute',
                                    right: 10,
                                    top: 12,
                                }}
                            >
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title="Wiki"
                                    style={{ marginRight: '0.2rem' }}
                                >
                                    <Fab
                                        style={styles.helpButton}
                                        onClick={() =>
                                            window.open('https://www.nexowatt.com', '_blank')
                                        }
                                    >
                                        <School />
                                    </Fab>
                                </Tooltip>
                                <Tooltip
                                    slotProps={{ popper: { sx: { pointerEvents: 'none' } } }}
                                    title="Show adapter documentation"
                                    style={{ marginRight: '0.2rem' }}
                                >
                                    <Fab
                                        style={styles.helpButton}
                                        onClick={() => {
                                            window.open(
                                                'https://www.nexowatt.com',
                                                '_blank',
                                            );
                                        }}
                                    >
                                        <Help />
                                    </Fab>
                                </Tooltip>
                            </div>
                        </AppBar>
                        <div
                            style={{
                                width: 'calc(100% - 16px)',
                                height: 'calc(100% - 104px)',
                                overflow: 'auto',
                                padding: 8,
                            }}
                        >
                            <Box
                                component="div"
                                sx={{
                                    m: '1rem 0 1.25rem 0',
                                    ...styles.header,
                                    ...(this.state.theme.name === 'light' ? styles.headerLight : undefined),
                                    ...(this.state.theme.name === 'colored' ? styles.headerColored : undefined),
                                    ...(this.state.themeType === 'dark' ? styles.headerDark : undefined),
                                }}
                            >
                                <InfoOutlined style={styles.headerIcon} />
                                <span>{I18n.t('Backup Information')}</span>
                            </Box>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                                    gap: 16,
                                    minHeight: 260,
                                    gridAutoRows: '1fr',
                                }}
                            >
                                {this.renderBackupInformation()}
                                {this.renderActivatedStorageOptions()}
                                {this.renderActivatedBackupOptions()}
                            </div>
                            <Box
                                component="div"
                                sx={{
                                    m: '1.5rem 0 1.25rem 0',
                                    ...styles.header,
                                    ...(this.state.theme.name === 'light' ? styles.headerLight : undefined),
                                    ...(this.state.theme.name === 'colored' ? styles.headerColored : undefined),
                                    ...(this.state.themeType === 'dark' ? styles.headerDark : undefined),
                                }}
                            >
                                <CloudUploadOutlined style={styles.headerIcon} />
                                <span>{I18n.t('System backup')}</span>
                            </Box>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                                    gap: 16,
                                    justifyContent: 'space-evenly',
                                    alignContent: 'center',
                                    justifyItems: 'stretch',
                                    gridAutoRows: '1fr',
                                }}
                            >
                                {this.state.myAlive && this.state.native.minimalEnabled ? (
                                    <BackupNow
                                        style={{ ...styles.buttonWidth, width: '100%', ...styles.button }}
                                        color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                        oContext={{
                                            adapterName: this.adapterName,
                                            socket: this.socket,
                                            instance: this.instance,
                                            themeType: this.state.themeType,
                                            dateFormat:
                                                this.socket.systemConfig?.common.dateFormat || 'DD.MM.YYYY HH:mm',
                                            isFloatComma: this.socket.systemConfig?.common.isFloatComma || false,
                                            theme: this.state.theme,
                                            _themeName: this.state.themeName,
                                            systemConfig:
                                                this.socket.systemConfig?.common || ({} as ioBroker.SystemConfigCommon),
                                            onCommandRunning: (_ignore: boolean): void => {},
                                            forceUpdate: (): void => {},
                                        }}
                                        alive
                                        onError={(): void => {}}
                                        schema={{
                                            backUpType: 'iobroker',
                                            label: 'NexoWatt EOS start backup',
                                            i18n: false,
                                            variant: 'contained',
                                            type: 'custom',
                                            url: '',
                                            name: '',
                                        }}
                                        changed={false}
                                        common={this.state.common || {}}
                                        themeName={this.state.themeName}
                                        data={{}}
                                        originalData={{}}
                                        onChange={(): void => {}}
                                    />
                                ) : (
                                    <Button
                                        style={{ width: '100%' }}
                                        sx={styles.button}
                                        disabled
                                        color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                        variant="contained"
                                        endIcon={<CloudUploadOutlined />}
                                    >
                                        {I18n.t('NexoWatt EOS start backup')}
                                    </Button>
                                )}
                                {this.state.myAlive && this.state.native.ccuEnabled ? (
                                    <BackupNow
                                        style={{ ...styles.buttonWidth, width: '100%', ...styles.button }}
                                        oContext={{
                                            adapterName: this.adapterName,
                                            socket: this.socket,
                                            instance: this.instance,
                                            themeType: this.state.themeType,
                                            dateFormat:
                                                this.socket.systemConfig?.common.dateFormat || 'DD.MM.YYYY HH:mm',
                                            isFloatComma: this.socket.systemConfig?.common.isFloatComma || false,
                                            theme: this.state.theme,
                                            _themeName: this.state.themeName,
                                            systemConfig:
                                                this.socket.systemConfig?.common || ({} as ioBroker.SystemConfigCommon),
                                            onCommandRunning: (_ignore: boolean): void => {},
                                            forceUpdate: (): void => {},
                                        }}
                                        color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                        alive
                                        schema={{
                                            backUpType: 'ccu',
                                            label: 'Homematic start backup',
                                            i18n: false,
                                            variant: 'contained',
                                            type: 'custom',
                                            url: '',
                                            name: '',
                                        }}
                                        onError={(): void => {}}
                                        changed={false}
                                        common={this.state.common || {}}
                                        themeName={this.state.themeName}
                                        data={{}}
                                        originalData={{}}
                                        onChange={(): void => {}}
                                    />
                                ) : (
                                    <Button
                                        style={{ width: '100%' }}
                                        sx={styles.button}
                                        disabled
                                        color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                        variant="contained"
                                        endIcon={<CloudUploadOutlined />}
                                    >
                                        {I18n.t('Homematic start backup')}
                                    </Button>
                                )}
                                <Button
                                    style={{ width: '100%' }}
                                    sx={styles.button}
                                    onClick={() => this.setState({ showBackupHistory: true })}
                                    variant="contained"
                                    color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                    endIcon={<FormatListBulleted />}
                                >
                                    {I18n.t('Backup history')}
                                </Button>
                                <Button
                                    style={{ width: '100%' }}
                                    sx={styles.button}
                                    variant="contained"
                                    color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                    onClick={async () => {
                                        const obj = await this.socket.getObject(
                                            `system.adapter.${this.adapterName}.${this.instance}`,
                                        );

                                        if (obj && obj.common && obj.common.news) {
                                            delete obj.common.news;
                                        }
                                        if (obj && obj.common && obj.common.titleLang) {
                                            delete obj.common.titleLang;
                                        }
                                        if (obj && obj.common && obj.common.desc) {
                                            delete obj.common.desc;
                                        }
                                        const blob = new Blob([JSON.stringify(obj)], {
                                            type: 'application/json;charset=utf-8',
                                        });
                                        const now = new Date();
                                        saveAs(
                                            blob,
                                            `${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}-${this.adapterName}.${this.instance}.json`,
                                        );
                                    }}
                                    endIcon={<CloudUploadOutlined />}
                                >
                                    {I18n.t('Save BackItUp settings')}
                                </Button>
                            </div>
                            <Box
                                component="div"
                                sx={{
                                    m: '1.5rem 0px 1rem 0px',
                                    ...styles.header,
                                    ...(this.state.theme.name === 'light' ? styles.headerLight : undefined),
                                    ...(this.state.theme.name === 'colored' ? styles.headerColored : undefined),
                                    ...(this.state.themeType === 'dark' ? styles.headerDark : undefined),
                                }}
                            >
                                <SettingsBackupRestore style={styles.headerIcon} />
                                <span>{I18n.t('Restore')}</span>
                            </Box>
                            <div
                                style={{
                                    width: '100%',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                                    gap: 16,
                                    justifyItems: 'stretch',
                                    justifyContent: 'space-evenly',
                                    alignContent: 'center',
                                    alignItems: 'stretch',
                                    gridAutoRows: '1fr',
                                    marginBottom: '1rem',
                                }}
                            >
                                <SourceSelector
                                    value={this.state.backupSource}
                                    data={this.state.native}
                                    onChange={backupSource => {
                                        window.localStorage.setItem('NexoWattEOSBackup.backupSource', backupSource);
                                        this.setState({ backupSource });
                                    }}
                                />
                                <Button
                                    style={{ width: '100%', marginTop: '0.5rem' }}
                                    sx={styles.button}
                                    onClick={() => this.setState({ showGetBackups: true })}
                                    disabled={!this.state.myAlive}
                                    variant="contained"
                                    color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                    endIcon={<Search />}
                                >
                                    {I18n.t('Get list')}
                                </Button>
                                <Button
                                    style={{ width: '100%', marginTop: '0.5rem' }}
                                    sx={styles.button}
                                    onClick={() => this.setState({ showUploadBackup: true })}
                                    variant="contained"
                                    color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                    endIcon={<UploadOutlined />}
                                >
                                    {I18n.t('Upload Backup File')}
                                </Button>
                                <Button
                                    style={{ width: '100%', marginTop: '0.5rem' }}
                                    sx={styles.button}
                                    variant="contained"
                                    color={this.state.themeType === 'dark' ? 'primary' : 'grey'}
                                    onClick={() => this.setState({ showUploadSettings: true })}
                                    endIcon={<SettingsBackupRestore />}
                                >
                                    {I18n.t('Restore BackItUp settings')}
                                </Button>
                            </div>
                            {this.renderError()}
                            <div
                                style={{
                                    ...styles.footer,
                                    ...(this.state.theme.name === 'light' ? styles.footerLight : undefined),
                                    ...(this.state.theme.name === 'colored' ? styles.footerColored : undefined),
                                    ...(this.state.themeType === 'dark' ? styles.footerDark : undefined),
                                }}
                                onClick={() => {
                                    try {
                                        window.parent.postMessage(
                                            `goto:tab-instances/config/system.adapter.nexowatt-backup.${this.instance}`,
                                            '*',
                                        );
                                    } catch {
                                        // ignore
                                    }
                                }}
                            >
                                {I18n.t('All backup settings can be changed in the adapter configuration of BackItUp.')}
                            </div>
                        </div>
                    </div>
                    {this.state.showBackupHistory ? (
                        <BackupHistory
                            onClose={() => this.setState({ showBackupHistory: false })}
                            onLogs={(fileName, timestamp, index) =>
                                this.setState({ showLogs: { fileName, timestamp, index } })
                            }
                            socket={this.socket}
                            themeType={this.state.themeType}
                            themeBreakpoints={this.state.theme.breakpoints.down}
                            adapterName={this.adapterName}
                            instance={this.instance}
                        />
                    ) : null}
                    {this.state.showGetBackups ? (
                        <GetBackups
                            onClose={() => this.setState({ showGetBackups: false })}
                            onRestore={(location, object, fileName) =>
                                this.setState({ showRestore: { location, object, fileName }, showGetBackups: false })
                            }
                            socket={this.socket}
                            themeType={this.state.themeType}
                            themeBreakpoints={this.state.theme.breakpoints.down}
                            adapterName={this.adapterName}
                            instance={this.instance}
                            backupSource={this.state.backupSource}
                            connectType={this.state.native.connectType}
                            allowDownload
                        />
                    ) : null}
                    {this.state.showLogs ? (
                        <GetLogs
                            onClose={() => this.setState({ showLogs: null })}
                            backupLog={this.state.showLogs}
                            socket={this.socket}
                            themeType={this.state.themeType}
                            adapterName={this.adapterName}
                            themeBreakpoints={this.state.theme.breakpoints.down}
                            instance={this.instance}
                        />
                    ) : null}
                    {this.state.showUploadBackup ? (
                        <UploadBackup
                            onClose={() => this.setState({ showUploadBackup: false })}
                            socket={this.socket}
                            themeType={this.state.themeType}
                            adapterName={this.adapterName}
                            instance={this.instance}
                        />
                    ) : null}
                    {this.state.showRestore ? (
                        <Restore
                            alive={this.state.myAlive}
                            location={this.state.showRestore.location}
                            fileName={this.state.showRestore.fileName}
                            onClose={() => this.setState({ showRestore: null })}
                            socket={this.socket}
                            themeType={this.state.themeType}
                            adapterName={this.adapterName}
                            instance={this.instance}
                            restoreIfWait={this.state.restoreIfWait}
                        />
                    ) : null}
                    {this.renderUploadSettingsDialog()}
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
