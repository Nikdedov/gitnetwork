import type { GitHubApi } from '../api/github'
import type { GitHubUser, GitHubRepo } from '../api/github/types'
import type { SocialStorage, SocialProfile, ProfileData } from '../storage/socialStorage'
import { SOCIAL_REPO, type Post, type NewPost, sortPostsDesc } from '../post'
import { PROFILE_PATH } from '../storage/socialStorage'
import type { MediaFile } from '../media'
import type { AuthService } from './authService'
import { rankForYou, trendingTopics, extractTopics, type RankContext, type TopicCount } from './recommendationService'

function repoOwner(repo: GitHubRepo): string {
  return repo.full_name.split('/')[0]
}

export interface ExploreData {
  recentPosts: Post[]
  socialUsers: { login: string; avatar: string; followers: number }[]
  trending: TopicCount[]
}

export class SocialService {
  private readonly storage: SocialStorage
  private readonly github: GitHubApi
  private readonly auth: AuthService

  constructor(storage: SocialStorage, github: GitHubApi, auth: AuthService) {
    this.storage = storage
    this.github = github
    this.auth = auth
  }

  async requireUser(): Promise<GitHubUser> {
    const user = await this.auth.currentUser()
    if (!user) throw new Error('Not authenticated')
    return user
  }

  async isOnboarded(username: string): Promise<boolean> {
    return (await this.github.repos.getSocialRepo(username)) !== null
  }

  async ensureOnboarded(): Promise<GitHubRepo> {
    const me = await this.requireUser()
    let repo = await this.github.repos.getSocialRepo(me.login)
    if (!repo) {
      repo = await this.github.repos.createSocialRepo()
      const profile: ProfileData = {
        schemaVersion: 1,
        username: me.login,
        displayName: me.name || me.login,
        bio: me.bio ?? '',
        avatar: me.avatar_url,
        createdAt: new Date().toISOString(),
      }
      const content = JSON.stringify(profile, null, 2)
      try {
        await this.github.contents.createFile(
          me.login,
          SOCIAL_REPO,
          PROFILE_PATH,
          content,
          'Create social profile',
          repo.default_branch,
        )
      } catch (err) {
        if (err instanceof Error && (err as { status?: number }).status === 422) {
          const existing = await this.github.contents.getFile(me.login, SOCIAL_REPO, PROFILE_PATH, repo.default_branch)
          await this.github.contents.updateFile(
            me.login,
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
      await this.github.contents.createFile(
        me.login,
        SOCIAL_REPO,
        'posts/.gitkeep',
        '',
        'Initialize posts directory',
        repo.default_branch,
      )
    }
    await this.github.repos.ensureTopic(me.login, SOCIAL_REPO)
    return repo
  }

  getProfile(username: string): Promise<SocialProfile> {
    return this.storage.getProfile(username)
  }

  getPosts(username: string, options?: { limit?: number }): Promise<Post[]> {
    return this.storage.getPosts(username, options)
  }

  getPost(username: string, postId: string): Promise<Post | null> {
    return this.storage.getPost(username, postId)
  }

  async createPost(content: string): Promise<Post> {
    const me = await this.requireUser()
    const newPost: NewPost = { author: me.login, content }
    return this.storage.createPost(newPost)
  }

  uploadMedia(postId: string, file: MediaFile): Promise<string> {
    return this.requireUser().then((me) => this.storage.uploadMedia(me.login, postId, file))
  }

  getFollowing(username: string): Promise<GitHubUser[]> {
    return this.storage.getFollowing(username)
  }

  async isFollowing(target: string): Promise<boolean> {
    await this.requireUser()
    return this.github.following.isFollowing(target)
  }

  async follow(target: string): Promise<void> {
    const me = await this.requireUser()
    if (me.login === target) return
    await this.github.following.follow(target)
    await this.storage.invalidateUser(me.login)
  }

  async unfollow(target: string): Promise<void> {
    const me = await this.requireUser()
    if (me.login === target) return
    await this.github.following.unfollow(target)
    await this.storage.invalidateUser(me.login)
  }

  async toggleLike(post: Post): Promise<{ liked: boolean; likes: number }> {
    const me = await this.requireUser()
    if (!post.issueNumber) throw new Error('Post has no interaction layer yet')
    const already = await this.storage.getMyLike(post.author, post.issueNumber, me.login)
    if (already) {
      await this.github.reactions.removeLike(post.author, SOCIAL_REPO, post.issueNumber, me.login)
      await this.storage.invalidateMyLike(post.author, post.issueNumber, me.login)
      return { liked: false, likes: Math.max(0, post.likes - 1) }
    }
    await this.github.reactions.addLike(post.author, SOCIAL_REPO, post.issueNumber)
    await this.storage.invalidateMyLike(post.author, post.issueNumber, me.login)
    return { liked: true, likes: post.likes + 1 }
  }

  async getComments(post: Post) {
    if (!post.issueNumber) return []
    return this.storage.getIssueComments(post.author, post.issueNumber)
  }

  async addComment(post: Post, body: string) {
    const me = await this.requireUser()
    if (!post.issueNumber) throw new Error('Post has no interaction layer yet')
    const text = body.trim()
    if (!text) throw new Error('Comment cannot be empty')
    if (text.length > 3000) throw new Error('Comment is too long (max 3000 characters)')
    const comment = await this.github.issues.addComment(post.author, SOCIAL_REPO, post.issueNumber, text)
    await this.storage.invalidateIssueComments(post.author, post.issueNumber)
    await this.storage.invalidateUser(post.author)
    return { comment, me }
  }

  async getFollowingFeed(limit = 100): Promise<Post[]> {
    const me = await this.requireUser()
    const following = await this.storage.getFollowing(me.login)
    const posts = await Promise.all(
      following.slice(0, 50).map((user) => this.storage.getPosts(user.login, { limit })),
    )
    return sortPostsDesc(posts.flat()).slice(0, limit)
  }

  async getForYouFeed(limit = 100): Promise<Post[]> {
    const me = await this.requireUser()
    const [following, exploreRepos, myPosts] = await Promise.all([
      this.storage.getFollowing(me.login),
      this.github.search.searchSocialRepos(10),
      this.storage.getPosts(me.login, { limit: 20 }),
    ])

    const pool = await Promise.all([
      Promise.all(following.slice(0, 50).map((u) => this.storage.getPosts(u.login, { limit }))),
      Promise.all(
        exploreRepos.items.slice(0, 10).map((repo) => this.storage.getPosts(repoOwner(repo), { limit: 20 })),
      ),
    ])

    const all = pool.flat().flat()
    const seen = new Set<string>()
    const unique = all.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))

    const ctx: RankContext = {
      followingLogins: new Set(following.map((u) => u.login)),
      authorStars: Object.fromEntries(
        exploreRepos.items.map((repo) => [repoOwner(repo), repo.stargazers_count]),
      ),
      userTopics: extractTopics(myPosts.map((p) => p.content).join('\n'), 10),
      now: Date.now(),
    }

    return rankForYou(unique, ctx).slice(0, limit)
  }

  async getExplore(): Promise<ExploreData> {
    const [reposRes, usersRes] = await Promise.all([
      this.github.search.searchSocialRepos(30),
      this.github.search.searchUsers('followers:>50'),
    ])

    const recentPosts = await Promise.all(
      reposRes.items.slice(0, 10).map((repo) => this.storage.getPosts(repoOwner(repo), { limit: 10 })),
    )
    const flat = sortPostsDesc(recentPosts.flat())

    return {
      recentPosts: flat.slice(0, 30),
      socialUsers: usersRes.items.slice(0, 10).map((u) => ({
        login: u.login,
        avatar: u.avatar_url,
        followers: 0,
      })),
      trending: trendingTopics(flat, 10),
    }
  }
}
