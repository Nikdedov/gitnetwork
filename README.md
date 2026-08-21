# gitnnetwork

An open-source, zero-backend social network built on top of GitHub.

## Concept

GitHub is the identity and storage provider:
- Each user has a special public GitHub repository: `<github-username>/social`
- User posts are stored as Markdown files in their `social` repository
- The frontend is 100% client-side, deployed as a static site (GitHub Pages compatible)
- No backend, no database, no Firebase/Supabase/Redis

## Architecture

```
Browser
  ↓
GitHub REST API (api.github.com)
  ↓
GitHub repositories (<username>/social)
```

### Tech Stack
- TypeScript + React + Vite
- React Router 7
- Tailwind CSS 4
- Vitest + Playwright
- IndexedDB for local caching

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-org>/gitnnetwork.git
   cd gitnnetwork
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run local development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm run test
   ```

5. Run typecheck:
   ```bash
   npm run typecheck
   ```

6. Build for production:
   ```bash
   npm run build
   ```

## GitHub "OAuth" Setup (Authentication)

**Important limitation:** GitHub's OAuth token exchange endpoints (`/login/oauth/access_token` and `/login/device/code`) do not send `Access-Control-Allow-Origin` headers. This makes it impossible to complete an OAuth flow from a pure client-side browser application.

**MVP Solution:** Users authenticate by pasting a **GitHub Personal Access Token (PAT)** into the login page. The token is:
- Stored only in browser memory and `sessionStorage`
- Cleared when the tab closes
- Never committed to any repository
- Never sent to any third-party server

To create a PAT:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Create a new token with scopes: `repo`, `user:follow`, `read:org`
3. Paste the token into the login page

## Data Model

Each user's social data is stored in their `<username>/social` public repository:

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

## Security Model

- **No backend, no database:** All data lives in GitHub repositories you own.
- **Token security:** GitHub PAT is stored only in browser memory + `sessionStorage`. Never committed, never sent to analytics.
- **CSP:** Content Security Policy meta tag in `index.html`.
- **Markdown sanitization:** Posts are rendered with `marked` and sanitized with `DOMPurify`. Raw HTML and event handlers are stripped.
- **Public data by design:** Social repositories and posts are public. Do not store private information.

## Limitations

1. **Authentication:** OAuth flows are not supported due to GitHub CORS restrictions on token exchange endpoints. MVP uses PAT paste-in login.
2. **Follow system:** Requires `user:follow` scope on the PAT. Read-only following via GitHub API may be limited by CORS or rate limits.
3. **Rate limits:** GitHub API has rate limits (5000 req/h authenticated, 60 req/h unauthenticated). IndexedDB cache (5 min TTL) mitigates this.
4. **Media:** MVP supports JPG/PNG/WebP images up to 10 MB. No video support.
5. **Comments/Likes:** Backed by GitHub Issues and reactions. This is functional but ties social interactions to issue numbers.

## Roadmap

- [ ] Phase 1: Foundation (completed)
- [ ] Phase 2: Identity (GitHub login, profile, repository onboarding)
- [ ] Phase 3: Posts (post model, Markdown parser, create/read posts)
- [ ] Phase 4: Social (following, feed, reactions, comments)
- [ ] Phase 5: Media (image upload and rendering)
- [ ] Phase 6: Recommendations (local ranking, For You, Explore)
- [ ] Phase 7: Cache (IndexedDB, invalidation, offline read-only mode)
- [ ] Phase 8: Deployment (GitHub Actions, GitHub Pages)

## License

MIT
