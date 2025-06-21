/**
 * Agent Detail Modal Component
 * 
 * Epic 3 Story 3.3: Individual Agent Drill-Down Views
 * Detailed view of agent thinking, planning, and work progress
 */

import React, { useState, useMemo } from 'react'
import { useAgentStore, Agent, AgentActivityLog, AgentWorkSession, AgentArtifact, AgentThinkingStep } from '@/renderer/stores/agentStore'
import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'
import { cn } from '@/renderer/utils/cn'

// =============================================================================
// Agent Detail Modal Component
// =============================================================================

interface AgentDetailModalProps {
  agent: Agent
  isOpen: boolean
  onClose: () => void
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  isOpen,
  onClose
}) => {
  const { 
    statuses, 
    getAgentActivityLogs, 
    getActiveWorkSession,
    getWorkSessionHistory 
  } = useAgentStore()
  const [activeTab, setActiveTab] = useState<'current' | 'thinking' | 'history' | 'artifacts'>('current')

  // Get agent data
  const agentStatus = statuses[agent.id] || AgentStatus.OFFLINE
  const activityLogs = getAgentActivityLogs(agent.id, 20)
  
  // Get real work session data
  const activeWorkSession = getActiveWorkSession(agent.id)
  const workSessionHistory = getWorkSessionHistory(agent.id, 5)
  
  // Use real session or create mock for demonstration
  const currentSession = activeWorkSession || (workSessionHistory.length > 0 ? workSessionHistory[0] : createMockWorkSession(agent))

  const getAgentConfig = (type: AgentType) => {
    const configs = {
      [AgentType.PRODUCER]: {
        emoji: '👔',
        color: 'blue',
        role: 'Project Manager'
      },
      [AgentType.ARCHITECT]: {
        emoji: '🏗️',
        color: 'purple',
        role: 'Technical Architect'
      },
      [AgentType.ENGINEER]: {
        emoji: '⚡',
        color: 'green',
        role: 'Software Engineer'
      },
      [AgentType.QA]: {
        emoji: '🔍',
        color: 'orange',
        role: 'Quality Assurance'
      }
    }
    return configs[type]
  }

  const agentConfig = getAgentConfig(agent.type)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className={cn(
          'px-6 py-4 border-b border-gray-200',
          `bg-${agentConfig.color}-50`
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agentConfig.emoji}</span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {agent.name} - Detailed View
                  </h2>
                  <p className="text-sm text-gray-600">{agentConfig.role}</p>
                </div>
              </div>
              
              <AgentStatusIndicator status={agentStatus} />
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'current', label: 'Current Work', icon: '🔄' },
              { id: 'thinking', label: 'Thinking Process', icon: '🧠' },
              { id: 'history', label: 'Work History', icon: '📊' },
              { id: 'artifacts', label: 'Artifacts', icon: '📁' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? `border-${agentConfig.color}-500 text-${agentConfig.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
          {activeTab === 'current' && (
            <CurrentWorkTab session={currentSession} agent={agent} />
          )}
          {activeTab === 'thinking' && (
            <ThinkingProcessTab session={currentSession} />
          )}
          {activeTab === 'history' && (
            <WorkHistoryTab 
              activityLogs={activityLogs} 
              workSessions={workSessionHistory}
            />
          )}
          {activeTab === 'artifacts' && (
            <ArtifactsTab session={currentSession} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Export Data
              </button>
              <button
                onClick={onClose}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  `bg-${agentConfig.color}-600 text-white hover:bg-${agentConfig.color}-700`
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Agent Status Indicator Component
// =============================================================================

interface AgentStatusIndicatorProps {
  status: AgentStatus
}

const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ status }) => {
  const getStatusConfig = (status: AgentStatus) => {
    const configs = {
      [AgentStatus.IDLE]: {
        label: 'Available',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        dot: 'bg-green-500'
      },
      [AgentStatus.THINKING]: {
        label: 'Thinking',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        dot: 'bg-blue-500'
      },
      [AgentStatus.WORKING]: {
        label: 'Working',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        dot: 'bg-yellow-500'
      },
      [AgentStatus.WAITING]: {
        label: 'Waiting',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        dot: 'bg-gray-500'
      },
      [AgentStatus.ERROR]: {
        label: 'Error',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        dot: 'bg-red-500'
      },
      [AgentStatus.OFFLINE]: {
        label: 'Offline',
        color: 'text-gray-400',
        bgColor: 'bg-gray-100',
        dot: 'bg-gray-300'
      }
    }
    return configs[status]
  }

  const statusConfig = getStatusConfig(status)

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full',
      statusConfig.bgColor
    )}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        statusConfig.dot,
        [AgentStatus.THINKING, AgentStatus.WORKING].includes(status) && 'animate-pulse'
      )} />
      <span className={cn('text-sm font-medium', statusConfig.color)}>
        {statusConfig.label}
      </span>
    </div>
  )
}

// =============================================================================
// Current Work Tab Component
// =============================================================================

interface CurrentWorkTabProps {
  session: AgentWorkSession | null
  agent: Agent
}

const CurrentWorkTab: React.FC<CurrentWorkTabProps> = ({ session, agent }) => {
  if (!session) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😴</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Work Session</h3>
        <p className="text-gray-600">
          {agent.name} is currently idle. Assign a task to see their work progress here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900">Current Work Session</h3>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
            {session.currentPhase}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-blue-700 mb-1">
              <strong>Objective:</strong> {session.objective}
            </p>
            {session.taskTitle && (
              <p className="text-sm text-blue-700">
                <strong>Task:</strong> {session.taskTitle}
              </p>
            )}
          </div>
          
          <div>
            <p className="text-sm text-blue-700 mb-1">
              <strong>Started:</strong> {session.startTime.toLocaleString()}
            </p>
            <p className="text-sm text-blue-700">
              <strong>Duration:</strong> {formatDuration(session.startTime, new Date())}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-blue-700 mb-1">
            <span>Progress</span>
            <span>{session.progressPercentage}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${session.progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recent Thinking Steps */}
      <div>
        <h4 className="font-medium text-gray-900 mb-4">Recent Thoughts</h4>
        <div className="space-y-3">
          {session.thinkingSteps.slice(-3).map((step) => (
            <div key={step.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getThinkingIcon(step.type)}</span>
                  <span className="font-medium text-gray-900">{step.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {step.timestamp.toLocaleTimeString()}
                  </span>
                  <ConfidenceBar confidence={step.confidence} />
                </div>
              </div>
              <p className="text-sm text-gray-700">{step.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Current Phase Details */}
      <PhaseProgressIndicator session={session} />
    </div>
  )
}

// =============================================================================
// Thinking Process Tab Component
// =============================================================================

interface ThinkingProcessTabProps {
  session: AgentWorkSession | null
}

const ThinkingProcessTab: React.FC<ThinkingProcessTabProps> = ({ session }) => {
  if (!session) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🧠</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Thinking Process Active</h3>
        <p className="text-gray-600">
          Start a work session to see the agent's thinking process in real-time.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Complete Thinking Process</h3>
        <span className="text-sm text-gray-600">
          {session.thinkingSteps.length} steps recorded
        </span>
      </div>

      {/* Thinking Timeline */}
      <div className="relative">
        {session.thinkingSteps.map((step, index) => (
          <div key={step.id} className="flex gap-4 pb-6">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                getThinkingStepColor(step.type)
              )}>
                {getThinkingIcon(step.type)}
              </div>
              {index < session.thinkingSteps.length - 1 && (
                <div className="w-0.5 h-6 bg-gray-300 mt-2" />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{step.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {step.timestamp.toLocaleTimeString()}
                    </span>
                    <ConfidenceBar confidence={step.confidence} />
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">{step.content}</p>
                
                {step.metadata && (
                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(step.metadata).map(([key, value]) => (
                        <span key={key} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Work History Tab Component  
// =============================================================================

interface WorkHistoryTabProps {
  activityLogs: AgentActivityLog[]
  workSessions: AgentWorkSession[]
}

const WorkHistoryTab: React.FC<WorkHistoryTabProps> = ({ activityLogs, workSessions }) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all')

  const filteredLogs = useMemo(() => {
    const now = new Date()
    let cutoffDate: Date

    switch (filter) {
      case 'today':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        return activityLogs
    }

    return activityLogs.filter(log => log.timestamp >= cutoffDate)
  }, [activityLogs, filter])

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Activity History</h3>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All Time' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === option.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Work Sessions History */}
      {workSessions.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Recent Work Sessions</h4>
          <div className="space-y-3">
            {workSessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{session.objective}</h5>
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    session.status === 'completed' ? 'bg-green-100 text-green-700' :
                    session.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    session.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {session.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                  <div>Started: {session.startTime.toLocaleString()}</div>
                  {session.endTime && <div>Ended: {session.endTime.toLocaleString()}</div>}
                  <div>Progress: {session.progressPercentage}%</div>
                  <div>Phase: {session.currentPhase}</div>
                </div>
                
                {session.artifacts.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Artifacts: {session.artifacts.length} items
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <h4 className="text-lg font-medium text-gray-900 mb-1">No Activity</h4>
            <p className="text-gray-600">No activity recorded for the selected time period.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg flex-shrink-0 mt-0.5">
                {getActivityIcon(log.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{log.description}</p>
                <p className="text-xs text-gray-500">{log.timestamp.toLocaleString()}</p>
                {log.metadata && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <span key={key} className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Artifacts Tab Component
// =============================================================================

interface ArtifactsTabProps {
  session: AgentWorkSession | null
}

const ArtifactsTab: React.FC<ArtifactsTabProps> = ({ session }) => {
  if (!session || session.artifacts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📁</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Artifacts Generated</h3>
        <p className="text-gray-600">
          Artifacts like code, documents, and analyses will appear here as the agent works.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Generated Artifacts</h3>
        <span className="text-sm text-gray-600">
          {session.artifacts.length} artifacts
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {session.artifacts.map((artifact) => (
          <div key={artifact.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getArtifactIcon(artifact.type)}</span>
                <h4 className="font-medium text-gray-900">{artifact.title}</h4>
              </div>
              <span className="text-xs text-gray-500">
                {formatFileSize(artifact.size)}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
              {artifact.content.substring(0, 150)}...
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {artifact.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Helper Components
// =============================================================================

interface ConfidenceBarProps {
  confidence: number
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ confidence }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500'
    if (confidence >= 60) return 'bg-yellow-500'
    if (confidence >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn('h-full transition-all duration-300', getConfidenceColor(confidence))}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{confidence}%</span>
    </div>
  )
}

interface PhaseProgressIndicatorProps {
  session: AgentWorkSession
}

const PhaseProgressIndicator: React.FC<PhaseProgressIndicatorProps> = ({ session }) => {
  const phases = [
    { id: 'initializing', label: 'Initializing', icon: '🔄' },
    { id: 'analyzing', label: 'Analyzing', icon: '🔍' },
    { id: 'planning', label: 'Planning', icon: '📋' },
    { id: 'implementing', label: 'Implementing', icon: '⚡' },
    { id: 'reviewing', label: 'Reviewing', icon: '✅' },
    { id: 'completed', label: 'Completed', icon: '🎉' }
  ]

  const currentPhaseIndex = phases.findIndex(p => p.id === session.currentPhase)

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-4">Work Progress</h4>
      
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm mb-2',
              index <= currentPhaseIndex
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-500'
            )}>
              {phase.icon}
            </div>
            <span className={cn(
              'text-xs text-center',
              index <= currentPhaseIndex ? 'text-blue-600 font-medium' : 'text-gray-500'
            )}>
              {phase.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

function getThinkingIcon(type: AgentThinkingStep['type']): string {
  const icons = {
    analysis: '🔍',
    planning: '📋',
    decision: '⚖️',
    execution: '⚡',
    reflection: '🤔'
  }
  return icons[type]
}

function getThinkingStepColor(type: AgentThinkingStep['type']): string {
  const colors = {
    analysis: 'bg-blue-100 text-blue-600',
    planning: 'bg-purple-100 text-purple-600',
    decision: 'bg-yellow-100 text-yellow-600',
    execution: 'bg-green-100 text-green-600',
    reflection: 'bg-gray-100 text-gray-600'
  }
  return colors[type]
}

function getActivityIcon(type: AgentActivityLog['type']): string {
  const icons = {
    status_change: '🔄',
    task_assignment: '📋',
    interaction: '💬',
    error: '❌'
  }
  return icons[type]
}

function getArtifactIcon(type: AgentArtifact['type']): string {
  const icons = {
    code: '💻',
    document: '📄',
    analysis: '📊',
    plan: '📋',
    test: '🧪',
    review: '✅'
  }
  return icons[type]
}

function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`
  }
  return `${diffMins}m`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} chars`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function createMockWorkSession(agent: Agent): AgentWorkSession {
  const now = new Date()
  const startTime = new Date(now.getTime() - 45 * 60 * 1000) // 45 minutes ago
  const sessionId = `session-${agent.id}-${Date.now()}`

  return {
    id: sessionId,
    agentId: agent.id,
    startTime,
    status: 'active',
    taskId: 'task-123',
    taskTitle: 'Implement user authentication system',
    objective: 'Design and implement secure user authentication with JWT tokens',
    progressPercentage: 65,
    currentPhase: 'implementing',
    thinkingSteps: [
      {
        id: '1',
        timestamp: new Date(startTime.getTime() + 5 * 60 * 1000),
        type: 'analysis',
        title: 'Analyzing authentication requirements',
        content: 'Need to implement secure JWT-based authentication with refresh tokens. Security requirements include password hashing, session management, and RBAC.',
        confidence: 85,
        metadata: { complexity: 'medium', dependencies: 'jwt, bcrypt' }
      },
      {
        id: '2',
        timestamp: new Date(startTime.getTime() + 15 * 60 * 1000),
        type: 'planning',
        title: 'Planning authentication architecture',
        content: 'Will implement a 3-layer approach: authentication middleware, user service, and token management. Using bcrypt for password hashing and JWT for tokens.',
        confidence: 92,
        metadata: { approach: 'layered', security_level: 'high' }
      },
      {
        id: '3',
        timestamp: new Date(startTime.getTime() + 25 * 60 * 1000),
        type: 'execution',
        title: 'Implementing JWT token service',
        content: 'Creating token generation and validation functions. Implementing both access tokens (15min) and refresh tokens (7 days) with proper secret management.',
        confidence: 78,
        metadata: { component: 'token-service', progress: '60%' }
      },
      {
        id: '4',
        timestamp: new Date(startTime.getTime() + 40 * 60 * 1000),
        type: 'decision',
        title: 'Choosing password complexity rules',
        content: 'Implementing minimum 8 characters with mixed case, numbers, and special characters. Adding password strength meter on frontend.',
        confidence: 88,
        metadata: { security_impact: 'high', user_experience: 'good' }
      }
    ],
    artifacts: [
      {
        id: 'art-1',
        sessionId,
        type: 'code',
        title: 'auth.service.ts',
        content: 'export class AuthService {\n  async generateToken(user: User): Promise<string> {\n    // JWT token generation logic\n  }\n}',
        createdAt: new Date(startTime.getTime() + 20 * 60 * 1000),
        updatedAt: new Date(startTime.getTime() + 35 * 60 * 1000),
        tags: ['typescript', 'authentication', 'jwt'],
        size: 1250
      },
      {
        id: 'art-2',
        sessionId,
        type: 'plan',
        title: 'Authentication Implementation Plan',
        content: '1. Token Service\n2. User Model\n3. Authentication Middleware\n4. Password Validation\n5. Session Management',
        createdAt: new Date(startTime.getTime() + 10 * 60 * 1000),
        updatedAt: new Date(startTime.getTime() + 10 * 60 * 1000),
        tags: ['planning', 'architecture'],
        size: 486
      },
      {
        id: 'art-3',
        sessionId,
        type: 'test',
        title: 'auth.service.test.ts',
        content: 'describe("AuthService", () => {\n  it("should generate valid JWT tokens", () => {\n    // Test implementation\n  });\n});',
        createdAt: new Date(startTime.getTime() + 30 * 60 * 1000),
        updatedAt: new Date(startTime.getTime() + 30 * 60 * 1000),
        tags: ['testing', 'jest', 'authentication'],
        size: 324
      }
    ]
  }
}