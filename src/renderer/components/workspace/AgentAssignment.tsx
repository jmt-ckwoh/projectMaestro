/**
 * Agent Assignment Components - Task-Agent Integration
 * 
 * Epic 2 Story 4.4: Tree View Integration with Chat and Agents
 * Provides agent assignment controls and visual indicators for tasks
 */

import React, { useCallback, useMemo } from 'react'
import { cn } from '@/renderer/utils/cn'
import { useAgentStore } from '@/renderer/stores/agentStore'
import type { AgentType } from '@/shared/types/agents'
import type { AgentStatus } from '@/shared/contracts/AgentDomain'

// =============================================================================
// Agent Assignment Dropdown Component
// =============================================================================

export interface AgentAssignmentDropdownProps {
  readonly value?: string // Agent ID
  readonly onChange: (agentId: string | undefined) => void
  readonly disabled?: boolean
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
  readonly placeholder?: string
}

export const AgentAssignmentDropdown: React.FC<AgentAssignmentDropdownProps> = ({
  value,
  onChange,
  disabled,
  size = 'md',
  className,
  placeholder = 'Assign agent...'
}) => {
  const agents = useAgentStore(state => state.agents)
  const statuses = useAgentStore(state => state.statuses)

  const availableAgents = useMemo(() => {
    return agents.filter(agent => agent.isActive)
  }, [agents])

  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = event.target.value || undefined
    onChange(agentId)
  }, [onChange])

  const selectedAgent = useMemo(() => {
    return value ? agents.find(agent => agent.id === value) : undefined
  }, [value, agents])

  return (
    <div className={cn('relative', className)}>
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'agent-assignment-dropdown',
          'appearance-none bg-white border border-gray-300 rounded-lg',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'transition-colors cursor-pointer',
          // Size variants
          size === 'sm' && 'px-2 py-1 text-xs pr-6',
          size === 'md' && 'px-3 py-2 text-sm pr-8',
          size === 'lg' && 'px-4 py-3 text-base pr-10',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <option value="">{placeholder}</option>
        {availableAgents.map(agent => {
          const status = statuses[agent.id]
          const isAvailable = status === 'idle'
          
          return (
            <option 
              key={agent.id} 
              value={agent.id}
              disabled={!isAvailable}
            >
              {getAgentConfig(agent.type).emoji} {agent.name} {!isAvailable ? `(${status})` : ''}
            </option>
          )
        })}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Selected agent indicator */}
      {selectedAgent && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
          <span className="text-sm">
            {getAgentConfig(selectedAgent.type).emoji}
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Agent Assignment Badge Component
// =============================================================================

export interface AgentAssignmentBadgeProps {
  readonly agentId?: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly showStatus?: boolean
  readonly className?: string
}

export const AgentAssignmentBadge: React.FC<AgentAssignmentBadgeProps> = ({
  agentId,
  size = 'md',
  showStatus = true,
  className
}) => {
  const agents = useAgentStore(state => state.agents)
  const statuses = useAgentStore(state => state.statuses)

  const agent = useMemo(() => {
    return agentId ? agents.find(a => a.id === agentId) : undefined
  }, [agentId, agents])

  if (!agent) {
    return (
      <span className={cn(
        'agent-assignment-badge-empty',
        'inline-flex items-center gap-1 rounded-full font-medium',
        'bg-gray-100 text-gray-500 border border-gray-200',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        className
      )}>
        Unassigned
      </span>
    )
  }

  const agentConfig = getAgentConfig(agent.type)
  const status = statuses[agent.id] || 'idle'
  const statusConfig = getAgentStatusConfig(status)

  return (
    <span
      className={cn(
        'agent-assignment-badge',
        'inline-flex items-center gap-1 rounded-full font-medium',
        // Size variants
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        // Agent type colors
        agentConfig.className,
        className
      )}
      title={`Assigned to ${agent.name} (${agent.type})`}
    >
      <span>{agentConfig.emoji}</span>
      <span>{agent.name}</span>
      {showStatus && (
        <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dotColor)} />
      )}
    </span>
  )
}

// =============================================================================
// Agent Workload Indicator Component
// =============================================================================

export interface AgentWorkloadIndicatorProps {
  readonly agentId: string
  readonly compact?: boolean
  readonly className?: string
}

export const AgentWorkloadIndicator: React.FC<AgentWorkloadIndicatorProps> = ({
  agentId,
  compact = false,
  className
}) => {
  const agents = useAgentStore(state => state.agents)
  const statuses = useAgentStore(state => state.statuses)
  const statistics = useAgentStore(state => state.statistics)

  const agent = agents.find(a => a.id === agentId)
  const status = statuses[agentId] || 'idle'
  const stats = statistics[agentId]

  if (!agent || !stats) {
    return null
  }

  const statusConfig = getAgentStatusConfig(status)
  const workloadPercentage = Math.min(100, (stats.totalInteractions / 50) * 100) // Example calculation

  if (compact) {
    return (
      <div className={cn('agent-workload-compact flex items-center gap-1', className)}>
        <div className={cn('w-2 h-2 rounded-full', statusConfig.dotColor)} />
        <span className="text-xs text-gray-600">{Math.round(workloadPercentage)}%</span>
      </div>
    )
  }

  return (
    <div className={cn('agent-workload-indicator', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">{agent.name}</span>
        <span className="text-xs text-gray-500">{Math.round(workloadPercentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={cn('h-1.5 rounded-full transition-all duration-300', statusConfig.barColor)}
          style={{ width: `${workloadPercentage}%` }}
        />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dotColor)} />
        <span className="text-xs text-gray-600">{statusConfig.label}</span>
      </div>
    </div>
  )
}

// =============================================================================
// Agent Configuration and Utilities
// =============================================================================

interface AgentConfig {
  readonly name: string
  readonly emoji: string
  readonly className: string
  readonly color: string
}

const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  'producer': {
    name: 'Producer',
    emoji: '👔',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    color: 'blue'
  },
  'architect': {
    name: 'Architect',
    emoji: '🏗️',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    color: 'purple'
  },
  'engineer': {
    name: 'Engineer',
    emoji: '⚡',
    className: 'bg-green-100 text-green-800 border-green-200',
    color: 'green'
  },
  'qa': {
    name: 'QA',
    emoji: '🔍',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    color: 'orange'
  }
}

function getAgentConfig(type: AgentType): AgentConfig {
  return AGENT_CONFIGS[type]
}

interface AgentStatusConfig {
  readonly label: string
  readonly dotColor: string
  readonly barColor: string
}

const AGENT_STATUS_CONFIGS: Record<AgentStatus, AgentStatusConfig> = {
  'idle': {
    label: 'Available',
    dotColor: 'bg-green-400',
    barColor: 'bg-green-500'
  },
  'thinking': {
    label: 'Thinking',
    dotColor: 'bg-yellow-400',
    barColor: 'bg-yellow-500'
  },
  'working': {
    label: 'Working',
    dotColor: 'bg-blue-400',
    barColor: 'bg-blue-500'
  },
  'waiting': {
    label: 'Waiting',
    dotColor: 'bg-gray-400',
    barColor: 'bg-gray-500'
  },
  'error': {
    label: 'Error',
    dotColor: 'bg-red-400',
    barColor: 'bg-red-500'
  },
  'offline': {
    label: 'Offline',
    dotColor: 'bg-gray-300',
    barColor: 'bg-gray-400'
  }
}

function getAgentStatusConfig(status: AgentStatus): AgentStatusConfig {
  return AGENT_STATUS_CONFIGS[status]
}

// =============================================================================
// Agent Assignment Utilities
// =============================================================================

/**
 * Get suggested agent for a task based on type and requirements
 */
export function getSuggestedAgent(taskType: 'epic' | 'story' | 'task' | 'subtask', taskDescription?: string): AgentType | undefined {
  // Simple heuristics for agent suggestion
  if (taskDescription) {
    const desc = taskDescription.toLowerCase()
    
    if (desc.includes('test') || desc.includes('qa') || desc.includes('bug')) {
      return 'qa'
    }
    if (desc.includes('code') || desc.includes('implement') || desc.includes('develop')) {
      return 'engineer'
    }
    if (desc.includes('design') || desc.includes('architecture') || desc.includes('system')) {
      return 'architect'
    }
  }

  // Default suggestions based on task type
  switch (taskType) {
    case 'epic':
    case 'story':
      return 'producer' // Project management focus
    case 'task':
      return 'engineer' // Implementation focus
    case 'subtask':
      return 'engineer' // Detailed implementation
    default:
      return undefined
  }
}