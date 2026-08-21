import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useApp } from '../app/AppContext'

export function Login() {
  const { app } = useApp()
  const navigate = useNavigate()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const me = await app.auth.login(token)
      try {
        await app.social.ensureOnboarded()
      } catch (err) {
        setError(
          `Signed in as @${me.login}, but creating your social repository failed: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        )
        setBusy(false)
        return
      }
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-line bg-card p-6">
        <h1 className="text-xl font-bold">Sign in with GitHub</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Paste a GitHub personal access token. The token is used only by your browser to talk
          directly to the GitHub API — it is never sent to any other server.
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor="token">
          Personal access token
        </label>
        <input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_…"
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-line bg-paper p-2.5 text-sm outline-none focus:border-accent"
        />
        <p className="mt-2 text-xs text-ink-faint">
          The token needs no special scopes for read access. Posting requires the{' '}
          <code>repo</code> scope (classic) or <code>Contents: read/write</code> (fine-grained).
        </p>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={busy || !token.trim()}
          className="mt-4 w-full rounded-full bg-accent py-2.5 font-semibold text-white transition hover:bg-accent-deep disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Note: GitHub does not allow the OAuth token exchange to run in a pure browser app (no
          CORS on the token endpoint), so the MVP uses a pasted token. Full OAuth is on the
          roadmap. Your social repository will be public.
        </p>
      </form>
    </div>
  )
}
