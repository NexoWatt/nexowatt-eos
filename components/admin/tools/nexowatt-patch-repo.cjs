#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const input = process.argv[2];
const output = process.argv[3] || input;
const version = process.argv[4] || require('../package.json').version;
const baseUrl = (process.argv[5] || `https://unpkg.com/iobroker.eos-admin@${version}`).replace(/\/$/, '');
if (!input) {
  console.error('Usage: node tools/nexowatt-patch-repo.cjs <repo-nexowatt.json> [output.json] [version] [base-url]');
  process.exit(2);
}
const repo = JSON.parse(fs.readFileSync(input, 'utf8'));
const ioPath = path.join(__dirname, '..', 'io-package.json');
const io = JSON.parse(fs.readFileSync(ioPath, 'utf8'));
repo['eos-admin'] = {
  ...(repo['eos-admin'] || {}),
  name: 'eos-admin',
  version,
  title: 'NexoWatt EOS Admin',
  titleLang: io.common.titleLang,
  desc: {
    de: 'Eigenständige NexoWatt EOS Administrationsoberfläche mit zuverlässigem In-App-Updatepfad für Energy Operation System Installationen.',
    en: 'Standalone NexoWatt EOS administration interface with reliable in-app update flow for Energy Operation System installations.',
  },
  news: io.common.news,
  meta: `${baseUrl}/io-package.json`,
  icon: `${baseUrl}/admin/admin.png`,
  extIcon: `${baseUrl}/admin/admin.svg`,
  type: 'general',
  mode: 'daemon',
  platform: 'Javascript/Node.js',
  connectionType: 'local',
  dataSource: 'push',
  adminUI: { config: 'json' },
  license: 'NexoWatt Proprietary',
  licenseInformation: io.common.licenseInformation,
  dependencies: [{ 'js-controller': '>=6.0.11' }],
  stopBeforeUpdate: false,
  dontDelete: false,
  nondeletable: false,
  readme: `${baseUrl}/README.md`,
  packetName: 'iobroker.eos-admin',
    npmPackage: 'iobroker.eos-admin',
  allowAdapterUpdate: true,
  allowAdapterDelete: false,
};
fs.writeFileSync(output, JSON.stringify(repo, null, 2) + '\n');
console.log(`Patched ${input} -> ${output}`);
console.log(`repo["eos-admin"].version=${version}`);
console.log(`repo["eos-admin"].meta=${repo['eos-admin'].meta}`);
console.log('repo["eos-admin"].stopBeforeUpdate=false');
console.log('repo["eos-admin"].dontDelete=false');
console.log('repo["eos-admin"].nondeletable=false');
