/* NexoWatt EOS manual datapoint write policy v7.9.87-rc.3 sales-release candidate */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!root) return;

    root.NEXOWATT_EOS_MANUAL_WRITE_POLICY_VERSION = 'v87-dpwrite-states-fallback';
    root.NEXOWATT_EOS_MANUAL_WRITE_POLICY = api;
    root.NEXOWATT_EOS_GET_WRITE_BEHAVIOR = api.getWriteBehavior;
    root.NEXOWATT_EOS_GET_DIRECT_WRITE_VALUE = api.getDirectWriteValue;
    root.NEXOWATT_EOS_RESOLVE_DIRECT_WRITE_VALUE = api.resolveDirectWriteValue;
    root.NEXOWATT_EOS_GET_EXPERT_ONLY_REASON = api.getExpertOnlyReason;
    root.NEXOWATT_EOS_IS_EXPERT_ONLY_STATE = api.isExpertOnlyState;
    root.NEXOWATT_EOS_COERCE_BOOLEAN = api.toBoolean;
    root.NEXOWATT_EOS_PREPARE_MANUAL_EDITOR = api.prepareEditor;
    root.NEXOWATT_EOS_PARSE_MANUAL_VALUE = api.parseEditorValue;
    root.NEXOWATT_EOS_WRITE_MANUAL_STATE = api.writeManualState;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null, function () {
    'use strict';

    const pendingWrites = new Map();

    const normalizeText = value => String(value == null ? '' : value)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const flattenTranslatedText = value => {
        if (value == null) return '';
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) return value.map(flattenTranslatedText).join(' ');
        if (typeof value === 'object') return Object.values(value).map(flattenTranslatedText).join(' ');
        return '';
    };

    const normalizeCommonType = (obj, value) => {
        const common = obj && obj.common ? obj.common : {};
        const type = Array.isArray(common.type) ? common.type[0] : common.type;
        if (['number', 'string', 'boolean', 'array', 'object', 'mixed', 'file', 'json'].includes(type)) return type;
        if (Array.isArray(value)) return 'array';
        if (value && typeof value === 'object') return 'object';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        return 'string';
    };

    const normalizeStates = states => {
        if (!states) return [];
        if (Array.isArray(states)) return states.map((label, index) => ({ key: String(index), label: String(label) }));
        if (typeof states === 'string') {
            return states
                .split(';')
                .map(part => part.trim())
                .filter(Boolean)
                .map(part => {
                    const index = part.indexOf(':');
                    return index === -1
                        ? { key: part, label: part }
                        : { key: part.slice(0, index).trim(), label: part.slice(index + 1).trim() };
                });
        }
        if (typeof states === 'object') {
            return Object.entries(states).map(([key, label]) => ({ key, label: flattenTranslatedText(label) || key }));
        }
        return [];
    };

    const getExplicitExpertOnly = obj => {
        const common = obj && obj.common ? obj.common : {};
        const native = obj && obj.native ? obj.native : {};
        const custom = common.custom || {};
        const candidates = [
            common.manualWriteExpertOnly,
            common.expertOnly,
            native.manualWriteExpertOnly,
            native.nexowatt && native.nexowatt.manualWriteExpertOnly,
            custom.nexowatt && custom.nexowatt.manualWriteExpertOnly,
            custom['nexowatt.eos'] && custom['nexowatt.eos'].manualWriteExpertOnly,
            custom['eos-admin'] && custom['eos-admin'].manualWriteExpertOnly,
        ];
        for (const value of candidates) {
            if (typeof value === 'boolean') return value;
        }
        return undefined;
    };

    const getExplicitManualValue = (obj, name) => {
        const common = obj && obj.common ? obj.common : {};
        const native = obj && obj.native ? obj.native : {};
        const custom = common.custom || {};
        const sources = [
            common,
            native,
            native.nexowatt || {},
            custom.nexowatt || {},
            custom['nexowatt.eos'] || {},
            custom['eos-admin'] || {},
        ];
        for (const source of sources) {
            if (source && Object.prototype.hasOwnProperty.call(source, name)) {
                return { found: true, value: source[name] };
            }
        }
        return { found: false, value: undefined };
    };

    const getExplicitBinaryOptions = obj => {
        const off = getExplicitManualValue(obj, 'manualFalseValue');
        const on = getExplicitManualValue(obj, 'manualTrueValue');
        return off.found && on.found ? { off: off.value, on: on.value } : null;
    };

    const isInactiveTriggerValue = value => {
        if (value == null || value === false || value === 0) return true;
        if (typeof value !== 'string') return false;
        const normalized = normalizeText(value).trim();
        return ['', 'false', '0', 'off', 'no', 'nein', 'disabled', 'inactive', 'closed', 'stop', 'aus', 'null', '(null)'].includes(normalized);
    };

    const getExpertOnlyReason = (id, obj) => {
        const explicit = getExplicitExpertOnly(obj);
        if (explicit === true) return 'explicit';
        if (explicit === false) return '';

        const common = obj && obj.common ? obj.common : {};
        const role = normalizeText(common.role);
        const text = normalizeText([
            id,
            role,
            common.type,
            flattenTranslatedText(common.name),
            flattenTranslatedText(common.desc),
        ].join(' '));
        const compact = text.replace(/[^a-z0-9]+/g, '');

        // High-confidence safety classes only. Normal setpoints such as room
        // temperatures remain available outside expert mode.
        if (/^(?:level\.)?(?:power|current)(?:\.|$)/.test(role)) return 'power-or-current-command';
        if (/^(?:value\.)?(?:power|current)\.(?:setpoint|limit|target|command)(?:\.|$)/.test(role)) return 'power-or-current-command';

        const exactRiskTokens = [
            'hardreset', 'softreset', 'factoryreset', 'factorydefault', 'reboot', 'restartdevice', 'shutdown',
            'emergencystop', 'notaus', 'contactor', 'unlockconnector', 'remotestart', 'remotestop',
            'starttransaction', 'stoptransaction', 'chargepower', 'chargingpower', 'dischargepower',
            'chargecurrent', 'chargingcurrent', 'currentlimit', 'safecurrent', 'setchargingcurrent',
            'exportlimit', 'feedinlimit', 'powerlimit', 'powersetpoint', 'pvpowerlimit', 'gridlimit',
            'controlmode', 'operatingmode', 'batterymode', 'gridmode', 'firmwareupdate',
            'ladeleistung', 'entladeleistung', 'ladestrom', 'stromlimit', 'leistungsgrenze',
            'leistungssollwert', 'einspeiselimit', 'ruecksetzen', 'neustart',
        ];
        if (exactRiskTokens.some(token => compact.includes(token))) return 'safety-command';

        const powerCommand = /(?:charge|charging|discharge|export|feedin|grid|netz|pv|lade|entlade|einspeise)[\s._/-]{0,6}(?:power|current|leistung|strom).{0,28}(?:limit|setpoint|target|command|override|control|grenze|soll|vorgabe)/;
        const inversePowerCommand = /(?:limit|setpoint|target|command|override|control|grenze|soll|vorgabe).{0,28}(?:charge|charging|discharge|export|feedin|grid|netz|pv|lade|entlade|einspeise|power|current|leistung|strom)/;
        if (powerCommand.test(text) || inversePowerCommand.test(text)) return 'power-or-current-command';
        return '';
    };

    const isExpertOnlyState = (id, obj) => Boolean(getExpertOnlyReason(id, obj));

    const toBoolean = value => {
        if (value === true || value === 1) return true;
        if (value === false || value === 0 || value == null) return false;
        const normalized = normalizeText(value).trim();
        if (['true', '1', 'on', 'yes', 'ja', 'enabled', 'active', 'open', 'start', 'ein'].includes(normalized)) return true;
        if (['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive', 'closed', 'stop', 'aus', '', 'null', '(null)'].includes(normalized)) return false;
        return Boolean(value);
    };

    const parseNumber = value => {
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) throw new Error('Ungültiger Zahlenwert');
            return value;
        }
        const normalized = String(value == null ? '' : value).trim().replace(',', '.');
        if (!normalized) throw new Error('Zahlenwert fehlt');
        const parsed = Number(normalized);
        if (!Number.isFinite(parsed)) throw new Error(`Ungültiger Zahlenwert: ${value}`);
        return parsed;
    };

    const parseJson = value => {
        if (value && typeof value === 'object') return value;
        const text = String(value == null ? '' : value).trim();
        if (!text) throw new Error('JSON-Wert fehlt');
        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error(`Ungültiges JSON: ${error && error.message ? error.message : error}`);
        }
    };

    const castStateKey = (key, type) => {
        if (type === 'number') return parseNumber(key);
        if (type === 'boolean') return toBoolean(key);
        if (type === 'mixed') {
            const text = String(key).trim();
            if (/^(true|false|on|off|yes|no|ja|nein|1|0)$/i.test(text)) return toBoolean(text);
            if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text.replace(',', '.'))) return parseNumber(text);
            try {
                if (/^[\[{]/.test(text)) return JSON.parse(text);
            } catch {
                // keep as text
            }
            return text;
        }
        return String(key);
    };

    const sameValue = (left, right) => {
        if (Object.is(left, right)) return true;
        if (left == null || right == null) return left == null && right == null;
        if (typeof left === 'object' || typeof right === 'object') {
            try {
                return JSON.stringify(left) === JSON.stringify(right);
            } catch {
                return false;
            }
        }
        return String(left) === String(right);
    };

    const sameTypedValue = (left, right, type) => {
        if (type === 'boolean') return toBoolean(left) === toBoolean(right);
        if (type === 'number') {
            try { return parseNumber(left) === parseNumber(right); } catch { return sameValue(left, right); }
        }
        if (type === 'mixed') {
            if (typeof right === 'boolean') return toBoolean(left) === right;
            if (typeof right === 'number') {
                try { return parseNumber(left) === right; } catch { return false; }
            }
        }
        return sameValue(left, right);
    };

    const optionScore = (option, mode) => {
        const text = normalizeText(`${option.key} ${option.label}`).replace(/[^a-z0-9]+/g, ' ');
        const offWords = ['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive', 'closed', 'stop', 'aus'];
        const onWords = ['true', '1', 'on', 'yes', 'ja', 'enabled', 'active', 'open', 'start', 'ein'];
        const words = mode === 'on' ? onWords : offWords;
        return words.reduce((score, word) => score + (new RegExp(`(?:^|\\s)${word}(?:\\s|$)`).test(text) ? 10 : 0), 0);
    };

    const getBinaryOptions = obj => {
        const common = obj && obj.common ? obj.common : {};
        const explicit = getExplicitBinaryOptions(obj);
        if (explicit) return explicit;
        const type = normalizeCommonType(obj);
        const entries = normalizeStates(common.states);
        if (entries.length > 2) return null;
        if (entries.length === 2) {
            const typed = entries.map(entry => ({ ...entry, value: castStateKey(entry.key, type) }));
            const firstOff = optionScore(typed[0], 'off');
            const firstOn = optionScore(typed[0], 'on');
            const secondOff = optionScore(typed[1], 'off');
            const secondOn = optionScore(typed[1], 'on');
            if (firstOn > firstOff && secondOff >= secondOn) return { off: typed[1].value, on: typed[0].value };
            if (secondOn > secondOff && firstOff >= firstOn) return { off: typed[0].value, on: typed[1].value };
            return { off: typed[0].value, on: typed[1].value };
        }
        if (type === 'boolean') return { off: false, on: true };
        if (type === 'number') {
            const off = typeof common.min === 'number' ? common.min : 0;
            let on = typeof common.max === 'number' ? common.max : 1;
            if (sameValue(off, on)) on = off === 0 ? 1 : 0;
            return { off, on };
        }
        if (type === 'string') return { off: 'false', on: 'true' };
        if (type === 'mixed') return { off: false, on: true };
        return null;
    };

    const isButtonState = (obj, item) => {
        const common = obj && obj.common ? obj.common : {};
        const role = normalizeText(common.role);
        const data = item && item.data ? item.data : {};
        return Boolean(data.button) || role === 'button' || role.startsWith('button.') || role === 'action' || role.startsWith('action.');
    };

    const isSwitchState = (obj, item) => {
        const common = obj && obj.common ? obj.common : {};
        const role = normalizeText(common.role);
        const data = item && item.data ? item.data : {};
        const requested = Boolean(data.switch) || role === 'switch' || role.startsWith('switch.') || normalizeCommonType(obj) === 'boolean';
        return requested && Boolean(getBinaryOptions(obj));
    };

    const getWriteBehavior = (id, obj, item, expertMode) => {
        if (!obj || obj.type !== 'state') return 'readonly';
        const common = obj.common || {};
        if (common.write === false) return 'readonly';
        // Expert access is a NexoWatt Admin / Service capability, not merely a browser flag.
        // Installer and end-user sessions therefore cannot re-enable dangerous controls through
        // localStorage or stale GUI state.
        const accessRole = typeof window === 'undefined'
            ? 'admin' // deterministic Node.js self-test / server-side use
            : String(window.NEXOWATT_EOS_ACCESS_ROLE || 'enduser').toLowerCase();
        const effectiveExpertMode = expertMode === true && accessRole === 'admin';
        if (isExpertOnlyState(id, obj) && !effectiveExpertMode) return 'expert-only';
        if (normalizeCommonType(obj) === 'file') return 'file';
        const explicitTrigger = getExplicitManualValue(obj, 'manualTriggerValue');
        if (isButtonState(obj, item) && (explicitTrigger.found || common.def !== undefined || !['array', 'object'].includes(normalizeCommonType(obj)))) return 'button';
        if (isSwitchState(obj, item)) return 'switch';
        return 'dialog';
    };

    const getDirectWriteValue = (id, obj, item, currentValue, behavior) => {
        const common = obj && obj.common ? obj.common : {};
        const type = normalizeCommonType(obj, currentValue);
        const mode = behavior || getWriteBehavior(id, obj, item, true);
        if (mode === 'button') {
            const explicit = getExplicitManualValue(obj, 'manualTriggerValue');
            if (explicit.found) return explicit.value;
            // A default false/0/empty value describes the idle state of most
            // ioBroker buttons (not the trigger payload). Only active defaults
            // are allowed to become the command value.
            if (common.def !== undefined && !isInactiveTriggerValue(common.def)) return common.def;
            const options = getBinaryOptions(obj);
            if (options) return options.on;
            if (type === 'boolean') return true;
            if (type === 'number') return 1;
            if (type === 'string') return 'true';
            if (type === 'mixed') return true;
            if (common.def !== undefined) return common.def;
            throw new Error(`Button-Datenpunkt ${id} benötigt einen expliziten Vorgabewert`);
        }
        if (mode === 'switch') {
            const options = getBinaryOptions(obj);
            if (!options) throw new Error(`Datenpunkt ${id} ist kein binärer Schalter`);
            return sameTypedValue(currentValue, options.on, type) ? options.off : options.on;
        }
        throw new Error(`Direktes Schreiben ist für ${mode} nicht vorgesehen`);
    };

    const readFreshStateValue = async (socket, id, fallbackValue, timeoutMs = 1500) => {
        if (!socket || typeof socket.getState !== 'function') return fallbackValue;
        let timeoutHandle;
        try {
            const timeout = new Promise(resolve => {
                timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
            });
            const state = await Promise.race([Promise.resolve(socket.getState(id)), timeout]);
            if (state && Object.prototype.hasOwnProperty.call(state, 'val')) return state.val;
        } catch {
            // A transient read failure must not block manual operation. The
            // ObjectBrowser cache remains a safe fallback for the toggle.
        } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle);
        }
        return fallbackValue;
    };

    const resolveDirectWriteValue = async (socket, id, obj, item, currentValue, behavior) => {
        const mode = behavior || getWriteBehavior(id, obj, item, true);
        const effectiveValue = mode === 'switch'
            ? await readFreshStateValue(socket, id, currentValue)
            : currentValue;
        return getDirectWriteValue(id, obj, item, effectiveValue, mode);
    };

    const inferEditorType = (obj, currentValue) => {
        const common = obj && obj.common ? obj.common : {};
        if (normalizeStates(common.states).length) return 'states';
        const type = normalizeCommonType(obj, currentValue);
        if (type === 'array' || type === 'object' || type === 'json') return 'json';
        if (type === 'mixed') return 'json';
        if (type === 'number' || type === 'boolean' || type === 'string') return type;
        return 'string';
    };

    const prepareEditor = (obj, currentValue) => {
        const editorType = inferEditorType(obj, currentValue);
        const originalType = normalizeCommonType(obj, currentValue);
        let value = currentValue;
        if (editorType === 'json') {
            if (typeof value === 'string') {
                try {
                    value = JSON.stringify(JSON.parse(value), null, 2);
                } catch {
                    value = originalType === 'mixed' ? JSON.stringify(value) : value;
                }
            } else {
                value = JSON.stringify(value == null ? null : value, null, 2);
            }
        } else if (editorType === 'number') {
            value = value == null ? '' : value;
        } else if (editorType === 'boolean') {
            value = toBoolean(value);
        } else if (editorType === 'string') {
            value = value == null ? '' : String(value);
        }
        return {
            editorType,
            value,
            originalType,
        };
    };

    const parseEditorValue = (obj, editorType, rawValue) => {
        const common = obj && obj.common ? obj.common : {};
        const originalType = normalizeCommonType(obj, rawValue);
        let value = rawValue && typeof rawValue === 'object' && Object.prototype.hasOwnProperty.call(rawValue, 'value')
            ? rawValue.value
            : rawValue;

        if (editorType !== 'string' && value === 'null') return null;

        if (editorType === 'states') {
            value = castStateKey(value, originalType);
        } else if (editorType === 'number') {
            value = parseNumber(value);
        } else if (editorType === 'boolean') {
            value = toBoolean(value);
        } else if (editorType === 'json') {
            value = parseJson(value);
        } else {
            value = value == null ? '' : String(value);
        }

        if (originalType === 'number' && typeof value !== 'number') value = parseNumber(value);
        if (originalType === 'boolean' && typeof value !== 'boolean') value = toBoolean(value);
        if (originalType === 'string' && typeof value !== 'string') value = String(value);
        if (originalType === 'array') {
            if (typeof value === 'string') value = parseJson(value);
            if (!Array.isArray(value)) throw new Error('Der Datenpunkt erwartet ein JSON-Array');
        }
        if (originalType === 'object') {
            if (typeof value === 'string') value = parseJson(value);
            if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Der Datenpunkt erwartet ein JSON-Objekt');
        }

        if (typeof value === 'number') {
            if (typeof common.min === 'number' && value < common.min) throw new Error(`Wert liegt unter dem Minimum ${common.min}`);
            if (typeof common.max === 'number' && value > common.max) throw new Error(`Wert liegt über dem Maximum ${common.max}`);
        }
        return value;
    };

    const writeManualState = (socket, id, value) => {
        if (!socket || typeof socket.setState !== 'function') {
            return Promise.reject(new Error('NexoWatt EOS connection is not ready'));
        }
        const key = String(id || '');
        if (!key) return Promise.reject(new Error('Missing datapoint ID'));

        const previous = pendingWrites.get(key);
        if (previous && sameValue(previous.value, value)) return previous.promise;

        const predecessor = previous ? previous.promise.catch(() => undefined) : Promise.resolve();
        let timeoutHandle;
        const operation = predecessor.then(() => {
            const write = Promise.resolve(socket.setState(key, { val: value, ack: false, q: 0 }));
            const timeout = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error(`Write timeout for ${key}`)), 15000);
            });
            return Promise.race([write, timeout]);
        });
        const promise = operation.finally(() => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            const active = pendingWrites.get(key);
            if (active && active.promise === promise) pendingWrites.delete(key);
        });
        pendingWrites.set(key, { value, promise });
        return promise;
    };

    return {
        normalizeCommonType,
        normalizeStates,
        getExplicitExpertOnly,
        getExpertOnlyReason,
        isExpertOnlyState,
        getBinaryOptions,
        getWriteBehavior,
        getDirectWriteValue,
        resolveDirectWriteValue,
        readFreshStateValue,
        inferEditorType,
        prepareEditor,
        parseEditorValue,
        toBoolean,
        writeManualState,
    };
});
