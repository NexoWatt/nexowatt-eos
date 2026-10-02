'use strict';

const utils = require('@iobroker/adapter-core');

class EEBusAdapter extends utils.Adapter {
    constructor(options) {
        super({
            ...options,
            name: 'eebus',
        });

        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.log.info('NexoWatt EEBus Adapter started (datapoint-only version).');

        try {
            await this.ensureStates();
            await this.setStateAsync('info.connection', { val: false, ack: true });
            this.log.info('All datapoints created. No EEBus communication implemented yet.');
        } catch (err) {
            this.log.error('Error while creating datapoints: ' + err.message);
        }
    }

    async ensureStates() {
        await this.setObjectNotExistsAsync('info.connection', {
            type: 'state',
            common: {
                name: 'Connection to EEBus gateway',
                type: 'boolean',
                role: 'indicator.connected',
                read: true,
                write: true,
                def: false,
            },
            native: {},
        });

        const imsysStates = {
            'imsys.powerActive': {
                name: 'Imsys active power',
                unit: 'W',
                role: 'value.power',
            },
            'imsys.powerReactive': {
                name: 'Imsys reactive power',
                unit: 'var',
                role: 'value.power.reactive',
            },
            'imsys.energyImportTotal': {
                name: 'Energy import total',
                unit: 'kWh',
                role: 'value.energy',
            },
            'imsys.energyExportTotal': {
                name: 'Energy export total',
                unit: 'kWh',
                role: 'value.energy',
            },
            'imsys.voltageL1': {
                name: 'Voltage L1',
                unit: 'V',
                role: 'value.voltage',
            },
            'imsys.voltageL2': {
                name: 'Voltage L2',
                unit: 'V',
                role: 'value.voltage',
            },
            'imsys.voltageL3': {
                name: 'Voltage L3',
                unit: 'V',
                role: 'value.voltage',
            },
            'imsys.currentL1': {
                name: 'Current L1',
                unit: 'A',
                role: 'value.current',
            },
            'imsys.currentL2': {
                name: 'Current L2',
                unit: 'A',
                role: 'value.current',
            },
            'imsys.currentL3': {
                name: 'Current L3',
                unit: 'A',
                role: 'value.current',
            },
            'imsys.frequency': {
                name: 'Grid frequency',
                unit: 'Hz',
                role: 'value.frequency',
            },
            'imsys.tariffCurrent': {
                name: 'Current tariff index',
                unit: '',
                role: 'value',
            },
            'imsys.tariffName': {
                name: 'Current tariff name',
                unit: '',
                role: 'text',
                type: 'string',
            },
            'imsys.rawJson': {
                name: 'Raw EEBus / Imsys JSON',
                unit: '',
                role: 'json',
                type: 'string',
            },
        };

        for (const [id, info] of Object.entries(imsysStates)) {
            const type = info.type || 'number';
            await this.setObjectNotExistsAsync(id, {
                type: 'state',
                common: {
                    name: info.name,
                    type,
                    role: info.role,
                    unit: info.unit,
                    read: true,
                    write: true,
                    def: type === 'number' ? 0 : '',
                },
                native: {},
            });
        }

        const utilityStates = {
            'utility.maxPowerLimit': {
                name: 'Maximum allowed power (import)',
                unit: 'W',
                role: 'value.power',
            },
            'utility.allowedPowerExport': {
                name: 'Maximum allowed power (export)',
                unit: 'W',
                role: 'value.power',
            },
            'utility.controlMode': {
                name: 'Utility control mode',
                unit: '',
                role: 'value',
                type: 'number',
                states: {
                    0: 'normal',
                    1: 'reduced',
                    2: 'off',
                },
                def: 0,
            },
            'utility.supplyState': {
                name: 'Supply state',
                unit: '',
                role: 'value',
                type: 'number',
                states: {
                    0: 'normal',
                    1: 'limited',
                    2: 'disconnected',
                },
                def: 0,
            },
            'utility.demandResponseLevel': {
                name: 'Demand response level',
                unit: '',
                role: 'value',
            },
            'utility.lastCommand': {
                name: 'Last command from utility',
                unit: '',
                role: 'text',
                type: 'string',
            },
            'utility.commandTimestamp': {
                name: 'Timestamp of last command',
                unit: '',
                role: 'date',
                type: 'number',
            },
        };

        for (const [id, info] of Object.entries(utilityStates)) {
            const type = info.type || 'number';
            const common = {
                name: info.name,
                type,
                role: info.role,
                unit: info.unit,
                read: true,
                write: true,
                def: info.def !== undefined ? info.def : (type === 'number' ? 0 : ''),
            };
            if (info.states) common.states = info.states;

            await this.setObjectNotExistsAsync(id, {
                type: 'state',
                common,
                native: {},
            });
        }
    }

    async onStateChange(id, state) {
        if (!state) return;
        if (!id || !id.startsWith(this.namespace + '.')) return;

        const shortId = id.substring(this.namespace.length + 1);
        this.log.debug(`State ${shortId} changed: ${state.val} (ack=${state.ack})`);

        if (!state.ack) {
            this.log.info(`External write to ${shortId}: ${state.val}`);
        }
    }

    onUnload(callback) {
        try {
            this.log.info('Shutting down NexoWatt EEBus adapter...');
            callback();
        } catch (e) {
            this.log.error('Error during unload: ' + e.message);
            callback();
        }
    }
}

if (require.main !== module) {
    module.exports = (options) => new EEBusAdapter(options);
} else {
    new EEBusAdapter();
}
