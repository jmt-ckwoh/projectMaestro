/**
 * Memory Domain Contracts
 * 
 * Defines interfaces and types for AI memory management operations.
 * Implements vector storage and retrieval for agent context.
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
// Memory Entity Types
// =============================================================================

export type MemoryType = 'global' | 'project' | 'task' | 'conversation' | 'user-preference'
export type MemoryScope = 'personal' | 'shared' | 'system'
export type MemoryStatus = 'active' | 'archived' | 'deleted'

export interface MemoryMetadata {
  readonly tags: string[]
  readonly source: string
  readonly importance: number // 0-1 scale
  readonly lastAccessed?: Date
  readonly accessCount: number
  readonly projectId?: string
  readonly taskId?: string
  readonly agentType?: string
}

export interface Memory extends DomainEntity {
  readonly content: string
  readonly type: MemoryType
  readonly scope: MemoryScope
  readonly status: MemoryStatus
  readonly embedding?: number[] // Vector embedding
  readonly metadata: MemoryMetadata
}

// =============================================================================
// Input/Output Types
// =============================================================================

export interface CreateMemoryInput {
  readonly content: string
  readonly type: MemoryType
  readonly scope?: MemoryScope
  readonly metadata: Partial<MemoryMetadata>
}

export interface UpdateMemoryInput {
  readonly content?: string
  readonly status?: MemoryStatus
  readonly metadata?: Partial<MemoryMetadata>
}

export interface MemorySearchQuery {
  readonly query: string
  readonly type?: MemoryType
  readonly scope?: MemoryScope
  readonly projectId?: string
  readonly taskId?: string
  readonly agentType?: string
  readonly limit?: number
  readonly threshold?: number // Similarity threshold 0-1
  readonly tags?: string[]
}

export interface MemorySearchResult {
  readonly memory: Memory
  readonly similarity: number
  readonly relevanceScore: number
}

export interface MemoryQuery extends PagedQuery {
  readonly type?: MemoryType
  readonly scope?: MemoryScope
  readonly status?: MemoryStatus
  readonly projectId?: string
  readonly agentType?: string
  readonly search?: string
}

// =============================================================================
// Validation Schemas
// =============================================================================

export const MemoryTypeSchema = z.enum(['global', 'project', 'task', 'conversation', 'user-preference'])
export const MemoryScopeSchema = z.enum(['personal', 'shared', 'system'])
export const MemoryStatusSchema = z.enum(['active', 'archived', 'deleted'])

export const MemoryMetadataSchema = z.object({
  tags: z.array(z.string()),
  source: NonEmptyStringSchema,
  importance: z.number().min(0).max(1),
  lastAccessed: z.date().optional(),
  accessCount: z.number().int().min(0),
  projectId: IdSchema.optional(),
  taskId: IdSchema.optional(),
  agentType: z.string().optional()
})

export const MemorySchema = BaseEntitySchema.extend({
  content: NonEmptyStringSchema,
  type: MemoryTypeSchema,
  scope: MemoryScopeSchema,
  status: MemoryStatusSchema,
  embedding: z.array(z.number()).optional(),
  metadata: MemoryMetadataSchema
})

export const CreateMemorySchema = z.object({
  content: NonEmptyStringSchema,
  type: MemoryTypeSchema,
  scope: MemoryScopeSchema.default('personal'),
  metadata: MemoryMetadataSchema.partial()
})

export const UpdateMemorySchema = z.object({
  content: NonEmptyStringSchema.optional(),
  status: MemoryStatusSchema.optional(),
  metadata: MemoryMetadataSchema.partial().optional()
})

export const MemorySearchQuerySchema = z.object({
  query: NonEmptyStringSchema,
  type: MemoryTypeSchema.optional(),
  scope: MemoryScopeSchema.optional(),
  projectId: IdSchema.optional(),
  taskId: IdSchema.optional(),
  agentType: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  tags: z.array(z.string()).optional()
})

// =============================================================================
// Domain Events
// =============================================================================

export interface MemoryCreatedEvent extends DomainEvent {
  readonly type: 'memory.created'
  readonly domain: 'memory'
  readonly payload: {
    readonly memoryId: string
    readonly content: string
    readonly memoryType: MemoryType
    readonly projectId?: string
  }
}

export interface MemoryAccessedEvent extends DomainEvent {
  readonly type: 'memory.accessed'
  readonly domain: 'memory'
  readonly payload: {
    readonly memoryId: string
    readonly accessedBy: string
    readonly context: string
  }
}

export interface MemoryUpdatedEvent extends DomainEvent {
  readonly type: 'memory.updated'
  readonly domain: 'memory'
  readonly payload: {
    readonly memoryId: string
    readonly changes: UpdateMemoryInput
  }
}

export interface MemoryArchivedEvent extends DomainEvent {
  readonly type: 'memory.archived'
  readonly domain: 'memory'
  readonly payload: {
    readonly memoryId: string
    readonly reason: string
  }
}

export type MemoryDomainEvent = 
  | MemoryCreatedEvent 
  | MemoryAccessedEvent 
  | MemoryUpdatedEvent 
  | MemoryArchivedEvent

// =============================================================================
// Domain Errors
// =============================================================================

export class MemoryNotFoundError extends DomainError {
  readonly code = 'MEMORY_NOT_FOUND'
  readonly domain = 'memory'
  
  constructor(memoryId: string, cause?: Error) {
    super(`Memory with id '${memoryId}' not found`, cause)
  }
}

export class MemoryValidationError extends DomainError {
  readonly code = 'MEMORY_VALIDATION_ERROR'
  readonly domain = 'memory'
  
  constructor(message: string, public readonly validationErrors: z.ZodError, cause?: Error) {
    super(`Memory validation failed: ${message}`, cause)
  }
}

export class VectorStoreError extends DomainError {
  readonly code = 'VECTOR_STORE_ERROR'
  readonly domain = 'memory'
  
  constructor(operation: string, cause?: Error) {
    super(`Vector store operation failed: ${operation}`, cause)
  }
}

export class EmbeddingGenerationError extends DomainError {
  readonly code = 'EMBEDDING_GENERATION_ERROR'
  readonly domain = 'memory'
  
  constructor(content: string, cause?: Error) {
    super(`Failed to generate embedding for content: ${content.substring(0, 100)}...`, cause)
  }
}

// =============================================================================
// Domain Service Interface
// =============================================================================

export interface IMemoryDomainService extends DomainService<Memory> {
  /**
   * Store new memory with automatic embedding generation
   */
  storeMemory(input: CreateMemoryInput): Promise<Result<Memory, DomainError>>
  
  /**
   * Retrieve memory by ID
   */
  getMemory(id: string): Promise<Result<Memory, DomainError>>
  
  /**
   * Search memories using vector similarity
   */
  searchMemories(query: MemorySearchQuery): Promise<Result<MemorySearchResult[], DomainError>>
  
  /**
   * Get memories with filtering and pagination
   */
  getMemories(query?: MemoryQuery): Promise<Result<PagedResult<Memory>, DomainError>>
  
  /**
   * Update memory content and regenerate embedding
   */
  updateMemory(id: string, input: UpdateMemoryInput): Promise<Result<Memory, DomainError>>
  
  /**
   * Archive memory (soft delete)
   */
  archiveMemory(id: string, reason: string): Promise<Result<void, DomainError>>
  
  /**
   * Permanently delete memory
   */
  deleteMemory(id: string): Promise<Result<void, DomainError>>
  
  /**
   * Get memories for specific project
   */
  getProjectMemories(projectId: string): Promise<Result<Memory[], DomainError>>
  
  /**
   * Get memories for specific agent
   */
  getAgentMemories(agentType: string): Promise<Result<Memory[], DomainError>>
  
  /**
   * Record memory access for analytics
   */
  recordMemoryAccess(memoryId: string, accessedBy: string, context: string): Promise<Result<void, DomainError>>
  
  /**
   * Clean up old or unused memories
   */
  cleanupMemories(criteria: MemoryCleanupCriteria): Promise<Result<number, DomainError>>
  
  /**
   * Get memory usage statistics
   */
  getMemoryStatistics(): Promise<Result<MemoryStatistics, DomainError>>
}

// =============================================================================
// Vector Store Interface
// =============================================================================

export interface IVectorStore {
  /**
   * Generate embedding for text content
   */
  generateEmbedding(content: string): Promise<number[]>
  
  /**
   * Store vector with metadata
   */
  storeVector(id: string, vector: number[], metadata: Record<string, any>): Promise<void>
  
  /**
   * Search for similar vectors
   */
  searchSimilar(queryVector: number[], limit: number, threshold: number): Promise<VectorSearchResult[]>
  
  /**
   * Update vector and metadata
   */
  updateVector(id: string, vector: number[], metadata: Record<string, any>): Promise<void>
  
  /**
   * Delete vector
   */
  deleteVector(id: string): Promise<void>
  
  /**
   * Get vector by ID
   */
  getVector(id: string): Promise<VectorResult | null>
  
  /**
   * Health check for vector store
   */
  healthCheck(): Promise<boolean>
}

export interface VectorSearchResult {
  readonly id: string
  readonly similarity: number
  readonly metadata: Record<string, any>
}

export interface VectorResult {
  readonly id: string
  readonly vector: number[]
  readonly metadata: Record<string, any>
}

// =============================================================================
// Repository Interface
// =============================================================================

export interface IMemoryRepository {
  findById(id: string): Promise<Memory | null>
  findAll(query?: MemoryQuery): Promise<PagedResult<Memory>>
  findByType(type: MemoryType): Promise<Memory[]>
  findByProject(projectId: string): Promise<Memory[]>
  findByAgent(agentType: string): Promise<Memory[]>
  save(memory: Memory): Promise<Memory>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  updateAccessStats(id: string): Promise<void>
}

// =============================================================================
// Additional Types
// =============================================================================

export interface MemoryCleanupCriteria {
  readonly olderThan: Date
  readonly notAccessedSince: Date
  readonly importanceThreshold: number
  readonly types?: MemoryType[]
  readonly dryRun?: boolean
}

export interface MemoryStatistics {
  readonly totalMemories: number
  readonly memoriesByType: Record<MemoryType, number>
  readonly memoriesByScope: Record<MemoryScope, number>
  readonly averageImportance: number
  readonly storageUsed: number // in bytes
  readonly lastCleanup: Date
}

// =============================================================================
// Use Cases
// =============================================================================

export interface MemoryUseCases {
  storeMemory: (input: CreateMemoryInput) => Promise<Result<Memory, DomainError>>
  searchMemories: (query: MemorySearchQuery) => Promise<Result<MemorySearchResult[], DomainError>>
  getMemory: (id: string) => Promise<Result<Memory, DomainError>>
  updateMemory: (id: string, input: UpdateMemoryInput) => Promise<Result<Memory, DomainError>>
  archiveMemory: (id: string, reason: string) => Promise<Result<void, DomainError>>
  getProjectMemories: (projectId: string) => Promise<Result<Memory[], DomainError>>
  cleanupOldMemories: (criteria: MemoryCleanupCriteria) => Promise<Result<number, DomainError>>
}