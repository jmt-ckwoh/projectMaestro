/**
 * Base Agent Implementation
 * 
 * Provides the foundation for all AI agents in Project Maestro.
 * Handles common functionality like state management, message processing,
 * tool execution, and memory integration.
 */

import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import {
  AgentConfiguration,
  Agent as AgentEntity,
  AgentErrorOccurredEvent,
  AgentMessage,
  AgentMessageSchema,
  AgentNotAvailableError,
  AgentResponse,
  AgentStatistics,
  AgentStatus,
  AgentStatusChangedEvent,
  AgentType,
  CollaborationContext,
  CollaborationStatus,
  IAgentDomainService,
  MessageHistoryOptions,
  RateLimitExceededError,
  SystemMetrics
} from '@/shared/contracts/AgentDomain'
import {
  BusinessRuleViolationError,
  DomainError,
  Err,
  GenericDomainError,
  HealthStatus,
  Ok,
  Result,
  ValidationError
} from '@/shared/contracts/common'
import { IEventBus } from '@/shared/contracts/EventBus'
import { AgentStateMachine } from '../AgentStateMachine'

// =============================================================================
// Base Agent Types
// =============================================================================

export interface AgentContext {
  readonly agentId: string
  readonly agentType: AgentType
  readonly projectId?: string
  readonly taskId?: string
  readonly userId?: string
  readonly sessionId?: string
  readonly metadata: Record<string, unknown>
}

export interface AgentTool {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, any>
  readonly requiredPermission: string
  readonly allowedAgents: AgentType[]
  readonly timeoutMs: number
  execute(params: unknown, context: AgentContext): Promise<any>
}

export interface LLMProvider {
  chat(messages: any[], options?: any): Promise<string>
  generateEmbedding(text: string): Promise<number[]>
  isAvailable(): boolean
}

export interface MemoryManager {
  store(agentId: string, content: string, type: string): Promise<void>
  retrieve(agentId: string, query: string, limit?: number): Promise<any[]>
  forget(agentId: string, contentId: string): Promise<void>
}

// =============================================================================
// Base Agent Implementation
// =============================================================================

export abstract class BaseAgent extends EventEmitter implements IAgentDomainService {
  protected readonly agentEntity: AgentEntity
  protected readonly stateMachine: AgentStateMachine
  protected readonly eventBus: IEventBus
  protected readonly llmProvider: LLMProvider
  protected readonly memoryManager?: MemoryManager
  protected readonly tools = new Map<string, AgentTool>()
  
  // Internal mutable state (not exposed through readonly interface)
  private agentEntityState: {
    configuration: AgentConfiguration
    status: AgentStatus
    statistics: AgentStatistics
    updatedAt: Date
  }
  
  private readonly messageHistory: AgentMessage[] = []
  private readonly activeCollaborations = new Set<string>()
  private rateLimitTracker = new Map<string, number[]>()

  constructor(
    agentEntity: AgentEntity,
    stateMachine: AgentStateMachine,
    eventBus: IEventBus,
    llmProvider: LLMProvider,
    memoryManager?: MemoryManager
  ) {
    super()
    this.agentEntity = agentEntity
    this.stateMachine = stateMachine
    this.eventBus = eventBus
    this.llmProvider = llmProvider
    this.memoryManager = memoryManager
    
    // Initialize mutable state
    this.agentEntityState = {
      configuration: { ...agentEntity.configuration },
      status: agentEntity.status,
      statistics: { ...agentEntity.statistics },
      updatedAt: new Date()
    }

    this.setupStateMachineHandlers()
    this.setupEventBusHandlers()
    this.initializeTools()
  }

  // =============================================================================
  // Abstract Methods (Must be implemented by persona agents)
  // =============================================================================

  protected abstract getSystemPrompt(): string
  protected abstract getPersonalityTraits(): string[]
  protected abstract getCapabilities(): string[]
  protected abstract processAgentMessage(message: AgentMessage, context: AgentContext): Promise<AgentResponse>

  // =============================================================================
  // Public Agent Interface
  // =============================================================================

  get id(): string {
    return this.agentEntity.id
  }

  get type(): AgentType {
    return this.agentEntity.type
  }

  get name(): string {
    return this.agentEntity.name
  }

  get status(): AgentStatus {
    return this.stateMachine.getCurrentState()
  }

  get configuration(): AgentConfiguration {
    return this.agentEntityState.configuration
  }
  
  // Helper to get updated entity with current state
  private getUpdatedEntity(): AgentEntity {
    return {
      ...this.agentEntity,
      configuration: this.agentEntityState.configuration,
      status: this.agentEntityState.status,
      statistics: this.agentEntityState.statistics,
      updatedAt: this.agentEntityState.updatedAt
    }
  }

  isAvailable(): boolean {
    return this.stateMachine.isAvailable()
  }

  isBusy(): boolean {
    return this.stateMachine.isBusy()
  }

  hasError(): boolean {
    return this.stateMachine.hasError()
  }

  // =============================================================================
  // DomainService Implementation (Required methods)
  // =============================================================================
  
  async findById(id: string): Promise<AgentEntity> {
    if (this.id !== id) {
      throw new ValidationError('agent', `Agent with id ${id} not found`)
    }
    return this.getUpdatedEntity()
  }
  
  async findByIdOrNull(id: string): Promise<AgentEntity | null> {
    return this.id === id ? this.getUpdatedEntity() : null
  }

  // =============================================================================
  // DomainServiceLifecycle Implementation (Required methods)
  // =============================================================================
  
  async initialize(): Promise<void> {
    // Initialize agent resources, connections, etc.
    await this.stateMachine.transition(AgentStatus.IDLE, 'Agent initialized')
  }
  
  async cleanup(): Promise<void> {
    // Cleanup agent resources
    this.removeAllListeners()
    await this.stateMachine.transition(AgentStatus.OFFLINE, 'Agent cleanup')
  }
  
  async healthCheck(): Promise<HealthStatus> {
    const checks = [
      {
        name: 'agent-status',
        healthy: this.status !== AgentStatus.ERROR,
        message: `Agent status: ${this.status}`
      },
      {
        name: 'state-machine',
        healthy: this.stateMachine.getCurrentState() !== AgentStatus.ERROR,
        message: 'State machine operational'
      }
    ]
    
    return {
      healthy: checks.every(check => check.healthy),
      checks
    }
  }

  // =============================================================================
  // IAgentDomainService Implementation
  // =============================================================================

  async getAllAgents(): Promise<AgentEntity[]> {
    return [this.agentEntity]
  }

  async getAgentsByType(type: AgentType): Promise<AgentEntity[]> {
    return this.type === type ? [this.agentEntity] : []
  }

  async getAgentByType(type: AgentType): Promise<AgentEntity> {
    if (this.type !== type) {
      throw new ValidationError('agent', `This agent is type ${this.type}, not ${type}`)
    }
    return this.agentEntity
  }

  async getById(id: string): Promise<AgentEntity> {
    if (this.id !== id) {
      throw new ValidationError('agent', `This agent has id ${this.id}, not ${id}`)
    }
    return this.agentEntity
  }

  async create(_entity: unknown): Promise<AgentEntity> {
    throw new BusinessRuleViolationError('agent', 'Cannot create new agents from existing agent instance')
  }

  async update(id: string, _updates: unknown): Promise<AgentEntity> {
    if (this.id !== id) {
      throw new ValidationError('agent', `Cannot update different agent ${id} from ${this.id}`)
    }
    
    // Update through internal state
    this.agentEntityState.updatedAt = new Date()
    return this.getUpdatedEntity()
  }

  async delete(_id: string): Promise<void> {
    throw new BusinessRuleViolationError('agent', 'Cannot delete agent from agent instance')
  }

  async updateAgentConfiguration(agentId: string, configuration: Partial<AgentConfiguration>): Promise<AgentEntity> {
    if (this.id !== agentId) {
      throw new ValidationError('agent', `Cannot update configuration for different agent ${agentId}`)
    }

    this.agentEntityState.configuration = { ...this.agentEntityState.configuration, ...configuration }
    this.agentEntityState.updatedAt = new Date()
    
    return this.getUpdatedEntity()
  }

  async setAgentEnabled(agentId: string, enabled: boolean): Promise<AgentEntity> {
    if (this.id !== agentId) {
      throw new ValidationError('agent', `Cannot enable/disable different agent ${agentId}`)
    }

    const targetStatus = enabled ? AgentStatus.IDLE : AgentStatus.OFFLINE
    const success = await this.stateMachine.transition(targetStatus, 'Manual enable/disable')
    
    if (!success) {
      throw new BusinessRuleViolationError('agent', `Cannot transition from ${this.status} to ${targetStatus}`)
    }

    this.agentEntityState.status = targetStatus
    this.agentEntityState.updatedAt = new Date()
    
    return this.getUpdatedEntity()
  }

  // =============================================================================
  // Message Handling
  // =============================================================================

  async sendMessage(message: AgentMessage): Promise<Result<AgentResponse, DomainError>> {
    try {
      // Validate message
      const validation = AgentMessageSchema.safeParse(message)
      if (!validation.success) {
        return Err(new ValidationError('agent', 'Invalid message format', validation.error))
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit('message')
      if (!rateLimitCheck.success) {
        return Err(rateLimitCheck.error)
      }

      // Check availability
      if (!this.stateMachine.canTransition(AgentStatus.THINKING)) {
        return Err(new AgentNotAvailableError(this.id, this.status))
      }

      // Process message
      const context = this.createContext(message)
      const response = await this.processMessageWithStateMachine(validation.data, context)
      
      // Store in history
      this.addToMessageHistory(validation.data)
      
      return Ok(response)
    } catch (error) {
      await this.handleError(error as Error, 'sendMessage')
      return Err(new GenericDomainError('MESSAGE_PROCESSING_FAILED', 'agent', 'Failed to process message', error as Error))
    }
  }

  async sendMessageAndWait(message: AgentMessage, _timeoutMs: number): Promise<Result<AgentResponse, DomainError>> {
    // For single agent, this is the same as sendMessage
    return this.sendMessage(message)
  }

  async broadcastMessage(_message: Omit<AgentMessage, 'to'>, _targets: AgentType[]): Promise<Result<AgentResponse[], DomainError>> {
    // Single agent cannot broadcast to multiple agents
    return Err(new BusinessRuleViolationError('agent', 'Single agent cannot broadcast to multiple targets'))
  }

  async getMessageHistory(agentId: string, options?: MessageHistoryOptions): Promise<AgentMessage[]> {
    if (this.id !== agentId) {
      return []
    }

    let history = [...this.messageHistory]

    if (options?.startDate) {
      history = history.filter(msg => msg.timestamp >= options.startDate!)
    }
    
    if (options?.endDate) {
      history = history.filter(msg => msg.timestamp <= options.endDate!)
    }
    
    if (options?.messageType) {
      history = history.filter(msg => msg.messageType === options.messageType)
    }
    
    if (options?.threadId) {
      history = history.filter(msg => msg.metadata.threadId === options.threadId)
    }
    
    if (options?.limit) {
      history = history.slice(-options.limit)
    }

    return history
  }

  // =============================================================================
  // Status Management
  // =============================================================================

  async updateAgentStatus(agentId: string, status: AgentStatus, reason?: string): Promise<AgentEntity> {
    if (this.id !== agentId) {
      throw new ValidationError('agent', `Cannot update status for different agent ${agentId}`)
    }

    const success = await this.stateMachine.transition(status, reason)
    if (!success) {
      throw new BusinessRuleViolationError('agent', `Cannot transition from ${this.status} to ${status}`)
    }

    this.agentEntityState.status = status
    this.agentEntityState.updatedAt = new Date()
    
    return this.getUpdatedEntity()
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    if (this.id !== agentId) {
      throw new ValidationError('agent', `Cannot get status for different agent ${agentId}`)
    }
    return this.status
  }

  async getAllAgentStatuses(): Promise<Record<string, AgentStatus>> {
    return { [this.id]: this.status }
  }

  async isAgentAvailable(agentId: string): Promise<boolean> {
    if (this.id !== agentId) {
      return false
    }
    return this.isAvailable()
  }

  async getAgentStateMachine(agentId: string): Promise<any> {
    if (this.id !== agentId) {
      throw new ValidationError('agent', `Cannot get state machine for different agent ${agentId}`)
    }

    return {
      currentState: this.stateMachine.getCurrentState(),
      allowedTransitions: this.stateMachine.getAllowedTransitions(),
      transitionGuards: []
    }
  }

  // =============================================================================
  // Collaboration (Not implemented for single agents)
  // =============================================================================

  async startCollaboration(_agents: AgentType[], _context: CollaborationContext): Promise<Result<string, DomainError>> {
    return Err(new BusinessRuleViolationError('agent', 'Single agent cannot start collaboration'))
  }

  async stopCollaboration(workflowId: string): Promise<void> {
    this.activeCollaborations.delete(workflowId)
  }

  async getActiveCollaborations(): Promise<CollaborationStatus[]> {
    return []
  }

  // =============================================================================
  // Monitoring & Statistics
  // =============================================================================

  async getAgentStatistics(agentId: string): Promise<any> {
    if (this.id !== agentId) {
      throw new ValidationError('agent', `Cannot get statistics for different agent ${agentId}`)
    }
    return this.agentEntity.statistics
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    return {
      totalAgents: 1,
      activeAgents: this.isAvailable() ? 1 : 0,
      totalMessages: this.agentEntity.statistics.totalMessages,
      averageResponseTime: this.agentEntity.statistics.averageResponseTime,
      errorRate: 1 - this.agentEntity.statistics.successRate,
      resourceUsage: {
        memoryUsage: 0,
        cpuUsage: 0,
        tokenUsage: this.agentEntity.statistics.totalTokensUsed,
        apiCallsPerMinute: 0
      }
    }
  }

  async resetAgentStatistics(agentId: string): Promise<void> {
    if (this.id !== agentId) {
      throw new ValidationError('agent', `Cannot reset statistics for different agent ${agentId}`)
    }

    this.agentEntityState.statistics = {
      totalMessages: 0,
      totalTokensUsed: 0,
      averageResponseTime: 0,
      successRate: 1.0,
      lastActiveAt: new Date()
    }
  }

  // =============================================================================
  // Protected Implementation Methods
  // =============================================================================

  protected async processMessageWithStateMachine(
    message: AgentMessage, 
    context: AgentContext
  ): Promise<AgentResponse> {
    // Transition to thinking
    await this.stateMachine.transition(AgentStatus.THINKING, 'Processing message')
    
    try {
      // Process the message using the persona-specific implementation
      const response = await this.processAgentMessage(message, context)
      
      // Transition back to idle
      await this.stateMachine.transition(AgentStatus.IDLE, 'Message processed')
      
      // Update statistics
      this.updateStatistics('message_processed')
      
      return response
    } catch (error) {
      // Transition to error state
      await this.stateMachine.transition(AgentStatus.ERROR, (error as Error).message)
      throw error
    }
  }

  protected async callLLM(messages: any[], systemPrompt?: string): Promise<string> {
    const fullMessages = [
      { role: 'system', content: systemPrompt || this.getSystemPrompt() },
      ...messages
    ]

    const options = {
      temperature: this.configuration.temperature,
      max_tokens: this.configuration.maxTokens
    }

    return this.llmProvider.chat(fullMessages, options)
  }

  protected async storeMemory(content: string, type: string = 'conversation'): Promise<void> {
    if (this.memoryManager) {
      await this.memoryManager.store(this.id, content, type)
    }
  }

  protected async retrieveMemory(query: string, limit: number = 5): Promise<any[]> {
    if (this.memoryManager) {
      return this.memoryManager.retrieve(this.id, query, limit)
    }
    return []
  }

  protected async executeTool(toolName: string, parameters: unknown): Promise<any> {
    const tool = this.tools.get(toolName)
    if (!tool) {
      throw new ValidationError('agent', `Tool ${toolName} not found`)
    }

    const context = this.createContext()
    return tool.execute(parameters, context)
  }

  protected registerTool(tool: AgentTool): void {
    if (!tool.allowedAgents.includes(this.type)) {
      throw new ValidationError('agent', `Tool ${tool.name} not allowed for agent type ${this.type}`)
    }
    this.tools.set(tool.name, tool)
  }

  protected createContext(message?: AgentMessage): AgentContext {
    return {
      agentId: this.id,
      agentType: this.type,
      projectId: message?.projectId,
      taskId: message?.taskId,
      userId: 'current-user', // Would be extracted from session
      sessionId: uuidv4(),
      metadata: message?.metadata.context || {}
    }
  }

  protected emitStatusChange(previousStatus: AgentStatus, newStatus: AgentStatus, reason?: string): void {
    const event: AgentStatusChangedEvent = {
      id: uuidv4(),
      type: 'agent.status.changed',
      domain: 'agent',
      agentId: this.id,
      agentType: this.type,
      timestamp: new Date(),
      version: 1,
      payload: {
        previousStatus,
        newStatus,
        reason
      }
    }
    this.eventBus.publishAsync(event)
  }

  // =============================================================================
  // Private Implementation
  // =============================================================================

  private setupStateMachineHandlers(): void {
    this.stateMachine.on('state-changed', (event) => {
      this.agentEntityState.status = event.currentState
      this.agentEntityState.updatedAt = new Date()
      this.emitStatusChange(event.previousState, event.currentState, event.reason)
    })

    this.stateMachine.on('invalid-transition', (event) => {
      console.warn(`Invalid transition attempted for agent ${this.id}:`, event)
    })

    this.stateMachine.on('transition-error', (event) => {
      console.error(`Transition error for agent ${this.id}:`, event)
    })
  }

  private setupEventBusHandlers(): void {
    // Subscribe to relevant events
    this.eventBus.subscribe('system.shutdown', {
      handle: async (_event) => {
        await this.shutdown()
      }
    })
  }

  private initializeTools(): void {
    // Base tools available to all agents would be registered here
    // Implementation would load tools based on agent configuration
  }

  private async checkRateLimit(operation: string): Promise<Result<void, DomainError>> {
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const limit = this.configuration.rateLimits.messagesPerMinute

    let requests = this.rateLimitTracker.get(operation) || []
    requests = requests.filter(timestamp => now - timestamp < windowMs)

    if (requests.length >= limit) {
      return Err(new RateLimitExceededError(this.id, operation))
    }

    requests.push(now)
    this.rateLimitTracker.set(operation, requests)

    return Ok(undefined)
  }

  private addToMessageHistory(message: AgentMessage): void {
    this.messageHistory.push(message)
    
    // Keep only last 1000 messages
    if (this.messageHistory.length > 1000) {
      this.messageHistory.shift()
    }
  }

  private updateStatistics(operation: string): void {
    switch (operation) {
      case 'message_processed':
        this.agentEntityState.statistics = {
          ...this.agentEntityState.statistics,
          totalMessages: this.agentEntityState.statistics.totalMessages + 1,
          lastActiveAt: new Date()
        }
        break
    }
  }

  private async handleError(error: Error, context: string): Promise<void> {
    console.error(`Agent ${this.id} error in ${context}:`, error)
    
    const event: AgentErrorOccurredEvent = {
      id: uuidv4(),
      type: 'agent.error.occurred',
      domain: 'agent',
      agentId: this.id,
      agentType: this.type,
      timestamp: new Date(),
      version: 1,
      payload: {
        error: {
          code: 'AGENT_ERROR',
          message: error.message,
          severity: 'error' as const,
          recoverable: true
        },
        context: { operation: context }
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async shutdown(): Promise<void> {
    try {
      await this.stateMachine.forceTransition(AgentStatus.OFFLINE, 'System shutdown')
      this.stateMachine.destroy()
      this.removeAllListeners()
    } catch (error) {
      console.error(`Error shutting down agent ${this.id}:`, error)
    }
  }
}

export default BaseAgent