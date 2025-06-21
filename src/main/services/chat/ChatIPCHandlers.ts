/**
 * Chat IPC Handlers
 * 
 * Handles IPC communication between renderer and main process for chat functionality,
 * including message persistence, thread management, and conversation history.
 */

import { ipcMain } from 'electron'
import { z } from 'zod'
import { ChatHistoryService, type IChatHistoryService } from './ChatHistoryService'

// =============================================================================
// Validation Schemas
// =============================================================================

const ChatMessageSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  sender: z.enum(['user', 'agent']),
  agentId: z.string().optional(),
  timestamp: z.union([z.date(), z.string().transform(s => new Date(s))]),
  threadId: z.string().optional(),
  status: z.enum(['sending', 'delivered', 'error']),
  metadata: z.record(z.unknown()).optional()
})

const SendChatMessageSchema = z.object({
  content: z.string().min(1),
  targetAgent: z.string().optional(),
  threadId: z.string().optional(),
  context: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
})

const ChatThreadSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  participants: z.array(z.string()),
  createdAt: z.union([z.date(), z.string().transform(s => new Date(s))]),
  lastActivity: z.union([z.date(), z.string().transform(s => new Date(s))]),
  isArchived: z.boolean()
})

const ChatHistoryDataSchema = z.object({
  messages: z.array(ChatMessageSchema).optional(),
  threads: z.array(ChatThreadSchema).optional(),
  conversationContext: z.array(z.string()).optional()
})

const ChatHistoryQuerySchema = z.object({
  threadId: z.string().optional(),
  agentId: z.string().optional(),
  sender: z.enum(['user', 'agent']).optional(),
  startDate: z.union([z.date(), z.string().transform(s => new Date(s))]).optional(),
  endDate: z.union([z.date(), z.string().transform(s => new Date(s))]).optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  searchTerm: z.string().optional()
})

const SearchQuerySchema = z.object({
  query: z.string().min(1),
  options: ChatHistoryQuerySchema.optional()
})

// =============================================================================
// IPC Handler Implementation
// =============================================================================

export class ChatIPCHandlers {
  private chatHistoryService: IChatHistoryService
  private isInitialized = false

  constructor() {
    this.chatHistoryService = new ChatHistoryService()
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize chat history service (ChatHistoryService extends base class with initialize method)
      if ('initialize' in this.chatHistoryService) {
        const initResult = await (this.chatHistoryService as any).initialize()
        if (!initResult.success) {
          throw new Error(`Failed to initialize chat history service: ${initResult.error.message}`)
        }
      }

      // Register IPC handlers
      this.registerHandlers()
      
      this.isInitialized = true
      console.log('Chat IPC handlers initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Chat IPC handlers:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    try {
      // Unregister IPC handlers
      this.unregisterHandlers()
      
      this.isInitialized = false
      console.log('Chat IPC handlers cleanup completed')
    } catch (error) {
      console.error('Error during Chat IPC handlers cleanup:', error)
      throw error
    }
  }

  // =============================================================================
  // IPC Handler Registration
  // =============================================================================

  private registerHandlers(): void {
    // Chat History Operations
    ipcMain.handle('chat:save-history', this.handleSaveChatHistory.bind(this))
    ipcMain.handle('chat:load-history', this.handleLoadChatHistory.bind(this))
    
    // Message Operations
    ipcMain.handle('chat:save-messages', this.handleSaveMessages.bind(this))
    ipcMain.handle('chat:load-messages', this.handleLoadMessages.bind(this))
    ipcMain.handle('chat:search-messages', this.handleSearchMessages.bind(this))
    ipcMain.handle('chat:delete-message', this.handleDeleteMessage.bind(this))
    
    // Thread Operations
    ipcMain.handle('chat:save-threads', this.handleSaveThreads.bind(this))
    ipcMain.handle('chat:load-threads', this.handleLoadThreads.bind(this))
    ipcMain.handle('chat:delete-thread', this.handleDeleteThread.bind(this))
    
    // Context Operations
    ipcMain.handle('chat:save-context', this.handleSaveConversationContext.bind(this))
    ipcMain.handle('chat:load-context', this.handleLoadConversationContext.bind(this))
    
    // Cleanup Operations
    ipcMain.handle('chat:cleanup', this.handleCleanup.bind(this))
    
    // Legacy support for existing chat store
    ipcMain.handle('chat:message', this.handleChatMessage.bind(this))
  }

  private unregisterHandlers(): void {
    const handlers = [
      'chat:save-history',
      'chat:load-history',
      'chat:save-messages',
      'chat:load-messages',
      'chat:search-messages',
      'chat:delete-message',
      'chat:save-threads',
      'chat:load-threads',
      'chat:delete-thread',
      'chat:save-context',
      'chat:load-context',
      'chat:cleanup',
      'chat:message'
    ]

    handlers.forEach(handler => {
      ipcMain.removeHandler(handler)
    })
  }

  // =============================================================================
  // Chat History Handlers
  // =============================================================================

  private async handleSaveChatHistory(_event: any, data: unknown): Promise<any> {
    try {
      const validatedData = ChatHistoryDataSchema.parse(data)
      const result = await this.chatHistoryService.saveChatHistory(validatedData)
      
      if (result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (error) {
      console.error('Error saving chat history:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async handleLoadChatHistory(_event: any): Promise<any> {
    try {
      const result = await this.chatHistoryService.loadChatHistory()
      
      if (result.success) {
        return result.data
      } else {
        console.error('Failed to load chat history:', result.error.message)
        return null
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
      return null
    }
  }

  // =============================================================================
  // Message Handlers
  // =============================================================================

  private async handleSaveMessages(_event: any, messages: unknown): Promise<any> {
    try {
      const validatedMessages = z.array(ChatMessageSchema).parse(messages)
      const result = await this.chatHistoryService.saveMessages(validatedMessages)
      
      if (result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (error) {
      console.error('Error saving messages:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async handleLoadMessages(_event: any, query?: unknown): Promise<any> {
    try {
      const validatedQuery = query ? ChatHistoryQuerySchema.parse(query) : undefined
      const result = await this.chatHistoryService.loadMessages(validatedQuery)
      
      if (result.success) {
        return result.data
      } else {
        console.error('Failed to load messages:', result.error.message)
        return { messages: [], totalCount: 0, hasMore: false }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      return { messages: [], totalCount: 0, hasMore: false }
    }
  }

  private async handleSearchMessages(_event: any, searchData: unknown): Promise<any> {
    try {
      const { query, options } = SearchQuerySchema.parse(searchData)
      const result = await this.chatHistoryService.searchMessages(query, options)
      
      if (result.success) {
        return result.data
      } else {
        console.error('Failed to search messages:', result.error.message)
        return { messages: [], totalCount: 0, hasMore: false }
      }
    } catch (error) {
      console.error('Error searching messages:', error)
      return { messages: [], totalCount: 0, hasMore: false }
    }
  }

  private async handleDeleteMessage(_event: any, messageId: unknown): Promise<any> {
    try {
      const validatedId = z.string().parse(messageId)
      const result = await this.chatHistoryService.deleteMessage(validatedId)
      
      if (result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // =============================================================================
  // Thread Handlers
  // =============================================================================

  private async handleSaveThreads(_event: any, threads: unknown): Promise<any> {
    try {
      const validatedThreads = z.array(ChatThreadSchema).parse(threads)
      const result = await this.chatHistoryService.saveThreads(validatedThreads)
      
      if (result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (error) {
      console.error('Error saving threads:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async handleLoadThreads(_event: any, includeArchived?: unknown): Promise<any> {
    try {
      const includeArchivedBool = includeArchived ? z.boolean().parse(includeArchived) : false
      const result = await this.chatHistoryService.loadThreads(includeArchivedBool)
      
      if (result.success) {
        return result.data
      } else {
        console.error('Failed to load threads:', result.error.message)
        return []
      }
    } catch (error) {
      console.error('Error loading threads:', error)
      return []
    }
  }

  private async handleDeleteThread(_event: any, threadId: unknown): Promise<any> {
    try {
      const validatedId = z.string().parse(threadId)
      const result = await this.chatHistoryService.deleteThread(validatedId)
      
      if (result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (error) {
      console.error('Error deleting thread:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // =============================================================================
  // Context Handlers
  // =============================================================================

  private async handleSaveConversationContext(_event: any, context: unknown): Promise<any> {
    try {
      const validatedContext = z.array(z.string()).parse(context)
      const result = await this.chatHistoryService.saveConversationContext(validatedContext)
      
      if (result.success) {
        return { success: true }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (error) {
      console.error('Error saving conversation context:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  private async handleLoadConversationContext(_event: any): Promise<any> {
    try {
      const result = await this.chatHistoryService.loadConversationContext()
      
      if (result.success) {
        return result.data
      } else {
        console.error('Failed to load conversation context:', result.error.message)
        return []
      }
    } catch (error) {
      console.error('Error loading conversation context:', error)
      return []
    }
  }

  // =============================================================================
  // Cleanup Handlers
  // =============================================================================

  private async handleCleanup(_event: any, olderThan: unknown): Promise<any> {
    try {
      const date = z.union([z.date(), z.string().transform(s => new Date(s))]).parse(olderThan)
      const result = await this.chatHistoryService.cleanup(date)
      
      if (result.success) {
        return result.data
      } else {
        return { deletedCount: 0, error: result.error.message }
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
      return { 
        deletedCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // =============================================================================
  // Legacy Chat Message Handler
  // =============================================================================

  private async handleChatMessage(_event: any, data: unknown): Promise<any> {
    try {
      // Validate the incoming chat message
      const validatedInput = SendChatMessageSchema.parse(data)
      
      console.log('Received chat message:', {
        content: validatedInput.content,
        targetAgent: validatedInput.targetAgent,
        threadId: validatedInput.threadId,
        hasContext: validatedInput.context ? validatedInput.context.length : 0
      })
      
      // Create user message for history
      const userMessage = {
        id: crypto.randomUUID(),
        content: validatedInput.content,
        sender: 'user' as const,
        timestamp: new Date(),
        threadId: validatedInput.threadId,
        status: 'delivered' as const,
        metadata: {
          ...validatedInput.metadata,
          targetAgent: validatedInput.targetAgent,
          userInitiated: true
        }
      }
      
      // Save user message to history
      await this.chatHistoryService.saveMessages([userMessage])
      
      // Agent targeting logic will be implemented when agent system is ready
      // For now, return acknowledgment with targeting information
      const response = {
        success: true,
        messageId: userMessage.id,
        agentResponse: validatedInput.targetAgent ? {
          agentId: validatedInput.targetAgent,
          content: `Message received for ${validatedInput.targetAgent}. Agent system integration coming soon.`,
          contextId: crypto.randomUUID()
        } : null
      }
      
      // Save agent response if generated
      if (response.agentResponse) {
        const agentMessage = {
          id: crypto.randomUUID(),
          content: response.agentResponse.content,
          sender: 'agent' as const,
          agentId: response.agentResponse.agentId,
          timestamp: new Date(),
          threadId: validatedInput.threadId,
          status: 'delivered' as const,
          metadata: {
            agentResponse: true,
            contextId: response.agentResponse.contextId,
            targetedResponse: true
          }
        }
        
        await this.chatHistoryService.saveMessages([agentMessage])
      }
      
      return response
      
    } catch (error) {
      console.error('Error processing chat message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // =============================================================================
  // Service Access
  // =============================================================================

  getChatHistoryService(): IChatHistoryService {
    return this.chatHistoryService
  }
}