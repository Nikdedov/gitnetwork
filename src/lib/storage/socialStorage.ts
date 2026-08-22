import type { GitHubUser, IssueComment } from '../api/github/types'
import type { Post, NewPost } from '../post'
import type { MediaFile } from '../media'
import type { SocialManifest } from '../protocol/manifest'
import type { SocialEvent } from '../protocol/events'

export type { SocialManifest }

export interface SocialProfile {
  username: string
  displayName: string
  bio: string
  avatar: string
  createdAt: string | null
  github: GitHubUser
  followers: number
  following: number
  onboarded: boolean
  repoUrl: string
}

export interface ProfileData {
  schemaVersion: number
  username: string
  displayName: string
  bio: string
  avatar: string
  createdAt: string
}

export interface SocialStorage {
  getProfile(username: string): Promise<SocialProfile>
  getPosts(username: string, options?: { limit?: number }): Promise<Post[]>
  getPost(username: string, postId: string): Promise<Post | null>
  createPost(post: NewPost): Promise<Post>
  uploadMedia(username: string, postId: string, file: MediaFile): Promise<string>
  getFollowing(username: string): Promise<GitHubUser[]>
  saveProfile(profile: ProfileData): Promise<void>
  invalidateUser(username: string): Promise<void>

  // Manifest methods
  getManifest(username: string): Promise<SocialManifest | null>
  saveManifest(username: string, manifest: SocialManifest): Promise<void>

  // Event methods
  getEvents(username: string, options?: { limit?: number; type?: string }): Promise<SocialEvent[]>
  createEvent(event: SocialEvent): Promise<SocialEvent>

  // AI Context methods
  getAiMemory(username: string): Promise<Record<string, unknown>[]>
  saveAiMemory(username: string, memory: Record<string, unknown>): Promise<void>
  getAiDecisions(username: string): Promise<Record<string, unknown>[]>
  saveAiDecision(username: string, decision: Record<string, unknown>): Promise<void>
  getAiHandoffs(username: string): Promise<Record<string, unknown>[]>
  saveAiHandoff(username: string, handoff: Record<string, unknown>): Promise<void>

  // Comments methods
  getIssueComments(username: string, issueNumber: number): Promise<IssueComment[]>
  invalidateIssueComments(username: string, issueNumber: number): Promise<void>

  // Likes methods
  getMyLike(username: string, issueNumber: number, login: string): Promise<number | null>
  invalidateMyLike(username: string, issueNumber: number, login: string): Promise<void>
}

export const PROFILE_PATH = '.social/profile.json'
export const MANIFEST_PATH = '.social/manifest.json'
export const EVENTS_PATH = 'social/events'
export const AI_MEMORY_PATH = 'ai/memory'
export const AI_DECISIONS_PATH = 'ai/decisions'
export const AI_HANDOFFS_PATH = 'ai/handoffs'
