import type { GitHubClient } from './githubClient'
import type { SearchReposResponse, SearchUsersResponse } from './types'
import { SOCIAL_TOPIC } from '../../post'

export function searchApi(client: GitHubClient) {
  return {
    searchSocialRepos(perPage = 30): Promise<SearchReposResponse> {
      return client.get<SearchReposResponse>('/search/repositories', {
        query: { q: `topic:${SOCIAL_TOPIC}`, sort: 'updated', per_page: perPage },
        auth: false,
      })
    },
    searchUsers(query: string, perPage = 20): Promise<SearchUsersResponse> {
      return client.get<SearchUsersResponse>('/search/users', {
        query: { q: query, per_page: perPage },
        auth: false,
      })
    },
  }
}
