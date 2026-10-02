// targz for Backup and Restore
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip, createGunzip, type ZlibOptions } from 'node:zlib';
import { pack, extract } from 'tar-fs';

/**
 * Called once the archive has been written, or as soon as any stream in the chain fails.
 *
 * Callers historically declared this as `(err, stdout, stderr)`, mirroring `child_process.exec`.
 * Only the first argument was ever passed - the other two were always `undefined`.
 */
export type TargzCallback = (error?: Error | string | null) => void;

export interface CompressOptions {
    /** directory to pack */
    src?: string;
    /** the .tar.gz file to write */
    dest?: string;
    tar?: Parameters<typeof pack>[1];
    gz?: ZlibOptions;
}

export interface DecompressOptions {
    /** the .tar.gz file to read */
    src?: string;
    /** directory to unpack into */
    dest?: string;
    tar?: Parameters<typeof extract>[1];
    gz?: ZlibOptions;
}

export function compress(opts: CompressOptions, callback?: TargzCallback): void {
    const cb: TargzCallback = callback || ((): void => {});

    // Note: a failure in any of the three streams reports through here. As in the original
    // implementation the callback is not guarded against firing more than once.
    const error = (err: Error | string | null): void => cb(err);

    opts = opts || {};
    opts.tar = opts.tar || {};
    opts.gz = opts.gz || {};

    // default gzip config
    opts.gz.level = opts.gz.level || 6;
    opts.gz.memLevel = opts.gz.memLevel || 6;

    // ensure src and dest
    if (!opts.src) {
        return error(`NexoWatt EOS Backup cannot find source "${opts.src}" for compress!`);
    }
    if (!opts.dest) {
        return error(`NexoWatt EOS Backup cannot find destination "${opts.dest}" for compress!`);
    }

    const src = opts.src;
    const dest = opts.dest;
    const tarOpts = opts.tar;
    const gzOpts = opts.gz;

    // compress
    process.nextTick(() => {
        pack(src, tarOpts)
            .on('error', error)
            .pipe(createGzip(gzOpts).on('error', error))
            .pipe(createWriteStream(dest).on('error', error).on('finish', () => cb()));
    });
}

export function decompress(opts: DecompressOptions, callback?: TargzCallback): void {
    const cb: TargzCallback = callback || ((): void => {});

    const error = (err: Error | string | null): void => cb(err);

    opts = opts || {};
    opts.tar = opts.tar || {};
    opts.gz = opts.gz || {};

    // ensure src and dest
    if (!opts.src) {
        return error(`NexoWatt EOS Backup cannot find source "${opts.src}" for decompress!`);
    }
    if (!opts.dest) {
        return error(`NexoWatt EOS Backup cannot find destination "${opts.dest}" for decompress!`);
    }

    const src = opts.src;
    const dest = opts.dest;
    const tarOpts = opts.tar;
    const gzOpts = opts.gz;

    // decompress
    process.nextTick(() => {
        createReadStream(src)
            .on('error', error)
            .pipe(createGunzip(gzOpts).on('error', error))
            .pipe(extract(dest, tarOpts).on('error', error).on('finish', () => cb()));
    });
}

/**
 * Promise form of {@link compress}.
 *
 * Note that the underlying implementation is not guarded against reporting more than once - a
 * failure in any of the three streams calls back, and a later one calls back again. The promise
 * absorbs the repeats: the first settle wins.
 *
 * @param opts what to pack and where to write it
 */
export async function compressAsync(opts: CompressOptions): Promise<void> {
    return new Promise((resolve, reject) => compress(opts, err => (err ? reject(err) : resolve())));
}

/**
 * Promise form of {@link decompress}.
 *
 * Same note as above: repeated reports from the stream chain are absorbed by the promise.
 *
 * @param opts what to unpack and where to put it
 */
export async function decompressAsync(opts: DecompressOptions): Promise<void> {
    return new Promise((resolve, reject) => decompress(opts, err => (err ? reject(err) : resolve())));
}
