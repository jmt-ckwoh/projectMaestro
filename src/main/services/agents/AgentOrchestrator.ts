/**
 * Agent Orchestrator
 * 
 * The central coordination service for all AI agents in Project Maestro.
 * Manages agent lifecycle, message routing, collaboration workflows, and system health.
 */

import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { 
  Agent,
  AgentError, 
  AgentMessage, 
  AgentMessageSentEvent, 
  AgentNotAvailableError,
  AgentResponse,
  AgentStatus,
  AgentStatusChangedEvent,
  AgentType,
  CollaborationContext,
  CollaborationError,
  CollaborationStatus,
  IAgentDomainService,
  InvalidStateTransitionError,
  MessageTimeoutError,
  RateLimitExceededError,
  SystemMetrics
} from '@/shared/contracts/AgentDomain'
import { 
  BusinessRuleViolationError,
  DomainError,
  DomainEvent,
  EntityNotFoundError,
  Err,
  GenericDomainError,
  HealthCheck,
  HealthStatus,
  Ok,
  Result,
  ValidationError
} from '@/shared/contracts/common'
import { IEventBus } from '@/shared/contracts/EventBus'
import { IMemoryDomainService } from '../../../shared/contracts/MemoryDomain'
import { 
  AgentStateMachine, 
  AgentStateMachineFactory,
  AgentStateMachineManager
} from './AgentStateMachine'

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface AgentRegistration {
  readonly agent: Agent
  readonly service: IAgentDomainService
  readonly stateMachine: AgentStateMachine
  readonly registeredAt: Date
}

export interface CollaborationSession {
  readonly id: string
  readonly agents: AgentType[]
  readonly status: 'active' | 'paused' | 'completed' | 'failed'
  readonly context: CollaborationContext
  readonly createdAt: Date
  readonly completedAt?: Date
  readonly messages: AgentMessage[]
  readonly errors: AgentError[]
}

export interface PendingMessage {
  readonly id: string
  readonly message: AgentMessage
  readonly timeoutMs: number
  readonly createdAt: Date
  readonly resolve: (response: AgentResponse) => void
  readonly reject: (error: DomainError) => void
}

export interface OrchestratorConfig {
  readonly maxConcurrentCollaborations: number
  readonly defaultMessageTimeout: number
  readonly healthCheckInterval: number
  readonly rateLimitWindowMs: number
  readonly enableMetricsCollection: boolean
}

export interface AgentPool {
  readonly available: Set<AgentType>
  readonly busy: Set<AgentType>
  readonly offline: Set<AgentType>
  readonly error: Set<AgentType>
}

// =============================================================================
// Agent Orchestrator Implementation
// =============================================================================

export class AgentOrchestrator extends EventEmitter implements IAgentDomainService {
  private readonly agents = new Map<AgentType, AgentRegistration>()
  private readonly collaborations = new Map<string, CollaborationSession>()
  private readonly pendingMessages = new Map<string, PendingMessage>()
  private readonly stateMachineManager = new AgentStateMachineManager()
  private readonly rateLimiter = new Map<string, number[]>()
  private readonly metrics = new Map<string, number>()
  
  private healthCheckTimer?: NodeJS.Timeout
  private isRunning = false

  constructor(
    private readonly eventBus: IEventBus,
    private readonly memoryService?: IMemoryDomainService,
    private readonly config: OrchestratorConfig = DEFAULT_ORCHESTRATOR_CONFIG
  ) {
    super()
    this.setupEventHandling()
  }

  // =============================================================================
  // Lifecycle Management
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.isRunning) {
      throw new BusinessRuleViolationError('agent', 'Orchestrator already initialized')
    }

    try {
      // Initialize built-in agents
      await this.initializeBuiltInAgents()
      
      // Start health check timer
      this.startHealthCheck()
      
      // Subscribe to domain events
      this.subscribeToEvents()
      
      this.isRunning = true
      this.emit('orchestrator:initialized')
      
      console.log('AgentOrchestrator initialized successfully')
    } catch (error) {
      this.emit('orchestrator:error', error)
      throw new GenericDomainError('ORCHESTRATOR_INIT_FAILED', 'agent', 'Failed to initialize orchestrator', error as Error)
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      // Stop health check
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer)
        this.healthCheckTimer = undefined
      }
      
      // Complete active collaborations
      await this.shutdownActiveCollaborations()
      
      // Shutdown all agents
      await this.shutdownAllAgents()
      
      // Clear state
      this.agents.clear()
      this.collaborations.clear()
      this.pendingMessages.clear()
      this.stateMachineManager.destroyAll()
      
      this.isRunning = false
      this.emit('orchestrator:shutdown')
      
      console.log('AgentOrchestrator shutdown completed')
    } catch (error) {
      this.emit('orchestrator:error', error)
      throw new GenericDomainError('ORCHESTRATOR_SHUTDOWN_FAILED', 'agent', 'Failed to shutdown orchestrator', error as Error)
    }
  }

  isHealthy(): boolean {
    return this.isRunning && this.agents.size > 0
  }

  // =============================================================================
  // Agent Management (IAgentDomainService Implementation)
  // =============================================================================

  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).map(reg => reg.agent)
  }

  async getAgentsByType(type: AgentType): Promise<Agent[]> {
    const registration = this.agents.get(type)
    return registration ? [registration.agent] : []
  }

  async getAgentByType(type: AgentType): Promise<Agent> {
    const registration = this.agents.get(type)
    if (!registration) {
      throw new EntityNotFoundError('agent', `Agent of type ${type} not found`)
    }
    return registration.agent
  }

  async getById(id: string): Promise<Agent> {
    for (const [, registration] of this.agents) {
      if (registration.agent.id === id) {
        return registration.agent
      }
    }
    throw new EntityNotFoundError('agent', `Agent with id ${id} not found`)
  }

  async create(_entity: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    throw new BusinessRuleViolationError('agent', 'Cannot create agents through orchestrator')
  }

  async update(id: string, updates: Partial<Agent>): Promise<Agent> {
    const agent = await this.getById(id)
    const updated = { ...agent, ...updates, updatedAt: new Date() }
    
    // Update registration
    const registration = Array.from(this.agents.values())
      .find(reg => reg.agent.id === id)
    
    if (registration) {
      this.agents.set(agent.type, { ...registration, agent: updated })
    }
    
    return updated
  }

  async delete(_id: string): Promise<void> {
    throw new BusinessRuleViolationError('agent', 'Cannot delete agents through orchestrator')
  }

  async findById(id: string): Promise<Agent> {
    return this.getById(id)
  }

  async findByIdOrNull(id: string): Promise<Agent | null> {
    try {
      return await this.getById(id)
    } catch {
      return null
    }
  }

  async cleanup(): Promise<void> {
    await this.shutdown()
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks: HealthCheck[] = []
    
    // Check if orchestrator is running
    checks.push({
      name: 'orchestrator_running',
      healthy: this.isRunning,
      message: this.isRunning ? 'Orchestrator is running' : 'Orchestrator is not running'
    })
    
    // Check agent statuses
    const agentPool = this.getAgentPool()
    checks.push({
      name: 'agents_available',
      healthy: agentPool.available.size > 0,
      message: `${agentPool.available.size} agents available`,
      details: {
        available: agentPool.available.size,
        busy: agentPool.busy.size,
        offline: agentPool.offline.size,
        error: agentPool.error.size
      }
    })
    
    // Check event bus
    checks.push({
      name: 'event_bus',
      healthy: !!this.eventBus,
      message: this.eventBus ? 'Event bus connected' : 'Event bus not available'
    })
    
    const healthy = checks.every(check => check.healthy)
    
    return {
      healthy,
      checks
    }
  }

  async updateAgentConfiguration(agentId: string, configuration: Partial<any>): Promise<Agent> {
    const agent = await this.getById(agentId)
    return this.update(agentId, { 
      configuration: { ...agent.configuration, ...configuration }
    })
  }

  async setAgentEnabled(agentId: string, enabled: boolean): Promise<Agent> {
    const registration = Array.from(this.agents.values())
      .find(reg => reg.agent.id === agentId)
    
    if (!registration) {
      throw new EntityNotFoundError('agent', `Agent ${agentId} not found`)
    }

    const targetStatus = enabled ? AgentStatus.IDLE : AgentStatus.OFFLINE
    const success = await registration.stateMachine.transition(targetStatus, 'Manual enable/disable')
    
    if (!success) {
      throw new InvalidStateTransitionError(agentId, registration.stateMachine.getCurrentState(), targetStatus)
    }

    return this.update(agentId, { status: targetStatus })
  }

  // =============================================================================
  // Message Handling
  // =============================================================================

  async sendMessage(message: AgentMessage): Promise<Result<AgentResponse, DomainError>> {
    try {
      // Validate message
      if (!message.to || message.to === 'all') {
        return Err(new ValidationError('agent', 'Message must have specific target agent'))
      }

      const targetAgent = message.to as AgentType
      const registration = this.agents.get(targetAgent)
      
      if (!registration) {
        return Err(new EntityNotFoundError('agent', `Target agent ${targetAgent} not found`))
      }

      // Check rate limits
      const rateLimitResult = await this.checkRateLimit(registration.agent.id, 'message')
      if (!rateLimitResult.success) {
        return Err(rateLimitResult.error)
      }

      // Check agent availability
      if (!registration.stateMachine.isAvailable()) {
        return Err(new AgentNotAvailableError(
          registration.agent.id, 
          registration.stateMachine.getCurrentState()
        ))
      }

      // Send message to agent service
      const response = await registration.service.sendMessage(message)
      
      if (response.success) {
        // Update metrics
        this.updateMetrics(registration.agent.type, 'message_sent')
        
        // Emit event
        this.eventBus.publishAsync({
          id: uuidv4(),
          version: 1,
          type: 'agent.message.sent',
          domain: 'agent',
          agentId: registration.agent.id,
          agentType: registration.agent.type,
          aggregateId: registration.agent.id,
          timestamp: new Date(),
          payload: {
            messageId: message.id,
            to: message.to,
            messageType: message.messageType
          }
        } as AgentMessageSentEvent)
      }

      return response
    } catch (error) {
      return Err(new GenericDomainError('MESSAGE_SEND_FAILED', 'agent', 'Failed to send message', error as Error))
    }
  }

  async sendMessageAndWait(
    message: AgentMessage, 
    timeoutMs: number = this.config.defaultMessageTimeout
  ): Promise<Result<AgentResponse, DomainError>> {
    return new Promise((resolve) => {
      const messageId = uuidv4()
      const pendingMessage: PendingMessage = {
        id: messageId,
        message,
        timeoutMs,
        createdAt: new Date(),
        resolve: (response) => resolve(Ok(response)),
        reject: (error) => resolve(Err(error))
      }

      this.pendingMessages.set(messageId, pendingMessage)

      // Set timeout
      setTimeout(() => {
        const pending = this.pendingMessages.get(messageId)
        if (pending) {
          this.pendingMessages.delete(messageId)
          pending.reject(new MessageTimeoutError(messageId, timeoutMs))
        }
      }, timeoutMs)

      // Send message
      this.sendMessage(message).then(result => {
        const pending = this.pendingMessages.get(messageId)
        if (pending) {
          this.pendingMessages.delete(messageId)
          if (result.success) {
            pending.resolve(result.data)
          } else {
            pending.reject(result.error)
          }
        }
      })
    })
  }

  async broadcastMessage(
    message: Omit<AgentMessage, 'to'>, 
    targets: AgentType[]
  ): Promise<Result<AgentResponse[], DomainError>> {
    const responses: AgentResponse[] = []
    const errors: DomainError[] = []

    for (const target of targets) {
      const targetMessage: AgentMessage = { ...message, to: target } as AgentMessage
      const result = await this.sendMessage(targetMessage)
      
      if (result.success) {
        responses.push(result.data)
      } else {
        errors.push(result.error)
      }
    }

    if (errors.length === targets.length) {
      return Err(new GenericDomainError('BROADCAST_FAILED', 'agent', 'All broadcast messages failed'))
    }

    return Ok(responses)
  }

  async getMessageHistory(_agentId: string, _options?: any): Promise<AgentMessage[]> {
    // Implementation would integrate with memory system
    // For now, return empty array
    return []
  }

  // =============================================================================
  // Status Management
  // =============================================================================

  async updateAgentStatus(agentId: string, status: AgentStatus, reason?: string): Promise<Agent> {
    const agent = await this.getById(agentId)
    const registration = Array.from(this.agents.values())
      .find(reg => reg.agent.id === agentId)
    
    if (!registration) {
      throw new EntityNotFoundError('agent', `Agent ${agentId} not found`)
    }

    const previousStatus = registration.stateMachine.getCurrentState()
    const success = await registration.stateMachine.transition(status, reason)
    
    if (!success) {
      throw new InvalidStateTransitionError(agentId, previousStatus, status)
    }

    // Update agent entity
    const updatedAgent = await this.update(agentId, { status })
    
    // Emit status change event
    this.eventBus.publishAsync({
      id: uuidv4(),
      version: 1,
      type: 'agent.status.changed',
      domain: 'agent',
      agentId: agentId,
      agentType: agent.type,
      aggregateId: agentId,
      timestamp: new Date(),
      payload: {
        previousStatus,
        newStatus: status,
        reason
      }
    } as AgentStatusChangedEvent)

    return updatedAgent
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    const agent = await this.getById(agentId)
    return agent.status
  }

  async getAllAgentStatuses(): Promise<Record<string, AgentStatus>> {
    const statuses: Record<string, AgentStatus> = {}
    
    for (const [type, registration] of this.agents) {
      statuses[type] = registration.stateMachine.getCurrentState()
    }
    
    return statuses
  }

  async isAgentAvailable(agentId: string): Promise<boolean> {
    const registration = Array.from(this.agents.values())
      .find(reg => reg.agent.id === agentId)
    
    return registration?.stateMachine.isAvailable() ?? false
  }

  async getAgentStateMachine(agentId: string): Promise<any> {
    const registration = Array.from(this.agents.values())
      .find(reg => reg.agent.id === agentId)
    
    if (!registration) {
      throw new EntityNotFoundError('agent', `Agent ${agentId} not found`)
    }

    return {
      currentState: registration.stateMachine.getCurrentState(),
      allowedTransitions: registration.stateMachine.getAllowedTransitions(),
      transitionGuards: [] // Implementation would return actual guards
    }
  }

  // =============================================================================
  // Collaboration Management
  // =============================================================================

  async startCollaboration(
    agents: AgentType[], 
    context: CollaborationContext
  ): Promise<Result<string, DomainError>> {
    try {
      // Check if we're at max collaborations
      const activeCollaborations = Array.from(this.collaborations.values())
        .filter(c => c.status === 'active')
      
      if (activeCollaborations.length >= this.config.maxConcurrentCollaborations) {
        return Err(new BusinessRuleViolationError('agent', 'Maximum concurrent collaborations reached'))
      }

      // Validate all agents are available
      for (const agentType of agents) {
        const registration = this.agents.get(agentType)
        if (!registration) {
          return Err(new EntityNotFoundError('agent', `Agent ${agentType} not found`))
        }
        
        if (!registration.stateMachine.isAvailable()) {
          return Err(new AgentNotAvailableError(
            registration.agent.id, 
            registration.stateMachine.getCurrentState()
          ))
        }
      }

      // Create collaboration session
      const sessionId = uuidv4()
      const session: CollaborationSession = {
        id: sessionId,
        agents,
        status: 'active',
        context,
        createdAt: new Date(),
        messages: [],
        errors: []
      }

      this.collaborations.set(sessionId, session)

      // Transition agents to collaboration mode
      for (const agentType of agents) {
        const registration = this.agents.get(agentType)!
        await registration.stateMachine.transition(
          AgentStatus.WORKING, 
          `Started collaboration ${sessionId}`
        )
      }

      this.emit('collaboration:started', { sessionId, agents, context })
      return Ok(sessionId)
    } catch (error) {
      return Err(new CollaborationError('unknown', 'Failed to start collaboration', error as Error))
    }
  }

  async stopCollaboration(workflowId: string): Promise<void> {
    const session = this.collaborations.get(workflowId)
    if (!session) {
      throw new EntityNotFoundError('agent', `Collaboration ${workflowId} not found`)
    }

    // Transition agents back to idle
    for (const agentType of session.agents) {
      const registration = this.agents.get(agentType)
      if (registration) {
        await registration.stateMachine.transition(
          AgentStatus.IDLE, 
          `Ended collaboration ${workflowId}`
        )
      }
    }

    // Update session status
    const updatedSession = {
      ...session,
      status: 'completed' as const,
      completedAt: new Date()
    }
    this.collaborations.set(workflowId, updatedSession)

    this.emit('collaboration:ended', { sessionId: workflowId })
  }

  async getActiveCollaborations(): Promise<CollaborationStatus[]> {
    return Array.from(this.collaborations.values())
      .filter(session => session.status === 'active')
      .map(session => ({
        id: session.id,
        agents: session.agents,
        status: session.status,
        startedAt: session.createdAt,
        completedAt: session.completedAt,
        context: session.context
      }))
  }

  // =============================================================================
  // Monitoring & Statistics
  // =============================================================================

  async getAgentStatistics(agentId: string): Promise<any> {
    // Implementation would track real statistics
    return {
      totalMessages: this.metrics.get(`${agentId}:messages`) ?? 0,
      totalTokensUsed: this.metrics.get(`${agentId}:tokens`) ?? 0,
      averageResponseTime: this.metrics.get(`${agentId}:avg_response_time`) ?? 0,
      successRate: this.metrics.get(`${agentId}:success_rate`) ?? 1.0,
      lastActiveAt: new Date()
    }
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const agentPool = this.getAgentPool()
    
    return {
      totalAgents: this.agents.size,
      activeAgents: agentPool.available.size + agentPool.busy.size,
      totalMessages: Array.from(this.metrics.entries())
        .filter(([key]) => key.endsWith(':messages'))
        .reduce((sum, [, value]) => sum + value, 0),
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      resourceUsage: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: 0, // Would be calculated from actual metrics
        tokenUsage: Array.from(this.metrics.entries())
          .filter(([key]) => key.endsWith(':tokens'))
          .reduce((sum, [, value]) => sum + value, 0),
        apiCallsPerMinute: this.calculateAPICallsPerMinute()
      }
    }
  }

  async resetAgentStatistics(agentId: string): Promise<void> {
    const metricsToReset = Array.from(this.metrics.keys())
      .filter(key => key.startsWith(`${agentId}:`))
    
    for (const key of metricsToReset) {
      this.metrics.delete(key)
    }
  }

  // =============================================================================
  // Private Implementation
  // =============================================================================

  private async initializeBuiltInAgents(): Promise<void> {
    // This would create the default agent instances
    // For now, we'll register placeholder agents
    const agentTypes = [AgentType.PRODUCER, AgentType.ARCHITECT, AgentType.ENGINEER, AgentType.QA]
    
    for (const type of agentTypes) {
      const agent: Agent = {
        id: uuidv4(),
        type,
        name: this.getAgentName(type),
        avatar: this.getAgentAvatar(type),
        status: AgentStatus.IDLE,
        capabilities: [],
        configuration: this.getDefaultConfiguration(type),
        statistics: {
          totalMessages: 0,
          totalTokensUsed: 0,
          averageResponseTime: 0,
          successRate: 1.0,
          lastActiveAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const stateMachine = AgentStateMachineFactory.create(agent.id, type)
      
      // For now, create a mock service
      const service: IAgentDomainService = this.createMockAgentService(agent, stateMachine)
      
      const registration: AgentRegistration = {
        agent,
        service,
        stateMachine,
        registeredAt: new Date()
      }

      this.agents.set(type, registration)
    }
  }

  private createMockAgentService(_agent: Agent, _stateMachine: AgentStateMachine): IAgentDomainService {
    // This is a placeholder - real implementation would create actual agent services
    return {} as IAgentDomainService
  }

  private getAgentName(type: AgentType): string {
    const names = {
      [AgentType.PRODUCER]: 'Producer',
      [AgentType.ARCHITECT]: 'Architect', 
      [AgentType.ENGINEER]: 'Engineer',
      [AgentType.QA]: 'QA Specialist'
    }
    return names[type]
  }

  private getAgentAvatar(type: AgentType): string {
    const avatars = {
      [AgentType.PRODUCER]: '👔',
      [AgentType.ARCHITECT]: '🏗️',
      [AgentType.ENGINEER]: '⚡',
      [AgentType.QA]: '🔍'
    }
    return avatars[type]
  }

  private getDefaultConfiguration(type: AgentType): any {
    return {
      model: 'claude-3-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: `You are the ${type} agent in Project Maestro.`,
      tools: [],
      memoryAccess: {
        global: true,
        project: true,
        task: true,
        personal: true
      },
      rateLimits: {
        messagesPerMinute: 20,
        tokensPerHour: 100000,
        maxConcurrentTasks: 3
      }
    }
  }

  private setupEventHandling(): void {
    this.on('error', (error) => {
      console.error('AgentOrchestrator error:', error)
    })
  }

  private subscribeToEvents(): void {
    // Subscribe to relevant domain events
    this.eventBus.subscribe('project.task.created', {
      handle: this.handleTaskCreated.bind(this)
    })
    this.eventBus.subscribe('user.message.sent', {
      handle: this.handleUserMessage.bind(this)
    })
    
    // Subscribe to memory events for agent context
    this.eventBus.subscribe('memory.created', {
      handle: this.handleMemoryCreated.bind(this)
    })
    this.eventBus.subscribe('memory.accessed', {
      handle: this.handleMemoryAccessed.bind(this)
    })
  }

  private async handleTaskCreated(event: DomainEvent): Promise<void> {
    // Handle new task creation by assigning to appropriate agent
    console.log('Handling task created:', event)
  }

  private async handleUserMessage(event: DomainEvent): Promise<void> {
    // Route user messages to Producer agent
    console.log('Handling user message:', event)
  }

  private async handleMemoryCreated(event: DomainEvent): Promise<void> {
    // Handle new memory creation - could trigger agent notifications
    console.log('Memory created:', event)
    
    // If memory is related to an active task, notify relevant agents
    const payload = event.payload as any
    if (payload.projectId && this.memoryService) {
      await this.notifyAgentsOfNewMemory(payload.memoryId, payload.projectId)
    }
  }

  private async handleMemoryAccessed(event: DomainEvent): Promise<void> {
    // Handle memory access - could be used for agent collaboration patterns
    console.log('Memory accessed:', event)
  }

  private async notifyAgentsOfNewMemory(memoryId: string, projectId: string): Promise<void> {
    // Notify agents that new memory is available for the project
    for (const [agentType, registration] of this.agents) {
      if (registration.agent.status === AgentStatus.WORKING) {
        // Agent is actively working, send memory update
        console.log(`Notifying ${agentType} of new memory: ${memoryId} for project: ${projectId}`)
        // TODO: Implement agent memory update notification
      }
    }
  }

  /**
   * Allow agents to search memories for context
   */
  async searchMemoriesForAgent(
    agentType: AgentType, 
    query: string, 
    options?: { projectId?: string; limit?: number }
  ): Promise<Result<any[], DomainError>> {
    if (!this.memoryService) {
      return Err(new GenericDomainError('MEMORY_SERVICE_NOT_AVAILABLE', 'agent', 
        'Memory service not configured'))
    }

    try {
      const searchQuery = {
        query,
        agentType: agentType.toString(),
        projectId: options?.projectId,
        limit: options?.limit || 5,
        threshold: 0.7
      }

      return await this.memoryService.searchMemories(searchQuery)
    } catch (error) {
      return Err(new GenericDomainError('MEMORY_SEARCH_FAILED', 'agent', 
        'Failed to search memories for agent', error as Error))
    }
  }

  /**
   * Store memory from agent conversation
   */
  async storeAgentMemory(
    agentType: AgentType,
    content: string,
    metadata: {
      projectId?: string
      taskId?: string
      importance?: number
    }
  ): Promise<Result<any, DomainError>> {
    if (!this.memoryService) {
      return Err(new GenericDomainError('MEMORY_SERVICE_NOT_AVAILABLE', 'agent', 
        'Memory service not configured'))
    }

    try {
      const memoryInput = {
        content,
        type: 'conversation' as const,
        scope: 'shared' as const,
        metadata: {
          agentType: agentType.toString(),
          source: `agent-${agentType}`,
          importance: metadata.importance || 0.5,
          projectId: metadata.projectId,
          taskId: metadata.taskId,
          tags: ['agent-conversation', agentType.toString()],
          accessCount: 0
        }
      }

      return await this.memoryService.storeMemory(memoryInput)
    } catch (error) {
      return Err(new GenericDomainError('MEMORY_STORE_FAILED', 'agent', 
        'Failed to store agent memory', error as Error))
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  private performHealthCheck(): void {
    for (const [type, registration] of this.agents) {
      // Check if agent is responsive
      const status = registration.stateMachine.getCurrentState()
      
      // If agent has been in error state too long, attempt recovery
      if (status === AgentStatus.ERROR) {
        this.attemptAgentRecovery(type)
      }
    }
  }

  private async attemptAgentRecovery(agentType: AgentType): Promise<void> {
    const registration = this.agents.get(agentType)
    if (!registration) return

    try {
      await registration.stateMachine.forceTransition(
        AgentStatus.IDLE, 
        'Automatic recovery attempt'
      )
      console.log(`Agent ${agentType} recovered successfully`)
    } catch (error) {
      console.error(`Failed to recover agent ${agentType}:`, error)
    }
  }

  private async shutdownActiveCollaborations(): Promise<void> {
    const activeCollaborations = Array.from(this.collaborations.values())
      .filter(c => c.status === 'active')

    for (const collaboration of activeCollaborations) {
      try {
        await this.stopCollaboration(collaboration.id)
      } catch (error) {
        console.error(`Failed to stop collaboration ${collaboration.id}:`, error)
      }
    }
  }

  private async shutdownAllAgents(): Promise<void> {
    for (const [, registration] of this.agents) {
      try {
        await registration.stateMachine.forceTransition(
          AgentStatus.OFFLINE, 
          'Orchestrator shutdown'
        )
        registration.stateMachine.destroy()
      } catch (error) {
        console.error(`Failed to shutdown agent ${registration.agent.id}:`, error)
      }
    }
  }

  private async checkRateLimit(agentId: string, operation: string): Promise<Result<void, DomainError>> {
    const key = `${agentId}:${operation}`
    const now = Date.now()
    const window = this.config.rateLimitWindowMs
    
    let requests = this.rateLimiter.get(key) ?? []
    requests = requests.filter(timestamp => now - timestamp < window)
    
    // Check agent-specific limits (implementation would be more sophisticated)
    const limit = 60 // requests per window
    
    if (requests.length >= limit) {
      return Err(new RateLimitExceededError(agentId, operation))
    }
    
    requests.push(now)
    this.rateLimiter.set(key, requests)
    
    return Ok(undefined)
  }

  private updateMetrics(agentType: AgentType, metric: string): void {
    if (!this.config.enableMetricsCollection) return
    
    const key = `${agentType}:${metric}`
    const current = this.metrics.get(key) ?? 0
    this.metrics.set(key, current + 1)
  }

  private getAgentPool(): AgentPool {
    const pool: AgentPool = {
      available: new Set(),
      busy: new Set(),
      offline: new Set(),
      error: new Set()
    }

    for (const [type, registration] of this.agents) {
      const status = registration.stateMachine.getCurrentState()
      
      switch (status) {
        case AgentStatus.IDLE:
          pool.available.add(type)
          break
        case AgentStatus.THINKING:
        case AgentStatus.WORKING:
        case AgentStatus.WAITING:
          pool.busy.add(type)
          break
        case AgentStatus.OFFLINE:
          pool.offline.add(type)
          break
        case AgentStatus.ERROR:
          pool.error.add(type)
          break
      }
    }

    return pool
  }

  private calculateAverageResponseTime(): number {
    // Placeholder implementation
    return 1500 // ms
  }

  private calculateErrorRate(): number {
    // Placeholder implementation
    return 0.02 // 2%
  }

  private calculateAPICallsPerMinute(): number {
    // Placeholder implementation
    return 25
  }
}

// =============================================================================
// Configuration
// =============================================================================

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxConcurrentCollaborations: 10,
  defaultMessageTimeout: 30000, // 30 seconds
  healthCheckInterval: 60000, // 1 minute
  rateLimitWindowMs: 60000, // 1 minute
  enableMetricsCollection: true
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createAgentOrchestrator(
  eventBus: IEventBus,
  memoryService?: IMemoryDomainService,
  config?: Partial<OrchestratorConfig>
): AgentOrchestrator {
  const fullConfig = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config }
  return new AgentOrchestrator(eventBus, memoryService, fullConfig)
}

export default AgentOrchestrator