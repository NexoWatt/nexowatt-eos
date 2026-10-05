"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityManager = void 0;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const node_util_1 = require("node:util");
const sanitizer_1 = require("./sanitizer");
const shipSecurity_1 = require("./shipSecurity");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
class IdentityManager {
    adapter;
    config;
    constructor(adapter, config) {
        this.adapter = adapter;
        this.config = config;
    }
    async ensureIdentity() {
        const existing = this.identityFromConfig();
        if (existing) {
            this.adapter.log.info(`Using existing EEBUS identity with SKI ${existing.localSki}`);
            return existing;
        }
        this.adapter.log.info('No complete EEBUS identity found. Generating local secp256r1 certificate and SKI.');
        const generated = await this.generateIdentity();
        await this.persistIdentity(generated);
        return generated;
    }
    identityFromConfig() {
        if (!this.config.certificate || !this.config.privateKey) {
            return null;
        }
        const certificateFingerprint = this.config.certificateFingerprint || this.calculateFingerprint(this.config.certificate);
        const localSki = this.deriveSkiFromCertificate(this.config.certificate);
        const shipId = this.config.shipId || this.createShipId();
        if (!localSki || !shipId) {
            return null;
        }
        return {
            certificate: this.config.certificate,
            privateKey: this.config.privateKey,
            localSki,
            shipId,
            certificateFingerprint,
            createdAt: new Date().toISOString(),
        };
    }
    async generateIdentity() {
        const workDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'iobroker-eebus-'));
        const keyFile = (0, node_path_1.join)(workDir, 'local.key');
        const certFile = (0, node_path_1.join)(workDir, 'local.crt');
        const subject = `/CN=${(0, sanitizer_1.sanitizeCertificateSubjectValue)(this.config.serviceName, 'NexoWatt EOS')}/O=${(0, sanitizer_1.sanitizeCertificateSubjectValue)(this.config.brand, 'NexoWatt')}`;
        try {
            await execFileAsync('openssl', ['ecparam', '-genkey', '-name', 'prime256v1', '-noout', '-out', keyFile]);
            try {
                await execFileAsync('openssl', [
                    'req',
                    '-new',
                    '-x509',
                    '-key',
                    keyFile,
                    '-sha256',
                    '-days',
                    '3650',
                    '-subj',
                    subject,
                    '-addext',
                    'subjectKeyIdentifier=hash',
                    '-out',
                    certFile,
                ]);
            }
            catch (error) {
                this.adapter.log.warn(`OpenSSL did not accept -addext subjectKeyIdentifier=hash. Falling back to default certificate generation: ${String(error)}`);
                await execFileAsync('openssl', [
                    'req',
                    '-new',
                    '-x509',
                    '-key',
                    keyFile,
                    '-sha256',
                    '-days',
                    '3650',
                    '-subj',
                    subject,
                    '-out',
                    certFile,
                ]);
            }
            const privateKey = await (0, promises_1.readFile)(keyFile, 'utf8');
            const certificate = await (0, promises_1.readFile)(certFile, 'utf8');
            const localSki = (await this.readSkiExtension(certFile)) || this.deriveSkiFromCertificate(certificate);
            const certificateFingerprint = this.calculateFingerprint(certificate);
            return {
                certificate,
                privateKey,
                localSki,
                shipId: this.createShipId(),
                certificateFingerprint,
                createdAt: new Date().toISOString(),
            };
        }
        finally {
            await (0, promises_1.rm)(workDir, { recursive: true, force: true });
        }
    }
    async readSkiExtension(certFile) {
        try {
            const { stdout } = await execFileAsync('openssl', ['x509', '-in', certFile, '-noout', '-ext', 'subjectKeyIdentifier']);
            const match = String(stdout).match(/Subject Key Identifier:\s*[\r\n]+\s*([0-9A-Fa-f:]+)/);
            return String(match?.[1] || '').replace(/:/g, '').toUpperCase();
        }
        catch {
            return '';
        }
    }
    deriveSkiFromCertificate(certificate) {
        try {
            return (0, shipSecurity_1.certificateIdentity)(certificate).ski;
        }
        catch (error) {
            this.adapter.log.warn(`Could not derive SKI from certificate: ${String(error)}`);
            return '';
        }
    }
    calculateFingerprint(certificate) {
        try {
            const x509 = new node_crypto_1.X509Certificate(certificate);
            return String(x509.fingerprint256 || '').replace(/:/g, '').toUpperCase();
        }
        catch {
            return '';
        }
    }
    createShipId() {
        const vpid = (0, node_crypto_1.randomUUID)().replace(/-/g, '').slice(0, 32);
        return `i:${this.config.ianaPen}_u:${vpid}`;
    }
    async persistIdentity(identity) {
        const instanceObjectId = `system.adapter.${this.adapter.namespace}`;
        try {
            const obj = await this.adapter.getForeignObjectAsync(instanceObjectId);
            if (!obj) {
                this.adapter.log.warn(`Could not persist EEBUS identity: ${instanceObjectId} not found`);
                return;
            }
            obj.native = {
                ...obj.native,
                certificate: identity.certificate,
                privateKey: identity.privateKey,
                shipId: identity.shipId,
                localSki: identity.localSki,
                certificateFingerprint: identity.certificateFingerprint,
            };
            await this.adapter.setForeignObjectAsync(instanceObjectId, obj);
            this.adapter.log.info('Generated EEBUS identity was persisted in protected/encrypted native configuration.');
        }
        catch (error) {
            this.adapter.log.error(`Could not persist generated EEBUS identity: ${String(error)}`);
        }
    }
}
exports.IdentityManager = IdentityManager;
//# sourceMappingURL=identityManager.js.map