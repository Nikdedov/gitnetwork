# GitNetwork Indexing Architecture

## Overview

The GitNetwork indexing service provides discovery and recommendation capabilities without changing the fundamental Git-native architecture where Git repositories remain the source of truth.

## Trust Model

```text
Git Repository (Source of Truth)
        ↓
Canonical Data (posts, profiles, etc.)
        ↓
Indexer (Non-authoritative)
        ↓
Discovery / Recommendations / Search
```

The indexer is **non-authoritative**. Canonical data always comes from Git repositories. The indexer is an optimization and discovery layer only.

## Indexer Types

### Default Indexer

The `DefaultIndexer` provides:

- In-memory document storage;
- Type-based filtering;
- Author-based filtering;
- Full-text search;
- Recommendation scoring.

### Third-Party Indexers

Third-party indexers can implement:

- Distributed search (Elasticsearch, Meilisearch);
- Vector search for semantic similarity;
- ML-based recommendation models;
- Custom analytics.

## Index Data Flow

1. Client or external service extracts documents from Git repositories;
2. Documents are indexed using `indexDocuments()`;
3. Queries are executed using `query()`;
4. Recommendations are generated using `getRecommendations()`.

## Rebuildability

Indexers must be rebuildable from Git data:

- Index state is ephemeral or reconstructible;
- No canonical data is stored in the indexer;
- If indexer data is lost, it can be rebuilt by re-indexing Git repositories.

## Failure Behavior

If the indexer is unavailable:

- Clients fall back to direct Git repository access;
- Basic functionality remains operational;
- Recommendations may use client-side default ranking.

## Pluggability

The indexer interface is designed to be pluggable:

```typescript
export interface IndexerInterface {
  indexDocuments(documents: IndexDocument[]): Promise<void>
  query(query: IndexQuery): Promise<IndexResult>
  getRecommendations(postIds: string[], context: RecommendationContext): Promise<RecommendationScore[]>
  clear(): Promise<void>
}
```

Any implementation of this interface can be used as the indexing service.

## Use Cases

- User discovery;
- Profile search;
- Post search;
- Feed acceleration;
- Trending topics;
- Recommendation scoring.

## Limitations

- Indexers do not store canonical data;
- Indexers cannot modify user content;
- Indexers are optional components;
- Clients must work without indexers.
