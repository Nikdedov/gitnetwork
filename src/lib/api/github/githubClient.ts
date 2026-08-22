export class GitHubApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(status: number, message: string, code: string | null = null) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.code = code
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isAuth(): boolean {
    return this.status === 401 || this.status === 403
  }
}

export class RateLimitError extends GitHubApiError {
  readonly resetAt: number

  constructor(resetAt: number) {
    super(403, 'GitHub API rate limit exceeded', 'rate_limit')
    this.name = 'RateLimitError'
    this.resetAt = resetAt
  }
}

export interface RequestOptions {
  query?: Record<string, string | number | undefined>
  body?: unknown
  auth?: boolean
  headers?: Record<string, string>
}

export interface RawResponse<T> {
  status: number
  headers: Headers
  data: T
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface GitHubClientOptions {
  baseUrl?: string
  token?: () => string | null
  fetchImpl?: FetchLike
}

const API_VERSION = '2022-11-28'

export class GitHubClient {
  private readonly baseUrl: string
  private readonly tokenProvider: () => string | null
  private readonly doFetch: FetchLike

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://api.github.com').replace(/\/$/, '')
    this.tokenProvider = options.token ?? (() => null)
    this.doFetch = options.fetchImpl ?? ((input, init) => fetch(input, init))
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    if (!query) return url
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value))
    }
    const qs = params.toString()
    return qs ? `${url}?${qs}` : url
  }

  async raw<T>(method: string, path: string, options: RequestOptions = {}): Promise<RawResponse<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      ...options.headers,
    }
    const token = this.tokenProvider()
    if (token && options.auth !== false) {
      headers['Authorization'] = `Bearer ${token}`
    }

    let body: BodyInit | undefined
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
    }

    const res = await this.doFetch(this.buildUrl(path, options.query), {
      method,
      headers,
      body,
    })

    if (!res.ok) {
      if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
        const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0)
        throw new RateLimitError(reset * 1000)
      }
      let message = `GitHub API error ${res.status}`
      let code: string | null = null
      try {
        const err = (await res.json()) as { message?: string; code?: string }
        if (err.message) message = err.message
        code = err.code ?? null
      } catch {
        // non-JSON error body
      }
      throw new GitHubApiError(res.status, message, code)
    }

    if (res.status === 204) {
      return { status: res.status, headers: res.headers, data: undefined as T }
    }
    const data = (await res.json()) as T
    return { status: res.status, headers: res.headers, data }
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.raw<T>(method, path, options)).data
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options)
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, { ...options, body })
  }

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body })
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options)
  }
}
