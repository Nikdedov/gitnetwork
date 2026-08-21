import type { GitHubClient } from './githubClient'
import type { GitHubRepo } from './types'
import { SOCIAL_REPO, SOCIAL_TOPIC } from '../../post'

export function repositoriesApi(client: GitHubClient) {
  return {
    async getSocialRepo(username: string): Promise<GitHubRepo | null> {
      try {
        return await client.get<GitHubRepo>(`/repos/${encodeURIComponent(username)}/${SOCIAL_REPO}`, {
          auth: false,
        })
      } catch (err) {
        if (isNotFound(err)) return null
        throw err
      }
    },
    getRepo(owner: string, repo: string): Promise<GitHubRepo> {
      return client.get<GitHubRepo>(`/repos/${encodeURIComponent(owner)}/${repo}`, { auth: false })
    },
    createSocialRepo(): Promise<GitHubRepo> {
      return client.post<GitHubRepo>('/user/repos', {
        name: SOCIAL_REPO,
        description: 'Personal social profile',
        private: false,
        auto_init: true,
        has_issues: true,
        has_wiki: false,
        has_projects: false,
      })
    },
    addTopics(owner: string, repo: string, topics: string[]): Promise<void> {
      return client.put<void>(`/repos/${encodeURIComponent(owner)}/${repo}/topics`, {
        names: topics.join(' '),
      })
    },
    async ensureTopic(owner: string, repo: string, topic: string = SOCIAL_TOPIC): Promise<void> {
      const current = await this.getRepo(owner, repo)
      if (current.topics.includes(topic)) return
      await this.addTopics(owner, repo, [...current.topics, topic])
    },
  }
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && (err as { status?: number }).status === 404
}
