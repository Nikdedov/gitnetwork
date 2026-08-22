import { describe, it, expect } from 'vitest'
import { isValidManifest, parseManifest, createDefaultManifest, type SocialManifest } from './manifest'

describe('protocol manifest', () => {
  describe('isValidManifest', () => {
    it('accepts valid manifest', () => {
      const manifest: SocialManifest = {
        schemaVersion: 1,
        protocolVersion: 2,
        repositoryType: 'social',
        features: ['posts', 'profile', 'following', 'reactions', 'comments', 'media'],
        schemas: {
          profile: 1,
          post: 1,
          event: 1,
        },
      }
      expect(isValidManifest(manifest)).toBe(true)
    })

    it('rejects manifest with invalid protocol version (too high)', () => {
      const manifest: SocialManifest = {
        schemaVersion: 1,
        protocolVersion: 99,
        repositoryType: 'social',
        features: ['posts'],
        schemas: {
          profile: 1,
          post: 1,
          event: 1,
        },
      }
      expect(isValidManifest(manifest)).toBe(false)
    })

    it('rejects manifest with invalid repositoryType', () => {
      const manifest = {
        schemaVersion: 1,
        protocolVersion: 2,
        repositoryType: 'invalid',
        features: ['posts'],
        schemas: {
          profile: 1,
          post: 1,
          event: 1,
        },
      }
      expect(isValidManifest(manifest)).toBe(false)
    })

    it('rejects manifest missing schemaVersion', () => {
      const manifest = {
        protocolVersion: 2,
        repositoryType: 'social',
        features: ['posts'],
        schemas: {
          profile: 1,
          post: 1,
          event: 1,
        },
      }
      expect(isValidManifest(manifest)).toBe(false)
    })

    it('rejects manifest missing schemas', () => {
      const manifest = {
        schemaVersion: 1,
        protocolVersion: 2,
        repositoryType: 'social',
        features: ['posts'],
      }
      expect(isValidManifest(manifest)).toBe(false)
    })

    it('rejects manifest with invalid schema types', () => {
      const manifest = {
        schemaVersion: 1,
        protocolVersion: 2,
        repositoryType: 'social',
        features: ['posts'],
        schemas: {
          profile: 'invalid',
          post: 1,
          event: 1,
        },
      }
      expect(isValidManifest(manifest)).toBe(false)
    })

    it('rejects non-object data', () => {
      expect(isValidManifest(null)).toBe(false)
      expect(isValidManifest('not an object')).toBe(false)
      expect(isValidManifest([])).toBe(false)
    })
  })

  describe('parseManifest', () => {
    it('parses valid manifest JSON', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        protocolVersion: 2,
        repositoryType: 'social',
        features: ['posts', 'profile', 'following', 'reactions', 'comments', 'media'],
        schemas: {
          profile: 1,
          post: 1,
          event: 1,
        },
      })
      const manifest = parseManifest(json)
      expect(manifest).not.toBeNull()
      expect(manifest?.protocolVersion).toBe(2)
      expect(manifest?.repositoryType).toBe('social')
    })

    it('returns null for invalid JSON', () => {
      expect(parseManifest('not valid json')).toBeNull()
    })

    it('returns null for JSON with invalid manifest structure', () => {
      const json = JSON.stringify({
        schemaVersion: 1,
        protocolVersion: 2,
        repositoryType: 'social',
      })
      expect(parseManifest(json)).toBeNull()
    })
  })

  describe('createDefaultManifest', () => {
    it('creates manifest with default values', () => {
      const manifest = createDefaultManifest()
      expect(manifest.schemaVersion).toBe(1)
      expect(manifest.protocolVersion).toBe(2)
      expect(manifest.repositoryType).toBe('social')
      expect(manifest.features).toEqual([
        'posts',
        'profile',
        'following',
        'reactions',
        'comments',
        'media',
      ])
      expect(manifest.schemas.profile).toBe(1)
      expect(manifest.schemas.post).toBe(1)
      expect(manifest.schemas.event).toBe(1)
    })
  })
})
