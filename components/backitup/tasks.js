/*!
 * ioBroker gulpfile
 * Date: 2023-02-22
 */
const fs = require('node:fs');
const { deleteFoldersRecursive, buildReact, copyFiles, npmInstall } = require('@iobroker/build-tools');

function sync2files(src, dst) {
    const srcTxt = fs.readFileSync(src).toString('utf8');
    const destTxt = fs.readFileSync(dst).toString('utf8');
    if (srcTxt !== destTxt) {
        const srcs = fs.statSync(src);
        const dest = fs.statSync(dst);
        if (srcs.mtime > dest.mtime) {
            fs.writeFileSync(dst, srcTxt);
        } else {
            fs.writeFileSync(src, destTxt);
        }
    }
}

function sync() {
    // sync2files(`${__dirname}/src-admin/src/BackupNow.jsx`, `${__dirname}/src-tab/src/Components/BackupNow.jsx`);
    sync2files(`${__dirname}/src-admin/src/Components/SourceSelector.tsx`, `${__dirname}/src-tab/src/Components/SourceSelector.tsx`);
    sync2files(`${__dirname}/src-admin/src/Components/Restore.tsx`, `${__dirname}/src-tab/src/Components/Restore.tsx`);
    sync2files(`${__dirname}/src-admin/src/Components/types.d.ts`, `${__dirname}/src-tab/src/Components/types.d.ts`);
}

function buildAdmin() {
    sync();
    return buildReact(`${__dirname}/src-admin/`, { rootDir: `${__dirname}/src-admin/`, vite: true });
}

function cleanAdmin() {
    deleteFoldersRecursive(`${__dirname}/admin/custom`);
    deleteFoldersRecursive(`${__dirname}/src-admin/build`);
}

function copyAllAdminFiles() {
    copyFiles(['src-admin/build/assets/*.css', '!src-admin/build/assets/src_bootstrap_*.css'], 'admin/custom/assets');
    copyFiles(['src-admin/build/assets/*.js'], 'admin/custom/assets');
    //copyFiles(['src-admin/build/static/js/*.map', '!src-admin/build/static/js/vendors*.map', '!src-admin/build/static/js/node_modules*.map'], 'admin/custom/static/js');
    copyFiles(['src-admin/build/assets/*.png'], 'admin/custom/assets');
    copyFiles(['src-admin/build/customComponents.js'], 'admin/custom');
    //copyFiles(['src-admin/build/customComponents.js.map'], 'admin/custom');
    // The GUI API gate of @iobroker/json-config reads this manifest to detect which component
    // library the remote was built against, so it must sit next to the remote entry.
    copyFiles(['src-admin/build/mf-manifest.json'], 'admin/custom');
    copyFiles(['src-admin/src/i18n/*.json'], 'admin/custom/i18n');
}

function clean() {
    deleteFoldersRecursive(`${__dirname}/src-tab/build`);
    deleteFoldersRecursive(`${__dirname}/admin`, [
        'nexowatt-backup.png',
        '.json',
        '.json5',
        'custom',
        'adapter-settings.js',
        
        'index.html',
        'index_m.html',
        'index_m.js',
        'style.css',
        'tab_m.css',
        'tab_m.html',
        'tab_m.js',
        'words.js',
        'translations.json',
        'i18n'
    ]);
}

function copyAllFiles() {
    copyFiles([
        'src-tab/build/*',
        `!src-tab/build/index.html`,
        `!src-tab/build/static/js/*.map`,
    ], 'admin/');
    copyFiles(['src-tab/build/assets/*'], 'admin/assets');
    // copyFiles(['src-tab/build/assets/*.js'], 'admin/assets');
    // copyFiles(['src-tab/build/assets/*.txt'], 'admin/assets');
    // copyFiles(['src-tab/build/assets/*.css'], 'admin/assets');
    // copyFiles(['src-tab/build/assets/*.png'], 'admin/assets');
}

const NEXOWATT_THEME_CSS_V105 = "/* nexowatt-eos-theme-v105 */\n:root {\n    --nw-eos-bg: #03111c;\n    --nw-eos-surface: #071923;\n    --nw-eos-surface-2: #0b2831;\n    --nw-eos-primary: #01bc69;\n    --nw-eos-primary-dark: #008c56;\n    --nw-eos-primary-hover: #00d778;\n    --nw-eos-primary-light: #5ee0c2;\n    --nw-eos-border: rgba(1, 188, 105, 0.26);\n    --nw-eos-text: #eaf7f3;\n    --nw-eos-text-muted: #9ab8b0;\n}\n\nbody {\n    background: #03111c;\n}\n\n.App {\n    background:\n        radial-gradient(circle at 16% 0%, rgba(0, 175, 120, 0.12), transparent 31%),\n        linear-gradient(180deg, #03111c 0%, #06131f 100%) !important;\n}\n\n.App .MuiAppBar-root {\n    background: linear-gradient(118deg, #03111c 0%, #06322f 58%, #075a48 100%) !important;\n    border: 1px solid rgba(1, 188, 105, 0.34) !important;\n    border-bottom: 2px solid #01bc69 !important;\n    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.36), 0 0 24px rgba(1, 188, 105, 0.10) !important;\n}\n\n.App .MuiCard-root {\n    background: linear-gradient(145deg, rgba(7, 25, 35, 0.98), rgba(8, 31, 38, 0.96)) !important;\n    border: 1px solid rgba(1, 188, 105, 0.20) !important;\n    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(94, 224, 194, 0.025) !important;\n}\n\n.App .MuiCard-root:hover {\n    border-color: rgba(1, 188, 105, 0.38) !important;\n    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.34), 0 0 22px rgba(1, 188, 105, 0.08) !important;\n}\n\n.App .MuiButton-contained:not(.Mui-disabled) {\n    background: linear-gradient(90deg, #008c56 0%, #01bc69 100%) !important;\n    color: #02140d !important;\n    border: 1px solid rgba(94, 224, 194, 0.46) !important;\n    box-shadow: 0 4px 14px rgba(1, 188, 105, 0.18) !important;\n}\n\n.App .MuiButton-contained:not(.Mui-disabled):hover {\n    background: linear-gradient(90deg, #00a86b 0%, #00d778 100%) !important;\n    border-color: rgba(94, 224, 194, 0.72) !important;\n    box-shadow: 0 7px 18px rgba(1, 188, 105, 0.28) !important;\n}\n\n.App .MuiButton-contained.Mui-disabled {\n    background: rgba(1, 188, 105, 0.075) !important;\n    color: rgba(234, 247, 243, 0.34) !important;\n    border: 1px solid rgba(1, 188, 105, 0.10) !important;\n}\n\n.App .MuiFab-root {\n    background: rgba(1, 188, 105, 0.13) !important;\n    color: #eaf7f3 !important;\n    border: 1px solid rgba(94, 224, 194, 0.24) !important;\n}\n\n.App .MuiFab-root:hover {\n    background: rgba(1, 188, 105, 0.25) !important;\n    border-color: rgba(94, 224, 194, 0.50) !important;\n}\n\n.App .MuiInput-underline:after,\n.App .MuiFilledInput-underline:after {\n    border-bottom-color: #01bc69 !important;\n}\n\n.App .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline,\n.App .MuiInputBase-root.Mui-focused fieldset {\n    border-color: #01bc69 !important;\n}\n\n.App .MuiInputLabel-root.Mui-focused,\n.App .MuiFormLabel-root.Mui-focused,\n.App .MuiSelect-icon,\n.App .MuiSvgIcon-colorPrimary,\n.App .MuiCircularProgress-colorPrimary,\n.App .MuiCheckbox-root.Mui-checked,\n.App .MuiRadio-root.Mui-checked {\n    color: #01bc69 !important;\n}\n\n.App .MuiLinearProgress-bar,\n.App .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track {\n    background-color: #01bc69 !important;\n}\n\n.App .MuiSwitch-switchBase.Mui-checked {\n    color: #5ee0c2 !important;\n}\n\n.App a,\n.App .MuiLink-root {\n    color: #5ee0c2;\n}\n\n.App ::selection {\n    background: rgba(1, 188, 105, 0.34);\n    color: #ffffff;\n}\n\n*::-webkit-scrollbar-track {\n    background-color: #06131f !important;\n}\n\n*::-webkit-scrollbar-thumb {\n    background-color: #0b6f62 !important;\n    border-radius: 6px;\n}\n\n*::-webkit-scrollbar-thumb:hover {\n    background-color: #01bc69 !important;\n}\n";

function patchNexoWattDashboardTheme() {
    const assetsDir = `${__dirname}/admin/assets`;
    if (!fs.existsSync(assetsDir)) {
        return;
    }
    for (const file of fs.readdirSync(assetsDir)) {
        const absolute = `${assetsDir}/${file}`;
        if (file.endsWith('.css')) {
            let css = fs.readFileSync(absolute, 'utf8');
            if (!css.includes('nexowatt-eos-theme-v105')) {
                css = `${css.trim()}\n${NEXOWATT_THEME_CSS_V105}`;
                fs.writeFileSync(absolute, css);
            }
        } else if (file.endsWith('.js')) {
            let code = fs.readFileSync(absolute, 'utf8');
            const replacements = [
                ['linear-gradient(120deg, #0F2E5C 0%, #1B6FA8 55%, #29A8D8 100%)', 'linear-gradient(120deg, #03111C 0%, #06322F 58%, #075A48 100%)'],
                ['linear-gradient(120deg, #1B6FA8 0%, #0F2E5C 100%)', 'linear-gradient(120deg, #06322F 0%, #008C56 100%)'],
                ['linear-gradient(90deg, #0F2E5C 0%, #1B6FA8 100%)', 'linear-gradient(90deg, #06322F 0%, #008C56 100%)'],
                ['rgba(27,111,168,0.9)', 'rgba(0,175,120,0.92)'],
                ['rgba(41,168,216,0.9)', 'rgba(1,188,105,0.92)'],
                ['rgba(15,46,92,0.9)', 'rgba(2,76,54,0.96)'],
            ];
            for (const [from, to] of replacements) {
                code = code.split(from).join(to);
            }
            fs.writeFileSync(absolute, code);
        }
    }
}

function patchFiles() {
    if (fs.existsSync(`${__dirname}/src-tab/build/index.html`)) {
        let code = fs.readFileSync(`${__dirname}/src-tab/build/index.html`).toString('utf8');
        code = code.replace(/<script>\s*(?:var|const|let) script\s?=\s?document\.createElement\(["']script["']\)[^<]+<\/script>/,
            `<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>`);

        fs.existsSync(`${__dirname}/admin/tab_m.html`) && fs.unlinkSync(`${__dirname}/admin/tab_m.html`);
        fs.writeFileSync(`${__dirname}/admin/tab_m.html`, code);
    }
    patchNexoWattDashboardTheme();
}

if (process.argv.includes('--admin-0-clean')) {
    cleanAdmin();
} else if (process.argv.includes('--admin-1-npm')) {
    npmInstall(`${__dirname}/src-admin/`)
        .catch(e => console.error(e));
} else if (process.argv.includes('--admin-2-compile')) {
    buildAdmin()
        .catch(e => console.error(e));
} else if (process.argv.includes('--admin-3-copy')) {
    copyAllAdminFiles();
} else if (process.argv.includes('--admin-build')) {
    cleanAdmin();
    npmInstall(`${__dirname}/src-admin/`)
        .then(() => buildAdmin())
        .then(() => copyAllAdminFiles())
        .catch(e => console.error(e));
} else if (process.argv.includes('--0-clean')) {
    clean();
} else if (process.argv.includes('--1-npm')) {
    if (!fs.existsSync(`${__dirname}/src-tab/node_modules`)) {
        npmInstall(`${__dirname}/src-tab/`).catch(e => console.error(e));
    }
} else if (process.argv.includes('--2-build')) {
    buildReact(`${__dirname}/src-tab/`, { rootDir: __dirname, vite: true }).catch(e => console.error(e));
} else if (process.argv.includes('--3-copy')) {
    copyAllFiles();
} else if (process.argv.includes('--4-patch')) {
    patchFiles();
} else if (process.argv.includes('--build')) {
    clean();
    let installPromise;
    if (!fs.existsSync(`${__dirname}/src-tab/node_modules`)) {
        installPromise = npmInstall(`${__dirname}/src-tab/`).catch(e => console.error(e));
    } else {
        installPromise = Promise.resolve();
    }
    installPromise
        .then(() => buildReact(`${__dirname}/src-tab/`, { rootDir: __dirname, vite: true }))
        .then(() => copyAllFiles())
        .then(() => patchFiles())
        .catch(e => console.error(e));
} else {
    cleanAdmin();
    npmInstall(`${__dirname}/src-admin/`)
        .then(() => buildAdmin())
        .then(() => copyAllAdminFiles())
        .then(() => clean())
        .then(() => {
            if (!fs.existsSync(`${__dirname}/src-tab/node_modules`)) {
                return npmInstall(`${__dirname}/src-tab/`);
            }
        })
        .then(() => buildReact(`${__dirname}/src-tab/`, { rootDir: __dirname, vite: true }))
        .then(() => copyAllFiles())
        .then(() => patchFiles())
        .catch(e => console.error(e));
}
