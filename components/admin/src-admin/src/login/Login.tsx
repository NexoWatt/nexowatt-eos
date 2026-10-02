import React, { Component, type JSX } from 'react';

import {
    Avatar,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Grid2,
    IconButton,
    Link,
    Paper,
    TextField,
    Typography,
} from '@mui/material';

import { Visibility } from '@mui/icons-material';

import { type IobTheme, I18n, Connection } from '@iobroker/adapter-react-v5';

export interface OAuth2Response {
    access_token: string;
    expires_in: number;
    token_type: 'Bearer' | 'JWT';
    refresh_token: string;
    refresh_token_expires_in: number;
}

const boxShadow = '0 4px 7px 5px rgb(0 0 0 / 14%), 0 3px 1px 1px rgb(0 0 0 / 12%), 0 1px 5px 0 rgb(0 0 0 / 20%)';

const styles: Record<string, any> = {
    root: {
        padding: 10,
        margin: 'auto',
        display: 'flex',
        height: '100%',
        alignItems: 'center',
        borderRadius: 0,
        justifyContent: 'center',
    },
    paper: (theme: IobTheme) => ({
        backgroundColor: theme.palette.background.paper + (theme.palette.background.paper.length < 7 ? 'd' : 'dd'),
        p: '30px 32px 28px',
        overflowY: 'visible',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto',
        minHeight: 0,
        width: 'calc(100% - 48px)',
        maxHeight: 'none',
        maxWidth: 400,
        boxShadow,
    }),
    avatar: (theme: IobTheme): any => ({
        m: 1,
        backgroundColor: theme.palette.mode === 'dark' ? '#111' : '#eee',
        width: 100,
        height: 100,
        '& .MuiAvatar-img': {
            width: 'calc(100% - 4px)',
            height: 'calc(100% - 4px)',
            padding: 2,
        },
    }),
    submit: {
        margin: 8,
    },
    alert: {
        marginTop: 16,
        backgroundColor: '#f44336',
        padding: 8,
        color: '#fff',
        borderRadius: 4,
        fontSize: 16,
    },
    ioBrokerLink: {
        textTransform: 'inherit',
    },
    marginTop: {
        marginTop: 28,
    },
    progress: {
        textAlign: 'center',
    },
};

declare global {
    interface Window {
        loginBackgroundColor: string;
        loginBackgroundImage: string;
        loginLink: string;
        loginMotto: string;
        login: string;
        loginLogo: string;
        loginHideLogo: string;
        loginTitle: string;
        /** If the SSO feature is active, it is set to string 'true' */
        ssoActive: string;
        NEXOWATT_EOS_FIRST_LOGIN?: {
            start: (account: string) => Promise<boolean> | boolean;
            check?: (account: string) => Promise<boolean> | boolean;
        };
    }
}

interface LoginState {
    inProcess: boolean;
    username: string;
    password: string;
    stayLoggedIn: boolean;
    showPassword: boolean;
    error: string;
    loggingIn: boolean;
    firstLoginEligible: boolean;
    firstLoginChecking: boolean;
    firstLoginCheckedAccount: string;
}

export default class Login extends Component<object, LoginState> {
    private readonly passwordRef: React.RefObject<HTMLInputElement>;

    private firstLoginCheckTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: object) {
        super(props);

        const loggingIn = this.authenticateWithRefreshToken();

        this.state = {
            inProcess: false,
            stayLoggedIn: false,
            showPassword: false,
            username: '',
            password: '',
            error: '',
            loggingIn,
            firstLoginEligible: false,
            firstLoginChecking: false,
            firstLoginCheckedAccount: '',
        };

        // apply image
        const body = window.document.body;
        body.style.backgroundColor = window.loginBackgroundColor;
        body.style.backgroundImage = window.loginBackgroundImage;
        body.style.backgroundSize = 'cover';
        this.passwordRef = React.createRef();
    }

    static async processTokenAnswer(stayLoggedIn: boolean, response: Response): Promise<boolean> {
        if (response.ok) {
            const data: OAuth2Response = await response.json();

            if (data?.access_token) {
                // Save expiration time of access token and refresh token
                // Next loaded page with socket will take the ownership of the tokens
                Connection.saveTokensStatic(data, stayLoggedIn);

                // Get href from origin
                // Extract from the URL like "http://localhost:8084/login?href=http://localhost:63342/ioBroker.socketio/example/index.html?_ijt=nqn3c1on9q44elikut4rgr23j8&_ij_reload=RELOAD_ON_SAVE" the href
                const urlObj = new URL(window.location.href);
                const href = urlObj.searchParams.get('href');
                let origin;
                if (href) {
                    origin = href;
                    if (origin.startsWith('#')) {
                        origin = `./${origin}`;
                    }
                } else {
                    origin = './';
                }
                window.location.href = origin;
                return true;
            }
        }
        Connection.deleteTokensStatic();

        return false;
    }

    private authenticateWithRefreshToken(): boolean {
        const tokens = Connection.readTokens();

        if (tokens?.refresh_token) {
            void fetch('../oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=refresh_token&refresh_token=${tokens.refresh_token}&stayloggedin=${tokens.stayLoggedIn}&client_id=ioBroker`,
            })
                .then(async response => {
                    if (!(await Login.processTokenAnswer(tokens.stayLoggedIn, response))) {
                        this.setState({
                            inProcess: false,
                            loggingIn: false,
                        });
                    } else {
                        // In processTokenAnswer the redirect will be done if already logged in
                    }
                })
                .catch(error => {
                    console.error(`Cannot fetch access token: ${error}`);
                    this.setState({
                        inProcess: false,
                        loggingIn: false,
                    });
                });
            return true;
        }

        return false;
    }

    private getManagedFirstLoginAccount(): string {
        return this.state.username.trim().toLowerCase().replace(/^system\.user\./, '');
    }

    private isManagedFirstLoginAccount(): boolean {
        return ['installer', 'guest', 'user'].includes(this.getManagedFirstLoginAccount());
    }

    private isManagedFirstLogin(): boolean {
        const account = this.getManagedFirstLoginAccount();
        return (
            !this.state.password &&
            this.isManagedFirstLoginAccount() &&
            this.state.firstLoginEligible &&
            this.state.firstLoginCheckedAccount === account
        );
    }

    private scheduleFirstLoginEligibilityCheck(): void {
        if (this.firstLoginCheckTimer) {
            clearTimeout(this.firstLoginCheckTimer);
        }
        const account = this.getManagedFirstLoginAccount();
        if (this.state.password || !this.isManagedFirstLoginAccount()) {
            this.setState({
                firstLoginEligible: false,
                firstLoginChecking: false,
                firstLoginCheckedAccount: account,
            });
            return;
        }
        this.setState({
            firstLoginEligible: false,
            firstLoginChecking: true,
            firstLoginCheckedAccount: account,
        });
        this.firstLoginCheckTimer = setTimeout(async () => {
            const currentAccount = this.getManagedFirstLoginAccount();
            if (currentAccount !== account || this.state.password) {
                return;
            }
            try {
                const checker = window.NEXOWATT_EOS_FIRST_LOGIN?.check;
                const eligible = checker ? !!(await checker(account)) : false;
                if (this.getManagedFirstLoginAccount() === account && !this.state.password) {
                    this.setState({
                        firstLoginEligible: eligible,
                        firstLoginChecking: false,
                        firstLoginCheckedAccount: account,
                    });
                }
            } catch {
                this.setState({
                    firstLoginEligible: false,
                    firstLoginChecking: false,
                    firstLoginCheckedAccount: account,
                });
            }
        }, 120);
    }

    componentDidMount(): void {
        // Browser password managers/autofill may populate the account after the first render.
        [80, 300, 900].forEach(delay => setTimeout(() => this.scheduleFirstLoginEligibilityCheck(), delay));
    }

    componentWillUnmount(): void {
        if (this.firstLoginCheckTimer) {
            clearTimeout(this.firstLoginCheckTimer);
        }
    }

    private onLoginAction(): void {
        if (this.isManagedFirstLogin() && window.NEXOWATT_EOS_FIRST_LOGIN?.start) {
            void window.NEXOWATT_EOS_FIRST_LOGIN.start(this.state.username);
            return;
        }
        this.onLogin();
    }

    onLogin(): void {
        this.setState({ inProcess: true, error: '' }, async () => {
            const response = await fetch('../oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `grant_type=password&username=${encodeURIComponent(this.state.username)}&password=${encodeURIComponent(this.state.password)}&stayloggedin=${this.state.stayLoggedIn}&client_id=ioBroker`,
            });
            if (await Login.processTokenAnswer(this.state.stayLoggedIn, response)) {
                // Do not allow entering again as redirection is running
                // this.setState({ inProcess: false });
            } else {
                this.setState({
                    inProcess: false,
                    error: I18n.t('wrongPassword'),
                });
            }
        });
    }

    render(): JSX.Element {
        const link =
            window.loginLink && window.loginLink !== '@@loginLink@@' ? window.loginLink : '#';
        const motto =
            window.loginMotto && window.loginMotto !== '@@loginMotto@@' ? window.loginMotto : 'Energy Operation System';

        if (window.login !== 'true' && window.login !== '@@auth@@') {
            // eslint-disable-next-line no-debugger
            debugger;
            window.location.href = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        }
        const style =
            (window.loginBackgroundColor && window.loginBackgroundColor !== 'inherit') || window.loginBackgroundImage
                ? { background: '#00000000' }
                : {};

        let content: React.JSX.Element;
        if (this.state.loggingIn) {
            content = (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    ...
                </div>
            );
        } else {
            content = (
                <Paper
                    className={`eos-login-card-modern${this.isManagedFirstLogin() ? ' eos-login-first-ready' : ''}${
                        this.state.firstLoginChecking && this.isManagedFirstLoginAccount()
                            ? ' eos-login-first-checking'
                            : ''
                    }`}
                    sx={styles.paper}
                >
                    <Grid2
                        container
                        direction="column"
                        alignItems="center"
                    >
                        {window.loginLogo && window.loginLogo !== '@@loginLogo@@' ? (
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '5px',
                                    padding: '5px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <img
                                    src={window.loginLogo}
                                    alt="logo"
                                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                                />
                            </Box>
                        ) : (
                            (window.loginHideLogo === 'false' || window.loginHideLogo === '@@loginHideLogo@@') && (
                                <Avatar
                                    sx={styles.avatar}
                                    src="img/admin.svg"
                                />
                            )
                        )}
                        <Typography
                            component="h1"
                            variant="h5"
                        >
                            {window.loginTitle && window.loginTitle !== '@@loginTitle@@'
                                ? window.loginTitle
                                : I18n.t('loginTitle')}
                        </Typography>
                        {window.location.search.includes('error') || this.state.error ? (
                            <div style={styles.alert}>{this.state.error || I18n.t('wrongPassword')}</div>
                        ) : null}
                        {/* Keep the familiar compact login page. Installer/guest/user enter their account
                            in the normal login field and leave the password empty only for an authorised first login. */}
                        <TextField
                            variant="outlined"
                            margin="normal"
                            disabled={this.state.inProcess}
                            required
                            value={this.state.username}
                            onChange={e =>
                                this.setState(
                                    {
                                        username: e.target.value,
                                        firstLoginEligible: false,
                                        firstLoginChecking: false,
                                    },
                                    () => this.scheduleFirstLoginEligibilityCheck(),
                                )
                            }
                            onKeyUp={e => {
                                if (e.key === 'Enter' && this.state.username) {
                                    e.preventDefault();
                                    this.passwordRef.current?.focus();
                                }
                            }}
                            fullWidth
                            size="small"
                            id="username"
                            placeholder={`${I18n.t('enterLogin')} *`}
                            slotProps={{ htmlInput: { 'aria-label': I18n.t('enterLogin') } }}
                            name="username"
                            autoComplete="username"
                            autoFocus
                        />
                        <TextField
                            variant="outlined"
                            margin="normal"
                            disabled={this.state.inProcess}
                            required={!this.isManagedFirstLogin()}
                            fullWidth
                            ref={this.passwordRef}
                            value={this.state.password}
                            onChange={e =>
                                this.setState(
                                    {
                                        password: e.target.value,
                                        firstLoginEligible: false,
                                        firstLoginChecking: false,
                                    },
                                    () => this.scheduleFirstLoginEligibilityCheck(),
                                )
                            }
                            onKeyUp={e => {
                                if (e.key === 'Enter' && this.state.username && (this.state.password || this.isManagedFirstLogin())) {
                                    this.onLoginAction();
                                }
                            }}
                            slotProps={{
                                htmlInput: { 'aria-label': I18n.t('enterPassword') },
                                input: {
                                    endAdornment: this.state.password ? (
                                        <IconButton
                                            tabIndex={-1}
                                            aria-label="toggle password visibility"
                                            onClick={() => {
                                                this.setState({ showPassword: !this.state.showPassword }, () => {
                                                    setTimeout(() => this.passwordRef.current?.focus(), 50);
                                                });
                                            }}
                                        >
                                            <Visibility />
                                        </IconButton>
                                    ) : null,
                                },
                            }}
                            size="small"
                            name="password"
                            placeholder={`${I18n.t('enterPassword')} *`}
                            type={this.state.showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                        />
                        <div className="eos-login-first-status eos-login-first-status-native" aria-live="polite" />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    id="stayloggedin"
                                    name="stayloggedin"
                                    value="on"
                                    checked={this.state.stayLoggedIn}
                                    onChange={e => this.setState({ stayLoggedIn: e.target.checked })}
                                    color="primary"
                                    disabled={this.state.inProcess}
                                />
                            }
                            label={I18n.t('Stay signed in')}
                        />
                        <Button
                            type="submit"
                            disabled={this.state.inProcess || !this.state.username || (!this.state.password && !this.isManagedFirstLogin())}
                            onClick={() => this.onLoginAction()}
                            fullWidth
                            variant="contained"
                            color="primary"
                            style={styles.submit}
                        >
                            {this.state.inProcess ? <CircularProgress size={24} /> : I18n.t('login')}
                        </Button>
                        {window.ssoActive === 'true' ? (
                            <Button
                                onClick={() => {
                                    window.location.href = `/sso?redirectUrl=${encodeURIComponent(`${window.origin}/#tab-intro`)}&method=login`;
                                }}
                                fullWidth
                                variant="contained"
                                color="secondary"
                            >
                                {I18n.t('Use Single-Sign On')}
                            </Button>
                        ) : null}
                    </Grid2>
                    <Box style={styles.marginTop}>
                        <Typography
                            variant="body2"
                            color="textSecondary"
                            align="center"
                        >
                            {window.loginLink && window.loginLink !== '@@loginLink@@' ? (
                                <Link
                                    style={styles.ioBrokerLink}
                                    color="inherit"
                                    href={link}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    {motto}
                                </Link>
                            ) : null}
                            {!window.loginLink || window.loginLink === '@@loginLink@@' ? motto : null}
                            {!window.loginLink || window.loginLink === '@@loginLink@@' ? (
                                <Link
                                    style={styles.ioBrokerLink}
                                    color="inherit"
                                    href={link}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                >
                                    NexoWatt EOS
                                </Link>
                            ) : null}
                        </Typography>
                    </Box>
                </Paper>
            );
        }

        return (
            <Paper
                component="main"
                style={{ ...styles.root, ...style }}
            >
                {content}
            </Paper>
        );
    }
}
