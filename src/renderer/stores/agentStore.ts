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

export interface Agent {
  id: string
  name: string
  type: AgentType
  description: string
  isActive: boolean
  capabilities: string[]
  systemPrompt?: string
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

export interface AgentState {
  agents: Agent[]
  statuses: Record<string, AgentStatus>
  statistics: Record<string, AgentStatistics>
  isInitialized: boolean
}

// =============================================================================
// Agent Actions
// =============================================================================

export interface AgentActions {
  // Agent Management
  initializeDefaultTeam: () => Promise<void>
  addAgent: (agentConfig: Omit<Agent, 'id' | 'lastActive' | 'createdAt'>) => Promise<string>
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  
  // Status Management
  updateAgentStatus: (agentId: string, status: AgentStatus) => void
  getAgentStatus: (agentId: string) => AgentStatus
  
  // Statistics
  updateAgentStats: (agentId: string, updates: Partial<AgentStatistics>) => void
  
  // Team Coordination
  getAvailableAgents: () => Agent[]
  getBusyAgents: () => Agent[]
  
  // Persistence
  saveAgentState: () => Promise<void>
  loadAgentState: () => Promise<void>
}

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_AGENT_STATE: AgentState = {
  agents: [],
  statuses: {},
  statistics: {},
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
      const defaultAgents: Omit<Agent, 'id' | 'lastActive' | 'createdAt'>[] = [
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

    updateAgentStatus: (agentId, status) => {
      set((state) => {
        state.statuses[agentId] = status
        
        // Update last active time
        const agent = state.agents.find(a => a.id === agentId)
        if (agent) {
          agent.lastActive = new Date()
        }
        
        // Update statistics
        if (state.statistics[agentId]) {
          state.statistics[agentId].lastActive = new Date()
        }
      })
    },

    getAgentStatus: (agentId) => {
      return get().statuses[agentId] || AgentStatus.OFFLINE
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
            state.isInitialized = saved.isInitialized || false
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
export const useIsTeamInitialized = () => useAgentStore(state => state.isInitialized)

// =============================================================================
// Auto-save Agent State
// =============================================================================

// Save agent state when it changes
useAgentStore.subscribe(
  (state) => ({ agents: state.agents, statuses: state.statuses, statistics: state.statistics }),
  () => {
    // Debounce saves
    const timeoutId = setTimeout(() => {
      useAgentStore.getState().saveAgentState()
    }, 1000)
    
    return () => clearTimeout(timeoutId)
  }
)

// Load agent state on initialization
if (typeof window !== 'undefined') {
  useAgentStore.getState().loadAgentState()
}