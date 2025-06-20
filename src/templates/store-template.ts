import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

/**
 * __STORE_NAME__ Store
 * 
 * Manages __DESCRIPTION__
 */

// Types
interface __MODEL_NAME__ {
  id: string
  // Add model properties
}

interface __STORE_NAME__State {
  // State
  items: __MODEL_NAME__[]
  selectedItem: __MODEL_NAME__ | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setItems: (items: __MODEL_NAME__[]) => void
  addItem: (item: __MODEL_NAME__) => void
  updateItem: (id: string, updates: Partial<__MODEL_NAME__>) => void
  deleteItem: (id: string) => void
  selectItem: (item: __MODEL_NAME__ | null) => void
  
  // Async actions
  fetchItems: () => Promise<void>
  saveItem: (item: __MODEL_NAME__) => Promise<void>
  
  // Utilities
  reset: () => void
}

// Initial state
const initialState = {
  items: [],
  selectedItem: null,
  isLoading: false,
  error: null,
}

// Store implementation
export const use__STORE_NAME__ = create<__STORE_NAME__State>()(
  devtools(
    immer((set, get) => ({
      // State
      ...initialState,
      
      // Actions
      setItems: (items) => set((state) => {
        state.items = items
      }),
      
      addItem: (item) => set((state) => {
        state.items.push(item)
      }),
      
      updateItem: (id, updates) => set((state) => {
        const index = state.items.findIndex(item => item.id === id)
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates }
        }
      }),
      
      deleteItem: (id) => set((state) => {
        state.items = state.items.filter(item => item.id !== id)
      }),
      
      selectItem: (item) => set((state) => {
        state.selectedItem = item
      }),
      
      // Async actions
      fetchItems: async () => {
        set((state) => {
          state.isLoading = true
          state.error = null
        })
        
        try {
          const items = await window.api.get__MODEL_NAME__s()
          set((state) => {
            state.items = items
            state.isLoading = false
          })
        } catch (error) {
          set((state) => {
            state.error = error.message
            state.isLoading = false
          })
        }
      },
      
      saveItem: async (item) => {
        set((state) => {
          state.isLoading = true
          state.error = null
        })
        
        try {
          const savedItem = await window.api.save__MODEL_NAME__(item)
          set((state) => {
            const index = state.items.findIndex(i => i.id === savedItem.id)
            if (index !== -1) {
              state.items[index] = savedItem
            } else {
              state.items.push(savedItem)
            }
            state.isLoading = false
          })
        } catch (error) {
          set((state) => {
            state.error = error.message
            state.isLoading = false
          })
          throw error
        }
      },
      
      // Utilities
      reset: () => set(initialState),
    })),
    {
      name: '__STORE_NAME__-store',
    }
  )
)

// Selectors (for optimization)
export const __STORE_NAME__Selectors = {
  items: (state: __STORE_NAME__State) => state.items,
  selectedItem: (state: __STORE_NAME__State) => state.selectedItem,
  isLoading: (state: __STORE_NAME__State) => state.isLoading,
  error: (state: __STORE_NAME__State) => state.error,
  itemById: (id: string) => (state: __STORE_NAME__State) => 
    state.items.find(item => item.id === id),
}