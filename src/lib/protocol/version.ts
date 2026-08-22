export const PROTOCOL_VERSION = 2
export const SCHEMA_VERSION = 2

export interface ProtocolVersion {
  protocol: number
  schemas: {
    profile: number
    post: number
    event: number
    manifest: number
  }
}

export const CURRENT_PROTOCOL: ProtocolVersion = {
  protocol: PROTOCOL_VERSION,
  schemas: {
    profile: 1,
    post: 1,
    event: 1,
    manifest: 1,
  },
}

export function supportsProtocol(version: number): boolean {
  return version <= CURRENT_PROTOCOL.protocol
}

export function supportsSchema(type: string, version: number): boolean {
  const current = CURRENT_PROTOCOL.schemas[type as keyof typeof CURRENT_PROTOCOL.schemas]
  if (current === undefined) return true
  return version <= current
}
