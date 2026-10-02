export type DeviceChannel = 'info' | 'connection' | 'measurements' | 'control' | 'limits' | 'cls' | 'raw' | 'pairing' | 'useCases';

export interface StateDefinition {
    id: string;
    name: string;
    channel?: DeviceChannel;
    type: 'boolean' | 'number' | 'string' | 'object';
    role: string;
    read: boolean;
    write: boolean;
    unit?: string;
    def?: unknown;
    desc?: string;
}

export const identityStates: StateDefinition[] = [
    { id: 'serviceName', name: 'Local SHIP service name', type: 'string', role: 'info.name', read: true, write: false },
    { id: 'brand', name: 'Local EEBUS brand', type: 'string', role: 'info', read: true, write: false },
    { id: 'model', name: 'Local EEBUS model', type: 'string', role: 'info', read: true, write: false },
    { id: 'deviceType', name: 'Local EEBUS device type', type: 'string', role: 'info', read: true, write: false },
    { id: 'deviceCategories', name: 'Local EEBUS device categories', type: 'string', role: 'info', read: true, write: false },
    { id: 'ianaPen', name: 'IANA Private Enterprise Number', type: 'string', role: 'info', read: true, write: false },
    { id: 'ianaPenPlaceholder', name: 'IANA PEN is a field-test placeholder', type: 'boolean', role: 'indicator', read: true, write: false, def: true },
    { id: 'announcementActive', name: 'Local HEMS announcement active', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'localSki', name: 'Local SKI', type: 'string', role: 'info', read: true, write: false },
    { id: 'shipId', name: 'Local SHIP ID', type: 'string', role: 'info', read: true, write: false },
    {
        id: 'certificateFingerprint',
        name: 'Certificate fingerprint SHA-256',
        type: 'string',
        role: 'info',
        read: true,
        write: false,
    },
];

export const discoveryStates: StateDefinition[] = [
    { id: 'enabled', name: 'Discovery enabled', type: 'boolean', role: 'switch.enable', read: true, write: false, def: true },
    { id: 'discoveredCount', name: 'Discovered devices count', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'lastDiscovery', name: 'Last discovery event', type: 'string', role: 'json', read: true, write: false },
];

export const globalPairingStates: StateDefinition[] = [
    {
        id: 'autoAcceptNewDevices',
        name: 'Auto accept new devices for field testing',
        type: 'boolean',
        role: 'switch.enable',
        read: true,
        write: true,
        def: false,
        desc: 'Field-test helper. When enabled, new SHIP peers are trusted automatically. Disable for production.',
    },
    { id: 'pendingCount', name: 'Pending pairing count', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'trustedCount', name: 'Trusted devices count', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'lastPairingRequest', name: 'Last pairing request', type: 'string', role: 'json', read: true, write: false },
];

export const bridgeStates: StateDefinition[] = [
    { id: 'enabled', name: 'Direct NexoWatt EOS bridge enabled', type: 'boolean', role: 'indicator', read: true, write: false, def: true },
    { id: 'connected', name: 'NexoWatt EOS direct API connected', type: 'boolean', role: 'indicator.connected', read: true, write: false, def: false },
    { id: 'readyForControl', name: 'NexoWatt EOS ready for direct §14a control', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'targetInstance', name: 'NexoWatt UI target instance', type: 'string', role: 'info', read: true, write: false },
    { id: 'apiVersion', name: 'Direct API version', type: 'number', role: 'value', read: true, write: false, def: 1 },
    { id: 'manualDatapointMappingRequired', name: 'Manual CLS datapoint mapping required', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'status', name: 'Direct API status', type: 'string', role: 'state', read: true, write: false },
    { id: 'lastError', name: 'Last direct API error', type: 'string', role: 'text', read: true, write: false },
    { id: 'lastHandshakeAt', name: 'Last direct API handshake', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'lastRoundTripMs', name: 'Last handshake round trip', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'remoteVersion', name: 'NexoWatt UI adapter version', type: 'string', role: 'info.version', read: true, write: false },
    { id: 'acceptanceTargetMs', name: 'Engineering target for command acceptance', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'controlTargetMs', name: 'Engineering target for controller application', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'feedbackTargetMs', name: 'Engineering target for implementation feedback', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'implementationTimeoutMs', name: 'Maximum wait for EOS implementation feedback', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'clsHeartbeatTimeoutMs', name: 'CLS heartbeat timeout', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'lastCommandId', name: 'Last CLS command ID', type: 'string', role: 'info', read: true, write: false },
    { id: 'lastCommandJson', name: 'Last direct API command', type: 'string', role: 'json', read: true, write: false },
    { id: 'pendingCount', name: 'Commands awaiting implementation feedback', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'commandCount', name: 'Forwarded CLS commands', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'rejectedCount', name: 'Rejected or failed CLS commands', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'implementedCount', name: 'Successfully implemented CLS commands', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'timeoutCount', name: 'CLS commands with missing EOS feedback', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'lastAcceptanceLatencyMs', name: 'CLS receive to EOS acceptance latency', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'lastAccepted', name: 'Last command accepted by EOS', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'lastResult', name: 'Last bridge result', type: 'string', role: 'state', read: true, write: false },
    { id: 'timingAcceptanceOk', name: 'Acceptance timing target met', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'lastControlLatencyMs', name: 'CLS receive to controller application latency', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'lastFeedbackLatencyMs', name: 'CLS receive to implementation feedback latency', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'timingControlOk', name: 'Controller timing target met', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'timingFeedbackOk', name: 'Feedback timing target met', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'lastImplementationJson', name: 'Last EOS implementation feedback', type: 'string', role: 'json', read: true, write: false },
];

export const clsStates: StateDefinition[] = [
    { id: 'active', name: 'CLS consumption limitation active', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'limitW', name: 'Requested CLS consumption limit', type: 'number', role: 'level.power.consumption', read: true, write: false, unit: 'W' },
    { id: 'commandId', name: 'Current CLS command ID', type: 'string', role: 'info', read: true, write: false },
    { id: 'sourceDeviceId', name: 'CLS source device ID', type: 'string', role: 'info', read: true, write: false },
    { id: 'receivedAt', name: 'CLS command received', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'validUntil', name: 'CLS command validity end', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'failsafeLimitW', name: 'CLS failsafe consumption limit', type: 'number', role: 'value.power.consumption', read: true, write: false, unit: 'W' },
    { id: 'failsafeDurationMs', name: 'CLS failsafe minimum duration', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'failsafeActive', name: 'CLS failsafe active', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'heartbeatLastAt', name: 'Last CLS heartbeat', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'heartbeatAgeMs', name: 'CLS heartbeat age', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'heartbeatHealthy', name: 'CLS heartbeat healthy', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'status', name: 'CLS control status', type: 'string', role: 'state', read: true, write: false },
    { id: 'lastSpineAcceptance', name: 'Last correlated SPINE implementation result', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastSpineReadback', name: 'Last SPINE controller readback', type: 'string', role: 'json', read: true, write: false },
];

export const deviceStates: StateDefinition[] = [
    { id: 'online', name: 'Online', channel: 'info', type: 'boolean', role: 'indicator.connected', read: true, write: false, def: false },
    { id: 'manufacturer', name: 'Manufacturer', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'model', name: 'Model', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'serialNumber', name: 'Serial number', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'ski', name: 'Remote SKI', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'deviceType', name: 'Device type', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'deviceClass', name: 'Detected device class', channel: 'info', type: 'string', role: 'info', read: true, write: false, def: 'unknown' },
    { id: 'shipId', name: 'Remote SHIP ID', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'host', name: 'Host', channel: 'info', type: 'string', role: 'info.ip', read: true, write: false },
    { id: 'port', name: 'Port', channel: 'info', type: 'number', role: 'info.port', read: true, write: false },
    { id: 'path', name: 'SHIP path', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'serviceType', name: 'mDNS service type', channel: 'info', type: 'string', role: 'info', read: true, write: false },
    { id: 'lastSeen', name: 'Last seen', channel: 'info', type: 'string', role: 'date', read: true, write: false },

    { id: 'connected', name: 'SHIP socket connected', channel: 'connection', type: 'boolean', role: 'indicator.connected', read: true, write: false, def: false },
    { id: 'shipState', name: 'SHIP connection state', channel: 'connection', type: 'string', role: 'state', read: true, write: false, def: 'discovered' },
    { id: 'role', name: 'SHIP connection role', channel: 'connection', type: 'string', role: 'info', read: true, write: false },
    { id: 'dataExchangeReady', name: 'SHIP data exchange ready', channel: 'connection', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'lastConnected', name: 'Last connected', channel: 'connection', type: 'string', role: 'date', read: true, write: false },
    { id: 'lastDisconnected', name: 'Last disconnected', channel: 'connection', type: 'string', role: 'date', read: true, write: false },
    { id: 'lastError', name: 'Last connection error', channel: 'connection', type: 'string', role: 'text', read: true, write: false },

    { id: 'power', name: 'Power', channel: 'measurements', type: 'number', role: 'value.power', read: true, write: false, unit: 'W' },
    { id: 'energy', name: 'Energy', channel: 'measurements', type: 'number', role: 'value.energy', read: true, write: false, unit: 'Wh' },
    { id: 'voltage', name: 'Voltage', channel: 'measurements', type: 'number', role: 'value.voltage', read: true, write: false, unit: 'V' },
    { id: 'current', name: 'Current', channel: 'measurements', type: 'number', role: 'value.current', read: true, write: false, unit: 'A' },
    { id: 'frequency', name: 'Frequency', channel: 'measurements', type: 'number', role: 'value.frequency', read: true, write: false, unit: 'Hz' },
    { id: 'soc', name: 'State of charge', channel: 'measurements', type: 'number', role: 'value.battery', read: true, write: false, unit: '%' },
    { id: 'chargingState', name: 'Charging state', channel: 'measurements', type: 'string', role: 'state', read: true, write: false },
    { id: 'gridPower', name: 'Grid power', channel: 'measurements', type: 'number', role: 'value.power', read: true, write: false, unit: 'W' },
    { id: 'importPower', name: 'Import power', channel: 'measurements', type: 'number', role: 'value.power.consumption', read: true, write: false, unit: 'W' },
    { id: 'exportPower', name: 'Export power', channel: 'measurements', type: 'number', role: 'value.power.production', read: true, write: false, unit: 'W' },
    { id: 'pvPower', name: 'PV power', channel: 'measurements', type: 'number', role: 'value.power.production', read: true, write: false, unit: 'W' },
    { id: 'batteryPower', name: 'Battery power', channel: 'measurements', type: 'number', role: 'value.power', read: true, write: false, unit: 'W' },
    { id: 'temperature', name: 'Temperature', channel: 'measurements', type: 'number', role: 'value.temperature', read: true, write: false, unit: '°C' },
    { id: 'operatingState', name: 'Operating state', channel: 'measurements', type: 'string', role: 'state', read: true, write: false },

    { id: 'enableCharging', name: 'Enable charging', channel: 'control', type: 'boolean', role: 'switch.enable', read: true, write: true, def: false },
    { id: 'maxChargingPower', name: 'Maximum charging power', channel: 'control', type: 'number', role: 'level.power', read: true, write: true, unit: 'W' },
    { id: 'maxChargingCurrent', name: 'Maximum charging current', channel: 'control', type: 'number', role: 'level.current', read: true, write: true, unit: 'A' },
    { id: 'targetTemperature', name: 'Target temperature', channel: 'control', type: 'number', role: 'level.temperature', read: true, write: true, unit: '°C' },
    { id: 'hvacMode', name: 'HVAC mode', channel: 'control', type: 'string', role: 'state', read: true, write: true },
    { id: 'connect', name: 'Connect SHIP session', channel: 'control', type: 'boolean', role: 'button', read: true, write: true, def: false },
    { id: 'disconnect', name: 'Disconnect SHIP session', channel: 'control', type: 'boolean', role: 'button', read: true, write: true, def: false },
    { id: 'refreshNodeManagement', name: 'Refresh SPINE node management', channel: 'control', type: 'boolean', role: 'button', read: true, write: true, def: false },

    { id: 'activePowerLimit', name: 'Active power limit', channel: 'limits', type: 'number', role: 'level.power', read: true, write: true, unit: 'W' },
    { id: 'setpointPower', name: 'Setpoint power', channel: 'limits', type: 'number', role: 'level.power', read: true, write: true, unit: 'W' },
    { id: 'consumptionLimit', name: 'Consumption power limit', channel: 'limits', type: 'number', role: 'level.power.consumption', read: true, write: true, unit: 'W' },
    { id: 'productionLimit', name: 'Production power limit', channel: 'limits', type: 'number', role: 'level.power.production', read: true, write: true, unit: 'W' },
    { id: 'gridImportLimit', name: 'Grid import limit', channel: 'limits', type: 'number', role: 'level.power.consumption', read: true, write: true, unit: 'W' },
    { id: 'gridExportLimit', name: 'Grid export limit', channel: 'limits', type: 'number', role: 'level.power.production', read: true, write: true, unit: 'W' },
    { id: 'heatPumpPowerLimit', name: 'Heat pump power limit', channel: 'limits', type: 'number', role: 'level.power.consumption', read: true, write: true, unit: 'W' },

    { id: 'active', name: 'CLS limitation active', channel: 'cls', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'limitW', name: 'Requested CLS consumption limit', channel: 'cls', type: 'number', role: 'level.power.consumption', read: true, write: false, unit: 'W' },
    { id: 'effectiveLimitW', name: 'EOS effective CLS limit', channel: 'cls', type: 'number', role: 'value.power.consumption', read: true, write: false, unit: 'W' },
    { id: 'validUntil', name: 'CLS limit validity end', channel: 'cls', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'commandId', name: 'CLS command ID', channel: 'cls', type: 'string', role: 'info', read: true, write: false },
    { id: 'operation', name: 'CLS control operation', channel: 'cls', type: 'string', role: 'state', read: true, write: false },
    { id: 'limitId', name: 'EEBUS limit IDs', channel: 'cls', type: 'string', role: 'json', read: true, write: false },
    { id: 'receivedAt', name: 'CLS command received', channel: 'cls', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'acceptedAt', name: 'CLS command accepted by EOS', channel: 'cls', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'reactionMs', name: 'CLS command acceptance latency', channel: 'cls', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'status', name: 'CLS bridge status', channel: 'cls', type: 'string', role: 'state', read: true, write: false },
    { id: 'failsafeActive', name: 'CLS failsafe active', channel: 'cls', type: 'boolean', role: 'indicator', read: true, write: false, def: false },
    { id: 'failsafeLimitW', name: 'CLS failsafe consumption limit', channel: 'cls', type: 'number', role: 'value.power.consumption', read: true, write: false, unit: 'W' },
    { id: 'failsafeDurationMs', name: 'CLS failsafe duration', channel: 'cls', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'heartbeatLastSeen', name: 'Last CLS heartbeat', channel: 'cls', type: 'number', role: 'value.time', read: true, write: false, unit: 'ms' },
    { id: 'heartbeatTimeoutMs', name: 'CLS heartbeat timeout', channel: 'cls', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'heartbeatAgeMs', name: 'CLS heartbeat age', channel: 'cls', type: 'number', role: 'value.interval', read: true, write: false, unit: 'ms' },
    { id: 'lastFeedback', name: 'Last EOS CLS feedback', channel: 'cls', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastSpineAcceptance', name: 'Last correlated SPINE implementation result', channel: 'cls', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastSpineReadback', name: 'Last SPINE controller readback', channel: 'cls', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastError', name: 'Last CLS processing error', channel: 'cls', type: 'string', role: 'text', read: true, write: false },

    { id: 'trusted', name: 'Trusted', channel: 'pairing', type: 'boolean', role: 'switch.enable', read: true, write: true, def: false },
    { id: 'approve', name: 'Approve pairing', channel: 'pairing', type: 'boolean', role: 'button', read: true, write: true, def: false },
    { id: 'reject', name: 'Reject pairing', channel: 'pairing', type: 'boolean', role: 'button', read: true, write: true, def: false },
    { id: 'pairingState', name: 'Pairing state', channel: 'pairing', type: 'string', role: 'state', read: true, write: false, def: 'discovered' },
    { id: 'remoteSki', name: 'Pairing remote SKI', channel: 'pairing', type: 'string', role: 'info', read: true, write: false },
    { id: 'remoteShipId', name: 'Pairing remote SHIP ID', channel: 'pairing', type: 'string', role: 'info', read: true, write: false },
    { id: 'remoteFingerprint', name: 'Pairing remote certificate fingerprint', channel: 'pairing', type: 'string', role: 'info', read: true, write: false },
    { id: 'trustLevel', name: 'Local trust level', channel: 'pairing', type: 'number', role: 'value', read: true, write: false, def: 0 },
    { id: 'verificationMode', name: 'Verification mode', channel: 'pairing', type: 'string', role: 'state', read: true, write: false },
    { id: 'pinState', name: 'Remote PIN state', channel: 'pairing', type: 'string', role: 'state', read: true, write: false },

    { id: 'detected', name: 'Detected EEBUS use cases', channel: 'useCases', type: 'string', role: 'json', read: true, write: false },
    { id: 'features', name: 'SPINE features', channel: 'useCases', type: 'string', role: 'json', read: true, write: false },
    { id: 'functions', name: 'SPINE functions', channel: 'useCases', type: 'string', role: 'json', read: true, write: false },
    { id: 'nodeManagement', name: 'SPINE node management discovery', channel: 'useCases', type: 'string', role: 'json', read: true, write: false },
    { id: 'primaryUseCase', name: 'Primary use case', channel: 'useCases', type: 'string', role: 'info', read: true, write: false },
    { id: 'supportedDeviceClasses', name: 'Supported device classes', channel: 'useCases', type: 'string', role: 'json', read: true, write: false },

    { id: 'discovery', name: 'Raw discovery data', channel: 'raw', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastMessage', name: 'Last raw message', channel: 'raw', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastShipFrame', name: 'Last SHIP frame', channel: 'raw', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastSpineFrame', name: 'Last SPINE frame', channel: 'raw', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastDataPayload', name: 'Last SHIP data payload', channel: 'raw', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastCommand', name: 'Last command draft', channel: 'raw', type: 'string', role: 'json', read: true, write: false },
    { id: 'lastError', name: 'Last error', channel: 'raw', type: 'string', role: 'text', read: true, write: false },
];

export const channelNames: Record<DeviceChannel, string> = {
    info: 'Information',
    connection: 'SHIP connection',
    measurements: 'Measurements',
    control: 'Control',
    limits: 'Limits',
    cls: 'CLS / §14a direct bridge',
    raw: 'Raw diagnostics',
    pairing: 'Pairing',
    useCases: 'Use cases',
};
