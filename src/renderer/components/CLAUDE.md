# Component Architecture Rules

**This directory contains React components. Follow these rules to maintain UI consistency and prevent state corruption.**

## Component Hierarchy & Organization

### Directory Structure
```
components/
├── CLAUDE.md           # This file - component rules
├── layout/            # Layout and structural components
│   ├── ThreePanelLayout.tsx
│   ├── Header.tsx
│   └── Sidebar.tsx
├── chat/              # Chat and messaging components  
│   ├── ChatPanel.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── AgentAvatar.tsx
├── workspace/         # Main workspace components
│   ├── WorkspacePanel.tsx
│   ├── ProjectBoard.tsx
│   ├── TaskCard.tsx
│   └── FileExplorer.tsx
├── team/             # Agent and team components
│   ├── TeamPanel.tsx
│   ├── AgentCard.tsx
│   ├── AgentStatus.tsx
│   └── CollaborationView.tsx
├── common/           # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Tooltip.tsx
│   └── LoadingSpinner.tsx
└── forms/           # Form-specific components
    ├── ProjectForm.tsx
    ├── AgentConfigForm.tsx
    └── SettingsForm.tsx
```

## Core Component Rules

### 1. Component Contracts
```typescript
// ✅ CORRECT - Clear prop interfaces
interface TaskCardProps {
  readonly task: Task
  readonly onStatusChange: (taskId: string, status: TaskStatus) => void
  readonly onEdit: (taskId: string) => void
  readonly className?: string
  readonly disabled?: boolean
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onStatusChange, 
  onEdit,
  className,
  disabled = false
}) => {
  // Component implementation
}

// ❌ FORBIDDEN - Unclear or any types
interface BadProps {
  data: any // ❌ Use specific types
  onClick: Function // ❌ Use proper function signatures
  style: object // ❌ Use React.CSSProperties
}
```

### 2. State Management Rules
```typescript
// ✅ CORRECT - Use appropriate stores
export const ChatPanel: React.FC = () => {
  // Subscribe to specific slices
  const messages = useChatStore(state => state.messages)
  const sendMessage = useChatStore(state => state.sendMessage)
  const agentStatuses = useAgentStore(state => state.statuses)
  
  // Local UI state only
  const [inputValue, setInputValue] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Rest of component
}

// ❌ FORBIDDEN - Mixing business logic in components
export const BadComponent: React.FC = () => {
  const [projects, setProjects] = useState([]) // ❌ Business state in component
  
  useEffect(() => {
    // ❌ Direct API calls in component
    window.api.getProjects().then(setProjects)
  }, [])
}
```

### 3. Event Handling Patterns
```typescript
// ✅ CORRECT - Proper event handling
export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('')
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }, [message, onSendMessage])
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])
  
  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
      />
    </form>
  )
}
```

### 4. Error Boundary Implementation
```typescript
// ✅ REQUIRED - Error boundaries for major sections
export class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<ErrorInfo> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo)
    // Report to monitoring service
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} />
    }
    
    return this.props.children
  }
}
```

## Layout Component Rules

### ThreePanelLayout Requirements
```typescript
// ✅ CORRECT - Structured layout with proper state management
export const ThreePanelLayout: React.FC = () => {
  // UI state only - no business logic
  const layout = useUIStore(state => state.layout)
  const updateLayout = useUIStore(state => state.updateLayout)
  
  const handlePanelResize = useCallback((panelId: string, width: number) => {
    updateLayout({ [`${panelId}Width`]: width })
  }, [updateLayout])
  
  return (
    <div className="flex h-screen">
      <ResizablePanel
        id="left"
        width={layout.leftPanelWidth}
        onResize={(width) => handlePanelResize('leftPanel', width)}
        collapsed={layout.leftPanelCollapsed}
      >
        <ChatPanel />
      </ResizablePanel>
      
      <div className="flex-1">
        <WorkspacePanel />
      </div>
      
      <ResizablePanel
        id="right"
        width={layout.rightPanelWidth}
        onResize={(width) => handlePanelResize('rightPanel', width)}
        collapsed={layout.rightPanelCollapsed}
      >
        <TeamPanel />
      </ResizablePanel>
    </div>
  )
}
```

### Panel State Management
```typescript
// ✅ CORRECT - Panel-specific state isolation
export const ChatPanel: React.FC = () => {
  const {
    messages,
    activeThread,
    typingIndicators,
    sendMessage,
    setActiveThread
  } = useChatStore(
    useShallow(state => ({
      messages: state.messages,
      activeThread: state.activeThread,
      typingIndicators: state.typingIndicators,
      sendMessage: state.sendMessage,
      setActiveThread: state.setActiveThread
    }))
  )
  
  // Panel only manages its own UI state
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isAtBottom, setIsAtBottom] = useState(true)
  
  // Rest of component
}
```

## Agent Component Rules

### Agent Status Visualization
```typescript
// ✅ CORRECT - Real-time status updates
export const AgentCard: React.FC<AgentCardProps> = ({ agentType }) => {
  const agent = useAgentStore(state => state.agents[agentType])
  const status = useAgentStore(state => state.statuses[agentType])
  const statistics = useAgentStore(state => state.statistics[agentType])
  
  const statusConfig = useMemo(() => 
    getAgentStatusConfig(status), [status]
  )
  
  return (
    <div className={cn(
      'agent-card',
      'p-4 rounded-lg border',
      statusConfig.className
    )}>
      <div className="flex items-center gap-3">
        <AgentAvatar 
          type={agentType}
          status={status}
          animated={status !== AgentStatus.IDLE}
        />
        
        <div className="flex-1">
          <h3 className="font-semibold">{agent.name}</h3>
          <p className="text-sm text-gray-600">
            {statusConfig.label}
          </p>
        </div>
        
        <AgentActions agentType={agentType} />
      </div>
      
      <AgentStatistics statistics={statistics} />
    </div>
  )
}
```

### Agent Status Indicators
```typescript
// ✅ CORRECT - Visual status system
export const AgentAvatar: React.FC<AgentAvatarProps> = ({ 
  type, 
  status, 
  animated = false 
}) => {
  const avatarConfig = AGENT_AVATAR_CONFIG[type]
  
  return (
    <div className="relative">
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center',
        'text-lg font-semibold',
        avatarConfig.bgColor,
        avatarConfig.textColor
      )}>
        {avatarConfig.emoji}
      </div>
      
      <AgentStatusIndicator 
        status={status}
        animated={animated}
        className="absolute -bottom-1 -right-1"
      />
    </div>
  )
}

const AGENT_AVATAR_CONFIG = {
  [AgentType.PRODUCER]: {
    emoji: '👔',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800'
  },
  [AgentType.ARCHITECT]: {
    emoji: '🏗️',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800'
  },
  [AgentType.ENGINEER]: {
    emoji: '⚡',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800'
  },
  [AgentType.QA]: {
    emoji: '🔍',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800'
  }
} as const
```

## Form Component Rules

### Form Validation & Submission
```typescript
// ✅ CORRECT - Comprehensive form handling
export const ProjectForm: React.FC<ProjectFormProps> = ({ 
  initialData,
  onSubmit,
  onCancel 
}) => {
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: initialData
  })
  
  const createProject = useProjectStore(state => state.createProject)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = useCallback(async (data: CreateProjectInput) => {
    setIsSubmitting(true)
    
    try {
      const project = await createProject(data)
      onSubmit(project)
    } catch (error) {
      // Form-level error handling
      form.setError('root', {
        type: 'server',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [createProject, onSubmit, form])
  
  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter project name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Other fields */}
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}
```

## Performance Rules

### Memoization Requirements
```typescript
// ✅ CORRECT - Proper memoization
export const TaskList: React.FC<TaskListProps> = ({ projectId }) => {
  const tasks = useProjectStore(
    useCallback(
      state => state.getProjectTasks(projectId),
      [projectId]
    )
  )
  
  const sortedTasks = useMemo(
    () => tasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [tasks]
  )
  
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    // Handle task updates
  }, [])
  
  return (
    <div className="task-list">
      {sortedTasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onUpdate={handleTaskUpdate}
        />
      ))}
    </div>
  )
}
```

### Virtual Scrolling for Large Lists
```typescript
// ✅ REQUIRED - Virtualization for >100 items
export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const listRef = useRef<HTMLDivElement>(null)
  
  // Use react-window for large message lists
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const message = messages[index]
    
    return (
      <div style={style}>
        <MessageItem message={message} />
      </div>
    )
  }, [messages])
  
  if (messages.length > 100) {
    return (
      <FixedSizeList
        ref={listRef}
        height={400}
        itemCount={messages.length}
        itemSize={80}
        itemData={messages}
      >
        {Row}
      </FixedSizeList>
    )
  }
  
  // Regular rendering for smaller lists
  return (
    <div className="message-list">
      {messages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  )
}
```

## Accessibility Requirements

### Keyboard Navigation
```typescript
// ✅ REQUIRED - Full keyboard support
export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks }) => {
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault()
        // Navigate between tasks
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        // Open focused task
        break
      case 'Escape':
        setFocusedTaskId(null)
        break
    }
  }, [])
  
  return (
    <div
      className="task-board"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="grid"
      aria-label="Task board"
    >
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          focused={focusedTaskId === task.id}
          onFocus={() => setFocusedTaskId(task.id)}
        />
      ))}
    </div>
  )
}
```

### ARIA Labels & Roles
```typescript
// ✅ REQUIRED - Proper ARIA attributes
export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ 
  status,
  agentName 
}) => {
  const statusConfig = AGENT_STATUS_CONFIG[status]
  
  return (
    <div
      className={cn('status-indicator', statusConfig.className)}
      role="status"
      aria-label={`${agentName} is ${statusConfig.label}`}
      aria-live="polite"
    >
      <span className="sr-only">
        {agentName} status: {statusConfig.label}
      </span>
      {statusConfig.icon}
    </div>
  )
}
```

## Testing Requirements

### Component Testing
```typescript
// ✅ REQUIRED - Comprehensive component tests
describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    status: TaskStatus.TODO,
    // ... other properties
  }
  
  const mockProps: TaskCardProps = {
    task: mockTask,
    onStatusChange: jest.fn(),
    onEdit: jest.fn()
  }
  
  it('renders task information correctly', () => {
    render(<TaskCard {...mockProps} />)
    
    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })
  
  it('calls onStatusChange when status is updated', async () => {
    render(<TaskCard {...mockProps} />)
    
    const statusButton = screen.getByRole('button', { name: /change status/i })
    fireEvent.click(statusButton)
    
    const inProgressOption = screen.getByText('In Progress')
    fireEvent.click(inProgressOption)
    
    expect(mockProps.onStatusChange).toHaveBeenCalledWith('1', TaskStatus.IN_PROGRESS)
  })
  
  it('is accessible via keyboard', () => {
    render(<TaskCard {...mockProps} />)
    
    const card = screen.getByRole('article')
    card.focus()
    
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(mockProps.onEdit).toHaveBeenCalledWith('1')
  })
})
```

### Visual Regression Testing
```typescript
// ✅ REQUIRED - Storybook stories for visual testing
export default {
  title: 'Components/TaskCard',
  component: TaskCard,
  parameters: {
    layout: 'centered'
  }
} as Meta<typeof TaskCard>

export const Default: Story = {
  args: {
    task: mockTask,
    onStatusChange: fn(),
    onEdit: fn()
  }
}

export const InProgress: Story = {
  args: {
    task: { ...mockTask, status: TaskStatus.IN_PROGRESS },
    onStatusChange: fn(),
    onEdit: fn()
  }
}

export const Completed: Story = {
  args: {
    task: { ...mockTask, status: TaskStatus.COMPLETED },
    onStatusChange: fn(),
    onEdit: fn()
  }
}
```

## Style Guidelines

### Tailwind CSS Patterns
```typescript
// ✅ CORRECT - Consistent utility patterns
const cardStyles = cn(
  // Base styles
  'rounded-lg border bg-white shadow-sm',
  'p-4 transition-colors duration-200',
  
  // Interactive styles
  'hover:shadow-md hover:border-gray-300',
  'focus-within:ring-2 focus-within:ring-blue-500',
  
  // State-based styles
  isSelected && 'border-blue-500 bg-blue-50',
  isDisabled && 'opacity-50 pointer-events-none',
  
  // User classes
  className
)
```

### CSS Custom Properties
```typescript
// ✅ CORRECT - Consistent spacing and colors
const DESIGN_TOKENS = {
  spacing: {
    panel: 'var(--spacing-panel, 1rem)',
    section: 'var(--spacing-section, 1.5rem)',
    component: 'var(--spacing-component, 0.5rem)'
  },
  colors: {
    agent: {
      producer: 'var(--color-agent-producer, #3b82f6)',
      architect: 'var(--color-agent-architect, #8b5cf6)',
      engineer: 'var(--color-agent-engineer, #10b981)',
      qa: 'var(--color-agent-qa, #f59e0b)'
    }
  }
} as const
```

**Component violations will result in PR rejection and UI review.**