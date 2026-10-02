#!/usr/bin/env node
'use strict';
const pkg = require('../package.json');
const io = require('../io-package.json');
const version = io.common.version || pkg.version;
const base = (process.argv[2] || `https://unpkg.com/iobroker.eos-admin@${version}`).replace(/\/$/, '');
const entry = {
  'eos-admin': {
    name: 'eos-admin',
    version,
    title: 'NexoWatt EOS Admin',
    titleLang: io.common.titleLang,
    desc: io.common.desc,
    news: io.common.news,
    meta: `${base}/io-package.json`,
    icon: `${base}/admin/admin.png`,
    extIcon: `${base}/admin/admin.svg`,
    type: io.common.type || 'general',
    mode: io.common.mode || 'daemon',
    platform: io.common.platform || 'Javascript/Node.js',
    connectionType: io.common.connectionType || 'local',
    dataSource: io.common.dataSource || 'push',
    adminUI: io.common.adminUI || { config: 'json' },
    license: io.common.license || 'NexoWatt Proprietary',
    licenseInformation: io.common.licenseInformation,
    dependencies: io.common.dependencies || [{ 'js-controller': '>=6.0.11' }],
    stopBeforeUpdate: false,
    dontDelete: false,
    nondeletable: false,
    readme: `${base}/README.md`,
    packetName: 'iobroker.eos-admin',
    npmPackage: 'iobroker.eos-admin',
    allowAdapterUpdate: true,
    allowAdapterDelete: false,
  }
};
console.log(JSON.stringify(entry, null, 2));
