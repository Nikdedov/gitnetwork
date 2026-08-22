# AI Context Format

GitNetwork defines a provider-neutral AI context format for:

- Memory
- Decisions
- Project context
- Conversations
- Handoffs

## Context Schema

All AI contexts share a common base structure:

```json
{
  "schemaVersion": 1,
  "type": "context_type",
  "id": "ulid-context-id",
  "createdAt": "2026-08-22T00:00:00Z",
  "updatedAt": "2026-08-22T00:00:00Z",
  "metadata": {}
}
```

### Fields

- `schemaVersion`: Number, must be `1`
- `type`: String, one of: `memory`, `decision`, `project`, `conversation`, `handoff`
- `id`: String, ULID identifier for the context
- `createdAt`: String, ISO 8601 timestamp
- `updatedAt`: String, ISO 8601 timestamp (optional)
- `metadata`: Object, additional metadata (optional)

## Context Types

### Memory

Long-lived facts/preferences that the user explicitly allows to persist.

```json
{
  "schemaVersion": 1,
  "type": "memory",
  "id": "01HQXYZ123",
  "createdAt": "2026-08-22T00:00:00Z",
  "category": "preference",
  "content": "User prefers TypeScript",
  "isPersistent": true,
  "tags": ["typescript", "language"]
}
```

### Decision

Important decisions made during work.

```json
{
  "schemaVersion": 1,
  "type": "decision",
  "id": "01HQXYZ124",
  "createdAt": "2026-08-22T00:00:00Z",
  "title": "Use Git as source of truth",
  "description": "Git repositories are the source of truth for social content",
  "reasons": [
    "Avoid centralized ownership",
    "User data portability"
  ],
  "relatedIds": ["post-001"]
}
```

### Project Context

Project-specific information including goals, constraints, current state, important files, and open questions.

```json
{
  "schemaVersion": 1,
  "type": "project",
  "id": "01HQXYZ125",
  "createdAt": "2026-08-22T00:00:00Z",
  "name": "GitNetwork MVP2",
  "goals": [
    "Implement AI context",
    "Add MCP server"
  ],
  "constraints": [
    "No backend",
    "Static deployment"
  ],
  "currentState": "Phase 3 implementation",
  "importantFiles": [
    "src/lib/ai/context/schemas.ts",
    "docs/ai/context-format.md"
  ],
  "openQuestions": [
    "How to handle encryption?"
  ]
}
```

### Conversation

A portable representation of an AI conversation.

```json
{
  "schemaVersion": 1,
  "type": "conversation",
  "id": "01HQXYZ126",
  "createdAt": "2026-08-22T00:00:00Z",
  "messages": [
    {
      "id": "msg-001",
      "role": "user",
      "content": "Hello",
      "createdAt": "2026-08-22T00:00:00Z"
    },
    {
      "id": "msg-002",
      "role": "assistant",
      "content": "Hi there!",
      "createdAt": "2026-08-22T00:00:01Z"
    }
  ],
  "provider": "opencode"
}
```

### Handoff

A concise continuation package for moving work from one AI agent/provider to another.

```json
{
  "schemaVersion": 1,
  "type": "handoff",
  "id": "01HQXYZ127",
  "createdAt": "2026-08-22T00:00:00Z",
  "completedWork": [
    "Implemented memory format",
    "Implemented decision format"
  ],
  "decisions": [
    "Use Git as source of truth"
  ],
  "currentState": "Phase 3 in progress",
  "openQuestions": [
    "How to handle encryption?"
  ],
  "nextSteps": [
    "Implement project context",
    "Implement handoff format"
  ],
  "sourceProvider": "opencode",
  "targetProvider": "claude"
}
```

## Storage Location

AI context is stored in the repository under:

```
ai/
├── memory/
│   └── YYYY/MM/DD/<context-id>.json
├── decisions/
│   └── YYYY/MM/DD/<context-id>.json
├── projects/
│   └── <project-name>/
├── conversations/
│   └── YYYY/MM/DD/<context-id>.json
└── handoffs/
    └── YYYY/MM/DD/<context-id>.json
```

## Provider Neutrality

The context format is provider-neutral and can be used by:

- OpenCode
- Claude-compatible agents
- ChatGPT-compatible integrations where supported
- Gemini-compatible integrations where supported
- Local LLM agents
- Future GitNetwork clients

The context format does not depend on one AI provider's proprietary conversation format.
