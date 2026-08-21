import type { GitHubUser } from '../api/github/types'
import type { Post, NewPost } from '../post'
import type { MediaFile } from '../media'

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
}

export const PROFILE_PATH = '.social/profile.json'
