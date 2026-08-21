import type { Post } from '../post'

export interface RankContext {
  followingLogins: Set<string>
  authorStars: Record<string, number>
  userTopics: string[]
  now: number
}

export interface TopicCount {
  topic: string
  count: number
}

const STOPWORDS = new Set([
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

export function recencyScore(createdAt: string, now: number): number {
  const ageHours = Math.max(0, (now - Date.parse(createdAt)) / 3_600_000)
  return Math.exp(-ageHours / 48)
}

export function engagementScore(post: { likes: number; comments: number }): number {
  return Math.min(1, (post.likes + post.comments) / 20)
}

export function authorAffinity(post: { author: string }, ctx: RankContext): number {
  const followed = ctx.followingLogins.has(post.author) ? 0.7 : 0
  const stars = Math.min(1, (ctx.authorStars[post.author] ?? 0) / 100) * 0.3
  return followed + stars
}

export function extractTopics(text: string, limit = 20): string[] {
  const counts = new Map<string, number>()
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) ?? []
  for (const word of words) {
    if (STOPWORDS.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([topic]) => topic)
}

export function topicAffinity(post: Post, ctx: RankContext): number {
  if (ctx.userTopics.length === 0) return 0
  const postTopics = new Set(extractTopics(post.content, 10))
  const overlap = ctx.userTopics.filter((t) => postTopics.has(t)).length
  return Math.min(1, overlap / 3)
}

export function scorePost(post: Post, ctx: RankContext): number {
  return (
    recencyScore(post.createdAt, ctx.now) * 0.4 +
    engagementScore(post) * 0.2 +
    authorAffinity(post, ctx) * 0.2 +
    topicAffinity(post, ctx) * 0.2
  )
}

export function rankForYou(posts: Post[], ctx: RankContext): Post[] {
  return [...posts].sort((a, b) => scorePost(b, ctx) - scorePost(a, ctx))
}

export function trendingTopics(posts: Post[], limit = 10): TopicCount[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    const seen = new Set<string>()
    for (const topic of extractTopics(post.content, 10)) {
      if (seen.has(topic)) continue
      seen.add(topic)
      counts.set(topic, (counts.get(topic) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([topic, count]) => ({ topic, count }))
}
