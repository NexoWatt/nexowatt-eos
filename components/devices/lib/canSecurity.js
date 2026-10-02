'use strict';
const { spawn } = require('node:child_process');

function canInterface(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]{0,14}$/.test(value)) throw new Error('EOS_CAN_INTERFACE_INVALID');
  return value;
}

function canTool(name, configured) {
  const target = `/usr/bin/${name}`;
  if (!['candump', 'cansend'].includes(name) || (configured && configured !== name && configured !== target)) {
    throw new Error('EOS_CAN_EXECUTABLE_NOT_ALLOWED');
  }
  return target;
}

function validateFrame(frame) {
  if (typeof frame !== 'string' || frame.length > 140 || !/^(?:[0-9A-Fa-f]{1,3}|[0-9A-Fa-f]{8})#(?:[0-9A-Fa-f]{0,16}|[Rr][0-8]?|#[0-9A-Fa-f][0-9A-Fa-f]{0,128})$/.test(frame)) {
    throw new Error('EOS_CAN_FRAME_INVALID');
  }
  const id = frame.split('#')[0];
  if (parseInt(id, 16) > (id.length <= 3 ? 0x7ff : 0x1fffffff)) throw new Error('EOS_CAN_FRAME_INVALID');
  const data = frame.slice(frame.indexOf('#') + 1);
  if (!/^[Rr]/.test(data) && (data.startsWith('#') ? data.length - 2 : data.length) % 2 !== 0) throw new Error('EOS_CAN_FRAME_INVALID');
  return frame;
}

async function sendCanFrame(tool, iface, frame) {
  canTool('cansend', tool); canInterface(iface); validateFrame(frame);
  await new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/cansend', [iface, frame], {
      stdio: ['ignore', 'ignore', 'pipe'], timeout: 5000, killSignal: 'SIGKILL', shell: false,
    });
    // Diagnostic output is untrusted and may contain sensitive configuration.
    let bytes = 0;
    child.stderr?.on('data', data => { if ((bytes += data.length) > 65536) child.kill('SIGKILL'); });
    child.once('error', () => reject(new Error('EOS_CAN_SEND_FAILED')));
    child.once('close', code => code === 0 ? resolve() : reject(new Error('EOS_CAN_SEND_FAILED')));
  });
}

module.exports = { canInterface, canTool, validateFrame, sendCanFrame };
