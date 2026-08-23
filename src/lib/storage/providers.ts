import type { SocialStorage } from './socialStorage'

/**
 * GitLab Storage Interface
 * 
 * This interface defines the contract for GitLab-based social storage.
 * Implementation would handle GitLab API operations for social data.
 */
export interface GitLabStorage extends SocialStorage {
  provider: 'gitlab'
  
  // GitLab-specific operations
  getGitLabUserId(): Promise<string>
  getGitLabProjectId(username: string): Promise<string | null>
  createGitLabProject(username: string): Promise<string>
}

/**
 * Codeberg Storage Interface
 * 
 * This interface defines the contract for Codeberg-based social storage.
 * Implementation would handle Codeberg API operations for social data.
 */
export interface CodebergStorage extends SocialStorage {
  provider: 'codeberg'
  
  // Codeberg-specific operations
  getCodebergUserId(): Promise<string>
  getCodebergProjectId(username: string): Promise<string | null>
  createCodebergProject(username: string): Promise<string>
}

/**
 * Local Git Storage Interface
 * 
 * This interface defines the contract for local Git repository storage.
 * Implementation would handle local file system operations.
 */
export interface LocalGitStorage extends SocialStorage {
  provider: 'local-git'
  
  // Local Git-specific operations
  getRepoPath(): string
  initializeRepo(path: string): Promise<void>
}

/**
 * Storage Provider Types
 */
export type StorageProvider = 'github' | 'gitlab' | 'codeberg' | 'local-git'

/**
 * Storage Factory Interface
 */
export interface StorageFactory {
  create(provider: StorageProvider, options: any): SocialStorage
}
