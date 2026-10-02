#!/usr/bin/env node
'use strict';

/** Fail-closed AppCenter password lock: no outside click, focus or API failure bypass. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const auth = read('src-ts/runtime-executables/www/auth.ts');
const html = read('www/ems-apps.html');
const main = read('src-ts/runtime-executables/main.ts');

assert.match(html, /data-nw-required-capability="appcenter\.open"/);
assert.match(html, /data-nw-required-role="Admin oder Installer"/);
assert.match(main, /requirePageAccessOrRenderLock\(req, res, 'appcenter\.open'/);
assert.match(auth, /child\.inert = true/);
assert.match(auth, /child\.style\.pointerEvents = 'none'/);
assert.match(auth, /document\.addEventListener\('focusin'/);
assert.match(auth, /\['pointerdown', 'mousedown', 'touchstart', 'click'\]/);
assert.match(auth, /e\.stopImmediatePropagation\(\)/);
assert.match(auth, /e\.key === 'Tab'/);
assert.match(auth, /e\.key !== 'Escape'/);
assert.match(auth, /if \(mandatoryLock \|\| protectedPageLocked\(\)\)/);
assert.match(auth, /cancelEl\.style\.display = mandatoryLock \? 'none' : ''/);
assert.match(auth, /state\.statusError = true/);
assert.match(auth, /Berechtigungsprüfung nicht erreichbar[\s\S]*Seite bleibt[\s\S]*gesperrt/);
assert.match(auth, /return !state\._loaded \|\| state\.statusError === true/);
assert.match(auth, /html\.nw-auth-capability-pending body>\*:not\(#nwAuthOverlay\)/);
assert.doesNotMatch(auth, /statusError\s*=\s*false;[\s\S]{0,120}authRequired\s*=\s*false/);

console.log('[appcenter-auth-modal-lock] OK: AppCenter is backend-gated and frontend-locked fail-closed against outside click, focus, Escape and auth-status failure.');
