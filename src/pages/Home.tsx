import { useCallback, useEffect, useState } from 'react'
import type { Post } from '../lib/post'
import { useApp } from '../app/AppContext'
import { Layout, PageHeader } from '../components/Layout'
import { Composer } from '../components/Composer'
import { PostCard } from '../components/PostCard'

type Tab = 'following' | 'foryou'

export function Home() {
  const { app, user } = useApp()
  const [tab, setTab] = useState<Tab>('following')
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setError(null)
    try {
      const feed =
        tab === 'following'
          ? await app.social.getFollowingFeed()
          : await app.social.getForYouFeed()
      setPosts(feed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
      setPosts(null)
    }
  }, [app, tab, user])

  useEffect(() => {
    setPosts(null)
    void load()
  }, [load])

  return (
    <Layout>
      <PageHeader title="Home" />
      <div className="flex border-b border-line text-sm">
        {(
          [
            ['following', 'Following'],
            ['foryou', 'For You'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 py-3 font-semibold transition ${
              tab === key
                ? 'border-b-2 border-accent text-ink'
                : 'text-ink-faint hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Composer onPosted={() => void load()} />
      {error && (
        <div className="px-6 py-4 text-sm text-danger">{error}</div>
      )}
      {!user && !error && (
        <div className="px-6 py-10 text-center text-sm text-ink-soft">
          Sign in to see your feed.
        </div>
      )}
      {user && posts === null && !error && (
        <div className="px-6 py-10 text-center text-sm text-ink-faint">Loading feed…</div>
      )}
      {user && posts?.length === 0 && (
        <div className="px-6 py-10 text-center text-sm text-ink-soft">
          {tab === 'following'
            ? 'You are not following anyone yet. Find people on Explore.'
            : 'Nothing to recommend yet.'}
        </div>
      )}
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </Layout>
  )
}
