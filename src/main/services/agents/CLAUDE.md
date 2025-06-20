# Agent Services Domain Rules

**This directory contains agent-related services. Follow these rules strictly to maintain system integrity.**

## Domain Boundaries

### Agent Services MUST:
- Implement the `IAgentDomainService` contract from `@/shared/contracts/AgentDomain`
- Use the `AgentStateMachine` for all state transitions
- Validate all inputs using Zod schemas
- Emit domain events for state changes
- Handle errors gracefully with proper error types

### Agent Services MUST NOT:
- Access Project domain directly (use event bus)
- Access Memory domain directly (use event bus)
- Perform file operations (delegate to appropriate services)
- Store state outside of the agent domain

## File Organization

```
agents/
├── CLAUDE.md              # This file - domain rules
├── AgentStateMachine.ts   # State machine implementation
├── AgentOrchestrator.ts   # Main orchestration service
├── base/
│   ├── Agent.ts          # Base agent interface
│   ├── AgentService.ts   # Base service implementation
│   └── AgentTools.ts     # Tool management
├── personas/
│   ├── Producer.ts       # Producer agent implementation
│   ├── Architect.ts      # Architect agent implementation
│   ├── Engineer.ts       # Engineer agent implementation
│   └── QA.ts            # QA agent implementation
└── workflows/
    ├── SequentialWorkflow.ts  # Sequential agent collaboration
    ├── ParallelWorkflow.ts    # Parallel agent collaboration
    └── DebuggingWorkflow.ts   # Debugging collaboration pattern
```

## Implementation Patterns

### 1. Agent Service Implementation
```typescript
// ✅ CORRECT - Follow the contract
export class ProducerAgentService implements IAgentDomainService {
  constructor(
    private readonly stateMachine: AgentStateMachine,
    private readonly eventBus: IEventBus,
    private readonly llmProvider: LLMProvider
  ) {}
  
  async sendMessage(message: AgentMessage): Promise<Result<AgentResponse, DomainError>> {
    // 1. Validate input
    const validation = AgentMessageSchema.safeParse(message)
    if (!validation.success) {
      return Err(new ValidationError('agent', 'Invalid message', validation.error))
    }
    
    // 2. Check state machine
    if (!this.stateMachine.canTransition(AgentStatus.THINKING)) {
      return Err(new AgentNotAvailableError(this.agentId, this.stateMachine.getCurrentState()))
    }
    
    // 3. Update state
    await this.stateMachine.transition(AgentStatus.THINKING, 'Processing message')
    
    // 4. Process message
    try {
      const response = await this.processMessage(validation.data)
      
      // 5. Update state and emit events
      await this.stateMachine.transition(AgentStatus.IDLE, 'Message processed')
      this.eventBus.publishAsync(new AgentMessageSentEvent(...))
      
      return Ok(response)
    } catch (error) {
      await this.stateMachine.transition(AgentStatus.ERROR, error.message)
      return Err(error as DomainError)
    }
  }
}
```

### 2. State Machine Usage
```typescript
// ✅ CORRECT - Always use state machine for transitions
export class BaseAgentService {
  protected async changeStatus(newStatus: AgentStatus, reason?: string): Promise<boolean> {
    const success = await this.stateMachine.transition(newStatus, reason)
    
    if (success) {
      // Emit event for UI updates
      this.eventBus.publishAsync({
        type: 'agent.status.changed',
        agentId: this.agentId,
        agentType: this.agentType,
        payload: {
          previousStatus: this.stateMachine.getCurrentState(),
          newStatus,
          reason
        }
      })
    }
    
    return success
  }
}

// ❌ FORBIDDEN - Direct status changes
export class BadAgentService {
  async badStatusUpdate() {
    this.status = AgentStatus.WORKING // ❌ Bypasses state machine
  }
}
```

### 3. Error Handling Patterns
```typescript
// ✅ CORRECT - Domain-specific error handling
export class AgentService {
  async processMessage(message: AgentMessage): Promise<AgentResponse> {
    try {
      return await this.llmProvider.chat(message.content)
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw new RateLimitExceededError(this.agentId, 'messages')
      } else if (error instanceof AuthError) {
        throw new BusinessRuleViolationError('agent', 'Invalid API credentials')
      } else {
        throw new DomainError('AGENT_PROCESSING_ERROR', 'agent', error.message, error)
      }
    }
  }
}
```

### 4. Event Bus Integration
```typescript
// ✅ CORRECT - Proper event handling
export class AgentOrchestrator {
  constructor(private readonly eventBus: IEventBus) {
    // Subscribe to relevant events
    this.eventBus.subscribe('project.task.created', this.handleNewTask.bind(this))
    this.eventBus.subscribe('agent.collaboration.requested', this.handleCollaboration.bind(this))
  }
  
  private async handleNewTask(event: TaskCreatedEvent): Promise<void> {
    // Determine which agent should handle the task
    const assignedAgent = this.selectAgentForTask(event.payload.task)
    
    // Send task to agent
    await this.sendTaskToAgent(assignedAgent, event.payload.task)
  }
}
```

## Tool Management

### Tool Registration
```typescript
// ✅ CORRECT - Centralized tool registry
export class AgentToolRegistry {
  private readonly tools = new Map<string, AgentTool>()
  
  register(tool: AgentTool): void {
    // Validate tool contract
    if (!this.isValidTool(tool)) {
      throw new ValidationError('agent', 'Invalid tool contract', ...)
    }
    
    this.tools.set(tool.name, tool)
  }
  
  getToolsForAgent(agentType: AgentType): AgentTool[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.allowedAgents.includes(agentType))
  }
}
```

### Tool Security
```typescript
// ✅ CORRECT - Secure tool execution
export class SecureToolExecutor {
  async executeTool(
    tool: AgentTool,
    params: unknown,
    context: AgentContext
  ): Promise<ToolResult> {
    // 1. Validate permissions
    if (!context.hasPermission(tool.requiredPermission)) {
      throw new SecurityError('INSUFFICIENT_PERMISSIONS', `Tool ${tool.name} requires ${tool.requiredPermission}`)
    }
    
    // 2. Validate parameters
    const validatedParams = tool.parameterSchema.parse(params)
    
    // 3. Rate limiting
    await this.rateLimiter.checkLimit(context.agentId, `tool:${tool.name}`)
    
    // 4. Execute with timeout
    return await Promise.race([
      tool.execute(validatedParams, context),
      this.createTimeout(tool.timeoutMs)
    ])
  }
}
```

## Persona Implementation Rules

### System Prompt Management
```typescript
// ✅ CORRECT - Version-controlled prompts
export class ProducerAgent extends BaseAgent {
  protected getSystemPrompt(): string {
    return `
You are the Producer, the user's primary partner in building software.

CORE RESPONSIBILITIES:
1. Guide the user through the development process
2. Extract clarity from vague ideas  
3. Maintain project momentum
4. Update project plans based on conversations
5. Coordinate the other agents

PERSONALITY TRAITS:
- Encouraging and supportive
- Asks clarifying questions
- Breaks down complex ideas
- Celebrates progress
- Gently pushes for decisions when needed

INTERACTION PATTERNS:
When the user gives you a vague idea:
1. Acknowledge their vision enthusiastically
2. Ask 3-5 specific questions to add detail
3. Summarize what you understand
4. Suggest next steps
5. Update the project plan

CONSTRAINTS:
- Keep responses conversational and friendly
- Ask ONE question at a time for clarity
- Always end with a suggested next action
- Use the project update tool when plans change
    `.trim()
  }
}
```

### Agent Collaboration
```typescript
// ✅ CORRECT - Structured agent communication
export class AgentCollaborationManager {
  async initiateCollaboration(
    initiator: AgentType,
    collaborators: AgentType[],
    context: CollaborationContext
  ): Promise<string> {
    // 1. Validate all agents are available
    for (const agentType of [initiator, ...collaborators]) {
      const agent = await this.getAgent(agentType)
      if (!agent.isAvailable()) {
        throw new AgentNotAvailableError(agent.id, agent.getCurrentStatus())
      }
    }
    
    // 2. Create collaboration session
    const sessionId = this.generateSessionId()
    const session = new CollaborationSession(sessionId, initiator, collaborators, context)
    
    // 3. Set all agents to collaboration mode
    for (const agentType of [initiator, ...collaborators]) {
      await this.setAgentCollaborationMode(agentType, sessionId)
    }
    
    return sessionId
  }
}
```

## Testing Requirements

### Unit Tests for Agents
```typescript
// ✅ REQUIRED - Test agent state transitions
describe('ProducerAgent', () => {
  let agent: ProducerAgent
  let mockStateMachine: jest.Mocked<AgentStateMachine>
  
  beforeEach(() => {
    mockStateMachine = createMockStateMachine()
    agent = new ProducerAgent(mockStateMachine, mockEventBus, mockLLMProvider)
  })
  
  it('should transition to THINKING when receiving message', async () => {
    const message = createValidAgentMessage()
    
    await agent.sendMessage(message)
    
    expect(mockStateMachine.transition).toHaveBeenCalledWith(
      AgentStatus.THINKING,
      'Processing message'
    )
  })
  
  it('should handle rate limit errors gracefully', async () => {
    mockLLMProvider.chat.mockRejectedValue(new RateLimitError())
    
    const result = await agent.sendMessage(createValidAgentMessage())
    
    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(RateLimitExceededError)
  })
})
```

### Integration Tests
```typescript
// ✅ REQUIRED - Test agent collaboration
describe('Agent Collaboration', () => {
  it('should coordinate Producer -> Architect workflow', async () => {
    const producer = await agentService.getAgent(AgentType.PRODUCER)
    const architect = await agentService.getAgent(AgentType.ARCHITECT)
    
    // User sends message to Producer
    const userMessage = createUserMessage('I want to build a chat app')
    await producer.sendMessage(userMessage)
    
    // Producer should clarify and then involve Architect
    await waitForAgentResponse(producer)
    const architectMessage = await waitForMessage(AgentType.ARCHITECT)
    
    expect(architectMessage.content).toContain('technical requirements')
  })
})
```

## Performance Requirements

### Memory Management
```typescript
// ✅ REQUIRED - Cleanup agent resources
export class AgentLifecycleManager {
  async shutdownAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (!agent) return
    
    // 1. Cancel ongoing operations
    await agent.cancelAllOperations()
    
    // 2. Save state
    await agent.saveState()
    
    // 3. Cleanup resources
    agent.destroy()
    
    // 4. Remove from registry
    this.agents.delete(agentId)
  }
}
```

### Rate Limiting
```typescript
// ✅ REQUIRED - Implement per-agent rate limits
export const AGENT_RATE_LIMITS = {
  [AgentType.PRODUCER]: {
    messagesPerMinute: 20,
    tokensPerHour: 100000
  },
  [AgentType.ARCHITECT]: {
    messagesPerMinute: 10,
    tokensPerHour: 150000
  },
  [AgentType.ENGINEER]: {
    messagesPerMinute: 15,
    tokensPerHour: 200000
  },
  [AgentType.QA]: {
    messagesPerMinute: 25,
    tokensPerHour: 80000
  }
} as const
```

## Monitoring & Observability

### Required Metrics
```typescript
// ✅ REQUIRED - Track agent performance
export interface AgentMetrics {
  messageCount: number
  averageResponseTime: number
  errorRate: number
  stateTransitionCount: Record<string, number>
  toolUsageCount: Record<string, number>
  collaborationCount: number
}
```

**Violations of these rules will result in immediate PR rejection and architectural review.**