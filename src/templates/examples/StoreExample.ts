/**
 * Store Example - Complete working implementation
 * 
 * This demonstrates a full Zustand store following Project Maestro patterns:
 * - Proper state ownership
 * - Action patterns
 * - Async operations
 * - Error handling
 * - Persistence
 * - Type safety
 */

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// =============================================================================
// Types
// =============================================================================

export interface Project {
  id: string
  name: string
  description: string
  type: 'web-app' | 'mobile-app' | 'api' | 'library'
  status: 'planning' | 'development' | 'testing' | 'completed' | 'archived'
  createdAt: Date
  updatedAt: Date
  settings: ProjectSettings
  statistics: ProjectStatistics
}

export interface ProjectSettings {
  framework: string
  language: string
  buildTool: string
  testFramework: string
  deploymentTarget: string
  autoSave: boolean
  aiAssistance: boolean
}

export interface ProjectStatistics {
  filesCount: number
  linesOfCode: number
  testsCount: number
  buildTime: number
  lastBuildDate?: Date
}

export interface CreateProjectInput {
  name: string
  description: string
  type: Project['type']
  template?: string
  settings?: Partial<ProjectSettings>
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  status?: Project['status']
  settings?: Partial<ProjectSettings>
}

// =============================================================================
// Store State
// =============================================================================

export interface ProjectStoreState {
  // Data
  projects: Record<string, Project>
  currentProjectId: string | null
  
  // UI State
  isLoading: boolean
  error: string | null
  
  // Filter and Search
  filters: {
    status: Project['status'] | 'all'
    type: Project['type'] | 'all'
    searchQuery: string
  }
  
  // Computed Values
  currentProject: Project | null
  filteredProjects: Project[]
  projectCount: number
}

// =============================================================================
// Store Actions
// =============================================================================

export interface ProjectStoreActions {
  // Project CRUD
  createProject: (input: CreateProjectInput) => Promise<Project>
  getProject: (id: string) => Promise<Project | null>
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  loadProjects: () => Promise<void>
  
  // Current Project
  setCurrentProject: (id: string | null) => void
  
  // Project Settings
  updateProjectSettings: (id: string, settings: Partial<ProjectSettings>) => Promise<void>
  
  // Statistics
  updateProjectStatistics: (id: string, stats: Partial<ProjectStatistics>) => void
  
  // UI Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Filters
  setStatusFilter: (status: Project['status'] | 'all') => void
  setTypeFilter: (type: Project['type'] | 'all') => void
  setSearchQuery: (query: string) => void
  clearFilters: () => void
  
  // Utilities
  reset: () => void
  hydrate: () => Promise<void>
}

// =============================================================================
// Store Implementation
// =============================================================================

export type ProjectStore = ProjectStoreState & ProjectStoreActions

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  framework: 'react',
  language: 'typescript',
  buildTool: 'vite',
  testFramework: 'jest',
  deploymentTarget: 'vercel',
  autoSave: true,
  aiAssistance: true
}

const DEFAULT_STATISTICS: ProjectStatistics = {
  filesCount: 0,
  linesOfCode: 0,
  testsCount: 0,
  buildTime: 0
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial State
          projects: {},
          currentProjectId: null,
          isLoading: false,
          error: null,
          filters: {
            status: 'all',
            type: 'all',
            searchQuery: ''
          },
          
          // Computed Values
          get currentProject() {
            const { projects, currentProjectId } = get()
            return currentProjectId ? projects[currentProjectId] || null : null
          },
          
          get filteredProjects() {
            const { projects, filters } = get()
            let result = Object.values(projects)
            
            // Status filter
            if (filters.status !== 'all') {
              result = result.filter(project => project.status === filters.status)
            }
            
            // Type filter
            if (filters.type !== 'all') {
              result = result.filter(project => project.type === filters.type)
            }
            
            // Search filter
            if (filters.searchQuery.trim()) {
              const query = filters.searchQuery.toLowerCase()
              result = result.filter(project => 
                project.name.toLowerCase().includes(query) ||
                project.description.toLowerCase().includes(query)
              )
            }
            
            return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          },
          
          get projectCount() {
            return Object.keys(get().projects).length
          },

          // =============================================================================
          // Actions
          // =============================================================================

          createProject: async (input: CreateProjectInput) => {
            set(state => {
              state.isLoading = true
              state.error = null
            })

            try {
              // Validate input
              if (!input.name.trim()) {
                throw new Error('Project name is required')
              }

              if (!input.description.trim()) {
                throw new Error('Project description is required')
              }

              // Create project
              const project: Project = {
                id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: input.name.trim(),
                description: input.description.trim(),
                type: input.type,
                status: 'planning',
                createdAt: new Date(),
                updatedAt: new Date(),
                settings: { ...DEFAULT_PROJECT_SETTINGS, ...input.settings },
                statistics: { ...DEFAULT_STATISTICS }
              }

              // Save via API
              const savedProject = await window.api.createProject({
                name: project.name,
                description: project.description,
                type: project.type,
                settings: project.settings
              })

              // Update store
              set(state => {
                state.projects[savedProject.id] = savedProject
                state.currentProjectId = savedProject.id
                state.isLoading = false
              })

              return savedProject
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to create project'
              
              set(state => {
                state.error = errorMessage
                state.isLoading = false
              })

              throw new Error(errorMessage)
            }
          },

          getProject: async (id: string) => {
            const { projects } = get()
            
            // Return cached if available
            if (projects[id]) {
              return projects[id]
            }

            set(state => {
              state.isLoading = true
              state.error = null
            })

            try {
              const project = await window.api.getProject(id)
              
              if (project) {
                set(state => {
                  state.projects[project.id] = project
                  state.isLoading = false
                })
              } else {
                set(state => {
                  state.isLoading = false
                })
              }

              return project
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to load project'
              
              set(state => {
                state.error = errorMessage
                state.isLoading = false
              })

              return null
            }
          },

          updateProject: async (id: string, input: UpdateProjectInput) => {
            set(state => {
              state.isLoading = true
              state.error = null
            })

            try {
              const updatedProject = await window.api.updateProject(id, input)
              
              set(state => {
                state.projects[id] = {
                  ...state.projects[id],
                  ...updatedProject
                } as Project
                state.isLoading = false
              })

              return updatedProject
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to update project'
              
              set(state => {
                state.error = errorMessage
                state.isLoading = false
              })

              throw new Error(errorMessage)
            }
          },

          deleteProject: async (id: string) => {
            set(state => {
              state.isLoading = true
              state.error = null
            })

            try {
              await window.api.deleteProject(id)
              
              set(state => {
                delete state.projects[id]
                if (state.currentProjectId === id) {
                  state.currentProjectId = null
                }
                state.isLoading = false
              })
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to delete project'
              
              set(state => {
                state.error = errorMessage
                state.isLoading = false
              })

              throw new Error(errorMessage)
            }
          },

          loadProjects: async () => {
            set(state => {
              state.isLoading = true
              state.error = null
            })

            try {
              const projects = await window.api.getProjects()
              
              set(state => {
                state.projects = {}
                projects.forEach(project => {
                  state.projects[project.id] = project
                })
                state.isLoading = false
              })
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to load projects'
              
              set(state => {
                state.error = errorMessage
                state.isLoading = false
              })
            }
          },

          setCurrentProject: (id: string | null) => {
            set(state => {
              state.currentProjectId = id
            })
          },

          updateProjectSettings: async (id: string, settings: Partial<ProjectSettings>): Promise<void> => {
            try {
              await window.api.updateProject(id, { 
                settings: { 
                  ...settings as ProjectSettings 
                } 
              })
              
              set(state => {
                if (state.projects[id]) {
                  state.projects[id].settings = { ...state.projects[id].settings, ...settings } as ProjectSettings
                  state.projects[id].updatedAt = new Date()
                }
              })
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to update settings'
              
              set(state => {
                state.error = errorMessage
              })

              throw new Error(errorMessage)
            }
          },

          updateProjectStatistics: (id: string, stats: Partial<ProjectStatistics>) => {
            set(state => {
              if (state.projects[id]) {
                state.projects[id].statistics = { ...state.projects[id].statistics, ...stats }
                state.projects[id].updatedAt = new Date()
              }
            })
          },

          setLoading: (loading: boolean) => {
            set(state => {
              state.isLoading = loading
            })
          },

          setError: (error: string | null) => {
            set(state => {
              state.error = error
            })
          },

          setStatusFilter: (status: Project['status'] | 'all') => {
            set(state => {
              state.filters.status = status
            })
          },

          setTypeFilter: (type: Project['type'] | 'all') => {
            set(state => {
              state.filters.type = type
            })
          },

          setSearchQuery: (query: string) => {
            set(state => {
              state.filters.searchQuery = query
            })
          },

          clearFilters: () => {
            set(state => {
              state.filters = {
                status: 'all',
                type: 'all',
                searchQuery: ''
              }
            })
          },

          reset: () => {
            set(state => {
              state.projects = {}
              state.currentProjectId = null
              state.isLoading = false
              state.error = null
              state.filters = {
                status: 'all',
                type: 'all',
                searchQuery: ''
              }
            })
          },

          hydrate: async () => {
            await get().loadProjects()
          }
        }))
      ),
      {
        name: 'project-store',
        partialize: (state) => ({
          currentProjectId: state.currentProjectId,
          filters: state.filters
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Reload projects on hydration
            state.hydrate()
          }
        }
      }
    ),
    {
      name: 'project-store'
    }
  )
)

// =============================================================================
// Store Selectors (for performance optimization)
// =============================================================================

export const useCurrentProject = () => 
  useProjectStore(state => state.currentProject)

export const useFilteredProjects = () => 
  useProjectStore(state => state.filteredProjects)

export const useProjectById = (id: string) => 
  useProjectStore(state => state.projects[id])

export const useProjectLoading = () => 
  useProjectStore(state => state.isLoading)

export const useProjectError = () => 
  useProjectStore(state => state.error)

export const useProjectFilters = () => 
  useProjectStore(state => state.filters)

// =============================================================================
// Store Actions (for easier import)
// =============================================================================

export const projectActions = {
  createProject: () => useProjectStore.getState().createProject,
  updateProject: () => useProjectStore.getState().updateProject,
  deleteProject: () => useProjectStore.getState().deleteProject,
  setCurrentProject: () => useProjectStore.getState().setCurrentProject,
  loadProjects: () => useProjectStore.getState().loadProjects,
  clearFilters: () => useProjectStore.getState().clearFilters,
  reset: () => useProjectStore.getState().reset
}

// =============================================================================
// Store Subscriptions (for side effects)
// =============================================================================

// Auto-save current project when it changes
useProjectStore.subscribe(
  (state) => state.currentProjectId,
  (currentProjectId) => {
    if (currentProjectId) {
      console.log(`Current project changed to: ${currentProjectId}`)
      // Could trigger analytics, save to localStorage, etc.
    }
  }
)

// Log errors
useProjectStore.subscribe(
  (state) => state.error,
  (error) => {
    if (error) {
      console.error('Project store error:', error)
      // Could send to error reporting service
    }
  }
)

// =============================================================================
// Example Usage
// =============================================================================

/*
// In a component:
const MyComponent = () => {
  const projects = useFilteredProjects()
  const currentProject = useCurrentProject()
  const isLoading = useProjectLoading()
  const error = useProjectError()
  
  const { createProject, setCurrentProject } = useProjectStore()
  
  const handleCreateProject = async () => {
    try {
      const project = await createProject({
        name: 'My New Project',
        description: 'A great new project',
        type: 'web-app'
      })
      console.log('Created project:', project)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }
  
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {projects.map(project => (
        <div key={project.id} onClick={() => setCurrentProject(project.id)}>
          {project.name}
        </div>
      ))}
      <button onClick={handleCreateProject}>Create Project</button>
    </div>
  )
}

// Outside component (in effects, services, etc.):
const createProjectFromService = async (data) => {
  const store = useProjectStore.getState()
  return await store.createProject(data)
}
*/