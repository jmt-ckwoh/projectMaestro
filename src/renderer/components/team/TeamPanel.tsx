/**
 * Team Panel Component
 * 
 * Right panel of the Three-Panel Layout - displays AI agent team roster
 * with real-time status indicators and activity monitoring
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useAgentStore } from '@/renderer/stores/agentStore'
import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'
import { cn } from '@/renderer/utils/cn'
import { AgentActivityMonitor } from './AgentActivityMonitor'
import { AgentConfigurationModal } from './AgentConfigurationModal'
import { AgentDetailModal } from './AgentDetailModal'

// =============================================================================
// Team Panel Component
// =============================================================================

export const TeamPanel: React.FC = () => {
  const { 
    agents, 
    statuses, 
    statistics, 
    isInitialized, 
    initializeDefaultTeam, 
    updateAgentStatus,
    startWorkSession,
    endWorkSession,
    updateWorkProgress,
    addArtifact,
    addThinkingStep,
    getActiveWorkSession
  } = useAgentStore()
  const [showActivityMonitor, setShowActivityMonitor] = useState(false)
  const [configureAgent, setConfigureAgent] = useState<string | null>(null)
  const [detailAgent, setDetailAgent] = useState<string | null>(null)
  
  // Mock task data for demonstration - will be replaced with actual task store
  const mockTasks = useMemo(() => [
    {
      id: 'task-1',
      title: 'User Authentication System',
      type: 'epic',
      status: 'in-progress',
      assignedAgent: agents.find(a => a.type === AgentType.ENGINEER)?.id
    },
    {
      id: 'task-2',
      title: 'Database Schema Design',
      type: 'task',
      status: 'review',
      assignedAgent: agents.find(a => a.type === AgentType.ARCHITECT)?.id
    },
    {
      id: 'task-3',
      title: 'API Endpoint Testing',
      type: 'task',
      status: 'completed',
      assignedAgent: agents.find(a => a.type === AgentType.QA)?.id
    }
  ], [agents])

  // Initialize team on first load
  useEffect(() => {
    if (!isInitialized && agents.length === 0) {
      initializeDefaultTeam().catch(console.error)
    }
  }, [isInitialized, agents.length, initializeDefaultTeam])

  // Calculate team metrics
  const teamMetrics = useMemo(() => {
    const activeCount = Object.values(statuses).filter(s => s !== AgentStatus.OFFLINE).length
    const busyCount = Object.values(statuses).filter(s => 
      [AgentStatus.THINKING, AgentStatus.WORKING].includes(s)
    ).length
    const availableCount = Object.values(statuses).filter(s => s === AgentStatus.IDLE).length
    
    return { activeCount, busyCount, availableCount }
  }, [statuses])

  // Demo function to simulate status changes
  const simulateStatusChange = (status: AgentStatus) => {
    if (agents.length > 0) {
      // Update a random agent's status
      const randomAgent = agents[Math.floor(Math.random() * agents.length)]
      const reasons: Record<AgentStatus, string> = {
        [AgentStatus.WORKING]: 'Started new task',
        [AgentStatus.THINKING]: 'Analyzing requirements',
        [AgentStatus.IDLE]: 'Task completed',
        [AgentStatus.ERROR]: 'Encountered issue',
        [AgentStatus.WAITING]: 'Waiting for dependencies',
        [AgentStatus.OFFLINE]: 'Going offline'
      }
      updateAgentStatus(randomAgent.id, status, reasons[status] || 'Status change demo')
    }
  }

  // Demo function to simulate work sessions
  const simulateWorkSession = () => {
    if (agents.length > 0) {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)]
      const activeSession = getActiveWorkSession(randomAgent.id)
      
      if (activeSession) {
        // End current session
        endWorkSession(randomAgent.id, activeSession.id)
      } else {
        // Start new session
        const objectives = [
          'Implement user authentication system',
          'Design REST API endpoints',
          'Create database schema',
          'Build responsive UI components',
          'Write comprehensive tests'
        ]
        const randomObjective = objectives[Math.floor(Math.random() * objectives.length)]
        const sessionId = startWorkSession(randomAgent.id, randomObjective, 'task-demo', randomObjective)
        
        // Simulate some progress after a short delay
        setTimeout(() => {
          updateWorkProgress(randomAgent.id, sessionId, 25, 'analyzing')
          
          // Add initial thinking step
          addThinkingStep(randomAgent.id, sessionId, {
            type: 'analysis',
            title: 'Analyzing task requirements',
            content: `Starting work on: ${randomObjective}. Need to understand the scope and identify key components.`,
            confidence: 85,
            metadata: { phase: 'initial_analysis' }
          })
          
          // Add a demo artifact
          addArtifact(randomAgent.id, sessionId, {
            type: 'plan',
            title: 'Implementation Plan',
            content: '1. Set up project structure\n2. Install dependencies\n3. Create base components\n4. Implement core logic',
            tags: ['planning', 'implementation'],
            size: 120
          })
        }, 1000)
      }
    }
  }

  // Demo function to simulate work progress
  const simulateWorkProgress = () => {
    if (agents.length > 0) {
      const activeAgents = agents.filter(agent => getActiveWorkSession(agent.id))
      
      if (activeAgents.length > 0) {
        const randomAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)]
        const activeSession = getActiveWorkSession(randomAgent.id)
        
        if (activeSession) {
          const currentProgress = activeSession.progressPercentage
          const newProgress = Math.min(100, currentProgress + Math.floor(Math.random() * 30) + 10)
          
          // Update phase based on progress
          let newPhase: typeof activeSession.currentPhase = activeSession.currentPhase
          if (newProgress >= 80) newPhase = 'reviewing'
          else if (newProgress >= 60) newPhase = 'implementing'
          else if (newProgress >= 40) newPhase = 'planning'
          else if (newProgress >= 20) newPhase = 'analyzing'
          
          updateWorkProgress(randomAgent.id, activeSession.id, newProgress, newPhase)
          
          // Add thinking step based on phase
          const thinkingSteps = {
            analyzing: {
              type: 'analysis' as const,
              title: 'Analyzing implementation approach',
              content: `Progress: ${newProgress}%. Analyzing different approaches and identifying potential challenges.`
            },
            planning: {
              type: 'planning' as const,
              title: 'Planning implementation steps',
              content: `Progress: ${newProgress}%. Creating detailed implementation plan and breaking down tasks.`
            },
            implementing: {
              type: 'execution' as const,
              title: 'Implementing solution',
              content: `Progress: ${newProgress}%. Writing code and implementing the planned solution.`
            },
            reviewing: {
              type: 'reflection' as const,
              title: 'Reviewing implementation',
              content: `Progress: ${newProgress}%. Reviewing implementation quality and testing functionality.`
            }
          }
          
          if (newPhase in thinkingSteps) {
            const stepConfig = thinkingSteps[newPhase as keyof typeof thinkingSteps]
            addThinkingStep(randomAgent.id, activeSession.id, {
              ...stepConfig,
              confidence: Math.floor(Math.random() * 30) + 70, // 70-100% confidence
              metadata: { progress: newProgress, phase: newPhase }
            })
          }
        }
      }
    }
  }

  // Demo function to simulate artifact creation
  const simulateArtifactCreation = () => {
    if (agents.length > 0) {
      const activeAgents = agents.filter(agent => getActiveWorkSession(agent.id))
      
      if (activeAgents.length > 0) {
        const randomAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)]
        const activeSession = getActiveWorkSession(randomAgent.id)
        
        if (activeSession) {
          const artifactTypes = ['code', 'document', 'analysis', 'plan', 'test', 'review'] as const
          const artifactTitles = {
            code: ['auth.service.ts', 'user.model.ts', 'api.controller.ts', 'database.config.ts'],
            document: ['Architecture Overview', 'User Requirements', 'Design Specification', 'API Documentation'],
            analysis: ['Performance Analysis', 'Security Assessment', 'Code Quality Report', 'Risk Analysis'],
            plan: ['Implementation Plan', 'Testing Strategy', 'Deployment Plan', 'Migration Plan'],
            test: ['Unit Tests', 'Integration Tests', 'E2E Tests', 'Performance Tests'],
            review: ['Code Review', 'Design Review', 'Security Review', 'Architecture Review']
          }
          
          const randomType = artifactTypes[Math.floor(Math.random() * artifactTypes.length)]
          const possibleTitles = artifactTitles[randomType]
          const randomTitle = possibleTitles[Math.floor(Math.random() * possibleTitles.length)]
          
          const content = `Generated ${randomType} content for ${randomTitle}.\n\nThis is demo content created during work session simulation.\n\nTimestamp: ${new Date().toISOString()}`
          
          addArtifact(randomAgent.id, activeSession.id, {
            type: randomType,
            title: randomTitle,
            content,
            tags: [randomType, 'demo', 'generated'],
            size: content.length
          })
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Team Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Team</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{agents.length} agents</span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {teamMetrics.availableCount} available
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                {teamMetrics.busyCount} busy
              </span>
            </div>
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
          agents.map((agent) => {
            // Find tasks assigned to this agent
            const assignedTasks = mockTasks.filter(task => task.assignedAgent === agent.id)
            const currentTask = assignedTasks.find(task => 
              ['in-progress', 'review'].includes(task.status)
            )
            
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                status={statuses[agent.id] || AgentStatus.OFFLINE}
                stats={statistics[agent.id]}
                currentTask={currentTask}
                assignedTasksCount={assignedTasks.length}
                onConfigure={() => setConfigureAgent(agent.id)}
                onShowDetails={() => setDetailAgent(agent.id)}
              />
            )
          })
        )}
      </div>

      {/* Activity Monitor Section */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => setShowActivityMonitor(!showActivityMonitor)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span>Team Activity</span>
          <svg
            className={cn(
              'w-4 h-4 transition-transform',
              showActivityMonitor ? 'rotate-180' : ''
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showActivityMonitor && (
          <div className="px-4 pb-4">
            <AgentActivityMonitor maxLogs={5} />
          </div>
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
          
          {/* Demo Status Updates */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Demo Controls:</p>
            <div className="grid grid-cols-2 gap-1">
              <StatusDemoButton 
                label="Start Work" 
                onClick={() => simulateStatusChange(AgentStatus.WORKING)}
              />
              <StatusDemoButton 
                label="Thinking" 
                onClick={() => simulateStatusChange(AgentStatus.THINKING)}
              />
              <StatusDemoButton 
                label="Available" 
                onClick={() => simulateStatusChange(AgentStatus.IDLE)}
              />
              <StatusDemoButton 
                label="Error" 
                onClick={() => simulateStatusChange(AgentStatus.ERROR)}
              />
            </div>
            
            {/* Advanced Work Session Controls */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Work Sessions:</p>
              <div className="space-y-1">
                <StatusDemoButton 
                  label="🔄 Toggle Session" 
                  onClick={simulateWorkSession}
                />
                <StatusDemoButton 
                  label="📈 Progress Work" 
                  onClick={simulateWorkProgress}
                />
                <StatusDemoButton 
                  label="📁 Add Artifact" 
                  onClick={simulateArtifactCreation}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Configuration Modal */}
      {configureAgent && (
        <AgentConfigurationModal
          agent={agents.find(a => a.id === configureAgent)!}
          isOpen={!!configureAgent}
          onClose={() => setConfigureAgent(null)}
        />
      )}

      {/* Agent Detail Modal */}
      {detailAgent && (
        <AgentDetailModal
          agent={agents.find(a => a.id === detailAgent)!}
          isOpen={!!detailAgent}
          onClose={() => setDetailAgent(null)}
        />
      )}
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
  currentTask?: {
    id: string
    title: string
    type: string
    status: string
  }
  assignedTasksCount: number
  onConfigure: () => void
  onShowDetails: () => void
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, status, stats, currentTask, assignedTasksCount, onConfigure, onShowDetails }) => {
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

      {/* Current Task & Workload */}
      <div className="mb-3 space-y-2">
        {/* Workload Indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Workload</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-900">{assignedTasksCount}</span>
              <span className="text-gray-500">tasks</span>
            </div>
            <WorkloadIndicator taskCount={assignedTasksCount} />
          </div>
        </div>

        {/* Current Task */}
        {currentTask && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-blue-800">Currently Working</span>
            </div>
            <div className="text-xs text-blue-700">
              <span className="font-medium">{currentTask.title}</span>
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                {currentTask.type}
              </span>
            </div>
          </div>
        )}

        {/* Idle State */}
        {!currentTask && status === AgentStatus.IDLE && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium text-green-800">Available for Tasks</span>
            </div>
          </div>
        )}
      </div>

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
        <div className="grid grid-cols-3 gap-1">
          <button className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            Message
          </button>
          <button 
            onClick={onShowDetails}
            className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            title="View detailed agent information"
          >
            Details
          </button>
          <button 
            onClick={onConfigure}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            title="Configure agent settings"
          >
            ⚙️ Config
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Status Demo Button Component
// =============================================================================

interface StatusDemoButtonProps {
  label: string
  onClick: () => void
}

const StatusDemoButton: React.FC<StatusDemoButtonProps> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
    >
      {label}
    </button>
  )
}

// =============================================================================
// Workload Indicator Component
// =============================================================================

interface WorkloadIndicatorProps {
  taskCount: number
}

const WorkloadIndicator: React.FC<WorkloadIndicatorProps> = ({ taskCount }) => {
  const getWorkloadConfig = (count: number) => {
    if (count === 0) {
      return {
        color: 'bg-gray-300',
        label: 'No load',
        intensity: 0
      }
    } else if (count <= 2) {
      return {
        color: 'bg-green-500',
        label: 'Light load',
        intensity: 33
      }
    } else if (count <= 4) {
      return {
        color: 'bg-yellow-500',
        label: 'Moderate load',
        intensity: 66
      }
    } else {
      return {
        color: 'bg-red-500',
        label: 'Heavy load',
        intensity: 100
      }
    }
  }

  const workloadConfig = getWorkloadConfig(taskCount)

  return (
    <div className="flex items-center gap-1" title={workloadConfig.label}>
      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            'h-full transition-all duration-500',
            workloadConfig.color
          )}
          style={{ width: `${workloadConfig.intensity}%` }}
        />
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