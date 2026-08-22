import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { ExploreData } from '../lib/services/socialService'
import { useApp } from '../app/AppContext'
import { Layout, PageHeader } from '../components/Layout'
import { PostCard } from '../components/PostCard'
import { Avatar } from '../components/Avatar'

export function Explore() {
  const { app } = useApp()
  const [data, setData] = useState<ExploreData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    app.social
      .getExplore()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load explore'))
  }, [app])

  return (
    <Layout>
      <PageHeader title="Explore" />
      {error && <div className="px-6 py-4 text-sm text-danger">{error}</div>}
      {!data && !error && <div className="px-6 py-10 text-center text-sm text-ink-faint">Loading…</div>}
      {data && (
        <>
          {data.trending.length > 0 && (
            <div className="border-b border-line px-4 py-4 sm:px-6">
              <h2 className="mb-2 text-sm font-bold">Trending topics</h2>
              <div className="flex flex-wrap gap-2">
                {data.trending.map((t) => (
                  <span
                    key={t.topic}
                    className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent-deep"
                  >
                    #{t.topic} <span className="text-ink-faint">· {t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.socialUsers.length > 0 && (
            <div className="border-b border-line px-4 py-4 sm:px-6">
              <h2 className="mb-2 text-sm font-bold">People on gitnetwork</h2>
              <div className="flex flex-wrap gap-3">
                {data.socialUsers.map((u) => (
                  <Link
                    key={u.login}
                    to={`/${encodeURIComponent(u.login)}`}
                    className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 text-sm hover:border-accent"
                  >
                    <Avatar src={u.avatar} name={u.login} size={24} />
                    @{u.login}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <h2 className="px-4 pt-4 text-sm font-bold sm:px-6">Recent posts</h2>
          {data.recentPosts.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-ink-soft">
              No public posts yet. Be the first!
            </div>
          )}
          {data.recentPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </>
      )}
    </Layout>
  )
}
