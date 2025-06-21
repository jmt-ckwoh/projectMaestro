/**
 * Chat Store - Communication State Management
 * 
 * Manages chat messages, conversations, and agent communication.
 * Follows the store architecture rules defined in STORE_ARCHITECTURE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'

// =============================================================================
// Chat Types
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

export interface TypingIndicator {
  agentId: string
  isTyping: boolean
  startedAt: Date
}

export interface ChatState {
  // Messages
  messages: ChatMessage[]
  threads: ChatThread[]
  activeThread: string | null
  
  // UI State
  isTyping: boolean
  typingIndicators: TypingIndicator[]
  
  // Conversation Context
  conversationContext: string[]
  lastUserMessage: ChatMessage | null
  
  // History Management
  isLoadingHistory: boolean
  hasMoreHistory: boolean
  historyOffset: number
  totalMessageCount: number
}

// =============================================================================
// Chat Actions
// =============================================================================

export interface SendMessageInput {
  content: string
  targetAgent?: string
  threadId?: string
  metadata?: Record<string, unknown>
}

export interface ChatActions {
  // Message Management
  sendMessage: (input: SendMessageInput) => Promise<void>
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  deleteMessage: (id: string) => void
  
  // Thread Management
  createThread: (name: string, description?: string) => string
  setActiveThread: (threadId: string | null) => void
  archiveThread: (threadId: string) => void
  
  // Typing Indicators
  setTyping: (agentId: string, isTyping: boolean) => void
  clearAllTyping: () => void
  
  // Conversation Management
  clearHistory: () => void
  getRecentContext: (limit?: number) => ChatMessage[]
  
  // Persistence
  saveChatHistory: () => Promise<void>
  loadChatHistory: () => Promise<void>
  
  // Enhanced persistence operations
  loadMoreMessages: (limit?: number) => Promise<void>
  searchMessageHistory: (query: string) => Promise<ChatMessage[]>
  saveMessagesToHistory: (messages: ChatMessage[]) => Promise<void>
  loadThreadHistory: () => Promise<void>
  createNewThread: (name: string, description?: string) => Promise<string>
  archiveCurrentThread: () => Promise<void>
}

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_CHAT_STATE: ChatState = {
  messages: [],
  threads: [],
  activeThread: null,
  isTyping: false,
  typingIndicators: [],
  conversationContext: [],
  lastUserMessage: null,
  isLoadingHistory: false,
  hasMoreHistory: true,
  historyOffset: 0,
  totalMessageCount: 0
}

// =============================================================================
// Chat Store Implementation
// =============================================================================

export const useChatStore = create<ChatState & ChatActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...DEFAULT_CHAT_STATE,

      // =============================================================================
      // Message Management
      // =============================================================================

      sendMessage: async (input) => {
        const messageId = crypto.randomUUID()
        
        // Add user message immediately
        const userMessage: ChatMessage = {
          id: messageId,
          content: input.content,
          sender: 'user',
          timestamp: new Date(),
          threadId: input.threadId || get().activeThread || undefined,
          status: 'sending',
          metadata: {
            ...input.metadata,
            targetAgent: input.targetAgent,
            userInitiated: true
          }
        }

        set((state) => {
          state.messages.push(userMessage)
          state.lastUserMessage = userMessage
          state.conversationContext.push(input.content)
          
          // Keep context manageable
          if (state.conversationContext.length > 20) {
            state.conversationContext = state.conversationContext.slice(-15)
          }
        })

        try {
          // Send message through IPC
          const response = await window.api.sendChatMessage({
            content: input.content,
            targetAgent: input.targetAgent,
            threadId: input.threadId || get().activeThread || undefined,
            context: get().conversationContext.slice(-10) // Send recent context
          })

          // Update message status
          set((state) => {
            const message = state.messages.find(m => m.id === messageId)
            if (message) {
              message.status = 'delivered'
            }
          })

          // Add agent response if provided
          if (response.agentResponse) {
            const agentMessage: ChatMessage = {
              id: crypto.randomUUID(),
              content: response.agentResponse.content,
              sender: 'agent',
              agentId: response.agentResponse.agentId,
              timestamp: new Date(),
              threadId: input.threadId || get().activeThread || undefined,
              status: 'delivered',
              metadata: {
                agentResponse: true,
                contextId: response.agentResponse.contextId
              }
            }

            set((state) => {
              state.messages.push(agentMessage)
              state.conversationContext.push(response.agentResponse.content)
            })
          }

        } catch (error) {
          console.error('Failed to send message:', error)
          
          // Update message status to error
          set((state) => {
            const message = state.messages.find(m => m.id === messageId)
            if (message) {
              message.status = 'error'
            }
          })
          
          throw error
        }
      },

      addMessage: (messageData) => {
        set((state) => {
          const message: ChatMessage = {
            ...messageData,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            status: messageData.status || 'delivered'
          }
          state.messages.push(message)
          
          if (message.sender === 'user') {
            state.lastUserMessage = message
          }
        })
      },

      updateMessage: (id, updates) => {
        set((state) => {
          const message = state.messages.find(m => m.id === id)
          if (message) {
            Object.assign(message, updates)
          }
        })
      },

      deleteMessage: (id) => {
        set((state) => {
          const index = state.messages.findIndex(m => m.id === id)
          if (index > -1) {
            state.messages.splice(index, 1)
          }
        })
      },

      // =============================================================================
      // Thread Management
      // =============================================================================

      createThread: (name, description) => {
        const threadId = crypto.randomUUID()
        
        set((state) => {
          const thread: ChatThread = {
            id: threadId,
            name,
            description,
            participants: ['user'],
            createdAt: new Date(),
            lastActivity: new Date(),
            isArchived: false
          }
          state.threads.push(thread)
        })
        
        return threadId
      },

      setActiveThread: (threadId) => {
        set((state) => {
          state.activeThread = threadId
        })
      },

      archiveThread: (threadId) => {
        set((state) => {
          const thread = state.threads.find(t => t.id === threadId)
          if (thread) {
            thread.isArchived = true
          }
          
          if (state.activeThread === threadId) {
            state.activeThread = null
          }
        })
      },

      // =============================================================================
      // Typing Indicators
      // =============================================================================

      setTyping: (agentId, isTyping) => {
        set((state) => {
          const existing = state.typingIndicators.find(t => t.agentId === agentId)
          
          if (isTyping) {
            if (existing) {
              existing.isTyping = true
              existing.startedAt = new Date()
            } else {
              state.typingIndicators.push({
                agentId,
                isTyping: true,
                startedAt: new Date()
              })
            }
            state.isTyping = true
          } else {
            if (existing) {
              const index = state.typingIndicators.indexOf(existing)
              state.typingIndicators.splice(index, 1)
            }
            state.isTyping = state.typingIndicators.some(t => t.isTyping)
          }
        })

        // Auto-clear typing after 30 seconds
        if (isTyping) {
          setTimeout(() => {
            get().setTyping(agentId, false)
          }, 30000)
        }
      },

      clearAllTyping: () => {
        set((state) => {
          state.typingIndicators = []
          state.isTyping = false
        })
      },

      // =============================================================================
      // Conversation Management
      // =============================================================================

      clearHistory: () => {
        set((state) => {
          state.messages = []
          state.conversationContext = []
          state.lastUserMessage = null
          state.typingIndicators = []
          state.isTyping = false
        })
      },

      getRecentContext: (limit = 10) => {
        const messages = get().messages
        return messages.slice(-limit)
      },

      // =============================================================================
      // Persistence
      // =============================================================================

      saveChatHistory: async () => {
        try {
          const state = get()
          await window.api.saveChatHistory({
            messages: state.messages,
            threads: state.threads,
            conversationContext: state.conversationContext
          })
        } catch (error) {
          console.error('Failed to save chat history:', error)
        }
      },

      loadChatHistory: async () => {
        try {
          const saved = await window.api.loadChatHistory()
          if (saved) {
            set((state) => {
              state.messages = saved.messages || []
              state.threads = saved.threads || []
              state.conversationContext = saved.conversationContext || []
              state.totalMessageCount = saved.messages?.length || 0
              state.historyOffset = saved.messages?.length || 0
              state.hasMoreHistory = false // All messages loaded from file initially
              
              // Find last user message
              state.lastUserMessage = saved.messages
                ?.filter((m: ChatMessage) => m.sender === 'user')
                ?.slice(-1)[0] || null
            })
          }
        } catch (error) {
          console.error('Failed to load chat history:', error)
        }
      },

      // =============================================================================
      // Enhanced Persistence Operations
      // =============================================================================

      loadMoreMessages: async (limit = 50) => {
        const state = get()
        if (state.isLoadingHistory || !state.hasMoreHistory) {
          return
        }

        set((state) => {
          state.isLoadingHistory = true
        })

        try {
          const result = await window.api.loadMessages({
            threadId: state.activeThread,
            limit,
            offset: state.historyOffset
          })

          set((state) => {
            // Prepend older messages
            const newMessages = result.messages.filter(msg => 
              !state.messages.some(existing => existing.id === msg.id)
            )
            state.messages = [...newMessages, ...state.messages]
            state.historyOffset = state.historyOffset + result.messages.length
            state.hasMoreHistory = result.hasMore
            state.totalMessageCount = result.totalCount
            state.isLoadingHistory = false
          })
        } catch (error) {
          console.error('Failed to load more messages:', error)
          set((state) => {
            state.isLoadingHistory = false
          })
        }
      },

      searchMessageHistory: async (query: string): Promise<ChatMessage[]> => {
        try {
          const result = await window.api.searchMessages(query, {
            threadId: get().activeThread,
            limit: 100
          })
          return result.messages || []
        } catch (error) {
          console.error('Failed to search message history:', error)
          return []
        }
      },

      saveMessagesToHistory: async (messages: ChatMessage[]) => {
        try {
          await window.api.saveMessages(messages)
        } catch (error) {
          console.error('Failed to save messages to history:', error)
        }
      },

      loadThreadHistory: async () => {
        try {
          const threads = await window.api.loadThreads(false)
          set((state) => {
            state.threads = threads || []
          })
        } catch (error) {
          console.error('Failed to load thread history:', error)
        }
      },

      createNewThread: async (name: string, description?: string): Promise<string> => {
        const threadId = crypto.randomUUID()
        const thread: ChatThread = {
          id: threadId,
          name,
          description,
          participants: ['user'],
          createdAt: new Date(),
          lastActivity: new Date(),
          isArchived: false
        }

        try {
          await window.api.saveThreads([thread])
          
          set((state) => {
            state.threads.push(thread)
            state.activeThread = threadId
            // Reset history state for new thread
            state.messages = []
            state.historyOffset = 0
            state.hasMoreHistory = false
            state.totalMessageCount = 0
          })

          return threadId
        } catch (error) {
          console.error('Failed to create new thread:', error)
          throw error
        }
      },

      archiveCurrentThread: async () => {
        const state = get()
        if (!state.activeThread) {
          return
        }

        try {
          const thread = state.threads.find(t => t.id === state.activeThread)
          if (thread) {
            const archivedThread = { ...thread, isArchived: true }
            await window.api.saveThreads([archivedThread])
            
            set((state) => {
              const index = state.threads.findIndex(t => t.id === state.activeThread)
              if (index > -1) {
                state.threads[index].isArchived = true
              }
              state.activeThread = null
            })
          }
        } catch (error) {
          console.error('Failed to archive thread:', error)
        }
      }
    }))
  )
)

// =============================================================================
// Chat Store Selectors
// =============================================================================

export const useMessages = () => useChatStore(state => state.messages)
export const useActiveThread = () => useChatStore(state => state.activeThread)
export const useTypingIndicators = () => useChatStore(state => state.typingIndicators)
export const useConversationContext = () => useChatStore(state => state.conversationContext)
export const useThreads = () => useChatStore(state => state.threads)
export const useIsLoadingHistory = () => useChatStore(state => state.isLoadingHistory)
export const useHasMoreHistory = () => useChatStore(state => state.hasMoreHistory)
export const useTotalMessageCount = () => useChatStore(state => state.totalMessageCount)

// =============================================================================
// Auto-save Chat History
// =============================================================================

// Auto-save messages when they change
useChatStore.subscribe(
  (state) => state.messages,
  (messages, previousMessages) => {
    // Only save if there are new messages
    if (messages.length > previousMessages.length) {
      // Debounce saves
      const timeoutId = setTimeout(() => {
        const newMessages = messages.slice(previousMessages.length)
        useChatStore.getState().saveMessagesToHistory(newMessages)
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }
)

// Auto-save threads when they change
useChatStore.subscribe(
  (state) => state.threads,
  (threads, previousThreads) => {
    if (threads.length !== previousThreads.length || 
        threads.some((t, i) => JSON.stringify(t) !== JSON.stringify(previousThreads[i]))) {
      const timeoutId = setTimeout(() => {
        window.api.saveThreads(threads).catch(error => 
          console.error('Failed to auto-save threads:', error)
        )
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }
)

// Load chat history and threads on initialization
if (typeof window !== 'undefined') {
  const store = useChatStore.getState()
  store.loadChatHistory()
  store.loadThreadHistory()
}