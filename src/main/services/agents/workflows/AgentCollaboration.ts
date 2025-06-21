/**
 * Agent Collaboration System
 * 
 * Manages workflows and handoff protocols between different agent types.
 * Orchestrates multi-agent collaboration patterns and ensures smooth
 * communication and task coordination across the agent ecosystem.
 */

import {
  AgentType
} from '@/shared/contracts/AgentDomain'
import { IEventBus } from '@/shared/contracts/EventBus'
import { DomainEvent } from '@/shared/contracts/common'
import { v4 as uuidv4 } from 'uuid'

// =============================================================================
// Collaboration Types
// =============================================================================

export interface CollaborationSession {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly participants: AgentType[]
  readonly initiator: AgentType
  readonly workflow: WorkflowType
  readonly context: CollaborationContext
  readonly status: 'active' | 'paused' | 'completed' | 'failed'
  readonly messages: CollaborationMessage[]
  readonly handoffs: AgentHandoff[]
  readonly startTime: Date
  readonly endTime?: Date
  readonly metadata: Record<string, any>
}

export interface CollaborationContext {
  readonly projectId?: string
  readonly taskId?: string
  readonly requirements: string[]
  readonly constraints: string[]
  readonly objectives: string[]
  readonly deliverables: string[]
  readonly timeline?: string
  readonly priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface CollaborationMessage {
  readonly id: string
  readonly sessionId: string
  readonly from: AgentType
  readonly to: AgentType[]
  readonly content: string
  readonly messageType: 'request' | 'response' | 'handoff' | 'clarification' | 'status_update'
  readonly payload?: any
  readonly timestamp: Date
  readonly requiresResponse: boolean
  readonly responseTimeout?: Date
}

export interface AgentHandoff {
  readonly id: string
  readonly sessionId: string
  readonly from: AgentType
  readonly to: AgentType
  readonly context: HandoffContext
  readonly status: 'pending' | 'accepted' | 'rejected' | 'completed'
  readonly timestamp: Date
  readonly completedAt?: Date
  readonly notes?: string
}

export interface HandoffContext {
  readonly task: string
  readonly requirements: string[]
  readonly deliverables: string[]
  readonly context: any
  readonly previousWork?: any
  readonly constraints?: string[]
  readonly timeline?: string
}

export type WorkflowType = 
  | 'sequential'
  | 'parallel'  
  | 'collaborative'
  | 'review_cycle'
  | 'iterative'
  | 'emergency_response'

export interface WorkflowTemplate {
  readonly type: WorkflowType
  readonly name: string
  readonly description: string
  readonly stages: WorkflowStage[]
  readonly participantRoles: Record<AgentType, string[]>
  readonly handoffRules: HandoffRule[]
  readonly completionCriteria: string[]
}

export interface WorkflowStage {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly primaryAgent: AgentType
  readonly supportingAgents: AgentType[]
  readonly inputs: string[]
  readonly outputs: string[]
  readonly estimatedDuration?: string
  readonly dependencies: string[]
}

export interface HandoffRule {
  readonly from: AgentType
  readonly to: AgentType
  readonly trigger: HandoffTrigger
  readonly conditions: string[]
  readonly requiredDeliverables: string[]
  readonly validationCriteria: string[]
}

export interface HandoffTrigger {
  readonly type: 'completion' | 'milestone' | 'request' | 'error' | 'timeout'
  readonly criteria: string[]
  readonly automaticTransfer: boolean
}

// =============================================================================
// Predefined Workflow Templates
// =============================================================================

export const WORKFLOW_TEMPLATES: Record<string, WorkflowTemplate> = {
  NEW_FEATURE_DEVELOPMENT: {
    type: 'sequential',
    name: 'New Feature Development',
    description: 'Standard workflow for developing new features from requirements to deployment',
    stages: [
      {
        id: 'requirements_analysis',
        name: 'Requirements Analysis',
        description: 'Analyze and clarify feature requirements',
        primaryAgent: AgentType.PRODUCER,
        supportingAgents: [],
        inputs: ['User requirements', 'Business context'],
        outputs: ['Clarified requirements', 'Project plan'],
        estimatedDuration: '1-2 days',
        dependencies: []
      },
      {
        id: 'system_design',
        name: 'System Design',
        description: 'Create technical architecture and system design',
        primaryAgent: AgentType.ARCHITECT,
        supportingAgents: [AgentType.PRODUCER],
        inputs: ['Requirements', 'Project plan'],
        outputs: ['System architecture', 'Technical specifications'],
        estimatedDuration: '2-3 days',
        dependencies: ['requirements_analysis']
      },
      {
        id: 'implementation',
        name: 'Implementation',
        description: 'Develop the feature according to specifications',
        primaryAgent: AgentType.ENGINEER,
        supportingAgents: [AgentType.ARCHITECT],
        inputs: ['Technical specifications', 'System design'],
        outputs: ['Working code', 'Unit tests', 'Documentation'],
        estimatedDuration: '3-5 days',
        dependencies: ['system_design']
      },
      {
        id: 'quality_assurance',
        name: 'Quality Assurance',
        description: 'Test and validate the implementation',
        primaryAgent: AgentType.QA,
        supportingAgents: [AgentType.ENGINEER],
        inputs: ['Implementation', 'Requirements'],
        outputs: ['Test results', 'Quality report', 'Bug reports'],
        estimatedDuration: '2-3 days',
        dependencies: ['implementation']
      }
    ],
    participantRoles: {
      [AgentType.PRODUCER]: ['Requirements gathering', 'Project coordination', 'Stakeholder communication'],
      [AgentType.ARCHITECT]: ['System design', 'Technology selection', 'Technical guidance'],
      [AgentType.ENGINEER]: ['Code implementation', 'Technical documentation', 'Unit testing'],
      [AgentType.QA]: ['Quality validation', 'Testing', 'Bug reporting']
    },
    handoffRules: [
      {
        from: AgentType.PRODUCER,
        to: AgentType.ARCHITECT,
        trigger: {
          type: 'completion',
          criteria: ['Requirements clarified', 'Project plan approved'],
          automaticTransfer: true
        },
        conditions: ['All requirements documented', 'Stakeholder approval received'],
        requiredDeliverables: ['Requirements document', 'Project plan'],
        validationCriteria: ['Requirements are clear and testable', 'Project scope is defined']
      },
      {
        from: AgentType.ARCHITECT,
        to: AgentType.ENGINEER,
        trigger: {
          type: 'completion',
          criteria: ['Architecture approved', 'Technical specs complete'],
          automaticTransfer: true
        },
        conditions: ['Design reviewed and approved', 'Technical feasibility confirmed'],
        requiredDeliverables: ['System architecture', 'Technical specifications', 'API contracts'],
        validationCriteria: ['Architecture is implementable', 'Dependencies are identified']
      },
      {
        from: AgentType.ENGINEER,
        to: AgentType.QA,
        trigger: {
          type: 'completion',
          criteria: ['Feature implemented', 'Unit tests passing'],
          automaticTransfer: true
        },
        conditions: ['Code review completed', 'Implementation meets specifications'],
        requiredDeliverables: ['Working feature', 'Unit tests', 'Documentation'],
        validationCriteria: ['Code compiles and runs', 'Basic functionality works']
      }
    ],
    completionCriteria: [
      'All quality tests pass',
      'Feature meets requirements',
      'Documentation is complete',
      'No critical bugs remain'
    ]
  },

  BUG_FIX_WORKFLOW: {
    type: 'collaborative',
    name: 'Bug Fix Workflow',
    description: 'Collaborative workflow for identifying, fixing, and verifying bug fixes',
    stages: [
      {
        id: 'bug_investigation',
        name: 'Bug Investigation',
        description: 'Analyze and reproduce the reported bug',
        primaryAgent: AgentType.QA,
        supportingAgents: [AgentType.ENGINEER],
        inputs: ['Bug report', 'System logs'],
        outputs: ['Root cause analysis', 'Reproduction steps'],
        estimatedDuration: '0.5-1 day',
        dependencies: []
      },
      {
        id: 'fix_development',
        name: 'Fix Development',
        description: 'Develop and test the bug fix',
        primaryAgent: AgentType.ENGINEER,
        supportingAgents: [AgentType.ARCHITECT],
        inputs: ['Root cause analysis', 'System design'],
        outputs: ['Bug fix', 'Regression tests'],
        estimatedDuration: '1-2 days',
        dependencies: ['bug_investigation']
      },
      {
        id: 'fix_verification',
        name: 'Fix Verification',
        description: 'Verify the fix and test for regressions',
        primaryAgent: AgentType.QA,
        supportingAgents: [],
        inputs: ['Bug fix', 'Test cases'],
        outputs: ['Verification results', 'Regression test results'],
        estimatedDuration: '0.5-1 day',
        dependencies: ['fix_development']
      }
    ],
    participantRoles: {
      [AgentType.PRODUCER]: ['Bug prioritization', 'Stakeholder communication'],
      [AgentType.ARCHITECT]: ['Architecture impact assessment', 'Design guidance'],
      [AgentType.ENGINEER]: ['Root cause analysis', 'Fix implementation'],
      [AgentType.QA]: ['Bug reproduction', 'Fix verification', 'Regression testing']
    },
    handoffRules: [
      {
        from: AgentType.QA,
        to: AgentType.ENGINEER,
        trigger: {
          type: 'completion',
          criteria: ['Bug reproduced', 'Root cause identified'],
          automaticTransfer: true
        },
        conditions: ['Bug is reproducible', 'Impact is assessed'],
        requiredDeliverables: ['Root cause analysis', 'Reproduction steps'],
        validationCriteria: ['Root cause is clearly identified', 'Fix approach is defined']
      },
      {
        from: AgentType.ENGINEER,
        to: AgentType.QA,
        trigger: {
          type: 'completion',
          criteria: ['Fix implemented', 'Unit tests updated'],
          automaticTransfer: true
        },
        conditions: ['Fix is implemented', 'Code review completed'],
        requiredDeliverables: ['Bug fix code', 'Updated tests'],
        validationCriteria: ['Fix addresses root cause', 'No new issues introduced']
      }
    ],
    completionCriteria: [
      'Bug is fixed and verified',
      'No regressions introduced',
      'Fix is documented'
    ]
  },

  ARCHITECTURE_REVIEW: {
    type: 'review_cycle',
    name: 'Architecture Review',
    description: 'Comprehensive review of system architecture with iterative feedback',
    stages: [
      {
        id: 'architecture_proposal',
        name: 'Architecture Proposal',
        description: 'Create initial architecture proposal',
        primaryAgent: AgentType.ARCHITECT,
        supportingAgents: [AgentType.PRODUCER],
        inputs: ['Requirements', 'Constraints'],
        outputs: ['Architecture proposal', 'Design rationale'],
        estimatedDuration: '2-3 days',
        dependencies: []
      },
      {
        id: 'technical_review',
        name: 'Technical Review',
        description: 'Review architecture for technical feasibility',
        primaryAgent: AgentType.ENGINEER,
        supportingAgents: [],
        inputs: ['Architecture proposal'],
        outputs: ['Technical feedback', 'Implementation concerns'],
        estimatedDuration: '1 day',
        dependencies: ['architecture_proposal']
      },
      {
        id: 'quality_review',
        name: 'Quality Review',
        description: 'Review architecture for testability and quality',
        primaryAgent: AgentType.QA,
        supportingAgents: [],
        inputs: ['Architecture proposal'],
        outputs: ['Quality feedback', 'Testing strategy'],
        estimatedDuration: '1 day',
        dependencies: ['architecture_proposal']
      },
      {
        id: 'architecture_refinement',
        name: 'Architecture Refinement',
        description: 'Refine architecture based on feedback',
        primaryAgent: AgentType.ARCHITECT,
        supportingAgents: [AgentType.ENGINEER, AgentType.QA],
        inputs: ['Feedback from reviews'],
        outputs: ['Refined architecture', 'Implementation plan'],
        estimatedDuration: '1-2 days',
        dependencies: ['technical_review', 'quality_review']
      }
    ],
    participantRoles: {
      [AgentType.PRODUCER]: ['Requirements validation', 'Business alignment'],
      [AgentType.ARCHITECT]: ['Architecture design', 'Technical leadership'],
      [AgentType.ENGINEER]: ['Implementation feasibility', 'Technical review'],
      [AgentType.QA]: ['Testability assessment', 'Quality strategy']
    },
    handoffRules: [
      {
        from: AgentType.ARCHITECT,
        to: AgentType.ENGINEER,
        trigger: {
          type: 'milestone',
          criteria: ['Architecture proposal complete'],
          automaticTransfer: false
        },
        conditions: ['Proposal is documented', 'Ready for review'],
        requiredDeliverables: ['Architecture document', 'Design rationale'],
        validationCriteria: ['Architecture is complete', 'Rationale is clear']
      },
      {
        from: AgentType.ARCHITECT,
        to: AgentType.QA,
        trigger: {
          type: 'milestone',
          criteria: ['Architecture proposal complete'],
          automaticTransfer: false
        },
        conditions: ['Proposal is documented', 'Ready for review'],
        requiredDeliverables: ['Architecture document', 'Quality requirements'],
        validationCriteria: ['Architecture is complete', 'Quality aspects are defined']
      }
    ],
    completionCriteria: [
      'Architecture is approved by all reviewers',
      'Implementation plan is defined',
      'Quality strategy is established'
    ]
  }
}

// =============================================================================
// Agent Collaboration Manager
// =============================================================================

export class AgentCollaborationManager {
  private activeSessions: Map<string, CollaborationSession> = new Map()
  private sessionHistory: CollaborationSession[] = []

  constructor(private readonly eventBus: IEventBus) {
    this.setupEventHandlers()
  }

  // =============================================================================
  // Session Management
  // =============================================================================

  async startCollaboration(
    workflow: WorkflowType,
    context: CollaborationContext,
    initiator: AgentType,
    participants: AgentType[]
  ): Promise<string> {
    const sessionId = uuidv4()
    const template = this.getWorkflowTemplate(workflow)

    const session: CollaborationSession = {
      id: sessionId,
      title: template.name,
      description: template.description,
      participants,
      initiator,
      workflow,
      context,
      status: 'active',
      messages: [],
      handoffs: [],
      startTime: new Date(),
      metadata: {
        template: template.type,
        stages: template.stages.map(s => ({ ...s, status: 'pending' }))
      }
    }

    this.activeSessions.set(sessionId, session)

    // Emit collaboration started event
    await this.emitEvent('collaboration.session.started', {
      sessionId,
      session,
      initiator,
      participants
    })

    // Initialize first stage if applicable
    if (template.stages.length > 0) {
      await this.initiateStage(sessionId, template.stages[0])
    }

    return sessionId
  }

  async sendMessage(
    sessionId: string,
    from: AgentType,
    to: AgentType[],
    content: string,
    messageType: CollaborationMessage['messageType'] = 'request',
    payload?: any
  ): Promise<string> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Collaboration session ${sessionId} not found`)
    }

    const messageId = uuidv4()
    const message: CollaborationMessage = {
      id: messageId,
      sessionId,
      from,
      to,
      content,
      messageType,
      payload,
      timestamp: new Date(),
      requiresResponse: messageType === 'request' || messageType === 'handoff'
    }

    // Add message to session
    session.messages.push(message)

    // Emit message event
    await this.emitEvent('collaboration.message.sent', {
      sessionId,
      message,
      from,
      to
    })

    return messageId
  }

  async initiateHandoff(
    sessionId: string,
    from: AgentType,
    to: AgentType,
    context: HandoffContext
  ): Promise<string> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Collaboration session ${sessionId} not found`)
    }

    const handoffId = uuidv4()
    const handoff: AgentHandoff = {
      id: handoffId,
      sessionId,
      from,
      to,
      context,
      status: 'pending',
      timestamp: new Date()
    }

    // Add handoff to session
    session.handoffs.push(handoff)

    // Send handoff message
    await this.sendMessage(
      sessionId,
      from,
      [to],
      `Handoff: ${context.task}`,
      'handoff',
      { handoffId, context }
    )

    // Emit handoff event
    await this.emitEvent('collaboration.handoff.initiated', {
      sessionId,
      handoff,
      from,
      to
    })

    return handoffId
  }

  async acceptHandoff(sessionId: string, handoffId: string, notes?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Collaboration session ${sessionId} not found`)
    }

    const handoff = session.handoffs.find(h => h.id === handoffId)
    if (!handoff) {
      throw new Error(`Handoff ${handoffId} not found`)
    }

    // Update handoff status
    ;(handoff as any).status = 'accepted'
    if (notes) {
      ;(handoff as any).notes = notes
    }

    // Emit handoff accepted event
    await this.emitEvent('collaboration.handoff.accepted', {
      sessionId,
      handoff,
      notes
    })
  }

  async completeHandoff(sessionId: string, handoffId: string, deliverables?: any): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Collaboration session ${sessionId} not found`)
    }

    const handoff = session.handoffs.find(h => h.id === handoffId)
    if (!handoff) {
      throw new Error(`Handoff ${handoffId} not found`)
    }

    // Update handoff status
    ;(handoff as any).status = 'completed'
    ;(handoff as any).completedAt = new Date()

    // Emit handoff completed event
    await this.emitEvent('collaboration.handoff.completed', {
      sessionId,
      handoff,
      deliverables
    })

    // Check if this triggers next stage
    await this.checkStageTransitions(sessionId)
  }

  async completeSession(sessionId: string, summary?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Collaboration session ${sessionId} not found`)
    }

    // Update session status
    ;(session as any).status = 'completed'
    ;(session as any).endTime = new Date()
    if (summary) {
      ;(session as any).metadata.summary = summary
    }

    // Move to history
    this.sessionHistory.push(session)
    this.activeSessions.delete(sessionId)

    // Emit session completed event
    await this.emitEvent('collaboration.session.completed', {
      sessionId,
      session,
      summary
    })
  }

  // =============================================================================
  // Workflow Management
  // =============================================================================

  private getWorkflowTemplate(workflow: WorkflowType): WorkflowTemplate {
    const template = Object.values(WORKFLOW_TEMPLATES).find(t => t.type === workflow)
    if (!template) {
      throw new Error(`Workflow template not found for type: ${workflow}`)
    }
    return template
  }

  private async initiateStage(sessionId: string, stage: WorkflowStage): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    // Update stage status in metadata
    const stages = session.metadata.stages as any[]
    const stageIndex = stages.findIndex(s => s.id === stage.id)
    if (stageIndex >= 0) {
      stages[stageIndex].status = 'active'
      stages[stageIndex].startTime = new Date()
    }

    // Notify primary agent
    await this.sendMessage(
      sessionId,
      AgentType.PRODUCER, // System initiator
      [stage.primaryAgent],
      `Stage initiated: ${stage.name} - ${stage.description}`,
      'request',
      { stage, inputs: stage.inputs, outputs: stage.outputs }
    )

    // Emit stage initiated event
    await this.emitEvent('collaboration.stage.initiated', {
      sessionId,
      stage,
      primaryAgent: stage.primaryAgent
    })
  }

  private async checkStageTransitions(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const template = this.getWorkflowTemplate(session.workflow)
    const stages = session.metadata.stages as any[]

    // Check if current stage is complete and next stage should start
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      const templateStage = template.stages[i]

      if (stage.status === 'active') {
        // Check if stage completion criteria are met
        const isComplete = await this.checkStageCompletion(sessionId, templateStage)
        
        if (isComplete) {
          // Mark stage as complete
          stage.status = 'completed'
          stage.endTime = new Date()

          // Start next stage if available
          if (i + 1 < stages.length) {
            await this.initiateStage(sessionId, template.stages[i + 1])
          } else {
            // All stages complete - complete session
            await this.completeSession(sessionId, 'All workflow stages completed')
          }
          break
        }
      }
    }
  }

  private async checkStageCompletion(sessionId: string, stage: WorkflowStage): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    // Check if all required handoffs for this stage are completed
    const stageHandoffs = session.handoffs.filter(h => 
      h.context.task.includes(stage.name) || 
      stage.outputs.some(output => h.context.deliverables.includes(output))
    )

    return stageHandoffs.length > 0 && stageHandoffs.every(h => h.status === 'completed')
  }

  // =============================================================================
  // Event Handling
  // =============================================================================

  private setupEventHandlers(): void {
    // Listen for agent status changes
    this.eventBus.subscribe('agent.status.changed', {
      handle: async (event: DomainEvent) => {
        await this.handleAgentStatusChange(event)
      }
    })
    
    // Listen for task completion events
    this.eventBus.subscribe('task.completed', {
      handle: async (event: DomainEvent) => {
        await this.handleTaskCompletion(event)
      }
    })
    
    // Listen for quality issues
    this.eventBus.subscribe('quality.issue.reported', {
      handle: async (event: DomainEvent) => {
        await this.handleQualityIssue(event)
      }
    })
  }

  private async handleAgentStatusChange(event: DomainEvent): Promise<void> {
    const { agentId, agentType, newStatus } = event.payload as {
      agentId: string
      agentType: AgentType
      newStatus: string
    }

    // Check if this affects any active collaborations
    for (const session of this.activeSessions.values()) {
      if (session.participants.includes(agentType)) {
        await this.sendMessage(
          session.id,
          AgentType.PRODUCER, // System notification
          session.participants,
          `Agent status update: ${agentType} is now ${newStatus}`,
          'status_update',
          { agentId, agentType, newStatus }
        )
      }
    }
  }

  private async handleTaskCompletion(event: DomainEvent): Promise<void> {
    const { taskId } = event.payload as {
      taskId: string
      agentType: AgentType
    }

    // Find relevant collaboration sessions
    for (const session of this.activeSessions.values()) {
      if (session.context.taskId === taskId) {
        await this.checkStageTransitions(session.id)
      }
    }
  }

  private async handleQualityIssue(event: DomainEvent): Promise<void> {
    const { issue, severity } = event.payload as {
      issue: { title: string; description: string }
      severity: string
    }

    // If critical issue, potentially start emergency response workflow
    if (severity === 'critical' || severity === 'blocker') {
      const sessionId = await this.startCollaboration(
        'emergency_response',
        {
          requirements: [`Resolve critical issue: ${issue.title}`],
          constraints: ['High priority', 'Immediate attention required'],
          objectives: ['Fix critical issue', 'Prevent further impact'],
          deliverables: ['Issue resolution', 'Root cause analysis'],
          priority: 'urgent'
        },
        AgentType.QA,
        [AgentType.QA, AgentType.ENGINEER, AgentType.ARCHITECT]
      )

      await this.sendMessage(
        sessionId,
        AgentType.QA,
        [AgentType.ENGINEER, AgentType.ARCHITECT],
        `Critical issue requires immediate attention: ${issue.title}`,
        'request',
        { issue, severity }
      )
    }
  }

  private async emitEvent(eventType: string, payload: any): Promise<void> {
    const event: DomainEvent = {
      id: uuidv4(),
      type: eventType,
      domain: 'collaboration',
      timestamp: new Date(),
      version: 1,
      payload
    }

    await this.eventBus.publishAsync(event)
  }

  // =============================================================================
  // Public Interface
  // =============================================================================

  getActiveSession(sessionId: string): CollaborationSession | undefined {
    return this.activeSessions.get(sessionId)
  }

  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.activeSessions.values())
  }

  getSessionHistory(): CollaborationSession[] {
    return [...this.sessionHistory]
  }

  getWorkflowTemplates(): WorkflowTemplate[] {
    return Object.values(WORKFLOW_TEMPLATES)
  }

  async pauseSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      ;(session as any).status = 'paused'
      await this.emitEvent('collaboration.session.paused', { sessionId })
    }
  }

  async resumeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    if (session) {
      ;(session as any).status = 'active'
      await this.emitEvent('collaboration.session.resumed', { sessionId })
    }
  }
}

export default AgentCollaborationManager