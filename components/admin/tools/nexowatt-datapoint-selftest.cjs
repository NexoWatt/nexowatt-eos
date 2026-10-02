#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = m => { throw new Error(`[NexoWatt EOS datapoint selftest] ${m}`); };
const runtime = JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json')).runtimeEntry;
const shared = read(`adminWww/assets/index-D2ymscJA-${runtime}.js`);
const route = read(`adminWww/assets/Objects-DPan0bzw-${runtime}.js`);
const sourceDialog = read('src-admin/src/components/Object/ObjectBrowserValue.tsx');
const policy = read('adminWww/js/eos-manual-write-policy.js');

if (!shared.includes('if(!i||i.type!=="state"||!this.states)return null')) fail('non-state value guard missing');
if (!shared.includes('let y=!this.props.notEditable&&n==="state"&&((N==null?void 0:N.write)!==!1)')) fail('common.write source-of-truth missing');
if (!shared.includes('!["readonly","expert-only"].includes(window.NEXOWATT_EOS_GET_WRITE_BEHAVIOR')) fail('context-menu policy guard missing');
if (!shared.includes('NEXOWATT_EOS_GET_DIRECT_WRITE_VALUE')) fail('type-aware direct write missing');
if (!shared.includes('NEXOWATT_EOS_PREPARE_MANUAL_EDITOR')) fail('universal dialog preparation missing');
if (!shared.includes('NEXOWATT_EOS_WRITE_MANUAL_STATE')) fail('queued write helper missing');
if (shared.includes('onClickCapture:Y=>')) fail('duplicate capture path remains');
if (!shared.includes('onClick:async Y=>')) fail('deterministic scalar/direct click handler missing');
if (!shared.includes('Wert setzen …')) fail('write-only state placeholder missing');
if (!shared.includes('Cannot write state')) fail('state-ID error reporting missing');

for (const marker of ['array', 'object', 'mixed', 'normalizeStates', 'prepareEditor', 'parseEditorValue', 'getDirectWriteValue']) {
    if (!policy.includes(marker)) fail(`manual-write policy missing ${marker}`);
}
if (!route.includes('NEXOWATT_EOS_PARSE_MANUAL_VALUE')) fail('built value dialog does not parse universal types');
if (!route.includes('this.state.writing')) fail('built value dialog lacks write lock');
if (!sourceDialog.includes('NEXOWATT_EOS_MANUAL_WRITE_POLICY')) fail('source value dialog lacks universal policy');
if (!sourceDialog.includes('await Promise.resolve')) fail('source value dialog does not await write');
if (read('adminWww/index.html').includes('eos-objects-state-tools.js')) fail('legacy ObjectBrowser overlay is active');

console.log('[NexoWatt EOS datapoint selftest] OK');
