export const DEFAULT_TTL_MS = 5 * 60 * 1000

export interface CacheStorage {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown, ttlMs?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

export function cacheKey(parts: string[]): string {
  return parts.join(':')
}
