import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { hostname, platform, release, arch } from 'node:os';
import { basename, join } from 'node:path';

import { getDate } from '../tools';
import { compressAsync } from '../targz';
import type { BackItUpProps } from '../types';

interface NexoWattEosOptions {
    enabled: boolean;
    nameSuffix?: string;
    includeVendorFile: boolean;
    includeVendorSecret: boolean;
    adapterVersion?: string;
}

interface ProfileFile {
    source: string;
    archivePath: string;
    size: number;
    sha256: string;
    sensitive: boolean;
}

interface AdapterInventoryEntry {
    id: string;
    version: string | null;
    enabled: boolean;
    host: string | null;
}

function sha256(path: string): string {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function copyProfileFile(
    source: string,
    targetDir: string,
    archiveName: string,
    sensitive: boolean,
): ProfileFile | null {
    if (!existsSync(source)) {
        return null;
    }
    const target = join(targetDir, archiveName);
    copyFileSync(source, target);
    const stat = statSync(target);
    return {
        source,
        archivePath: `files/${archiveName}`,
        size: stat.size,
        sha256: sha256(target),
        sensitive,
    };
}

async function readAdapterInventory(adapter: ioBroker.Adapter | null): Promise<AdapterInventoryEntry[]> {
    if (!adapter) {
        return [];
    }
    try {
        const view = await adapter.getObjectViewAsync('system', 'instance', {
            startkey: 'system.adapter.',
            endkey: 'system.adapter.\u9999',
        });
        const rows = view.rows as Array<{ id: string; value: ioBroker.InstanceObject }>;
        return rows
            .map((row): AdapterInventoryEntry => {
                const object = row.value;
                return {
                    id: row.id.replace('system.adapter.', ''),
                    version: object.common?.version || null,
                    enabled: object.common?.enabled === true,
                    host: object.common?.host || null,
                };
            })
            .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    } catch (error) {
        adapter.log.warn(`EOS adapter inventory could not be read: ${error}`);
        return [];
    }
}

/**
 * Creates the supplemental NexoWatt EOS system profile.
 *
 * The normal ioBroker archive remains the authoritative restore point. This profile carries
 * diagnostic metadata and selected vendor files that live outside the ioBroker object database.
 * Secrets are excluded unless the installer explicitly opts in.
 */
export async function run(props: BackItUpProps<NexoWattEosOptions>): Promise<void> {
    const { context: ctx, options } = props;
    const suffix = options.nameSuffix ? `_${options.nameSuffix}` : '';
    const archive = join(
        ctx.backupDir,
        `nexowattEOS_${getDate(new Date(ctx.timestamp))}${suffix}_backupconfig.tar.gz`,
    );
    const staging = join(ctx.backupDir, `.nexowatt-eos-profile-${ctx.timestamp}-${process.pid}`);
    const profileDir = join(staging, 'nexowatt-eos-profile');
    const fileDir = join(profileDir, 'files');

    mkdirSync(fileDir, { recursive: true, mode: 0o700 });

    const files: ProfileFile[] = [];
    const warnings: string[] = [];

    try {
        if (options.includeVendorFile) {
            const publicVendor = copyProfileFile('/etc/iob-vendor.json', fileDir, 'iob-vendor.json', false);
            if (publicVendor) {
                files.push(publicVendor);
            } else {
                warnings.push('/etc/iob-vendor.json not found');
            }
        }

        if (options.includeVendorSecret) {
            ctx.log.warn('The unencrypted EOS system profile includes iob-vendor-secret.json. Use only protected backup targets.');
            const secretVendor = copyProfileFile(
                '/opt/iobroker/iob-vendor-secret.json',
                fileDir,
                'iob-vendor-secret.json',
                true,
            );
            if (secretVendor) {
                files.push(secretVendor);
            } else {
                warnings.push('/opt/iobroker/iob-vendor-secret.json not found');
            }
        }

        const inventory = await readAdapterInventory(ctx.adapter);
        const manifest = {
            schema: 'nexowatt-eos-backup-profile/v1',
            createdAt: new Date(ctx.timestamp).toISOString(),
            purpose: 'Supplemental NexoWatt EOS recovery and diagnostics profile',
            restoreAuthority: 'The accompanying ioBroker backup archive is the authoritative restore point.',
            security: {
                archiveEncrypted: false,
                vendorSecretIncluded: options.includeVendorSecret,
            },
            system: {
                hostname: hostname(),
                platform: platform(),
                release: release(),
                architecture: arch(),
                node: process.version,
            },
            adapter: {
                namespace: ctx.adapter?.namespace || null,
                version: options.adapterVersion || null,
                upstream: {
                    package: 'iobroker.backitup',
                    version: '4.0.1',
                    sourceCommit: '6e3a28c99e79da26ea5e41197716cd03d60f804b',
                },
            },
            profileOptions: {
                includeVendorFile: options.includeVendorFile,
                includeVendorSecret: options.includeVendorSecret,
            },
            eosCoreInstances: inventory.filter(item => {
                const id = item.id;
                return [
                    'eos-admin.',
                    'nexowatt-',
                    'energy-bridge.',
                    'ocpp21.',
                    'eebus.',
                    'xtherm.',
                    'influxdb.',
                    'javascript.',
                    'modbus.',
                    'pvforecast.',
                    'wireless-settings.',
                    'email.',
                ].some(prefix => id.startsWith(prefix));
            }),
            adapterInventory: inventory,
            files,
            warnings,
        };

        const manifestPath = join(profileDir, 'manifest.json');
        const readmePath = join(profileDir, 'README.txt');
        writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
        writeFileSync(
            readmePath,
            [
                'NexoWatt EOS system profile',
                '',
                'This archive supplements the ioBroker backup created in the same run.',
                'Validate its contents with CHECKSUMS.sha256 before using included files.',
                'The archive is not encrypted. A vendor secret is included only when explicitly enabled.',
                'The regular ioBroker archive remains the authoritative restore point.',
                '',
            ].join('\n'),
            { mode: 0o600 },
        );
        const checksumLines = [
            `${sha256(manifestPath)}  manifest.json`,
            `${sha256(readmePath)}  README.txt`,
            ...files.map(file => `${file.sha256}  ${file.archivePath}`),
        ];
        writeFileSync(join(profileDir, 'CHECKSUMS.sha256'), `${checksumLines.join('\n')}\n`, { mode: 0o600 });

        await compressAsync({ src: staging, dest: archive });
        chmodSync(archive, 0o600);
        const archiveHash = sha256(archive);

        ctx.fileNames.push(archive);
        ctx.done.push('nexowattEOS');
        ctx.types.push('nexowattEOS');
        ctx.log.debug(`NexoWatt EOS system profile created: ${basename(archive)}`);

        if (ctx.adapter) {
            try {
                await ctx.adapter.setStateAsync('info.eosProfile', JSON.stringify(manifest), true);
                await ctx.adapter.setStateAsync('info.eosProfileLastTime', ctx.timestamp, true);
                await ctx.adapter.setStateAsync('info.eosProfileSha256', archiveHash, true);
            } catch (stateError) {
                ctx.log.warn(`EOS profile status states could not be written: ${stateError}`);
            }
        }
    } catch (error) {
        ctx.errors.nexowattEOS = error as Error;
        throw error;
    } finally {
        rmSync(staging, { recursive: true, force: true });
    }
}

export const ignoreErrors = false;
