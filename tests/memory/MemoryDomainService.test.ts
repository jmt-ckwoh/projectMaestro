/**
 * Memory Domain Service Tests
 * 
 * Comprehensive tests for the memory system functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryDomainService } from '../../src/main/services/memory/MemoryDomainService'
import { MemoryRepository } from '../../src/main/services/memory/MemoryRepository'
import { LanceDBVectorStore } from '../../src/main/services/memory/VectorStore'
import { EventBus } from '../../src/main/services/core/EventBus'
import { 
  CreateMemoryInput,
  MemorySearchQuery,
  Memory,
  MemoryType
} from '../../src/shared/contracts/MemoryDomain'

// Mock external dependencies
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-data')
  }
}))

vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn(() => Promise.resolve({
    tableNames: vi.fn(() => Promise.resolve(['memories'])),
    openTable: vi.fn(() => Promise.resolve({
      add: vi.fn(),
      vectorSearch: vi.fn(() => ({
        limit: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([]))
        }))
      })),
      search: vi.fn(() => ({
        limit: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([]))
        }))
      })),
      delete: vi.fn(),
      countRows: vi.fn(() => Promise.resolve(0))
    })),
    createTable: vi.fn()
  }))
}))

// Mock AWS SDK to prevent real AWS calls in tests
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(() => ({
    send: vi.fn()
  })),
  InvokeModelCommand: vi.fn()
}))

vi.mock('@aws-sdk/credential-provider-ini', () => ({
  fromIni: vi.fn(() => ({}))
}))

vi.mock('@aws-sdk/node-http-handler', () => ({
  NodeHttpHandler: vi.fn()
}))

describe('MemoryDomainService', () => {
  let memoryService: MemoryDomainService
  let mockRepository: Partial<MemoryRepository>
  let mockVectorStore: Partial<LanceDBVectorStore>
  let mockEventBus: Partial<EventBus>

  beforeEach(async () => {
    // Create mocks
    mockRepository = {
      initialize: vi.fn(),
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(() => Promise.resolve({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasNext: false,
        hasPrev: false
      })),
      delete: vi.fn(),
      updateAccessStats: vi.fn()
    }

    mockVectorStore = {
      initialize: vi.fn(() => Promise.resolve({ success: true as const, data: undefined as void })),
      generateEmbedding: vi.fn(() => Promise.resolve(new Array(1536).fill(0.1))),
      storeVector: vi.fn(),
      updateVector: vi.fn(),
      searchSimilar: vi.fn(() => Promise.resolve([])),
      deleteVector: vi.fn(),
      healthCheck: vi.fn(() => Promise.resolve(true)),
      cleanup: vi.fn()
    }

    mockEventBus = {
      publish: vi.fn(),
      publishAsync: vi.fn()
    }

    // Create service instance
    memoryService = new MemoryDomainService()
    
    // Inject mocks
    ;(memoryService as any).repository = mockRepository
    ;(memoryService as any).vectorStore = mockVectorStore
    ;(memoryService as any).eventBus = mockEventBus
    ;(memoryService as any).isInitialized = true
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Memory Storage', () => {
    it('should store a new memory successfully', async () => {
      const input: CreateMemoryInput = {
        content: 'Test memory content',
        type: 'conversation',
        scope: 'personal',
        metadata: {
          tags: ['test'],
          source: 'test',
          importance: 0.8,
          accessCount: 0
        } as any
      }

      const mockMemory: Memory = {
        id: 'memory-123',
        content: input.content,
        type: input.type,
        scope: input.scope || 'personal',
        status: 'active',
        embedding: new Array(1536).fill(0.1),
        metadata: input.metadata as any,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRepository.save = vi.fn(() => Promise.resolve(mockMemory))

      const result = await memoryService.storeMemory(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(input.content)
        expect(result.data.type).toBe(input.type)
        expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith(input.content)
        expect(mockVectorStore.storeVector).toHaveBeenCalled()
        expect(mockRepository.save).toHaveBeenCalled()
        expect(mockEventBus.publish).toHaveBeenCalled()
      }
    })

    it('should validate input before storing memory', async () => {
      const invalidInput = {
        content: '', // Invalid: empty content
        type: 'conversation',
        metadata: {}
      }

      const result = await memoryService.storeMemory(invalidInput as any)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MEMORY_VALIDATION_ERROR')
      }
    })

    it('should handle different memory types', async () => {
      const types: MemoryType[] = ['global', 'project', 'task', 'conversation', 'user-preference']

      for (const type of types) {
        const input: CreateMemoryInput = {
          content: `Test content for ${type}`,
          type,
          metadata: {
            tags: [type],
            source: 'test',
            importance: 0.5,
            accessCount: 0
          }
        }

        mockRepository.save = vi.fn(() => Promise.resolve({
          ...input,
          id: `memory-${type}`,
          scope: 'personal',
          status: 'active',
          embedding: [],
          createdAt: new Date(),
          updatedAt: new Date()
        } as Memory))

        const result = await memoryService.storeMemory(input)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('Memory Search', () => {
    it('should search memories using vector similarity', async () => {
      const query: MemorySearchQuery = {
        query: 'test search query',
        limit: 5,
        threshold: 0.7
      }

      const mockSearchResults = [
        {
          id: 'memory-1',
          similarity: 0.9,
          metadata: {
            content: 'Similar content',
            type: 'conversation'
          }
        }
      ]

      const mockMemory: Memory = {
        id: 'memory-1',
        content: 'Similar content',
        type: 'conversation',
        scope: 'personal',
        status: 'active',
        metadata: {
          tags: [],
          source: 'test',
          importance: 0.5,
          accessCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockVectorStore.searchSimilar = vi.fn(() => Promise.resolve(mockSearchResults))
      mockRepository.findById = vi.fn(() => Promise.resolve(mockMemory))
      mockRepository.updateAccessStats = vi.fn()

      const result = await memoryService.searchMemories(query)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].memory.id).toBe('memory-1')
        expect(result.data[0].similarity).toBe(0.9)
        expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith(query.query)
        expect(mockVectorStore.searchSimilar).toHaveBeenCalled()
      }
    })

    it('should apply filters during search', async () => {
      const query: MemorySearchQuery = {
        query: 'test',
        type: 'project',
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        tags: ['important']
      }

      const mockMemory: Memory = {
        id: 'memory-1',
        content: 'Project related content',
        type: 'project',
        scope: 'shared',
        status: 'active',
        metadata: {
          tags: ['important', 'project'],
          source: 'agent',
          importance: 0.8,
          accessCount: 5,
          projectId: '123e4567-e89b-12d3-a456-426614174000'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockVectorStore.searchSimilar = vi.fn(() => Promise.resolve([{
        id: 'memory-1',
        similarity: 0.85,
        metadata: {}
      }]))
      mockRepository.findById = vi.fn(() => Promise.resolve(mockMemory))

      const result = await memoryService.searchMemories(query)

      if (!result.success) {
        console.log('Search failed with error:', result.error)
      }
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].memory.type).toBe('project')
        expect(result.data[0].memory.metadata.projectId).toBe('123e4567-e89b-12d3-a456-426614174000')
      }
    })

    it('should filter out memories that do not match criteria', async () => {
      const query: MemorySearchQuery = {
        query: 'test',
        type: 'project',
        projectId: '123e4567-e89b-12d3-a456-426614174000'
      }

      // Mock memory that doesn't match project filter
      const mockMemory: Memory = {
        id: 'memory-1',
        content: 'Different project content',
        type: 'project',
        scope: 'shared',
        status: 'active',
        metadata: {
          tags: [],
          source: 'agent',
          importance: 0.5,
          accessCount: 0,
          projectId: '456e7890-e89b-12d3-a456-426614174111' // Different project
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockVectorStore.searchSimilar = vi.fn(() => Promise.resolve([{
        id: 'memory-1',
        similarity: 0.85,
        metadata: {}
      }]))
      mockRepository.findById = vi.fn(() => Promise.resolve(mockMemory))

      const result = await memoryService.searchMemories(query)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(0) // Filtered out
      }
    })
  })

  describe('Memory Retrieval', () => {
    it('should retrieve memory by ID', async () => {
      const memoryId = 'memory-123'
      const mockMemory: Memory = {
        id: memoryId,
        content: 'Test memory',
        type: 'conversation',
        scope: 'personal',
        status: 'active',
        metadata: {
          tags: [],
          source: 'test',
          importance: 0.5,
          accessCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRepository.findById = vi.fn(() => Promise.resolve(mockMemory))

      const result = await memoryService.getMemory(memoryId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(memoryId)
        expect(mockRepository.findById).toHaveBeenCalledWith(memoryId)
      }
    })

    it('should return error for non-existent memory', async () => {
      const memoryId = 'non-existent'

      mockRepository.findById = vi.fn(() => Promise.resolve(null))

      const result = await memoryService.getMemory(memoryId)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('MEMORY_NOT_FOUND')
      }
    })

    it('should get project memories', async () => {
      const projectId = 'project-123'
      const mockMemories: Memory[] = [
        {
          id: 'memory-1',
          content: 'Project memory 1',
          type: 'project',
          scope: 'shared',
          status: 'active',
          metadata: {
            tags: [],
            source: 'agent',
            importance: 0.7,
            accessCount: 2,
            projectId
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockRepository.findByProject = vi.fn(() => Promise.resolve(mockMemories))

      const result = await memoryService.getProjectMemories(projectId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].metadata.projectId).toBe(projectId)
        expect(mockRepository.findByProject).toHaveBeenCalledWith(projectId)
      }
    })
  })

  describe('Memory Updates', () => {
    it('should update memory content and regenerate embedding', async () => {
      const memoryId = 'memory-123'
      const updateInput = {
        content: 'Updated content',
        metadata: {
          importance: 0.9
        }
      }

      const existingMemory: Memory = {
        id: memoryId,
        content: 'Original content',
        type: 'conversation',
        scope: 'personal',
        status: 'active',
        metadata: {
          tags: [],
          source: 'test',
          importance: 0.5,
          accessCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedMemory: Memory = {
        ...existingMemory,
        content: updateInput.content,
        metadata: {
          ...existingMemory.metadata,
          importance: 0.9
        },
        updatedAt: new Date()
      }

      mockRepository.findById = vi.fn(() => Promise.resolve(existingMemory))
      mockRepository.save = vi.fn(() => Promise.resolve(updatedMemory))

      const result = await memoryService.updateMemory(memoryId, updateInput)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(updateInput.content)
        expect(result.data.metadata.importance).toBe(0.9)
        expect(mockVectorStore.generateEmbedding).toHaveBeenCalledWith(updateInput.content)
        expect(mockVectorStore.updateVector).toHaveBeenCalled()
        expect(mockEventBus.publish).toHaveBeenCalled()
      }
    })

    it('should archive memory', async () => {
      const memoryId = 'memory-123'
      const reason = 'Project completed'

      const existingMemory: Memory = {
        id: memoryId,
        content: 'Test content',
        type: 'project',
        scope: 'shared',
        status: 'active',
        metadata: {
          tags: [],
          source: 'agent',
          importance: 0.5,
          accessCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockRepository.findById = vi.fn(() => Promise.resolve(existingMemory))
      mockRepository.save = vi.fn()

      const result = await memoryService.archiveMemory(memoryId, reason)

      expect(result.success).toBe(true)
      expect(mockEventBus.publish).toHaveBeenCalled()
    })
  })

  describe('Memory Statistics', () => {
    it('should get memory statistics', async () => {
      const mockRepoStats = {
        totalMemories: 100,
        memoriesByType: {
          'global': 20,
          'project': 40,
          'task': 25,
          'conversation': 15,
          'user-preference': 0
        },
        totalSize: 1024000
      }

      const mockVectorStats = {
        totalVectors: 100,
        vectorsByType: {},
        vectorsByScope: {
          'personal': 60,
          'shared': 35,
          'system': 5
        }
      }

      ;(mockRepository as any).getStatistics = vi.fn(() => Promise.resolve(mockRepoStats))
      ;(mockVectorStore as any).getStatistics = vi.fn(() => Promise.resolve(mockVectorStats))
      ;(memoryService as any).calculateAverageImportance = vi.fn(() => Promise.resolve(0.65))

      const result = await memoryService.getMemoryStatistics()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalMemories).toBe(100)
        expect(result.data.memoriesByType.project).toBe(40)
        expect(result.data.memoriesByScope.personal).toBe(60)
        expect(result.data.averageImportance).toBe(0.65)
      }
    })
  })

  describe('Health and Lifecycle', () => {
    it('should perform health check', async () => {
      const isHealthy = await memoryService.healthCheck()
      expect(isHealthy).toBe(true)
      expect(mockVectorStore.healthCheck).toHaveBeenCalled()
    })

    it('should cleanup resources', async () => {
      await memoryService.cleanup()
      expect(mockVectorStore.cleanup).toHaveBeenCalled()
    })

    it('should handle uninitialized service', async () => {
      const uninitializedService = new MemoryDomainService()
      
      const result = await uninitializedService.storeMemory({
        content: 'test',
        type: 'conversation',
        metadata: {
          tags: [],
          source: 'test',
          importance: 0.5,
          accessCount: 0
        }
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_INITIALIZED')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle vector store errors gracefully', async () => {
      mockVectorStore.generateEmbedding = vi.fn(() => Promise.reject(new Error('Vector store error')))

      const input: CreateMemoryInput = {
        content: 'Test content',
        type: 'conversation',
        metadata: {
          tags: [],
          source: 'test',
          importance: 0.5,
          accessCount: 0
        }
      }

      const result = await memoryService.storeMemory(input)

      expect(result.success).toBe(false)
    })

    it('should handle repository errors gracefully', async () => {
      mockRepository.save = vi.fn(() => Promise.reject(new Error('Repository error')))

      const input: CreateMemoryInput = {
        content: 'Test content',
        type: 'conversation',
        metadata: {
          tags: [],
          source: 'test',
          importance: 0.5,
          accessCount: 0
        }
      }

      const result = await memoryService.storeMemory(input)

      expect(result.success).toBe(false)
    })
  })
})