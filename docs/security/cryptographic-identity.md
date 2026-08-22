# Cryptographic Identity Evaluation

This document evaluates the introduction of cryptographic public keys for GitNetwork identity.

## Overview

MVP2 formalizes GitNetwork identity independent of GitHub-specific APIs while retaining GitHub as the primary MVP2 provider. This document evaluates whether cryptographic public keys should be introduced to support future providers (GitLab, Codeberg, Local Git, etc.).

## Key Generation Options

### Option 1: User-Generated Key Pairs
- Users generate their own Ed25519 or RSA key pairs
- Public key stored in `.social/profile.json` or separate `identity/keys.json`
- Private key stored locally in user's browser/device

**Pros:**
- Full user control over keys
- No central key management required

**Cons:**
- Key recovery is difficult or impossible if user loses private key
- User experience complexity for key generation and storage

### Option 2: Provider-Generated Keys
- GitHub (or other provider) generates keys on behalf of user
- Keys tied to provider account

**Pros:**
- Easier key recovery through provider account
- Simpler user experience

**Cons:**
- Ties cryptographic identity to specific provider
- Contradicts provider-neutral identity abstraction

### Option 3: No Cryptographic Identity in MVP2
- Identity remains purely based on provider username (e.g., GitHub login)
- No cryptographic keys introduced in MVP2

**Pros:**
- Simplest implementation
- No key management complexity
- No recovery limitations to document

**Cons:**
- Cannot support cryptographic verification of actions
- Limits future cryptographic features

## Key Storage Options

### Browser Storage
- Keys stored in `localStorage` or `IndexedDB`
- **Risk**: Vulnerable to XSS attacks

### Secure Enclave / Web Crypto API
- Keys generated and stored using Web Crypto API
- Not exportable from browser
- **Risk**: Lost if browser data is cleared

### Local File System
- Keys stored in user's local file system (for desktop clients)
- Not applicable for GitHub Pages static deployment

## Key Rotation and Recovery Limitations

### Key Rotation
- If a private key is compromised, a new key pair must be generated
- Old key must be revoked or marked as deprecated in the repository
- All social actions must be verifiable against current valid keys

### Key Recovery
- **No Centralized Key Escrow**: GitNetwork does not store or manage user keys
- **No Social Recovery**: MVP2 does not implement social recovery mechanisms (vouching by other users)
- **Provider Recovery**: If using provider-generated keys, recovery is through the provider account
- **User Responsibility**: If using user-generated keys, loss of private key means loss of cryptographic identity

## Decision: Defer Cryptographic Identity to Future MVP

**Recommendation:** Do not implement cryptographic identity in MVP2.

**Rationale:**
1. MVP2's primary goal is to establish the Git-native protocol, AI context format, and MCP integration
2. Cryptographic identity introduces significant complexity in key generation, storage, rotation, and recovery
3. No immediate MVP2 feature requires cryptographic verification of social actions
4. GitHub identity (username-based) is sufficient for MVP2 social features
5. Cryptographic identity can be added in a future MVP when there is a clear requirement and user experience design

**Future Considerations:**
- When cryptographic identity is introduced, it should support:
  - Ed25519 key pairs (preferred for social signatures)
  - Public key storage in `.social/identity/keys.json`
  - Key rotation mechanism with deprecation of old keys
  - Clear documentation of recovery limitations
  - Provider-neutral key verification protocol

## Compatibility with GitHub Identity

When cryptographic identity is introduced in a future version:
- GitHub username remains the primary human-readable identifier
- Cryptographic public key provides cryptographic verification of actions
- Both identifiers should be present in the identity record
- Migration path from username-only to cryptographic identity should be documented
