import { describe, it, expect } from 'vitest'
import {
  isPostPath,
  postPathFor,
  buildPostFile,
  parsePostFile,
  sortPostsDesc,
  validatePostContent,
  markdownToText,
  POST_MAX_LENGTH,
  type Post,
} from './post'

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: '01ABCDEF0123456789ABCDEF01',
    author: 'alice',
    createdAt: '2026-08-18T08:32:00Z',
    content: 'hello',
    path: 'posts/2026/08/18/01ABCDEF0123456789ABCDEF01.md',
    likes: 0,
    comments: 0,
    ...overrides,
  }
}

describe('isPostPath', () => {
  it('accepts valid post paths', () => {
    expect(isPostPath('posts/2026/08/18/01ABCDEF0123456789ABCDEF01.md')).toBe(true)
  })

  it('rejects non-post paths', () => {
    expect(isPostPath('posts/2026/08/18/README.md')).toBe(false)
    expect(isPostPath('.social/profile.json')).toBe(false)
    expect(isPostPath('media/01ABCDEF0123456789ABCDEF01/cat.png')).toBe(false)
    expect(isPostPath('posts/2026/8/18/01ABCDEF0123456789ABCDEF01.md')).toBe(false)
    expect(isPostPath('posts/2026/08/18/not-a-ulid.md')).toBe(false)
    expect(isPostPath('posts/2026/08/18/01abcdef0123456789abcdef.md')).toBe(false) // lowercase
  })
})

describe('postPathFor', () => {
  it('uses UTC date components', () => {
    const date = new Date('2026-12-05T23:59:59Z')
    expect(postPathFor('01ABCDEF0123456789ABCDEF01', date)).toBe(
      'posts/2026/12/05/01ABCDEF0123456789ABCDEF01.md',
    )
  })

  it('zero-pads month and day', () => {
    const date = new Date('2026-01-02T00:00:00Z')
    expect(postPathFor('01ABCDEF0123456789ABCDEF01', date)).toBe(
      'posts/2026/01/02/01ABCDEF0123456789ABCDEF01.md',
    )
  })
})

describe('buildPostFile / parsePostFile', () => {
  it('round-trips a post', () => {
    const source = {
      id: '01ABCDEF0123456789ABCDEF01',
      author: 'alice',
      createdAt: '2026-08-18T08:32:00Z',
      content: 'Hello **world**\n\nSecond line.',
    }
    const raw = buildPostFile(source)
    expect(raw.startsWith('---\n')).toBe(true)
    const parsed = parsePostFile(raw, 'posts/2026/08/18/01ABCDEF0123456789ABCDEF01.md')
    expect(parsed.id).toBe(source.id)
    expect(parsed.author).toBe(source.author)
    expect(parsed.createdAt).toBe('2026-08-18T08:32:00.000Z')
    expect(parsed.content).toBe(source.content)
  })

  it('normalizes createdAt to ISO format', () => {
    const raw = buildPostFile({
      id: '01ABCDEF0123456789ABCDEF01',
      author: 'alice',
      createdAt: '2026-08-18T08:32:00+02:00',
      content: 'x',
    })
    const parsed = parsePostFile(raw, 'p.md')
    expect(parsed.createdAt).toBe('2026-08-18T06:32:00.000Z')
  })

  it('throws on missing id', () => {
    expect(() => parsePostFile('---\nauthor: alice\n---\nbody', 'p.md')).toThrow(/id/)
  })

  it('throws on invalid ulid', () => {
    expect(() =>
      parsePostFile('---\nid: not-ulid\nauthor: alice\ncreatedAt: 2026-01-01T00:00:00Z\n---\nbody', 'p.md'),
    ).toThrow(/id/)
  })

  it('throws on missing author', () => {
    expect(() =>
      parsePostFile('---\nid: 01ABCDEF0123456789ABCDEF01\ncreatedAt: 2026-01-01T00:00:00Z\n---\nbody', 'p.md'),
    ).toThrow(/author/)
  })

  it('throws on invalid createdAt', () => {
    expect(() =>
      parsePostFile('---\nid: 01ABCDEF0123456789ABCDEF01\nauthor: a\ncreatedAt: nope\n---\nbody', 'p.md'),
    ).toThrow(/createdAt/)
  })
})

describe('validatePostContent', () => {
  it('rejects empty content', () => {
    expect(validatePostContent('   \n  ')).toBe('Post cannot be empty')
  })

  it('rejects content over the limit', () => {
    const error = validatePostContent('a'.repeat(POST_MAX_LENGTH + 1))
    expect(error).toContain('too long')
  })

  it('accepts content at the limit', () => {
    expect(validatePostContent('a'.repeat(POST_MAX_LENGTH))).toBeNull()
  })
})

describe('sortPostsDesc', () => {
  it('sorts by createdAt descending', () => {
    const posts = [
      makePost({ id: 'A'.repeat(26), createdAt: '2026-01-01T00:00:00Z' }),
      makePost({ id: 'B'.repeat(26), createdAt: '2026-03-01T00:00:00Z' }),
      makePost({ id: 'C'.repeat(26), createdAt: '2026-02-01T00:00:00Z' }),
    ]
    const sorted = sortPostsDesc(posts)
    expect(sorted.map((p) => p.id[0])).toEqual(['B', 'C', 'A'])
  })

  it('breaks ties by id descending (newer ULID first)', () => {
    const posts = [
      makePost({ id: '01AAAAAAAAAAAAAAAAAAAAAAAA', createdAt: '2026-01-01T00:00:00Z' }),
      makePost({ id: '02AAAAAAAAAAAAAAAAAAAAAAAA', createdAt: '2026-01-01T00:00:00Z' }),
    ]
    const sorted = sortPostsDesc(posts)
    expect(sorted.map((p) => p.id[1])).toEqual(['2', '1'])
  })

  it('does not mutate the input', () => {
    const posts = [makePost({ id: 'A'.repeat(26) }), makePost({ id: 'B'.repeat(26), createdAt: '2027-01-01T00:00:00Z' })]
    const copy = [...posts]
    sortPostsDesc(posts)
    expect(posts).toEqual(copy)
  })
})

describe('markdownToText', () => {
  it('strips links and keeps their text', () => {
    expect(markdownToText('see [docs](https://x.y) now')).toBe('see docs now')
  })

  it('keeps alt text of images', () => {
    expect(markdownToText('![a cat](img.png) and more')).toBe('a cat and more')
  })

  it('removes code blocks', () => {
    expect(markdownToText('before\n```ts\nconst x = 1\n```\nafter')).toBe('before after')
  })

  it('truncates long text with ellipsis', () => {
    const text = markdownToText('word '.repeat(100), 50)
    expect(text.length).toBeLessThanOrEqual(50)
    expect(text.endsWith('…')).toBe(true)
  })

  it('collapses whitespace', () => {
    expect(markdownToText('a\n\n\nb   c')).toBe('a b c')
  })
})
