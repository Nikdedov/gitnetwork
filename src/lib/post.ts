import { parseFrontmatter, serializeFrontmatter } from './frontmatter'
import { isValidUlid } from './ulid'

export const POST_MAX_LENGTH = 5000
export const SOCIAL_REPO = 'social'
export const SOCIAL_TOPIC = 'gitnetwork'
export const POST_LABEL = 'post'

export interface Post {
  id: string
  author: string
  createdAt: string
  content: string
  path: string
  issueNumber?: number
  likes: number
  comments: number
}

export interface NewPost {
  author: string
  content: string
  createdAt?: string
  id?: string
}

const POST_PATH_RE = /^posts\/\d{4}\/\d{2}\/\d{2}\/[0-9A-HJKMNP-TV-Z]{26}\.md$/

export function isPostPath(path: string): boolean {
  return POST_PATH_RE.test(path)
}

export function postPathFor(id: string, date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `posts/${y}/${m}/${d}/${id}.md`
}

export function validatePostContent(content: string): string | null {
  const text = content.trim()
  if (!text) return 'Post cannot be empty'
  if (text.length > POST_MAX_LENGTH) {
    return `Post is too long (${text.length}/${POST_MAX_LENGTH} characters)`
  }
  return null
}

export function buildPostFile(post: {
  id: string
  author: string
  createdAt: string
  content: string
}): string {
  return serializeFrontmatter(
    {
      schemaVersion: '1',
      type: 'post',
      id: post.id,
      author: post.author,
      createdAt: post.createdAt,
    },
    post.content,
  )
}

export function parsePostFile(raw: string, path: string): Post {
  const { data, body } = parseFrontmatter(raw)
  const id = data['id']
  const author = data['author']
  const createdAt = data['createdAt']
  if (!id || !isValidUlid(id)) throw new Error(`Post file missing valid id: ${path}`)
  if (!author) throw new Error(`Post file missing author: ${path}`)
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    throw new Error(`Post file missing valid createdAt: ${path}`)
  }
  return {
    id,
    author,
    createdAt: new Date(createdAt).toISOString(),
    content: body.replace(/\n+$/, ''),
    path,
    likes: 0,
    comments: 0,
  }
}

export function sortPostsDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const ta = Date.parse(a.createdAt)
    const tb = Date.parse(b.createdAt)
    if (ta !== tb) return tb - ta
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
  })
}

export function markdownToText(markdown: string, maxLength = 140): string {
  const text = markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text
}
