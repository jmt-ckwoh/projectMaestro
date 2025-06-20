/**
 * Team Panel Component
 * 
 * Right panel of the Three-Panel Layout - displays AI agent team roster
 * with real-time status indicators and activity monitoring
 */

import React, { useEffect } from 'react'
import { useAgentStore } from '@/renderer/stores/agentStore'
import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'
import { cn } from '@/renderer/utils/cn'

// =============================================================================
// Team Panel Component
// =============================================================================

export const TeamPanel: React.FC = () => {
  const { agents, statuses, statistics, isInitialized, initializeDefaultTeam } = useAgentStore()

  // Initialize team on first load
  useEffect(() => {
    if (!isInitialized && agents.length === 0) {
      initializeDefaultTeam().catch(console.error)
    }
  }, [isInitialized, agents.length, initializeDefaultTeam])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Team Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Team</h2>
            <p className="text-sm text-gray-600">
              {agents.length} agents • {Object.values(statuses).filter(s => s !== AgentStatus.OFFLINE).length} active
            </p>
          </div>
          
          <button className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors" title="Team settings">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Team Roster */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {agents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Agents Available
            </h3>
            <p className="text-gray-600 text-sm">
              Initialize your AI team to get started with project development.
            </p>
            <button 
              onClick={() => initializeDefaultTeam()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Initialize Team
            </button>
          </div>
        ) : (
          agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              status={statuses[agent.id] || AgentStatus.OFFLINE}
              stats={statistics[agent.id]}
            />
          ))
        )}
      </div>

      {/* Team Actions */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-2">
          <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Add New Agent
          </button>
          <button className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Team Settings
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Agent Card Component
// =============================================================================

interface AgentCardProps {
  agent: {
    id: string
    name: string
    type: AgentType
    description?: string
  }
  status: AgentStatus
  stats?: {
    tasksCompleted: number
    averageResponseTime: number
    lastActive: Date
  }
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, status, stats }) => {
  const getAgentConfig = (type: AgentType) => {
    const configs = {
      [AgentType.PRODUCER]: {
        emoji: '👔',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200'
      },
      [AgentType.ARCHITECT]: {
        emoji: '🏗️',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200'
      },
      [AgentType.ENGINEER]: {
        emoji: '⚡',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      },
      [AgentType.QA]: {
        emoji: '🔍',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      }
    }
    return configs[type]
  }

  const getStatusConfig = (status: AgentStatus) => {
    const configs = {
      [AgentStatus.IDLE]: {
        label: 'Available',
        color: 'text-green-600',
        dot: 'bg-green-500',
        animated: false
      },
      [AgentStatus.THINKING]: {
        label: 'Thinking',
        color: 'text-blue-600',
        dot: 'bg-blue-500',
        animated: true
      },
      [AgentStatus.WORKING]: {
        label: 'Working',
        color: 'text-yellow-600',
        dot: 'bg-yellow-500',
        animated: true
      },
      [AgentStatus.WAITING]: {
        label: 'Waiting',
        color: 'text-gray-600',
        dot: 'bg-gray-500',
        animated: false
      },
      [AgentStatus.ERROR]: {
        label: 'Error',
        color: 'text-red-600',
        dot: 'bg-red-500',
        animated: false
      },
      [AgentStatus.OFFLINE]: {
        label: 'Offline',
        color: 'text-gray-400',
        dot: 'bg-gray-300',
        animated: false
      }
    }
    return configs[status]
  }

  const agentConfig = getAgentConfig(agent.type)
  const statusConfig = getStatusConfig(status)

  return (
    <div className={cn(
      'bg-white rounded-lg border-2 p-4 transition-all duration-200',
      agentConfig.borderColor,
      'hover:shadow-md cursor-pointer'
    )}>
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-lg',
          agentConfig.bgColor,
          agentConfig.textColor
        )}>
          {agentConfig.emoji}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
            <div className={cn(
              'w-2 h-2 rounded-full',
              statusConfig.dot,
              statusConfig.animated && 'animate-pulse'
            )} />
          </div>
          <p className={cn('text-sm font-medium', statusConfig.color)}>
            {statusConfig.label}
          </p>
        </div>
      </div>

      {/* Agent Description */}
      {agent.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {agent.description}
        </p>
      )}

      {/* Agent Statistics */}
      {stats && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Tasks completed</span>
            <span className="font-medium text-gray-900">{stats.tasksCompleted}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Avg response time</span>
            <span className="font-medium text-gray-900">{stats.averageResponseTime}s</span>
          </div>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Last active</span>
            <span className="font-medium text-gray-900">
              {formatRelativeTime(stats.lastActive)}
            </span>
          </div>
        </div>
      )}

      {/* Agent Actions */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex gap-2">
          <button className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            Message
          </button>
          <button className="flex-1 px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}