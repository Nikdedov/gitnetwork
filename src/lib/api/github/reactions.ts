import type { GitHubClient } from './githubClient'
import type { GitHubReaction } from './types'

export const LIKE_CONTENT = 'heart'

export function reactionsApi(client: GitHubClient) {
  return {
    async addLike(owner: string, repo: string, issueNumber: number): Promise<void> {
      await client.post<GitHubReaction>(
        `/repos/${encodeURIComponent(owner)}/${repo}/issues/${issueNumber}/reactions`,
        { content: LIKE_CONTENT },
      )
    },
    async removeLike(owner: string, repo: string, issueNumber: number, login: string): Promise<void> {
      const mine = await this.getMyLike(owner, repo, issueNumber, login)
      if (mine) {
        await client.delete<void>(
          `/repos/${encodeURIComponent(owner)}/${repo}/issues/${issueNumber}/reactions/${mine.id}`,
        )
      }
    },
    async getMyLike(
      owner: string,
      repo: string,
      issueNumber: number,
      login: string,
    ): Promise<GitHubReaction | null> {
      const reactions = await client.get<GitHubReaction[]>(
        `/repos/${encodeURIComponent(owner)}/${repo}/issues/${issueNumber}/reactions`,
        { query: { content: LIKE_CONTENT, per_page: 100 }, auth: false },
      )
      return reactions.find((r) => r.user.login === login) ?? null
    },
  }
}
