import type { GitHubClient } from './githubClient'
import { usersApi } from './users'
import { repositoriesApi } from './repositories'
import { contentsApi } from './contents'
import { issuesApi } from './issues'
import { reactionsApi } from './reactions'
import { followingApi } from './following'
import { searchApi } from './search'
import { rateLimitApi } from './rateLimit'

export interface GitHubApi {
  client: GitHubClient
  users: ReturnType<typeof usersApi>
  repos: ReturnType<typeof repositoriesApi>
  contents: ReturnType<typeof contentsApi>
  issues: ReturnType<typeof issuesApi>
  reactions: ReturnType<typeof reactionsApi>
  following: ReturnType<typeof followingApi>
  search: ReturnType<typeof searchApi>
  rateLimit: ReturnType<typeof rateLimitApi>
}

export function createGitHubApi(client: GitHubClient): GitHubApi {
  return {
    client,
    users: usersApi(client),
    repos: repositoriesApi(client),
    contents: contentsApi(client),
    issues: issuesApi(client),
    reactions: reactionsApi(client),
    following: followingApi(client),
    search: searchApi(client),
    rateLimit: rateLimitApi(client),
  }
}

export type { GitHubClient, GitHubApiError, RateLimitError, FetchLike } from './githubClient'
