import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

const PURIFY_CONFIG = {
  FORBID_TAGS: ['style', 'form', 'iframe', 'object', 'embed', 'base'],
  FORBID_ATTR: ['style'],
}

export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false }) as string
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}
