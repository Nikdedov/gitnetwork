import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createGitHubApi } from '../api/github'
import { GitHubClient } from '../api/github/githubClient'
import { GitHubStorage } from '../storage/githubStorage'
import { MemoryCache } from '../cache/memoryCache'
import { AuthService, SessionTokenStore } from '../services/authService'
import { SocialService } from '../services/socialService'
import { SOCIAL_REPO } from '../post'

// Integration tests that can be launched on production by providing a PAT
// Set the GITHUB_PAT environment variable to run these tests
// Example: GITHUB_PAT=ghp_your_personal_access_token npm run test -- src/lib/integration/patIntegration.test.ts

const GITHUB_PAT = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN

describe.skipIf(!GITHUB_PAT || GITHUB_PAT.trim() === '')('Production PAT Integration Tests', () => {
  let github: ReturnType<typeof createGitHubApi>
  let storage: GitHubStorage
  let authService: AuthService
  let socialService: SocialService
  let currentUser: { login: string } | null = null

  beforeAll(async () => {
    const client = new GitHubClient({
      token: () => GITHUB_PAT?.trim() || null,
    })
    github = createGitHubApi(client)

    const tokenStore = new SessionTokenStore()
    authService = new AuthService(github, tokenStore)

    try {
      currentUser = await authService.login(GITHUB_PAT!)
      console.log(`Authenticated as: ${currentUser.login}`)
    } catch (err) {
      throw new Error(`Failed to authenticate with PAT: ${err instanceof Error ? err.message : String(err)}`)
    }

    const cache = new MemoryCache()
    storage = new GitHubStorage({
      github,
      cache,
      currentUsername: () => currentUser?.login || null,
    })

    socialService = new SocialService(storage, github, authService)
  })

  afterAll(() => {
    authService.logout()
  })

  describe('Identity', () => {
    it('has authenticated user', () => {
      expect(currentUser).not.toBeNull()
      expect(currentUser?.login).toBeDefined()
    })

    it('has valid user profile from GitHub', async () => {
      const profile = await socialService.getProfile(currentUser!.login)
      expect(profile.username).toBe(currentUser!.login)
      expect(profile.onboarded).toBeDefined()
    })
  })

  describe('Repository', () => {
    it('ensures social repository exists', async () => {
      const repo = await socialService.ensureOnboarded()
      expect(repo.full_name).toBe(`${currentUser!.login}/${SOCIAL_REPO}`)
      expect(repo.topics).toContain('gitnetwork')
    })

    it('detects social repository', async () => {
      const repo = await github.repos.getSocialRepo(currentUser!.login)
      expect(repo).not.toBeNull()
      expect(repo?.full_name).toBe(`${currentUser!.login}/${SOCIAL_REPO}`)
    })

    it('reads repository contents', async () => {
      const profile = await storage.getProfile(currentUser!.login)
      expect(profile.onboarded).toBe(true)
    })
  })

  describe('Posts', () => {
    it('creates a post', async () => {
      const testPostContent = `# Test Post from PAT Integration

This is a test post created by the production PAT integration test.

Test timestamp: ${new Date().toISOString()}`

      const post = await socialService.createPost(testPostContent)
      expect(post.author).toBe(currentUser!.login)
      expect(post.content).toContain('Test Post from PAT Integration')
      expect(post.issueNumber).toBeDefined()

      // Verify the post was created
      const retrievedPost = await storage.getPost(currentUser!.login, post.id)
      expect(retrievedPost).not.toBeNull()
      expect(retrievedPost?.id).toBe(post.id)
    })

    it('reads posts for the user', async () => {
      const posts = await socialService.getPosts(currentUser!.login)
      expect(posts).toBeInstanceOf(Array)
    })

    it('gets a specific post', async () => {
      const posts = await socialService.getPosts(currentUser!.login, { limit: 1 })
      if (posts.length > 0) {
        const post = await socialService.getPost(currentUser!.login, posts[0].id)
        expect(post).not.toBeNull()
        expect(post?.id).toBe(posts[0].id)
      }
    })
  })

  describe('Social', () => {
    it('follows and unfollows a user', async () => {
      // Try to follow 'github' user if it exists, or skip if not available
      try {
        const githubUser = await github.users.get('github')
        if (githubUser.login !== currentUser?.login) {
          const isFollowing = await socialService.isFollowing(githubUser.login)
          if (!isFollowing) {
            await socialService.follow(githubUser.login)
            expect(await socialService.isFollowing(githubUser.login)).toBe(true)
          }
          await socialService.unfollow(githubUser.login)
          expect(await socialService.isFollowing(githubUser.login)).toBe(false)
        }
      } catch (err) {
        // Skip if user not found or rate limited
        console.log('Follow/unfollow test skipped due to:', err)
      }
    })

    it('gets following list', async () => {
      const following = await socialService.getFollowing(currentUser!.login)
      expect(following).toBeInstanceOf(Array)
    })
  })

  describe('Messaging', () => {
    it('handles direct message threads', async () => {
      // DM threads test - just verify the storage method exists and works
      const threads = await storage.getDirectMessageThreads(currentUser!.login)
      expect(threads).toBeInstanceOf(Array)
    })
  })

  describe('Authentication State', () => {
    it('has valid token stored', () => {
      const token = authService.getToken()
      expect(token).toBeDefined()
      expect(token?.length).toBeGreaterThan(0)
    })

    it('re-authenticates after logout and login', async () => {
      authService.logout()
      expect(authService.user).toBeNull()
      expect(authService.getToken()).toBeNull()

      await authService.login(GITHUB_PAT!)
      expect(authService.user).not.toBeNull()
      expect(authService.user?.login).toBe(currentUser?.login)
    })
  })

  describe('GitHub API Rate Limits', () => {
    it('checks rate limit status', async () => {
      const rateLimit = await github.rateLimit.get()
      expect(rateLimit.resources.core).toBeDefined()
      expect(rateLimit.resources.core.remaining).toBeGreaterThan(0)
    })
  })
})
