/** Peer identity always comes from the proved TLS public key, never from mDNS. */
export declare function certificateIdentity(raw: any): {
    ski: string;
    fingerprint: string;
};
export declare function peerIdentity(socket: any): {
    ski: string;
    fingerprint: string;
    remoteAddress: string;
};
export declare function matchesDiscoveredIdentity(peer: {
    ski: string;
    fingerprint: string;
}, node: any): boolean;
//# sourceMappingURL=shipSecurity.d.ts.map