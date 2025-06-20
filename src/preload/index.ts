/**
 * Electron Preload Script
 * 
 * The secure bridge between renderer and main process.
 * This is the ONLY place where contextBridge should be used.
 */

import { contextBridge, ipcRenderer } from 'electron'

// =============================================================================
// Type Definitions
// =============================================================================

export interface ElectronAPI {
  // App information
  getAppInfo: () => Promise<AppInfo>
  checkHealth: () => Promise<HealthStatus>
  
  // Project management
  createProject: (data: CreateProjectInput) => Promise<Project>
  getProjects: () => Promise<Project[]>
  getProject: (id: string) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  
  // Agent communication
  sendMessage: (data: SendMessageInput) => Promise<AgentResponse>
  sendChatMessage: (data: any) => Promise<any>
  getAgentStatus: (agentType: AgentType) => Promise<AgentStatus>
  getAllAgentStatuses: () => Promise<Record<AgentType, AgentStatus>>
  
  // Agent management
  initializeAgentTeam: (agents: any[]) => Promise<void>
  addAgent: (agent: any) => Promise<void>
  saveAgentState: (state: any) => Promise<void>
  loadAgentState: () => Promise<any>
  
  // Chat management
  saveChatHistory: (history: any) => Promise<void>
  loadChatHistory: () => Promise<any>
  
  // UI state management
  saveUIState: (state: any) => Promise<void>
  loadUIState: () => Promise<any>
  
  // Project state management
  saveProjectState: (state: any) => Promise<void>
  loadProjectState: () => Promise<any>
  
  // File operations
  readFile: (projectId: string, path: string) => Promise<string>
  writeFile: (projectId: string, path: string, content: string) => Promise<void>
  getFileTree: (projectId: string) => Promise<FileNode>
  
  // Memory operations
  addMemory: (data: AddMemoryInput) => Promise<Memory>
  searchMemories: (query: string, options?: SearchOptions) => Promise<Memory[]>
  
  // Git operations
  createCheckpoint: (projectId: string, message: string) => Promise<Checkpoint>
  getCheckpoints: (projectId: string) => Promise<Checkpoint[]>
  restoreCheckpoint: (projectId: string, checkpointId: string) => Promise<void>
  
  // Configuration
  updateAIConfig: (config: AIConfig) => Promise<void>
  getAIConfig: () => Promise<AIConfig>
  
  // Event subscriptions
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}

// =============================================================================
// Safe IPC Wrapper
// =============================================================================

const createSafeInvoke = (channel: string) => {
  return (...args: any[]) => {
    try {
      return ipcRenderer.invoke(channel, ...args)
    } catch (error) {
      console.error(`IPC invoke failed for channel ${channel}:`, error)
      throw error
    }
  }
}

const createSafeListener = () => {
  const listeners = new Map<string, Set<Function>>()
  
  return {
    on: (channel: string, callback: Function) => {
      if (!listeners.has(channel)) {
        listeners.set(channel, new Set())
        
        // Set up IPC listener
        const handler = (...args: any[]) => {
          const callbacks = listeners.get(channel)
          if (callbacks) {
            callbacks.forEach(cb => {
              try {
                cb(...args)
              } catch (error) {
                console.error(`Event listener error for ${channel}:`, error)
              }
            })
          }
        }
        
        ipcRenderer.on(channel, handler)
      }
      
      listeners.get(channel)?.add(callback)
    },
    
    off: (channel: string, callback: Function) => {
      const callbacks = listeners.get(channel)
      if (callbacks) {
        callbacks.delete(callback)
        
        if (callbacks.size === 0) {
          listeners.delete(channel)
          ipcRenderer.removeAllListeners(channel)
        }
      }
    }
  }
}

// =============================================================================
// API Implementation
// =============================================================================

const { on, off } = createSafeListener()

const electronAPI: ElectronAPI = {
  // App information
  getAppInfo: createSafeInvoke('app:info'),
  checkHealth: createSafeInvoke('app:health'),
  
  // Project management
  createProject: createSafeInvoke('project:create'),
  getProjects: createSafeInvoke('project:list'),
  getProject: createSafeInvoke('project:get'),
  updateProject: createSafeInvoke('project:update'),
  deleteProject: createSafeInvoke('project:delete'),
  
  // Agent communication
  sendMessage: createSafeInvoke('agent:message'),
  sendChatMessage: createSafeInvoke('chat:message'),
  getAgentStatus: createSafeInvoke('agent:status'),
  getAllAgentStatuses: createSafeInvoke('agent:status:all'),
  
  // Agent management
  initializeAgentTeam: createSafeInvoke('agent:initialize-team'),
  addAgent: createSafeInvoke('agent:add'),
  saveAgentState: createSafeInvoke('agent:save-state'),
  loadAgentState: createSafeInvoke('agent:load-state'),
  
  // Chat management
  saveChatHistory: createSafeInvoke('chat:save-history'),
  loadChatHistory: createSafeInvoke('chat:load-history'),
  
  // UI state management
  saveUIState: createSafeInvoke('ui:save-state'),
  loadUIState: createSafeInvoke('ui:load-state'),
  
  // Project state management
  saveProjectState: createSafeInvoke('project:save-state'),
  loadProjectState: createSafeInvoke('project:load-state'),
  
  // File operations
  readFile: createSafeInvoke('file:read'),
  writeFile: createSafeInvoke('file:write'),
  getFileTree: createSafeInvoke('file:tree'),
  
  // Memory operations
  addMemory: createSafeInvoke('memory:add'),
  searchMemories: createSafeInvoke('memory:search'),
  
  // Git operations
  createCheckpoint: createSafeInvoke('git:checkpoint:create'),
  getCheckpoints: createSafeInvoke('git:checkpoint:list'),
  restoreCheckpoint: createSafeInvoke('git:checkpoint:restore'),
  
  // Configuration
  updateAIConfig: createSafeInvoke('config:ai:update'),
  getAIConfig: createSafeInvoke('config:ai:get'),
  
  // Event subscriptions
  on,
  off
}

// =============================================================================
// Context Bridge Exposure
// =============================================================================

try {
  contextBridge.exposeInMainWorld('api', electronAPI)
  console.log('Preload script loaded successfully')
} catch (error) {
  console.error('Failed to expose API to renderer:', error)
}

// =============================================================================
// Type Declarations for Window
// =============================================================================

declare global {
  interface Window {
    api: ElectronAPI
  }
}

// =============================================================================
// Placeholder Types (to be replaced with actual types from shared/types)
// =============================================================================

interface AppInfo {
  name: string
  version: string
  electronVersion: string
  nodeVersion: string
  platform: string
}

interface HealthStatus {
  status: string
  timestamp: string
  version: string
}

interface CreateProjectInput {
  name: string
  description?: string
  template?: string
}

interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  status: string
}

interface SendMessageInput {
  agentType: AgentType
  message: string
  projectId: string
  taskId?: string
  context?: any
}

interface AgentResponse {
  messageId: string
  agentType: AgentType
  content: string
  actions: any[]
  statusUpdate?: any
  errors?: any[]
}

type AgentType = 'producer' | 'architect' | 'engineer' | 'qa'
type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'error'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface AddMemoryInput {
  content: string
  type: 'global' | 'project' | 'task'
  projectId?: string
  taskId?: string
  metadata?: Record<string, any>
}

interface Memory {
  id: string
  content: string
  type: string
  createdAt: Date
  metadata?: Record<string, any>
}

interface SearchOptions {
  type?: string
  projectId?: string
  limit?: number
}

interface Checkpoint {
  id: string
  message: string
  timestamp: Date
  files: string[]
}

interface AIConfig {
  provider: string
  [key: string]: any
}