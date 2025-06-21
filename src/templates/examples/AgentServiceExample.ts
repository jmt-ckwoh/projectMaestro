/**
 * AgentService Example - Complete working implementation
 * 
 * This demonstrates a full service implementation following Project Maestro patterns:
 * - Contract implementation
 * - Event-driven architecture
 * - State machine integration
 * - Error handling
 * - Proper cleanup
 */

import { EventEmitter } from 'events'
import { IAgentDomainService } from '@/shared/contracts/AgentDomain'
import { 
  Agent as AgentEntity, 
  AgentConfiguration, 
  AgentMessage, 
  AgentResponse, 
  AgentStatus,
  AgentType
} from '@/shared/contracts/AgentDomain'

// =============================================================================
// Types
// =============================================================================

interface AgentEntityAction {
  type: string
  data?: any
}

export interface AgentServiceConfig {
  maxAgentEntitys: number
  defaultTimeout: number
  enableLogging: boolean
  aiProvider: 'bedrock' | 'openai' | 'mock'
}

export interface AgentServiceEvents {
  'agent-created': { agent: AgentEntity }
  'agent-status-changed': { agentId: string, oldStatus: AgentStatus, newStatus: AgentStatus }
  'message-sent': { agentId: string, message: AgentMessage }
  'response-received': { agentId: string, response: AgentResponse }
  'error': { error: Error, context: string }
}

// =============================================================================
// Service Implementation
// =============================================================================

export class AgentService extends EventEmitter implements IAgentDomainService {
  private config: AgentServiceConfig
  private agents = new Map<string, AgentEntity>()
  private statuses = new Map<string, AgentStatus>()
  private messageQueues = new Map<string, AgentMessage[]>()
  private isInitialized = false

  constructor(config: AgentServiceConfig) {
    super()
    this.config = config
  }

  // =============================================================================
  // Lifecycle Methods
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      console.log('Initializing AgentService...')
      
      // Initialize default agents
      await this.createDefaultAgentEntitys()
      
      this.isInitialized = true
      this.emit('initialized', { service: 'AgentService' })
      
      console.log('AgentService initialized successfully')
    } catch (error) {
      this.emit('error', { error: error as Error, context: 'initialization' })
      throw error
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up AgentService...')
      
      // Clear all message queues
      this.messageQueues.clear()
      
      // Reset all agent statuses
      for (const [agentId] of this.agents) {
        await this.updateAgentStatus(agentId, AgentStatus.IDLE)
      }
      
      this.agents.clear()
      this.statuses.clear()
      this.isInitialized = false
      this.removeAllListeners()
      
      console.log('AgentService cleaned up successfully')
    } catch (error) {
      console.error('Error cleaning up AgentService:', error)
      throw error
    }
  }

  // =============================================================================
  // Public API Methods
  // =============================================================================

  async createAgentEntity(type: AgentType, config: AgentEntityConfig): Promise<AgentEntity> {
    try {
      this.validateConfig()
      
      if (this.agents.size >= this.config.maxAgentEntitys) {
        throw new Error(`Maximum number of agents (${this.config.maxAgentEntitys}) reached`)
      }

      const agent: AgentEntity = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        name: this.getAgentEntityName(type),
        status: AgentStatus.IDLE,
        createdAt: new Date(),
        updatedAt: new Date(),
        config,
        statistics: {
          messagesProcessed: 0,
          tasksCompleted: 0,
          averageResponseTime: 0,
          errorCount: 0
        }
      }
      
      this.agents.set(agent.id, agent)
      this.statuses.set(agent.id, AgentStatus.IDLE)
      this.messageQueues.set(agent.id, [])
      
      this.emit('agent-created', { agent })
      
      if (this.config.enableLogging) {
        console.log(`Created agent: ${agent.name} (${agent.id})`)
      }
      
      return agent
    } catch (error) {
      this.handleError(error as Error, 'createAgentEntity')
      throw error
    }
  }

  async getAgentEntity(id: string): Promise<AgentEntity | null> {
    try {
      this.validateConfig()
      return this.agents.get(id) || null
    } catch (error) {
      this.handleError(error as Error, 'getAgentEntity')
      throw error
    }
  }

  async updateAgentStatus(id: string, status: AgentStatus): Promise<void> {
    try {
      this.validateConfig()
      
      const agent = this.agents.get(id)
      if (!agent) {
        throw new Error(`AgentEntity with id ${id} not found`)
      }

      const oldStatus = this.statuses.get(id) || AgentStatus.IDLE
      
      if (oldStatus === status) {
        return // No change needed
      }

      // Validate status transition
      if (!this.isValidStatusTransition(oldStatus, status)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${status}`)
      }

      this.statuses.set(id, status)
      
      // Update agent record
      const updatedAgentEntity = {
        ...agent,
        status,
        updatedAt: new Date()
      }
      this.agents.set(id, updatedAgentEntity)
      
      this.emit('agent-status-changed', { agentId: id, oldStatus, newStatus: status })
      
      if (this.config.enableLogging) {
        console.log(`AgentEntity ${agent.name} status changed: ${oldStatus} → ${status}`)
      }
    } catch (error) {
      this.handleError(error as Error, 'updateAgentStatus')
      throw error
    }
  }

  async sendMessage(agentId: string, message: AgentMessage): Promise<AgentResponse> {
    try {
      this.validateConfig()
      
      const agent = this.agents.get(agentId)
      if (!agent) {
        throw new Error(`AgentEntity with id ${agentId} not found`)
      }

      const currentStatus = this.statuses.get(agentId)
      if (currentStatus === AgentStatus.ERROR) {
        throw new Error(`AgentEntity ${agent.name} is in error state`)
      }

      // Add message to queue
      const queue = this.messageQueues.get(agentId) || []
      queue.push(message)
      this.messageQueues.set(agentId, queue)

      this.emit('message-sent', { agentId, message })

      // Update status to thinking
      await this.updateAgentStatus(agentId, AgentStatus.THINKING)

      // Simulate AI processing
      const response = await this.processMessage(agent, message)

      // Update statistics
      const updatedAgentEntity = this.agents.get(agentId)!
      updatedAgentEntity.statistics.messagesProcessed++
      updatedAgentEntity.statistics.averageResponseTime = 
        (updatedAgentEntity.statistics.averageResponseTime + response.processingTime) / 2
      updatedAgentEntity.updatedAt = new Date()
      this.agents.set(agentId, updatedAgentEntity)

      // Update status back to idle
      await this.updateAgentStatus(agentId, AgentStatus.IDLE)

      this.emit('response-received', { agentId, response })

      return response
    } catch (error) {
      // Update agent statistics on error
      const agent = this.agents.get(agentId)
      if (agent) {
        agent.statistics.errorCount++
        this.agents.set(agentId, agent)
      }
      
      await this.updateAgentStatus(agentId, AgentStatus.ERROR)
      this.handleError(error as Error, 'sendMessage')
      throw error
    }
  }

  async processResponse(agentId: string, response: AgentResponse): Promise<void> {
    try {
      this.validateConfig()
      
      const agent = this.agents.get(agentId)
      if (!agent) {
        throw new Error(`AgentEntity with id ${agentId} not found`)
      }

      // Process any actions in the response
      if (response.actions && response.actions.length > 0) {
        await this.processActions(agent, response.actions)
      }

      // Update agent status if specified
      if (response.statusUpdate) {
        await this.updateAgentStatus(agentId, response.statusUpdate.status)
      }

      // Update task completion statistics
      if (response.actions?.some((action: any) => action.type === 'task-completed')) {
        const updatedAgentEntity = this.agents.get(agentId)!
        updatedAgentEntity.statistics.tasksCompleted++
        updatedAgentEntity.updatedAt = new Date()
        this.agents.set(agentId, updatedAgentEntity)
      }
    } catch (error) {
      this.handleError(error as Error, 'processResponse')
      throw error
    }
  }

  // =============================================================================
  // Additional Public Methods
  // =============================================================================

  getAllAgentEntitys(): AgentEntity[] {
    return Array.from(this.agents.values())
  }

  getAgentEntitysByType(type: AgentType): AgentEntity[] {
    return this.getAllAgentEntitys().filter(agent => agent.type === type)
  }

  getAgentStatus(agentId: string): AgentStatus | null {
    return this.statuses.get(agentId) || null
  }

  getAllStatuses(): Record<string, AgentStatus> {
    const statuses: Record<string, AgentStatus> = {}
    for (const [agentId, status] of this.statuses) {
      statuses[agentId] = status
    }
    return statuses
  }

  getMessageQueue(agentId: string): AgentMessage[] {
    return this.messageQueues.get(agentId) || []
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private async createDefaultAgentEntitys(): Promise<void> {
    const defaultAgentTypes: AgentType[] = [
      AgentType.PRODUCER,
      AgentType.ARCHITECT, 
      AgentType.ENGINEER,
      AgentType.QA
    ]

    for (const type of defaultAgentTypes) {
      await this.createAgentEntity(type, {
        personality: this.getDefaultPersonality(type),
        capabilities: this.getDefaultCapabilities(type),
        maxConcurrentTasks: 3,
        timeout: this.config.defaultTimeout
      })
    }
  }

  private getAgentEntityName(type: AgentType): string {
    const names = {
      [AgentType.PRODUCER]: 'Project Producer',
      [AgentType.ARCHITECT]: 'System Architect', 
      [AgentType.ENGINEER]: 'Code Engineer',
      [AgentType.QA]: 'Quality Assurance'
    }
    return names[type]
  }

  private getDefaultPersonality(type: AgentType): string {
    const personalities = {
      [AgentType.PRODUCER]: 'Organized, communicative, and focused on project coordination',
      [AgentType.ARCHITECT]: 'Analytical, systematic, and focused on technical design',
      [AgentType.ENGINEER]: 'Practical, detail-oriented, and focused on implementation',
      [AgentType.QA]: 'Thorough, meticulous, and focused on quality and testing'
    }
    return personalities[type]
  }

  private getDefaultCapabilities(type: AgentType): string[] {
    const capabilities = {
      [AgentType.PRODUCER]: [
        'project-planning',
        'team-coordination', 
        'requirements-gathering',
        'progress-tracking'
      ],
      [AgentType.ARCHITECT]: [
        'system-design',
        'technology-selection',
        'architecture-documentation',
        'design-patterns'
      ],
      [AgentType.ENGINEER]: [
        'code-generation',
        'implementation',
        'debugging',
        'optimization'
      ],
      [AgentType.QA]: [
        'test-creation',
        'quality-review',
        'bug-detection',
        'performance-testing'
      ]
    }
    return capabilities[type]
  }

  private isValidStatusTransition(from: AgentStatus, to: AgentStatus): boolean {
    const validTransitions: Record<AgentStatus, AgentStatus[]> = {
      [AgentStatus.IDLE]: [AgentStatus.THINKING, AgentStatus.ERROR],
      [AgentStatus.THINKING]: [AgentStatus.WORKING, AgentStatus.WAITING, AgentStatus.IDLE, AgentStatus.ERROR],
      [AgentStatus.WORKING]: [AgentStatus.IDLE, AgentStatus.WAITING, AgentStatus.ERROR],
      [AgentStatus.WAITING]: [AgentStatus.THINKING, AgentStatus.IDLE, AgentStatus.ERROR],
      [AgentStatus.ERROR]: [AgentStatus.IDLE]
    }

    return validTransitions[from]?.includes(to) || false
  }

  private async processMessage(agent: AgentEntity, message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500))

    const processingTime = Date.now() - startTime

    // Generate appropriate response based on agent type
    const response: AgentResponse = {
      messageId: `resp-${Date.now()}`,
      agentType: agent.type,
      content: this.generateResponseContent(agent, message),
      actions: this.generateActions(agent, message),
      statusUpdate: null,
      errors: [],
      processingTime,
      timestamp: new Date()
    }

    return response
  }

  private generateResponseContent(agent: AgentEntity, _message: AgentMessage): string {
    const responses = {
      [AgentType.PRODUCER]: [
        "I'll coordinate with the team to make this happen.",
        "Let me break this down into actionable tasks.",
        "I'll ensure we have all the requirements clear before proceeding."
      ],
      [AgentType.ARCHITECT]: [
        "From a technical perspective, I recommend...",
        "Let me design the system architecture for this.",
        "I'll create the technical specifications."
      ],
      [AgentType.ENGINEER]: [
        "I can implement this feature right away.",
        "Let me write the code for this requirement.",
        "I'll handle the technical implementation."
      ],
      [AgentType.QA]: [
        "I'll create comprehensive tests for this feature.",
        "Let me review this for quality and potential issues.",
        "I'll ensure this meets our quality standards."
      ]
    }

    const agentResponses = responses[agent.type]
    return agentResponses[Math.floor(Math.random() * agentResponses.length)]
  }

  private generateActions(agent: AgentEntity, message: AgentMessage): any[] {
    // Generate context-appropriate actions
    const actions = []

    if (message.content.toLowerCase().includes('create')) {
      actions.push({
        type: 'task-create',
        description: 'Create new task based on request',
        agentId: agent.id
      })
    }

    if (message.content.toLowerCase().includes('test')) {
      actions.push({
        type: 'test-generate',
        description: 'Generate tests for the feature',
        agentId: agent.id
      })
    }

    return actions
  }

  private async processActions(agent: AgentEntity, actions: AgentEntityAction[]): Promise<void> {
    for (const action of actions) {
      try {
        // Process each action
        console.log(`Processing action: ${action.type} for agent ${agent.name}`)
        
        // Simulate action processing
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to process action ${action.type}:`, error)
      }
    }
  }

  private validateConfig(): void {
    if (!this.config) {
      throw new Error('AgentService configuration is required')
    }

    if (!this.isInitialized) {
      throw new Error('AgentService must be initialized before use')
    }
  }

  private handleError(error: Error, context: string): void {
    console.error(`AgentService error in ${context}:`, error)
    this.emit('error', { error, context })
  }

  // =============================================================================
  // Getters
  // =============================================================================

  get isReady(): boolean {
    return this.isInitialized
  }

  get configuration(): Readonly<AgentServiceConfig> {
    return { ...this.config }
  }

  get agentCount(): number {
    return this.agents.size
  }
}

// =============================================================================
// Service Factory
// =============================================================================

export function createAgentService(config: AgentServiceConfig): AgentService {
  const service = new AgentService(config)
  
  // Set up default event handlers
  service.on('error', ({ error, context }) => {
    console.error(`AgentService error in ${context}:`, error)
  })

  service.on('agent-created', ({ agent }) => {
    console.log(`AgentEntity created: ${agent.name} (${agent.type})`)
  })
  
  return service
}

// =============================================================================
// Default Export
// =============================================================================

export default AgentService

// =============================================================================
// Example Usage
// =============================================================================

/*
// Initialize the service
const agentService = createAgentService({
  maxAgentEntitys: 10,
  defaultTimeout: 30000,
  enableLogging: true,
  aiProvider: 'mock'
})

await agentService.initialize()

// Create a custom agent
const engineer = await agentService.createAgentEntity(AgentType.ENGINEER, {
  personality: 'Focused on React and TypeScript',
  capabilities: ['react', 'typescript', 'testing'],
  maxConcurrentTasks: 2,
  timeout: 15000
})

// Send a message
const response = await agentService.sendMessage(engineer.id, {
  id: 'msg-1',
  content: 'Create a user profile component',
  type: 'request',
  projectId: 'proj-123',
  timestamp: new Date()
})

console.log('AgentEntity response:', response.content)

// Clean up
await agentService.cleanup()
*/