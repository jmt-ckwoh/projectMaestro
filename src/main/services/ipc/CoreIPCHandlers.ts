/**
 * Core IPC Handlers for Project Maestro
 * 
 * Handles basic app functionality and non-domain-specific operations
 */

import { ipcMain } from 'electron'
import { z } from 'zod'
import * as path from 'path'
import * as fs from 'fs/promises'
import { app } from 'electron'

// =============================================================================
// Schemas for Input Validation
// =============================================================================

const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().default('web-app')
})

const ProjectUpdateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional()
})

// const AgentStateSchema = z.object({
//   agentId: z.string(),
//   status: z.string(),
//   lastActivity: z.string(),
//   metadata: z.record(z.any()).optional()
// })

// const UIStateSchema = z.object({
//   theme: z.string().optional(),
//   sidebarOpen: z.boolean().optional(),
//   activePanel: z.string().optional(),
//   windowState: z.record(z.any()).optional()
// })

// =============================================================================
// Core IPC Handlers
// =============================================================================

export class CoreIPCHandlers {
  private dataPath: string
  private projectsFile: string
  private agentStateFile: string
  private uiStateFile: string

  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'app-data')
    this.projectsFile = path.join(this.dataPath, 'projects.json')
    this.agentStateFile = path.join(this.dataPath, 'agent-state.json')
    this.uiStateFile = path.join(this.dataPath, 'ui-state.json')
  }

  async initialize(): Promise<void> {
    // Ensure data directory exists
    await fs.mkdir(this.dataPath, { recursive: true })

    // Register all IPC handlers
    this.registerAppHandlers()
    this.registerProjectHandlers()
    this.registerAgentHandlers()
    this.registerUIHandlers()

    console.log('Core IPC handlers registered successfully')
  }

  private registerAppHandlers(): void {
    ipcMain.handle('app:info', async () => {
      return {
        name: 'project-maestro',
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        platform: process.platform
      }
    })

    ipcMain.handle('app:health', async () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: app.getVersion()
      }
    })
  }

  private registerProjectHandlers(): void {
    ipcMain.handle('project:create', async (_event, data) => {
      try {
        const validatedData = ProjectCreateSchema.parse(data)
        
        const project = {
          id: `proj-${Date.now()}`,
          ...validatedData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active'
        }

        const projects = await this.loadProjects()
        projects.push(project)
        await this.saveProjects(projects)

        return { success: true, project }
      } catch (error) {
        console.error('Failed to create project:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('project:list', async () => {
      try {
        const projects = await this.loadProjects()
        return { success: true, projects }
      } catch (error) {
        console.error('Failed to load projects:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to load projects',
          projects: []
        }
      }
    })

    ipcMain.handle('project:get', async (_event, projectId: string) => {
      try {
        const projects = await this.loadProjects()
        const project = projects.find(p => p.id === projectId)
        
        if (!project) {
          return { success: false, error: 'Project not found' }
        }

        return { success: true, project }
      } catch (error) {
        console.error('Failed to get project:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('project:update', async (_event, data) => {
      try {
        const validatedData = ProjectUpdateSchema.parse(data)
        
        const projects = await this.loadProjects()
        const projectIndex = projects.findIndex(p => p.id === validatedData.id)
        
        if (projectIndex === -1) {
          return { success: false, error: 'Project not found' }
        }

        projects[projectIndex] = {
          ...projects[projectIndex],
          ...validatedData,
          updatedAt: new Date().toISOString()
        }

        await this.saveProjects(projects)
        return { success: true, project: projects[projectIndex] }
      } catch (error) {
        console.error('Failed to update project:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('project:delete', async (_event, projectId: string) => {
      try {
        const projects = await this.loadProjects()
        const filteredProjects = projects.filter(p => p.id !== projectId)
        
        if (filteredProjects.length === projects.length) {
          return { success: false, error: 'Project not found' }
        }

        await this.saveProjects(filteredProjects)
        return { success: true }
      } catch (error) {
        console.error('Failed to delete project:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('project:save-state', async (_event, _state) => {
      try {
        // For now, just acknowledge the save
        return { success: true }
      } catch (error) {
        console.error('Failed to save project state:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('project:load-state', async () => {
      try {
        // For now, return empty state
        return { success: true, state: {} }
      } catch (error) {
        console.error('Failed to load project state:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          state: {}
        }
      }
    })
  }

  private registerAgentHandlers(): void {
    ipcMain.handle('agent:initialize-team', async () => {
      try {
        // Return mock team initialization
        const defaultTeam = [
          { id: 'producer', name: 'Producer', status: 'idle', type: 'producer' },
          { id: 'architect', name: 'Architect', status: 'idle', type: 'architect' },
          { id: 'engineer', name: 'Engineer', status: 'idle', type: 'engineer' },
          { id: 'qa', name: 'QA', status: 'idle', type: 'qa' }
        ]
        
        return { success: true, agents: defaultTeam }
      } catch (error) {
        console.error('Failed to initialize agent team:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          agents: []
        }
      }
    })

    ipcMain.handle('agent:load-state', async () => {
      try {
        const agentState = await this.loadAgentState()
        return { success: true, state: agentState }
      } catch (error) {
        console.error('Failed to load agent state:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to load agent state',
          state: {}
        }
      }
    })

    ipcMain.handle('agent:save-state', async (_event, state) => {
      try {
        await this.saveAgentState(state)
        return { success: true }
      } catch (error) {
        console.error('Failed to save agent state:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('agent:status', async (_event, agentId: string) => {
      try {
        // Return mock status for now
        return { 
          success: true, 
          status: { 
            id: agentId, 
            status: 'idle', 
            lastActivity: new Date().toISOString() 
          } 
        }
      } catch (error) {
        console.error('Failed to get agent status:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('agent:status:all', async () => {
      try {
        // Return mock statuses for all agents
        const statuses = [
          { id: 'producer', status: 'idle', lastActivity: new Date().toISOString() },
          { id: 'architect', status: 'idle', lastActivity: new Date().toISOString() },
          { id: 'engineer', status: 'idle', lastActivity: new Date().toISOString() },
          { id: 'qa', status: 'idle', lastActivity: new Date().toISOString() }
        ]
        
        return { success: true, statuses }
      } catch (error) {
        console.error('Failed to get all agent statuses:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          statuses: []
        }
      }
    })
  }

  private registerUIHandlers(): void {
    ipcMain.handle('ui:save-state', async (_event, state: any) => {
      try {
        await this.saveUIState(state)
        return { success: true }
      } catch (error) {
        console.error('Failed to save UI state:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    ipcMain.handle('ui:load-state', async () => {
      try {
        const uiState = await this.loadUIState()
        return { success: true, state: uiState }
      } catch (error) {
        console.error('Failed to load UI state:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to load UI state',
          state: {}
        }
      }
    })
  }

  // =============================================================================
  // File Operations
  // =============================================================================

  private async loadProjects(): Promise<any[]> {
    try {
      const data = await fs.readFile(this.projectsFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // File doesn't exist or is invalid, return empty array
      return []
    }
  }

  private async saveProjects(projects: any[]): Promise<void> {
    await fs.writeFile(this.projectsFile, JSON.stringify(projects, null, 2))
  }

  private async loadAgentState(): Promise<any> {
    try {
      const data = await fs.readFile(this.agentStateFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // File doesn't exist or is invalid, return empty object
      return {}
    }
  }

  private async saveAgentState(state: any): Promise<void> {
    await fs.writeFile(this.agentStateFile, JSON.stringify(state, null, 2))
  }

  private async loadUIState(): Promise<any> {
    try {
      const data = await fs.readFile(this.uiStateFile, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // File doesn't exist or is invalid, return empty object
      return {}
    }
  }

  private async saveUIState(state: any): Promise<void> {
    await fs.writeFile(this.uiStateFile, JSON.stringify(state, null, 2))
  }

  cleanup(): void {
    // Remove IPC handlers
    ipcMain.removeAllListeners('app:info')
    ipcMain.removeAllListeners('app:health')
    ipcMain.removeAllListeners('project:create')
    ipcMain.removeAllListeners('project:list')
    ipcMain.removeAllListeners('project:get')
    ipcMain.removeAllListeners('project:update')
    ipcMain.removeAllListeners('project:delete')
    ipcMain.removeAllListeners('project:save-state')
    ipcMain.removeAllListeners('project:load-state')
    ipcMain.removeAllListeners('agent:initialize-team')
    ipcMain.removeAllListeners('agent:load-state')
    ipcMain.removeAllListeners('agent:save-state')
    ipcMain.removeAllListeners('agent:status')
    ipcMain.removeAllListeners('agent:status:all')
    ipcMain.removeAllListeners('ui:save-state')
    ipcMain.removeAllListeners('ui:load-state')
    
    console.log('Core IPC handlers cleaned up')
  }
}