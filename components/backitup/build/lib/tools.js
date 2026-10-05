"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDate = getDate;
exports.copyFile = copyFile;
exports.getIobDir = getIobDir;
exports.getTimeString = getTimeString;
exports.getNextTimeString = getNextTimeString;
exports._ = _;
exports.delay = delay;
exports.maskSecret = maskSecret;
exports.getSize = getSize;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function getDate(d) {
    d = d || new Date();
    return `${d.getFullYear()}_${(d.getMonth() + 1).toString().padStart(2, '0')}_${d.getDate().toString().padStart(2, '0')}-${d.getHours().toString().padStart(2, '0')}_${d.getMinutes().toString().padStart(2, '0')}_${d.getSeconds().toString().padStart(2, '0')}`;
}
function copyFile(source, target, cb) {
    // The callback must fire at most once, whichever of the two streams fails first.
    let callback = cb;
    const done = (err) => {
        if (callback) {
            const fire = callback;
            callback = undefined;
            fire(err);
        }
    };
    const rd = (0, node_fs_1.createReadStream)(source);
    rd.on('error', err => done(err));
    const wr = (0, node_fs_1.createWriteStream)(target);
    wr.on('error', err => done(err));
    wr.on('close', () => done());
    rd.pipe(wr);
}
/**
 * looks for iobroker home folder
 */
function getIobDir() {
    // Deliberately required lazily rather than imported at the top: adapter-core resolves the
    // controller installation when it loads, and lib/tools is pulled in by every backup script.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const utils = require('@iobroker/adapter-core');
    const backupDir = (0, node_path_1.join)(utils.getAbsoluteDefaultDataDir(), 'iobroker.json').replace(/\\/g, '/');
    const parts = backupDir.split('/');
    parts.pop(); // iobroker.json
    parts.pop(); // iobroker-data.json
    return parts.join('/');
}
// function to create a date string
const MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    ru: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
    pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    pl: ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'],
    uk: ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'],
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    'zh-cn': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
};
const timePattern = {
    en: '%d at %t Hours',
    de: '%d um %t Uhr',
    ru: '%d в %t',
    es: '%d a las %t horas',
    it: '%d alle ore %t',
    pt: '%d às %t horas',
    pl: '%d o godzinie %t',
    uk: '%d о %t годині',
    fr: '%d à %t heures',
    'zh-cn': '%d %t',
};
function padding0(number) {
    return number < 10 ? `0${number}` : `${number}`;
}
function formatDate(systemLang, date) {
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return (timePattern[systemLang] || timePattern.en)
        .replace('%d', `${padding0(day)}. ${(MONTHS[systemLang] || MONTHS.en)[monthIndex]} ${year}`)
        .replace('%t', `${padding0(hours)}:${padding0(minutes)}`);
}
function getTimeString(systemLang, date) {
    return formatDate(systemLang, date || new Date());
}
/**
 * Next Backup Time
 *
 * @param systemLang language to format in, falling back to English for unknown ones
 * @param nextDate point in time to render
 */
function getNextTimeString(systemLang, nextDate) {
    return formatDate(systemLang, nextDate);
}
function _(word, systemLang) {
    // A computed path, so this has to stay a require - and it keeps the behaviour of reading only
    // the language actually in use instead of bundling all eleven translation files.
    // Two levels up: this compiles to build/lib/tools.js, and admin/ stays at the adapter root.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const translations = require(`../../admin/i18n/${systemLang ? systemLang : 'en'}/translations.json`);
    if (translations[word]) {
        return translations[word];
    }
    console.warn(`Please translate in translations.json: ${word}`);
    return word;
}
/**
 * Resolves after the given number of milliseconds.
 *
 * The notification steps all wait before they report, so that wait is expressed once here instead
 * of wrapping every step body in a `setTimeout` callback.
 *
 * @param ms how long to wait
 */
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Replaces every occurrence of a secret in a text with `****`.
 *
 * The influx CLI takes its access token as a command line argument, so anything derived from that
 * command line has to pass through here first - `error.message` of a failed `exec` starts with
 * "Command failed: <command>" and would otherwise carry the token into `context.errors` and from
 * there into every notification channel.
 *
 * An empty or missing secret leaves the text untouched: `replaceAll('')` matches the gap between
 * every pair of characters and would otherwise pepper the whole string with the mask.
 *
 * @param text the text to scrub
 * @param secret the value to hide
 */
function maskSecret(text, secret) {
    return secret ? text.replaceAll(secret, '****') : text;
}
function getSize(bytes) {
    if (bytes > 1024 * 1024 * 512) {
        return `${Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10} GiB`;
    }
    if (bytes > 1024 * 1024) {
        return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MiB`;
    }
    if (bytes > 1024) {
        return `${Math.round((bytes / 1024) * 10) / 10} KiB`;
    }
    return `${bytes} bytes`;
}
//# sourceMappingURL=tools.js.map