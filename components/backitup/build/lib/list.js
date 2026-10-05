"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = listBackups;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_1 = require("./tools");
const storages = {};
function isNode(value) {
    return typeof value === 'object' && value !== null;
}
function listBackups(restoreSource, config, log, callback) {
    const files = {};
    // Listing is read-only, so the engines only ever reach for `log` here. The scratch pad and the
    // adapter stay empty until lib/list itself is called with a real context.
    const context = {
        adapter: null,
        log,
        backupDir: (0, node_path_1.join)((0, tools_1.getIobDir)(), 'backups').replace(/\\/g, '/'),
        timestamp: 0,
        fileNames: [],
        errors: {},
        done: [],
        types: [],
    };
    let counter = 0;
    const creators = [];
    for (const type in config) {
        if (Object.prototype.hasOwnProperty.call(config, type)) {
            const node = config[type];
            if (isNode(node) && node.type === 'creator') {
                if (!creators.includes(type)) {
                    creators.push(type);
                }
            }
            try {
                if (isNode(node)) {
                    for (const attr in node) {
                        if (Object.prototype.hasOwnProperty.call(node, attr)) {
                            const child = node[attr];
                            if (isNode(child) && child.type === 'creator' && !creators.includes(attr)) {
                                creators.push(attr);
                            }
                        }
                    }
                }
            }
            catch {
                log.debug('Backup list cannot be read ...');
            }
        }
    }
    const backupDir = (0, node_path_1.join)((0, tools_1.getIobDir)(), 'backups').replace(/\\/g, '/');
    if ((0, node_fs_1.existsSync)(backupDir) && (!restoreSource || restoreSource === 'local')) {
        const local = {};
        (0, node_fs_1.readdirSync)(backupDir)
            .sort()
            .map(file => (0, node_path_1.join)(backupDir, file).replace(/\\/g, '/'))
            .map((file) => {
            const stat = (0, node_fs_1.statSync)(file);
            return { path: file, name: file.split('/').pop(), size: stat.size };
        })
            .filter(file => (file.name.match(/^\d\d\d\d_\d\d_\d\d-\d\d_\d\d_\d\d_backupiobroker\.tar\.gz$/) ||
            creators.includes(file.name.split('_')[0]) ||
            creators.includes(file.name.split('.')[0])) &&
            file.name.split('.').pop() === 'gz')
            .forEach(file => {
            const type = file.name.match(/^\d\d\d\d_\d\d_\d\d-\d\d_\d\d_\d\d_backupiobroker\.tar\.gz$/)
                ? 'iobroker'
                : file.name.split('_')[0];
            local[type] = local[type] || [];
            local[type].push(file);
        });
        files.local = local;
    }
    const done = [];
    for (const type in config) {
        if (!Object.prototype.hasOwnProperty.call(config, type)) {
            continue;
        }
        const node = config[type];
        if (!isNode(node)) {
            continue;
        }
        for (const attr in node) {
            if (!Object.prototype.hasOwnProperty.call(node, attr)) {
                continue;
            }
            const storageConfig = node[attr];
            if (!isNode(storageConfig) || storageConfig.type !== 'storage') {
                continue;
            }
            if (done.includes(attr)) {
                continue;
            }
            done.push(attr);
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                storages[attr] = storages[attr] || require(`./list/${attr}`);
            }
            catch (e) {
                log.error(`Cannot load list module ${attr}: ${e}`);
                continue;
            }
            counter++;
            const onListed = (err, result, storage) => {
                if (err) {
                    log.error(String(err));
                }
                if (result && storage) {
                    if (storage === 'cifs') {
                        // Meant to drop NAS entries that are really the local backup directory seen
                        // through a mount. It never runs: lib/list/cifs reports itself as
                        // 'nas / copy' (the key the restore tab and lib/restore expect), so this
                        // comparison has always been false and NAS duplicates are listed twice.
                        // Left as found - switching the key on would start hiding entries that
                        // users currently see.
                        //
                        // The optional chaining below is defensive: `files.local` is only filled
                        // when local backups were requested, so it is absent whenever
                        // `restoreSource` names another storage.
                        for (const backupType in result) {
                            if (Object.prototype.hasOwnProperty.call(result, backupType)) {
                                result[backupType] = result[backupType]?.filter(file => !files.local?.[backupType]?.find(f => f.path === file.path));
                            }
                        }
                    }
                    files[storage] = result;
                }
                setTimeout(() => {
                    if (!--counter && callback) {
                        callback({ error: err, data: files });
                    }
                }, 2000);
            };
            const engine = storages[attr];
            engine
                .list({
                context,
                options: storageConfig,
                restoreSource,
                types: creators,
            })
                .then(
            // undefined means the engine had nothing to file; anything else is filed under
            // its own key, exactly like the callback contract did.
            result => onListed(null, result, result === undefined ? undefined : (engine.storageKey ?? attr)), (e) => onListed(e));
        }
    }
    if (!counter) {
        callback?.({ error: null, data: files });
    }
}
//# sourceMappingURL=list.js.map