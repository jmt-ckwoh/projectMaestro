/**
 * Architect Agent
 * 
 * The Architect specializes in system design, technical planning, and creating
 * comprehensive technical solutions. Works with Producer to understand requirements
 * and provides technical guidance to Engineer and QA agents.
 */

import {
  AgentAction,
  Agent as AgentEntity,
  AgentMessage,
  AgentResponse,
  AgentType
} from '@/shared/contracts/AgentDomain'
import { AgentContext, BaseAgent, LLMProvider, MemoryManager } from '../base/Agent'
import { AgentStateMachine } from '../AgentStateMachine'
import { IEventBus } from '@/shared/contracts/EventBus'
import { DomainEvent } from '@/shared/contracts/common'
import { v4 as uuidv4 } from 'uuid'

// =============================================================================
// Architect-Specific Types
// =============================================================================

export interface SystemDesign {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly architecture: TechnicalArchitecture
  readonly components: SystemComponent[]
  readonly dataModels: DataModel[]
  readonly interfaces: InterfaceDesign[]
  readonly deploymentPlan: DeploymentPlan
  readonly techStack: TechStack
  readonly lastUpdated: Date
}

export interface TechnicalArchitecture {
  readonly type: 'monolithic' | 'microservices' | 'serverless' | 'hybrid'
  readonly patterns: string[]
  readonly principles: string[]
  readonly constraints: string[]
  readonly scalabilityRequirements: string[]
}

export interface SystemComponent {
  readonly id: string
  readonly name: string
  readonly type: 'frontend' | 'backend' | 'database' | 'service' | 'integration'
  readonly description: string
  readonly responsibilities: string[]
  readonly dependencies: string[]
  readonly technologies: string[]
  readonly interfaces: string[]
}

export interface DataModel {
  readonly id: string
  readonly name: string
  readonly type: 'entity' | 'aggregate' | 'value_object' | 'dto'
  readonly attributes: DataAttribute[]
  readonly relationships: DataRelationship[]
  readonly constraints: string[]
}

export interface DataAttribute {
  readonly name: string
  readonly type: string
  readonly required: boolean
  readonly description: string
  readonly validation?: string[]
}

export interface DataRelationship {
  readonly type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  readonly target: string
  readonly description: string
}

export interface InterfaceDesign {
  readonly id: string
  readonly name: string
  readonly type: 'api' | 'ui' | 'database' | 'message_queue' | 'file_system'
  readonly specification: any // JSON schema or API spec
  readonly documentation: string
}

export interface DeploymentPlan {
  readonly environments: DeploymentEnvironment[]
  readonly strategy: 'blue_green' | 'rolling' | 'canary' | 'recreate'
  readonly infrastructure: InfrastructureRequirement[]
  readonly monitoring: MonitoringPlan[]
}

export interface DeploymentEnvironment {
  readonly name: string
  readonly type: 'development' | 'staging' | 'production'
  readonly resources: ResourceRequirement[]
  readonly configuration: Record<string, any>
}

export interface ResourceRequirement {
  readonly type: string
  readonly specification: string
  readonly quantity: number
  readonly description: string
}

export interface InfrastructureRequirement {
  readonly type: string
  readonly provider?: string
  readonly specification: string
  readonly justification: string
}

export interface MonitoringPlan {
  readonly component: string
  readonly metrics: string[]
  readonly alerts: AlertRule[]
  readonly dashboards: string[]
}

export interface AlertRule {
  readonly metric: string
  readonly threshold: number
  readonly condition: 'greater_than' | 'less_than' | 'equals'
  readonly severity: 'info' | 'warning' | 'critical'
}

export interface TechStack {
  readonly frontend: TechChoice[]
  readonly backend: TechChoice[]
  readonly database: TechChoice[]
  readonly infrastructure: TechChoice[]
  readonly tools: TechChoice[]
}

export interface TechChoice {
  readonly name: string
  readonly version?: string
  readonly justification: string
  readonly alternatives: string[]
  readonly tradeoffs: string[]
}

export interface TechnicalDecision {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly options: DecisionOption[]
  readonly recommendation: string
  readonly rationale: string
  readonly tradeoffs: string[]
  readonly status: 'pending' | 'approved' | 'rejected' | 'implemented'
}

export interface DecisionOption {
  readonly name: string
  readonly pros: string[]
  readonly cons: string[]
  readonly complexity: 'low' | 'medium' | 'high'
  readonly cost: 'low' | 'medium' | 'high'
}

// =============================================================================
// Architect Agent Implementation
// =============================================================================

export class ArchitectAgent extends BaseAgent {
  private currentSystemDesign?: SystemDesign
  private pendingDecisions: TechnicalDecision[] = []
  private designHistory: SystemDesign[] = []

  constructor(
    agentEntity: AgentEntity,
    stateMachine: AgentStateMachine,
    eventBus: IEventBus,
    llmProvider: LLMProvider,
    memoryManager?: MemoryManager
  ) {
    super(agentEntity, stateMachine, eventBus, llmProvider, memoryManager)
    this.initializeArchitectTools()
  }

  // =============================================================================
  // BaseAgent Implementation
  // =============================================================================

  protected getSystemPrompt(): string {
    return `
You are the Architect, a senior technical architect and system designer specializing in creating robust, scalable software solutions.

CORE IDENTITY:
You are an experienced system architect with deep expertise in software design patterns, scalability, security, and technology selection. You work closely with the Producer to understand requirements and provide technical guidance to the Engineer and QA agents.

CORE RESPONSIBILITIES:
1. Design comprehensive system architectures based on requirements
2. Make informed technology stack recommendations with clear justifications
3. Create detailed technical specifications and component designs
4. Identify and resolve potential technical risks and constraints
5. Plan deployment strategies and infrastructure requirements
6. Document design decisions with clear rationale
7. Guide technical implementation through other agents
8. Ensure architectural consistency throughout the project

PERSONALITY TRAITS:
- Thorough and methodical in approach
- Thinks systematically about trade-offs and implications
- Values simplicity and maintainability over complexity
- Considers long-term scalability and evolution
- Pragmatic about technology choices based on actual needs
- Clear communicator of technical concepts
- Collaborative but decisive on technical matters

DESIGN PHILOSOPHY:
- Start with the simplest solution that meets requirements
- Choose boring, proven technologies over cutting-edge when appropriate
- Design for failure and recovery scenarios
- Prioritize maintainability and developer experience
- Consider operational requirements from the start
- Document decisions and rationale for future reference

INTERACTION PATTERNS:

When receiving requirements from Producer:
1. Acknowledge the requirements and ask clarifying technical questions
2. Identify key architectural decisions that need to be made
3. Propose 2-3 architectural approaches with trade-offs
4. Recommend the best approach with clear justification
5. Create detailed technical specifications
6. Identify what needs to be built by Engineer and tested by QA

When making technology recommendations:
1. Consider the project's scale, complexity, and constraints
2. Evaluate multiple options objectively
3. Recommend based on team expertise, project timeline, and long-term maintenance
4. Explain trade-offs clearly (performance vs complexity, cost vs features, etc.)
5. Consider operational requirements (monitoring, deployment, scaling)

When designing system components:
1. Start with high-level architecture and drill down to components
2. Define clear interfaces and contracts between components
3. Consider data flow and state management
4. Plan for error handling and edge cases
5. Design for testability and maintainability
6. Document component responsibilities and interactions

COMMUNICATION STYLE:
- Lead with the architectural approach, then dive into details
- Use diagrams and structured formats when helpful
- Explain technical decisions in business terms when communicating with Producer
- Be specific about implementation guidance for Engineer
- Ask targeted questions to resolve ambiguity
- Present options with clear recommendations
- Always consider the "why" behind technical choices

TOOLS YOU HAVE ACCESS TO:
- create_system_design: Create comprehensive system design documentation
- evaluate_tech_stack: Analyze and recommend technology choices
- design_data_model: Create data models and database schemas
- plan_deployment: Design deployment and infrastructure strategy
- document_decision: Record technical decisions with rationale
- create_architecture_diagram: Generate system architecture visualizations

CONSTRAINTS:
- Always consider non-functional requirements (performance, security, scalability)
- Factor in team expertise and learning curve for technology choices
- Consider operational complexity and maintenance burden
- Think about testing strategy and quality assurance approaches
- Plan for monitoring, logging, and observability from the start
- Consider security implications of all design decisions
- Balance ideal architecture with practical constraints (time, budget, expertise)

CONTEXT AWARENESS:
You have access to conversation history, previous design decisions, and project context. Build on previous work and maintain consistency across design decisions. Reference earlier discussions naturally and evolve designs based on new information.

Remember: Your role is to create technical solutions that are robust, maintainable, and aligned with business needs. You bridge the gap between business requirements and technical implementation, ensuring the project is built on a solid foundation.
    `.trim()
  }

  protected getPersonalityTraits(): string[] {
    return [
      'methodical',
      'thorough',
      'systematic',
      'pragmatic',
      'clear_communicator',
      'collaborative',
      'decisive',
      'forward_thinking'
    ]
  }

  protected getCapabilities(): string[] {
    return [
      'system_architecture',
      'technology_selection',
      'component_design',
      'data_modeling',
      'deployment_planning',
      'infrastructure_design',
      'technical_documentation',
      'risk_assessment',
      'performance_optimization',
      'security_architecture'
    ]
  }

  protected async processAgentMessage(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    // Store message in memory for future reference
    await this.storeMemory(`Technical discussion: ${message.content}`, 'conversation')

    // Analyze the message for technical requirements and decisions
    const analysisPrompt = this.buildTechnicalAnalysisPrompt(message)
    const analysis = await this.callLLM([
      { role: 'user', content: analysisPrompt }
    ])

    // Generate architectural response
    const responsePrompt = this.buildArchitecturalResponsePrompt(message, analysis)
    const responseContent = await this.callLLM([
      { role: 'user', content: responsePrompt }
    ])

    // Extract architectural actions from the response
    const actions = await this.extractArchitecturalActions(responseContent, context)

    // Build the response
    const response: AgentResponse = {
      messageId: message.id,
      agentType: AgentType.ARCHITECT,
      content: responseContent,
      actions,
      statusUpdate: {
        status: this.status,
        message: 'Analyzing technical requirements and designing solution'
      }
    }

    // Execute extracted actions
    await this.executeActions(actions, context)

    return response
  }

  // =============================================================================
  // Architect-Specific Logic
  // =============================================================================

  private buildTechnicalAnalysisPrompt(message: AgentMessage): string {
    const currentDesign = this.currentSystemDesign ? 
      `Current system design: ${this.currentSystemDesign.title} - ${this.currentSystemDesign.description}` : 
      'No current system design'
    
    const pendingDecisions = this.pendingDecisions.length > 0 ?
      `Pending technical decisions: ${this.pendingDecisions.map(d => d.title).join(', ')}` :
      'No pending technical decisions'

    return `
Analyze this message from a system architecture perspective:

CURRENT TECHNICAL CONTEXT:
${currentDesign}
${pendingDecisions}

MESSAGE TO ANALYZE:
"${message.content}"

From an Architect's perspective, analyze:
1. What technical requirements or constraints are mentioned?
2. What architectural decisions need to be made?
3. What system components or technologies are involved?
4. Are there any technical risks or challenges to address?
5. What design patterns or architectural approaches are relevant?
6. What needs to be clarified for proper technical implementation?

Focus on technical implications and architectural considerations.
    `.trim()
  }

  private buildArchitecturalResponsePrompt(message: AgentMessage, analysis: string): string {
    const recentMemories = this.getRecentTechnicalMemories()
    const designContext = this.currentSystemDesign ? 
      `Working on: ${this.currentSystemDesign.title}` : 
      'No active system design'

    return `
You are the Architect responding to this message. Provide technical guidance and architectural insights.

TECHNICAL ANALYSIS:
${analysis}

RELEVANT CONTEXT:
${recentMemories}
${designContext}

MESSAGE:
"${message.content}"

Craft an architectural response that:
1. Addresses the technical aspects of the message
2. Provides clear architectural guidance and recommendations
3. Identifies key technical decisions that need to be made
4. Suggests appropriate technologies and approaches with justification
5. Considers scalability, maintainability, and operational concerns
6. Plans next steps for technical implementation
7. Identifies what Engineer and QA agents need to know

Keep your response technical but accessible, with clear reasoning for your recommendations.
If system design updates are needed, mention that you'll update the technical specifications.
    `.trim()
  }

  private async extractArchitecturalActions(responseContent: string, _context: AgentContext): Promise<AgentAction[]> {
    const actions: AgentAction[] = []

    const actionPrompt = `
Analyze this Architect response and identify technical actions that should be taken:

RESPONSE:
"${responseContent}"

Identify if the response suggests:
1. Creating or updating system design (extract technical details)
2. Evaluating technology stack choices (extract technologies and criteria)
3. Designing data models (extract entity and relationship details)
4. Planning deployment strategy (extract infrastructure requirements)
5. Documenting technical decisions (extract decision details)
6. Coordinating with other agents (identify which agents and what tasks)

Return a JSON array of actions in this format:
[
  {
    "type": "create_system_design",
    "description": "Create comprehensive system design",
    "parameters": {
      "title": "system title",
      "description": "system description",
      "architecture_type": "monolithic|microservices|serverless|hybrid",
      "key_components": ["component1", "component2"],
      "tech_stack": {"frontend": [], "backend": [], "database": []}
    }
  }
]

Only include actions that are clearly indicated in the response. Return empty array if no actions.
    `.trim()

    try {
      const actionsText = await this.callLLM([
        { role: 'user', content: actionPrompt }
      ])

      const extractedActions = JSON.parse(actionsText)
      
      for (const action of extractedActions) {
        actions.push({
          type: action.type,
          description: action.description,
          parameters: action.parameters,
          confirmation: false // Architect actions don't need confirmation
        })
      }
    } catch (error) {
      console.warn('Failed to extract architectural actions from response:', error)
    }

    return actions
  }

  private async executeActions(actions: AgentAction[], _context: AgentContext): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_system_design':
            await this.createSystemDesign(action.parameters)
            break
          case 'update_system_design':
            await this.updateSystemDesign(action.parameters)
            break
          case 'evaluate_tech_stack':
            await this.evaluateTechStack(action.parameters)
            break
          case 'design_data_model':
            await this.designDataModel(action.parameters)
            break
          case 'plan_deployment':
            await this.planDeployment(action.parameters)
            break
          case 'document_decision':
            await this.documentTechnicalDecision(action.parameters)
            break
        }
      } catch (error) {
        console.error(`Failed to execute architectural action ${action.type}:`, error)
      }
    }
  }

  private async createSystemDesign(parameters: any): Promise<void> {
    const { title, description, architecture_type, key_components, tech_stack } = parameters

    const systemDesign: SystemDesign = {
      id: uuidv4(),
      title: title || 'System Design',
      description: description || 'System architecture to be defined',
      architecture: {
        type: architecture_type || 'monolithic',
        patterns: [],
        principles: ['SOLID', 'DRY', 'KISS'],
        constraints: [],
        scalabilityRequirements: []
      },
      components: (key_components || []).map((name: string) => ({
        id: uuidv4(),
        name,
        type: 'service' as const,
        description: `${name} component`,
        responsibilities: [],
        dependencies: [],
        technologies: [],
        interfaces: []
      })),
      dataModels: [],
      interfaces: [],
      deploymentPlan: {
        environments: [
          {
            name: 'development',
            type: 'development' as const,
            resources: [],
            configuration: {}
          }
        ],
        strategy: 'rolling' as const,
        infrastructure: [],
        monitoring: []
      },
      techStack: {
        frontend: tech_stack?.frontend?.map((tech: string) => ({
          name: tech,
          justification: 'To be defined',
          alternatives: [],
          tradeoffs: []
        })) || [],
        backend: tech_stack?.backend?.map((tech: string) => ({
          name: tech,
          justification: 'To be defined',
          alternatives: [],
          tradeoffs: []
        })) || [],
        database: tech_stack?.database?.map((tech: string) => ({
          name: tech,
          justification: 'To be defined',
          alternatives: [],
          tradeoffs: []
        })) || [],
        infrastructure: [],
        tools: []
      },
      lastUpdated: new Date()
    }

    this.currentSystemDesign = systemDesign
    this.designHistory.push(systemDesign)

    // Store in memory
    await this.storeMemory(
      `System design created: ${JSON.stringify(systemDesign)}`,
      'system_design'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'system.design.created',
      domain: 'architecture',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        systemDesign
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async updateSystemDesign(parameters: any): Promise<void> {
    if (!this.currentSystemDesign) {
      await this.createSystemDesign(parameters)
      return
    }

    // Update existing design with proper typing
    const updates = {
      ...this.currentSystemDesign,
      title: parameters.title || this.currentSystemDesign.title,
      description: parameters.description || this.currentSystemDesign.description,
      lastUpdated: new Date()
    }
    
    this.currentSystemDesign = updates

    this.designHistory.push({ ...this.currentSystemDesign })

    // Store in memory
    await this.storeMemory(
      `System design updated: ${JSON.stringify(parameters)}`,
      'system_design'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'system.design.updated',
      domain: 'architecture',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        systemDesign: this.currentSystemDesign,
        changes: parameters
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async evaluateTechStack(parameters: any): Promise<void> {
    const { technologies, criteria } = parameters

    // Store tech stack evaluation in memory
    await this.storeMemory(
      `Tech stack evaluation: ${JSON.stringify({ technologies, criteria })}`,
      'tech_evaluation'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'tech_stack.evaluated',
      domain: 'architecture',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        technologies,
        criteria
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async designDataModel(parameters: any): Promise<void> {
    const { entities, relationships } = parameters

    // Store data model design in memory
    await this.storeMemory(
      `Data model designed: ${JSON.stringify({ entities, relationships })}`,
      'data_model'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'data_model.designed',
      domain: 'architecture',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        entities,
        relationships
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async planDeployment(parameters: any): Promise<void> {
    const { strategy, infrastructure } = parameters

    // Store deployment plan in memory
    await this.storeMemory(
      `Deployment planned: ${JSON.stringify({ strategy, infrastructure })}`,
      'deployment_plan'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'deployment.planned',
      domain: 'architecture',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        strategy,
        infrastructure
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async documentTechnicalDecision(parameters: any): Promise<void> {
    const { title, description, options, recommendation } = parameters

    const decision: TechnicalDecision = {
      id: uuidv4(),
      title,
      description,
      options: options || [],
      recommendation,
      rationale: 'Rationale to be documented',
      tradeoffs: [],
      status: 'pending'
    }

    this.pendingDecisions.push(decision)

    // Store in memory
    await this.storeMemory(
      `Technical decision documented: ${JSON.stringify(decision)}`,
      'technical_decision'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'technical_decision.documented',
      domain: 'architecture',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        decision
      }
    }
    this.eventBus.publishAsync(event)
  }

  private getRecentTechnicalMemories(): string {
    // This would retrieve relevant technical memories in a real implementation
    return 'Recent technical context to be implemented'
  }

  private initializeArchitectTools(): void {
    // Architect-specific tools would be registered here
    // For now, we rely on the action extraction system
  }

  // =============================================================================
  // Public Architect Interface
  // =============================================================================

  public getCurrentSystemDesign(): SystemDesign | undefined {
    return this.currentSystemDesign
  }

  public getPendingDecisions(): TechnicalDecision[] {
    return [...this.pendingDecisions]
  }

  public getDesignHistory(): SystemDesign[] {
    return [...this.designHistory]
  }

  public approveDecision(decisionId: string): void {
    const decision = this.pendingDecisions.find(d => d.id === decisionId)
    if (decision) {
      ;(decision as any).status = 'approved'
    }
  }

  public rejectDecision(decisionId: string, reason: string): void {
    const decision = this.pendingDecisions.find(d => d.id === decisionId)
    if (decision) {
      ;(decision as any).status = 'rejected'
      ;(decision as any).rationale = reason
    }
  }
}

export default ArchitectAgent