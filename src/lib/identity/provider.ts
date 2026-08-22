import type { GitHubUser } from '../api/github/types'

export type IdentityProviderType = 'github' | 'gitlab' | 'codeberg' | 'local-git'

export interface IdentityProvider {
  type: IdentityProviderType
  getIdentity(username: string): Promise<Identity>
  verifyIdentity(identity: Identity): Promise<boolean>
}

export interface Identity {
  provider: IdentityProviderType
  username: string
  displayName?: string
  avatar?: string
  createdAt?: string
  metadata?: Record<string, unknown>
}

export interface GitHubIdentityProvider {
  type: 'github'
  getIdentity(username: string, githubUser: GitHubUser): Identity
  verifyIdentity(username: string, githubUser: GitHubUser): boolean
}

export function createGitHubIdentityProvider(): GitHubIdentityProvider {
  return {
    type: 'github',
    getIdentity(username: string, githubUser: GitHubUser): Identity {
      return {
        provider: 'github',
        username: githubUser.login || username,
        displayName: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        metadata: {
          bio: githubUser.bio,
          public_repos: githubUser.public_repos,
          followers_url: githubUser.followers_url,
          following_url: githubUser.following_url,
        },
      }
    },
    verifyIdentity(username: string, githubUser: GitHubUser): boolean {
      return (githubUser.login || username) === username
    },
  }
}
