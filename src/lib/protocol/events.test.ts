import { describe, it, expect } from 'vitest'
import {
  isValidEvent,
  parseEvent,
  createFollowEvent,
  createPostEvent,
  createReactionEvent,
  type FollowEvent,
  type PostEvent,
  type ReactionEvent,
} from './events'

describe('protocol events', () => {
  describe('isValidEvent', () => {
    it('accepts valid follow event', () => {
      const event: FollowEvent = {
        schemaVersion: 1,
        type: 'follow',
        id: '01HQXYZ123',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        target: 'bob',
      }
      expect(isValidEvent(event)).toBe(true)
    })

    it('accepts valid unfollow event', () => {
      const event = {
        schemaVersion: 1,
        type: 'unfollow',
        id: '01HQXYZ124',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        target: 'bob',
      }
      expect(isValidEvent(event)).toBe(true)
    })

    it('accepts valid post event', () => {
      const event: PostEvent = {
        schemaVersion: 1,
        type: 'post',
        id: '01HQXYZ125',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        postId: '01JXYZ123',
        postPath: 'posts/2026/08/22/01JXYZ123.md',
      }
      expect(isValidEvent(event)).toBe(true)
    })

    it('accepts valid comment event', () => {
      const event = {
        schemaVersion: 1,
        type: 'comment',
        id: '01HQXYZ126',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        postId: '01JXYZ123',
        commentId: 'comment-456',
      }
      expect(isValidEvent(event)).toBe(true)
    })

    it('accepts valid reaction event', () => {
      const event: ReactionEvent = {
        schemaVersion: 1,
        type: 'reaction',
        id: '01HQXYZ127',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        postId: '01JXYZ123',
        reactionType: 'heart',
      }
      expect(isValidEvent(event)).toBe(true)
    })

    it('accepts all valid reaction types', () => {
      const types: ReactionEvent['reactionType'][] = ['heart', 'rocket', 'laugh', 'hooray', 'confused', 'eyes']
      for (const type of types) {
        const event = {
          schemaVersion: 1,
          type: 'reaction',
          id: '01HQXYZ128',
          createdAt: '2026-08-22T00:00:00Z',
          actor: 'alice',
          postId: '01JXYZ123',
          reactionType: type,
        }
        expect(isValidEvent(event)).toBe(true)
      }
    })

    it('accepts valid repost event', () => {
      const event = {
        schemaVersion: 1,
        type: 'repost',
        id: '01HQXYZ129',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        originalPostId: '01JXYZ123',
        originalAuthor: 'bob',
      }
      expect(isValidEvent(event)).toBe(true)
    })

    it('accepts valid profile_update event', () => {
      const event = {
        schemaVersion: 1,
        type: 'profile_update',
        id: '01HQXYZ130',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        fields: ['displayName', 'bio'],
      }
      expect(isValidEvent(event)).toBe(true)
    })

    it('rejects event missing schemaVersion', () => {
      const event = {
        type: 'follow',
        id: '01HQXYZ131',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        target: 'bob',
      }
      expect(isValidEvent(event)).toBe(false)
    })

    it('rejects event with invalid type', () => {
      const event = {
        schemaVersion: 1,
        type: 'invalid_type',
        id: '01HQXYZ132',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        target: 'bob',
      }
      expect(isValidEvent(event)).toBe(false)
    })

    it('rejects event missing id', () => {
      const event = {
        schemaVersion: 1,
        type: 'follow',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        target: 'bob',
      }
      expect(isValidEvent(event)).toBe(false)
    })

    it('rejects event missing createdAt', () => {
      const event = {
        schemaVersion: 1,
        type: 'follow',
        id: '01HQXYZ133',
        actor: 'alice',
        target: 'bob',
      }
      expect(isValidEvent(event)).toBe(false)
    })

    it('rejects event missing actor', () => {
      const event = {
        schemaVersion: 1,
        type: 'follow',
        id: '01HQXYZ134',
        createdAt: '2026-08-22T00:00:00Z',
        target: 'bob',
      }
      expect(isValidEvent(event)).toBe(false)
    })

    it('rejects non-object data', () => {
      expect(isValidEvent(null)).toBe(false)
      expect(isValidEvent('not an object')).toBe(false)
      expect(isValidEvent([])).toBe(false)
    })
  })

  describe('parseEvent', () => {
    it('parses valid follow event JSON', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        type: 'follow',
        id: '01HQXYZ135',
        createdAt: '2026-08-22T00:00:00Z',
        actor: 'alice',
        target: 'bob',
      })
      const event = parseEvent(json)
      expect(event).not.toBeNull()
      expect(event?.type).toBe('follow')
      expect(event?.actor).toBe('alice')
      if (event?.type === 'follow') {
        expect(event.target).toBe('bob')
      }
    })

    it('returns null for invalid JSON', () => {
      expect(parseEvent('not valid json')).toBeNull()
    })

    it('returns null for JSON with invalid event structure', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        type: 'follow',
        id: '01HQXYZ136',
      })
      expect(parseEvent(json)).toBeNull()
    })
  })

  describe('event creators', () => {
    it('creates valid follow event', () => {
      const event = createFollowEvent('alice', 'bob')
      expect(isValidEvent(event)).toBe(true)
      expect(event.type).toBe('follow')
      expect(event.actor).toBe('alice')
      expect(event.target).toBe('bob')
      expect(event.schemaVersion).toBe(1)
    })

    it('creates valid post event', () => {
      const event = createPostEvent('alice', '01JXYZ123', 'posts/2026/08/22/01JXYZ123.md')
      expect(isValidEvent(event)).toBe(true)
      expect(event.type).toBe('post')
      expect(event.postId).toBe('01JXYZ123')
      expect(event.postPath).toBe('posts/2026/08/22/01JXYZ123.md')
    })

    it('creates valid reaction event', () => {
      const event = createReactionEvent('alice', '01JXYZ123', 'heart')
      expect(isValidEvent(event)).toBe(true)
      expect(event.type).toBe('reaction')
      expect(event.reactionType).toBe('heart')
    })
  })
})
