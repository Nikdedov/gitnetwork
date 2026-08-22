import { useState } from 'react'
import { Link } from 'react-router'
import type { Post } from '../lib/post'
import { renderMarkdown } from '../lib/markdown'
import { timeAgo, formatCount } from '../lib/format'
import { useApp } from '../app/AppContext'
import { Avatar } from './Avatar'

export function PostCard({ post, authorName }: { post: Post; authorName?: string }) {
  const { app, user } = useApp()
  const [likes, setLikes] = useState(post.likes)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)

  const toggleLike = async () => {
    if (!user) return
    if (busy) return
    setBusy(true)
    try {
      const result = await app.social.toggleLike({ ...post, likes })
      setLiked(result.liked)
      setLikes(result.likes)
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="flex gap-3 border-b border-line px-4 py-4 sm:px-6">
      <Link to={`/${encodeURIComponent(post.author)}`}>
        <Avatar src={`https://avatars.githubusercontent.com/${post.author}`} name={post.author} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link
            to={`/${encodeURIComponent(post.author)}`}
            className="font-semibold hover:underline"
          >
            {authorName ?? post.author}
          </Link>
          <span className="text-ink-faint">@{post.author}</span>
          <span className="text-ink-faint">· {timeAgo(post.createdAt)}</span>
        </div>
        <div
          className="post-content mt-1 text-[15px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />
        <div className="mt-2 flex gap-6 text-sm text-ink-faint">
          <button
            type="button"
            onClick={toggleLike}
            disabled={!user}
            className={`flex items-center gap-1.5 hover:text-like ${liked ? 'text-like' : ''}`}
            title={user ? 'Like' : 'Sign in to like'}
          >
            <span aria-hidden>{liked ? '❤️' : '🤍'}</span>
            {formatCount(likes)}
          </button>
          <Link
            to={`/${encodeURIComponent(post.author)}/post/${post.id}`}
            className="flex items-center gap-1.5 hover:text-accent-deep"
          >
            <span aria-hidden>💬</span>
            {formatCount(post.comments)}
          </Link>
        </div>
      </div>
    </article>
  )
}
