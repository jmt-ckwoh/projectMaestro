/**
 * Memory Repository Implementation
 * 
 * Provides data access layer for memory persistence
 * with JSON file storage and caching.
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { 
  IMemoryRepository,
  Memory, 
  MemoryNotFoundError,
  MemoryQuery,
  MemoryType 
} from '../../../shared/contracts/MemoryDomain'
import { PagedResult } from '../../../shared/contracts/common'

interface MemoryData {
  memories: Memory[]
  lastModified: Date
}

export class MemoryRepository implements IMemoryRepository {
  private readonly dataPath: string
  private readonly filePath: string
  private cache: Map<string, Memory> = new Map()
  private lastLoad: Date | null = null

  constructor() {
    this.dataPath = join(app.getPath('userData'), 'memory-data')
    this.filePath = join(this.dataPath, 'memories.json')
  }

  /**
   * Initialize repository and ensure data directory exists
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dataPath, { recursive: true })
      
      // Load existing data if file exists
      try {
        await this.loadFromFile()
      } catch (error) {
        // If file doesn't exist, create empty data structure
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          await this.saveToFile([])
          console.log('Created new memory data file')
        } else {
          throw error
        }
      }
      
      console.log(`Memory repository initialized at: ${this.dataPath}`)
      
    } catch (error) {
      console.error('Failed to initialize memory repository:', error)
      throw error
    }
  }

  /**
   * Find memory by ID
   */
  async findById(id: string): Promise<Memory | null> {
    await this.ensureLoaded()
    return this.cache.get(id) || null
  }

  /**
   * Find all memories with optional filtering and pagination
   */
  async findAll(query?: MemoryQuery): Promise<PagedResult<Memory>> {
    await this.ensureLoaded()
    
    let memories = Array.from(this.cache.values())
    
    // Apply filters
    if (query) {
      if (query.type) {
        memories = memories.filter(m => m.type === query.type)
      }
      
      if (query.scope) {
        memories = memories.filter(m => m.scope === query.scope)
      }
      
      if (query.status) {
        memories = memories.filter(m => m.status === query.status)
      }
      
      if (query.projectId) {
        memories = memories.filter(m => m.metadata.projectId === query.projectId)
      }
      
      if (query.agentType) {
        memories = memories.filter(m => m.metadata.agentType === query.agentType)
      }
      
      if (query.search) {
        const searchLower = query.search.toLowerCase()
        memories = memories.filter(m => 
          m.content.toLowerCase().includes(searchLower) ||
          m.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }
    }
    
    // Sort by creation date (newest first)
    memories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    // Apply pagination
    const page = query?.page || 1
    const limit = query?.limit || 20
    const offset = (page - 1) * limit
    
    const paginatedMemories = memories.slice(offset, offset + limit)
    
    return {
      items: paginatedMemories,
      total: memories.length,
      page,
      limit,
      hasNext: offset + limit < memories.length,
      hasPrev: page > 1
    }
  }

  /**
   * Find memories by type
   */
  async findByType(type: MemoryType): Promise<Memory[]> {
    await this.ensureLoaded()
    return Array.from(this.cache.values()).filter(m => m.type === type)
  }

  /**
   * Find memories by project
   */
  async findByProject(projectId: string): Promise<Memory[]> {
    await this.ensureLoaded()
    return Array.from(this.cache.values()).filter(m => m.metadata.projectId === projectId)
  }

  /**
   * Find memories by agent
   */
  async findByAgent(agentType: string): Promise<Memory[]> {
    await this.ensureLoaded()
    return Array.from(this.cache.values()).filter(m => m.metadata.agentType === agentType)
  }

  /**
   * Save memory (create or update)
   */
  async save(memory: Memory): Promise<Memory> {
    await this.ensureLoaded()
    
    // Update cache
    this.cache.set(memory.id, memory)
    
    // Persist to file
    await this.saveToFile(Array.from(this.cache.values()))
    
    console.log(`Saved memory: ${memory.id}`)
    return memory
  }

  /**
   * Delete memory by ID
   */
  async delete(id: string): Promise<void> {
    await this.ensureLoaded()
    
    if (!this.cache.has(id)) {
      throw new MemoryNotFoundError(id)
    }
    
    // Remove from cache
    this.cache.delete(id)
    
    // Persist to file
    await this.saveToFile(Array.from(this.cache.values()))
    
    console.log(`Deleted memory: ${id}`)
  }

  /**
   * Check if memory exists
   */
  async exists(id: string): Promise<boolean> {
    await this.ensureLoaded()
    return this.cache.has(id)
  }

  /**
   * Update access statistics for memory
   */
  async updateAccessStats(id: string): Promise<void> {
    await this.ensureLoaded()
    
    const memory = this.cache.get(id)
    if (!memory) {
      throw new MemoryNotFoundError(id)
    }
    
    // Update access stats
    const updatedMemory: Memory = {
      ...memory,
      metadata: {
        ...memory.metadata,
        lastAccessed: new Date(),
        accessCount: memory.metadata.accessCount + 1
      },
      updatedAt: new Date()
    }
    
    // Save updated memory
    await this.save(updatedMemory)
  }

  /**
   * Get all memories for bulk operations
   */
  async getAllMemories(): Promise<Memory[]> {
    await this.ensureLoaded()
    return Array.from(this.cache.values())
  }

  /**
   * Get repository statistics
   */
  async getStatistics(): Promise<{
    totalMemories: number
    memoriesByType: Record<MemoryType, number>
    totalSize: number
  }> {
    await this.ensureLoaded()
    
    const memories = Array.from(this.cache.values())
    const memoriesByType: Record<MemoryType, number> = {
      'global': 0,
      'project': 0,
      'task': 0,
      'conversation': 0,
      'user-preference': 0
    }
    
    let totalSize = 0
    
    memories.forEach(memory => {
      memoriesByType[memory.type]++
      totalSize += JSON.stringify(memory).length
    })
    
    return {
      totalMemories: memories.length,
      memoriesByType,
      totalSize
    }
  }

  /**
   * Cleanup orphaned or old memories
   */
  async cleanup(criteria: {
    olderThan?: Date
    notAccessedSince?: Date
    importanceThreshold?: number
  }): Promise<number> {
    await this.ensureLoaded()
    
    const memories = Array.from(this.cache.values())
    let cleanedCount = 0
    
    for (const memory of memories) {
      let shouldCleanup = false
      
      if (criteria.olderThan && new Date(memory.createdAt) < criteria.olderThan) {
        shouldCleanup = true
      }
      
      if (criteria.notAccessedSince && memory.metadata.lastAccessed && 
          memory.metadata.lastAccessed < criteria.notAccessedSince) {
        shouldCleanup = true
      }
      
      if (criteria.importanceThreshold !== undefined && 
          memory.metadata.importance < criteria.importanceThreshold) {
        shouldCleanup = true
      }
      
      if (shouldCleanup) {
        await this.delete(memory.id)
        cleanedCount++
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} memories`)
    return cleanedCount
  }

  /**
   * Ensure data is loaded from file
   */
  private async ensureLoaded(): Promise<void> {
    try {
      const stats = await fs.stat(this.filePath)
      
      // Reload if file was modified since last load
      if (!this.lastLoad || stats.mtime > this.lastLoad) {
        await this.loadFromFile()
      }
    } catch (error) {
      // File might not exist yet, which is ok
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error checking file stats:', error)
      }
    }
  }

  /**
   * Load memories from JSON file
   */
  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      const memoryData: MemoryData = JSON.parse(data)
      
      // Convert date strings back to Date objects
      const memories = memoryData.memories.map(memory => ({
        ...memory,
        createdAt: new Date(memory.createdAt),
        updatedAt: new Date(memory.updatedAt),
        metadata: {
          ...memory.metadata,
          lastAccessed: memory.metadata.lastAccessed ? 
            new Date(memory.metadata.lastAccessed) : undefined
        }
      }))
      
      // Rebuild cache
      this.cache.clear()
      memories.forEach(memory => {
        this.cache.set(memory.id, memory)
      })
      
      this.lastLoad = new Date()
      console.log(`Loaded ${memories.length} memories from file`)
      
    } catch (error) {
      console.error('Failed to load memories from file:', error)
      throw error
    }
  }

  /**
   * Save memories to JSON file
   */
  private async saveToFile(memories: Memory[]): Promise<void> {
    try {
      const memoryData: MemoryData = {
        memories,
        lastModified: new Date()
      }
      
      const data = JSON.stringify(memoryData, null, 2)
      await fs.writeFile(this.filePath, data, 'utf-8')
      
      this.lastLoad = new Date()
      
    } catch (error) {
      console.error('Failed to save memories to file:', error)
      throw error
    }
  }
}