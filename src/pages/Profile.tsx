import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Post } from '../lib/post'
import type { SocialProfile } from '../lib/storage/socialStorage'
import { useApp } from '../app/AppContext'
import { Layout, PageHeader } from '../components/Layout'
import { PostCard } from '../components/PostCard'
import { Avatar } from '../components/Avatar'
import { formatCount } from '../lib/format'

type Tab = 'posts' | 'wall'

export function Profile() {
  const { username } = useParams<{ username: string }>()
  const uname = username ? decodeURIComponent(username) : ''
  const { app, user } = useApp()
  const [profile, setProfile] = useState<SocialProfile | null>(null)
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [tab, setTab] = useState<Tab>('posts')
  const [following, setFollowing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!uname) return
    setError(null)
    try {
      const [p, ps] = await Promise.all([
        app.social.getProfile(uname),
        app.social.getPosts(uname),
      ])
      setProfile(p)
      setPosts(ps)
      if (user && user.login !== uname) {
        setFollowing(await app.social.isFollowing(uname))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    }
  }, [app, uname, user])

  useEffect(() => {
    setProfile(null)
    setPosts(null)
    void load()
  }, [load])

  const toggleFollow = async () => {
    if (!user) return
    try {
      if (following) {
        await app.social.unfollow(uname)
        setFollowing(false)
      } else {
        await app.social.follow(uname)
        setFollowing(true)
      }
      setProfile((p) => (p ? { ...p, followers: p.followers + (following ? -1 : 1) } : p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow')
    }
  }

  const isSelf = user?.login === uname

  return (
    <Layout>
      <PageHeader title={profile ? `@${profile.username}` : 'Profile'} />
      {error && <div className="px-6 py-4 text-sm text-danger">{error}</div>}
      {!profile && !error && (
        <div className="px-6 py-10 text-center text-sm text-ink-faint">Loading profile…</div>
      )}
      {profile && (
        <>
          <div className="border-b border-line px-4 py-4 sm:px-6">
            <div className="flex items-start gap-4">
              <Avatar src={profile.avatar} name={profile.displayName} size={72} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold">{profile.displayName}</h2>
                    <div className="text-sm text-ink-faint">@{profile.username}</div>
                  </div>
                  {user && !isSelf && (
                    <button
                      type="button"
                      onClick={toggleFollow}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        following
                          ? 'border border-line text-ink-soft hover:border-danger hover:text-danger'
                          : 'bg-accent text-white hover:bg-accent-deep'
                      }`}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
                {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span>
                    <strong>{formatCount(profile.following)}</strong>{' '}
                    <span className="text-ink-faint">following</span>
                  </span>
                  <span>
                    <strong>{formatCount(profile.followers)}</strong>{' '}
                    <span className="text-ink-faint">followers</span>
                  </span>
                  {profile.onboarded && (
                    <a
                      href={profile.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-deep hover:underline"
                    >
                      social repository ↗
                    </a>
                  )}
                </div>
                {!profile.onboarded && (
                  <p className="mt-3 text-sm text-ink-faint">
                    This GitHub user has not created a social repository yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex border-b border-line text-sm">
            {(
              [
                ['posts', 'Posts'],
                ['wall', 'Wall'],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 py-3 font-semibold transition ${
                  tab === key ? 'border-b-2 border-accent text-ink' : 'text-ink-faint hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'wall' && (
            <p className="border-b border-line bg-paper px-6 py-2 text-xs text-ink-faint">
              Wall shows this user's posts. Mention aggregation across repositories is not
              indexed in the MVP.
            </p>
          )}

          {posts?.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-ink-soft">No posts yet.</div>
          )}
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} authorName={profile.displayName} />
          ))}
        </>
      )}
    </Layout>
  )
}
