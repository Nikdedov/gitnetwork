import { describe, it, expect } from 'vitest'
import {
  isValidContext,
  parseContext,
  createMemoryContext,
  createDecisionContext,
  createProjectContext,
  createConversationContext,
  createHandoffContext,
  type MemoryContext,
  type DecisionContext,
  type ProjectContext,
  type ConversationMessage,
} from './schemas'

describe('ai context schemas', () => {
  describe('isValidContext', () => {
    it('accepts valid memory context', () => {
      const context: MemoryContext = {
        schemaVersion: 1,
        type: 'memory',
        id: '01HQXYZ123',
        createdAt: '2026-08-22T00:00:00Z',
        category: 'preference',
        content: 'User prefers TypeScript',
        isPersistent: true,
      }
      expect(isValidContext(context)).toBe(true)
    })

    it('accepts valid decision context', () => {
      const context: DecisionContext = {
        schemaVersion: 1,
        type: 'decision',
        id: '01HQXYZ124',
        createdAt: '2026-08-22T00:00:00Z',
        title: 'Use Git as source of truth',
        description: 'Git repositories are the source of truth for social content',
        reasons: ['Avoid centralized ownership', 'User data portability'],
        relatedIds: ['post-001'],
      }
      expect(isValidContext(context)).toBe(true)
    })

    it('accepts valid project context', () => {
      const context: ProjectContext = {
        schemaVersion: 1,
        type: 'project',
        id: '01HQXYZ125',
        createdAt: '2026-08-22T00:00:00Z',
        name: 'GitNetwork MVP2',
        goals: ['Implement AI context', 'Add MCP server'],
        constraints: ['No backend', 'Static deployment'],
        currentState: 'Phase 3 implementation',
        importantFiles: ['src/lib/ai/context/schemas.ts', 'docs/ai/context-format.md'],
        openQuestions: ['How to handle encryption?'],
      }
      expect(isValidContext(context)).toBe(true)
    })

    it('accepts valid conversation context', () => {
      const messages: ConversationMessage[] = [
        {
          id: 'msg-001',
          role: 'user',
          content: 'Hello',
          createdAt: '2026-08-22T00:00:00Z',
        },
        {
          id: 'msg-002',
          role: 'assistant',
          content: 'Hi there!',
          createdAt: '2026-08-22T00:00:01Z',
        },
      ]
      const context = createConversationContext(messages, 'opencode')
      expect(isValidContext(context)).toBe(true)
    })

    it('accepts valid handoff context', () => {
      const context = createHandoffContext(
        ['Implemented memory format', 'Implemented decision format'],
        ['Use Git as source of truth'],
        'Phase 3 in progress',
        ['How to handle encryption?'],
        ['Implement project context', 'Implement handoff format'],
        'opencode',
        'claude',
      )
      expect(isValidContext(context)).toBe(true)
    })

    it('rejects context missing schemaVersion', () => {
      const context = {
        type: 'memory',
        id: '01HQXYZ126',
        createdAt: '2026-08-22T00:00:00Z',
        category: 'preference',
        content: 'Test',
        isPersistent: true,
      }
      expect(isValidContext(context)).toBe(false)
    })

    it('rejects context with invalid type', () => {
      const context = {
        schemaVersion: 1,
        type: 'invalid_type',
        id: '01HQXYZ127',
        createdAt: '2026-08-22T00:00:00Z',
      }
      expect(isValidContext(context)).toBe(false)
    })

    it('rejects non-object data', () => {
      expect(isValidContext(null)).toBe(false)
      expect(isValidContext('not an object')).toBe(false)
      expect(isValidContext([])).toBe(false)
    })
  })

  describe('parseContext', () => {
    it('parses valid memory context JSON', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        type: 'memory',
        id: '01HQXYZ128',
        createdAt: '2026-08-22T00:00:00Z',
        category: 'preference',
        content: 'User prefers TypeScript',
        isPersistent: true,
      })
      const context = parseContext(json)
      expect(context).not.toBeNull()
      expect(context?.type).toBe('memory')
      if (context?.type === 'memory') {
        expect(context.category).toBe('preference')
      }
    })

    it('returns null for invalid JSON', () => {
      expect(parseContext('not valid json')).toBeNull()
    })

    it('returns null for JSON with invalid context structure', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        type: 'memory',
        id: '01HQXYZ129',
      })
      expect(parseContext(json)).toBeNull()
    })
  })

  describe('context creators', () => {
    it('creates valid memory context', () => {
      const context = createMemoryContext('preference', 'User prefers TypeScript', true)
      expect(isValidContext(context)).toBe(true)
      expect(context.type).toBe('memory')
      expect(context.category).toBe('preference')
      expect(context.isPersistent).toBe(true)
    })

    it('creates valid decision context', () => {
      const context = createDecisionContext(
        'Use Git as source of truth',
        'Git repositories are the source of truth',
        ['Avoid centralized ownership', 'User data portability'],
      )
      expect(isValidContext(context)).toBe(true)
      expect(context.type).toBe('decision')
      expect(context.reasons.length).toBe(2)
    })

    it('creates valid project context', () => {
      const context = createProjectContext(
        'GitNetwork MVP2',
        ['Implement AI context'],
        ['No backend'],
        'Phase 3 in progress',
        ['src/lib/ai/context/schemas.ts'],
        ['How to handle encryption?'],
      )
      expect(isValidContext(context)).toBe(true)
      expect(context.type).toBe('project')
      expect(context.name).toBe('GitNetwork MVP2')
    })

    it('creates valid handoff context', () => {
      const context = createHandoffContext(
        ['Implemented memory format'],
        ['Use Git as source of truth'],
        'Phase 3 in progress',
        ['How to handle encryption?'],
        ['Implement project context'],
        'opencode',
        'claude',
      )
      expect(isValidContext(context)).toBe(true)
      expect(context.type).toBe('handoff')
      expect(context.sourceProvider).toBe('opencode')
      expect(context.targetProvider).toBe('claude')
    })
  })
})
