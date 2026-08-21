import { GitHubApiError } from './githubClient'
import type { GitHubClient } from './githubClient'
import type { GitHubApi } from './index'
import { postIssueTitle } from './issues'
import { POST_LABEL } from '../../post'
import type {
  GitHubUser,
  GitHubRepo,
  ContentFile,
  GitTree,
  GitHubIssue,
  IssueComment,
  GitHubReaction,
  SearchReposResponse,
  SearchUsersResponse,
  RateLimit,
} from './types'

export interface MockFile {
  content: string | null
  base64?: string
  sha: string
}

export interface MockState {
  currentLogin: string | null
  users: Record<string, GitHubUser>
  repos: Record<string, GitHubRepo>
  files: Record<string, Record<string, MockFile>>
  issues: Record<string, GitHubIssue[]>
  comments: Record<string, Record<number, IssueComment[]>>
  likes: Record<string, Record<number, string[]>>
  following: Record<string, string[]>
  searchRepos: GitHubRepo[]
  searchUsers: GitHubUser[]
}

export interface MockGitHub extends GitHubApi {
  state: MockState
  login(login: string): void
}

let shaCounter = 0
function nextSha(): string {
  shaCounter += 1
  return `sha-${shaCounter.toString(36).padStart(8, '0')}`
}

function repoKey(owner: string, repo: string): string {
  return `${owner}/${repo}`
}

function notFound(message: string): GitHubApiError {
  return new GitHubApiError(404, message, 'not_found')
}

export function makeUser(login: string, extra: Partial<GitHubUser> = {}): GitHubUser {
  return {
    login,
    id: login.length * 7919,
    avatar_url: `https://avatars.githubusercontent.com/${login}`,
    name: null,
    bio: null,
    public_repos: 1,
    followers_url: `https://api.github.com/users/${login}/followers`,
    following_url: `https://api.github.com/users/${login}/following`,
    html_url: `https://github.com/${login}`,
    type: 'User',
    site_admin: false,
    ...extra,
  }
}

export function makeRepo(owner: string, name: string, extra: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: (owner.length + name.length) * 104729,
    name,
    full_name: `${owner}/${name}`,
    private: false,
    default_branch: 'main',
    description: null,
    html_url: `https://github.com/${owner}/${name}`,
    stargazers_count: 0,
    topics: [],
    has_issues: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    pushed_at: '2026-01-01T00:00:00Z',
    ...extra,
  }
}

function emptyReactions(): GitHubIssue['reactions'] {
  return {
    url: '',
    total_count: 0,
    '+1': 0,
    '-1': 0,
    laugh: 0,
    confused: 0,
    heart: 0,
    hooray: 0,
    rocket: 0,
    eyes: 0,
  }
}

export function createMockGitHub(initial: Partial<MockState> = {}): MockGitHub {
  const state: MockState = {
    currentLogin: null,
    users: {},
    repos: {},
    files: {},
    issues: {},
    comments: {},
    likes: {},
    following: {},
    searchRepos: [],
    searchUsers: [],
    ...initial,
  }

  const counters = { issue: 0, comment: 0, reaction: 0 }

  const requireLogin = (): string => {
    if (!state.currentLogin) throw new GitHubApiError(401, 'Bad credentials', 'bad_credentials')
    return state.currentLogin
  }

  const requireRepo = (owner: string, repo: string): GitHubRepo => {
    const found = state.repos[repoKey(owner, repo)]
    if (!found) throw notFound(`Not Found: ${owner}/${repo}`)
    return found
  }

  const requireUser = (login: string): GitHubUser => {
    const user = state.users[login]
    if (!user) throw notFound(`User ${login} not found`)
    return user
  }

  const toContentFile = (owner: string, repo: string, path: string, file: MockFile): ContentFile => ({
    type: 'file',
    size: file.base64 ? file.base64.length : (file.content ?? '').length,
    name: path.split('/').pop() ?? path,
    path,
    sha: file.sha,
    content: file.base64 ? file.base64 : file.content ?? undefined,
    encoding: 'base64',
    download_url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
    html_url: `https://github.com/${owner}/${repo}/blob/main/${path}`,
  })

  const api: MockGitHub = {
    state,
    login(login: string) {
      state.currentLogin = login
    },
    client: {
      request: async () => {
        throw new Error('Mock client does not perform requests')
      },
    } as unknown as GitHubClient,

    users: {
      me: async () => {
        const login = requireLogin()
        return requireUser(login)
      },
      get: async (login: string) => requireUser(login),
      followersCount: async (login: string) =>
        Object.values(state.following).filter((list) => list.includes(login)).length,
      followingCount: async (login: string) => (state.following[login] ?? []).length,
    },

    repos: {
      getSocialRepo: async (username: string) => state.repos[repoKey(username, 'social')] ?? null,
      getRepo: (owner: string, repo: string) => Promise.resolve(requireRepo(owner, repo)),
      createSocialRepo: async () => {
        const login = requireLogin()
        const key = repoKey(login, 'social')
        if (state.repos[key]) {
          throw new GitHubApiError(422, 'name already exists on this account', 'name_already_exists')
        }
        const repo = makeRepo(login, 'social', { description: 'Personal social profile' })
        state.repos[key] = repo
        state.files[key] = { 'README.md': { content: 'README', sha: nextSha() } }
        return repo
      },
      addTopics: async (owner: string, repo: string, topics: string[]) => {
        requireRepo(owner, repo).topics = topics
      },
      ensureTopic: async (owner: string, repo: string, topic = 'gitnnetwork') => {
        const repoObj = requireRepo(owner, repo)
        if (!repoObj.topics.includes(topic)) repoObj.topics = [...repoObj.topics, topic]
      },
    },

    contents: {
      getFile: async (owner: string, repo: string, path: string) => {
        requireRepo(owner, repo)
        const file = state.files[repoKey(owner, repo)]?.[path]
        if (!file) throw notFound(`Path not found: ${path}`)
        return toContentFile(owner, repo, path, file)
      },
      readFile: async (owner: string, repo: string, path: string) => {
        const file = state.files[repoKey(owner, repo)]?.[path]
        if (!file) throw notFound(`Path not found: ${path}`)
        if (file.content === null) throw new Error(`Binary file: ${path}`)
        return file.content ?? ''
      },
      readFileOrNull: async (owner: string, repo: string, path: string) => {
        try {
          return await api.contents.readFile(owner, repo, path)
        } catch (err) {
          if (err instanceof GitHubApiError && err.status === 404) return null
          throw err
        }
      },
      createFile: async (owner: string, repo: string, path: string, content: string) => {
        requireRepo(owner, repo)
        const files = (state.files[repoKey(owner, repo)] ??= {})
        if (files[path]) throw new GitHubApiError(422, 'name already exists', 'name_already_exists')
        const file: MockFile = { content, sha: nextSha() }
        files[path] = file
        return toContentFile(owner, repo, path, file)
      },
      updateFile: async (owner: string, repo: string, path: string, content: string, _message: string, sha: string) => {
        requireRepo(owner, repo)
        const files = (state.files[repoKey(owner, repo)] ??= {})
        const existing = files[path]
        if (!existing) throw notFound(`Path not found: ${path}`)
        if (existing.sha !== sha) throw new GitHubApiError(409, 'sha mismatch', 'sha_mismatch')
        const file: MockFile = { content, sha: nextSha() }
        files[path] = file
        return toContentFile(owner, repo, path, file)
      },
      createBinaryFile: async (owner: string, repo: string, path: string, base64Content: string) => {
        requireRepo(owner, repo)
        const files = (state.files[repoKey(owner, repo)] ??= {})
        if (files[path]) throw new GitHubApiError(422, 'name already exists', 'name_already_exists')
        const file: MockFile = { content: null, base64: base64Content, sha: nextSha() }
        files[path] = file
        return toContentFile(owner, repo, path, file)
      },
      listTree: async (owner: string, repo: string, _ref: string) => {
        requireRepo(owner, repo)
        const files = state.files[repoKey(owner, repo)] ?? {}
        const tree: GitTree['tree'] = Object.entries(files).map(([path, file]) => ({
          path,
          mode: '100644',
          type: 'blob' as const,
          sha: file.sha,
        }))
        return { sha: 'tree-sha', url: '', truncated: false, tree }
      },
    },

    issues: {
      createPostIssue: async (owner: string, repo: string, postId: string, body: string) => {
        requireRepo(owner, repo)
        const key = repoKey(owner, repo)
        counters.issue += 1
        const issue: GitHubIssue = {
          id: counters.issue,
          number: counters.issue,
          title: postIssueTitle(postId),
          body,
          state: 'open',
          user: requireUser(owner),
          labels: [{ id: 1, name: POST_LABEL, color: '1d76db' }],
          comments: 0,
          reactions: emptyReactions(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          html_url: `https://github.com/${owner}/${repo}/issues/${counters.issue}`,
        }
        ;(state.issues[key] ??= []).push(issue)
        return issue
      },
      listPostIssues: async (owner: string, repo: string) => {
        requireRepo(owner, repo)
        const issues = state.issues[repoKey(owner, repo)] ?? []
        return issues.filter((issue) => issue.title.startsWith('[post] '))
      },
      getPostIssue: async (owner: string, repo: string, postId: string) => {
        const issues = await api.issues.listPostIssues(owner, repo)
        return issues.find((issue) => issue.title === postIssueTitle(postId)) ?? null
      },
      getComments: async (owner: string, repo: string, issueNumber: number) =>
        state.comments[repoKey(owner, repo)]?.[issueNumber] ?? [],
      addComment: async (owner: string, repo: string, issueNumber: number, body: string) => {
        const login = requireLogin()
        const key = repoKey(owner, repo)
        counters.comment += 1
        const comment: IssueComment = {
          id: counters.comment,
          body,
          user: requireUser(login),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          html_url: '',
        }
        ;(state.comments[key] ??= {})[issueNumber] = [
          ...(state.comments[key]?.[issueNumber] ?? []),
          comment,
        ]
        const issue = (state.issues[key] ?? []).find((i) => i.number === issueNumber)
        if (issue) issue.comments += 1
        return comment
      },
    },

    reactions: {
      addLike: async (owner: string, repo: string, issueNumber: number) => {
        const login = requireLogin()
        const key = repoKey(owner, repo)
        const likes = (state.likes[key] ??= {})[issueNumber] ?? []
        if (!likes.includes(login)) likes.push(login)
        state.likes[key][issueNumber] = likes
        const issue = (state.issues[key] ?? []).find((i) => i.number === issueNumber)
        if (issue) issue.reactions.heart = likes.length
      },
      removeLike: async (owner: string, repo: string, issueNumber: number, login: string) => {
        const key = repoKey(owner, repo)
        const likes = (state.likes[key] ?? {})[issueNumber] ?? []
        state.likes[key][issueNumber] = likes.filter((l) => l !== login)
        const issue = (state.issues[key] ?? []).find((i) => i.number === issueNumber)
        if (issue) issue.reactions.heart = state.likes[key][issueNumber].length
      },
      getMyLike: async (owner: string, repo: string, issueNumber: number, login: string) => {
        const key = repoKey(owner, repo)
        const liked = (state.likes[key] ?? {})[issueNumber]?.includes(login)
        if (!liked) return null
        const reaction: GitHubReaction = {
          id: ++counters.reaction,
          user: requireUser(login),
          content: 'heart',
          created_at: new Date().toISOString(),
        }
        return reaction
      },
    },

    following: {
      listMine: async () => {
        const login = requireLogin()
        return (state.following[login] ?? []).map((l) => requireUser(l))
      },
      listOf: async (username: string) =>
        (state.following[username] ?? []).map((l) => requireUser(l)),
      isFollowing: async (target: string) => {
        const login = requireLogin()
        return (state.following[login] ?? []).includes(target)
      },
      follow: async (target: string) => {
        const login = requireLogin()
        const list = (state.following[login] ??= [])
        if (!list.includes(target)) list.push(target)
      },
      unfollow: async (target: string) => {
        const login = requireLogin()
        state.following[login] = (state.following[login] ?? []).filter((l) => l !== target)
      },
    },

    search: {
      searchSocialRepos: async (perPage = 30): Promise<SearchReposResponse> => ({
        total_count: state.searchRepos.length,
        incomplete_results: false,
        items: state.searchRepos.slice(0, perPage),
      }),
      searchUsers: async (): Promise<SearchUsersResponse> => ({
        total_count: state.searchUsers.length,
        incomplete_results: false,
        items: state.searchUsers,
      }),
    },

    rateLimit: {
      get: async (): Promise<RateLimit> => ({
        resources: {
          core: { limit: 5000, remaining: 4990, reset: Math.floor(Date.now() / 1000) + 3600, used: 10 },
          search: { limit: 30, remaining: 30, reset: Math.floor(Date.now() / 1000) + 3600, used: 0 },
        },
      }),
    },
  }

  return api
}

export interface SeedPost {
  content: string
  createdAt: string
  id?: string
}

export function seedSocialRepo(
  mock: MockGitHub,
  login: string,
  options: {
    profile?: { displayName?: string; bio?: string }
    posts?: SeedPost[]
    topics?: string[]
  } = {},
): void {
  const { state } = mock
  state.users[login] = makeUser(login, {
    name: options.profile?.displayName ?? null,
    bio: options.profile?.bio ?? null,
  })
  const key = repoKey(login, 'social')
  state.repos[key] = makeRepo(login, 'social', { topics: options.topics ?? ['gitnnetwork'] })
  state.files[key] = { 'README.md': { content: 'README', sha: nextSha() } }

  if (options.profile) {
    const profile = {
      schemaVersion: 1,
      username: login,
      displayName: options.profile.displayName ?? login,
      bio: options.profile.bio ?? '',
      avatar: state.users[login].avatar_url,
      createdAt: '2026-01-01T00:00:00Z',
    }
    state.files[key]['.social/profile.json'] = {
      content: JSON.stringify(profile, null, 2),
      sha: nextSha(),
    }
  }

  ;(options.posts ?? []).forEach((post, index) => {
    const id = post.id ?? seedUlid(`${login}-${index}`)
    const date = new Date(post.createdAt)
    const path = `posts/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(
      date.getUTCDate(),
    ).padStart(2, '0')}/${id}.md`
    const file = `---\nschemaVersion: '1'\ntype: post\nid: ${id}\nauthor: ${login}\ncreatedAt: ${post.createdAt}\n---\n\n${post.content}\n`
    state.files[key][path] = { content: file, sha: nextSha() }

    const issueNumber = (state.issues[key] ??= []).length + 1
    state.issues[key].push({
      id: issueNumber,
      number: issueNumber,
      title: postIssueTitle(id),
      body: post.content,
      state: 'open',
      user: state.users[login],
      labels: [{ id: 1, name: POST_LABEL, color: '1d76db' }],
      comments: 0,
      reactions: emptyReactions(),
      created_at: post.createdAt,
      updated_at: post.createdAt,
      html_url: '',
    })
  })
}

export function seedUlid(seed: string): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const chars = seed.split('').map((c) => alphabet[c.charCodeAt(0) % alphabet.length])
  while (chars.length < 26) chars.push(alphabet[chars.length % alphabet.length])
  return chars.slice(0, 26).join('')
}
