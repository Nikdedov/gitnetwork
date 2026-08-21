# GitHub API Limitations Analysis

Research performed before implementation (per AGENTS.md §35).
Sources: official GitHub REST API docs, GitHub REST API OpenAPI description, and live
empirical verification of CORS headers on `github.com` OAuth endpoints (curl, Aug 2026).

## Critical finding: OAuth token exchange is NOT possible from a browser

Both OAuth flows that GitHub offers end with a `POST` to
`https://github.com/login/oauth/access_token` to exchange a code/device_code for an
access token.

Empirical test (curl with `Origin: http://localhost:5173`):

```
POST https://github.com/login/oauth/access_token   (form-encoded, device grant)
  -> HTTP 200 {"error":"slow_down",...}   # request reached the real handler
  -> response contains NO Access-Control-Allow-Origin header

POST https://github.com/login/device/code
  -> response contains NO Access-Control-Allow-Origin header
```

Without `Access-Control-Allow-Origin`, the browser blocks the response for any
cross-origin `fetch()`. GitHub Pages (`*.github.io`) is a different origin from
`github.com`, so **no OAuth flow can complete token exchange inside a pure
client-side app**. A backend (or user-visible copy/paste workaround) would be
required, which AGENTS.md forbids.

Consequences:

- **MVP authentication = GitHub Personal Access Token (PAT)** entered by the user.
  A PAT is GitHub's own credential (not a custom auth system), works fully
  client-side, and `api.github.com` supports CORS for all REST endpoints.
- Token is kept in browser memory + `sessionStorage` (cleared when the tab closes).
  It is never committed, never sent to any third party, never used in analytics.
- OAuth (device flow / PKCE web flow) is documented as a roadmap item, to be
  enabled if GitHub adds CORS to the token endpoint or the app gains an optional
  local helper.

## Feature matrix

| Feature | GitHub API support | Browser-only possible | MVP implementation | Limitation |
|---|---|---|---|---|
| Login (OAuth web flow) | `GET /login/oauth/authorize` + `POST /login/oauth/access_token` (PKCE params supported) | NO — token endpoint sends no CORS headers | PAT paste-in login | User must create a PAT in GitHub settings; OAuth documented as limitation |
| Login (OAuth device flow) | `POST /login/device/code` + poll `POST /login/oauth/access_token`; must be enabled in app settings; no client_secret | NO — both endpoints send no CORS headers | Not implemented | Same CORS limitation; roadmap item |
| Current user | `GET /user` | Yes (CORS on api.github.com) | `githubClient` + auth service | Requires valid token |
| Create social repository | `POST /user/repos` (`name`, `description`, `private:false`, `auto_init:true`); scopes `public_repo`/`repo` | Yes | Onboarding service | Token needs `repo` (or `public_repo`) scope |
| Detect social repository | `GET /repos/{username}/social` (200/404) | Yes | Onboarding + profile | 404 = not onboarded |
| Create/update file (post) | `PUT /repos/{owner}/{repo}/contents/{path}` (base64 `content`, `message`, `branch`; `sha` required for updates) | Yes | `contents.ts` | 100 MB API limit; MVP caps posts at 5000 chars, images at 10 MB |
| Read file | `GET /repos/{owner}/{repo}/contents/{path}` (returns `sha` + base64 `content` for files ≤ 1 MB) | Yes | `contents.ts` | Files > 1 MB only via `raw` media type (not needed for MVP text posts) |
| List all post files | `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` | Yes | One request returns all `posts/...` paths | Tree limit 100k entries / 7 MB — far above MVP needs; file contents still fetched per file |
| Upload image | `PUT /repos/{owner}/{repo}/contents/media/{postId}/{file}` (base64) | Yes | `contents.ts` + media validation | MVP: JPG/PNG/WebP, ≤ 10 MB; raw URL via `raw.githubusercontent.com` |
| Likes | Reactions exist on issues/comments, NOT on repository files | Yes (via issue per post) | Each post gets a backing issue; like = `heart` reaction on the issue (`POST /repos/{o}/{r}/issues/{n}/reactions`) | Reaction requires auth; issue object already carries `reactions.heart` count, so no extra request to read counts |
| Comments | `POST/GET /repos/{o}/{r}/issues/{n}/comments` | Yes | Issue comments on the backing issue | Requires auth to write; public read works unauthenticated |
| Post ↔ issue mapping | n/a (our convention) | Yes | Issue title = `[post] <postId>`, label `post`; looked up via `GET /repos/{o}/{r}/issues?labels=post` | Issue numbers are GitHub-internal; business ID stays the ULID in the file |
| Follow | `PUT /user/following/{username}` (Content-Length: 0), scope `user:follow` | Yes | `following.ts` | Token needs `user:follow` scope |
| Unfollow | `DELETE /user/following/{username}` | Yes | `following.ts` | Same |
| Check following | `GET /user/following/{username}` → 204/404 (also `GET /users/{u}/following/{t}`) | Yes | `following.ts` | — |
| List following | `GET /user/following` (paginated, max 100/page) | Yes | `following.ts` | — |
| Followers count | `GET /users/{username}` → `public_repos`, `followers_url`; count via `GET /users/{username}/followers?per_page=1` → `Link` header `page 1; rel="last"` | Yes (public, no auth) | user profile | Count parsed from `Link` header (no dedicated count endpoint) |
| User profile data | `GET /users/{username}` (public) | Yes, no auth needed | `users.ts` | GitHub data only; social metadata from `.social/profile.json` |
| Discover social repos (Explore) | `GET /search/repositories?q=topic:gitnnetwork&sort=updated` | Yes | Onboarding adds topic `gitnnetwork` to the social repo; Explore searches it | Search API: 10 req/min unauthenticated, 30 req/min authenticated; index has a lag |
| Popular users (Explore) | `GET /search/users?q=followers:>N` | Yes | Explore | Same search rate limits |
| Trending topics | No GitHub endpoint for "social topics" | Yes (local) | Computed locally from loaded post text | Only covers posts already fetched |
| Rate limits | `GET /rate_limit`; core: 5000 req/h auth, 60 req/h unauth; search: 30/10 per min | Yes | Client reads `x-ratelimit-*` headers, surfaces 403/429 | Heavy feeds (100 posts = ~100 file fetches) consume core quota; mitigated by IndexedDB cache (5 min TTL) |
| GraphQL | `POST https://api.github.com/graphql` (CORS ok) | Yes | Not used in MVP | REST covers all MVP needs; GraphQL adds no value yet |
| Discussions | GraphQL-only for creation | Partial | Not used | Issues are simpler and REST-native; discussions need repo opt-in + GraphQL |

## Data model on GitHub (per user)

```
<username>/social            # public repo, topic: gitnnetwork
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
