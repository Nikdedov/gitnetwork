import type { IndexerInterface, IndexDocument, IndexQuery, IndexResult, RecommendationScore, RecommendationContext } from './types'

export class DefaultIndexer implements IndexerInterface {
  private documents: Map<string, IndexDocument> = new Map()
  private byType: Map<string, Set<string>> = new Map()
  private byAuthor: Map<string, Set<string>> = new Map()
  private contentIndex: Map<string, Set<string>> = new Map()

  async indexDocuments(documents: IndexDocument[]): Promise<void> {
    for (const doc of documents) {
      this.documents.set(doc.id, doc)

      if (!this.byType.has(doc.type)) {
        this.byType.set(doc.type, new Set())
      }
      this.byType.get(doc.type)!.add(doc.id)

      if (!this.byAuthor.has(doc.author)) {
        this.byAuthor.set(doc.author, new Set())
      }
      this.byAuthor.get(doc.author)!.add(doc.id)

      if (doc.content) {
        const normalizedContent = doc.content.toLowerCase().replace(/[^a-z0-9#+\-. ]/g, ' ')
        const words = normalizedContent.split(/\s+/).filter((w) => w.length > 2)
        for (const word of words) {
          if (!this.contentIndex.has(word)) {
            this.contentIndex.set(word, new Set())
          }
          this.contentIndex.get(word)!.add(doc.id)
        }
      }
    }
  }

  async query(query: IndexQuery): Promise<IndexResult> {
    let documentIds = new Set<string>()

    if (query.type) {
      const typeDocs = this.byType.get(query.type)
      if (typeDocs) {
        documentIds = new Set(typeDocs)
      } else {
        return { documents: [], total: 0 }
      }
    }

    if (query.author) {
      const authorDocs = this.byAuthor.get(query.author)
      if (authorDocs) {
        if (documentIds.size === 0) {
          documentIds = new Set(authorDocs)
        } else {
          documentIds = new Set([...documentIds].filter((id) => authorDocs.has(id)))
        }
      } else {
        return { documents: [], total: 0 }
      }
    }

    if (query.search) {
      const searchWords = query.search.toLowerCase().replace(/[^a-z0-9#+\-. ]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
      let searchDocs = new Set<string>()

      for (const word of searchWords) {
        const docs = this.contentIndex.get(word)
        if (docs) {
          if (searchDocs.size === 0) {
            searchDocs = new Set(docs)
          } else {
            searchDocs = new Set([...searchDocs].filter((id) => docs.has(id)))
          }
        }
      }

      if (searchDocs.size > 0) {
        if (documentIds.size === 0) {
          documentIds = searchDocs
        } else {
          documentIds = new Set([...documentIds].filter((id) => searchDocs.has(id)))
        }
      }
    }

    const documents: IndexDocument[] = []
    for (const id of documentIds) {
      const doc = this.documents.get(id)
      if (doc) {
        documents.push(doc)
      }
    }

    documents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const offset = query.offset || 0
    const limit = query.limit || 100
    const paginated = documents.slice(offset, offset + limit)

    return {
      documents: paginated,
      total: documents.length,
    }
  }

  async getRecommendations(postIds: string[], context: RecommendationContext): Promise<RecommendationScore[]> {
    const scores: RecommendationScore[] = []

    for (const postId of postIds) {
      const doc = this.documents.get(postId)
      if (!doc || doc.type !== 'post') continue

      const scoreResult = this.calculateScore(doc, context)
      if (scoreResult.score > 0) {
        scores.push({
          postId: scoreResult.postId,
          score: scoreResult.score,
          factors: scoreResult.factors,
        })
      }
    }

    return scores.sort((a, b) => b.score - a.score)
  }

  private calculateScore(doc: IndexDocument, context: RecommendationContext): RecommendationScore {
    const factors: Record<string, number> = {}

    const ageHours = Math.max(0, (context.now - new Date(doc.createdAt).getTime()) / 3600000)
    const recencyScore = Math.exp(-ageHours / 48)
    factors.recency = recencyScore

    const metadata = doc.metadata as Record<string, unknown> | undefined
    const likes = (metadata?.likes as number) || 0
    const comments = (metadata?.comments as number) || 0
    const engagementScore = Math.min(1, (likes + comments) / 20)
    factors.engagement = engagementScore

    const followed = context.followingLogins.has(doc.author) ? 0.7 : 0
    const stars = Math.min(1, (context.authorStars[doc.author] || 0) / 100) * 0.3
    const authorAffinity = followed + stars
    factors.authorAffinity = authorAffinity

    let topicAffinity = 0
    if (context.userTopics.length > 0 && doc.content) {
      const postTopics = this.extractTopics(doc.content, 10)
      const overlap = context.userTopics.filter((t) => postTopics.has(t)).length
      topicAffinity = Math.min(1, overlap / 3)
    }
    factors.topicAffinity = topicAffinity

    const totalScore =
      recencyScore * 0.4 +
      engagementScore * 0.2 +
      authorAffinity * 0.2 +
      topicAffinity * 0.2

    return {
      postId: doc.id,
      score: totalScore,
      factors,
    }
  }

  private extractTopics(text: string, limit: number): Set<string> {
    const stopwords = new Set([
      'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'was',
      'were', 'are', 'been', 'being', 'will', 'would', 'could', 'should', 'may',
      'might', 'can', 'just', 'like', 'about', 'into', 'over', 'under', 'than',
      'then', 'them', 'they', 'their', 'there', 'here', 'when', 'where', 'which',
      'while', 'your', 'you', 'our', 'out', 'not', 'but', 'all', 'any', 'new',
      'now', 'more', 'most', 'some', 'such', 'only', 'other', 'because', 'what',
      'who', 'how', 'why', 'its', 'it', 'of', 'to', 'in', 'on', 'a', 'an', 'is',
      'i', 'me', 'my', 'we', 'us', 'he', 'she', 'his', 'her', 'at', 'by', 'as',
      'so', 'if', 'or', 'no', 'yes', 'did', 'does', 'doing', 'done', 'get', 'got',
      'one', 'two', 'three', 'also', 'really', 'very', 'much', 'many', 'make',
      'made', 'know', 'think', 'said', 'say', 'says',
    ])

    const counts = new Map<string, number>()
    const words = text.toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) || []

    for (const word of words) {
      if (stopwords.has(word)) continue
      counts.set(word, (counts.get(word) || 0) + 1)
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const topics = new Set<string>()

    for (let i = 0; i < Math.min(sorted.length, limit); i++) {
      topics.add(sorted[i][0])
    }

    return topics
  }

  async clear(): Promise<void> {
    this.documents.clear()
    this.byType.clear()
    this.byAuthor.clear()
    this.contentIndex.clear()
  }
}
