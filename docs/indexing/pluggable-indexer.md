# GitNetwork Indexing Service

## Overview

The GitNetwork indexing service provides a pluggable architecture for recommendation scoring and discovery without modifying canonical user content stored in Git repositories.

## Architecture

```text
GitNetwork Client
        ↓
Indexer Interface
        ↓
┌───────┴───────┐
│               │
Default       Third-Party
Indexer       Indexers
└───────┬───────┘
        ↓
Index Data (in-memory or storage)
```

## Pluggable Indexer Interface

The `IndexerInterface` defines the contract for all indexers:

```typescript
export interface IndexerInterface {
  indexDocuments(documents: IndexDocument[]): Promise<void>
  query(query: IndexQuery): Promise<IndexResult>
  getRecommendations(postIds: string[], context: RecommendationContext): Promise<RecommendationScore[]>
  clear(): Promise<void>
}
```

## Document Types

Indexers work with the following document types:

- `profile`: User profile information
- `post`: Social network posts
- `user`: User metadata

## Creating a Custom Indexer

To create a custom indexer, implement the `IndexerInterface`:

```typescript
import type { IndexerInterface, IndexDocument, IndexQuery, IndexResult, RecommendationScore, RecommendationContext } from './types'

class MyCustomIndexer implements IndexerInterface {
  async indexDocuments(documents: IndexDocument[]): Promise<void> {
    // Implement indexing logic
  }

  async query(query: IndexQuery): Promise<IndexResult> {
    // Implement query logic
    return { documents: [], total: 0 }
  }

  async getRecommendations(postIds: string[], context: RecommendationContext): Promise<RecommendationScore[]> {
    // Implement recommendation scoring
    return []
  }

  async clear(): Promise<void> {
    // Clear indexer state
  }
}
```

## Using the Indexer Factory

Create indexers using the factory:

```typescript
import { createIndexer, type IndexerOptions } from './lib/indexing'

// Create default in-memory indexer
const indexer = createIndexer({ storage: 'memory' })

// Or create with custom options
const options: IndexerOptions = {
  storage: 'custom',
  customStorage: myCustomStorage,
}
const customIndexer = createIndexer(options)
```

## Indexing Documents

Extract documents from Git repositories and index them:

```typescript
const documents: IndexDocument[] = [
  {
    id: 'post-123',
    type: 'post',
    author: 'alice',
    createdAt: '2026-08-23T10:00:00Z',
    content: 'Hello world!',
    metadata: { likes: 5, comments: 2 },
  },
]

await indexer.indexDocuments(documents)
```

## Querying the Index

Search and filter indexed documents:

```typescript
const results = await indexer.query({
  type: 'post',
  author: 'alice',
  search: 'hello',
  limit: 10,
  offset: 0,
})

console.log(results.documents)
console.log('Total:', results.total)
```

## Recommendation Scoring

Generate recommendations based on context:

```typescript
const context: RecommendationContext = {
  followingLogins: new Set(['alice', 'bob']),
  authorStars: { alice: 150, bob: 50 },
  userTopics: ['typescript', 'github', 'social'],
  now: Date.now(),
}

const scores = await indexer.getRecommendations(['post-123', 'post-456'], context)

for (const score of scores) {
  console.log(`Post ${score.postId}: ${score.score}`)
  console.log('Factors:', score.factors)
}
```

## Indexer Properties

All indexers must:

- Be replaceable;
- Be non-authoritative;
- Be rebuildable from Git data;
- Not modify canonical user content;
- Be optional for basic repository access.

## Storage Options

Indexers can use different storage backends:

- `memory`: In-memory storage (default)
- `indexeddb`: Browser IndexedDB storage
- `custom`: Custom storage implementation

## Third-Party Indexers

Third-party developers can create their own indexers by:

1. Implementing the `IndexerInterface`
2. Publishing as an npm package or standalone module
3. Integrating with GitNetwork clients via the factory pattern

Example indexer concepts:

- Elasticsearch-based indexer
- Meilisearch indexer
- Vector database indexer for semantic search
- Custom ML-based recommendation indexer

## Security Considerations

- Indexers are non-authoritative;
- Canonical data always comes from Git repositories;
- Indexers cannot modify user content;
- Index data is separate from canonical data;
- Clients must verify index results against Git data for critical operations.
