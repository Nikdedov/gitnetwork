import { describe, it, expect, vi, afterEach } from 'vitest'
import { MemoryCache } from './memoryCache'
import { IndexedDbCache } from './indexedDbCache'
import { cacheKey, DEFAULT_TTL_MS } from './cacheStorage'

afterEach(() => {
  vi.useRealTimers()
})

describe('cacheKey', () => {
  it('joins parts with a colon', () => {
    expect(cacheKey(['user', 'alice', 'posts'])).toBe('user:alice:posts')
  })
})

describe('MemoryCache', () => {
  it('stores and retrieves values', async () => {
    const cache = new MemoryCache()
    await cache.set('a', { x: 1 })
    expect(await cache.get('a')).toEqual({ x: 1 })
  })

  it('returns undefined for missing keys', async () => {
    const cache = new MemoryCache()
    expect(await cache.get('nope')).toBeUndefined()
  })

  it('expires entries after TTL', async () => {
    vi.useFakeTimers()
    const cache = new MemoryCache()
    await cache.set('a', 'v', 1000)
    expect(await cache.get('a')).toBe('v')
    vi.advanceTimersByTime(1001)
    expect(await cache.get('a')).toBeUndefined()
  })

  it('keeps entries without TTL', async () => {
    vi.useFakeTimers()
    const cache = new MemoryCache()
    await cache.set('a', 'v', 0)
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(await cache.get('a')).toBe('v')
  })

  it('deletes entries', async () => {
    const cache = new MemoryCache()
    await cache.set('a', 'v')
    await cache.delete('a')
    expect(await cache.get('a')).toBeUndefined()
  })

  it('clears everything', async () => {
    const cache = new MemoryCache()
    await cache.set('a', 1)
    await cache.set('b', 2)
    await cache.clear()
    expect(await cache.get('a')).toBeUndefined()
    expect(await cache.get('b')).toBeUndefined()
  })

  it('uses the default TTL of 5 minutes', async () => {
    vi.useFakeTimers()
    const cache = new MemoryCache()
    await cache.set('a', 'v')
    vi.advanceTimersByTime(DEFAULT_TTL_MS - 1)
    expect(await cache.get('a')).toBe('v')
    vi.advanceTimersByTime(2)
    expect(await cache.get('a')).toBeUndefined()
  })
})

// IndexedDbCache uses real timers: fake-indexeddb schedules request
// completion through setTimeout, which fake timers would swallow.
describe('IndexedDbCache', () => {
  let n = 0
  const factory = () => new IndexedDbCache(`test-${++n}`, 'kv')

  it('stores and retrieves values', async () => {
    const cache = factory()
    await cache.set('a', { x: 1, nested: [1, 2, 3] })
    expect(await cache.get('a')).toEqual({ x: 1, nested: [1, 2, 3] })
  })

  it('returns undefined for missing keys', async () => {
    const cache = factory()
    expect(await cache.get('nope')).toBeUndefined()
  })

  it('expires entries after TTL', async () => {
    const cache = factory()
    await cache.set('a', 'v', 60)
    expect(await cache.get('a')).toBe('v')
    await new Promise((r) => setTimeout(r, 120))
    expect(await cache.get('a')).toBeUndefined()
  })

  it('keeps entries without TTL', async () => {
    const cache = factory()
    await cache.set('a', 'v', 0)
    await new Promise((r) => setTimeout(r, 80))
    expect(await cache.get('a')).toBe('v')
  })

  it('deletes entries', async () => {
    const cache = factory()
    await cache.set('a', 'v')
    await cache.delete('a')
    expect(await cache.get('a')).toBeUndefined()
  })

  it('clears everything', async () => {
    const cache = factory()
    await cache.set('a', 1)
    await cache.set('b', 2)
    await cache.clear()
    expect(await cache.get('a')).toBeUndefined()
    expect(await cache.get('b')).toBeUndefined()
  })

  it('persists across instances with the same db name', async () => {
    const name = `persist-${++n}`
    const a = new IndexedDbCache(name)
    await a.set('k', 'v')
    const b = new IndexedDbCache(name)
    expect(await b.get('k')).toBe('v')
  })
})
