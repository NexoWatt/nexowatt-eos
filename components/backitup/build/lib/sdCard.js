"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLsblkOutput = parseLsblkOutput;
exports.selectSdCardTargets = selectSdCardTargets;
exports.discoverSdCardTargets = discoverSdCardTargets;
exports.normalizeSdCardSubDir = normalizeSdCardSubDir;
exports.resolveSdCardBackupDir = resolveSdCardBackupDir;
exports.validateSdCardTarget = validateSdCardTarget;
exports.formatSdCardFreeSpace = formatSdCardFreeSpace;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
function execFileAsync(command, args) {
    return new Promise((resolvePromise, rejectPromise) => {
        (0, node_child_process_1.execFile)(command, args, { maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                const detail = stderr?.trim() || error.message;
                rejectPromise(new Error(`${command} konnte nicht ausgeführt werden: ${detail}`));
                return;
            }
            resolvePromise({ stdout, stderr });
        });
    });
}
function asBoolean(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}
function normalizeDevicePath(value) {
    if (!value) {
        return '';
    }
    const withoutSubvolume = value.replace(/\[.*\]$/, '');
    return withoutSubvolume.startsWith('/dev/') ? withoutSubvolume : value;
}
function normalizeMountPoint(value) {
    if (!value) {
        return '';
    }
    const normalized = node_path_1.posix.resolve(value);
    return normalized.length > 1 ? normalized.replace(/[\\/]+$/, '') : normalized;
}
function formatBytes(bytes) {
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
function getMountPoints(device) {
    const raw = device.mountpoints ?? device.mountpoint;
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return values
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .map(value => normalizeMountPoint(value));
}
function flattenBlockDevices(devices, result = []) {
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
function parseLsblkOutput(text) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        throw new Error(`lsblk-Ausgabe ist kein gültiges JSON: ${error.message}`);
    }
    return flattenBlockDevices(parsed.blockdevices || []);
}
async function readBlockDevices() {
    const columns = 'NAME,KNAME,PATH,PKNAME,TYPE,SIZE,FSTYPE,MOUNTPOINTS,RM,RO,HOTPLUG,TRAN,MODEL';
    try {
        const { stdout } = await execFileAsync('lsblk', ['--json', '--bytes', '--output', columns]);
        return parseLsblkOutput(stdout);
    }
    catch (firstError) {
        // Older util-linux versions do not support MOUNTPOINTS. MOUNTPOINT is sufficient for EOS.
        try {
            const fallbackColumns = 'NAME,KNAME,PATH,PKNAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,RM,RO,HOTPLUG,TRAN,MODEL';
            const { stdout } = await execFileAsync('lsblk', ['--json', '--bytes', '--output', fallbackColumns]);
            return parseLsblkOutput(stdout);
        }
        catch {
            throw firstError;
        }
    }
}
async function readRootSource() {
    const { stdout } = await execFileAsync('findmnt', ['--noheadings', '--output', 'SOURCE', '--target', '/']);
    return normalizeDevicePath(stdout.trim().split(/\r?\n/)[0] || '');
}
async function readFindmnt(target) {
    const { stdout } = await execFileAsync('findmnt', [
        '--json',
        '--output',
        'SOURCE,TARGET,FSTYPE,OPTIONS',
        '--target',
        target,
    ]);
    let parsed;
    try {
        parsed = JSON.parse(stdout);
    }
    catch (error) {
        throw new Error(`findmnt-Ausgabe ist kein gültiges JSON: ${error.message}`);
    }
    const fileSystem = parsed.filesystems?.[0];
    if (!fileSystem) {
        throw new Error(`Für „${target}“ wurde kein eingebundenes Dateisystem gefunden.`);
    }
    return fileSystem;
}
function byNameMap(devices) {
    const map = new Map();
    for (const device of devices) {
        for (const key of [device.name, device.kname, device.path, node_path_1.posix.basename(device.path)]) {
            if (key) {
                map.set(key, device);
            }
        }
    }
    return map;
}
function findDevice(devices, source) {
    const normalized = normalizeDevicePath(source);
    const map = byNameMap(devices);
    return map.get(normalized) || map.get(node_path_1.posix.basename(normalized));
}
function topParent(device, devices) {
    const map = byNameMap(devices);
    let current = device;
    const visited = new Set();
    while (current.pkname && !visited.has(current.kname)) {
        visited.add(current.kname);
        const parent = map.get(current.pkname) || map.get(node_path_1.posix.basename(current.pkname));
        if (!parent) {
            break;
        }
        current = parent;
    }
    return current;
}
function isSdLike(device) {
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
function isForbiddenMountPoint(mountPoint) {
    const normalized = normalizeMountPoint(mountPoint);
    return ['/', '/boot', '/boot/firmware', '/efi', '/usr', '/var', '/opt', '/home'].includes(normalized);
}
function selectSdCardTargets(snapshot) {
    const { devices, rootSource } = snapshot;
    const rootNode = findDevice(devices, rootSource) || devices.find(device => device.mountPoints.includes('/'));
    const rootParent = rootNode ? topParent(rootNode, devices) : undefined;
    const seen = new Set();
    const result = [];
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
async function discoverSdCardTargets() {
    if (process.platform !== 'linux') {
        return [];
    }
    const [devices, rootSource] = await Promise.all([readBlockDevices(), readRootSource()]);
    return selectSdCardTargets({ devices, rootSource });
}
function normalizeSdCardSubDir(value) {
    const raw = String(value || 'nexowatt-eos-backups').trim().replace(/\\/g, '/');
    if (!raw || node_path_1.posix.isAbsolute(raw) || raw.startsWith('/') || raw.includes('\0')) {
        throw new Error('Der Backup-Unterordner der SD-Karte muss ein relativer, nicht leerer Pfad sein.');
    }
    const segments = raw.split('/').filter(Boolean);
    if (!segments.length || segments.some(segment => segment === '.' || segment === '..')) {
        throw new Error('Der Backup-Unterordner der SD-Karte darf keine „.“- oder „..“-Segmente enthalten.');
    }
    return segments.join('/');
}
function resolveSdCardBackupDir(mountPath, subDir) {
    const mount = String(mountPath || '').trim();
    if (!mount || !node_path_1.posix.isAbsolute(mount)) {
        return '';
    }
    try {
        const safeSubDir = normalizeSdCardSubDir(subDir);
        const target = node_path_1.posix.resolve(mount, safeSubDir);
        const rel = node_path_1.posix.relative(node_path_1.posix.resolve(mount), target);
        if (!rel || rel.startsWith('..') || node_path_1.posix.isAbsolute(rel)) {
            return '';
        }
        return target;
    }
    catch {
        return '';
    }
}
async function canonicalPath(value) {
    try {
        return normalizeMountPoint(await (0, promises_1.realpath)(value));
    }
    catch {
        return normalizeMountPoint(value);
    }
}
function assertInside(parent, child) {
    const rel = node_path_1.posix.relative(parent, child);
    if (!rel || rel.startsWith(`..${node_path_1.posix.sep}`) || rel === '..' || node_path_1.posix.isAbsolute(rel)) {
        throw new Error(`Der Backup-Pfad „${child}“ liegt nicht innerhalb der ausgewählten SD-Karte „${parent}“.`);
    }
}
async function validateSdCardTarget(mountPath, subDir, options = {}) {
    if (process.platform !== 'linux') {
        throw new Error('SD-Karten als Backupziel werden nur unter Linux unterstützt.');
    }
    if (!mountPath || !node_path_1.posix.isAbsolute(mountPath)) {
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
        throw new Error(`Der Pfad „${normalizedMount}“ ist kein eigener Einhängepunkt. Die SD-Karte ist vermutlich nicht eingesteckt oder nicht eingebunden. Die Sicherung wird abgebrochen; es gibt kein Fallback auf den Systemdatenträger.`);
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
    const backupDir = node_path_1.posix.resolve(expectedTarget, safeSubDir);
    assertInside(expectedTarget, backupDir);
    // The mount root only needs to be traversable. Permissions are checked on
    // the actual backup directory, not on its root-owned parent. A read-only
    // list/restore request must never create a directory or a write probe.
    const mountStats = await (0, promises_1.stat)(expectedTarget);
    let current = expectedTarget;
    for (const segment of safeSubDir.split('/')) {
        current = node_path_1.posix.join(current, segment);
        let info;
        try {
            info = await (0, promises_1.lstat)(current);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            if (!createDirectory) {
                const missing = new Error(`Das SD-Sicherungsverzeichnis „${current}“ wurde noch nicht angelegt.`);
                missing.code = 'SD_BACKUP_DIR_MISSING';
                throw missing;
            }
            try {
                await (0, promises_1.mkdir)(current, { mode: 0o750 });
            }
            catch (mkdirError) {
                if (mkdirError.code !== 'EEXIST') {
                    throw new Error(`Das SD-Sicherungsverzeichnis „${current}“ konnte nicht angelegt werden (${mkdirError.code || 'Dateisystemfehler'}). Prüfen Sie die Rechte des übergeordneten Verzeichnisses.`);
                }
            }
            info = await (0, promises_1.lstat)(current);
        }
        // Do not follow a symlink, or a nested filesystem, off the selected card.
        if (info.isSymbolicLink() || !info.isDirectory()) {
            throw new Error(`Der SD-Backup-Pfad „${current}“ muss ein echtes Verzeichnis ohne symbolische Verknüpfungen sein.`);
        }
        const realCurrent = await (0, promises_1.realpath)(current);
        assertInside(expectedTarget, realCurrent);
        if (info.dev !== mountStats.dev) {
            throw new Error(`Der SD-Backup-Pfad „${current}“ liegt auf einem anderen Dateisystem als die ausgewählte SD-Karte.`);
        }
    }
    const requiredAccess = readOnlyAccess
        ? node_fs_1.constants.R_OK | node_fs_1.constants.X_OK
        : node_fs_1.constants.R_OK | node_fs_1.constants.W_OK | node_fs_1.constants.X_OK;
    try {
        await (0, promises_1.access)(backupDir, requiredAccess);
    }
    catch (error) {
        const code = error.code || 'Dateisystemfehler';
        throw new Error(`Der Backup-Dienst hat keine ausreichenden ${readOnlyAccess ? 'Lese-/Suchrechte' : 'Lese-/Schreib-/Suchrechte'} auf dem Sicherungsverzeichnis „${backupDir}“ (${code}).`);
    }
    // A removal/remount between discovery and directory checking must not fall
    // back to a same-named directory on the operating-system disk.
    const currentMount = await readFindmnt(expectedTarget);
    if ((await canonicalPath(String(currentMount.target || ''))) !== expectedTarget ||
        normalizeDevicePath(String(currentMount.source || '')) !== source ||
        (!readOnlyAccess && !String(currentMount.options || '').split(',').includes('rw'))) {
        throw new Error('Die SD-Karte wurde während der Prüfung entfernt oder anders eingebunden. Es wird nicht auf den Systemdatenträger ausgewichen.');
    }
    if (writeTest) {
        const probe = node_path_1.posix.resolve(backupDir, `.nexowatt-write-test-${process.pid}-${(0, node_crypto_1.randomUUID)()}`);
        let handle;
        try {
            handle = await (0, promises_1.open)(probe, 'wx', 0o600);
            await handle.writeFile('NexoWatt EOS SD-card write test\n', 'utf8');
            await handle.sync();
        }
        finally {
            await handle?.close().catch(() => undefined);
            await (0, promises_1.rm)(probe, { force: true }).catch(() => undefined);
        }
    }
    const fileSystemStats = await (0, promises_1.statfs)(expectedTarget);
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
function formatSdCardFreeSpace(bytes) {
    return formatBytes(bytes);
}
