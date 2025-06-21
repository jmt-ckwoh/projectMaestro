/**
 * Agent Store - AI Agent State Management
 * 
 * Manages AI agent personas, their states, and coordination.
 * Follows the store architecture rules defined in STORE_ARCHITECTURE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'

// =============================================================================
// Agent Types
// =============================================================================

export interface AgentConfiguration {
  // Personality Settings
  communicationStyle: 'formal' | 'casual' | 'friendly' | 'professional'
  verbosity: 'concise' | 'balanced' | 'verbose'
  autonomyLevel: 'low' | 'medium' | 'high'
  questionFrequency: 'minimal' | 'normal' | 'frequent'
  
  // Behavior Preferences  
  proactiveness: number // 0-100 scale
  creativity: number // 0-100 scale
  riskTolerance: number // 0-100 scale
  
  // Advanced Settings
  customSystemPrompt?: string
  maxResponseLength?: number
  temperatureSetting?: number // 0-1 scale for AI temperature
  
  // Workflow Preferences
  workingHours?: {
    enabled: boolean
    startTime: string // HH:MM format
    endTime: string // HH:MM format
    timezone: string
  }
  
  // Notification Settings
  notifications: {
    statusChanges: boolean
    taskAssignments: boolean
    completions: boolean
    errors: boolean
  }
}

export interface Agent {
  id: string
  name: string
  type: AgentType
  description: string
  isActive: boolean
  capabilities: string[]
  systemPrompt?: string
  configuration: AgentConfiguration
  lastActive: Date
  createdAt: Date
}

export interface AgentStatistics {
  tasksCompleted: number
  averageResponseTime: number
  lastActive: Date
  successRate: number
  totalInteractions: number
}

export interface AgentStatusChange {
  id: string
  agentId: string
  fromStatus: AgentStatus
  toStatus: AgentStatus
  timestamp: Date
  reason?: string
  context?: Record<string, any>
}

export interface AgentActivityLog {
  id: string
  agentId: string
  type: 'status_change' | 'task_assignment' | 'interaction' | 'error'
  description: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AgentThinkingStep {
  id: string
  timestamp: Date
  type: 'analysis' | 'planning' | 'decision' | 'execution' | 'reflection'
  title: string
  content: string
  confidence: number // 0-100
  relatedTaskId?: string
  metadata?: Record<string, any>
}

export interface AgentWorkSession {
  id: string
  agentId: string
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  taskId?: string
  taskTitle?: string
  objective: string
  progressPercentage: number
  currentPhase: 'initializing' | 'analyzing' | 'planning' | 'implementing' | 'reviewing' | 'completed'
  artifacts: AgentArtifact[]
  thinkingSteps: AgentThinkingStep[]
}

export interface AgentArtifact {
  id: string
  sessionId: string
  type: 'code' | 'document' | 'analysis' | 'plan' | 'test' | 'review'
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  tags: string[]
  size: number
}

export interface AgentState {
  agents: Agent[]
  statuses: Record<string, AgentStatus>
  statistics: Record<string, AgentStatistics>
  statusHistory: AgentStatusChange[]
  activityLogs: AgentActivityLog[]
  workSessions: Record<string, AgentWorkSession[]> // agentId -> sessions
  activeWorkSessions: Record<string, string> // agentId -> sessionId
  statusChangeListeners: Set<(change: AgentStatusChange) => void>
  isInitialized: boolean
}

// =============================================================================
// Agent Actions
// =============================================================================

export interface AgentActions {
  // Agent Management
  initializeDefaultTeam: () => Promise<void>
  addAgent: (agentConfig: Omit<Agent, 'id' | 'lastActive' | 'createdAt' | 'configuration'>) => Promise<string>
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  
  // Status Management
  updateAgentStatus: (agentId: string, status: AgentStatus, reason?: string, context?: Record<string, any>) => void
  getAgentStatus: (agentId: string) => AgentStatus
  
  // Status History and Activity Tracking
  getAgentStatusHistory: (agentId: string) => AgentStatusChange[]
  getAgentActivityLogs: (agentId: string, limit?: number) => AgentActivityLog[]
  addActivityLog: (log: Omit<AgentActivityLog, 'id' | 'timestamp'>) => void
  subscribeToStatusChanges: (listener: (change: AgentStatusChange) => void) => () => void
  clearAgentHistory: (agentId: string) => void
  
  // Statistics
  updateAgentStats: (agentId: string, updates: Partial<AgentStatistics>) => void
  
  // Team Coordination
  getAvailableAgents: () => Agent[]
  getBusyAgents: () => Agent[]
  getAgentByType: (type: AgentType) => Agent | undefined
  
  // Agent Configuration
  updateAgentConfiguration: (agentId: string, config: Partial<AgentConfiguration>) => void
  resetAgentConfiguration: (agentId: string) => void
  getAgentConfiguration: (agentId: string) => AgentConfiguration | null
  exportAgentConfiguration: (agentId: string) => string | null
  importAgentConfiguration: (agentId: string, configJson: string) => boolean
  
  // Work Session Management
  startWorkSession: (agentId: string, objective: string, taskId?: string, taskTitle?: string) => string
  endWorkSession: (agentId: string, sessionId: string) => void
  pauseWorkSession: (agentId: string, sessionId: string) => void
  resumeWorkSession: (agentId: string, sessionId: string) => void
  updateWorkProgress: (agentId: string, sessionId: string, progress: number, phase?: AgentWorkSession['currentPhase']) => void
  addArtifact: (agentId: string, sessionId: string, artifact: Omit<AgentArtifact, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>) => string
  addThinkingStep: (agentId: string, sessionId: string, step: Omit<AgentThinkingStep, 'id' | 'timestamp'>) => string
  getActiveWorkSession: (agentId: string) => AgentWorkSession | null
  getWorkSessionHistory: (agentId: string, limit?: number) => AgentWorkSession[]
  
  // Persistence
  saveAgentState: () => Promise<void>
  loadAgentState: () => Promise<void>
}

// =============================================================================
// Default Configuration Helper
// =============================================================================

const createDefaultAgentConfiguration = (): AgentConfiguration => ({
  // Personality Settings
  communicationStyle: 'professional',
  verbosity: 'balanced',
  autonomyLevel: 'medium',
  questionFrequency: 'normal',
  
  // Behavior Preferences  
  proactiveness: 50,
  creativity: 50,
  riskTolerance: 30,
  
  // Advanced Settings
  maxResponseLength: 2000,
  temperatureSetting: 0.7,
  
  // Workflow Preferences
  workingHours: {
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'UTC'
  },
  
  // Notification Settings
  notifications: {
    statusChanges: true,
    taskAssignments: true,
    completions: true,
    errors: true
  }
})

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_AGENT_STATE: AgentState = {
  agents: [],
  statuses: {},
  statistics: {},
  statusHistory: [],
  activityLogs: [],
  workSessions: {},
  activeWorkSessions: {},
  statusChangeListeners: new Set(),
  isInitialized: false
}

// =============================================================================
// Agent Store Implementation
// =============================================================================

export const useAgentStore = create<AgentState & AgentActions>()(
  immer((set, get) => ({
    ...DEFAULT_AGENT_STATE,

    // =============================================================================
    // Agent Management
    // =============================================================================

    initializeDefaultTeam: async () => {
      const defaultAgents: Omit<Agent, 'id' | 'lastActive' | 'createdAt' | 'configuration'>[] = [
        {
          name: 'Producer',
          type: AgentType.PRODUCER,
          description: 'Project manager and facilitator. Helps organize tasks and coordinate the team.',
          isActive: true,
          capabilities: ['project_management', 'task_coordination', 'user_interaction'],
          systemPrompt: 'You are a helpful project manager focused on facilitating development and keeping projects organized.'
        },
        {
          name: 'Architect',
          type: AgentType.ARCHITECT,
          description: 'System designer and technical strategist. Designs architecture and selects technologies.',
          isActive: true,
          capabilities: ['system_design', 'technology_selection', 'documentation'],
          systemPrompt: 'You are a technical architect focused on designing scalable and maintainable systems.'
        },
        {
          name: 'Engineer',
          type: AgentType.ENGINEER,
          description: 'Code generator and implementer. Writes clean, maintainable code based on specifications.',
          isActive: true,
          capabilities: ['code_generation', 'implementation', 'debugging'],
          systemPrompt: 'You are a skilled software engineer focused on writing clean, efficient, and maintainable code.'
        },
        {
          name: 'QA',
          type: AgentType.QA,
          description: 'Quality assurance specialist. Tests code, finds bugs, and ensures quality standards.',
          isActive: true,
          capabilities: ['testing', 'bug_detection', 'quality_assurance'],
          systemPrompt: 'You are a quality assurance engineer focused on testing and ensuring code quality.'
        }
      ]

      set((state) => {
        state.agents = defaultAgents.map((agent, index) => ({
          ...agent,
          id: `agent-${agent.type.toLowerCase()}-${Date.now()}-${index}`,
          configuration: createDefaultAgentConfiguration(),
          lastActive: new Date(),
          createdAt: new Date()
        }))
        
        // Initialize all agents as idle
        state.agents.forEach(agent => {
          state.statuses[agent.id] = AgentStatus.IDLE
          state.statistics[agent.id] = {
            tasksCompleted: 0,
            averageResponseTime: 0,
            lastActive: new Date(),
            successRate: 100,
            totalInteractions: 0
          }
        })
        
        state.isInitialized = true
      })

      try {
        await window.api.initializeAgentTeam(get().agents)
      } catch (error) {
        console.error('Failed to initialize agent team:', error)
      }
    },

    addAgent: async (agentConfig) => {
      const agentId = `agent-${agentConfig.type.toLowerCase()}-${Date.now()}`
      
      const newAgent: Agent = {
        ...agentConfig,
        id: agentId,
        configuration: createDefaultAgentConfiguration(),
        lastActive: new Date(),
        createdAt: new Date()
      }

      set((state) => {
        state.agents.push(newAgent)
        state.statuses[agentId] = AgentStatus.IDLE
        state.statistics[agentId] = {
          tasksCompleted: 0,
          averageResponseTime: 0,
          lastActive: new Date(),
          successRate: 100,
          totalInteractions: 0
        }
      })

      try {
        await window.api.addAgent(newAgent)
      } catch (error) {
        console.error('Failed to add agent:', error)
        // Rollback on failure
        set((state) => {
          const index = state.agents.findIndex(a => a.id === agentId)
          if (index > -1) {
            state.agents.splice(index, 1)
            delete state.statuses[agentId]
            delete state.statistics[agentId]
          }
        })
        throw error
      }

      return agentId
    },

    updateAgent: (id, updates) => {
      set((state) => {
        const agent = state.agents.find(a => a.id === id)
        if (agent) {
          Object.assign(agent, updates)
          agent.lastActive = new Date()
        }
      })
    },

    removeAgent: (id) => {
      set((state) => {
        const index = state.agents.findIndex(a => a.id === id)
        if (index > -1) {
          state.agents.splice(index, 1)
          delete state.statuses[id]
          delete state.statistics[id]
        }
      })
    },

    // =============================================================================
    // Status Management
    // =============================================================================

    updateAgentStatus: (agentId, status, reason, context) => {
      set((state) => {
        const currentStatus = state.statuses[agentId] || AgentStatus.OFFLINE
        
        // Only update if status actually changed
        if (currentStatus !== status) {
          // Create status change record
          const statusChange: AgentStatusChange = {
            id: `status-change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            fromStatus: currentStatus,
            toStatus: status,
            timestamp: new Date(),
            reason,
            context
          }
          
          // Update status
          state.statuses[agentId] = status
          
          // Add to history
          state.statusHistory.push(statusChange)
          
          // Add activity log
          const agent = state.agents.find(a => a.id === agentId)
          const agentName = agent?.name || 'Unknown Agent'
          
          state.activityLogs.push({
            id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            type: 'status_change',
            description: `${agentName} changed from ${currentStatus} to ${status}${reason ? ` (${reason})` : ''}`,
            timestamp: new Date(),
            metadata: { fromStatus: currentStatus, toStatus: status, reason, context }
          })
          
          // Update last active time
          if (agent) {
            agent.lastActive = new Date()
          }
          
          // Update statistics
          if (state.statistics[agentId]) {
            state.statistics[agentId].lastActive = new Date()
            state.statistics[agentId].totalInteractions += 1
          }
          
          // Notify listeners (outside of immer state update)
          setTimeout(() => {
            state.statusChangeListeners.forEach(listener => listener(statusChange))
          }, 0)
        }
      })
    },

    getAgentStatus: (agentId) => {
      return get().statuses[agentId] || AgentStatus.OFFLINE
    },

    // =============================================================================
    // Status History and Activity Tracking
    // =============================================================================

    getAgentStatusHistory: (agentId) => {
      const state = get()
      return state.statusHistory
        .filter(change => change.agentId === agentId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    },

    getAgentActivityLogs: (agentId, limit = 50) => {
      const state = get()
      return state.activityLogs
        .filter(log => log.agentId === agentId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
    },

    addActivityLog: (logData) => {
      set((state) => {
        const log: AgentActivityLog = {
          ...logData,
          id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        }
        state.activityLogs.push(log)
        
        // Keep only last 1000 logs to prevent memory issues
        if (state.activityLogs.length > 1000) {
          state.activityLogs = state.activityLogs.slice(-1000)
        }
      })
    },

    subscribeToStatusChanges: (listener) => {
      const state = get()
      state.statusChangeListeners.add(listener)
      
      // Return unsubscribe function
      return () => {
        state.statusChangeListeners.delete(listener)
      }
    },

    clearAgentHistory: (agentId) => {
      set((state) => {
        state.statusHistory = state.statusHistory.filter(change => change.agentId !== agentId)
        state.activityLogs = state.activityLogs.filter(log => log.agentId !== agentId)
      })
    },

    // =============================================================================
    // Statistics
    // =============================================================================

    updateAgentStats: (agentId, updates) => {
      set((state) => {
        if (state.statistics[agentId]) {
          Object.assign(state.statistics[agentId], updates)
          state.statistics[agentId].lastActive = new Date()
        }
      })
    },

    // =============================================================================
    // Team Coordination
    // =============================================================================

    getAvailableAgents: () => {
      const state = get()
      return state.agents.filter(agent => 
        agent.isActive && state.statuses[agent.id] === AgentStatus.IDLE
      )
    },

    getBusyAgents: () => {
      const state = get()
      return state.agents.filter(agent => 
        agent.isActive && [AgentStatus.THINKING, AgentStatus.WORKING].includes(state.statuses[agent.id])
      )
    },

    getAgentByType: (type) => {
      const state = get()
      return state.agents.find(agent => agent.type === type)
    },

    // =============================================================================
    // Agent Configuration
    // =============================================================================

    updateAgentConfiguration: (agentId, configUpdates) => {
      set((state) => {
        const agent = state.agents.find(a => a.id === agentId)
        if (agent) {
          agent.configuration = { ...agent.configuration, ...configUpdates }
          agent.lastActive = new Date()
          
          // Log configuration change
          state.activityLogs.push({
            id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            type: 'interaction',
            description: `${agent.name} configuration updated`,
            timestamp: new Date(),
            metadata: { configChanges: Object.keys(configUpdates) }
          })
        }
      })
    },

    resetAgentConfiguration: (agentId) => {
      set((state) => {
        const agent = state.agents.find(a => a.id === agentId)
        if (agent) {
          agent.configuration = createDefaultAgentConfiguration()
          agent.lastActive = new Date()
          
          // Log configuration reset
          state.activityLogs.push({
            id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            type: 'interaction',
            description: `${agent.name} configuration reset to defaults`,
            timestamp: new Date()
          })
        }
      })
    },

    getAgentConfiguration: (agentId) => {
      const state = get()
      const agent = state.agents.find(a => a.id === agentId)
      return agent?.configuration || null
    },

    exportAgentConfiguration: (agentId) => {
      const state = get()
      const agent = state.agents.find(a => a.id === agentId)
      if (agent) {
        try {
          return JSON.stringify({
            agentType: agent.type,
            agentName: agent.name,
            configuration: agent.configuration,
            exportedAt: new Date().toISOString(),
            version: '1.0'
          }, null, 2)
        } catch (error) {
          console.error('Failed to export agent configuration:', error)
          return null
        }
      }
      return null
    },

    importAgentConfiguration: (agentId, configJson) => {
      try {
        const importData = JSON.parse(configJson)
        
        // Validate import data structure
        if (!importData.configuration || !importData.agentType) {
          return false
        }
        
        const state = get()
        const agent = state.agents.find(a => a.id === agentId)
        
        if (agent && agent.type === importData.agentType) {
          set((draft) => {
            const targetAgent = draft.agents.find(a => a.id === agentId)
            if (targetAgent) {
              targetAgent.configuration = {
                ...createDefaultAgentConfiguration(),
                ...importData.configuration
              }
              targetAgent.lastActive = new Date()
              
              // Log configuration import
              draft.activityLogs.push({
                id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                agentId,
                type: 'interaction',
                description: `${targetAgent.name} configuration imported`,
                timestamp: new Date(),
                metadata: { importSource: importData.agentName }
              })
            }
          })
          return true
        }
        return false
      } catch (error) {
        console.error('Failed to import agent configuration:', error)
        return false
      }
    },

    // =============================================================================
    // Work Session Management
    // =============================================================================

    startWorkSession: (agentId, objective, taskId, taskTitle) => {
      const sessionId = `session-${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      set((state) => {
        const newSession: AgentWorkSession = {
          id: sessionId,
          agentId,
          startTime: new Date(),
          status: 'active',
          taskId,
          taskTitle,
          objective,
          progressPercentage: 0,
          currentPhase: 'initializing',
          artifacts: [],
          thinkingSteps: []
        }

        // Initialize sessions array if needed
        if (!state.workSessions[agentId]) {
          state.workSessions[agentId] = []
        }

        // Add new session
        state.workSessions[agentId].push(newSession)
        state.activeWorkSessions[agentId] = sessionId

        // Update agent status
        state.statuses[agentId] = AgentStatus.WORKING

        // Log activity
        const agent = state.agents.find(a => a.id === agentId)
        if (agent) {
          state.activityLogs.push({
            id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            type: 'task_assignment',
            description: `${agent.name} started work session: ${objective}`,
            timestamp: new Date(),
            metadata: { sessionId, taskId, taskTitle }
          })
        }
      })

      return sessionId
    },

    endWorkSession: (agentId, sessionId) => {
      set((state) => {
        const sessions = state.workSessions[agentId]
        if (sessions) {
          const session = sessions.find(s => s.id === sessionId)
          if (session) {
            session.status = 'completed'
            session.endTime = new Date()
            session.progressPercentage = 100
            session.currentPhase = 'completed'
          }
        }

        // Clear active session
        if (state.activeWorkSessions[agentId] === sessionId) {
          delete state.activeWorkSessions[agentId]
          state.statuses[agentId] = AgentStatus.IDLE
        }

        // Log activity
        const agent = state.agents.find(a => a.id === agentId)
        if (agent) {
          state.activityLogs.push({
            id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId,
            type: 'interaction',
            description: `${agent.name} completed work session`,
            timestamp: new Date(),
            metadata: { sessionId, action: 'completed' }
          })
        }
      })
    },

    pauseWorkSession: (agentId, sessionId) => {
      set((state) => {
        const sessions = state.workSessions[agentId]
        if (sessions) {
          const session = sessions.find(s => s.id === sessionId)
          if (session) {
            session.status = 'paused'
          }
        }

        // Update agent status
        if (state.activeWorkSessions[agentId] === sessionId) {
          state.statuses[agentId] = AgentStatus.WAITING
        }
      })
    },

    resumeWorkSession: (agentId, sessionId) => {
      set((state) => {
        const sessions = state.workSessions[agentId]
        if (sessions) {
          const session = sessions.find(s => s.id === sessionId)
          if (session) {
            session.status = 'active'
          }
        }

        // Update agent status
        if (state.activeWorkSessions[agentId] === sessionId) {
          state.statuses[agentId] = AgentStatus.WORKING
        }
      })
    },

    updateWorkProgress: (agentId, sessionId, progress, phase) => {
      set((state) => {
        const sessions = state.workSessions[agentId]
        if (sessions) {
          const session = sessions.find(s => s.id === sessionId)
          if (session) {
            session.progressPercentage = Math.min(100, Math.max(0, progress))
            if (phase) {
              session.currentPhase = phase
            }
          }
        }
      })
    },

    addArtifact: (agentId, sessionId, artifactData) => {
      const artifactId = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      set((state) => {
        const sessions = state.workSessions[agentId]
        if (sessions) {
          const session = sessions.find(s => s.id === sessionId)
          if (session) {
            const newArtifact: AgentArtifact = {
              ...artifactData,
              id: artifactId,
              sessionId,
              createdAt: new Date(),
              updatedAt: new Date()
            }
            session.artifacts.push(newArtifact)

            // Log artifact creation
            const agent = state.agents.find(a => a.id === agentId)
            if (agent) {
              state.activityLogs.push({
                id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                agentId,
                type: 'interaction',
                description: `${agent.name} created artifact: ${artifactData.title}`,
                timestamp: new Date(),
                metadata: { artifactId, artifactType: artifactData.type, sessionId }
              })
            }
          }
        }
      })

      return artifactId
    },

    addThinkingStep: (agentId, sessionId, stepData) => {
      const stepId = `thinking-step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      set((state) => {
        const sessions = state.workSessions[agentId]
        if (sessions) {
          const session = sessions.find(s => s.id === sessionId)
          if (session) {
            const newThinkingStep: AgentThinkingStep = {
              ...stepData,
              id: stepId,
              timestamp: new Date()
            }
            session.thinkingSteps.push(newThinkingStep)

            // Log thinking step creation
            const agent = state.agents.find(a => a.id === agentId)
            if (agent) {
              state.activityLogs.push({
                id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                agentId,
                type: 'interaction',
                description: `${agent.name} recorded thinking step: ${stepData.title}`,
                timestamp: new Date(),
                metadata: { stepId, stepType: stepData.type, sessionId, confidence: stepData.confidence }
              })
            }
          }
        }
      })

      return stepId
    },

    getActiveWorkSession: (agentId) => {
      const state = get()
      const activeSessionId = state.activeWorkSessions[agentId]
      if (!activeSessionId) return null

      const sessions = state.workSessions[agentId]
      return sessions?.find(s => s.id === activeSessionId) || null
    },

    getWorkSessionHistory: (agentId, limit = 10) => {
      const state = get()
      const sessions = state.workSessions[agentId] || []
      return sessions
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .slice(0, limit)
    },

    // =============================================================================
    // Persistence
    // =============================================================================

    saveAgentState: async () => {
      try {
        const state = get()
        await window.api.saveAgentState({
          agents: state.agents,
          statuses: state.statuses,
          statistics: state.statistics,
          statusHistory: state.statusHistory.slice(-500), // Only save last 500 status changes
          activityLogs: state.activityLogs.slice(-500), // Only save last 500 activity logs
          workSessions: Object.fromEntries(
            Object.entries(state.workSessions).map(([agentId, sessions]) => [
              agentId,
              sessions.slice(-10) // Only save last 10 sessions per agent
            ])
          ),
          activeWorkSessions: state.activeWorkSessions,
          isInitialized: state.isInitialized
        })
      } catch (error) {
        console.error('Failed to save agent state:', error)
      }
    },

    loadAgentState: async () => {
      try {
        const saved = await window.api.loadAgentState()
        if (saved) {
          set((state) => {
            state.agents = saved.agents || []
            state.statuses = saved.statuses || {}
            state.statistics = saved.statistics || {}
            state.statusHistory = saved.statusHistory || []
            state.activityLogs = saved.activityLogs || []
            state.workSessions = saved.workSessions || {}
            state.activeWorkSessions = saved.activeWorkSessions || {}
            state.isInitialized = saved.isInitialized || false
            // Note: statusChangeListeners is not persisted, it's runtime only
          })
        }
      } catch (error) {
        console.error('Failed to load agent state:', error)
      }
    }
  }))
)

// =============================================================================
// Agent Store Selectors
// =============================================================================

export const useAgents = () => useAgentStore(state => state.agents)
export const useAgentStatuses = () => useAgentStore(state => state.statuses)
export const useAgentStatistics = () => useAgentStore(state => state.statistics)
export const useAgentStatusHistory = () => useAgentStore(state => state.statusHistory)
export const useAgentActivityLogs = () => useAgentStore(state => state.activityLogs)
export const useIsTeamInitialized = () => useAgentStore(state => state.isInitialized)

// =============================================================================
// Auto-save Agent State
// =============================================================================

// Save agent state when it changes
useAgentStore.subscribe(() => {
  // Debounce saves
  const timeoutId = setTimeout(() => {
    useAgentStore.getState().saveAgentState()
  }, 1000)
  
  return () => clearTimeout(timeoutId)
})

// Load agent state on initialization
if (typeof window !== 'undefined') {
  useAgentStore.getState().loadAgentState()
}