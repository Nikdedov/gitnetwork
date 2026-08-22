# GitHub API and Authentication Limitations

## Critical finding: OAuth token exchange is NOT possible from a pure static browser application

Both OAuth flows that GitHub offers end with a `POST` to
`https://github.com/login/oauth/access_token` to exchange a code/device_code for an
access token.

GitHub currently supports PKCE for OAuth Apps and GitHub Apps. PKCE support was added on July 14, 2025 and GitHub recommends using it with authorization-code authentication.

However, GitHub's current OAuth documentation still specifies that the authorization-code exchange uses:

```text
POST https://github.com/login/oauth/access_token
```

and requires:

```text
client_id
client_secret
code
code_verifier
```

when PKCE is used.

GitHub also currently documents that CORS preflight requests are not supported for the OAuth endpoints.

Therefore:

```text
Static GitHub Pages
        ↓
GitHub OAuth authorization
        ↓
authorization code
        ↓
browser POST to token endpoint
        ↓
BLOCKED by browser CORS
```

cannot currently be treated as a guaranteed pure-browser OAuth implementation.

Do NOT work around this by:

* exposing a real client secret and pretending it is secret;
* disabling browser security;
* using a public CORS proxy;
* using an arbitrary third-party OAuth proxy;
* creating a hidden centralized GitNetwork backend;
* storing the client secret in an encrypted JavaScript file.

## Pluggable Authentication Architecture

To support both the current OAuth limitation and future GitHub authentication improvements, GitNetwork implements a pluggable authentication abstraction:

```typescript
interface AuthProvider {
  login(): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getAccessToken(): string | null;
  isAuthenticated(): boolean;
}
```

Implementation:

```text
GitHubAuthProvider
```

The rest of GitNetwork MUST NOT know whether authentication is implemented using:

* OAuth;
* GitHub App authorization;
* another future GitHub-supported browser mechanism;
* temporary development authentication.

This is critical because GitHub may add fully browser-compatible token exchange in the future.

## Authentication Capability Detection

The application MUST detect which authentication mechanism is actually available.

Create:

```text
AuthCapabilityDetector
```

It should determine:

```typescript
interface AuthCapabilities {
  oauth: boolean;
  pat: boolean;
}
```

Do not blindly execute an OAuth flow that is known to fail because of browser CORS.

If the deployed static environment cannot complete the OAuth exchange, show:

```text
GitHub authentication requires an additional step in this deployment.
```

and provide the PAT fallback.

## PAT Fallback

Because GitHub's current OAuth token endpoint is not browser-CORS compatible, implement a temporary PAT fallback.

PAT requirements:

* token exists only in browser memory whenever possible;
* never send it to GitNetwork infrastructure;
* never commit it;
* never write it to a repository;
* never log it;
* never send it to analytics;
* never place it in a URL.

If session persistence is necessary, use `sessionStorage`, not `localStorage`, and document the security implications.

The PAT UI should say:

```text
GitHub OAuth is unavailable in this static deployment.
You can alternatively connect using a GitHub Personal Access Token.
```

Do not call this OAuth.

## GitHub OAuth Implementation (Future-Proof)

Implement GitHub OAuth using the current authorization-code + PKCE specification so that GitNetwork is ready for a future fully browser-compatible GitHub token exchange.

Generate:

```text
state
code_verifier
code_challenge
```

Use:

```text
code_challenge_method=S256
```

GitHub currently supports and recommends PKCE.

Store only temporary OAuth state:

```text
state
code_verifier
```

in:

```text
sessionStorage
```

or equivalent short-lived browser storage.

Never store the GitHub client secret in a secure-looking frontend variable.

A value shipped with the JavaScript application is public.

## GitHub API Support Matrix

| Feature | GitHub API support | Browser-only possible | Implementation | Limitation |
|---|---|---|---|---|
| Login (OAuth web flow) | `GET /login/oauth/authorize` + `POST /login/oauth/access_token` (PKCE params supported) | NO — token endpoint requires client_secret and sends no CORS headers | Pluggable AuthProvider with OAuth + PAT fallback | User must use PAT if OAuth token exchange fails |
| Login (GitHub App web flow) | GitHub Apps browser flow supported | NO — same CORS limitation for token exchange | Evaluated but not implemented as primary | Same CORS limitation |
| Current user | `GET /user` | Yes (CORS on api.github.com) | `GitHubApiClient.getAuthenticatedUser()` | Requires valid token |
| Create social repository | `POST /user/repos` (`name`, `description`, `private:false`, `auto_init:true`); scopes `public_repo`/`repo` | Yes | `GitHubApiClient.createRepository()` | Token needs `repo` (or `public_repo`) scope |
| Detect social repository | `GET /repos/{username}/social` (200/404) | Yes | `GitHubApiClient.getRepository()` | 404 = not onboarded |
| Create/update file (post) | `PUT /repos/{owner}/{repo}/contents/{path}` (base64 `content`, `message`, `branch`; `sha` required for updates) | Yes | `GitHubApiClient.createOrUpdateFile()` | 100 MB API limit; MVP caps posts at 5000 chars, images at 10 MB |
| Read file | `GET /repos/{owner}/{repo}/contents/{path}` (returns `sha` + base64 `content` for files ≤ 1 MB) | Yes | `GitHubApiClient.getContents()` | Files > 1 MB only via `raw` media type (not needed for MVP text posts) |
| List all post files | `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` | Yes | One request returns all `posts/...` paths | Tree limit 100k entries / 7 MB — far above MVP needs; file contents still fetched per file |
| Upload image | `PUT /repos/{owner}/{repo}/contents/media/{postId}/{file}` (base64) | Yes | `GitHubApiClient.createOrUpdateFile()` + media validation | MVP: JPG/PNG/WebP, ≤ 10 MB; raw URL via `raw.githubusercontent.com` |
| Likes | Reactions exist on issues/comments, NOT on repository files | Yes (via issue per post) | Each post gets a backing issue; like = `heart` reaction on the issue (`POST /repos/{o}/{r}/issues/{n}/reactions`) | Reaction requires auth; issue object already carries `reactions.heart` count |
| Comments | `POST/GET /repos/{o}/{r}/issues/{n}/comments` | Yes | Issue comments on the backing issue | Requires auth to write; public read works unauthenticated |
| Post ↔ issue mapping | n/a (our convention) | Yes | Issue title = `[post] <postId>`, label `post`; looked up via `GET /repos/{o}/{r}/issues?labels=post` | Issue numbers are GitHub-internal; business ID stays the ULID in the file |
| Follow | `PUT /user/following/{username}` (Content-Length: 0), scope `user:follow` | Yes | `GitHubApiClient.followUser()` | Token needs `user:follow` scope |
| Unfollow | `DELETE /user/following/{username}` | Yes | `GitHubApiClient.unfollowUser()` | Same |
| Check following | `GET /user/following/{username}` → 204/404 (also `GET /users/{u}/following/{t}`) | Yes | `GitHubApiClient` following checks | — |
| List following | `GET /user/following` (paginated, max 100/page) | Yes | `GitHubApiClient` | — |
| Followers count | `GET /users/{username}` → `public_repos`, `followers_url`; count via `GET /users/{username}/followers?per_page=1` → `Link` header `page 1; rel="last"` | Yes (public, no auth) | user profile | Count parsed from `Link` header (no dedicated count endpoint) |
| User profile data | `GET /users/{username}` (public) | Yes, no auth needed | `GitHubApiClient` | GitHub data only; social metadata from `.social/profile.json` |
| Rate limits | `GET /rate_limit`; core: 5000 req/h auth, 60 req/h unauth; search: 30/10 per min | Yes | Client reads `x-ratelimit-*` headers, surfaces 403/429 | Heavy feeds (100 posts = ~100 file fetches) consume core quota; mitigated by IndexedDB cache (5 min TTL) |
| GraphQL | `POST https://api.github.com/graphql` (CORS ok) | Yes | Not used in MVP | REST covers all MVP needs; GitHub API client uses REST |

## Data model on GitHub (per user)

```
<username>/social            # public repo, topic: gitnetwork
├── .social/
│   └── profile.json         # social metadata (displayName, bio, avatar, ...)
├── posts/
│   └── YYYY/MM/DD/<ulid>.md # post = markdown file with YAML frontmatter
├── media/
│   └── <ulid>/<file>        # post images
└── README.md
Issues:
  #N  [post] <ulid>          # interaction layer: heart reactions = likes,
      label: post            #     issue comments = comments
```

## Security notes

- No client secret anywhere in the frontend (PAT flow needs no secret at all).
- `api.github.com` is the only network origin the app talks to (plus
  `raw.githubusercontent.com` / `avatars.githubusercontent.com` for media/images).
- Markdown is rendered with `marked` and sanitized with `DOMPurify`; raw HTML in
  posts is never executed.
- CSP meta tag in `index.html`.
- Token: memory + sessionStorage only; never written to any file, repo, or
  third-party endpoint.
- Never log: `access_token`, `refresh_token`, `PAT`, `client_secret`, `code_verifier`.
- Never put access tokens into: query parameters, hash fragments, pathname.
- Do not send authentication information to analytics systems.
