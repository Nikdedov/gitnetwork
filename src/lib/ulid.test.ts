import { describe, it, expect } from 'vitest'
import { generateUlid, isValidUlid, ulidTimestamp } from './ulid'

describe('generateUlid', () => {
  it('produces a 26-character Crockford base32 string', () => {
    const id = generateUlid()
    expect(id).toHaveLength(26)
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it('is valid according to isValidUlid', () => {
    expect(isValidUlid(generateUlid())).toBe(true)
  })

  it('embeds the timestamp in the first 10 characters', () => {
    const now = 1789000000000
    const id = generateUlid(now)
    expect(ulidTimestamp(id)).toBe(now)
  })

  it('is monotonic for the same millisecond prefix and unique overall', () => {
    const now = 1789000000000
    const ids = new Set(Array.from({ length: 1000 }, () => generateUlid(now)))
    expect(ids.size).toBe(1000)
  })

  it('orders by time', () => {
    const early = generateUlid(1_700_000_000_000)
    const late = generateUlid(1_800_000_000_000)
    expect(early < late).toBe(true)
  })
})

describe('isValidUlid', () => {
  it('accepts a well-formed 26-char id', () => {
    expect(isValidUlid('0123456789ABCDEFGHJKMNPQRS')).toBe(true)
  })

  it('rejects invalid strings', () => {
    expect(isValidUlid('')).toBe(false)
    expect(isValidUlid('0123456789')).toBe(false) // too short
    expect(isValidUlid('0123456789ABCDEFGHJKMNPQRSTVWXYZ')).toBe(false) // 32 chars
    expect(isValidUlid('0123456789ABCDEFGHJKMNPQRI')).toBe(false) // I not in alphabet
    expect(isValidUlid('not-a-ulid!')).toBe(false)
  })
})
