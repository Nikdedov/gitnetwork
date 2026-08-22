# GitNetwork MVP1 — Product & Technical Specification

## 1. Goal

Create the first open-source GitHub-native social network MVP.

Core concept:

- GitHub is the identity and storage provider.
- Every user has a dedicated GitHub repository that acts as their social page.
- User posts physically live in that repository.
- The frontend is completely client-side.
- There is no backend.
- There is no database.
- The application works as a static site and is suitable for GitHub Pages.

Concept:

```text
GitHub account
    ↓
<username>/social
    ↓
profile + posts
    ↓
Twitter/VK-like social UI
```

---

## 2. MVP Scope

Implement:

1. Landing page
2. GitHub OAuth login
3. Creation/checking of the personal social repository
4. Profile page
5. Post creation
6. User post timeline
7. Home feed
8. Follow/unfollow
9. Like/reaction
10. Comments
11. Basic recommendations
12. GitHub repository as source of truth
13. IndexedDB/localStorage cache
14. Responsive UI
15. Image support
16. Explore
17. Settings
18. Data portability/export guidance
19. GitHub Pages deployment

Do not implement:

- custom backend;
- custom database;
- realtime;
- push notifications;
- private messaging;
- video processing;
- complex moderation;
- monetization;
- ads;
- federation;
- IPFS;
- GitLab/Codeberg providers;
- native mobile applications;
- sophisticated ML recommendation system.

---

## 3. Repository and Storage Model

Each user has:

```text
<github-username>/social
```

Example:

```text
github.com/alice/social
```

Repository structure:

```text
.social/
    profile.json

posts/
    YYYY/
        MM/
            DD/
                <post-id>.md

media/
    <post-id>/

README.md
```

The repository is the source of truth.

The frontend must not become the canonical storage location for user content.

---

## 4. Profile

Use:

```text
.social/profile.json
```

MVP1 schema:

```json
{
  "schemaVersion": 1,
  "username": "alice",
  "displayName": "Alice",
  "bio": "Blockchain developer",
  "avatar": "https://...",
  "createdAt": "2026-08-18T00:00:00Z"
}
```

Do not unnecessarily duplicate GitHub profile data.

GitHub API remains the source for GitHub-specific identity information.

`profile.json` stores social-specific metadata.

Profile route:

```text
/@username
```

Profile UI should look like a modern social network rather than GitHub.

Show:

- avatar;
- display name;
- username;
- bio;
- followers;
- following;
- Follow button;
- posts;
- repository link.

---

## 5. Posts

Posts are Markdown files.

Example:

```text
posts/2026/08/18/01JXYZ123.md
```

Example content:

```markdown
---
schemaVersion: 1
type: post
id: 01JXYZ123
author: alice
createdAt: 2026-08-18T08:32:00Z
---

Hello world!

This is my first post.
```

Posts support:

- text;
- Markdown;
- links;
- images.

Maximum MVP post length: 5000 characters.

Post IDs must use ULID or UUID.

IDs must be:

- unique;
- stable;
- independent of GitHub issue numbers.

Do not use the filename as the business ID.

---

## 6. Authentication Architecture

GitNetwork MUST use a **pluggable authentication abstraction**.

Create an authentication abstraction:

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

## 7. Authentication Capability Detection

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

## 8. GitHub OAuth Implementation

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

## 9. OAuth Redirect

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

## 10. GitHub Pages URL Detection

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

## 11. GitHub API Client

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

## 12. PAT Fallback

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

## 13. PAT Permissions

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

## 14. Do NOT Build the Application Around PAT

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

## 15. GitHub App Evaluation

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

## 16. Future-Proof OAuth Design

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

## 17. Security Requirements

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

## 18. Repository Onboarding

After login:

1. Check for `<username>/social`.
2. If absent, show "Create your Social Repository".
3. Create a public repository named `social`.
4. Use description: `Personal social profile`.
5. Initialize README.
6. Create `.social/profile.json`.
7. Create `posts/.gitkeep`.

The user is onboarded after this process completes.

---

## 19. Create Post

Main composer:

```text
What are you working on?
```

Button:

```text
Post
```

After publication:

1. Create Markdown post.
2. Commit through GitHub API.
3. Invalidate/update local cache.
4. Update feed.

No backend is permitted.

---

## 20. Wall

Each profile has a Posts/Wall view.

MVP1 wall consists of:

- the user's own posts;
- mentions/references to posts from other users.

Do not copy another user's canonical content into the current user's repository.

Each user may modify only their own repository.

---

## 21. Following

Do not create a custom followers database.

Use GitHub following as the base social graph.

Frontend must support:

- read following;
- determine whether current user follows another user;
- follow;
- unfollow.

If GitHub cannot safely support a required operation from a browser-only application:

- do not add a backend;
- implement read-only behavior if possible;
- document the limitation.

---

## 22. Feed

Home has:

```text
Following
For You
```

### Following

1. Get following.
2. Resolve `<username>/social` repositories.
3. Retrieve posts.
4. Sort by `createdAt DESC`.
5. Display latest N posts.

Start with:

```text
N = 100
```

N must remain configurable.

### For You

Do not use ML in MVP1.

Use deterministic local ranking based on available data.

Potential inputs:

- recency;
- following;
- GitHub stars;
- topics.

No server-side tracking.

---

## 23. Reactions

Use GitHub reactions where practical.

Hide GitHub-specific implementation details from the UI.

If reactions cannot be correctly attached to the required GitHub object through the available browser-compatible API:

- evaluate Issues/Discussions as an interaction layer;
- document the limitation;
- do not create a custom likes backend.

---

## 24. Comments

Use GitHub Issues or Discussions as backing storage where appropriate.

The GitNetwork UI must present comments as native social comments and must not expose GitHub UI unnecessarily.

Before implementation, verify current GitHub API support for the selected mechanism.

If the required functionality is not available browser-only, document the limitation rather than adding a backend.

---

## 25. Media

MVP1 supports images only.

Supported:

- JPG
- PNG
- WebP

Maximum size:

```text
10 MB
```

Store media under:

```text
media/<post-id>/<filename>
```

The post references the resulting GitHub raw content.

Do not support video in MVP1.

---

## 26. Caching

GitHub API must not be called on every render.

Use:

```typescript
interface CacheStorage {
  get(key)
  set(key, value)
  delete(key)
}
```

MVP implementation:

- IndexedDB for substantive data;
- localStorage only for small settings.

Cache:

- GitHub profiles;
- repository metadata;
- posts;
- following;
- feed.

Default TTL:

```text
5 minutes
```

Invalidate cache after mutations.

Cache is never the source of truth.

---

## 27. Storage Abstraction

Use:

```typescript
interface SocialStorage {
  getProfile(username)
  getPosts(username)
  getPost(username, postId)
  createPost(post)
  uploadMedia(...)
  getFollowing(username)
}
```

First implementation:

```text
GitHubStorage
```

Future-compatible providers may include:

```text
GitLabStorage
CodebergStorage
IPFSStorage
LocalGitStorage
```

Do not implement future providers in MVP1.

---

## 28. GitHub API Layer

Do not call GitHub API directly from React components.

Use an API/domain structure such as:

```text
src/
    api/
        github/
            githubClient
            repositories
            users
            contents
            reactions
            issues
            discussions
```

UI should call domain services:

```text
socialService.createPost()
```

rather than:

```text
github.createFile()
```

---

## 29. UI

Use a modern minimalist social UI with an original visual identity.

Desktop:

```text
┌──────────────────────────────────────────────┐
│ Logo                                         │
├──────────────┬───────────────────┬───────────┤
│ Home         │                   │           │
│ Explore      │      Feed         │           │
│ Notifications│                   │           │
│ Profile      │                   │           │
└──────────────┴───────────────────┴───────────┘
```

Desktop: three-column layout.

Mobile: single-column layout.

Do not literally copy Twitter/X or VK design.

---

## 30. Pages

Create:

```text
/
/login
/home
/explore
/@username
/@username/post/:postId
/settings
```

Correctly handle URL encoding for GitHub usernames.

---

## 31. Explore

Explore may show:

- popular GitHub users;
- popular repositories;
- recent social posts;
- trending topics.

Use GitHub public API and local deterministic ranking where possible.

Do not create a backend crawler.

---

## 32. Settings

Settings should include:

- GitHub account;
- social repository;
- cache;
- recommendation settings;
- export/data portability guidance;
- logout.

Provide:

```text
Open my Social Repository
```

The user must understand that their social data lives in GitHub.

---

## 33. Data Portability

Data portability is part of the product concept.

Explain:

> Your social data is stored in your GitHub repository and can be cloned or migrated.

Provide a repository link and export/backup guidance.

Do not implement automatic backup in MVP1.

The architecture should leave room for future backup mechanisms.

---

## 34. Privacy

Default social repository:

- public;
- public posts;
- public profile.

Show clearly during onboarding:

> Your Social Repository is public.

Do not store private information in MVP1.

Never:

- store access tokens in repositories;
- send GitHub tokens to third-party servers.

---

## 35. Security

Maintain:

- safe client-side token handling appropriate to the chosen OAuth flow;
- no committed secrets;
- no token analytics;
- no telemetry backend;
- no third-party trackers;
- CSP;
- Markdown sanitization;
- HTML sanitization;
- XSS protection;
- upload size limits;
- MIME validation;
- no executable HTML in post content.

Treat all user-generated content as untrusted.

---

## 36. Technology

If a repository already exists, inspect and preserve its current stack.

If starting from scratch, recommended stack:

- TypeScript;
- React;
- Vite;
- React Router;
- Tailwind CSS;
- GitHub API;
- IndexedDB;
- Vitest;
- Playwright.

Do not add heavy dependencies without necessity.

---

## 37. GitHub Pages

The application must compile to static assets.

```text
npm run build
```

The result must be deployable to GitHub Pages.

GitHub Actions:

```text
push to main
    ↓
npm install
    ↓
npm run test
    ↓
npm run build
    ↓
deploy GitHub Pages
```

Use:

```text
.github/workflows/deploy.yml
```

---

## 38. Testing

Unit tests:

- post parser;
- frontmatter parser;
- post sorting;
- recommendation scoring;
- cache;
- repository detection.

E2E tests:

- landing;
- login mock;
- profile;
- feed;
- create post mock;
- navigation.

Do not perform destructive real GitHub API operations in CI.

GitHub API must be mockable.

---

## 39. Documentation

Maintain:

```text
README.md
```

README must cover:

- concept;
- architecture;
- setup;
- GitHub OAuth setup;
- local development;
- deployment;
- data model;
- security model;
- limitations;
- roadmap.

Also maintain:

```text
.env.example
```

without secrets.

---

## 40. MVP1 Acceptance Criteria

MVP1 is complete when:

- [ ] User can open the site.
- [ ] User can authenticate with GitHub.
- [ ] User can create/check the `/social` repository.
- [ ] User can view their profile.
- [ ] User can create a post.
- [ ] Post physically appears in the GitHub repository.
- [ ] User can open their post.
- [ ] Another user can open the profile.
- [ ] Feed displays posts.
- [ ] Following feed works.
- [ ] Like/reaction works or the GitHub limitation is documented.
- [ ] Comments work or the GitHub limitation is documented.
- [ ] Images work.
- [ ] IndexedDB cache works.
- [ ] Application works without a backend.
- [ ] Application builds as a static site.
- [ ] GitHub Pages deployment works.
- [ ] README contains complete instructions.
- [ ] No secrets exist in the repository.
- [ ] No server-side database exists.

---

## 41. Implementation Phases

### Phase 1 — Foundation

- inspect existing project;
- TypeScript;
- routing;
- UI system;
- GitHub API client;
- mock GitHub API;
- storage abstraction.

### Phase 2 — Identity

- GitHub login;
- current user;
- profile;
- repository onboarding.

### Phase 3 — Posts

- post model;
- Markdown parser;
- create post;
- read posts;
- profile timeline.

### Phase 4 — Social

- following;
- feed;
- reactions;
- comments.

### Phase 5 — Media

- image upload;
- image rendering.

### Phase 6 — Recommendations

- local ranking;
- For You;
- Explore.

### Phase 7 — Cache

- IndexedDB;
- invalidation;
- offline read-only mode.

### Phase 8 — Deployment

- GitHub Actions;
- GitHub Pages;
- production build;
- documentation.

---

## 42. Phase Definition of Done

After every phase:

1. Run tests.
2. Run build.
3. Inspect Git diff.
4. Fix TypeScript errors.
5. Update README/documentation.
6. Create a Git commit.

Do not proceed while the current phase is broken.

---

## 43. MVP1 Completion and MVP2 Handoff

MVP1 completion includes planning the next version.

After all MVP1 acceptance criteria are satisfied:

1. Inspect the actual implementation.
2. Review architecture and technical debt.
3. Review GitHub API limitations.
4. Review security findings.
5. Compare implementation with the MVP1 specification.
6. Update:

```text
docs/roadmap/MVP2.md
```

7. Create/update:

```text
docs/roadmap/MVP2-TASKS.md
```

8. Commit the roadmap artifacts.

Do not begin MVP2 implementation until this planning step is complete.

The actual MVP1 implementation takes precedence over assumptions in the MVP2 roadmap.

---

## 44. Research Requirement

Before implementing GitHub-dependent functionality:

1. Research the current GitHub REST API.
2. Research the current GitHub GraphQL API where relevant.
3. Determine whether the operation works from a browser-only application.
4. Verify OAuth behavior.
5. Verify repository creation.
6. Verify file operations.
7. Verify image uploads.
8. Verify reactions.
9. Verify Issues.
10. Verify Discussions.
11. Verify following.
12. Verify rate limits.

Never invent endpoints.

If a capability requires a backend:

- do not add a backend;
- find a browser-compatible fallback;
- or document the limitation.

Record findings in:

```text
docs/github-api-limitations.md
```

---

## 45. MVP1 Principle

Keep the architecture minimal:

```text
Browser
   ↓
GitNetwork domain services
   ↓
GitHub API
   ↓
GitHub repositories
```

Do not introduce:

```text
Browser
   ↓
Backend
   ↓
Database
   ↓
GitHub
```

The core principle is:

> GitHub is the user's identity and storage. GitNetwork is the social experience and protocol layer.
