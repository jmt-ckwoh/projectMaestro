# ARCHITECTURE.MD - Project Maestro System Architecture
# Version: 3.0 (Strongly Structured for Guided Implementation)

## 1. Core Philosophy

Project Maestro uses a **Unified TypeScript Stack** for simplicity and predictability. This architecture creates a stable foundation for AI-driven development where Claude Code can reason about the full application without context switching.

## 2. Critical Architecture Rules

### 🚨 NEVER VIOLATE THESE RULES

1. **Renderer Process has NO Node.js access** - Never import `fs`, `path`, or any Node modules in `src/renderer/`
2. **All backend operations go through IPC** - Use the preload bridge exclusively
3. **Database access is Main Process only** - LanceDB operations never happen in renderer
4. **Strict TypeScript everywhere** - No `any` types, explicit interfaces required
5. **All domain services MUST implement contracts** - See `src/shared/contracts/` for interfaces
6. **Agent state changes MUST go through StateMachine** - Direct status updates are forbidden
7. **All IPC handlers MUST validate inputs** - Use Zod schemas and security checks
8. **Store ownership is strictly enforced** - No cross-store dependencies
9. **Event-driven communication only** - No direct service-to-service calls across domains

## 3. Electron Process Model

### 3.1. Main Process (`src/main/`)
**The application's backend with full Node.js access**

```typescript
// ✅ CAN use in Main Process:
import { readFile } from 'fs/promises'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
```

**Responsibilities:**
- Window lifecycle management
- Express.js API server
- LanceDB vector operations  
- LangChain.js AI orchestration
- File system operations
- Native OS integration

### 3.2. Renderer Process (`src/renderer/`)
**The React UI in a sandboxed browser environment**

```typescript
// ❌ NEVER use in Renderer:
import fs from 'fs'  // Will fail!

// ✅ ALWAYS use instead:
const data = await window.api.readFile(path)
```

**Responsibilities:**
- React component rendering
- User interaction handling
- State management (Zustand)
- Visual updates only

### 3.3. Preload Script (`src/preload/`)
**The secure bridge - the ONLY way renderer talks to main**

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Expose specific operations only
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, content: string) => 
    ipcRenderer.invoke('write-file', path, content)
})
```

## 4. Data Flow Architecture

### Standard Request Flow

```
1. User Action (Click/Type)
   ↓
2. React Component
   ↓
3. Zustand Store Action
   ↓
4. window.api.methodName() call
   ↓
5. Preload Script (IPC send)
   ↓
6. Main Process Handler
   ↓
7. Service Logic (DB/AI/Files)
   ↓
8. Response back through IPC
   ↓
9. UI Update via Zustand
```

### Example Implementation

```typescript
// 1. Renderer Component
const TaskBoard = () => {
  const createTask = useTaskStore(state => state.createTask)
  
  const handleCreate = async () => {
    await createTask({ title: 'New Task' })
  }
}

// 2. Zustand Store
const useTaskStore = create((set) => ({
  createTask: async (data) => {
    const task = await window.api.createTask(data)
    set(state => ({ tasks: [...state.tasks, task] }))
  }
}))

// 3. Preload Exposure
contextBridge.exposeInMainWorld('api', {
  createTask: (data) => ipcRenderer.invoke('create-task', data)
})

// 4. Main Process Handler
ipcMain.handle('create-task', async (event, data) => {
  return await taskService.create(data)
})
```

## 5. Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    // Electron & Build
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "vite": "^5.0.0",
    
    // React & UI
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    
    // State Management
    "zustand": "^4.4.0",
    "immer": "^10.0.0",
    
    // Backend
    "express": "^4.18.0",
    "vectordb": "^0.4.0",  // LanceDB
    "langchain": "^0.1.0",
    "@aws-sdk/client-bedrock-runtime": "^3.0.0",
    
    // Utilities
    "zod": "^3.22.0",
    "uuid": "^9.0.0"
  }
}
```

### Directory Structure

```
project-maestro/
├── src/
│   ├── main/              # Backend (Node.js access)
│   │   ├── index.ts       # Entry, creates windows
│   │   ├── api/           # Express routes
│   │   ├── services/      # Domain services (see CLAUDE.md in each)
│   │   │   ├── agents/    # Agent domain (with state machine)
│   │   │   ├── projects/  # Project management domain
│   │   │   ├── memory/    # Vector memory domain
│   │   │   └── git/       # Version control domain
│   │   ├── security/      # Security validation & threat model
│   │   ├── ipc/           # IPC handlers (validated & secured)
│   │   └── workflows/     # Agent orchestration workflows
│   │
│   ├── renderer/          # Frontend (No Node.js!)
│   │   ├── index.tsx      
│   │   ├── App.tsx        
│   │   ├── components/    # UI components (see CLAUDE.md)
│   │   ├── stores/        # Zustand stores (strict ownership)
│   │   ├── hooks/         
│   │   └── utils/         
│   │
│   ├── preload/           # Bridge
│   │   └── index.ts       # ONLY place for contextBridge
│   │
│   └── shared/            # Shared contracts & types
│       ├── contracts/     # Domain service contracts
│       └── types/         # TypeScript interfaces
```

## 6. AI Architecture (Phase-Based)

### Phase 1: LangChain.js (Current)
- AI orchestration runs directly in Main process
- Agent personalities via system prompts
- Memory via LanceDB vector search

### Phase 2: SGLang Microservice (Future)
- Python SGLang service for performance
- Main process becomes HTTP client
- Same API surface for renderer

## 7. Security Model

### IPC Security Rules

```typescript
// ✅ GOOD: Specific, validated operations
ipcMain.handle('read-project-file', async (event, projectId, filename) => {
  // Validate inputs
  if (!isValidProjectId(projectId)) throw new Error('Invalid project')
  if (!isSafeFilename(filename)) throw new Error('Invalid filename')
  
  // Constrain to project directory
  const safePath = path.join(projectsDir, projectId, filename)
  return await readFile(safePath, 'utf-8')
})

// ❌ BAD: Direct filesystem access
ipcMain.handle('read-any-file', async (event, path) => {
  return await readFile(path) // NEVER DO THIS
})
```

## 8. State Management Rules

### Zustand Store Patterns

```typescript
// ✅ GOOD: Clear actions, proper typing
interface ProjectStore {
  projects: Project[]
  isLoading: boolean
  
  // Explicit actions
  fetchProjects: () => Promise<void>
  createProject: (data: CreateProjectInput) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
}

// ❌ BAD: Direct state manipulation
// Never expose setState directly
```

## 9. Development Workflow

### File Creation Order (MANDATORY SEQUENCE)
1. **Define domain contract** in `src/shared/contracts/` 
2. **Create domain service** in `src/main/services/` (implementing contract)
3. **Add validated IPC handler** in `src/main/ipc/` (with security checks)
4. **Expose secure API** in `src/preload/index.ts`
5. **Create owned Zustand store** (following store architecture rules)
6. **Build React components** (following component architecture rules)
7. **Add comprehensive tests** for each layer

### Commit Strategy
```bash
# After each working piece
git add .
git commit -m "feat: add task creation IPC handler"

# Not after massive changes
# Claude Code works better with incremental commits
```

## 10. Common Pitfalls & Solutions

### Pitfall 1: Node.js in Renderer
```typescript
// ❌ WRONG
import { existsSync } from 'fs'

// ✅ RIGHT
const exists = await window.api.fileExists(path)
```

### Pitfall 2: Large IPC Transfers
```typescript
// ❌ WRONG: Sending huge data
return await db.getAllRecords() // 10MB of data

// ✅ RIGHT: Paginate or filter
return await db.getRecords({ limit: 50, offset: 0 })
```

### Pitfall 3: Synchronous IPC
```typescript
// ❌ WRONG: ipcRenderer.sendSync blocks
const result = ipcRenderer.sendSync('get-data')

// ✅ RIGHT: Always use async
const result = await ipcRenderer.invoke('get-data')
```

## Quick Reference Links

- **Domain Contracts**: `/src/shared/contracts/` - Service interfaces and validation rules
- **Agent Domain Rules**: `/src/main/services/agents/CLAUDE.md` - Agent implementation guidelines
- **Component Rules**: `/src/renderer/components/CLAUDE.md` - UI component architecture
- **Store Rules**: `/src/renderer/stores/STORE_ARCHITECTURE.md` - State management patterns
- **Security Model**: `/src/main/security/SECURITY_MODEL.md` - IPC validation and threat model
- **API Documentation**: `/docs/api/README.md` - IPC API reference
- **Agent System Docs**: `/docs/agents/README.md` - Agent persona specifications
- **Templates**: `/src/templates/` - Code generation templates

## Architecture Decision Records (ADRs)

1. **Domain-Driven Design** - Strict service boundaries prevent architectural drift
2. **Event-Driven Architecture** - Loose coupling via event bus prevents service dependencies
3. **Agent State Machine** - Predictable state transitions prevent coordination chaos
4. **Security-First IPC** - All inputs validated to prevent privilege escalation
5. **Store Ownership Model** - Clear data ownership prevents state corruption
6. **Component Hierarchy** - Structured UI patterns ensure maintainable interface

## Implementation Checklist

Before any implementation, verify:
- [ ] Domain contract exists and is implemented
- [ ] State machine handles all transitions
- [ ] IPC handlers have validation and security checks
- [ ] Store follows ownership rules
- [ ] Components follow architecture patterns
- [ ] Tests cover all integration points
- [ ] Error handling follows domain patterns
- [ ] Events are properly emitted and handled

**Violations of these architectural rules will result in immediate PR rejection.**