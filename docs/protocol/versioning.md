# Protocol Versioning

GitNetwork uses a versioned protocol and schema system to ensure backward compatibility and allow for future extensions.

## Protocol Version

The protocol version is a single integer that represents the overall GitNetwork protocol version.

- Current protocol version: `2`
- Clients must support all protocol versions `<= CURRENT_PROTOCOL.protocol`
- Clients should reject protocol versions `> CURRENT_PROTOCOL.protocol`

## Schema Versions

Each data type has its own schema version:

- `profile`: Profile data schema version
- `post`: Post file schema version
- `event`: Social event schema version
- `manifest`: Repository manifest schema version

Current schema versions:
- profile: `1`
- post: `1`
- event: `1`
- manifest: `1`

## Backward Compatibility Rules

1. **New fields are optional**: Clients must ignore unknown fields they do not understand.
2. **New fields must not break old clients**: Adding new fields to existing schemas must not cause parsing failures in older clients.
3. **Schema upgrades are additive**: New schema versions should only add fields, not remove or change existing ones.
4. **Migration is explicit**: When a schema version changes in a breaking way, migration must be explicit rather than implicit.

## Manifest Versioning

Every GitNetwork repository should include a `.social/manifest.json` file that declares:

- `schemaVersion`: The manifest schema version
- `protocolVersion`: The protocol version this repository supports
- `repositoryType`: Must be `'social'`
- `features`: Array of supported features
- `schemas`: Object containing schema versions for each data type

Clients should verify that the repository's protocol version and schema versions are supported before attempting to read or write data.
