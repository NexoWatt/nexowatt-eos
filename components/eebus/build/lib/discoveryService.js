"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryService = void 0;
const sanitizer_1 = require("./sanitizer");
class DiscoveryService {
    adapter;
    config;
    onNode;
    bonjour;
    browsers = [];
    constructor(adapter, config, onNode) {
        this.adapter = adapter;
        this.config = config;
        this.onNode = onNode;
    }
    start() {
        if (!this.config.discoveryEnabled) {
            this.adapter.log.info('EEBUS discovery is disabled.');
            return;
        }
        let Bonjour;
        try {
            ({ Bonjour } = require('bonjour-service'));
        }
        catch (error) {
            this.adapter.log.warn(`bonjour-service is not available. EEBUS mDNS discovery cannot start until dependencies are installed: ${String(error)}`);
            return;
        }
        this.bonjour = new Bonjour();
        this.startBrowser('ship');
        this.startBrowser('shippairing');
        this.adapter.log.info('Started EEBUS mDNS discovery for _ship._tcp and _shippairing._tcp.');
    }
    stop() {
        for (const browser of this.browsers) {
            try {
                browser.stop?.();
            }
            catch (error) {
                this.adapter.log.debug(`Could not stop mDNS browser: ${String(error)}`);
            }
        }
        this.browsers = [];
        try {
            this.bonjour?.destroy?.();
        }
        catch (error) {
            this.adapter.log.debug(`Could not destroy bonjour instance: ${String(error)}`);
        }
        this.bonjour = undefined;
    }
    startBrowser(type) {
        const browser = this.bonjour.find({ type, protocol: 'tcp' });
        browser.on('up', (service) => void this.handleService(type, service));
        browser.on('error', (error) => this.adapter.log.warn(`mDNS ${type} browser error: ${error.message}`));
        this.browsers.push(browser);
    }
    async handleService(serviceType, service) {
        const txt = normalizeTxt(service.txt || {});
        const id = txt.id || service.fqdn || service.name || txt.ski || `${service.host}:${service.port}`;
        const ski = String(txt.ski || '').toUpperCase();
        const host = firstAddress(service) || service.host || service.referer?.address || '';
        const port = Number(service.port || 0);
        const name = service.name || txt.model || txt.id || id;
        const categories = String(txt.cat || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean);
        const node = {
            id,
            safeId: (0, sanitizer_1.safeId)(ski || id),
            name,
            host,
            port,
            path: txt.path || '/ship/',
            ski,
            brand: txt.brand || '',
            type: txt.type || '',
            model: txt.model || '',
            serial: txt.serial || '',
            categories,
            register: (0, sanitizer_1.toBoolean)(txt.register, false),
            ecc: (0, sanitizer_1.toBoolean)(txt.ecc, false),
            txt,
            serviceType,
            lastSeen: new Date().toISOString(),
        };
        await this.onNode(node);
    }
}
exports.DiscoveryService = DiscoveryService;
function normalizeTxt(txt) {
    const result = {};
    for (const [key, value] of Object.entries(txt)) {
        if (Array.isArray(value)) {
            result[key] = value.map(item => String(item)).join(',');
        }
        else {
            result[key] = String(value ?? '');
        }
    }
    return result;
}
function firstAddress(service) {
    if (Array.isArray(service.addresses) && service.addresses.length > 0) {
        return String(service.addresses[0]);
    }
    return '';
}
//# sourceMappingURL=discoveryService.js.map