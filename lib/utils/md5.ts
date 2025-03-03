// Constants
const stateIdentity = new Int32Array([
  1732584193, -271733879, -1732584194, 271733878,
]);

/**
 * Converts an Int32Array to a hexadecimal string
 */
function _hex(x: Int32Array): string {
  const hc = "0123456789abcdef";
  const ho: string[] = [];
  let n;
  let offset;
  let j;
  let i;

  for (i = 0; i < 4; i += 1) {
    offset = i * 8;
    n = x[i];
    for (j = 0; j < 8; j += 2) {
      ho[offset + 1 + j] = hc.charAt(n & 0x0f);
      n >>>= 4;
      ho[offset + 0 + j] = hc.charAt(n & 0x0f);
      n >>>= 4;
    }
  }
  return ho.join("");
}

/**
 * Performs a single MD5 transformation cycle
 */
function _md5cycle(x: Int32Array | Uint32Array, k: Int32Array | Uint32Array) {
  let a = x[0];
  let b = x[1];
  let c = x[2];
  let d = x[3];
  // ff()
  a += (((b & c) | (~b & d)) + k[0] - 680876936) | 0;
  a = (((a << 7) | (a >>> 25)) + b) | 0;
  d += (((a & b) | (~a & c)) + k[1] - 389564586) | 0;
  d = (((d << 12) | (d >>> 20)) + a) | 0;
  c += (((d & a) | (~d & b)) + k[2] + 606105819) | 0;
  c = (((c << 17) | (c >>> 15)) + d) | 0;
  b += (((c & d) | (~c & a)) + k[3] - 1044525330) | 0;
  b = (((b << 22) | (b >>> 10)) + c) | 0;
  a += (((b & c) | (~b & d)) + k[4] - 176418897) | 0;
  a = (((a << 7) | (a >>> 25)) + b) | 0;
  d += (((a & b) | (~a & c)) + k[5] + 1200080426) | 0;
  d = (((d << 12) | (d >>> 20)) + a) | 0;
  c += (((d & a) | (~d & b)) + k[6] - 1473231341) | 0;
  c = (((c << 17) | (c >>> 15)) + d) | 0;
  b += (((c & d) | (~c & a)) + k[7] - 45705983) | 0;
  b = (((b << 22) | (b >>> 10)) + c) | 0;
  a += (((b & c) | (~b & d)) + k[8] + 1770035416) | 0;
  a = (((a << 7) | (a >>> 25)) + b) | 0;
  d += (((a & b) | (~a & c)) + k[9] - 1958414417) | 0;
  d = (((d << 12) | (d >>> 20)) + a) | 0;
  c += (((d & a) | (~d & b)) + k[10] - 42063) | 0;
  c = (((c << 17) | (c >>> 15)) + d) | 0;
  b += (((c & d) | (~c & a)) + k[11] - 1990404162) | 0;
  b = (((b << 22) | (b >>> 10)) + c) | 0;
  a += (((b & c) | (~b & d)) + k[12] + 1804603682) | 0;
  a = (((a << 7) | (a >>> 25)) + b) | 0;
  d += (((a & b) | (~a & c)) + k[13] - 40341101) | 0;
  d = (((d << 12) | (d >>> 20)) + a) | 0;
  c += (((d & a) | (~d & b)) + k[14] - 1502002290) | 0;
  c = (((c << 17) | (c >>> 15)) + d) | 0;
  b += (((c & d) | (~c & a)) + k[15] + 1236535329) | 0;
  b = (((b << 22) | (b >>> 10)) + c) | 0;
  // gg()
  a += (((b & d) | (c & ~d)) + k[1] - 165796510) | 0;
  a = (((a << 5) | (a >>> 27)) + b) | 0;
  d += (((a & c) | (b & ~c)) + k[6] - 1069501632) | 0;
  d = (((d << 9) | (d >>> 23)) + a) | 0;
  c += (((d & b) | (a & ~b)) + k[11] + 643717713) | 0;
  c = (((c << 14) | (c >>> 18)) + d) | 0;
  b += (((c & a) | (d & ~a)) + k[0] - 373897302) | 0;
  b = (((b << 20) | (b >>> 12)) + c) | 0;
  a += (((b & d) | (c & ~d)) + k[5] - 701558691) | 0;
  a = (((a << 5) | (a >>> 27)) + b) | 0;
  d += (((a & c) | (b & ~c)) + k[10] + 38016083) | 0;
  d = (((d << 9) | (d >>> 23)) + a) | 0;
  c += (((d & b) | (a & ~b)) + k[15] - 660478335) | 0;
  c = (((c << 14) | (c >>> 18)) + d) | 0;
  b += (((c & a) | (d & ~a)) + k[4] - 405537848) | 0;
  b = (((b << 20) | (b >>> 12)) + c) | 0;
  a += (((b & d) | (c & ~d)) + k[9] + 568446438) | 0;
  a = (((a << 5) | (a >>> 27)) + b) | 0;
  d += (((a & c) | (b & ~c)) + k[14] - 1019803690) | 0;
  d = (((d << 9) | (d >>> 23)) + a) | 0;
  c += (((d & b) | (a & ~b)) + k[3] - 187363961) | 0;
  c = (((c << 14) | (c >>> 18)) + d) | 0;
  b += (((c & a) | (d & ~a)) + k[8] + 1163531501) | 0;
  b = (((b << 20) | (b >>> 12)) + c) | 0;
  a += (((b & d) | (c & ~d)) + k[13] - 1444681467) | 0;
  a = (((a << 5) | (a >>> 27)) + b) | 0;
  d += (((a & c) | (b & ~c)) + k[2] - 51403784) | 0;
  d = (((d << 9) | (d >>> 23)) + a) | 0;
  c += (((d & b) | (a & ~b)) + k[7] + 1735328473) | 0;
  c = (((c << 14) | (c >>> 18)) + d) | 0;
  b += (((c & a) | (d & ~a)) + k[12] - 1926607734) | 0;
  b = (((b << 20) | (b >>> 12)) + c) | 0;
  // hh()
  a += ((b ^ c ^ d) + k[5] - 378558) | 0;
  a = (((a << 4) | (a >>> 28)) + b) | 0;
  d += ((a ^ b ^ c) + k[8] - 2022574463) | 0;
  d = (((d << 11) | (d >>> 21)) + a) | 0;
  c += ((d ^ a ^ b) + k[11] + 1839030562) | 0;
  c = (((c << 16) | (c >>> 16)) + d) | 0;
  b += ((c ^ d ^ a) + k[14] - 35309556) | 0;
  b = (((b << 23) | (b >>> 9)) + c) | 0;
  a += ((b ^ c ^ d) + k[1] - 1530992060) | 0;
  a = (((a << 4) | (a >>> 28)) + b) | 0;
  d += ((a ^ b ^ c) + k[4] + 1272893353) | 0;
  d = (((d << 11) | (d >>> 21)) + a) | 0;
  c += ((d ^ a ^ b) + k[7] - 155497632) | 0;
  c = (((c << 16) | (c >>> 16)) + d) | 0;
  b += ((c ^ d ^ a) + k[10] - 1094730640) | 0;
  b = (((b << 23) | (b >>> 9)) + c) | 0;
  a += ((b ^ c ^ d) + k[13] + 681279174) | 0;
  a = (((a << 4) | (a >>> 28)) + b) | 0;
  d += ((a ^ b ^ c) + k[0] - 358537222) | 0;
  d = (((d << 11) | (d >>> 21)) + a) | 0;
  c += ((d ^ a ^ b) + k[3] - 722521979) | 0;
  c = (((c << 16) | (c >>> 16)) + d) | 0;
  b += ((c ^ d ^ a) + k[6] + 76029189) | 0;
  b = (((b << 23) | (b >>> 9)) + c) | 0;
  a += ((b ^ c ^ d) + k[9] - 640364487) | 0;
  a = (((a << 4) | (a >>> 28)) + b) | 0;
  d += ((a ^ b ^ c) + k[12] - 421815835) | 0;
  d = (((d << 11) | (d >>> 21)) + a) | 0;
  c += ((d ^ a ^ b) + k[15] + 530742520) | 0;
  c = (((c << 16) | (c >>> 16)) + d) | 0;
  b += ((c ^ d ^ a) + k[2] - 995338651) | 0;
  b = (((b << 23) | (b >>> 9)) + c) | 0;
  // ii()
  a += ((c ^ (b | ~d)) + k[0] - 198630844) | 0;
  a = (((a << 6) | (a >>> 26)) + b) | 0;
  d += ((b ^ (a | ~c)) + k[7] + 1126891415) | 0;
  d = (((d << 10) | (d >>> 22)) + a) | 0;
  c += ((a ^ (d | ~b)) + k[14] - 1416354905) | 0;
  c = (((c << 15) | (c >>> 17)) + d) | 0;
  b += ((d ^ (c | ~a)) + k[5] - 57434055) | 0;
  b = (((b << 21) | (b >>> 11)) + c) | 0;
  a += ((c ^ (b | ~d)) + k[12] + 1700485571) | 0;
  a = (((a << 6) | (a >>> 26)) + b) | 0;
  d += ((b ^ (a | ~c)) + k[3] - 1894986606) | 0;
  d = (((d << 10) | (d >>> 22)) + a) | 0;
  c += ((a ^ (d | ~b)) + k[10] - 1051523) | 0;
  c = (((c << 15) | (c >>> 17)) + d) | 0;
  b += ((d ^ (c | ~a)) + k[1] - 2054922799) | 0;
  b = (((b << 21) | (b >>> 11)) + c) | 0;
  a += ((c ^ (b | ~d)) + k[8] + 1873313359) | 0;
  a = (((a << 6) | (a >>> 26)) + b) | 0;
  d += ((b ^ (a | ~c)) + k[15] - 30611744) | 0;
  d = (((d << 10) | (d >>> 22)) + a) | 0;
  c += ((a ^ (d | ~b)) + k[6] - 1560198380) | 0;
  c = (((c << 15) | (c >>> 17)) + d) | 0;
  b += ((d ^ (c | ~a)) + k[13] + 1309151649) | 0;
  b = (((b << 21) | (b >>> 11)) + c) | 0;
  a += ((c ^ (b | ~d)) + k[4] - 145523070) | 0;
  a = (((a << 6) | (a >>> 26)) + b) | 0;
  d += ((b ^ (a | ~c)) + k[11] - 1120210379) | 0;
  d = (((d << 10) | (d >>> 22)) + a) | 0;
  c += ((a ^ (d | ~b)) + k[2] + 718787259) | 0;
  c = (((c << 15) | (c >>> 17)) + d) | 0;
  b += ((d ^ (c | ~a)) + k[9] - 343485551) | 0;
  b = (((b << 21) | (b >>> 11)) + c) | 0;

  x[0] = (a + x[0]) | 0;
  x[1] = (b + x[1]) | 0;
  x[2] = (c + x[2]) | 0;
  x[3] = (d + x[3]) | 0;
}

/**
 * Hash a UTF-8 string and return the MD5 hash as a hexadecimal string
 * @param str String to hash
 */
export function md5(str: string): string {
  // Initialize state and buffers
  const state = new Int32Array(stateIdentity);
  const buffer = new ArrayBuffer(68);
  const buffer8 = new Uint8Array(buffer, 0, 68);
  const buffer32 = new Uint32Array(buffer, 0, 17);

  let dataLength = 0;
  let bufferLength = 0;

  // Process the input string
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i);
    if (code < 128) {
      buffer8[bufferLength++] = code;
    } else if (code < 0x800) {
      buffer8[bufferLength++] = (code >>> 6) + 0xc0;
      buffer8[bufferLength++] = (code & 0x3f) | 0x80;
    } else if (code < 0xd800 || code > 0xdbff) {
      buffer8[bufferLength++] = (code >>> 12) + 0xe0;
      buffer8[bufferLength++] = ((code >>> 6) & 0x3f) | 0x80;
      buffer8[bufferLength++] = (code & 0x3f) | 0x80;
    } else {
      code = (code - 0xd800) * 0x400 + (str.charCodeAt(++i) - 0xdc00) + 0x10000;
      if (code > 0x10ffff) {
        throw new Error("Unicode standard supports code points up to U+10FFFF");
      }
      buffer8[bufferLength++] = (code >>> 18) + 0xf0;
      buffer8[bufferLength++] = ((code >>> 12) & 0x3f) | 0x80;
      buffer8[bufferLength++] = ((code >>> 6) & 0x3f) | 0x80;
      buffer8[bufferLength++] = (code & 0x3f) | 0x80;
    }
    if (bufferLength >= 64) {
      dataLength += 64;
      _md5cycle(state, buffer32);
      bufferLength -= 64;
      buffer32[0] = buffer32[16];
    }
  }

  // Finalize the hash
  dataLength += bufferLength;
  buffer8[bufferLength++] = 0x80;

  if (bufferLength > 56) {
    while (bufferLength < 64) {
      buffer8[bufferLength++] = 0;
    }
    _md5cycle(state, buffer32);
    bufferLength = 0;
  }

  while (bufferLength < 56) {
    buffer8[bufferLength++] = 0;
  }

  buffer32[14] = dataLength << 3;
  buffer32[15] = (dataLength >>> 29) | 0;
  _md5cycle(state, buffer32);

  return _hex(state);
}
