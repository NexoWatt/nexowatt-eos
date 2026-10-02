'use strict';

/**
 * Decode Weidmüller CH-W-B multi-register ASCII values.
 *
 * The wallbox documentation stores the least-significant 16-bit word at the
 * lowest Modbus address, while bytes inside each register keep normal Modbus
 * order. Variable-length values (RFID UID) are padded with zero words after
 * the used low-word-first prefix.
 */
function decodeAsciiLswFirst(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2) return '';

  const words = [];
  for (let offset = 0; offset + 1 < buffer.length; offset += 2) {
    words.push(buffer.readUInt16BE(offset));
  }

  // Zero padding follows the used low-word-first payload. Remove only trailing
  // empty words before reversing so an RFID UID such as 450ECA25 is restored
  // from 0x3235,0x4341,0x3045,0x3435,0x0000,... correctly.
  while (words.length && words[words.length - 1] === 0) words.pop();
  words.reverse();

  const out = Buffer.alloc(words.length * 2);
  for (let i = 0; i < words.length; i += 1) {
    out.writeUInt16BE(words[i] & 0xFFFF, i * 2);
  }

  return out
    .toString('ascii')
    .replace(/^\0+|\0+$/g, '')
    .trim();
}

/**
 * Encode ASCII using the same low-significance-word-first representation.
 * The function is currently used only defensively; the initial CH-W-B
 * template keeps identification strings read-only.
 */
function encodeAsciiLswFirst(value, byteLength) {
  const length = Math.max(0, Math.trunc(Number(byteLength) || 0));
  const out = Buffer.alloc(length);
  if (!length) return out;

  const input = Buffer.from(value === null || value === undefined ? '' : String(value), 'ascii');
  const usedBytes = Math.min(input.length, length);
  const usedWords = Math.ceil(usedBytes / 2);
  if (!usedWords) return out;

  const normal = Buffer.alloc(usedWords * 2);
  input.copy(normal, 0, 0, usedBytes);

  const words = [];
  for (let offset = 0; offset < normal.length; offset += 2) {
    words.push(normal.readUInt16BE(offset));
  }
  words.reverse();

  for (let i = 0; i < words.length && (i * 2 + 1) < out.length; i += 1) {
    out.writeUInt16BE(words[i] & 0xFFFF, i * 2);
  }
  return out;
}

/** Decode a fixed-width low-word-first byte sequence as hexadecimal octets. */
function decodeHexLswFirst(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 2) return '';
  const words = [];
  for (let offset = 0; offset + 1 < buffer.length; offset += 2) {
    words.push(buffer.readUInt16BE(offset));
  }
  words.reverse();

  const bytes = [];
  for (const word of words) {
    bytes.push((word >>> 8) & 0xFF, word & 0xFF);
  }
  return bytes.map(v => v.toString(16).toUpperCase().padStart(2, '0')).join(':');
}

/** Decode four uint16 register values that each contain one IPv4 octet. */
function decodeIpv4U16(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return '';
  const octets = [];
  for (let offset = 0; offset + 1 < buffer.length; offset += 2) {
    octets.push(buffer.readUInt16BE(offset));
  }
  return octets.slice(0, 4).join('.');
}

module.exports = {
  decodeAsciiLswFirst,
  encodeAsciiLswFirst,
  decodeHexLswFirst,
  decodeIpv4U16,
};
