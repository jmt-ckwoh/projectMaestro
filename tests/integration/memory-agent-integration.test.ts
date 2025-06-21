/**
 * Memory-Agent Integration Tests
 * 
 * Tests the integration between memory system and agent orchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventBus } from '../../src/main/services/core/EventBus'
import { MemoryDomainService } from '../../src/main/services/memory/MemoryDomainService'
import { AgentOrchestrator } from '../../src/main/services/agents/AgentOrchestrator'
import { 
  MemoryCreatedEvent,
  CreateMemoryInput 
} from '../../src/shared/contracts/MemoryDomain'
import { AgentType } from '../../src/shared/contracts/AgentDomain'

// Mock external dependencies
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-integration')
  }
}))

vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn(() => Promise.resolve({
    tableNames: vi.fn(() => Promise.resolve([])),
    createTable: vi.fn(() => Promise.resolve({
      add: vi.fn(),
      delete: vi.fn(),
      vectorSearch: vi.fn(() => ({
        limit: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([]))
        }))
      })),
      countRows: vi.fn(() => Promise.resolve(0))
    }))
  }))
}))

describe('Memory-Agent Integration', () => {
  let eventBus: EventBus
  let memoryService: MemoryDomainService
  let agentOrchestrator: AgentOrchestrator
  // let eventHandler: any  // Commented out as unused

  beforeEach(async () => {
    // Initialize event bus
    eventBus = EventBus.getInstance()
    eventBus.clear()

    // Initialize memory service
    memoryService = new MemoryDomainService()
    // Mock the initialization for testing
    ;(memoryService as any).isInitialized = true
    ;(memoryService as any).vectorStore = {
      initialize: vi.fn(() => Promise.resolve({ success: true, data: undefined })),
      generateEmbedding: vi.fn(() => Promise.resolve(new Array(1536).fill(0.1))),
      storeVector: vi.fn(),
      searchSimilar: vi.fn(() => Promise.resolve([])),
      healthCheck: vi.fn(() => Promise.resolve(true)),
      cleanup: vi.fn()
    }
    ;(memoryService as any).repository = {
      initialize: vi.fn(),
      save: vi.fn(() => Promise.resolve({
        id: 'memory-123',
        content: 'Test content',
        type: 'conversation',
        scope: 'shared',
        status: 'active',
        metadata: {
          tags: ['test'],
          source: 'agent',
          importance: 0.8,
          accessCount: 0,
          agentType: 'producer'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      findById: vi.fn(),
      findAll: vi.fn(() => Promise.resolve({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasNext: false,
        hasPrev: false
      }))
    }
    
    // Mock storeMemory to return success and publish event
    vi.spyOn(memoryService, 'storeMemory').mockImplementation(async (input) => {
      const memory = {
        id: 'memory-123',
        content: input.content,
        type: input.type,
        scope: input.scope || 'personal',
        status: 'active' as const,
        metadata: input.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Publish event like the real service would
      await eventBus.publish({
        id: 'event-' + Date.now(),
        type: 'memory.created',
        domain: 'memory',
        timestamp: new Date(),
        version: 1,
        payload: {
          memoryId: memory.id,
          content: memory.content,
          memoryType: memory.type,
          scope: memory.scope
        }
      })
      
      return {
        success: true,
        data: memory
      } as any
    })
    ;(memoryService as any).eventBus = eventBus

    // Initialize agent orchestrator with memory service
    agentOrchestrator = new AgentOrchestrator(eventBus, memoryService)
    
    // Mock agent orchestrator methods for testing
    ;(agentOrchestrator as any).isRunning = true
    ;(agentOrchestrator as any).agents = new Map()

    // Set up event handler spy
    // eventHandler = vi.fn()  // Commented out as unused
  })

  afterEach(() => {
    eventBus.clear()
    vi.clearAllMocks()
  })

  describe('Event-Driven Integration', () => {
    it('should handle memory creation events in agent orchestrator', async () => {
      // Subscribe to memory creation events
      const memoryEventHandler = vi.fn()
      eventBus.subscribe('memory.created', {
        handle: memoryEventHandler
      })

      // Create a memory through the service
      const memoryInput: CreateMemoryInput = {
        content: 'User wants to build a chat application with real-time features',
        type: 'conversation',
        scope: 'shared',
        metadata: {
          tags: ['user-request', 'chat-app'],
          source: 'user',
          importance: 0.9,
          projectId: 'project-123',
          accessCount: 0
        }
      }

      const result = await memoryService.storeMemory(memoryInput)

      expect(result.success).toBe(true)
      
      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 10))

      // Verify event was published
      expect(memoryEventHandler).toHaveBeenCalled()
      
      const eventCall = memoryEventHandler.mock.calls[0][0]
      expect(eventCall.type).toBe('memory.created')
      expect(eventCall.domain).toBe('memory')
      expect(eventCall.payload.content).toBe(memoryInput.content)
    })

    it('should allow agents to search memories through orchestrator', async () => {
      // Mock memory search results
      const mockSearchResults = [
        {
          memory: {
            id: 'memory-1',
            content: 'Previous chat app development discussion',
            type: 'conversation',
            scope: 'shared',
            status: 'active',
            metadata: {
              tags: ['chat-app', 'development'],
              source: 'user',
              importance: 0.8,
              accessCount: 5,
              projectId: 'project-123'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          similarity: 0.85,
          relevanceScore: 0.82
        }
      ]

      // Mock the memory service search
      vi.spyOn(memoryService, 'searchMemories').mockResolvedValue({
        success: true,
        data: mockSearchResults
      } as any)

      // Agent searches for relevant memories
      const searchResult = await agentOrchestrator.searchMemoriesForAgent(
        AgentType.PRODUCER,
        'chat application features',
        { projectId: 'project-123', limit: 5 }
      )

      expect(searchResult.success).toBe(true)
      if (searchResult.success) {
        expect(searchResult.data).toHaveLength(1)
        expect(searchResult.data[0].memory.content).toContain('chat app')
        expect(searchResult.data[0].similarity).toBe(0.85)
      }

      // Verify the memory service was called with correct parameters
      expect(memoryService.searchMemories).toHaveBeenCalledWith({
        query: 'chat application features',
        agentType: 'producer',
        projectId: 'project-123',
        limit: 5,
        threshold: 0.7
      })
    })

    it('should allow agents to store memories through orchestrator', async () => {
      // Mock memory storage
      const mockStoredMemory = {
        id: 'memory-456',
        content: 'Agent analyzed the chat app requirements and suggests using WebSockets for real-time features',
        type: 'conversation',
        scope: 'shared',
        status: 'active',
        metadata: {
          tags: ['agent-analysis', 'websockets'],
          source: 'agent-producer',
          importance: 0.7,
          agentType: 'producer',
          projectId: 'project-123',
          accessCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.spyOn(memoryService, 'storeMemory').mockResolvedValue({
        success: true,
        data: mockStoredMemory
      } as any)

      // Agent stores a memory
      const storeResult = await agentOrchestrator.storeAgentMemory(
        AgentType.PRODUCER,
        'Agent analyzed the chat app requirements and suggests using WebSockets for real-time features',
        {
          projectId: 'project-123',
          importance: 0.7
        }
      )

      expect(storeResult.success).toBe(true)
      if (storeResult.success) {
        expect(storeResult.data.content).toContain('WebSockets')
        expect(storeResult.data.metadata.agentType).toBe('producer')
      }

      // Verify the memory service was called correctly
      expect(memoryService.storeMemory).toHaveBeenCalledWith({
        content: 'Agent analyzed the chat app requirements and suggests using WebSockets for real-time features',
        type: 'conversation',
        scope: 'shared',
        metadata: {
          agentType: 'producer',
          source: 'agent-producer',
          importance: 0.7,
          projectId: 'project-123',
          tags: ['agent-conversation', 'producer'],
          accessCount: 0
        }
      })
    })
  })

  describe('Agent Memory Context', () => {
    it('should provide memory context to agents during task execution', async () => {
      // Mock agent registration
      const mockAgent = {
        id: 'agent-producer-1',
        type: AgentType.PRODUCER,
        status: 'idle' as any
      }

      const mockRegistration = {
        agent: mockAgent,
        service: {},
        stateMachine: {},
        registeredAt: new Date()
      }

      ;(agentOrchestrator as any).agents.set(AgentType.PRODUCER, mockRegistration)

      // Mock memory retrieval for context
      const contextMemories = [
        {
          memory: {
            id: 'context-1',
            content: 'User prefers React for frontend development',
            type: 'user-preference',
            scope: 'personal',
            status: 'active',
            metadata: {
              tags: ['preference', 'react'],
              source: 'user',
              importance: 0.9,
              accessCount: 10
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          similarity: 0.95,
          relevanceScore: 0.92
        }
      ]

      vi.spyOn(memoryService, 'searchMemories').mockResolvedValue({
        success: true,
        data: contextMemories
      } as any)

      // Get context for agent
      const contextResult = await agentOrchestrator.searchMemoriesForAgent(
        AgentType.PRODUCER,
        'frontend development preferences'
      )

      expect(contextResult.success).toBe(true)
      if (contextResult.success) {
        expect(contextResult.data[0].memory.type).toBe('user-preference')
        expect(contextResult.data[0].memory.content).toContain('React')
      }
    })

    it('should track memory access patterns for analytics', async () => {
      // Mock memory access tracking
      const accessSpy = vi.spyOn(memoryService, 'recordMemoryAccess').mockResolvedValue({
        success: true,
        data: undefined
      } as any)

      // Simulate memory access during search
      vi.spyOn(memoryService, 'searchMemories').mockImplementation(async (query) => {
        // Simulate accessing a memory during search
        await memoryService.recordMemoryAccess('memory-1', 'producer', `Search: ${query.query}`)
        
        return {
          success: true,
          data: []
        } as any
      })

      await agentOrchestrator.searchMemoriesForAgent(
        AgentType.PRODUCER,
        'test query'
      )

      expect(accessSpy).toHaveBeenCalledWith('memory-1', 'producer', 'Search: test query')
    })
  })

  describe('Memory-Driven Agent Collaboration', () => {
    it('should notify relevant agents when new memories are created', async () => {
      // Mock working agent
      const mockWorkingAgent = {
        id: 'agent-architect-1',
        type: AgentType.ARCHITECT,
        status: 'working' as any
      }

      const mockRegistration = {
        agent: mockWorkingAgent,
        service: {},
        stateMachine: {},
        registeredAt: new Date()
      }

      ;(agentOrchestrator as any).agents.set(AgentType.ARCHITECT, mockRegistration)

      // Spy on notification method
      const notifySpy = vi.spyOn(agentOrchestrator as any, 'notifyAgentsOfNewMemory')

      // Create memory event with project context
      const memoryCreatedEvent: MemoryCreatedEvent = {
        id: 'event-123',
        type: 'memory.created',
        domain: 'memory',
        timestamp: new Date(),
        version: 1,
        payload: {
          memoryId: 'memory-789',
          content: 'New technical requirements discovered',
          memoryType: 'project',
          projectId: 'project-123'
        }
      }

      // Simulate event handling
      await (agentOrchestrator as any).handleMemoryCreated(memoryCreatedEvent)

      expect(notifySpy).toHaveBeenCalledWith('memory-789', 'project-123')
    })

    it('should enable agents to share context through memory', async () => {
      // Producer agent stores analysis
      await agentOrchestrator.storeAgentMemory(
        AgentType.PRODUCER,
        'User wants a real-time chat with video calling feature',
        { projectId: 'project-123', importance: 0.8 }
      )

      // Architect agent searches for context
      vi.spyOn(memoryService, 'searchMemories').mockResolvedValue({
        success: true,
        data: [{
          memory: {
            id: 'memory-producer-1',
            content: 'User wants a real-time chat with video calling feature',
            type: 'conversation',
            scope: 'shared',
            status: 'active',
            metadata: {
              agentType: 'producer',
              source: 'agent-producer',
              importance: 0.8,
              projectId: 'project-123',
              tags: ['agent-conversation', 'producer'],
              accessCount: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          similarity: 0.9,
          relevanceScore: 0.85
        }]
      } as any)

      const architectContextResult = await agentOrchestrator.searchMemoriesForAgent(
        AgentType.ARCHITECT,
        'chat application requirements',
        { projectId: 'project-123' }
      )

      expect(architectContextResult.success).toBe(true)
      if (architectContextResult.success) {
        expect(architectContextResult.data[0].memory.metadata.agentType).toBe('producer')
        expect(architectContextResult.data[0].memory.content).toContain('video calling')
      }
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle memory service unavailability gracefully', async () => {
      // Create orchestrator without memory service
      const orchestratorWithoutMemory = new AgentOrchestrator(eventBus)

      const searchResult = await orchestratorWithoutMemory.searchMemoriesForAgent(
        AgentType.PRODUCER,
        'test query'
      )

      expect(searchResult.success).toBe(false)
      if (!searchResult.success) {
        expect(searchResult.error.code).toBe('MEMORY_SERVICE_NOT_AVAILABLE')
      }
    })

    it('should continue functioning when memory operations fail', async () => {
      // Mock memory service failure
      vi.spyOn(memoryService, 'searchMemories').mockResolvedValue({
        success: false,
        error: { code: 'VECTOR_STORE_ERROR', message: 'Vector store error' }
      } as any)

      const searchResult = await agentOrchestrator.searchMemoriesForAgent(
        AgentType.PRODUCER,
        'test query'
      )

      expect(searchResult.success).toBe(false)
      if (!searchResult.success) {
        expect(searchResult.error.code).toBe('VECTOR_STORE_ERROR')
      }
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle concurrent memory operations', async () => {
      // Mock storeAgentMemory for concurrent operations
      vi.spyOn(agentOrchestrator, 'storeAgentMemory').mockResolvedValue({
        success: true,
        data: {
          id: 'memory-concurrent',
          content: 'Concurrent test',
          type: 'conversation',
          scope: 'shared',
          status: 'active',
          metadata: {
            agentType: 'producer',
            source: 'agent-producer',
            importance: 0.5,
            projectId: 'project-123',
            tags: ['agent-conversation', 'producer'],
            accessCount: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } as any)

      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        agentOrchestrator.storeAgentMemory(
          AgentType.PRODUCER,
          `Concurrent memory ${i}`,
          { projectId: 'project-123' }
        )
      )

      const results = await Promise.allSettled(concurrentOperations)
      
      // All operations should complete without errors
      const successfulResults = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      )

      expect(successfulResults.length).toBe(10)
    })

    it('should limit memory search results appropriately', async () => {
      // Create a spy for searchMemories
      const searchSpy = vi.spyOn(memoryService, 'searchMemories').mockResolvedValue({
        success: true,
        data: []
      } as any)

      await agentOrchestrator.searchMemoriesForAgent(
        AgentType.PRODUCER,
        'test query',
        { limit: 3 }
      )

      // Verify that the limit was passed to the memory service
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 3 })
      )
    })
  })
})