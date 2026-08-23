# GitNetwork MVP2 — Implementation Tasks

## How to Use This File

This file is the execution backlog for MVP2.

The implementation must follow dependency order.

Priority:

- **P0** — required for MVP2
- **P1** — important
- **P2** — optional/stretch

Rules:

1. Inspect the actual MVP1 implementation before executing MVP2 tasks.
2. Do not assume the original MVP1 specification matches the code.
3. Update this file when implementation changes the plan.
4. Do not mark a task complete without satisfying its acceptance criteria.
5. Run tests and build after meaningful milestones.
6. Do not introduce a backend/database to solve an MVP2 problem unless the architecture is explicitly changed and approved.
7. Keep Git as the source of truth.
8. Complete tasks in dependency order unless a dependency is explicitly documented as satisfied.

---

# Phase 0 — MVP1 Completion and MVP2 Planning

## MVP2-001 — Verify MVP1 completion

**Priority:** P0  
**Component:** Project / QA

Review the actual MVP1 implementation against the MVP1 acceptance criteria.

### Acceptance

- [ ] All MVP1 acceptance criteria have been checked.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] GitHub Pages/static deployment works.
- [ ] No backend/database has been introduced.
- [ ] Security requirements have been checked.
- [ ] Known limitations are documented.

---

## MVP2-002 — Audit actual MVP1 architecture

**Priority:** P0  
**Component:** Architecture

Inspect:

- source tree;
- package.json;
- GitHub API layer;
- domain services;
- storage abstraction;
- cache;
- data schemas;
- authentication;
- tests;
- deployment.

### Acceptance

- [ ] Actual architecture is documented.
- [ ] Technical debt is documented.
- [ ] MVP1 deviations from the original plan are documented.
- [ ] Components that MVP2 must preserve are identified.

---

## MVP2-003 — Review GitHub API limitations

**Priority:** P0  
**Component:** GitHub API

Review current GitHub REST/GraphQL capabilities relevant to MVP2.

Focus on:

- repository contents;
- commits;
- authentication;
- following;
- reactions;
- Issues;
- Discussions;
- comments;
- rate limits;
- browser-only constraints.

### Acceptance

- [ ] `docs/github-api-limitations.md` is updated.
- [ ] Browser-only feasibility is documented.
- [ ] Unsupported operations have documented fallbacks.
- [ ] No unsupported API endpoint is assumed.

---

## MVP2-004 — Create/update MVP2 roadmap

**Priority:** P0  
**Component:** Planning

Update:

```text
docs/roadmap/MVP2.md
```

based on actual MVP1 findings.

### Acceptance

- [ ] MVP2 scope reflects actual MVP1 architecture.
- [ ] Risks are documented.
- [ ] Dependencies are documented.
- [ ] Acceptance criteria are defined.

---

# Phase 1 — Protocol Foundation

## MVP2-005 — Define GitNetwork protocol versioning

**Priority:** P0  
**Component:** Protocol

Define versioning rules for GitNetwork schemas.

### Acceptance

- [ ] Protocol version is defined.
- [ ] Schema version is defined.
- [ ] Backward compatibility rules are documented.
- [ ] MVP1 data remains readable.

---

## MVP2-006 — Define repository manifest

**Priority:** P0  
**Component:** Data model

Define a machine-readable `.social/manifest.json`.

It should describe:

- protocol version;
- supported features;
- repository type;
- schema versions.

### Acceptance

- [ ] Schema documented.
- [ ] Parser implemented.
- [ ] Validation implemented.
- [ ] Existing repositories without the manifest remain readable where possible.

---

## MVP2-007 — Define social event model

**Priority:** P0  
**Component:** Protocol / Social

Define provider-neutral event semantics.

Initial events:

- follow
- unfollow
- post
- comment
- reaction
- repost
- profile update

### Acceptance

- [ ] Event schema documented.
- [ ] Event IDs are unique and stable.
- [ ] Events contain schema/type information.
- [ ] Events can be validated.
- [ ] GitHub-specific implementation details are not part of the semantic model.

---

## MVP2-008 — Implement event parser/validator

**Priority:** P0  
**Component:** Protocol

Implement validation for GitNetwork events.

### Acceptance

- [ ] Valid events parse.
- [ ] Invalid events fail safely.
- [ ] Unknown future fields do not break compatible clients where appropriate.
- [ ] Unit tests exist.

---

# Phase 2 — Identity and Storage Evolution

## MVP2-009 — Formalize SocialStorage interface

**Priority:** P0  
**Component:** Architecture

Review and extend the MVP1 `SocialStorage` abstraction.

### Acceptance

- [ ] Domain code does not depend directly on GitHub API.
- [ ] GitHub remains the first implementation.
- [ ] Interface supports MVP2 social/context requirements.
- [ ] Future providers remain possible without implementing them.

---

## MVP2-010 — Formalize GitNetwork identity

**Priority:** P0  
**Component:** Identity

Define identity independent of GitHub-specific APIs while retaining GitHub as MVP2 provider.

### Acceptance

- [ ] Identity model documented.
- [ ] GitHub identity mapping documented.
- [ ] Future provider mapping is possible.
- [ ] No centralized identity service introduced.

---

## MVP2-011 — Evaluate cryptographic identity

**Priority:** P1  
**Component:** Security / Identity

Investigate whether cryptographic public keys should be introduced in MVP2.

### Acceptance

- [ ] Key generation options evaluated.
- [ ] Key storage options evaluated.
- [ ] Rotation/recovery limitations documented.
- [ ] Decision documented: implement or defer.

Do not implement speculative cryptographic identity without a clear requirement.

---

# Phase 3 — AI Context Format

## MVP2-012 — Define AI context schema

**Priority:** P0  
**Component:** AI / Protocol

Define provider-neutral schemas for:

- memory;
- decisions;
- project context;
- conversations;
- handoffs.

### Acceptance

- [ ] Schemas documented.
- [ ] Schema versions defined.
- [ ] Examples included.
- [ ] No provider-specific conversation format is required.

---

## MVP2-013 — Implement AI memory format

**Priority:** P0  
**Component:** AI Context

Implement parsing/writing of persistent memory.

### Acceptance

- [ ] Memory can be read.
- [ ] Memory can be written with authorization.
- [ ] Metadata is validated.
- [ ] Tests exist.

---

## MVP2-014 — Implement AI decision format

**Priority:** P0  
**Component:** AI Context

### Acceptance

- [ ] Decisions have stable IDs.
- [ ] Decisions include timestamp/context.
- [ ] Decisions can reference projects/posts/files.
- [ ] Parser and tests exist.

---

## MVP2-015 — Implement project context format

**Priority:** P0  
**Component:** AI Context

### Acceptance

- [ ] Project context can be discovered.
- [ ] Context can reference repository artifacts.
- [ ] Context is provider-neutral.
- [ ] Tests exist.

---

## MVP2-016 — Implement conversation format

**Priority:** P1  
**Component:** AI Context

Define a portable conversation representation.

### Acceptance

- [ ] Messages have stable IDs.
- [ ] Roles are represented.
- [ ] Metadata is optional and extensible.
- [ ] Provider-specific metadata does not become mandatory.

---

## MVP2-017 — Implement AI handoff format

**Priority:** P0  
**Component:** AI Context

### Acceptance

- [ ] Handoff schema documented.
- [ ] Completed work represented.
- [ ] Decisions represented.
- [ ] Current state represented.
- [ ] Open questions represented.
- [ ] Next steps represented.
- [ ] Another agent can consume the handoff.

---

# Phase 4 — Local GitNetwork MCP

## MVP2-018 — Research MCP integration requirements

**Priority:** P0  
**Component:** MCP

Verify current MCP capabilities required by the target clients.

### Acceptance

- [ ] STDIO architecture documented.
- [ ] Resources model documented.
- [ ] Tools model documented.
- [ ] Security/authorization considerations documented.
- [ ] No unsupported MCP behavior is assumed.

---

## MVP2-019 — Create GitNetwork MCP server

**Priority:** P0  
**Component:** MCP

Create a local process:

```text
gitnetwork-mcp
```

It must operate against the user's local GitNetwork repository.

### Acceptance

- [ ] MCP server starts locally.
- [ ] STDIO transport works.
- [ ] No remote GitNetwork backend is required.
- [ ] Repository path/configuration is explicit.
- [ ] Errors are handled safely.

---

## MVP2-020 — Implement MCP resources

**Priority:** P0  
**Component:** MCP

Initial resources:

```text
profile
social graph
posts
projects
AI memory
AI decisions
AI handoffs
```

### Acceptance

- [ ] Resources are discoverable.
- [ ] Resources return validated data.
- [ ] Private resources require authorization.
- [ ] Resource errors are safe and descriptive.

---

## MVP2-021 — Implement MCP read tools

**Priority:** P0  
**Component:** MCP

Implement read operations such as:

```text
get_profile
get_post
get_feed
get_social_graph
search_context
```

### Acceptance

- [ ] Tools work locally.
- [ ] Inputs are validated.
- [ ] No unnecessary full-repository loading.
- [ ] Tests exist.

---

## MVP2-022 — Implement MCP mutation tools

**Priority:** P0  
**Component:** MCP

Implement:

```text
create_post
comment
react
follow
unfollow
save_memory
save_decision
create_handoff
```

### Acceptance

- [ ] Mutations are explicit.
- [ ] User authorization is respected.
- [ ] Git changes are correctly created.
- [ ] Commit behavior is documented.
- [ ] Failed writes do not corrupt data.
- [ ] Tests exist.

---

## MVP2-023 — Implement MCP Git synchronization

**Priority:** P0  
**Component:** MCP / Git

Define how the local MCP process handles:

- pull;
- local changes;
- commit;
- push;
- conflicts.

### Acceptance

- [ ] Synchronization behavior documented.
- [ ] Conflict behavior documented.
- [ ] No silent overwrite occurs.
- [ ] User-owned changes are preserved.

---

# Phase 5 — GitNetwork Agent Skill

## MVP2-024 — Create GitNetwork agent skill

**Priority:** P0  
**Component:** AI Agent

Create a reusable skill/instruction document explaining GitNetwork behavior.

The skill must teach the agent:

- what GitNetwork is;
- what the repository represents;
- how to use context;
- how to protect private data;
- how to handle social actions;
- how to create handoffs.

### Acceptance

- [ ] Skill is documented.
- [ ] Skill is provider-neutral.
- [ ] Skill does not require a GitNetwork backend.
- [ ] Skill explains authorization boundaries.

---

## MVP2-025 — Add context discovery behavior

**Priority:** P0  
**Component:** AI Agent

Define when the agent should read:

- profile;
- project context;
- memory;
- decisions;
- latest handoff.

### Acceptance

- [ ] Behavior documented.
- [ ] Agent avoids unnecessary context loading.
- [ ] Relevant context is preferred over unrelated data.
- [ ] Private context is never implicitly exposed.

---

## MVP2-026 — Add context persistence behavior

**Priority:** P1  
**Component:** AI Agent

Define when the agent should offer to persist:

- important decisions;
- durable preferences;
- project changes;
- handoffs.

### Acceptance

- [ ] Persistence rules documented.
- [ ] User authorization required for mutations.
- [ ] No arbitrary conversation content is persisted automatically.

---

# Phase 6 — AI as Social Client

## MVP2-027 — AI-assisted post creation

**Priority:** P1  
**Component:** Social + AI

Allow an agent to:

1. inspect relevant context;
2. draft a post;
3. show the draft;
4. publish after user authorization.

### Acceptance

- [ ] User sees content before publication.
- [ ] Agent cannot silently publish.
- [ ] Post is stored in the user's repository.
- [ ] Existing post schema remains compatible.

---

## MVP2-028 — AI social activity summary

**Priority:** P1  
**Component:** Social + AI

Allow an agent to summarize relevant activity from the user's social graph.

### Acceptance

- [ ] Following graph is used.
- [ ] Relevant posts are retrieved.
- [ ] Private content is excluded unless authorized.
- [ ] No server-side tracking is introduced.

---

## MVP2-029 — AI project continuation

**Priority:** P1  
**Component:** AI Context

Allow an agent to continue a project from the latest context/handoff.

### Acceptance

- [ ] Latest handoff can be discovered.
- [ ] Project context can be loaded.
- [ ] Agent can identify open tasks.
- [ ] Tests demonstrate continuity.

---

# Phase 7 — Private Data

## MVP2-030 — Define public/private data model

**Priority:** P0  
**Component:** Security

Define which GitNetwork objects may be:

- public;
- private;
- shared with selected users.

### Acceptance

- [ ] Data classification documented.
- [ ] Repository representation documented.
- [ ] AI access rules documented.

---

## MVP2-031 — Design client-side encryption

**Priority:** P0  
**Component:** Security

Design encryption for private:

- messages;
- projects;
- AI memory;
- conversations.

### Acceptance

- [ ] Encryption scheme documented.
- [ ] Key lifecycle documented.
- [ ] Key recovery limitations documented.
- [ ] No plaintext private data is committed.
- [ ] No centralized key escrow is required.

---

## MVP2-032 — Implement private encrypted storage

**Priority:** P1  
**Component:** Security / Storage

Implement the minimum viable encrypted data layer.

### Acceptance

- [ ] Encryption happens client-side.
- [ ] Repository contains ciphertext only for private objects.
- [ ] Unauthorized clients cannot decrypt content.
- [ ] Tests cover encryption/decryption and failure cases.

---

# Phase 8 — Indexing and Discovery

## MVP2-033 — Evaluate scaling limits of client-side discovery

**Priority:** P0  
**Component:** Architecture / Performance

Measure where direct GitHub API access becomes insufficient.

### Acceptance

- [ ] API rate limits documented.
- [ ] Feed limitations documented.
- [ ] Search limitations documented.
- [ ] Decision made whether an indexer is required for MVP2.

Do not build an indexer merely because it may be useful in the future.

---

## MVP2-034 — Define optional non-authoritative pluggable indexer

**Priority:** P1  
**Component:** Indexing

Define an indexer architecture that is:

- rebuildable;
- replaceable;
- non-authoritative;
- canonical data remains in Git;
- no dependency for basic repository access;
- pluggable to allow third-party implementations.

### Acceptance

- [ ] Architecture documented.
- [ ] Trust model documented.
- [ ] Failure behavior documented.
- [ ] Pluggable indexer interface defined.

---

## MVP2-035 — Implement pluggable indexing service for recommendations

**Priority:** P1  
**Component:** Indexing

Implement a simple separate indexing service for recommendations that:

- Can be used by users of GitNetwork;
- Is pluggable, allowing others to develop their own indexers;
- Provides recommendation scoring based on extracted data;
- Does not modify canonical user content;
- Operates independently of the GitNetwork client.

### Acceptance

- [ ] Indexing service accepts Git repository data as input.
- [ ] Indexing service extracts posts, profiles, and social signals.
- [ ] Indexing service computes recommendation scores.
- [ ] Indexing service outputs index data in a standardized format.
- [ ] Pluggable indexer interface allows third-party implementations.
- [ ] Index does not modify canonical data.
- [ ] Client can operate when indexer is unavailable.

---

# Phase 8b — Media Files Support

## MVP2-036 — Extend media support beyond images

**Priority:** P1  
**Component:** Media

Extend media support to include:

- Images (JPG, PNG, WebP);
- PDFs;
- Links and embeds;
- Other common file types.

### Acceptance

- [ ] File size limits per media type defined.
- [ ] MIME type validation implemented.
- [ ] Secure storage in Git repository or external storage.
- [ ] Safe rendering in UI.
- [ ] No executable content allowed.

---

## MVP2-037 — Implement media file handling in posts

**Priority:** P1  
**Component:** Media / Posts

Posts should support:

- Inline images;
- Attached PDFs and documents;
- Link previews;
- Media galleries.

### Acceptance

- [ ] Media files can be attached to posts.
- [ ] Media files are validated and stored securely.
- [ ] Media files are rendered safely in the UI.
- [ ] Media upload respects size and type limits.

---

# Phase 8c — Direct Messages

## MVP2-038 — Design direct messages protocol

**Priority:** P1  
**Component:** Messaging / Security

Design private direct messages between users.

Direct messages must:

- Use client-side encryption;
- Not store plaintext in public repositories;
- Be accessible only to participating users;
- Support message history;
- Support media attachments (encrypted).

### Acceptance

- [ ] Direct messages protocol documented.
- [ ] Encryption scheme for messages documented.
- [ ] Public/private message distinction documented.
- [ ] Message history model defined.

---

## MVP2-039 — Implement encrypted direct messages

**Priority:** P2  
**Component:** Messaging / Storage

Implement encrypted direct messages storage and retrieval.

### Acceptance

- [ ] Direct messages are encrypted client-side.
- [ ] Ciphertext is stored securely.
- [ ] Unauthorized clients cannot decrypt content.
- [ ] Message history is preserved.

---

# Phase 8d — Profile Customization

## MVP2-040 — Design profile customization feature

**Priority:** P1  
**Component:** UI / Security

Allow users to customize their profiles beyond basic metadata.

Profile customization should support:

- Custom HTML/CSS for profile pages;
- Custom themes and layouts;
- Custom sections and widgets;
- User-defined profile structure.

### Acceptance

- [ ] Profile customization feature documented.
- [ ] Custom HTML/CSS storage model defined.
- [ ] Security requirements documented.

---

## MVP2-041 — Implement profile customization with HTML/CSS sanitization

**Priority:** P1  
**Component:** UI / Security

Implement profile customization with proper sanitization.

Security requirements:

- Sanitize custom HTML to prevent XSS;
- Validate custom CSS to prevent malicious styles;
- Ensure custom profiles remain accessible;
- Do not allow execution of arbitrary code.

### Acceptance

- [ ] Custom HTML/CSS can be saved by users.
- [ ] HTML is sanitized before rendering.
- [ ] CSS is validated to prevent malicious styles.
- [ ] No arbitrary code execution is possible.

---

# Phase 8e — Multi-Git-Service Support

## MVP2-042 — Design multi-Git-service support architecture

**Priority:** P1  
**Component:** Architecture / Providers

Formalize support for additional Git hosting services beyond GitHub.

Target providers:

- GitHub;
- GitLab;
- Codeberg;
- Other Git services.

### Acceptance

- [ ] Multi-provider architecture documented.
- [ ] Provider-specific authentication model defined.
- [ ] Provider-specific repository conventions defined.
- [ ] Provider-specific API capabilities documented.

---

## MVP2-043 — Extend storage abstraction for multi-provider support

**Priority:** P1  
**Component:** Storage

Extend the `SocialStorage` abstraction to support future providers.

### Acceptance

- [ ] Storage abstraction supports provider concepts.
- [ ] GitHub remains the default implementation.
- [ ] GitLab and Codeberg concepts are supported in the interface.

---

# Phase 9 — Private Data and Encryption

## MVP2-044 — Implement encryption for AI and private data

**Priority:** P1  
**Component:** Security

Implement client-side encryption for:

- Direct messages between users;
- Private AI memory and context;
- Private project data;
- Private conversations.

Encryption requirements:

- Use modern symmetric encryption (e.g., AES-GCM);
- Keys are derived from user-controlled secrets;
- Ciphertext is stored in the repository or private storage;
- Decryption happens entirely client-side;
- AI agents must not access encrypted data without explicit user authorization.

### Acceptance

- [ ] Encryption scheme implemented.
- [ ] Key derivation documented.
- [ ] Client-side encryption/decryption works.
- [ ] AI agents cannot access encrypted data without authorization.

---

# Phase 9 — Security and Prompt Injection

## MVP2-036 — Threat model GitNetwork AI integration

**Priority:** P0  
**Component:** Security

Analyze:

- malicious posts;
- malicious comments;
- prompt injection;
- malicious repositories;
- malicious links;
- poisoned project context;
- unauthorized social actions.

### Acceptance

- [ ] Threat model documented.
- [ ] Trust boundaries documented.
- [ ] Mitigations defined.

---

## MVP2-037 — Implement untrusted-content boundaries

**Priority:** P0  
**Component:** Security / AI

Ensure social content is treated as untrusted input.

### Acceptance

- [ ] Posts cannot silently become agent instructions.
- [ ] External content cannot override system/developer instructions.
- [ ] Sensitive tools require explicit authorization.
- [ ] Tests cover prompt injection examples.

---

## MVP2-038 — Security audit

**Priority:** P0  
**Component:** Security

Review:

- token handling;
- Git operations;
- MCP permissions;
- private data;
- Markdown rendering;
- XSS;
- file uploads;
- prompt injection.

### Acceptance

- [ ] Findings documented.
- [ ] P0/P1 findings resolved.
- [ ] Remaining risks documented.

---

# Phase 10 — Data Portability

## MVP2-039 — Document portable GitNetwork format

**Priority:** P1  
**Component:** Protocol

Document how a user can:

- clone;
- inspect;
- backup;
- migrate;
- restore.

### Acceptance

- [ ] Repository structure documented.
- [ ] Schema versions documented.
- [ ] Migration rules documented.
- [ ] No proprietary storage requirement.

---

## MVP2-040 — Add repository portability UI

**Priority:** P1  
**Component:** UI

Add:

- repository link;
- export/backup guidance;
- data ownership explanation.

### Acceptance

- [ ] User can easily open repository.
- [ ] User understands where data lives.
- [ ] No data is silently copied to a GitNetwork backend.

---

# Phase 11 — UI

## MVP2-041 — Add AI context UI

**Priority:** P1  
**Component:** Frontend

Potential pages/components:

- AI context;
- memory;
- decisions;
- projects;
- handoffs.

### Acceptance

- [ ] User can inspect stored AI context.
- [ ] Public/private state is visible.
- [ ] Repository remains source of truth.

---

## MVP2-042 — Add privacy controls

**Priority:** P1  
**Component:** Frontend

### Acceptance

- [ ] Public/private state is understandable.
- [ ] Encryption status is visible.
- [ ] AI access permissions are understandable.
- [ ] Dangerous actions require confirmation.

---

# Phase 12 — Documentation

## MVP2-043 — Update architecture documentation

**Priority:** P0  
**Component:** Documentation

Update:

```text
docs/architecture.md
docs/data-model.md
```

### Acceptance

- [ ] Architecture reflects actual implementation.
- [ ] Git source-of-truth model is explicit.
- [ ] MCP architecture is documented.
- [ ] AI context architecture is documented.
- [ ] Indexer trust model is documented if applicable.

---

## MVP2-044 — Document MCP

**Priority:** P0  
**Component:** Documentation

Create:

```text
docs/mcp/architecture.md
docs/mcp/tools.md
```

### Acceptance

- [ ] Setup documented.
- [ ] Resources documented.
- [ ] Tools documented.
- [ ] Permissions documented.
- [ ] Local-only architecture documented.

---

## MVP2-045 — Document AI context

**Priority:** P0  
**Component:** Documentation

Create:

```text
docs/ai/context-format.md
docs/ai/handoffs.md
docs/ai/agent-skill.md
```

### Acceptance

- [ ] Context schemas documented.
- [ ] Examples provided.
- [ ] Handoff format documented.
- [ ] Agent behavior documented.

---

# Phase 13 — Integration Testing

## MVP2-046 — End-to-end GitNetwork flow

**Priority:** P0  
**Component:** QA

Test:

```text
GitHub identity
    ↓
social repository
    ↓
profile
    ↓
post
    ↓
social interaction
    ↓
AI context
    ↓
MCP
    ↓
AI agent
    ↓
authorized mutation
    ↓
Git commit
```

### Acceptance

- [ ] Complete flow works.
- [ ] No backend is required.
- [ ] Data remains in the repository.

---

## MVP2-047 — AI handoff integration test

**Priority:** P0  
**Component:** QA / AI

Simulate:

```text
Agent A
    ↓
project work
    ↓
handoff
    ↓
GitNetwork
    ↓
Agent B
    ↓
continue project
```

### Acceptance

- [ ] Agent B can discover the handoff.
- [ ] Agent B understands current state.
- [ ] Decisions are preserved.
- [ ] No provider-specific format is required.

---

## MVP2-048 — Security integration tests

**Priority:** P0  
**Component:** QA / Security

Test:

- private context isolation;
- malicious social content;
- prompt injection;
- unauthorized mutation;
- invalid Git data;
- malformed MCP input.

### Acceptance

- [ ] All critical security tests pass.
- [ ] No private data leaks.
- [ ] No unauthorized social mutation succeeds.

---

# Phase 14 — Release

## MVP2-053 — Production build

**Priority:** P0  
**Component:** Release

### Acceptance

- [ ] TypeScript passes.
- [ ] Unit tests pass.
- [ ] E2E tests pass.
- [ ] Production build passes.
- [ ] Static deployment works.

---

## MVP2-054 — Final MVP2 documentation review

**Priority:** P0  
**Component:** Documentation

### Acceptance

- [ ] README updated.
- [ ] Architecture updated.
- [ ] Data model updated.
- [ ] Security documentation updated.
- [ ] MCP documentation updated.
- [ ] AI context documentation updated.
- [ ] Indexing documentation updated.
- [ ] Media documentation updated.
- [ ] Messaging documentation updated.
- [ ] Providers documentation updated.
- [ ] Known limitations documented.

---

## MVP2-055 — Final acceptance review

**Priority:** P0  
**Component:** Release

Verify every MVP2 acceptance criterion.

### Acceptance

- [ ] All P0 tasks complete.
- [ ] All MVP2 acceptance criteria complete.
- [ ] Remaining P1/P2 tasks explicitly documented as deferred.
- [ ] No hidden backend/database exists.
- [ ] Git remains source of truth.
- [ ] MVP1 compatibility is preserved.

---

# Deferred / Future Work

These are intentionally not MVP2 requirements unless the roadmap is explicitly updated:

- GitLab provider as a full production provider
- Codeberg provider as a full production provider
- LocalGit provider as a full production provider
- IPFS provider
- full federation
- advanced recommendation ML
- native mobile apps
- monetization
- advertising
- centralized AI context service
- centralized key recovery
- advanced social recovery
- full multi-provider automatic ChatGPT/Claude/Gemini browser synchronization

---

# Suggested Dependency Order

```text
MVP2-001
   ↓
MVP2-002
   ↓
MVP2-003
   ↓
MVP2-004
   ↓
Protocol foundation
   ├── MVP2-005
   ├── MVP2-006
   ├── MVP2-007
   └── MVP2-008
          ↓
Storage / Identity
   ├── MVP2-009
   └── MVP2-010
          ↓
AI Context
   ├── MVP2-012
   ├── MVP2-013
   ├── MVP2-014
   ├── MVP2-015
   └── MVP2-017
          ↓
MCP
   ├── MVP2-018
   ├── MVP2-019
   ├── MVP2-020
   ├── MVP2-021
   ├── MVP2-022
   └── MVP2-023
          ↓
Agent Skill
   ├── MVP2-024
   ├── MVP2-025
   └── MVP2-026
          ↓
AI Social Client
   ├── MVP2-027
   ├── MVP2-028
   └── MVP2-029

Security should run in parallel:
MVP2-030 → MVP2-031 → MVP2-032
MVP2-036 → MVP2-037 → MVP2-038

Indexing:
MVP2-033 → MVP2-034 → MVP2-035

Media / Messaging / Customization / Providers:
MVP2-036 → MVP2-037
MVP2-038 → MVP2-039
MVP2-040 → MVP2-041
MVP2-042 → MVP2-043

Encryption:
MVP2-044

Final:
MVP2-053 → MVP2-063
```

---

# Change Log

## Initial MVP2 Plan

This roadmap is derived from the MVP1 architecture and the GitNetwork MVP2 product direction.

The roadmap must be updated after MVP1 implementation review.

Do not treat assumptions in this document as facts about the current codebase until `MVP2-002` has been completed.
