import type { GitHubClient } from './githubClient'
import type { RateLimit } from './types'

export function rateLimitApi(client: GitHubClient) {
  return {
    get(): Promise<RateLimit> {
      return client.get<RateLimit>('/rate_limit', { auth: false })
    },
  }
}
