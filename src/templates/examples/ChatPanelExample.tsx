/**
 * ChatPanel Example - Complete working implementation
 * 
 * This demonstrates the full chat panel component following Project Maestro patterns:
 * - Proper store integration
 * - Agent interaction patterns
 * - Real-time updates
 * - Error handling
 * - Accessibility
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

// =============================================================================
// Types
// =============================================================================

export interface Message {
  id: string
  agentType: 'user' | 'producer' | 'architect' | 'engineer' | 'qa'
  content: string
  timestamp: Date
  status: 'sending' | 'sent' | 'error'
  metadata?: {
    taskId?: string
    projectId?: string
    responseToId?: string
  }
}

export interface ChatPanelProps {
  className?: string
  projectId?: string
  onSendMessage?: (message: string, agentType: string) => Promise<void>
}

// =============================================================================
// Mock Store Hook (replace with actual store)
// =============================================================================

const useChatStore = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      agentType: 'user',
      content: 'I need to create a new React component for user profiles',
      timestamp: new Date(Date.now() - 300000),
      status: 'sent'
    },
    {
      id: '2',
      agentType: 'producer',
      content: 'I\'ll coordinate with the team to design and implement a user profile component. Let me bring in our Architect for the technical design.',
      timestamp: new Date(Date.now() - 240000),
      status: 'sent'
    },
    {
      id: '3',
      agentType: 'architect',
      content: 'For the user profile component, I recommend: 1) Reusable ProfileCard component 2) Avatar with status indicator 3) Editable fields with form validation 4) Settings integration. Should I create the component structure?',
      timestamp: new Date(Date.now() - 180000),
      status: 'sent'
    }
  ])

  const [typingAgents, setTypingAgents] = useState<string[]>([])

  const sendMessage = useCallback(async (content: string, agentType: string = 'user') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      agentType: agentType as any,
      content,
      timestamp: new Date(),
      status: 'sending'
    }

    setMessages(prev => [...prev, newMessage])

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      )

      // Simulate agent response
      if (agentType === 'user') {
        setTypingAgents(['producer'])
        
        setTimeout(() => {
          const agentResponse: Message = {
            id: (Date.now() + 1).toString(),
            agentType: 'producer',
            content: `I understand you want to ${content.toLowerCase()}. Let me coordinate with the team to make this happen.`,
            timestamp: new Date(),
            status: 'sent'
          }
          
          setMessages(prev => [...prev, agentResponse])
          setTypingAgents([])
        }, 2000)
      }
    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'error' as const }
            : msg
        )
      )
    }
  }, [])

  return {
    messages,
    typingAgents,
    sendMessage
  }
}

// =============================================================================
// Sub-components
// =============================================================================

const AgentAvatar: React.FC<{ agentType: string; size?: 'sm' | 'md' }> = ({ 
  agentType, 
  size = 'md' 
}) => {
  const avatarConfig = {
    user: { emoji: '👤', bg: 'bg-gray-100', text: 'text-gray-800' },
    producer: { emoji: '👔', bg: 'bg-blue-100', text: 'text-blue-800' },
    architect: { emoji: '🏗️', bg: 'bg-purple-100', text: 'text-purple-800' },
    engineer: { emoji: '⚡', bg: 'bg-green-100', text: 'text-green-800' },
    qa: { emoji: '🔍', bg: 'bg-orange-100', text: 'text-orange-800' }
  }

  const config = avatarConfig[agentType as keyof typeof avatarConfig] || avatarConfig.user
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-sm' : 'w-8 h-8 text-base'

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold',
      config.bg,
      config.text,
      sizeClasses
    )}>
      {config.emoji}
    </div>
  )
}

const MessageBubble: React.FC<{ message: Message; isUser: boolean }> = ({ 
  message, 
  isUser 
}) => {
  return (
    <div className={cn(
      'flex gap-3 mb-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      <AgentAvatar agentType={message.agentType} />
      
      <div className={cn(
        'max-w-[70%] flex flex-col',
        isUser ? 'items-end' : 'items-start'
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-600 capitalize">
            {message.agentType}
          </span>
          <span className="text-xs text-gray-400">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {message.status === 'sending' && (
            <div className="w-3 h-3 animate-spin rounded-full border border-blue-300 border-t-blue-600" />
          )}
          {message.status === 'error' && (
            <span className="text-red-500 text-xs">Failed</span>
          )}
        </div>
        
        <div className={cn(
          'rounded-lg px-3 py-2 text-sm',
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-900',
          message.status === 'error' && 'bg-red-100 text-red-800 border border-red-200'
        )}>
          {message.content}
        </div>
      </div>
    </div>
  )
}

const TypingIndicator: React.FC<{ agents: string[] }> = ({ agents }) => {
  if (agents.length === 0) return null

  return (
    <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
      <div className="flex gap-1">
        {agents.map(agent => (
          <AgentAvatar key={agent} agentType={agent} size="sm" />
        ))}
      </div>
      <span>
        {agents.join(', ')} {agents.length === 1 ? 'is' : 'are'} typing...
      </span>
      <div className="flex gap-1">
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100" />
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200" />
      </div>
    </div>
  )
}

const MessageInput: React.FC<{ 
  onSendMessage: (message: string) => void
  disabled?: boolean 
}> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }, [message, onSendMessage, disabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [])

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
      <div className="flex gap-2">
        <div className="flex-1 min-h-[40px] max-h-[120px] relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to the team..."
            className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={disabled}
            rows={1}
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          Send
        </button>
      </div>
      
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => setMessage(prev => prev + ' @producer')}
        >
          @producer
        </button>
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => setMessage(prev => prev + ' @architect')}
        >
          @architect
        </button>
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => setMessage(prev => prev + ' @engineer')}
        >
          @engineer
        </button>
      </div>
    </form>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  className,
  projectId,
  onSendMessage 
}) => {
  const { messages, typingAgents, sendMessage } = useChatStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAutoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, typingAgents, isAutoScrollEnabled])

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50
    setIsAutoScrollEnabled(isAtBottom)
  }, [])

  const handleSendMessage = useCallback(async (message: string) => {
    try {
      if (onSendMessage) {
        await onSendMessage(message, 'user')
      } else {
        await sendMessage(message, 'user')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [onSendMessage, sendMessage])

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200',
      className
    )}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Team Chat</h2>
        <p className="text-sm text-gray-600">
          Communicate with your AI team
        </p>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-600 max-w-sm">
              Send a message to your AI team to get started on your project.
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isUser={message.agentType === 'user'}
              />
            ))}
            
            <TypingIndicator agents={typingAgents} />
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Show scroll to bottom button */}
      {!isAutoScrollEnabled && (
        <div className="absolute bottom-20 right-6">
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              setIsAutoScrollEnabled(true)
            }}
            className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            aria-label="Scroll to bottom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={typingAgents.length > 0}
      />
    </div>
  )
}

// =============================================================================
// Default Props & Display Name
// =============================================================================

ChatPanel.displayName = 'ChatPanel'

// =============================================================================
// Export for Templates
// =============================================================================

export default ChatPanel