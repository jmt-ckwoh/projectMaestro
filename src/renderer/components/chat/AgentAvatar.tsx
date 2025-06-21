/**
 * Agent Avatar Component
 * 
 * Visual representation of AI agents with status indicators and personality
 */

import React from 'react'
import { cn } from '@/renderer/utils/cn'
import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'

// =============================================================================
// Agent Avatar Configuration
// =============================================================================

export const AGENT_AVATAR_CONFIG: Record<AgentType, {
  emoji: string
  name: string
  bgColor: string
  textColor: string
  description: string
}> = {
  [AgentType.PRODUCER]: {
    emoji: '👔',
    name: 'Producer',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    description: 'Project Manager & Facilitator'
  },
  [AgentType.ARCHITECT]: {
    emoji: '🏗️',
    name: 'Architect',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    description: 'Technical Design & Planning'
  },
  [AgentType.ENGINEER]: {
    emoji: '⚡',
    name: 'Engineer',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    description: 'Implementation & Development'
  },
  [AgentType.QA]: {
    emoji: '🔍',
    name: 'QA',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    description: 'Testing & Quality Assurance'
  }
} as const

const AGENT_STATUS_CONFIG: Record<AgentStatus, {
  label: string
  icon: string
  className: string
  description: string
}> = {
  [AgentStatus.IDLE]: {
    label: 'Available',
    icon: '⚪',
    className: 'text-gray-500',
    description: 'Ready to help'
  },
  [AgentStatus.THINKING]: {
    label: 'Thinking',
    icon: '🤔',
    className: 'text-blue-500 animate-pulse',
    description: 'Processing your request'
  },
  [AgentStatus.WORKING]: {
    label: 'Working',
    icon: '⚡',
    className: 'text-green-500 animate-bounce',
    description: 'Actively working on task'
  },
  [AgentStatus.WAITING]: {
    label: 'Waiting',
    icon: '⏳',
    className: 'text-yellow-500',
    description: 'Waiting for response'
  },
  [AgentStatus.ERROR]: {
    label: 'Error',
    icon: '❌',
    className: 'text-red-500',
    description: 'Encountered an issue'
  },
  [AgentStatus.OFFLINE]: {
    label: 'Offline',
    icon: '⭕',
    className: 'text-gray-400',
    description: 'Not available'
  }
} as const

// =============================================================================
// Component Props
// =============================================================================

export interface AgentAvatarProps {
  type: AgentType
  status?: AgentStatus
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  showName?: boolean
  animated?: boolean
  className?: string
  onClick?: () => void
}

// =============================================================================
// Agent Avatar Component
// =============================================================================

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  type,
  status = AgentStatus.IDLE,
  size = 'md',
  showStatus = true,
  showName = false,
  animated = false,
  className,
  onClick
}) => {
  const avatarConfig = AGENT_AVATAR_CONFIG[type]
  const statusConfig = AGENT_STATUS_CONFIG[status]

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const statusSizeClasses = {
    sm: 'w-2 h-2 -bottom-0.5 -right-0.5',
    md: 'w-3 h-3 -bottom-1 -right-1',
    lg: 'w-4 h-4 -bottom-1 -right-1'
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      title={`${avatarConfig.name} - ${statusConfig.description}`}
    >
      {/* Avatar Circle */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold',
          'border-2 border-white shadow-sm',
          sizeClasses[size],
          avatarConfig.bgColor,
          avatarConfig.textColor,
          animated && status !== AgentStatus.IDLE && 'animate-pulse'
        )}
      >
        {avatarConfig.emoji}
      </div>

      {/* Status Indicator */}
      {showStatus && (
        <div
          className={cn(
            'absolute rounded-full border-2 border-white shadow-sm',
            'flex items-center justify-center text-xs',
            statusSizeClasses[size],
            statusConfig.className,
            status === AgentStatus.THINKING && 'animate-pulse',
            status === AgentStatus.WORKING && 'animate-bounce',
            status === AgentStatus.WAITING && 'animate-pulse'
          )}
          style={{
            animationDuration: 
              status === AgentStatus.THINKING ? '2s' :
              status === AgentStatus.WORKING ? '1s' :
              status === AgentStatus.WAITING ? '3s' : undefined
          }}
        >
          <span className="text-[8px]">
            {statusConfig.icon}
          </span>
        </div>
      )}

      {/* Agent Name */}
      {showName && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {avatarConfig.name}
          </span>
          <span className="text-xs text-gray-500">
            {statusConfig.label}
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Agent Status Indicator Component
// =============================================================================

export interface AgentStatusIndicatorProps {
  status: AgentStatus
  agentName?: string
  className?: string
}

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({
  status,
  agentName,
  className
}) => {
  const statusConfig = AGENT_STATUS_CONFIG[status]
  
  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="status"
      aria-label={`${agentName || 'Agent'} is ${statusConfig.label}`}
      aria-live="polite"
    >
      <span className={cn('text-sm', statusConfig.className)}>
        {statusConfig.icon}
      </span>
      <span className="text-xs text-gray-600">
        {statusConfig.label}
      </span>
      <span className="sr-only">
        {agentName || 'Agent'} status: {statusConfig.label}
      </span>
    </div>
  )
}

// =============================================================================
// Typing Indicator Component
// =============================================================================

export interface TypingIndicatorProps {
  agentType: AgentType
  className?: string
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  agentType,
  className
}) => {
  const avatarConfig = AGENT_AVATAR_CONFIG[agentType]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AgentAvatar 
        type={agentType} 
        status={AgentStatus.THINKING}
        size="sm"
        showStatus={false}
        animated
      />
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-600">
          {avatarConfig.name} is typing
        </span>
        <div className="flex items-center gap-0.5">
          <div 
            className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '0ms' }} 
          />
          <div 
            className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '150ms' }} 
          />
          <div 
            className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '300ms' }} 
          />
        </div>
      </div>
    </div>
  )
}