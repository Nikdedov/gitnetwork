# GitNetwork MCP Architecture

The GitNetwork MCP (Model Context Protocol) server provides a local integration interface for AI agents to interact with GitNetwork data.

## Architecture

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

## Local-Only Architecture

The MCP server must not require a GitNetwork-hosted backend.

The MCP layer is an integration interface, not the storage protocol.

The MCP server operates against the user's local GitNetwork repository via STDIO transport.

## Resources

Initial resources include:

```
gitnetwork://profile
gitnetwork://social-graph
gitnetwork://posts
gitnetwork://ai/memory
gitnetwork://ai/decisions
gitnetwork://ai/handoffs
```

## Tools

Initial tools cover:

### Read Tools
- `get_profile()`
- `get_post()`
- `get_feed()`
- `get_social_graph()`
- `search_context()`

### Mutation Tools
- `create_post()`
- `comment()`
- `react()`
- `follow()`
- `unfollow()`
- `save_memory()`
- `save_decision()`
- `create_handoff()`

## Authorization

Tools that mutate user data must require explicit user authorization through the host agent/client where appropriate.

The agent must not silently publish social content.

## Git Synchronization

The local MCP process handles:

- pull
- local changes
- commit
- push
- conflicts

No silent overwrite occurs. User-owned changes are preserved.
