/**
 * Message List Component
 * 
 * Displays chat messages with multi-agent support and real-time updates
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/renderer/utils/cn'
import { ChatMessage, TypingIndicator as TypingIndicatorType, useChatStore, useHasMoreHistory, useIsLoadingHistory, useTotalMessageCount } from '@/renderer/stores/chatStore'
import { AgentType } from '@/shared/contracts/AgentDomain'
import { AgentAvatar, TypingIndicator } from './AgentAvatar'

// =============================================================================
// Component Props
// =============================================================================

export interface MessageListProps {
  messages: ChatMessage[]
  typingIndicators: TypingIndicatorType[]
  className?: string
  onMessageAction?: (messageId: string, action: 'edit' | 'delete' | 'reply') => void
}

export interface MessageItemProps {
  message: ChatMessage
  showAvatar?: boolean
  showTimestamp?: boolean
  onAction?: (action: 'edit' | 'delete' | 'reply') => void
}

// =============================================================================
// Message Item Component
// =============================================================================

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showAvatar = true,
  showTimestamp = true,
  onAction
}) => {
  const isUser = message.sender === 'user'
  const agentType = message.agentId as AgentType
  const targetAgent = message.metadata?.targetAgent as AgentType
  const isTargetedMessage = !!(targetAgent && isUser)

  const formatTimestamp = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  }, [])

  const getAgentName = useCallback((agentId?: string) => {
    if (!agentId) return 'AI Assistant'
    const agentType = agentId as AgentType
    const agentMap = {
      [AgentType.PRODUCER]: 'Producer',
      [AgentType.ARCHITECT]: 'Architect', 
      [AgentType.ENGINEER]: 'Engineer',
      [AgentType.QA]: 'QA Specialist'
    }
    return agentMap[agentType] || 'AI Assistant'
  }, [])

  return (
    <div
      className={cn(
        'flex gap-3 group',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 text-sm font-semibold">
              👤
            </div>
          ) : (
            <AgentAvatar 
              type={agentType}
              size="md"
              showStatus={false}
            />
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        'flex-1 max-w-[80%]',
        isUser ? 'text-right' : 'text-left'
      )}>
        {/* Message Header */}
        <div className={cn(
          'flex items-center gap-2 mb-1',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-sm font-medium text-gray-900">
            {isUser ? 'You' : getAgentName(message.agentId)}
          </span>
          {isTargetedMessage && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              <span>→</span>
              <span>{getAgentName(targetAgent)}</span>
            </span>
          )}
          {showTimestamp && (
            <span className="text-xs text-gray-500">
              {formatTimestamp(new Date(message.timestamp))}
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            'px-4 py-2 rounded-lg max-w-full relative',
            'transition-colors duration-200',
            isUser
              ? isTargetedMessage
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-8 border border-blue-400'
                : 'bg-blue-600 text-white ml-8'
              : 'bg-gray-100 text-gray-900 mr-8',
            'hover:shadow-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
          
          {/* Message Status */}
          {message.status && message.status !== 'delivered' && (
            <div className={cn(
              'text-xs mt-1 flex items-center gap-1',
              isUser ? 'text-blue-200' : 'text-gray-500'
            )}>
              {message.status === 'sending' && (
                <>
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              )}
              {message.status === 'error' && (
                <>
                  <span>❌</span>
                  Failed to send
                </>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {onAction && (
          <div className={cn(
            'flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isUser ? 'justify-end' : 'justify-start'
          )}>
            <button
              onClick={() => onAction('reply')}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Reply to message"
            >
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            {isUser && (
              <>
                <button
                  onClick={() => onAction('edit')}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Edit message"
                >
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onAction('delete')}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Delete message"
                >
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Empty State Component
// =============================================================================

const EmptyState: React.FC = () => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">🎭</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-3">
      Welcome to Project Maestro
    </h3>
    <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
      Start a conversation with your AI development team. 
      Describe your project idea or ask questions to get started!
    </p>
    <div className="mt-6 flex justify-center gap-4">
      <div className="text-center">
        <AgentAvatar type={AgentType.PRODUCER} size="sm" showName />
      </div>
      <div className="text-center">
        <AgentAvatar type={AgentType.ARCHITECT} size="sm" showName />
      </div>
      <div className="text-center">
        <AgentAvatar type={AgentType.ENGINEER} size="sm" showName />
      </div>
      <div className="text-center">
        <AgentAvatar type={AgentType.QA} size="sm" showName />
      </div>
    </div>
  </div>
)

// =============================================================================
// Message List Component
// =============================================================================

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  typingIndicators,
  className,
  onMessageAction
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  
  // Get history state and actions from store
  const isLoadingHistory = useIsLoadingHistory()
  const hasMoreHistory = useHasMoreHistory()
  const totalMessageCount = useTotalMessageCount()
  const loadMoreMessages = useChatStore(state => state.loadMoreMessages)
  
  // Handle infinite scroll for loading older messages
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const { scrollTop, scrollHeight, clientHeight } = container
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50
    const isAtTop = scrollTop < 50
    
    setIsUserAtBottom(isAtBottom)
    setShowScrollToBottom(!isAtBottom && messages.length > 5)
    
    // Load more messages when user scrolls near the top
    if (isAtTop && hasMoreHistory && !isLoadingHistory) {
      const currentScrollHeight = scrollHeight
      
      loadMoreMessages(20).then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            const scrollDiff = newScrollHeight - currentScrollHeight
            container.scrollTo(0, scrollTop + scrollDiff)
          }
        })
      }).catch(error => {
        console.error('Failed to load more messages:', error)
      })
    }
  }, [hasMoreHistory, isLoadingHistory, loadMoreMessages, messages.length])

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (isUserAtBottom) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        })
      }

      const timeoutId = setTimeout(scrollToBottom, 100)
      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [messages, typingIndicators, isUserAtBottom])

  // Scroll to bottom manually
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    })
  }, [])

  const handleMessageAction = useCallback((messageId: string, action: 'edit' | 'delete' | 'reply') => {
    onMessageAction?.(messageId, action)
  }, [onMessageAction])

  if (messages.length === 0 && typingIndicators.length === 0) {
    return (
      <div className={cn('flex-1 overflow-hidden', className)}>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className={cn('flex-1 overflow-hidden relative', className)}>
      <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
        onScroll={handleScroll}
      >
        {/* Loading indicator for older messages */}
        {(isLoadingHistory || hasMoreHistory) && (
          <div className="flex justify-center py-4">
            {isLoadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                Loading older messages...
              </div>
            ) : hasMoreHistory ? (
              <button
                onClick={() => loadMoreMessages(20)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                Load older messages ({totalMessageCount - messages.length} more)
              </button>
            ) : null}
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => {
          const previousMessage = messages[index - 1]
          const showAvatar = !previousMessage || 
            previousMessage.sender !== message.sender ||
            previousMessage.agentId !== message.agentId ||
            (new Date(message.timestamp).getTime() - new Date(previousMessage.timestamp).getTime()) > 300000 // 5 minutes
          
          return (
            <MessageItem
              key={message.id}
              message={message}
              showAvatar={showAvatar}
              onAction={(action) => handleMessageAction(message.id, action)}
            />
          )
        })}

        {/* Typing Indicators */}
        {typingIndicators.map((indicator) => (
          <div key={indicator.agentId} className="flex gap-3">
            <TypingIndicator 
              agentType={indicator.agentId as AgentType}
            />
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className={cn(
            'absolute bottom-4 right-4 p-2 rounded-full',
            'bg-blue-600 text-white shadow-lg hover:bg-blue-700',
            'transition-all duration-200 transform hover:scale-110',
            'z-10'
          )}
          title="Scroll to bottom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}