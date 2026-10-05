"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreErrors = void 0;
exports.run = run;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const fs_extra_1 = require("fs-extra");
const tools_1 = require("../tools");
const targz_1 = require("../targz");
/**
 * Packs every jarvis instance found below `<path>/jarvis`.
 *
 * Two things the callback version got wrong, both settled by awaiting:
 *
 * - An existing but empty `jarvis` directory reported nothing at all - `forEach` over an empty
 *   array runs nothing, and the empty array is truthy, so the "not installed" branch was not taken
 *   either. The backup run then waited forever.
 * - The instances were packed all at once, and the success report was tied to a counter reaching
 *   `files.length`. They are packed one after the other now, and the step reports once.
 *
 * @param props the run context and the jarvis slice of the config
 */
async function run(props) {
    const { context: ctx, options } = props;
    const jarvisDir = (0, node_path_1.join)(options.path, 'jarvis');
    if (!(0, node_fs_1.existsSync)(jarvisDir)) {
        ctx.log.warn(`Jarvis Backup cannot created. Please install a Jarvis version >= 2.2.0`);
        return;
    }
    let files;
    try {
        files = await (0, promises_1.readdir)(jarvisDir);
    }
    catch (e) {
        ctx.log.warn(`Jarvis Backup cannot created: ${e}`);
        return;
    }
    if (!files.length) {
        ctx.log.warn(`Jarvis Backup cannot created. Please install a Jarvis version >= 2.2.0`);
        return;
    }
    // The first failure is reported once every instance has been dealt with.
    let firstError;
    for (const file of files) {
        const tmpDir = (0, node_path_1.join)(ctx.backupDir, `tmpJavis${file}`).replace(/\\/g, '/');
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            try {
                await (0, fs_extra_1.ensureDir)(tmpDir);
                ctx.log.debug(`Created jarvis_tmp directory: "${tmpDir}"`);
            }
            catch (err) {
                ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot created ... ${err}`);
            }
        }
        else {
            try {
                ctx.log.debug(`Try deleting the old jarvis_tmp directory: "${tmpDir}"`);
                await (0, fs_extra_1.remove)(tmpDir);
            }
            catch (err) {
                ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot deleted ... ${err}`);
            }
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                try {
                    ctx.log.debug(`old jarvis_tmp directory "${tmpDir}" successfully deleted`);
                    await (0, fs_extra_1.ensureDir)(tmpDir);
                    ctx.log.debug('Created jarvis_tmp directory');
                }
                catch (err) {
                    ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot created ... ${err}`);
                }
            }
        }
        ctx.log.debug(`found Jarvis Instance: ${file}`);
        ctx.log.debug(`start Jarvis Backup for Instance ${file}...`);
        let nameSuffix;
        if (options.hostType === 'Slave') {
            nameSuffix = options.slaveSuffix ? options.slaveSuffix : '';
        }
        else {
            nameSuffix = options.nameSuffix ? options.nameSuffix : '';
        }
        const fileName = (0, node_path_1.join)(ctx.backupDir, `jarvis.${file}_${(0, tools_1.getDate)()}${nameSuffix ? `_${nameSuffix}` : ''}_backupiobroker.tar.gz`);
        const instanceDir = (0, node_path_1.join)(jarvisDir, file);
        try {
            await (0, fs_extra_1.copy)(instanceDir, tmpDir);
            ctx.log.debug(`${instanceDir} copy success!`);
        }
        catch (err) {
            ctx.log.error(`${instanceDir} copy error: ${err}`);
        }
        await saveState(ctx, file, tmpDir);
        ctx.fileNames.push(fileName);
        let packError;
        try {
            await (0, targz_1.compressAsync)({ src: tmpDir, dest: fileName });
        }
        catch (err) {
            packError = err;
        }
        try {
            ctx.log.debug(`Try deleting the Jarvis tmp directory: "${tmpDir}"`);
            await (0, fs_extra_1.remove)(tmpDir);
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                ctx.log.debug(`Jarvis tmp directory "${tmpDir}" successfully deleted`);
            }
        }
        catch (e) {
            ctx.log.warn(`Jarvis tmp directory "${tmpDir}" cannot deleted ... ${e}`);
        }
        if (packError) {
            ctx.errors.jarvis = packError.toString();
            firstError ??= packError;
        }
        else {
            ctx.log.debug(`Backup created: ${fileName}`);
            ctx.done.push(`jarvis.${file}`);
            ctx.types.push(`jarvis.${file}`);
        }
    }
    if (firstError) {
        throw firstError;
    }
}
/**
 * Collects the jarvis settings and states into `states.json` next to the copied instance data.
 *
 * @param ctx run context, for the adapter and the logger
 * @param file instance folder name
 * @param tmpDir prepared copy of the instance
 */
async function saveState(ctx, file, tmpDir) {
    const stateDir = (0, node_path_1.join)(tmpDir, 'states').replace(/\\/g, '/');
    if (!(0, node_fs_1.existsSync)(stateDir)) {
        try {
            await (0, fs_extra_1.ensureDir)(stateDir);
            ctx.log.debug(`Created states_tmp directory: "${stateDir}"`);
        }
        catch (err) {
            ctx.log.warn(`states tmp directory "${stateDir}" cannot created ... ${err}`);
        }
    }
    const _settings = await ctx.adapter.getForeignObjectsAsync(`jarvis.${file}.settings.*`, 'state');
    const jarvisStates = [];
    if (_settings) {
        for (const i in _settings) {
            try {
                const obj = await ctx.adapter.getForeignStateAsync(`${_settings[i]._id}`);
                if (obj) {
                    jarvisStates.push({
                        id: _settings[i]._id,
                        value: obj.val ? obj.val : null,
                    });
                }
                else {
                    ctx.log.warn(`settings "${_settings[i]._id}" not found`);
                }
            }
            catch (err) {
                ctx.log.warn(`No State found for "${_settings[i]._id}": ${err}`);
            }
        }
    }
    else {
        ctx.log.warn('settings not found');
    }
    const _states = ['css', 'devices', 'layout', 'notifications', 'widgets', 'scripts', 'theme'];
    // for-of over the literal array; the original used for-in, which yields the same order here.
    for (const stateName of _states) {
        try {
            const obj = await ctx.adapter.getForeignStateAsync(`jarvis.${file}.${stateName}`);
            if (obj) {
                jarvisStates.push({
                    id: `jarvis.${file}.${stateName}`,
                    value: obj.val ? obj.val : null,
                });
            }
            else {
                ctx.log.warn(`settings "${stateName}" not found`);
            }
        }
        catch (err) {
            ctx.log.warn(`No State found for "jarvis.${file}.${stateName}": ${err}`);
        }
    }
    try {
        const _pro = await ctx.adapter.getForeignStateAsync(`jarvis.${file}.info.pro`);
        if (_pro) {
            jarvisStates.push({
                id: `jarvis.${file}.info.pro`,
                value: _pro.val ? _pro.val : null,
            });
        }
        else {
            ctx.log.warn('settings "pro" not found');
        }
    }
    catch (err) {
        ctx.log.debug(`No State found for "jarvis.${file}.info.pro": ${err}`);
    }
    await (0, promises_1.writeFile)((0, node_path_1.join)(stateDir, `states.json`), JSON.stringify(jarvisStates, null, 2)).catch(err => ctx.log.warn(`states.json cannot be written: ${err}`));
}
exports.ignoreErrors = true;
//# sourceMappingURL=38-jarvis.js.map