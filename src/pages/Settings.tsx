import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useApp } from '../app/AppContext'
import { Layout, PageHeader } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { SOCIAL_REPO } from '../lib/post'

export function Settings() {
  const { app, user, logout } = useApp()
  const navigate = useNavigate()
  const [cacheStatus, setCacheStatus] = useState<string | null>(null)

  if (!user) {
    return (
      <Layout>
        <PageHeader title="Settings" />
        <div className="px-6 py-10 text-center text-sm text-ink-soft">
          <Link to="/login" className="text-accent-deep hover:underline">
            Sign in
          </Link>{' '}
          to manage your settings.
        </div>
      </Layout>
    )
  }

  const repoUrl = `https://github.com/${user.login}/${SOCIAL_REPO}`

  const clearCache = async () => {
    await app.cache.clear()
    setCacheStatus('Cache cleared')
    setTimeout(() => setCacheStatus(null), 2000)
  }

  return (
    <Layout>
      <PageHeader title="Settings" />
      <div className="divide-y divide-line">
        <section className="px-4 py-4 sm:px-6">
          <h2 className="text-sm font-bold">GitHub account</h2>
          <div className="mt-3 flex items-center gap-3">
            <Avatar src={user.avatar_url} name={user.login} size={48} />
            <div>
              <div className="font-semibold">{user.name ?? user.login}</div>
              <div className="text-sm text-ink-faint">@{user.login}</div>
            </div>
          </div>
        </section>

        <section className="px-4 py-4 sm:px-6">
          <h2 className="text-sm font-bold">Social repository</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Your social data is stored in your GitHub repository and can be cloned or migrated.
            The repository is public.
          </p>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
          >
            Open my Social Repository
          </a>
        </section>

        <section className="px-4 py-4 sm:px-6">
          <h2 className="text-sm font-bold">Cache</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Profiles, posts and feeds are cached in your browser (IndexedDB) for 5 minutes to
            respect GitHub API rate limits.
          </p>
          <button
            type="button"
            onClick={clearCache}
            className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            {cacheStatus ?? 'Clear local cache'}
          </button>
        </section>

        <section className="px-4 py-4 sm:px-6">
          <h2 className="text-sm font-bold">Session</h2>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="mt-3 rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/5"
          >
            Log out
          </button>
        </section>
      </div>
    </Layout>
  )
}
