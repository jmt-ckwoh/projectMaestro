/**
 * Memory Domain Service Implementation
 * 
 * Orchestrates memory operations with vector storage and persistence.
 * Implements the IMemoryDomainService contract.
 */

import { v4 as uuidv4 } from 'uuid'
import { LanceDBVectorStore } from './VectorStore'
import { MemoryRepository } from './MemoryRepository'
import { EventBus } from '../core/EventBus'
import {
  CreateMemoryInput,
  CreateMemorySchema,
  IMemoryDomainService,
  Memory,
  MemoryAccessedEvent,
  MemoryArchivedEvent,
  MemoryCleanupCriteria,
  MemoryCreatedEvent,
  MemoryNotFoundError,
  MemoryQuery,
  MemorySearchQuery,
  MemorySearchQuerySchema,
  MemorySearchResult,
  MemoryStatistics,
  MemoryUpdatedEvent,
  MemoryValidationError,
  UpdateMemoryInput,
  UpdateMemorySchema
} from '../../../shared/contracts/MemoryDomain'
import { 
  DomainError, 
  Err, 
  GenericDomainError, 
  Ok, 
  PagedResult,
  Result 
} from '../../../shared/contracts/common'

export class MemoryDomainService implements IMemoryDomainService {
  private vectorStore: LanceDBVectorStore
  private repository: MemoryRepository
  private eventBus: EventBus
  private isInitialized = false

  constructor() {
    this.vectorStore = new LanceDBVectorStore()
    this.repository = new MemoryRepository()
    this.eventBus = EventBus.getInstance()
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<Result<void, DomainError>> {
    try {
      console.log('Initializing Memory Domain Service...')
      
      // Initialize vector store
      const vectorStoreResult = await this.vectorStore.initialize()
      if (!vectorStoreResult.success) {
        return vectorStoreResult
      }
      
      // Initialize repository
      await this.repository.initialize()
      
      this.isInitialized = true
      console.log('Memory Domain Service initialized successfully')
      
      return Ok(undefined)
      
    } catch (error) {
      console.error('Failed to initialize Memory Domain Service:', error)
      return Err(new GenericDomainError('memory', 'INITIALIZATION_FAILED', 
        'Failed to initialize memory domain service', error as Error))
    }
  }

  /**
   * Store new memory with automatic embedding generation
   */
  async storeMemory(input: CreateMemoryInput): Promise<Result<Memory, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      // Validate input
      const validationResult = CreateMemorySchema.safeParse(input)
      if (!validationResult.success) {
        return Err(new MemoryValidationError(
          'Invalid create memory input', 
          validationResult.error
        ))
      }

      const validatedInput = validationResult.data

      // Generate embedding for content
      const embedding = await this.vectorStore.generateEmbedding(validatedInput.content)

      // Create memory entity
      const memory: Memory = {
        id: uuidv4(),
        content: validatedInput.content,
        type: validatedInput.type,
        scope: validatedInput.scope || 'personal',
        status: 'active',
        embedding,
        metadata: {
          tags: validatedInput.metadata.tags || [],
          source: validatedInput.metadata.source || 'user',
          importance: validatedInput.metadata.importance || 0.5,
          accessCount: 0,
          projectId: validatedInput.metadata.projectId,
          taskId: validatedInput.metadata.taskId,
          agentType: validatedInput.metadata.agentType
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Store in repository
      await this.repository.save(memory)

      // Store vector
      await this.vectorStore.storeVector(memory.id, embedding, {
        content: memory.content,
        type: memory.type,
        scope: memory.scope,
        projectId: memory.metadata.projectId,
        taskId: memory.metadata.taskId,
        agentType: memory.metadata.agentType,
        tags: memory.metadata.tags,
        source: memory.metadata.source,
        importance: memory.metadata.importance,
        createdAt: memory.createdAt.toISOString()
      })

      // Publish domain event
      const event: MemoryCreatedEvent = {
        id: uuidv4(),
        type: 'memory.created',
        domain: 'memory',
        timestamp: new Date(),
        version: 1,
        payload: {
          memoryId: memory.id,
          content: memory.content,
          memoryType: memory.type,
          projectId: memory.metadata.projectId
        }
      }
      
      this.eventBus.publish(event)

      console.log(`Created memory: ${memory.id}`)
      return Ok(memory)

    } catch (error) {
      console.error('Failed to store memory:', error)
      return Err(new GenericDomainError('memory', 'STORE_FAILED', 
        'Failed to store memory', error as Error))
    }
  }

  /**
   * Retrieve memory by ID
   */
  async getMemory(id: string): Promise<Result<Memory, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      const memory = await this.repository.findById(id)
      
      if (!memory) {
        return Err(new MemoryNotFoundError(id))
      }

      return Ok(memory)

    } catch (error) {
      console.error(`Failed to get memory ${id}:`, error)
      return Err(new GenericDomainError('memory', 'GET_FAILED', 
        `Failed to get memory ${id}`, error as Error))
    }
  }

  /**
   * Search memories using vector similarity
   */
  async searchMemories(query: MemorySearchQuery): Promise<Result<MemorySearchResult[], DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      // Validate query
      const validationResult = MemorySearchQuerySchema.safeParse(query)
      if (!validationResult.success) {
        return Err(new MemoryValidationError(
          'Invalid memory search query', 
          validationResult.error
        ))
      }

      const validatedQuery = validationResult.data

      // Generate embedding for search query
      const queryEmbedding = await this.vectorStore.generateEmbedding(validatedQuery.query)

      // Search vectors
      const vectorResults = await this.vectorStore.searchSimilar(
        queryEmbedding,
        validatedQuery.limit,
        validatedQuery.threshold
      )

      // Get memory entities and calculate relevance scores
      const searchResults: MemorySearchResult[] = []

      for (const vectorResult of vectorResults) {
        const memory = await this.repository.findById(vectorResult.id)
        
        if (memory) {
          // Apply additional filters
          if (validatedQuery.type && memory.type !== validatedQuery.type) continue
          if (validatedQuery.scope && memory.scope !== validatedQuery.scope) continue
          if (validatedQuery.projectId && memory.metadata.projectId !== validatedQuery.projectId) continue
          if (validatedQuery.taskId && memory.metadata.taskId !== validatedQuery.taskId) continue
          if (validatedQuery.agentType && memory.metadata.agentType !== validatedQuery.agentType) continue
          
          // Tag filtering
          if (validatedQuery.tags && validatedQuery.tags.length > 0) {
            const hasMatchingTag = validatedQuery.tags.some(tag => 
              memory.metadata.tags.includes(tag)
            )
            if (!hasMatchingTag) continue
          }

          // Calculate relevance score (combination of similarity and importance)
          const relevanceScore = (vectorResult.similarity * 0.7) + (memory.metadata.importance * 0.3)

          searchResults.push({
            memory,
            similarity: vectorResult.similarity,
            relevanceScore
          })

          // Record access for analytics
          await this.recordMemoryAccess(memory.id, 'search', `Query: ${validatedQuery.query}`)
        }
      }

      // Sort by relevance score
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

      console.log(`Found ${searchResults.length} memories for query: "${validatedQuery.query}"`)
      return Ok(searchResults)

    } catch (error) {
      console.error('Failed to search memories:', error)
      return Err(new GenericDomainError('memory', 'SEARCH_FAILED', 
        'Failed to search memories', error as Error))
    }
  }

  /**
   * Get memories with filtering and pagination
   */
  async getMemories(query?: MemoryQuery): Promise<Result<PagedResult<Memory>, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      const result = await this.repository.findAll(query)
      return Ok(result)

    } catch (error) {
      console.error('Failed to get memories:', error)
      return Err(new GenericDomainError('memory', 'GET_MEMORIES_FAILED', 
        'Failed to get memories', error as Error))
    }
  }

  /**
   * Update memory content and regenerate embedding
   */
  async updateMemory(id: string, input: UpdateMemoryInput): Promise<Result<Memory, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      // Validate input
      const validationResult = UpdateMemorySchema.safeParse(input)
      if (!validationResult.success) {
        return Err(new MemoryValidationError(
          'Invalid update memory input', 
          validationResult.error
        ))
      }

      const validatedInput = validationResult.data

      // Get existing memory
      const existing = await this.repository.findById(id)
      if (!existing) {
        return Err(new MemoryNotFoundError(id))
      }

      // Update memory
      let updatedMemory: Memory = {
        ...existing,
        content: validatedInput.content || existing.content,
        status: validatedInput.status || existing.status,
        metadata: {
          ...existing.metadata,
          ...validatedInput.metadata
        },
        updatedAt: new Date()
      }

      // If content changed, regenerate embedding
      if (validatedInput.content && validatedInput.content !== existing.content) {
        const newEmbedding = await this.vectorStore.generateEmbedding(validatedInput.content)
        // Create new memory object with updated embedding since embedding is readonly
        const memoryWithNewEmbedding: Memory = {
          ...updatedMemory,
          embedding: newEmbedding
        }
        
        // Update vector store
        await this.vectorStore.updateVector(id, newEmbedding, {
          content: memoryWithNewEmbedding.content,
          type: memoryWithNewEmbedding.type,
          scope: memoryWithNewEmbedding.scope,
          projectId: memoryWithNewEmbedding.metadata.projectId,
          taskId: memoryWithNewEmbedding.metadata.taskId,
          agentType: memoryWithNewEmbedding.metadata.agentType,
          tags: memoryWithNewEmbedding.metadata.tags,
          source: memoryWithNewEmbedding.metadata.source,
          importance: memoryWithNewEmbedding.metadata.importance,
          updatedAt: memoryWithNewEmbedding.updatedAt.toISOString()
        })

        // Save updated memory to repository
        await this.repository.save(memoryWithNewEmbedding)
        updatedMemory = memoryWithNewEmbedding
      } else {
        // Save to repository if no embedding change
        await this.repository.save(updatedMemory)
      }

      // Publish domain event
      const event: MemoryUpdatedEvent = {
        id: uuidv4(),
        type: 'memory.updated',
        domain: 'memory',
        timestamp: new Date(),
        version: 1,
        payload: {
          memoryId: id,
          changes: validatedInput
        }
      }
      
      this.eventBus.publish(event)

      console.log(`Updated memory: ${id}`)
      return Ok(updatedMemory)

    } catch (error) {
      console.error(`Failed to update memory ${id}:`, error)
      return Err(new GenericDomainError('memory', 'UPDATE_FAILED', 
        `Failed to update memory ${id}`, error as Error))
    }
  }

  /**
   * Archive memory (soft delete)
   */
  async archiveMemory(id: string, reason: string): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      const updateResult = await this.updateMemory(id, { 
        status: 'archived',
        metadata: { source: `archived: ${reason}` }
      })

      if (!updateResult.success) {
        return updateResult as Result<void, DomainError>
      }

      // Publish domain event
      const event: MemoryArchivedEvent = {
        id: uuidv4(),
        type: 'memory.archived',
        domain: 'memory',
        timestamp: new Date(),
        version: 1,
        payload: {
          memoryId: id,
          reason
        }
      }
      
      this.eventBus.publish(event)

      console.log(`Archived memory: ${id}`)
      return Ok(undefined)

    } catch (error) {
      console.error(`Failed to archive memory ${id}:`, error)
      return Err(new GenericDomainError('memory', 'ARCHIVE_FAILED', 
        `Failed to archive memory ${id}`, error as Error))
    }
  }

  /**
   * Permanently delete memory
   */
  async deleteMemory(id: string): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      // Delete from repository
      await this.repository.delete(id)

      // Delete from vector store
      await this.vectorStore.deleteVector(id)

      console.log(`Deleted memory: ${id}`)
      return Ok(undefined)

    } catch (error) {
      console.error(`Failed to delete memory ${id}:`, error)
      return Err(new GenericDomainError('memory', 'DELETE_FAILED', 
        `Failed to delete memory ${id}`, error as Error))
    }
  }

  /**
   * Get memories for specific project
   */
  async getProjectMemories(projectId: string): Promise<Result<Memory[], DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      const memories = await this.repository.findByProject(projectId)
      return Ok(memories)

    } catch (error) {
      console.error(`Failed to get project memories for ${projectId}:`, error)
      return Err(new GenericDomainError('memory', 'GET_PROJECT_MEMORIES_FAILED', 
        `Failed to get project memories for ${projectId}`, error as Error))
    }
  }

  /**
   * Get memories for specific agent
   */
  async getAgentMemories(agentType: string): Promise<Result<Memory[], DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      const memories = await this.repository.findByAgent(agentType)
      return Ok(memories)

    } catch (error) {
      console.error(`Failed to get agent memories for ${agentType}:`, error)
      return Err(new GenericDomainError('memory', 'GET_AGENT_MEMORIES_FAILED', 
        `Failed to get agent memories for ${agentType}`, error as Error))
    }
  }

  /**
   * Record memory access for analytics
   */
  async recordMemoryAccess(memoryId: string, accessedBy: string, context: string): Promise<Result<void, DomainError>> {
    try {
      await this.repository.updateAccessStats(memoryId)

      // Publish domain event
      const event: MemoryAccessedEvent = {
        id: uuidv4(),
        type: 'memory.accessed',
        domain: 'memory',
        timestamp: new Date(),
        version: 1,
        payload: {
          memoryId,
          accessedBy,
          context
        }
      }
      
      this.eventBus.publish(event)

      return Ok(undefined)

    } catch (error) {
      // Don't fail the operation if access recording fails
      console.warn(`Failed to record memory access for ${memoryId}:`, error)
      return Ok(undefined)
    }
  }

  /**
   * Clean up old or unused memories
   */
  async cleanupMemories(criteria: MemoryCleanupCriteria): Promise<Result<number, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      const cleanedCount = await this.repository.cleanup({
        olderThan: criteria.olderThan,
        notAccessedSince: criteria.notAccessedSince,
        importanceThreshold: criteria.importanceThreshold
      })

      console.log(`Cleaned up ${cleanedCount} memories`)
      return Ok(cleanedCount)

    } catch (error) {
      console.error('Failed to cleanup memories:', error)
      return Err(new GenericDomainError('memory', 'CLEANUP_FAILED', 
        'Failed to cleanup memories', error as Error))
    }
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryStatistics(): Promise<Result<MemoryStatistics, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('NOT_INITIALIZED', 'memory', 
        'Memory domain service not initialized'))
    }

    try {
      const repoStats = await this.repository.getStatistics()
      const vectorStats = await this.vectorStore.getStatistics()

      const statistics: MemoryStatistics = {
        totalMemories: repoStats.totalMemories,
        memoriesByType: repoStats.memoriesByType,
        memoriesByScope: {
          personal: vectorStats.vectorsByScope.personal || 0,
          shared: vectorStats.vectorsByScope.shared || 0,
          system: vectorStats.vectorsByScope.system || 0
        },
        averageImportance: await this.calculateAverageImportance(),
        storageUsed: repoStats.totalSize,
        lastCleanup: new Date() // TODO: Track actual cleanup date
      }

      return Ok(statistics)

    } catch (error) {
      console.error('Failed to get memory statistics:', error)
      return Err(new GenericDomainError('memory', 'STATISTICS_FAILED', 
        'Failed to get memory statistics', error as Error))
    }
  }

  // ICS Interface Requirements (from base DomainService)
  async findById(id: string): Promise<Memory> {
    const result = await this.getMemory(id)
    if (result.success) {
      return result.data
    } else {
      throw result.error
    }
  }

  async findByIdOrNull(id: string): Promise<Memory | null> {
    const result = await this.getMemory(id)
    return result.success ? result.data : null
  }

  // Base DomainService interface requirements
  async create(input: unknown): Promise<Memory> {
    const result = await this.storeMemory(input as CreateMemoryInput)
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error.message)
    }
  }

  async update(id: string, input: unknown): Promise<Memory> {
    const result = await this.updateMemory(id, input as UpdateMemoryInput)
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error.message)
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.deleteMemory(id)
    if (result.success) {
      return
    } else {
      throw new Error(result.error.message)
    }
  }

  async cleanup(): Promise<void> {
    await this.vectorStore.cleanup()
    console.log('Memory domain service cleanup completed')
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isInitialized) return false
      return await this.vectorStore.healthCheck()
    } catch {
      return false
    }
  }

  /**
   * Calculate average importance across all memories
   */
  private async calculateAverageImportance(): Promise<number> {
    try {
      const memories = await this.repository.getAllMemories()
      if (memories.length === 0) return 0

      const totalImportance = memories.reduce((sum, memory) => sum + memory.metadata.importance, 0)
      return totalImportance / memories.length

    } catch (error) {
      console.error('Failed to calculate average importance:', error)
      return 0
    }
  }
}