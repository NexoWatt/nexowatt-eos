declare const require: any;
declare const module: any;
declare const process: any;
declare const __dirname: string;
declare const Buffer: any;
declare const console: any;

declare namespace NodeJS {
    interface Timeout {}
}

declare namespace ioBroker {
    interface AdapterOptions {
        name?: string;
    }

    interface State {
        val: any;
        ack: boolean;
        ts?: number;
        lc?: number;
        from?: string;
        q?: number;
    }

    interface SettableState {
        val: any;
        ack?: boolean;
        ts?: number;
        lc?: number;
        q?: number;
    }

    interface ObjectCommon {
        name?: string | Record<string, string>;
        type?: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'mixed';
        role?: string;
        read?: boolean;
        write?: boolean;
        unit?: string;
        def?: any;
        states?: Record<string, string>;
        desc?: string | Record<string, string>;
    }

    interface ObjectBase {
        type: 'state' | 'channel' | 'device' | 'folder';
        common: ObjectCommon;
        native: Record<string, any>;
    }

    type StateObject = ObjectBase;
    type ChannelObject = ObjectBase;
    type DeviceObject = ObjectBase;
    type AnyObject = ObjectBase & { _id?: string };
}

declare module '@iobroker/adapter-core' {
    export class Adapter {
        public namespace: string;
        public config: Record<string, any>;
        public log: {
            info(message: string): void;
            warn(message: string): void;
            error(message: string): void;
            debug(message: string): void;
            silly?(message: string): void;
        };

        public constructor(options?: ioBroker.AdapterOptions);
        public on(event: string, handler: (...args: any[]) => void): this;
        public setState(id: string, state: any, ack?: boolean): void;
        public setStateAsync(id: string, state: any, ack?: boolean): Promise<void>;
        public getStateAsync(id: string): Promise<ioBroker.State | null | undefined>;
        public setObjectNotExistsAsync(id: string, obj: ioBroker.AnyObject): Promise<void>;
        public extendObjectAsync(id: string, obj: Partial<ioBroker.AnyObject>): Promise<void>;
        public getForeignObjectAsync(id: string): Promise<any>;
        public setForeignObjectAsync(id: string, obj: any): Promise<void>;
        public subscribeStates(pattern: string): void;
        public unsubscribeStates(pattern: string): void;
        public setInterval(callback: (...args: any[]) => void, ms: number): any;
        public clearInterval(handle: any): void;
        public setTimeout(callback: (...args: any[]) => void, ms: number): any;
        public clearTimeout(handle: any): void;
        public sendTo(objName: string, command: string, message: any, callback?: (response: any) => void): void;
    }
}

declare module 'node:crypto' {
    export const randomUUID: any;
    export const randomBytes: any;
    export const createHash: any;
    export const X509Certificate: any;
}

declare module 'node:child_process' {
    export const execFile: any;
}

declare module 'node:fs/promises' {
    export const mkdtemp: any;
    export const readFile: any;
    export const rm: any;
}

declare module 'node:os' {
    export const tmpdir: any;
}

declare module 'node:path' {
    export const join: any;
    export const dirname: any;
    export const resolve: any;
}

declare module 'node:util' {
    export const promisify: any;
}

declare module 'node:https' {
    export const createServer: any;
}

declare module 'node:net' {
    export type AddressInfo = any;
}

declare module 'bonjour-service';
declare module 'ws';
