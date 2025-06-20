/**
 * Agent Domain Contract
 * 
 * Defines the contract for the Agent domain service.
 * This prevents poor implementation decisions by enforcing:
 * - Clear agent state transitions
 * - Proper message handling protocols
 * - Resource management constraints
 * - Error handling patterns
 */

import { z } from 'zod'
import { 
  DomainEntity, 
  DomainError, 
  DomainEvent, 
  DomainService,
  DomainServiceLifecycle,
  IdSchema,
  NonEmptyStringSchema,
  Result 
} from './common'

// =============================================================================
// Agent Core Types
// =============================================================================

export enum AgentType {
  PRODUCER = 'producer',
  ARCHITECT = 'architect', 
  ENGINEER = 'engineer',
  QA = 'qa'
}

export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  WORKING = 'working',
  WAITING = 'waiting',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export interface Agent extends DomainEntity {
  readonly type: AgentType
  readonly name: string
  readonly avatar: string
  readonly status: AgentStatus
  readonly capabilities: AgentCapability[]
  readonly configuration: AgentConfiguration
  readonly statistics: AgentStatistics
}

export interface AgentCapability {
  readonly name: string
  readonly description: string
  readonly enabled: boolean
  readonly parameters: Record<string, unknown>
}

export interface AgentConfiguration {
  readonly model: string
  readonly temperature: number
  readonly maxTokens: number
  readonly systemPrompt: string
  readonly tools: string[]
  readonly memoryAccess: MemoryAccessLevel
  readonly rateLimits: RateLimits
}

export interface MemoryAccessLevel {
  readonly global: boolean
  readonly project: boolean
  readonly task: boolean
  readonly personal: boolean
}

export interface RateLimits {
  readonly messagesPerMinute: number
  readonly tokensPerHour: number
  readonly maxConcurrentTasks: number
}

export interface AgentStatistics {
  readonly totalMessages: number
  readonly totalTokensUsed: number
  readonly averageResponseTime: number
  readonly successRate: number
  readonly lastActiveAt: Date
}

// =============================================================================
// Message Protocol
// =============================================================================

export interface AgentMessage {
  readonly id: string
  readonly timestamp: Date
  readonly from: AgentType | 'user' | 'system'
  readonly to: AgentType | 'all' | 'user'
  readonly content: string
  readonly messageType: MessageType
  readonly projectId?: string
  readonly taskId?: string
  readonly metadata: MessageMetadata
}

export enum MessageType {
  CHAT = 'chat',
  COMMAND = 'command',
  STATUS = 'status',
  ERROR = 'error',
  SYSTEM = 'system'
}

export interface MessageMetadata {
  readonly priority: 'low' | 'normal' | 'high' | 'urgent'
  readonly requiresResponse: boolean
  readonly threadId?: string
  readonly references?: string[]
  readonly suggestedActions?: AgentAction[]
  readonly context?: Record<string, unknown>
}

export interface AgentAction {
  readonly type: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly confirmation: boolean
}

export interface AgentResponse {
  readonly messageId: string
  readonly agentType: AgentType
  readonly content: string
  readonly actions: AgentAction[]
  readonly statusUpdate?: AgentStatusUpdate
  readonly errors?: AgentError[]
}

export interface AgentStatusUpdate {
  readonly status: AgentStatus
  readonly message?: string
  readonly progress?: number
  readonly estimatedCompletion?: Date
  readonly blockedReason?: string
}

export interface AgentError {
  readonly code: string
  readonly message: string
  readonly severity: 'warning' | 'error' | 'critical'
  readonly recoverable: boolean
  readonly context?: Record<string, unknown>
}

// =============================================================================
// Agent State Machine
// =============================================================================

export interface AgentStateMachine {
  readonly currentState: AgentStatus
  readonly allowedTransitions: AgentStatus[]
  readonly transitionGuards: StateTransitionGuard[]
}

export interface StateTransitionGuard {
  readonly fromState: AgentStatus
  readonly toState: AgentStatus
  readonly condition: (agent: Agent, context: Record<string, unknown>) => boolean
  readonly reason: string
}

export interface StateTransition {
  readonly fromState: AgentStatus
  readonly toState: AgentStatus
  readonly trigger: string
  readonly timestamp: Date
  readonly reason?: string
}

// =============================================================================
// Agent Events
// =============================================================================

export interface AgentEvent extends DomainEvent {
  readonly domain: 'agent'
  readonly agentId: string
  readonly agentType: AgentType
}

export interface AgentStatusChangedEvent extends AgentEvent {
  readonly type: 'agent.status.changed'
  readonly payload: {
    readonly previousStatus: AgentStatus
    readonly newStatus: AgentStatus
    readonly reason?: string
  }
}

export interface AgentMessageSentEvent extends AgentEvent {
  readonly type: 'agent.message.sent'
  readonly payload: {
    readonly messageId: string
    readonly to: string
    readonly messageType: MessageType
  }
}

export interface AgentErrorOccurredEvent extends AgentEvent {
  readonly type: 'agent.error.occurred'
  readonly payload: {
    readonly error: AgentError
    readonly context: Record<string, unknown>
  }
}

// =============================================================================
// Validation Schemas
// =============================================================================

export const AgentTypeSchema = z.nativeEnum(AgentType)
export const AgentStatusSchema = z.nativeEnum(AgentStatus)
export const MessageTypeSchema = z.nativeEnum(MessageType)

export const AgentConfigurationSchema = z.object({
  model: NonEmptyStringSchema,
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive(),
  systemPrompt: NonEmptyStringSchema,
  tools: z.array(z.string()),
  memoryAccess: z.object({
    global: z.boolean(),
    project: z.boolean(),
    task: z.boolean(),
    personal: z.boolean()
  }),
  rateLimits: z.object({
    messagesPerMinute: z.number().positive(),
    tokensPerHour: z.number().positive(),
    maxConcurrentTasks: z.number().positive()
  })
})

export const AgentMessageSchema = z.object({
  id: IdSchema,
  timestamp: z.date(),
  from: z.union([AgentTypeSchema, z.literal('user'), z.literal('system')]),
  to: z.union([AgentTypeSchema, z.literal('all'), z.literal('user')]),
  content: NonEmptyStringSchema,
  messageType: MessageTypeSchema,
  projectId: IdSchema.optional(),
  taskId: IdSchema.optional(),
  metadata: z.object({
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    requiresResponse: z.boolean(),
    threadId: IdSchema.optional(),
    references: z.array(z.string()).optional(),
    context: z.record(z.unknown()).optional()
  })
})

// =============================================================================
// Agent Domain Service Contract
// =============================================================================

export interface IAgentDomainService extends DomainService<Agent>, DomainServiceLifecycle {
  
  // =============================================================================
  // Agent Management
  // =============================================================================
  
  /**
   * Get all available agents
   */
  getAllAgents(): Promise<Agent[]>
  
  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): Promise<Agent[]>
  
  /**
   * Get agent by type (single instance)
   * @throws EntityNotFoundError if agent not found
   */
  getAgentByType(type: AgentType): Promise<Agent>
  
  /**
   * Update agent configuration
   * @throws ValidationError if configuration invalid
   * @throws BusinessRuleViolationError if configuration violates constraints
   */
  updateAgentConfiguration(agentId: string, configuration: Partial<AgentConfiguration>): Promise<Agent>
  
  /**
   * Enable/disable agent
   */
  setAgentEnabled(agentId: string, enabled: boolean): Promise<Agent>
  
  // =============================================================================
  // Message Handling
  // =============================================================================
  
  /**
   * Send message to agent
   * @throws ValidationError if message invalid
   * @throws BusinessRuleViolationError if agent not available
   * @throws RateLimitExceededError if rate limit exceeded
   */
  sendMessage(message: AgentMessage): Promise<Result<AgentResponse, DomainError>>
  
  /**
   * Send message and wait for response
   * @param timeoutMs Maximum time to wait for response
   */
  sendMessageAndWait(
    message: AgentMessage, 
    timeoutMs: number
  ): Promise<Result<AgentResponse, DomainError>>
  
  /**
   * Broadcast message to multiple agents
   */
  broadcastMessage(
    message: Omit<AgentMessage, 'to'>, 
    targets: AgentType[]
  ): Promise<Result<AgentResponse[], DomainError>>
  
  /**
   * Get message history for agent
   */
  getMessageHistory(
    agentId: string, 
    options?: MessageHistoryOptions
  ): Promise<AgentMessage[]>
  
  // =============================================================================
  // Status Management
  // =============================================================================
  
  /**
   * Update agent status
   * @throws BusinessRuleViolationError if transition not allowed
   */
  updateAgentStatus(
    agentId: string, 
    status: AgentStatus, 
    reason?: string
  ): Promise<Agent>
  
  /**
   * Get agent status
   */
  getAgentStatus(agentId: string): Promise<AgentStatus>
  
  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): Promise<Record<string, AgentStatus>>
  
  /**
   * Check if agent is available for work
   */
  isAgentAvailable(agentId: string): Promise<boolean>
  
  /**
   * Get agent state machine
   */
  getAgentStateMachine(agentId: string): Promise<AgentStateMachine>
  
  // =============================================================================
  // Orchestration
  // =============================================================================
  
  /**
   * Start agent collaboration workflow
   */
  startCollaboration(
    agents: AgentType[], 
    context: CollaborationContext
  ): Promise<Result<string, DomainError>> // Returns workflow ID
  
  /**
   * Stop agent collaboration
   */
  stopCollaboration(workflowId: string): Promise<void>
  
  /**
   * Get active collaborations
   */
  getActiveCollaborations(): Promise<CollaborationStatus[]>
  
  // =============================================================================
  // Monitoring & Statistics
  // =============================================================================
  
  /**
   * Get agent statistics
   */
  getAgentStatistics(agentId: string): Promise<AgentStatistics>
  
  /**
   * Get system-wide agent metrics
   */
  getSystemMetrics(): Promise<SystemMetrics>
  
  /**
   * Reset agent statistics
   */
  resetAgentStatistics(agentId: string): Promise<void>
}

// =============================================================================
// Supporting Types
// =============================================================================

export interface MessageHistoryOptions {
  readonly limit?: number
  readonly startDate?: Date
  readonly endDate?: Date
  readonly messageType?: MessageType
  readonly threadId?: string
}

export interface CollaborationContext {
  readonly projectId: string
  readonly taskId?: string
  readonly objective: string
  readonly timeout?: number
  readonly parameters: Record<string, unknown>
}

export interface CollaborationStatus {
  readonly id: string
  readonly agents: AgentType[]
  readonly status: 'active' | 'paused' | 'completed' | 'failed'
  readonly startedAt: Date
  readonly completedAt?: Date
  readonly context: CollaborationContext
}

export interface SystemMetrics {
  readonly totalAgents: number
  readonly activeAgents: number
  readonly totalMessages: number
  readonly averageResponseTime: number
  readonly errorRate: number
  readonly resourceUsage: ResourceUsage
}

export interface ResourceUsage {
  readonly memoryUsage: number
  readonly cpuUsage: number
  readonly tokenUsage: number
  readonly apiCallsPerMinute: number
}

// =============================================================================
// Agent Domain Errors
// =============================================================================

export class AgentNotAvailableError extends DomainError {
  readonly code = 'AGENT_NOT_AVAILABLE'
  readonly domain = 'agent'
  
  constructor(agentId: string, status: AgentStatus, cause?: Error) {
    super(`Agent ${agentId} is not available (status: ${status})`, cause)
  }
}

export class RateLimitExceededError extends DomainError {
  readonly code = 'RATE_LIMIT_EXCEEDED'
  readonly domain = 'agent'
  
  constructor(agentId: string, limitType: string, cause?: Error) {
    super(`Rate limit exceeded for agent ${agentId}: ${limitType}`, cause)
  }
}

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly domain = 'agent'
  
  constructor(agentId: string, from: AgentStatus, to: AgentStatus, cause?: Error) {
    super(`Invalid state transition for agent ${agentId}: ${from} -> ${to}`, cause)
  }
}

export class MessageTimeoutError extends DomainError {
  readonly code = 'MESSAGE_TIMEOUT'
  readonly domain = 'agent'
  
  constructor(messageId: string, timeoutMs: number, cause?: Error) {
    super(`Message ${messageId} timed out after ${timeoutMs}ms`, cause)
  }
}

export class CollaborationError extends DomainError {
  readonly code = 'COLLABORATION_ERROR'
  readonly domain = 'agent'
  
  constructor(workflowId: string, reason: string, cause?: Error) {
    super(`Collaboration ${workflowId} failed: ${reason}`, cause)
  }
}