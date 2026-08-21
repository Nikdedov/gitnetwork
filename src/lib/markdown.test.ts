import { describe, it, expect } from 'vitest'
import { renderMarkdown, sanitizeHtml } from './markdown'

describe('renderMarkdown', () => {
  it('renders basic markdown to HTML', () => {
    const html = renderMarkdown('Hello **world**')
    expect(html).toContain('<strong>world</strong>')
  })

  it('renders links', () => {
    const html = renderMarkdown('[docs](https://example.com)')
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('docs</a>')
  })

  it('renders images', () => {
    const html = renderMarkdown('![alt](https://example.com/a.png)')
    expect(html).toContain('<img')
    expect(html).toContain('alt="alt"')
  })

  it('strips script tags', () => {
    const html = renderMarkdown('hi <script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
  })

  it('strips onerror handlers from images', () => {
    const html = renderMarkdown('<img src="https://example.com/a.png" onerror="alert(1)" />')
    expect(html).not.toContain('onerror')
  })

  it('strips javascript: URLs', () => {
    const html = renderMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('strips inline style attributes', () => {
    const html = sanitizeHtml('<span style="color:red">x</span>')
    expect(html).not.toContain('style=')
  })

  it('forbids iframe tags', () => {
    const html = renderMarkdown('<iframe src="https://evil.com"></iframe>')
    expect(html).not.toContain('<iframe')
  })
})
