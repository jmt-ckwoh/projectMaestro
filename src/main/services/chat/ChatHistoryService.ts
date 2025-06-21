/**
 * Chat History Service
 * 
 * Handles persistent storage and retrieval of chat messages, threads, and conversation context.
 * Implements both file-based JSON storage and database integration for scalable message history.
 */

import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import { DomainError, Err, GenericDomainError, Ok, Result } from '@/shared/contracts/common'

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'agent'
  agentId?: string
  timestamp: Date
  threadId?: string
  status: 'sending' | 'delivered' | 'error'
  metadata?: {
    userInitiated?: boolean
    agentResponse?: boolean
    contextId?: string
    [key: string]: unknown
  }
}

export interface ChatThread {
  id: string
  name: string
  description?: string
  participants: string[]
  createdAt: Date
  lastActivity: Date
  isArchived: boolean
}

export interface ChatHistoryData {
  messages: ChatMessage[]
  threads: ChatThread[]
  conversationContext: string[]
  lastSaved: Date
  version: string
}

export interface ChatHistoryQuery {
  threadId?: string
  agentId?: string
  sender?: 'user' | 'agent'
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
  searchTerm?: string
}

export interface ChatHistorySearchResult {
  messages: ChatMessage[]
  totalCount: number
  hasMore: boolean
}

export interface IChatHistoryService {
  saveMessages(messages: ChatMessage[]): Promise<Result<void, DomainError>>
  loadMessages(query?: ChatHistoryQuery): Promise<Result<ChatHistorySearchResult, DomainError>>
  saveThreads(threads: ChatThread[]): Promise<Result<void, DomainError>>
  loadThreads(includeArchived?: boolean): Promise<Result<ChatThread[], DomainError>>
  saveConversationContext(context: string[]): Promise<Result<void, DomainError>>
  loadConversationContext(): Promise<Result<string[], DomainError>>
  saveChatHistory(data: Partial<ChatHistoryData>): Promise<Result<void, DomainError>>
  loadChatHistory(): Promise<Result<ChatHistoryData, DomainError>>
  searchMessages(query: string, options?: ChatHistoryQuery): Promise<Result<ChatHistorySearchResult, DomainError>>
  deleteMessage(messageId: string): Promise<Result<void, DomainError>>
  deleteThread(threadId: string): Promise<Result<void, DomainError>>
  cleanup(olderThan: Date): Promise<Result<{ deletedCount: number }, DomainError>>
}

// =============================================================================
// ChatHistoryService Implementation
// =============================================================================

export class ChatHistoryService implements IChatHistoryService {
  private readonly dataPath: string
  private readonly maxMessagesInMemory = 1000
  private readonly maxContextMessages = 100
  private chatHistory: ChatHistoryData | null = null
  private isInitialized = false

  constructor() {
    const userDataPath = app.getPath('userData')
    this.dataPath = join(userDataPath, 'chat-history')
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<Result<void, DomainError>> {
    try {
      // Ensure data directory exists
      await mkdir(this.dataPath, { recursive: true })
      
      // Load existing chat history
      const loadResult = await this.loadChatHistory()
      if (loadResult.success) {
        this.chatHistory = loadResult.data
      } else {
        // Initialize with empty history if loading fails
        this.chatHistory = this.createEmptyHistory()
      }
      
      this.isInitialized = true
      return Ok(undefined)
    } catch (error) {
      return Err(new GenericDomainError(
        'CHAT_HISTORY_INIT_FAILED',
        'chat',
        'Failed to initialize chat history service',
        error as Error
      ))
    }
  }

  // =============================================================================
  // Message Management
  // =============================================================================

  async saveMessages(messages: ChatMessage[]): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      if (!this.chatHistory) {
        this.chatHistory = this.createEmptyHistory()
      }

      // Add new messages, avoiding duplicates
      const existingIds = new Set(this.chatHistory.messages.map(m => m.id))
      const newMessages = messages.filter(m => !existingIds.has(m.id))
      
      this.chatHistory.messages.push(...newMessages)
      
      // Sort by timestamp
      this.chatHistory.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // Trim if too many messages (keep most recent)
      if (this.chatHistory.messages.length > this.maxMessagesInMemory) {
        this.chatHistory.messages = this.chatHistory.messages.slice(-this.maxMessagesInMemory)
      }
      
      // Save to disk
      return await this.persistToDisk()
    } catch (error) {
      return Err(new GenericDomainError(
        'SAVE_MESSAGES_FAILED',
        'chat',
        'Failed to save chat messages',
        error as Error
      ))
    }
  }

  async loadMessages(query?: ChatHistoryQuery): Promise<Result<ChatHistorySearchResult, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      let messages = this.chatHistory?.messages || []
      
      // Apply filters
      if (query) {
        if (query.threadId) {
          messages = messages.filter(m => m.threadId === query.threadId)
        }
        if (query.agentId) {
          messages = messages.filter(m => m.agentId === query.agentId)
        }
        if (query.sender) {
          messages = messages.filter(m => m.sender === query.sender)
        }
        if (query.startDate) {
          messages = messages.filter(m => new Date(m.timestamp) >= query.startDate!)
        }
        if (query.endDate) {
          messages = messages.filter(m => new Date(m.timestamp) <= query.endDate!)
        }
        if (query.searchTerm) {
          const searchLower = query.searchTerm.toLowerCase()
          messages = messages.filter(m => 
            m.content.toLowerCase().includes(searchLower)
          )
        }
      }

      const totalCount = messages.length
      
      // Apply pagination
      const offset = query?.offset || 0
      const limit = query?.limit || 100
      const paginatedMessages = messages.slice(offset, offset + limit)
      const hasMore = offset + limit < totalCount

      return Ok({
        messages: paginatedMessages,
        totalCount,
        hasMore
      })
    } catch (error) {
      return Err(new GenericDomainError(
        'LOAD_MESSAGES_FAILED',
        'chat',
        'Failed to load chat messages',
        error as Error
      ))
    }
  }

  // =============================================================================
  // Thread Management
  // =============================================================================

  async saveThreads(threads: ChatThread[]): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      if (!this.chatHistory) {
        this.chatHistory = this.createEmptyHistory()
      }

      // Update existing threads and add new ones
      const existingThreadsMap = new Map(this.chatHistory.threads.map(t => [t.id, t]))
      
      for (const thread of threads) {
        existingThreadsMap.set(thread.id, thread)
      }
      
      this.chatHistory.threads = Array.from(existingThreadsMap.values())
      
      return await this.persistToDisk()
    } catch (error) {
      return Err(new GenericDomainError(
        'SAVE_THREADS_FAILED',
        'chat',
        'Failed to save chat threads',
        error as Error
      ))
    }
  }

  async loadThreads(includeArchived = false): Promise<Result<ChatThread[], DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      let threads = this.chatHistory?.threads || []
      
      if (!includeArchived) {
        threads = threads.filter(t => !t.isArchived)
      }
      
      // Sort by last activity (most recent first)
      threads.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      
      return Ok(threads)
    } catch (error) {
      return Err(new GenericDomainError(
        'LOAD_THREADS_FAILED',
        'chat',
        'Failed to load chat threads',
        error as Error
      ))
    }
  }

  // =============================================================================
  // Conversation Context Management
  // =============================================================================

  async saveConversationContext(context: string[]): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      if (!this.chatHistory) {
        this.chatHistory = this.createEmptyHistory()
      }

      // Keep only the most recent context messages
      this.chatHistory.conversationContext = context.slice(-this.maxContextMessages)
      
      return await this.persistToDisk()
    } catch (error) {
      return Err(new GenericDomainError(
        'SAVE_CONTEXT_FAILED',
        'chat',
        'Failed to save conversation context',
        error as Error
      ))
    }
  }

  async loadConversationContext(): Promise<Result<string[], DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      return Ok(this.chatHistory?.conversationContext || [])
    } catch (error) {
      return Err(new GenericDomainError(
        'LOAD_CONTEXT_FAILED',
        'chat',
        'Failed to load conversation context',
        error as Error
      ))
    }
  }

  // =============================================================================
  // Bulk Operations
  // =============================================================================

  async saveChatHistory(data: Partial<ChatHistoryData>): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      if (!this.chatHistory) {
        this.chatHistory = this.createEmptyHistory()
      }

      // Update with provided data
      if (data.messages) {
        await this.saveMessages(data.messages)
      }
      if (data.threads) {
        await this.saveThreads(data.threads)
      }
      if (data.conversationContext) {
        await this.saveConversationContext(data.conversationContext)
      }

      return Ok(undefined)
    } catch (error) {
      return Err(new GenericDomainError(
        'SAVE_CHAT_HISTORY_FAILED',
        'chat',
        'Failed to save chat history',
        error as Error
      ))
    }
  }

  async loadChatHistory(): Promise<Result<ChatHistoryData, DomainError>> {
    try {
      const filePath = join(this.dataPath, 'chat-history.json')
      
      try {
        await stat(filePath)
      } catch {
        // File doesn't exist, return empty history
        return Ok(this.createEmptyHistory())
      }

      const fileContent = await readFile(filePath, 'utf-8')
      const data = JSON.parse(fileContent) as ChatHistoryData
      
      // Convert date strings back to Date objects
      data.messages = data.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
      data.threads = data.threads.map(t => ({
        ...t,
        createdAt: new Date(t.createdAt),
        lastActivity: new Date(t.lastActivity)
      }))
      data.lastSaved = new Date(data.lastSaved)

      return Ok(data)
    } catch (error) {
      return Err(new GenericDomainError(
        'LOAD_CHAT_HISTORY_FAILED',
        'chat',
        'Failed to load chat history',
        error as Error
      ))
    }
  }

  // =============================================================================
  // Search Operations
  // =============================================================================

  async searchMessages(query: string, options?: ChatHistoryQuery): Promise<Result<ChatHistorySearchResult, DomainError>> {
    const searchQuery: ChatHistoryQuery = {
      ...options,
      searchTerm: query
    }
    
    return await this.loadMessages(searchQuery)
  }

  // =============================================================================
  // Cleanup Operations
  // =============================================================================

  async deleteMessage(messageId: string): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      if (!this.chatHistory) {
        return Ok(undefined)
      }

      const initialLength = this.chatHistory.messages.length
      this.chatHistory.messages = this.chatHistory.messages.filter(m => m.id !== messageId)
      
      if (this.chatHistory.messages.length < initialLength) {
        await this.persistToDisk()
      }

      return Ok(undefined)
    } catch (error) {
      return Err(new GenericDomainError(
        'DELETE_MESSAGE_FAILED',
        'chat',
        'Failed to delete message',
        error as Error
      ))
    }
  }

  async deleteThread(threadId: string): Promise<Result<void, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      if (!this.chatHistory) {
        return Ok(undefined)
      }

      // Delete thread
      this.chatHistory.threads = this.chatHistory.threads.filter(t => t.id !== threadId)
      
      // Delete messages in thread
      this.chatHistory.messages = this.chatHistory.messages.filter(m => m.threadId !== threadId)
      
      await this.persistToDisk()
      return Ok(undefined)
    } catch (error) {
      return Err(new GenericDomainError(
        'DELETE_THREAD_FAILED',
        'chat',
        'Failed to delete thread',
        error as Error
      ))
    }
  }

  async cleanup(olderThan: Date): Promise<Result<{ deletedCount: number }, DomainError>> {
    if (!this.isInitialized) {
      return Err(new GenericDomainError('SERVICE_NOT_INITIALIZED', 'chat', 'Chat history service not initialized'))
    }

    try {
      if (!this.chatHistory) {
        return Ok({ deletedCount: 0 })
      }

      const initialCount = this.chatHistory.messages.length
      this.chatHistory.messages = this.chatHistory.messages.filter(m => 
        new Date(m.timestamp) >= olderThan
      )
      
      const deletedCount = initialCount - this.chatHistory.messages.length
      
      if (deletedCount > 0) {
        await this.persistToDisk()
      }

      return Ok({ deletedCount })
    } catch (error) {
      return Err(new GenericDomainError(
        'CLEANUP_FAILED',
        'chat',
        'Failed to cleanup old messages',
        error as Error
      ))
    }
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private createEmptyHistory(): ChatHistoryData {
    return {
      messages: [],
      threads: [],
      conversationContext: [],
      lastSaved: new Date(),
      version: '1.0.0'
    }
  }

  private async persistToDisk(): Promise<Result<void, DomainError>> {
    try {
      if (!this.chatHistory) {
        return Ok(undefined)
      }

      this.chatHistory.lastSaved = new Date()
      
      const filePath = join(this.dataPath, 'chat-history.json')
      await writeFile(filePath, JSON.stringify(this.chatHistory, null, 2))
      
      return Ok(undefined)
    } catch (error) {
      return Err(new GenericDomainError(
        'PERSIST_FAILED',
        'chat',
        'Failed to persist chat history to disk',
        error as Error
      ))
    }
  }
}