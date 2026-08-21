import type { GitHubApi } from '../api/github'
import { GitHubApiError } from '../api/github/githubClient'
import type { GitHubUser } from '../api/github/types'

export interface TokenStore {
  get(): string | null
  set(token: string): void
  remove(): void
}

export class SessionTokenStore implements TokenStore {
  private readonly key = 'gitnnetwork.token'
  private memory: string | null = null

  get(): string | null {
    if (this.memory) return this.memory
    try {
      return sessionStorage.getItem(this.key)
    } catch {
      return null
    }
  }

  set(token: string): void {
    this.memory = token
    try {
      sessionStorage.setItem(this.key, token)
    } catch {
      // storage unavailable — memory only
    }
  }

  remove(): void {
    this.memory = null
    try {
      sessionStorage.removeItem(this.key)
    } catch {
      // ignore
    }
  }
}

export class AuthService {
  private readonly github: GitHubApi
  private readonly tokenStore: TokenStore
  private cachedUser: GitHubUser | null = null

  constructor(github: GitHubApi, tokenStore: TokenStore) {
    this.github = github
    this.tokenStore = tokenStore
  }

  get user(): GitHubUser | null {
    return this.cachedUser
  }

  getToken(): string | null {
    return this.tokenStore.get()
  }

  async login(token: string): Promise<GitHubUser> {
    const trimmed = token.trim()
    if (!trimmed) throw new Error('Token cannot be empty')
    this.tokenStore.set(trimmed)
    try {
      this.cachedUser = await this.github.users.me()
    } catch (err) {
      this.tokenStore.remove()
      throw new Error(
        err instanceof GitHubApiError && err.status === 401
          ? 'GitHub rejected this token. Check that it is valid and not expired.'
          : 'Could not verify token with GitHub. Check your connection and try again.',
      )
    }
    return this.cachedUser
  }

  async currentUser(): Promise<GitHubUser | null> {
    if (this.cachedUser) return this.cachedUser
    if (!this.tokenStore.get()) return null
    try {
      this.cachedUser = await this.github.users.me()
    } catch {
      this.logout()
      return null
    }
    return this.cachedUser
  }

  logout(): void {
    this.tokenStore.remove()
    this.cachedUser = null
  }
}
