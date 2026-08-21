import { createGitHubApi, type FetchLike, type GitHubApi } from './api/github'
import { GitHubClient } from './api/github/githubClient'
import { IndexedDbCache } from './cache/indexedDbCache'
import type { CacheStorage } from './cache/cacheStorage'
import { GitHubStorage } from './storage/githubStorage'
import { AuthService, SessionTokenStore, type TokenStore } from './services/authService'
import { SocialService } from './services/socialService'

export interface App {
  client: GitHubClient
  github: GitHubApi
  cache: CacheStorage
  storage: GitHubStorage
  auth: AuthService
  social: SocialService
}

export interface AppOptions {
  fetchImpl?: FetchLike
  cache?: CacheStorage
  tokenStore?: TokenStore
}

export function createApp(options: AppOptions = {}): App {
  const tokenStore = options.tokenStore ?? new SessionTokenStore()
  const client = new GitHubClient({
    token: () => tokenStore.get(),
    fetchImpl: options.fetchImpl,
  })
  const github = createGitHubApi(client)
  const cache = options.cache ?? new IndexedDbCache()
  let auth: AuthService
  const storage = new GitHubStorage({
    github,
    cache,
    currentUsername: () => auth.user?.login ?? null,
  })
  auth = new AuthService(github, tokenStore)
  const social = new SocialService(storage, github, auth)
  return { client, github, cache, storage, auth, social }
}
