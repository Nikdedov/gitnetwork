# Social Events

GitNetwork defines a provider-neutral social event model for operations that cannot reliably depend on GitHub-specific APIs.

## Event Schema

All social events share a common base structure:

```json
{
  "schemaVersion": 1,
  "type": "event_type",
  "id": "ulid-event-id",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "username"
}
```

### Fields

- `schemaVersion`: Number, must be `1`
- `type`: String, one of the event types listed below
- `id`: String, ULID identifier for the event
- `createdAt`: String, ISO 8601 timestamp
- `actor`: String, GitHub username of the event actor

## Event Types

### follow

Indicates that an actor started following a target user.

```json
{
  "schemaVersion": 1,
  "type": "follow",
  "id": "01HQXYZ123",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "alice",
  "target": "bob"
}
```

### unfollow

Indicates that an actor stopped following a target user.

```json
{
  "schemaVersion": 1,
  "type": "unfollow",
  "id": "01HQXYZ124",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "alice",
  "target": "bob"
}
```

### post

Indicates that an actor created a new post.

```json
{
  "schemaVersion": 1,
  "type": "post",
  "id": "01HQXYZ125",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "alice",
  "postId": "01JXYZ123",
  "postPath": "posts/2026/08/22/01JXYZ123.md"
}
```

### comment

Indicates that an actor commented on a post.

```json
{
  "schemaVersion": 1,
  "type": "comment",
  "id": "01HQXYZ126",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "alice",
  "postId": "01JXYZ123",
  "commentId": "comment-456"
}
```

### reaction

Indicates that an actor reacted to a post.

```json
{
  "schemaVersion": 1,
  "type": "reaction",
  "id": "01HQXYZ127",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "alice",
  "postId": "01JXYZ123",
  "reactionType": "heart"
}
```

Valid `reactionType` values: `heart`, `rocket`, `laugh`, `hooray`, `confused`, `eyes`

### repost

Indicates that an actor reposted another user's post.

```json
{
  "schemaVersion": 1,
  "type": "repost",
  "id": "01HQXYZ129",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "alice",
  "originalPostId": "01JXYZ123",
  "originalAuthor": "bob"
}
```

### profile_update

Indicates that an actor updated their profile.

```json
{
  "schemaVersion": 1,
  "type": "profile_update",
  "id": "01HQXYZ130",
  "createdAt": "2026-08-22T00:00:00Z",
  "actor": "alice",
  "fields": ["displayName", "bio"]
}
```

## Event Storage

Events may be stored in the repository under:

```
social/events/YYYY/MM/DD/<event-id>.json
```

Events are provider-neutral and do not depend on GitHub-specific implementation details.
