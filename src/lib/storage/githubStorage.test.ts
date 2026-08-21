import { describe, it, expect } from 'vitest'
import { createMockGitHub, seedSocialRepo, makeUser, makeRepo, seedUlid } from '../api/github/mockGithub'
import type { MockGitHub } from '../api/github/mockGithub'
import { GitHubStorage } from './githubStorage'
import { MemoryCache } from '../cache/memoryCache'
import { SOCIAL_REPO } from '../post'

function setup(options: { login?: string; seed?: boolean } = {}): {
  mock: MockGitHub
  storage: GitHubStorage
} {
  const mock = createMockGitHub()
  const login = options.login ?? 'alice'
  mock.state.users[login] = makeUser(login, { name: 'Alice' })
  if (options.seed !== false) {
    seedSocialRepo(mock, login, {
      profile: { displayName: 'Alice', bio: 'Blockchain developer' },
      posts: [
        { id: seedUlid('p1'), content: 'First post about blockchain', createdAt: '2026-08-10T10:00:00Z' },
        { id: seedUlid('p2'), content: 'Second post about rust', createdAt: '2026-08-15T10:00:00Z' },
      ],
    })
  }
  if (options.login) mock.login(login)
  const storage = new GitHubStorage({
    github: mock,
    cache: new MemoryCache(),
    currentUsername: () => mock.state.currentLogin,
  })
  return { mock, storage }
}

describe('GitHubStorage.getProfile', () => {
  it('returns profile data for an onboarded user', async () => {
    const { storage } = setup()
    const profile = await storage.getProfile('alice')
    expect(profile.username).toBe('alice')
    expect(profile.displayName).toBe('Alice')
    expect(profile.bio).toBe('Blockchain developer')
    expect(profile.onboarded).toBe(true)
    expect(profile.repoUrl).toBe(`https://github.com/alice/${SOCIAL_REPO}`)
  })

  it('marks users without a social repo as not onboarded', async () => {
    const { storage, mock } = setup()
    mock.state.users['bob'] = makeUser('bob')
    const profile = await storage.getProfile('bob')
    expect(profile.onboarded).toBe(false)
    expect(profile.displayName).toBe('bob')
  })

  it('falls back to GitHub user data when profile.json is missing', async () => {
    const { storage, mock } = setup()
    const key = 'bob/social'
    mock.state.users['bob'] = makeUser('bob', { name: 'Bobby', bio: 'from github' })
    mock.state.repos[key] = {
      id: 1,
      name: 'social',
      full_name: key,
      private: false,
      default_branch: 'main',
      description: null,
      html_url: '',
      stargazers_count: 0,
      topics: [],
      has_issues: true,
      created_at: '',
      updated_at: '',
      pushed_at: '',
    }
    mock.state.files[key] = {}
    const profile = await storage.getProfile('bob')
    expect(profile.onboarded).toBe(true)
    expect(profile.displayName).toBe('Bobby')
    expect(profile.bio).toBe('from github')
  })

  it('caches the profile', async () => {
    const { storage, mock } = setup()
    await storage.getProfile('alice')
    mock.state.users['alice'].name = 'Changed'
    const again = await storage.getProfile('alice')
    expect(again.displayName).toBe('Alice')
  })
})

describe('GitHubStorage.getPosts', () => {
  it('returns posts sorted by date descending', async () => {
    const { storage } = setup()
    const posts = await storage.getPosts('alice')
    expect(posts).toHaveLength(2)
    expect(posts[0].content).toContain('rust')
    expect(posts[1].content).toContain('blockchain')
  })

  it('respects the limit', async () => {
    const { storage } = setup()
    const posts = await storage.getPosts('alice', { limit: 1 })
    expect(posts).toHaveLength(1)
  })

  it('returns empty for users without a repo', async () => {
    const { storage, mock } = setup()
    mock.state.users['bob'] = makeUser('bob')
    expect(await storage.getPosts('bob')).toEqual([])
  })

  it('includes like and comment counts from issues', async () => {
    const { storage, mock } = setup()
    const key = 'alice/social'
    const issue = mock.state.issues[key]?.[0]
    if (!issue) throw new Error('no seeded issue')
    issue.reactions.heart = 5
    issue.comments = 2
    const posts = await storage.getPosts('alice')
    const first = posts.find((p) => p.issueNumber === issue.number)
    expect(first?.likes).toBe(5)
    expect(first?.comments).toBe(2)
  })
})

describe('GitHubStorage.getPost', () => {
  it('finds a post by id', async () => {
    const { storage } = setup()
    const all = await storage.getPosts('alice')
    const post = await storage.getPost('alice', all[0].id)
    expect(post?.id).toBe(all[0].id)
  })

  it('returns null for unknown ids', async () => {
    const { storage } = setup()
    expect(await storage.getPost('alice', '01AAAAAAAAAAAAAAAAAAAAAAAA')).toBeNull()
  })
})

describe('GitHubStorage.createPost', () => {
  it('writes the markdown file and creates the backing issue', async () => {
    const { storage, mock } = setup()
    const post = await storage.createPost({ author: 'alice', content: 'Brand new post' })
    expect(post.author).toBe('alice')
    expect(post.path).toMatch(/^posts\/\d{4}\/\d{2}\/\d{2}\/[0-9A-HJKMNP-TV-Z]{26}\.md$/)
    const file = mock.state.files['alice/social']?.[post.path]
    expect(file?.content).toContain('Brand new post')
    expect(file?.content).toContain(`id: ${post.id}`)
    const issues = mock.state.issues['alice/social'] ?? []
    expect(issues.some((i) => i.title === `[post] ${post.id}`)).toBe(true)
  })

  it('rejects empty content', async () => {
    const { storage } = setup()
    await expect(storage.createPost({ author: 'alice', content: '   ' })).rejects.toThrow(
      /cannot be empty/,
    )
  })

  it('rejects posts for users without a repo', async () => {
    const { storage, mock } = setup()
    mock.state.users['bob'] = makeUser('bob')
    await expect(storage.createPost({ author: 'bob', content: 'hi' })).rejects.toThrow(
      /no social repository/,
    )
  })

  it('invalidates the cache after posting', async () => {
    const { storage } = setup()
    await storage.getPosts('alice')
    await storage.createPost({ author: 'alice', content: 'new one' })
    const posts = await storage.getPosts('alice')
    expect(posts).toHaveLength(3)
    expect(posts[0].content).toBe('new one')
  })
})

describe('GitHubStorage.uploadMedia', () => {
  it('stores the binary file and returns a raw URL', async () => {
    const { storage, mock } = setup()
    const data = new Uint8Array([1, 2, 3]).buffer
    const url = await storage.uploadMedia('alice', '01ABCDEF0123456789ABCDEF01', {
      name: 'photo.png',
      type: 'image/png',
      size: 3,
      data,
    })
    expect(url).toBe(
      `https://raw.githubusercontent.com/alice/${SOCIAL_REPO}/main/media/01ABCDEF0123456789ABCDEF01/photo.png`,
    )
    const file = mock.state.files['alice/social']?.['media/01ABCDEF0123456789ABCDEF01/photo.png']
    expect(file?.base64).toBeDefined()
    expect(file?.content).toBeNull()
  })

  it('rejects unsupported types', async () => {
    const { storage } = setup()
    await expect(
      storage.uploadMedia('alice', '01ABCDEF0123456789ABCDEF01', {
        name: 'a.gif',
        type: 'image/gif',
        size: 3,
        data: new Uint8Array(3).buffer,
      }),
    ).rejects.toThrow(/Only JPG/)
  })
})

describe('GitHubStorage.getFollowing / follow', () => {
  it('lists my following when username is the current user', async () => {
    const { storage, mock } = setup()
    mock.state.users['bob'] = makeUser('bob')
    mock.state.following['alice'] = ['bob']
    const users = await storage.getFollowing('alice')
    expect(users.map((u) => u.login)).toEqual(['bob'])
  })

  it('lists another user\'s following from their list', async () => {
    const { storage, mock } = setup()
    mock.state.users['bob'] = makeUser('bob')
    mock.state.users['carol'] = makeUser('carol')
    mock.state.following['bob'] = ['carol']
    const users = await storage.getFollowing('bob')
    expect(users.map((u) => u.login)).toEqual(['carol'])
  })
})

describe('GitHubStorage.saveProfile', () => {
  it('creates profile.json when missing', async () => {
    const { storage, mock } = setup({ seed: false })
    mock.state.users['alice'].name = 'Alice'
    mock.state.repos['alice/social'] = makeRepo('alice', 'social')
    mock.state.files['alice/social'] = {}
    await storage.saveProfile({
      schemaVersion: 1,
      username: 'alice',
      displayName: 'Alice A',
      bio: 'bio',
      avatar: 'https://x/y.png',
      createdAt: '2026-08-18T00:00:00Z',
    })
    const raw = mock.state.files['alice/social']?.['.social/profile.json']?.content
    expect(JSON.parse(raw ?? '{}').displayName).toBe('Alice A')
  })

  it('updates profile.json when it already exists', async () => {
    const { storage } = setup()
    await storage.saveProfile({
      schemaVersion: 1,
      username: 'alice',
      displayName: 'New Name',
      bio: 'new bio',
      avatar: 'https://x/y.png',
      createdAt: '2026-08-18T00:00:00Z',
    })
    const profile = await storage.getProfile('alice')
    expect(profile.displayName).toBe('New Name')
    expect(profile.bio).toBe('new bio')
  })
})
