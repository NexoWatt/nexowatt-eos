/**
 * Datei: src-ts/node-shims.d.ts
 *
 * Zweck:
 * Minimaler TypeScript-Shim für wenige Node-Module, die in den TS-Wartungsskripten
 * verwendet werden.
 *
 * Zusammenhang:
 * Die TypeScript-Verträge sollen browser-/adapterneutral bleiben und binden deshalb
 * bewusst nicht das komplette `@types/node`-Paket in alle Typchecks ein. Diese Datei
 * beschreibt nur die kleinen fs/path-Funktionen, die unsere Scaffold-Prüfregeln brauchen.
 */

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: string): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean };
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
}
