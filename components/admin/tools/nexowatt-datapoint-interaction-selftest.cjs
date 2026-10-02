#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const runtime = JSON.parse(fs.readFileSync(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'), 'utf8')).runtimeEntry;
const shared = fs.readFileSync(path.join(root, `adminWww/assets/index-D2ymscJA-${runtime}.js`), 'utf8');
const dialog = fs.readFileSync(path.join(root, `adminWww/assets/Objects-DPan0bzw-${runtime}.js`), 'utf8');
const fail = m => { throw new Error(`[NexoWatt EOS DP interaction selftest] ${m}`); };

for (const marker of [
    '"data-eos-object-writable":y?"1":"0"',
    'NEXOWATT_EOS_GET_WRITE_BEHAVIOR',
    'NEXOWATT_EOS_GET_DIRECT_WRITE_VALUE',
    'NEXOWATT_EOS_RESOLVE_DIRECT_WRITE_VALUE',
    'NEXOWATT_EOS_WRITE_MANUAL_STATE',
    'NEXOWATT_EOS_PREPARE_MANUAL_EDITOR',
    'Wert setzen …',
    'this.setState({updateOpened:!0})',
]) if (!shared.includes(marker)) fail(`shared runtime missing ${marker}`);

if (shared.includes('onClickCapture:Y=>')) fail('duplicate capture-phase write handler remains');
if (!shared.includes('onClick:async Y=>')) fail('single asynchronous value-cell click path missing');
if (!shared.includes('onMouseDown:Y=>{y&&Y.stopPropagation&&Y.stopPropagation()}')) fail('value-cell row-selection isolation missing');
if (/onMouseDown:Y=>\{[^}]*preventDefault/.test(shared)) fail('mousedown preventDefault would suppress click');
if (!shared.includes('closest(".copyButton")')) fail('copy button exclusion missing');
if (!shared.includes('e.data.state=null,this.forceUpdate()')) fail('post-write local refresh missing');
if (!shared.includes('NEXOWATT_EOS_RESOLVE_DIRECT_WRITE_VALUE(this.props.socket,i,r,e,pe,ne)')) fail('fresh-state direct value resolution missing');
if (!shared.includes('if(ne==="switch")')) fail('switch-only optimistic state update guard missing');
if (!shared.includes('await this.onUpdate(n),this.setState({updateOpened:!1})')) fail('value dialog does not wait for write success');
if (shared.includes('catch{}},width:this.props.width')) fail('value-dialog write errors are swallowed');

for (const marker of [
    'NEXOWATT_EOS_MANUAL_WRITE_POLICY',
    'NEXOWATT_EOS_PARSE_MANUAL_VALUE',
    'writing:!0',
    'this.state.writing',
    'Please wait...',
    'eos-object-value-dialog',
]) if (!dialog.includes(marker)) fail(`dialog runtime missing ${marker}`);
if (!dialog.includes('!!this.state.jsonError||this.state.writing')) fail('invalid/busy dialog guard missing');

console.log('[NexoWatt EOS DP interaction selftest] OK');
