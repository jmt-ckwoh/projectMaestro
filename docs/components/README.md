# Component Guidelines - Project Maestro

## Component Structure

### Base Component Template

```typescript
// src/renderer/components/[category]/[ComponentName].tsx

import React from 'react'
import { cn } from '@/utils/cn' // Utility for className merging

interface ComponentNameProps {
  // Define all props with TypeScript
  className?: string // Always allow className override
  children?: React.ReactNode // If component can have children
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  className,
  children,
  ...props 
}) => {
  // Hooks at the top
  const [state, setState] = React.useState<StateType>(initialValue)
  
  // Handlers next
  const handleAction = React.useCallback(() => {
    // Handler logic
  }, [dependencies])
  
  // Effects after handlers
  React.useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  // Render
  return (
    <div className={cn('base-classes', className)}>
      {children}
    </div>
  )
}

// Default props if needed
ComponentName.defaultProps = {
  // defaults
}
```

## Component Categories

### 1. Chat Components (`src/renderer/components/chat/`)

#### ChatPanel.tsx
Main chat interface container.

```typescript
interface ChatPanelProps {
  projectId: string
  className?: string
}
```

#### MessageList.tsx
Displays chat messages with agent avatars.

```typescript
interface MessageListProps {
  messages: Message[]
  onMessageAction?: (messageId: string, action: string) => void
}
```

#### MessageInput.tsx
Input field with agent targeting.

```typescript
interface MessageInputProps {
  onSend: (message: string, targetAgent?: AgentType) => void
  disabled?: boolean
  placeholder?: string
}
```

### 2. Workspace Components (`src/renderer/components/workspace/`)

#### TaskBoard.tsx
Kanban-style task board.

```typescript
interface TaskBoardProps {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick: (task: Task) => void
}
```

#### ProjectOverview.tsx
High-level project metrics and status.

```typescript
interface ProjectOverviewProps {
  project: Project
  stats: ProjectStats
}
```

#### TaskDetail.tsx
Detailed view of a single task.

```typescript
interface TaskDetailProps {
  task: Task
  onUpdate: (updates: Partial<Task>) => void
  onClose: () => void
}
```

### 3. Team Components (`src/renderer/components/team/`)

#### AgentCard.tsx
Display card for an AI agent.

```typescript
interface AgentCardProps {
  agent: Agent
  status: AgentStatus
  onClick?: () => void
}
```

#### AgentActivity.tsx
Live view of agent's current activity.

```typescript
interface AgentActivityProps {
  agentType: AgentType
  activity: AgentActivity[]
}
```

### 4. Common Components (`src/renderer/components/common/`)

#### Button.tsx
Reusable button with variants.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
```

#### Modal.tsx
Modal dialog wrapper.

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}
```

#### LoadingSpinner.tsx
Loading indicator.

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}
```

## Styling Guidelines

### Use Tailwind Classes Only

```typescript
// ✅ Good
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">

// ❌ Bad - Don't use style prop
<div style={{ display: 'flex', padding: '16px' }}>

// ❌ Bad - Don't create CSS files
import './Component.css'
```

### Responsive Design

Always consider mobile-first:

```typescript
<div className="p-2 md:p-4 lg:p-6">
  <h1 className="text-lg md:text-xl lg:text-2xl">
</div>
```

### Dark Mode Support

Use Tailwind dark mode classes:

```typescript
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
```

### Common Patterns

```typescript
// Card container
"bg-white dark:bg-gray-800 rounded-lg shadow p-4"

// Primary button
"px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"

// Input field
"w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

// Error state
"border-red-500 text-red-600 dark:text-red-400"

// Success state
"border-green-500 text-green-600 dark:text-green-400"
```

## State Management Integration

### Using Zustand Stores

```typescript
import { useProjectStore } from '@/stores/projectStore'

export const MyComponent: React.FC = () => {
  // Select specific values to prevent unnecessary re-renders
  const currentProject = useProjectStore(state => state.currentProject)
  const updateProject = useProjectStore(state => state.updateProject)
  
  const handleUpdate = () => {
    updateProject(projectId, updates)
  }
  
  return <div>{currentProject?.name}</div>
}
```

### Async Operations

```typescript
export const DataComponent: React.FC = () => {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await window.api.getData()
      // Handle data
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} />
  
  return <div>Content</div>
}
```

## Performance Guidelines

### Memoization

```typescript
// Memoize expensive computations
const expensiveValue = React.useMemo(() => {
  return computeExpensiveValue(props.data)
}, [props.data])

// Memoize callbacks passed to children
const handleClick = React.useCallback((id: string) => {
  // Handle click
}, [dependencies])

// Memoize components if needed
export const MyComponent = React.memo<MyComponentProps>(({ props }) => {
  // Component
})
```

### List Rendering

```typescript
// Always use keys for lists
{items.map(item => (
  <ItemComponent key={item.id} item={item} />
))}

// For large lists, consider virtualization
import { FixedSizeList } from 'react-window'
```

## Testing Patterns

```typescript
// src/tests/components/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
  
  it('should handle click events', () => {
    const handleClick = jest.fn()
    render(<MyComponent onClick={handleClick} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## Accessibility

### Always Include

```typescript
// Semantic HTML
<button> not <div onClick>

// ARIA labels when needed
<button aria-label="Close dialog">×</button>

// Keyboard navigation
<input onKeyDown={handleKeyDown} />

// Focus management
const inputRef = React.useRef<HTMLInputElement>(null)
React.useEffect(() => {
  inputRef.current?.focus()
}, [])

// Announce dynamic content
<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

## Common Mistakes to Avoid

1. **Direct DOM manipulation** - Use React state
2. **Inline styles** - Use Tailwind classes
3. **Large components** - Break into smaller pieces
4. **Props drilling** - Use Zustand for shared state
5. **Missing error boundaries** - Wrap risky components
6. **Forgetting cleanup** - Clear timers/subscriptions
7. **Blocking renders** - Use async patterns properly