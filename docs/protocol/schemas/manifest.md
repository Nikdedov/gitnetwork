# Repository Manifest Schema

Every GitNetwork repository should include a `.social/manifest.json` file that declares the protocol version, supported features, and schema versions.

## Schema

```json
{
  "schemaVersion": 1,
  "protocolVersion": 2,
  "repositoryType": "social",
  "features": [
    "posts",
    "profile",
    "following",
    "reactions",
    "comments",
    "media"
  ],
  "schemas": {
    "profile": 1,
    "post": 1,
    "event": 1
  }
}
```

## Fields

### schemaVersion

- Type: `number`
- Description: The manifest schema version
- Current value: `1`

### protocolVersion

- Type: `number`
- Description: The GitNetwork protocol version this repository supports
- Current value: `2`
- Clients must reject repositories with protocol versions greater than the supported protocol version

### repositoryType

- Type: `string`
- Description: The type of repository
- Must be: `"social"`

### features

- Type: `array of strings`
- Description: List of supported features
- Valid values: `posts`, `profile`, `following`, `reactions`, `comments`, `media`

### schemas

- Type: `object`
- Description: Schema versions for each data type
- Properties:
  - `profile`: Number, schema version for profile data
  - `post`: Number, schema version for post data
  - `event`: Number, schema version for social events

## Example

```json
{
  "schemaVersion": 1,
  "protocolVersion": 2,
  "repositoryType": "social",
  "features": ["posts", "profile", "following", "reactions", "comments", "media"],
  "schemas": {
    "profile": 1,
    "post": 1,
    "event": 1
  }
}
```
