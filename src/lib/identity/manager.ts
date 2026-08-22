import type { Identity, IdentityProvider, IdentityProviderType } from './provider'
import type { GitHubUser } from '../api/github/types'
import { createGitHubIdentityProvider } from './provider'

export interface IdentityManager {
  getCurrentIdentity(): Identity | null
  setCurrentIdentity(identity: Identity): void
  getProvider(type: IdentityProviderType): IdentityProvider | null
  registerProvider(type: IdentityProviderType, provider: IdentityProvider): void
  getIdentityFromGitHub(username: string, githubUser: GitHubUser): Promise<Identity>
  verifyGitHubIdentity(username: string, githubUser: GitHubUser): Promise<boolean>
}

export class DefaultIdentityManager implements IdentityManager {
  private currentIdentity: Identity | null = null
  private providers: Map<IdentityProviderType, IdentityProvider> = new Map()

  constructor() {
    // Register GitHub provider by default
    const githubProvider: IdentityProvider = {
      type: 'github',
      getIdentity: async (_username: string) => {
        throw new Error('GitHub getIdentity requires GitHubUser')
      },
      verifyIdentity: async () => false,
    }
    this.registerProvider('github', githubProvider)
  }

  getCurrentIdentity(): Identity | null {
    return this.currentIdentity
  }

  setCurrentIdentity(identity: Identity): void {
    this.currentIdentity = identity
  }

  getProvider(type: IdentityProviderType): IdentityProvider | null {
    return this.providers.get(type) || null
  }

  registerProvider(type: IdentityProviderType, provider: IdentityProvider): void {
    this.providers.set(type, provider)
  }

  async getIdentityFromGitHub(username: string, githubUser: GitHubUser): Promise<Identity> {
    const provider = this.getProvider('github')
    if (!provider) {
      throw new Error('GitHub identity provider not registered')
    }
    // For GitHub, we use the specific provider implementation
    const githubProvider = createGitHubIdentityProvider()
    return githubProvider.getIdentity(username, githubUser)
  }

  async verifyGitHubIdentity(username: string, githubUser: GitHubUser): Promise<boolean> {
    const githubProvider = createGitHubIdentityProvider()
    return githubProvider.verifyIdentity(username, githubUser)
  }
}

export const identityManager = new DefaultIdentityManager()
