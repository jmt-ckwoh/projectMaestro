/**
 * Project Store - Project Management State
 * 
 * Manages projects, tasks, and workflow state.
 * Follows the store architecture rules defined in STORE_ARCHITECTURE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { 
  CreateProjectInput, 
  Project, 
  ProjectQuery,
  UpdateProjectInput 
} from '@/shared/contracts/ProjectDomain'

// Re-export types for convenience
export type { Project, CreateProjectInput, UpdateProjectInput, ProjectQuery }

export interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
}

// =============================================================================
// Project Actions
// =============================================================================

export interface ProjectActions {
  // Project Management
  createProject: (data: CreateProjectInput) => Promise<string>
  updateProject: (id: string, updates: UpdateProjectInput) => void
  deleteProject: (id: string) => void
  setCurrentProject: (project: Project | null) => void
  
  // Project Loading
  loadProjects: () => Promise<void>
  loadProject: (id: string) => Promise<Project | null>
  
  // Persistence
  saveProjectState: () => Promise<void>
}

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_PROJECT_STATE: ProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false
}

// =============================================================================
// Project Store Implementation
// =============================================================================

export const useProjectStore = create<ProjectState & ProjectActions>()(
  immer((set, get) => ({
    ...DEFAULT_PROJECT_STATE,

    // =============================================================================
    // Project Management
    // =============================================================================

    createProject: async (data) => {
      try {
        const newProject = await window.api.createProject(data)
        
        set((state) => {
          state.projects.push(newProject)
          state.currentProject = newProject
        })
        
        return newProject.id
      } catch (error) {
        console.error('Failed to create project:', error)
        throw error
      }
    },

    updateProject: (id, updates) => {
      set((state) => {
        const project = state.projects.find(p => p.id === id)
        if (project) {
          Object.assign(project, updates)
          project.updatedAt = new Date()
          
          // Update current project if it's the same
          if (state.currentProject?.id === id) {
            Object.assign(state.currentProject, updates)
            state.currentProject.updatedAt = new Date()
          }
        }
      })
    },

    deleteProject: (id) => {
      set((state) => {
        const index = state.projects.findIndex(p => p.id === id)
        if (index > -1) {
          state.projects.splice(index, 1)
          
          // Clear current project if it's the one being deleted
          if (state.currentProject?.id === id) {
            state.currentProject = null
          }
        }
      })
    },

    setCurrentProject: (project) => {
      set((state) => {
        state.currentProject = project
      })
    },

    // =============================================================================
    // Project Loading
    // =============================================================================

    loadProjects: async () => {
      set((state) => {
        state.isLoading = true
      })

      try {
        const projects = await window.api.getProjects()
        set((state) => {
          state.projects = projects || []
        })
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        set((state) => {
          state.isLoading = false
        })
      }
    },

    loadProject: async (id) => {
      try {
        const project = await window.api.getProject(id)
        if (project) {
          set((state) => {
            const index = state.projects.findIndex(p => p.id === id)
            if (index > -1) {
              state.projects[index] = project
            } else {
              state.projects.push(project)
            }
          })
        }
        return project
      } catch (error) {
        console.error('Failed to load project:', error)
        return null
      }
    },

    // =============================================================================
    // Persistence
    // =============================================================================

    saveProjectState: async () => {
      try {
        const state = get()
        await window.api.saveProjectState({
          projects: state.projects,
          currentProjectId: state.currentProject?.id || null
        })
      } catch (error) {
        console.error('Failed to save project state:', error)
      }
    }
  }))
)

// =============================================================================
// Project Store Selectors
// =============================================================================

export const useProjects = () => useProjectStore(state => state.projects)
export const useCurrentProject = () => useProjectStore(state => state.currentProject)
export const useProjectsLoading = () => useProjectStore(state => state.isLoading)

// =============================================================================
// Auto-save Project State
// =============================================================================

// Save project state when it changes
useProjectStore.subscribe(() => {
  // Debounce saves
  const timeoutId = setTimeout(() => {
    useProjectStore.getState().saveProjectState()
  }, 1000)
  
  return () => clearTimeout(timeoutId)
})

// Load projects on initialization
if (typeof window !== 'undefined') {
  useProjectStore.getState().loadProjects()
}