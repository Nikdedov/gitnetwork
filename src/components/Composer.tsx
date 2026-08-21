import { useState, type FormEvent } from 'react'
import { useApp } from '../app/AppContext'
import { POST_MAX_LENGTH } from '../lib/post'
import { Avatar } from './Avatar'

export function Composer({ onPosted }: { onPosted?: () => void }) {
  const { app, user } = useApp()
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="border-b border-line px-4 py-6 text-center text-sm text-ink-soft sm:px-6">
        Sign in with GitHub to share what you are working on.
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await app.social.createPost(content)
      setContent('')
      onPosted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post')
    } finally {
      setBusy(false)
    }
  }

  const tooLong = content.length > POST_MAX_LENGTH

  return (
    <form onSubmit={submit} className="flex gap-3 border-b border-line px-4 py-4 sm:px-6">
      <Avatar src={user.avatar_url} name={user.login} />
      <div className="min-w-0 flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What are you working on?"
          rows={3}
          className="w-full resize-y rounded-xl border border-line bg-card p-3 text-[15px] outline-none focus:border-accent"
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs ${tooLong ? 'text-danger' : 'text-ink-faint'}`}>
            {content.length}/{POST_MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={busy || !content.trim() || tooLong}
            className="rounded-full bg-accent px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </form>
  )
}
