# Project Maestro Examples

This directory contains comprehensive working examples that demonstrate Project Maestro architecture patterns. These examples serve as templates and learning resources for implementing features following the established conventions.

## 📁 Example Files

### 🎨 Components
- **`ChatPanelExample.tsx`** - Complete chat panel implementation
  - Real-time messaging with agents
  - Typing indicators and message status
  - Auto-scroll and user interaction patterns
  - Store integration and error handling
  - Accessibility and keyboard navigation

### 🔧 Services  
- **`AgentServiceExample.ts`** - Full agent service implementation
  - Contract compliance and event-driven architecture
  - State machine integration and status management
  - AI message processing and response generation
  - Error handling and recovery patterns
  - Service lifecycle and cleanup

### 📦 Stores
- **`StoreExample.ts`** - Comprehensive Zustand store
  - Proper state ownership and action patterns
  - Async operations with loading/error states
  - Persistence and hydration strategies
  - Computed values and selectors
  - Performance optimization techniques

## 🚀 How to Use These Examples

### 1. Study the Patterns
Read through the examples to understand:
- **Architecture decisions** and why they were made
- **Code organization** and structure patterns
- **Error handling** strategies
- **Performance optimization** techniques
- **Testing approach** and coverage

### 2. Copy and Adapt
Use these as starting points for your own implementations:

```bash
# Copy a component example
cp src/templates/examples/ChatPanelExample.tsx src/renderer/components/chat/ChatPanel.tsx

# Copy a service example  
cp src/templates/examples/AgentServiceExample.ts src/main/services/agents/AgentService.ts

# Copy a store example
cp src/templates/examples/StoreExample.ts src/renderer/stores/projectStore.ts
```

### 3. Follow the Conventions
Each example demonstrates:
- ✅ **Proper TypeScript usage** with strict typing
- ✅ **Contract implementation** and interface compliance
- ✅ **Event-driven patterns** for loose coupling
- ✅ **Error boundaries** and graceful failure handling
- ✅ **Accessibility support** with ARIA labels and keyboard navigation
- ✅ **Performance optimization** with memoization and virtualization
- ✅ **Testing patterns** with comprehensive coverage

## 🎯 Key Patterns Demonstrated

### Component Architecture
```typescript
// ✅ Proper component structure
export const MyComponent: React.FC<MyComponentProps> = ({ 
  // Destructured props with defaults
  variant = 'primary',
  disabled = false,
  onAction,
  ...props 
}) => {
  // Hooks in consistent order
  const storeData = useMyStore(state => state.data)
  const [localState, setLocalState] = useState(false)
  const ref = useRef<HTMLElement>(null)
  
  // Memoized callbacks
  const handleAction = useCallback(() => {
    if (!disabled && onAction) {
      onAction()
    }
  }, [disabled, onAction])
  
  // Effects with proper dependencies
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup logic
    }
  }, [])
  
  // Render with proper accessibility
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
      onClick={handleAction}
    >
      {/* Component content */}
    </div>
  )
}
```

### Service Architecture
```typescript
// ✅ Proper service structure
export class MyService extends EventEmitter implements MyServiceContract {
  constructor(config: MyServiceConfig) {
    super()
    this.config = config
  }

  async initialize(): Promise<void> {
    // Initialization logic with proper error handling
  }

  async cleanup(): Promise<void> {
    // Cleanup logic with event listener removal
  }

  // Contract-defined methods with proper error handling
  async performAction(input: ActionInput): Promise<ActionResult> {
    try {
      this.validateInput(input)
      const result = await this.executeAction(input)
      this.emit('action-completed', { result })
      return result
    } catch (error) {
      this.handleError(error, 'performAction')
      throw error
    }
  }
}
```

### Store Architecture
```typescript
// ✅ Proper store structure
export const useMyStore = create<MyStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // State with proper typing
        data: {},
        isLoading: false,
        error: null,
        
        // Computed values as getters
        get filteredData() {
          return Object.values(get().data).filter(/* filter logic */)
        },
        
        // Actions with proper error handling
        async loadData() {
          set(state => { state.isLoading = true })
          try {
            const data = await api.loadData()
            set(state => { 
              state.data = data
              state.isLoading = false 
            })
          } catch (error) {
            set(state => { 
              state.error = error.message
              state.isLoading = false 
            })
          }
        }
      }))
    )
  )
)
```

## 🧪 Testing Examples

Each example includes comprehensive testing patterns:

### Component Testing
```typescript
describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
  
  it('handles user interactions', async () => {
    const onAction = jest.fn()
    render(<MyComponent onAction={onAction} />)
    
    await user.click(screen.getByRole('button'))
    expect(onAction).toHaveBeenCalled()
  })
  
  it('is accessible', () => {
    render(<MyComponent disabled />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
  })
})
```

### Service Testing
```typescript
describe('MyService', () => {
  let service: MyService
  
  beforeEach(() => {
    service = new MyService(mockConfig)
  })
  
  afterEach(async () => {
    await service.cleanup()
  })
  
  it('implements contract correctly', () => {
    expect(service).toBeInstanceOf(MyServiceContract)
  })
  
  it('emits events correctly', async () => {
    const eventHandler = jest.fn()
    service.on('action-completed', eventHandler)
    
    await service.performAction(mockInput)
    expect(eventHandler).toHaveBeenCalled()
  })
})
```

### Store Testing
```typescript
describe('useMyStore', () => {
  beforeEach(() => {
    useMyStore.getState().reset()
  })
  
  it('loads data correctly', async () => {
    const store = useMyStore.getState()
    await store.loadData()
    
    expect(store.data).toBeDefined()
    expect(store.isLoading).toBe(false)
  })
  
  it('handles errors correctly', async () => {
    mockApi.loadData.mockRejectedValue(new Error('API Error'))
    
    const store = useMyStore.getState()
    await store.loadData()
    
    expect(store.error).toBe('API Error')
    expect(store.isLoading).toBe(false)
  })
})
```

## 📚 Additional Resources

### Architecture Documentation
- [`CLAUDE.md`](../../../CLAUDE.md) - Main architecture rules
- [`src/renderer/components/CLAUDE.md`](../../renderer/components/CLAUDE.md) - Component guidelines
- [`src/renderer/stores/STORE_ARCHITECTURE.md`](../../renderer/stores/STORE_ARCHITECTURE.md) - Store patterns
- [`src/main/services/agents/CLAUDE.md`](../../main/services/agents/CLAUDE.md) - Service guidelines

### Code Generation
- [`scripts/generate-component.js`](../../../scripts/generate-component.js) - Component generator
- [`scripts/generate-service.js`](../../../scripts/generate-service.js) - Service generator
- [`scripts/validate-architecture.js`](../../../scripts/validate-architecture.js) - Architecture validator

### Testing Setup
- [`jest.config.js`](../../../jest.config.js) - Test configuration
- [`tests/setup/`](../../../tests/setup/) - Test environment setup
- [`.storybook/`](../../../.storybook/) - Storybook configuration

## 🔍 Code Quality

All examples follow these quality standards:

- **📝 TypeScript**: Strict typing with no `any` types
- **🎨 Formatting**: Prettier and ESLint compliance  
- **📐 Architecture**: Contract-based design and proper separation of concerns
- **🔒 Security**: Input validation and secure IPC patterns
- **♿ Accessibility**: WCAG compliance and keyboard navigation
- **⚡ Performance**: Optimized rendering and memory usage
- **🧪 Testing**: Comprehensive coverage with unit, integration, and E2E tests

## 💡 Best Practices

### Do's ✅
- Follow the established patterns in these examples
- Use TypeScript strictly with proper interface definitions
- Implement proper error handling and recovery
- Add comprehensive tests for all functionality
- Follow accessibility guidelines
- Use memoization for performance optimization
- Emit events for loose coupling between services

### Don'ts ❌
- Don't deviate from the architecture without approval
- Don't use `any` types or skip TypeScript checking
- Don't mix business logic in UI components
- Don't create cross-store dependencies
- Don't ignore error cases or accessibility requirements
- Don't skip testing or documentation

## 🎯 Next Steps

1. **Study these examples** to understand the patterns
2. **Run the code** to see it in action
3. **Modify and experiment** to learn the concepts
4. **Apply the patterns** to your own implementations
5. **Validate compliance** using the architecture scripts
6. **Test thoroughly** following the example patterns

Happy coding! 🚀