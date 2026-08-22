# AI Handoffs

A handoff is a concise continuation package for moving work from one AI agent/provider to another.

## Handoff Structure

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

## Handoff Fields

### completedWork

Array of strings describing work that has been completed.

### decisions

Array of strings describing important decisions made during the work.

### currentState

String describing the current state of the project or work.

### openQuestions

Array of strings describing open questions that need to be addressed.

### nextSteps

Array of strings describing the next steps to take.

### sourceProvider

Optional string identifying the AI agent/provider that created the handoff.

### targetProvider

Optional string identifying the AI agent/provider that should receive the handoff.

## Usage

An AI agent should:

1. Read relevant project context
2. Read latest handoff
3. Inspect repository
4. Continue from the documented state

## Example Flow

```
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

Agent B can discover the handoff, understand the current state, preserve decisions, and continue work without requiring provider-specific formats.
