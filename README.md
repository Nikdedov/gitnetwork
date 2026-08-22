# GitNetwork

A static-first, Git-native social network that deploys to GitHub Pages without a backend server.

## Core Product Experience

```text
Fork GitNetwork repository
        ↓
Enable GitHub Pages
        ↓
Open the GitNetwork URL
        ↓
"Login with GitHub"
        ↓
Authenticate
        ↓
GitNetwork is fully functional
```

Example deployments:

```text
https://alice.github.io/gitnetwork/
https://bob.github.io/gitnetwork/
https://company.github.io/gitnetwork/
```

Every deployment operates independently as a static application.

---

## Architecture

GitNetwork is a **static-first application** that uses GitHub as both identity provider and data storage.

```text
                GitNetwork Static Application
                         │
                         │
                         ▼
                ┌─────────────────┐
                │  GitHub Pages   │
                │                 │
                │ HTML/CSS/JS     │
                └────────┬────────┘
                         │
                         │ GitHub API
                         ▼
                ┌─────────────────┐
                │     GitHub      │
                │                 │
                │ Identity        │
                │ Repositories    │
                │ Files           │
                │ Commits         │
                │ Social data     │
                └─────────────────┘
```

### What GitNetwork Does NOT Require

- A GitNetwork backend
- A GitNetwork database
- A GitNetwork API
- A GitNetwork-owned OAuth proxy
- A GitNetwork-owned authentication server
- A serverless function
- A continuously running server
- Redis, PostgreSQL, Firebase, Supabase
- A centralized session service

### Tech Stack

- TypeScript + React + Vite
- React Router 7
- Tailwind CSS 4
- IndexedDB for local caching
- GitHub REST API

---

## Deployment to GitHub Pages

### Step 1: Fork the Repository

1. Go to the GitNetwork repository on GitHub
2. Click **Fork** → **Create fork**
3. Your fork will be at `https://github.com/<your-username>/gitnetwork`

### Step 2: Enable GitHub Pages

1. Go to your fork's **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Select the `main` branch and `/ (root)` folder
4. Click **Save**

Your GitNetwork instance will be available at:

```text
https://<your-username>.github.io/gitnetwork/
```

### Step 3: Configure GitHub OAuth (Optional but Recommended)

To enable the "Continue with GitHub" OAuth flow:

1. Go to GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Fill in the application details:
   - **Application name**: GitNetwork (your instance)
   - **Homepage URL**: `https://<your-username>.github.io/gitnetwork/`
   - **Authorization callback URL**: `https://<your-username>.github.io/gitnetwork/`
3. Click **Register application**
4. Copy the **Client ID**
5. In your forked repository, create or update `.env.local`:

```env
VITE_GITHUB_CLIENT_ID=your_client_id_here
```

6. Commit and push the changes to trigger the GitHub Pages deployment.

**Note:** If you skip OAuth configuration, the application will detect this and provide a Personal Access Token (PAT) fallback option.

---

## Starting to Use GitNetwork

### Step 1: Open Your GitNetwork URL

Open your deployed instance:

```text
https://<your-username>.github.io/gitnetwork/
```

### Step 2: Authenticate

When you first visit the site, you will see:

```text
Continue with GitHub
```

The application will automatically detect which authentication mechanisms are available:

**If OAuth is configured:**
- Click "Continue with GitHub"
- You will be redirected to GitHub to authorize the application
- After authorization, you will be redirected back to GitNetwork

**If OAuth is not configured or unavailable:**
The application will show:

```text
GitHub authentication requires an additional step in this deployment.

GitHub OAuth is unavailable in this static deployment.
You can alternatively connect using a GitHub Personal Access Token.
```

In this case, you can create a PAT:

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token** → **Generate new token (classic)**
3. Select the minimum required scopes:
   - `repo` (for reading/writing your social repository)
   - `user:follow` (for following/unfollowing users)
4. Copy the token
5. Paste it into the login page

**Security note:** The token exists only in browser memory and `sessionStorage`. It is never committed, never written to a repository, never logged, and never sent to any third-party server.

### Step 3: Create Your Social Repository

After authentication:

1. The application will check for `<your-username>/social`
2. If it does not exist, you will see "Create your Social Repository"
3. Click to create a public repository named `social`
4. The repository will be initialized with:
   - `README.md`
   - `.social/profile.json`
   - `posts/.gitkeep`

Your social repository is now ready.

---

## Data Model

Your social data lives in your GitHub repository:

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

---

## Security Model

- **No backend, no database:** All data lives in GitHub repositories you own.
- **No client secrets in frontend:** A GitHub Client ID is not a secret and can be public. A Client Secret is never stored or transmitted from the frontend.
- **Token security:** Access tokens and PATs are stored only in browser memory + `sessionStorage`. Never committed, never sent to analytics, never placed in URLs.
- **CSP:** Content Security Policy meta tag in `index.html`.
- **Markdown sanitization:** Posts are rendered with `marked` and sanitized with `DOMPurify`. Raw HTML and event handlers are stripped.
- **Public data by design:** Social repositories and posts are public. Do not store private information in MVP1.

---

## Authentication Limitations

### GitHub OAuth CORS Limitation

GitHub's OAuth token exchange endpoint (`POST https://github.com/login/oauth/access_token`) does not support CORS preflight requests from browser applications. This means a pure static browser application cannot complete the OAuth token exchange without a backend server to proxy the request.

GitNetwork implements:

1. **OAuth + PKCE (S256) preparation:** The application generates `state`, `code_verifier`, and `code_challenge` and is ready for a future fully browser-compatible GitHub token exchange.
2. **Authentication capability detection:** The application detects whether OAuth or PAT fallback is available.
3. **PAT fallback:** When OAuth cannot complete, users can authenticate with a GitHub Personal Access Token.

### Future-Proof Design

The authentication architecture is pluggable:

```typescript
interface AuthProvider {
  login(): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getAccessToken(): string | null;
  isAuthenticated(): boolean;
}
```

When GitHub adds fully browser-compatible OAuth token exchange, only the `GitHubAuthProvider` implementation needs to change. The rest of the application (repository code, posts, feed, profile, social graph, messaging, GitNetwork protocol) will continue to work without modification.

---

## Local Development

To run GitNetwork locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/gitnetwork.git
   cd gitnetwork
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

---

## MCP (Model Context Protocol) Integration

GitNetwork supports MCP integration for AI agents to interact with your social data locally.

### MCP Architecture

The GitNetwork MCP server provides a local integration interface for AI agents:

```
AI Agent
   │
   │ MCP / STDIO
   ▼
gitnetwork-mcp
   │
   ├── read local repository
   ├── write local repository
   ├── git commit
   └── git push
```

### MCP Tools Available

**Read Tools:**
- `get_profile()` - Get user profile information
- `get_post()` - Get a specific post
- `get_feed()` - Get user feed (following/for-you)
- `get_social_graph()` - Get social graph (following/followers)
- `search_context()` - Search AI context

**Mutation Tools:** (Require authentication and user authorization)
- `create_post()` - Create a new post
- `comment()` - Add a comment to a post
- `react()` - Add a reaction to a post
- `follow()` / `unfollow()` - Manage following relationships
- `save_memory()` / `save_decision()` / `create_handoff()` - AI context management

See `docs/mcp/architecture.md` and `docs/mcp/tools.md` for complete documentation.

---

## How to Create a Post

Posts are stored as markdown files with YAML frontmatter in your `social` repository:

```
posts/YYYY/MM/DD/<ulid>.md
```

### Example Post File

```markdown
---
id: <ulid>
author: <your-username>
createdAt: 2024-01-15T10:00:00Z
---

This is my first GitNetwork post!

A social network where your GitHub repository is your profile.
```

### Using the Web Interface

1. Open your GitNetwork instance at `https://<your-username>.github.io/gitnetwork/`
2. Authenticate with GitHub or a Personal Access Token
3. Click "Home" or "For You" in the navigation
4. Use the composer to write a new post
5. Click "Post" to publish

The post will be automatically saved to your `social` repository as a markdown file with an issue created for interactions (likes and comments).

---

## Roadmap

See `docs/roadmap/MVP1.md` and `docs/roadmap/MVP2.md` for the complete product and technical roadmap.

---

## License

MIT
