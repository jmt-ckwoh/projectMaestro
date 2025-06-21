/**
 * Git Domain Contracts
 * 
 * Defines interfaces and types for version control operations.
 * Abstracts Git complexity for non-technical users via checkpoint system.
 */

import { z } from 'zod'
import { 
  BaseEntitySchema, 
  DomainEntity, 
  DomainError, 
  DomainEvent, 
  DomainService,
  IdSchema,
  NonEmptyStringSchema,
  PagedQuery,
  PagedResult,
  Result
} from './common'

// =============================================================================
// Git Entity Types
// =============================================================================

export type CheckpointType = 'manual' | 'auto' | 'milestone' | 'backup'
export type CheckpointStatus = 'creating' | 'completed' | 'failed' | 'restored'
export type ChangeType = 'added' | 'modified' | 'deleted' | 'renamed'

export interface FileChange {
  readonly path: string
  readonly type: ChangeType
  readonly oldPath?: string // For renames
  readonly additions: number
  readonly deletions: number
}

export interface Checkpoint extends DomainEntity {
  readonly projectId: string
  readonly message: string
  readonly description?: string
  readonly type: CheckpointType
  readonly status: CheckpointStatus
  readonly commitHash?: string
  readonly parentCheckpointId?: string
  readonly files: FileChange[]
  readonly tags: string[]
  readonly isRollbackPoint: boolean
}

export interface GitRepository {
  readonly projectId: string
  readonly path: string
  readonly remote?: string
  readonly branch: string
  readonly isInitialized: boolean
  readonly lastCheckpoint?: Date
}

// =============================================================================
// Input/Output Types
// =============================================================================

export interface CreateCheckpointInput {
  readonly projectId: string
  readonly message: string
  readonly description?: string
  readonly type: CheckpointType
  readonly tags?: string[]
  readonly isRollbackPoint?: boolean
}

export interface RestoreCheckpointInput {
  readonly checkpointId: string
  readonly createBackup?: boolean
  readonly preserveUncommitted?: boolean
}

export interface InitializeRepositoryInput {
  readonly projectId: string
  readonly path: string
  readonly remote?: string
  readonly initialCommit?: string
}

export interface CheckpointQuery extends PagedQuery {
  readonly projectId?: string
  readonly type?: CheckpointType
  readonly status?: CheckpointStatus
  readonly startDate?: Date
  readonly endDate?: Date
  readonly tags?: string[]
  readonly search?: string
}

export interface GitStatus {
  readonly hasUncommittedChanges: boolean
  readonly stagedFiles: string[]
  readonly unstagedFiles: string[]
  readonly untrackedFiles: string[]
  readonly conflictFiles: string[]
  readonly currentBranch: string
  readonly ahead: number
  readonly behind: number
}

// =============================================================================
// Validation Schemas
// =============================================================================

export const CheckpointTypeSchema = z.enum(['manual', 'auto', 'milestone', 'backup'])
export const CheckpointStatusSchema = z.enum(['creating', 'completed', 'failed', 'restored'])
export const ChangeTypeSchema = z.enum(['added', 'modified', 'deleted', 'renamed'])

export const FileChangeSchema = z.object({
  path: NonEmptyStringSchema,
  type: ChangeTypeSchema,
  oldPath: z.string().optional(),
  additions: z.number().int().min(0),
  deletions: z.number().int().min(0)
})

export const CheckpointSchema = BaseEntitySchema.extend({
  projectId: IdSchema,
  message: NonEmptyStringSchema,
  description: z.string().optional(),
  type: CheckpointTypeSchema,
  status: CheckpointStatusSchema,
  commitHash: z.string().optional(),
  parentCheckpointId: IdSchema.optional(),
  files: z.array(FileChangeSchema),
  tags: z.array(z.string()),
  isRollbackPoint: z.boolean()
})

export const CreateCheckpointSchema = z.object({
  projectId: IdSchema,
  message: NonEmptyStringSchema,
  description: z.string().optional(),
  type: CheckpointTypeSchema,
  tags: z.array(z.string()).optional(),
  isRollbackPoint: z.boolean().default(false)
})

export const RestoreCheckpointSchema = z.object({
  checkpointId: IdSchema,
  createBackup: z.boolean().default(true),
  preserveUncommitted: z.boolean().default(false)
})

export const InitializeRepositorySchema = z.object({
  projectId: IdSchema,
  path: NonEmptyStringSchema,
  remote: z.string().url().optional(),
  initialCommit: z.string().default('Initial commit')
})

// =============================================================================
// Domain Events
// =============================================================================

export interface CheckpointCreatedEvent extends DomainEvent {
  readonly type: 'checkpoint.created'
  readonly domain: 'git'
  readonly payload: {
    readonly checkpointId: string
    readonly projectId: string
    readonly message: string
    readonly checkpointType: CheckpointType
    readonly filesChanged: number
  }
}

export interface CheckpointRestoredEvent extends DomainEvent {
  readonly type: 'checkpoint.restored'
  readonly domain: 'git'
  readonly payload: {
    readonly checkpointId: string
    readonly projectId: string
    readonly previousCommit: string
    readonly backupCreated: boolean
  }
}

export interface RepositoryInitializedEvent extends DomainEvent {
  readonly type: 'repository.initialized'
  readonly domain: 'git'
  readonly payload: {
    readonly projectId: string
    readonly path: string
    readonly remote?: string
  }
}

export interface ConflictDetectedEvent extends DomainEvent {
  readonly type: 'conflict.detected'
  readonly domain: 'git'
  readonly payload: {
    readonly projectId: string
    readonly files: string[]
    readonly operation: string
  }
}

export type GitDomainEvent = 
  | CheckpointCreatedEvent 
  | CheckpointRestoredEvent 
  | RepositoryInitializedEvent 
  | ConflictDetectedEvent

// =============================================================================
// Domain Errors
// =============================================================================

export class GitRepositoryNotFoundError extends DomainError {
  readonly code = 'GIT_REPOSITORY_NOT_FOUND'
  readonly domain = 'git'
  
  constructor(projectId: string, cause?: Error) {
    super(`Git repository not found for project '${projectId}'`, cause)
  }
}

export class CheckpointNotFoundError extends DomainError {
  readonly code = 'CHECKPOINT_NOT_FOUND'
  readonly domain = 'git'
  
  constructor(checkpointId: string, cause?: Error) {
    super(`Checkpoint with id '${checkpointId}' not found`, cause)
  }
}

export class GitOperationError extends DomainError {
  readonly code = 'GIT_OPERATION_ERROR'
  readonly domain = 'git'
  
  constructor(operation: string, details: string, cause?: Error) {
    super(`Git operation '${operation}' failed: ${details}`, cause)
  }
}

export class MergeConflictError extends DomainError {
  readonly code = 'MERGE_CONFLICT_ERROR'
  readonly domain = 'git'
  
  constructor(public readonly conflictFiles: string[], cause?: Error) {
    super(`Merge conflict detected in files: ${conflictFiles.join(', ')}`, cause)
  }
}

export class UncommittedChangesError extends DomainError {
  readonly code = 'UNCOMMITTED_CHANGES_ERROR'
  readonly domain = 'git'
  
  constructor(operation: string, cause?: Error) {
    super(`Cannot ${operation} with uncommitted changes`, cause)
  }
}

export class GitValidationError extends DomainError {
  readonly code = 'GIT_VALIDATION_ERROR'
  readonly domain = 'git'
  
  constructor(message: string, public readonly validationErrors: z.ZodError, cause?: Error) {
    super(`Git validation failed: ${message}`, cause)
  }
}

// =============================================================================
// Domain Service Interface
// =============================================================================

export interface IGitDomainService extends DomainService<Checkpoint> {
  /**
   * Initialize Git repository for project
   */
  initializeRepository(input: InitializeRepositoryInput): Promise<Result<GitRepository, DomainError>>
  
  /**
   * Create a new checkpoint (commit)
   */
  createCheckpoint(input: CreateCheckpointInput): Promise<Result<Checkpoint, DomainError>>
  
  /**
   * Restore to a previous checkpoint
   */
  restoreCheckpoint(input: RestoreCheckpointInput): Promise<Result<void, DomainError>>
  
  /**
   * Get checkpoint by ID
   */
  getCheckpoint(id: string): Promise<Result<Checkpoint, DomainError>>
  
  /**
   * Get all checkpoints for a project
   */
  getCheckpoints(query?: CheckpointQuery): Promise<Result<PagedResult<Checkpoint>, DomainError>>
  
  /**
   * Get project checkpoints timeline
   */
  getProjectTimeline(projectId: string): Promise<Result<Checkpoint[], DomainError>>
  
  /**
   * Get current Git status
   */
  getGitStatus(projectId: string): Promise<Result<GitStatus, DomainError>>
  
  /**
   * Check if repository has uncommitted changes
   */
  hasUncommittedChanges(projectId: string): Promise<Result<boolean, DomainError>>
  
  /**
   * Get diff between checkpoints
   */
  getDiff(fromCheckpointId: string, toCheckpointId: string): Promise<Result<FileChange[], DomainError>>
  
  /**
   * Create automatic checkpoint if changes detected
   */
  createAutoCheckpoint(projectId: string): Promise<Result<Checkpoint | null, DomainError>>
  
  /**
   * Tag a checkpoint as milestone
   */
  tagCheckpoint(checkpointId: string, tags: string[]): Promise<Result<Checkpoint, DomainError>>
  
  /**
   * Delete checkpoint (if safe)
   */
  deleteCheckpoint(checkpointId: string): Promise<Result<void, DomainError>>
  
  /**
   * Cleanup old checkpoints based on retention policy
   */
  cleanupCheckpoints(projectId: string, retentionPolicy: RetentionPolicy): Promise<Result<number, DomainError>>
}

// =============================================================================
// Git Operations Interface
// =============================================================================

export interface IGitOperations {
  /**
   * Initialize new Git repository
   */
  init(path: string): Promise<void>
  
  /**
   * Add remote origin
   */
  addRemote(path: string, remote: string): Promise<void>
  
  /**
   * Stage files for commit
   */
  add(path: string, files?: string[]): Promise<void>
  
  /**
   * Create commit
   */
  commit(path: string, message: string): Promise<string>
  
  /**
   * Get repository status
   */
  status(path: string): Promise<GitStatus>
  
  /**
   * Reset to specific commit
   */
  reset(path: string, commitHash: string, hard?: boolean): Promise<void>
  
  /**
   * Get commit log
   */
  log(path: string, limit?: number): Promise<GitCommit[]>
  
  /**
   * Get diff between commits
   */
  diff(path: string, from?: string, to?: string): Promise<GitDiff[]>
  
  /**
   * Check if path is Git repository
   */
  isRepository(path: string): Promise<boolean>
  
  /**
   * Get current branch
   */
  getCurrentBranch(path: string): Promise<string>
  
  /**
   * Create and checkout branch
   */
  createBranch(path: string, branchName: string): Promise<void>
  
  /**
   * Checkout branch or commit
   */
  checkout(path: string, ref: string): Promise<void>
}

// =============================================================================
// Repository Interface
// =============================================================================

export interface ICheckpointRepository {
  findById(id: string): Promise<Checkpoint | null>
  findByProject(projectId: string): Promise<Checkpoint[]>
  findAll(query?: CheckpointQuery): Promise<PagedResult<Checkpoint>>
  findByCommitHash(commitHash: string): Promise<Checkpoint | null>
  findRollbackPoints(projectId: string): Promise<Checkpoint[]>
  save(checkpoint: Checkpoint): Promise<Checkpoint>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
}

export interface IGitRepositoryMetadata {
  findByProject(projectId: string): Promise<GitRepository | null>
  save(repository: GitRepository): Promise<GitRepository>
  delete(projectId: string): Promise<void>
  exists(projectId: string): Promise<boolean>
}

// =============================================================================
// Additional Types
// =============================================================================

export interface GitCommit {
  readonly hash: string
  readonly message: string
  readonly author: string
  readonly email: string
  readonly date: Date
  readonly files: FileChange[]
}

export interface GitDiff {
  readonly path: string
  readonly type: ChangeType
  readonly additions: number
  readonly deletions: number
  readonly patch: string
}

export interface RetentionPolicy {
  readonly keepDays: number
  readonly keepMilestones: boolean
  readonly keepRollbackPoints: boolean
  readonly maxCheckpoints: number
}

// =============================================================================
// Use Cases
// =============================================================================

export interface GitUseCases {
  initializeRepository: (input: InitializeRepositoryInput) => Promise<Result<GitRepository, DomainError>>
  createCheckpoint: (input: CreateCheckpointInput) => Promise<Result<Checkpoint, DomainError>>
  restoreCheckpoint: (input: RestoreCheckpointInput) => Promise<Result<void, DomainError>>
  getProjectTimeline: (projectId: string) => Promise<Result<Checkpoint[], DomainError>>
  getGitStatus: (projectId: string) => Promise<Result<GitStatus, DomainError>>
  createAutoCheckpoint: (projectId: string) => Promise<Result<Checkpoint | null, DomainError>>
  cleanupOldCheckpoints: (projectId: string, policy: RetentionPolicy) => Promise<Result<number, DomainError>>
}