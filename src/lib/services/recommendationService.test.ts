import { describe, it, expect } from 'vitest'
import type { Post } from '../post'
import {
  recencyScore,
  engagementScore,
  authorAffinity,
  extractTopics,
  topicAffinity,
  scorePost,
  rankForYou,
  trendingTopics,
  type RankContext,
} from './recommendationService'

const NOW = Date.parse('2026-08-18T12:00:00Z')

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: '01ABCDEF0123456789ABCDEF01',
    author: 'alice',
    createdAt: '2026-08-18T10:00:00Z',
    content: 'working on blockchain consensus and consensus',
    path: 'posts/2026/08/18/01ABCDEF0123456789ABCDEF01.md',
    likes: 0,
    comments: 0,
    ...overrides,
  }
}

function makeCtx(overrides: Partial<RankContext> = {}): RankContext {
  return {
    followingLogins: new Set(['alice']),
    authorStars: {},
    userTopics: [],
    now: NOW,
    ...overrides,
  }
}

describe('recencyScore', () => {
  it('is 1 for a brand-new post', () => {
    expect(recencyScore(new Date(NOW).toISOString(), NOW)).toBeCloseTo(1, 5)
  })

  it('decays with age', () => {
    const fresh = recencyScore(new Date(NOW - 1 * 3_600_000).toISOString(), NOW)
    const old = recencyScore(new Date(NOW - 48 * 3_600_000).toISOString(), NOW)
    expect(fresh).toBeGreaterThan(old)
  })

  it('is 0.5 after 48 hours (half-life)', () => {
    const score = recencyScore(new Date(NOW - 48 * 3_600_000).toISOString(), NOW)
    expect(score).toBeCloseTo(Math.exp(-1), 5)
  })

  it('clamps future posts to age 0', () => {
    const score = recencyScore(new Date(NOW + 1000).toISOString(), NOW)
    expect(score).toBeCloseTo(1, 5)
  })
})

describe('engagementScore', () => {
  it('is 0 with no engagement', () => {
    expect(engagementScore({ likes: 0, comments: 0 })).toBe(0)
  })

  it('reaches 1 at 20 total interactions', () => {
    expect(engagementScore({ likes: 10, comments: 10 })).toBe(1)
  })

  it('caps above 20 interactions', () => {
    expect(engagementScore({ likes: 100, comments: 100 })).toBe(1)
  })
})

describe('authorAffinity', () => {
  it('gives 0.7 for followed authors', () => {
    expect(authorAffinity({ author: 'alice' }, makeCtx())).toBeCloseTo(0.7, 5)
  })

  it('gives 0 for strangers with no stars', () => {
    expect(authorAffinity({ author: 'bob' }, makeCtx())).toBe(0)
  })

  it('adds up to 0.3 from GitHub stars', () => {
    const ctx = makeCtx({ authorStars: { bob: 100 } })
    expect(authorAffinity({ author: 'bob' }, ctx)).toBeCloseTo(0.3, 5)
  })

  it('caps stars at 100', () => {
    const ctx = makeCtx({ authorStars: { bob: 10_000 } })
    expect(authorAffinity({ author: 'bob' }, ctx)).toBeCloseTo(0.3, 5)
  })
})

describe('extractTopics', () => {
  it('finds repeated words and ranks by frequency', () => {
    const topics = extractTopics('blockchain blockchain rust rust rust')
    expect(topics[0]).toBe('rust')
    expect(topics[1]).toBe('blockchain')
  })

  it('drops stopwords', () => {
    const topics = extractTopics('the quick brown fox the the the')
    expect(topics).not.toContain('the')
    expect(topics).toContain('quick')
  })

  it('respects the limit', () => {
    const topics = extractTopics('alpha beta gamma delta epsilon', 3)
    expect(topics).toHaveLength(3)
  })
})

describe('topicAffinity', () => {
  it('is 0 when the user has no topics', () => {
    expect(topicAffinity(makePost(), makeCtx({ userTopics: [] }))).toBe(0)
  })

  it('scores overlap with user topics', () => {
    const post = makePost({ content: 'blockchain consensus protocol' })
    const ctx = makeCtx({ userTopics: ['blockchain', 'consensus'] })
    expect(topicAffinity(post, ctx)).toBeCloseTo(2 / 3, 5)
  })

  it('caps at 1', () => {
    const post = makePost({ content: 'blockchain consensus protocol' })
    const ctx = makeCtx({ userTopics: ['blockchain', 'consensus', 'protocol'] })
    expect(topicAffinity(post, ctx)).toBe(1)
  })
})

describe('scorePost / rankForYou', () => {
  it('weights components 0.4/0.2/0.2/0.2', () => {
    const post = makePost({
      likes: 10,
      comments: 10,
      createdAt: new Date(NOW).toISOString(),
      content: 'blockchain consensus protocol',
    })
    const ctx = makeCtx({
      followingLogins: new Set(['alice']),
      authorStars: { alice: 100 },
      userTopics: ['blockchain', 'consensus', 'protocol'],
    })
    const expected = 1 * 0.4 + 1 * 0.2 + 1 * 0.2 + 1 * 0.2
    expect(scorePost(post, ctx)).toBeCloseTo(expected, 5)
  })

  it('ranks followed fresh posts above stranger posts', () => {
    const followed = makePost({ author: 'alice', createdAt: new Date(NOW).toISOString() })
    const stranger = makePost({
      author: 'bob',
      createdAt: new Date(NOW).toISOString(),
      likes: 5,
      comments: 5,
    })
    const ranked = rankForYou([stranger, followed], makeCtx())
    expect(ranked[0].author).toBe('alice')
  })

  it('ranks fresh posts above old posts from the same author', () => {
    const fresh = makePost({ createdAt: new Date(NOW - 3_600_000).toISOString() })
    const old = makePost({ createdAt: new Date(NOW - 24 * 3_600_000).toISOString() })
    const ranked = rankForYou([old, fresh], makeCtx())
    expect(ranked[0].id).toBe(fresh.id)
  })

  it('does not mutate the input', () => {
    const a = makePost({ id: 'A'.repeat(26) })
    const b = makePost({ id: 'B'.repeat(26), createdAt: new Date(NOW).toISOString() })
    const input = [a, b]
    rankForYou(input, makeCtx())
    expect(input.map((p) => p.id[0])).toEqual(['A', 'B'])
  })
})

describe('trendingTopics', () => {
  it('counts topics across posts', () => {
    const posts = [
      makePost({ content: 'blockchain scaling rust' }),
      makePost({ content: 'blockchain rust tooling' }),
      makePost({ content: 'wasm rust tooling' }),
    ]
    const trending = trendingTopics(posts)
    expect(trending[0]).toEqual({ topic: 'rust', count: 3 })
    const blockchain = trending.find((t) => t.topic === 'blockchain')
    expect(blockchain?.count).toBe(2)
  })

  it('does not double-count a topic within one post', () => {
    const posts = [makePost({ content: 'blockchain blockchain blockchain' })]
    const trending = trendingTopics(posts)
    expect(trending.find((t) => t.topic === 'blockchain')?.count).toBe(1)
  })
})
