/**
 * Producer Agent
 * 
 * The Producer is the user's primary partner in building software.
 * Acts as a facilitator, project manager, and communication bridge.
 * Specializes in extracting clarity from vague ideas and coordinating other agents.
 */

import {
  AgentAction,
  Agent as AgentEntity,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType
} from '@/shared/contracts/AgentDomain'
import { AgentContext, BaseAgent, LLMProvider, MemoryManager } from '../base/Agent'
import { AgentStateMachine } from '../AgentStateMachine'
import { IEventBus } from '@/shared/contracts/EventBus'
import { DomainEvent } from '@/shared/contracts/common'
import { v4 as uuidv4 } from 'uuid'

// =============================================================================
// Producer-Specific Types
// =============================================================================

export interface ProjectPlan {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly phases: ProjectPhase[]
  readonly currentPhase: string
  readonly lastUpdated: Date
}

export interface ProjectPhase {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly status: 'planned' | 'active' | 'completed' | 'blocked'
  readonly tasks: ProjectTask[]
  readonly dependencies: string[]
  readonly estimatedDuration?: string
}

export interface ProjectTask {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  readonly assignedAgent?: AgentType
  readonly priority: 'low' | 'medium' | 'high' | 'urgent'
  readonly estimatedEffort?: string
}

export interface ClarificationQuestion {
  readonly id: string
  readonly question: string
  readonly context: string
  readonly suggestedAnswers?: string[]
  readonly priority: 'low' | 'medium' | 'high'
}

// =============================================================================
// Producer Agent Implementation
// =============================================================================

export class ProducerAgent extends BaseAgent {
  private currentProjectPlan?: ProjectPlan
  private pendingQuestions: ClarificationQuestion[] = []
  private conversationContext: string[] = []

  constructor(
    agentEntity: AgentEntity,
    stateMachine: AgentStateMachine,
    eventBus: IEventBus,
    llmProvider: LLMProvider,
    memoryManager?: MemoryManager
  ) {
    super(agentEntity, stateMachine, eventBus, llmProvider, memoryManager)
    this.initializeProducerTools()
  }

  // =============================================================================
  // BaseAgent Implementation
  // =============================================================================

  protected getSystemPrompt(): string {
    return `
You are the Producer, the user's primary partner in building software with Project Maestro.

CORE IDENTITY:
You are an experienced project manager and facilitator who specializes in transforming vague ideas into actionable software projects. You work with a team of AI specialists (Architect, Engineer, QA) to help users build software.

CORE RESPONSIBILITIES:
1. Guide users through the development process with encouragement and clarity
2. Extract specific requirements from vague or incomplete ideas
3. Maintain project momentum and celebrate progress
4. Update and refine project plans based on ongoing conversations
5. Coordinate with other AI agents when technical work is needed
6. Ask clarifying questions to resolve ambiguity
7. Break down complex ideas into manageable phases and tasks

PERSONALITY TRAITS:
- Encouraging and supportive, always celebrating progress
- Naturally curious, asks thoughtful clarifying questions
- Patient and understanding when users are uncertain
- Enthusiastic about the user's vision and goals
- Gently persistent when decisions are needed
- Professional but approachable and friendly

INTERACTION PATTERNS:

When the user gives you a vague idea:
1. Acknowledge their vision enthusiastically ("That sounds like an exciting project!")
2. Ask 1-2 specific, focused questions to add clarity (not overwhelming)
3. Summarize your understanding of what they want
4. Suggest a logical next step
5. Update the project plan if needed

When the user provides clarification:
1. Thank them for the details
2. Confirm your updated understanding
3. Identify what specific work needs to be done
4. Suggest involving the appropriate specialist (Architect for design, Engineer for coding, QA for testing)
5. Update the project plan with new information

When technical work is needed:
1. Summarize what needs to be done technically
2. Recommend which specialist agent should handle it
3. Prepare a clear briefing for that agent
4. Stay engaged to coordinate and provide updates to the user

COMMUNICATION STYLE:
- Keep responses conversational and human-like
- Use "we" language to emphasize collaboration ("We should...", "Let's...")
- Ask ONE focused question at a time to avoid overwhelming
- Always end with a suggested next action
- Use project management terminology naturally but not excessively
- Show genuine interest in the user's goals and constraints

TOOLS YOU HAVE ACCESS TO:
- update_project_plan: Update the current project plan with new information
- coordinate_with_agent: Send a task briefing to another specialist agent
- ask_clarifying_question: Formally track questions that need user input
- celebrate_milestone: Acknowledge progress and completed work

CONSTRAINTS:
- Never make assumptions about technical implementation details
- Always involve the appropriate specialist for technical work
- Don't overwhelm users with too many questions at once
- Keep the conversation focused on forward progress
- Remember that users may not be technical, so avoid jargon
- Always maintain an encouraging and positive tone

CONTEXT AWARENESS:
You have access to the full conversation history and project plan. Reference previous discussions naturally and build on them. If the user mentions something from earlier, acknowledge it and connect it to current work.

Remember: Your role is to be the user's trusted partner in turning their software ideas into reality. You're the bridge between their vision and the technical execution by your specialist team.
    `.trim()
  }

  protected getPersonalityTraits(): string[] {
    return [
      'encouraging',
      'supportive', 
      'curious',
      'patient',
      'enthusiastic',
      'organized',
      'collaborative',
      'proactive'
    ]
  }

  protected getCapabilities(): string[] {
    return [
      'project_planning',
      'requirement_gathering',
      'clarification_questions',
      'agent_coordination', 
      'progress_tracking',
      'milestone_celebration',
      'user_guidance',
      'vision_refinement'
    ]
  }

  protected async processAgentMessage(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    // Add to conversation context
    this.addToConversationContext(message.content)

    // Store memory for future reference
    await this.storeMemory(`User message: ${message.content}`, 'conversation')

    // Analyze the message and determine response strategy
    const analysisPrompt = this.buildAnalysisPrompt(message)
    const analysis = await this.callLLM([
      { role: 'user', content: analysisPrompt }
    ])

    // Generate main response
    const responsePrompt = this.buildResponsePrompt(message, analysis)
    const responseContent = await this.callLLM([
      { role: 'user', content: responsePrompt }
    ])

    // Extract any actions from the response
    const actions = await this.extractActions(responseContent, context)

    // Build the response
    const response: AgentResponse = {
      messageId: message.id,
      agentType: AgentType.PRODUCER,
      content: responseContent,
      actions,
      statusUpdate: {
        status: this.status,
        message: 'Processing user input and planning next steps'
      }
    }

    // Execute any extracted actions
    await this.executeActions(actions, context)

    return response
  }

  // =============================================================================
  // Producer-Specific Logic
  // =============================================================================

  private buildAnalysisPrompt(message: AgentMessage): string {
    const conversationHistory = this.conversationContext.slice(-5).join('\n')
    const currentPlan = this.currentProjectPlan ? 
      `Current project: ${this.currentProjectPlan.title} - ${this.currentProjectPlan.description}` : 
      'No active project'

    return `
Analyze this user message in the context of our ongoing conversation:

CONVERSATION HISTORY:
${conversationHistory}

CURRENT PROJECT STATUS:
${currentPlan}

USER MESSAGE:
"${message.content}"

Analyze:
1. What is the user trying to accomplish?
2. Is this a new idea, clarification, or continuation of existing work?
3. What information is clear vs. what needs clarification?
4. What type of response would be most helpful?
5. Should I involve other agents (Architect, Engineer, QA)?

Provide a brief analysis focusing on the most important insights.
    `.trim()
  }

  private buildResponsePrompt(message: AgentMessage, analysis: string): string {
    const recentMemories = this.getRecentMemoriesForContext()
    const pendingQuestionsText = this.pendingQuestions.length > 0 ? 
      `Pending questions: ${this.pendingQuestions.map(q => q.question).join('; ')}` : 
      'No pending questions'

    return `
You are the Producer responding to the user. Use your personality and expertise to craft a helpful response.

ANALYSIS OF USER MESSAGE:
${analysis}

RELEVANT CONTEXT:
${recentMemories}
${pendingQuestionsText}

USER MESSAGE:
"${message.content}"

Craft a response that:
1. Acknowledges what the user said with appropriate enthusiasm
2. Shows understanding of their goals
3. Asks 1-2 specific clarifying questions if needed (don't overwhelm)
4. Suggests a clear next step
5. Maintains an encouraging, collaborative tone

If technical work is needed, suggest involving the appropriate specialist agent.
If the project plan should be updated, mention that you'll update it.

Keep the response conversational, supportive, and focused on moving forward.
    `.trim()
  }

  private async extractActions(responseContent: string, _context: AgentContext): Promise<AgentAction[]> {
    const actions: AgentAction[] = []

    // Use LLM to extract actions from the response
    const actionPrompt = `
Analyze this Producer response and identify any actions that should be taken:

RESPONSE:
"${responseContent}"

Identify if the response suggests:
1. Updating the project plan (extract project details)
2. Coordinating with another agent (which agent and what task)
3. Asking clarifying questions (extract the questions)
4. Celebrating a milestone (what milestone)

Return a JSON array of actions in this format:
[
  {
    "type": "update_project_plan",
    "description": "Update project plan with new information",
    "parameters": {
      "title": "project title",
      "description": "project description",
      "updates": "what changed"
    }
  }
]

Only include actions that are clearly indicated in the response. Return empty array if no actions.
    `.trim()

    try {
      const actionsText = await this.callLLM([
        { role: 'user', content: actionPrompt }
      ])

      // Parse the JSON response
      const extractedActions = JSON.parse(actionsText)
      
      for (const action of extractedActions) {
        actions.push({
          type: action.type,
          description: action.description,
          parameters: action.parameters,
          confirmation: false // Producer actions don't need confirmation
        })
      }
    } catch (error) {
      console.warn('Failed to extract actions from response:', error)
    }

    return actions
  }

  private async executeActions(actions: AgentAction[], _context: AgentContext): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'update_project_plan':
            await this.updateProjectPlan(action.parameters)
            break
          case 'coordinate_with_agent':
            await this.coordinateWithAgent(action.parameters)
            break
          case 'ask_clarifying_question':
            await this.askClarifyingQuestion(action.parameters)
            break
          case 'celebrate_milestone':
            await this.celebrateMilestone(action.parameters)
            break
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error)
      }
    }
  }

  private async updateProjectPlan(parameters: any): Promise<void> {
    const { title, description, updates } = parameters

    if (!this.currentProjectPlan) {
      // Create new project plan
      this.currentProjectPlan = {
        id: uuidv4(),
        title: title || 'New Project',
        description: description || 'Project description to be defined',
        phases: [
          {
            id: uuidv4(),
            name: 'Planning',
            description: 'Define requirements and plan the project',
            status: 'active',
            tasks: [],
            dependencies: []
          }
        ],
        currentPhase: 'Planning',
        lastUpdated: new Date()
      }
    } else {
      // Update existing project plan
      this.currentProjectPlan = {
        ...this.currentProjectPlan,
        title: title || this.currentProjectPlan.title,
        description: description || this.currentProjectPlan.description,
        lastUpdated: new Date()
      }
    }

    // Store in memory
    await this.storeMemory(
      `Project plan updated: ${JSON.stringify(this.currentProjectPlan)}`,
      'project_plan'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'project.plan.updated',
      domain: 'project',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        projectPlan: this.currentProjectPlan,
        changes: updates
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async coordinateWithAgent(parameters: any): Promise<void> {
    const { targetAgent, task, context: taskContext } = parameters

    // Create coordination message
    const coordinationMessage: AgentMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      from: AgentType.PRODUCER,
      to: targetAgent,
      content: task,
      messageType: MessageType.COMMAND,
      projectId: this.currentProjectPlan?.id,
      metadata: {
        priority: 'normal',
        requiresResponse: true,
        context: taskContext
      }
    }

    // Emit coordination event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'agent.coordination.requested',
      domain: 'agent',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        targetAgent,
        message: coordinationMessage
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async askClarifyingQuestion(parameters: any): Promise<void> {
    const { question, context, priority } = parameters

    const clarificationQuestion: ClarificationQuestion = {
      id: uuidv4(),
      question,
      context,
      priority: priority || 'medium'
    }

    this.pendingQuestions.push(clarificationQuestion)

    // Store in memory
    await this.storeMemory(
      `Clarification question: ${question}`,
      'clarification'
    )
  }

  private async celebrateMilestone(parameters: any): Promise<void> {
    const { milestone, achievement } = parameters

    // Emit celebration event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'project.milestone.celebrated',
      domain: 'project',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        projectId: this.currentProjectPlan?.id || 'unknown',
        milestone,
        achievement
      }
    }
    this.eventBus.publishAsync(event)

    // Store in memory
    await this.storeMemory(
      `Milestone celebrated: ${milestone} - ${achievement}`,
      'celebration'
    )
  }

  private addToConversationContext(content: string): void {
    this.conversationContext.push(content)
    
    // Keep only last 20 messages for context
    if (this.conversationContext.length > 20) {
      this.conversationContext.shift()
    }
  }

  private getRecentMemoriesForContext(): string {
    // In a real implementation, this would retrieve relevant memories
    // For now, return conversation context
    return this.conversationContext.slice(-3).join('\n')
  }

  private initializeProducerTools(): void {
    // Producer-specific tools would be registered here
    // For now, we rely on the action extraction system
  }

  // =============================================================================
  // Public Producer Interface
  // =============================================================================

  public getCurrentProjectPlan(): ProjectPlan | undefined {
    return this.currentProjectPlan
  }

  public getPendingQuestions(): ClarificationQuestion[] {
    return [...this.pendingQuestions]
  }

  public answerQuestion(questionId: string, answer: string): void {
    this.pendingQuestions = this.pendingQuestions.filter(q => q.id !== questionId)
    this.addToConversationContext(`Question answered: ${answer}`)
  }

  public getConversationContext(): string[] {
    return [...this.conversationContext]
  }
}

export default ProducerAgent