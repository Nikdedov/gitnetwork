export interface IndexDocument {
  id: string
  type: 'profile' | 'post' | 'user'
  author: string
  createdAt: string
  content?: string
  metadata?: Record<string, unknown>
}

export interface IndexQuery {
  type?: 'profile' | 'post' | 'user'
  author?: string
  search?: string
  limit?: number
  offset?: number
}

export interface IndexResult {
  documents: IndexDocument[]
  total: number
}

export interface RecommendationScore {
  postId: string
  score: number
  factors: Record<string, number>
}

export interface IndexerInterface {
  indexDocuments(documents: IndexDocument[]): Promise<void>
  query(query: IndexQuery): Promise<IndexResult>
  getRecommendations(postIds: string[], context: RecommendationContext): Promise<RecommendationScore[]>
  clear(): Promise<void>
}

export interface RecommendationContext {
  followingLogins: Set<string>
  authorStars: Record<string, number>
  userTopics: string[]
  now: number
  userPreferences?: Record<string, unknown>
}

export interface IndexerFactory {
  create(options?: IndexerOptions): IndexerInterface
}

export interface IndexerOptions {
  storage?: 'memory' | 'indexeddb' | 'custom'
  customStorage?: unknown
}
