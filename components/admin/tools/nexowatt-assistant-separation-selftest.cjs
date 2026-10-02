#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const io = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json'), 'utf8'));
const assistant = fs.readFileSync(path.join(root, 'adminWww/js/eos-assistant.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'build/main.js'), 'utf8');
if (io.native.eosAssistantEnabled !== false || io.native.disableMcp !== true) throw new Error('stable assistant defaults are not disabled');
if (!assistant.includes('NEXOWATT_EOS_ASSIST_DISABLED')) throw new Error('browser assistant runtime is not disabled');
if (!main.includes("obj.command.startsWith('chat:')") || !main.includes('Stable-Version vorübergehend deaktiviert')) throw new Error('backend assistant requests are not denied');
console.log('[NexoWatt EOS assistant separation] OK (stable disabled)');
