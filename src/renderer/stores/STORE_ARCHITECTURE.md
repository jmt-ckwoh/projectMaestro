# Store Architecture Rules

**CRITICAL: These rules prevent state corruption and race conditions. Violating them will cause unpredictable behavior.**

## Core Principles

### 1. Single Source of Truth
- Each piece of state has exactly ONE owner store
- No duplication of state across stores
- Derived state uses selectors, not duplication

### 2. Clear Ownership Boundaries
- **AgentStore**: Agent status, capabilities, statistics, message queues
- **ProjectStore**: Project data, tasks, file structure, git state  
- **ChatStore**: Message history, active conversations, typing indicators
- **UIStore**: Panel states, navigation, user preferences, temporary UI state

### 3. Unidirectional Data Flow
```
User Action → Store Action → IPC Call → Main Process → Store Update → UI Re-render
```

## Store Contracts

### AgentStore
```typescript
// OWNS: All agent-related state
interface AgentStoreState {
  agents: Record<AgentType, Agent>          // Agent configurations and capabilities
  statuses: Record<AgentType, AgentStatus>  // Current agent statuses  
  messageQueues: Record<AgentType, Message[]> // Pending messages per agent
  statistics: Record<AgentType, AgentStats>   // Performance metrics
  
  // Actions - MUST follow async pattern
  sendMessage: (message: AgentMessage) => Promise<void>
  updateAgentStatus: (agentType: AgentType, status: AgentStatus) => void
  loadAgents: () => Promise<void>
}

// FORBIDDEN: Storing project data, chat history, UI state
```

### ProjectStore  
```typescript
// OWNS: All project and task data
interface ProjectStoreState {
  currentProject: Project | null    // Active project
  projects: Project[]              // All user projects
  tasks: Record<string, Task[]>    // Tasks by project ID
  fileTree: Record<string, FileNode[]> // File structure by project ID
  gitStatus: Record<string, GitStatus> // Git state by project ID
  
  // Actions - MUST validate inputs
  createProject: (data: CreateProjectInput) => Promise<Project>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>
  loadProject: (projectId: string) => Promise<void>
}

// FORBIDDEN: Storing agent state, chat messages, UI preferences
```

### ChatStore
```typescript
// OWNS: All communication and conversation state
interface ChatStoreState {
  conversations: Record<string, Conversation> // Conversations by project ID
  activeThread: string | null                // Currently active thread
  typingIndicators: Record<AgentType, boolean> // Who is typing
  messageHistory: Message[]                   // Full message history
  
  // Actions - MUST handle real-time updates
  addMessage: (message: Message) => void
  setTypingIndicator: (agentType: AgentType, isTyping: boolean) => void
  loadConversation: (projectId: string) => Promise<void>
}

// FORBIDDEN: Storing agent configurations, project data, UI layout
```

### UIStore
```typescript
// OWNS: All user interface and presentation state
interface UIStoreState {
  layout: {
    leftPanelWidth: number
    rightPanelWidth: number
    leftPanelCollapsed: boolean
    rightPanelCollapsed: boolean
  }
  navigation: {
    activeView: WorkspaceView
    breadcrumbs: BreadcrumbItem[]
  }
  preferences: UserPreferences
  notifications: Notification[]
  
  // Actions - MUST be synchronous for UI responsiveness
  updateLayout: (layout: Partial<LayoutState>) => void
  setActiveView: (view: WorkspaceView) => void
  addNotification: (notification: Notification) => void
}

// FORBIDDEN: Storing business data, agent state, messages
```

## Communication Patterns

### Store-to-Store Communication: FORBIDDEN
```typescript
// ❌ NEVER DO THIS - Creates tight coupling
const useAgentStore = create((set, get) => ({
  sendMessage: async (message) => {
    // DON'T access other stores directly
    const chatStore = useChatStore.getState() // ❌ FORBIDDEN
    chatStore.addMessage(message) // ❌ FORBIDDEN
  }
}))
```

### Correct Pattern: Event-Driven Updates
```typescript
// ✅ CORRECT - Use event bus for store coordination
const useAgentStore = create((set, get) => ({
  sendMessage: async (message) => {
    // Send via IPC
    const response = await window.api.sendMessage(message)
    
    // Update own state only
    set(state => ({ 
      messageQueues: {
        ...state.messageQueues,
        [message.to]: [...state.messageQueues[message.to], message]
      }
    }))
    
    // Event bus will notify other stores
    // ChatStore subscribes to 'message.sent' events
  }
}))
```

## Action Patterns

### Async Actions: MUST Handle Errors
```typescript
// ✅ CORRECT - Proper error handling
const createProject = async (data: CreateProjectInput) => {
  set({ isLoading: true, error: null })
  
  try {
    const project = await window.api.createProject(data)
    set(state => ({
      projects: [...state.projects, project],
      currentProject: project,
      isLoading: false
    }))
    return project
  } catch (error) {
    set({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      isLoading: false 
    })
    throw error // Re-throw for component handling
  }
}
```

### Optimistic Updates: MUST Have Rollback
```typescript
// ✅ CORRECT - Optimistic updates with rollback
const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
  const previousState = get().tasks
  
  // Optimistic update
  set(state => ({
    tasks: {
      ...state.tasks,
      [projectId]: state.tasks[projectId].map(task =>
        task.id === taskId ? { ...task, status } : task
      )
    }
  }))
  
  try {
    await window.api.updateTaskStatus(taskId, status)
  } catch (error) {
    // Rollback on failure
    set({ tasks: previousState })
    throw error
  }
}
```

## State Normalization

### MUST Normalize Related Data
```typescript
// ✅ CORRECT - Normalized state structure
interface ProjectStoreState {
  projects: Record<string, Project>        // Keyed by ID
  tasks: Record<string, Task>             // Keyed by ID  
  tasksByProject: Record<string, string[]> // Project ID → Task IDs
  
  // Selectors for denormalized views
  getProjectTasks: (projectId: string) => Task[]
}

const getProjectTasks = (projectId: string) => {
  const state = get()
  const taskIds = state.tasksByProject[projectId] || []
  return taskIds.map(id => state.tasks[id]).filter(Boolean)
}
```

### FORBIDDEN: Nested State Updates
```typescript
// ❌ FORBIDDEN - Deep nesting makes updates complex
interface BadProjectState {
  projects: {
    [id: string]: {
      ...projectData,
      tasks: Task[]  // ❌ Creates update complexity
    }
  }
}
```

## Subscription Patterns

### Component Subscriptions: MUST Be Specific
```typescript
// ✅ CORRECT - Subscribe to specific slices
const AgentStatusPanel = () => {
  const agentStatuses = useAgentStore(state => state.statuses)
  const updateStatus = useAgentStore(state => state.updateAgentStatus)
  
  // Component only re-renders when statuses change
}

// ❌ FORBIDDEN - Subscribing to entire store
const BadComponent = () => {
  const entireStore = useAgentStore() // ❌ Causes unnecessary re-renders
}
```

### Derived State: MUST Use Selectors
```typescript
// ✅ CORRECT - Memoized selectors
const useAgentStore = create((set, get) => ({
  // Base state
  agents: {},
  statuses: {},
  
  // Computed selectors
  getAvailableAgents: () => {
    const { agents, statuses } = get()
    return Object.values(agents).filter(agent => 
      statuses[agent.type] === AgentStatus.IDLE
    )
  }
}))

// Use in components
const availableAgents = useAgentStore(state => state.getAvailableAgents())
```

## Error Handling

### Store Errors: MUST Be Contained
```typescript
interface StoreErrorState {
  error: string | null
  isLoading: boolean
  lastError: {
    action: string
    timestamp: Date
    details: any
  } | null
}

// Error boundary pattern
const handleStoreError = (action: string, error: Error) => {
  set({
    error: error.message,
    isLoading: false,
    lastError: {
      action,
      timestamp: new Date(),
      details: error
    }
  })
  
  // Report to monitoring
  console.error(`Store error in ${action}:`, error)
}
```

## Testing Patterns

### Store Tests: MUST Test Actions
```typescript
// ✅ CORRECT - Test action behavior
describe('AgentStore', () => {
  it('should update agent status correctly', async () => {
    const store = createAgentStore()
    
    await store.getState().updateAgentStatus(AgentType.PRODUCER, AgentStatus.WORKING)
    
    expect(store.getState().statuses[AgentType.PRODUCER]).toBe(AgentStatus.WORKING)
  })
  
  it('should handle API errors gracefully', async () => {
    const store = createAgentStore()
    window.api.sendMessage = jest.fn().mockRejectedValue(new Error('API Error'))
    
    await expect(
      store.getState().sendMessage(mockMessage)
    ).rejects.toThrow('API Error')
    
    expect(store.getState().error).toBe('API Error')
  })
})
```

## Performance Rules

### MUST Prevent Memory Leaks
```typescript
// ✅ CORRECT - Cleanup subscriptions
const useStoreSubscription = (selector, callback) => {
  useEffect(() => {
    const unsubscribe = useStore.subscribe(selector, callback)
    return unsubscribe // Cleanup on unmount
  }, [selector, callback])
}
```

### MUST Batch Updates
```typescript
// ✅ CORRECT - Batch related updates
const loadProjectData = async (projectId: string) => {
  const [project, tasks, files] = await Promise.all([
    window.api.getProject(projectId),
    window.api.getTasks(projectId),
    window.api.getFileTree(projectId)
  ])
  
  // Single state update
  set(state => ({
    currentProject: project,
    tasks: { ...state.tasks, [projectId]: tasks },
    fileTree: { ...state.fileTree, [projectId]: files }
  }))
}
```

## Enforcement

These rules are enforced by:
1. **TypeScript interfaces** - Compile-time checks
2. **ESLint rules** - Development-time warnings  
3. **Unit tests** - Runtime validation
4. **Code review** - Human validation

**Violation of these patterns will result in rejected PRs and required refactoring.**