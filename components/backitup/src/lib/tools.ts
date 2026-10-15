import { closeSync, constants, createReadStream, createWriteStream, fstatSync, lstatSync, mkdirSync, openSync, readSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/** Only the per-host secret is accepted; never decrypt with a shared fallback. */
export function requireSystemSecret(value: unknown): string {
    if (typeof value !== 'string' || !/^(?:[0-9a-fA-F]{2}){16,64}$/.test(value)) {
        throw new Error('EOS_BACKUP_SYSTEM_SECRET_INVALID');
    }
    return value;
}

/** Archives belong to the writable data tree, never its root-owned parent/app. */
export function getBackupDir(): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const utils = require('@iobroker/adapter-core');
    const dataDir = utils.getAbsoluteDefaultDataDir();
    if (typeof dataDir !== 'string' || !isAbsolute(dataDir)) throw new Error('EOS_BACKUP_DATA_PATH_INVALID');
    return join(dataDir, 'nexowatt-backup', 'backups');
}

/** Create only our two data subdirectories, retaining private archive access. */
export function ensureBackupDirectory(): string {
    const directory = getBackupDir();
    const data = lstatSync(join(directory, '..', '..'));
    if (!data.isDirectory() || data.isSymbolicLink()) throw new Error('EOS_BACKUP_DATA_PATH_UNSAFE');
    for (const file of [join(directory, '..'), directory]) {
        try { mkdirSync(file, { mode: 0o700 }); } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        }
        const stat = lstatSync(file);
        if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)
            || (process.getuid && stat.uid !== process.getuid())) throw new Error('EOS_BACKUP_DATA_PATH_UNSAFE');
    }
    return directory;
}

/** Read only a private, single-link regular log via its validated descriptor. */
export function readPrivateLog(file: string, maximumBytes = 8 * 1024 * 1024): string {
    let descriptor: number | undefined;
    try {
        descriptor = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        const stat = fstatSync(descriptor);
        if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o077)
            || (process.getuid && stat.uid !== process.getuid()) || stat.size > maximumBytes) {
            throw new Error('EOS_BACKUP_LOG_UNSAFE');
        }
        const buffer = Buffer.alloc(maximumBytes + 1);
        let length = 0;
        while (length < buffer.length) {
            const count = readSync(descriptor, buffer, length, buffer.length - length, null);
            if (count === 0) break;
            length += count;
        }
        if (length > maximumBytes) throw new Error('EOS_BACKUP_LOG_UNSAFE');
        return buffer.subarray(0, length).toString('utf8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error;
        throw new Error('EOS_BACKUP_LOG_UNSAFE');
    } finally {
        if (descriptor !== undefined) closeSync(descriptor);
    }
}

export function getDate(d?: Date): string {
    d = d || new Date();

    return `${d.getFullYear()}_${(d.getMonth() + 1).toString().padStart(2, '0')}_${d.getDate().toString().padStart(2, '0')}-${d.getHours().toString().padStart(2, '0')}_${d.getMinutes().toString().padStart(2, '0')}_${d.getSeconds().toString().padStart(2, '0')}`;
}

export function copyFile(source: string, target: string, cb?: (err?: Error) => void): void {
    // The callback must fire at most once, whichever of the two streams fails first.
    let callback = cb;
    const done = (err?: Error): void => {
        if (callback) {
            const fire = callback;
            callback = undefined;
            fire(err);
        }
    };

    const rd = createReadStream(source);
    rd.on('error', err => done(err));

    const wr = createWriteStream(target);
    wr.on('error', err => done(err));

    wr.on('close', () => done());

    rd.pipe(wr);
}

/**
 * looks for iobroker home folder
 */
export function getIobDir(): string {
    // Deliberately required lazily rather than imported at the top: adapter-core resolves the
    // controller installation when it loads, and lib/tools is pulled in by every backup script.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const utils = require('@iobroker/adapter-core');

    const backupDir = join(utils.getAbsoluteDefaultDataDir(), 'iobroker.json').replace(/\\/g, '/');
    const parts = backupDir.split('/');
    parts.pop(); // iobroker.json
    parts.pop(); // iobroker-data.json
    return parts.join('/');
}

// function to create a date string
const MONTHS: Record<string, string[]> = {
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

const timePattern: Record<string, string> = {
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

function padding0(number: number): string {
    return number < 10 ? `0${number}` : `${number}`;
}

function formatDate(systemLang: string, date: Date): string {
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return (timePattern[systemLang] || timePattern.en)
        .replace('%d', `${padding0(day)}. ${(MONTHS[systemLang] || MONTHS.en)[monthIndex]} ${year}`)
        .replace('%t', `${padding0(hours)}:${padding0(minutes)}`);
}

export function getTimeString(systemLang: string, date?: Date): string {
    return formatDate(systemLang, date || new Date());
}

/**
 * Next Backup Time
 *
 * @param systemLang language to format in, falling back to English for unknown ones
 * @param nextDate point in time to render
 */
export function getNextTimeString(systemLang: string, nextDate: Date): string {
    return formatDate(systemLang, nextDate);
}

export function _(word: string, systemLang?: string): string {
    // A computed path, so this has to stay a require - and it keeps the behaviour of reading only
    // the language actually in use instead of bundling all eleven translation files.
    // Two levels up: this compiles to build/lib/tools.js, and admin/ stays at the adapter root.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const translations: Record<string, string> = require(
        `../../admin/i18n/${systemLang ? systemLang : 'en'}/translations.json`,
    );

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
export async function delay(ms?: number): Promise<void> {
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
export function maskSecret(text: string, secret?: string | null): string {
    return secret ? text.replaceAll(secret, '****') : text;
}

export function getSize(bytes: number): string {
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
