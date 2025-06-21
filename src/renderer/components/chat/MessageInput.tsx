/**
 * Message Input Component
 * 
 * Enhanced chat input with @mention support and agent targeting
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/renderer/utils/cn'
import { AgentType } from '@/shared/contracts/AgentDomain'
import { AGENT_AVATAR_CONFIG } from './AgentAvatar'

// =============================================================================
// Component Props
// =============================================================================

export interface MessageInputProps {
  onSendMessage: (content: string, targetAgent?: AgentType) => Promise<void>
  selectedAgent?: AgentType | null
  onAgentSelect?: (agent: AgentType | null) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

interface MentionSuggestion {
  id: AgentType
  name: string
  emoji: string
  description: string
}

interface ParsedMention {
  agent: AgentType
  startIndex: number
  endIndex: number
  text: string
}

interface MentionDropdownProps {
  suggestions: MentionSuggestion[]
  selectedIndex: number
  onSelect: (agent: AgentType) => void
  position: { top: number; left: number }
  visible: boolean
}

// =============================================================================
// Mention Dropdown Component
// =============================================================================

const MentionDropdown: React.FC<MentionDropdownProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  position,
  visible
}) => {
  if (!visible || suggestions.length === 0) return null

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px'
      }}
    >
      {suggestions.map((agent, index) => (
        <button
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          className={cn(
            'w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors',
            'flex items-center gap-2',
            index === selectedIndex && 'bg-blue-50 text-blue-700'
          )}
        >
          <span className="text-lg">{agent.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{agent.name}</div>
            <div className="text-xs text-gray-500 truncate">{agent.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// =============================================================================
// Message Input Component
// =============================================================================

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  selectedAgent,
  onAgentSelect,
  disabled = false,
  placeholder,
  maxLength = 2000,
  className
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // @mention state
  const [mentionDropdown, setMentionDropdown] = useState({
    visible: false,
    position: { top: 0, left: 0 },
    selectedIndex: 0,
    triggerIndex: -1,
    query: ''
  })
  
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Available agents for @mentions
  const availableAgents: MentionSuggestion[] = useMemo(() => [
    {
      id: AgentType.PRODUCER,
      name: AGENT_AVATAR_CONFIG[AgentType.PRODUCER].name,
      emoji: AGENT_AVATAR_CONFIG[AgentType.PRODUCER].emoji,
      description: AGENT_AVATAR_CONFIG[AgentType.PRODUCER].description
    },
    {
      id: AgentType.ARCHITECT,
      name: AGENT_AVATAR_CONFIG[AgentType.ARCHITECT].name,
      emoji: AGENT_AVATAR_CONFIG[AgentType.ARCHITECT].emoji,
      description: AGENT_AVATAR_CONFIG[AgentType.ARCHITECT].description
    },
    {
      id: AgentType.ENGINEER,
      name: AGENT_AVATAR_CONFIG[AgentType.ENGINEER].name,
      emoji: AGENT_AVATAR_CONFIG[AgentType.ENGINEER].emoji,
      description: AGENT_AVATAR_CONFIG[AgentType.ENGINEER].description
    },
    {
      id: AgentType.QA,
      name: AGENT_AVATAR_CONFIG[AgentType.QA].name,
      emoji: AGENT_AVATAR_CONFIG[AgentType.QA].emoji,
      description: AGENT_AVATAR_CONFIG[AgentType.QA].description
    }
  ], [])

  // Filter agents based on mention query
  const filteredAgents = availableAgents.filter(agent =>
    agent.name.toLowerCase().includes(mentionDropdown.query.toLowerCase()) ||
    agent.id.toLowerCase().includes(mentionDropdown.query.toLowerCase())
  )

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Parse @mentions in text
  const parseMentions = useCallback((text: string): ParsedMention[] => {
    const mentions: ParsedMention[] = []
    const mentionRegex = /@(\w+)/g
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionText = match[1].toLowerCase()
      const agent = availableAgents.find(a => 
        a.name.toLowerCase() === mentionText || 
        a.id.toLowerCase() === mentionText
      )

      if (agent) {
        mentions.push({
          agent: agent.id,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          text: match[0]
        })
      }
    }

    return mentions
  }, [availableAgents])

  // Get text dimensions for dropdown positioning
  const getTextMetrics = useCallback((textarea: HTMLTextAreaElement, text: string) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      return { width: 0, height: 0 }
    }
    
    const style = window.getComputedStyle(textarea)
    ctx.font = `${style.fontSize} ${style.fontFamily}`
    
    const lines = text.split('\n')
    const width = Math.max(...lines.map(line => ctx.measureText(line).width))
    const height = lines.length * parseFloat(style.lineHeight || '1.2')
    
    return { width, height }
  }, [])

  // Handle @mention detection and autocomplete
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    const textarea = e.target
    const cursorPosition = textarea.selectionStart
    
    // Find if cursor is after an @
    const textBeforeCursor = newValue.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const query = mentionMatch[1]
      const mentionStart = textBeforeCursor.lastIndexOf('@')
      
      // Calculate dropdown position
      const rect = textarea.getBoundingClientRect()
      const textMetrics = getTextMetrics(textarea, textBeforeCursor)
      
      setMentionDropdown({
        visible: true,
        position: {
          top: rect.top + textMetrics.height + 25,
          left: rect.left + textMetrics.width
        },
        selectedIndex: 0,
        triggerIndex: mentionStart,
        query
      })
    } else {
      setMentionDropdown(prev => ({ ...prev, visible: false }))
    }
  }, [getTextMetrics])

  // Handle mention selection
  const selectMention = useCallback((agent: AgentType) => {
    if (mentionDropdown.triggerIndex === -1) return
    
    const agentName = availableAgents.find(a => a.id === agent)?.name || agent
    const beforeMention = inputValue.substring(0, mentionDropdown.triggerIndex)
    const afterCursor = inputValue.substring(inputRef.current?.selectionStart || 0)
    
    const newValue = `${beforeMention}@${agentName} ${afterCursor}`
    setInputValue(newValue)
    setMentionDropdown(prev => ({ ...prev, visible: false }))
    
    // Focus back to input
    setTimeout(() => {
      const newCursorPos = beforeMention.length + agentName.length + 2
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      inputRef.current?.focus()
    }, 0)
  }, [mentionDropdown.triggerIndex, inputValue, availableAgents])

  // Handle dropdown keyboard navigation
  const handleMentionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!mentionDropdown.visible) return
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        setMentionDropdown(prev => ({
          ...prev,
          selectedIndex: Math.max(0, prev.selectedIndex - 1)
        }))
        break
      case 'ArrowDown':
        e.preventDefault()
        setMentionDropdown(prev => ({
          ...prev,
          selectedIndex: Math.min(filteredAgents.length - 1, prev.selectedIndex + 1)
        }))
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (filteredAgents[mentionDropdown.selectedIndex]) {
          selectMention(filteredAgents[mentionDropdown.selectedIndex].id)
        }
        break
      case 'Escape':
        setMentionDropdown(prev => ({ ...prev, visible: false }))
        break
    }
  }, [mentionDropdown.visible, mentionDropdown.selectedIndex, filteredAgents, selectMention])

  // Handle message submission with @mention parsing
  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isSubmitting || disabled) return

    const content = inputValue.trim()
    setIsSubmitting(true)
    
    try {
      // Parse mentions to determine target agent
      const mentions = parseMentions(content)
      const targetAgent = mentions.length > 0 ? mentions[0].agent : selectedAgent || undefined
      
      await onSendMessage(content, targetAgent)
      setInputValue('')
      setMentionDropdown(prev => ({ ...prev, visible: false }))
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSubmitting(false)
      inputRef.current?.focus()
    }
  }, [inputValue, isSubmitting, disabled, selectedAgent, onSendMessage, parseMentions])

  // Handle keyboard input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle mention dropdown first
    if (mentionDropdown.visible) {
      handleMentionKeyDown(e)
      return
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit, mentionDropdown.visible, handleMentionKeyDown])

  // Calculate effective placeholder
  const effectivePlaceholder = placeholder || 
    (selectedAgent 
      ? `Message ${AGENT_AVATAR_CONFIG[selectedAgent].name}...`
      : "Type your message... (use @mentions to target specific agents)")

  return (
    <div className={cn('relative', className)}>
      {/* Agent Selector */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
        <span className="text-xs font-medium text-gray-600">Direct to:</span>
        <button
          onClick={() => onAgentSelect?.(null)}
          className={cn(
            'px-2 py-1 rounded text-xs font-medium transition-colors',
            !selectedAgent 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          Everyone
        </button>
        {availableAgents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onAgentSelect?.(agent.id)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
              selectedAgent === agent.id
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <span>{agent.emoji}</span>
            {agent.name}
          </button>
        ))}
      </div>

      {/* Message Input */}
      <div className="p-4">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            disabled={disabled || isSubmitting}
            maxLength={maxLength}
            className={cn(
              'w-full resize-none border border-gray-300 rounded-lg',
              'px-3 py-2 text-sm leading-relaxed',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'placeholder:text-gray-400'
            )}
            rows={3}
          />
          
          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isSubmitting || disabled}
            className={cn(
              'absolute bottom-2 right-2 px-3 py-1.5 rounded-md',
              'font-medium text-sm transition-colors',
              'flex items-center gap-1',
              inputValue.trim() && !isSubmitting && !disabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Sending
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
        
        {/* @Mention Dropdown */}
        {mentionDropdown.visible && filteredAgents.length > 0 && (
          <MentionDropdown
            suggestions={filteredAgents}
            selectedIndex={mentionDropdown.selectedIndex}
            onSelect={selectMention}
            position={mentionDropdown.position}
            visible={mentionDropdown.visible}
          />
        )}
        
        {/* Input Footer */}
        <div className="flex justify-between items-center mt-2">
          <div className="text-xs text-gray-500">
            {(() => {
              const mentions = parseMentions(inputValue)
              if (mentions.length > 0) {
                const agent = availableAgents.find(a => a.id === mentions[0].agent)
                return (
                  <span className="flex items-center gap-1">
                    <span>{agent?.emoji}</span>
                    Mentioning {agent?.name}
                  </span>
                )
              }
              if (selectedAgent) {
                return (
                  <span className="flex items-center gap-1">
                    <span>{AGENT_AVATAR_CONFIG[selectedAgent].emoji}</span>
                    Messaging {AGENT_AVATAR_CONFIG[selectedAgent].name}
                  </span>
                )
              }
              return 'General chat • Use @mentions for specific agents'
            })()} 
          </div>
          <span className="text-xs text-gray-500">
            {inputValue.length}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  )
}