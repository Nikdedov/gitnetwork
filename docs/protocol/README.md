# GitNetwork Protocol

This directory contains the GitNetwork protocol documentation and schema definitions.

## Protocol Versioning

GitNetwork uses a versioned protocol and schema system to ensure backward compatibility and allow for future extensions.

- **Protocol Version**: Currently `2`
- **Schema Versions**:
  - Profile: `1`
  - Post: `1`
  - Event: `1`
  - Manifest: `1`

See [Protocol Versioning](./versioning.md) for detailed versioning rules.

## Components

- [Social Events](./social-events.md) - Provider-neutral social event model
- [Schemas](./schemas/) - JSON schema definitions for GitNetwork data models

## Repository Manifest

Every GitNetwork repository should include a `.social/manifest.json` file that declares:

- Protocol version
- Supported features
- Schema versions

See [Repository Manifest](./schemas/manifest.md) for details.
