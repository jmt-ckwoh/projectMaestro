# API Documentation - Project Maestro

## Overview

All API communication flows through IPC (Inter-Process Communication) between the renderer and main process. The main process runs an internal Express server for structured request handling.

## IPC API Reference

### Project Management

#### `window.api.createProject(data: CreateProjectInput): Promise<Project>`
Creates a new project with the given configuration.

```typescript
interface CreateProjectInput {
  name: string
  description: string
  vibe?: string  // Initial brain dump from user
}

interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  status: 'planning' | 'active' | 'completed'
  gitRepo?: string
}
```

#### `window.api.getProjects(): Promise<Project[]>`
Retrieves all projects.

#### `window.api.getProject(id: string): Promise<Project>`
Retrieves a specific project by ID.

#### `window.api.updateProject(id: string, updates: Partial<Project>): Promise<Project>`
Updates project properties.

### Agent Communication

#### `window.api.sendMessage(data: SendMessageInput): Promise<AgentResponse>`
Sends a message to the AI team or specific agent.

```typescript
interface SendMessageInput {
  projectId: string
  message: string
  targetAgent?: AgentType  // If omitted, goes to Producer
  context?: MessageContext
}

type AgentType = 'producer' | 'architect' | 'engineer' | 'qa'

interface MessageContext {
  currentTask?: string
  referencedFiles?: string[]
}

interface AgentResponse {
  agentType: AgentType
  message: string
  suggestedActions?: Action[]
  updates?: ProjectUpdate[]
}
```

#### `window.api.getAgentStatus(agentType: AgentType): Promise<AgentStatus>`
Gets current status of an agent.

```typescript
interface AgentStatus {
  agentType: AgentType
  status: 'idle' | 'thinking' | 'working' | 'waiting'
  currentTask?: string
  progress?: number  // 0-100
}
```

### Task Management

#### `window.api.createTask(data: CreateTaskInput): Promise<Task>`
Creates a new task in the project.

```typescript
interface CreateTaskInput {
  projectId: string
  title: string
  description: string
  type: 'epic' | 'story' | 'task' | 'bug'
  assignedAgent?: AgentType
  parentId?: string  // For subtasks
}

interface Task {
  id: string
  projectId: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  assignedAgent?: AgentType
  createdAt: Date
  updatedAt: Date
  parentId?: string
  children?: Task[]
}

type TaskStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done'
```

#### `window.api.updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task>`
Updates the status of a task.

#### `window.api.getTasks(projectId: string, filter?: TaskFilter): Promise<Task[]>`
Gets tasks for a project with optional filtering.

```typescript
interface TaskFilter {
  type?: TaskType
  status?: TaskStatus
  assignedAgent?: AgentType
}
```

### Memory & Context

#### `window.api.addMemory(data: AddMemoryInput): Promise<Memory>`
Adds a memory to the vector store.

```typescript
interface AddMemoryInput {
  content: string
  type: 'global' | 'project' | 'task'
  projectId?: string  // Required for project/task memories
  taskId?: string     // Required for task memories
  metadata?: Record<string, any>
}

interface Memory {
  id: string
  content: string
  type: MemoryType
  embedding?: number[]  // Vector representation
  createdAt: Date
  metadata?: Record<string, any>
}
```

#### `window.api.searchMemories(query: string, options?: SearchOptions): Promise<Memory[]>`
Searches memories using semantic similarity.

```typescript
interface SearchOptions {
  type?: MemoryType
  projectId?: string
  limit?: number  // Default: 10
}
```

### File Operations

#### `window.api.readFile(path: string): Promise<string>`
Reads a file from the project directory.

#### `window.api.writeFile(path: string, content: string): Promise<void>`
Writes content to a file in the project directory.

#### `window.api.getFileTree(projectId: string): Promise<FileNode>`
Gets the file tree structure for a project.

```typescript
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}
```

### Git Operations

#### `window.api.createCheckpoint(projectId: string, message: string): Promise<Checkpoint>`
Creates a git commit checkpoint.

```typescript
interface Checkpoint {
  id: string  // Git commit hash
  message: string
  timestamp: Date
  files: string[]  // Changed files
}
```

#### `window.api.getCheckpoints(projectId: string): Promise<Checkpoint[]>`
Gets all checkpoints for a project.

#### `window.api.restoreCheckpoint(projectId: string, checkpointId: string): Promise<void>`
Restores project to a specific checkpoint.

### AI Configuration

#### `window.api.updateAIConfig(config: AIConfig): Promise<void>`
Updates AI provider configuration.

```typescript
interface AIConfig {
  provider: 'bedrock' | 'openai' | 'anthropic'
  bedrock?: {
    region: string
    accessKeyId: string
    secretAccessKey: string
    model?: string
  }
  openai?: {
    apiKey: string
    model?: string
  }
  anthropic?: {
    apiKey: string
    model?: string
  }
}
```

## Error Handling

All API methods can throw errors. Handle them appropriately:

```typescript
try {
  const project = await window.api.createProject({ name: 'Test' })
} catch (error) {
  if (error.code === 'PROJECT_EXISTS') {
    // Handle duplicate project
  } else {
    // Handle general error
  }
}
```

Common error codes:
- `PROJECT_NOT_FOUND`
- `PROJECT_EXISTS`
- `TASK_NOT_FOUND`
- `AGENT_BUSY`
- `AI_PROVIDER_ERROR`
- `FILE_NOT_FOUND`
- `GIT_ERROR`

## Rate Limiting

To prevent overwhelming the AI providers:
- Agent messages are queued if an agent is busy
- Maximum 5 concurrent agent operations
- File operations are throttled to 10/second

## WebSocket Events

For real-time updates, subscribe to WebSocket events:

```typescript
window.api.on('agent-status-changed', (data: AgentStatusEvent) => {
  // Update UI
})

window.api.on('task-updated', (data: TaskUpdateEvent) => {
  // Update task board
})

window.api.on('new-message', (data: MessageEvent) => {
  // Add to chat
})
```