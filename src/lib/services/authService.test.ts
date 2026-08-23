import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService, SessionTokenStore, type TokenStore } from './authService'
import { createMockGitHub, makeUser } from '../api/github/mockGithub'
import { GitHubApiError } from '../api/github/githubClient'

class MemoryTokenStore implements TokenStore {
  private token: string | null = null

  get(): string | null {
    return this.token
  }

  set(token: string): void {
    this.token = token
  }

  remove(): void {
    this.token = null
  }
}

describe('SessionTokenStore', () => {
  let store: SessionTokenStore
  let mockSessionStorage: Record<string, string>

  beforeEach(() => {
    mockSessionStorage = {}
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockSessionStorage[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockSessionStorage[key]
        }),
        clear: vi.fn(() => {
          mockSessionStorage = {}
        }),
      },
      writable: true,
    })
    store = new SessionTokenStore()
  })

  it('stores and retrieves tokens from memory first', () => {
    store.set('test-token-123')
    expect(store.get()).toBe('test-token-123')
  })

  it('falls back to sessionStorage when memory is not set', () => {
    expect(store.get()).toBeNull()
    store.set('test-token-456')
    expect(store.get()).toBe('test-token-456')
  })

  it('removes tokens from both memory and sessionStorage', () => {
    store.set('test-token-789')
    store.remove()
    expect(store.get()).toBeNull()
  })

  it('handles sessionStorage unavailable gracefully', () => {
    const originalSessionStorage = window.sessionStorage
    Object.defineProperty(window, 'sessionStorage', { value: undefined, writable: true })
    const storeNoStorage = new SessionTokenStore()
    storeNoStorage.set('test-token-unavailable')
    expect(storeNoStorage.get()).toBe('test-token-unavailable')
    storeNoStorage.remove()
    expect(storeNoStorage.get()).toBeNull()
    Object.defineProperty(window, 'sessionStorage', { value: originalSessionStorage, writable: true })
  })
})

describe('AuthService', () => {
  let mock: ReturnType<typeof createMockGitHub>
  let tokenStore: MemoryTokenStore
  let authService: AuthService

  beforeEach(() => {
    mock = createMockGitHub()
    mock.state.users['alice'] = makeUser('alice', { name: 'Alice', avatar_url: 'https://avatars.githubusercontent.com/alice' })
    mock.login('alice')
    tokenStore = new MemoryTokenStore()
    authService = new AuthService(mock, tokenStore)
  })

  it('returns null user before login', () => {
    expect(authService.user).toBeNull()
    expect(authService.getToken()).toBeNull()
  })

  it('logs in with a valid token and caches the user', async () => {
    const user = await authService.login('valid-token-123')
    expect(user.login).toBe('alice')
    expect(user.name).toBe('Alice')
    expect(authService.user).toEqual(user)
    expect(authService.getToken()).toBe('valid-token-123')
  })

  it('rejects empty tokens', async () => {
    await expect(authService.login('   ')).rejects.toThrow('Token cannot be empty')
    await expect(authService.login('')).rejects.toThrow('Token cannot be empty')
  })

  it('rejects invalid tokens and removes from store', async () => {
    mock.state.currentLogin = null
    await expect(authService.login('invalid-token')).rejects.toThrow(
      'GitHub rejected this token. Check that it is valid and not expired.',
    )
    expect(authService.getToken()).toBeNull()
    expect(authService.user).toBeNull()
  })

  it('returns cached user on currentUser call', async () => {
    await authService.login('valid-token-123')
    const user = await authService.currentUser()
    expect(user?.login).toBe('alice')
    expect(authService.user).toEqual(user)
  })

  it('returns null on currentUser when no token is set', async () => {
    const user = await authService.currentUser()
    expect(user).toBeNull()
  })

  it('refreshes user on currentUser when token exists but cache is null', async () => {
    tokenStore.set('valid-token-123')
    authService['cachedUser'] = null
    const user = await authService.currentUser()
    expect(user?.login).toBe('alice')
    expect(authService.user).toEqual(user)
  })

  it('clears cache and token on logout', async () => {
    await authService.login('valid-token-123')
    authService.logout()
    expect(authService.user).toBeNull()
    expect(authService.getToken()).toBeNull()
  })

  it('handles expired token on currentUser by logging out', async () => {
    await authService.login('valid-token-123')
    // Clear the cached user to simulate token expiration check
    authService['cachedUser'] = null
    // Simulate token expiration by making users.me fail with 401
    const originalMe = mock.users.me
    mock.users.me = async () => {
      throw new GitHubApiError(401, 'Bad credentials', 'bad_credentials')
    }
    const user = await authService.currentUser()
    expect(user).toBeNull()
    expect(authService.user).toBeNull()
    expect(authService.getToken()).toBeNull()
    // Restore original me
    mock.users.me = originalMe
  })
})
