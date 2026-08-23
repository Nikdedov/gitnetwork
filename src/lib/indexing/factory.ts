import type { IndexerInterface, IndexerFactory, IndexerOptions } from './types'
import { DefaultIndexer } from './defaultIndexer'

export class IndexerFactoryImpl implements IndexerFactory {
  create(options?: IndexerOptions): IndexerInterface {
    const storage = options?.storage || 'memory'

    if (storage === 'memory' || !options?.customStorage) {
      return new DefaultIndexer()
    }

    throw new Error('Custom storage indexer not implemented yet')
  }
}

export const defaultIndexerFactory = new IndexerFactoryImpl()

export function createIndexer(options?: IndexerOptions): IndexerInterface {
  return defaultIndexerFactory.create(options)
}
