import type { GitHubClient } from './githubClient'
import type { GitHubUser } from './types'

export function followingApi(client: GitHubClient) {
  return {
    async listMine(): Promise<GitHubUser[]> {
      return collectPages((page) =>
        client.get<GitHubUser[]>('/user/following', { query: { per_page: 100, page } }),
      )
    },
    async listOf(username: string): Promise<GitHubUser[]> {
      return collectPages((page) =>
        client.get<GitHubUser[]>(`/users/${encodeURIComponent(username)}/following`, {
          query: { per_page: 100, page },
          auth: false,
        }),
      )
    },
    async isFollowing(target: string): Promise<boolean> {
      const res = await client.raw<unknown>('GET', `/user/following/${encodeURIComponent(target)}`)
      return res.status === 204
    },
    async follow(target: string): Promise<void> {
      await client.put<void>(`/user/following/${encodeURIComponent(target)}`, '')
    },
    async unfollow(target: string): Promise<void> {
      await client.delete<void>(`/user/following/${encodeURIComponent(target)}`)
    },
  }
}

async function collectPages<T>(fetchPage: (page: number) => Promise<T[]>): Promise<T[]> {
  const all: T[] = []
  let page = 1
  for (;;) {
    const items = await fetchPage(page)
    all.push(...items)
    if (items.length < 100) break
    page += 1
    if (page > 100) break
  }
  return all
}
