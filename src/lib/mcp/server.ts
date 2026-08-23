import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { GitHubClient } from '../api/github/githubClient'
import { SOCIAL_REPO } from '../post'

export type McpResourceType = 'profile' | 'social-graph' | 'posts' | 'ai-memory' | 'ai-decisions' | 'ai-handoffs'

export interface McpResourceDef {
  uri: string
  name: string
  description: string
  type: McpResourceType
}

export const MCP_RESOURCES: McpResourceDef[] = [
  {
    uri: 'gitnetwork://profile',
    name: 'Profile',
    description: 'User profile information',
    type: 'profile',
  },
  {
    uri: 'gitnetwork://social-graph',
    name: 'Social Graph',
    description: 'Following and followers information',
    type: 'social-graph',
  },
  {
    uri: 'gitnetwork://posts',
    name: 'Posts',
    description: 'User posts',
    type: 'posts',
  },
  {
    uri: 'gitnetwork://ai/memory',
    name: 'AI Memory',
    description: 'AI memory context',
    type: 'ai-memory',
  },
  {
    uri: 'gitnetwork://ai/decisions',
    name: 'AI Decisions',
    description: 'AI decisions context',
    type: 'ai-decisions',
  },
  {
    uri: 'gitnetwork://ai/handoffs',
    name: 'AI Handoffs',
    description: 'AI handoffs context',
    type: 'ai-handoffs',
  },
]

export interface McpTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  requiresAuth: boolean
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'get_profile',
    description: 'Get user profile',
    parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] },
    requiresAuth: false,
  },
  {
    name: 'get_post',
    description: 'Get a specific post',
    parameters: { type: 'object', properties: { username: { type: 'string'}, postId: { type: 'string'} }, required: ['username', 'postId'] },
    requiresAuth: false,
  },
  {
    name: 'get_feed',
    description: 'Get user feed',
    parameters: { type: 'object', properties: { username: { type: 'string'}, type: { type: 'string', enum: ['following', 'for-you'] } }, required: ['username', 'type'] },
    requiresAuth: true,
  },
  {
    name: 'get_social_graph',
    description: 'Get social graph (following/followers)',
    parameters: { type: 'object', properties: { username: { type: 'string'} }, required: ['username'] },
    requiresAuth: false,
  },
  {
    name: 'create_post',
    description: 'Create a new post',
    parameters: { type: 'object', properties: { content: { type: 'string'} }, required: ['content'] },
    requiresAuth: true,
  },
  {
    name: 'follow',
    description: 'Follow a user',
    parameters: { type: 'object', properties: { target: { type: 'string'} }, required: ['target'] },
    requiresAuth: true,
  },
  {
    name: 'unfollow',
    description: 'Unfollow a user',
    parameters: { type: 'object', properties: { target: { type: 'string'} }, required: ['target'] },
    requiresAuth: true,
  },
  {
    name: 'get_ai_memory',
    description: 'Get AI memory',
    parameters: { type: 'object', properties: { username: { type: 'string'} }, required: ['username'] },
    requiresAuth: true,
  },
  {
    name: 'save_ai_memory',
    description: 'Save AI memory',
    parameters: { type: 'object', properties: { memory: { type: 'object'} }, required: ['memory'] },
    requiresAuth: true,
  },
]

export class McpServer {
  private server: Server
  private githubClient: GitHubClient
  private token: string | null

  constructor(token: string | null = null) {
    this.token = token
    this.server = new Server(
      {
        name: 'gitnetwork-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      },
    )

    this.githubClient = new GitHubClient({
      token: () => this.token,
    })
  }

  async start() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: MCP_RESOURCES.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
        })),
      }
    })

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.parameters as any,
        })),
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        const result = await this.handleToolCall(name, args || {})
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message || String(error)}` }],
          isError: true,
        }
      }
    })

    console.error('GitNetwork MCP Server running on stdio')
  }

  private async getSocialRepo(username: string): Promise<any | null> {
    try {
      return await this.githubClient.get<any>(`/repos/${encodeURIComponent(username)}/${SOCIAL_REPO}`, { auth: false })
    } catch (err: any) {
      if (err?.status === 404) return null
      throw err
    }
  }

  private async readFileOrNull(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
      const data = await this.githubClient.get<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`)
      return data?.content ? atob(data.content.replace(/\\n/g, '')) : null
    } catch {
      return null
    }
  }

  private async handleToolCall(toolName: string, args: Record<string, any>): Promise<any> {
    switch (toolName) {
      case 'get_profile': {
        const username = args.username
        const user = await this.githubClient.get<any>(`/users/${encodeURIComponent(username)}`, { auth: false })
        const repo = await this.getSocialRepo(username)
        let profileData: any = null
        if (repo) {
          const raw = await this.readFileOrNull(username, SOCIAL_REPO, '.social/profile.json', repo.default_branch)
          if (raw) {
            try { profileData = JSON.parse(raw) } catch {}
          }
        }
        return {
          username: user.login,
          displayName: profileData?.displayName || user.name || user.login,
          bio: profileData?.bio || user.bio || '',
          avatar: profileData?.avatar || user.avatar_url,
          onboarded: repo !== null,
        }
      }

      case 'get_post': {
        const { postId: _postId } = args
        throw new Error('Post retrieval by ID not fully implemented in MCP')
      }

      case 'get_feed': {
        const { username: _username, type } = args
        if (type === 'following') {
          throw new Error('Following feed not implemented in MCP yet')
        }
        throw new Error('For-you feed not implemented in MCP yet')
      }

      case 'get_social_graph': {
        const { username } = args
        const [followersRes, followingRes] = await Promise.all([
          this.githubClient.get<any>(`/users/${encodeURIComponent(username)}/followers?per_page=100`, { auth: false }),
          this.githubClient.get<any>(`/users/${encodeURIComponent(username)}/following?per_page=100`, { auth: false }),
        ])
        return {
          followers: followersRes.data?.map((u: any) => u.login) || [],
          following: followingRes.data?.map((u: any) => u.login) || [],
        }
      }

      case 'create_post': {
        if (!this.token) throw new Error('Authentication required')
        const { content } = args
        const me = await this.githubClient.get<any>('/user')
        let repo = await this.getSocialRepo(me.login)
        if (!repo) {
          repo = await this.githubClient.post<any>('/user/repos', {
            name: SOCIAL_REPO,
            description: 'Personal social profile',
            private: false,
            auto_init: true,
            has_issues: true,
            has_wiki: false,
            has_projects: false,
          })
        }
        const id = 'mcp-post-' + Date.now()
        const path = `posts/${id}.md`
        const fileContent = `---\nid: ${id}\nauthor: ${me.login}\ncreatedAt: ${new Date().toISOString()}\n---\n\n${content}`
        await this.githubClient.post<any>(`/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(SOCIAL_REPO)}/contents/${encodeURIComponent(path)}`, {
          message: `Add post ${id}`,
          content: btoa(fileContent),
          branch: repo.default_branch,
        })
        return { id, path, status: 'created' }
      }

      case 'follow': {
        if (!this.token) throw new Error('Authentication required')
        const { target } = args
        await this.githubClient.put<any>(`/user/following/${encodeURIComponent(target)}`, null, { auth: true })
        return { status: 'followed', target }
      }

      case 'unfollow': {
        if (!this.token) throw new Error('Authentication required')
        const { target } = args
        await this.githubClient.delete<any>(`/user/following/${encodeURIComponent(target)}`, { auth: true })
        return { status: 'unfollowed', target }
      }

      case 'get_ai_memory': {
        const { username } = args
        const repo = await this.getSocialRepo(username)
        if (!repo) return []
        return []
      }

      case 'save_ai_memory': {
        if (!this.token) throw new Error('Authentication required')
        const { memory } = args
        const me = await this.githubClient.get<any>('/user')
        let repo = await this.getSocialRepo(me.login)
        if (!repo) {
          repo = await this.githubClient.post<any>('/user/repos', {
            name: SOCIAL_REPO,
            description: 'Personal social profile',
            private: false,
            auto_init: true,
            has_issues: true,
            has_wiki: false,
            has_projects: false,
          })
        }
        const id = 'memory-' + Date.now()
        const dateStr = new Date().toISOString().split('T')[0]
        const path = `ai/memory/${dateStr}/${id}.json`
        await this.githubClient.post<any>(`/repos/${encodeURIComponent(me.login)}/${encodeURIComponent(SOCIAL_REPO)}/contents/${encodeURIComponent(path)}`, {
          message: `Save AI memory ${id}`,
          content: btoa(JSON.stringify(memory, null, 2)),
          branch: repo.default_branch,
        })
        return { status: 'saved', id }
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }
}

export async function runMcpServer(token: string | null = null) {
  const server = new McpServer(token)
  await server.start()
}
