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
  type SocialProfile,
  type SocialStorage,
  type ProfileData,
} from './socialStorage'
import type { GitHubUser } from '../api/github/types'
import { postIdFromIssueTitle } from '../api/github/issues'

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

  async invalidateUser(username: string): Promise<void> {
    await Promise.all([
      this.cache.delete(cacheKey(['profile', username])),
      this.cache.delete(cacheKey(['postpaths', username])),
      this.cache.delete(cacheKey(['postissues', username])),
      this.cache.delete(cacheKey(['posts', username, '100'])),
      this.cache.delete(cacheKey(['following', username])),
    ])
  }
}
