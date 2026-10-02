import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, lstat, mkdir, open, realpath, rm, stat, statfs } from 'node:fs/promises';
import { posix as pathPosix } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface SdCardTarget {
    device: string;
    parentDevice: string;
    mountPoint: string;
    fsType: string;
    size: number;
    model: string;
    transport: string;
    label: string;
}

export interface SdCardValidationResult extends SdCardTarget {
    backupDir: string;
    freeBytes: number;
}

interface BlockDeviceJson {
    name?: string;
    kname?: string;
    path?: string;
    pkname?: string;
    type?: string;
    size?: string | number;
    fstype?: string | null;
    mountpoint?: string | null;
    mountpoints?: Array<string | null> | string | null;
    rm?: string | number | boolean;
    ro?: string | number | boolean;
    hotplug?: string | number | boolean;
    tran?: string | null;
    model?: string | null;
    children?: BlockDeviceJson[];
}

interface FlatBlockDevice {
    name: string;
    kname: string;
    path: string;
    pkname: string;
    type: string;
    size: number;
    fsType: string;
    mountPoints: string[];
    removable: boolean;
    readOnly: boolean;
    hotplug: boolean;
    transport: string;
    model: string;
}

interface FindmntFileSystem {
    source?: string;
    target?: string;
    fstype?: string;
    options?: string;
}

interface FindmntJson {
    filesystems?: FindmntFileSystem[];
}

export interface SdCardDiscoverySnapshot {
    devices: FlatBlockDevice[];
    rootSource: string;
}

function execFileAsync(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolvePromise, rejectPromise) => {
        execFile(command, args, { maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                const detail = stderr?.trim() || error.message;
                rejectPromise(new Error(`${command} konnte nicht ausgeführt werden: ${detail}`));
                return;
            }
            resolvePromise({ stdout, stderr });
        });
    });
}

function asBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeDevicePath(value: string): string {
    if (!value) {
        return '';
    }
    const withoutSubvolume = value.replace(/\[.*\]$/, '');
    return withoutSubvolume.startsWith('/dev/') ? withoutSubvolume : value;
}

function normalizeMountPoint(value: string): string {
    if (!value) {
        return '';
    }
    const normalized = pathPosix.resolve(value);
    return normalized.length > 1 ? normalized.replace(/[\\/]+$/, '') : normalized;
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return 'unbekannte Größe';
    }
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index++;
    }
    const digits = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(digits)} ${units[index]}`;
}

function getMountPoints(device: BlockDeviceJson): string[] {
    const raw = device.mountpoints ?? device.mountpoint;
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return values
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(value => normalizeMountPoint(value));
}

function flattenBlockDevices(devices: BlockDeviceJson[], result: FlatBlockDevice[] = []): FlatBlockDevice[] {
    for (const device of devices) {
        const name = String(device.name || '');
        const kname = String(device.kname || name);
        const path = String(device.path || (kname ? `/dev/${kname}` : ''));
        result.push({
            name,
            kname,
            path,
            pkname: String(device.pkname || ''),
            type: String(device.type || ''),
            size: Number(device.size || 0),
            fsType: String(device.fstype || ''),
            mountPoints: getMountPoints(device),
            removable: asBoolean(device.rm),
            readOnly: asBoolean(device.ro),
            hotplug: asBoolean(device.hotplug),
            transport: String(device.tran || '').toLowerCase(),
            model: String(device.model || '').trim(),
        });
        if (Array.isArray(device.children)) {
            flattenBlockDevices(device.children, result);
        }
    }
    return result;
}

export function parseLsblkOutput(text: string): FlatBlockDevice[] {
    let parsed: { blockdevices?: BlockDeviceJson[] };
    try {
        parsed = JSON.parse(text) as { blockdevices?: BlockDeviceJson[] };
    } catch (error) {
        throw new Error(`lsblk-Ausgabe ist kein gültiges JSON: ${(error as Error).message}`);
    }
    return flattenBlockDevices(parsed.blockdevices || []);
}

async function readBlockDevices(): Promise<FlatBlockDevice[]> {
    const columns = 'NAME,KNAME,PATH,PKNAME,TYPE,SIZE,FSTYPE,MOUNTPOINTS,RM,RO,HOTPLUG,TRAN,MODEL';
    try {
        const { stdout } = await execFileAsync('lsblk', ['--json', '--bytes', '--output', columns]);
        return parseLsblkOutput(stdout);
    } catch (firstError) {
        // Older util-linux versions do not support MOUNTPOINTS. MOUNTPOINT is sufficient for EOS.
        try {
            const fallbackColumns = 'NAME,KNAME,PATH,PKNAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,RM,RO,HOTPLUG,TRAN,MODEL';
            const { stdout } = await execFileAsync('lsblk', ['--json', '--bytes', '--output', fallbackColumns]);
            return parseLsblkOutput(stdout);
        } catch {
            throw firstError;
        }
    }
}

async function readRootSource(): Promise<string> {
    const { stdout } = await execFileAsync('findmnt', ['--noheadings', '--output', 'SOURCE', '--target', '/']);
    return normalizeDevicePath(stdout.trim().split(/\r?\n/)[0] || '');
}

async function readFindmnt(target: string): Promise<FindmntFileSystem> {
    const { stdout } = await execFileAsync('findmnt', [
        '--json',
        '--output',
        'SOURCE,TARGET,FSTYPE,OPTIONS',
        '--target',
        target,
    ]);
    let parsed: FindmntJson;
    try {
        parsed = JSON.parse(stdout) as FindmntJson;
    } catch (error) {
        throw new Error(`findmnt-Ausgabe ist kein gültiges JSON: ${(error as Error).message}`);
    }
    const fileSystem = parsed.filesystems?.[0];
    if (!fileSystem) {
        throw new Error(`Für „${target}“ wurde kein eingebundenes Dateisystem gefunden.`);
    }
    return fileSystem;
}

function byNameMap(devices: FlatBlockDevice[]): Map<string, FlatBlockDevice> {
    const map = new Map<string, FlatBlockDevice>();
    for (const device of devices) {
        for (const key of [device.name, device.kname, device.path, pathPosix.basename(device.path)]) {
            if (key) {
                map.set(key, device);
            }
        }
    }
    return map;
}

function findDevice(devices: FlatBlockDevice[], source: string): FlatBlockDevice | undefined {
    const normalized = normalizeDevicePath(source);
    const map = byNameMap(devices);
    return map.get(normalized) || map.get(pathPosix.basename(normalized));
}

function topParent(device: FlatBlockDevice, devices: FlatBlockDevice[]): FlatBlockDevice {
    const map = byNameMap(devices);
    let current = device;
    const visited = new Set<string>();
    while (current.pkname && !visited.has(current.kname)) {
        visited.add(current.kname);
        const parent = map.get(current.pkname) || map.get(pathPosix.basename(current.pkname));
        if (!parent) {
            break;
        }
        current = parent;
    }
    return current;
}

function isSdLike(device: FlatBlockDevice): boolean {
    const kernelName = device.kname || device.name;
    if (/^mmcblk\d+$/i.test(kernelName)) {
        return true;
    }
    if (device.transport === 'mmc' || device.transport === 'sd') {
        return true;
    }
    // USB card readers normally expose removable media (RM=1). HOTPLUG alone is not
    // sufficient because USB SSDs are often hot-pluggable as well and must not be offered as SD cards.
    if (device.transport === 'usb' && device.removable) {
        return true;
    }
    return device.removable && device.hotplug;
}

function isForbiddenMountPoint(mountPoint: string): boolean {
    const normalized = normalizeMountPoint(mountPoint);
    return ['/', '/boot', '/boot/firmware', '/efi', '/usr', '/var', '/opt', '/home'].includes(normalized);
}

export function selectSdCardTargets(snapshot: SdCardDiscoverySnapshot): SdCardTarget[] {
    const { devices, rootSource } = snapshot;
    const rootNode = findDevice(devices, rootSource) || devices.find(device => device.mountPoints.includes('/'));
    const rootParent = rootNode ? topParent(rootNode, devices) : undefined;
    const seen = new Set<string>();
    const result: SdCardTarget[] = [];

    for (const device of devices) {
        if (!device.mountPoints.length || device.readOnly || !device.fsType || device.type === 'loop' || device.type === 'rom') {
            continue;
        }
        const parent = topParent(device, devices);
        if (!isSdLike(parent)) {
            continue;
        }
        if (rootParent && parent.kname === rootParent.kname) {
            continue;
        }
        for (const mountPoint of device.mountPoints) {
            if (!mountPoint || isForbiddenMountPoint(mountPoint) || seen.has(mountPoint)) {
                continue;
            }
            seen.add(mountPoint);
            const model = parent.model || device.model || 'SD-/Wechseldatenträger';
            const size = parent.size || device.size;
            result.push({
                device: device.path,
                parentDevice: parent.path,
                mountPoint,
                fsType: device.fsType,
                size,
                model,
                transport: parent.transport,
                label: `${model} · ${formatBytes(size)} · ${device.path} · ${mountPoint}`,
            });
        }
    }

    return result.sort((a, b) => a.mountPoint.localeCompare(b.mountPoint));
}

export async function discoverSdCardTargets(): Promise<SdCardTarget[]> {
    if (process.platform !== 'linux') {
        return [];
    }
    const [devices, rootSource] = await Promise.all([readBlockDevices(), readRootSource()]);
    return selectSdCardTargets({ devices, rootSource });
}

export function normalizeSdCardSubDir(value?: string | null): string {
    const raw = String(value || 'nexowatt-eos-backups').trim().replace(/\\/g, '/');
    if (!raw || pathPosix.isAbsolute(raw) || raw.startsWith('/') || raw.includes('\0')) {
        throw new Error('Der Backup-Unterordner der SD-Karte muss ein relativer, nicht leerer Pfad sein.');
    }
    const segments = raw.split('/').filter(Boolean);
    if (!segments.length || segments.some(segment => segment === '.' || segment === '..')) {
        throw new Error('Der Backup-Unterordner der SD-Karte darf keine „.“- oder „..“-Segmente enthalten.');
    }
    return segments.join('/');
}

export function resolveSdCardBackupDir(mountPath?: string | null, subDir?: string | null): string {
    const mount = String(mountPath || '').trim();
    if (!mount || !pathPosix.isAbsolute(mount)) {
        return '';
    }
    try {
        const safeSubDir = normalizeSdCardSubDir(subDir);
        const target = pathPosix.resolve(mount, safeSubDir);
        const rel = pathPosix.relative(pathPosix.resolve(mount), target);
        if (!rel || rel.startsWith('..') || pathPosix.isAbsolute(rel)) {
            return '';
        }
        return target;
    } catch {
        return '';
    }
}

async function canonicalPath(value: string): Promise<string> {
    try {
        return normalizeMountPoint(await realpath(value));
    } catch {
        return normalizeMountPoint(value);
    }
}

function assertInside(parent: string, child: string): void {
    const rel = pathPosix.relative(parent, child);
    if (!rel || rel.startsWith(`..${pathPosix.sep}`) || rel === '..' || pathPosix.isAbsolute(rel)) {
        throw new Error(`Der Backup-Pfad „${child}“ liegt nicht innerhalb der ausgewählten SD-Karte „${parent}“.`);
    }
}

export async function validateSdCardTarget(
    mountPath: string,
    subDir?: string | null,
    options: { createDirectory?: boolean; writeTest?: boolean; accessMode?: 'read' | 'write' } = {},
): Promise<SdCardValidationResult> {
    if (process.platform !== 'linux') {
        throw new Error('SD-Karten als Backupziel werden nur unter Linux unterstützt.');
    }
    if (!mountPath || !pathPosix.isAbsolute(mountPath)) {
        throw new Error('Es wurde keine gültige eingebundene SD-Karte ausgewählt.');
    }

    const normalizedMount = normalizeMountPoint(mountPath);
    if (isForbiddenMountPoint(normalizedMount)) {
        throw new Error(`Der Pfad „${normalizedMount}“ ist ein Systempfad und darf nicht als SD-Backupziel verwendet werden.`);
    }

    const [devices, rootSource, mountInfo] = await Promise.all([
        readBlockDevices(),
        readRootSource(),
        readFindmnt(normalizedMount),
    ]);

    const actualTarget = await canonicalPath(String(mountInfo.target || ''));
    const expectedTarget = await canonicalPath(normalizedMount);
    if (actualTarget !== expectedTarget) {
        throw new Error(
            `Der Pfad „${normalizedMount}“ ist kein eigener Einhängepunkt. Die SD-Karte ist vermutlich nicht eingesteckt oder nicht eingebunden. Die Sicherung wird abgebrochen; es gibt kein Fallback auf den Systemdatenträger.`,
        );
    }

    const source = normalizeDevicePath(String(mountInfo.source || ''));
    const targetNode = findDevice(devices, source) || devices.find(device => device.mountPoints.includes(expectedTarget));
    if (!targetNode) {
        throw new Error(`Der Datenträger hinter „${normalizedMount}“ konnte nicht eindeutig als Blockgerät ermittelt werden.`);
    }
    const targetParent = topParent(targetNode, devices);
    const rootNode = findDevice(devices, rootSource) || devices.find(device => device.mountPoints.includes('/'));
    const rootParent = rootNode ? topParent(rootNode, devices) : undefined;
    if (rootParent && targetParent.kname === rootParent.kname) {
        throw new Error('Der ausgewählte Datenträger ist der Systemdatenträger und wird als SD-Backupziel ausgeschlossen.');
    }
    if (!isSdLike(targetParent)) {
        throw new Error('Der ausgewählte Datenträger ist nicht als SD-Karte oder entfernbarer Kartenleser erkennbar.');
    }
    const readOnlyAccess = options.accessMode === 'read';
    const createDirectory = !readOnlyAccess && options.createDirectory !== false;
    const writeTest = !readOnlyAccess && options.writeTest !== false;
    if (!readOnlyAccess && (targetNode.readOnly || !String(mountInfo.options || '').split(',').includes('rw'))) {
        throw new Error('Die ausgewählte SD-Karte ist schreibgeschützt oder nur lesbar eingebunden.');
    }

    const safeSubDir = normalizeSdCardSubDir(subDir);
    const backupDir = pathPosix.resolve(expectedTarget, safeSubDir);
    assertInside(expectedTarget, backupDir);

    // The mount root only needs to be traversable. Permissions are checked on
    // the actual backup directory, not on its root-owned parent. A read-only
    // list/restore request must never create a directory or a write probe.
    const mountStats = await stat(expectedTarget);
    let current = expectedTarget;
    for (const segment of safeSubDir.split('/')) {
        current = pathPosix.join(current, segment);
        let info;
        try {
            info = await lstat(current);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
            if (!createDirectory) {
                const missing = new Error(`Das SD-Sicherungsverzeichnis „${current}“ wurde noch nicht angelegt.`) as NodeJS.ErrnoException;
                missing.code = 'SD_BACKUP_DIR_MISSING';
                throw missing;
            }
            try {
                await mkdir(current, { mode: 0o750 });
            } catch (mkdirError) {
                if ((mkdirError as NodeJS.ErrnoException).code !== 'EEXIST') {
                    throw new Error(`Das SD-Sicherungsverzeichnis „${current}“ konnte nicht angelegt werden (${(mkdirError as NodeJS.ErrnoException).code || 'Dateisystemfehler'}). Prüfen Sie die Rechte des übergeordneten Verzeichnisses.`);
                }
            }
            info = await lstat(current);
        }
        // Do not follow a symlink, or a nested filesystem, off the selected card.
        if (info.isSymbolicLink() || !info.isDirectory()) {
            throw new Error(`Der SD-Backup-Pfad „${current}“ muss ein echtes Verzeichnis ohne symbolische Verknüpfungen sein.`);
        }
        const realCurrent = await realpath(current);
        assertInside(expectedTarget, realCurrent);
        if (info.dev !== mountStats.dev) {
            throw new Error(`Der SD-Backup-Pfad „${current}“ liegt auf einem anderen Dateisystem als die ausgewählte SD-Karte.`);
        }
    }

    const requiredAccess = readOnlyAccess
        ? fsConstants.R_OK | fsConstants.X_OK
        : fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK;
    try {
        await access(backupDir, requiredAccess);
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code || 'Dateisystemfehler';
        throw new Error(`Der Backup-Dienst hat keine ausreichenden ${readOnlyAccess ? 'Lese-/Suchrechte' : 'Lese-/Schreib-/Suchrechte'} auf dem Sicherungsverzeichnis „${backupDir}“ (${code}).`);
    }

    // A removal/remount between discovery and directory checking must not fall
    // back to a same-named directory on the operating-system disk.
    const currentMount = await readFindmnt(expectedTarget);
    if (
        (await canonicalPath(String(currentMount.target || ''))) !== expectedTarget ||
        normalizeDevicePath(String(currentMount.source || '')) !== source ||
        (!readOnlyAccess && !String(currentMount.options || '').split(',').includes('rw'))
    ) {
        throw new Error('Die SD-Karte wurde während der Prüfung entfernt oder anders eingebunden. Es wird nicht auf den Systemdatenträger ausgewichen.');
    }

    if (writeTest) {
        const probe = pathPosix.resolve(backupDir, `.nexowatt-write-test-${process.pid}-${randomUUID()}`);
        let handle;
        try {
            handle = await open(probe, 'wx', 0o600);
            await handle.writeFile('NexoWatt EOS SD-card write test\n', 'utf8');
            await handle.sync();
        } finally {
            await handle?.close().catch(() => undefined);
            await rm(probe, { force: true }).catch(() => undefined);
        }
    }

    const fileSystemStats = await statfs(expectedTarget);
    const freeBytes = Number(fileSystemStats.bavail) * Number(fileSystemStats.bsize);
    const model = targetParent.model || targetNode.model || 'SD-/Wechseldatenträger';
    const size = targetParent.size || targetNode.size;

    return {
        device: targetNode.path,
        parentDevice: targetParent.path,
        mountPoint: expectedTarget,
        fsType: String(mountInfo.fstype || targetNode.fsType || ''),
        size,
        model,
        transport: targetParent.transport,
        label: `${model} · ${formatBytes(size)} · ${targetNode.path} · ${expectedTarget}`,
        backupDir,
        freeBytes,
    };
}

export function formatSdCardFreeSpace(bytes: number): string {
    return formatBytes(bytes);
}
