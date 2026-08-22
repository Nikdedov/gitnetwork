import { generateUlid } from '../ulid'

export type EventType =
  | 'follow'
  | 'unfollow'
  | 'post'
  | 'comment'
  | 'reaction'
  | 'repost'
  | 'profile_update'

export interface BaseEvent {
  schemaVersion: number
  type: EventType
  id: string
  createdAt: string
  actor: string
}

export interface FollowEvent extends BaseEvent {
  type: 'follow'
  target: string
}

export interface UnfollowEvent extends BaseEvent {
  type: 'unfollow'
  target: string
}

export interface PostEvent extends BaseEvent {
  type: 'post'
  postId: string
  postPath: string
}

export interface CommentEvent extends BaseEvent {
  type: 'comment'
  postId: string
  commentId: string
}

export interface ReactionEvent extends BaseEvent {
  type: 'reaction'
  postId: string
  reactionType: 'heart' | 'rocket' | 'laugh' | 'hooray' | 'confused' | 'eyes'
}

export interface RepostEvent extends BaseEvent {
  type: 'repost'
  originalPostId: string
  originalAuthor: string
}

export interface ProfileUpdateEvent extends BaseEvent {
  type: 'profile_update'
  fields: string[]
}

export type SocialEvent =
  | FollowEvent
  | UnfollowEvent
  | PostEvent
  | CommentEvent
  | ReactionEvent
  | RepostEvent
  | ProfileUpdateEvent

export function createFollowEvent(actor: string, target: string): FollowEvent {
  return {
    schemaVersion: 1,
    type: 'follow',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    actor,
    target,
  }
}

export function createUnfollowEvent(actor: string, target: string): UnfollowEvent {
  return {
    schemaVersion: 1,
    type: 'unfollow',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    actor,
    target,
  }
}

export function createPostEvent(actor: string, postId: string, postPath: string): PostEvent {
  return {
    schemaVersion: 1,
    type: 'post',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    actor,
    postId,
    postPath,
  }
}

export function createCommentEvent(actor: string, postId: string, commentId: string): CommentEvent {
  return {
    schemaVersion: 1,
    type: 'comment',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    actor,
    postId,
    commentId,
  }
}

export function createReactionEvent(
  actor: string,
  postId: string,
  reactionType: ReactionEvent['reactionType'],
): ReactionEvent {
  return {
    schemaVersion: 1,
    type: 'reaction',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    actor,
    postId,
    reactionType,
  }
}

export function createRepostEvent(actor: string, originalPostId: string, originalAuthor: string): RepostEvent {
  return {
    schemaVersion: 1,
    type: 'repost',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    actor,
    originalPostId,
    originalAuthor,
  }
}

export function createProfileUpdateEvent(actor: string, fields: string[]): ProfileUpdateEvent {
  return {
    schemaVersion: 1,
    type: 'profile_update',
    id: generateUlid(),
    createdAt: new Date().toISOString(),
    actor,
    fields,
  }
}

export function isValidEvent(data: unknown): data is SocialEvent {
  if (!data || typeof data !== 'object') return false
  const event = data as Record<string, unknown>

  if (typeof event.schemaVersion !== 'number') return false
  if (typeof event.type !== 'string') return false
  if (!['follow', 'unfollow', 'post', 'comment', 'reaction', 'repost', 'profile_update'].includes(event.type)) {
    return false
  }
  if (typeof event.id !== 'string') return false
  if (typeof event.createdAt !== 'string') return false
  if (typeof event.actor !== 'string') return false

  const validEvent = event as unknown as SocialEvent
  if (validEvent.type === 'follow' || validEvent.type === 'unfollow') {
    return typeof validEvent.target === 'string'
  }
  if (validEvent.type === 'post') {
    return typeof validEvent.postId === 'string' && typeof validEvent.postPath === 'string'
  }
  if (validEvent.type === 'comment') {
    return typeof validEvent.postId === 'string' && typeof validEvent.commentId === 'string'
  }
  if (validEvent.type === 'reaction') {
    const reactionTypes = ['heart', 'rocket', 'laugh', 'hooray', 'confused', 'eyes']
    return typeof validEvent.postId === 'string' && reactionTypes.includes(validEvent.reactionType)
  }
  if (validEvent.type === 'repost') {
    return typeof validEvent.originalPostId === 'string' && typeof validEvent.originalAuthor === 'string'
  }
  if (validEvent.type === 'profile_update') {
    return Array.isArray(validEvent.fields) && validEvent.fields.every((f) => typeof f === 'string')
  }

  return false
}

export function parseEvent(json: string): SocialEvent | null {
  try {
    const parsed = JSON.parse(json)
    if (isValidEvent(parsed)) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}
