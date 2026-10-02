'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { canInterface, canTool, validateFrame } = require('../lib/canSecurity');

test('CAN executable cannot come from configuration or PATH', () => {
  assert.equal(canTool('candump'), '/usr/bin/candump');
  assert.equal(canTool('cansend', 'cansend'), '/usr/bin/cansend');
  for (const value of ['/tmp/cansend', 'node', '/bin/sh', '/usr/bin/cansend --help']) {
    assert.throws(() => canTool('cansend', value), /EXECUTABLE_NOT_ALLOWED/);
  }
});

test('CAN interface cannot be a command option, path or compound argument', () => {
  assert.equal(canInterface('can0'), 'can0');
  assert.equal(canInterface('vcan-test'), 'vcan-test');
  for (const value of ['-h', 'can0,123:7FF', '../can0', 'can0 can1', 'x'.repeat(16), 'can0;id']) {
    assert.throws(() => canInterface(value), /INTERFACE_INVALID/);
  }
});

test('CAN frames preserve classic, RTR and FD formats and reject malformed/range inputs', () => {
  for (const value of ['123#DEADBEEF', '123#R8', '123#', '123##100FF', '1FFFFFFF#FF']) assert.equal(validateFrame(value), value);
  for (const value of ['--help', '123#F', '123#GG', '800#FF', '20000000#FF', '123#R9', '123##1F', '123#' + 'AA'.repeat(9)]) {
    assert.throws(() => validateFrame(value), /FRAME_INVALID/);
  }
});
