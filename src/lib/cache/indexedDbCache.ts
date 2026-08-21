import type { CacheStorage } from './cacheStorage'
import { DEFAULT_TTL_MS } from './cacheStorage'

interface StoredRecord {
  key: string
  value: unknown
  expiresAt: number | null
}

export class IndexedDbCache implements CacheStorage {
  private dbPromise: Promise<IDBDatabase> | null = null
  private readonly dbName: string
  private readonly storeName: string

  constructor(dbName: string = 'gitnnetwork-cache', storeName: string = 'kv') {
    this.dbName = dbName
    this.storeName = storeName
  }

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'key' })
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('Failed to open cache database'))
      })
    }
    return this.dbPromise
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      const store = tx.objectStore(this.storeName)
      const req = store.get(key)
      req.onsuccess = () => {
        const record = req.result as StoredRecord | undefined
        if (!record) return resolve(undefined)
        if (record.expiresAt !== null && record.expiresAt <= Date.now()) {
          store.delete(key)
          return resolve(undefined)
        }
        resolve(record.value as T)
      }
      req.onerror = () => reject(req.error)
    })
  }

  async set(key: string, value: unknown, ttlMs: number = DEFAULT_TTL_MS): Promise<void> {
    const db = await this.open()
    const record: StoredRecord = {
      key,
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      tx.objectStore(this.storeName).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async delete(key: string): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      tx.objectStore(this.storeName).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clear(): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite')
      tx.objectStore(this.storeName).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}
