# GitNetwork MCP Tools

## Read Tools

### get_profile

Get user profile information.

Parameters:
- `username`: string

### get_post

Get a specific post.

Parameters:
- `username`: string
- `postId`: string

### get_feed

Get user feed.

Parameters:
- `username`: string
- `type`: 'following' | 'for-you'

Requires authentication.

### get_social_graph

Get social graph (following/followers).

Parameters:
- `username`: string

### search_context

Search AI context.

Parameters:
- `username`: string
- `query`: string
- `type`: 'memory' | 'decision' | 'project' | 'handoff'

Requires authentication.

## Mutation Tools

### create_post

Create a new post.

Parameters:
- `username`: string
- `content`: string

Requires authentication and user authorization.

### comment

Add a comment to a post.

Parameters:
- `username`: string
- `postId`: string
- `body`: string

Requires authentication and user authorization.

### react

Add a reaction to a post.

Parameters:
- `username`: string
- `postId`: string
- `reactionType`: string

Requires authentication and user authorization.

### follow

Follow a user.

Parameters:
- `username`: string
- `target`: string

Requires authentication and user authorization.

### unfollow

Unfollow a user.

Parameters:
- `username`: string
- `target`: string

Requires authentication and user authorization.

## AI Context Tools

### get_memory

Get AI memory.

Parameters:
- `username`: string

Requires authentication.

### save_memory

Save AI memory.

Parameters:
- `username`: string
- `memory`: object

Requires authentication and user authorization.

### save_decision

Save AI decision.

Parameters:
- `username`: string
- `decision`: object

Requires authentication and user authorization.

### create_handoff

Create AI handoff.

Parameters:
- `username`: string
- `handoff`: object

Requires authentication and user authorization.
