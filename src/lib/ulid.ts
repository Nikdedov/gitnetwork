const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CROCKFORD_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

function randomInt32(): number {
  const buf = new Uint8Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % 32
}

export function generateUlid(now: number = Date.now()): string {
  let out = ''
  for (let i = 9; i >= 0; i--) {
    out += ENCODING[Math.floor(now / 32 ** i) % 32]
  }
  for (let i = 0; i < 16; i++) {
    out += ENCODING[randomInt32()]
  }
  return out
}

export function isValidUlid(value: string): boolean {
  return CROCKFORD_RE.test(value)
}

export function ulidTimestamp(ulid: string): number {
  let ts = 0
  for (let i = 0; i < 10; i++) {
    ts = ts * 32 + ENCODING.indexOf(ulid[i])
  }
  return ts
}
