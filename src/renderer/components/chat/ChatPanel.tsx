/**
 * Chat Panel Component
 * 
 * Left panel of the Three-Panel Layout - implements "Slack-like" interface
 * for communicating with AI agent personas
 */

import React, { useEffect, useRef, useState } from 'react'
import { useChatStore } from '@/renderer/stores/chatStore'
import { useAgentStore } from '@/renderer/stores/agentStore'
import { cn } from '@/renderer/utils/cn'

// =============================================================================
// Chat Panel Component
// =============================================================================

export const ChatPanel: React.FC = () => {
  const {
    messages,
    activeThread,
    isTyping,
    sendMessage,
    clearHistory
  } = useChatStore()

  const { agents } = useAgentStore()
  const [inputValue, setInputValue] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const messageText = inputValue.trim()
    setInputValue('')

    try {
      await sendMessage({
        content: messageText,
        targetAgent: selectedAgent || undefined,
        metadata: {
          timestamp: new Date(),
          userInitiated: true
        }
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      // TODO: Add error notification
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearHistory = () => {
    if (window.confirm('Clear all chat history? This cannot be undone.')) {
      clearHistory()
    }
  }

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  }

  const getAgentAvatar = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return '🤖'
    
    const avatarMap: Record<string, string> = {
      'producer': '👔',
      'architect': '🏗️',
      'engineer': '⚡',
      'qa': '🔍'
    }
    
    return avatarMap[agent.type] || '🤖'
  }

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
    return agent?.name || 'AI Assistant'
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Team Chat</h2>
            <p className="text-sm text-gray-600">
              {activeThread ? `Thread: ${activeThread}` : 'General conversation'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              title="Clear chat history"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Welcome to Project Maestro
            </h3>
            <p className="text-gray-600 text-sm max-w-xs mx-auto">
              Start a conversation with your AI team. Type your project idea or ask questions!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm',
                message.sender === 'user' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              )}>
                {message.sender === 'user' ? '👤' : getAgentAvatar(message.agentId || '')}
              </div>

              {/* Message Content */}
              <div className={cn(
                'flex-1 max-w-[80%]',
                message.sender === 'user' ? 'text-right' : 'text-left'
              )}>
                {/* Message Header */}
                <div className={cn(
                  'flex items-center gap-2 mb-1',
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}>
                  <span className="text-sm font-medium text-gray-900">
                    {message.sender === 'user' ? 'You' : getAgentName(message.agentId || '')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(new Date(message.timestamp))}
                  </span>
                </div>

                {/* Message Bubble */}
                <div className={cn(
                  'px-3 py-2 rounded-lg max-w-full',
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white ml-8'
                    : 'bg-gray-100 text-gray-900 mr-8'
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Message Status */}
                  {message.status && message.status !== 'delivered' && (
                    <div className={cn(
                      'text-xs mt-1',
                      message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                    )}>
                      {message.status === 'sending' && '⏳ Sending...'}
                      {message.status === 'error' && '❌ Failed to send'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
              🤖
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Agent Selector */}
      {agents.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Direct to:</span>
            <button
              onClick={() => setSelectedAgent(null)}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-colors',
                !selectedAgent 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Everyone
            </button>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  selectedAgent === agent.id
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {getAgentAvatar(agent.id)} {agent.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedAgent ? `Message ${getAgentName(selectedAgent)}...` : "Type your message..."}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            maxLength={2000}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              inputValue.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            Send
          </button>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {selectedAgent ? `Messaging ${getAgentName(selectedAgent)}` : 'General chat'}
          </span>
          <span className="text-xs text-gray-500">
            {inputValue.length}/2000
          </span>
        </div>
      </div>
    </div>
  )
}