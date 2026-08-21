export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  name: string | null
  bio: string | null
  public_repos: number
  followers_url: string
  following_url: string
  html_url: string
  type: string
  site_admin: boolean
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  default_branch: string
  description: string | null
  html_url: string
  stargazers_count: number
  topics: string[]
  has_issues: boolean
  created_at: string
  updated_at: string
  pushed_at: string | null
}

export interface ContentFile {
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  size: number
  name: string
  path: string
  sha: string
  content?: string
  encoding?: string
  download_url: string | null
  html_url: string
}

export interface GitTreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

export interface GitTree {
  sha: string
  url: string
  truncated: boolean
  tree: GitTreeEntry[]
}

export interface IssueReactionsSummary {
  url: string
  total_count: number
  '+1': number
  '-1': number
  laugh: number
  confused: number
  heart: number
  hooray: number
  rocket: number
  eyes: number
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: string
  user: GitHubUser
  labels: { id: number; name: string; color: string }[]
  comments: number
  reactions: IssueReactionsSummary
  created_at: string
  updated_at: string
  html_url: string
}

export interface IssueComment {
  id: number
  body: string
  user: GitHubUser
  created_at: string
  updated_at: string
  html_url: string
}

export interface GitHubReaction {
  id: number
  user: GitHubUser
  content: string
  created_at: string
}

export interface SearchReposResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubRepo[]
}

export interface SearchUsersResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubUser[]
}

export interface RateLimitResource {
  limit: number
  remaining: number
  reset: number
  used: number
}

export interface RateLimit {
  resources: {
    core: RateLimitResource
    search: RateLimitResource
    [key: string]: RateLimitResource
  }
}
