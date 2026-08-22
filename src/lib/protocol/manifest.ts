import { CURRENT_PROTOCOL, supportsProtocol, supportsSchema } from './version'

export interface SocialManifest {
  schemaVersion: number
  protocolVersion: number
  repositoryType: 'social'
  features: string[]
  schemas: {
    profile: number
    post: number
    event: number
  }
}

export const DEFAULT_FEATURES = [
  'posts',
  'profile',
  'following',
  'reactions',
  'comments',
  'media',
]

export function createDefaultManifest(): SocialManifest {
  return {
    schemaVersion: CURRENT_PROTOCOL.schemas.manifest,
    protocolVersion: CURRENT_PROTOCOL.protocol,
    repositoryType: 'social',
    features: [...DEFAULT_FEATURES],
    schemas: {
      profile: CURRENT_PROTOCOL.schemas.profile,
      post: CURRENT_PROTOCOL.schemas.post,
      event: CURRENT_PROTOCOL.schemas.event,
    },
  }
}

export function isValidManifest(data: unknown): data is SocialManifest {
  if (!data || typeof data !== 'object') return false
  const manifest = data as Record<string, unknown>

  if (typeof manifest.schemaVersion !== 'number') return false
  if (typeof manifest.protocolVersion !== 'number') return false
  if (manifest.repositoryType !== 'social') return false

  if (!Array.isArray(manifest.features)) return false
  if (!manifest.schemas || typeof manifest.schemas !== 'object') return false

  const schemas = manifest.schemas as Record<string, unknown>
  if (typeof schemas.profile !== 'number') return false
  if (typeof schemas.post !== 'number') return false
  if (typeof schemas.event !== 'number') return false

  if (!supportsProtocol(manifest.protocolVersion)) return false
  if (!supportsSchema('profile', schemas.profile)) return false
  if (!supportsSchema('post', schemas.post)) return false
  if (!supportsSchema('event', schemas.event)) return false

  return true
}

export function parseManifest(json: string): SocialManifest | null {
  try {
    const parsed = JSON.parse(json)
    if (isValidManifest(parsed)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
