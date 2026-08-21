import type { GitHubClient } from './githubClient'
import type { GitHubUser } from './types'

export function usersApi(client: GitHubClient) {
  return {
    me(): Promise<GitHubUser> {
      return client.get<GitHubUser>('/user')
    },
    get(login: string): Promise<GitHubUser> {
      return client.get<GitHubUser>(`/users/${encodeURIComponent(login)}`, { auth: false })
    },
    async followersCount(login: string): Promise<number> {
      return countFromLinkHeader(
        await client.raw<unknown>(
          'GET',
          `/users/${encodeURIComponent(login)}/followers`,
          { query: { per_page: 1, page: 1 }, auth: false },
        ),
      )
    },
    async followingCount(login: string): Promise<number> {
      return countFromLinkHeader(
        await client.raw<unknown>(
          'GET',
          `/users/${encodeURIComponent(login)}/following`,
          { query: { per_page: 1, page: 1 }, auth: false },
        ),
      )
    },
  }
}

function countFromLinkHeader(res: { headers: Headers }): number {
  const link = res.headers.get('Link')
  if (!link) return 0
  const match = link.match(/[?&]page=(\d+)[^,]*rel="last"/)
  return match ? Number(match[1]) : 0
}
