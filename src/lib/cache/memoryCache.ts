import type { CacheStorage } from './cacheStorage'
import { DEFAULT_TTL_MS } from './cacheStorage'

interface Entry {
  value: unknown
  expiresAt: number | null
}

export class MemoryCache implements CacheStorage {
  private entries = new Map<string, Entry>()

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value as T
  }

  async set(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
    })
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key)
  }

  async clear(): Promise<void> {
    this.entries.clear()
  }
}
