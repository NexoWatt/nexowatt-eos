#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = message => { console.error(`[NexoWatt EOS update selftest] ${message}`); process.exit(1); };

const app = read('src-admin/src/App.tsx');
const drawer = read('src-admin/src/components/Drawer.tsx');
const adapters = read('src-admin/src/tabs/Adapters.tsx');
const updater = read('src-admin/src/components/Adapters/AdaptersUpdaterDialog.tsx');
const worker = read('src-admin/src/Workers/GenericWorker.tsx');
const instances = read('src-admin/src/tabs/Instances.tsx');
const runtime = JSON.parse(read('NEXOWATT_EOS_BUILD_INFO.json')).runtimeEntry;
const bootstrap = read(`adminWww/assets/bootstrap-COulQZax-${runtime}.js`);
const adaptersBuilt = read(`adminWww/assets/Adapters-B5_jQ7DE-${runtime}.js`);
const instancesBuilt = read(`adminWww/assets/Instances-YdaGnS5a-${runtime}.js`);

for (const marker of ['this.state.connected', 'this.state.ready', 'pendingCommand', '60_000', 'commandRunning']) if (!app.includes(marker)) fail(`App source missing ${marker}`);
if (!app.includes('ready={this.state.ready && this.state.connected}')) fail('App does not pass connection-aware readiness');
for (const marker of ['EOS stellt die Verbindung noch her', '_eosPendingCommand', 'commandRunning', 'ready:this.state.ready&&this.state.connected']) if (!bootstrap.includes(marker)) fail(`built command guard missing ${marker}`);
for (const marker of ['isTransientConnectionError', 'scheduleTabsRetry', 'tabsRetryAttempt']) if (!drawer.includes(marker)) fail(`Drawer source missing ${marker}`);
for (const marker of ['_eosTabsRetryAttempt', 'close_abnormal', 'Cannot get instances']) if (!bootstrap.includes(marker)) fail(`built Drawer retry missing ${marker}`);

for (const marker of ['initializeAdapters', 'scheduleInitializationRetry', 'workerHandlersRegistered', 'componentDidUpdate(prevProps']) if (!adapters.includes(marker)) fail(`Adapters source missing ${marker}`);
for (const marker of ['_eosInitializeAdapters', '_eosAdaptersRetryTimer', '_eosAdaptersHandlersRegistered']) if (!adaptersBuilt.includes(marker)) fail(`Adapters bundle missing ${marker}`);
if (!updater.includes('ready: boolean')) fail('bulk updater ready prop missing');
if (!updater.includes('ready={this.props.ready}')) fail('bulk updater Command ignores readiness');
if (!adaptersBuilt.includes('ready:this.props.ready')) fail('bulk updater bundle ignores readiness');
if (adaptersBuilt.includes('ready:!0,host:this.props.currentHost')) fail('bulk updater still forces Command ready');

for (const marker of ['isTransientConnectionError', 'reportConnectionError', 'this.promise = null']) if (!worker.includes(marker)) fail(`GenericWorker source missing ${marker}`);
if (bootstrap.includes('window.alert(`Cannot get objects of type')) fail('built GenericWorker still opens reconnect alerts');
for (const marker of ['scheduleInstancesRetry', 'instancesRetryAttempt', 'instancesUnmounted']) if (!instances.includes(marker)) fail(`Instances source missing ${marker}`);
for (const marker of ['_eosInstancesRetryAttempt', '_eosInstancesRetryTimer']) if (!instancesBuilt.includes(marker)) fail(`Instances bundle missing ${marker}`);
if (instancesBuilt.includes('window.alert("Cannot read instances!")')) fail('Instances bundle still alerts during startup');
if (instancesBuilt.includes('console.log(`getInstances:')) fail('Instances timing spam remains');

console.log('[NexoWatt EOS update selftest] OK');
