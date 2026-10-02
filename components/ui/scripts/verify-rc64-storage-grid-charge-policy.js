#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { resolveStorageGridChargePermission } = require('../ems/modules/tarif-vis');

const master = {
  appCenterAllowed: true,
  priorityAllowsStorage: true,
  storageWriterAvailable: true,
  storagePowerW: 4000,
};

function decision(overrides = {}) {
  return resolveStorageGridChargePermission({
    ...master,
    tariffActive: true,
    currentPriceFresh: true,
    tariffState: 'guenstig',
    manualNetFeeEnabled: false,
    manualNtWindowActive: false,
    ...overrides,
  });
}

const matrix = [
  {
    name: 'Netzentgelt an + NT aktiv + Dynamiktarif aus',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: false, currentPriceFresh: false, tariffState: 'unknown' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif neutral und frisch',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif günstig und frisch',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig' },
    allowed: true,
    source: 'net-fee-nt-cheap',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Tarif teuer',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: true, tariffState: 'teuer' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + NT aktiv + Preis veraltet',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: true, tariffActive: true, currentPriceFresh: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt an + außerhalb NT + Tarif günstig',
    input: { manualNetFeeEnabled: true, manualNtWindowActive: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'net-fee',
  },
  {
    name: 'Netzentgelt aus + Tarif günstig und frisch',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: true, tariffState: 'guenstig' },
    allowed: true,
    source: 'dynamic-tariff-cheap',
  },
  {
    name: 'Netzentgelt aus + Tarif neutral',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: true, tariffState: 'neutral' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt aus + günstiger Tarif veraltet',
    input: { manualNetFeeEnabled: false, tariffActive: true, currentPriceFresh: false, tariffState: 'guenstig' },
    allowed: false,
    source: 'dynamic-tariff',
  },
  {
    name: 'Netzentgelt aus + dynamischer Tarif aus',
    input: { manualNetFeeEnabled: false, tariffActive: false, currentPriceFresh: false, tariffState: 'unknown' },
    allowed: false,
    source: 'dynamic-tariff',
  },
];

for (const row of matrix) {
  const result = decision(row.input);
  assert.strictEqual(result.allowed, row.allowed, `${row.name}: allowed`);
  assert.strictEqual(result.source, row.source, `${row.name}: source`);
  assert.strictEqual(typeof result.reason, 'string', `${row.name}: reason missing`);
}

for (const [name, input] of [
  ['AppCenter aus', { appCenterAllowed: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Priorität sperrt Speicher', { priorityAllowsStorage: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Kein Writer', { storageWriterAvailable: false, manualNetFeeEnabled: true, manualNtWindowActive: true }],
  ['Keine Ladeleistung', { storagePowerW: 0, manualNetFeeEnabled: true, manualNtWindowActive: true }],
]) {
  assert.strictEqual(decision(input).allowed, false, `${name} must remain a hard master block`);
}

const tariffSource = fs.readFileSync(path.join(__dirname, '../ems/modules/tarif-vis.js'), 'utf8');
const helperStart = tariffSource.indexOf('function resolveStorageGridChargePermission');
const helperEnd = tariffSource.indexOf('function formatStorageNtWindowLabel', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'storage tariff permission helper missing');
const helperSource = tariffSource.slice(helperStart, helperEnd);
assert.match(helperSource, /normalizedTariffState !== 'guenstig'/, 'only a cheap dynamic tariff may release storage grid charging');
assert.match(helperSource, /manualNetFeeEnabled && !manualNtWindowActive/, 'enabled variable net fee must additionally require the configured NT window');
assert.match(helperSource, /source: 'net-fee-nt-cheap'/);
assert.match(helperSource, /source: 'dynamic-tariff-cheap'/);
assert.doesNotMatch(helperSource, /\['guenstig', 'neutral'\]/, 'neutral must never be part of the storage grid-charge allow list');
assert.doesNotMatch(tariffSource, /\? '22:00' : ntStartRaw/);
assert.doesNotMatch(tariffSource, /\? '06:00' : ntEndRaw/);

console.log('[rc64-storage-grid-charge-policy] OK: storage grid charging requires a fresh cheap dynamic tariff; active variable net fee additionally requires the configured NT window.');
