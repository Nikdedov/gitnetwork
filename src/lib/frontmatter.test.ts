import { describe, it, expect } from 'vitest'
import { parseFrontmatter, serializeFrontmatter, FrontmatterError } from './frontmatter'

describe('parseFrontmatter', () => {
  it('parses a simple block', () => {
    const raw = `---\nid: 01ABC\nauthor: alice\ncreatedAt: 2026-08-18T08:32:00Z\n---\n\nHello world\n`
    const { data, body } = parseFrontmatter(raw)
    expect(data).toEqual({
      id: '01ABC',
      author: 'alice',
      createdAt: '2026-08-18T08:32:00Z',
    })
    expect(body).toBe('Hello world\n')
  })

  it('strips quotes from values', () => {
    const { data } = parseFrontmatter(`---\nschemaVersion: '1'\ntype: "post"\n---\nbody`)
    expect(data.schemaVersion).toBe('1')
    expect(data.type).toBe('post')
  })

  it('returns empty data when no frontmatter present', () => {
    const { data, body } = parseFrontmatter('just a plain file')
    expect(data).toEqual({})
    expect(body).toBe('just a plain file')
  })

  it('normalizes CRLF line endings', () => {
    const { data, body } = parseFrontmatter('---\r\na: 1\r\n---\r\nbody\r\n')
    expect(data.a).toBe('1')
    expect(body).toBe('body\n')
  })

  it('skips comments and blank lines', () => {
    const { data } = parseFrontmatter('---\n# comment\n\na: 1\n---\n')
    expect(data).toEqual({ a: '1' })
  })

  it('throws on unterminated block', () => {
    expect(() => parseFrontmatter('---\na: 1\nno closing')).toThrow(FrontmatterError)
  })

  it('throws on line without colon', () => {
    expect(() => parseFrontmatter('---\njust text\n---\n')).toThrow(FrontmatterError)
  })
})

describe('serializeFrontmatter', () => {
  it('round-trips through parseFrontmatter', () => {
    const raw = serializeFrontmatter({ id: 'X', author: 'bob' }, 'content here')
    expect(raw).toBe(`---\nid: X\nauthor: bob\n---\ncontent here`)
    const { data, body } = parseFrontmatter(raw)
    expect(data).toEqual({ id: 'X', author: 'bob' })
    expect(body).toBe('content here')
  })
})
