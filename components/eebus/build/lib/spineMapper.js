"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNodeManagementDetailedDiscoveryRequest = buildNodeManagementDetailedDiscoveryRequest;
exports.mapCommandToSpineDraft = mapCommandToSpineDraft;
function buildNodeManagementDetailedDiscoveryRequest(identity, remoteShipId, msgCounter) {
    return createDatagram({
        identity,
        remoteShipId,
        msgCounter,
        classifier: 'read',
        functionName: 'nodeManagementDetailedDiscoveryData',
        payloadBlock: {
            nodeManagementDetailedDiscoveryDataSelectors: {},
        },
        sourceFeature: 0,
        destinationFeature: 0,
    });
}
function mapCommandToSpineDraft(command, identity, remoteShipId, msgCounter = 1) {
    const createdAt = new Date().toISOString();
    const commandMapping = commandToMapping(command);
    const datagram = identity
        ? createDatagram({
            identity,
            remoteShipId: remoteShipId || command.deviceId,
            msgCounter,
            classifier: commandMapping.classifier,
            functionName: commandMapping.functionName,
            payloadBlock: commandMapping.payloadBlock,
            sourceFeature: commandMapping.sourceFeature,
            destinationFeature: commandMapping.destinationFeature,
        })
        : undefined;
    return {
        protocol: 'SPINE',
        status: datagram ? 'fieldtest-frame' : 'draft-unverified',
        deviceId: command.deviceId,
        featureType: commandMapping.featureType,
        function: commandMapping.functionName,
        command: commandMapping.classifier,
        payload: commandMapping.payloadBlock,
        datagram,
        note: commandMapping.note,
        createdAt,
    };
}
function commandToMapping(command) {
    switch (command.stateName) {
        case 'enableCharging':
            return {
                featureType: 'LoadControl',
                functionName: 'loadControlLimitListData',
                classifier: 'write',
                sourceFeature: 0,
                destinationFeature: 0,
                payloadBlock: {
                    loadControlLimitListData: {
                        loadControlLimitData: [
                            {
                                limitId: 0,
                                isLimitActive: !Boolean(command.value),
                                value: {
                                    number: Boolean(command.value) ? 0 : 0,
                                    scale: 0,
                                },
                                valueSource: 'externallyManaged',
                            },
                        ],
                    },
                },
                note: 'Field-test mapping for EVSE charging enablement via LoadControl. Real devices may require a discovered limitId and a specific feature address.',
            };
        case 'maxChargingPower':
        case 'activePowerLimit':
        case 'consumptionLimit':
        case 'gridImportLimit':
        case 'heatPumpPowerLimit':
            return powerLimit(command, 'consume');
        case 'productionLimit':
        case 'gridExportLimit':
            return powerLimit(command, 'produce');
        case 'maxChargingCurrent':
            return {
                featureType: 'LoadControl',
                functionName: 'loadControlLimitListData',
                classifier: 'write',
                sourceFeature: 0,
                destinationFeature: 0,
                payloadBlock: {
                    loadControlLimitListData: {
                        loadControlLimitData: [
                            {
                                limitId: 0,
                                limitType: 'currentLimit',
                                value: scaled(Number(command.value)),
                                valueSource: 'externallyManaged',
                            },
                        ],
                    },
                },
                note: 'Field-test mapping for EVSE current curtailment. Verify phases and limitId with the target EVSE.',
            };
        case 'setpointPower':
            return {
                featureType: 'PowerSequences',
                functionName: 'powerSequenceScheduleData',
                classifier: 'write',
                sourceFeature: 0,
                destinationFeature: 0,
                payloadBlock: {
                    powerSequenceScheduleData: {
                        sequenceId: 0,
                        powerTimeSlot: [
                            {
                                timePeriod: { startTime: new Date().toISOString() },
                                value: scaled(Number(command.value)),
                            },
                        ],
                    },
                },
                note: 'Field-test mapping for active power setpoint. Requires validation against the target use case and feature address.',
            };
        case 'targetTemperature':
            return {
                featureType: 'Setpoint',
                functionName: 'setpointListData',
                classifier: 'write',
                sourceFeature: 0,
                destinationFeature: 0,
                payloadBlock: {
                    setpointListData: {
                        setpointData: [
                            {
                                setpointId: 0,
                                value: scaled(Number(command.value)),
                            },
                        ],
                    },
                },
                note: 'Field-test mapping for HVAC target temperature. Verify setpointId and unit with the heat pump or climate device.',
            };
        case 'hvacMode':
            return {
                featureType: 'HVAC',
                functionName: 'hvacOperationModeDescriptionListData',
                classifier: 'write',
                sourceFeature: 0,
                destinationFeature: 0,
                payloadBlock: {
                    hvacOperationModeDescriptionListData: {
                        hvacOperationModeDescriptionData: [
                            {
                                operationModeId: 0,
                                operationMode: String(command.value),
                            },
                        ],
                    },
                },
                note: 'Field-test mapping for HVAC mode. Verify operationModeId/function with the target device.',
            };
        case 'trusted':
        case 'approve':
        case 'reject':
            return {
                featureType: 'NodeManagement',
                functionName: 'bindingManagement',
                classifier: 'localOnly',
                sourceFeature: 0,
                destinationFeature: 0,
                payloadBlock: {
                    trusted: command.stateName === 'reject' ? false : Boolean(command.value),
                    sourceState: `${command.channel}.${command.stateName}`,
                },
                note: 'Local trust flag only. SHIP hello state is updated when an active session exists.',
            };
        default:
            return {
                featureType: 'Unknown',
                functionName: 'Unknown',
                classifier: 'write',
                sourceFeature: 0,
                destinationFeature: 0,
                payloadBlock: {
                    value: command.value,
                    sourceState: `${command.channel}.${command.stateName}`,
                },
                note: 'No explicit SPINE field-test mapping exists for this state yet.',
            };
    }
}
function powerLimit(command, direction) {
    return {
        featureType: 'LoadControl',
        functionName: 'loadControlLimitListData',
        classifier: 'write',
        sourceFeature: 0,
        destinationFeature: 0,
        payloadBlock: {
            loadControlLimitListData: {
                loadControlLimitData: [
                    {
                        limitId: 0,
                        limitType: direction === 'consume' ? 'activePowerConsumptionLimit' : 'activePowerProductionLimit',
                        value: scaled(Number(command.value)),
                        valueSource: 'externallyManaged',
                    },
                ],
            },
        },
        note: 'Field-test mapping for active power limitation. Real devices often require limitId and feature address from NodeManagement/LoadControl discovery.',
    };
}
function createDatagram(input) {
    return {
        datagram: {
            header: {
                specificationVersion: '1.3.0',
                addressSource: {
                    device: spineDeviceAddress(input.identity.shipId),
                    entity: [0],
                    feature: input.sourceFeature,
                },
                addressDestination: {
                    device: spineDeviceAddress(input.remoteShipId),
                    entity: [0],
                    feature: input.destinationFeature,
                },
                msgCounter: input.msgCounter,
                cmdClassifier: input.classifier,
                ackRequest: true,
                timestamp: new Date().toISOString(),
            },
            payload: {
                cmd: [
                    {
                        function: input.functionName,
                        ...input.payloadBlock,
                    },
                ],
            },
        },
    };
}
function spineDeviceAddress(shipId) {
    const raw = String(shipId || '').trim();
    if (raw.startsWith('d:'))
        return raw;
    return `d:${raw || 'unknown'}`;
}
function scaled(value) {
    if (!Number.isFinite(value))
        return { number: 0, scale: 0 };
    return { number: Math.round(value), scale: 0 };
}
//# sourceMappingURL=spineMapper.js.map