export class GitHubApiError extends Error {
    status;
    code;
    constructor(status, message, code = null) {
        super(message);
        this.name = 'GitHubApiError';
        this.status = status;
        this.code = code;
    }
    get isNotFound() {
        return this.status === 404;
    }
    get isAuth() {
        return this.status === 401 || this.status === 403;
    }
}
export class RateLimitError extends GitHubApiError {
    resetAt;
    constructor(resetAt) {
        super(403, 'GitHub API rate limit exceeded', 'rate_limit');
        this.name = 'RateLimitError';
        this.resetAt = resetAt;
    }
}
const API_VERSION = '2022-11-28';
export class GitHubClient {
    baseUrl;
    tokenProvider;
    doFetch;
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl ?? 'https://api.github.com').replace(/\/$/, '');
        this.tokenProvider = options.token ?? (() => null);
        this.doFetch = options.fetchImpl ?? ((input, init) => fetch(input, init));
    }
    buildUrl(path, query) {
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        if (!query)
            return url;
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined)
                params.set(key, String(value));
        }
        const qs = params.toString();
        return qs ? `${url}?${qs}` : url;
    }
    async raw(method, path, options = {}) {
        const headers = {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': API_VERSION,
            ...options.headers,
        };
        const token = this.tokenProvider();
        if (token && options.auth !== false) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        let body;
        if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }
        const res = await this.doFetch(this.buildUrl(path, options.query), {
            method,
            headers,
            body,
        });
        if (!res.ok) {
            if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
                const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0);
                throw new RateLimitError(reset * 1000);
            }
            let message = `GitHub API error ${res.status}`;
            let code = null;
            try {
                const err = (await res.json());
                if (err.message)
                    message = err.message;
                code = err.code ?? null;
            }
            catch {
                // non-JSON error body
            }
            throw new GitHubApiError(res.status, message, code);
        }
        if (res.status === 204) {
            return { status: res.status, headers: res.headers, data: undefined };
        }
        const data = (await res.json());
        return { status: res.status, headers: res.headers, data };
    }
    async request(method, path, options = {}) {
        return (await this.raw(method, path, options)).data;
    }
    get(path, options = {}) {
        return this.request('GET', path, options);
    }
    post(path, body, options = {}) {
        return this.request('POST', path, { ...options, body });
    }
    put(path, body, options = {}) {
        return this.request('PUT', path, { ...options, body });
    }
    delete(path, options = {}) {
        return this.request('DELETE', path, options);
    }
}
