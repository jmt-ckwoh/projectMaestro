# Agent System Documentation - Project Maestro

## Overview

The agent system is the core of Project Maestro. Each agent is a specialized AI persona with specific responsibilities, tools, and interaction patterns. Agents work collaboratively to transform user ideas into working software.

## Agent Architecture

### Base Agent Structure

```typescript
// src/main/services/agents/base/Agent.ts

interface Agent {
  id: string
  type: AgentType
  name: string
  avatar: string
  systemPrompt: string
  tools: Tool[]
  memoryAccess: MemoryAccessLevel
  status: AgentStatus
  
  // Methods
  processMessage(message: string, context: Context): Promise<AgentResponse>
  updateStatus(status: AgentStatus): void
  getCapabilities(): Capability[]
}

interface Tool {
  name: string
  description: string
  execute: (params: any) => Promise<any>
}

interface MemoryAccessLevel {
  global: boolean
  project: boolean
  task: boolean
  own: boolean  // Agent's own memories
}
```

## Agent Personas

### 1. The Producer

**Role:** Project management and user facilitation

```typescript
// src/main/services/agents/ProducerAgent.ts

const PRODUCER_SYSTEM_PROMPT = `
You are the Producer, the user's primary partner in building software.

Your responsibilities:
1. Guide the user through the development process
2. Extract clarity from vague ideas
3. Maintain project momentum
4. Update project plans based on conversations
5. Coordinate the other agents

Personality traits:
- Encouraging and supportive
- Asks clarifying questions
- Breaks down complex ideas
- Celebrates progress
- Gently pushes for decisions when needed

When the user gives you a vague idea:
1. Acknowledge their vision enthusiastically
2. Ask 3-5 specific questions to add detail
3. Summarize what you understand
4. Suggest next steps
5. Update the project plan

Always maintain a conversational, friendly tone.
`

const producerTools = [
  updateProjectPlan,
  createTask,
  scheduleAgentWork,
  summarizeConversation,
  extractRequirements
]
```

### 2. The Architect

**Role:** System design and technical planning

```typescript
// src/main/services/agents/ArchitectAgent.ts

const ARCHITECT_SYSTEM_PROMPT = `
You are the Architect, responsible for technical design and system structure.

Your responsibilities:
1. Design system architecture based on requirements
2. Select appropriate technology stacks
3. Create component diagrams and data models
4. Ensure scalability and maintainability
5. Research best practices and documentation

Personality traits:
- Thoughtful and analytical
- Explains technical concepts clearly
- Considers multiple solutions
- Focuses on long-term sustainability
- Backs decisions with evidence

When designing a system:
1. Analyze the requirements thoroughly
2. Research similar successful projects
3. Propose 2-3 architecture options
4. Explain trade-offs clearly
5. Create detailed technical specifications

Use technical terms but always explain them.
`

const architectTools = [
  webSearch,
  fetchDocumentation,
  createArchitectureDiagram,
  generateTechSpec,
  evaluateTechStack
]
```

### 3. The Engineer

**Role:** Code implementation

```typescript
// src/main/services/agents/EngineerAgent.ts

const ENGINEER_SYSTEM_PROMPT = `
You are the Engineer, the primary code implementer.

Your responsibilities:
1. Write clean, maintainable code
2. Follow project conventions strictly
3. Implement features based on specifications
4. Handle file operations and code generation
5. Collaborate with QA for testing

Personality traits:
- Detail-oriented and precise
- Follows best practices
- Asks for clarification when needed
- Documents code appropriately
- Takes pride in code quality

When implementing features:
1. Review the specification carefully
2. Break down into small, testable units
3. Write code incrementally
4. Test as you go
5. Commit frequently with clear messages

Always follow the project's coding standards.
`

const engineerTools = [
  readFile,
  writeFile,
  executeCommand,
  searchCodebase,
  refactorCode
]
```

### 4. The QA Engineer

**Role:** Testing and debugging

```typescript
// src/main/services/agents/QAAgent.ts

const QA_SYSTEM_PROMPT = `
You are the QA Engineer, responsible for quality assurance and debugging.

Your primary responsibilities:
1. Write comprehensive test suites
2. Identify and document bugs
3. Debug issues systematically
4. Ensure code meets specifications
5. Maintain test coverage

Your secondary role as Debugger:
1. Use diagnostic approaches (logging, breakpoints)
2. Identify root causes precisely
3. Avoid "shotgun" debugging
4. Document debugging process
5. Prevent similar issues

Personality traits:
- Methodical and thorough
- Constructively critical
- Patient problem-solver
- Clear communicator
- Quality-focused

When testing:
1. Understand requirements fully
2. Write tests before debugging
3. Use minimal test cases
4. Document edge cases
5. Verify fixes don't break existing functionality

Success is measured by efficient, precise bug fixes.
`

const qaTools = [
  runTests,
  writeTest,
  addLogging,
  analyzeError,
  checkCoverage
]
```

## Agent Collaboration Patterns

### 1. Sequential Workflow

```typescript
// User → Producer → Architect → Engineer → QA
const sequentialWorkflow = async (userInput: string) => {
  // Producer clarifies and plans
  const plan = await producer.processMessage(userInput)
  
  // Architect designs based on plan
  const design = await architect.processMessage(plan.output)
  
  // Engineer implements based on design
  const code = await engineer.processMessage(design.output)
  
  // QA tests the implementation
  const testResults = await qa.processMessage(code.output)
  
  return testResults
}
```

### 2. Parallel Workflow

```typescript
// Multiple agents work simultaneously
const parallelWorkflow = async (task: Task) => {
  const [engineerResult, qaPrep] = await Promise.all([
    engineer.implementFeature(task),
    qa.prepareTestSuite(task)
  ])
  
  return qa.testImplementation(engineerResult, qaPrep)
}
```

### 3. Collaborative Debugging

```typescript
// QA and Engineer work together
const debugWorkflow = async (bug: Bug) => {
  // QA identifies the issue
  const diagnosis = await qa.diagnoseBug(bug)
  
  // Engineer reviews diagnosis
  const analysis = await engineer.analyzeCode(diagnosis)
  
  // QA suggests fix approach
  const approach = await qa.suggestFix(analysis)
  
  // Engineer implements fix
  const fix = await engineer.implementFix(approach)
  
  // QA verifies fix
  return qa.verifyFix(fix)
}
```

## Memory System Integration

### Memory Types by Agent

```typescript
interface AgentMemoryConfig {
  producer: {
    global: true,    // User preferences
    project: true,   // All project context
    task: true,      // All task details
    own: true        // Conversation history
  },
  architect: {
    global: true,    // Technical preferences
    project: true,   // Architecture decisions
    task: false,     // Not needed
    own: true        // Design patterns used
  },
  engineer: {
    global: false,   // Not needed
    project: true,   // Coding standards
    task: true,      // Current task only
    own: true        // Code snippets
  },
  qa: {
    global: false,   // Not needed
    project: true,   // Test patterns
    task: true,      // Task requirements
    own: true        // Bug patterns
  }
}
```

### Memory Usage Example

```typescript
// Agent retrieving relevant memories
const getRelevantContext = async (agent: Agent, query: string) => {
  const memories = []
  
  if (agent.memoryAccess.global) {
    memories.push(...await searchGlobalMemories(query))
  }
  
  if (agent.memoryAccess.project) {
    memories.push(...await searchProjectMemories(query, projectId))
  }
  
  if (agent.memoryAccess.task && currentTaskId) {
    memories.push(...await searchTaskMemories(query, currentTaskId))
  }
  
  return memories
}
```

## Agent Status Management

### Status Types

```typescript
type AgentStatus = 
  | 'idle'        // Available for work
  | 'thinking'    // Processing/planning
  | 'working'     // Executing task
  | 'waiting'     // Blocked on external input
  | 'error'       // Error state

interface StatusUpdate {
  agent: AgentType
  status: AgentStatus
  message?: string
  progress?: number
  blockedOn?: string
}
```

### Status Broadcasting

```typescript
// Agents broadcast status to UI
const updateAgentStatus = (update: StatusUpdate) => {
  // Update internal state
  agentState[update.agent].status = update.status
  
  // Broadcast to renderer
  mainWindow.webContents.send('agent-status-update', update)
  
  // Post to chat if significant
  if (update.message) {
    postToChat({
      agent: update.agent,
      message: update.message,
      type: 'status'
    })
  }
}
```

## Tool Implementation

### Tool Structure

```typescript
interface Tool {
  name: string
  description: string
  parameters: ParameterSchema
  execute: (params: any, context: Context) => Promise<any>
}

// Example: Web Search Tool
const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information',
  parameters: {
    query: { type: 'string', required: true },
    limit: { type: 'number', default: 5 }
  },
  execute: async (params, context) => {
    const results = await searchEngine.search(params.query, params.limit)
    
    // Store search in agent memory
    await context.agent.addMemory({
      type: 'search',
      query: params.query,
      results: results.map(r => r.url)
    })
    
    return results
  }
}
```

## Agent Communication Protocol

### Message Format

```typescript
interface AgentMessage {
  id: string
  timestamp: Date
  from: AgentType | 'user'
  to: AgentType | 'all'
  content: string
  metadata?: {
    taskId?: string
    references?: string[]
    suggestedActions?: Action[]
  }
}

interface Action {
  type: 'create_task' | 'update_code' | 'run_test' | 'approve'
  description: string
  params: any
}
```

### Inter-Agent Communication

```typescript
// Agent-to-agent direct message
const sendInterAgentMessage = async (
  from: Agent,
  to: Agent,
  message: string,
  context: Context
) => {
  // Log in chat for transparency
  await postToChat({
    from: from.type,
    to: to.type,
    content: message,
    visibility: 'public'
  })
  
  // Process through receiving agent
  const response = await to.processMessage(message, {
    ...context,
    sender: from.type
  })
  
  return response
}
```

## Configuration & Customization

### Agent Configuration File

```typescript
// src/main/config/agents.json
{
  "agents": {
    "producer": {
      "enabled": true,
      "name": "Parker",
      "avatar": "👔",
      "model": "anthropic.claude-3-sonnet",
      "temperature": 0.7,
      "maxTokens": 2000
    },
    "architect": {
      "enabled": true,
      "name": "Aria",
      "avatar": "🏗️",
      "model": "anthropic.claude-3-sonnet",
      "temperature": 0.3,
      "maxTokens": 3000
    },
    "engineer": {
      "enabled": true,
      "name": "Echo",
      "avatar": "⚡",
      "model": "anthropic.claude-3-sonnet",
      "temperature": 0.2,
      "maxTokens": 4000
    },
    "qa": {
      "enabled": true,
      "name": "Quinn",
      "avatar": "🔍",
      "model": "anthropic.claude-3-sonnet",
      "temperature": 0.1,
      "maxTokens": 2000
    }
  }
}
```

### Dynamic Agent Creation

```typescript
// For advanced users - custom agents
const createCustomAgent = (config: CustomAgentConfig): Agent => {
  return new Agent({
    ...config,
    systemPrompt: config.systemPrompt,
    tools: config.tools.map(t => toolRegistry.get(t)),
    memoryAccess: config.memoryAccess
  })
}
```