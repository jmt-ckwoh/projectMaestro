/**
 * UI Store - Layout and Interface State Management
 * 
 * Manages the Three-Panel Layout state, panel visibility, and UI preferences.
 * Follows the store architecture rules defined in STORE_ARCHITECTURE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'

// =============================================================================
// UI State Types
// =============================================================================

export interface LayoutState {
  chatPanelWidth: number
  teamPanelWidth: number
  workspaceView: 'tree' | 'board' | 'architecture' | 'files' | 'chat-focus'
}

export interface PanelCollapseState {
  chat: boolean
  team: boolean
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system'
  compactMode: boolean
  showAgentActivity: boolean
  autoCollapseInactive: boolean
  soundEnabled: boolean
}

export interface UIState {
  // Layout Management
  layout: LayoutState
  isCollapsed: PanelCollapseState
  
  // UI Preferences
  preferences: UIPreferences
  
  // Transient UI State
  isLoading: boolean
  showWelcome: boolean
  activeModal: string | null
  notifications: UINotification[]
}

export interface UINotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  autoClose?: boolean
  duration?: number
}

// =============================================================================
// UI Actions Interface
// =============================================================================

export interface UIActions {
  // Layout Actions
  updateLayout: (updates: Partial<LayoutState>) => void
  togglePanel: (panel: 'chat' | 'team') => void
  setWorkspaceView: (view: LayoutState['workspaceView']) => void
  resetLayout: () => void
  
  // Preference Actions
  updatePreferences: (updates: Partial<UIPreferences>) => void
  setTheme: (theme: UIPreferences['theme']) => void
  
  // Modal Management
  openModal: (modalId: string) => void
  closeModal: () => void
  
  // Notification Management
  addNotification: (notification: Omit<UINotification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // State Management
  setLoading: (loading: boolean) => void
  setShowWelcome: (show: boolean) => void
  
  // Persistence
  saveUIState: () => Promise<void>
  loadUIState: () => Promise<void>
}

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_LAYOUT: LayoutState = {
  chatPanelWidth: 320,
  teamPanelWidth: 280,
  workspaceView: 'tree'
}

const DEFAULT_PREFERENCES: UIPreferences = {
  theme: 'system',
  compactMode: false,
  showAgentActivity: true,
  autoCollapseInactive: false,
  soundEnabled: true
}

const DEFAULT_UI_STATE: UIState = {
  layout: DEFAULT_LAYOUT,
  isCollapsed: {
    chat: false,
    team: false
  },
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,
  showWelcome: true,
  activeModal: null,
  notifications: []
}

// =============================================================================
// UI Store Implementation
// =============================================================================

export const useUIStore = create<UIState & UIActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...DEFAULT_UI_STATE,

      // =============================================================================
      // Layout Actions
      // =============================================================================

      updateLayout: (updates) => {
        set((state) => {
          Object.assign(state.layout, updates)
        })
      },

      togglePanel: (panel) => {
        set((state) => {
          state.isCollapsed[panel] = !state.isCollapsed[panel]
        })
      },

      setWorkspaceView: (view) => {
        set((state) => {
          state.layout.workspaceView = view
        })
      },

      resetLayout: () => {
        set((state) => {
          state.layout = { ...DEFAULT_LAYOUT }
          state.isCollapsed = { chat: false, team: false }
        })
      },

      // =============================================================================
      // Preference Actions
      // =============================================================================

      updatePreferences: (updates) => {
        set((state) => {
          Object.assign(state.preferences, updates)
        })
      },

      setTheme: (theme) => {
        set((state) => {
          state.preferences.theme = theme
        })
        
        // Apply theme to document
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else {
          // System theme
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', isDark)
        }
      },

      // =============================================================================
      // Modal Management
      // =============================================================================

      openModal: (modalId) => {
        set((state) => {
          state.activeModal = modalId
        })
      },

      closeModal: () => {
        set((state) => {
          state.activeModal = null
        })
      },

      // =============================================================================
      // Notification Management
      // =============================================================================

      addNotification: (notification) => {
        set((state) => {
          const newNotification: UINotification = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...notification
          }
          state.notifications.push(newNotification)
          
          // Auto-remove notification if specified
          if (notification.autoClose !== false) {
            setTimeout(() => {
              get().removeNotification(newNotification.id)
            }, notification.duration ?? 5000)
          }
        })
      },

      removeNotification: (id) => {
        set((state) => {
          const index = state.notifications.findIndex(n => n.id === id)
          if (index > -1) {
            state.notifications.splice(index, 1)
          }
        })
      },

      clearNotifications: () => {
        set((state) => {
          state.notifications = []
        })
      },

      // =============================================================================
      // State Management
      // =============================================================================

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading
        })
      },

      setShowWelcome: (show) => {
        set((state) => {
          state.showWelcome = show
        })
      },

      // =============================================================================
      // Persistence
      // =============================================================================

      saveUIState: async () => {
        try {
          const state = get()
          const stateToSave = {
            layout: state.layout,
            isCollapsed: state.isCollapsed,
            preferences: state.preferences,
            showWelcome: state.showWelcome
          }
          
          await window.api.saveUIState(stateToSave)
        } catch (error) {
          console.error('Failed to save UI state:', error)
        }
      },

      loadUIState: async () => {
        try {
          const savedState = await window.api.loadUIState()
          if (savedState) {
            set((state) => {
              Object.assign(state.layout, savedState.layout)
              Object.assign(state.isCollapsed, savedState.isCollapsed)
              Object.assign(state.preferences, savedState.preferences)
              if (savedState.showWelcome !== undefined) {
                state.showWelcome = savedState.showWelcome
              }
            })
            
            // Apply theme
            get().setTheme(savedState.preferences?.theme ?? 'system')
          }
        } catch (error) {
          console.error('Failed to load UI state:', error)
        }
      }
    }))
  )
)

// =============================================================================
// UI Store Selectors
// =============================================================================

export const useLayoutState = () => useUIStore(state => state.layout)
export const useCollapseState = () => useUIStore(state => state.isCollapsed)
export const usePreferences = () => useUIStore(state => state.preferences)
export const useNotifications = () => useUIStore(state => state.notifications)
export const useModalState = () => useUIStore(state => state.activeModal)

// =============================================================================
// Initialize UI Store
// =============================================================================

// Auto-save UI state on changes
useUIStore.subscribe(
  (state) => ({ layout: state.layout, isCollapsed: state.isCollapsed, preferences: state.preferences }),
  () => {
    // Debounce saves to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      useUIStore.getState().saveUIState()
    }, 1000)
    
    return () => clearTimeout(timeoutId)
  },
  {
    equalityFn: (a, b) => 
      JSON.stringify(a.layout) === JSON.stringify(b.layout) &&
      JSON.stringify(a.isCollapsed) === JSON.stringify(b.isCollapsed) &&
      JSON.stringify(a.preferences) === JSON.stringify(b.preferences)
  }
)

// Load saved state on initialization
if (typeof window !== 'undefined') {
  useUIStore.getState().loadUIState()
}