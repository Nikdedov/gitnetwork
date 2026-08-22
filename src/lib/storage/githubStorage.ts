import type { GitHubApi } from '../api/github'
import type { CacheStorage } from '../cache/cacheStorage'
import { cacheKey } from '../cache/cacheStorage'
import {
  SOCIAL_REPO,
  type Post,
  type NewPost,
  isPostPath,
  parsePostFile,
  buildPostFile,
  postPathFor,
  sortPostsDesc,
  validatePostContent,
  markdownToText,
} from '../post'
import { generateUlid } from '../ulid'
import { arrayBufferToBase64, safeImageName, validateImage, type MediaFile } from '../media'
import {
  PROFILE_PATH,
  MANIFEST_PATH,
  EVENTS_PATH,
  AI_MEMORY_PATH,
  AI_DECISIONS_PATH,
  AI_HANDOFFS_PATH,
  type SocialProfile,
  type SocialStorage,
  type ProfileData,
} from './socialStorage'
import type { GitHubUser, IssueComment } from '../api/github/types'
import { postIdFromIssueTitle } from '../api/github/issues'
import type { SocialEvent } from '../protocol/events'
import { createDefaultManifest, isValidManifest, type SocialManifest } from '../protocol/manifest'

export interface GitHubStorageOptions {
  github: GitHubApi
  cache: CacheStorage
  ttlMs?: number
  currentUsername?: () => string | null
}

export class GitHubStorage implements SocialStorage {
  private readonly github: GitHubApi
  private readonly cache: CacheStorage
  private readonly ttlMs: number
  private readonly currentUsername: () => string | null

  constructor(options: GitHubStorageOptions) {
    this.github = options.github
    this.cache = options.cache
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000
    this.currentUsername = options.currentUsername ?? (() => null)
  }

  async getProfile(username: string): Promise<SocialProfile> {
    const key = cacheKey(['profile', username])
    const cached = await this.cache.get<SocialProfile>(key)
    if (cached) return cached

    const [githubUser, repo] = await Promise.all([
      this.github.users.get(username),
      this.github.repos.getSocialRepo(username),
    ])

    let profileData: ProfileData | null = null
    if (repo) {
      const raw = await this.github.contents.readFileOrNull(username, SOCIAL_REPO, PROFILE_PATH, repo.default_branch)
      if (raw) {
        try {
          profileData = JSON.parse(raw) as ProfileData
        } catch {
          profileData = null
        }
      }
    }

    const [followers, following] = await Promise.all([
      this.github.users.followersCount(username),
      this.github.users.followingCount(username),
    ])

    const profile: SocialProfile = {
      username,
      displayName: profileData?.displayName || githubUser.name || githubUser.login,
      bio: profileData?.bio || githubUser.bio || '',
      avatar: profileData?.avatar || githubUser.avatar_url,
      createdAt: profileData?.createdAt ?? null,
      github: githubUser,
      followers,
      following,
      onboarded: repo !== null,
      repoUrl: `https://github.com/${username}/${SOCIAL_REPO}`,
    }

    await this.cache.set(key, profile, this.ttlMs)
    return profile
  }

  private async getPostPaths(username: string): Promise<{ paths: string[]; branch: string } | null> {
    const key = cacheKey(['postpaths', username])
    const cached = await this.cache.get<{ paths: string[]; branch: string }>(key)
    if (cached) return cached

    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) return null
    const tree = await this.github.contents.listTree(username, SOCIAL_REPO, repo.default_branch)
    const paths = tree.tree
      .filter((entry) => entry.type === 'blob' && isPostPath(entry.path))
      .map((entry) => entry.path)
      .sort()
      .reverse()
    const result = { paths, branch: repo.default_branch }
    await this.cache.set(key, result, this.ttlMs)
    return result
  }

  private async getIssueMap(username: string): Promise<Map<string, { issueNumber: number; likes: number; comments: number }>> {
    const key = cacheKey(['postissues', username])
    const cached = await this.cache.get<Map<string, { issueNumber: number; likes: number; comments: number }>>(key)
    if (cached) return cached

    const repo = await this.github.repos.getSocialRepo(username)
    const map = new Map<string, { issueNumber: number; likes: number; comments: number }>()
    if (repo) {
      const issues = await this.github.issues.listPostIssues(username, SOCIAL_REPO)
      for (const issue of issues) {
        const postId = postIdFromIssueTitle(issue.title)
        if (postId) {
          map.set(postId, {
            issueNumber: issue.number,
            likes: issue.reactions.heart,
            comments: issue.comments,
          })
        }
      }
    }
    await this.cache.set(key, map, this.ttlMs)
    return map
  }

  async getPosts(username: string, options?: { limit?: number }): Promise<Post[]> {
    const limit = options?.limit ?? 100
    const key = cacheKey(['posts', username, String(limit)])
    const cached = await this.cache.get<Post[]>(key)
    if (cached) return cached

    const located = await this.getPostPaths(username)
    if (!located) return []

    const paths = located.paths.slice(0, limit)
    const [rawPosts, issueMap] = await Promise.all([
      Promise.all(
        paths.map(async (path) => {
          const raw = await this.github.contents.readFile(username, SOCIAL_REPO, path, located.branch)
          return parsePostFile(raw, path)
        }),
      ),
      this.getIssueMap(username),
    ])

    const posts = rawPosts.map((post) => {
      const issue = issueMap.get(post.id)
      return issue
        ? { ...post, issueNumber: issue.issueNumber, likes: issue.likes, comments: issue.comments }
        : post
    })

    const sorted = sortPostsDesc(posts)
    await this.cache.set(key, sorted, this.ttlMs)
    return sorted
  }

  async getPost(username: string, postId: string): Promise<Post | null> {
    const key = cacheKey(['post', username, postId])
    const cached = await this.cache.get<Post>(key)
    if (cached) return cached

    const located = await this.getPostPaths(username)
    if (!located) return null
    const path = located.paths.find((p) => p.endsWith(`/${postId}.md`))
    if (!path) return null

    const raw = await this.github.contents.readFile(username, SOCIAL_REPO, path, located.branch)
    const post = parsePostFile(raw, path)
    const issueMap = await this.getIssueMap(username)
    const issue = issueMap.get(postId)
    const full = issue
      ? { ...post, issueNumber: issue.issueNumber, likes: issue.likes, comments: issue.comments }
      : post

    await this.cache.set(key, full, this.ttlMs)
    return full
  }

  async createPost(post: NewPost): Promise<Post> {
    const error = validatePostContent(post.content)
    if (error) throw new Error(error)

    const id = post.id ?? generateUlid()
    const createdAt = post.createdAt ?? new Date().toISOString()
    const date = new Date(createdAt)
    const path = postPathFor(id, date)
    const file = buildPostFile({ id, author: post.author, createdAt, content: post.content })

    const repo = await this.github.repos.getSocialRepo(post.author)
    if (!repo) throw new Error(`${post.author} has no social repository`)

    await this.github.contents.createFile(
      post.author,
      SOCIAL_REPO,
      path,
      file,
      `Add post ${id}`,
      repo.default_branch,
    )
    const issue = await this.github.issues.createPostIssue(
      post.author,
      SOCIAL_REPO,
      id,
      markdownToText(post.content, 280),
    )

    await this.invalidateUser(post.author)

    return {
      id,
      author: post.author,
      createdAt,
      content: post.content,
      path,
      issueNumber: issue.number,
      likes: 0,
      comments: 0,
    }
  }

  async uploadMedia(username: string, postId: string, file: MediaFile): Promise<string> {
    const error = validateImage(file)
    if (error) throw new Error(error)

    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) throw new Error(`${username} has no social repository`)

    const name = safeImageName(file.name, file.type)
    const path = `media/${postId}/${name}`
    const base64 = arrayBufferToBase64(file.data)
    await this.github.contents.createBinaryFile(
      username,
      SOCIAL_REPO,
      path,
      base64,
      `Add media for post ${postId}`,
      repo.default_branch,
    )
    return `https://raw.githubusercontent.com/${username}/${SOCIAL_REPO}/${repo.default_branch}/${path}`
  }

  async getFollowing(username: string): Promise<GitHubUser[]> {
    const key = cacheKey(['following', username])
    const cached = await this.cache.get<GitHubUser[]>(key)
    if (cached) return cached

    const isSelf = this.currentUsername() === username
    const users = isSelf
      ? await this.github.following.listMine()
      : await this.github.following.listOf(username)

    await this.cache.set(key, users, this.ttlMs)
    return users
  }

  async saveProfile(profile: ProfileData): Promise<void> {
    const repo = await this.github.repos.getSocialRepo(profile.username)
    if (!repo) throw new Error(`${profile.username} has no social repository`)

    const content = JSON.stringify(profile, null, 2)
    try {
      await this.github.contents.createFile(
        profile.username,
        SOCIAL_REPO,
        PROFILE_PATH,
        content,
        'Create social profile',
        repo.default_branch,
      )
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 422) {
        const existing = await this.github.contents.getFile(profile.username, SOCIAL_REPO, PROFILE_PATH, repo.default_branch)
        await this.github.contents.updateFile(
          profile.username,
          SOCIAL_REPO,
          PROFILE_PATH,
          content,
          'Update social profile',
          existing.sha,
          repo.default_branch,
        )
      } else {
        throw err
      }
    }
    await this.cache.delete(cacheKey(['profile', profile.username]))
  }

  async getManifest(username: string): Promise<SocialManifest | null> {
    const key = cacheKey(['manifest', username])
    const cached = await this.cache.get<SocialManifest>(key)
    if (cached) return cached

    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) return null

    const raw = await this.github.contents.readFileOrNull(username, SOCIAL_REPO, MANIFEST_PATH, repo.default_branch)
    if (!raw) {
      const defaultManifest = createDefaultManifest()
      await this.cache.set(key, defaultManifest, this.ttlMs)
      return defaultManifest
    }

    try {
      const parsed = JSON.parse(raw)
      if (isValidManifest(parsed)) {
        await this.cache.set(key, parsed, this.ttlMs)
        return parsed
      }
    } catch {
      // ignore parse errors
    }

    const defaultManifest = createDefaultManifest()
    await this.cache.set(key, defaultManifest, this.ttlMs)
    return defaultManifest
  }

  async saveManifest(username: string, manifest: SocialManifest): Promise<void> {
    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) throw new Error(`${username} has no social repository`)

    const content = JSON.stringify(manifest, null, 2)
    try {
      await this.github.contents.createFile(
        username,
        SOCIAL_REPO,
        MANIFEST_PATH,
        content,
        'Create social manifest',
        repo.default_branch,
      )
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 422) {
        const existing = await this.github.contents.getFile(username, SOCIAL_REPO, MANIFEST_PATH, repo.default_branch)
        await this.github.contents.updateFile(
          username,
          SOCIAL_REPO,
          MANIFEST_PATH,
          content,
          'Update social manifest',
          existing.sha,
          repo.default_branch,
        )
      } else {
        throw err
      }
    }
    await this.cache.delete(cacheKey(['manifest', username]))
  }

  async getEvents(username: string, options?: { limit?: number; type?: string }): Promise<SocialEvent[]> {
    const limit = options?.limit ?? 100
    const key = cacheKey(['events', username, String(limit), options?.type || 'all'])
    const cached = await this.cache.get<SocialEvent[]>(key)
    if (cached) return cached

    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) return []

    const tree = await this.github.contents.listTree(username, SOCIAL_REPO, repo.default_branch)
    const eventPaths = tree.tree
      .filter((entry) => entry.type === 'blob' && entry.path.startsWith(`${EVENTS_PATH}/`) && entry.path.endsWith('.json'))
      .map((entry) => entry.path)
      .sort()
      .reverse()
      .slice(0, limit)

    const events: SocialEvent[] = []
    for (const path of eventPaths) {
      const raw = await this.github.contents.readFile(username, SOCIAL_REPO, path, repo.default_branch)
      try {
        const parsed = JSON.parse(raw)
        // Note: parseEvent would be imported from protocol/events, but for now we validate minimally
        if (parsed && typeof parsed === 'object' && 'type' in parsed && 'id' in parsed && 'actor' in parsed) {
          if (!options?.type || parsed.type === options.type) {
            events.push(parsed as SocialEvent)
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    await this.cache.set(key, events, this.ttlMs)
    return events
  }

  async createEvent(event: SocialEvent): Promise<SocialEvent> {
    const repo = await this.github.repos.getSocialRepo(event.actor)
    if (!repo) throw new Error(`${event.actor} has no social repository`)

    const date = new Date(event.createdAt)
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const path = `${EVENTS_PATH}/${year}/${month}/${day}/${event.id}.json`

    const content = JSON.stringify(event, null, 2)
    await this.github.contents.createFile(
      event.actor,
      SOCIAL_REPO,
      path,
      content,
      `Create event ${event.type}: ${event.id}`,
      repo.default_branch,
    )

    await this.invalidateUser(event.actor)
    return event
  }

  async getAiMemory(username: string): Promise<Record<string, unknown>[]> {
    const key = cacheKey(['ai-memory', username])
    const cached = await this.cache.get<Record<string, unknown>[]>(key)
    if (cached) return cached

    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) return []

    const tree = await this.github.contents.listTree(username, SOCIAL_REPO, repo.default_branch)
    const memoryPaths = tree.tree
      .filter((entry) => entry.type === 'blob' && entry.path.startsWith(`${AI_MEMORY_PATH}/`) && entry.path.endsWith('.json'))
      .map((entry) => entry.path)
      .sort()
      .reverse()

    const memories: Record<string, unknown>[] = []
    for (const path of memoryPaths.slice(0, 100)) {
      const raw = await this.github.contents.readFile(username, SOCIAL_REPO, path, repo.default_branch)
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          memories.push(parsed)
        }
      } catch {
        // ignore parse errors
      }
    }

    await this.cache.set(key, memories, this.ttlMs)
    return memories
  }

  async saveAiMemory(username: string, memory: Record<string, unknown>): Promise<void> {
    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) throw new Error(`${username} has no social repository`)

    const id = (memory as { id?: string }).id || generateUlid()
    const date = new Date((memory as { createdAt?: string }).createdAt || new Date().toISOString())
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const path = `${AI_MEMORY_PATH}/${year}/${month}/${day}/${id}.json`

    const content = JSON.stringify(memory, null, 2)
    try {
      await this.github.contents.createFile(
        username,
        SOCIAL_REPO,
        path,
        content,
        `Save AI memory ${id}`,
        repo.default_branch,
      )
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 422) {
        const existing = await this.github.contents.getFile(username, SOCIAL_REPO, path, repo.default_branch)
        await this.github.contents.updateFile(
          username,
          SOCIAL_REPO,
          path,
          content,
          `Update AI memory ${id}`,
          existing.sha,
          repo.default_branch,
        )
      } else {
        throw err
      }
    }
    await this.cache.delete(cacheKey(['ai-memory', username]))
  }

  async getAiDecisions(username: string): Promise<Record<string, unknown>[]> {
    const key = cacheKey(['ai-decisions', username])
    const cached = await this.cache.get<Record<string, unknown>[]>(key)
    if (cached) return cached

    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) return []

    const tree = await this.github.contents.listTree(username, SOCIAL_REPO, repo.default_branch)
    const decisionPaths = tree.tree
      .filter((entry) => entry.type === 'blob' && entry.path.startsWith(`${AI_DECISIONS_PATH}/`) && entry.path.endsWith('.json'))
      .map((entry) => entry.path)
      .sort()
      .reverse()

    const decisions: Record<string, unknown>[] = []
    for (const path of decisionPaths.slice(0, 100)) {
      const raw = await this.github.contents.readFile(username, SOCIAL_REPO, path, repo.default_branch)
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          decisions.push(parsed)
        }
      } catch {
        // ignore parse errors
      }
    }

    await this.cache.set(key, decisions, this.ttlMs)
    return decisions
  }

  async saveAiDecision(username: string, decision: Record<string, unknown>): Promise<void> {
    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) throw new Error(`${username} has no social repository`)

    const id = (decision as { id?: string }).id || generateUlid()
    const date = new Date((decision as { createdAt?: string }).createdAt || new Date().toISOString())
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const path = `${AI_DECISIONS_PATH}/${year}/${month}/${day}/${id}.json`

    const content = JSON.stringify(decision, null, 2)
    try {
      await this.github.contents.createFile(
        username,
        SOCIAL_REPO,
        path,
        content,
        `Save AI decision ${id}`,
        repo.default_branch,
      )
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 422) {
        const existing = await this.github.contents.getFile(username, SOCIAL_REPO, path, repo.default_branch)
        await this.github.contents.updateFile(
          username,
          SOCIAL_REPO,
          path,
          content,
          `Update AI decision ${id}`,
          existing.sha,
          repo.default_branch,
        )
      } else {
        throw err
      }
    }
    await this.cache.delete(cacheKey(['ai-decisions', username]))
  }

  async getAiHandoffs(username: string): Promise<Record<string, unknown>[]> {
    const key = cacheKey(['ai-handoffs', username])
    const cached = await this.cache.get<Record<string, unknown>[]>(key)
    if (cached) return cached

    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) return []

    const tree = await this.github.contents.listTree(username, SOCIAL_REPO, repo.default_branch)
    const handoffPaths = tree.tree
      .filter((entry) => entry.type === 'blob' && entry.path.startsWith(`${AI_HANDOFFS_PATH}/`) && entry.path.endsWith('.json'))
      .map((entry) => entry.path)
      .sort()
      .reverse()

    const handoffs: Record<string, unknown>[] = []
    for (const path of handoffPaths.slice(0, 100)) {
      const raw = await this.github.contents.readFile(username, SOCIAL_REPO, path, repo.default_branch)
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          handoffs.push(parsed)
        }
      } catch {
        // ignore parse errors
      }
    }

    await this.cache.set(key, handoffs, this.ttlMs)
    return handoffs
  }

  async saveAiHandoff(username: string, handoff: Record<string, unknown>): Promise<void> {
    const repo = await this.github.repos.getSocialRepo(username)
    if (!repo) throw new Error(`${username} has no social repository`)

    const id = (handoff as { id?: string }).id || generateUlid()
    const date = new Date((handoff as { createdAt?: string }).createdAt || new Date().toISOString())
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const path = `${AI_HANDOFFS_PATH}/${year}/${month}/${day}/${id}.json`

    const content = JSON.stringify(handoff, null, 2)
    try {
      await this.github.contents.createFile(
        username,
        SOCIAL_REPO,
        path,
        content,
        `Save AI handoff ${id}`,
        repo.default_branch,
      )
    } catch (err) {
      if (err instanceof Error && (err as { status?: number }).status === 422) {
        const existing = await this.github.contents.getFile(username, SOCIAL_REPO, path, repo.default_branch)
        await this.github.contents.updateFile(
          username,
          SOCIAL_REPO,
          path,
          content,
          `Update AI handoff ${id}`,
          existing.sha,
          repo.default_branch,
        )
      } else {
        throw err
      }
    }
    await this.cache.delete(cacheKey(['ai-handoffs', username]))
  }

  async getIssueComments(username: string, issueNumber: number): Promise<IssueComment[]> {
    const key = cacheKey(['issuecomments', username, String(issueNumber)])
    const cached = await this.cache.get<IssueComment[]>(key)
    if (cached) return cached

    const comments = await this.github.issues.getComments(username, SOCIAL_REPO, issueNumber)
    await this.cache.set(key, comments, this.ttlMs)
    return comments
  }

  async invalidateIssueComments(username: string, issueNumber: number): Promise<void> {
    await this.cache.delete(cacheKey(['issuecomments', username, String(issueNumber)]))
  }

  async getMyLike(username: string, issueNumber: number, login: string): Promise<number | null> {
    const key = cacheKey(['mylike', username, String(issueNumber), login])
    const cached = await this.cache.get<number | null>(key)
    if (cached !== undefined) return cached

    const reactions = await this.github.reactions.getMyLike(username, SOCIAL_REPO, issueNumber, login)
    const hasLike = reactions ? 1 : 0
    await this.cache.set(key, hasLike, this.ttlMs)
    return hasLike
  }

  async invalidateMyLike(username: string, issueNumber: number, login: string): Promise<void> {
    await this.cache.delete(cacheKey(['mylike', username, String(issueNumber), login]))
  }

  async invalidateUser(username: string): Promise<void> {
    await Promise.all([
      this.cache.delete(cacheKey(['profile', username])),
      this.cache.delete(cacheKey(['postpaths', username])),
      this.cache.delete(cacheKey(['postissues', username])),
      this.cache.delete(cacheKey(['posts', username, '100'])),
      this.cache.delete(cacheKey(['following', username])),
      this.cache.delete(cacheKey(['manifest', username])),
      this.cache.delete(cacheKey(['events', username, '100', 'all'])),
      this.cache.delete(cacheKey(['ai-memory', username])),
      this.cache.delete(cacheKey(['ai-decisions', username])),
      this.cache.delete(cacheKey(['ai-handoffs', username])),
    ])
  }
}
