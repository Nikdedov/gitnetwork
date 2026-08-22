import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import type { Post } from '../lib/post'
import type { IssueComment } from '../lib/api/github/types'
import { useApp } from '../app/AppContext'
import { Layout, PageHeader } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { renderMarkdown } from '../lib/markdown'
import { timeAgo, formatCount } from '../lib/format'

export function PostPage() {
  const { username, postId } = useParams<{ username: string; postId: string }>()
  const uname = username ? decodeURIComponent(username) : ''
  const { app, user } = useApp()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!uname || !postId) return
    try {
      const p = await app.social.getPost(uname, postId)
      setPost(p)
      if (p) setComments(await app.social.getComments(p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post')
    }
  }, [app, uname, postId])

  useEffect(() => {
    setPost(null)
    void load()
  }, [load])

  const toggleLike = async () => {
    if (!user || !post) return
    setBusy(true)
    try {
      const result = await app.social.toggleLike(post)
      setPost({ ...post, likes: result.likes })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update like')
    } finally {
      setBusy(false)
    }
  }

  const addComment = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !post || busy) return
    setBusy(true)
    setError(null)
    try {
      await app.social.addComment(post, draft)
      setDraft('')
      setComments(await app.social.getComments(post))
      setPost({ ...post, comments: post.comments + 1 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout>
      <PageHeader title={`@${uname} / post`} />
      {error && <div className="px-6 py-4 text-sm text-danger">{error}</div>}
      {!post && !error && (
        <div className="px-6 py-10 text-center text-sm text-ink-faint">Loading post…</div>
      )}
      {post && (
        <>
          <article className="flex gap-3 border-b border-line px-4 py-4 sm:px-6">
            <Link to={`/${encodeURIComponent(post.author)}`}>
              <Avatar
                src={`https://avatars.githubusercontent.com/${post.author}`}
                name={post.author}
                size={48}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <Link
                  to={`/${encodeURIComponent(post.author)}`}
                  className="font-semibold hover:underline"
                >
                  {post.author}
                </Link>
                <span className="text-ink-faint">
                  @{post.author} · {timeAgo(post.createdAt)}
                </span>
              </div>
              <div
                className="post-content mt-2 text-[15px] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
              />
              <div className="mt-3 flex gap-6 text-sm text-ink-faint">
                <button
                  type="button"
                  onClick={toggleLike}
                  disabled={!user || busy}
                  className="flex items-center gap-1.5 hover:text-like"
                >
                  <span aria-hidden>🤍</span> {formatCount(post.likes)} likes
                </button>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>💬</span> {formatCount(post.comments)} comments
                </span>
              </div>
            </div>
          </article>

          <section className="px-4 py-4 sm:px-6">
            <h2 className="mb-3 text-sm font-bold">Comments</h2>
            {comments.length === 0 && (
              <p className="text-sm text-ink-faint">No comments yet.</p>
            )}
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <Avatar src={c.user.avatar_url} name={c.user.login} size={32} />
                  <div className="min-w-0 flex-1 rounded-xl bg-paper px-3 py-2">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="font-semibold">{c.user.login}</span>
                      <span className="text-xs text-ink-faint">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {user ? (
              <form onSubmit={addComment} className="mt-4 flex gap-2">
                <Avatar src={user.avatar_url} name={user.login} size={32} />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a comment…"
                  maxLength={3000}
                  className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
                >
                  Reply
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">
                <Link to="/login" className="text-accent-deep hover:underline">
                  Sign in
                </Link>{' '}
                to join the conversation.
              </p>
            )}
          </section>
        </>
      )}
    </Layout>
  )
}
