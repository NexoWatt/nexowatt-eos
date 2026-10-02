import React, { Component, type JSX } from 'react';

import { DatePicker, LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';

import {
    Dialog,
    DialogTitle,
    DialogContent,
    FormControlLabel,
    Checkbox,
    TextField,
    DialogActions,
    Button,
    IconButton,
    InputLabel,
    MenuItem,
    FormControl,
    Select,
    Grid2,
    Fab,
    Typography,
    Switch,
    Autocomplete,
    Tooltip,
} from '@mui/material';

import {
    ShowChart as ChartIcon,
    Close as IconCancel,
    Check as IconCheck,
    Fullscreen as FullscreenIcon,
    FullscreenExit as FullscreenExitIcon,
    Info as InfoIcon,
} from '@mui/icons-material';

import { type AdminConnection, type IobTheme, type ThemeType, type Translate } from '@iobroker/adapter-react-v5';

import ObjectChart from './ObjectChart';
import { localeMap } from './utils';
import Editor from '../Editor';

const styles: Record<string, any> = {
    formControl: {
        minWidth: 100,
    },
    quality: {
        width: 'calc(100% - 88px)',
    },
    expire: {
        ml: 1,
        width: 80,
    },
    readOnly: {
        backgroundColor: '#b74848',
    },
    readOnlyText: {
        color: '#b74848',
        marginLeft: 8,
    },
    wrapperButton: {
        '@media screen and (max-width: 465px)': {
            '& *': {
                fontSize: 12,
            },
        },
        '@media screen and (max-width: 380px)': {
            '& *': {
                fontSize: 11,
            },
        },
    },
    ackCheckbox: {
        marginLeft: 4,
    },
    dialog: {
        minHeight: (window as any).clientHeight - 50 > 500 ? 500 : (window as any).clientHeight - 50,
    },
    tooltip: {
        pointerEvents: 'none',
    },
};

interface NumberValidationOptions {
    value: unknown;
    common: ioBroker.StateCommon;
}

interface ObjectBrowserValueProps {
    /** State type */
    type: 'states' | 'string' | 'number' | 'boolean' | 'json' | ioBroker.CommonType | 'file';
    /** State role */
    role: string;
    /** common.states */
    states: Record<string, string> | null;
    /** The state value */
    value: any;
    /** If expert mode is enabled */
    expertMode: boolean;
    onClose: (newValue?: { val: ioBroker.StateValue; ack: boolean; q: number; expire: number | undefined; editorType?: string }) => void | Promise<void>;
    /** Configured theme */
    themeType: ThemeType;
    theme: IobTheme;
    socket: AdminConnection;
    defaultHistory: string;
    dateFormat: string;
    object: ioBroker.StateObject;
    isFloatComma: boolean;
    t: Translate;
    lang: ioBroker.Languages;
    width: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

interface ObjectBrowserValueState {
    /** The state value */
    targetValue: any;
    /** State type */
    type: 'states' | 'string' | 'number' | 'boolean' | 'json';
    chart: boolean;
    chartEnabled: boolean;
    fullScreen: boolean;
    /** If input is invalid, set value button is disabled */
    valid: boolean;
    jsonError?: boolean;
    writing: boolean;
}

class ObjectBrowserValue extends Component<ObjectBrowserValueProps, ObjectBrowserValueState> {
    static hasStatesOptions(states: ObjectBrowserValueProps['states']): boolean {
        return !!states && typeof states === 'object' && !Array.isArray(states) && Object.keys(states).length > 0;
    }

    /** The state value */
    private readonly propsValue: any;

    /** Chart start date */
    private readonly chartFrom: number;

    /** Ack flag of the state */
    private ack: boolean;

    /** TextField Ref */
    private readonly inputRef = React.createRef<any>();

    /** State quality */
    private q: ioBroker.STATE_QUALITY[keyof ioBroker.STATE_QUALITY];

    /** Expiration of the state */
    private expire: number;

    constructor(props: ObjectBrowserValueProps) {
        super(props);

        const policy = (window as any).NEXOWATT_EOS_MANUAL_WRITE_POLICY;
        const hasStatesOptions = ObjectBrowserValue.hasStatesOptions(this.props.states);
        const prepared = policy?.prepareEditor
            ? policy.prepareEditor(this.props.object, this.props.value)
            : { editorType: hasStatesOptions ? 'states' : this.props.type || typeof this.props.value, value: this.props.value };

        let type = (hasStatesOptions ? 'states' : prepared.editorType) as 'states' | 'string' | 'number' | 'boolean' | 'json';
        let value = prepared.value;
        this.propsValue = value;

        if (type === 'json' && typeof value !== 'string') {
            value = JSON.stringify(value == null ? null : value, null, 2);
            this.propsValue = value;
        } else if (type === 'number' && value == null) {
            value = '';
        } else if (type === 'string' && value == null) {
            value = '';
        }

        this.state = {
            type,
            chart: false,
            chartEnabled:
                ((window as any)._localStorage || window.localStorage).getItem('App.chartSetValue') !== 'false',
            fullScreen: ((window as any)._localStorage || window.localStorage).getItem('App.fullScreen') === 'true',
            targetValue: value,
            /** If input is invalid, set value button is disabled */
            valid: true,
            jsonError: false,
            writing: false,
        };

        this.ack = false;
        this.q = 0;
        this.expire = 0;

        this.inputRef = React.createRef();

        this.chartFrom = Date.now() - 3_600_000 * 2;
    }

    componentDidMount(): void {
        if (
            this.props.defaultHistory &&
            this.props.object?.common?.custom &&
            this.props.object.common.custom[this.props.defaultHistory]?.enabled
        ) {
            void this.props.socket
                .getState(`system.adapter.${this.props.defaultHistory}.alive`)
                .then((state: ioBroker.State | null | undefined) => this.setState({ chart: !!state?.val }));
        }

        setTimeout(() => {
            if (this.inputRef?.current) {
                const el = this.inputRef.current;
                const value = el.value || '';
                const origType = el.type;

                // type number cannot be selected, so we perform a short workaround
                if (el.type === 'number') {
                    el.type = 'text';
                }

                el.setSelectionRange(0, value.length);

                if (origType === 'number') {
                    el.type = origType;
                }
            }
        }, 200);
    }

    static parseBoolean(value: unknown): boolean {
        if (value === true || value === 1) {
            return true;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes';
        }
        return false;
    }

    async onUpdate(e: React.KeyboardEvent | React.MouseEvent): Promise<void> {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (this.state.writing) {
            return;
        }
        if (this.props.object.common?.write === false) {
            window.alert(`Cannot write state "${this.props.object._id}": common.write=false`);
            return;
        }

        try {
            const policy = (window as any).NEXOWATT_EOS_MANUAL_WRITE_POLICY;
            const value = policy?.parseEditorValue
                ? policy.parseEditorValue(this.props.object, this.state.type, this.state.targetValue)
                : this.state.targetValue;

            this.setState({ writing: true });
            await Promise.resolve(
                this.props.onClose({
                    val: value,
                    ack: this.ack,
                    q: this.q,
                    expire: parseInt(this.expire as any as string, 10) || undefined,
                    editorType: this.state.type,
                }),
            );
        } catch (error) {
            window.alert(`Cannot write state "${this.props.object._id}": ${error instanceof Error ? error.message : error}`);
            this.setState({ writing: false });
        }
    }

    /**
     * Check if a number value is valid according to the objects common properties
     *
     * @param options value and common information
     */
    static isNumberValid(options: NumberValidationOptions): boolean {
        const { common, value } = options;

        if (value === '') {
            return false;
        }

        const numVal = Number(typeof value === 'string' ? value.replace(',', '.') : value);

        if (Number.isNaN(numVal)) {
            return false;
        }

        if (typeof common.min === 'number' && numVal < common.min) {
            return false;
        }

        return !(typeof common.max === 'number' && numVal > common.max);
    }

    /**
     * Render time picker component for date type
     */
    renderTimePicker(): JSX.Element {
        return (
            <LocalizationProvider
                adapterLocale={localeMap[this.props.lang]}
                dateAdapter={AdapterDateFns}
            >
                <DatePicker
                    value={Number(this.state.targetValue) as any as Date}
                    onChange={value => {
                        if (!value) {
                            return;
                        }
                        this.setState({ targetValue: Math.round(value.getTime()) });
                    }}
                />

                <TimePicker
                    value={Number(this.state.targetValue) as any as Date}
                    views={['hours', 'minutes', 'seconds']}
                    onChange={value => {
                        if (!value) {
                            return;
                        }

                        this.setState({ targetValue: Math.round(value.getTime()) });
                    }}
                />
            </LocalizationProvider>
        );
    }

    renderChart(): JSX.Element {
        return (
            <ObjectChart
                t={this.props.t}
                isFloatComma={this.props.isFloatComma}
                showJumpToEchart={false}
                lang={this.props.lang}
                socket={this.props.socket}
                obj={this.props.object}
                themeType={this.props.themeType}
                theme={this.props.theme}
                from={this.chartFrom}
                end={Date.now()}
                noToolbar
                defaultHistory={this.props.defaultHistory}
                customsInstances={[]}
                objects={undefined}
                historyInstance={''}
            />
        );
    }

    static checkJsonError(value: string): boolean {
        try {
            JSON.parse(value);
            return false;
        } catch {
            return true;
        }
    }

    renderJsonEditor(): JSX.Element {
        return (
            <Editor
                error={this.state.jsonError}
                editValueMode
                themeType={this.props.themeType}
                defaultValue={(this.state.targetValue ?? '').toString()}
                onChange={(newValue: string) =>
                    this.setState({
                        targetValue: newValue,
                        jsonError: ObjectBrowserValue.checkJsonError(newValue),
                    })
                }
            />
        );
    }

    renderStates(): JSX.Element | null {
        if (!ObjectBrowserValue.hasStatesOptions(this.props.states)) {
            return null;
        }
        if (
            this.props.type === 'number' &&
            this.props.object.common.max !== undefined &&
            this.props.object.common.min !== undefined
        ) {
            const options = Object.keys(this.props.states).map(key => ({
                label: this.props.states[key],
                value: key,
            }));

            const currentKey =
                this.state.targetValue && typeof this.state.targetValue === 'object'
                    ? (this.state.targetValue as any).value
                    : this.state.targetValue;
            const selectedOption =
                options.find(option => String(option.value) === String(currentKey ?? '')) ?? this.state.targetValue ?? '';

            return (
                <Autocomplete
                    style={styles.formControl}
                    disablePortal
                    value={selectedOption as any}
                    options={options}
                    noOptionsText=""
                    freeSolo
                    isOptionEqualToValue={(option, value) =>
                        String(option?.value ?? option) === String((value as any)?.value ?? value)
                    }
                    getOptionLabel={option =>
                        option?.label || (option !== undefined && option !== null ? option.toString() : '')
                    }
                    onChange={(e, value) => this.setState({ targetValue: value })}
                    onInputChange={(e, value, reason) => {
                        if (reason === 'input') {
                            this.setState({ targetValue: value });
                        }
                    }}
                    onKeyUp={e => e.key === 'Enter' && this.onUpdate(e)}
                    renderInput={params => (
                        <TextField
                            {...params}
                            label={this.props.t('Value')}
                            variant="standard"
                        />
                    )}
                />
            );
        }
        return (
            <FormControl
                variant="standard"
                style={styles.formControl}
            >
                <InputLabel>{this.props.t('Value')}</InputLabel>
                <Select
                    variant="standard"
                    value={
                        this.state.targetValue == null
                            ? ''
                            : typeof this.state.targetValue === 'object'
                              ? ((this.state.targetValue as any).value ?? '')
                              : String(this.state.targetValue)
                    }
                    onChange={e => this.setState({ targetValue: e.target.value })}
                >
                    {Object.keys(this.props.states).map((key, i) => (
                        <MenuItem
                            key={i}
                            value={key}
                        >
                            {this.props.states[key]}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        );
    }

    render(): JSX.Element {
        const hasStatesOptions = ObjectBrowserValue.hasStatesOptions(this.props.states);

        const ackCheckbox = (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                    style={{
                        ...styles.formControl,
                        ...(!this.props.expertMode ? styles.ackCheckbox : undefined),
                    }}
                    control={
                        <Checkbox
                            defaultChecked={false}
                            onChange={e => (this.ack = e.target.checked)}
                        />
                    }
                    label={this.props.t('Acknowledged')}
                />
                <Tooltip
                    title={this.props.t('Acknowledged explanation')}
                    slotProps={{ popper: { sx: styles.tooltip } }}
                >
                    <InfoIcon color="primary" />
                </Tooltip>
            </div>
        );

        return (
            <Dialog
                className="eos-object-value-dialog"
                open={!0}
                maxWidth={
                    this.state.type === 'number' || this.state.type === 'boolean' || this.state.type === 'states'
                        ? this.state.chart && this.state.chartEnabled
                            ? 'lg'
                            : undefined
                        : 'md'
                }
                fullWidth={
                    (this.state.type === 'json' && this.state.fullScreen) ||
                    (this.state.type !== 'number' && this.state.type !== 'boolean' && this.state.type !== 'states') ||
                    (this.state.chart && this.state.chartEnabled)
                }
                fullScreen={this.state.type === 'json' && this.state.fullScreen}
                onClose={() => this.props.onClose()}
                aria-labelledby="edit-value-dialog-title"
                aria-describedby="edit-value-dialog-description"
                sx={{
                    zIndex: 10000,
                    '& .MuiDialog-paper': this.state.type === 'json' ? styles.dialog : undefined,
                }}
            >
                <DialogTitle id="edit-value-dialog-title">
                    {this.props.t('Write value')}
                    {this.props.object.common?.write === false ? (
                        <span style={styles.readOnlyText}>({this.props.t('read only')})</span>
                    ) : null}
                    {/* this.state.chart ? <div style={{flexGrow: 1}}/> : null */}
                    {this.state.chart ? (
                        <Fab
                            style={{ float: 'right' }}
                            size="small"
                            color={this.state.chartEnabled ? 'primary' : 'default'}
                            onClick={() => {
                                ((window as any)._localStorage || window.localStorage).setItem(
                                    'App.chartSetValue',
                                    this.state.chartEnabled ? 'false' : 'true',
                                );
                                this.setState({ chartEnabled: !this.state.chartEnabled });
                            }}
                        >
                            <ChartIcon />
                        </Fab>
                    ) : null}
                    {this.state.type === 'json' ? (
                        <IconButton
                            style={{ float: 'right' }}
                            onClick={() => {
                                ((window as any)._localStorage || window.localStorage).setItem(
                                    'App.fullScreen',
                                    this.state.fullScreen ? 'false' : 'true',
                                );
                                this.setState({ fullScreen: !this.state.fullScreen });
                            }}
                        >
                            {this.state.fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        </IconButton>
                    ) : null}
                </DialogTitle>
                <DialogContent>
                    <form
                        noValidate
                        autoComplete="off"
                        onSubmit={() => false}
                        style={{ ...styles.dialogForm, height: '100%' }}
                    >
                        <Grid2
                            container
                            direction="row"
                            spacing={2}
                            style={{ height: '100%' }}
                        >
                            <Grid2
                                size={{ xs: this.state.chart && this.state.chartEnabled ? 6 : 12 }}
                                style={{ height: '100%' }}
                            >
                                <Grid2
                                    container
                                    direction="column"
                                    spacing={2}
                                    style={{ marginTop: 0, height: '100%' }}
                                >
                                    {this.props.expertMode ? (
                                        <Grid2>
                                            <Grid2
                                                container
                                                direction="row"
                                                spacing={2}
                                                style={{ marginTop: 0 }}
                                            >
                                                {this.props.expertMode ? (
                                                    <Grid2>
                                                        <FormControl style={styles.formControl}>
                                                            <InputLabel style={{ marginTop: 10, marginLeft: -14 }}>
                                                                {this.props.t('Value type')}
                                                            </InputLabel>
                                                            <Select
                                                                variant="standard"
                                                                value={this.state.type}
                                                                onChange={e => {
                                                                    this.setState(
                                                                        {
                                                                            type: e.target.value as
                                                                                | 'states'
                                                                                | 'string'
                                                                                | 'number'
                                                                                | 'boolean'
                                                                                | 'json',
                                                                            valid:
                                                                                e.target.value === 'number'
                                                                                    ? ObjectBrowserValue.isNumberValid({
                                                                                          value: this.state.targetValue,
                                                                                          common: this.props.object
                                                                                              .common,
                                                                                      })
                                                                                    : true,
                                                                            jsonError: false,
                                                                        },
                                                                        () => {
                                                                            if (this.state.type === 'json') {
                                                                                this.setState({
                                                                                    targetValue: (
                                                                                        this.state.targetValue || ''
                                                                                    ).toString(),
                                                                                    jsonError:
                                                                                        ObjectBrowserValue.checkJsonError(
                                                                                            (
                                                                                                this.state
                                                                                                    .targetValue || ''
                                                                                            ).toString(),
                                                                                        ),
                                                                                });
                                                                            }
                                                                        },
                                                                    );
                                                                }}
                                                            >
                                                                <MenuItem value="string">String</MenuItem>
                                                                <MenuItem value="number">Number</MenuItem>
                                                                <MenuItem value="boolean">Boolean</MenuItem>
                                                                <MenuItem value="json">JSON/Object</MenuItem>
                                                                {hasStatesOptions ? (
                                                                    <MenuItem value="states">States</MenuItem>
                                                                ) : null}
                                                            </Select>
                                                        </FormControl>
                                                    </Grid2>
                                                ) : null}
                                                {this.state.type === 'json' ? <Grid2 flex={1}></Grid2> : null}
                                            </Grid2>
                                        </Grid2>
                                    ) : null}
                                    <Grid2
                                        flex={this.state.type === 'json' && this.state.fullScreen ? 1 : undefined}
                                        style={{ paddingTop: 0 }}
                                    >
                                        {this.state.type === 'boolean' ? (
                                            <Typography
                                                component="div"
                                                style={
                                                    this.props.expertMode
                                                        ? {
                                                              marginTop: 20,
                                                              width: '100%',
                                                              backgroundColor:
                                                                  this.props.themeType === 'dark'
                                                                      ? '#595959'
                                                                      : '#dadada',
                                                              borderRadius: 5,
                                                              padding: 5,
                                                          }
                                                        : undefined
                                                }
                                            >
                                                <Grid2
                                                    component="label"
                                                    container
                                                    alignItems="center"
                                                    spacing={1}
                                                >
                                                    <Grid2 style={{ marginRight: 10 }}>{this.props.t('Value')}:</Grid2>
                                                    <Grid2>FALSE</Grid2>
                                                    <Grid2>
                                                        <Switch
                                                            autoFocus
                                                            checked={ObjectBrowserValue.parseBoolean(this.state.targetValue)}
                                                            onKeyUp={e => e.key === 'Enter' && this.onUpdate(e)}
                                                            onChange={e =>
                                                                this.setState({ targetValue: e.target.checked })
                                                            }
                                                        />
                                                    </Grid2>
                                                    <Grid2>TRUE</Grid2>
                                                </Grid2>
                                            </Typography>
                                        ) : this.state.type === 'number' ? (
                                            <TextField
                                                variant="standard"
                                                fullWidth
                                                autoFocus
                                                error={!this.state.valid}
                                                type="text"
                                                slotProps={{
                                                    htmlInput: {
                                                        inputMode: 'decimal',
                                                        step: this.props.object.common.step,
                                                        min: this.props.object.common.min,
                                                        max: this.props.object.common.max,
                                                    },
                                                }}
                                                inputRef={this.inputRef}
                                                helperText={this.props.t(
                                                    'Press ENTER to write the value, when focused',
                                                )}
                                                value={(this.state.targetValue ?? '').toString()}
                                                label={
                                                    this.props.t('Value') +
                                                    (this.props.object.common.min !== undefined ||
                                                    this.props.object.common.unit === '%'
                                                        ? `, ${this.props.t('min:')} ${this.props.object.common.min !== undefined ? this.props.object.common.min : 0}`
                                                        : '') +
                                                    (this.props.object.common.max !== undefined ||
                                                    this.props.object.common.unit === '%'
                                                        ? `, ${this.props.t('max:')} ${this.props.object.common.max !== undefined ? this.props.object.common.max : 100}`
                                                        : '')
                                                }
                                                onKeyUp={e => e.key === 'Enter' && this.state.valid && this.onUpdate(e)}
                                                onChange={e => {
                                                    this.setState({
                                                        targetValue: e.target.value,
                                                        valid: ObjectBrowserValue.isNumberValid({
                                                            value: e.target.value,
                                                            common: this.props.object.common,
                                                        }),
                                                    });
                                                }}
                                            />
                                        ) : this.state.type === 'json' ? (
                                            this.renderJsonEditor()
                                        ) : this.state.type === 'states' ? (
                                            this.renderStates()
                                        ) : (
                                            <TextField
                                                variant="standard"
                                                fullWidth
                                                inputRef={this.inputRef}
                                                autoFocus
                                                helperText={this.props.t(
                                                    'Press CTRL+ENTER to write the value, when focused',
                                                )}
                                                label={this.props.t('Value')}
                                                multiline
                                                onKeyDown={e => e.ctrlKey && e.key === 'Enter' && this.onUpdate(e)}
                                                defaultValue={this.propsValue.toString()}
                                                onChange={e => this.setState({ targetValue: e.target.value })}
                                            />
                                        )}
                                    </Grid2>

                                    {(this.props.role === 'date' || this.props.role?.startsWith('date.')) &&
                                    this.state.type === 'number' ? (
                                        <Grid2
                                            style={{ display: 'flex', gap: '5px' }}
                                            size={{ xs: 6 }}
                                        >
                                            {this.renderTimePicker()}
                                        </Grid2>
                                    ) : null}

                                    {this.props.expertMode ? <Grid2>{ackCheckbox}</Grid2> : null}

                                    {this.props.expertMode ? (
                                        <Grid2>
                                            <FormControl
                                                variant="standard"
                                                style={styles.quality}
                                            >
                                                <InputLabel>{this.props.t('Quality')}</InputLabel>
                                                <Select
                                                    variant="standard"
                                                    defaultValue={0}
                                                    onChange={e =>
                                                        (this.q = Number(
                                                            e.target.value,
                                                        ) as ioBroker.STATE_QUALITY[keyof ioBroker.STATE_QUALITY])
                                                    }
                                                >
                                                    <MenuItem value={0x00}>0x00 - good</MenuItem>

                                                    <MenuItem value={0x01}>0x01 - general problem</MenuItem>
                                                    <MenuItem value={0x02}>0x02 - no connection problem</MenuItem>

                                                    <MenuItem value={0x10}>
                                                        0x10 - substitute value from controller
                                                    </MenuItem>
                                                    <MenuItem value={0x20}>0x20 - substitute initial value</MenuItem>
                                                    <MenuItem value={0x40}>
                                                        0x40 - substitute value from device or instance
                                                    </MenuItem>
                                                    <MenuItem value={0x80}>
                                                        0x80 - substitute value from sensor
                                                    </MenuItem>

                                                    <MenuItem value={0x11}>0x11 - general problem by instance</MenuItem>
                                                    <MenuItem value={0x41}>0x41 - general problem by device</MenuItem>
                                                    <MenuItem value={0x81}>0x81 - general problem by sensor</MenuItem>

                                                    <MenuItem value={0x12}>0x12 - instance not connected</MenuItem>
                                                    <MenuItem value={0x42}>0x42 - device not connected</MenuItem>
                                                    <MenuItem value={0x82}>0x82 - sensor not connected</MenuItem>

                                                    <MenuItem value={0x44}>0x44 - device reports error</MenuItem>
                                                    <MenuItem value={0x84}>0x84 - sensor reports error</MenuItem>
                                                </Select>
                                            </FormControl>
                                            <TextField
                                                variant="standard"
                                                title={this.props.t('0 - no expiration')}
                                                sx={{ '&.MuiTextField-root': styles.expire }}
                                                label={this.props.t('Expire')}
                                                type="text"
                                                slotProps={{
                                                    htmlInput: {
                                                        inputMode: 'decimal',
                                                        min: 0,
                                                    },
                                                }}
                                                helperText={this.props.t('in seconds')}
                                                defaultValue={this.expire}
                                                onChange={e => (this.expire = Number(e.target.value))}
                                            />
                                        </Grid2>
                                    ) : null}
                                </Grid2>
                            </Grid2>
                            {this.state.chart && this.state.chartEnabled && this.state.type !== 'json' ? (
                                <Grid2
                                    size={{ xs: 6 }}
                                    style={{ minHeight: 300 }}
                                    sx={{ display: { sm: 'none', md: 'inline-block' } }}
                                >
                                    {this.renderChart()}
                                </Grid2>
                            ) : null}
                        </Grid2>
                    </form>
                </DialogContent>
                <DialogActions sx={styles.wrapperButton}>
                    {!this.props.expertMode ? ackCheckbox : null}
                    {!this.props.expertMode ? <div style={{ flexGrow: 1 }} /> : null}
                    <Button
                        variant="contained"
                        disabled={!this.state.valid || !!this.state.jsonError || this.state.writing || this.props.object.common?.write === false}
                        onClick={e => this.onUpdate(e)}
                        color="primary"
                        startIcon={this.props.width !== 'xs' ? <IconCheck /> : undefined}
                        style={this.props.object.common?.write === false ? styles.readOnly : undefined}
                    >
                        {this.props.width !== 'xs' ? (this.state.writing ? this.props.t('Please wait...') : this.props.t('Set value')) : <IconCheck fontSize="large" />}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.props.onClose()}
                        color="grey"
                        startIcon={this.props.width !== 'xs' ? <IconCancel /> : undefined}
                    >
                        {this.props.width !== 'xs' ? this.props.t('Cancel') : <IconCancel fontSize="large" />}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default ObjectBrowserValue;
