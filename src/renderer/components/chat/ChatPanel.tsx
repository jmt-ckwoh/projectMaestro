/**
 * Chat Panel Component - Team Chat Room Interface
 * 
 * Left panel implementing team chat room model where all agents participate
 * in a single conversation thread, similar to Slack for development teams.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { cn } from '@/renderer/utils/cn'
import { useChatStore } from '@/renderer/stores/chatStore'
import { useAgentStore } from '@/renderer/stores/agentStore'
import { AgentType } from '@/shared/contracts/AgentDomain'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'
import { AgentRecommendationPanel } from './AgentPersonality'
import { ThreadManager } from './ThreadManager'

// =============================================================================
// Chat Panel Component
// =============================================================================

export const ChatPanel: React.FC = () => {
  const {
    messages,
    activeThread,
    typingIndicators,
    sendMessage,
    clearHistory
  } = useChatStore()

  const { agents, statuses } = useAgentStore()
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null)
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const [agentRecommendations, setAgentRecommendations] = useState<Array<{
    agentType: AgentType
    confidence: number
    reasoning: string
    isRecommended: boolean
  }>>([])
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const [showThreadManager, setShowThreadManager] = useState(false)

  // Auto-save chat periodically
  const saveChatHistory = useChatStore(state => state.saveChatHistory)
  
  useEffect(() => {
    const interval = setInterval(() => {
      saveChatHistory()
    }, 30000) // Save every 30 seconds
    
    return () => clearInterval(interval)
  }, [saveChatHistory])

  // =============================================================================
  // Event Handlers
  // =============================================================================

  // =============================================================================
  // Agent Routing Functions
  // =============================================================================

  const getAgentRecommendations = useCallback(async (userMessage: string) => {
    try {
      // Get conversation history for context
      const recentMessages = messages.slice(-5).map(m => m.content)
      
      // Call the message routing service (placeholder for now)
      const recommendations = await analyzeMessageForRouting(userMessage, recentMessages)
      setAgentRecommendations(recommendations)
    } catch (error) {
      console.error('Failed to get agent recommendations:', error)
    }
  }, [messages])

  const handleSendMessage = useCallback(async (content: string, targetAgent?: AgentType) => {
    try {
      // Store the user message for routing analysis
      setLastUserMessage(content)
      
      // If no specific agent selected, get routing recommendations
      if (!targetAgent) {
        await getAgentRecommendations(content)
      } else {
        // Clear recommendations when agent is explicitly selected
        setAgentRecommendations([])
      }

      await sendMessage({
        content,
        targetAgent,
        metadata: {
          timestamp: new Date(),
          userInitiated: true
        }
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error // Let MessageInput handle the error
    }
  }, [sendMessage, getAgentRecommendations])

  const handleAgentSelect = useCallback((agent: AgentType | null) => {
    setSelectedAgent(agent)
  }, [])

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Clear all chat history? This cannot be undone.')) {
      clearHistory()
    }
  }, [clearHistory])

  const handleMessageAction = useCallback((messageId: string, action: 'edit' | 'delete' | 'reply') => {
    // TODO: Implement message actions
    console.warn('Message action not implemented:', { messageId, action })
  }, [])

  const handleSelectRecommendedAgent = useCallback((agentType: AgentType) => {
    setSelectedAgent(agentType)
    setAgentRecommendations([]) // Clear recommendations after selection
    
    // If there's a recent message, resend it to the selected agent
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage, agentType)
    }
  }, [lastUserMessage, handleSendMessage])

  // Placeholder routing analysis function
  const analyzeMessageForRouting = async (
    message: string, 
    _conversationHistory: string[]
  ): Promise<Array<{
    agentType: AgentType
    confidence: number
    reasoning: string
    isRecommended: boolean
  }>> => {
    // Simple keyword-based routing for demonstration
    const messageWords = message.toLowerCase()
    
    const recommendations = []
    
    // Producer routing
    if (messageWords.includes('project') || messageWords.includes('plan') || messageWords.includes('help')) {
      recommendations.push({
        agentType: AgentType.PRODUCER,
        confidence: 0.85,
        reasoning: 'Message contains project planning or general help keywords',
        isRecommended: true
      })
    }
    
    // Architect routing
    if (messageWords.includes('design') || messageWords.includes('architecture') || messageWords.includes('database')) {
      recommendations.push({
        agentType: AgentType.ARCHITECT,
        confidence: 0.90,
        reasoning: 'Message contains technical design or architecture keywords',
        isRecommended: true
      })
    }
    
    // Engineer routing
    if (messageWords.includes('code') || messageWords.includes('implement') || messageWords.includes('function')) {
      recommendations.push({
        agentType: AgentType.ENGINEER,
        confidence: 0.88,
        reasoning: 'Message contains coding or implementation keywords',
        isRecommended: true
      })
    }
    
    // QA routing
    if (messageWords.includes('test') || messageWords.includes('bug') || messageWords.includes('quality')) {
      recommendations.push({
        agentType: AgentType.QA,
        confidence: 0.87,
        reasoning: 'Message contains testing or quality assurance keywords',
        isRecommended: true
      })
    }
    
    // Default to Producer if no specific match
    if (recommendations.length === 0) {
      recommendations.push({
        agentType: AgentType.PRODUCER,
        confidence: 0.60,
        reasoning: 'No specific keywords detected, routing to Producer for general assistance',
        isRecommended: true
      })
    }
    
    // Sort by confidence and mark the highest as recommended
    recommendations.sort((a, b) => b.confidence - a.confidence)
    recommendations.forEach((rec, index) => {
      rec.isRecommended = index === 0
    })
    
    return recommendations
  }

  // =============================================================================
  // Agent Status Management
  // =============================================================================

  const activeAgents = agents.filter(agent => statuses[agent.id] !== 'error')
  const hasTypingAgents = typingIndicators.length > 0

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex h-full bg-white relative">
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Team Chat</h2>
                {hasTypingAgents && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {activeThread ? `Thread: ${activeThread}` : `${activeAgents.length} agents available`}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowThreadManager(!showThreadManager)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  showThreadManager 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'hover:bg-gray-200 text-gray-600'
                )}
                title="Conversation threads"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button
                onClick={() => setShowAgentSelector(!showAgentSelector)}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                title="Agent selector"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-7.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </button>
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
        <div className="flex-1 flex flex-col min-h-0">
          <MessageList
            messages={messages}
            typingIndicators={typingIndicators}
            onMessageAction={handleMessageAction}
          />

          {/* Agent Recommendations */}
          {agentRecommendations.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <AgentRecommendationPanel
                recommendations={agentRecommendations}
                onSelectAgent={handleSelectRecommendedAgent}
              />
            </div>
          )}
        </div>

        {/* Message Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelect}
        />
      </div>

      {/* Thread Manager Sidebar */}
      {showThreadManager && (
        <div className="w-80 flex-shrink-0">
          <ThreadManager 
            onClose={() => setShowThreadManager(false)}
          />
        </div>
      )}
    </div>
  )
}