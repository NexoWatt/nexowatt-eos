import { execFile } from 'node:child_process';
import { randomUUID, X509Certificate } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { EebusConfig } from './config';
import { EebusIdentity } from './eebusTypes';
import { sanitizeCertificateSubjectValue } from './sanitizer';

import { certificateIdentity } from './shipSecurity';

const execFileAsync = promisify(execFile);

export class IdentityManager {
    public constructor(
        private readonly adapter: any,
        private readonly config: EebusConfig,
    ) {}

    public async ensureIdentity(): Promise<EebusIdentity> {
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

    private identityFromConfig(): EebusIdentity | null {
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

    private async generateIdentity(): Promise<EebusIdentity> {
        const workDir = await mkdtemp(join(tmpdir(), 'iobroker-eebus-'));
        const keyFile = join(workDir, 'local.key');
        const certFile = join(workDir, 'local.crt');
        const subject = `/CN=${sanitizeCertificateSubjectValue(this.config.serviceName, 'NexoWatt EOS')}/O=${sanitizeCertificateSubjectValue(this.config.brand, 'NexoWatt')}`;

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
            } catch (error) {
                this.adapter.log.warn(
                    `OpenSSL did not accept -addext subjectKeyIdentifier=hash. Falling back to default certificate generation: ${String(
                        error,
                    )}`,
                );
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

            const privateKey = await readFile(keyFile, 'utf8');
            const certificate = await readFile(certFile, 'utf8');
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
        } finally {
            await rm(workDir, { recursive: true, force: true });
        }
    }

    private async readSkiExtension(certFile: string): Promise<string> {
        try {
            const { stdout } = await execFileAsync('openssl', ['x509', '-in', certFile, '-noout', '-ext', 'subjectKeyIdentifier']);
            const match = String(stdout).match(/Subject Key Identifier:\s*[\r\n]+\s*([0-9A-Fa-f:]+)/);
            return String(match?.[1] || '').replace(/:/g, '').toUpperCase();
        } catch {
            return '';
        }
    }

    private deriveSkiFromCertificate(certificate: string): string {
        try {
            return certificateIdentity(certificate).ski;
        } catch (error) {
            this.adapter.log.warn(`Could not derive SKI from certificate: ${String(error)}`);
            return '';
        }
    }

    private calculateFingerprint(certificate: string): string {
        try {
            const x509 = new X509Certificate(certificate);
            return String(x509.fingerprint256 || '').replace(/:/g, '').toUpperCase();
        } catch {
            return '';
        }
    }

    private createShipId(): string {
        const vpid = randomUUID().replace(/-/g, '').slice(0, 32);
        return `i:${this.config.ianaPen}_u:${vpid}`;
    }

    private async persistIdentity(identity: EebusIdentity): Promise<void> {
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
        } catch (error) {
            this.adapter.log.error(`Could not persist generated EEBUS identity: ${String(error)}`);
        }
    }
}
