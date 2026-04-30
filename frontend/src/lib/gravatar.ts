const toUtf8 = (str: string) => {
  const out: number[] = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c < 0x80) out.push(c)
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6))
      out.push(0x80 | (c & 0x3f))
    } else if (c < 0xd800 || c >= 0xe000) {
      out.push(0xe0 | (c >> 12))
      out.push(0x80 | ((c >> 6) & 0x3f))
      out.push(0x80 | (c & 0x3f))
    } else {
      i++
      c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      out.push(0xf0 | (c >> 18))
      out.push(0x80 | ((c >> 12) & 0x3f))
      out.push(0x80 | ((c >> 6) & 0x3f))
      out.push(0x80 | (c & 0x3f))
    }
  }
  return out
}

const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n))
const add = (x: number, y: number) => (x + y) >>> 0

const cmn = (q: number, a: number, b: number, x: number, s: number, t: number) =>
  add(rotl(add(add(a, q), add(x, t)), s), b)

const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  cmn((b & c) | (~b & d), a, b, x, s, t)

const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  cmn((b & d) | (c & ~d), a, b, x, s, t)

const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  cmn(b ^ c ^ d, a, b, x, s, t)

const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number) =>
  cmn(c ^ (b | ~d), a, b, x, s, t)

const toHex = (n: number) => {
  const s = "0123456789abcdef"
  return (
    s[(n >>> 4) & 0x0f] +
    s[n & 0x0f]
  )
}

const md5 = (input: string) => {
  const bytes = toUtf8(input)
  const origLen = bytes.length
  bytes.push(0x80)
  while ((bytes.length % 64) !== 56) bytes.push(0)
  const bitLen = origLen * 8
  for (let i = 0; i < 8; i++) bytes.push((bitLen >>> (8 * i)) & 0xff)

  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  const x = new Array<number>(16)
  for (let i = 0; i < bytes.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      const k = i + j * 4
      x[j] = bytes[k] | (bytes[k + 1] << 8) | (bytes[k + 2] << 16) | (bytes[k + 3] << 24)
    }
    let aa = a
    let bb = b
    let cc = c
    let dd = d

    a = ff(a, b, c, d, x[0], 7, 0xd76aa478)
    d = ff(d, a, b, c, x[1], 12, 0xe8c7b756)
    c = ff(c, d, a, b, x[2], 17, 0x242070db)
    b = ff(b, c, d, a, x[3], 22, 0xc1bdceee)
    a = ff(a, b, c, d, x[4], 7, 0xf57c0faf)
    d = ff(d, a, b, c, x[5], 12, 0x4787c62a)
    c = ff(c, d, a, b, x[6], 17, 0xa8304613)
    b = ff(b, c, d, a, x[7], 22, 0xfd469501)
    a = ff(a, b, c, d, x[8], 7, 0x698098d8)
    d = ff(d, a, b, c, x[9], 12, 0x8b44f7af)
    c = ff(c, d, a, b, x[10], 17, 0xffff5bb1)
    b = ff(b, c, d, a, x[11], 22, 0x895cd7be)
    a = ff(a, b, c, d, x[12], 7, 0x6b901122)
    d = ff(d, a, b, c, x[13], 12, 0xfd987193)
    c = ff(c, d, a, b, x[14], 17, 0xa679438e)
    b = ff(b, c, d, a, x[15], 22, 0x49b40821)

    a = gg(a, b, c, d, x[1], 5, 0xf61e2562)
    d = gg(d, a, b, c, x[6], 9, 0xc040b340)
    c = gg(c, d, a, b, x[11], 14, 0x265e5a51)
    b = gg(b, c, d, a, x[0], 20, 0xe9b6c7aa)
    a = gg(a, b, c, d, x[5], 5, 0xd62f105d)
    d = gg(d, a, b, c, x[10], 9, 0x02441453)
    c = gg(c, d, a, b, x[15], 14, 0xd8a1e681)
    b = gg(b, c, d, a, x[4], 20, 0xe7d3fbc8)
    a = gg(a, b, c, d, x[9], 5, 0x21e1cde6)
    d = gg(d, a, b, c, x[14], 9, 0xc33707d6)
    c = gg(c, d, a, b, x[3], 14, 0xf4d50d87)
    b = gg(b, c, d, a, x[8], 20, 0x455a14ed)
    a = gg(a, b, c, d, x[13], 5, 0xa9e3e905)
    d = gg(d, a, b, c, x[2], 9, 0xfcefa3f8)
    c = gg(c, d, a, b, x[7], 14, 0x676f02d9)
    b = gg(b, c, d, a, x[12], 20, 0x8d2a4c8a)

    a = hh(a, b, c, d, x[5], 4, 0xfffa3942)
    d = hh(d, a, b, c, x[8], 11, 0x8771f681)
    c = hh(c, d, a, b, x[11], 16, 0x6d9d6122)
    b = hh(b, c, d, a, x[14], 23, 0xfde5380c)
    a = hh(a, b, c, d, x[1], 4, 0xa4beea44)
    d = hh(d, a, b, c, x[4], 11, 0x4bdecfa9)
    c = hh(c, d, a, b, x[7], 16, 0xf6bb4b60)
    b = hh(b, c, d, a, x[10], 23, 0xbebfbc70)
    a = hh(a, b, c, d, x[13], 4, 0x289b7ec6)
    d = hh(d, a, b, c, x[0], 11, 0xeaa127fa)
    c = hh(c, d, a, b, x[3], 16, 0xd4ef3085)
    b = hh(b, c, d, a, x[6], 23, 0x04881d05)
    a = hh(a, b, c, d, x[9], 4, 0xd9d4d039)
    d = hh(d, a, b, c, x[12], 11, 0xe6db99e5)
    c = hh(c, d, a, b, x[15], 16, 0x1fa27cf8)
    b = hh(b, c, d, a, x[2], 23, 0xc4ac5665)

    a = ii(a, b, c, d, x[0], 6, 0xf4292244)
    d = ii(d, a, b, c, x[7], 10, 0x432aff97)
    c = ii(c, d, a, b, x[14], 15, 0xab9423a7)
    b = ii(b, c, d, a, x[5], 21, 0xfc93a039)
    a = ii(a, b, c, d, x[12], 6, 0x655b59c3)
    d = ii(d, a, b, c, x[3], 10, 0x8f0ccc92)
    c = ii(c, d, a, b, x[10], 15, 0xffeff47d)
    b = ii(b, c, d, a, x[1], 21, 0x85845dd1)
    a = ii(a, b, c, d, x[8], 6, 0x6fa87e4f)
    d = ii(d, a, b, c, x[15], 10, 0xfe2ce6e0)
    c = ii(c, d, a, b, x[6], 15, 0xa3014314)
    b = ii(b, c, d, a, x[13], 21, 0x4e0811a1)
    a = ii(a, b, c, d, x[4], 6, 0xf7537e82)
    d = ii(d, a, b, c, x[11], 10, 0xbd3af235)
    c = ii(c, d, a, b, x[2], 15, 0x2ad7d2bb)
    b = ii(b, c, d, a, x[9], 21, 0xeb86d391)

    a = add(a, aa)
    b = add(b, bb)
    c = add(c, cc)
    d = add(d, dd)
  }

  const out = [a, b, c, d]
  let hex = ""
  for (const v of out) {
    for (let i = 0; i < 4; i++) {
      hex += toHex((v >>> (8 * i)) & 0xff)
    }
  }
  return hex
}

export const getGravatarUrl = (email: string, size = 80) => {
  const normalized = String(email || "").trim().toLowerCase()
  if (!normalized) return ""
  const hash = md5(normalized)
  return `https://www.gravatar.com/avatar/${hash}?s=${encodeURIComponent(String(size))}&d=identicon`
}

export const resolveUserAvatarUrl = (input: { email?: string | null; avatar_url?: string | null }, size = 80) => {
  const direct = typeof input.avatar_url === "string" ? input.avatar_url.trim() : ""
  if (direct) return direct
  const email = typeof input.email === "string" ? input.email : ""
  return getGravatarUrl(email, size)
}

