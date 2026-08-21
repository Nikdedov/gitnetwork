import type { GitHubClient } from './githubClient'
import type { GitHubIssue, IssueComment } from './types'
import { POST_LABEL } from '../../post'

export function postIssueTitle(postId: string): string {
  return `[post] ${postId}`
}

export function postIdFromIssueTitle(title: string): string | null {
  const match = title.match(/^\[post\]\s+([0-9A-HJKMNP-TV-Z]{26})$/)
  return match ? match[1] : null
}

export function issuesApi(client: GitHubClient) {
  return {
    createPostIssue(owner: string, repo: string, postId: string, body: string): Promise<GitHubIssue> {
      return client.post<GitHubIssue>(`/repos/${encodeURIComponent(owner)}/${repo}/issues`, {
        title: postIssueTitle(postId),
        body,
        labels: [POST_LABEL],
      })
    },
    async listPostIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
      const issues = await client.get<GitHubIssue[]>(`/repos/${encodeURIComponent(owner)}/${repo}/issues`, {
        query: { labels: POST_LABEL, state: 'open', per_page: 100, direction: 'desc' },
        auth: false,
      })
      return issues.filter((issue) => postIdFromIssueTitle(issue.title) !== null)
    },
    async getPostIssue(owner: string, repo: string, postId: string): Promise<GitHubIssue | null> {
      const issues = await this.listPostIssues(owner, repo)
      return issues.find((issue) => postIdFromIssueTitle(issue.title) === postId) ?? null
    },
    getComments(owner: string, repo: string, issueNumber: number): Promise<IssueComment[]> {
      return client.get<IssueComment[]>(
        `/repos/${encodeURIComponent(owner)}/${repo}/issues/${issueNumber}/comments`,
        { query: { per_page: 100, direction: 'asc' }, auth: false },
      )
    },
    addComment(owner: string, repo: string, issueNumber: number, body: string): Promise<IssueComment> {
      return client.post<IssueComment>(
        `/repos/${encodeURIComponent(owner)}/${repo}/issues/${issueNumber}/comments`,
        { body },
      )
    },
  }
}
