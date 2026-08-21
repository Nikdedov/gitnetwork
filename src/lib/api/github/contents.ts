import type { GitHubClient } from './githubClient'
import type { ContentFile, GitTree } from './types'
import { base64ToUtf8, utf8ToBase64 } from '../../media'

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function contentsApi(client: GitHubClient) {
  return {
    getFile(owner: string, repo: string, path: string, ref?: string): Promise<ContentFile> {
      return client.get<ContentFile>(`/repos/${encodeURIComponent(owner)}/${repo}/contents/${encodePath(path)}`, {
        query: { ref },
        auth: false,
      })
    },
    async readFile(owner: string, repo: string, path: string, ref?: string): Promise<string> {
      const file = await this.getFile(owner, repo, path, ref)
      if (file.content === undefined) {
        throw new Error(`File content not available (too large?): ${path}`)
      }
      return base64ToUtf8(file.content)
    },
    async readFileOrNull(owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
      try {
        return await this.readFile(owner, repo, path, ref)
      } catch (err) {
        if (err instanceof Error && (err as { status?: number }).status === 404) return null
        throw err
      }
    },
    createFile(
      owner: string,
      repo: string,
      path: string,
      content: string,
      message: string,
      branch?: string,
    ): Promise<ContentFile> {
      return client.put<ContentFile>(
        `/repos/${encodeURIComponent(owner)}/${repo}/contents/${encodePath(path)}`,
        { message, content: utf8ToBase64(content), branch },
      )
    },
    updateFile(
      owner: string,
      repo: string,
      path: string,
      content: string,
      message: string,
      sha: string,
      branch?: string,
    ): Promise<ContentFile> {
      return client.put<ContentFile>(
        `/repos/${encodeURIComponent(owner)}/${repo}/contents/${encodePath(path)}`,
        { message, content: utf8ToBase64(content), sha, branch },
      )
    },
    createBinaryFile(
      owner: string,
      repo: string,
      path: string,
      base64Content: string,
      message: string,
      branch?: string,
    ): Promise<ContentFile> {
      return client.put<ContentFile>(
        `/repos/${encodeURIComponent(owner)}/${repo}/contents/${encodePath(path)}`,
        { message, content: base64Content, branch },
      )
    },
    listTree(owner: string, repo: string, ref: string, recursive = true): Promise<GitTree> {
      return client.get<GitTree>(`/repos/${encodeURIComponent(owner)}/${repo}/git/trees/${encodeURIComponent(ref)}`, {
        query: { recursive: recursive ? 1 : undefined },
        auth: false,
      })
    },
  }
}
