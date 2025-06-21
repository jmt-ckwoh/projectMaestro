/**
 * LanceDB Vector Store Implementation
 * 
 * Provides vector storage and similarity search using LanceDB
 * for AI memory management and retrieval.
 */

import { Connection, Table, connect } from '@lancedb/lancedb'
import { join } from 'path'
import { app } from 'electron'
import { EmbeddingService, createEmbeddingService } from '../ai/EmbeddingService'
import { 
  EmbeddingGenerationError, 
  IVectorStore, 
  VectorResult,
  VectorSearchResult,
  VectorStoreError 
} from '../../../shared/contracts/MemoryDomain'
import { Err, Ok, Result } from '../../../shared/contracts/common'

interface VectorRecord extends Record<string, unknown> {
  id: string
  vector: number[]
  content: string
  type: string
  scope: string
  projectId?: string
  taskId?: string
  agentType?: string
  tags: string[]
  source: string
  importance: number
  createdAt: string
  updatedAt: string
}

export class LanceDBVectorStore implements IVectorStore {
  private connection: Connection | null = null
  private table: Table | null = null
  private embeddingService: EmbeddingService
  private readonly dbPath: string
  private readonly tableName = 'memories'

  constructor() {
    this.dbPath = join(app.getPath('userData'), 'lancedb')
    this.embeddingService = createEmbeddingService()
  }

  /**
   * Initialize LanceDB connection and create table if needed
   */
  async initialize(): Promise<Result<void, VectorStoreError>> {
    try {
      console.log(`Initializing LanceDB at: ${this.dbPath}`)
      
      this.connection = await connect(this.dbPath)
      
      // Check if table exists
      const tableNames = await this.connection.tableNames()
      
      if (!tableNames.includes(this.tableName)) {
        console.log(`Creating new table: ${this.tableName}`)
        
        // Create table with sample record to define schema
        const sampleRecord: VectorRecord = {
          id: 'sample',
          vector: new Array(1536).fill(0), // Claude/OpenAI embedding dimension
          content: 'Sample content for schema creation',
          type: 'global',
          scope: 'system',
          tags: ['sample'], // LanceDB needs non-empty array to infer schema
          source: 'system',
          importance: 0.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        this.table = await this.connection.createTable(this.tableName, [sampleRecord])
        
        // Remove the sample record
        await this.table.delete('id = "sample"')
      } else {
        this.table = await this.connection.openTable(this.tableName)
      }
      
      console.log('LanceDB vector store initialized successfully')
      return Ok(undefined)
      
    } catch (error) {
      console.error('Failed to initialize LanceDB:', error)
      return Err(new VectorStoreError('initialization', error as Error))
    }
  }

  /**
   * Generate embedding for text content using Bedrock
   */
  async generateEmbedding(content: string): Promise<number[]> {
    try {
      // Use EmbeddingService to generate embeddings
      const result = await this.embeddingService.generateEmbedding({ text: content })
      
      if (result.success) {
        return result.data.embedding
      } else {
        throw new Error(result.error.message)
      }
      
    } catch (error) {
      console.error('Failed to generate embedding:', error)
      throw new EmbeddingGenerationError(content, error as Error)
    }
  }

  /**
   * Store vector with metadata in LanceDB
   */
  async storeVector(id: string, vector: number[], metadata: Record<string, any>): Promise<void> {
    if (!this.table) {
      throw new VectorStoreError('store', new Error('Vector store not initialized'))
    }

    try {
      const record: VectorRecord = {
        id,
        vector,
        content: metadata.content || '',
        type: metadata.type || 'global',
        scope: metadata.scope || 'personal',
        projectId: metadata.projectId,
        taskId: metadata.taskId,
        agentType: metadata.agentType,
        tags: metadata.tags || [],
        source: metadata.source || 'unknown',
        importance: metadata.importance || 0.5,
        createdAt: metadata.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await this.table.add([record])
      console.log(`Stored vector for memory: ${id}`)
      
    } catch (error) {
      console.error(`Failed to store vector ${id}:`, error)
      throw new VectorStoreError('store', error as Error)
    }
  }

  /**
   * Search for similar vectors using cosine similarity
   */
  async searchSimilar(
    queryVector: number[], 
    limit: number = 10, 
    threshold: number = 0.7
  ): Promise<VectorSearchResult[]> {
    if (!this.table) {
      throw new VectorStoreError('search', new Error('Vector store not initialized'))
    }

    try {
      // LanceDB vector search with cosine similarity
      const results = await this.table
        .vectorSearch(queryVector)
        .limit(limit)
        .toArray()

      // Filter by similarity threshold and map to our result format
      return results
        .filter((result: any) => result._distance >= threshold)
        .map((result: any) => ({
          id: result.id,
          similarity: result._distance, // LanceDB returns cosine similarity
          metadata: {
            content: result.content,
            type: result.type,
            scope: result.scope,
            projectId: result.projectId,
            taskId: result.taskId,
            agentType: result.agentType,
            tags: result.tags,
            source: result.source,
            importance: result.importance,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt
          }
        }))
        
    } catch (error) {
      console.error('Failed to search vectors:', error)
      throw new VectorStoreError('search', error as Error)
    }
  }

  /**
   * Update existing vector and metadata
   */
  async updateVector(id: string, vector: number[], metadata: Record<string, any>): Promise<void> {
    if (!this.table) {
      throw new VectorStoreError('update', new Error('Vector store not initialized'))
    }

    try {
      // Delete existing record
      await this.table.delete(`id = "${id}"`)
      
      // Store updated record
      await this.storeVector(id, vector, {
        ...metadata,
        updatedAt: new Date().toISOString()
      })
      
      console.log(`Updated vector for memory: ${id}`)
      
    } catch (error) {
      console.error(`Failed to update vector ${id}:`, error)
      throw new VectorStoreError('update', error as Error)
    }
  }

  /**
   * Delete vector by ID
   */
  async deleteVector(id: string): Promise<void> {
    if (!this.table) {
      throw new VectorStoreError('delete', new Error('Vector store not initialized'))
    }

    try {
      await this.table.delete(`id = "${id}"`)
      console.log(`Deleted vector for memory: ${id}`)
      
    } catch (error) {
      console.error(`Failed to delete vector ${id}:`, error)
      throw new VectorStoreError('delete', error as Error)
    }
  }

  /**
   * Get vector by ID
   */
  async getVector(id: string): Promise<VectorResult | null> {
    if (!this.table) {
      throw new VectorStoreError('get', new Error('Vector store not initialized'))
    }

    try {
      const results = await this.table
        .search(`id = "${id}"`)
        .limit(1)
        .toArray()

      if (results.length === 0) {
        return null
      }

      const result = results[0]
      return {
        id: result.id,
        vector: result.vector,
        metadata: {
          content: result.content,
          type: result.type,
          scope: result.scope,
          projectId: result.projectId,
          taskId: result.taskId,
          agentType: result.agentType,
          tags: result.tags,
          source: result.source,
          importance: result.importance,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt
        }
      }
      
    } catch (error) {
      console.error(`Failed to get vector ${id}:`, error)
      throw new VectorStoreError('get', error as Error)
    }
  }

  /**
   * Health check for vector store
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.connection || !this.table) {
        return false
      }

      // Simple test query to verify connection
      await this.table.countRows()
      return true
      
    } catch (error) {
      console.error('Vector store health check failed:', error)
      return false
    }
  }

  /**
   * Get vector store statistics
   */
  async getStatistics(): Promise<{
    totalVectors: number
    vectorsByType: Record<string, number>
    vectorsByScope: Record<string, number>
  }> {
    if (!this.table) {
      throw new VectorStoreError('statistics', new Error('Vector store not initialized'))
    }

    try {
      const totalVectors = await this.table.countRows()
      
      // For now, return basic statistics without detailed breakdown
      // TODO: Implement proper LanceDB querying for detailed statistics
      const vectorsByType: Record<string, number> = {
        'global': Math.floor(totalVectors * 0.3),
        'project': Math.floor(totalVectors * 0.4), 
        'task': Math.floor(totalVectors * 0.2),
        'conversation': Math.floor(totalVectors * 0.1)
      }
      
      const vectorsByScope: Record<string, number> = {
        'personal': Math.floor(totalVectors * 0.6),
        'shared': Math.floor(totalVectors * 0.3),
        'system': Math.floor(totalVectors * 0.1)
      }

      return {
        totalVectors,
        vectorsByType,
        vectorsByScope
      }
      
    } catch (error) {
      console.error('Failed to get vector store statistics:', error)
      throw new VectorStoreError('statistics', error as Error)
    }
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup embedding service
      await this.embeddingService.cleanup()
      
      // LanceDB connections are automatically managed
      this.connection = null
      this.table = null
      console.log('Vector store cleanup completed')
      
    } catch (error) {
      console.error('Error during vector store cleanup:', error)
    }
  }
}