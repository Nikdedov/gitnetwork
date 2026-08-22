# GitNetwork — Static GitHub Pages Architecture and Authentication

## Core Product Requirement

GitNetwork MUST support this exact user experience:

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

A user must be able to deploy their own independent GitNetwork instance to GitHub Pages without operating a backend server.

Example:

```text
https://alice.github.io/gitnetwork/
https://bob.github.io/gitnetwork/
https://company.github.io/gitnetwork/
```

Every deployment must be capable of operating independently.

---

# 1. Absolute Architecture Constraint

GitNetwork MUST be a **static-first application**.

The GitNetwork application MUST NOT require:

* a GitNetwork backend;
* a GitNetwork database;
* a GitNetwork API;
* a GitNetwork-owned OAuth proxy;
* a GitNetwork-owned authentication server;
* a serverless function;
* a continuously running server;
* Redis;
* PostgreSQL;
* Firebase;
* Supabase;
* a centralized session service.

GitHub is the external infrastructure on which GitNetwork operates.

The intended architecture is:

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

---

# 2. Authentication Research Result

Do NOT assume that a conventional GitHub OAuth flow can currently be completed entirely inside a static browser application.

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

---

# 3. Authentication Must Be Pluggable

Create an authentication abstraction.

For example:

```typescript
interface AuthProvider {
  login(): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getAccessToken(): string | null;
  isAuthenticated(): boolean;
}
```

Create a GitHub implementation:

```text
GitHubAuthProvider
```

The rest of GitNetwork MUST NOT know whether authentication is implemented using:

* OAuth;
* GitHub App authorization;
* another future GitHub-supported browser mechanism;
* temporary development authentication.

This is critical because GitHub may add fully browser-compatible token exchange in the future.

---

# 4. Do NOT Build the Application Around PAT

The old PAT login must NOT be the primary architecture.

Do not design the application around:

```text
Paste Personal Access Token
```

Instead, the UI should always be designed around:

```text
Continue with GitHub
```

However, because GitHub's current browser OAuth limitations prevent a guaranteed pure-static OAuth implementation, keep PAT authentication as a **fallback authentication provider** during the MVP.

The user-facing priority should be:

```text
1. GitHub OAuth / GitHub App browser flow if supported
2. PAT fallback
```

Do not expose the PAT fallback as the preferred experience.

---

# 5. IMPORTANT: Authentication Capability Detection

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

---

# 6. GitHub OAuth Implementation

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

---

# 7. OAuth Redirect

The GitHub authorization request should use:

```text
https://github.com/login/oauth/authorize
```

with:

```text
client_id
redirect_uri
state
code_challenge
code_challenge_method=S256
```

The redirect URI MUST be configurable.

GitHub now supports multiple OAuth redirect URIs, which makes it easier to support multiple deployment environments.

The application should support:

```text
localhost
GitHub Pages
custom domain
```

without hard-coded assumptions.

---

# 8. GitHub Pages URL Detection

The application MUST automatically determine its deployment URL.

It must support:

```text
https://username.github.io/repository/
```

as well as:

```text
https://custom-domain.example/
```

Do NOT hard-code:

```text
https://gitnetwork.github.io/
```

The application must derive its runtime base URL from the current browser location/configuration.

---

# 9. GitHub API Client

Create a single GitHub API abstraction:

```text
GitHubApiClient
```

All GitHub REST API operations must go through this abstraction.

The UI must never contain scattered:

```text
fetch("https://api.github.com/...")
```

calls.

The client must support:

```text
getAuthenticatedUser()
getRepository()
createRepository()
getContents()
createOrUpdateFile()
getCommits()
createCommit()
getBranches()
followUser()
unfollowUser()
```

and every other operation already required by GitNetwork.

GitHub's REST API is the preferred browser integration surface for GitNetwork data operations. Avoid raw Git transport from the browser.

---

# 10. GitNetwork Repository

The authenticated GitHub user owns their GitNetwork data.

The application should locate the user's GitNetwork repository according to the existing GitNetwork repository convention.

If it does not exist:

```text
Create GitNetwork repository
```

if the current MVP requires automatic creation.

Do not create a GitNetwork database.

Do not duplicate the repository data in a centralized backend.

---

# 11. GitHub Is the Data Layer

Preserve the fundamental GitNetwork architecture:

```text
GitHub account
      │
      └── GitNetwork repository
              │
              ├── profile
              ├── posts
              ├── follows
              ├── reactions
              ├── messages
              └── other protocol data
```

The static application is only the interface/protocol implementation.

---

# 12. All Existing Features Must Continue Working

Authentication changes MUST NOT remove functionality.

After authentication the user must be able to use all existing GitNetwork features.

At minimum:

### Identity

* GitHub login
* logout
* current user
* avatar
* username
* profile

### Repository

* repository detection
* repository creation
* reading repository contents
* writing files
* commits
* commit history

### Social

* profiles
* posts
* feed
* follows
* unfollows
* reactions
* likes
* comments if currently implemented

### Messaging

* encrypted messages if already implemented;
* repository-based message storage;
* message discovery;
* message metadata.

### GitNetwork protocol

All existing protocol operations must continue to work through the GitHub API.

---

# 13. No Authentication Logic in UI Components

Do NOT write OAuth code directly inside:

```text
LoginPage
ProfilePage
FeedPage
PostPage
```

Instead:

```text
UI
 ↓
AuthProvider
 ↓
GitHub authentication
```

and:

```text
UI
 ↓
GitHubApiClient
 ↓
GitHub REST API
```

This makes the project compatible with future GitHub authentication improvements.

---

# 14. PAT Fallback

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

---

# 15. PAT Permissions

Do not blindly request:

```text
repo
user:follow
read:org
```

without checking which features actually require them.

Create a permissions matrix:

```text
GitNetwork feature
        ↓
GitHub API operation
        ↓
Required permission
```

Request the minimum permissions required.

If a fine-grained PAT can provide the required permissions, document that option.

---

# 16. Do Not Use a Third-Party OAuth Proxy

The application MUST NOT depend on services such as:

```text
random OAuth proxy
CORS proxy
public token exchange service
```

unless the project owner explicitly decides to introduce a trusted centralized service later.

The purpose of GitNetwork is to minimize centralized infrastructure.

A third-party proxy would receive or process sensitive authentication material and would contradict the architecture.

---

# 17. GitHub App Evaluation

Evaluate GitHub Apps as the preferred long-term authentication model.

GitHub recommends considering GitHub Apps because they provide:

* fine-grained permissions;
* user-controlled repository access;
* short-lived tokens;
* user-to-server authentication.

GitHub also supports browser web application flow for GitHub Apps.

However, do NOT assume that GitHub App authentication solves the static-browser token exchange problem.

It currently uses the same OAuth infrastructure and must be evaluated against the browser CORS limitation.

---

# 18. Future-Proof OAuth Design

The code must make it possible to switch from:

```text
PAT fallback
```

to:

```text
fully browser-compatible GitHub OAuth
```

without rewriting:

* repository code;
* post code;
* feed code;
* profile code;
* social graph;
* messaging;
* GitNetwork protocol.

Only:

```text
GitHubAuthProvider
```

should need substantial changes.

---

# 19. Deployment Model

GitNetwork MUST build as static assets:

```text
dist/
├── index.html
├── assets/
└── ...
```

No server runtime should be required.

The GitHub Pages deployment must work using:

```text
GitHub Actions
```

or GitHub Pages static hosting.

The generated site must not require:

```text
node server
python server
Docker
database
API server
serverless function
```

at runtime.

---

# 20. GitHub Pages Routing

Because GitHub Pages is static hosting, configure SPA routing correctly.

Support:

```text
/
 /login
 /feed
 /profile/:username
 /post/:id
 /settings
```

without requiring a server-side router.

Use the project's existing routing technology.

If necessary, implement a GitHub Pages-compatible fallback mechanism.

---

# 21. Configuration

The static application may contain:

```text
GITHUB_CLIENT_ID
```

because a client ID is not a secret.

It MUST NOT contain:

```text
GITHUB_CLIENT_SECRET
```

and no code should imply otherwise.

Do not put secrets into:

```text
.env
.env.production
GitHub Pages build artifacts
JavaScript bundles
public/
```

---

# 22. Security Requirements

Implement:

### OAuth state

Cryptographically random and validated.

### PKCE

Use:

```text
S256
```

only.

### Token storage

Prefer memory.

### No logging

Never log:

```text
access_token
refresh_token
PAT
client_secret
code_verifier
```

### No URL tokens

Never put access tokens into:

```text
query parameters
hash fragments
pathname
```

### No analytics leakage

Do not send authentication information to analytics systems.

---

# 23. Authentication State

Implement:

```typescript
interface AuthState {
  status:
    | "loading"
    | "unauthenticated"
    | "authenticated"
    | "error";

  user: GitHubUser | null;

  provider: "github-oauth" | "github-pat" | null;

  error: string | null;
}
```

Do not expose the token to UI components.

---

# 24. Logout

Logout must:

```text
clear access token
clear user state
clear OAuth state
clear PKCE verifier
clear cached GitHub data
```

Do not modify GitHub repositories.

---

# 25. Error Handling

Handle:

```text
access_denied
state_mismatch
invalid_grant
invalid_client
redirect_uri_mismatch
401
403
404
rate_limit
network failure
GitHub unavailable
insufficient permissions
expired token
```

Authentication errors must not leave the application permanently stuck on a loading screen.

---

# 26. Static Deployment Acceptance Test

Open the deployed application in a completely new browser profile.

The application must:

```text
1. Load without a backend.
2. Display GitNetwork UI.
3. Display "Continue with GitHub".
4. Start the GitHub authorization flow.
5. Return to the static GitHub Pages application.
6. Correctly detect whether browser OAuth token exchange is available.
7. If available, authenticate through GitHub OAuth.
8. Otherwise provide the PAT fallback.
9. Authenticate the GitHub user.
10. Load the GitHub profile.
11. Find/create the GitNetwork repository.
12. Read repository contents.
13. Create a post.
14. Commit the post.
15. Read the post back.
16. Use social functionality.
17. Use messaging functionality if implemented.
18. Logout.
19. Login again.
```

There must be no hidden dependency on a GitNetwork server.

---

# 27. Critical Architectural Rule

Never "solve" the OAuth problem by silently adding:

```text
/api/auth
```

to the project.

If the implementation requires a server to exchange the GitHub OAuth code, STOP and document the limitation instead of silently introducing a backend.

The project requirement is:

```text
Fork
  ↓
GitHub Pages
  ↓
Browser
  ↓
GitHub
```

not:

```text
Fork
  ↓
GitHub Pages
  ↓
GitNetwork backend
  ↓
GitHub
```

---

# 28. Research Before Implementation

Before implementing authentication, inspect the current GitHub documentation and verify whether GitHub has introduced a new browser-compatible OAuth token exchange since this specification was written.

Specifically verify:

1. PKCE support.
2. CORS support for `/login/oauth/access_token`.
3. Whether the client secret is still required.
4. GitHub App web authorization.
5. OAuth App web authorization.
6. OAuth token refresh.
7. Multiple redirect URI support.
8. GitHub Pages compatibility.

Do not rely on outdated blog posts or Stack Overflow answers.

Use GitHub's official documentation and changelog as the authoritative source.

As of the current research, GitHub supports PKCE but the token exchange still requires the client secret and the OAuth endpoints still do not support the necessary browser CORS behavior.

---

# 29. Definition of Done

The implementation is complete only if:

* [ ] GitNetwork builds as a completely static application.
* [ ] GitNetwork deploys to GitHub Pages.
* [ ] No runtime backend is required.
* [ ] No GitNetwork database is required.
* [ ] Authentication is abstracted behind `AuthProvider`.
* [ ] GitHub OAuth + PKCE is implemented according to the current GitHub protocol.
* [ ] OAuth state validation exists.
* [ ] No client secret is treated as a secret in frontend code.
* [ ] Browser OAuth capability is detected rather than assumed.
* [ ] PAT fallback works when static OAuth cannot complete.
* [ ] PAT never leaves the browser.
* [ ] GitHub API client works directly from the browser.
* [ ] Repository creation works.
* [ ] Repository read/write works.
* [ ] Posts work.
* [ ] Profiles work.
* [ ] Follows work.
* [ ] Reactions work.
* [ ] Messaging works if already implemented.
* [ ] Logout works.
* [ ] Re-authentication works.
* [ ] Authentication failures are handled.
* [ ] GitHub API failures are handled.
* [ ] GitHub Pages paths work.
* [ ] The application can be forked and independently deployed.
* [ ] No hidden centralized backend exists.
* [ ] Documentation accurately describes the current authentication limitation.

---

# 30. Development Rules

### Core Principle

Build the smallest working version.

Do not add functionality that is not required by the current version's acceptance criteria.

The project is developed incrementally through explicit versioned roadmaps.

### Before Coding

Always:

1. Inspect the existing repository.
2. Determine the current stack.
3. Inspect `package.json`.
4. Inspect the source tree.
5. Inspect existing tests.
6. Inspect the current roadmap in `docs/roadmap/`.
7. Do not rewrite the project blindly.
8. Produce a short implementation plan based on the actual repository before making substantial changes.

### Research Before Implementation

For GitHub-dependent functionality:

1. Research the current GitHub REST API.
2. Research the current GitHub GraphQL API where relevant.
3. Determine whether the operation can actually be performed from a browser-only application.
4. Pay particular attention to:
   - OAuth/authentication
   - repository creation
   - file creation/update
   - image uploads
   - reactions
   - Issues
   - Discussions
   - following
   - rate limits
5. Never invent API endpoints or capabilities.
6. If a feature requires a backend, do not add a backend merely to make it possible.
7. Instead use a client-side-compatible fallback or document the limitation.

Document verified GitHub limitations in:

`docs/github-api-limitations.md`

Use:

| Feature | GitHub API support | Browser-only possible | MVP implementation | Limitation |
|---|---|---|---|---|

### Testing

After every meaningful implementation phase:

1. Run tests.
2. Run the production build.
3. Inspect `git diff`.
4. Fix TypeScript/build errors.
5. Update documentation where behavior changed.
6. Create a focused Git commit.

Do not move to the next implementation phase while the current phase is broken.

CI must not perform destructive real GitHub API operations.

GitHub API integrations must be mockable.

---

# 31. Architecture Principles

### Git Is the Source of Truth

GitNetwork is a Git-native social network.

The user's Git repository is the canonical source of truth for user-owned social data.

For MVP1 the primary provider is GitHub.

Conceptually:

```text
GitHub account
    ↓
<username>/social
    ↓
profile + posts
    ↓
GitNetwork social UI
```

### No Mandatory Backend

The application must remain browser/client-side for MVP1.

Do NOT introduce:

- custom backend;
- PostgreSQL;
- Redis;
- Supabase;
- Firebase;
- server-side database;
- telemetry backend;
- centralized content storage.

The application must remain deployable as a static site and suitable for GitHub Pages.

Preferred architecture:

```text
Browser
   ↓
GitNetwork domain services
   ↓
GitHub API
   ↓
GitHub repositories
```

Never replace this with:

```text
Browser
   ↓
Backend
   ↓
Database
   ↓
GitHub
```

unless a future version explicitly changes the architecture.

### Storage Abstraction

Domain logic must use a storage abstraction rather than calling GitHub APIs directly.

The MVP implementation is:

`GitHubStorage`

The architecture should leave room for future providers such as:

- GitLab;
- Codeberg;
- IPFS;
- Local Git.

Do not implement future providers unless the current version explicitly requires them.

### GitHub API Abstraction

React/UI components must not call GitHub APIs directly.

Use domain services and API adapters, for example:

```text
socialService.createPost()
```

instead of:

```text
github.createFile()
```

inside UI components.

### User Ownership

A user may modify their own repository.

Do not write another user's content into the current user's repository as canonical data.

Social references, mentions, and references to external posts are allowed.

### Client-Side Cache

GitHub API must not be called on every render.

Use the existing cache abstraction.

For MVP1:

- IndexedDB for substantive cache;
- localStorage only for small settings.

Cache may contain:

- GitHub profiles;
- repository metadata;
- posts;
- following;
- feed.

Cache is never the source of truth.

### Security

Never:

- commit access tokens;
- send tokens to third-party servers;
- send tokens to analytics;
- add third-party tracking;
- execute HTML from post content;
- trust unsanitized Markdown/HTML;
- exceed configured upload limits.

Maintain:

- CSP;
- Markdown/HTML sanitization;
- XSS protection;
- MIME/type validation;
- file-size limits.

---

# 32. Workflow

### Version Workflow

Every major version has its own roadmap.

Current structure:

```text
AGENTS.md

docs/
└── roadmap/
    ├── MVP1.md
    ├── MVP2.md
    └── MVP2-TASKS.md
```

`AGENTS.md` defines how the agent works.

`docs/roadmap/MVP1.md` defines the MVP1 product/technical scope.

`docs/roadmap/MVP2.md` defines the MVP2 product/technical roadmap.

`docs/roadmap/MVP2-TASKS.md` defines the MVP2 execution backlog.

### MVP1 Workflow

Follow the phases defined in:

`docs/roadmap/MVP1.md`

After each phase:

1. Run tests.
2. Run build.
3. Inspect diff.
4. Fix errors.
5. Update documentation.
6. Commit.

### MVP2 Planning After MVP1

MVP1 is NOT complete merely because its code compiles.

Before declaring MVP1 complete:

1. Verify all MVP1 acceptance criteria.
2. Run tests.
3. Run production build.
4. Inspect the actual architecture.
5. Review technical debt and limitations.
6. Review GitHub API limitations.
7. Review security findings.
8. Read `docs/roadmap/MVP2.md`.
9. Update `docs/roadmap/MVP2.md` based on what was actually implemented in MVP1.
10. Create/update `docs/roadmap/MVP2-TASKS.md`.
11. Ensure the MVP2 roadmap and task list are committed.

Do NOT immediately start implementing MVP2 before this planning step is complete.

The actual MVP1 implementation takes precedence over assumptions made in the original MVP2 plan.

### Living Roadmap

Roadmaps must remain synchronized with implementation.

If implementation reveals:

- a better architecture;
- a missing requirement;
- an obsolete requirement;
- a security issue;
- a scalability limitation;
- a new dependency;

update the roadmap before continuing.

When changing scope, document:

- what changed;
- why;
- alternatives considered;
- impact.

---

# 33. Versioning Rules

### MVP1

MVP1 is the GitHub-native, browser-only social-network foundation.

The complete specification is in:

`docs/roadmap/MVP1.md`

MVP1 includes:

- landing page;
- GitHub login (OAuth or PAT fallback);
- social repository onboarding;
- profile;
- posts;
- home feed;
- following;
- reactions;
- comments;
- basic recommendations;
- images;
- local cache;
- responsive UI;
- GitHub Pages deployment.

MVP1 explicitly does not require:

- custom backend;
- database;
- realtime;
- push notifications;
- private messaging;
- video processing;
- complex moderation;
- monetization;
- ads;
- federation;
- IPFS;
- GitLab/Codeberg;
- native mobile apps;
- sophisticated ML recommendations.

### MVP2

MVP2 extends MVP1 into:

- stronger Git-native protocol/data model;
- versioned schemas;
- social events;
- portable AI Context;
- AI memory/decisions/projects/handoffs;
- local GitNetwork MCP;
- GitNetwork Agent Skill;
- AI as a first-class social-network client;
- private/encrypted data primitives;
- optional non-authoritative indexing/discovery;
- stronger data portability and security.

The complete specification is in:

`docs/roadmap/MVP2.md`

The execution backlog is:

`docs/roadmap/MVP2-TASKS.md`

### Backward Compatibility

MVP2 must preserve MVP1 functionality and keep existing MVP1 repositories readable.

Do not change MVP1 schemas or repository structure without documenting compatibility/migration.

### Definition of Done

A version is complete only when:

- implementation is complete;
- tests pass;
- build passes;
- acceptance criteria are satisfied;
- documentation is updated;
- known limitations are documented;
- the next-version roadmap is prepared when required.

For MVP1, preparing and committing the MVP2 roadmap/task list is part of the MVP1 Definition of Done.

---

# 34. Agent Behavior

Prefer:

```text
inspect → research → plan → implement → test → review → document → commit
```

over:

```text
guess → rewrite → add infrastructure → hope it works
```

Do not over-engineer.

Do not add infrastructure without a demonstrated requirement.

Do not silently change architectural principles.

When an implementation limitation is caused by GitHub or browser-only constraints, document the limitation instead of introducing a backend.
