import { describe, it, expect } from 'vitest'
import { createMockGitHub, seedSocialRepo, makeUser, seedUlid } from '../api/github/mockGithub'
import { GitHubStorage } from '../storage/githubStorage'
import { MemoryCache } from '../cache/memoryCache'
import { AuthService, SessionTokenStore } from './authService'
import { SocialService } from './socialService'

async function setup(options: { seed?: boolean; follow?: string[] } = {}) {
  const mock = createMockGitHub()
  mock.state.users['alice'] = makeUser('alice', { name: 'Alice' })
  mock.state.users['bob'] = makeUser('bob', { name: 'Bob' })
  mock.state.users['carol'] = makeUser('carol', { name: 'Carol' })
  if (options.seed !== false) {
    seedSocialRepo(mock, 'alice', {
      profile: { displayName: 'Alice' },
      posts: [{ id: seedUlid('a1'), content: 'alice post about blockchain', createdAt: '2026-08-15T10:00:00Z' }],
    })
    seedSocialRepo(mock, 'bob', {
      posts: [
        { id: seedUlid('b1'), content: 'bob post about rust', createdAt: '2026-08-16T10:00:00Z' },
        { id: seedUlid('b2'), content: 'bob post about wasm', createdAt: '2026-08-17T10:00:00Z' },
      ],
    })
  }
  if (options.follow) mock.state.following['alice'] = options.follow
  mock.login('alice')

  const storage = new GitHubStorage({
    github: mock,
    cache: new MemoryCache(),
    currentUsername: () => mock.state.currentLogin,
  })
  const auth = new AuthService(mock, new SessionTokenStore())
  await auth.login('test-token')
  const service = new SocialService(storage, mock, auth)
  return { mock, storage, service }
}

describe('SocialService.ensureOnboarded', () => {
  it('creates the social repo, profile and posts dir for a new user', async () => {
    const { service, mock } = await setup({ seed: false })
    const repo = await service.ensureOnboarded()
    expect(repo.full_name).toBe('alice/social')
    expect(mock.state.files['alice/social']?.['.social/profile.json']).toBeDefined()
    expect(mock.state.files['alice/social']?.['posts/.gitkeep']).toBeDefined()
    expect(mock.state.repos['alice/social'].topics).toContain('gitnnetwork')
  })

  it('is idempotent for an already-onboarded user', async () => {
    const { service, mock } = await setup()
    const before = Object.keys(mock.state.files['alice/social']).length
    const repo = await service.ensureOnboarded()
    expect(repo.full_name).toBe('alice/social')
    expect(Object.keys(mock.state.files['alice/social']).length).toBe(before)
  })

  it('throws when not authenticated', async () => {
    const mock = createMockGitHub()
    mock.state.users['alice'] = makeUser('alice')
    const storage = new GitHubStorage({ github: mock, cache: new MemoryCache() })
    const auth = new AuthService(mock, new SessionTokenStore())
    const service = new SocialService(storage, mock, auth)
    await expect(service.ensureOnboarded()).rejects.toThrow(/Not authenticated/)
  })
})

describe('SocialService follow/unfollow', () => {
  it('follows and unfollows a user', async () => {
    const { service, mock } = await setup()
    await service.follow('bob')
    expect(await service.isFollowing('bob')).toBe(true)
    expect(mock.state.following['alice']).toContain('bob')
    await service.unfollow('bob')
    expect(await service.isFollowing('bob')).toBe(false)
    expect(mock.state.following['alice'] ?? []).not.toContain('bob')
  })

  it('does not follow yourself', async () => {
    const { service, mock } = await setup()
    await service.follow('alice')
    expect(mock.state.following['alice'] ?? []).not.toContain('alice')
  })
})

describe('SocialService.toggleLike', () => {
  it('adds a like then removes it on second toggle', async () => {
    const { service, mock } = await setup()
    const posts = await service.getPosts('bob')
    const post = posts[0]
    expect(post.issueNumber).toBeDefined()

    const issue = mock.state.issues['bob/social']?.find((i) => i.number === post.issueNumber)
    expect(issue).toBeDefined()

    const first = await service.toggleLike(post)
    expect(first).toEqual({ liked: true, likes: 1 })
    expect(issue?.reactions.heart).toBe(1)

    const second = await service.toggleLike({ ...post, likes: 1 })
    expect(second).toEqual({ liked: false, likes: 0 })
    expect(issue?.reactions.heart).toBe(0)
  })

  it('rejects posts without an issue', async () => {
    const { service } = await setup()
    await expect(
      service.toggleLike({
        id: 'X'.repeat(26),
        author: 'bob',
        createdAt: '',
        content: '',
        path: '',
        likes: 0,
        comments: 0,
      }),
    ).rejects.toThrow(/no interaction layer/)
  })
})

describe('SocialService comments', () => {
  it('adds a comment and rejects empty ones', async () => {
    const { service, mock } = await setup()
    const post = (await service.getPosts('bob'))[0]
    await expect(service.addComment(post, '  ')).rejects.toThrow(/cannot be empty/)

    const { comment } = await service.addComment(post, 'Nice work!')
    expect(comment.body).toBe('Nice work!')
    expect(mock.state.comments['bob/social']?.[post.issueNumber ?? -1]?.[0].body).toBe('Nice work!')
    const issue = mock.state.issues['bob/social']?.find((i) => i.number === post.issueNumber)
    expect(issue?.comments).toBe(1)
  })
})

describe('SocialService.getFollowingFeed', () => {
  it('merges posts from followed users, newest first', async () => {
    const { service } = await setup({ follow: ['bob'] })
    const feed = await service.getFollowingFeed()
    expect(feed.map((p) => p.content)).toEqual([
      'bob post about wasm',
      'bob post about rust',
    ])
  })

  it('is empty when following nobody', async () => {
    const { service } = await setup()
    expect(await service.getFollowingFeed()).toEqual([])
  })
})

describe('SocialService.getForYouFeed', () => {
  it('deduplicates and ranks posts', async () => {
    const { service, mock } = await setup({ follow: ['bob'] })
    mock.state.searchRepos = [mock.state.repos['alice/social']]
    const feed = await service.getForYouFeed()
    const ids = feed.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain(seedUlid('b2'))
    expect(ids).toContain(seedUlid('a1'))
  })
})

describe('SocialService.getExplore', () => {
  it('returns recent posts, users and trending topics', async () => {
    const { service, mock } = await setup()
    mock.state.searchRepos = [mock.state.repos['alice/social'], mock.state.repos['bob/social']]
    mock.state.searchUsers = [mock.state.users['carol']]
    const explore = await service.getExplore()
    expect(explore.recentPosts.length).toBeGreaterThan(0)
    expect(explore.socialUsers.map((u) => u.login)).toEqual(['carol'])
    expect(explore.trending.length).toBeGreaterThan(0)
  })
})
