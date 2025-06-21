/**
 * Memory IPC Handlers
 * 
 * Provides IPC communication between renderer and main process
 * for memory operations.
 */

import { ipcMain } from 'electron'
import { MemoryDomainService } from './MemoryDomainService'
import { 
  CreateMemorySchema,
  MemorySearchQuerySchema,
  UpdateMemoryInput,
  UpdateMemorySchema
} from '../../../shared/contracts/MemoryDomain'
import { Result } from '../../../shared/contracts/common'

export class MemoryIPCHandlers {
  private memoryService: MemoryDomainService

  constructor() {
    this.memoryService = new MemoryDomainService()
  }

  /**
   * Helper to handle Result pattern consistently
   */
  private handleResult<T>(result: Result<T, any>): T {
    if (result.success) {
      return result.data
    }
    // TypeScript knows result is failure case here
    throw new Error(result.error.message)
  }

  /**
   * Initialize memory service and register all IPC handlers
   */
  async initialize(): Promise<void> {
    console.log('Initializing Memory IPC Handlers...')
    
    // Initialize memory service
    const initResult = await this.memoryService.initialize()
    if (!initResult.success) {
      throw new Error(`Failed to initialize memory service: ${initResult.error.message}`)
    }

    // Register IPC handlers
    this.registerHandlers()
    
    console.log('Memory IPC Handlers initialized successfully')
  }

  /**
   * Register all memory-related IPC handlers
   */
  private registerHandlers(): void {
    // Store new memory
    ipcMain.handle('memory:add', async (_event, input: any) => {
      try {
        console.log('IPC: memory:add called', { type: input.type, content: input.content.substring(0, 100) })
        
        // Validate input
        const validation = CreateMemorySchema.safeParse(input)
        if (!validation.success) {
          throw new Error(`Invalid input: ${validation.error.message}`)
        }

        const result = await this.memoryService.storeMemory(validation.data)
        const memory = this.handleResult(result)
        
        console.log('IPC: memory:add completed', { memoryId: memory.id })
        return memory

      } catch (error) {
        console.error('IPC: memory:add failed:', error)
        throw error
      }
    })

    // Search memories
    ipcMain.handle('memory:search', async (_event, query: any) => {
      try {
        console.log('IPC: memory:search called', { query: query.query, type: query.type })
        
        // Validate query
        const validation = MemorySearchQuerySchema.safeParse(query)
        if (!validation.success) {
          throw new Error(`Invalid query: ${validation.error.message}`)
        }

        const result = await this.memoryService.searchMemories(validation.data)
        const searchResults = this.handleResult(result)
        
        console.log('IPC: memory:search completed', { resultCount: searchResults.length })
        return searchResults

      } catch (error) {
        console.error('IPC: memory:search failed:', error)
        throw error
      }
    })

    // Get memory by ID
    ipcMain.handle('memory:get', async (_event, id: string) => {
      try {
        console.log('IPC: memory:get called', { id })
        
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid memory ID')
        }

        const result = await this.memoryService.getMemory(id)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:get completed', { memoryId: result.data.id })
        return result.data

      } catch (error) {
        console.error('IPC: memory:get failed:', error)
        throw error
      }
    })

    // Update memory
    ipcMain.handle('memory:update', async (_event, id: string, input: UpdateMemoryInput) => {
      try {
        console.log('IPC: memory:update called', { id })
        
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid memory ID')
        }

        // Validate input
        const validation = UpdateMemorySchema.safeParse(input)
        if (!validation.success) {
          throw new Error(`Invalid input: ${validation.error.message}`)
        }

        const result = await this.memoryService.updateMemory(id, validation.data)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:update completed', { memoryId: result.data.id })
        return result.data

      } catch (error) {
        console.error('IPC: memory:update failed:', error)
        throw error
      }
    })

    // Archive memory
    ipcMain.handle('memory:archive', async (_event, id: string, reason: string) => {
      try {
        console.log('IPC: memory:archive called', { id, reason })
        
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid memory ID')
        }

        if (!reason || typeof reason !== 'string') {
          throw new Error('Archive reason is required')
        }

        const result = await this.memoryService.archiveMemory(id, reason)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:archive completed', { memoryId: id })
        return { success: true }

      } catch (error) {
        console.error('IPC: memory:archive failed:', error)
        throw error
      }
    })

    // Delete memory
    ipcMain.handle('memory:delete', async (_event, id: string) => {
      try {
        console.log('IPC: memory:delete called', { id })
        
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid memory ID')
        }

        const result = await this.memoryService.deleteMemory(id)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:delete completed', { memoryId: id })
        return { success: true }

      } catch (error) {
        console.error('IPC: memory:delete failed:', error)
        throw error
      }
    })

    // Get memories with pagination
    ipcMain.handle('memory:list', async (_event, query?: any) => {
      try {
        console.log('IPC: memory:list called', { query })
        
        const result = await this.memoryService.getMemories(query)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:list completed', { 
          total: result.data.total, 
          page: result.data.page 
        })
        return result.data

      } catch (error) {
        console.error('IPC: memory:list failed:', error)
        throw error
      }
    })

    // Get project memories
    ipcMain.handle('memory:project', async (_event, projectId: string) => {
      try {
        console.log('IPC: memory:project called', { projectId })
        
        if (!projectId || typeof projectId !== 'string') {
          throw new Error('Invalid project ID')
        }

        const result = await this.memoryService.getProjectMemories(projectId)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:project completed', { 
          projectId, 
          memoryCount: result.data.length 
        })
        return result.data

      } catch (error) {
        console.error('IPC: memory:project failed:', error)
        throw error
      }
    })

    // Get agent memories
    ipcMain.handle('memory:agent', async (_event, agentType: string) => {
      try {
        console.log('IPC: memory:agent called', { agentType })
        
        if (!agentType || typeof agentType !== 'string') {
          throw new Error('Invalid agent type')
        }

        const result = await this.memoryService.getAgentMemories(agentType)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:agent completed', { 
          agentType, 
          memoryCount: result.data.length 
        })
        return result.data

      } catch (error) {
        console.error('IPC: memory:agent failed:', error)
        throw error
      }
    })

    // Get memory statistics
    ipcMain.handle('memory:statistics', async (_event) => {
      try {
        console.log('IPC: memory:statistics called')
        
        const result = await this.memoryService.getMemoryStatistics()
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:statistics completed', { 
          totalMemories: result.data.totalMemories 
        })
        return result.data

      } catch (error) {
        console.error('IPC: memory:statistics failed:', error)
        throw error
      }
    })

    // Cleanup old memories
    ipcMain.handle('memory:cleanup', async (_event, criteria: any) => {
      try {
        console.log('IPC: memory:cleanup called', { criteria })
        
        const result = await this.memoryService.cleanupMemories(criteria)
        
        if (result.success) {
          // Success case handled inline
        } else {
          throw new Error(result.error.message)
        }

        console.log('IPC: memory:cleanup completed', { 
          cleanedCount: result.data 
        })
        return { cleanedCount: result.data }

      } catch (error) {
        console.error('IPC: memory:cleanup failed:', error)
        throw error
      }
    })

    // Health check
    ipcMain.handle('memory:health', async (_event) => {
      try {
        console.log('IPC: memory:health called')
        
        const isHealthy = await this.memoryService.healthCheck()
        
        console.log('IPC: memory:health completed', { isHealthy })
        return { 
          healthy: isHealthy,
          timestamp: new Date().toISOString()
        }

      } catch (error) {
        console.error('IPC: memory:health failed:', error)
        throw error
      }
    })

    console.log('Memory IPC handlers registered successfully')
  }

  /**
   * Cleanup and remove IPC handlers
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up Memory IPC Handlers...')
    
    // Remove IPC handlers
    ipcMain.removeHandler('memory:add')
    ipcMain.removeHandler('memory:search')
    ipcMain.removeHandler('memory:get')
    ipcMain.removeHandler('memory:update')
    ipcMain.removeHandler('memory:archive')
    ipcMain.removeHandler('memory:delete')
    ipcMain.removeHandler('memory:list')
    ipcMain.removeHandler('memory:project')
    ipcMain.removeHandler('memory:agent')
    ipcMain.removeHandler('memory:statistics')
    ipcMain.removeHandler('memory:cleanup')
    ipcMain.removeHandler('memory:health')
    
    // Cleanup memory service
    await this.memoryService.cleanup()
    
    console.log('Memory IPC Handlers cleanup completed')
  }

  /**
   * Get the memory service instance for direct access
   */
  getMemoryService(): MemoryDomainService {
    return this.memoryService
  }
}