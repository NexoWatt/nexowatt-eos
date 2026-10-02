'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pow10(exp) {
  // exp can be negative
  return Math.pow(10, exp);
}

function applyScale(value, scaleFactor) {
  if (value === null || value === undefined) return value;
  const n = Number(scaleFactor || 0);
  if (!n) return value;
  return value * pow10(n);
}

function removeScale(value, scaleFactor) {
  if (value === null || value === undefined) return value;
  const n = Number(scaleFactor || 0);
  if (!n) return value;
  return value / pow10(n);
}

function bigIntToNumberOrString(bi) {
  // Convert BigInt safely; if it exceeds Number safe range, return string
  if (typeof bi !== 'bigint') return bi;
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
  if (bi <= maxSafe && bi >= minSafe) return Number(bi);
  return bi.toString();
}


/**
 * Robust decimal rounding for Number values.
 *
 * Why not Math.round(v * 100) / 100?
 * Because typical Modbus scale factors can create binary floating point artefacts
 * (e.g. 1.005 -> 1.00). This helper uses exponent shifting to get predictable
 * results for the small decimal ranges we use in datapoints.
 *
 * @param {any} value
 * @param {number} decimals 0..10
 * @returns {any}
 */
function roundTo(value, decimals) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;

  const d = Number(decimals);
  if (!Number.isFinite(d)) return value;
  const dec = Math.max(0, Math.min(10, Math.trunc(d)));

  if (dec === 0) return Math.round(value);

  // Exponent-shift rounding (handles common cases like 1.005 correctly)
  // eslint-disable-next-line no-implicit-coercion
  return Number(Math.round(Number(value + 'e' + dec)) + 'e-' + dec);
}



function getByJsonPath(obj, path) {
  if (!path || !obj) return undefined;
  let p = String(path).trim();

  // Allow "$.Field" or "Field" – normalize
  if (p.startsWith('$.')) p = p.substring(2);
  if (p.startsWith('$[')) {
    // $["Field with spaces"]
    // Convert to bracket token list
  }
  if (p.startsWith('$')) p = p.substring(1);

  // Tokenize dot + bracket notation: a.b["c d"].e[0]
  const tokens = [];
  let i = 0;
  while (i < p.length) {
    const ch = p[i];
    if (ch === '.') {
      i++;
      continue;
    }
    if (ch === '[') {
      const end = p.indexOf(']', i);
      if (end === -1) break;
      const inner = p.substring(i + 1, end).trim();
      // Remove optional quotes
      const m = inner.match(/^["'](.+)["']$/);
      const tok = m ? m[1] : inner;
      tokens.push(tok);
      i = end + 1;
      continue;
    }
    // read until . or [
    let j = i;
    while (j < p.length && p[j] !== '.' && p[j] !== '[') j++;
    tokens.push(p.substring(i, j));
    i = j;
  }

  let cur = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (t === '') continue;
    if (Array.isArray(cur) && /^\d+$/.test(String(t))) {
      cur = cur[Number(t)];
    } else {
      cur = cur[t];
    }
  }
  return cur;
}

function coerceBoolean(v) {
  if (v === null || v === undefined) return v;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '1' || s === 'true' || s === 'on' || s === 'yes' || s === 'y') return true;
    if (s === '0' || s === 'false' || s === 'off' || s === 'no' || s === 'n' || s === '') return false;
  }
  return !!v;
}

function tryParseNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (s === '') return v;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return v;
}

function applyNumericTransforms(value, src) {
  if (value === null || value === undefined) return value;
  const s = src || {};
  let v = value;

  v = tryParseNumber(v);

  if (typeof v === 'number') {
    // scaleFactor is base-10 exponent (value * 10^scaleFactor)
    if (s.scaleFactor !== undefined && s.scaleFactor !== null) {
      v = applyScale(v, s.scaleFactor);
    }

    // Optional arbitrary transforms (useful e.g. for HTTP/JSON sources)
    if (s.multiplier !== undefined && s.multiplier !== null) {
      const m = Number(s.multiplier);
      if (!Number.isNaN(m)) v = v * m;
    }
    if (s.divisor !== undefined && s.divisor !== null) {
      const d = Number(s.divisor);
      if (!Number.isNaN(d) && d !== 0) v = v / d;
    }
    if (s.offset !== undefined && s.offset !== null) {
      const o = Number(s.offset);
      if (!Number.isNaN(o)) v = v + o;
    }

    if (s.invert) {
      v = -v;
    }
    if (s.keepPositive) {
      v = Math.max(0, v);
    }
    if (s.keepNegativeAndInvert) {
      v = v < 0 ? (-v) : 0;
    }
  }

  return v;
}


function normalizeValueByUnit(value, dp) {
  if (value === null || value === undefined) return value;
  if (!dp) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;

  const unitLower = (dp.unit ?? '').toString().trim().toLowerCase();
  const roleLower = (dp.role ?? '').toString().toLowerCase();
  const idLower = (dp.id ?? '').toString().toLowerCase();
  const nameLower = (dp.name ?? '').toString().toLowerCase();

  const looksLikeFrequency =
    unitLower === 'hz' ||
    roleLower.includes('frequency') ||
    idLower.includes('freq') ||
    nameLower.includes('freq');

  if (looksLikeFrequency) {
    // Common field issue: frequency is sometimes scaled by 10
    // (e.g. 499.8 instead of 49.98). Correct only when it clearly
    // looks like mains/grid frequency (50/60 Hz).
    const candidate = value / 10;
    if (value >= 100 && value <= 1000 && candidate >= 40 && candidate <= 70) {
      return candidate;
    }
  }

  return value;
}

module.exports = {
  sleep,
  applyScale,
  removeScale,
  roundTo,
  bigIntToNumberOrString,
  getByJsonPath,
  coerceBoolean,
  applyNumericTransforms,
  normalizeValueByUnit,
};